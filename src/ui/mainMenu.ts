import { inspectMenuSaves, type MenuSave } from '../app/menuSaves';
import { routeHref } from '../app/routes';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import './mainMenu.css';
export const menuDefinition = [
  { id: 'continue', label: 'Continue' }, { id: 'new', label: 'New Game' },
  { id: 'records', label: 'Hall of Records' }, { id: 'settings', label: 'Settings' },
] as const;
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag); if (text) node.textContent = text; return node;
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
  const tagline = element('p', 'A path through the forgotten realms'); tagline.className = 'menu-tagline';
  const nav = element('nav'); nav.setAttribute('aria-label', 'Main menu');
  const status = element('p'); status.className = 'menu-save-summary'; status.setAttribute('role', 'status');
  const dialog = element('dialog'); dialog.className = 'menu-dialog'; dialog.setAttribute('aria-labelledby', 'menu-dialog-title');
  const heading = element('h2'); heading.id = 'menu-dialog-title';
  const body = element('div'); const close = element('button', 'Close'); close.type = 'button';
  dialog.append(heading, body, close);
  let invoker: HTMLElement | null = null;
  const restore = () => { if (invoker?.isConnected && !invoker.matches(':disabled')) invoker.focus(); };
  close.onclick = () => dialog.close(); dialog.addEventListener('close', restore);
  function show(label: string, fill: () => void) {
    invoker = document.activeElement as HTMLElement; heading.textContent = label; body.replaceChildren(); fill(); dialog.showModal();
  }
  // Match native dialog focus behavior on WebKit's button-skipping Tab policy.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, summary')];
    const index = controls.indexOf(document.activeElement as HTMLElement);
    event.preventDefault(); controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
  });
  const buttons = new Map<string, HTMLButtonElement>();
  function refresh() {
    const saves = inspectMenuSaves(), valid = saves.filter(save => save.resumable);
    buttons.get('continue')!.disabled = !valid.length;
    status.textContent = saves.some(save => save.needsRecovery) ? 'Some saved data needs recovery. Your saves have been preserved.'
      : valid.length ? 'Saved progress is available on this device.' : 'Your journey begins here. Saves stay on this device.';
    recovery.hidden = !saves.some(save => save.needsRecovery || save.fromBackup);
    return saves;
  }
  function choose(saves: MenuSave[], recoveryMode: boolean) {
    show(recoveryMode ? 'Save recovery' : 'Continue a journey', () => {
      body.append(element('p', recoveryMode ? 'Open a mode to inspect, export or recover its saves. Nothing is removed here.' : 'Choose which saved journey to continue.'));
      for (const save of saves) {
        const link = element('a', `${save.label}${save.fromBackup ? ' · backup (some progress may be lost)' : ''}${save.needsRecovery ? ' · recovery needed' : ''}`);
        link.href = routeHref(save.mode, import.meta.env.BASE_URL, recoveryMode ? 'recovery' : 'continue'); body.append(link);
      }
    });
  }
  const actions: Record<string, () => void> = {
    continue: () => {
      const saves = refresh().filter(save => save.resumable);
      if (saves.length === 1) location.assign(routeHref(saves[0].mode, import.meta.env.BASE_URL, 'continue'));
      else if (saves.length) choose(saves, false);
    },
    new: () => location.assign(routeHref('dungeon', import.meta.env.BASE_URL, 'new')),
    records: () => show('Hall of Records', () => body.append(element('p', 'Records are not collected yet. Future records will be stored on this device.'))),
    settings: () => show('Settings', () => {
      body.append(element('p', 'Use the in-game Sound controls to enable or mute audio. Sound starts after your interaction.'));
      mountTelemetryPreferences(body);
    }),
  };
  for (const entry of menuDefinition) {
    const button = element('button', entry.label); button.type = 'button'; button.dataset.menuAction = entry.id;
    button.onclick = () => { button.focus(); actions[entry.id](); }; buttons.set(entry.id, button); nav.append(button);
  }
  const recovery = element('button', 'Save recovery'); recovery.type = 'button'; recovery.className = 'menu-recovery';
  recovery.onclick = () => { recovery.focus(); choose(refresh(), true); };
  const secondary = element('nav'); secondary.className = 'menu-secondary'; secondary.setAttribute('aria-label', 'Other modes');
  for (const [route, label] of [['battle', 'Standalone battle'], ['run', 'Three-encounter run'], ['map', 'Map inspection']] as const) {
    const link = element('a', label); link.href = routeHref(route, import.meta.env.BASE_URL); secondary.append(link);
  }
  content.append(title, tagline, nav, status, recovery, secondary, element('p', 'Choose your next adventure.'));
  main.append(art, content); document.body.append(main, dialog); refresh();
  for (const event of ['focus', 'pageshow', 'storage']) window.addEventListener(event, refresh);
  document.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
}
