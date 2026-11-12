import { decodeDungeon, encodeDungeonRollback, encodeDungeonWithState, hasWallSight } from '../domain/dungeonSaveEnvelope';
import type { DungeonState } from '../domain/dungeon';
import type { RunStorageProvider } from './runStorage';
export const DUNGEON_KEYS = { primary: 'tactics-guru:phaser:dungeon:primary:v1', backup: 'tactics-guru:phaser:dungeon:backup:v1' } as const;
export type DungeonSlot = keyof typeof DUNGEON_KEYS;
type Slot = { status: 'missing'; text: null } | { status: 'valid'; text: string; state: DungeonState }
  | { status: 'invalid'; text: string; reason: string } | { status: 'unavailable'; text: null };
export interface DungeonInspection { readonly primary: Slot; readonly backup: Slot }
export type DungeonWrite = { ok: true } | { ok: false; reason: string };
/** True only when both slots are missing. Unavailable, backup-only, and unreadable saves are not empty. */
export function bothDungeonSlotsMissing(review: DungeonInspection): boolean {
  return review.primary.status === 'missing' && review.backup.status === 'missing';
}
export function createDungeonStorage(provider: RunStorageProvider = () => window.localStorage) {
  let uncertain = false;
  let lastWritten: string | undefined;
  // Exact immutable bytes admit the same deterministic state. Keep private copies
  // and clone on return so callers can never mutate a future inspection result.
  const decoded = new Map<string, DungeonState>();
  function read(text: string) {
    let state = decoded.get(text);
    if (!state) {
      const result = decodeDungeon(text);
      if (!result.ok) return result;
      state = result.state;
      decoded.set(text, state);
      if (decoded.size > 2) decoded.delete(decoded.keys().next().value!);
    }
    return {ok: true as const, state: structuredClone(state)};
  }
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
        const result = read(text);
        return result.ok ? { status: 'valid', text, state: result.state } : { status: 'invalid', text, reason: result.reason };
      } catch { return { status: 'unavailable', text: null }; }
    };
    return { primary: slot('primary'), backup: slot('backup') };
  }
  function save(state: DungeonState, expectedPrimary?: string | null): DungeonWrite {
    if (uncertain) return { ok: false, reason: 'uncertainWrite' };
    const encoded = encodeDungeonWithState(state); if (!encoded.ok) return encoded;
    try {
      const storage = provider(); if (!storage) return { ok: false, reason: 'unavailable' };
      const old = inspect();
      if (Object.values(old).some(s => s.status === 'unavailable')) return { ok: false, reason: 'unavailable' };
      if (Object.values(old).some(s => s.status === 'invalid')) return { ok: false, reason: 'recoveryRequired' };
      if (expectedPrimary !== undefined && old.primary.text !== expectedPrimary) return { ok: false, reason: 'changed' };
      let backup = old.primary.status === 'valid' ? old.primary.text : old.backup.status === 'missing' ? encoded.text : null;
      let backupState: DungeonState | undefined = old.primary.status === 'valid' ? old.primary.state
        : old.backup.status === 'valid' ? old.backup.state : encoded.state;
      if (old.primary.status === 'valid' && old.primary.state.activeBattle?.draughts) {
        backup = null;
        backupState = old.backup.status === 'valid' ? old.backup.state : undefined;
      }
      if (state.activeBattle?.draughts) {
        const compatible = (slot: Slot): slot is Extract<Slot, { status: 'valid' }> => slot.status === 'valid' && !slot.state.activeBattle?.draughts &&
          slot.state.id === state.id && slot.state.depth === state.depth &&
          slot.state.floors[state.depth-1].completed === state.floors[state.depth-1].completed;
        if (compatible(old.primary)) {
          backup = old.primary.text;
          backupState = old.primary.state;
        } else if (compatible(old.backup)) {
          backup = null;
          backupState = old.backup.state;
        } else {
          const floors = state.floors.map((floor,index) => index === state.depth-1 && floor.exploration.version === 'exploration-v2'
            ? {...floor, exploration:{...floor.exploration,active:null}} : floor);
          const checkpoint = encodeDungeonWithState({...state,floors,phase:'ready',activeBattle:null,battlefield:null});
          if (!checkpoint.ok) return checkpoint;
          backup = checkpoint.text;
          backupState = checkpoint.state;
        }
      }
      if (backupState && hasWallSight(backupState)) {
        const rollback = encodeDungeonRollback(backupState);
        if (rollback.ok) backup = rollback.text;
        else if (rollback.reason === 'tooLarge' && old.backup.status === 'valid' && !hasWallSight(old.backup.state)) backup = null;
        else if (rollback.reason !== 'tooLarge') return rollback;
      }
      if (backup !== null) {
        storage.setItem(DUNGEON_KEYS.backup, backup);
        if (storage.getItem(DUNGEON_KEYS.backup) !== backup) { uncertain = true; return { ok: false, reason: 'uncertainWrite' }; }
      }
      // Any exception after the write attempt can have an uncertain outcome.
      uncertain = true;
      storage.setItem(DUNGEON_KEYS.primary, encoded.text);
      if (storage.getItem(DUNGEON_KEYS.primary) !== encoded.text) return { ok: false, reason: 'uncertainWrite' };
      uncertain = false; lastWritten = encoded.text;
      try {
        decoded.clear();
        const previous = old.primary.status === 'valid' ? old.primary : old.backup.status === 'valid' ? old.backup : null;
        if (previous && backup === previous.text) decoded.set(previous.text, structuredClone(previous.state));
        decoded.set(encoded.text, structuredClone(encoded.state));
      } catch { decoded.clear(); } // A cache failure cannot change an already verified write.
      return { ok: true };
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
