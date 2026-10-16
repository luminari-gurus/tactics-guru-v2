import { expect, type Page } from '@playwright/test';
import type { BattleState, Command, Replay, BattleEvent } from '../../src/domain/types';

export { playerDecision } from './playerPolicy';

export async function readSession(page:Page):Promise<{state:BattleState;replay:Replay|null;continuation:{snapshot:BattleState;commands:Command[];events:BattleEvent[]}|null;events:BattleEvent[];phase:string}> {
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
  await page.getByRole('button',{name:command.type==='move'?'Move':command.abilityId==='ability:basic_attack'?'Basic attack':/^Signature:/,exact:command.type==='move' || command.type==='useAbility' && command.abilityId==='ability:basic_attack'}).click();
  const cell=command.type==='move'?command.to:snapshot.units.find(u=>u.id===('unitId' in command.target?command.target.unitId:'missileTargets' in command.target?command.target.missileTargets[0]:-1))!.cell;
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
}
