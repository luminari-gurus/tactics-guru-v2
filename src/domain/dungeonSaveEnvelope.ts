import { dungeonIdentity, legacyDungeonIdentity, priorDungeonIdentity } from '../content/dungeon';
import { canonical, hashJson } from './contentIdentity';
import { readDungeon, readLegacyDungeon, readPriorDungeon, type DungeonResult } from './dungeon';
import { hasShape } from './validation';
export const DUNGEON_SAVE_MAX_BYTES = 1024 * 1024;
/** No DOM dependency in the authoritative save reader. Lone surrogates count as replacement characters. */
export function utf8Bytes(text: string) {
  let n = 0;
  for (const char of text) { const c = char.codePointAt(0)!; n += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4; }
  return n;
}
export function encodeDungeon(input: unknown): { ok: true; text: string } | { ok: false; reason: string } {
  const checked = readDungeon(input);
  if (!checked.ok) return checked;
  const body = { kind: 'tactics-guru:dungeon', format: 3, identity: dungeonIdentity, payload: checked.state };
  const text = canonical({ ...body, digest: hashJson(body) });
  return utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES ? { ok: false, reason: 'tooLarge' } : { ok: true, text };
}
export function decodeDungeon(text: string): DungeonResult {
  if (typeof text !== 'string' || text.length > DUNGEON_SAVE_MAX_BYTES || utf8Bytes(text) > DUNGEON_SAVE_MAX_BYTES) return { ok: false, reason: 'tooLarge' };
  try {
    const input: unknown = JSON.parse(text);
    if (!hasShape(input, ['kind','format','identity','payload','digest'])) return { ok: false, reason: 'invalidEnvelope' };
    if (input.kind !== 'tactics-guru:dungeon' || !((input.format === 3 && input.identity === dungeonIdentity) || (input.format === 2 && input.identity === priorDungeonIdentity) || (input.format === 1 && input.identity === legacyDungeonIdentity))) return { ok: false, reason: 'incompatible' };
    const body = { kind: input.kind, format: input.format, identity: input.identity, payload: input.payload };
    if (input.digest !== hashJson(body)) return { ok: false, reason: 'digest' };
    return input.format === 1 ? readLegacyDungeon(input.payload) : input.format === 2 ? readPriorDungeon(input.payload) : readDungeon(input.payload);
  } catch { return { ok: false, reason: 'invalidJson' }; }
}
