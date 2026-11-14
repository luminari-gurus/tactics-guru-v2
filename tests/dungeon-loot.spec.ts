import type { Page } from '@playwright/test';
import { expect, railTest as test } from './helpers/startupDiagnostics';
import { playCommand, readSession } from './helpers/battlePolicy';
import { checkedDungeon, dungeonGroundVictoryBoundary } from './helpers/dungeonFixtures';
import { continueSavedDungeon, dungeonSnapshot, openDungeonInventory, walkDungeon } from './helpers/dungeonTraversal';
import { currentFloor, floorMap, readDungeon, stepDungeon, type DungeonState } from '../src/domain/dungeon';
import { neighbors, poiCell } from '../src/domain/exploration';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { freshRunStats } from '../src/domain/runStats';
import { ITEM_BOUNDS } from '../src/content/itemTypes';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { AUTO_COLLECT_LOOT_KEY } from '../src/ui/autoCollectLootPreference';

interface HeldAutoStep {
  cancelled: boolean;
  release: () => void;
}
declare global { interface Window { issue408AutoSteps: HeldAutoStep[] } }

/** Synthetic timing boundary, not a clock or gameplay shortcut. Only the 400 ms
 * callback created while the exploration map is visible is held. Battle input,
 * animations, victory settlement, writes and ordinary movement remain real.
 * Retaining cancelled callbacks also exercises the generation guard after clearTimeout. */
async function holdAutomaticStep(page: Page) {
  await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window), cancel = window.clearTimeout.bind(window);
    const ids = new Map<number, HeldAutoStep>();
    window.issue408AutoSteps = [];
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
      const map = document.querySelector<HTMLElement>('#dungeon-map');
      if (delay === 400 && typeof handler === 'function' && map?.checkVisibility()) {
        const id = schedule(() => {}, 0);
        const held = { cancelled: false, release: () => handler(...args) };
        ids.set(id, held); window.issue408AutoSteps.push(held);
        return id;
      }
      return schedule(handler, delay, ...args);
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => {
      const held = id === undefined ? undefined : ids.get(id);
      if (held) held.cancelled = true;
      cancel(id);
    }) as typeof window.clearTimeout;
  });
}

/** Flush the same exclusive save queue and rendering, without advancing game time. */
async function settleBrowser(page: Page) {
  await page.evaluate(async key => {
    await Promise.resolve();
    await navigator.locks.request(key, () => {});
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }, DUNGEON_KEYS.primary);
}
async function releaseAutomaticStep(page: Page) {
  await page.evaluate(() => {
    if (window.issue408AutoSteps.length !== 1) throw Error('Expected exactly one held automatic step');
    window.issue408AutoSteps[0].release();
  });
  await settleBrowser(page);
}
async function heldCount(page: Page) { return page.evaluate(() => window.issue408AutoSteps.length); }

function progress(state: DungeonState) {
  // Focus, recovery and navigation can legitimately checkpoint active playtime.
  return { ...state, ...(state.stats ? { stats: { ...state.stats, activeMs: 0 } } : {}) };
}
async function expectProgress(page: Page, expected: DungeonState) {
  expect(progress(await dungeonSnapshot(page))).toEqual(progress(expected));
}
async function expectSavedProgress(page: Page, expected: DungeonState) {
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).payload as DungeonState, DUNGEON_KEYS.primary);
  expect(progress(stored)).toEqual(progress(expected));
}

async function loadBoundary(page: Page, seed = 28, reviveStock?: number) {
  const witness = dungeonGroundVictoryBoundary(seed);
  if (!witness) throw Error(`Missing real contact/victory boundary for seed ${seed}`);
  // The optional starting stock is structural capacity/preparation evidence. The
  // spatial entry and terminal attack are still the actual legal domain witness.
  const snapshot = checkedDungeon(readDungeon({ ...witness.snapshot, stats: freshRunStats('since-upgrade'),
    ...(reviveStock === undefined ? {} : { ownership: { ...witness.snapshot.ownership,
      consumables: [{ itemId: 'item:revive_kit', quantity: reviveStock }] } }) }));
  const encoded = encodeDungeon(snapshot); if (!encoded.ok) throw Error(encoded.reason);
  // Leave the previous owner before staging another boundary, so pagehide cannot
  // overwrite the fixture with the outgoing journey's playtime checkpoint.
  await page.goto('./');
  await page.evaluate(({ keys, text }) => {
    localStorage.setItem(keys.primary, text); localStorage.removeItem(keys.backup);
  }, { keys: DUNGEON_KEYS, text: encoded.text });
  await page.goto('./?game=dungeon'); await continueSavedDungeon(page);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(snapshot.activeBattle);
  return { ...witness, snapshot };
}
async function finishVictory(page: Page, witness: Awaited<ReturnType<typeof loadBoundary>>, scheduled = true) {
  await playCommand(page, witness.command);
  await expect(page.locator('#dungeon-map')).toBeVisible();
  await expect.poll(async () => (await dungeonSnapshot(page)).phase).toBe('ready');
  await expect.poll(() => heldCount(page)).toBe(scheduled ? 1 : 0);
  const won = await dungeonSnapshot(page), entry = witness.snapshot.encounterEntry!;
  expect(currentFloor(won).position).toBe(entry.origin);
  expect(currentFloor(won).loot).toMatchObject([{ slot: entry.slot, cell: entry.contact, quantity: 1, remaining: 1 }]);
  expect(won.offer).toBeNull(); expect(won.encounterEntry).toBeUndefined();
  await expect(page.getByRole('heading', { name: 'Saved reward choice', exact: true })).toHaveCount(0);
  await expectSavedProgress(page, won);
  return won;
}

test.beforeEach(async ({ page }) => { await holdAutomaticStep(page); });

test('auto loot defaults on: one delayed ordinary step, pickup, enemy tick and durable resume', async ({ page }, info) => {
  const witness = await loadBoundary(page);
  expect(await page.evaluate(key => localStorage.getItem(key), AUTO_COLLECT_LOOT_KEY)).toBeNull();
  const won = await finishVictory(page, witness), entry = witness.snapshot.encounterEntry!;
  const expected = checkedDungeon(stepDungeon(won, { id: won.id, depth: won.depth, revision: won.revision, destination: entry.contact }));
  await releaseAutomaticStep(page);
  await expect.poll(async () => currentFloor(await dungeonSnapshot(page)).position).toBe(entry.contact);
  const collected = await dungeonSnapshot(page);
  expect(progress(collected)).toEqual(progress(expected));
  expect(collected.revision).toBe(won.revision + 1);
  expect(currentFloor(collected).exploration.movement!.step).toBe(currentFloor(won).exploration.movement!.step + 1);
  expect(collected.stats!.movesTaken).toBe(won.stats!.movesTaken + 1);
  expect(currentFloor(collected).loot![0].remaining).toBe(0);
  expect(collected.ownership.equipment).toEqual([{ instanceId: currentFloor(won).loot![0].id, itemId: 'item:aiming_charm' }]);
  expect(collected.ownership.assignments).toEqual(won.ownership.assignments);
  expect(collected.party).toEqual(won.party);
  await expect(page.locator('.dungeon-status')).toContainText('Picked up Aiming Charm.');
  await expectSavedProgress(page, collected);
  await releaseAutomaticStep(page); await expectProgress(page, collected);
  await page.reload(); await continueSavedDungeon(page); await settleBrowser(page);
  await expectProgress(page, collected); expect(await heldCount(page)).toBe(0);
  await expectSavedProgress(page, collected);
  await info.attach('one-automatic-step', { body: JSON.stringify({ evidence: 'real final HUD command with only the post-victory 400 ms callback held', entry, won, collected }), contentType: 'application/json' });
  await page.locator('#dungeon-screen').screenshot({ path: info.outputPath('auto-loot-collected.png') });
});

test('auto loot Settings are accessible and persist; off waits at origin and re-enabling does not sweep old loot', async ({ page }, info) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('tactics-guru:telemetry-opt-out', 'true'));
  const preferences = () => page.evaluate(() => ({ combat: localStorage.getItem('tactics-guru:combat-controls'), privacy: localStorage.getItem('tactics-guru:telemetry-opt-out') }));
  const otherPreferences = await preferences();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const setting = page.getByRole('checkbox', { name: 'Auto-collect loot', exact: true });
  await expect(setting).toBeChecked();
  await expect(setting).toHaveAccessibleDescription("After victory, automatically move onto the defeated enemy's square and collect its loot.");
  await expect(page.getByRole('group', { name: 'Dungeon loot', exact: true })).toContainText('Auto-collect loot');
  await setting.focus(); await page.keyboard.press('Space'); await expect(setting).not.toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), AUTO_COLLECT_LOOT_KEY)).toBe('off');
  expect(await preferences()).toEqual(otherPreferences);
  await page.getByRole('dialog').screenshot({ path: info.outputPath('auto-loot-settings-off.png') });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const witness = await loadBoundary(page), won = await finishVictory(page, witness, false);
  await settleBrowser(page); await expectProgress(page, won);
  expect(await heldCount(page)).toBe(0);
  await page.getByRole('link', { name: 'Main menu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(setting).not.toBeChecked(); await setting.check();
  expect(await page.evaluate(key => localStorage.getItem(key), AUTO_COLLECT_LOOT_KEY)).toBe('on');
  expect(await preferences()).toEqual(otherPreferences);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('#dungeon-map')).toBeVisible(); await settleBrowser(page);
  await expectProgress(page, won); expect(await heldCount(page)).toBe(0);
  await expectSavedProgress(page, won);
});

test('fresh manual movement cancels a pending automatic step, including its stale callback', async ({ page, isMobile }) => {
  const witness = await loadBoundary(page), won = await finishVictory(page, witness);
  const floor = currentFloor(won), map = floorMap(floor.descriptor), contact = witness.snapshot.encounterEntry!.contact;
  const destination = neighbors(floor.position, map.width, map.height).find(cell => map.cells[cell] && cell !== contact &&
    !floor.exploration.pois.some(poi => poiCell(poi, map.width) === cell) && cell !== floor.descriptor.downstairs);
  if (destination === undefined) throw Error('Missing safe adjacent manual step');
  const expected = checkedDungeon(stepDungeon(won, { id: won.id, depth: won.depth, revision: won.revision, destination }));
  await walkDungeon(page, destination, isMobile ? 'touch' : 'keyboard');
  await expectProgress(page, expected);
  expect(await page.evaluate(() => window.issue408AutoSteps[0].cancelled)).toBe(true);
  await releaseAutomaticStep(page); await releaseAutomaticStep(page);
  await expectProgress(page, expected); await expectSavedProgress(page, expected);
  expect(currentFloor(await dungeonSnapshot(page)).loot![0].remaining).toBe(1);
});

test('fresh preparation cancels a pending step, and a full inventory refuses automatic movement', async ({ page }) => {
  await test.step('an accepted preparation action wins over the pending callback', async () => {
    const witness = await loadBoundary(page, 13, 1), won = await finishVictory(page, witness);
    expect(won.party.find(hero => hero.heroId === 'mage')!.hp).toBe(0);
    await openDungeonInventory(page);
    await page.getByLabel('Revive Kit target', { exact: true }).selectOption('mage');
    await page.getByRole('button', { name: 'Use Revive Kit', exact: true }).click();
    await page.locator('#dungeon-item-confirm').click();
    await expect.poll(async () => (await dungeonSnapshot(page)).revision).toBe(won.revision + 1);
    const prepared = await dungeonSnapshot(page);
    expect(prepared.party.find(hero => hero.heroId === 'mage')!.hp).toBeGreaterThan(0);
    expect(prepared.ownership.consumables).toEqual([]);
    expect(currentFloor(prepared)).toEqual(currentFloor(won));
    expect(await page.evaluate(() => window.issue408AutoSteps[0].cancelled)).toBe(true);
    await releaseAutomaticStep(page); await expectProgress(page, prepared); await expectSavedProgress(page, prepared);
  });
  await test.step('an uncollectable new reward keeps the origin and takes no enemy turn', async () => {
    const witness = await loadBoundary(page, 13, ITEM_BOUNDS.stack.max), won = await finishVictory(page, witness);
    await releaseAutomaticStep(page);
    await expect(page.locator('.dungeon-status')).toHaveText('Inventory full. Loot remains on the ground; the party has not moved.');
    await expectProgress(page, won); await expectSavedProgress(page, won);
    expect(currentFloor(won).loot![0].itemId).toBe('item:revive_kit');
    await releaseAutomaticStep(page); await expectProgress(page, won);
  });
});

test('visibility interruption and explicit recovery each cancel the pending automatic step without replay', async ({ page }, info) => {
  for (const interruption of ['visibility', 'recovery'] as const) await test.step(interruption, async () => {
    const witness = await loadBoundary(page), won = await finishVictory(page, witness);
    if (interruption === 'visibility') {
      // Synthetic visibility event isolates cancellation; this is not native tab/background proof.
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    } else {
      await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
      await page.locator('#dungeon-continue-primary').click();
      await expect(page.locator('#dungeon-map')).toBeVisible();
    }
    expect(await page.evaluate(() => window.issue408AutoSteps[0].cancelled)).toBe(true);
    await releaseAutomaticStep(page); await expectProgress(page, won); await expectSavedProgress(page, won);
    expect(await heldCount(page)).toBe(1);
    await info.attach(`cancelled-${interruption}`, { body: JSON.stringify({ evidence: interruption === 'visibility' ? 'synthetic visibility dispatch and stale timer callback release' : 'real recovery UI and stale timer callback release', state: await dungeonSnapshot(page) }), contentType: 'application/json' });
  });
});

test('reload before the pending step restores the ground pile without surprise movement or collection', async ({ page }) => {
  const witness = await loadBoundary(page), won = await finishVictory(page, witness);
  await page.reload(); await continueSavedDungeon(page); await settleBrowser(page);
  await expectProgress(page, won); await expectSavedProgress(page, won);
  expect(await heldCount(page)).toBe(0);
  expect(currentFloor(await dungeonSnapshot(page)).loot![0].remaining).toBe(1);
  await page.reload(); await continueSavedDungeon(page); await settleBrowser(page);
  await expectProgress(page, won); expect(await heldCount(page)).toBe(0);
});
