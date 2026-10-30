export type AppRoute = 'menu' | 'battle' | 'run' | 'dungeon' | 'map';
export type EntryIntent = 'continue' | 'new' | 'recovery';
const scenes = new Set(['battle', 'proof', 'content-smoke']);
export function classifyRoute(pathname: string, search = '', base = '/'): AppRoute {
  const root = base.replace(/\/+$/, '');
  const path = pathname.replace(/\/+$/, '');
  for (const route of ['battle', 'run', 'dungeon', 'map'] as const) {
    if (path === `${root}/${route}`) return route;
  }
  if (path === root && scenes.has(new URLSearchParams(search).get('scene') ?? '')) return 'battle';
  return 'menu';
}
export function routeHref(route: AppRoute, base = '/', intent?: EntryIntent): string {
  return `${base.replace(/\/+$/, '')}/${route === 'menu' ? '' : route}${intent ? `?entry=${intent}` : ''}`;
}
/** Remove the request from history before using it; reloading cannot repeat it. */
export function consumeEntryIntent(): EntryIntent | null {
  const url = new URL(location.href), value = url.searchParams.get('entry');
  if (value === null) return null;
  url.searchParams.delete('entry'); history.replaceState(history.state, '', url);
  return value === 'continue' || value === 'new' || value === 'recovery' ? value : null;
}
