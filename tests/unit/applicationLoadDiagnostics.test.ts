import type { Page, TestInfo } from '@playwright/test';
import { beforeEach, expect, it, vi } from 'vitest';
import { startApplicationLoadDiagnostics } from '../helpers/applicationLoadDiagnostics';
import { startStartupDiagnostics } from '../helpers/startupObserver';

vi.mock('../helpers/startupObserver', () => ({ startStartupDiagnostics: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

function setup(status: 'passed' | 'failed' = 'failed') {
  const finish = vi.fn(async () => {});
  vi.mocked(startStartupDiagnostics).mockResolvedValue(finish);
  let receive: (source: unknown, value: unknown) => void = () => {};
  const page = {
    exposeBinding: vi.fn(async (_name, callback) => { receive = callback; }),
    addInitScript: vi.fn(async () => {}),
  };
  const info = { status, expectedStatus: 'passed', attach: vi.fn(async () => {}) };
  return { page, info, finish, receive: (value: unknown) => receive({}, value),
    start: () => startApplicationLoadDiagnostics(page as unknown as Page, info as unknown as TestInfo) };
}
const detail = { route: 'battle', name: 'TypeError', category: 'module-fetch', frames: [{ file: 'dev:battle' }] };

it('retains a bounded safe copy across page notifications and stops recording/attaching after finalization', async () => {
  const fixture = setup(), capture = await fixture.start();
  for (let i = 0; i < 20; i++) fixture.receive({ ...detail, frames: [{ file: 'dev:battle', line: i, save: 'PRIVATE' }], error: 'PRIVATE' });
  fixture.receive({ ...detail, category: 'PRIVATE' });
  expect(capture.failures()).toHaveLength(16);
  expect(capture.failures()[0].frames).toEqual([{ file: 'dev:battle', line: 4 }]);
  expect(capture.failures().every(f => Number.isFinite(f.elapsedMs) && f.elapsedMs >= 0)).toBe(true);
  capture.failures()[0].frames[0].file = 'PRIVATE';
  expect(capture.failures()[0].frames[0].file).toBe('dev:battle');
  await capture.finalize(); await capture.finalize(); fixture.receive(detail);
  expect(capture.failures()).toHaveLength(16); expect(fixture.finish).toHaveBeenCalledTimes(1);
  expect(fixture.info.attach).toHaveBeenCalledTimes(1);
  const [name, attachment] = vi.mocked(fixture.info.attach).mock.calls[0] as unknown as [string, { body: string; contentType: string }];
  expect(name).toBe('application-load-evidence'); expect(attachment.contentType).toBe('application/json');
  expect(attachment.body).not.toContain('PRIVATE'); expect(JSON.parse(attachment.body).failures).toHaveLength(16);
});

it('cleans the inherited observer without creating failure attachments for an expected pass', async () => {
  const fixture = setup('passed'), capture = await fixture.start(); fixture.receive(detail);
  await capture.finalize();
  expect(fixture.finish).toHaveBeenCalledTimes(1); expect(fixture.info.attach).not.toHaveBeenCalled();
});

it.each(['exposeBinding','addInitScript'] as const)('cleans the inherited observer when %s setup fails, with no retry', async stage => {
  const fixture = setup(), failure = Error('setup failure');
  fixture.page[stage].mockRejectedValueOnce(failure);
  await expect(fixture.start()).rejects.toBe(failure);
  expect(fixture.finish).toHaveBeenCalledTimes(1); expect(fixture.page.exposeBinding).toHaveBeenCalledTimes(1);
  expect(fixture.info.attach).not.toHaveBeenCalled();
  if (stage === 'exposeBinding') expect(fixture.page.addInitScript).not.toHaveBeenCalled();
});
