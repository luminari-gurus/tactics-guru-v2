import { atEncounter } from './helpers/dungeonFixtures';
import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { BattleSession } from '../src/app/BattleSession';
import { battleCatalog } from '../src/content/catalog';
import { combatStats } from '../src/domain/effects';
import { createBattle, dispatch } from '../src/domain/turns';
import { createRun } from '../src/domain/run';
import { emptyItemOwnership } from '../src/domain/items';
import { createRunBattle } from '../src/domain/runBattle';
import { freshDungeon, startDungeonBattle, dungeonBattle } from '../src/domain/dungeon';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { encodeRunSave } from '../src/domain/runSaveEnvelope';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { guardedBoundary } from './helpers/guardedBoundary';
import { runContext } from './helpers/runItemFixtures';
import { readSession, playCommand } from './helpers/battlePolicy';

function boundary(mode: 'standalone' | 'run' | 'dungeon') {
  for (let seed = 1; seed <= 20; seed++) {
    const run = createRun('guarded-browser', seed, runContext.definition, runContext.catalog); if (!run.ok) throw Error(run.reason);
    const items = { run: run.state, ownership: emptyItemOwnership(), offer: null, itemRevision: 0 };
    const runBuilt = createRunBattle(items, runContext); if (!runBuilt.ok) throw Error(runBuilt.reason);
    const dungeon = startDungeonBattle(atEncounter(freshDungeon('guarded-browser', seed))); if (!dungeon.ok) throw Error(dungeon.reason);
    const dungeonBuilt = dungeonBattle(dungeon.state)!;
    const standalone = createBattle('map:forest_ruins', seed, battleCatalog); if (!standalone.ok) throw Error(standalone.reason);
    const catalog = mode === 'standalone' ? battleCatalog : mode === 'run' ? runBuilt.catalog : dungeonBuilt.catalog;
    const initial = mode === 'standalone' ? standalone.state : mode === 'run' ? runBuilt.state : dungeon.state.activeBattle!;
    let fixture; try { fixture = guardedBoundary(catalog, initial); } catch { continue; }
    const cast = dispatch(fixture.before, fixture.command, catalog); if (!cast.ok) throw Error(cast.reason);
    // Pick a deterministic legal boundary where guard survives incoming enemy turns and expires normally.
    const probe = new BattleSession(catalog, cast.state, cast.state.seed);
    let incoming = false;
    for (let i = 0; i < 40 && probe.state.outcome === 'ongoing'; i++) {
      if (i > 0 && probe.active.id === 1) break;
      const step = probe.phase === 'enemy' ? probe.nextEnemy() : (() => {
        probe.prepare({ type: 'endTurn', unitId: probe.active.id }); return probe.confirm();
      })();
      if (!step) break;
      incoming ||= step.events.some(e => e.type === 'attackRolled' && e.targetId === 1);
      probe.finishPresentation(step.token);
    }
    if (!incoming || probe.active.id !== 1 || probe.active.hp === 0 || probe.active.guarded) continue;
    const saved = mode === 'standalone' ? encodeBattleSave(fixture.before, catalog) : mode === 'run'
      ? encodeRunSave({ items, activeBattle: fixture.before, battlefield: runBuilt.battlefield }, runContext)
      : encodeDungeon({ ...dungeon.state, activeBattle: fixture.before });
    if (!saved.ok) throw Error(saved.reason);
    return { ...fixture, catalog, saved: saved.text, initial, incoming };
  }
  throw Error('No Guarded boundary');
}
for (const mode of ['standalone', 'run', 'dungeon'] as const) test(`shared Guarded lifecycle and saved feedback: ${mode}`, async ({ page }) => {
  test.setTimeout(90000);
  const f = boundary(mode), key = mode === 'standalone' ? BATTLE_STORAGE_KEYS.primary : mode === 'run' ? RUN_STORAGE_KEYS.primary : DUNGEON_KEYS.primary;
  const path = mode === 'standalone' ? '/' : mode === 'run' ? '/run' : '/dungeon';
  const resume = mode === 'standalone' ? '#save-continue' : mode === 'run' ? '#run-continue' : '#dungeon-continue';
  await page.goto(path);
  await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key, text: f.saved });
  await page.reload();
  if (mode === 'dungeon') await page.getByRole('button', { name: 'Continue saved dungeon', exact: true }).click();
  else await page.locator(resume).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(f.before);
  const bytes = await page.evaluate(key => localStorage.getItem(key), key);
  await page.locator('[data-action=signature]').click();
  const target = f.before.units.find(u => u.id === ('unitId' in f.command.target ? f.command.target.unitId : -1))!;
  await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await expect(page.locator('#battle-preview')).toContainText('uses action');
  await page.locator('#battle-cancel').click();
  expect((await readSession(page)).state).toEqual(f.before);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(bytes);
  await playCommand(page, f.command);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const cast = await readSession(page), fighter = cast.state.units.find(u => u.id === 1)!;
  expect(fighter.guarded).toBe(true);
  await expect(page.locator('#battle-status')).toContainText('Guarded');
  const stats = combatStats(fighter, f.catalog);
  await expect(page.locator('#battle-stats')).toContainText(`AC ${stats.armorClass}`);
  await page.locator('#battle-party').click();
  await expect(page.getByRole('dialog')).toContainText('Guarded');
  await page.screenshot({ path: test.info().outputPath(`${mode}-guarded-inspection.png`) });
  await page.keyboard.press('Escape');
  await page.reload();
  if (mode === 'dungeon') await page.getByRole('button', { name: 'Continue saved dungeon', exact: true }).click();
  else await page.locator(resume).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(cast.state);
  await expect(page.locator('#battle-status')).toContainText('Guarded');
  await page.screenshot({ path: test.info().outputPath(`${mode}-guarded-resumed.png`) });
  for (let i = 0; i < 15; i++) {
    await page.locator('#battle-next').click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
    const now = await readSession(page);
    if (!now.state.units.find(u => u.id === 1)!.guarded) {
      expect(now.state.units.find(u => u.id === 1)!.hp).toBeGreaterThan(0);
      expect(now.events).toContainEqual({ type: 'guardExpired', unitId: 1 });
      const incoming = now.events.filter(e => e.type === 'attackRolled' && e.targetId === 1);
      expect(incoming.length).toBeGreaterThan(0);
      for (const event of incoming) expect(event).toMatchObject({ armorClass: stats.armorClass });
      await expect(page.locator('#battle-status')).not.toContainText('Guarded');
      await page.screenshot({ path: test.info().outputPath(`${mode}-guard-expired.png`) });
      writeFileSync(test.info().outputPath(`${mode}-guarded-receipt.json`), JSON.stringify({ initial: f.initial, boundaryCommands: f.commands, before: f.before, cast: cast.state, after: now, incomingAttacks: incoming.length }, null, 2));
      return;
    }
  }
  throw Error('Guard did not expire');
});
