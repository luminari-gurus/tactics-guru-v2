import { expect, test } from '@playwright/test';
import { battleCatalog } from '../src/content/catalog';

for (const scenario of ['success', 'malformed', 'unknown', 'missing', 'corrupt', 'stalled'] as const) {
  test(`content smoke: ${scenario}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    if (scenario === 'malformed' || scenario === 'unknown') {
      const input = structuredClone(battleCatalog);
      if (scenario === 'malformed') Object.assign(input.maps['map:forest_ruins'], { width: -1 });
      else Object.assign(input.terrains.grass, { surfaceAssetId: 'asset:unknown' });
      await page.route('**/battle/content-fixture.json', route => route.fulfill({ json: input }));
    }
    if (scenario === 'missing') await page.route('**/battle/terrain/grass.png', route => route.fulfill({ status: 404 }));
    if (scenario === 'corrupt') await page.route('**/battle/terrain/grass.png', route => route.fulfill({ contentType: 'image/png', body: 'invalid PNG bytes' }));
    if (scenario === 'stalled') await page.route('**/battle/terrain/grass.png', () => {});
    await page.goto(`/?scene=content-smoke${scenario === 'malformed' || scenario === 'unknown' ? '&contentFixture=1' : ''}`);
    if (scenario === 'success') {
      await expect(page.getByRole('status')).toHaveText('Content ready');
      const report = JSON.parse((await page.locator('#game').getAttribute('data-content-report'))!);
      expect(report.assets.sort()).toEqual(Object.keys(battleCatalog.assets).sort());
      expect(report.surfaces).toHaveLength(10);
      expect(report.cornerError).toBeLessThan(0.001);
      expect(report.adjacentEdgeError).toBeLessThan(0.001);
      expect(report.orientation).toBe('image-up to diamond top-right edge');
      const canvas = await page.locator('canvas').boundingBox();
      expect(canvas?.width).toBeGreaterThan(0);
      await page.screenshot({ path: test.info().outputPath('content-initial.png') });
      await page.setViewportSize({ width: 844, height: 390 });
      await expect.poll(async () => JSON.parse((await page.locator('#game').getAttribute('data-content-report'))!).viewport).toEqual({ width: 844, height: 390 });
      await expect.poll(async () => JSON.parse((await page.locator('#game').getAttribute('data-content-report'))!).cornerError).toBeLessThan(0.001);
      await page.screenshot({ path: test.info().outputPath('content-resized.png') });
    } else {
      await expect(page.getByRole('status')).toContainText(scenario === 'malformed' || scenario === 'unknown' ? 'Invalid content' : 'Asset load failed', { timeout: 20000 });
      await expect(page.locator('#game')).toHaveAttribute('data-ready', 'false');
      await expect(page.getByRole('status')).not.toContainText('Loading');
      expect(await page.getByRole('status').evaluate(element => { const panel = element.closest('#fit-panel')!; return panel.scrollWidth <= panel.clientWidth; })).toBe(true);
    }
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`content-${scenario}.png`) });
  });
}
