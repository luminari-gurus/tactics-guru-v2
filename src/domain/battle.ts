import { CONTENT_BOUNDS, ENEMY_IDS, HERO_IDS } from '../content/constants';
import type { ContentCatalog } from '../content/types';
import { RNG_VERSION, RNG_WARMUP_DRAWS, RULES_VERSION, RULE_BOUNDS, STATE_FORMAT_VERSION, UINT32_RANGE } from './constants';
import { isIntegerIn, isRngState, seedRng } from './rng';
import type { BattleState, Command, CommandPreview, Replay, UnitState, Versions } from './types';
import { hashCatalog } from './contentIdentity';

import { hasShape as shape, isDenseArray } from './validation';
function cell(v: unknown): v is { x: number; y: number } {
  return shape(v, ['x','y']) && isIntegerIn(v.x, CONTENT_BOUNDS.coordinate) && isIntegerIn(v.y, CONTENT_BOUNDS.coordinate);
}
const unitId = (v: unknown): v is number => isIntegerIn(v, CONTENT_BOUNDS.spawnId);
const prefixedId = (v: unknown, prefix: string): v is string => typeof v === 'string' && new RegExp(`^${prefix}:[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`).test(v);
/** Hash an already validated catalog; this is not the content validator owned by #28. */
export function contentVersion(catalog: ContentCatalog): string { return hashCatalog(catalog); }
function versions(v: unknown, content: string): v is Versions {
  return shape(v, ['rules','rng','content']) && v.rules === RULES_VERSION && v.rng === RNG_VERSION && v.content === content;
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export type StateRead = { readonly ok: true; readonly state: BattleState } | { readonly ok: false; readonly reason: 'invalidState' };
/** Untrusted snapshot validation, using only runtime-relevant references in a trusted catalog. */
export function readBattleState(input: unknown, catalog: ContentCatalog): StateRead {
  const bad = { ok: false, reason: 'invalidState' } as const;
  if (!shape(input, ['format','versions','seed','rng','mapId','units','initiative','activeIndex','round','outcome','commandCount']) ||
    input.format !== STATE_FORMAT_VERSION || !versions(input.versions, contentVersion(catalog)) ||
    !isIntegerIn(input.seed, RULE_BOUNDS.uint32) || !isRngState(input.rng) ||
    input.rng.words[3] !== (input.rng.cursor % UINT32_RANGE + RNG_WARMUP_DRAWS + 1) % UINT32_RANGE ||
    !prefixedId(input.mapId, 'map') || !Object.hasOwn(catalog.maps, input.mapId) ||
    !isDenseArray(input.units, CONTENT_BOUNDS.spawnId.max) || input.units.length < 1 ||
    !isDenseArray(input.initiative, CONTENT_BOUNDS.spawnId.max) || input.initiative.length !== input.units.length ||
    !isIntegerIn(input.activeIndex, { min: 0, max: input.units.length - 1 }) ||
    !isIntegerIn(input.round, RULE_BOUNDS.round) || !isIntegerIn(input.commandCount, RULE_BOUNDS.commandCount) ||
    !['ongoing','playerWin','playerLoss'].includes(input.outcome as string)) return bad;
  const map = catalog.maps[input.mapId as keyof typeof catalog.maps];
  if (input.units.length !== map.spawns.length) return bad;
  const ids = new Set<number>(); const occupied = new Set<string>();
  let previous = 0;
  const units: UnitState[] = [];
  for (const u of input.units) {
    if (!shape(u, ['id','defId','side','cell','hp','hasMoved','hasActed']) || !unitId(u.id) || u.id <= previous ||
      !cell(u.cell) || u.cell.x >= map.width || u.cell.y >= map.height ||
      typeof u.hasMoved !== 'boolean' || typeof u.hasActed !== 'boolean') return bad;
    const definition = u.side === 'player' && HERO_IDS.some(id => id === u.defId) ? catalog.heroes[u.defId as keyof typeof catalog.heroes] :
      u.side === 'enemy' && ENEMY_IDS.some(id => id === u.defId) ? catalog.enemies[u.defId as keyof typeof catalog.enemies] : undefined;
    const spawn = map.spawns.find(s => s.id === u.id);
    if (!definition || !spawn || spawn.unitId !== u.defId || (spawn.side === 'heroes' ? 'player' : 'enemy') !== u.side ||
      !isIntegerIn(u.hp, { min: RULE_BOUNDS.hp.min, max: definition.stats.maxHp })) return bad;
    const position = u.cell;
    const tile = map.cells.find(c => c.x === position.x && c.y === position.y);
    if (!tile || (u.hp > 0 && !catalog.terrains[tile.terrainId].walkable)) return bad;
    const key = `${u.cell.x},${u.cell.y}`;
    if (u.hp > 0 && occupied.has(key)) return bad;
    if (u.hp > 0) occupied.add(key);
    ids.add(u.id); previous = u.id;
    units.push(u as unknown as UnitState);
  }
  if (input.initiative.some(id => !unitId(id) || !ids.has(id)) || new Set(input.initiative).size !== ids.size) return bad;
  const activeId = input.initiative[input.activeIndex];
  const active = units.find(u => u.id === activeId)!;
  const livingPlayer = units.some(u => u.side === 'player' && u.hp > 0);
  const livingEnemy = units.some(u => u.side === 'enemy' && u.hp > 0);
  const expectedOutcome = !livingPlayer ? 'playerLoss' : !livingEnemy ? 'playerWin' : 'ongoing';
  if (input.outcome !== expectedOutcome || (input.outcome === 'ongoing' && active.hp === 0)) return bad;
  return { ok: true, state: clone(input) as unknown as BattleState };
}
function isCommand(input: unknown): input is Command {
  if (shape(input, ['type','unitId'])) return input.type === 'endTurn' && unitId(input.unitId);
  if (shape(input, ['type','unitId','to'])) return input.type === 'move' && unitId(input.unitId) && cell(input.to);
  if (!shape(input, ['type','unitId','abilityId','target']) || input.type !== 'useAbility' || !unitId(input.unitId) || !prefixedId(input.abilityId, 'ability')) return false;
  return (shape(input.target, ['unitId']) && unitId(input.target.unitId)) || (shape(input.target, ['cell']) && cell(input.target.cell));
}
/** Foundation intent preview only: NOT movement/ability legality or resolution. No RNG access. */
export function previewCommand(state: unknown, input: unknown, catalog: ContentCatalog): CommandPreview {
  if (!isCommand(input)) return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog);
  if (!checked.ok) return checked;
  if (checked.state.outcome !== 'ongoing') return { ok: false, reason: 'battleOver' };
  const actor = checked.state.units.find(u => u.id === input.unitId);
  if (!actor) return { ok: false, reason: 'unknownUnit' };
  if (actor.hp === 0) return { ok: false, reason: 'unitDefeated' };
  if (checked.state.initiative[checked.state.activeIndex] !== actor.id) return { ok: false, reason: 'notActiveUnit' };
  return { ok: true, command: clone(input) };
}
export type ReplayRead = { readonly ok: true; readonly replay: Replay } | { readonly ok: false; readonly reason: 'invalidReplay' };
/** Accepted log shape is checked, not simulated; replayBattle (turns.ts) re-executes it. */
export function readReplay(input: unknown, catalog: ContentCatalog): ReplayRead {
  const bad = { ok: false, reason: 'invalidReplay' } as const;
  if (!shape(input, ['format','versions','initial','commands']) || input.format !== STATE_FORMAT_VERSION ||
    !isDenseArray(input.commands, RULE_BOUNDS.maxReplayCommands) ||
    !input.commands.every(isCommand)) return bad;
  const checked = readBattleState(input.initial, catalog);
  if (!checked.ok || !versions(input.versions, checked.state.versions.content) || checked.state.commandCount !== 0 || checked.state.round !== RULE_BOUNDS.round.min ||
    (checked.state.rng.cursor === 0 && JSON.stringify(checked.state.rng.words) !== JSON.stringify(seedRng(checked.state.seed).words))) return bad;
  return { ok: true, replay: { format: STATE_FORMAT_VERSION, versions: clone(input.versions), initial: checked.state, commands: clone(input.commands) } };
}
