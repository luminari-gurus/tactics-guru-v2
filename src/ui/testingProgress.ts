import { menuGameHref, type GameMode } from '../app/routes';
/** Direct routes are deliberate sandboxes; offer the corresponding saved mode explicitly. */
export function testingProgress(mode: GameMode): HTMLElement {
  const notice = document.createElement('span');
  notice.append(`Testing ${mode}. Progress resets on reload. This is a temporary session. `);
  const link = document.createElement('a');
  link.href = menuGameHref(mode, import.meta.env.BASE_URL);
  link.textContent = `Open saved ${mode} mode`;
  notice.append(link);
  return notice;
}
