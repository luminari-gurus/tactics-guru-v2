import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('player HUD and preview cancellation preserve state and modal capture', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(page.locator('#battle-party img')).toHaveCount(3);
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
});

import type { Page } from '@playwright/test';
import { playerDecision } from './helpers/battlePolicy';
import { battleCatalog as catalog } from '../src/content/catalog';
import { replayBattle } from '../src/domain/turns';
import type { BattleState, Command, Replay, BattleEvent } from '../src/domain/types';

async function session(page:Page):Promise<{state:BattleState;replay:Replay;events:BattleEvent[];phase:string}> {
  return JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
}
async function playCommand(page:Page,command:Command){
  if(command.type==='endTurn') {await page.getByRole('button',{name:'Wait / End turn',exact:true}).click();return;}
  const snapshot=(await session(page)).state;
  await page.getByRole('button',{name:command.type==='move'?'Move':command.abilityId==='ability:basic_attack'?'Basic attack':/^Signature:/,exact:command.type==='move' || command.type==='useAbility' && command.abilityId==='ability:basic_attack'}).click();
  const cell=command.type==='move'?command.to:snapshot.units.find(u=>u.id===('unitId' in command.target?command.target.unitId:'missileTargets' in command.target?command.target.missileTargets[0]:-1))!.cell;
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
}
for(const [seed,outcome] of [[1,'playerLoss'],[2,'playerWin']] as const){
  test(`complete legal authored battle seed ${seed} reaches ${outcome} through controls and replays`,async({page})=>{
    test.setTimeout(180000);const errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    if(seed===2){await page.getByRole('button',{name:'Restart battle',exact:true}).click();await expect.poll(async()=> (await session(page)).state.seed).toBe(2);}
    for(let i=0;i<200;i++){
      await expect.poll(async()=> (await session(page)).phase,{timeout:10000}).toMatch(/^(player|ended|error)$/);
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
    if(seed===1){await page.keyboard.press('Escape');await expect(page.locator('#battle-active')).toContainText('Defeat');await page.locator('#fit-restart').click();}
    else await page.locator('#dialog-restart').click();
    await expect.poll(async()=> (await session(page)).state.seed).toBe(seed+1);
    expect(await page.locator('canvas').count()).toBe(1);expect(errors).toEqual([]);
  });
}

test('keyboard selection, confirmation lock, touch and restart discard old gestures and previews',async({page})=>{
  await page.clock.install();
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await page.getByRole('button',{name:'Move',exact:true}).click();
  const initial=await session(page),actor=initial.state.units.find(u=>u.id===initial.state.initiative[initial.state.activeIndex])!;
  const targetValue=await page.locator('#battle-target option').nth(1).getAttribute('value');
  const [tx,ty]=targetValue!.split(',').map(Number);
  await page.locator('canvas').focus();
  for(let x=actor.cell.x;x!==tx;x+=x<tx?1:-1)await page.keyboard.press(x<tx?'ArrowRight':'ArrowLeft');
  for(let y=actor.cell.y;y!==ty;y+=y<ty?1:-1)await page.keyboard.press(y<ty?'ArrowDown':'ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Review action'})).toBeEnabled();
  expect((await session(page)).replay.commands.length).toBeGreaterThan(0);
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
  expect((await session(page)).replay.commands).toHaveLength(initial.replay.commands.length+1);
  await expect(page.getByRole('button',{name:'Restart battle',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Restart battle',exact:true}).click({force:true});
  await page.clock.resume();
  await expect.poll(async()=> (await session(page)).state.seed).toBe(2);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const fresh=await session(page);expect(fresh.state.seed).toBe(2);expect(fresh.replay.commands.every(c=>fresh.state.units.find(u=>u.id===c.unitId)!.side==='enemy')).toBe(true);
  await page.getByRole('button',{name:'Move',exact:true}).click();await page.locator('#battle-target').selectOption({index:1});
  await page.getByRole('button',{name:'Review action'}).click();
  await page.locator('#dialog-restart').click();await expect.poll(async()=> (await session(page)).state.seed).toBe(3);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('battle HUD targets fit portrait and short landscape with a bounded readable log',async({page})=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  for(const viewport of [{width:390,height:844},{width:844,height:390},{width:360,height:640}]){
    await page.setViewportSize(viewport);
    const boxes=await page.evaluate(()=>{
      const details=document.querySelector<HTMLDetailsElement>('#battle-log-panel')!;details.open=true;
      return [...document.querySelectorAll<HTMLElement>('#fit-panel button, #battle-target, #battle-log-panel summary')].filter(e=>e.getClientRects().length).map(e=>{e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {text:e.textContent,width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom};});
    });
    for(const b of boxes){expect(b.width,b.text!).toBeGreaterThanOrEqual(44);expect(b.height,b.text!).toBeGreaterThanOrEqual(44);expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(viewport.width);expect(b.bottom).toBeLessThanOrEqual(viewport.height);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#fit-panel').evaluate(e=>{e.scrollTop=0;});
    await page.screenshot({path:test.info().outputPath(`hud-${viewport.width}.png`)});
  }
});

test('real touch previews a board move, modal backdrop captures it, and suspend resumes exactly once',async({page})=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await page.getByRole('button',{name:'Move',exact:true}).click();
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
  await page.goto('/');await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  const first=await session(page);expect(first.state.units.find(u=>u.id===first.state.initiative[first.state.activeIndex])!.side).toBe('enemy');
  await page.locator('#fit-restart').click();await expect.poll(async()=> (await session(page)).state.seed).toBe(2);
  await page.locator('#fit-restart').click();await expect.poll(async()=> (await session(page)).state.seed).toBe(3);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const fresh=await session(page);expect(fresh.replay.initial.seed).toBe(3);
  const replay=replayBattle(fresh.replay,catalog);expect(replay.ok).toBe(true);if(replay.ok)expect(replay.state).toEqual(fresh.state);
  expect(fresh.replay.commands.every(c=>fresh.state.units.find(u=>u.id===c.unitId)!.side==='enemy')).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);await expect(page.getByRole('dialog')).not.toBeVisible();
});
