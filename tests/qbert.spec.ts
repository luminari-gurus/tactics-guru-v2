import { expect, test, type Page } from '@playwright/test';

type Cell = { x: number; y: number; elevation: number; terrain: string };
async function report(page: Page) {
  await expect.poll(() => page.locator('#game').evaluate(e => !!(e as HTMLElement).dataset.battleReport)).toBe(true);
  return page.locator('#game').evaluate(e => JSON.parse((e as HTMLElement).dataset.battleReport!));
}
const onPyramid = (c: { x: number; y: number }) => c.x >= 0 && c.y >= 0 && c.x + c.y <= 6;

for (const search of ['', '?scene=proof', '?scene=content-smoke']) {
  test(`/qbert${search} renders the Q*bert pyramid battle with the party on the apex`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('./qbert' + search);
    await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#battle-heading h1')).toHaveText('Q*bert Pyramid');
    await expect(page.locator('#fit-status')).toHaveText('Battle ready');
    await expect(page.locator('#fit-board-controls')).not.toBeVisible();
    await expect(page.locator('#fit-measurements')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Restart battle', exact: true })).toBeEnabled();
    const r = await report(page);
    const tiles: Cell[] = r.tiles;
    expect(tiles).toHaveLength(49);
    const cubes = tiles.filter(t => t.terrain !== 'void');
    expect(cubes).toHaveLength(28);
    for (const t of tiles) expect(t.terrain === 'void').toBe(!onPyramid(t));
    for (const t of cubes) expect(t.elevation).toBe(6 - (t.x + t.y));
    expect(r.units.find((u: { unitId: string }) => u.unitId === 'fighter').tile).toEqual({ x: 0, y: 0, elevation: 6 });
    for (const u of r.units) expect(onPyramid(u.tile)).toBe(true);
    for (const c of r.reachable) expect(onPyramid(c)).toBe(true);
    // Void cells are open air: a click on void cell (5,5), just below the pyramid, selects nothing.
    const voidPoint = { x: 0, y: 10 * 20 };
    const at = { x: r.transform.x + voidPoint.x * r.transform.scale, y: r.transform.y + voidPoint.y * r.transform.scale };
    // Native touch on touch profiles; mouse elsewhere.
    if (info.project.use.hasTouch) await page.touchscreen.tap(at.x, at.y); else await page.mouse.click(at.x, at.y);
    expect((await report(page)).selected).toBeNull();
    await page.screenshot({ path: info.outputPath('qbert.png') });
    expect(errors).toEqual([]);
  });
}
