import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { APPLICATION_LOAD_FAILURE_EVENT, APPLICATION_LOAD_FILES_MANIFEST, readApplicationLoadFailure, type ApplicationLoadFailure } from '../../src/diagnostics/applicationLoadFailure';
import { startStartupDiagnostics } from './startupObserver';

export interface CapturedApplicationLoadFailure extends ApplicationLoadFailure { elapsedMs: number }
export interface ApplicationLoadDiagnostics {
  failures(): CapturedApplicationLoadFailure[];
  finalize(): Promise<void>;
}

async function readBuildFiles(): Promise<ReadonlySet<string>> {
  if (process.env.PLAYWRIGHT_SERVER_MODE === 'dev') return new Set();
  try {
    const manifest = await readFile(new URL(`../../dist/${APPLICATION_LOAD_FILES_MANIFEST}`, import.meta.url), 'utf8');
    return new Set<string>(JSON.parse(manifest));
  } catch {
    // Dev runs and missing build metadata still retain the fixed source labels.
    return new Set();
  }
}

/** Keep caught import failures across reloads, including when the page clock is paused. */
export async function startApplicationLoadDiagnostics(page: Page, info: TestInfo): Promise<ApplicationLoadDiagnostics> {
  const buildFiles = await readBuildFiles();
  const finishStartup = await startStartupDiagnostics(page, info, buildFiles), started = performance.now();
  const failures: CapturedApplicationLoadFailure[] = [];
  let finalized = false;
  const binding = '__tacticsCaptureApplicationLoadFailure';
  try {
    await page.exposeBinding(binding, (_source, value: unknown) => {
      const detail = readApplicationLoadFailure(value, buildFiles);
      if (finalized || !detail) return;
      if (failures.length === 16) failures.shift();
      failures.push({ elapsedMs: performance.now() - started, ...detail });
    });
    await page.addInitScript(({ event, binding }) => {
      window.addEventListener(event, received => {
        try {
          const capture = (window as unknown as Record<string, (value: unknown) => Promise<void>>)[binding];
          void capture((received as CustomEvent).detail).catch(() => {});
        } catch { /* Test observations do not change the application recovery path. */ }
      });
    }, { event: APPLICATION_LOAD_FAILURE_EVENT, binding });
  } catch (error) {
    finalized = true;
    await finishStartup();
    throw error;
  }
  return {
    failures: () => structuredClone(failures),
    async finalize() {
      if (finalized) return;
      finalized = true;
      try {
        if (info.status !== info.expectedStatus) await info.attach('application-load-evidence', {
          body: JSON.stringify({ failures }, null, 2), contentType: 'application/json',
        });
      } finally { await finishStartup(); }
    },
  };
}
