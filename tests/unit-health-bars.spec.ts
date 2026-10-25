import { expect, test, type Page } from '@playwright/test';
import { BattleSession } from '../src/app/BattleSession';
import { battleCatalog as catalog } from '../src/content/catalog';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import type { BattleState } from '../src/domain/types';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { pickTile, screenToBoard } from '../src/geometry/picking';
import { HEALTH_BAR, healthColor, healthFraction } from '../src/phaser/healthBar';
import { playCommand, playerDecision, readSession, confirmRestart } from './helpers/battlePolicy';
import { runContext } from './helpers/runItemFixtures';
import { runBattleCatalog, type RunSnapshot } from '../src/domain/runSaveEnvelope';

const report=async(page:Page)=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
const ready=(page:Page)=>expect(page.locator('#game')).toHaveAttribute('data-phase','player');
async function settled(page:Page) {
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  return report(page);
}
function check(r:any,state?:BattleState) {
  for(const u of r.units) {
    const h=u.health, definition=u.side==='player'?catalog.heroes[u.unitId as keyof typeof catalog.heroes]:catalog.enemies[u.unitId as keyof typeof catalog.enemies];
    if(state) {
      const source=state.units.find(v=>v.id===u.id)!;
      expect(h.hp).toBe(source.hp);
      expect(u.guard.visible).toBe(source.hp>0 && !!source.guarded);
    }
    expect(h.maxHp).toBe(definition.stats.maxHp);expect(h.ratio).toBe(healthFraction(h.hp,h.maxHp));
    expect(h.color).toBe(healthColor(h.ratio));expect(h.visible).toBe(h.hp>0);expect(h.interactive).toBe(false);
    expect(h.position.x).toBeCloseTo(u.position.x,5);expect(h.position.y).toBeCloseTo(u.position.y-u.bobOffset+HEALTH_BAR.offsetY,5);
    expect(h.depth).toBeGreaterThan(u.depth);expect(h.depth).toBeLessThan(10000);
  }
  expect(r.depthOrder).toEqual([...r.depthOrder].sort((a:number,b:number)=>a-b));
}
function damageBoundary(defeat=false) {
  for(let seed=2;seed<30;seed++) {
    const s=new BattleSession(catalog,'map:forest_ruins',seed);
    for(let i=0;i<200 && s.state.outcome==='ongoing';i++) {
      const command=s.phase==='player'?playerDecision(s.state):null;
      if(command)s.prepare(command);
      const step=command?s.confirm():s.nextEnemy();if(!step)throw Error('No progress');
      if(command?.type==='useAbility' && command.abilityId!=='ability:basic_attack' && step.events.some(e=>e.type===(defeat?'defeated':'damaged')))
        return {...step,command};
      s.finishPresentation(step.token);
    }
  }
  throw Error('No legal damage boundary');
}
async function bootBoundary(page:Page,state:BattleState) {
  const encoded=encodeBattleSave(state,catalog);if(!encoded.ok)throw Error(encoded.reason);
  await page.addInitScript(({keys,text})=>{
    if(!sessionStorage.getItem('test:health-seeded')) {
      localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);sessionStorage.setItem('test:health-seeded','yes');
    }
  },{keys,text:encoded.text});
  await page.clock.install();await page.goto('./');await page.locator('#save-continue').click();await ready(page);
}
async function confirmFrozen(page:Page) {
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.locator('#battle-review').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
}
async function prepareCommand(page:Page,fixture:ReturnType<typeof damageBoundary>) {
  await page.locator('[data-action="signature"]').click();
  const target=fixture.command.target;
  const id='unitId' in target?target.unitId:'missileTargets' in target?target.missileTargets[0]:-1;
  const cell=fixture.before.units.find(u=>u.id===id)!.cell;
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
}

test('health bars are visible, attached and informational through mobile navigation',async({page,browserName},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await ready(page);const initial=await settled(page);check(initial,(await readSession(page)).state);
  expect(initial.units.some((u:any)=>u.side==='enemy' && u.health.ratio===1)).toBe(true);
  await page.screenshot({path:info.outputPath('health-fitted.png')});
  const unit=initial.units.find((u:any)=>u.health.visible),p=unit.health.screen;
  if(info.project.use.hasTouch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  const tapped=await settled(page),picked=pickTile(tapped.tiles,screenToBoard(p,tapped.transform));
  expect(tapped.selected).toEqual(picked?{x:picked.x,y:picked.y,elevation:picked.elevation}:null);
  expect(tapped.commandCount).toBe(initial.commandCount);
  // Keyboard navigation remains the same while informational bars are displayed.
  await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  expect((await report(page)).selected).not.toEqual(tapped.selected);
  const before=await report(page),center={x:before.transform.x,y:before.transform.y+240*before.transform.scale};
  // WebKit has no native multipoint-touch automation. Exercise the production
  // pointer handlers with two touch pointers there; Chromium uses native CDP touch.
  if(browserName==='chromium') {
    const cdp=await page.context().newCDPSession(page);
    const touch=(type:'touchStart'|'touchMove'|'touchEnd',touchPoints:any[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    await touch('touchStart',[{x:center.x-10,y:center.y,id:1},{x:center.x+10,y:center.y,id:2}]);
    await touch('touchMove',[{x:center.x-25,y:center.y,id:1},{x:center.x+25,y:center.y,id:2}]);
    await touch('touchEnd',[{x:center.x-25,y:center.y,id:1}]);await touch('touchEnd',[]);await cdp.detach();
  } else {
    await page.locator('canvas').evaluate((node,center)=>{
      const canvas=node as HTMLCanvasElement,capture=canvas.setPointerCapture;
      // Dispatched pointers have no OS pointer to capture. Adapt only that
      // browser API; the production multipointer/zoom handlers still run.
      canvas.setPointerCapture=()=>{};
      try {
        for(const [type,id,x] of [['pointerdown',91,-10],['pointerdown',92,10],['pointermove',92,40],['pointerup',92,40],['pointerup',91,-10]] as const)
          canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:center.x+x,clientY:center.y,bubbles:true}));
      } finally {canvas.setPointerCapture=capture;}
    },center);
  }
  const zoomed=await settled(page);expect(zoomed.transform.scale).toBeGreaterThan(before.transform.scale);expect(zoomed.selectionEvents).toBe(before.selectionEvents);
  await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+25,center.y-15,{steps:3});await page.mouse.up();
  const dragged=await settled(page);expect(dragged.selectionEvents).toBe(before.selectionEvents);check(dragged);
  await page.screenshot({path:info.outputPath('health-zoomed.png')});
  const size=page.viewportSize()!;
  for(const viewport of [{width:size.height,height:size.width},{width:320,height:568},{width:568,height:320}]) {
    await page.setViewportSize(viewport);await expect.poll(async()=>(await report(page)).viewport).toEqual(viewport);check(await settled(page));
    await page.screenshot({path:info.outputPath(`health-${viewport.width}x${viewport.height}.png`)});
  }
  expect((await readSession(page)).state.commandCount).toBe(initial.commandCount);expect(errors).toEqual([]);
});

test('elevated movement keeps bars attached through refresh, rotation and restart',async({page},info)=>{
  await page.clock.install();await page.goto('./');await ready(page);const initial=await settled(page),objects=initial.objectCount;
  const to=initial.reachable.find((c:any)=>initial.tiles.find((t:any)=>t.x===c.x && t.y===c.y).elevation===1);expect(to).toBeDefined();
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption(`${to.x},${to.y}`);await confirmFrozen(page);
  await page.clock.runFor(48);const moving=await report(page);check(moving);
  const actor=moving.units.find((u:any)=>u.id===initial.activeId);expect(actor.position).not.toEqual(initial.units.find((u:any)=>u.id===initial.activeId).position);
  await page.screenshot({path:info.outputPath('health-moving.png')});
  await page.locator('#fit-restart').click({force:true});await page.locator('#save-cancel-reset').click({force:true});check(await report(page));
  const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});await page.clock.runFor(32);check(await report(page));
  await page.clock.runFor(1000);await ready(page);check(await report(page),(await readSession(page)).state);
  expect((await report(page)).units.find((u:any)=>u.id===initial.activeId).tile).toEqual({...to,elevation:1});
  await page.screenshot({path:info.outputPath('health-elevated.png')});
  await page.clock.resume();
  for(let i=0;i<3;i++) {
    await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
    const r=await settled(page);check(r,(await readSession(page)).state);expect(r.objectCount).toBe(objects);await expect(page.locator('canvas')).toHaveCount(1);
  }
});

for(const defeat of [false,true])test(`health follows ${defeat?'defeat':'damage'} presentation, cancellation and save resume`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=damageBoundary(defeat);await bootBoundary(page,fixture.before);const baseline=(await report(page)).objectCount;
  check(await report(page),fixture.before);await prepareCommand(page,fixture);
  const count=(await report(page)).selectionEvents;await page.mouse.click(3,3);expect((await report(page)).selectionEvents).toBe(count);
  await confirmFrozen(page);await page.clock.runFor(288);check(await report(page),fixture.before);
  expect((await readSession(page)).state).toEqual(fixture.after);
  await page.screenshot({path:info.outputPath(`health-${defeat?'defeat':'damage'}-impact.png`)});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await ready(page);
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(32); // Render the completed boundary before capturing pixels.
  const after=await report(page);check(after,fixture.after);expect(after.objectCount).toBe(baseline);
  if(defeat)expect(after.units.filter((u:any)=>!u.health.visible).length).toBeGreaterThan(fixture.before.units.filter(u=>u.hp===0).length);
  await page.screenshot({path:info.outputPath(`health-${defeat?'defeat':'damage'}-complete.png`)});
  await page.reload();await page.clock.resume();await page.locator('#save-continue').click();await ready(page);
  check(await settled(page),fixture.after);expect((await readSession(page)).events).toEqual([]);expect((await report(page)).objectCount).toBe(baseline);expect(errors).toEqual([]);
});

test('real run reward healing carries into the next encounter without old bars',async({page},info)=>{
  test.setTimeout(240000);await page.goto('./run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();await ready(page);
  for(let turn=0;turn<300;turn++) {
    const current:RunSnapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
    if(current.items.run.phase!=='battle')break;
    await ready(page);const state=(await readSession(page)).state;check(await report(page),state);
    await playCommand(page,playerDecision(state,runBattleCatalog(current.items,runContext)!));
    await expect.poll(async()=>await page.locator('#game').getAttribute('data-phase')??'boundary').toMatch(/player|ended|boundary/);
  }
  await expect(page.getByRole('heading',{name:'Choose one reward'})).toBeVisible();
  await page.getByRole('button',{name:'Claim Healing Draught',exact:true}).click();await page.locator('#item-confirm').click();
  const before:RunSnapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
  const hero=before.items.run.party.find(h=>h.hp>0 && h.hp<catalog.heroes[h.heroId].stats.maxHp)!;expect(hero).toBeDefined();
  await page.locator('[id="target-item:healing_draught"]').selectOption(hero.heroId);
  await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();await page.locator('#item-confirm').click();
  const healed:RunSnapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
  expect(healed.items.run.party.find(h=>h.heroId===hero.heroId)!.hp).toBeGreaterThan(hero.hp);
  await page.locator('#run-start-encounter').click();await ready(page);const state=(await readSession(page)).state,r=await settled(page);check(r,state);
  expect(r.units.every((u:any)=>!u.guard.visible)).toBe(true);
  expect(state.mapId).toBe('map:desert_woodland_crossing');expect(r.units.filter((u:any)=>u.health.visible).length).toBe(state.units.filter(u=>u.hp>0).length);
  await expect(page.locator('#battle-heading h1')).toHaveText('Encounter 2 of 3 · woodland crossing');
  await expect(page.locator('#run-progress')).toHaveText('Encounter 2 of 3 · woodland crossing');
  await page.screenshot({path:info.outputPath('health-second-encounter.png')});
});
