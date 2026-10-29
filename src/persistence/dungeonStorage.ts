import { decodeDungeon, encodeDungeon } from '../domain/dungeonSaveEnvelope';
import type { DungeonState } from '../domain/dungeon';
import type { RunStorageProvider } from './runStorage';
export const DUNGEON_KEYS = { primary: 'tactics-guru:phaser:dungeon:primary:v1', backup: 'tactics-guru:phaser:dungeon:backup:v1' } as const;
export type DungeonSlot = keyof typeof DUNGEON_KEYS;
type Slot = { status: 'missing'; text: null } | { status: 'valid'; text: string; state: DungeonState }
  | { status: 'invalid'; text: string; reason: string } | { status: 'unavailable'; text: null };
export interface DungeonInspection { readonly primary: Slot; readonly backup: Slot }
export type DungeonWrite = { ok: true } | { ok: false; reason: string };
export function createDungeonStorage(provider: RunStorageProvider = () => window.localStorage) {
  let uncertain = false;
  let lastWritten: string | undefined;
  const error = (e: unknown) => {
    try { return (e as { name?: string })?.name === 'QuotaExceededError' ? 'quota' : (e as { name?: string })?.name === 'SecurityError' ? 'security' : 'unavailable'; }
    catch { return 'unavailable'; }
  };
  function inspect(): DungeonInspection {
    const slot = (key: DungeonSlot): Slot => {
      try {
        const storage = provider(); if (!storage) return { status: 'unavailable', text: null };
        const text = storage.getItem(DUNGEON_KEYS[key]);
        if (text === null) return { status: 'missing', text };
        const read = decodeDungeon(text);
        return read.ok ? { status: 'valid', text, state: read.state } : { status: 'invalid', text, reason: read.reason };
      } catch { return { status: 'unavailable', text: null }; }
    };
    return { primary: slot('primary'), backup: slot('backup') };
  }
  function save(state: DungeonState, expectedPrimary?: string | null): DungeonWrite {
    if (uncertain) return { ok: false, reason: 'uncertainWrite' };
    const encoded = encodeDungeon(state); if (!encoded.ok) return encoded;
    try {
      const storage = provider(); if (!storage) return { ok: false, reason: 'unavailable' };
      const old = inspect();
      if (Object.values(old).some(s => s.status === 'unavailable')) return { ok: false, reason: 'unavailable' };
      if (Object.values(old).some(s => s.status === 'invalid')) return { ok: false, reason: 'recoveryRequired' };
      if (expectedPrimary !== undefined && old.primary.text !== expectedPrimary) return { ok: false, reason: 'changed' };
      const backup = old.primary.status === 'valid' ? old.primary.text : old.backup.status === 'missing' ? encoded.text : null;
      if (backup !== null) {
        storage.setItem(DUNGEON_KEYS.backup, backup);
        if (storage.getItem(DUNGEON_KEYS.backup) !== backup) { uncertain = true; return { ok: false, reason: 'uncertainWrite' }; }
      }
      // Any exception after the write attempt can have an uncertain outcome.
      uncertain = true;
      storage.setItem(DUNGEON_KEYS.primary, encoded.text);
      if (storage.getItem(DUNGEON_KEYS.primary) !== encoded.text) return { ok: false, reason: 'uncertainWrite' };
      uncertain = false; lastWritten = encoded.text; return { ok: true };
    } catch (e) { return { ok: false, reason: error(e) }; }
  }
  function remove(slot: DungeonSlot, expected: string | null): DungeonWrite {
    if (slot !== 'primary' && slot !== 'backup') return { ok: false, reason: 'invalidSlot' };
    try {
      const storage = provider(); if (!storage) return { ok: false, reason: 'unavailable' };
      if (storage.getItem(DUNGEON_KEYS[slot]) !== expected) return { ok: false, reason: 'changed' };
      storage.removeItem(DUNGEON_KEYS[slot]);
      return storage.getItem(DUNGEON_KEYS[slot]) === null ? { ok: true } : { ok: false, reason: 'uncertainWrite' };
    } catch (e) { return { ok: false, reason: error(e) }; }
  }
  /** Explicit recovery choice acknowledges inspected durable bytes, never silently adopts a candidate. */
  function acknowledge(review: DungeonInspection) {
    const now = inspect();
    const equal = (['primary','backup'] as const).every(k => now[k].status !== 'unavailable' && now[k].text === review[k].text);
    if (equal) uncertain = false;
    return equal;
  }
  return { inspect, save, remove, acknowledge, lastSavedText: () => lastWritten };
}
