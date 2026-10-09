import type { ContentCatalog, MapId } from '../content/types';
import { contentVersion, previewCommand, readBattleState, readReplay, type ReplayRead } from './battle';
import { resolveAttack } from './combat';
import { canonical } from './contentIdentity';
import { D20_SIDES, RNG_VERSION, RULES_VERSION, RULE_BOUNDS, STATE_FORMAT_VERSION } from './constants';
import { moveUnit } from './grid';
import { isIntegerIn, rollDie, seedRng } from './rng';
import type { BattleEvent, BattleState, CommandResult, RejectionReason, UnitState } from './types';

export type InitiativeEntry = { readonly unitId: number; readonly side: UnitState['side']; readonly natural: number; readonly dexterity: number };
/** Legacy TurnManager.gd:101-108: total, Dexterity, player side, lower ID. IDs are unique, so the order is total. */
export function orderInitiative(entries: readonly InitiativeEntry[]): number[] {
  return [...entries].sort((a, b) => (b.natural + b.dexterity) - (a.natural + a.dexterity) || b.dexterity - a.dexterity ||
    Number(b.side === 'player') - Number(a.side === 'player') || a.unitId - b.unitId).map(e => e.unitId);
}
/**
 * Fresh battle at the replay `initial` boundary: one d20 + Dexterity per unit, rolled in ID order. Restart is a new
 * battle too (D7): the session calls this with a new seed, where legacy reused the seed (BattleController.gd:124,1336-1346).
 */
export function createBattle(mapId: MapId, seed: number, catalog: ContentCatalog): CommandResult {
  if (!isIntegerIn(seed, RULE_BOUNDS.uint32) || !Object.hasOwn(catalog.maps, mapId)) return { ok: false, reason: 'invalidState' };
  const units: UnitState[] = [...catalog.maps[mapId].spawns].sort((a, b) => a.id - b.id).map(s => {
    const common = { id: s.id, cell: { x: s.x, y: s.y }, hasMoved: false, hasActed: false };
    return s.side === 'heroes' ? { ...common, side: 'player', defId: s.unitId, hp: catalog.heroes[s.unitId].stats.maxHp }
      : { ...common, side: 'enemy', defId: s.unitId, hp: catalog.enemies[s.unitId].stats.maxHp };
  });
  let rng = seedRng(seed);
  const rolls = units.map(u => {
    const roll = rollDie(rng, D20_SIDES); rng = roll.rng;
    const stats = u.side === 'player' ? catalog.heroes[u.defId].stats : catalog.enemies[u.defId].stats;
    return { unitId: u.id, side: u.side, natural: roll.value, dexterity: stats.dexterity };
  });
  const initiative = orderInitiative(rolls);
  const checked = readBattleState({ format: STATE_FORMAT_VERSION, versions: { rules: RULES_VERSION, rng: RNG_VERSION, content: contentVersion(catalog) },
    seed, rng, mapId, units, initiative, activeIndex: 0, round: RULE_BOUNDS.round.min, outcome: 'ongoing', commandCount: 0 }, catalog);
  if (!checked.ok) return checked;
  return { ok: true, state: checked.state, events: [
    ...rolls.map((r): BattleEvent => ({ type: 'initiativeRolled', unitId: r.unitId, natural: r.natural, total: r.natural + r.dexterity })),
    { type: 'turnStarted', unitId: initiative[0], round: checked.state.round },
  ] };
}
/**
 * Wait: the only way a turn ends, for both sides. Advances past defeated units, adding a round on each wrap,
 * and clears the next unit's flags. An ongoing battle has a living unit on each side, so this ends within one wrap.
 */
export function endTurn(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const intent = previewCommand(state, input, catalog); if (!intent.ok) return intent;
  if (intent.command.type !== 'endTurn') return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state;
  if (snapshot.commandCount === RULE_BOUNDS.commandCount.max) return { ok: false, reason: 'invalidState' };
  let index = snapshot.activeIndex, round = snapshot.round;
  do {
    index = (index + 1) % snapshot.initiative.length;
    if (index === 0) {
      if (round === RULE_BOUNDS.round.max) return { ok: false, reason: 'invalidState' };
      round++;
    }
  } while (snapshot.units.find(u => u.id === snapshot.initiative[index])!.hp === 0);
  const next = snapshot.initiative[index];
  return { ok: true, state: { ...snapshot, activeIndex: index, round, commandCount: snapshot.commandCount + 1,
    units: snapshot.units.map(u => u.id === next ? { ...u, hasMoved: false, hasActed: false } : u) },
    events: [{ type: 'turnEnded', unitId: intent.command.unitId }, { type: 'turnStarted', unitId: next, round }] };
}
/** One entry point for every command; the type is read only after the shared intent check. */
export function dispatch(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const intent = previewCommand(state, input, catalog); if (!intent.ok) return intent;
  const resolve = { move: moveUnit, useAbility: resolveAttack, endTurn }[intent.command.type];
  return resolve(state, intent.command, catalog);
}
export type ReplayRun = { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] } | Extract<ReplayRead, { ok: false }> |
  { readonly ok: false; readonly reason: 'invalidReplay'; readonly index: number; readonly rejection: RejectionReason };
/**
 * Re-executes recorded commands from the initial boundary; creation's initiative events are not repeated. `initial` must be
 * exactly the battle its map and seed create, so a replay cannot start from chosen HP, dice, order or flags.
 */
export function replayBattle(input: unknown, catalog: ContentCatalog): ReplayRun {
  const read = readReplay(input, catalog); if (!read.ok) return read;
  const created = createBattle(read.replay.initial.mapId, read.replay.initial.seed, catalog);
  if (!created.ok || canonical(created.state) !== canonical(read.replay.initial)) return { ok: false, reason: 'invalidReplay' };
  let state = created.state; const events: BattleEvent[] = [];
  for (const [index, command] of read.replay.commands.entries()) {
    const result = dispatch(state, command, catalog);
    if (!result.ok) return { ok: false, reason: 'invalidReplay', index, rejection: result.reason };
    state = result.state; events.push(...result.events);
  }
  return { ok: true, state, events };
}
