import type { ContentCatalog } from '../content/types';
import { decodeBattleSave, encodeBattleSave, type SaveFailure } from '../domain/saveEnvelope';
import type { BattleState } from '../domain/types';

export const BATTLE_STORAGE_KEYS = Object.freeze({
  primary: 'tactics-guru:phaser:battle:primary:v1',
  backup: 'tactics-guru:phaser:battle:backup:v1',
});
export type BattleStorageSlot = keyof typeof BATTLE_STORAGE_KEYS;
export type BattleStorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type BattleStorageProvider = () => BattleStorageAccess | null | undefined;
export interface StorageFailure {
  readonly ok: false;
  readonly reason: 'storage';
  readonly operation: 'acquire' | 'read' | 'write' | 'remove';
  readonly slot?: BattleStorageSlot;
  readonly kind: 'quota' | 'security' | 'unavailable' | 'other';
}
export type SlotInspection =
  | { readonly status: 'missing'; readonly text: null }
  | { readonly status: 'valid'; readonly text: string; readonly state: BattleState }
  | { readonly status: 'invalid'; readonly text: string; readonly reason: SaveFailure['reason'] }
  | { readonly status: 'unavailable'; readonly error: StorageFailure };
export type BattleStorageInspection = Readonly<Record<BattleStorageSlot, SlotInspection>>;
export type BattleLoadResult = StorageFailure | {
  readonly ok: true;
  readonly inspection: BattleStorageInspection;
  readonly selected: { readonly slot: BattleStorageSlot; readonly state: BattleState } | null;
};
export type BattleWriteResult = { readonly ok: true } | SaveFailure | StorageFailure
  | { readonly ok: false; readonly reason: 'recoveryRequired'; readonly inspection: BattleStorageInspection };
export type BattleRemoveResult = { readonly ok: true }
  | { readonly ok: false; readonly reason: 'invalidSlot' }
  | (StorageFailure & { readonly expectedText: string | null })
  | { readonly ok: false; readonly reason: 'changed'; readonly slot: BattleStorageSlot;
      readonly expectedText: string | null; readonly text: string | null };

// Resolving the property can itself throw (for example, a denied/opaque origin).
const browserStorage: BattleStorageProvider = () => typeof window === 'undefined' ? null : window.localStorage;

function failureKind(error: unknown): StorageFailure['kind'] {
  // Even a foreign thrown value with a throwing name accessor remains nonfatal.
  try {
    const name = (error as { name?: unknown } | null)?.name;
    if (name === 'QuotaExceededError') return 'quota';
    if (name === 'SecurityError') return 'security';
  } catch { /* Unknown exception shape. */ }
  return 'other';
}

function attempt<T>(operation: StorageFailure['operation'], slot: BattleStorageSlot | undefined,
  action: () => T): { ok: true; value: T } | StorageFailure {
  try { return { ok: true, value: action() }; }
  catch (error) { return { ok: false, reason: 'storage', operation, slot, kind: failureKind(error) }; }
}

/** Storage effects only: no session hydration, autosave, or automatic repair. */
export function createBattleStorage(catalog: ContentCatalog, provider: BattleStorageProvider = browserStorage) {
  function acquire() {
    const result = attempt('acquire', undefined, provider);
    if (!result.ok) return result;
    return result.value ? { ok: true as const, value: result.value }
      : { ok: false as const, reason: 'storage' as const, operation: 'acquire' as const, kind: 'unavailable' as const };
  }

  function inspectSlot(storage: BattleStorageAccess, slot: BattleStorageSlot): SlotInspection {
    const read = attempt('read', slot, () => storage.getItem(BATTLE_STORAGE_KEYS[slot]));
    if (!read.ok) return { status: 'unavailable', error: read };
    if (read.value === null) return { status: 'missing', text: null };
    const decoded = decodeBattleSave(read.value, catalog);
    return decoded.ok ? { status: 'valid', text: read.value, state: decoded.state }
      : { status: 'invalid', text: read.value, reason: decoded.reason };
  }

  function inspect(storage: BattleStorageAccess): BattleStorageInspection {
    return { primary: inspectSlot(storage, 'primary'), backup: inspectSlot(storage, 'backup') };
  }

  function load(): BattleLoadResult {
    const storage = acquire();
    if (!storage.ok) return storage;
    const inspection = inspect(storage.value);
    const selected = inspection.primary.status === 'valid' ? { slot: 'primary' as const, state: inspection.primary.state }
      : inspection.backup.status === 'valid' ? { slot: 'backup' as const, state: inspection.backup.state } : null;
    return { ok: true, inspection, selected };
  }

  function save(state: unknown): BattleWriteResult {
    const encoded = encodeBattleSave(state, catalog);
    if (!encoded.ok) return encoded;
    const storage = acquire();
    if (!storage.ok) return storage;
    const inspection = inspect(storage.value);
    for (const slot of ['primary', 'backup'] as const) {
      const value = inspection[slot];
      if (value.status === 'unavailable') return value.error;
    }
    if (inspection.primary.status === 'invalid' || inspection.backup.status === 'invalid') {
      return { ok: false, reason: 'recoveryRequired', inspection };
    }
    // A known primary is the current recovery point. A sole backup is never replaced.
    // First save seeds a recovery point before attempting primary publication.
    const backupText = inspection.primary.status === 'valid' ? inspection.primary.text
      : inspection.backup.status === 'missing' ? encoded.text : null;
    if (backupText !== null) {
      const backup = attempt('write', 'backup', () => storage.value.setItem(BATTLE_STORAGE_KEYS.backup, backupText));
      if (!backup.ok) return backup;
    }
    const primary = attempt('write', 'primary', () => storage.value.setItem(BATTLE_STORAGE_KEYS.primary, encoded.text));
    return primary.ok ? { ok: true } : primary;
  }

  /** Explicit user-directed primitive, NOT atomic multi-slot reset or compare-and-swap. */
  function removeSlot(slot: BattleStorageSlot, expectedText: string | null): BattleRemoveResult {
    // Enforce namespace ownership even if an untyped caller bypasses the TS union.
    if (slot !== 'primary' && slot !== 'backup') return { ok: false, reason: 'invalidSlot' };
    const storage = acquire();
    if (!storage.ok) return { ...storage, expectedText };
    const read = attempt('read', slot, () => storage.value.getItem(BATTLE_STORAGE_KEYS[slot]));
    if (!read.ok) return { ...read, expectedText };
    if (read.value !== expectedText) return { ok: false, reason: 'changed', slot, expectedText, text: read.value };
    if (read.value === null) return { ok: true };
    const removed = attempt('remove', slot, () => storage.value.removeItem(BATTLE_STORAGE_KEYS[slot]));
    return removed.ok ? { ok: true } : { ...removed, expectedText };
  }

  return { load, save, removeSlot };
}
