import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyRoute, consumeEntryIntent, menuGameHref, resolveAppEntry, routeHref } from '../../src/app/routes';
afterEach(() => vi.unstubAllGlobals());
describe('base-aware menu routing', () => {
  for (const base of ['/', '/prototype/']) {
    it(`keeps supported paths and scene diagnostics at ${base}`, () => {
      expect(classifyRoute(base, '', base)).toBe('menu');
      expect(classifyRoute(base, '?debug=1', base)).toBe('menu');
      for (const scene of ['battle', 'proof', 'content-smoke']) {
        expect(resolveAppEntry(base, `?game=dungeon&scene=${scene}`, base)).toEqual({ route: 'battle', persistent: false });
      }
      expect(classifyRoute(base, '?scene=unknown', base)).toBe('menu');
      for (const route of ['battle', 'run', 'dungeon', 'map', 'qbert'] as const) {
        const href=routeHref(route,base);
        for (const search of ['', '?entry=continue', '?game=dungeon&entry=new', '?scene=proof&game=battle']) {
          expect(resolveAppEntry(href+'/', search,base)).toEqual({route,persistent:false});
        }
      }
      expect(classifyRoute('/unrelated','',base)).toBe('menu');
      expect(routeHref('menu',base)).toBe(base);
    });
    it(`admits only one supported menu game at the base root ${base}`, () => {
      for (const game of ['battle', 'run', 'dungeon'] as const) {
        expect(menuGameHref(game, base, 'new')).toBe(`${base}?game=${game}&entry=new`);
        for (const path of [base, base.replace(/\/$/, '')]) {
          expect(resolveAppEntry(path, `?game=${game}&entry=continue`, base)).toEqual({ route: game, persistent: true });
        }
      }
      for (const search of ['?game=map', '?game=unknown', '?game=', '?game=battle&game=run', '?game=run&game=run', '?scene=unknown', '?entry=new']) {
        expect(resolveAppEntry(base, search, base)).toEqual({ route: 'menu', persistent: false });
      }
      expect(resolveAppEntry(base, '?game=run&scene=unknown', base)).toEqual({ route: 'run', persistent: true });
      expect(resolveAppEntry(base, '?game=run&scene=unknown&scene=proof', base)).toEqual({ route: 'run', persistent: true });
      expect(resolveAppEntry(base, '?scene=unknown&scene=proof', base)).toEqual({ route: 'menu', persistent: false });
      expect(resolveAppEntry(base, '?game=run&scene=proof&scene=unknown', base)).toEqual({ route: 'battle', persistent: false });
    });
    it.each(['new', 'continue', 'recovery', 'unrecognized'])(`consumes %s once while retaining persistent identity at ${base}`, intent => {
      const location = { href: `https://test.invalid${base}?game=dungeon&entry=${intent}#floor` };
      const history = { state: { preserved: true }, replaceState: vi.fn((_state: unknown, _unused: string, url: URL) => { location.href = String(url); }) };
      vi.stubGlobal('location', location); vi.stubGlobal('history', history);
      expect(consumeEntryIntent()).toBe(intent === 'unrecognized' ? null : intent);
      expect(location.href).toBe(`https://test.invalid${base}?game=dungeon#floor`);
      expect(history.replaceState.mock.calls[0][0]).toEqual({ preserved: true });
      expect(consumeEntryIntent()).toBeNull();
      expect(history.replaceState).toHaveBeenCalledTimes(1);
      const url = new URL(location.href);
      expect(resolveAppEntry(url.pathname, url.search, base)).toEqual({ route: 'dungeon', persistent: true });
    });
  }
});
