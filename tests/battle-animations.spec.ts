import type { Command } from '../src/domain/types';
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { BattleSession } from '../src/app/BattleSession';
import { battleCatalog as catalog } from '../src/content/catalog';
import { dispatch } from '../src/domain/turns';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { projectTile } from '../src/geometry/iso';
import { HEALTH_BAR } from '../src/phaser/healthBar';
import { abilityPresentation, type SignatureKind } from '../src/phaser/abilityPresentation';
import { playerDecision, readSession, confirmRestart } from './helpers/battlePolicy';

// Include real cached-document return, matching the persistence regression suite.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});

const kinds = ['guarded_strike','high_shot','magic_missile'] as const;
type Outcome = 'any'|'miss'|'critical'|'defeat';
/** Reach a real accepted boundary with the existing policy/session, never invent battle state. */
function boundary(kind:SignatureKind,outcome:Outcome='any',elevated=false,firstSeed=2) {
  for(let seed=firstSeed;seed<80;seed++){
    const session=new BattleSession(catalog,'map:forest_ruins',seed);
    for(let i=0;i<200 && session.state.outcome==='ongoing';i++){
      let command=session.phase==='player'?playerDecision(session.state):null;
      // The picker uses the domain's same-target shorthand, including for one missile.
      if(command?.type==='useAbility' && command.abilityId==='ability:magic_missile' && 'missileTargets' in command.target && command.target.missileTargets.length===1)
        command={...command,target:{unitId:command.target.missileTargets[0]}};
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

function sharedCellBoundary() {
  const session=new BattleSession(catalog,'map:forest_ruins',1);
  for(let i=0;i<200 && session.state.outcome==='ongoing';i++){
    if(session.phase==='player'){
      const target=session.state.units.find(u=>u.hp>0 && u.side==='enemy' && session.state.units.some(d=>d.hp===0 && d.cell.x===u.cell.x && d.cell.y===u.cell.y));
      if(target){
        const command:Command={type:'useAbility',unitId:session.active.id,abilityId:'ability:basic_attack',target:{unitId:target.id}};
        if(session.prepare(command).ok)return {command,...session.confirm()!};
      }
    }
    const command=session.phase==='player'?playerDecision(session.state):null;
    if(command)session.prepare(command);
    const step=command?session.confirm():session.nextEnemy();
    if(!step)throw Error('Policy failed to make progress');
    session.finishPresentation(step.token);
  }
  throw Error('No legal shared-cell boundary');
}

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
  const targeting=await report(page);
  expect(targeting.reachable).toEqual([]);
  expect(targeting.targets.find((t:any)=>t.selected)).toEqual({cell:target.cell,valid:true,selected:true,reason:null});
  await page.clock.runFor(48);
  await page.screenshot({path:test.info().outputPath(`${view.kind}-target-preview.png`)});
  await press(page,'#battle-review',keyboard);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await report(page)).targets).toEqual(targeting.targets);
}
async function confirmFrozen(page:Page) {
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.locator('#dialog-confirm').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  expect((await report(page)).targets).toEqual([]);
}

test('target overlays follow invalid selection, action changes, keyboard, cancellation and board taps without resolving commands',async({page},info)=>{
  const fixture=boundary('high_shot','any',true);await boot(page,fixture);
  const saved=await stored(page),initial=(await readSession(page)).state;
  await press(page,'[data-action="signature"]');
  const actor=fixture.before.units.find(u=>u.id===fixture.command.unitId)!;
  await page.locator('canvas').focus();await page.keyboard.press('Enter');
  expect((await report(page)).targets.find((t:any)=>t.selected)).toEqual({cell:actor.cell,valid:false,selected:true,reason:'sameSide'});
  await expect(page.locator('#battle-preview')).toContainText('Unavailable: Same Side');
  await expect(page.locator('#battle-review')).toBeDisabled();
  await page.clock.runFor(48);
  await page.screenshot({path:info.outputPath('invalid-ally-target.png')});
  await page.keyboard.press('ArrowRight');
  const navigated=await report(page);
  expect(navigated.targets.find((t:any)=>t.selected)?.cell).toEqual({x:Math.min(11,actor.cell.x+1),y:actor.cell.y});
  const command=fixture.command;
  if(command.type!=='useAbility' || !('unitId' in command.target))throw Error('Expected unit attack fixture');
  const targetId=command.target.unitId;
  const target=fixture.before.units.find(u=>u.id===targetId)!;
  const current=await report(page),tile=current.tiles.find((t:any)=>t.x===target.cell.x&&t.y===target.cell.y),point=projectTile(tile);
  const screen={x:current.transform.x+point.x*current.transform.scale,y:current.transform.y+point.y*current.transform.scale};
  if(info.project.name.startsWith('mobile'))await page.touchscreen.tap(screen.x,screen.y);
  else await page.mouse.click(screen.x,screen.y);
  expect((await report(page)).targets.find((t:any)=>t.selected)).toEqual({cell:target.cell,valid:true,selected:true,reason:null});
  await page.locator('#battle-review').click();await page.locator('#dialog-cancel').click();
  expect((await report(page)).targets).toEqual([]);await expect(page.locator('#battle-review')).toBeDisabled();
  await press(page,'[data-action="signature"]');await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await press(page,'[data-action="move"]');expect((await report(page)).targets).toEqual([]);
  await press(page,'[data-action="basic"]');expect((await report(page)).targets.length).toBeGreaterThan(0);
  await page.locator('#battle-cancel').click();expect((await report(page)).targets).toEqual([]);
  expect((await readSession(page)).state).toEqual(initial);expect(await stored(page)).toEqual(saved);
  await press(page,'[data-action="signature"]');await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
  expect((await report(page)).targets).toEqual([]);
});
function aligned(r:any,fixture:Boundary) {
  const effect=r.effect;expect(effect).not.toBeNull();
  for(const [id,point] of [[effect.actorId,effect.from],[effect.targetId,effect.to]] as const){
    const unit=fixture.before.units.find(u=>u.id===id)!,tile=r.tiles.find((t:any)=>t.x===unit.cell.x && t.y===unit.cell.y);
    const expected=projectTile(tile);expect(point).toEqual({x:expected.x,y:expected.y-28});
    expect(r.units.find((u:any)=>u.id===id).anchorError).toBeLessThan(0.001);
  }
}

test('shared corpse cell keeps living target identity through inspection, confirmation and execution',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const fixture=sharedCellBoundary();expect(fixture.before.commandCount).toBe(64);
  const target=fixture.before.units.find(u=>u.id===5)!,corpse=fixture.before.units.find(u=>u.id===2)!;
  expect(target.hp).toBe(5);expect(corpse.hp).toBe(0);expect(corpse.cell).toEqual(target.cell);
  await boot(page,fixture);
  await expect(page).toHaveTitle(/Tactics Guru/);await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.locator('[data-action="basic"]').click();await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  const label='Goblin Archer #5 · HP 5/8',saved=await stored(page),prepared=await page.locator('#game').getAttribute('data-session');
  expect(JSON.parse(prepared!).pending).toEqual(fixture.command);
  await expect(page.locator('#battle-target option:checked')).toContainText(label);
  await expect(page.locator('#battle-target-info')).toHaveText(`Target: ${label}`);
  await page.locator('#battle-inspect-target').click();await expect(page.locator('#battle-dialog-title')).toHaveText('Inspection only — Goblin Archer #5');
  await expect(page.locator('#battle-dialog-message')).toContainText('HP 5/8');
  await page.locator('#inspection-close').click();expect(await page.locator('#game').getAttribute('data-session')).toBe(prepared);expect(await stored(page)).toEqual(saved);
  // Confirmation must use the prepared command, even if the rendered panel is stale.
  await page.locator('#battle-target-info').evaluate(el=>{el.textContent='Target: Ranger #2 · Defeated';});
  await page.locator('#battle-review').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Target: ${label}`);
  await expect(page.locator('#battle-dialog-message')).not.toContainText('Ranger #2');
  await page.screenshot({path:info.outputPath('living-target-confirmation.png')});
  await confirmFrozen(page);
  const accepted=await readSession(page);expect(accepted.continuation!.commands).toEqual([fixture.command]);
  expect(accepted.events).toEqual(fixture.events);expect(accepted.state).toEqual(fixture.after);expect(accepted.state.units.find(u=>u.id===corpse.id)!.hp).toBe(0);
  await page.clock.runFor(700);await ready(page);expect(errors).toEqual([]);
});

for(const outcome of ['miss','defeat'] as const)test(`guarded strike ${outcome}: panned-edge actor and target feedback never overlap`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const fixture=boundary('guarded_strike',outcome,false,1);
  if(outcome==='defeat'){expect(fixture.before.seed).toBe(1);expect(fixture.before.commandCount).toBe(73);}
  await page.setViewportSize({width:320,height:568});await boot(page,fixture);
  const r=(await report(page)).region;
  const drag=async(dx:number,dy:number)=>{
    const x=r.x+r.width*(dx>0?.1:dx<0?.9:.5),y=r.y+r.height*(dy>0?.1:dy<0?.9:.5);
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*r.width*.8,y+dy*r.height*.8,{steps:8});await page.mouse.up();
  };
  // Reproduce the review: pan before the command, with no mid-animation gesture.
  await drag(0,-1);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(288);
  const saved=await stored(page);
  const check=async()=>{
    const frame=await report(page),labels=frame.feedbackBounds;
    expect(labels.map((b:any)=>b.text)).toEqual(abilityPresentation(fixture.events).feedback.map(f=>f.text));
    expect(labels).toHaveLength(outcome==='defeat'?3:2);
    for(const a of labels){
      expect(a.x).toBeGreaterThanOrEqual(frame.region.x);expect(a.y).toBeGreaterThanOrEqual(frame.region.y);
      expect(a.x+a.width).toBeLessThanOrEqual(frame.region.x+frame.region.width);expect(a.y+a.height).toBeLessThanOrEqual(frame.region.y+frame.region.height);
    }
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j];expect(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y,`${a.text} overlaps ${b.text}`).toBe(true);
    }
    expect((await readSession(page)).state).toEqual(fixture.after);expect(await stored(page)).toEqual(saved);
  };
  await check();await page.screenshot({path:info.outputPath(`guarded-${outcome}-prepan.png`)});
  // Re-layout at the other edges, maximum zoom and an actual viewport change.
  for(const [dx,dy] of [[0,1],[-1,0],[1,0],[0,-1]]){await drag(dx,dy);await check();}
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.wheel(0,-3000);await drag(0,-1);await check();
  await page.setViewportSize({width:568,height:320});await page.clock.runFor(32);await check();
  await page.clock.runFor(700);await ready(page);expect(errors).toEqual([]);
});

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
  const point=await page.evaluate(()=>{const r=document.querySelector('#battle-board-region')!.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*0.6};});
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
    const replacementSeed=((await readSession(page)).state.seed+1)>>>0;
    await page.locator('#fit-restart').click({force:true});await confirmRestart(page,true);await page.clock.resume();
    await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))??'null')?.state.seed).toBe(replacementSeed);
    await ready(page);
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

for(const ability of ['ability:basic_attack','ability:guarded_strike'] as const)test(`${ability}: spent action and effective Guarded feedback agree in actor and inspection`,async({page})=>{
  const fixture=boundary('guarded_strike');await boot(page,fixture);
  const command={...fixture.command,abilityId:ability} as Extract<Command,{type:'useAbility'}>;
  await page.locator(ability==='ability:basic_attack'?'[data-action="basic"]':'[data-action="signature"]').click();
  const targetId='unitId' in command.target?command.target.unitId:-1;
  const target=fixture.before.units.find(u=>u.id===targetId)!;
  await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  const prepared=await page.locator('#game').getAttribute('data-session'),preview=await page.locator('#battle-preview').textContent();
  await expect(page.locator('#battle-target-info')).toContainText('Target:');
  await page.locator('#battle-inspect-target').click();await expect(page.locator('#battle-dialog-title')).toContainText(`#${targetId}`);
  await page.locator('#inspection-close').click();await expect(page.locator('#battle-inspect-target')).toBeFocused();
  expect(await page.locator('#game').getAttribute('data-session')).toBe(prepared);expect(await page.locator('#battle-preview').textContent()).toBe(preview);
  await page.locator('#battle-review').click();await expect(page.locator('#battle-dialog-message')).toContainText('Fighter');
  await expect(page.locator('#battle-dialog-message')).toContainText('Target:');
  await page.locator('#dialog-confirm').click();await ready(page);
  const state=(await readSession(page)).state,actor=state.units.find(u=>u.id===command.unitId)!;
  expect(actor.hasActed).toBe(true);expect(!!actor.guarded).toBe(ability==='ability:guarded_strike');
  const ac=catalog.heroes.fighter.stats.armorClass+(actor.guarded?2:0);
  await expect(page.locator('#battle-stats')).toContainText(`AC ${ac}`);
  await expect(page.locator('#battle-status')).toHaveText(actor.guarded?'Guarded (+2 AC)':'No status effects');
  await expect(page.locator('[data-action="basic"]')).toBeDisabled();await expect(page.locator('#battle-availability')).toContainText('Action spent');
  await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${actor.id}`).click();
  await expect(page.locator('#battle-dialog-message')).toContainText(`AC ${ac}`);
  await expect(page.locator('#battle-dialog-message')).toContainText(actor.guarded?'Guarded (+2 AC)':'No status effects');
  await page.locator('#inspection-close').click();expect((await readSession(page)).state).toEqual(state);
});

test('visible action feedback stays inside the drawable board at small sizes and zoomed edges',async({page},info)=>{
  const fixture=boundary('magic_missile','defeat');await boot(page,fixture);
  for(const size of [{width:320,height:568},{width:568,height:320}]){
    // Reload the same legally reached boundary; this is presentation coverage, not a battle-completion claim.
    const encoded=encodeBattleSave(fixture.before,catalog);if(!encoded.ok)throw Error(encoded.reason);
    await page.evaluate(({keys,text})=>{localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);},{keys,text:encoded.text});
    await page.setViewportSize(size);await page.reload();await page.clock.resume();await page.locator('#save-continue').click();await ready(page);
    await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(288);
    const initial=await report(page),r=initial.region;
    const x=r.x+r.width/2,y=r.y+r.height/2;
    await page.mouse.move(x,y);for(let i=0;i<3;i++)await page.mouse.wheel(0,-1000);
    await page.mouse.down();await page.mouse.move(r.x+r.width-6,r.y+6,{steps:4});await page.mouse.up();
    const frame=await report(page);expect(frame.feedbackBounds).toHaveLength(2);
    for(const b of frame.feedbackBounds){expect(b.x).toBeGreaterThanOrEqual(r.x);expect(b.y).toBeGreaterThanOrEqual(r.y);expect(b.x+b.width).toBeLessThanOrEqual(r.x+r.width);expect(b.y+b.height).toBeLessThanOrEqual(r.y+r.height);}
    const [a,b]=frame.feedbackBounds;expect(a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
    expect((await readSession(page)).state).toEqual(fixture.after);
    await page.screenshot({path:info.outputPath(`feedback-${size.width}.png`)});await page.clock.runFor(700);
  }
});

// Deliberately sample rendered coordinates as well as diagnostics: the cue is visual only.
async function bobFrame(page: Page) {
  const frame = await report(page);
  const actor = frame.units.find((unit: any) => unit.id === frame.activeId);
  for (const unit of frame.units) {
    const tile = frame.tiles.find((tile: any) => tile.x === unit.tile.x && tile.y === unit.tile.y);
    const base = projectTile(tile);
    expect(unit.position.x).toBeCloseTo(base.x, 5);
    expect(unit.position.y - base.y).toBeCloseTo(unit.bobOffset, 5);
    expect(unit.bobOffset).toBeGreaterThanOrEqual(-2);
    expect(unit.bobOffset).toBeLessThanOrEqual(0);
    expect(unit.anchorError).toBeLessThan(0.001);
    expect(unit.baseAnchorError).toBeCloseTo(Math.abs(unit.bobOffset) * frame.transform.scale, 4);
    expect(unit.health.position).toEqual({x: base.x, y: base.y + HEALTH_BAR.offsetY});
    if (unit.id !== frame.activeId) expect(unit.bobOffset).toBe(0);
  }
  return {frame, actor};
}

test('active bob: targets, cancel, inspection, camera and live reduced motion preserve authoritative state', async ({page}, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await boot(page, boundary('magic_missile'));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const initial = await readSession(page), saved = await stored(page);
  const {frame: baseline} = await bobFrame(page);
  const offsets: number[] = [];
  for (let i = 0; i < 16; i++) {
    await page.clock.runFor(128);
    offsets.push((await bobFrame(page)).actor.bobOffset);
  }
  expect(Math.min(...offsets)).toBeLessThan(-1.9);
  expect(Math.max(...offsets)).toBeGreaterThan(-0.1);
  await page.screenshot({path: info.outputPath('active-bob.png')});
  await press(page, '[data-action="signature"]', true);
  const enemy = initial.state.units.find(unit => unit.hp > 0 && unit.side === 'enemy')!;
  await page.locator('#battle-target').selectOption(`${enemy.cell.x},${enemy.cell.y}`);
  await page.clock.runFor(400);
  expect((await bobFrame(page)).frame.activeId).toBe(baseline.activeId);
  await page.locator('#battle-inspect-target').click();
  await page.clock.runFor(400);
  expect((await bobFrame(page)).actor.bobOffset).toBe(0);
  await page.locator('#inspection-close').click();
  await press(page, '#battle-cancel', true);
  await page.clock.runFor(560);
  expect((await bobFrame(page)).actor.bobOffset).toBeLessThan(-1.8);
  const r = (await report(page)).region;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, -200);
  await page.clock.runFor(64);
  const zoomed = await bobFrame(page);
  expect(zoomed.frame.transform.scale).toBeGreaterThan(baseline.transform.scale);
  await page.emulateMedia({reducedMotion: 'reduce'});
  // Chromium delivers media-query changes on its native rendering schedule.
  await expect.poll(async () => { await page.clock.runFor(64); return (await bobFrame(page)).actor.bobOffset; }).toBe(0);
  // Bobbing is disabled: advance the full idle interval without rendering 125
  // inactive frames. Keep runFor for every window that samples actual motion.
  await page.clock.fastForward(2000);
  expect((await bobFrame(page)).actor.bobOffset).toBe(0);
  await page.screenshot({path: info.outputPath('active-reduced-motion.png')});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect.poll(async () => { await page.clock.runFor(200); return (await bobFrame(page)).actor.bobOffset; }).toBeLessThan(-1.8);
  const after = await readSession(page);
  expect(after.state).toEqual(initial.state);
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  expect(await stored(page)).toEqual(saved);
  expect((await report(page)).objectCount).toBe(baseline.objectCount);
  expect(errors).toEqual([]);
});

test('active bob: presentation, actor change, hidden page and restart restore anchors without duplicate loops', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const fixture = boundary('magic_missile'); await boot(page, fixture);
  await review(page, fixture); await confirmFrozen(page);
  await page.clock.runFor(288);
  const during = await report(page);
  expect(during.units.every((unit: any) => unit.bobOffset === 0)).toBe(true);
  aligned(during, fixture);
  await page.clock.runFor(800); await ready(page);
  await expect.poll(async () => { await page.clock.runFor(100); return (await bobFrame(page)).actor.bobOffset; }).toBeLessThan(-0.2);
  const previousId = (await report(page)).activeId;
  await press(page, '#battle-next');
  // Settle the real presentation/enemy chain on live frames, then resume
  // controlled sampling. A fixed virtual delay needlessly renders past ready.
  await page.clock.resume(); await ready(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  expect((await bobFrame(page)).frame.activeId).not.toBe(previousId);
  const saved = await stored(page), state = (await readSession(page)).state;
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Hidden-page bobbing is disabled; only elapsed time and invariance matter.
  await page.clock.fastForward(2000);
  expect((await bobFrame(page)).actor.bobOffset).toBe(0);
  expect((await readSession(page)).state).toEqual(state); expect(await stored(page)).toEqual(saved);
  await page.evaluate(() => { delete (document as unknown as {hidden?: boolean}).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(560);
  expect((await bobFrame(page)).actor.bobOffset).toBeLessThan(-1.8);
  for (let i = 0; i < 2; i++) {
    const replacementSeed = ((await readSession(page)).state.seed + 1) >>> 0;
    await page.locator('#fit-restart').click(); await confirmRestart(page, true);
    // Async scene/asset startup needs live frames before controlled bob sampling resumes.
    await page.clock.resume();
    await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))??'null')?.state.seed).toBe(replacementSeed);
    await ready(page);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const baseline = await report(page);
    for (let sample = 0; sample < 5; sample++) { await page.clock.runFor(300); await bobFrame(page); }
    expect((await report(page)).objectCount).toBe(baseline.objectCount);
  }
  expect(errors).toEqual([]);
});

test('active bob: initial reduced motion keeps sprite and static actor marker anchored', async ({page}, info) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await boot(page, boundary('high_shot', 'any', true));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const initial = await report(page), saved = await stored(page);
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(900);
    const {frame, actor} = await bobFrame(page);
    expect(actor.bobOffset).toBe(0); expect(frame.activeId).toBe(initial.activeId);
  }
  await page.screenshot({path: info.outputPath('initial-reduced-motion.png')});
  expect(await stored(page)).toEqual(saved);
});
