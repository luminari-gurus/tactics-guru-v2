import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { RUN_STORAGE_KEYS as keys } from '../src/persistence/runStorage';
import { rewardSnapshot } from './helpers/runItemFixtures';
const entry = '/tests/fixtures/run-items/index.html';
async function report(page: Page) { return JSON.parse(await page.locator('#evidence').textContent() ?? '{}'); }
async function open(page: Page, query = '') { await page.goto(`${entry}${query}`); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); }
async function confirm(page: Page) { await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.locator('dialog')).not.toBeVisible(); }
async function activate(page: Page, name: string, touch: boolean) {
  const button = page.getByRole('button', { name, exact: true });
  if (touch) await button.tap(); else await button.click();
}

test('reward claim advances exactly once and survives pending/claimed reload', async ({ page }, info) => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find(s => rewardSnapshot(s).items.offer!.options.some(o => o.itemId === 'item:healing_draught'))!;
  await open(page, `?seed=${seed}`); const pending = (await report(page)).snapshot;
  await page.reload(); expect((await report(page)).snapshot).toEqual(pending);
  await activate(page, 'Claim Healing Draught', info.project.name !== 'desktop');
  if (info.project.name === 'desktop') await page.getByRole('button', { name: 'Confirm', exact: true }).dblclick();
  else {
    const box = await page.getByRole('button', { name: 'Confirm', exact: true }).boundingBox();
    for (let i = 0; i < 2; i++) await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    if (await page.locator('dialog').isVisible()) await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('heading', { name: 'Party items', exact: true })).toBeVisible();
  const claimed = (await report(page)).snapshot;
  expect(claimed.items.run.encounterIndex).toBe(1); expect(claimed.items.itemRevision).toBe(1);
  expect(claimed.items.ownership.consumables).toEqual([{ itemId: 'item:healing_draught', quantity: 1 }]);
  await page.reload(); expect((await report(page)).snapshot).toEqual(claimed);
  expect((await report(page)).selected).toBe(0);
});

test('real item use, equip and unequip preserve ownership/stats across reload', async ({ page }, info) => {
  await open(page, '?state=prepared');
  const select = page.getByRole('combobox', { name: 'Healing Draught target' });
  await expect(select.locator('option', { hasText: 'Mage (defeated)' })).toBeDisabled();
  await select.selectOption('ranger');
  await activate(page, 'Use Healing Draught', info.project.name !== 'desktop'); await confirm(page);
  const used = (await report(page)).snapshot;
  expect(used.items.run.party[1].hp).toBe(10); expect(used.items.ownership.consumables[0].quantity).toBe(1);
  await page.reload(); expect((await report(page)).snapshot).toEqual(used);
  await page.getByRole('combobox', { name: 'Warding Charm target' }).selectOption('ranger');
  await activate(page, 'Equip Warding Charm', info.project.name !== 'desktop'); await confirm(page);
  const equipped = (await report(page)).snapshot;
  expect(equipped.items.ownership.assignments).toHaveLength(1);
  const fighter = await page.getByRole('region', { name: 'Party', exact: true }).textContent();
  await page.reload(); expect((await report(page)).snapshot).toEqual(equipped);
  expect(await page.getByRole('region', { name: 'Party', exact: true }).textContent()).toBe(fighter);
  await page.getByRole('button', { name: 'Continue saved run', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  expect((await report(page)).snapshot).toEqual(equipped);
  await page.getByRole('button', { name: 'Unequip Warding Charm' }).click(); await confirm(page);
  expect((await report(page)).snapshot.items.ownership.assignments).toEqual([]);
});

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
    await page.screenshot({ path: info.outputPath(`items-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await writeFile(info.outputPath(`items-${viewport.width}x${viewport.height}.json`), JSON.stringify({
      project: info.project.name, capturedAt: new Date().toISOString(), browser: page.context().browser()!.version(), viewport, report: await report(page),
    }, null, 2));
  }
  expect(errors).toEqual([]);
});

test('corruption preserves bytes, exports raw data and requires reviewed removal before saving', async ({ page }) => {
  await open(page, '?state=prepared');
  const backup = await page.evaluate(key => localStorage.getItem(key), keys.backup);
  await page.evaluate(key => localStorage.setItem(key, '  {broken raw\n\ud800'), keys.primary);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Continued backup');
  await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirm(page);
  await expect(page.getByRole('status')).toContainText('unsaved');
  expect(await page.evaluate(key => localStorage.getItem(key), keys.primary)).toBe('  {broken raw\n\ud800');
  expect(await page.evaluate(key => localStorage.getItem(key), keys.backup)).toBe(backup);
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export primary save' }).click();
  const file = await download; expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual({ slot: 'primary', text: '  {broken raw\n\ud800' });
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Remove primary save' }).click();
  await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), keys.primary)).toBeNull();
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.getByRole('status')).toContainText('Run saved');
  const saved = (await report(page)).snapshot; await page.reload(); expect((await report(page)).snapshot).toEqual(saved);
});

test('stale recovery review refuses changed bytes', async ({ page }) => {
  await open(page, '?state=prepared');
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Remove primary save' }).click();
  // Simulate a different tab writing after the review, without editing session state.
  await page.evaluate(key => localStorage.setItem(key, 'newer foreign bytes'), keys.primary);
  await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  await expect(page.getByRole('status')).toContainText('Removal refused');
  expect(await page.evaluate(key => localStorage.getItem(key), keys.primary)).toBe('newer foreign bytes');
});

test('unavailable storage is nonfatal and active battle prevents item controls', async ({ page }) => {
  await open(page, '?state=prepared&unavailable');
  await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirm(page);
  await expect(page.getByRole('status')).toContainText('unsaved');
  expect((await report(page)).snapshot.items.ownership.consumables[0].quantity).toBe(1);
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await expect(page.locator('dialog')).toContainText('unavailable');
  await page.keyboard.press('Escape');
  await open(page, '?state=active&unavailable');
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
  await page.evaluate(() => localStorage.clear());
  await open(page, '?state=active'); const active = (await report(page)).snapshot;
  await page.reload(); expect((await report(page)).snapshot).toEqual(active);
  expect((await report(page)).snapshot.activeBattle.rng).toEqual(active.activeBattle.rng);
});
