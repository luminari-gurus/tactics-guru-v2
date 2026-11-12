import { HERO_PROGRESSION } from '../content/progression';
import { dungeonIdentity, previousDungeonIdentity } from '../content/dungeon';
import { previousItemCatalog } from '../content/items';
import { canonical, hashJson } from './contentIdentity';
import { readDungeon, type DungeonResult, type DungeonState } from './dungeon';
import { reveal } from './exploration';
import { hasShape } from './validation';
export const DUNGEON_SAVE_MAX_BYTES = 1024 * 1024;
const DUNGEON_SAVE_FORMAT = 10;
const DRAUGHT_DUNGEON_SAVE_FORMAT = 11;
// Formats 12 and 13 belong to #270's counter and timed-stat saves.
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
  const format = hasWallSight(checked.state)
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
/** Keep the backup usable by a client that knows the original through-wall rule. */
export function encodeDungeonRollback(state: DungeonState): ReturnType<typeof encodeDungeon> {
  const floors = state.floors.map(floor => {
    if (floor.exploration.sightVersion === undefined) return floor;
    const { sightVersion, ...exploration } = floor.exploration;
    const visible = reveal(floor.position, floor.descriptor.size ?? 20);
    const revealed = [...new Set([...exploration.revealed, ...visible])].sort((a, b) => a - b);
    return { ...floor, exploration: { ...exploration, revealed } };
  });
  return encodeDungeon({ ...state, floors });
}
export function decodeDungeon(text: string): DungeonResult {
  if (typeof text !== 'string' || text.length > DUNGEON_SAVE_MAX_BYTES || utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES) return { ok: false, reason: 'tooLarge' };
  try {
    const input: unknown = JSON.parse(text);
    if (!hasShape(input, ['kind','format','identity','payload','digest'])) return { ok: false, reason: 'invalidEnvelope' };
    const previous = input.format === 9 && input.identity === PREVIOUS_IDENTITY;
    // Earlier #370 previews wrote 12/13 with wall-sight floors and no stats.
    // Accept those payloads for recovery. New wall-sight writes use 14/15.
    const previewWallSight = input.format === 12 || input.format === 13;
    const wallSight = previewWallSight || input.format === WALL_SIGHT_DUNGEON_SAVE_FORMAT || input.format === WALL_SIGHT_DRAUGHT_SAVE_FORMAT;
    const current = (input.format === DUNGEON_SAVE_FORMAT || input.format === DRAUGHT_DUNGEON_SAVE_FORMAT || wallSight) &&
      input.identity === CURRENT_IDENTITY;
    if (input.kind !== 'tactics-guru:dungeon' || !(previous || current)) return { ok: false, reason: 'incompatible' };
    const body = { kind: input.kind, format: input.format, identity: input.identity, payload: input.payload };
    if (input.digest !== hashJson(body)) return { ok: false, reason: 'digest' };
    const read = readDungeon(input.payload, previous ? previousItemCatalog : undefined);
    if (!read.ok) return read;
    if (previous && (read.state.offer?.version === 2 || read.state.activeBattle?.draughts)) return { ok: false, reason: 'incompatible' };
    if (wallSight !== hasWallSight(read.state)) return { ok: false, reason: 'incompatible' };
    const draughts = Boolean(read.state.activeBattle?.draughts);
    if ((input.format === DRAUGHT_DUNGEON_SAVE_FORMAT && !draughts) ||
        (wallSight && draughts !== (input.format === WALL_SIGHT_DRAUGHT_SAVE_FORMAT || input.format === 13))) return { ok: false, reason: 'invalidState' };
    return read;
  } catch { return { ok: false, reason: 'invalidJson' }; }
}
