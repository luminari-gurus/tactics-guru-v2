import { menuGameHref, type GameMode } from '../app/routes';
/** Explain the session boundary. The dungeon sandbox can link to the saved dungeon mode. */
export function testingProgress(mode: GameMode): HTMLElement {
  const notice = document.createElement('span');
  if (mode !== 'dungeon') {
    notice.textContent = 'Progress resets on reload or when you leave.';
    return notice;
  }
  notice.append('Testing dungeon. Progress resets on reload. This is a temporary session. ');
  const link = document.createElement('a');
  link.href = menuGameHref('dungeon', import.meta.env.BASE_URL);
  link.textContent = 'Open saved dungeon mode';
  notice.append(link);
  return notice;
}
