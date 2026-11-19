import { DUNGEON_SAVE_MAX_BYTES, decodeDungeon, encodeDungeonRollback, encodeDungeonWithState, hasGroundLoot, hasWallSight, requiresFinalRewardSupport, restoreDungeonRollback } from '../domain/dungeonSaveEnvelope';
import type { DungeonState } from '../domain/dungeon';
import { hobgoblinEncounterIdentity } from '../content/dungeonEncounters';
import { hashJson } from '../domain/contentIdentity';
import type { RunStorageProvider } from './runStorage';
export const DUNGEON_KEYS = { primary: 'tactics-guru:phaser:dungeon:primary:v1', backup: 'tactics-guru:phaser:dungeon:backup:v1' } as const;
export const DUNGEON_BACKUP_CHECKPOINT_KEY = 'tactics-guru:phaser:dungeon:backup-sight:v1';
export const DUNGEON_RECENT_BACKUP_KEY = 'tactics-guru:phaser:dungeon:backup-recent:v1';
export type DungeonSlot = keyof typeof DUNGEON_KEYS;
type Slot = { status: 'missing'; text: null } | { status: 'valid'; text: string; state: DungeonState; checkpoint?: string }
  | { status: 'invalid'; text: string; reason: string } | { status: 'unavailable'; text: null };
export interface DungeonInspection { readonly primary: Slot; readonly backup: Slot }
function otherDungeonSlot(name: DungeonSlot): DungeonSlot {
  return name === 'primary' ? 'backup' : 'primary';
}
export function removingDungeonSaveWouldReopenRun(review: DungeonInspection, name: DungeonSlot) {
  const terminal = review[name], checkpoint = review[otherDungeonSlot(name)];
  return terminal.status === 'valid' && terminal.state.phase === 'defeat' &&
    checkpoint.status === 'valid' && checkpoint.state.phase !== 'defeat' && checkpoint.state.id === terminal.state.id;
}
export function resumableDungeonSave(review: DungeonInspection, name: DungeonSlot) {
  const slot = review[name];
  // A checkpoint for the defeated journey is still available for export.
  return slot.status === 'valid' && slot.state.phase !== 'defeat' &&
    !removingDungeonSaveWouldReopenRun(review, otherDungeonSlot(name)) ? slot : null;
}
export function resumableDungeonSlot(review: DungeonInspection): DungeonSlot | null {
  if (resumableDungeonSave(review, 'primary')) return 'primary';
  return resumableDungeonSave(review, 'backup') ? 'backup' : null;
}
export type DungeonWrite = { ok: true } | { ok: false; reason: string };
/** True only when both slots are missing. Unavailable, backup-only, and unreadable saves are not empty. */
export function bothDungeonSlotsMissing(review: DungeonInspection): boolean {
  return review.primary.status === 'missing' && review.backup.status === 'missing';
}
function hasHobgoblinFloor(state: DungeonState): boolean {
  return state.floors.some(floor => floor.descriptor.encounters.some(({ selection }) =>
    'catalogIdentity' in selection && selection.catalogIdentity === hobgoblinEncounterIdentity));
}
function primaryHidesRecentBackup(primary: Slot, rollback: DungeonState): boolean {
  return primary.status === 'valid' && (primary.state.id !== rollback.id || !hasHobgoblinFloor(primary.state));
}
export function createDungeonStorage(provider: RunStorageProvider = () => window.localStorage) {
  let uncertain = false;
  let lastWritten: string | undefined;
  // Exact immutable bytes admit the same deterministic state. Keep private copies
  // and clone on return so callers can never mutate a future inspection result.
  const decoded = new Map<string, DungeonState>();
  let restoredBackup: { text: string; record: string; restored: { checkpoint: string; state: DungeonState } | null } | undefined;
  let rollbackBinding: { text: string; prefix: string } | undefined;
  function recentBackupPrefix(text: string) {
    if (rollbackBinding?.text !== text) rollbackBinding = { text, prefix: hashJson(text) + '\n' };
    return rollbackBinding.prefix;
  }
  function read(text: string) {
    let state = decoded.get(text);
    if (!state) {
      const result = decodeDungeon(text);
      if (!result.ok) return result;
      state = result.state;
      decoded.set(text, state);
      if (decoded.size > 3) decoded.delete(decoded.keys().next().value!);
    }
    return {ok: true as const, state: structuredClone(state)};
  }
  const error = (e: unknown) => {
    try { return (e as { name?: string })?.name === 'QuotaExceededError' ? 'quota' : (e as { name?: string })?.name === 'SecurityError' ? 'security' : 'unavailable'; }
    catch { return 'unavailable'; }
  };
  function inspectSlots(): DungeonInspection {
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
  function inspect(): DungeonInspection {
    const review = inspectSlots();
    const { primary, backup } = review;
    if (backup.status !== 'valid' || hasHobgoblinFloor(backup.state) ||
        primaryHidesRecentBackup(primary, backup.state)) return review;
    try {
      const record = provider()?.getItem(DUNGEON_RECENT_BACKUP_KEY);
      if (!record) return review;
      const prefix = recentBackupPrefix(backup.text);
      if (record.length > DUNGEON_SAVE_MAX_BYTES + prefix.length || !record.startsWith(prefix)) return review;
      const text = record.slice(prefix.length);
      const recent = read(text);
      if (recent.ok && recent.state.id === backup.state.id && recent.state.seed === backup.state.seed && hasHobgoblinFloor(recent.state))
        return { primary, backup: { status: 'valid', text, state: recent.state } };
    } catch { /* The rollback backup remains independently readable. */ }
    return review;
  }
  function save(state: DungeonState, expectedPrimary?: string | null, expectedBackup?: Slot): DungeonWrite {
    if (uncertain) return { ok: false, reason: 'uncertainWrite' };
    const encoded = encodeDungeonWithState(state); if (!encoded.ok) return encoded;
    try {
      const storage = provider(); if (!storage) return { ok: false, reason: 'unavailable' };
      const old = inspectSlots();
      if (Object.values(old).some(s => s.status === 'unavailable')) return { ok: false, reason: 'unavailable' };
      if (Object.values(old).some(s => s.status === 'invalid')) return { ok: false, reason: 'recoveryRequired' };
      if (expectedPrimary !== undefined && old.primary.text !== expectedPrimary) return { ok: false, reason: 'changed' };
      if (expectedBackup) {
        // The selected recovery point stays intact until its first new primary is durable.
        const matches = () => sameSlot(inspect().backup, expectedBackup);
        if (!matches()) return { ok: false, reason: 'changed' };
        uncertain = true;
        storage.setItem(DUNGEON_KEYS.primary, encoded.text);
        if (storage.getItem(DUNGEON_KEYS.primary) !== encoded.text) return { ok: false, reason: 'uncertainWrite' };
        if (old.backup.status === 'valid' && primaryHidesRecentBackup(old.primary, old.backup.state) &&
            storage.getItem(DUNGEON_RECENT_BACKUP_KEY) !== null) storage.removeItem(DUNGEON_RECENT_BACKUP_KEY);
        if (!matches()) return { ok: false, reason: 'uncertainWrite' };
        uncertain = false; lastWritten = encoded.text;
        return { ok: true };
      }
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
      // The old key stays readable on rollback. Current clients recover the previous primary.
      const oldRecent = storage.getItem(DUNGEON_RECENT_BACKUP_KEY);
      let recentRecord: string | null = null;
      if (old.backup.status === 'valid' && old.backup.state.id === state.id && !hasHobgoblinFloor(old.backup.state) &&
          hasHobgoblinFloor(encoded.state)) {
        const priorHobgoblin = old.primary.status === 'valid' && old.primary.state.id === state.id && hasHobgoblinFloor(old.primary.state)
          ? old.primary.text : null;
        if (priorHobgoblin !== null) recentRecord = recentBackupPrefix(old.backup.text) + priorHobgoblin;
        else if (old.primary.status === 'missing') recentRecord = oldRecent;
        if (priorHobgoblin !== null || backupState && hasHobgoblinFloor(backupState)) {
          backup = null;
          backupState = undefined;
        }
      }
      let checkpoint: string | null = null;
      // Inspection caches the exact record that restored the reviewed backup.
      const retainedRecord = old.backup.status === 'valid' && old.backup.checkpoint ? restoredBackup?.record : undefined;
      if (!(backup === null && retainedRecord !== undefined) && backupState && !backupState.stats && !hasGroundLoot(backupState) && hasWallSight(backupState)) {
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
      if (recentRecord !== oldRecent) {
        if (recentRecord === null) storage.removeItem(DUNGEON_RECENT_BACKUP_KEY);
        else storage.setItem(DUNGEON_RECENT_BACKUP_KEY, recentRecord);
        if (storage.getItem(DUNGEON_RECENT_BACKUP_KEY) !== recentRecord || !backupMatches()) {
          uncertain = true;
          return { ok: false, reason: 'uncertainWrite' };
        }
      }
      // Any exception after the write attempt can have an uncertain outcome.
      uncertain = true;
      storage.setItem(DUNGEON_KEYS.primary, encoded.text);
      // A concurrent removal can invalidate the backup while the primary is being written.
      if (storage.getItem(DUNGEON_KEYS.primary) !== encoded.text || !backupMatches() ||
          storage.getItem(DUNGEON_RECENT_BACKUP_KEY) !== recentRecord) return { ok: false, reason: 'uncertainWrite' };
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
      if (slot === 'backup') {
        const reviewed = inspect().backup;
        if (reviewed.status === 'unavailable') return { ok: false, reason: 'unavailable' };
        if (reviewed.text !== expected || expectedCheckpoint !== undefined &&
            (reviewed.status === 'valid' ? reviewed.checkpoint ?? null : null) !== expectedCheckpoint) return { ok: false, reason: 'changed' };
      } else {
        if (storage.getItem(DUNGEON_KEYS.primary) !== expected) return { ok: false, reason: 'changed' };
        if (expected !== null && storage.getItem(DUNGEON_RECENT_BACKUP_KEY) !== null) {
          const { primary, backup } = inspectSlots();
          if (primary.status === 'unavailable' || backup.status === 'unavailable') return { ok: false, reason: 'unavailable' };
          if (primary.text !== expected) return { ok: false, reason: 'changed' };
          if (backup.status === 'valid' && primaryHidesRecentBackup(primary, backup.state)) {
            // Removing the primary must not reveal a backup from the abandoned branch.
            storage.removeItem(DUNGEON_RECENT_BACKUP_KEY);
            if (storage.getItem(DUNGEON_RECENT_BACKUP_KEY) !== null) return { ok: false, reason: 'uncertainWrite' };
          }
        }
      }
      storage.removeItem(DUNGEON_KEYS[slot]);
      if (storage.getItem(DUNGEON_KEYS[slot]) !== null) return { ok: false, reason: 'uncertainWrite' };
      if (slot === 'backup') {
        storage.removeItem(DUNGEON_BACKUP_CHECKPOINT_KEY);
        storage.removeItem(DUNGEON_RECENT_BACKUP_KEY);
      }
      return { ok: true };
    } catch (e) { return { ok: false, reason: error(e) }; }
  }
  /** Replace under the dungeon lock. Keep the last readable slot until its successor is verified. */
  function replace(review: DungeonInspection, state: DungeonState): DungeonWrite {
    if (!acknowledge(review)) return { ok: false, reason: 'changed' };
    const encoded = encodeDungeonWithState(state);
    if (!encoded.ok) return encoded;
    try {
      const storage = provider();
      if (!storage) return { ok: false, reason: 'unavailable' };
      const first = review.primary.status === 'valid' ? DUNGEON_KEYS.backup : DUNGEON_KEYS.primary;
      const second = first === DUNGEON_KEYS.primary ? DUNGEON_KEYS.backup : DUNGEON_KEYS.primary;
      const original = storage.getItem(first), other = storage.getItem(second);
      uncertain = true;
      storage.setItem(first, encoded.text);
      if (storage.getItem(first) !== encoded.text) return { ok: false, reason: 'uncertainWrite' };
      try {
        storage.setItem(second, encoded.text);
      } catch (cause) {
        // A confirmed failure can restore the staged slot without touching its sidecars.
        if (storage.getItem(second) === other && storage.getItem(first) === encoded.text) {
          if (original === null) storage.removeItem(first);
          else storage.setItem(first, original);
        }
        throw cause;
      }
      if (storage.getItem(second) !== encoded.text || storage.getItem(first) !== encoded.text)
        return { ok: false, reason: 'uncertainWrite' };
      uncertain = false; lastWritten = encoded.text;
      // Both historical sidecars are bound to the superseded backup's exact bytes.
      try {
        storage.removeItem(DUNGEON_BACKUP_CHECKPOINT_KEY);
        storage.removeItem(DUNGEON_RECENT_BACKUP_KEY);
      } catch { /* Unbound sidecars cannot change the verified new dungeon. */ }
      return { ok: true };
    } catch (e) { return { ok: false, reason: error(e) }; }
  }

  function sameSlot(current: Slot, reviewed: Slot) {
    return current.status !== 'unavailable' && current.status === reviewed.status && current.text === reviewed.text &&
      (current.status !== 'valid' || reviewed.status === 'valid' && current.checkpoint === reviewed.checkpoint);
  }
  /** Explicit recovery choice acknowledges inspected durable bytes, never silently adopts a candidate. */
  function acknowledge(review: DungeonInspection) {
    const now = inspect();
    const equal = sameSlot(now.primary, review.primary) && sameSlot(now.backup, review.backup);
    if (equal) uncertain = false;
    return equal;
  }
  return { inspect, save, replace, remove, acknowledge, lastSavedText: () => lastWritten };
}

/** All browser dungeon mutations, including multi-slot recovery, share this lock. */
export function serializeBrowserDungeonWrite(task: () => void, unavailable: () => void) {
  try {
    const locks = navigator.locks;
    if (!locks) { unavailable(); return; }
    void locks.request(DUNGEON_KEYS.primary, task).catch(unavailable);
  } catch { unavailable(); }
}
