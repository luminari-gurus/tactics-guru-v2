export type AppRoute = 'menu' | 'battle' | 'run' | 'dungeon' | 'map';
export type EntryIntent = 'continue' | 'new' | 'recovery';
export type GameMode = 'battle' | 'run' | 'dungeon';
export interface AppEntry { route: AppRoute; persistent: boolean }
/** Self-contained so the production preload script uses this exact policy too. */
export function resolveAppEntry(pathname: string, search = '', base = '/'): AppEntry {
  const root = base.replace(/\/+$/, '');
  const path = pathname.replace(/\/+$/, '');
  for (const route of ['battle', 'run', 'dungeon', 'map'] as const) {
    if (path === `${root}/${route}`) return { route, persistent: false };
  }
  if (path === root) {
    const params = new URLSearchParams(search);
    if (params.getAll('scene').some(scene => ['battle', 'proof', 'content-smoke'].includes(scene))) {
      return { route: 'battle', persistent: false };
    }
    const games = params.getAll('game');
    if (games.length === 1 && (games[0] === 'battle' || games[0] === 'run' || games[0] === 'dungeon')) {
      return { route: games[0], persistent: true };
    }
  }
  return { route: 'menu', persistent: false };
}
export function classifyRoute(pathname: string, search = '', base = '/'): AppRoute {
  return resolveAppEntry(pathname, search, base).route;
}
export function routeHref(route: AppRoute, base = '/'): string {
  return `${base.replace(/\/+$/, '')}/${route === 'menu' ? '' : route}`;
}
export function menuGameHref(mode: GameMode, base = '/', intent?: EntryIntent): string {
  return `${routeHref('menu', base)}?game=${mode}${intent ? `&entry=${intent}` : ''}`;
}
/** Remove the request from history before using it; reloading cannot repeat it.
 * Unknown `entry` values are consumed and ignored so startup is unchanged. */
export function consumeEntryIntent(): EntryIntent | null {
  const url = new URL(location.href), value = url.searchParams.get('entry');
  if (value === null) return null;
  url.searchParams.delete('entry'); history.replaceState(history.state, '', url);
  return value === 'continue' || value === 'new' || value === 'recovery' ? value : null;
}
