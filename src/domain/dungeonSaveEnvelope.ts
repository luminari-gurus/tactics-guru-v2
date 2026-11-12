import { HERO_PROGRESSION } from '../content/progression';
import { dungeonIdentity, previousDungeonIdentity } from '../content/dungeon';
import { previousItemCatalog } from '../content/items';
import { canonical, hashJson } from './contentIdentity';
import { readDungeon, type DungeonResult, type DungeonState } from './dungeon';
import { reveal, WALL_SIGHT_VERSION } from './exploration';
import { hasShape, isDenseArray } from './validation';
export const DUNGEON_SAVE_MAX_BYTES = 1024 * 1024;
const DUNGEON_SAVE_FORMAT = 10;
const DRAUGHT_DUNGEON_SAVE_FORMAT = 11;
const COUNTER_DUNGEON_SAVE_FORMAT = 12;
const STATS_DUNGEON_SAVE_FORMAT = 13;
const WALL_SIGHT_COUNTER_SAVE_FORMAT = 16;
const WALL_SIGHT_STATS_SAVE_FORMAT = 17;
const WALL_SIGHT_DUNGEON_SAVE_FORMAT = 14;
const WALL_SIGHT_DRAUGHT_SAVE_FORMAT = 15;
export const hasWallSight = (state: DungeonState) => state.floors.some(floor => floor.exploration.sightVersion !== undefined);
const CURRENT_IDENTITY = hashJson({ dungeonIdentity, progression: HERO_PROGRESSION });
const PREVIOUS_IDENTITY = hashJson({ dungeonIdentity: previousDungeonIdentity, progression: HERO_PROGRESSION });
/** No DOM dependency in the authoritative save reader. Lone surrogates count as replacement characters. */
export function utf8Bytes(text: string) {
  let n = 0;
  for (const char of text) { const c = char.codePointAt(0)!; n += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4; }
  return n;
}
export function encodeDungeonWithState(input: unknown): { ok: true; text: string; state: DungeonState } | { ok: false; reason: string } {
  const checked = readDungeon(input);
  if (!checked.ok) return checked;
  const draughts = checked.state.activeBattle?.draughts;
  const format = checked.state.stats ? hasWallSight(checked.state) ? WALL_SIGHT_STATS_SAVE_FORMAT : STATS_DUNGEON_SAVE_FORMAT : hasWallSight(checked.state)
    ? draughts ? WALL_SIGHT_DRAUGHT_SAVE_FORMAT : WALL_SIGHT_DUNGEON_SAVE_FORMAT
    : draughts ? DRAUGHT_DUNGEON_SAVE_FORMAT : DUNGEON_SAVE_FORMAT;
  const body = { kind: 'tactics-guru:dungeon', format, identity: CURRENT_IDENTITY, payload: checked.state };
  const text = canonical({ ...body, digest: hashJson(body) });
  return utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES ? { ok: false, reason: 'tooLarge' } : { ok: true, text, state: checked.state };
}
export function encodeDungeon(input: unknown): { ok: true; text: string } | { ok: false; reason: string } {
  const result = encodeDungeonWithState(input);
  return result.ok ? {ok:true,text:result.text} : result;
}
/** Store just the changes needed to undo the legacy projection in a current client. */
export function encodeDungeonRollback(state: DungeonState): { ok: true; text: string; checkpoint: string } | { ok: false; reason: string } {
  const addedCells = state.floors.map(floor => floor.exploration.sightVersion === undefined ? null :
    reveal(floor.position, floor.descriptor.size ?? 20).filter(cell => !floor.exploration.revealed.includes(cell)));
  const floors = state.floors.map((floor, index) => {
    const added = addedCells[index];
    if (added === null) return floor;
    const { sightVersion, ...exploration } = floor.exploration;
    const revealed = [...exploration.revealed, ...added].sort((a, b) => a - b);
    return { ...floor, exploration: { ...exploration, revealed } };
  });
  const legacy = encodeDungeon({ ...state, floors });
  if (!legacy.ok) return legacy;
  const body = { backup: hashJson(legacy.text), addedCells };
  return { ...legacy, checkpoint: canonical({ ...body, digest: hashJson(body) }) };
}

export function restoreDungeonRollback(text: string, legacy: DungeonState, checkpoint: string): DungeonState | null {
  if (checkpoint.length > DUNGEON_SAVE_MAX_BYTES || hasWallSight(legacy)) return null;
  try {
    const value: unknown = JSON.parse(checkpoint);
    if (!hasShape(value, ['backup','addedCells','digest']) || !isDenseArray(value.addedCells, legacy.floors.length) ||
        value.addedCells.length !== legacy.floors.length || value.backup !== hashJson(text) ||
        value.digest !== hashJson({ backup: value.backup, addedCells: value.addedCells })) return null;
    const addedCells = value.addedCells;
    const floors = legacy.floors.map((floor, index) => {
      const added = addedCells[index];
      if (added === null) return floor;
      const visible = reveal(floor.position, floor.descriptor.size ?? 20);
      if (!isDenseArray(added, visible.length) || !added.every(cell =>
        typeof cell === 'number' && visible.includes(cell) && floor.exploration.revealed.includes(cell))) throw Error('Invalid rollback cells');
      return { ...floor, exploration: { ...floor.exploration, sightVersion: WALL_SIGHT_VERSION,
        revealed: floor.exploration.revealed.filter(cell => !added.includes(cell)) } };
    });
    const read = readDungeon({ ...legacy, floors });
    return read.ok && hasWallSight(read.state) ? read.state : null;
  } catch { return null; }
}

export function decodeDungeon(text: string): DungeonResult {
  if (typeof text !== 'string' || text.length > DUNGEON_SAVE_MAX_BYTES || utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES) return { ok: false, reason: 'tooLarge' };
  try {
    const input: unknown = JSON.parse(text);
    if (!hasShape(input, ['kind','format','identity','payload','digest'])) return { ok: false, reason: 'invalidEnvelope' };
    const previous = input.format === 9 && input.identity === PREVIOUS_IDENTITY;
    // Earlier #370 previews wrote 12/13 with wall-sight floors and no stats.
    // Accept those payloads for recovery. New wall-sight writes use 14/15.
    const payloadStats = typeof input.payload === 'object' && input.payload !== null && 'stats' in input.payload;
    const counter = input.format === WALL_SIGHT_COUNTER_SAVE_FORMAT || payloadStats && input.format === COUNTER_DUNGEON_SAVE_FORMAT;
    const timed = input.format === WALL_SIGHT_STATS_SAVE_FORMAT || payloadStats && input.format === STATS_DUNGEON_SAVE_FORMAT;
    const stats = counter || timed;
    const previewWallSight = !payloadStats && (input.format === 12 || input.format === 13);
    const wallSight = input.format === WALL_SIGHT_COUNTER_SAVE_FORMAT || input.format === WALL_SIGHT_STATS_SAVE_FORMAT || previewWallSight || input.format === WALL_SIGHT_DUNGEON_SAVE_FORMAT || input.format === WALL_SIGHT_DRAUGHT_SAVE_FORMAT;
    const current = (input.format === DUNGEON_SAVE_FORMAT || input.format === DRAUGHT_DUNGEON_SAVE_FORMAT || stats || wallSight) &&
      input.identity === CURRENT_IDENTITY;
    if (input.kind !== 'tactics-guru:dungeon' || !(previous || current)) return { ok: false, reason: 'incompatible' };
    const body = { kind: input.kind, format: input.format, identity: input.identity, payload: input.payload };
    if (input.digest !== hashJson(body)) return { ok: false, reason: 'digest' };
    const read = readDungeon(input.payload, previous ? previousItemCatalog : undefined);
    if (!read.ok) return read;
    if (previous && (read.state.offer?.version === 2 || read.state.activeBattle?.draughts)) return { ok: false, reason: 'incompatible' };
    if (stats !== (read.state.stats !== undefined)) return { ok: false, reason: 'invalidState' };
    const statsVersion = (input.payload as { stats?: { version: unknown } }).stats?.version;
    if (counter && statsVersion !== 1 || timed && statsVersion !== 2) return { ok: false, reason: 'invalidState' };
    if (wallSight !== hasWallSight(read.state)) return { ok: false, reason: 'incompatible' };
    const draughts = Boolean(read.state.activeBattle?.draughts);
    if ((input.format === DRAUGHT_DUNGEON_SAVE_FORMAT && !draughts) ||
        (!stats && wallSight && draughts !== (input.format === WALL_SIGHT_DRAUGHT_SAVE_FORMAT || input.format === 13))) return { ok: false, reason: 'invalidState' };
    return read;
  } catch { return { ok: false, reason: 'invalidJson' }; }
}
