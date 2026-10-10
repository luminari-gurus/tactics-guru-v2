import { expect, test, type Page } from '@playwright/test';
import { battleCatalog } from '../src/content/catalog';
import { buildBoardPresentation } from '../src/geometry/boardPresentation';
import { MAX_ZOOM, pickTile, screenToBoard } from '../src/geometry/picking';
import { fitBoard, projectTile, tileFaces, type Point } from '../src/geometry/iso';

async function report(page: Page) {
  return JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
}

async function settledReport(page: Page) {
  // Let panel layout, ResizeObserver and the next render finish before using coordinates.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  return report(page);
}

test('selection labels retain the zoomed and panned camera without gameplay commands', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial = await settledReport(page);
  const local = projectTile({ x: 11, y: 11, elevation: 0 });
  await page.mouse.move(initial.transform.x + local.x * initial.transform.scale, initial.transform.y + local.y * initial.transform.scale);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await report(page)).transform.scale).toBeGreaterThan(initial.transform.scale);
  const zoomed = await settledReport(page);
  const start = { x: zoomed.transform.x + local.x * zoomed.transform.scale, y: zoomed.transform.y + local.y * zoomed.transform.scale };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 50, start.y - 20, { steps: 5 });
  await page.mouse.up();
  const panned = await settledReport(page);
  expect(panned.transform.x).toBeGreaterThan(zoomed.transform.x);
  expect(panned.selectionEvents).toBe(0);
  for (const cell of [{ x: 11, y: 11, elevation: 0 }, null, { x: 0, y: 0, elevation: 0 }, { x: 11, y: 11, elevation: 0 }]) {
    const current = await settledReport(page);
    const point = cell ? projectTile(cell) : { x: 0, y: 0 };
    const screen = cell ? { x: current.transform.x + point.x * current.transform.scale, y: current.transform.y + point.y * current.transform.scale }
      : { x: 5, y: current.viewport.height - 5 };
    expect(screen.x).toBeGreaterThanOrEqual(0);
    expect(screen.x).toBeLessThan(current.viewport.width);
    expect(screen.y).toBeGreaterThanOrEqual(0);
    expect(screen.y).toBeLessThan(current.viewport.height);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, screen)).toBe('CANVAS');
    // Clear with a real canvas click outside the board, not a controller shortcut.
    await page.mouse.click(screen.x, screen.y);
    await expect.poll(async () => (await report(page)).selected).toEqual(cell);
    await expect(page.locator('#battle-selection')).toHaveText(cell ? `Selected (${cell.x}, ${cell.y})` : 'Select a tile');
    const after = await settledReport(page);
    expect(after.transform.x).toBeCloseTo(panned.transform.x, 5);
    expect(after.transform.y).toBeCloseTo(panned.transform.y, 5);
    expect(after.transform.scale).toBeCloseTo(panned.transform.scale, 5);
    expect(after.commandCount).toBe(initial.commandCount);
  }
  // Active-unit labels have different lengths too; ending a turn is the only command.
  const activeLabels = new Set<string>();
  for (let turn = 0; turn < initial.units.length; turn++) {
    await page.getByRole('button', { name: 'Wait / End turn' }).click();
    const after = await settledReport(page);
    activeLabels.add((await page.locator('#battle-active').textContent())!);
    expect(after.transform).toEqual(panned.transform);
    expect(after.commandCount).toBeGreaterThan(initial.commandCount);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  }
  expect(activeLabels.size).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Restart battle' }).click();
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const restarted = await settledReport(page);
  expect(restarted.selected).toBeNull();
  expect(restarted.selectionEvents).toBe(0);
  const freshSession=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(freshSession.replay.initial.commandCount).toBe(0);
  expect(freshSession.replay.initial.seed).toBe(2);
  expect(freshSession.replay.commands.every((c:any)=>freshSession.state.units.find((u:any)=>u.id===c.unitId).side==='enemy')).toBe(true);
  expect(restarted.objectCount).toBe(initial.objectCount);
  // A different seed/active hero can change HUD height. Reset must fit the
  // current available area rather than reuse the prior seed's absolute origin.
  const panelBottom=await page.locator('#fit-panel').evaluate(el=>el.getBoundingClientRect().bottom);
  // Reported bounds are screen-space and include canopy/unit art; recover the
  // unchanged map's local extent from the original fit, not the reset transform.
  const localBounds={
    left:(initial.bounds.left-initial.transform.x)/initial.transform.scale,
    right:(initial.bounds.right-initial.transform.x)/initial.transform.scale,
    top:(initial.bounds.top-initial.transform.y)/initial.transform.scale,
    bottom:(initial.bounds.bottom-initial.transform.y)/initial.transform.scale,
  };
  const expectedFit=fitBoard(localBounds,restarted.viewport,panelBottom);
  expect(restarted.transform.scale).toBeCloseTo(expectedFit.scale,5);
  expect(restarted.transform.x).toBeCloseTo(expectedFit.x,5);
  expect(restarted.transform.y).toBeCloseTo(expectedFit.y,5);
  await page.mouse.click(restarted.transform.x + local.x * restarted.transform.scale, restarted.transform.y + local.y * restarted.transform.scale);
  expect((await settledReport(page)).selectionEvents).toBe(1);
});

test('authored camera keeps zoom bounds and refits on real orientation changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  for (const viewport of [{ width: 412, height: 839 }, { width: 915, height: 412 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    await page.getByRole('button', { name: 'Restart battle' }).click();
    await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const fitted = await settledReport(page);
    await page.mouse.move(viewport.width - 5, viewport.height - 5);
    for (let wheel = 0; wheel < 8; wheel++) {
      // Chromium scales native wheel deltas by emulated DPR; exceed the input
      // clamp deliberately, and settle each event rather than assuming delivery.
      await page.mouse.wheel(0, -10000);
      await settledReport(page);
    }
    await expect.poll(async () => (await report(page)).transform.scale).toBeCloseTo(fitted.transform.scale * MAX_ZOOM, 5);
    // A genuine viewport change preserves relative zoom, not absolute scale.
    const nextViewport = { width: viewport.height, height: viewport.width };
    await page.setViewportSize(nextViewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(nextViewport);
    const panelBottom = await page.locator('#fit-panel').evaluate(panel => panel.getBoundingClientRect().bottom);
    const localBounds = {
      left: (fitted.bounds.left - fitted.transform.x) / fitted.transform.scale,
      right: (fitted.bounds.right - fitted.transform.x) / fitted.transform.scale,
      top: (fitted.bounds.top - fitted.transform.y) / fitted.transform.scale,
      bottom: (fitted.bounds.bottom - fitted.transform.y) / fitted.transform.scale,
    };
    const nextFit = fitBoard(localBounds, nextViewport, panelBottom);
    expect((await settledReport(page)).transform.scale).toBeCloseTo(nextFit.scale * MAX_ZOOM, 5);
    await page.mouse.move(nextViewport.width - 5, nextViewport.height - 5);
    for (let wheel = 0; wheel < 8; wheel++) {
      await page.mouse.wheel(0, 10000);
      await settledReport(page);
    }
    await expect.poll(async () => (await report(page)).transform.scale).toBeCloseTo(nextFit.scale, 5);
    expect((await settledReport(page)).commandCount).toBe(fitted.commandCount);
    // Refit at minimum zoom must keep the entire board clear of controls.
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    const resized = await settledReport(page);
    expect(resized.bounds.left).toBeGreaterThanOrEqual(15);
    expect(resized.bounds.right).toBeLessThanOrEqual(viewport.width - 15);
    expect(resized.bounds.bottom).toBeLessThanOrEqual(viewport.height - 15);
    expect(resized.bounds.top).toBeGreaterThanOrEqual(await page.locator('#fit-panel').evaluate(panel => panel.getBoundingClientRect().bottom + 15));
  }
});

test('default authored board renders canonical units, highlights and stable restarts', async ({ page }) => {
  const errors: string[] = [];
  const assetRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const assetPaths = new Set(Object.values(battleCatalog.assets).map(asset => asset.runtimePath));
  page.on('request', request => { const path = new URL(request.url()).pathname; if (assetPaths.has(path)) assetRequests.push(path); });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
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
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const value = await report(page);
    expect(value.objectCount).toBe(initial.objectCount);
    expect(value.selectionEvents).toBe(0);
    const fresh=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
    expect(fresh.replay.initial.seed).toBe(run+2);
    expect(fresh.replay.initial.commandCount).toBe(0);
    await page.getByRole('button', { name: 'Wait / End turn' }).click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    expect((await report(page)).commandCount).toBeGreaterThan(value.commandCount);
    const view = (await report(page)).transform;
    const local = projectTile({ x: 11, y: 11, elevation: 0 });
    await page.mouse.click(view.x + local.x * view.scale, view.y + local.y * view.scale);
    await expect.poll(async () => (await report(page)).selectionEvents).toBe(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect([...new Set(assetRequests)].sort()).toEqual([...assetPaths].sort());
  for(const asset of Object.values(battleCatalog.assets)) expect(assetRequests.filter(p=>p===asset.runtimePath)).toHaveLength(asset.kind==='portrait' && ['asset:fighter_portrait','asset:ranger_portrait','asset:mage_portrait'].includes(asset.id)?2:1);
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
    await expect(page.getByRole('button', { name: 'Move', exact: true })).toBeDisabled();
    expect(errors).toEqual([]);
  });
}

test('picks authored elevated tops and visible side faces through unit and canopy art', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const { tiles } = buildBoardPresentation(battleCatalog, 'map:forest_ruins');
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
      const view = (await settledReport(page)).transform;
      await page.mouse.click(view.x + point.x * view.scale, view.y + point.y * view.scale);
      expect((await report(page)).selected).toEqual({ x: tile!.x, y: tile!.y, elevation });
    }
  }
  await page.screenshot({ path: test.info().outputPath('selected-elevated.png') });
  const value = await report(page);
  const unit = value.units[0];
  const point = projectTile(unit.tile);
  const view = (await settledReport(page)).transform;
  await page.mouse.click(view.x + point.x * view.scale, view.y + point.y * view.scale);
  const intended = pickTile(tiles, point)!;
  expect((await report(page)).selected).toEqual({ x: intended.x, y: intended.y, elevation: intended.elevation });
});

test('authored visible picking survives resize, pan, zoom, DPR and drag completion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const tiles = buildBoardPresentation(battleCatalog, 'map:forest_ruins').tiles;
  const session = await page.context().newCDPSession(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    for (const dpr of [1, 3]) {
      await page.getByRole('button', { name: 'Restart battle' }).click();
      await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
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

test('legal player movement updates elevation, reachability and canopy occlusion', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial = await settledReport(page);
  const elevated = initial.reachable.find((c: {x:number;y:number}) => initial.tiles.find((t:any)=>t.x===c.x && t.y===c.y)?.elevation===1);
  expect(elevated).toBeDefined();
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.locator('#battle-target').selectOption(`${elevated.x},${elevated.y}`);
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after = await settledReport(page);
  const moved = after.units.find((u:any)=>u.id===initial.activeId);
  expect(moved.tile).toEqual({...elevated,elevation:1});
  expect(moved.position).toEqual(projectTile(moved.tile));
  expect(moved.anchorError).toBeLessThan(0.001);
  expect(after.reachable).toEqual([]);
  expect(after.commandCount).toBe(initial.commandCount+1);
  await page.screenshot({path:test.info().outputPath('player-elevated-move.png')});
  // Canopy visibility comes from living unit geometry, including automatically moved enemies.
  const { canopyOccludes, unitBounds, CANOPY_ART } = await import('../src/geometry/canopy');
  const state=JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state;
  for(const canopy of after.canopies){
    const overlaps=state.units.some((u:any)=>{
      if(u.hp<=0)return false;
      const unit=after.units.find((v:any)=>v.id===u.id);
      return canopyOccludes(canopy.tile,unit.tile,unitBounds(unit.tile,unit.origin),catalogMapHeight);
    });
    expect(canopy.alpha).toBe(overlaps?CANOPY_ART.fadedAlpha:1);
  }
});
const catalogMapHeight=battleCatalog.maps['map:forest_ruins'].height;

test('touch pinch and cancelled pointer cannot select or move a unit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
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
  expect((await report(page)).commandCount).toBe(value.commandCount);
  await touch('touchStart', [{ x, y, id: 3 }]);
  await touch('touchCancel', []);
  expect((await report(page)).selectionEvents).toBe(selected.selectionEvents);
});
