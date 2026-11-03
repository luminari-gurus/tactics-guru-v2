import { test as base, type BrowserContext, type Page } from '@playwright/test';
export { expect } from '@playwright/test';
export type { Page, BrowserContext, Locator } from '@playwright/test';

const railInit = () => {
  try { (globalThis as { __tacticsGuruCombatControls?: string }).__tacticsGuruCombatControls = 'rail'; } catch { /* ignore */ }
  try { localStorage.setItem('tactics-guru:combat-controls', 'rail'); } catch { /* private mode */ }
};

/** Apply to extra BrowserContexts that Playwright fixtures cannot see. */
export async function installRailControls(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript(railInit);
}

/**
 * File-scoped fixture, not a helper `test.beforeEach`. Top-level hooks in this
 * module would register only on the first spec that imports it (workers: 1).
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await installRailControls(context);
    await use(context);
  },
});
