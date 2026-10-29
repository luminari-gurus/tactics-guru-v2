import { expect, it } from 'vitest';
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
  if(undo.ok){expect(undo.state).toEqual({...before,commandCount:before.commandCount+2});expect(undo.state.rng).toEqual(before.rng);expect(undo.events).toEqual([]);}
  expect(undoRecordedMove(before,{...moved.state,commandCount:moved.state.commandCount+1},move,catalog).ok).toBe(false);
  expect(undoRecordedMove(before,before,move,catalog).ok).toBe(false);
  expect(undoRecordedMove({...before,units:before.units.map(u=>u.id===move.unitId?{...u,hasActed:true}:u)},moved.state,move,catalog).ok).toBe(false);
});
