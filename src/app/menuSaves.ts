import type { BattleStorageProvider } from '../persistence/battleStorage';
import { createDungeonStorage, resumableDungeonSlot } from '../persistence/dungeonStorage';

/** Inspect only the dungeon slots, without exposing or changing save bytes. */
export function inspectMenuSave(provider?: BattleStorageProvider) {
  const dungeon = createDungeonStorage(provider).inspect();
  const primary = dungeon.primary.status;
  const backup = dungeon.backup.status;
  const resumableSlot = resumableDungeonSlot(dungeon);
  return {
    primary,
    backup,
    resumable: resumableSlot !== null,
    hasDefeatedSave: [dungeon.primary, dungeon.backup].some(slot => slot.status === 'valid' && slot.state.phase === 'defeat'),
    needsRecovery: [primary, backup].some(status => status === 'invalid' || status === 'unavailable'),
    fromBackup: resumableSlot === 'backup',
  };
}
