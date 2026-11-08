import { errors, test as plain, type Page, type TestInfo } from '@playwright/test';
import { performance as hostClock } from 'node:perf_hooks';
import { test as dungeon, railTest as dungeonRail } from './dungeonEntropy';
import { startStartupDiagnostics } from './startupObserver';
export { expect, type Page } from '@playwright/test';

/** Preserve the assertion failure while observing the same page for #257. */
export async function observeStartupAssertion(
  page: Page, target: 'Ready' | 'Battle ready' | 'player', assertReady: () => Promise<void>,
): Promise<void> {
  try {
    await assertReady();
  } catch (error) {
    if (process.env.ISSUE_257_STARTUP_CAPTURE !== '1') throw error;
    const info = plain.info();
    const timeout = 12_000;
    const failedAt = Date.now();
    const started = hostClock.now();
    // Leave the original test budget in force until the assertion has failed.
    info.setTimeout(info.timeout + timeout + 2_000);
    let outcome = 'unavailable';
    try {
      const result = await page.waitForFunction(expected => {
        const status = document.querySelector('#fit-status');
        const phase = document.querySelector<HTMLElement>('#game')?.dataset.phase;
        if (status?.getAttribute('role') === 'alert' || phase === 'error') return 'terminal-error';
        if (expected === 'player' ? phase === expected : status?.textContent === expected) return 'ready';
        return false;
      }, target, { polling: 100, timeout });
      const observed = await result.jsonValue();
      if (typeof observed === 'string') outcome = observed;
      await result.dispose();
    } catch (diagnosticError) {
      if (diagnosticError instanceof errors.TimeoutError) outcome = 'still-waiting';
    }
    try {
      await info.attach('startup-tail', {
        body: JSON.stringify({ target, failedAt, elapsedMs: hostClock.now() - started, outcome }),
        contentType: 'application/json',
      });
    } finally {
      throw error;
    }
  }
}

async function diagnostics({ page }: { page: Page }, use: () => Promise<void>, info: TestInfo) {
  const finalize = await startStartupDiagnostics(page, info);
  try { await use(); } finally { await finalize(); }
}

// Keep each suite's original fixture chain, including dungeon entropy and rails.
export const test = dungeon.extend<{ startupDiagnostics: void }>({ startupDiagnostics: [diagnostics, { auto: true }] });
export const plainTest = plain.extend<{ startupDiagnostics: void }>({ startupDiagnostics: [diagnostics, { auto: true }] });
export const railTest = dungeonRail.extend<{ startupDiagnostics: void }>({ startupDiagnostics: [diagnostics, { auto: true }] });
