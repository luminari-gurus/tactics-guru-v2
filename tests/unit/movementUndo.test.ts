import { expect, it, vi } from 'vitest';
import * as grid from '../../src/domain/grid';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { previewMovement, moveUnit } from '../../src/domain/grid';
import { undoRecordedMove } from '../../src/domain/movementUndo';

it('only reverses the exact immediately preceding player move without consuming RNG', () => {
  const session=new BattleSession(catalog,'map:forest_ruins',2);
  while(session.phase==='enemy') {const step=session.nextEnemy()!;session.finishPresentation(step.token);}
  const before=session.state, reach=previewMovement(before,session.active.id,catalog);
  expect(reach.ok).toBe(true); if(!reach.ok)return;
  const move={type:'move' as const,unitId:session.active.id,to:reach.cells.find(c=>c.cost>0)!.cell};
  const moved=moveUnit(before,move,catalog);expect(moved.ok).toBe(true);if(!moved.ok)return;
  const undo=undoRecordedMove(before,moved.state,move,catalog);
  expect(undo.ok).toBe(true);
  if(undo.ok){expect(undo.state).toEqual({...before,commandCount:before.commandCount+2});expect(undo.state.rng).toEqual(before.rng);expect(undo.events).toEqual([{type:'moveUndone',unitId:move.unitId,path:[move.to,before.units.find(u=>u.id===move.unitId)!.cell]}]);}
  expect(undoRecordedMove(before,{...moved.state,commandCount:moved.state.commandCount+1},move,catalog).ok).toBe(false);
  expect(undoRecordedMove(before,before,move,catalog).ok).toBe(false);
  const spy=vi.spyOn(grid,'moveUnit').mockReturnValue({...moved,events:[...moved.events,{type:'damaged',unitId:move.unitId,damage:1,hp:1}]});
  try { expect(undoRecordedMove(before,moved.state,move,catalog).ok).toBe(false); } finally {spy.mockRestore();}
  const affected={...moved.state,units:moved.state.units.map(u=>u.id===move.unitId?{...u,hp:u.hp-1}:u)};
  expect(undoRecordedMove(before,affected,move,catalog).ok).toBe(false);
  expect(undoRecordedMove({...before,units:before.units.map(u=>u.id===move.unitId?{...u,hasActed:true}:u)},moved.state,move,catalog).ok).toBe(false);
});

it('records an undo that replays and is unavailable after reload or a later action', async () => {
  const {replayBattle}=await import('../../src/domain/turns');
  const session=new BattleSession(catalog,'map:forest_ruins',2);
  while(session.phase==='enemy') {const step=session.nextEnemy()!;session.finishPresentation(step.token);}
  const initial=session.state, reach=previewMovement(initial,session.active.id,catalog);expect(reach.ok).toBe(true);if(!reach.ok)return;
  const move={type:'move' as const,unitId:session.active.id,to:reach.cells.find(c=>c.cost>0)!.cell};
  expect(session.prepare(move).ok).toBe(true);const moved=session.confirm()!;
  expect(session.canUndoMove).toBe(false);session.finishPresentation(moved.token);expect(session.canUndoMove).toBe(true);
  const resumed=BattleSession.fromSnapshot(catalog,session.state);expect(resumed.ok).toBe(true);
  if(resumed.ok)expect(resumed.session.canUndoMove).toBe(false);
  session.error='invalidState';
  const undo=session.undoMove();expect(undo).not.toBeNull();expect(session.error).toBeNull();expect(session.undoMove()).toBeNull();
  session.finishPresentation(undo!.token);expect(session.canUndoMove).toBe(false);
  expect(session.state).toEqual({...initial,commandCount:initial.commandCount+2});
  const result=replayBattle(session.replay,catalog);expect(result.ok).toBe(true);
  if(result.ok){expect(result.state).toEqual(session.state);expect(result.events).toEqual(session.events);}
  expect(session.prepare(move).ok).toBe(true);const next=session.confirm()!;session.finishPresentation(next.token);
  expect(session.canUndoMove).toBe(true);expect(session.prepare({type:'endTurn',unitId:session.active.id}).ok).toBe(true);
  const end=session.confirm()!;session.finishPresentation(end.token);expect(session.canUndoMove).toBe(false);
});

it('rejects forged, repeated and old-format undo records', async () => {
  const {replayBattle}=await import('../../src/domain/turns');
  const {readReplay}=await import('../../src/domain/battle');
  const {REPLAY_FORMAT_VERSION}=await import('../../src/domain/constants');
  const session=new BattleSession(catalog,'map:forest_ruins',2);
  while(session.phase==='enemy') {const step=session.nextEnemy()!;session.finishPresentation(step.token);}
  const reach=previewMovement(session.state,session.active.id,catalog);expect(reach.ok).toBe(true);if(!reach.ok)return;
  const move={type:'move' as const,unitId:session.active.id,to:reach.cells.find(c=>c.cost>0)!.cell};
  session.prepare(move);const moved=session.confirm()!;session.finishPresentation(moved.token);
  const beforeUndo=session.replay!;
  const undo={type:'undoMove' as const,unitId:move.unitId};
  expect(readReplay({...beforeUndo,commands:[...beforeUndo.commands,undo]},catalog).ok).toBe(false);
  const forged={...beforeUndo,format:REPLAY_FORMAT_VERSION,commands:[...beforeUndo.commands,{...undo,unitId:move.unitId+100}]};
  expect(replayBattle(forged,catalog).ok).toBe(false);
  const repeated={...beforeUndo,format:REPLAY_FORMAT_VERSION,commands:[...beforeUndo.commands,undo,undo]};
  expect(replayBattle(repeated,catalog).ok).toBe(false);
});

it('publishes the restored state through the existing battle save boundary', async () => {
  const {encodeBattleSave,decodeBattleSave}=await import('../../src/domain/saveEnvelope');
  let saved='';
  const session=new BattleSession(catalog,'map:forest_ruins',2,state=>{const encoded=encodeBattleSave(state,catalog);if(encoded.ok)saved=encoded.text;});
  while(session.phase==='enemy') {const step=session.nextEnemy()!;session.finishPresentation(step.token);}
  const before=session.state,reach=previewMovement(before,session.active.id,catalog);expect(reach.ok).toBe(true);if(!reach.ok)return;
  const move={type:'move' as const,unitId:session.active.id,to:reach.cells.find(c=>c.cost>0)!.cell};
  session.prepare(move);const moved=session.confirm()!;session.finishPresentation(moved.token);
  const undone=session.undoMove()!;session.finishPresentation(undone.token);
  const decoded=decodeBattleSave(saved,catalog);expect(decoded.ok).toBe(true);
  if(decoded.ok){
    expect(decoded.state).toEqual(session.state);
    const resumed=BattleSession.fromSnapshot(catalog,decoded.state);expect(resumed.ok).toBe(true);
    if(resumed.ok)expect(resumed.session.canUndoMove).toBe(false);
  }
});

it('replays and saves undo in a run battle without changing its entry state', async () => {
  const {freshRunSnapshot,replayRunBattle}=await import('../../src/domain/runBattle');
  const {encodeRunSave,decodeRunSave}=await import('../../src/domain/runSaveEnvelope');
  const {runContext}=await import('../helpers/runItemFixtures');
  const entry=freshRunSnapshot('undo-run',2,runContext).items;
  const made=BattleSession.fromRun(entry,runContext);expect(made.ok).toBe(true);if(!made.ok)return;
  const s=made.session;while(s.phase==='enemy'){const step=s.nextEnemy()!;s.finishPresentation(step.token);}
  const reach=previewMovement(s.state,s.active.id,s.catalog);expect(reach.ok).toBe(true);if(!reach.ok)return;
  const destination=reach.cells.find(c=>c.cost>0);expect(destination).toBeDefined();if(!destination)return;
  const move={type:'move' as const,unitId:s.active.id,to:destination.cell};s.prepare(move);const moved=s.confirm()!;s.finishPresentation(moved.token);
  const undone=s.undoMove()!;s.finishPresentation(undone.token);
  const replay=replayRunBattle(s.replay,entry,runContext);expect(replay.ok).toBe(true);
  if(replay.ok){expect(replay.state).toEqual(s.state);expect(replay.events).toEqual(s.events);}
  const saved=encodeRunSave({items:entry,activeBattle:s.state,battlefield:s.battlefield},runContext);expect(saved.ok).toBe(true);
  if(saved.ok){const loaded=decodeRunSave(saved.text,runContext);expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.state.activeBattle).toEqual(s.state);}
});

it('retains the restored position in a dungeon save and reconstructs its history', async () => {
  const {freshDungeon,startDungeonBattle,dungeonBattle}=await import('../../src/domain/dungeon');
  const {atEncounter}=await import('../helpers/dungeonFixtures');
  const {encodeDungeon,decodeDungeon}=await import('../../src/domain/dungeonSaveEnvelope');
  const {replayCommandSequence}=await import('../../src/domain/turns');
  const started=startDungeonBattle(atEncounter(freshDungeon('undo-dungeon',190)));expect(started.ok).toBe(true);if(!started.ok)return;
  const built=dungeonBattle(started.state)!;
  const s=new BattleSession(built.catalog,started.state.activeBattle!,started.state.activeBattle!.seed,undefined,true,built.battlefield);
  while(s.phase==='enemy'){const step=s.nextEnemy()!;s.finishPresentation(step.token);}
  const reach=previewMovement(s.state,s.active.id,s.catalog);expect(reach.ok).toBe(true);if(!reach.ok)return;
  const destination=reach.cells.find(c=>c.cost>0);expect(destination).toBeDefined();if(!destination)return;
  const move={type:'move' as const,unitId:s.active.id,to:destination.cell};s.prepare(move);const moved=s.confirm()!;s.finishPresentation(moved.token);
  const undo=s.undoMove()!;s.finishPresentation(undo.token);
  const replay=replayCommandSequence(s.replay!.initial,s.replay!.commands,s.catalog);expect(replay.ok).toBe(true);
  if(replay.ok){expect(replay.state).toEqual(s.state);expect(replay.events).toEqual(s.events);}
  const saved=encodeDungeon({...started.state,activeBattle:s.state});expect(saved.ok).toBe(true);
  if(saved.ok){const loaded=decodeDungeon(saved.text);expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.state.activeBattle).toEqual(s.state);}
});

it('does not offer undo for a move made after an accepted action', async () => {
  const {previewAbility}=await import('../../src/domain/combat');
  const original=new BattleSession(catalog,'map:forest_ruins',2).state;
  const hero=original.units.find(u=>u.defId==='fighter')!,enemy=original.units.find(u=>u.side==='enemy')!;
  const ability={type:'useAbility' as const,unitId:hero.id,abilityId:'ability:basic_attack' as const,target:{unitId:enemy.id}};
  let verified=false;
  for(const tile of catalog.maps[original.mapId].cells){
    if(!catalog.terrains[tile.terrainId].walkable || original.units.some(u=>u.id!==enemy.id&&u.hp>0&&u.cell.x===tile.x&&u.cell.y===tile.y))continue;
    const state={...original,activeIndex:original.initiative.indexOf(hero.id),units:original.units.map(u=>u.id===enemy.id?{...u,cell:{x:tile.x,y:tile.y}}:u)};
    if(!previewAbility(state,ability,catalog).ok)continue;
    const s=new BattleSession(catalog,state,state.seed);s.prepare(ability);const attack=s.confirm()!;s.finishPresentation(attack.token);
    if(s.phase!=='player')continue;
    const reach=previewMovement(s.state,hero.id,catalog);if(!reach.ok)continue;const cell=reach.cells.find(c=>c.cost>0);if(!cell)continue;
    expect(s.prepare({type:'move',unitId:hero.id,to:cell.cell}).ok).toBe(true);
    const moved=s.confirm()!;s.finishPresentation(moved.token);expect(s.canUndoMove).toBe(false);expect(s.undoMove()).toBeNull();verified=true;break;
  }
  expect(verified).toBe(true);
});

it('does not offer undo when the accepted move exhausts the command limit', async () => {
  const {RULE_BOUNDS}=await import('../../src/domain/constants');
  const initial=new BattleSession(catalog,'map:forest_ruins',2).state;
  const hero=initial.units.find(u=>u.side==='player')!;
  const state={...initial,activeIndex:initial.initiative.indexOf(hero.id),commandCount:RULE_BOUNDS.commandCount.max-1};
  const session=new BattleSession(catalog,state,state.seed),reach=previewMovement(session.state,hero.id,catalog);
  expect(reach.ok).toBe(true);if(!reach.ok)return;
  const cell=reach.cells.find(c=>c.cost>0);expect(cell).toBeDefined();if(!cell)return;
  expect(session.prepare({type:'move',unitId:hero.id,to:cell.cell}).ok).toBe(true);
  const move=session.confirm()!;session.finishPresentation(move.token);
  expect(session.canUndoMove).toBe(false);expect(session.undoMove()).toBeNull();
});
