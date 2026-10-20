import { assert, expect, it } from 'vitest';
import { preparedSnapshot, runContext } from '../helpers/runItemFixtures';
import { BattleSession } from '../../src/app/BattleSession';
import { completeRunBattle } from '../../src/domain/runBattle';
import { encodeRunSave, decodeRunSave, runBattleCatalog, type RunSnapshot } from '../../src/domain/runSaveEnvelope';
import { playerDecision } from '../helpers/playerPolicy';
import { planEnemyTurn } from '../../src/domain/ai';
import { dispatch } from '../../src/domain/turns';

it.each([1,2])('restores every accepted command and terminal boundary for source slot %i',index=>{
 const base=preparedSnapshot(),entry={...base.items,run:{...base.items.run,encounterIndex:index,revision:index*2}};
 const made=BattleSession.fromRun(entry,runContext);assert(made.ok);const session=made.session;
 let snapshot:RunSnapshot={items:entry,activeBattle:session.state,battlefield:session.battlefield!};
 for(let i=0;i<500&&session.phase!=='ended';i++){
  const command=session.phase==='enemy'?planEnemyTurn(session.state,session.active.id,session.catalog):{ok:true as const,commands:[playerDecision(session.state,session.catalog)]};assert(command.ok);
  const expected=dispatch(session.state,command.commands[0],session.catalog);assert(expected.ok);
  const presentation=session.phase==='enemy'?session.nextEnemy():(session.prepare(command.commands[0]),session.confirm());assert(presentation);
  expect(presentation.after).toEqual(expected.state);
  snapshot={...snapshot,activeBattle:session.state};
  const encoded=encodeRunSave(snapshot,runContext);assert(encoded.ok);const decoded=decodeRunSave(encoded.text,runContext);assert(decoded.ok);
  expect(decoded.state).toEqual(snapshot);const catalog=runBattleCatalog(decoded.state.items,runContext)!;
  const restored=BattleSession.fromSnapshot(catalog,decoded.state.activeBattle,undefined,decoded.state.battlefield!);assert(restored.ok);
  expect(restored.session.replay).toBeNull();expect(restored.session.events).toEqual([]);
  expect(restored.session.continuation!.battlefield).toEqual(snapshot.battlefield);
  if(presentation.after.outcome==='ongoing'&&session.active.side==='enemy'){
   const original=planEnemyTurn(session.state,session.active.id,session.catalog),resumed=planEnemyTurn(restored.session.state,restored.session.active.id,catalog);
   expect(resumed).toEqual(original);
  }
  session.finishPresentation(presentation.token);
 }
 expect(session.phase).toBe('ended');const completed=completeRunBattle(snapshot,session.state,runContext);assert(completed.ok);
 expect(completed.state.activeBattle).toBeNull();expect(completed.state.battlefield).toBeNull();
 const encoded=encodeRunSave(completed.state,runContext);assert(encoded.ok);expect(decodeRunSave(encoded.text,runContext)).toEqual(completed);
},120000);
