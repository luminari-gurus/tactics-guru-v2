import { test as plain, type Page, type TestInfo } from '@playwright/test';
import { test as dungeon, railTest as dungeonRail } from './dungeonEntropy';
import { startStartupDiagnostics } from './startupObserver';
export { expect, type Page } from '@playwright/test';

async function diagnostics({ page }: { page: Page }, use: () => Promise<void>, info: TestInfo) {
  const finalize = await startStartupDiagnostics(page, info);
  try { await use(); } finally { await finalize(); }
}

// Keep each suite's original fixture chain, including dungeon entropy and rails.
export const test = dungeon.extend<{ startupDiagnostics: void }>({ startupDiagnostics: [diagnostics, { auto: true }] });
export const plainTest = plain.extend<{ startupDiagnostics: void }>({ startupDiagnostics: [diagnostics, { auto: true }] });
export const railTest = dungeonRail.extend<{ startupDiagnostics: void }>({ startupDiagnostics: [diagnostics, { auto: true }] });
