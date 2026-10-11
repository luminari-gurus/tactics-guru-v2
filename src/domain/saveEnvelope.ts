import type { ContentCatalog } from '../content/types';
import { contentVersion, readBattleState } from './battle';
import { RNG_VERSION, RULES_VERSION, STATE_FORMAT_VERSION } from './constants';
import { canonical, hashJson } from './contentIdentity';
import type { BattleState } from './types';
import { hasShape, isPlainRecord } from './validation';

export const SAVE_KIND = 'tactics-guru:battle-snapshot';
/** Independent of state/rules/RNG versions. There are no migrations in format 1. */
export const SAVE_FORMAT_VERSION = 1;
export const SAVE_MAX_CODE_UNITS = 16_384;
export const SAVE_MAX_MAP_ID_CODE_UNITS = 128;

export type SaveFailure = { readonly ok: false; readonly reason:
  'tooLarge' | 'invalidJson' | 'invalidEnvelope' | 'incompatible' | 'invalidState' | 'corrupt' };
export type SaveEncoded = { readonly ok: true; readonly text: string } | SaveFailure;
export type SaveDecoded = { readonly ok: true; readonly state: BattleState } | SaveFailure;

/** Pure prototype: caller supplies a trusted immutable catalog, never a storage/session object. */
export function encodeBattleSave(input: unknown, catalog: ContentCatalog): SaveEncoded {
  const read = readBattleState(input, catalog);
  if (!read.ok || read.state.mapId.length > SAVE_MAX_MAP_ID_CODE_UNITS) return { ok: false, reason: 'invalidState' };
  const body = { kind: SAVE_KIND, format: SAVE_FORMAT_VERSION, payload: read.state };
  const text = canonical({ ...body, digest: hashJson(body) });
  return text.length > SAVE_MAX_CODE_UNITS ? { ok: false, reason: 'tooLarge' } : { ok: true, text };
}

/** Serialized text is the trust boundary. No caller data is replaced, deleted, or hydrated. */
export function decodeBattleSave(text: string, catalog: ContentCatalog): SaveDecoded {
  if (typeof text !== 'string') return { ok: false, reason: 'invalidJson' };
  if (text.length > SAVE_MAX_CODE_UNITS) return { ok: false, reason: 'tooLarge' };
  let input: unknown;
  try { input = JSON.parse(text); } catch { return { ok: false, reason: 'invalidJson' }; }
  if (!hasShape(input, ['kind', 'format', 'payload', 'digest']) ||
    typeof input.digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(input.digest)) return { ok: false, reason: 'invalidEnvelope' };
  if (input.kind !== SAVE_KIND || input.format !== SAVE_FORMAT_VERSION) return { ok: false, reason: 'incompatible' };
  const payload = input.payload;
  if (!isPlainRecord(payload) || !hasShape(payload.versions, ['rules', 'rng', 'content'])) return { ok: false, reason: 'invalidState' };
  if (payload.format !== STATE_FORMAT_VERSION || payload.versions.rules !== RULES_VERSION ||
    payload.versions.rng !== RNG_VERSION || payload.versions.content !== contentVersion(catalog)) return { ok: false, reason: 'incompatible' };
  // The existing reader checks exact shapes, dense bounded arrays, safe integers, IDs and invariants,
  // and returns an owned copy. Never canonicalize arbitrary nested input before this check.
  const read = readBattleState(payload, catalog);
  if (!read.ok || read.state.mapId.length > SAVE_MAX_MAP_ID_CODE_UNITS) return { ok: false, reason: 'invalidState' };
  const body = { kind: SAVE_KIND, format: SAVE_FORMAT_VERSION, payload: read.state };
  if (hashJson(body) !== input.digest) return { ok: false, reason: 'corrupt' };
  return { ok: true, state: read.state };
}
