import { expect, test } from '@playwright/test';

for (const { path, chunk, otherChunk } of [
  { path: '/map', chunk: 'view-', otherChunk: 'startBattleApp-' },
  { path: '/', chunk: 'startBattleApp-', otherChunk: 'view-' },
]) {
  test(`failed route import at ${path} shows a reload instruction`, async ({ page }) => {
    const errors: string[] = [];
    const scripts: string[] = [];
    let aborted = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await page.route(`**/assets/${chunk}*.js`, route => {
      aborted = true;
      return route.abort();
    });
    await page.goto(path);
    await expect(page.getByRole('alert')).toHaveText('Error: Could not load the application. Reload the page to retry.');
    expect(aborted).toBe(true);
    await expect(page.locator('#fit-restart')).toBeDisabled();
    await expect(page.locator('canvas, #map-grid')).toHaveCount(0);
    expect(scripts.some(url => url.includes(`/assets/${otherChunk}`))).toBe(false);
    expect(errors).toEqual([]);
    await page.unrouteAll();
    await page.reload();
    if (path === '/map') await expect(page.locator('#map-grid span')).toHaveCount(400);
    else await expect(page.locator('#fit-status')).toHaveText('Battle ready');
    expect(errors).toEqual([]);
  });
}

test('map direct entry, refresh, seeds and responsive inspection', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/map');
  const grid = page.locator('#map-grid');
  await expect(grid.locator('span')).toHaveCount(400);
  await expect(grid).toHaveAttribute('data-seed', '1');
  await page.reload();
  await expect(grid.locator('span')).toHaveCount(400);
  const signature = () => grid.locator('span').evaluateAll(cells => cells.map(c => c.className).join(','));
  await page.getByLabel('Seed', { exact: true }).fill('12345');
  await page.getByLabel('Seed', { exact: true }).press('Enter');
  await expect(grid).toHaveAttribute('data-seed', '12345');
  const original = await signature();
  await page.getByRole('button', { name: 'New seed', exact: true }).click();
  await expect(grid).not.toHaveAttribute('data-seed', '12345');
  expect(await signature()).not.toBe(original);
  await page.getByLabel('Seed', { exact: true }).fill('12345');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  expect(await signature()).toBe(original);
  for (const invalid of ['', '-1', '1.5', '4294967296', 'abc']) {
    await page.getByLabel('Seed', { exact: true }).fill(invalid);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('#map-status')).toContainText('The map is unchanged');
    expect(await signature()).toBe(original);
    await expect(page.locator('#map-seed')).toHaveAttribute('aria-invalid', 'true');
  }
  await page.getByLabel('Seed', { exact: true }).fill('4294967295');
  await page.getByLabel('Seed', { exact: true }).press('Enter');
  await expect(grid).toHaveAttribute('data-seed', '4294967295');
  await expect(page.locator('#map-seed')).not.toHaveAttribute('aria-invalid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const dimensions = await grid.locator('span').first().boundingBox();
  expect(dimensions!.width).toBeGreaterThan(12);
  for (const control of ['#map-type', '#map-seed', '#map-new-seed', '#map-controls button[type="submit"]']) {
    await page.locator(control).scrollIntoViewIfNeeded();
    const rect = await page.locator(control).boundingBox();
    expect(rect!.width).toBeGreaterThanOrEqual(44);
    expect(rect!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath('map.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('map never initializes battle, audio, diagnostics or storage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tg:phaser:battle:primary', 'preserve-phaser');
    localStorage.setItem('godot-save', 'preserve-legacy');
    const calls: string[] = [];
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { value: function (...args: unknown[]) {
        calls.push(`${method}:${args[0] ?? ''}`);
        return Reflect.apply(original, this, args);
      } });
    }
    Object.assign(window, { mapStorageCalls: calls });
  });
  const scripts: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  await page.goto('/map/?scene=proof');
  await expect(page.locator('#map-grid')).toBeVisible();
  for (const type of ['random-walker', 'cellular', 'rooms']) await page.getByLabel('Map type', { exact: true }).selectOption(type);
  await page.getByRole('button', { name: 'New seed', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { mapStorageCalls: string[] }).mapStorageCalls)).toEqual([]);
  expect(await page.evaluate(() => ({ primary: localStorage.getItem('tg:phaser:battle:primary'), legacy: localStorage.getItem('godot-save') }))).toEqual({ primary: 'preserve-phaser', legacy: 'preserve-legacy' });
  expect(scripts.some(url => /startBattleApp|\/start-|\/browser-/.test(url))).toBe(false);
  await expect(page.locator('canvas, audio, #fit-panel')).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.fitDiagnostics)).toBe('undefined');
  scripts.length = 0;
  await page.goto('/');
  await expect(page.locator('#fit-status')).toHaveText('Battle ready');
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(scripts.some(url => /\/(?:view-|src\/map\/)/.test(url))).toBe(false);
});

test('new seed still works when browser entropy fails or returns the current seed', async ({ page }) => {
  await page.addInitScript(() => {
    crypto.getRandomValues = (() => { throw Error('unavailable'); }) as typeof crypto.getRandomValues;
  });
  await page.goto('/map');
  await page.getByLabel('Map type', { exact: true }).selectOption('cellular');
  await page.getByRole('button', { name: 'New seed', exact: true }).click();
  await expect(page.getByLabel('Map type', { exact: true })).toHaveValue('cellular');
  await expect(page.locator('#map-grid')).toHaveAttribute('data-seed', '2');
  await page.evaluate(() => { crypto.getRandomValues = ((values: Uint32Array) => { values[0] = 2; return values; }) as typeof crypto.getRandomValues; });
  await page.getByRole('button', { name: 'New seed', exact: true }).click();
  await expect(page.locator('#map-grid')).toHaveAttribute('data-seed', '3');
});


test('map types apply the displayed seed and retain committed choices', async ({ page }, testInfo) => {
  await page.goto('/map');
  const grid = page.locator('#map-grid');
  const type = page.getByLabel('Map type', { exact: true });
  const seed = page.getByLabel('Seed', { exact: true });
  const signature = () => grid.locator('span').evaluateAll(cells => cells.map(c => c.className).join(','));
  await expect(type).toHaveValue('rooms');
  await type.focus();
  await expect(type).toBeFocused();
  await type.press('c');
  await type.press('Tab');
  await expect(type).toHaveValue('cellular');
  await expect(grid).toHaveAttribute('data-type', 'cellular');
  const layouts = new Set<string>();
  for (const [id, version] of [['rooms', 'rooms-v1'], ['random-walker', 'random-walker-v1'], ['cellular', 'cellular-v1']]) {
    await seed.fill('12345');
    await type.selectOption(id);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(grid).toHaveAttribute('data-type', id);
    await expect(grid).toHaveAttribute('data-version', version);
    await expect(grid).toHaveAttribute('data-seed', '12345');
    await expect(page.locator('#map-status')).toContainText(version);
    const original = await signature();
    layouts.add(original);
    await page.screenshot({ path: testInfo.outputPath(`${id}.png`), fullPage: true });
    await page.getByRole('button', { name: 'New seed', exact: true }).click();
    await expect(type).toHaveValue(id);
    await expect(grid).not.toHaveAttribute('data-seed', '12345');
    await seed.fill('12345');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    expect(await signature()).toBe(original);
    for (const invalid of ['', '-1', '1.5', '4294967296', 'abc']) {
      await seed.fill(invalid);
      await type.selectOption(id === 'rooms' ? 'cellular' : 'rooms');
      await expect(type).toHaveValue(id);
      await expect(grid).toHaveAttribute('data-type', id);
      await expect(grid).toHaveAttribute('data-seed', '12345');
      await expect(seed).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#map-status')).toContainText('The map is unchanged');
      expect(await signature()).toBe(original);
    }
    // A valid edit is applied by the type change itself, without Generate.
    await seed.fill('424242');
    await type.selectOption(id === 'rooms' ? 'cellular' : 'rooms');
    await expect(grid).toHaveAttribute('data-seed', '424242');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(layouts.size).toBe(3);
  await page.reload();
  await expect(type).toHaveValue('rooms');
});
