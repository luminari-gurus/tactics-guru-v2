import { createRunRecordsStorage, RUN_RECORD_KEYS, selectedRunRecords, type RecordsWrite, type RunRecordsStorage } from '../persistence/runRecordsStorage';
import { BEST_STATS, RECORD_MODES, recordStatValue, type BestStat, type RunRecord, type RunRecords } from '../domain/runRecords';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag); if (text) node.textContent = text; return node;
}
const modeName = (mode: RunRecord['mode']) => mode === 'run' ? 'Three-encounter run' : 'Dungeon';
const statLabels: Record<BestStat, string> = { enemiesKilled: 'Enemies killed', battlesWon: 'Battles won',
  movesTaken: 'Moves taken', floorsCleared: 'Floors cleared', activeMs: 'Active playtime' };
const bestLabels: Record<BestStat, string> = { enemiesKilled: 'Most enemies killed', battlesWon: 'Most battles won',
  movesTaken: 'Most moves taken', floorsCleared: 'Most floors cleared', activeMs: 'Longest active playtime' };
function duration(milliseconds: number) {
  if (milliseconds < 1000) return milliseconds === 0 ? '0s' : 'Less than 1s';
  const seconds = Math.floor(milliseconds / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '', `${seconds % 60}s`].filter(Boolean).join(' ');
}
function statText(stat: BestStat, value: number | null) {
  return value === null ? 'Unavailable' : stat === 'activeMs' ? duration(value) : value.toLocaleString();
}
function recordSummary(record: RunRecord, heading: 'h3' | 'h4' = 'h3') {
  const article = element('article'); article.className = 'run-record-summary';
  article.append(element(heading, `${modeName(record.mode)} · ${{ victory: 'Victory', defeat: 'Defeat', abandoned: 'Abandoned' }[record.outcome]}`));
  const time = element('time', `Recorded ${new Date(record.recordedAt).toLocaleString()}`); time.dateTime = new Date(record.recordedAt).toISOString();
  const id = element('p', `Journey ${record.id}`); id.className = 'run-record-id'; article.append(time, id);
  if (!record.stats) article.append(element('p', 'Older record: kills, moves and active playtime are unavailable.'));
  else if (record.stats.coverage === 'since-upgrade' && record.stats.timeCoverage === 'since-upgrade') article.append(element('p', 'Kills, moves and active playtime are tracked since upgrade.'));
  else if (record.stats.coverage === 'since-upgrade') article.append(element('p', 'Kills and moves are tracked since upgrade.'));
  else if (record.stats.timeCoverage === 'since-upgrade') article.append(element('p', 'Active playtime is tracked since upgrade.'));
  const stats = element('dl'); stats.className = 'run-statistics';
  for (const stat of BEST_STATS) {
    const field = element('div'); field.dataset.stat = stat;
    const value = stat === 'battlesWon' || stat === 'floorsCleared' ? record[stat] : record.stats?.[stat] ?? null;
    field.append(element('dt', statLabels[stat]), element('dd', stat === 'floorsCleared' && record.mode === 'run' ? 'N/A — authored run' : statText(stat, value)));
    stats.append(field);
  }
  article.append(stats);
  if (record.deepestFloor !== null) article.append(element('p', `Deepest floor: ${record.deepestFloor}`));
  return article;
}
function personalBests(history: RunRecords) {
  const disclosure = element('details'); disclosure.className = 'run-personal-bests';
  disclosure.append(element('summary', 'Personal bests'), element('p', 'Maxima include all outcomes. Duration means longest active playtime. Partial kills, moves and time do not compete as whole-run totals.'));
  for (const mode of RECORD_MODES) {
    if (!Object.keys(history.bests[mode]).length) continue;
    const section = element('section'); section.setAttribute('aria-label', `${modeName(mode)} personal bests`);
    section.append(element('h3', modeName(mode)));
    for (const stat of BEST_STATS) {
      const winner = history.bests[mode][stat];
      if (!winner) { section.append(element('p', `${bestLabels[stat]}: ${mode === 'run' && stat === 'floorsCleared' ? 'N/A — authored run' : 'No complete record yet'}`)); continue; }
      const details = element('details'); details.dataset.best = `${mode}-${stat}`;
      details.append(element('summary', `${bestLabels[stat]}: ${statText(stat, recordStatValue(winner, stat))}`), recordSummary(winner, 'h4'));
      section.append(details);
    }
    disclosure.append(section);
  }
  return disclosure;
}
/** Mounted only inside the main-menu records dialog. Never creates or hydrates gameplay. */
export function mountRunRecords(container: HTMLElement, store: RunRecordsStorage = createRunRecordsStorage()) {
  let live = true, busy = false, message = '';
  function button(label: string, action: () => void) {
    const node = element('button', label); node.type = 'button'; node.disabled = busy; node.onclick = action; return node;
  }
  async function update(action: () => Promise<RecordsWrite>) {
    if (busy || !live) return;
    busy = true; for (const node of container.querySelectorAll<HTMLButtonElement>('button')) node.disabled = true;
    let result: RecordsWrite;
    try { result = await action(); } catch { result = { ok: false, reason: 'unavailable' }; }
    if (!live) return;
    busy = false; message = result.ok ? 'Run history updated. Active saved journeys are unchanged.'
      : `Run history could not be confirmed (${result.reason}). Review the current status; active saved journeys are unchanged.`;
    render(); container.querySelector<HTMLElement>('[role=status]')?.focus();
  }
  function render() {
    const review = store.inspect(), history = selectedRunRecords(review);
    container.replaceChildren(element('p', 'Records stay on this device and browser. Browser storage is best effort; clearing site data removes history. The newest 100 journeys are retained.'));
    const status = element('p'); status.setAttribute('role', 'status'); status.tabIndex = -1;
    const unavailable = review.primary.status === 'unavailable' || review.backup.status === 'unavailable';
    const damaged = review.primary.status === 'invalid' || review.backup.status === 'invalid';
    status.textContent = [message, unavailable ? 'Run history storage is unavailable. You can still play.'
      : damaged ? `History needs recovery (primary: ${review.primary.status}; backup: ${review.backup.status}). Original bytes are preserved.`
      : review.primary.status !== 'valid' && review.backup.status === 'valid' ? 'Showing backup history. Some recent records may be missing.'
      : history?.records.length ? 'Recent journeys, newest recorded first.' : 'No finished journeys recorded yet.'].filter(Boolean).join(' ');
    container.append(status);
    if (history) {
      if (history.legacyBestCoverage) container.append(element('p', 'Historical best coverage is limited: earlier untracked or evicted statistics cannot be recovered.'));
      if (RECORD_MODES.some(mode => Object.keys(history.bests[mode]).length)) container.append(personalBests(history));
      const list = element('ol'); list.className = 'run-records-list'; list.setAttribute('aria-label', 'Recent journeys');
      for (const record of history.records) {
        const item = element('li'); item.append(recordSummary(record)); list.append(item);
      }
      if (list.children.length) container.append(list);
      if (Object.values(history.receipts).some(r => r?.kind === 'pending')) container.append(element('p', 'A previous replacement has unresolved history. Continue or review the saved journey to reconcile it; it has not been counted as abandoned.'));
    }
    const actions = element('div'); actions.className = 'run-records-actions';
    for (const slot of ['primary', 'backup'] as const) {
      const text = review[slot].text;
      if (text !== null) actions.append(button(`Export ${slot} history`, () => {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = element('a'); link.href = url; link.download = `tactics-guru-records-${slot}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }));
    }
    if (!unavailable && history && (damaged || review.primary.status !== 'valid')) actions.append(button('Restore reviewed history', () => { void update(() => store.recover(review, false)); }));
    if (!unavailable && (review.primary.text !== null || review.backup.text !== null)) {
      const reset = button('Reset records', () => {
        if (container.querySelector('[data-records-confirm]')) return;
        const confirm = element('section'); confirm.dataset.recordsConfirm = ''; confirm.setAttribute('aria-label', 'Review history reset');
        confirm.append(element('p', 'Reset only run history? Export first if needed. Active saved journeys will be kept.'),
          button('Confirm reset records', () => { void update(() => store.recover(review, true)); }),
          button('Cancel', () => { confirm.remove(); reset.focus(); }));
        container.append(confirm); confirm.querySelector('button')?.focus();
      });
      actions.append(reset);
    }
    container.append(actions);
  }
  const changed = (event: StorageEvent) => {
    if (busy || event.key !== null && !Object.values(RUN_RECORD_KEYS).some(key => key === event.key)) return;
    const key = (details: HTMLDetailsElement) => details.dataset.best ?? 'all';
    const expanded = new Set([...container.querySelectorAll<HTMLDetailsElement>('details[open]')].map(key));
    const focused = container.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const disclosure = focused?.tagName === 'SUMMARY' ? focused.parentElement as HTMLDetailsElement : null;
    const focusedKey = disclosure ? key(disclosure) : null;
    const buttonLabel = focused?.tagName === 'BUTTON' ? focused.textContent : null;
    render();
    const details = [...container.querySelectorAll<HTMLDetailsElement>('details')];
    for (const node of details) node.open = expanded.has(key(node));
    if (focused) {
      const replacement = focusedKey ? details.find(node => key(node) === focusedKey)?.querySelector<HTMLElement>('summary')
        : [...container.querySelectorAll('button')].find(node => node.textContent === buttonLabel);
      (replacement ?? container.querySelector<HTMLElement>('[role=status]'))?.focus();
    }
  };
  render(); window.addEventListener('storage', changed);
  return () => { live = false; window.removeEventListener('storage', changed); };
}
