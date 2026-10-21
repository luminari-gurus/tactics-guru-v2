import { confirmRestart } from './helpers/battlePolicy';
import { expect, test, type Locator } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { previewMove, previewMovement } from '../src/domain/grid';
import { BattleSession } from '../src/app/BattleSession';

test('default Move initializes once per usable player turn and preserves explicit choices',async({page})=>{
  // Overrides, a full actor cycle and seeded restarts share one cumulative budget.
  // Keep individual actions bounded while allowing software-rendered desktop CI.
  test.setTimeout(90000);page.setDefaultTimeout(5000);
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const move=page.locator('#battle-move'),target=page.locator('#battle-target');
  await expect(move).toHaveAttribute('aria-pressed','true');await expect(move).toBeEnabled();
  const initial=await session(page),actor=initial.state.units.find(u=>u.id===initial.state.initiative[initial.state.activeIndex])!;
  expect(initial.replay.commands.every(c=>initial.state.units.find(u=>u.id===c.unitId)!.side==='enemy')).toBe(true);
  const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const reach=previewMovement(initial.state,actor.id,catalog);if(!reach.ok)throw Error(reach.reason);
  expect(await target.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value).filter(Boolean)))
    .toEqual(reach.cells.filter(c=>c.cost>0).map(c=>`${c.cell.x},${c.cell.y}`));
  const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  expect(report.reachable).toEqual(reach.cells.map(c=>c.cell));expect(report.selected).toBeNull();
  await expect(target).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  await page.screenshot({path:test.info().outputPath('default-move.png')});
  for(const action of ['basic','signature']){
    await page.locator(`[data-action=${action}]`).click();await target.selectOption({index:1});
    const selected=await target.inputValue(),before=await page.locator('#game').getAttribute('data-session');
    const overlays=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).targets;
    await page.locator('#battle-party').click();await page.locator('#inspection-close').click();
    await page.locator('#battle-log-open').click();await page.locator('#log-close').click();
    const box=(await page.locator('#battle-board-region').boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    const viewport=page.viewportSize()!;await page.setViewportSize({width:viewport.width-1,height:viewport.height});await page.setViewportSize(viewport);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await expect(page.locator(`[data-action=${action}]`)).toHaveAttribute('aria-pressed','true');await expect(move).toHaveAttribute('aria-pressed','false');
    await expect(target).toHaveValue(selected);expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
    expect(JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).targets).toEqual(overlays);
  }
  await page.locator('#battle-scroll').evaluate(e=>{e.scrollTop=0;});
  await page.screenshot({path:test.info().outputPath('explicit-override.png')});
  expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.locator('#battle-cancel').click();await page.locator('#battle-party').click();await page.locator('#inspection-close').click();
  await expect(move).toHaveAttribute('aria-pressed','false');await expect(target).toBeDisabled();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  // Leave an explicit action selected, then progress through actual Wait/enemy turns.
  await page.locator('[data-action=basic]').click();
  let otherActor=false,wrapped=false;
  for(let i=0;i<12 && !wrapped;i++){
    await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const current=await session(page),id=current.state.initiative[current.state.activeIndex];
    await expect(move).toHaveAttribute('aria-pressed','true');await expect(target).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
    if(id!==actor.id)otherActor=true;if(id===actor.id && current.state.round>initial.state.round)wrapped=true;
  }
  expect(otherActor).toBe(true);expect(wrapped).toBe(true);
  const final=await session(page),replayed=replayBattle(final.replay,catalog);expect(replayed.ok).toBe(true);
  if(replayed.ok){expect(replayed.state).toEqual(final.state);expect(replayed.events).toEqual(final.events);}
  const playerFirstSeed=Array.from({length:20},(_,i)=>i+2).find(seed=>new BattleSession(catalog,'map:forest_ruins',seed).phase==='player');
  expect(playerFirstSeed).toBeDefined();
  for(let seed=2;seed<=playerFirstSeed!;seed++){
    await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await expect(move).toHaveAttribute('aria-pressed','true');
  }
  const fresh=await session(page);expect(fresh.state.seed).toBe(playerFirstSeed);expect(fresh.replay.commands).toEqual([]);
  expect(fresh.replay.initial.units.find(u=>u.id===fresh.replay.initial.initiative[0])!.side).toBe('player');
  await expect(move).toHaveAttribute('aria-pressed','true');
});

// Native keyboard type-ahead works without a platform popup. Headless macOS
// Chrome ignores Home/ArrowDown even on a plain select. Tab away before each
// choice to reset the native type-ahead buffer; never synthesize change events.
async function chooseNativeDestination(target:Locator,index:0|1){
  const option=target.locator('option').nth(index),label=(await option.textContent())!,value=(await option.getAttribute('value'))!;
  await target.press('Tab');await target.focus();
  await target.evaluate(element=>{
    element.removeAttribute('data-native-change');
    element.addEventListener('change',event=>element.setAttribute('data-native-change',String(event.isTrusted)),{once:true});
  });
  await target.pressSequentially(label);
  await expect(target).toHaveValue(value);await expect(target).toHaveAttribute('data-native-change','true');
}

test('clearing the native movement destination clears intent and preview without changing saves',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const target=page.locator('#battle-target'),review=page.locator('#battle-review');
  const initial=await session(page),saved=await page.evaluate(()=>JSON.stringify(localStorage));
  await chooseNativeDestination(target,1);
  await expect(review).toBeEnabled();
  const pending=(await session(page)).pending;expect(pending?.type).toBe('move');
  await chooseNativeDestination(target,0);
  await expect(target).toHaveValue('');
  expect((await session(page)).pending).toBeNull();await expect(review).toBeDisabled();
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#battle-selection')).toHaveText('Select a tile');
  await expect(page.locator('#battle-preview')).toHaveText('Select a destination');
  const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  expect(report.selected).toBeNull();expect(report.hover).toBeNull();
  expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await review.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('destination-cleared.png')});
  // A real new choice remains usable and still requires deliberate confirmation.
  await chooseNativeDestination(target,1);await expect(review).toBeEnabled();
  expect((await session(page)).pending).toEqual(pending);
  await review.click();await page.locator('#dialog-confirm').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const confirmed=await session(page);expect(confirmed.state.commandCount).toBe(initial.state.commandCount+1);
  expect(confirmed.replay.commands).toEqual([...initial.replay.commands,pending]);
  expect(errors).toEqual([]);
});

for(const dismissal of ['Cancel','Escape'] as const){
  test(`movement confirmation ${dismissal} resets destination and permits native same-destination retry`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const target=page.locator('#battle-target'),review=page.locator('#battle-review');
    const initial=await session(page),saved=await page.evaluate(()=>JSON.stringify(localStorage));
    await chooseNativeDestination(target,1);
    await expect(review).toBeEnabled();
    const destination=await target.inputValue(),pending=(await session(page)).pending;
    expect(pending?.type).toBe('move');
    await review.click();await expect(page.getByRole('dialog')).toBeVisible();
    if(dismissal==='Cancel')await page.locator('#dialog-cancel').click();else await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(target).toHaveValue('');await expect(review).toBeDisabled();expect((await session(page)).pending).toBeNull();
    // Native type-ahead must emit a real change after cancellation; selectOption
    // would dispatch change even if the destination had incorrectly stayed selected.
    await chooseNativeDestination(target,1);
    await expect(target).toHaveValue(destination);await expect(review).toBeEnabled();
    expect((await session(page)).pending).toEqual(pending);
    expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
    expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
    // Dismiss a second time to inspect the cleared UI before confirming the retry.
    await review.click();if(dismissal==='Cancel')await page.locator('#dialog-cancel').click();else await page.keyboard.press('Escape');
    await expect(target).toHaveValue('');await expect(review).toBeDisabled();expect((await session(page)).pending).toBeNull();
    await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
    const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
    expect(report.selected).toBeNull();expect(report.hover).toBeNull();
    await review.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('movement-cancelled.png')});
    await chooseNativeDestination(target,1);await expect(review).toBeEnabled();
    await review.click();await page.locator('#dialog-confirm').click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const confirmed=await session(page);expect(confirmed.state.commandCount).toBe(initial.state.commandCount+1);
    expect(confirmed.replay.commands).toEqual([...initial.replay.commands,pending]);expect(errors).toEqual([]);
  });
}

test('player HUD and preview cancellation preserve state and modal capture', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(page.locator('#battle-portraits img:visible')).toBeVisible();
  await expect(page.locator('#battle-party')).toHaveText('Inspect party');
  await expect(page.getByRole('button',{name:'Basic attack',exact:true})).toBeVisible();
  const before = await page.locator('#game').getAttribute('data-session');
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.locator('#battle-target').selectOption({index:1});
  await page.getByRole('button',{name:'Review action'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const after = JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  const initial = JSON.parse(before!);
  expect(after.state).toEqual(initial.state); expect(after.replay).toEqual(initial.replay);
  // WebKit pointer activation leaves focus on the usable scroll region. Other
  // browsers focus Review and need the Restart fallback after it is disabled.
  await expect(page.locator('#fit-restart:focus, #battle-scroll:focus')).toHaveCount(1);
  // Keyboard activation makes Review the invoker on every browser, so Cancel
  // must use the fallback rather than leave focus on the now-disabled button.
  await page.locator('#battle-target').selectOption({index:1});
  await page.getByRole('button',{name:'Review action'}).focus();
  await page.keyboard.press('Enter');
  await page.locator('#dialog-cancel').click();
  await expect(page.locator('#fit-restart')).toBeFocused();
  const cancelled=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(cancelled.state).toEqual(initial.state);expect(cancelled.replay).toEqual(initial.replay);
});

import { playerDecision, session, readSession, playCommand } from './helpers/battlePolicy';
import { battleCatalog as catalog } from '../src/content/catalog';
import { replayBattle } from '../src/domain/turns';
import type { Command } from '../src/domain/types';

for(const [seed,outcome] of [[1,'playerLoss'],[2,'playerWin']] as const){
  test(`complete legal authored battle seed ${seed} reaches ${outcome} through controls and replays`,async({page})=>{
    test.setTimeout(180000);const errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    if(seed===2){await page.getByRole('button',{name:'Restart battle',exact:true}).click();await confirmRestart(page);await expect.poll(async()=> (await session(page)).state.seed).toBe(2);}
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const boardObjects=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).objectCount;
    for(let i=0;i<200;i++){
      await expect.poll(async()=> (await session(page)).phase,{timeout:10000}).toMatch(/^(player|ended|error)$/);
      const board=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
      expect(board.effect).toBeNull();expect(board.objectCount).toBe(boardObjects);
      const s=await session(page);if(s.phase==='ended')break;expect(s.phase).toBe('player');
      await playCommand(page,playerDecision(s.state));
    }
    const final=await session(page);expect(final.state.outcome).toBe(outcome);
    expect(final.replay.commands.some(c=>c.type==='move')).toBe(true);
    expect(final.replay.commands.some(c=>c.type==='useAbility' && c.abilityId==='ability:basic_attack')).toBe(true);
    if(seed===2)expect(final.replay.commands.filter(c=>c.type==='useAbility').map(c=>c.abilityId)).toEqual(expect.arrayContaining(['ability:guarded_strike','ability:high_shot','ability:magic_missile']));
    const replay=replayBattle(final.replay,catalog);expect(replay.ok).toBe(true);
    if(replay.ok){expect(replay.state).toEqual(final.state);expect(replay.events).toEqual(final.events);}
    await expect(page.getByRole('dialog')).toContainText(outcome==='playerWin'?'Victory':'Defeat');
    await page.screenshot({path:test.info().outputPath(`${outcome}.png`)});
    const replayPath=test.info().outputPath('replay.json');
    writeFileSync(replayPath,JSON.stringify(final,null,2));
    await test.info().attach('replay',{path:replayPath,contentType:'application/json'});
    // Reload the legally completed battle and rebuild its outcome without historical cues.
    await page.reload();await page.locator('#save-continue').click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase','ended');
    const continued=await readSession(page);expect(continued.state).toEqual(final.state);
    expect(continued.replay).toBeNull();expect(continued.events).toEqual([]);
    expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio?.lastToken)).toBe(0);
    await expect(page.getByRole('dialog')).toContainText(outcome==='playerWin'?'Victory':'Defeat');
    // An outcome reset can fail after removing backup; the ended session must stay usable.
    await page.evaluate(()=>{
      const remove=Storage.prototype.removeItem;
      Storage.prototype.removeItem=function(key){if(key==='tactics-guru:phaser:battle:primary:v1')throw new DOMException('Denied','SecurityError');return remove.call(this,key);};
      Object.assign(window,{restoreBattleRemoval:()=>{Storage.prototype.removeItem=remove;}});
    });
    await page.locator('#dialog-restart').click();await page.locator('#save-confirm-reset').click();
    await expect(page.getByRole('dialog')).toContainText('Reset incomplete');
    expect((await readSession(page)).state).toEqual(final.state);
    await page.locator('#save-close').click();await expect(page.locator('#fit-restart')).toBeEnabled();
    await expect(page.locator('#fit-status')).toHaveText('Battle ready');
    await page.evaluate(()=>(window as unknown as {restoreBattleRemoval:()=>void}).restoreBattleRemoval());
    await page.locator('#fit-restart').click();await confirmRestart(page);
    await expect.poll(async()=> (await session(page)).state.seed).toBe(seed+1);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await expect(page.locator('#fit-status')).toHaveText('Battle ready');
    expect(await page.locator('canvas').count()).toBe(1);expect(errors).toEqual([]);
  });
}

test('keyboard selection, confirmation lock, touch and restart discard old gestures and previews',async({page})=>{
  await page.clock.install();
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const initial=await session(page),actor=initial.state.units.find(u=>u.id===initial.state.initiative[initial.state.activeIndex])!;
  const targetValue=await page.locator('#battle-target option').nth(1).getAttribute('value');
  const [tx,ty]=targetValue!.split(',').map(Number);
  await page.locator('canvas').focus();
  for(let x=actor.cell.x;x!==tx;x+=x<tx?1:-1)await page.keyboard.press(x<tx?'ArrowRight':'ArrowLeft');
  for(let y=actor.cell.y;y!==ty;y+=y<ty?1:-1)await page.keyboard.press(y<ty?'ArrowDown':'ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Review action'})).toBeEnabled();
  const command={type:'move' as const,unitId:actor.id,to:{x:tx,y:ty}},preview=previewMove(initial.state,command,catalog);
  if(!preview.ok)throw Error(preview.reason);
  await expect(page.locator('#battle-preview')).toHaveText(`Move ${preview.path.length-1} steps · cost ${preview.cost} · uses movement`);
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toEqual(command);
  expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.getByRole('button',{name:'Move',exact:true}).click();await page.locator('#battle-target').selectOption({index:1});
  await page.getByRole('button',{name:'Review action'}).click();
  await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null)).toBe(true);
  // Freeze RAF/timers before accepting the move: lock assertions and Restart
  // must run during presentation, even when the selected path is only one step.
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  // With RAF paused, skip animation-based actionability checks, not the UI handlers.
  await page.locator('#dialog-confirm').click({force:true});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  await expect(page.getByRole('button',{name:'Basic attack',exact:true})).toBeDisabled();
  await expect(page.locator('#battle-move')).toBeDisabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#fit-restart')).toBeFocused();
  expect((await session(page)).replay.commands).toHaveLength(initial.replay.commands.length+1);
  await expect(page.getByRole('button',{name:'Restart battle',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Restart battle',exact:true}).click({force:true});await confirmRestart(page,true);
  await page.clock.resume();
  await expect.poll(async()=> (await session(page)).state.seed).toBe(2);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const fresh=await session(page);expect(fresh.state.seed).toBe(2);expect(fresh.replay.commands.every(c=>fresh.state.units.find(u=>u.id===c.unitId)!.side==='enemy')).toBe(true);
  await page.getByRole('button',{name:'Move',exact:true}).click();await page.locator('#battle-target').selectOption({index:1});
  await page.getByRole('button',{name:'Review action'}).click();
  await page.locator('#dialog-restart').click();await confirmRestart(page);await expect.poll(async()=> (await session(page)).state.seed).toBe(3);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('battle HUD targets fit portrait and short landscape with a bounded readable log',async({page})=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:360,height:640}]){
    await page.setViewportSize(viewport);
    const boxes=await page.evaluate(()=>{

      return [...document.querySelectorAll<HTMLElement>('#fit-panel button, #battle-target')].filter(e=>e.getClientRects().length).map(e=>{e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {text:e.textContent,width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom};});
    });
    for(const b of boxes){expect(b.width,b.text!).toBeGreaterThanOrEqual(44);expect(b.height,b.text!).toBeGreaterThanOrEqual(44);expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(viewport.width);expect(b.bottom).toBeLessThanOrEqual(viewport.height);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#battle-log-open').click();
    await expect(page.getByRole('dialog')).toContainText('Battle log');
    await page.locator('#log-close').click();
    await page.locator('#battle-scroll').evaluate(e=>{e.scrollTop=0;});
    await page.screenshot({path:test.info().outputPath(`hud-${viewport.width}.png`)});
  }
});

test('real touch previews a board move, modal backdrop captures it, and suspend resumes exactly once',async({page})=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  const {projectTile}=await import('../src/geometry/iso');
  const {pickTile}=await import('../src/geometry/picking');
  const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  let point:{x:number;y:number}|null=null;
  for(const cell of report.reachable){
    const tile=report.tiles.find((t:any)=>t.x===cell.x && t.y===cell.y),local=projectTile(tile),picked=pickTile(report.tiles,local);
    if(picked?.x!==cell.x || picked?.y!==cell.y)continue;
    const screen={x:report.transform.x+local.x*report.transform.scale,y:report.transform.y+local.y*report.transform.scale};
    if(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',screen)){
      const s=await session(page),actor=s.state.units.find(u=>u.id===s.state.initiative[s.state.activeIndex])!;
      if(actor.cell.x===cell.x && actor.cell.y===cell.y)continue;
      point=screen;break;
    }
  }
  expect(point).not.toBeNull();
  const cdp=await page.context().newCDPSession(page);
  const touch=async(p:{x:number;y:number})=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await touch(point!);await expect(page.getByRole('button',{name:'Review action'})).toBeEnabled();
  await page.locator('#battle-review').scrollIntoViewIfNeeded();let box=(await page.locator('#battle-review').boundingBox())!;await touch({x:box.x+box.width/2,y:box.y+box.height/2});
  await expect(page.getByRole('dialog')).toBeVisible();const before=await session(page);
  await touch({x:5,y:await page.evaluate(()=>innerHeight-5)});
  expect((await session(page)).state).toEqual(before.state);
  box=(await page.locator('#dialog-confirm').boundingBox())!;await touch({x:box.x+box.width/2,y:box.y+box.height/2});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await session(page);expect(after.state.commandCount).toBe(before.state.commandCount+1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  expect((await session(page)).state).toEqual(after.state);
});

test('keyboard-only movement, attack confirmation and Wait use the shared decision flow',async({page})=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await page.locator('#fit-restart').focus();await page.keyboard.press('Enter');
  await page.locator('#save-confirm-reset').focus();await page.keyboard.press('Enter');
  await expect.poll(async()=> (await session(page)).state.seed).toBe(2);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const enact=async(command:Command)=>{
    const s=await session(page);
    if(command.type==='endTurn'){await page.locator('#battle-next').focus();await page.keyboard.press('Enter');return;}
    const action=command.type==='move'?'move':command.abilityId==='ability:basic_attack'?'basic':'signature';
    await page.locator(`[data-action="${action}"]`).focus();await page.keyboard.press('Enter');
    const cell=command.type==='move'?command.to:s.state.units.find(u=>u.id===('unitId' in command.target?command.target.unitId:'missileTargets' in command.target?command.target.missileTargets[0]:-1))!.cell;
    const actor=s.state.units.find(u=>u.id===s.state.initiative[s.state.activeIndex])!;
    await page.locator('canvas').focus();
    for(let x=actor.cell.x;x!==cell.x;x+=x<cell.x?1:-1)await page.keyboard.press(x<cell.x?'ArrowRight':'ArrowLeft');
    for(let y=actor.cell.y;y!==cell.y;y+=y<cell.y?1:-1)await page.keyboard.press(y<cell.y?'ArrowDown':'ArrowUp');
    await page.keyboard.press('Enter');
    await expect(page.locator('#battle-target')).toHaveValue(`${cell.x},${cell.y}`);
    await page.locator('#battle-review').focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#dialog-confirm').focus();await page.keyboard.press('Enter');
  };
  const attack=playerDecision((await session(page)).state);expect(attack.type).toBe('useAbility');await enact(attack);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const current=(await session(page)).state,actorId=current.initiative[current.activeIndex];
  const {previewMovement}=await import('../src/domain/grid');
  const reach=previewMovement(current,actorId,catalog);expect(reach.ok).toBe(true);
  if(!reach.ok)throw Error(reach.reason);
  await enact({type:'move',unitId:actorId,to:reach.cells.find(c=>c.cost>0)!.cell});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const before=await session(page);await enact({type:'endTurn',unitId:before.state.initiative[before.state.activeIndex]});
  await expect.poll(async()=> (await session(page)).state.commandCount).toBeGreaterThan(before.state.commandCount);
});

test('restart during initial enemy animation discards the old run and its callbacks',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  // An enemy end-turn commit advances initiative before its presentation completes.
  const first=await session(page),command=first.replay.commands.at(-1);
  expect(command).toBeDefined();expect(first.state.units.find(u=>u.id===command!.unitId)!.side).toBe('enemy');
  await page.locator('#fit-restart').click();await confirmRestart(page);await expect.poll(async()=> (await session(page)).state.seed).toBe(2);
  await page.locator('#fit-restart').click();await confirmRestart(page);await expect.poll(async()=> (await session(page)).state.seed).toBe(3);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const fresh=await session(page);expect(fresh.replay.initial.seed).toBe(3);
  const replay=replayBattle(fresh.replay,catalog);expect(replay.ok).toBe(true);if(replay.ok)expect(replay.state).toEqual(fresh.state);
  expect(fresh.replay.commands.every(c=>fresh.state.units.find(u=>u.id===c.unitId)!.side==='enemy')).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('battle diagnostics record real selection, gestures and movement and reset on restart',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await page.waitForFunction(()=>window.fitDiagnostics().frames.count>=5);
  const before=await session(page);
  const point=await page.evaluate(()=>{const r=document.querySelector('#battle-board-region')!.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*0.65};});
  await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-100);
  await page.waitForFunction(()=>window.fitDiagnostics().interactions.some(i=>i.action==='zoom'));
  await page.mouse.down();await page.mouse.move(point.x+40,point.y-25,{steps:8});await page.mouse.up();
  await page.waitForFunction(()=>window.fitDiagnostics().interactions.some(i=>i.action==='pan'));
  expect((await session(page)).state).toEqual(before.state);
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.locator('#battle-target').selectOption({index:1});
  await page.waitForFunction(()=>window.fitDiagnostics().interactions.some(i=>i.action==='selection'));
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const diagnostics=await page.evaluate(()=>window.fitDiagnostics());
  expect(diagnostics.idleIntervalsMs).toHaveLength(diagnostics.frames.count);
  expect(diagnostics.measurementMethod).toEqual({version:3,frameObservation:'post-render'});
  expect(diagnostics.workloads.map(w=>w.action)).toEqual(expect.arrayContaining(['pan','zoom','selection','move']));
  expect(diagnostics.workloads.find(w=>w.action==='move')!.frames.count).toBeGreaterThan(0);
  const startup=diagnostics.workloads.find(w=>w.action==='move' && w.startedMs<diagnostics.controlsUsableMs!)!;
  expect(startup.intervalStartedMs.some((start,i)=>start+startup.intervalsMs[i]<diagnostics.controlsUsableMs!)).toBe(true);
  expect(startup.intervalStartedMs).toHaveLength(startup.frames.count);
  for(const response of diagnostics.interactions){expect(response.renderedMs).toBeGreaterThanOrEqual(response.inputMs);expect(response.renderedFrames).toBe(1);}
  expect((await session(page)).state.commandCount).toBe(before.state.commandCount+1);
  const replay=replayBattle((await session(page)).replay,catalog);expect(replay.ok).toBe(true);
  if(replay.ok)expect(replay.state).toEqual((await session(page)).state);
  await page.getByRole('button',{name:'Restart battle',exact:true}).click();await confirmRestart(page);
  await expect.poll(async()=> (await session(page)).state.seed).toBe(2);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect((await page.evaluate(()=>window.fitDiagnostics())).interactions).toEqual([]);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('live actor, inspection and cancellation remain independent of pending intent',async({page},info)=>{
  // Three actors inspect every unit and both cancellation routes in one cumulative workflow.
  test.setTimeout(90000);page.setDefaultTimeout(5000);
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const seen=new Set<string>();
  for(let turn=0;turn<12 && seen.size<3;turn++){
    const current=await session(page),actor=current.state.units.find(u=>u.id===current.state.initiative[current.state.activeIndex])!;
    if(actor.side!=='player')throw Error('Expected player');
    const def=catalog.heroes[actor.defId],signature=Object.values(catalog.abilities).find(a=>a.id!=='ability:basic_attack'&&a.owners.includes(actor.defId))!;
    seen.add(actor.defId);
    await page.locator('#battle-scroll').evaluate(e=>e.scrollTop=0);
    await page.screenshot({path:info.outputPath(`actor-${actor.defId}.png`)});
    await expect(page.locator('#battle-actor-name')).toHaveText(actor.defId[0].toUpperCase()+actor.defId.slice(1));
    await expect(page.locator('#battle-hp')).toHaveText(`HP ${actor.hp}/${def.stats.maxHp}`);
    await expect(page.locator('[data-action="signature"] strong')).toHaveText(signature.id.slice(8).split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '));
    await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
    const before=await page.locator('#game').getAttribute('data-session'),preview=await page.locator('#battle-preview').textContent();
    const actorText=await page.locator('#battle-actor').textContent();
    await page.locator('#battle-party').click();
    for(const unit of current.state.units){
      await page.locator(`#inspect-unit-${unit.id}`).click();
      await expect(page.locator('#battle-dialog-title')).toContainText('Inspection only');
      const def=unit.side==='player'?catalog.heroes[unit.defId]:catalog.enemies[unit.defId];
      await expect(page.locator('#battle-dialog-message')).toContainText(`HP ${unit.hp}/${def.stats.maxHp}`);
      await expect(page.locator('#battle-dialog-message')).toContainText(`AC ${def.stats.armorClass+(unit.guarded?2:0)}`);
      expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
      expect(await page.locator('#battle-actor').textContent()).toBe(actorText);
      await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
    }
    await page.locator('#inspection-close').click();await expect(page.locator('#battle-party')).toBeFocused();
    expect(await page.locator('#battle-preview').textContent()).toBe(preview);
    expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
    // Both nonmodal cancellation routes preserve the authoritative state/RNG.
    for(const keyboard of [true,false]){
      await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
      if(keyboard){await page.locator('#battle-target').focus();await page.keyboard.press('Escape');}else await page.locator('#battle-cancel').click();
      await expect(page.locator('#battle-move')).toBeFocused();
      const cancelled=await session(page);expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();expect(cancelled.state).toEqual(current.state);
    }
    await page.locator('#battle-next').click();
    await expect.poll(async()=>(await session(page)).state.commandCount).toBeGreaterThan(current.state.commandCount);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  }
  expect([...seen].sort()).toEqual(['fighter','mage','ranger']);
  // Spent movement changes the shared focus fallback to Wait.
  const current=await session(page);await playCommand(page,{type:'move',unitId:current.state.initiative[current.state.activeIndex],to:JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).reachable.find((c:any)=>c.x!==current.state.units.find(u=>u.id===current.state.initiative[current.state.activeIndex])!.cell.x)});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(page.locator('#battle-move')).toBeDisabled();
  await page.locator('[data-action="basic"]').click();const spent=await session(page);
  await page.locator('#battle-cancel').click();await expect(page.locator('#battle-next')).toBeFocused();
  expect((await session(page)).state).toEqual(spent.state);
  await page.locator('[data-action="basic"]').click();await page.keyboard.press('Escape');await expect(page.locator('#battle-next')).toBeFocused();
});

test('accepted rail and dock preserve drawable floors, readable controls and focus at five sizes',async({page},info)=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const measurements=[];
  for(const [width,height] of [[1280,720],[412,915],[915,412],[320,568],[568,320]]){
    await page.setViewportSize({width,height});
    for(const stress of [false,true]){
      await page.evaluate(stress=>{document.documentElement.style.fontSize=stress?'32px':'';for(const [side,size] of Object.entries({top:24,right:24,bottom:34,left:24}))document.body.style.setProperty('--safe-'+side,stress?size+'px':'0px');document.querySelector('#battle-scroll')!.scrollTop=0;document.querySelector('#battle-actor')!.scrollTop=0;},stress);
      await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual({width,height});
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      if(!stress){await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
      const measurement=await page.evaluate(()=>{
        const rect=(s:string)=>document.querySelector(s)!.getBoundingClientRect().toJSON();
        const controls=[...document.querySelectorAll<HTMLElement>('#fit-panel button:not([hidden]), #battle-target')].filter(e=>e.getClientRects().length).map(e=>{
          e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),p=document.querySelector('#battle-scroll')!.getBoundingClientRect();
          return {name:e.textContent,width:r.width,height:r.height,left:r.left,right:r.right,reachable:r.bottom>p.top&&r.top<p.bottom};
        });
        const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number);
        const luminance=(c:string)=>rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
        const ratio=(a:string,b:string)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
        const b=getComputedStyle(document.querySelector('#battle-move')!),hint=getComputedStyle(document.querySelector('#battle-move span')!);
        return {region:rect('#battle-board-region'),panel:rect('#fit-panel'),actor:rect('#battle-actor'),overflow:document.documentElement.scrollWidth>innerWidth,controls,
          contrast:{text:ratio(b.color,b.backgroundColor),hint:ratio(hint.color,b.backgroundColor),edge:ratio(b.borderTopColor,b.backgroundColor)}};
      });
      expect(measurement.region.height+.02).toBeGreaterThanOrEqual(height*(width>height&&height<=500?.55:.3));
      const r=measurement.region,p=measurement.panel;expect(r.right<=p.x||r.bottom<=p.y).toBe(true);
      expect(measurement.overflow).toBe(false);expect(measurement.actor.height).toBeLessThanOrEqual(measurement.panel.height*.45+.02);
      for(const control of measurement.controls){expect(control.width,control.name!).toBeGreaterThanOrEqual(44);expect(control.height,control.name!).toBeGreaterThanOrEqual(44);expect(control.left).toBeGreaterThanOrEqual(0);expect(control.right).toBeLessThanOrEqual(width);expect(control.reachable,control.name!).toBe(true);}
      expect(measurement.contrast.text).toBeGreaterThan(4.5);expect(measurement.contrast.hint).toBeGreaterThan(4.5);expect(measurement.contrast.edge).toBeGreaterThan(3);
      await page.locator('#battle-scroll').evaluate(e=>e.scrollTop=0);
      await page.screenshot({path:info.outputPath(`responsive-${width}x${height}${stress?'-stress':''}.png`)});
      await page.locator('#battle-actor').focus();await page.keyboard.press('End');await page.keyboard.press('Tab');
      expect(await page.evaluate(()=>document.activeElement!==document.body)).toBe(true);
      measurements.push({width,height,stress,...measurement});
    }
  }
  writeFileSync(info.outputPath('responsive-measurements.json'),JSON.stringify(measurements,null,2));expect(errors).toEqual([]);
});
