import { canonical, hashJson } from '../domain/contentIdentity';
import { emptyRunRecords, readRunRecords, type RunRecords } from '../domain/runRecords';
import { hasShape } from '../domain/validation';
import type { RunStorageProvider } from './runStorage';

export const RUN_RECORD_KEYS = { primary: 'tactics-guru:records:primary:v1', backup: 'tactics-guru:records:backup:v1' } as const;
export const RECORDS_MAX_CODE_UNITS = 100_000;
export type RecordsSlot = { readonly status: 'missing'; readonly text: null }
  | { readonly status: 'unavailable'; readonly text: null }
  | { readonly status: 'invalid'; readonly text: string }
  | { readonly status: 'valid'; readonly text: string; readonly history: RunRecords };
export interface RecordsInspection { readonly primary: RecordsSlot; readonly backup: RecordsSlot }
export type RecordsWrite = { readonly ok: true } | { readonly ok: false; readonly reason: 'unavailable' | 'changed' | 'recoveryRequired' | 'invalid' | 'uncertain' };
export type RecordsLock = (action: () => RecordsWrite) => Promise<RecordsWrite>;

export function encodeRunRecords(history: RunRecords): string | null {
  const checked = readRunRecords(history); if (!checked) return null;
  const text = canonical({ ...checked, digest: hashJson(checked) });
  return text.length <= RECORDS_MAX_CODE_UNITS ? text : null;
}
function decode(text: string): RunRecords | null {
  if (text.length > RECORDS_MAX_CODE_UNITS) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!hasShape(value, ['version', 'records', 'receipts', 'digest']) &&
      !hasShape(value, ['version', 'records', 'receipts', 'bests', 'legacyBestCoverage', 'digest'])) return null;
    const { digest, ...body } = value;
    if (digest !== hashJson(body)) return null;
    return readRunRecords(body);
  } catch { return null; }
}
async function browserLock(action: () => RecordsWrite): Promise<RecordsWrite> {
  try {
    if (typeof navigator === 'undefined' || !navigator.locks) return { ok: false, reason: 'unavailable' };
    return await navigator.locks.request(RUN_RECORD_KEYS.primary, action);
  } catch { return { ok: false, reason: 'unavailable' }; }
}
export const selectedRunRecords = (review: RecordsInspection) => review.primary.status === 'valid' ? review.primary.history
  : review.backup.status === 'valid' ? review.backup.history : null;

/** Effects only. Merely opening history never repairs or writes either namespace. */
export function createRunRecordsStorage(provider: RunStorageProvider = () => window.localStorage, lock: RecordsLock = browserLock) {
  function inspect(): RecordsInspection {
    const read = (key: string): RecordsSlot => {
      try {
        const storage = provider(); if (!storage) return { status: 'unavailable', text: null };
        const text = storage.getItem(key); if (text === null) return { status: 'missing', text };
        const history = decode(text);
        return history ? { status: 'valid', text, history } : { status: 'invalid', text };
      } catch { return { status: 'unavailable', text: null }; }
    };
    return { primary: read(RUN_RECORD_KEYS.primary), backup: read(RUN_RECORD_KEYS.backup) };
  }
  const unavailable = (review: RecordsInspection) => review.primary.status === 'unavailable' || review.backup.status === 'unavailable';
  function same(a: RecordsInspection, b: RecordsInspection) {
    return !unavailable(a) && !unavailable(b) && a.primary.text === b.primary.text && a.backup.text === b.backup.text;
  }
  function write(history: RunRecords, previous: RecordsInspection, recovery = false): RecordsWrite {
    const text = encodeRunRecords(history); if (text === null) return { ok: false, reason: 'invalid' };
    if (!same(previous, inspect())) return { ok: false, reason: 'changed' };
    let attempted = false;
    try {
      const storage = provider(); if (!storage) return { ok: false, reason: 'unavailable' };
      // Keep the last known good history, except on an explicit reviewed reset/restore.
      const backup = recovery ? text : previous.primary.status === 'valid' ? previous.primary.text
        : previous.backup.status === 'valid' ? previous.backup.text : text;
      attempted = true;
      storage.setItem(RUN_RECORD_KEYS.backup, backup);
      if (storage.getItem(RUN_RECORD_KEYS.backup) !== backup) return { ok: false, reason: 'uncertain' };
      storage.setItem(RUN_RECORD_KEYS.primary, text);
      if (storage.getItem(RUN_RECORD_KEYS.primary) !== text) return { ok: false, reason: 'uncertain' };
      return { ok: true };
    } catch { return { ok: false, reason: attempted ? 'uncertain' : 'unavailable' }; }
  }
  async function exclusive(action: () => RecordsWrite): Promise<RecordsWrite> {
    try { return await lock(action); } catch { return { ok: false, reason: 'unavailable' }; }
  }
  function mutate(update: (history: RunRecords) => RunRecords): Promise<RecordsWrite> {
    return exclusive(() => {
      const review = inspect();
      if (unavailable(review)) return { ok: false, reason: 'unavailable' };
      if (review.primary.status === 'invalid' || review.backup.status === 'invalid') return { ok: false, reason: 'recoveryRequired' };
      const before = selectedRunRecords(review) ?? emptyRunRecords();
      let after: RunRecords;
      try { after = update(before); } catch { return { ok: false, reason: 'invalid' }; }
      const encoded = encodeRunRecords(after);
      if (encoded === null) return { ok: false, reason: 'invalid' };
      // Duplicate callbacks do not rotate backup or change recording timestamps.
      if (canonical(before) === canonical(after)) return { ok: true };
      return write(after, review);
    });
  }
  function recover(review: RecordsInspection, reset: boolean): Promise<RecordsWrite> {
    return exclusive(() => {
      if (!same(review, inspect())) return { ok: false, reason: 'changed' };
      const history = reset ? emptyRunRecords() : selectedRunRecords(review);
      return history ? write(history, review, true) : { ok: false, reason: 'recoveryRequired' };
    });
  }
  return { inspect, mutate, recover };
}
export type RunRecordsStorage = ReturnType<typeof createRunRecordsStorage>;
