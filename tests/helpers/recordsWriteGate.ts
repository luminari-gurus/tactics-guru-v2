import type { Page } from '@playwright/test';
import { RUN_RECORD_KEYS } from '../../src/persistence/runRecordsStorage';

/** Delay only replacement's final history mutation; keep the native lock and receiver. */
export async function holdFinalRecordsWrite(page: Page) {
  await page.evaluate(key => {
    const proto = Object.getPrototypeOf(navigator.locks) as LockManager, request = proto.request;
    let count = 0;
    // Intercept the prototype so a browser's native instance wrapper cannot bypass the gate.
    proto.request = (function(this: LockManager, name: string, ...args: any[]) {
      if (name === key && ++count === 2) {
        document.documentElement.dataset.recordsHeld = 'yes';
        return new Promise(resolve => {
          (window as any).releaseRecords = () => resolve((request as any).call(this, name, ...args));
        });
      }
      return (request as any).call(this, name, ...args);
    }) as typeof navigator.locks.request;
  }, RUN_RECORD_KEYS.primary);
  return () => page.evaluate(() => (window as any).releaseRecords());
}
