import { expect, test, type Page } from '@playwright/test';
import { battleCatalog } from '../src/content/catalog';
import { buildBoardPresentation } from '../src/geometry/boardPresentation';
import { pickTile, screenToBoard } from '../src/geometry/picking';
import { projectTile, tileFaces, type Point } from '../src/geometry/iso';

async function report(page: Page) {
  return JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
}

test('default authored board renders canonical units, highlights and stable restarts', async ({ page }) => {
  const errors: string[] = [];
  const assetRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const assetPaths = new Set(Object.values(battleCatalog.assets).map(asset => asset.runtimePath));
  page.on('request', request => { const path = new URL(request.url()).pathname; if (assetPaths.has(path)) assetRequests.push(path); });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  const initial = await report(page);
  expect(initial.tiles).toHaveLength(144);
  expect(initial.units.map((u: any) => u.unitId)).toEqual(['fighter', 'ranger', 'mage', 'goblin_grunt', 'goblin_archer', 'goblin_grunt']);
  expect(initial.reachable.length).toBeGreaterThan(0);
  expect(initial.canopies.length).toBeGreaterThan(0);
  expect(initial.surfaceCornerError).toBeLessThan(0.001);
  expect(initial.units.every((u: any) => u.anchorError < 0.001)).toBe(true);
  expect(initial.depthOrder).toEqual([...initial.depthOrder].sort((a, b) => a - b));
  for (const unit of initial.units) {
    const asset = battleCatalog.assets[unit.assetId as keyof typeof battleCatalog.assets];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind === 'unit-sprite') expect(unit.origin).toEqual({ x: asset.anchor.x / asset.runtimeWidth, y: asset.anchor.y / asset.runtimeHeight });
  }
  for (const [orientation, viewport] of Object.entries({ portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } })) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    const value = await report(page);
    expect(value.bounds.left).toBeGreaterThanOrEqual(15);
    expect(value.bounds.right).toBeLessThanOrEqual(viewport.width - 15);
    expect(value.bounds.bottom).toBeLessThanOrEqual(viewport.height - 15);
    expect(value.bounds.top).toBeGreaterThanOrEqual(await page.locator('#fit-panel').evaluate(panel => panel.getBoundingClientRect().bottom + 15));
    await page.screenshot({ path: test.info().outputPath(`authored-${orientation}.png`) });
  }
  for (let run = 0; run < 4; run++) {
    await page.getByRole('button', { name: 'Restart battle' }).click();
    await expect(page.getByRole('status')).toHaveText('Battle ready');
    const value = await report(page);
    expect(value.objectCount).toBe(initial.objectCount);
    expect(value.selectionEvents).toBe(0);
    expect(value.commandCount).toBe(0);
    await page.getByRole('button', { name: 'Next turn' }).click();
    await expect.poll(async () => (await report(page)).commandCount).toBe(1);
    const view = (await report(page)).transform;
    const local = projectTile({ x: 11, y: 11, elevation: 0 });
    await page.mouse.click(view.x + local.x * view.scale, view.y + local.y * view.scale);
    await expect.poll(async () => (await report(page)).selectionEvents).toBe(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect(assetRequests.sort()).toEqual([...assetPaths].sort());
  expect(errors).toEqual([]);
});

for (const failure of ['missing', 'corrupt'] as const) {
  test(`default battle reports a controlled ${failure} canonical sprite error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/proof/fighter.png', route => failure === 'missing'
      ? route.fulfill({ status: 404 }) : route.fulfill({ contentType: 'image/png', body: 'invalid PNG bytes' }));
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('Asset load failed');
    await expect(page.locator('#game')).toHaveAttribute('data-ready', 'false');
    await expect(page.getByRole('button', { name: 'Restart battle' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Move selected' })).toBeDisabled();
    expect(errors).toEqual([]);
  });
}

test('picks authored elevated tops and visible side faces through unit and canopy art', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  const { tiles } = buildBoardPresentation(battleCatalog, 'map:forest_ruins');
  const view = (await report(page)).transform;
  for (const elevation of [0, 1, 2]) {
    for (const face of ['top', 'left', 'right'] as const) {
      const tile = tiles.find(tile => {
        if (tile.elevation !== elevation) return false;
        const vertices: readonly Point[] = tileFaces(tile)[face];
        const point = { x: vertices.reduce<number>((sum, p) => sum + p.x, 0) / 4, y: vertices.reduce<number>((sum, p) => sum + p.y, 0) / 4 };
        return pickTile(tiles, point) === tile;
      });
      expect(tile).toBeDefined();
      const vertices: readonly Point[] = tileFaces(tile!)[face];
      const point = { x: vertices.reduce<number>((sum, p) => sum + p.x, 0) / 4, y: vertices.reduce<number>((sum, p) => sum + p.y, 0) / 4 };
      await page.mouse.click(view.x + point.x * view.scale, view.y + point.y * view.scale);
      expect((await report(page)).selected).toEqual({ x: tile!.x, y: tile!.y, elevation });
    }
  }
  await page.screenshot({ path: test.info().outputPath('selected-elevated.png') });
  const value = await report(page);
  const unit = value.units[0];
  const point = projectTile(unit.tile);
  await page.mouse.click(view.x + point.x * view.scale, view.y + point.y * view.scale);
  const intended = pickTile(tiles, point)!;
  expect((await report(page)).selected).toEqual({ x: intended.x, y: intended.y, elevation: intended.elevation });
});

test('authored visible picking survives resize, pan, zoom, DPR and drag completion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  const tiles = buildBoardPresentation(battleCatalog, 'map:forest_ruins').tiles;
  const session = await page.context().newCDPSession(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    for (const dpr of [1, 3]) {
      await page.getByRole('button', { name: 'Restart battle' }).click();
      await expect(page.getByRole('status')).toHaveText('Battle ready');
      await session.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: dpr, mobile: false });
      await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(dpr);
      const value = await report(page);
      const view = value.transform;
      const local = projectTile({ x: 11, y: 11, elevation: 0 });
      const point = { x: view.x + local.x * view.scale, y: view.y + local.y * view.scale };
      await page.mouse.click(point.x, point.y);
      const selected = pickTile(tiles, screenToBoard(point, view));
      expect((await report(page)).selected).toEqual(selected && { x: selected.x, y: selected.y, elevation: selected.elevation });
      await page.mouse.wheel(0, -100);
      await expect.poll(async () => (await report(page)).transform.scale).toBeGreaterThan(view.scale);
      const before = await report(page);
      await page.mouse.down();
      await page.mouse.move(point.x + 25, point.y - 20, { steps: 5 });
      await page.mouse.up();
      expect((await report(page)).selectionEvents).toBe(before.selectionEvents);
      const transformed = (await report(page)).transform;
      const next = { x: transformed.x + local.x * transformed.scale, y: transformed.y + local.y * transformed.scale };
      await page.mouse.click(next.x, next.y);
      expect((await report(page)).selected).toEqual({ x: 11, y: 11, elevation: 0 });
    }
    await session.send('Emulation.clearDeviceMetricsOverride');
  }
});

test('legal snapshot movement updates elevation, reachability and canopy occlusion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect.poll(async () => (await report(page)).activeId).toBe(6);
  const moveTo = async (cell: { x: number; y: number; elevation: number }) => {
    const value = await report(page);
    const local = projectTile(cell);
    await page.mouse.click(value.transform.x + local.x * value.transform.scale, value.transform.y + local.y * value.transform.scale);
    await expect(page.getByRole('button', { name: 'Move selected' })).toBeEnabled();
    await page.getByRole('button', { name: 'Move selected' }).click();
    await expect.poll(async () => (await report(page)).units.find((u: any) => u.id === value.activeId).tile).toEqual(cell);
    expect((await report(page)).reachable).toEqual([]);
    await expect(page.getByRole('button', { name: 'Move selected' })).toBeDisabled();
  };
  await moveTo({ x: 8, y: 7, elevation: 0 });
  const behind = await report(page);
  expect(behind.commandCount).toBe(1);
  expect(behind.canopies.some((c: any) => c.alpha === 0.35)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('canopy-behind.png') });
  // Advance through initiative using the real controller, then move beyond the same canopy.
  do { await page.getByRole('button', { name: 'Next turn' }).click(); }
  while ((await report(page)).activeId !== 6);
  await moveTo({ x: 8, y: 9, elevation: 0 });
  expect((await report(page)).canopies.filter((c: any) => c.tile.x === 9 && c.tile.y === 7).every((c: any) => c.alpha === 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('canopy-front.png') });
  while ((await report(page)).activeId !== 2) await page.getByRole('button', { name: 'Next turn' }).click();
  await moveTo({ x: 3, y: 9, elevation: 1 });
  const raised = await report(page);
  const ranger = raised.units.find((u: any) => u.id === 2);
  expect(ranger.position).toEqual(projectTile({ x: 3, y: 9, elevation: 1 }));
  expect(ranger.anchorError).toBeLessThan(0.001);
});

test('touch pinch and cancelled pointer cannot select or move a unit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  const value = await report(page);
  const x = value.transform.x, y = value.transform.y + 440 * value.transform.scale;
  const session = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id: number }[]) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ x, y, id: 1 }]);
  await touch('touchEnd', []);
  const selected = await report(page);
  expect(selected.selected).toEqual({ x: 11, y: 11, elevation: 0 });
  await touch('touchStart', [{ x: x - 10, y, id: 1 }, { x: x + 10, y, id: 2 }]);
  await touch('touchMove', [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }]);
  await touch('touchEnd', [{ x: x - 25, y, id: 1 }]);
  await touch('touchEnd', []);
  expect((await report(page)).selectionEvents).toBe(selected.selectionEvents);
  expect((await report(page)).commandCount).toBe(0);
  await touch('touchStart', [{ x, y, id: 3 }]);
  await touch('touchCancel', []);
  expect((await report(page)).selectionEvents).toBe(selected.selectionEvents);
});
