import { atEncounter } from './helpers/dungeonFixtures';
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { BattleSession } from '../src/app/BattleSession';
import { battleCatalog } from '../src/content/catalog';
import { previewMovement } from '../src/domain/grid';
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
import { readSession, playCommand, confirmRestart, playerDecision } from './helpers/battlePolicy';

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

function boundary(mode: 'standalone' | 'run' | 'dungeon', miss: boolean) {
  for (let seed = 1; seed <= 100; seed++) {
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
    const saved = mode === 'standalone' ? encodeBattleSave(fixture.before, catalog) : mode === 'run'
      ? encodeRunSave({ items, activeBattle: fixture.before, battlefield: runBuilt.battlefield }, runContext)
      : encodeDungeon({ ...dungeon.state, activeBattle: fixture.before });
    if (!saved.ok) throw Error(saved.reason);
    return { ...fixture, catalog, saved: saved.text, initial, incoming };
  }
  throw Error('No Guarded boundary');
}
for (const mode of ['standalone', 'run', 'dungeon'] as const) for (const miss of [false, true]) test(`shared Guarded lifecycle and saved feedback: ${mode} ${miss?'miss':'hit'}`, async ({ page }) => {
  test.setTimeout(90000);
  const f = boundary(mode, miss), key = mode === 'standalone' ? BATTLE_STORAGE_KEYS.primary : mode === 'run' ? RUN_STORAGE_KEYS.primary : DUNGEON_KEYS.primary;
  const path = mode === 'standalone' ? '/' : mode === 'run' ? '/run' : '/dungeon';
  const resume = mode === 'standalone' ? '#save-continue' : mode === 'run' ? '#run-continue' : '#dungeon-continue';
  await page.goto(path);
  await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key, text: f.saved });
  await page.reload();
  if (mode === 'dungeon') await page.getByRole('button', { name: 'Continue saved dungeon', exact: true }).click();
  else await page.locator(resume).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(f.before);
  await checkBadges(page);
  const bytes = await page.evaluate(key => localStorage.getItem(key), key);
  await page.locator('[data-action=signature]').click();
  const target = f.before.units.find(u => u.id === ('unitId' in f.command.target ? f.command.target.unitId : -1))!;
  await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await expect(page.locator('#battle-preview')).toContainText('uses action');
  await page.locator('#battle-cancel').click();
  expect((await readSession(page)).state).toEqual(f.before);
  await checkBadges(page);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(bytes);
  if(mode==='standalone' && !miss) {
    await page.locator('[data-action=signature]').click();
    await page.locator('canvas').focus();
    const from=target.cell, self=f.before.units.find(u=>u.id===1)!.cell;
    for(let i=0;i<Math.abs(self.x-from.x);i++)await page.keyboard.press(self.x>from.x?'ArrowRight':'ArrowLeft');
    for(let i=0;i<Math.abs(self.y-from.y);i++)await page.keyboard.press(self.y>from.y?'ArrowDown':'ArrowUp');
    await page.keyboard.press('Enter');
    await expect(page.locator('#battle-review')).toBeDisabled();
    await expect(page.locator('#battle-preview')).toContainText('Unavailable');
    expect((await readSession(page)).state).toEqual(f.before);
    await checkBadges(page);
    expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(bytes);
    await page.locator('#battle-cancel').click();
  }
  await playCommand(page, f.command);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const cast = await readSession(page), fighter = cast.state.units.find(u => u.id === 1)!;
  expect(fighter.guarded).toBe(true);
  expect(cast.events.some(e => e.type === 'attackRolled' && e.result === 'miss')).toBe(miss);
  await checkBadges(page);
  await page.screenshot({ path: test.info().outputPath(`${mode}-guarded-board.png`) });
  await expect(page.locator('#battle-status')).toContainText('Guarded');
  const stats = combatStats(fighter, f.catalog);
  await expect(page.locator('#battle-stats')).toContainText(`AC ${stats.armorClass}`);
  await page.locator('#battle-party').click();
  await expect(page.getByRole('dialog')).toContainText('Guarded (+2 AC, −2 attack rolls; expires immediately before this unit’s next turn)');
  await page.screenshot({ path: test.info().outputPath(`${mode}-guarded-inspection.png`) });
  await page.keyboard.press('Escape');
  await page.reload();
  if (mode === 'dungeon') await page.getByRole('button', { name: 'Continue saved dungeon', exact: true }).click();
  else await page.locator(resume).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(cast.state);
  expect((await readSession(page)).events).toEqual([]);
  await checkBadges(page);
  expect((await boardReport(page)).effect).toBeNull();
  // Narrow and short layouts, camera zoom, and selection must retain the badge.
  const size=page.viewportSize()!;
  for(const viewport of [{width:320,height:568},{width:568,height:320},size]) {
    await page.setViewportSize(viewport);
    await expect.poll(async()=>(await boardReport(page)).viewport).toEqual(viewport);
    await checkBadges(page);
    await page.screenshot({path:test.info().outputPath(`${mode}-guard-${viewport.width}x${viewport.height}.png`)});
  }
  const r=await boardReport(page), g=r.units.find((u:any)=>u.id===1).guard;
  const count=r.commandCount;
  if(test.info().project.use.hasTouch)await page.touchscreen.tap(g.screen.x,g.screen.y);
  else await page.mouse.click(g.screen.x,g.screen.y);
  expect((await boardReport(page)).commandCount).toBe(count);
  await checkBadges(page);
  await expect(page.locator('#battle-status')).toContainText('Guarded');
  await page.screenshot({ path: test.info().outputPath(`${mode}-guarded-resumed.png`) });
  for (let i = 0; i < 15; i++) {
    await page.locator('#battle-next').click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
    const now = await readSession(page);
    await checkBadges(page);
    if (!now.state.units.find(u => u.id === 1)!.guarded) {
      expect(now.state.units.find(u => u.id === 1)!.hp).toBeGreaterThan(0);
      expect(now.events).toContainEqual({ type: 'guardExpired', unitId: 1 });
      const incoming = now.events.filter(e => e.type === 'attackRolled' && e.targetId === 1);
      expect(incoming.length).toBeGreaterThan(0);
      for (const event of incoming) expect(event).toMatchObject({ armorClass: stats.armorClass });
      await expect(page.locator('#battle-status')).not.toContainText('Guarded');
      await page.screenshot({ path: test.info().outputPath(`${mode}-guard-expired.png`) });
      if(mode==='standalone') {
        await page.locator('#fit-restart').click();await confirmRestart(page);
        await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
        await checkBadges(page);
        expect((await boardReport(page)).units.every((u:any)=>!u.guard.visible)).toBe(true);
      }
      writeFileSync(test.info().outputPath(`${mode}-guarded-receipt.json`), JSON.stringify({ initial: f.initial, boundaryCommands: f.commands, before: f.before, cast: cast.state, after: now, incomingAttacks: incoming.length }, null, 2));
      return;
    }
  }
  throw Error('Guard did not expire');
});

/** Both witnesses are reached by accepted commands; no synthetic state mutation. */
function guardedWitness(kind:'move'|'defeat') {
  const session=new BattleSession(battleCatalog,'map:forest_ruins',1);
  for(let i=0;i<200 && session.state.outcome==='ongoing';i++) {
    const before=session.state;
    const command=session.phase==='player'?playerDecision(before,battleCatalog):null;
    if(command)session.prepare(command);
    const step=command?session.confirm():session.nextEnemy();
    if(!step)throw Error('No witness progress');
    if(kind==='defeat' && before.units.find(u=>u.id===1)!.guarded && step.events.some(e=>e.type==='defeated' && e.unitId===1))
      return before;
    if(kind==='move' && command?.type==='useAbility' && command.abilityId==='ability:guarded_strike' && !before.units.find(u=>u.id===1)!.hasMoved)
      return step.after;
    session.finishPresentation(step.token);
  }
  throw Error(`No legal guarded ${kind} witness`);
}
for(const kind of ['move','defeat'] as const)test(`Guarded badge follows legal ${kind} presentation`,async({page,browserName})=>{
  const state=guardedWitness(kind), encoded=encodeBattleSave(state,battleCatalog);
  if(!encoded.ok)throw Error(encoded.reason);
  await page.clock.install();await page.goto('/');
  await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:BATTLE_STORAGE_KEYS.primary,text:encoded.text});
  await page.reload();
  await page.locator('#save-continue').waitFor({state:'visible'});
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.locator('#save-continue').click({force:true});
  await page.clock.runFor(64);
  if(kind==='move') {
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await checkBadges(page);
    await page.clock.resume();
    const r=await boardReport(page), p={x:r.region.x+r.region.width/2,y:r.region.y+r.region.height/2};
    if(browserName==='webkit') {
      // Mobile WebKit has no native wheel/multipoint driver; use the same
      // production pointer-handler exercise as the health-bar device matrix.
      await page.locator('canvas').evaluate((node,p)=>{
        const canvas=node as HTMLCanvasElement,capture=canvas.setPointerCapture;
        canvas.setPointerCapture=()=>{};
        try {
          for(const [type,id,x] of [['pointerdown',91,-10],['pointerdown',92,10],['pointermove',92,20],['pointerup',92,20],['pointerup',91,-10]] as const)
            canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:p.x+x,clientY:p.y,bubbles:true}));
        } finally {canvas.setPointerCapture=capture;}
      },p);
    } else {await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,-150);}
    await expect.poll(async()=>(await boardReport(page)).transform.scale).toBeGreaterThan(r.transform.scale);
    await checkBadges(page);
    const zoomed=await boardReport(page);
    expect(zoomed.transform.scale).toBeGreaterThan(r.transform.scale);
    const reach=previewMovement(state,1,battleCatalog);if(!reach.ok)throw Error(reach.reason);
    const to=reach.cells.filter(c=>c.cost>0).at(-1)!.cell;
    const initial=(await boardReport(page)).units.find((u:any)=>u.id===1);
    await page.locator('[data-action=move]').click();
    await page.locator('#battle-target').selectOption(`${to.x},${to.y}`);
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
    await page.locator('#battle-review').focus();await page.keyboard.press('Enter');
    await page.clock.runFor(48);
    const moving=(await boardReport(page)).units.find((u:any)=>u.id===1);
    expect(moving.guard.visible).toBe(true);
    expect(moving.guard.position.x-initial.guard.position.x).toBeCloseTo(moving.position.x-initial.position.x,4);
    expect(moving.guard.position.y-initial.guard.position.y).toBeCloseTo(moving.position.y-initial.position.y+initial.bobOffset,4);
    await page.clock.runFor(1500);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await checkBadges(page);
    expect((await readSession(page)).state.units.find(u=>u.id===1)!.cell).toEqual(to);
    await page.screenshot({path:test.info().outputPath('guarded-moved.png')});
    // Restart while the badge is still active; no stale display objects survive.
    const objects=(await boardReport(page)).objectCount;
    await page.clock.resume();await page.locator('#fit-restart').click();await confirmRestart(page);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await checkBadges(page);
    expect((await boardReport(page)).units.every((u:any)=>!u.guard.visible)).toBe(true);
    expect((await boardReport(page)).objectCount).toBe(objects);
  } else {
    await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
    expect((await boardReport(page)).units.find((u:any)=>u.id===1).guard.visible).toBe(true);
    await page.clock.runFor(2000);
    await expect.poll(async()=>(await readSession(page)).state.units.find(u=>u.id===1)!.hp).toBe(0);
    await expect.poll(async()=>(await boardReport(page)).units.find((u:any)=>u.id===1).guard.visible).toBe(false);
    await page.screenshot({path:test.info().outputPath('guarded-defeated.png')});
  }
});
