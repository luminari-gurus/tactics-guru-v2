import { test, expect, type Page } from './helpers/forceRailControls';
const endpoint = 'https://us.i.posthog.com/**';
type Event = { event: string; properties: Record<string, any> };
async function ingest(page: Page, blocked = false) {
  const events: Event[] = [];
  await page.route(endpoint, async route => {
    const body = route.request().postData();
    if (body) {
      const parsed = JSON.parse(body);
      events.push(...(Array.isArray(parsed) ? parsed : parsed.batch ?? [parsed]));
    }
    if (blocked) await route.abort(); else await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
  });
  return events;
}
for (const signal of ['opt-out','DNT','GPC'] as const) test(`${signal} prevents parser loading and all collection`, async ({ page }) => {
  const events = await ingest(page); const sdk: string[] = []; page.on('request', r => { if (r.url().includes('/transport-')) sdk.push(r.url()); });
  await page.addInitScript(signal => {
    if (signal === 'opt-out') localStorage.setItem('tactics-guru:telemetry-opt-out', 'true');
    else Object.defineProperty(navigator, signal === 'DNT' ? 'doNotTrack' : 'globalPrivacyControl', { value: signal === 'DNT' ? '1' : true });
  }, signal);
  await page.goto('./'); await expect(page.locator('#main-menu')).toBeVisible();
  expect(events).toEqual([]); expect(sdk).toEqual([]);
});
test('uncaught errors and rejections are sanitized and duplicate objects are reported once', async ({ page }) => {
  const events = await ingest(page);
  await page.goto('./'); await expect(page.locator('#main-menu')).toBeVisible();
  await expect.poll(() => events.filter(e => e.event === '$exception').length).toBe(1); // Controlled verification.
  await page.evaluate(() => {
    const error = new TypeError('private error with save contents');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    window.dispatchEvent(new ErrorEvent('error', { error }));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: error }));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: { payload: 'private save' } }));
  });
  await expect.poll(() => events.filter(e => e.event === '$exception').length).toBe(3);
  expect(events.filter(e => e.properties.failure === 'runtime_error')).toHaveLength(1);
  expect(events.filter(e => e.properties.failure === 'unhandled_rejection')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain('private');
});
