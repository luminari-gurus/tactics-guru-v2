import { test, expect, type Page } from '@playwright/test';
import type { BattleState, Command, Replay, ReplayCommand, BattleEvent } from '../../src/domain/types';
import type { ContentCatalog } from '../../src/content/types';
import { previewMovement } from '../../src/domain/grid';
import { projectTile } from '../../src/geometry/iso';

export { playerDecision } from './playerPolicy';

export async function readSession(page:Page):Promise<{state:BattleState;replay:Replay|null;continuation:{snapshot:BattleState;commands:ReplayCommand[];events:BattleEvent[]}|null;events:BattleEvent[];pending:Command|null;phase:string}> {
  return JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
}
/** Existing replay checks require a fresh seed-origin session explicitly. */
export async function session(page:Page) {
  const value=await readSession(page);
  if(!value.replay)throw Error('Full replay is unavailable for a resumed battle');
  return {...value,replay:value.replay};
}
/** Complete the explicit destructive choice, then wait for the replacement scene. */
export async function confirmRestart(page:Page, force=false) {
  const seed=(await readSession(page)).state.seed;
  await page.locator('#save-confirm-reset').click({force});
  if(force)return; // The caller resumes its paused RAF before checking the new scene.
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))??'null')?.state.seed).toBe((seed+1)>>>0);
}

export async function combatSkin(page:Page): Promise<'radial'|'rail'> {
  return (await page.evaluate(() => document.body.dataset.combatSkin)) === 'radial' ? 'radial' : 'rail';
}

/** Finish panel layout, ResizeObserver and rendering before projecting a changed layout. */
export async function settledReport(page:Page) {
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
  return JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
}

export async function boardPoint(page:Page, cell:{x:number;y:number}) {
  const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  const tile=report.tiles.find((entry:{x:number;y:number})=>entry.x===cell.x && entry.y===cell.y);
  if(!tile) throw Error(`Missing tile ${cell.x},${cell.y}`);
  const local=projectTile(tile);
  return {x:report.transform.x+local.x*report.transform.scale, y:report.transform.y+local.y*report.transform.scale};
}

export async function tapBoard(page:Page, cell:{x:number;y:number}) {
  const point=await boardPoint(page, cell);
  if(test.info().project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

export async function reviewDraught(page: Page) {
  const touch = test.info().project.use.hasTouch;
  if (await combatSkin(page) === 'radial') {
    const more = page.locator('#battle-overflow');
    if (await more.getAttribute('open') === null) {
      if (touch) await more.locator('summary').tap();
      else await more.locator('summary').click();
    }
  }
  const button = page.locator('#battle-draught');
  if (touch) await button.tap();
  else { await button.focus(); await page.keyboard.press('Enter'); }
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Drink Healing Draught?');
}

export async function playCommand(page:Page,command:Command){
  const skin=await combatSkin(page);
  if(command.type==='endTurn') {
    await page.getByRole('button',{name:skin==='radial'?'End turn':'Wait / End turn',exact:true}).click();
    return;
  }
  if(command.type==='drinkDraught') {
    await reviewDraught(page);
    const confirm = page.locator('#battle-draught-confirm');
    if (test.info().project.use.hasTouch) await confirm.tap();
    else await confirm.click();
    return;
  }
  const snapshot=(await readSession(page)).state;
  const cell=command.type==='move'?command.to:snapshot.units.find(u=>u.id===('unitId' in command.target?command.target.unitId:'missileTargets' in command.target?command.target.missileTargets[0]:-1))!.cell;
  if(skin==='radial'){
    await tapBoard(page, cell);
    await expect(page.locator('#battle-radial')).toBeVisible();
    if(command.type==='move'){ await page.locator('#battle-radial-move').click(); return; }
    if(command.abilityId==='ability:basic_attack'){ await page.locator('#battle-radial-attack').click(); return; }
    const chip=page.locator(`#battle-radial-sub [data-radial-ability="${command.abilityId}"]`);
    await page.locator('#battle-radial-special').click();
    if(await chip.count()) await chip.click();
    return;
  }
  if(command.type==='useAbility' && command.abilityId!=='ability:basic_attack')await page.locator('#battle-ability').selectOption(command.abilityId);
  await page.locator(`[data-action="${command.type==='move'?'move':command.abilityId==='ability:basic_attack'?'basic':'signature'}"]`).click();
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
  await page.getByRole('button',{name:'Confirm action'}).click();
}

/** Exercise a real movement and reversal before continuing a legal journey. */
export async function playUndo(page:Page,catalog:ContentCatalog,touch:boolean) {
  const before=await readSession(page),actor=before.state.initiative[before.state.activeIndex];
  const reach=previewMovement(before.state,actor,catalog);if(!reach.ok)throw Error(reach.reason);
  const destination=reach.cells.find(cell=>cell.cost>0);if(!destination)throw Error('No legal movement');
  const activate=async(selector:string)=>{const element=page.locator(selector);if(touch)await element.tap();else await element.click();};
  if(await combatSkin(page)==='radial'){
    await tapBoard(page, destination.cell);
    await expect(page.locator('#battle-radial')).toBeVisible();
    await page.locator('#battle-radial-move').click();
    await expect(page.locator('#battle-undo')).toBeEnabled();await activate('#battle-undo');
  } else {
    await activate('#battle-move');await page.locator('#battle-target').selectOption(`${destination.cell.x},${destination.cell.y}`);
    await activate('#battle-review');await expect(page.locator('#battle-undo')).toBeEnabled();await activate('#battle-undo');
  }
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await readSession(page);
  expect(after.state.units.find(u=>u.id===actor)?.cell).toEqual(before.state.units.find(u=>u.id===actor)?.cell);
  expect(after.state.rng).toEqual(before.state.rng);return after.state;
}
