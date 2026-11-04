import { HERO_PROGRESSION } from '../content/progression';
import { dungeonIdentity, previousDungeonIdentity } from '../content/dungeon';
import { previousItemCatalog } from '../content/items';
import { canonical, hashJson } from './contentIdentity';
import { readDungeon, type DungeonResult } from './dungeon';
import { hasShape } from './validation';
export const DUNGEON_SAVE_MAX_BYTES = 1024 * 1024;
const DUNGEON_SAVE_FORMAT = 10;
const CURRENT_IDENTITY = hashJson({ dungeonIdentity, progression: HERO_PROGRESSION });
const PREVIOUS_IDENTITY = hashJson({ dungeonIdentity: previousDungeonIdentity, progression: HERO_PROGRESSION });
/** No DOM dependency in the authoritative save reader. Lone surrogates count as replacement characters. */
export function utf8Bytes(text: string) {
  let n = 0;
  for (const char of text) { const c = char.codePointAt(0)!; n += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4; }
  return n;
}
export function encodeDungeon(input: unknown): { ok: true; text: string } | { ok: false; reason: string } {
  const checked = readDungeon(input);
  if (!checked.ok) return checked;
  const body = { kind: 'tactics-guru:dungeon', format: DUNGEON_SAVE_FORMAT, identity: CURRENT_IDENTITY, payload: checked.state };
  const text = canonical({ ...body, digest: hashJson(body) });
  return utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES ? { ok: false, reason: 'tooLarge' } : { ok: true, text };
}
export function decodeDungeon(text: string): DungeonResult {
  if (typeof text !== 'string' || text.length > DUNGEON_SAVE_MAX_BYTES || utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES) return { ok: false, reason: 'tooLarge' };
  try {
    const input: unknown = JSON.parse(text);
    if (!hasShape(input, ['kind','format','identity','payload','digest'])) return { ok: false, reason: 'invalidEnvelope' };
    const previous = input.format === 9 && input.identity === PREVIOUS_IDENTITY;
    if (input.kind !== 'tactics-guru:dungeon' || !(previous || input.format === DUNGEON_SAVE_FORMAT && input.identity === CURRENT_IDENTITY)) return { ok: false, reason: 'incompatible' };
    const body = { kind: input.kind, format: input.format, identity: input.identity, payload: input.payload };
    if (input.digest !== hashJson(body)) return { ok: false, reason: 'digest' };
    const read = readDungeon(input.payload, previous ? previousItemCatalog : undefined);
    if (previous && read.ok && read.state.offer?.version === 2) return { ok: false, reason: 'incompatible' };
    return read;
  } catch { return { ok: false, reason: 'invalidJson' }; }
}
