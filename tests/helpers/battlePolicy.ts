import { expect, type Page } from '@playwright/test';
import type { BattleState, Command, Replay, ReplayCommand, BattleEvent } from '../../src/domain/types';
import type { ContentCatalog } from '../../src/content/types';
import { previewMovement } from '../../src/domain/grid';

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
export async function playCommand(page:Page,command:Command){
  if(command.type==='endTurn') {await page.getByRole('button',{name:'Wait / End turn',exact:true}).click();return;}
  const snapshot=(await readSession(page)).state;
  if(command.type==='useAbility' && command.abilityId!=='ability:basic_attack')await page.locator('#battle-ability').selectOption(command.abilityId);
  await page.locator(`[data-action="${command.type==='move'?'move':command.abilityId==='ability:basic_attack'?'basic':'signature'}"]`).click();
  const cell=command.type==='move'?command.to:snapshot.units.find(u=>u.id===('unitId' in command.target?command.target.unitId:'missileTargets' in command.target?command.target.missileTargets[0]:-1))!.cell;
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
  await page.getByRole('button',{name:'Confirm action'}).click();
}

/** Exercise a real movement and reversal before continuing a legal journey. */
export async function playUndo(page:Page,catalog:ContentCatalog,touch:boolean) {
  const before=await readSession(page),actor=before.state.initiative[before.state.activeIndex];
  const reach=previewMovement(before.state,actor,catalog);if(!reach.ok)throw Error(reach.reason);
  const destination=reach.cells.find(cell=>cell.cost>0);if(!destination)throw Error('No legal movement');
  const activate=async(selector:string)=>{const element=page.locator(selector);if(touch)await element.tap();else await element.click();};
  await activate('#battle-move');await page.locator('#battle-target').selectOption(`${destination.cell.x},${destination.cell.y}`);
  await activate('#battle-review');await expect(page.locator('#battle-undo')).toBeEnabled();await activate('#battle-undo');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await readSession(page);
  expect(after.state.units.find(u=>u.id===actor)?.cell).toEqual(before.state.units.find(u=>u.id===actor)?.cell);
  expect(after.state.rng).toEqual(before.state.rng);return after.state;
}
