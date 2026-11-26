import { expect, test } from './helpers/dungeonEntropy';
import { walkDungeon } from './helpers/dungeonTraversal';

test.use({ pinDungeonSeed: 28 });

test('Dungeon boots Phaser and fits the battle canvas after resize', async ({ page, hasTouch }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('./dungeon');
  await expect(page.locator('#game')).toHaveAttribute('data-dungeon-snapshot', /"id":/);
  await walkDungeon(page, undefined, hasTouch ? 'touch' : 'keyboard');
  const battle = page.locator('#game');
  await expect(battle).toHaveAttribute('data-phase', 'player');
  const canvas = battle.locator('canvas');
  await expect(canvas).toBeVisible();

  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => canvas.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(bounds.width - innerWidth) < 2 && Math.abs(bounds.height - innerHeight) < 2;
    })).toBe(true);
  }
  expect(errors).toEqual([]);
});
