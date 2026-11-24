import type { Command } from '../src/domain/types';
import { expect, test as base, type Page } from './helpers/forceRailControls';
import { writeFileSync } from 'node:fs';
import { BattleSession, type Presentation } from '../src/app/BattleSession';
import { standaloneCatalog as catalog } from './helpers/playerPolicy';
import { dispatch } from '../src/domain/turns';
import { previewMove, previewMovement } from '../src/domain/grid';
import { reachStandaloneBoundary } from './helpers/standaloneBoundary';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { projectTile } from '../src/geometry/iso';
import { HEALTH_BAR } from '../src/phaser/healthBar';
import { abilityPresentation, type SignatureKind } from '../src/phaser/abilityPresentation';
import { endTurn, battleTool, playerDecision, readSession, confirmRestart, playCommand } from './helpers/battlePolicy';
import { startApplicationLoadDiagnostics, type ApplicationLoadDiagnostics } from './helpers/applicationLoadDiagnostics';

// Add failure evidence without replacing the rail controls or graphics fixtures.
const test = base.extend<{ applicationLoadDiagnostics: ApplicationLoadDiagnostics }>({
  applicationLoadDiagnostics: [async ({page},use,info) => {
    const diagnostics = await startApplicationLoadDiagnostics(page,info);
    try { await use(diagnostics); } finally { await diagnostics.finalize(); }
  }, {auto:true}],
});

// Include real cached-document return, matching the persistence regression suite.
test.use({launchOptions:async({browserName},use)=>{
  await use({executablePath:browserName==='chromium'?process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE:undefined,ignoreDefaultArgs:['--disable-back-forward-cache']});
}});

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
function fixtureAbilitySelector(fixture:Boundary) {
  if(fixture.command.type!=='useAbility')throw Error('Expected ability fixture');
  return `[data-action="${fixture.command.abilityId}"]`;
}
const report=async(page:Page)=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
const stored=(page:Page)=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),keys);
const ready=(page:Page)=>expect(page.locator('#game')).toHaveAttribute('data-phase','player');

async function chooseCombatPace(page:Page,pace:'normal'|'fast',arrow=false) {
  const more=page.locator('#battle-overflow');
  if(await more.getAttribute('open')===null){await more.locator(':scope > summary').focus();await page.keyboard.press('Enter');}
  const radio=more.locator(`[data-combat-pace-value="${pace}"]`);
  if(arrow){await more.locator('[data-combat-pace-value]:checked').focus();await page.keyboard.press(pace==='fast'?'ArrowRight':'ArrowLeft');}
  else {await radio.focus();await page.keyboard.press('Space');}
  await expect(radio).toBeChecked();await expect(radio).toBeFocused();
  await more.locator(':scope > summary').focus();await page.keyboard.press('Enter');
  await expect(more).not.toHaveAttribute('open','');
}

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
  test.setTimeout(180000);
  await page.clock.install();
  await reachStandaloneBoundary(page, fixture.before);
  expect(new URL(page.url()).pathname).toBe(process.env.PLAYWRIGHT_BASE_PATH ?? '/');
  expect(new URL(page.url()).searchParams.get('game')).toBe('battle');
  expect((await readSession(page)).state).toEqual(fixture.before);
}
async function press(page:Page,selector:string,keyboard=false) {
  const element=page.locator(selector);
  if(keyboard){await element.focus();await page.keyboard.press('Enter');}
  else if(test.info().project.name.startsWith('mobile'))await element.tap();
  else await element.click();
}
async function prepareSignature(page:Page,fixture:Boundary,keyboard=false) {
  await press(page,fixtureAbilitySelector(fixture),keyboard);
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
  await expect(page.locator('#battle-review')).toBeEnabled();
  expect((await report(page)).targets).toEqual(targeting.targets);
}
async function confirmFrozen(page:Page) {
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.locator('#battle-review').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  expect((await report(page)).targets).toEqual([]);
}

test('target overlays follow invalid selection, action changes, keyboard, cancellation and board taps without resolving commands',async({page},info)=>{
  const fixture=boundary('high_shot','any',true);await boot(page,fixture);
  const saved=await stored(page),initial=(await readSession(page)).state;
  await press(page,fixtureAbilitySelector(fixture));
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
  await page.locator('#battle-cancel').click();
  expect((await report(page)).targets).toEqual([]);await expect(page.locator('#battle-review')).toBeDisabled();
  await press(page,fixtureAbilitySelector(fixture));await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await press(page,'[data-action="move"]');expect((await report(page)).targets).toEqual([]);
  await press(page,'[data-action="basic"]');expect((await report(page)).targets.length).toBeGreaterThan(0);
  await page.locator('#battle-cancel').click();expect((await report(page)).targets).toEqual([]);
  expect((await readSession(page)).state).toEqual(initial);expect(await stored(page)).toEqual(saved);
  await press(page,fixtureAbilitySelector(fixture));await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
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
  await page.screenshot({path:info.outputPath('living-target-confirmation.png')});
  await confirmFrozen(page);
  const accepted=await readSession(page);expect(accepted.replay!.commands.slice(-1)).toEqual([fixture.command]);
  expect(accepted.events.slice(-fixture.events.length)).toEqual(fixture.events);expect(accepted.state).toEqual(fixture.after);expect(accepted.state.units.find(u=>u.id===corpse.id)!.hp).toBe(0);
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
  await drag(0,-1);await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(288);
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
  await press(page,fixtureAbilitySelector(fixture),keyboard);await page.locator('canvas').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#battle-preview')).toContainText('Unavailable');await expect(page.locator('#battle-review')).toBeDisabled();
  expect((await report(page)).effect).toBeNull();expect((await report(page)).criticalImpacts).toEqual([]);
  expect((await readSession(page)).state).toEqual(fixture.before);expect(await stored(page)).toEqual(savedBefore);
  await press(page,'#battle-cancel',keyboard);
  await prepareSignature(page,fixture,keyboard);await page.keyboard.press('Escape');
  expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.before);expect(await stored(page)).toEqual(savedBefore);
  // Transform before the effect through real board gestures.
  const point=await page.evaluate(()=>{const r=document.querySelector('#battle-board-region')!.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*0.6};});
  await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-80);
  await prepareSignature(page,fixture,keyboard);await confirmFrozen(page);
  await expect(page.locator('#battle-active')).toHaveText(`Round ${fixture.before.round} · Resolving action (Animating)`);
  await expect(page.locator('#battle-budgets')).toHaveText('Move locked / Action locked');
  const accepted=await readSession(page),saved=await stored(page);
  expect(accepted.state).toEqual(fixture.after);expect(accepted.events.slice(-fixture.events.length)).toEqual(fixture.events);
  expect(accepted.replay!.commands.slice(-1)).toEqual([fixture.command]);
  const expected=dispatch(fixture.before,fixture.command,catalog);expect(expected.ok).toBe(true);
  if(expected.ok)expect(accepted.state).toEqual(expected.state);
  // Exercise board input during the lock. Fresh keys on the usable Restart
  // fallback intentionally open/confirm reset; held-key capture has its own regression.
  await expect(page.locator('#fit-restart')).toBeFocused();await page.locator('canvas').focus();
  await page.keyboard.press('Enter');await page.keyboard.press('Space');
  await expect(page.locator('#battle-next')).toBeDisabled();await expect(page.locator(fixtureAbilitySelector(fixture))).toBeDisabled();
  await page.clock.runFor(112);const travel=await report(page);aligned(travel,fixture);
  expect(travel.effect.progress).toBeGreaterThan(0);expect(travel.effect.progress).toBeLessThan(0.45);
  await page.screenshot({path:info.outputPath(`${kind}-travel.png`)});
  // Pan/zoom during flight without changing the accepted simulation.
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+25,point.y-15,{steps:3});await page.mouse.up();
  await page.mouse.wheel(0,-50);await page.clock.runFor(176);
  const impact=await report(page);aligned(impact,fixture);expect(impact.transform).not.toEqual(travel.transform);
  expect(impact.effect.progress).toBeGreaterThanOrEqual(0.45);
  expect(impact.criticalImpacts).toHaveLength(fixture.events.filter(event=>event.type==='attackRolled' && event.result==='critical').length);
  expect(impact.effect.feedback.filter((f:any)=>f.visible).map((f:any)=>({unitId:f.unitId,text:f.text})))
    .toEqual(abilityPresentation(fixture.events).feedback.map(f=>({unitId:f.unitId,text:f.text})));
  await page.screenshot({path:info.outputPath(`${kind}-impact.png`)});
  const capture=(r:any)=>({viewport:r.viewport,transform:r.transform,effect:r.effect,
    units:r.units.filter((u:any)=>u.id===r.effect.actorId || u.id===r.effect.targetId),objectCount:r.objectCount});
  writeFileSync(info.outputPath('animation.json'),JSON.stringify({viewport:page.viewportSize(),fixture,travel:capture(travel),impact:capture(impact)},null,2));
  expect((await readSession(page)).state).toEqual(accepted.state);expect(await stored(page)).toEqual(saved);
  await page.clock.runFor(500);await ready(page);
  await expect(page.locator('#battle-active')).toHaveText(`Round ${fixture.after.round} · Your turn`);
  await expect(page.locator('#battle-budgets')).toContainText('Action spent');
  expect((await report(page)).effect).toBeNull();expect((await report(page)).objectCount).toBe(baseline);
  expect((await readSession(page)).state).toEqual(fixture.after);expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
});

for(const kind of kinds)test(`${kind}: repeated cancellation, modal refresh, resize and restart during travel and impact`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=boundary(kind);await boot(page,fixture);await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(96);
  const saved=await stored(page);
  await page.locator('#fit-restart').click({force:true});await page.locator('#battle-cancel-restart').click({force:true});
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
  for(const time of [96,288]){
    await page.clock.resume();
    await reachStandaloneBoundary(page,fixture.before);
    await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(time);
    const replacementSeed=((await readSession(page)).state.seed+1)>>>0;
    await page.locator('#fit-restart').click({force:true});await confirmRestart(page,true);await page.clock.resume();
    await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))??'null')?.state.seed).toBe(replacementSeed);
    await ready(page);
    expect((await readSession(page)).state.seed).toBe(fixture.before.seed+1);expect((await report(page)).effect).toBeNull();
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

for(const kind of kinds)test(`${kind}: reload discards the active presentation and starts fresh`,async({page})=>{
  const fixture=boundary(kind);await boot(page,fixture);await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(112);
  const saved=await stored(page);await page.reload();await page.clock.resume();await ready(page);
  expect((await readSession(page)).state.seed).toBe(1);
  expect((await readSession(page)).state).not.toEqual(fixture.after);
  expect((await report(page)).effect).toBeNull();expect(await stored(page)).toEqual(saved);
});

test('elevated target remains anchored through rotation during impact',async({page},info)=>{
  const fixture=boundary('high_shot','any',true);await boot(page,fixture);await prepareSignature(page,fixture);await confirmFrozen(page);
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
  for(const kind of kinds)test(`${kind}: cached return starts fresh after an accepted action`,async({page,baseURL})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>window.addEventListener('pageshow',event=>{if(event.persisted)sessionStorage.setItem('test:animation-cached-return','yes');}));
    const fixture=boundary(kind);await boot(page,fixture);await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(112);
    const saved=await stored(page),map=new URL('map',baseURL).href;
    await page.evaluate(map=>location.assign(map),map);await expect(page.locator('#map-grid span')).toHaveCount(400);
    await page.goBack({waitUntil:'commit'});await page.clock.resume();await ready(page);
    expect(await page.evaluate(()=>sessionStorage.getItem('test:animation-cached-return'))).toBe('yes');
    expect((await readSession(page)).state.seed).toBe(1);
    expect((await readSession(page)).state).not.toEqual(fixture.after);
    expect((await report(page)).effect).toBeNull();expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
  });
});

for(const ability of ['ability:basic_attack','ability:guarded_strike'] as const)test(`${ability}: spent action and effective Guarded feedback agree in actor and inspection`,async({page})=>{
  const fixture=boundary('guarded_strike');await boot(page,fixture);
  const command={...fixture.command,abilityId:ability} as Extract<Command,{type:'useAbility'}>;
  await page.locator(`[data-action="${ability==='ability:basic_attack'?'basic':ability}"]`).click();
  const targetId='unitId' in command.target?command.target.unitId:-1;
  const target=fixture.before.units.find(u=>u.id===targetId)!;
  await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  const prepared=await page.locator('#game').getAttribute('data-session'),preview=await page.locator('#battle-preview').textContent();
  await expect(page.locator('#battle-target-info')).toContainText('Target:');
  await page.locator('#battle-inspect-target').click();await expect(page.locator('#battle-dialog-title')).toContainText(`#${targetId}`);
  await page.locator('#inspection-close').click();await expect(page.locator('#battle-inspect-target')).toBeFocused();
  expect(await page.locator('#game').getAttribute('data-session')).toBe(prepared);expect(await page.locator('#battle-preview').textContent()).toBe(preview);
  await page.locator('#battle-review').click();await expect(page.getByRole('dialog')).not.toBeVisible();await ready(page);
  const state=(await readSession(page)).state,actor=state.units.find(u=>u.id===command.unitId)!;
  expect(actor.hasActed).toBe(true);expect(!!actor.guarded).toBe(ability==='ability:guarded_strike');
  const ac=catalog.heroes.fighter.stats.armorClass+(actor.guarded?2:0);
  await expect(page.locator('#battle-stats')).toContainText(`AC ${ac}`);
  const status=actor.guarded?'Guarded (+2 AC, −2 attack rolls; expires immediately before this unit’s next turn)':'No status effects';
  await expect(page.locator('#battle-status')).toHaveText(status);
  await expect(page.locator('[data-action="basic"]')).toBeDisabled();await expect(page.locator('#battle-availability')).toContainText('Action spent');
  await (await battleTool(page, '#battle-party')).click();await page.locator(`#inspect-unit-${actor.id}`).click();
  await expect(page.locator('#battle-dialog-message')).toContainText(`AC ${ac}`);
  await expect(page.locator('#battle-dialog-message')).toContainText(status);
  await page.locator('#inspection-close').click();expect((await readSession(page)).state).toEqual(state);
});

test('visible action feedback stays inside the drawable board at small sizes and zoomed edges',async({page},info)=>{
  test.setTimeout(180000);
  const fixture=boundary('magic_missile','defeat');
  await page.clock.install();
  for(const size of [{width:320,height:568},{width:568,height:320}]){
    await page.setViewportSize(size);await page.clock.resume();
    await reachStandaloneBoundary(page,fixture.before);
    const route=new URL(page.url());
    expect(route.pathname).toBe(process.env.PLAYWRIGHT_BASE_PATH ?? '/');
    expect(route.searchParams.get('game')).toBe('battle');
    await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(288);
    const initial=await report(page),r=initial.region;
    const x=r.x+r.width/2,y=r.y+r.height/2;
    await page.mouse.move(x,y);for(let i=0;i<3;i++)await page.mouse.wheel(0,-1000);
    await page.mouse.down();await page.mouse.move(r.x+r.width-6,r.y+6,{steps:4});await page.mouse.up();
    const frame=await report(page);aligned(frame,fixture);
    expect(frame.criticalImpacts).toEqual([]);
    expect(frame.feedbackBounds.map((label:any)=>label.text)).toEqual(abilityPresentation(fixture.events).feedback.map(label=>label.text));
    expect(frame.feedbackBounds).toHaveLength(2);
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
  const fixture=boundary('magic_missile');await boot(page,fixture);
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
  await press(page,fixtureAbilitySelector(fixture),true);
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
  await prepareSignature(page, fixture); await confirmFrozen(page);
  await page.clock.runFor(288);
  const during = await report(page);
  expect(during.units.every((unit: any) => unit.bobOffset === 0)).toBe(true);
  aligned(during, fixture);
  await page.clock.runFor(800); await ready(page);
  await expect.poll(async () => { await page.clock.runFor(100); return (await bobFrame(page)).actor.bobOffset; }).toBeLessThan(-0.2);
  const previousId = (await report(page)).activeId;
  const previousRound = (await readSession(page)).state.round;
  const previousName = await page.locator('#battle-actor-name').textContent();
  await endTurn(page, selector=>press(page, selector));
  const handoff = await readSession(page);
  expect(handoff.phase).toBe('presenting');
  expect(handoff.state.initiative[handoff.state.activeIndex]).not.toBe(previousId);
  await expect(page.locator('#battle-active')).toHaveText(`Round ${previousRound} · Resolving action (Animating)`);
  await expect(page.locator('#battle-actor-name')).toHaveText(previousName!);
  await expect(page.locator('#battle-budgets')).toHaveText('Move locked / Action locked');
  // Settle on live frames without granting more than the original 3s of
  // animation time. Keep this bound local; other readiness checks are unchanged.
  const actorTransitionStarted = await page.evaluate(() => Date.now());
  await page.clock.resume();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player', {timeout: 3000});
  expect(await page.evaluate(() => Date.now()) - actorTransitionStarted).toBeLessThanOrEqual(3000);
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
  await page.clock.install();
  await page.goto('./?game=battle&entry=new');
  await ready(page);
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

test('turn queue holds the presented actor until handoff and survives repeated visibility interruption',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install();await page.goto('./battle');await ready(page);
  const queue=page.locator('#battle-turn-queue'),before=await readSession(page);
  const beforeQueue=await queue.innerHTML(),previousId=before.state.initiative[before.state.activeIndex];
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await endTurn(page, selector=>page.locator(selector).press('Enter'));
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  const accepted=await readSession(page),nextId=accepted.state.initiative[accepted.state.activeIndex];
  expect(nextId).not.toBe(previousId);
  expect(accepted.state.commandCount).toBe(before.state.commandCount+1);
  expect(await queue.innerHTML()).toBe(beforeQueue);
  await expect(queue.locator('[aria-current="step"]')).toHaveAttribute('data-unit-id',String(previousId));
  await expect(page.locator('#battle-active')).toContainText(`Round ${before.state.round} · Resolving action`);
  const saved=await stored(page);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    for(let i=0;i<3;i++)document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async()=>(await readSession(page)).phase).toMatch(/^(player|enemy)$/);
  expect((await readSession(page)).state).toEqual(accepted.state);
  await expect(queue.locator('[aria-current="step"]')).toHaveAttribute('data-unit-id',String(nextId));
  await expect(queue.locator('[aria-current="step"]')).toHaveAttribute('data-round',String(accepted.state.round));
  const hiddenQueue=await queue.innerHTML();
  await page.clock.fastForward(5000);
  expect((await readSession(page)).state).toEqual(accepted.state);
  expect(await queue.innerHTML()).toBe(hiddenQueue);expect(await stored(page)).toEqual(saved);
  // Only the already accepted handoff and any legitimate subsequent AI commands
  // may run after visibility resumes; no cancelled animation resolves twice.
  const expected=new BattleSession(catalog,accepted.state,accepted.state.seed);
  while(expected.phase==='enemy'){
    const step=expected.nextEnemy();if(!step)throw Error('Expected legal enemy command');
    expected.finishPresentation(step.token);
  }
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.resume();await ready(page);
  expect((await readSession(page)).state).toEqual(expected.state);
  await expect(queue.locator('[aria-current="step"]')).toHaveAttribute('data-unit-id',String(expected.active.id));
  await page.emulateMedia({reducedMotion:'reduce'});
  expect((await readSession(page)).state).toEqual(expected.state);
  await expect(queue.locator('[aria-current="step"]')).toHaveAttribute('data-unit-id',String(expected.active.id));
  expect(errors).toEqual([]);
});

test('class guidance retains the presented player and never acknowledges interrupted or enemy turns',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const key='tactics-guru:class-guidance';
  const preferences=()=>page.evaluate(key=>localStorage.getItem(key),key);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install();await page.goto('./?game=battle&entry=new');await ready(page);
  const guidance=page.locator('#battle-class-guidance'),tip=page.locator('#battle-class-tip');
  const dismiss=page.locator('#battle-guidance-dismiss'),before=await readSession(page);
  const actor=before.state.initiative[before.state.activeIndex],text=await tip.textContent();
  await expect(guidance).toHaveAttribute('data-unit-id',String(actor));
  await expect(dismiss).toBeEnabled();expect(await preferences()).toBeNull();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await endTurn(page, selector=>page.locator(selector).press('Enter'));
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  const accepted=await readSession(page);
  expect(accepted.state.initiative[accepted.state.activeIndex]).not.toBe(actor);
  expect(accepted.state.commandCount).toBe(before.state.commandCount+1);
  await expect(guidance).toBeVisible();await expect(guidance).toHaveAttribute('data-unit-id',String(actor));
  await expect(guidance).toHaveAttribute('data-round',String(before.state.round));
  await expect(tip).toHaveText(text!);await expect(dismiss).toBeDisabled();
  expect(await guidance.evaluate(element=>element.contains(document.activeElement))).toBe(false);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    for(let i=0;i<3;i++)document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async()=>(await readSession(page)).phase).toMatch(/^(player|enemy)$/);
  const settled=await readSession(page);expect(settled.state).toEqual(accepted.state);
  if(settled.phase==='enemy')await expect(guidance).toBeHidden();
  else {
    await expect(guidance).toHaveAttribute('data-unit-id',String(settled.state.initiative[settled.state.activeIndex]));
    await expect(dismiss).toBeEnabled();
  }
  await page.clock.fastForward(5000);
  expect((await readSession(page)).state).toEqual(accepted.state);expect(await preferences()).toBeNull();
  const expected=new BattleSession(catalog,accepted.state,accepted.state.seed);
  while(expected.phase==='enemy'){
    const step=expected.nextEnemy();if(!step)throw Error('Expected legal enemy command');
    expected.finishPresentation(step.token);
  }
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.resume();await ready(page);
  expect((await readSession(page)).state).toEqual(expected.state);
  await expect(guidance).toBeVisible();await expect(guidance).toHaveAttribute('data-unit-id',String(expected.active.id));
  await expect(dismiss).toBeEnabled();expect(await preferences()).toBeNull();
  expect(await guidance.evaluate(element=>element.contains(document.activeElement))).toBe(false);
  expect(errors).toEqual([]);
});

test('combat pace: normal and fast preserve accepted results and enemy continuation while changes wait for the next animation',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const fixture=boundary('high_shot');await boot(page,fixture);
  const results:Awaited<ReturnType<typeof readSession>>[]=[];
  for(const pace of ['normal','fast'] as const){
    if(pace==='fast'){await page.clock.resume();await reachStandaloneBoundary(page,fixture.before);}
    await prepareSignature(page,fixture,true);
    const prepared=await readSession(page),preview=await page.locator('#battle-preview').textContent(),saved=await stored(page);
    await chooseCombatPace(page,pace);
    expect(await readSession(page)).toEqual(prepared);expect(await page.locator('#battle-preview').textContent()).toBe(preview);
    expect(await stored(page)).toEqual(saved);
    await confirmFrozen(page);
    const accepted=await readSession(page),durationMs=pace==='normal'?560:280;
    expect(accepted.state).toEqual(fixture.after);expect(accepted.replay!.commands.slice(-1)).toEqual([fixture.command]);
    expect(accepted.events.slice(-fixture.events.length)).toEqual(fixture.events);
    expect((await report(page)).presentation).toEqual({pace,reducedMotion:false,durationMs,kind:'signature'});
    await page.clock.runFor(96);
    const travel=await report(page);aligned(travel,fixture);expect(travel.effect.progress).toBeGreaterThan(0);
    const nextPace=pace==='normal'?'fast':'normal';
    // Native radio arrows must neither dispatch a board command nor retime an accepted tween.
    await chooseCombatPace(page,nextPace,true);
    const unchanged=await report(page);
    expect(unchanged.presentation).toEqual(travel.presentation);expect(unchanged.effect.progress).toBe(travel.effect.progress);
    expect(await readSession(page)).toEqual(accepted);expect(await stored(page)).toEqual(saved);
    await page.clock.runFor(64);
    const frame=await report(page);aligned(frame,fixture);
    if(pace==='normal')expect(frame.effect.progress).toBeLessThan(0.45);
    else expect(frame.effect.progress).toBeGreaterThanOrEqual(0.45);
    expect(frame.effect.feedback.every((item:any)=>item.visible)).toBe(pace==='fast');
    await page.screenshot({path:info.outputPath(`combat-pace-${pace}-160ms.png`)});
    await page.clock.runFor(160);
    if(pace==='normal'){
      await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
      expect((await report(page)).presentation.durationMs).toBe(560);
      await page.clock.runFor(320);
    }
    await ready(page);expect((await report(page)).presentation).toBeNull();expect((await report(page)).effect).toBeNull();
    expect((await readSession(page)).state).toEqual(fixture.after);
    let enemyCommands=0;
    // End at most one initiative cycle, stopping as soon as real AI commands have resolved.
    for(let turn=0;turn<fixture.after.initiative.length && enemyCommands===0;turn++){
      const before=await readSession(page),expected=new BattleSession(catalog,before.state,before.state.seed);
      const command:Command={type:'endTurn',unitId:expected.active.id};
      expect(expected.prepare(command).ok).toBe(true);
      const end=expected.confirm();if(!end)throw Error('Expected legal player handoff');
      expected.finishPresentation(end.token);
      while(expected.phase==='enemy'){
        const step=expected.nextEnemy();if(!step)throw Error('Expected legal enemy command');
        enemyCommands++;expected.finishPresentation(step.token);
      }
      await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
      await endTurn(page, selector=>page.locator(selector).press('Enter'));
      await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
      expect((await report(page)).presentation).toEqual({pace:nextPace,reducedMotion:false,durationMs:nextPace==='normal'?25:12.5,kind:'turn'});
      expect((await readSession(page)).state).toEqual(end.after);
      await page.clock.resume();await ready(page);
      const actual=await readSession(page);
      expect(actual.state).toEqual(expected.state);
      expect(actual.replay!.commands).toEqual([...before.replay!.commands,...expected.continuation!.commands]);
      expect(actual.events).toEqual([...before.events,...expected.events]);
    }
    expect(enemyCommands).toBeGreaterThan(0);expect(await stored(page)).toEqual(saved);
    results.push(await readSession(page));
  }
  expect(results[1]).toEqual(results[0]);
  writeFileSync(info.outputPath('combat-pace-equivalent-results.json'),JSON.stringify(results,null,2));
  expect(errors).toEqual([]);
});

test('combat pace: fast visibility cancellation and restart clear presentation once without replaying accepted actions',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const fixture=boundary('magic_missile');await boot(page,fixture);await chooseCombatPace(page,'fast');
  const baseline=(await report(page)).objectCount;
  await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(64);
  expect((await report(page)).presentation).toEqual({pace:'fast',reducedMotion:false,durationMs:280,kind:'signature'});
  aligned(await report(page),fixture);
  const accepted=await readSession(page),saved=await stored(page);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    for(let i=0;i<3;i++)document.dispatchEvent(new Event('visibilitychange'));
  });
  await ready(page);
  expect(await readSession(page)).toEqual({...accepted,phase:'player'});
  expect((await report(page)).presentation).toBeNull();expect((await report(page)).effect).toBeNull();
  expect((await report(page)).objectCount).toBe(baseline);
  // Ordinary frames must cross the old tween's end, even after repeated cancellation.
  await page.clock.runFor(640);
  expect(await readSession(page)).toEqual({...accepted,phase:'player'});expect(await stored(page)).toEqual(saved);
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(640);
  expect(await readSession(page)).toEqual({...accepted,phase:'player'});expect(await stored(page)).toEqual(saved);
  await page.clock.resume();await reachStandaloneBoundary(page,fixture.before);
  await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(160);
  const impact=await report(page);expect(impact.presentation.pace).toBe('fast');expect(impact.effect.progress).toBeGreaterThanOrEqual(0.45);
  await page.screenshot({path:info.outputPath('combat-pace-fast-before-restart.png')});
  const replacementSeed=(fixture.before.seed+1)>>>0;
  await page.locator('#fit-restart').click({force:true});await confirmRestart(page,true);await page.clock.resume();
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))??'null')?.state.seed).toBe(replacementSeed);await ready(page);
  const fresh=await readSession(page),freshObjects=(await report(page)).objectCount;
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.runFor(640);
  expect(await readSession(page)).toEqual(fresh);expect((await report(page)).objectCount).toBe(freshObjects);
  expect((await report(page)).presentation).toBeNull();expect((await report(page)).effect).toBeNull();
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tactics-guru:combat-pace')!))).toEqual({version:1,pace:'fast'});
  expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
});

test('combat pace: reduced motion keeps movement at endpoints and result text stationary until the sampled boundary',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const fixture=boundary('guarded_strike');await page.clock.install();
  test.setTimeout(180000);
  for(const pace of ['normal','fast'] as const){
    await page.emulateMedia({reducedMotion:'reduce'});await page.clock.resume();
    await page.goto('./?game=battle&entry=new');await ready(page);await chooseCombatPace(page,pace);
    const before=await readSession(page),actor=before.state.initiative[before.state.activeIndex],saved=await stored(page);
    const reachable=previewMovement(before.state,actor,catalog);if(!reachable.ok)throw Error('Expected legal player movement');
    const move=[...reachable.cells].reverse().map(({cell})=>previewMove(before.state,{type:'move',unitId:actor,to:cell},catalog))
      .find(result=>result.ok && result.path.length>2);
    if(!move?.ok)throw Error('Expected a legal movement spanning multiple tiles');
    const resolved=dispatch(before.state,move.command,catalog);if(!resolved.ok)throw Error('Expected legal movement result');
    await press(page,'[data-action="move"]',true);await page.locator('#battle-target').selectOption(`${move.command.to.x},${move.command.to.y}`);
    await confirmFrozen(page);
    const start=await report(page),origin=start.units.find((unit:any)=>unit.id===actor).position;
    const target=projectTile(start.tiles.find((tile:any)=>tile.x===move.command.to.x && tile.y===move.command.to.y));
    expect(start.presentation).toEqual({pace,reducedMotion:true,durationMs:pace==='normal'?25:12.5,kind:'move'});
    // Sample actual rendered positions over successive frames; no intermediate travel is allowed.
    for(let tick=0;tick<12;tick++){
      const frame=await report(page);expect([origin,target]).toContainEqual(frame.units.find((unit:any)=>unit.id===actor).position);
      expect(frame.effect).toBeNull();
      if((await readSession(page)).phase==='player')break;
      await page.clock.runFor(8);
    }
    await ready(page);expect((await report(page)).units.find((unit:any)=>unit.id===actor).position).toEqual(target);
    const moved=await readSession(page);expect(moved.state).toEqual(resolved.state);expect(moved.state.rng).toEqual(before.state.rng);
    expect(moved.replay!.commands).toEqual([...before.replay!.commands,move.command]);expect(await stored(page)).toEqual(saved);
    await page.clock.resume();await reachStandaloneBoundary(page,fixture.before);
    await prepareSignature(page,fixture,true);await confirmFrozen(page);
    const accepted=await readSession(page),still=await report(page),durationMs=pace==='normal'?180:90;
    expect(still.presentation).toEqual({pace,reducedMotion:true,durationMs,kind:'signature'});expect(still.effect).toBeNull();
    expect(still.feedbackBounds.map((label:any)=>label.text)).toEqual(abilityPresentation(fixture.events).feedback.map(item=>item.text));
    expect(still.feedbackBounds.length).toBeGreaterThan(0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(()=>page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
    await page.clock.runFor(64);
    const unchanged=await report(page);expect(unchanged.presentation).toEqual(still.presentation);expect(unchanged.effect).toBeNull();
    expect(unchanged.feedbackBounds).toEqual(still.feedbackBounds);expect(await readSession(page)).toEqual(accepted);
    await page.screenshot({path:info.outputPath(`combat-pace-${pace}-reduced-motion.png`)});
    await page.clock.runFor(64);
    if(pace==='normal'){
      await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
      expect((await report(page)).feedbackBounds).toEqual(still.feedbackBounds);await page.clock.runFor(128);
    }
    await ready(page);expect((await report(page)).presentation).toBeNull();expect((await report(page)).feedbackBounds).toEqual([]);
    expect((await readSession(page)).state).toEqual(fixture.after);
    await endTurn(page, selector=>page.locator(selector).press('Enter'));
    await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
    expect((await report(page)).presentation).toEqual({pace,reducedMotion:false,durationMs:pace==='normal'?25:12.5,kind:'turn'});
    await page.clock.resume();await ready(page);expect(await stored(page)).toEqual(saved);
  }
  expect(errors).toEqual([]);
});

/** The same resolved roll owns the burst, target sprite, health bar and result label. */
function criticalFrame(frame:any,fixture:Presentation,reducedMotion=false) {
  const attack=fixture.events.find(event=>event.type==='attackRolled' && event.result==='critical');
  if(!attack || attack.type!=='attackRolled')throw Error('Expected a resolved critical fixture');
  const target=fixture.before.units.find(unit=>unit.id===attack.targetId)!;
  const tile=frame.tiles.find((tile:any)=>tile.x===target.cell.x && tile.y===target.cell.y),point=projectTile(tile);
  expect(frame.criticalImpacts).toHaveLength(1);
  const impact=frame.criticalImpacts[0],unit=frame.units.find((unit:any)=>unit.id===target.id);
  expect(impact).toMatchObject({actorId:attack.unitId,targetId:target.id,center:{x:point.x,y:point.y-28},visible:true,reducedMotion,interactive:false});
  expect(impact.screen.x).toBeCloseTo(frame.transform.x+impact.center.x*frame.transform.scale,3);
  expect(impact.screen.y).toBeCloseTo(frame.transform.y+impact.center.y*frame.transform.scale,3);
  expect(impact.depth).toBeGreaterThan(unit.depth);expect(impact.depth).toBeLessThan(unit.health.depth);
  expect(unit.anchorError).toBeLessThan(0.001);expect(unit.health.visible).toBe(true);
  expect(frame.feedbackBounds.some((label:any)=>label.text.startsWith('Critical · −'))).toBe(true);
  for(const label of frame.feedbackBounds){
    expect(label.x).toBeGreaterThanOrEqual(frame.region.x);expect(label.y).toBeGreaterThanOrEqual(frame.region.y);
    expect(label.x+label.width).toBeLessThanOrEqual(frame.region.x+frame.region.width);
    expect(label.y+label.height).toBeLessThanOrEqual(frame.region.y+frame.region.height);
  }
  for(let i=0;i<frame.feedbackBounds.length;i++)for(let j=i+1;j<frame.feedbackBounds.length;j++){
    const a=frame.feedbackBounds[i],b=frame.feedbackBounds[j];
    expect(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y).toBe(true);
  }
  return impact;
}

async function transformCriticalBoard(page:Page,browserName:string,touch:boolean) {
  const r=(await report(page)).region,x=r.x+r.width/2,y=r.y+r.height*0.55;
  if(touch && browserName==='chromium'){
    const cdp=await page.context().newCDPSession(page);
    try {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-12,y,id:1},{x:x+12,y,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-18,y,id:1},{x:x+18,y,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:3}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+18,y:y-12,id:3}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } finally {await cdp.detach();}
  }else if(touch){
    // WebKit exposes native taps but no Playwright pinch API; wheel is camera setup only.
    await page.locator('canvas').dispatchEvent('wheel',{clientX:x,clientY:y,deltaY:-80,bubbles:true});
  }else {
    await page.mouse.move(x,y);await page.mouse.wheel(0,-80);
    await page.mouse.down();await page.mouse.move(x+18,y-12,{steps:3});await page.mouse.up();
  }
}

test('critical impact: normal, fast and reduced motion keep lethal target feedback synchronized and readable',async({page,browserName},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const fixture=boundary('high_shot','critical',false,11);
  expect(fixture.before.seed).toBe(11);expect(fixture.before.commandCount).toBe(6);
  expect(fixture.events.some(event=>event.type==='defeated')).toBe(true);expect(fixture.after.outcome).toBe('ongoing');
  await boot(page,fixture);
  const captures:unknown[]=[],results:Awaited<ReturnType<typeof readSession>>[]=[];
  for(const [index,mode] of [
    {pace:'normal',reduced:false},{pace:'fast',reduced:false},{pace:'normal',reduced:true},{pace:'fast',reduced:true},
  ].entries()){
    if(index){await page.clock.resume();await reachStandaloneBoundary(page,fixture.before);}
    await page.emulateMedia({reducedMotion:mode.reduced?'reduce':'no-preference'});
    await chooseCombatPace(page,mode.pace as 'normal'|'fast');
    const baseline=(await report(page)).objectCount;
    // Targeting and cancellation never manufacture a critical.
    await prepareSignature(page,fixture,!info.project.use.hasTouch);
    expect((await report(page)).criticalImpacts).toEqual([]);
    await press(page,'#battle-cancel');expect((await report(page)).criticalImpacts).toEqual([]);
    await prepareSignature(page,fixture,!info.project.use.hasTouch);await confirmFrozen(page);
    const accepted=await readSession(page),saved=await stored(page),start=await report(page);
    expect(accepted.state).toEqual(fixture.after);expect(accepted.events.slice(-fixture.events.length)).toEqual(fixture.events);
    expect(accepted.replay!.commands.slice(-1)).toEqual([fixture.command]);
    expect(start.criticalImpacts).toHaveLength(1);expect(start.criticalImpacts[0].visible).toBe(mode.reduced);
    await expect(page.locator('#battle-next')).toBeDisabled();
    if(mode.reduced){
      const stationary=criticalFrame(start,fixture,true);expect(stationary.progress).toBe(0);expect(start.effect).toBeNull();
      await page.clock.runFor(48);
      const later=await report(page);expect(criticalFrame(later,fixture,true)).toEqual(stationary);
      expect(later.feedbackBounds).toEqual(start.feedbackBounds);
    }else {
      await page.clock.runFor(mode.pace==='normal'?112:48);
      const travel=await report(page);expect(travel.criticalImpacts[0].visible).toBe(false);
      await page.clock.runFor(mode.pace==='normal'?208:112);
      const impact=criticalFrame(await report(page),fixture);expect(impact.progress).toBeGreaterThan(0);expect(impact.progress).toBeLessThan(1);
      await transformCriticalBoard(page,browserName,!!info.project.use.hasTouch);await page.clock.runFor(32);
      const transformed=await report(page);criticalFrame(transformed,fixture);expect(transformed.transform).not.toEqual(travel.transform);
      expect(transformed.criticalImpacts).toHaveLength(1);
    }
    const visible=await report(page);criticalFrame(visible,fixture,mode.reduced);
    captures.push({mode,presentation:visible.presentation,impact:visible.criticalImpacts,feedback:visible.feedbackBounds,transform:visible.transform});
    await page.screenshot({path:info.outputPath(`critical-${mode.pace}-${mode.reduced?'reduced':'burst'}.png`)});
    expect((await readSession(page)).state).toEqual(accepted.state);expect(await stored(page)).toEqual(saved);
    await page.clock.runFor(700);await ready(page);
    const finished=await report(page);expect(finished.criticalImpacts).toEqual([]);expect(finished.effect).toBeNull();
    expect(finished.objectCount).toBe(baseline);
    const defeated=fixture.events.find(event=>event.type==='defeated')!;
    expect(finished.units.find((unit:any)=>unit.id===defeated.unitId).health.visible).toBe(false);
    results.push(await readSession(page));
  }
  for(const result of results)expect(result).toEqual(results[0]);
  writeFileSync(info.outputPath('critical-pace-results.json'),JSON.stringify({fixture,captures,accepted:results[0]},null,2));
  expect(errors).toEqual([]);
});

test('critical impact: repeated criticals, rerenders, visibility interruption and restart leave no stale burst',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const first=boundary('high_shot','critical',false,13),second=boundary('guarded_strike','critical',false,13);
  expect(first.before.seed).toBe(13);expect(second.before.seed).toBe(13);
  expect(first.before.commandCount).toBe(20);expect(second.before.commandCount).toBe(26);
  await boot(page,first);await chooseCombatPace(page,'fast');
  const baseline=(await report(page)).objectCount;
  await prepareSignature(page,first);await confirmFrozen(page);await page.clock.runFor(160);
  const impact=criticalFrame(await report(page),first),accepted=await readSession(page),saved=await stored(page);
  // Modal refresh is a redraw of the same accepted impact, never a new effect.
  await page.locator('#fit-restart').click({force:true});await page.locator('#battle-cancel-restart').click({force:true});
  expect(criticalFrame(await report(page),first)).toMatchObject({actorId:impact.actorId,targetId:impact.targetId,center:impact.center,progress:impact.progress});
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    for(let i=0;i<3;i++)document.dispatchEvent(new Event('visibilitychange'));
  });
  await ready(page);expect((await report(page)).criticalImpacts).toEqual([]);expect((await report(page)).objectCount).toBe(baseline);
  await page.clock.runFor(640);
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(640);
  expect(await readSession(page)).toEqual({...accepted,phase:'player'});expect(await stored(page)).toEqual(saved);
  expect((await report(page)).criticalImpacts).toEqual([]);
  // Continue this same legal battle to another critical, without reload or replacement state.
  await page.clock.resume();
  while((await readSession(page)).state.commandCount<second.before.commandCount){
    await playCommand(page,playerDecision((await readSession(page)).state));await ready(page);
  }
  expect((await readSession(page)).state).toEqual(second.before);expect((await report(page)).objectCount).toBe(baseline);
  await prepareSignature(page,second);await confirmFrozen(page);await page.clock.runFor(160);
  criticalFrame(await report(page),second);expect((await readSession(page)).state).toEqual(second.after);
  await page.screenshot({path:info.outputPath('critical-repeat-before-restart.png')});
  await page.locator('#fit-restart').click({force:true});await confirmRestart(page,true);await page.clock.resume();
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))??'null')?.state.seed).toBe(14);await ready(page);
  const fresh=await readSession(page),freshObjects=(await report(page)).objectCount;
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.runFor(700);
  expect(await readSession(page)).toEqual(fresh);expect((await report(page)).criticalImpacts).toEqual([]);
  expect((await report(page)).objectCount).toBe(freshObjects);await expect(page.locator('canvas')).toHaveCount(1);expect(errors).toEqual([]);
});

function enemyCriticalBoundary() {
  const session=new BattleSession(catalog,'map:forest_ruins',1);
  let trigger:Boundary|null=null;
  for(let i=0;i<100 && session.state.outcome==='ongoing';i++){
    const command=session.phase==='player'?playerDecision(session.state):null;
    if(command)session.prepare(command);
    const step=command?session.confirm():session.nextEnemy();if(!step)throw Error('Expected legal policy progress');
    if(command)trigger={command,...step};
    if(!command && step.events.some(event=>event.type==='attackRolled' && event.result==='critical')){
      if(!trigger)throw Error('Expected a player handoff before the enemy critical');
      return {trigger,impact:step};
    }
    session.finishPresentation(step.token);
  }
  throw Error('No legal enemy critical');
}

test('critical impact: enemy basic attack anchors to an elevated player and ordinary follow-up has no burst',async({page,browserName},info)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  const {trigger,impact}=enemyCriticalBoundary();expect(trigger.command.type).toBe('endTurn');expect(impact.before.commandCount).toBe(15);
  await boot(page,trigger);await chooseCombatPace(page,'normal');
  await transformCriticalBoard(page,browserName,!!info.project.use.hasTouch);await page.clock.runFor(32);
  const baseline=(await report(page)).objectCount;
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await endTurn(page, selector=>press(page,selector,!info.project.use.hasTouch));
  // Step frames through the real handoff and AI move, stopping at its accepted critical.
  for(let tick=0;tick<80 && (await readSession(page)).state.commandCount<impact.after.commandCount;tick++)await page.clock.runFor(16);
  const accepted=await readSession(page);expect(accepted.state).toEqual(impact.after);
  expect(accepted.events.slice(-impact.events.length)).toEqual(impact.events);
  await page.clock.runFor(48);
  const frame=await report(page),burst=criticalFrame(frame,impact);
  expect(frame.units.find((unit:any)=>unit.id===burst.targetId).side).toBe('player');
  expect(frame.units.find((unit:any)=>unit.id===burst.targetId).tile.elevation).toBeGreaterThan(0);
  expect(frame.effect).toBeNull();expect(frame.presentation).toMatchObject({pace:'normal',kind:'feedback',durationMs:180});
  await page.screenshot({path:info.outputPath('critical-enemy-elevated.png')});
  await page.clock.runFor(500);await ready(page);
  expect((await report(page)).criticalImpacts).toEqual([]);expect((await report(page)).objectCount).toBe(baseline);
  // The next real policy attack is a natural-one miss, not a second critical.
  const before=(await readSession(page)).state,command=playerDecision(before),resolved=dispatch(before,command,catalog);
  if(!resolved.ok || command.type!=='useAbility' || !('unitId' in command.target))throw Error('Expected legal basic-attack follow-up');
  expect(resolved.events.some(event=>event.type==='attackRolled' && event.result==='miss')).toBe(true);
  const targetId=command.target.unitId,target=before.units.find(unit=>unit.id===targetId)!;
  await press(page,'[data-action="basic"]');await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await confirmFrozen(page);await page.clock.runFor(48);expect((await report(page)).criticalImpacts).toEqual([]);
  expect((await readSession(page)).state).toEqual(resolved.state);await page.clock.runFor(300);await ready(page);
});

test('critical impact: final lethal hit finishes its burst before victory and scene departure discards it',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  const fixture=boundary('high_shot','critical',false,6);expect(fixture.before.seed).toBe(6);expect(fixture.after.outcome).toBe('playerWin');
  await boot(page,fixture);await chooseCombatPace(page,'fast');
  const baseline=(await report(page)).objectCount;
  await prepareSignature(page,fixture);await confirmFrozen(page);await page.clock.runFor(160);
  criticalFrame(await report(page),fixture);expect((await readSession(page)).state).toEqual(fixture.after);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({path:info.outputPath('critical-final-hit.png')});
  await page.clock.runFor(300);await expect(page.locator('#game')).toHaveAttribute('data-phase','ended');
  await expect(page.locator('#battle-dialog-title')).toHaveText('Victory');
  expect((await report(page)).criticalImpacts).toEqual([]);expect((await report(page)).objectCount).toBe(baseline);
  const finished=await readSession(page);await page.clock.runFor(700);expect(await readSession(page)).toEqual(finished);
  // A second legal critical is interrupted by an actual scene departure while its burst is visible.
  const departure=boundary('high_shot','critical',false,11);
  await page.clock.resume();await reachStandaloneBoundary(page,departure.before);
  await prepareSignature(page,departure);await confirmFrozen(page);await page.clock.runFor(160);
  criticalFrame(await report(page),departure);expect((await readSession(page)).state).toEqual(departure.after);
  await page.screenshot({path:info.outputPath('critical-active-scene-departure.png')});
  await page.goto('./map');await expect(page.locator('#map-grid span')).toHaveCount(400);
  await page.goto('./?game=battle&entry=new');await page.clock.resume();await ready(page);
  expect((await report(page)).criticalImpacts).toEqual([]);expect((await readSession(page)).state.seed).toBe(1);
  await expect(page.locator('canvas')).toHaveCount(1);
});
