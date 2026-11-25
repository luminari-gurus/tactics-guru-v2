import { expectDungeonResumed } from './helpers/dungeonTraversal';
import { atEncounter } from './helpers/dungeonFixtures';
import { expect, railTest as test, type Page } from './helpers/dungeonEntropy';
import { writeFileSync } from 'node:fs';
import { BattleSession } from '../src/app/BattleSession';
import { combatStats } from '../src/domain/effects';
import { dispatch } from '../src/domain/turns';
import { freshDungeon, startDungeonBattle, dungeonBattle } from '../src/domain/dungeon';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { guardedBoundary } from './helpers/guardedBoundary';
import { endTurn, battleTool, readSession, playCommand } from './helpers/battlePolicy';

const boardReport=async(page:Page)=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
async function checkBadges(page:Page) {
  const state=(await readSession(page)).state;
  const r=await boardReport(page);
  for(const unit of state.units) {
    const rendered=r.units.find((u:any)=>u.id===unit.id), badge=rendered.guard;
    expect(badge.visible).toBe(unit.hp>0 && !!unit.guarded);
    expect(badge.interactive).toBe(false);
    if(!badge.visible)continue;
    expect(badge.width).toBeGreaterThanOrEqual(11.99);
    expect(badge.depth).toBeGreaterThan(rendered.depth);
    expect(badge.depth).toBeLessThan(10000);
    expect(badge.screen.x-badge.width/2).toBeGreaterThanOrEqual(r.region.x);
    expect(badge.screen.y-badge.height/2).toBeGreaterThanOrEqual(r.region.y);
    expect(badge.screen.x+badge.width/2).toBeLessThanOrEqual(r.region.x+r.region.width);
    expect(badge.screen.y+badge.height/2).toBeLessThanOrEqual(r.region.y+r.region.height);
    // Shield sits beside the sprite, well above the HP arc and tile/target overlays.
    expect(badge.screen.y+badge.height/2).toBeLessThan(rendered.health.screen.y-4);
  }
}

function boundary(miss: boolean) {
  for (let seed = 1; seed <= 100; seed++) {
    const dungeon = startDungeonBattle(atEncounter(freshDungeon('guarded-browser', seed))); if (!dungeon.ok) throw Error(dungeon.reason);
    const { catalog } = dungeonBattle(dungeon.state)!;
    const initial = dungeon.state.activeBattle!;
    let fixture; try { fixture = guardedBoundary(catalog, initial); } catch { continue; }
    const cast = dispatch(fixture.before, fixture.command, catalog); if (!cast.ok) throw Error(cast.reason);
    if (cast.events.some(e => e.type === 'attackRolled' && e.result === 'miss') !== miss) continue;
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
    const saved = encodeDungeon({ ...dungeon.state, activeBattle: fixture.before });
    if (!saved.ok) throw Error(saved.reason);
    return { ...fixture, catalog, saved: saved.text, initial };
  }
  throw Error('No Guarded boundary');
}
for (const miss of [false, true]) test(`shared Guarded lifecycle: dungeon ${miss?'miss':'hit'}`, async ({ page }) => {
  test.setTimeout(180000);
  const f = boundary(miss);
  const key = DUNGEON_KEYS.primary;
  await page.goto('./');
  await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key, text: f.saved });
  await page.goto('./?game=dungeon');
  await expectDungeonResumed(page);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(f.before);
  await checkBadges(page);
  const bytes = await page.evaluate(key => localStorage.getItem(key), key);
  await page.locator(`[data-action="${f.command.abilityId}"]`).click();
  const target = f.before.units.find(u => u.id === ('unitId' in f.command.target ? f.command.target.unitId : -1))!;
  await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await expect(page.locator('#battle-preview')).toContainText('uses action');
  await page.locator('#battle-cancel').click();
  expect((await readSession(page)).state).toEqual(f.before);
  await checkBadges(page);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(bytes);
  const eventStart = (await readSession(page)).events.length;
  await playCommand(page, f.command);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const cast = await readSession(page), fighter = cast.state.units.find(u => u.id === 1)!;
  expect(fighter.guarded).toBe(true);
  expect(cast.events.slice(eventStart).some(e => e.type === 'attackRolled' && e.result === 'miss')).toBe(miss);
  await checkBadges(page);
  await page.screenshot({ path: test.info().outputPath(`dungeon-guarded-board.png`) });
  await expect(page.locator('#battle-status')).toContainText('Guarded');
  const stats = combatStats(fighter, f.catalog);
  await expect(page.locator('#battle-stats')).toContainText(`AC ${stats.armorClass}`);
  await (await battleTool(page, '#battle-party')).click();
  await expect(page.getByRole('dialog')).toContainText('Guarded (+2 AC, −2 attack rolls; expires immediately before this unit’s next turn)');
  await page.screenshot({ path: test.info().outputPath(`dungeon-guarded-inspection.png`) });
  await page.keyboard.press('Escape');
  await page.reload();
  await expectDungeonResumed(page);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect((await readSession(page)).events).toEqual([]);
  expect((await readSession(page)).state).toEqual(cast.state);
  await checkBadges(page);
  expect((await boardReport(page)).effect).toBeNull();
  const r=await boardReport(page), g=r.units.find((u:any)=>u.id===1).guard;
  const count=r.commandCount;
  if(test.info().project.use.hasTouch)await page.touchscreen.tap(g.screen.x,g.screen.y);
  else await page.mouse.click(g.screen.x,g.screen.y);
  expect((await boardReport(page)).commandCount).toBe(count);
  await checkBadges(page);
  await expect(page.locator('#battle-status')).toContainText('Guarded');
  await page.screenshot({ path: test.info().outputPath(`dungeon-guarded-resumed.png`) });
  const castEnd = (await readSession(page)).events.length;
  for (let i = 0; i < 15; i++) {
    await endTurn(page);
    await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
    const now = await readSession(page);
    await checkBadges(page);
    if (!now.state.units.find(u => u.id === 1)!.guarded) {
      expect(now.state.units.find(u => u.id === 1)!.hp).toBeGreaterThan(0);
      expect(now.events).toContainEqual({ type: 'guardExpired', unitId: 1 });
      const incoming = now.events.slice(castEnd).filter(e => e.type === 'attackRolled' && e.targetId === 1);
      expect(incoming.length).toBeGreaterThan(0);
      for (const event of incoming) expect(event).toMatchObject({ armorClass: stats.armorClass });
      await expect(page.locator('#battle-status')).not.toContainText('Guarded');
      await page.screenshot({ path: test.info().outputPath(`dungeon-guard-expired.png`) });
      writeFileSync(test.info().outputPath(`dungeon-guarded-receipt.json`), JSON.stringify({ initial: f.initial, boundaryCommands: f.commands, before: f.before, cast: cast.state, after: now, incomingAttacks: incoming.length }, null, 2));
      return;
    }
  }
  throw Error('Guard did not expire');
});
