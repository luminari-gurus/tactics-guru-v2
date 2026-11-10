import { createRunRecordsStorage, RUN_RECORD_KEYS, selectedRunRecords, type RecordsWrite, type RunRecordsStorage } from '../persistence/runRecordsStorage';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag); if (text) node.textContent = text; return node;
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
      const list = element('ol'); list.className = 'run-records-list'; list.setAttribute('aria-label', 'Recent journeys');
      for (const record of history.records) {
        const item = element('li');
        const label = `${record.mode === 'run' ? 'Three-encounter run' : 'Dungeon'} · ${{ victory: 'Victory', defeat: 'Defeat', abandoned: 'Abandoned' }[record.outcome]}`;
        const time = element('time', `Recorded ${new Date(record.recordedAt).toLocaleString()}`); time.dateTime = new Date(record.recordedAt).toISOString();
        const counters = [`Battles won: ${record.battlesWon}`];
        if (record.floorsCleared !== null) counters.push(`Floors cleared: ${record.floorsCleared}`, `Deepest floor: ${record.deepestFloor}`);
        item.append(element('h3', label), time, element('p', counters.join(' · '))); list.append(item);
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
    if (!busy && (event.key === null || Object.values(RUN_RECORD_KEYS).some(key => key === event.key))) render();
  };
  render(); window.addEventListener('storage', changed);
  return () => { live = false; window.removeEventListener('storage', changed); };
}
