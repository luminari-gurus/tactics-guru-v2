import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { rewardSnapshot } from './helpers/runItemFixtures';
const entry = '/tests/fixtures/run-items/index.html';
async function report(page: Page) { return JSON.parse(await page.locator('#evidence').textContent() ?? '{}'); }
async function open(page: Page, query = '') { await page.goto(`${entry}${query}`); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); }
async function confirm(page: Page) { await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.locator('dialog')).not.toBeVisible(); }
test('keyboard cancel, held activation, native modal capture and layout', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, '?state=prepared');
  // The board uses the production input binder. Control/dialog input must not reach it.
  await page.locator('#board').click({ position: { x: 40, y: 40 } });
  expect((await report(page)).selected).toBe(1);
  const before = (await report(page)).snapshot;
  const use = page.getByRole('button', { name: 'Use Healing Draught' });
  await use.focus(); await page.keyboard.down('Enter');
  await expect(page.locator('dialog')).toBeVisible();
  await page.mouse.click(10, 10);
  expect((await report(page)).selected).toBe(1);
  for (let i = 0; i < 4; i++) await page.keyboard.down('Enter');
  expect((await report(page)).snapshot).toEqual(before);
  await page.keyboard.up('Enter'); await page.keyboard.press('Escape');
  await expect(use).toBeFocused();
  expect((await report(page)).snapshot).toEqual(before);
  await use.click();
  await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  expect((await report(page)).snapshot.items.itemRevision).toBe(1);
  expect((await report(page)).selected).toBe(1);
  for (const viewport of [{ width: 412, height: 915 }, { width: 915, height: 412 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const sizes = await page.locator('main button, main select').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect()).map(r => ({ w: r.width, h: r.height })));
    expect(sizes.every(r => r.w >= 44 && r.h >= 44)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#items').screenshot({ path: info.outputPath(`items-${viewport.width}x${viewport.height}.png`), scale: 'css' });
    await writeFile(info.outputPath(`items-${viewport.width}x${viewport.height}.json`), JSON.stringify({
      project: info.project.name, capturedAt: new Date().toISOString(), browser: page.context().browser()!.version(), viewport, report: await report(page),
    }, null, 2));
  }
  expect(errors).toEqual([]);
});



test('active testing snapshot prevents item controls without saved games',async({page})=>{
  await open(page, '?state=active');
  await expect(page.getByRole('button', { name: 'Use Healing Draught' })).toBeDisabled();
  await expect(page.getByText('Items are unavailable during a battle.')).toBeVisible();
  const active = (await report(page)).snapshot;
  expect(active.activeBattle.rng).toBeDefined(); expect(active.activeBattle.units).toHaveLength(5);
});

 test('rejected reward capacity and active snapshot reload leave state and RNG intact', async ({ page }) => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find(s => rewardSnapshot(s).items.offer!.options.some(o => o.itemId === 'item:healing_draught'))!;
  await open(page, `?seed=${seed}&capacity`); const before = (await report(page)).snapshot;
  await page.getByRole('button', { name: 'Claim Healing Draught', exact: true }).click(); await confirm(page);
  await expect(page.getByRole('status')).toContainText('There is no room for that reward. Nothing changed.');
  expect((await report(page)).snapshot).toEqual(before);
  await open(page, '?state=active'); const active = (await report(page)).snapshot;
  await page.reload(); expect((await report(page)).snapshot).toEqual(active);
  expect((await report(page)).snapshot.activeBattle.rng).toEqual(active.activeBattle.rng);
});
