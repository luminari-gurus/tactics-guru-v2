import { DUNGEON_SAVE_MAX_BYTES, decodeDungeon, encodeDungeonRollback, encodeDungeonWithState, hasWallSight, requiresFinalRewardSupport, restoreDungeonRollback } from '../domain/dungeonSaveEnvelope';
import type { DungeonState } from '../domain/dungeon';
import type { RunStorageProvider } from './runStorage';
export const DUNGEON_KEYS = { primary: 'tactics-guru:phaser:dungeon:primary:v1', backup: 'tactics-guru:phaser:dungeon:backup:v1' } as const;
export const DUNGEON_BACKUP_CHECKPOINT_KEY = 'tactics-guru:phaser:dungeon:backup-sight:v1';
export type DungeonSlot = keyof typeof DUNGEON_KEYS;
type Slot = { status: 'missing'; text: null } | { status: 'valid'; text: string; state: DungeonState; checkpoint?: string }
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
  let restoredBackup: { text: string; record: string; restored: { checkpoint: string; state: DungeonState } | null } | undefined;
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
        if (!result.ok) return { status: 'invalid', text, reason: result.reason };
        if (key === 'backup') {
          const record = storage.getItem(DUNGEON_BACKUP_CHECKPOINT_KEY);
          if (record !== null && record.length <= 2 * DUNGEON_SAVE_MAX_BYTES) {
            if (restoredBackup?.text !== text || restoredBackup.record !== record) {
              let restored: NonNullable<typeof restoredBackup>['restored'] = null;
              try {
                const checkpoints: unknown = JSON.parse(record);
                if (Array.isArray(checkpoints) && checkpoints.length <= 2) for (const checkpoint of checkpoints) {
                  if (typeof checkpoint !== 'string') continue;
                  const state = restoreDungeonRollback(text, result.state, checkpoint);
                  if (state) { restored = { checkpoint, state }; break; }
                }
              } catch { /* The legacy backup remains independently readable. */ }
              restoredBackup = { text, record, restored };
            }
            const restored = restoredBackup.restored;
            if (restored) return { status: 'valid', text, checkpoint: restored.checkpoint, state: structuredClone(restored.state) };
          }
        }
        return { status: 'valid', text, state: result.state };
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
      if (!state.stats && old.primary.status === 'valid' && old.primary.state.activeBattle?.draughts) {
        backup = null;
        backupState = old.backup.status === 'valid' ? old.backup.state : undefined;
      }
      if (!state.stats && state.activeBattle?.draughts) {
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
          const { encounterEntry: _, ...preparation } = state;
          const checkpoint = encodeDungeonWithState({...preparation,floors,phase:'ready',activeBattle:null,battlefield:null});
          if (!checkpoint.ok) return checkpoint;
          backup = checkpoint.text;
          backupState = checkpoint.state;
        }
      }
      // Keep a same-run checkpoint the prior build can still open after a rollback.
      if (backupState && requiresFinalRewardSupport(backupState) && old.backup.status === 'valid' &&
          old.backup.state.id === state.id && !requiresFinalRewardSupport(old.backup.state)) {
        backup = null;
        backupState = undefined;
      }
      // Keep the last actual pre-contact checkpoint when an older client cannot
      // read the current origin/contact contract. Never manufacture an origin.
      if (backupState?.encounterEntry && old.backup.status === 'valid' &&
          old.backup.state.id === state.id && !old.backup.state.encounterEntry) {
        backup = null;
        backupState = undefined;
      }
      let checkpoint: string | null = null;
      // Inspection caches the exact record that restored the reviewed backup.
      const retainedRecord = old.backup.status === 'valid' && old.backup.checkpoint ? restoredBackup?.record : undefined;
      if (!(backup === null && retainedRecord !== undefined) && backupState && !backupState.stats && hasWallSight(backupState)) {
        const rollback = encodeDungeonRollback(backupState);
        if (rollback.ok) {
          backup = rollback.text;
          checkpoint = rollback.checkpoint;
        } else if (rollback.reason === 'tooLarge' && old.backup.status === 'valid' && !hasWallSight(old.backup.state)) backup = null;
        else if (rollback.reason !== 'tooLarge') return rollback;
      }
      let checkpointRecord: string | null = null;
      const backupMatches = () => {
        const expectedRecord = backup === null ? retainedRecord : checkpointRecord;
        return storage.getItem(DUNGEON_KEYS.backup) === (backup ?? old.backup.text) &&
          (expectedRecord == null || storage.getItem(DUNGEON_BACKUP_CHECKPOINT_KEY) === expectedRecord);
      };
      if (backup !== null) {
        if (checkpoint !== null) {
          // Keep the old checkpoint readable until the new rollback bytes land.
          const oldCheckpoint = old.backup.status === 'valid' ? old.backup.checkpoint : undefined;
          checkpointRecord = JSON.stringify(oldCheckpoint && oldCheckpoint !== checkpoint ? [checkpoint, oldCheckpoint] : [checkpoint]);
          storage.setItem(DUNGEON_BACKUP_CHECKPOINT_KEY, checkpointRecord);
          if (storage.getItem(DUNGEON_BACKUP_CHECKPOINT_KEY) !== checkpointRecord) {
            uncertain = true;
            return { ok: false, reason: 'uncertainWrite' };
          }
        }
        storage.setItem(DUNGEON_KEYS.backup, backup);
        if (!backupMatches()) { uncertain = true; return { ok: false, reason: 'uncertainWrite' }; }
        if (checkpoint === null && storage.getItem(DUNGEON_BACKUP_CHECKPOINT_KEY) !== null) storage.removeItem(DUNGEON_BACKUP_CHECKPOINT_KEY);
      }
      // Any exception after the write attempt can have an uncertain outcome.
      uncertain = true;
      storage.setItem(DUNGEON_KEYS.primary, encoded.text);
      // A concurrent removal can invalidate the backup while the primary is being written.
      if (storage.getItem(DUNGEON_KEYS.primary) !== encoded.text || !backupMatches()) return { ok: false, reason: 'uncertainWrite' };
      uncertain = false; lastWritten = encoded.text;
      try {
        decoded.clear();
        const previous = old.primary.status === 'valid' ? old.primary : old.backup.status === 'valid' ? old.backup : null;
        if (previous && backup === previous.text && previous.checkpoint === undefined) decoded.set(previous.text, structuredClone(previous.state));
        if (backup !== null && checkpoint !== null && checkpointRecord !== null && backupState) {
          restoredBackup = { text: backup, record: checkpointRecord, restored: { checkpoint, state: structuredClone(backupState) } };
        }
        decoded.set(encoded.text, structuredClone(encoded.state));
      } catch { decoded.clear(); } // A cache failure cannot change an already verified write.
      return { ok: true };
    } catch (e) { return { ok: false, reason: error(e) }; }
  }
  function remove(slot: DungeonSlot, expected: string | null, expectedCheckpoint?: string | null): DungeonWrite {
    if (slot !== 'primary' && slot !== 'backup') return { ok: false, reason: 'invalidSlot' };
    try {
      const storage = provider(); if (!storage) return { ok: false, reason: 'unavailable' };
      if (storage.getItem(DUNGEON_KEYS[slot]) !== expected) return { ok: false, reason: 'changed' };
      if (slot === 'backup' && expectedCheckpoint !== undefined) {
        const reviewed = inspect().backup;
        if ((reviewed.status === 'valid' ? reviewed.checkpoint ?? null : null) !== expectedCheckpoint) return { ok: false, reason: 'changed' };
      }
      storage.removeItem(DUNGEON_KEYS[slot]);
      if (storage.getItem(DUNGEON_KEYS[slot]) !== null) return { ok: false, reason: 'uncertainWrite' };
      if (slot === 'backup') storage.removeItem(DUNGEON_BACKUP_CHECKPOINT_KEY);
      return { ok: true };
    } catch (e) { return { ok: false, reason: error(e) }; }
  }
  /** Explicit recovery choice acknowledges inspected durable bytes, never silently adopts a candidate. */
  function acknowledge(review: DungeonInspection) {
    const now = inspect();
    const checkpoint = (slot: Slot) => slot.status === 'valid' ? slot.checkpoint : undefined;
    const equal = (['primary','backup'] as const).every(k => now[k].status !== 'unavailable' && now[k].text === review[k].text) &&
      checkpoint(now.backup) === checkpoint(review.backup);
    if (equal) uncertain = false;
    return equal;
  }
  return { inspect, save, remove, acknowledge, lastSavedText: () => lastWritten };
}

/** All browser dungeon mutations, including multi-slot recovery, share this lock. */
export function serializeBrowserDungeonWrite(task: () => void, unavailable: () => void) {
  try {
    const locks = navigator.locks;
    if (!locks) { unavailable(); return; }
    void locks.request(DUNGEON_KEYS.primary, task).catch(unavailable);
  } catch { unavailable(); }
}
