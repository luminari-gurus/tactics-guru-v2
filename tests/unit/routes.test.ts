import { describe, expect, it } from 'vitest';
import { classifyRoute, routeHref } from '../../src/app/routes';
describe('base-aware menu routing', () => {
  for (const base of ['/', '/prototype/']) {
    it(`keeps supported paths and scene diagnostics at ${base}`, () => {
      expect(classifyRoute(base, '', base)).toBe('menu');
      expect(classifyRoute(base, '?debug=1', base)).toBe('menu');
      for (const scene of ['battle', 'proof', 'content-smoke']) expect(classifyRoute(base, `?scene=${scene}`, base)).toBe('battle');
      expect(classifyRoute(base, '?scene=unknown', base)).toBe('menu');
      for (const route of ['battle', 'run', 'dungeon', 'map'] as const) {
        const href=routeHref(route,base);
        expect(classifyRoute(href+'/', '?scene=proof',base)).toBe(route);
        expect(routeHref(route,base,'continue')).toBe(href+'?entry=continue');
      }
      expect(classifyRoute('/unrelated','',base)).toBe('menu');
      expect(routeHref('menu',base)).toBe(base);
    });
  }
});
