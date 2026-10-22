import { assert, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { BattleSession } from '../../src/app/BattleSession';
import { freshRunSnapshot, replayRunBattle } from '../../src/domain/runBattle';
import { runContext } from '../helpers/runItemFixtures';
import { playerDecision } from '../helpers/playerPolicy';
import { dispatch } from '../../src/domain/turns';
import { hashJson } from '../../src/domain/contentIdentity';

it('reproduces legal representative battles with independent pursuit and waiting policies',()=>{
 const results=[];
 for(const seed of [0,1,13])for(const policy of ['pursue','wait'])for(const wounded of [false,true]){
  const initial=freshRunSnapshot(`simulation-${seed}`,seed,runContext);
  const entry=wounded?{...initial.items,run:{...initial.items.run,encounterIndex:1,revision:2,party:initial.items.run.party.map(h=>({...h,hp:1}))}}:initial.items;
  const made=BattleSession.fromRun(entry,runContext);assert(made.ok);const session=made.session;
  for(let command=0;command<1000&&session.phase!=='ended';command++){
   const presentation=session.phase==='enemy'?session.nextEnemy():(session.prepare(policy==='wait'?{type:'endTurn',unitId:session.active.id}:playerDecision(session.state,session.catalog)),session.confirm());
   assert(presentation,`${seed} ${policy} ${wounded} ${session.error}`);session.finishPresentation(presentation.token);
  }
  expect(session.phase).toBe('ended');
  const replay=replayRunBattle(session.replay,entry,runContext);assert(replay.ok);
  expect(replay.state).toEqual(session.state);expect(replay.events).toEqual(session.events);
  results.push({seed,policy,wounded,descriptor:session.battlefield,outcome:session.state.outcome,commands:session.state.commandCount,stateHash:hashJson(session.state),eventsHash:hashJson(session.events)});
 }
 mkdirSync('docs/qa/procedural-grids',{recursive:true});writeFileSync('docs/qa/procedural-grids/simulations.json',JSON.stringify({rulesVersion:2,generatorVersion:1,profileVersion:'desert-v1',results},null,2)+'\n');
 expect(results.some(r=>r.outcome==='playerLoss')).toBe(true);
},120000);

it('allows a one-HP survivor to win a legal late-battle boundary without a victory guarantee',()=>{
 const initial=freshRunSnapshot('wounded-boundary',13,runContext),made=BattleSession.fromRun(initial.items,runContext);assert(made.ok);
 const mage=made.session.state.units.find(u=>u.side==='player'&&u.defId==='mage')!;
 const enemy=made.session.state.units.find(u=>u.side==='enemy')!;
 // Explicit late-battle fixture, not claimed as a canonical fresh start.
 const state={...made.session.state,activeIndex:made.session.state.initiative.indexOf(mage.id),units:made.session.state.units.map(u=>u.id===mage.id?{...u,hp:1,cell:{x:5,y:6}}:u.id===enemy.id?{...u,hp:1,cell:{x:5,y:5}}:{...u,hp:0})};
 const result=dispatch(state,{type:'useAbility',unitId:mage.id,abilityId:'ability:magic_missile',target:{missileTargets:[enemy.id]}},made.session.catalog);assert(result.ok);expect(result.state.outcome).toBe('playerWin');
});
