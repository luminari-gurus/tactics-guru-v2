import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { BattleSession } from '../src/app/BattleSession';
import { battleCatalog as catalog } from '../src/content/catalog';
import { dispatch } from '../src/domain/turns';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { projectTile } from '../src/geometry/iso';
import { abilityPresentation, type SignatureKind } from '../src/phaser/abilityPresentation';
import { playerDecision, readSession, confirmRestart } from './helpers/battlePolicy';

// Include real cached-document return, matching the persistence regression suite.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});

const kinds = ['guarded_strike','high_shot','magic_missile'] as const;
type Outcome = 'any'|'miss'|'critical'|'defeat';
/** Reach a real accepted boundary with the existing policy/session, never invent battle state. */
function boundary(kind:SignatureKind,outcome:Outcome='any',elevated=false) {
  for(let seed=2;seed<80;seed++){
    const session=new BattleSession(catalog,'map:forest_ruins',seed);
    for(let i=0;i<200 && session.state.outcome==='ongoing';i++){
      const command=session.phase==='player'?playerDecision(session.state):null;
      if(command)session.prepare(command);
      const step=command?session.confirm():session.nextEnemy();
      if(!step)throw Error('Policy failed to make progress');
      const view=abilityPresentation(step.events);
      const target=step.before.units.find(u=>u.id===view.signature?.targetId);
      const raised=target && catalog.maps[step.before.mapId].cells.some(c=>c.x===target.cell.x && c.y===target.cell.y && c.elevation>0);
      if(command && view.signature?.kind===kind && (!elevated || raised) && (outcome==='any'
        || outcome==='defeat' && step.events.some(e=>e.type==='defeated')
        || step.events.some(e=>e.type==='attackRolled' && e.result===outcome)))return {command,...step};
      session.finishPresentation(step.token);
    }
  }
  throw Error(`No legal ${kind} ${outcome} boundary`);
}
type Boundary=ReturnType<typeof boundary>;
const report=async(page:Page)=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
const stored=(page:Page)=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),keys);
const ready=(page:Page)=>expect(page.locator('#game')).toHaveAttribute('data-phase','player');

async function boot(page:Page,fixture:Boundary) {
  const encoded=encodeBattleSave(fixture.before,catalog);expect(encoded.ok).toBe(true);if(!encoded.ok)throw Error(encoded.reason);
  await page.addInitScript(({keys,text})=>{
    if(!sessionStorage.getItem('test:animation-seeded')){
      localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);
      sessionStorage.setItem('test:animation-seeded','yes');
    }
  },{keys,text:encoded.text});
  await page.clock.install();await page.goto('./');await page.locator('#save-continue').click();await ready(page);
  expect(new URL(page.url()).pathname).toBe(process.env.PLAYWRIGHT_BASE_PATH ?? '/');
  expect((await readSession(page)).state).toEqual(fixture.before);
}
async function press(page:Page,selector:string,keyboard=false) {
  const element=page.locator(selector);
  if(keyboard){await element.focus();await page.keyboard.press('Enter');}
  else if(test.info().project.name.startsWith('mobile'))await element.tap();
  else await element.click();
}
async function review(page:Page,fixture:Boundary,keyboard=false) {
  await press(page,'[data-action="signature"]',keyboard);
  const view=abilityPresentation(fixture.events).signature!,target=fixture.before.units.find(u=>u.id===view.targetId)!;
  if(keyboard){
    const actor=fixture.before.units.find(u=>u.id===view.actorId)!;
    const cursor=(await report(page)).selected ?? actor.cell;
    await page.locator('canvas').focus();
    for(let x=cursor.x;x!==target.cell.x;x+=x<target.cell.x?1:-1)await page.keyboard.press(x<target.cell.x?'ArrowRight':'ArrowLeft');
    for(let y=cursor.y;y!==target.cell.y;y+=y<target.cell.y?1:-1)await page.keyboard.press(y<target.cell.y?'ArrowDown':'ArrowUp');
    await page.keyboard.press('Enter');
  }else await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await press(page,'#battle-review',keyboard);
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function confirmFrozen(page:Page) {
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.locator('#dialog-confirm').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
}
function aligned(r:any,fixture:Boundary) {
  const effect=r.effect;expect(effect).not.toBeNull();
  for(const [id,point] of [[effect.actorId,effect.from],[effect.targetId,effect.to]] as const){
    const unit=fixture.before.units.find(u=>u.id===id)!,tile=r.tiles.find((t:any)=>t.x===unit.cell.x && t.y===unit.cell.y);
    const expected=projectTile(tile);expect(point).toEqual({x:expected.x,y:expected.y-28});
    expect(r.units.find((u:any)=>u.id===id).anchorError).toBeLessThan(0.001);
  }
}

for(const kind of kinds)test(`${kind}: real controls, travel/impact, transformed anchors and exactly one accepted result`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const fixture=boundary(kind),keyboard=kind==='magic_missile';await boot(page,fixture);
  const baseline=(await report(page)).objectCount,savedBefore=await stored(page);
  // A signature aimed at its own actor must remain a rejected preview, with no cue or save.
  await press(page,'[data-action="signature"]',keyboard);await page.locator('canvas').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#battle-preview')).toContainText('Unavailable');await expect(page.locator('#battle-review')).toBeDisabled();
  expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.before);expect(await stored(page)).toEqual(savedBefore);
  await press(page,'#battle-cancel',keyboard);
  await review(page,fixture,keyboard);await page.keyboard.press('Escape');
  expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.before);expect(await stored(page)).toEqual(savedBefore);
  // Transform before the effect through real board gestures.
  const point=await page.evaluate(()=>{const p=document.querySelector('#fit-panel')!.getBoundingClientRect();return {x:innerWidth/2,y:p.bottom+(innerHeight-p.bottom)*0.6};});
  await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-80);
  await review(page,fixture,keyboard);await confirmFrozen(page);
  const accepted=await readSession(page),saved=await stored(page);
  expect(accepted.state).toEqual(fixture.after);expect(accepted.events).toEqual(fixture.events);
  expect(accepted.continuation!.commands).toEqual([fixture.command]);
  const expected=dispatch(fixture.before,fixture.command,catalog);expect(expected.ok).toBe(true);
  if(expected.ok)expect(accepted.state).toEqual(expected.state);
  // Exercise board input during the lock. Fresh keys on the usable Restart
  // fallback intentionally open/confirm reset; held-key capture has its own regression.
  await expect(page.locator('#fit-restart')).toBeFocused();await page.locator('canvas').focus();
  await page.keyboard.press('Enter');await page.keyboard.press('Space');
  await expect(page.locator('#battle-next')).toBeDisabled();await expect(page.locator('[data-action="signature"]')).toBeDisabled();
  await page.clock.runFor(112);const travel=await report(page);aligned(travel,fixture);
  expect(travel.effect.progress).toBeGreaterThan(0);expect(travel.effect.progress).toBeLessThan(0.45);
  await page.screenshot({path:info.outputPath(`${kind}-travel.png`)});
  // Pan/zoom during flight without changing the accepted simulation.
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+25,point.y-15,{steps:3});await page.mouse.up();
  await page.mouse.wheel(0,-50);await page.clock.runFor(176);
  const impact=await report(page);aligned(impact,fixture);expect(impact.transform).not.toEqual(travel.transform);
  expect(impact.effect.progress).toBeGreaterThanOrEqual(0.45);
  expect(impact.effect.feedback.filter((f:any)=>f.visible).map((f:any)=>({unitId:f.unitId,text:f.text})))
    .toEqual(abilityPresentation(fixture.events).feedback.map(f=>({unitId:f.unitId,text:f.text})));
  await page.screenshot({path:info.outputPath(`${kind}-impact.png`)});
  const capture=(r:any)=>({viewport:r.viewport,transform:r.transform,effect:r.effect,
    units:r.units.filter((u:any)=>u.id===r.effect.actorId || u.id===r.effect.targetId),objectCount:r.objectCount});
  writeFileSync(info.outputPath('animation.json'),JSON.stringify({viewport:page.viewportSize(),fixture,travel:capture(travel),impact:capture(impact)},null,2));
  expect((await readSession(page)).state).toEqual(accepted.state);expect(await stored(page)).toEqual(saved);
  await page.clock.runFor(500);await ready(page);
  expect((await report(page)).effect).toBeNull();expect((await report(page)).objectCount).toBe(baseline);
  expect((await readSession(page)).state).toEqual(fixture.after);expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
});

for(const [kind,outcome] of [['guarded_strike','miss'],['high_shot','miss'],['high_shot','critical'],['magic_missile','defeat']] as const)
test(`${kind}: ${outcome} feedback matches resolved events`,async({page},info)=>{
  const fixture=boundary(kind,outcome);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(288);
  const r=await report(page);aligned(r,fixture);
  const feedback=abilityPresentation(fixture.events).feedback;
  expect(r.effect.feedback.map((f:any)=>({unitId:f.unitId,text:f.text}))).toEqual(feedback.map(f=>({unitId:f.unitId,text:f.text})));
  expect(r.effect.feedback.every((f:any)=>f.visible)).toBe(true);
  if(outcome==='miss'){expect(feedback.some(f=>f.text==='Miss')).toBe(true);expect(feedback.some(f=>f.text.includes('−'))).toBe(false);}
  if(kind==='guarded_strike')expect(feedback).toContainEqual({unitId:r.effect.actorId,kind:'guard',text:'Guarded'});
  const positions=r.effect.feedback.map((f:any)=>`${f.x},${f.y}`);expect(new Set(positions).size).toBe(positions.length);
  await page.screenshot({path:info.outputPath(`${kind}-${outcome}.png`)});await page.clock.runFor(500);
  expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.after);
});

for(const kind of kinds)test(`${kind}: repeated cancellation, modal refresh, resize and restart during travel and impact`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=boundary(kind);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(96);
  const saved=await stored(page);
  await page.locator('#fit-restart').click({force:true});await page.locator('#save-cancel-reset').click({force:true});
  aligned(await report(page),fixture);
  const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});await page.clock.runFor(64);
  aligned(await report(page),fixture);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    for(let i=0;i<3;i++)document.dispatchEvent(new Event('visibilitychange'));
  });
  await ready(page);expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.after);expect(await stored(page)).toEqual(saved);
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(700);expect((await readSession(page)).state).toEqual(fixture.after);
  // Restore only this known legal boundary via the real persisted-save startup for each teardown phase.
  for(const time of [96,288]){
    const encoded=encodeBattleSave(fixture.before,catalog);if(!encoded.ok)throw Error(encoded.reason);
    await page.evaluate(({keys,text})=>{localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);},{keys,text:encoded.text});
    await page.reload();await page.clock.resume();await page.locator('#save-continue').click();await ready(page);
    await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(time);
    await page.locator('#fit-restart').click({force:true});await confirmRestart(page,true);await page.clock.resume();await ready(page);
    expect((await readSession(page)).state.seed).toBe(fixture.before.seed+1);expect((await report(page)).effect).toBeNull();
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

for(const kind of kinds)test(`${kind}: reload resumes accepted save without historical effects`,async({page})=>{
  const fixture=boundary(kind);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(112);
  const saved=await stored(page);await page.reload();await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
  expect(await stored(page)).toEqual(saved);await page.locator('#save-continue').click();await ready(page);
  expect((await readSession(page)).state).toEqual(fixture.after);expect((await readSession(page)).events).toEqual([]);
  expect((await report(page)).effect).toBeNull();expect(await stored(page)).toEqual(saved);
});

test('elevated target remains anchored through rotation during impact',async({page},info)=>{
  const fixture=boundary('high_shot','any',true);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);
  await page.clock.runFor(288);const before=await report(page);aligned(before,fixture);
  const unit=fixture.before.units.find(u=>u.id===before.effect.targetId)!;
  expect(before.tiles.find((t:any)=>t.x===unit.cell.x && t.y===unit.cell.y).elevation).toBeGreaterThan(0);
  const size=page.viewportSize()!,rotated={width:size.height,height:size.width};
  // Native resize delivery is independent of the paused animation clock. Wait
  // for that event before advancing Phaser's resize/presentation callbacks.
  await page.evaluate(()=>window.addEventListener('resize',()=>{document.documentElement.dataset.impactResize='observed';},{once:true}));
  await page.setViewportSize(rotated);
  await expect(page.locator('html')).toHaveAttribute('data-impact-resize','observed');
  await page.clock.runFor(64);
  const after=await report(page);aligned(after,fixture);expect(after.viewport).toEqual(rotated);
  await page.screenshot({path:info.outputPath('elevated-rotated-impact.png')});
  await page.clock.runFor(500);expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.after);
});

test.describe('ability departure through real browser history',()=>{
  for(const kind of kinds)test(`${kind}: cached return preserves exact accepted slots until Continue`,async({page,baseURL})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>window.addEventListener('pageshow',event=>{if(event.persisted)sessionStorage.setItem('test:animation-cached-return','yes');}));
    const fixture=boundary(kind);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(112);
    const saved=await stored(page),map=new URL('map',baseURL).href;
    await page.evaluate(map=>location.assign(map),map);await expect(page.locator('#map-grid span')).toHaveCount(400);
    await page.goBack({waitUntil:'commit'});await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('test:animation-cached-return'))).toBe('yes');
    expect(await stored(page)).toEqual(saved);expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
    await page.locator('#save-continue').click();await ready(page);
    expect((await readSession(page)).state).toEqual(fixture.after);expect((await readSession(page)).events).toEqual([]);
    expect((await report(page)).effect).toBeNull();expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
  });
});
