import { inspectMenuSave } from '../app/menuSaves';
import { RunHistory } from '../app/RunHistory';
import { readRunRecord, type RunRecord } from '../domain/runRecords';
import { menuGameHref, routeHref } from '../app/routes';
import { createDungeonStorage, resumableDungeonSlot } from '../persistence/dungeonStorage';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import { mountCombatControlsPreference } from './combatControls';
import { mountAutoCollectLootPreference } from './autoCollectLootPreference';
import { mountClassGuidancePreferences } from './classGuidancePreferences';
import { mountCombatPacePreference } from './combatPacePreference';
import { mountRunRecords } from './runRecords';
import './mainMenu.css';
export const menuDefinition = [
  { id: 'continue', label: 'Continue' }, { id: 'new', label: 'New Game' },
  { id: 'records', label: 'Hall of Records' }, { id: 'settings', label: 'Settings' },
] as const;
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag); if (text) node.textContent = text; return node;
}
const pendingDefeatPrefix = 'tactics-guru:pending-defeat-history:';
function retryDefeatHistory(history: RunHistory, record: RunRecord | null) {
  if (record) {
    try { sessionStorage.setItem(pendingDefeatPrefix + record.id, JSON.stringify(record)); }
    catch { void history.record(record); }
  }
  let keys: string[];
  try { keys = Object.keys(sessionStorage).filter(key => key.startsWith(pendingDefeatPrefix)); }
  catch { return; }
  for (const key of keys) {
    try {
      const text = sessionStorage.getItem(key);
      const queued = text === null ? null : readRunRecord(JSON.parse(text));
      if (queued?.mode !== 'dungeon' || queued.outcome !== 'defeat' || key !== pendingDefeatPrefix + queued.id) continue;
      void history.record(queued).then(result => {
        if (!result.ok) return;
        try {
          if (sessionStorage.getItem(key) === text) sessionStorage.removeItem(key);
        } catch { /* Replaying an already recorded defeat is safe. */ }
      });
    } catch { /* Ignore invalid or unavailable retry entries. */ }
  }
}

export function startMainMenu() {
  document.title = 'Tactics Guru';
  document.body.classList.add('main-menu-page');
  for (const id of ['game', 'battle-shell']) document.getElementById(id)!.hidden = true;
  const main = element('main'); main.id = 'main-menu';
  const art = element('img'); art.className = 'menu-backdrop'; art.src = `${import.meta.env.BASE_URL}menu/dawn.webp`; art.alt = '';
  const content = element('div'); content.className = 'menu-content';
  const title = element('h1', 'Tactics Guru'); title.className = 'menu-title';
  const titleImage = element('img'); titleImage.src = `${import.meta.env.BASE_URL}menu/title.webp`; titleImage.alt = 'Tactics Guru'; titleImage.width = 2172; titleImage.height = 724;
  titleImage.onload = () => title.replaceChildren(titleImage);
  const nav = element('nav'); nav.setAttribute('aria-label', 'Main menu');
  const status = element('p'); status.className = 'menu-save-summary'; status.setAttribute('role', 'status');
  const dialog = element('dialog'); dialog.className = 'menu-dialog'; dialog.setAttribute('aria-labelledby', 'menu-dialog-title');
  const heading = element('h2'); heading.id = 'menu-dialog-title';
  const body = element('div'); const close = element('button', 'Close'); close.type = 'button';
  dialog.append(heading, body, close);
  let invoker: HTMLElement | null = null;
  let disposeContent = () => {};
  const restore = () => { if (invoker?.isConnected && !invoker.matches(':disabled')) invoker.focus(); };
  close.onclick = () => dialog.close(); dialog.addEventListener('close', () => { disposeContent(); disposeContent = () => {}; restore(); });
  function show(label: string, fill: () => void) {
    disposeContent(); disposeContent = () => {};
    if (!dialog.open) invoker = document.activeElement as HTMLElement;
    heading.textContent = label; body.replaceChildren(); fill();
    if (dialog.open) close.focus(); else dialog.showModal();
  }
  // Match native dialog focus behavior on WebKit's button-skipping Tab policy.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, summary')]
      .filter(node => node.checkVisibility());
    const index = controls.indexOf(document.activeElement as HTMLElement);
    event.preventDefault(); controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
  });
  const buttons = new Map<string, HTMLButtonElement>();
  function refresh() {
    const save = inspectMenuSave();
    buttons.get('continue')!.disabled = !save.resumable;
    status.textContent = save.needsRecovery ? 'Some saved data needs recovery. Your saves have been preserved.'
      : save.resumable ? 'Saved progress is available on this device.' : 'Your journey begins here. Saves stay on this device.';
    recovery.hidden = !(save.needsRecovery || save.fromBackup || save.hasDefeatedSave);
    return save;
  }
  function showRecovery() {
    const save = refresh();
    show('Save recovery', () => {
      body.append(element('p', 'Inspect, export or recover your dungeon save.'));
      const link = element('a', `Dungeon${save.fromBackup ? ' · backup (some progress may be lost)' : ''}${save.needsRecovery ? ' · recovery needed' : ''}`);
      link.href = menuGameHref('dungeon', import.meta.env.BASE_URL, 'recovery');
      body.append(link);
    });
  }
  const runHistory = new RunHistory('dungeon');
  const actionsMenu: Record<string, () => void> = {
    continue: () => {
      if (refresh().resumable) location.assign(menuGameHref('dungeon', import.meta.env.BASE_URL, 'continue'));
    },
    new: () => {
      const review = createDungeonStorage().inspect();
      if (resumableDungeonSlot(review) === null) {
        try { sessionStorage.removeItem('tactics-guru:menu-new-dungeon-review'); } catch { /* The destination rechecks storage. */ }
        location.assign(menuGameHref('dungeon', import.meta.env.BASE_URL, 'new'));
        return;
      }
      show('Start new dungeon?', () => {
        body.append(element('p', 'End this unfinished journey and replace only this device’s dungeon save with a full party and empty inventory? Export saved progress first if needed.'));
        const confirm = element('button', 'Start new dungeon'); confirm.type = 'button';
        confirm.onclick = () => {
          try {
            sessionStorage.setItem('tactics-guru:menu-new-dungeon-review', JSON.stringify({
              primary: { status: review.primary.status, text: review.primary.text },
              backup: { status: review.backup.status, text: review.backup.text },
            }));
          } catch { /* The destination will request confirmation again. */ }
          location.assign(menuGameHref('dungeon', import.meta.env.BASE_URL, 'new'));
        };
        body.append(confirm);
      });
    },
    records: () => show('Hall of Records', () => { disposeContent = mountRunRecords(body, runHistory.store, runHistory.whenIdle()); }),
    settings: () => show('Settings', () => {
      body.append(element('p', 'Use the in-game Sound controls to enable or mute audio. Sound starts after your interaction.'));
      mountCombatControlsPreference(body);
      const disposePace = mountCombatPacePreference(body);
      mountAutoCollectLootPreference(body);
      const disposeGuidance = mountClassGuidancePreferences(body);
      disposeContent = () => { disposePace(); disposeGuidance(); };
      mountTelemetryPreferences(body);
    }),
  };
  for (const entry of menuDefinition) {
    const button = element('button', entry.label); button.type = 'button'; button.dataset.menuAction = entry.id;
    button.onclick = () => { button.focus(); actionsMenu[entry.id](); }; buttons.set(entry.id, button); nav.append(button);
  }
  const recovery = element('button', 'Save recovery'); recovery.type = 'button'; recovery.className = 'menu-recovery';
  recovery.onclick = () => { recovery.focus(); showRecovery(); };
  const secondary = element('nav'); secondary.className = 'menu-secondary'; secondary.setAttribute('aria-label', 'Other modes');
  for (const [route, label] of [['battle', 'Standalone battle'], ['run', 'Three-encounter run'], ['map', 'Map inspection']] as const) {
    const link = element('a', label); link.href = route === 'map' ? routeHref(route, import.meta.env.BASE_URL) : menuGameHref(route, import.meta.env.BASE_URL); secondary.append(link);
  }
  content.append(title, nav, status, recovery, secondary, element('p', 'Choose your next adventure.'));
  main.append(art, content); document.body.append(main, dialog); refresh();
  void runHistory.reconcileDungeonDefeat(createDungeonStorage().inspect());
  let record: RunRecord | null = null;
  let retryHistory = false;
  try {
    const text = sessionStorage.getItem('tactics-guru:defeat-summary');
    if (text) {
      const handoff = JSON.parse(text);
      const candidate = readRunRecord(handoff?.record ?? handoff);
      if (candidate?.mode === 'dungeon' && candidate.outcome === 'defeat') record = candidate;
      retryHistory = handoff?.retryHistory === true;
    }
  } catch { /* Ignore malformed or unavailable handoffs. */ }
  // Retain an unsaved result until history confirms it. The summary is shown once.
  retryDefeatHistory(runHistory, retryHistory ? record : null);
  try { sessionStorage.removeItem('tactics-guru:defeat-summary'); } catch { /* Storage is optional. */ }
  if (record) {
    const defeat = record;
    show('Dungeon defeat', () => {
      body.append(element('p', 'Your party has fallen. Here is how far you made it.'));
      const stats = element('dl'); stats.className = 'run-statistics';
      const rows: [string, string][] = [
        ['Deepest floor', String(defeat.deepestFloor ?? '—')],
        ['Floors cleared', String(defeat.floorsCleared ?? '—')],
        ['Battles won', String(defeat.battlesWon)],
        ['Enemies killed', defeat.stats ? `${defeat.stats.enemiesKilled}${defeat.stats.coverage === 'since-upgrade' ? ' (since upgrade)' : ''}` : 'Unavailable'],
        ['Moves taken', defeat.stats ? `${defeat.stats.movesTaken}${defeat.stats.coverage === 'since-upgrade' ? ' (since upgrade)' : ''}` : 'Unavailable'],
        ['Active playtime', defeat.stats ? `${Math.floor(defeat.stats.activeMs / 60000)} min${defeat.stats.timeCoverage === 'since-upgrade' ? ' (since upgrade)' : ''}` : 'Unavailable'],
      ];
      for (const [name,value] of rows) { const cell=element('div'),dt=element('dt',name),dd=element('dd',value);cell.append(dt,dd);stats.append(cell); }
      body.append(stats);
      const actions=element('div'); actions.className='run-records-actions';
      const newGame=element('button','New Game');newGame.type='button';newGame.onclick=()=>{invoker=buttons.get('new')!;actionsMenu.new();};
      const records=element('button','Hall of Records');records.type='button';records.onclick=()=>{invoker=buttons.get('records')!;actionsMenu.records();};
      actions.append(newGame,records);body.append(actions);
    });
  }
  for (const event of ['focus', 'pageshow', 'storage']) window.addEventListener(event, refresh);
  document.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
}
