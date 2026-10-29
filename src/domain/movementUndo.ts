import type { ContentCatalog } from '../content/types';
import { readBattleState } from './battle';
import { canonical } from './contentIdentity';
import { RULE_BOUNDS } from './constants';
import { moveUnit } from './grid';
import type { BattleState, Command, CommandResult } from './types';

/** Reverse only a known immediately preceding safe move. The caller must supply
 * the actual preceding boundary from its accepted history, not user input. */
export function undoRecordedMove(before: BattleState, after: BattleState,
  move: Extract<Command, { type: 'move' }>, catalog: ContentCatalog): CommandResult {
  const prior = readBattleState(before, catalog), current = readBattleState(after, catalog);
  if (!prior.ok || !current.ok) return {ok:false,reason:'invalidState'};
  const actor = prior.state.units.find(u => u.id === move.unitId);
  if (!actor || actor.side !== 'player' || actor.hasActed || actor.hasMoved || current.state.commandCount >= RULE_BOUNDS.commandCount.max)
    return {ok:false,reason:'invalidState'};
  const expected = moveUnit(prior.state, move, catalog);
  if (!expected.ok || expected.events.length !== 1 || expected.events[0].type !== 'moved' ||
    canonical(expected.state) !== canonical(current.state)) return {ok:false,reason:'invalidState'};
  return {ok:true,state:{...prior.state,commandCount:current.state.commandCount+1},
    events:[{type:'moveUndone',unitId:actor.id,path:[move.to,actor.cell]}]};
}
