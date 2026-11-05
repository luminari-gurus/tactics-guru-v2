import { assert, expect, it, vi } from 'vitest';
import { createRunBattle, freshRunSnapshot, replayRunBattle } from '../../src/domain/runBattle';
import { BattleSession } from '../../src/app/BattleSession';
import { RunItemSession } from '../../src/app/RunItemSession';
import { createRunStorage, RUN_STORAGE_KEYS } from '../../src/persistence/runStorage';
import * as runStorage from '../../src/persistence/runStorage';
import { preparedSnapshot, runContext } from '../helpers/runItemFixtures';
import { playerDecision } from '../helpers/playerPolicy';
import { planEnemyTurn } from '../../src/domain/ai';
import { dispatch, previewDraught, replayBattle, replayCommandSequence } from '../../src/domain/turns';
import { encodeBattleSave } from '../../src/domain/saveEnvelope';
import { decodeRunSave, readRunSnapshot } from '../../src/domain/runSaveEnvelope';
import { BASE_REPLAY_FORMAT_VERSION } from '../../src/domain/constants';
import { previousItemCatalog } from '../../src/content/items';

function memory(fail?: (key:string)=>void) {
 const data = new Map<string,string>();
 const storage = createRunStorage(runContext,()=>({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{fail?.(k);data.delete(k);}}));
 return {data,storage};
}
function fight(session:BattleSession, wait=false) {
 for(let i=0;i<500 && session.phase!=='ended';i++) {
  const step=session.phase==='enemy'?session.nextEnemy():(session.prepare(wait?{type:'endTurn',unitId:session.active.id}:playerDecision(session.state,session.catalog)),session.confirm());
  assert(step);session.finishPresentation(step.token);
 }
 expect(session.phase).toBe('ended');
}
it('commits the last draught once, retries the exact failed write and continues without replenishing', () => {
 const prepared=preparedSnapshot(), stack={itemId:'item:healing_draught',quantity:1} as const;
 const entry={...prepared,items:{...prepared.items,ownership:{...prepared.items.ownership,consumables:[stack]}}};
 const data=new Map<string,string>();let failWrite=false;
 const storage=createRunStorage(runContext,()=>({getItem:k=>data.get(k)??null,
  setItem:(k,v)=>{if(failWrite)throw Error('write blocked');data.set(k,v);},removeItem:k=>{data.delete(k);}}));
 const run=new RunItemSession(entry,runContext,storage);
 const battle=run.startEncounter();assert(battle);
 while(battle.phase==='enemy'){const step=battle.nextEnemy();assert(step);battle.finishPresentation(step.token);}
 const before=battle.state,actor=battle.active;assert(actor.side==='player');
 const command={type:'drinkDraught',unitId:actor.id} as const;
 const preview=previewDraught(before,command,battle.catalog);assert(preview.ok);
 expect(preview).toMatchObject({healing:6,hp:actor.hp+6,remaining:1});
 expect(run.snapshot.activeBattle).toEqual(before);
 expect(dispatch(before,{...command,unitId:64},battle.catalog)).toEqual({ok:false,reason:'unknownUnit'});
 expect(dispatch(before,{...command,target:{unitId:actor.id}},battle.catalog)).toEqual({ok:false,reason:'malformedCommand'});
 const enemy=before.units.find(unit=>unit.side==='enemy')!;
 const enemyUse={...command,unitId:enemy.id};
 expect(dispatch(before,enemyUse,battle.catalog)).toEqual({ok:false,reason:'notActiveUnit'});
 expect(dispatch({...before,activeIndex:before.initiative.indexOf(enemy.id)},enemyUse,battle.catalog)).toEqual({ok:false,reason:'noDraught'});
 const full={...before,units:before.units.map(u=>u.id===actor.id?{...u,hp:battle.catalog.heroes[actor.defId].stats.maxHp}:u)};
 expect(previewDraught(full,command,battle.catalog)).toEqual({ok:false,reason:'fullHealth'});
 const nearlyFull={...full,units:full.units.map(unit=>unit.id===actor.id?{...unit,hp:unit.hp-2}:unit)};
 expect(previewDraught(nearlyFull,command,battle.catalog)).toMatchObject({ok:true,healing:2,hp:battle.catalog.heroes[actor.defId].stats.maxHp});
 const priorRaw=data.get(RUN_STORAGE_KEYS.primary)!;
 failWrite=true;
 expect(battle.prepare(command).ok).toBe(true);
 const used=battle.confirm();assert(used);
 expect(battle.confirm()).toBeNull();
 expect(run.hasUnsavedProgress).toBe(true);expect(data.get(RUN_STORAGE_KEYS.primary)).toBe(priorRaw);
 expect(used.after.rng).toEqual(before.rng);
 expect(used.after.units.find(u=>u.id===actor.id)).toEqual({...actor,hp:preview.hp,hasActed:true});
 expect(used.events).toEqual([{type:'healed',unitId:actor.id,hp:preview.hp,healing:6}]);
 expect(run.snapshot.items.ownership.consumables).toEqual([stack]);
 const replay=battle.replay!;
 expect(replayRunBattle(replay,entry.items,runContext)).toEqual({ok:true,state:used.after,events:battle.events});
 const {battlefield:__,...standaloneReplay}=replay;
 expect(replayBattle(standaloneReplay,battle.catalog).ok).toBe(false);
 expect(encodeBattleSave(used.after,battle.catalog).ok).toBe(false);
 const {draughts:_,...legacyInitial}=replay.initial;
 const legacy={...replay,format:BASE_REPLAY_FORMAT_VERSION,initial:legacyInitial,commands:replay.commands.filter(c=>c.type!=='drinkDraught')};
 expect(replayRunBattle(legacy,entry.items,runContext).ok).toBe(true);
 for(const draughts of [{stock:2,used:used.after.draughts!.used},{stock:1,used:{fighter:1,ranger:1,mage:0}},{stock:1,used:{fighter:0,ranger:0,mage:1}}])
  expect(readRunSnapshot({...run.snapshot,activeBattle:{...used.after,draughts}},runContext).ok).toBe(false);
 failWrite=false;
 expect(run.save().ok).toBe(true);
 const checkpoint=data.get(RUN_STORAGE_KEYS.backup)!;
 expect(JSON.parse(checkpoint)).toMatchObject({format:8,payload:{activeBattle:null}});
 expect(JSON.parse(data.get(RUN_STORAGE_KEYS.primary)!).format).toBe(9);
 expect(run.save().ok).toBe(true);
 expect(data.get(RUN_STORAGE_KEYS.backup)).toBe(checkpoint);
 expect(decodeRunSave(data.get(RUN_STORAGE_KEYS.primary)!,runContext)).toEqual({ok:true,state:run.snapshot});
 const restoredRun=new RunItemSession(entry,runContext,storage);
 expect(restoredRun.continue(restoredRun.inspect())).toBe(true);
 const restored=restoredRun.startEncounter();assert(restored);
 expect(restored.state).toEqual(used.after);
 expect(restored.prepare(command)).toEqual({ok:false,reason:'noDraught'});
 fight(restored,true);
 const continuation=restored.continuation!;
 expect(replayCommandSequence(continuation.snapshot,continuation.commands,restored.catalog)).toEqual({ok:true,state:restored.state,events:continuation.events});
 expect(restoredRun.snapshot.items.ownership.consumables).toEqual([]);
 expect(restoredRun.snapshot.items.run.phase).toBe('defeat');
 expect(JSON.parse(data.get(RUN_STORAGE_KEYS.primary)!).format).toBe(8);
 expect(data.get(RUN_STORAGE_KEYS.backup)).toBe(checkpoint);
 expect(restoredRun.startEncounter()).toBeNull();
// Includes a complete legal defeat and exact continuation replay.
},20000);
it('constructs all survivor subsets with fresh flags/RNG and carried HP, rejects invalid starts',()=>{
 const original=JSON.stringify(runContext.catalog);
 for(let mask=1;mask<8;mask++) {
  const prepared=preparedSnapshot();
  const items={...prepared.items,run:{...prepared.items.run,party:prepared.items.run.party.map((h,i)=>({...h,hp:mask&(1<<i)?1:0}))}};
  const created=createRunBattle(items,runContext);assert(created.ok);
  expect(created.state.units.filter(u=>u.side==='player').map(u=>u.defId)).toEqual(items.run.party.filter(h=>h.hp).map(h=>h.heroId));
  expect(created.state.units.filter(u=>u.side==='player').every(u=>u.hp===1 && !u.hasMoved && !u.hasActed && !u.guarded)).toBe(true);
  expect(created.state.commandCount).toBe(0);expect(created.state.round).toBe(1);
 }
 expect(createRunBattle({...freshRunSnapshot('fresh',1,runContext).items,run:{bad:1}},runContext).ok).toBe(false);
 const preparationOnly=createRunBattle(preparedSnapshot().items,{...runContext,items:previousItemCatalog});
 assert(preparationOnly.ok);expect(preparationOnly.state.draughts).toBeUndefined();
 expect(JSON.stringify(runContext.catalog)).toBe(original);
});
it('run-specific replay rejects altered HP/initiative/seed and preserves exact continuation',()=>{
 const entry=preparedSnapshot().items;const made=BattleSession.fromRun(entry,runContext);assert(made.ok);const session=made.session;
 const step=session.phase==='enemy'?session.nextEnemy():(session.prepare(playerDecision(session.state,session.catalog)),session.confirm());assert(step);session.finishPresentation(step.token);
 const replay=session.replay!;const repeated=replayRunBattle(replay,entry,runContext);assert(repeated.ok);expect(repeated.state).toEqual(session.state);expect(repeated.events).toEqual(session.events);
 for(const initial of [{...replay.initial,seed:99},{...replay.initial,initiative:[...replay.initial.initiative].reverse()},{...replay.initial,units:replay.initial.units.map(u=>u.side==='player'?{...u,hp:u.hp+1}:u)}])expect(replayRunBattle({...replay,initial},entry,runContext).ok).toBe(false);
 const restored=BattleSession.fromSnapshot(session.catalog,session.state);assert(restored.ok);
 const command=session.phase==='enemy'?planEnemyTurn(session.state,session.active.id,session.catalog):{ok:true as const,commands:[playerDecision(session.state,session.catalog)]};assert(command.ok);
 expect(dispatch(session.state,command.commands[0],session.catalog)).toEqual(dispatch(restored.session.state,command.commands[0],restored.session.catalog));
});
it('owned legal defeat commits once, rejects obsolete sessions, restores boundaries and resets safely',()=>{
 // Explicit near-defeat entry boundary: this case tests ownership/save lifecycle,
 // not a full-health playthrough (covered by the representative-run case below).
 // All defeat commands still pass through the real battle/session/storage code.
 const prepared=preparedSnapshot();
 const injured={...prepared,items:{...prepared.items,run:{...prepared.items.run,
  party:prepared.items.run.party.map(hero=>({...hero,hp:hero.heroId==='fighter'?1:0})),
 }}};
 const {storage,data}=memory();const saves=vi.spyOn(storage,'save');
 const controller=new RunItemSession(injured,runContext,storage);
 const battle=controller.startEncounter()!;expect(controller.startEncounter()).toBe(battle);
 expect(battle.state.units.filter(unit=>unit.side==='player').map(unit=>unit.hp)).toEqual([1]);
 fight(battle,true);expect(controller.snapshot.items.run.phase).toBe('defeat');expect(controller.snapshot.activeBattle).toBeNull();
 const ended=controller.snapshot;const saveCount=saves.mock.calls.length;
 expect(ended.items.run.revision).toBe(injured.items.run.revision+1);
 expect(battle.nextEnemy()).toBeNull();expect(controller.snapshot).toEqual(ended);expect(saves).toHaveBeenCalledTimes(saveCount);
 const restored=new RunItemSession(freshRunSnapshot('placeholder',2,runContext),runContext,storage);const load=restored.inspect();assert(load.ok);expect(restored.continue(load)).toBe(true);expect(restored.snapshot).toEqual(ended);
 const review=controller.inspect();expect(controller.replace(review,'new-legal',2)).toBe(true);expect(controller.snapshot.items.run.encounterIndex).toBe(0);expect(controller.snapshot.items.ownership.equipment).toEqual([]);
 expect(controller.replace(review,'another',3)).toBe(false);expect(controller.snapshot.items.run.seed).toBe(2);expect(battle.phase).toBe('disposed');
 expect(data.has(RUN_STORAGE_KEYS.primary)).toBe(true);controller.dispose();expect(controller.startEncounter()).toBeNull();
});
it('active restore preserves entry HP and next RNG while partial reset preserves live state and exportable bytes',()=>{
 let fail=false;const {storage,data}=memory(k=>{if(fail && k===RUN_STORAGE_KEYS.primary)throw Error('denied');});
 const controller=new RunItemSession(preparedSnapshot(),runContext,storage);const battle=controller.startEncounter()!;
 const step=battle.phase==='enemy'?battle.nextEnemy():(battle.prepare(playerDecision(battle.state,battle.catalog)),battle.confirm());assert(step);battle.finishPresentation(step.token);
 const saved=controller.snapshot;const restored=new RunItemSession(preparedSnapshot(),runContext,storage);const review=restored.inspect();assert(review.ok);assert(restored.continue(review));const loaded=restored.startEncounter()!;
 expect(loaded.state).toEqual(saved.activeBattle);expect(loaded.replay).toBeNull();expect(loaded.events).toEqual([]);
 const reset=controller.inspect();const bytes=[...data.values()];fail=true;expect(controller.replace(reset,'replacement',4)).toBe(false);expect(controller.snapshot).toEqual(saved);expect(controller.status).toContain('Reset incomplete');expect(controller.recoveryTexts(controller.inspect()).map(v=>v.text)).toEqual(expect.arrayContaining(bytes));
});
it('replays a legal representative run to a reproducible terminal outcome',()=>{
 let completed=false;
 for(let seed=13;seed<=13 && !completed;seed++) {
  const {storage}=memory();const controller=new RunItemSession(freshRunSnapshot('legal-run',seed,runContext),runContext,storage);
  const results=[];
  for(let index=0;index<3;index++) {
   const entry=controller.snapshot.items;const battle=controller.startEncounter()!;fight(battle);const replay=replayRunBattle(battle.replay,entry,runContext);assert(replay.ok);expect(replay.state).toEqual(battle.state);
   results.push({index,hp:controller.snapshot.items.run.party});
   if(controller.snapshot.items.run.phase==='defeat')break;
   const offer=controller.snapshot.items.offer;
   if(offer){const choice=offer.options.find(o=>o.itemId==='item:healing_draught')??offer.options[0];assert(controller.dispatch({...controller.boundary(),type:'claimReward',offerId:offer.id,itemId:choice.itemId}).ok);
    for(const equipment of controller.snapshot.items.ownership.equipment){if(controller.snapshot.items.ownership.assignments.some(a=>a.instanceId===equipment.instanceId))continue;const def=runContext.items[equipment.itemId];const hero=controller.snapshot.items.run.party.find(h=>h.hp>0 && def.eligibleHeroes.includes(h.heroId));if(hero && def.kind==='equipment')controller.dispatch({...controller.boundary(),type:'equipItem',instanceId:equipment.instanceId,heroId:hero.heroId,slot:def.slot});}
    for(const hero of controller.snapshot.items.run.party)if(hero.hp>0 && controller.snapshot.items.ownership.consumables.length)controller.dispatch({...controller.boundary(),type:'useItem',itemId:'item:healing_draught',heroId:hero.heroId});
   }
  }
  expect(['victory','defeat']).toContain(controller.snapshot.items.run.phase);completed=true;
  if(controller.snapshot.items.run.phase==='victory')expect(results).toHaveLength(3);
 }
 expect(completed).toBe(true);
},120000);
it('projects equipped stats once and rejects replays with a different equipped entry',()=>{
 const prepared=preparedSnapshot();const equipment=prepared.items.ownership.equipment[0];
 const entry={...prepared.items,ownership:{...prepared.items.ownership,assignments:[{heroId:'fighter' as const,slot:'charm' as const,instanceId:equipment.instanceId}]}};
 const first=createRunBattle(entry,runContext),again=createRunBattle(entry,runContext);assert(first.ok);assert(again.ok);
 expect(first.catalog.heroes.fighter.stats.armorClass).toBe(runContext.catalog.heroes.fighter.stats.armorClass+1);expect(again).toEqual(first);
 const session=BattleSession.fromRun(entry,runContext);assert(session.ok);expect(replayRunBattle(session.session.replay,prepared.items,runContext).ok).toBe(false);
});
it('plays a complete transient run and restarts without acquiring save storage',()=>{
 const acquire=vi.spyOn(runStorage,'createRunStorage').mockImplementation(()=>{throw Error('Unexpected save provider');});
 try {
  const controller=new RunItemSession(freshRunSnapshot('testing-run',13,runContext),runContext,null);
  for(let index=0;index<3;index++) {
   const entry=controller.snapshot.items,battle=controller.startEncounter();assert(battle);fight(battle);
   const replay=replayRunBattle(battle.replay,entry,runContext);assert(replay.ok);expect(replay.state).toEqual(battle.state);
   if(controller.snapshot.items.run.phase==='defeat')break;
   const offer=controller.snapshot.items.offer;
   if(offer){
    const choice=offer.options.find(o=>o.itemId==='item:healing_draught')??offer.options[0];
    assert(controller.dispatch({...controller.boundary(),type:'claimReward',offerId:offer.id,itemId:choice.itemId}).ok);
    for(const hero of controller.snapshot.items.run.party)if(hero.hp>0 && controller.snapshot.items.ownership.consumables.length)controller.dispatch({...controller.boundary(),type:'useItem',itemId:'item:healing_draught',heroId:hero.heroId});
   }
  }
  expect(['victory','defeat']).toContain(controller.snapshot.items.run.phase);
  expect(controller.hasUnsavedProgress).toBe(false);expect(controller.status).toContain('resets on reload');
  const old=controller.activeSession;
  expect(controller.restart('testing-restart',14)).toBe(true);
  expect(old?.phase).toBe('disposed');expect(controller.snapshot).toEqual(freshRunSnapshot('testing-restart',14,runContext));
  expect(controller.save()).toEqual({ok:false,reason:'transient'});
  expect(()=>controller.inspect()).toThrow('no save storage');expect(acquire).not.toHaveBeenCalled();
  controller.dispose();expect(controller.restart('disposed',15)).toBe(false);
 } finally {acquire.mockRestore();}
},120000);
it('reconciles a validated ended active snapshot on Continue once without old commands',()=>{
 const made=BattleSession.fromRun(freshRunSnapshot('ended',1,runContext).items,runContext);assert(made.ok);fight(made.session,true);
 const snapshot={...freshRunSnapshot('ended',1,runContext),activeBattle:made.session.state,battlefield:made.session.battlefield};
 const {storage}=memory();const controller=new RunItemSession(snapshot,runContext,storage);
 expect(controller.startEncounter()).toBeNull();expect(controller.snapshot.items.run.phase).toBe('defeat');
 const after=controller.snapshot;expect(controller.startEncounter()).toBeNull();expect(controller.snapshot).toEqual(after);
});

it('ties replay descriptors to canonical generated and authored starts',()=>{
 for(const index of [0,1,2]){
  const prepared=index===0?freshRunSnapshot('replay-source',13,runContext):preparedSnapshot();const items={...prepared.items,run:{...prepared.items.run,encounterIndex:index,revision:index*2}};
  const made=BattleSession.fromRun(items,runContext);assert(made.ok);
  const replay=made.session.replay!;expect(replayRunBattle(replay,items,runContext).ok).toBe(true);
  expect(replayRunBattle({...replay,battlefield:{...replay.battlefield,mapHash:'sha256:'+'0'.repeat(64)}},items,runContext).ok).toBe(false);
 }
});
