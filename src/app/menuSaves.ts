import type { BattleStorageProvider } from '../persistence/battleStorage';
import { createDungeonStorage } from '../persistence/dungeonStorage';

/** Inspect only the dungeon slots, without exposing or changing save bytes. */
export function inspectMenuSave(provider?: BattleStorageProvider) {
  const dungeon = createDungeonStorage(provider).inspect();
  const primary = dungeon.primary.status;
  const backup = dungeon.backup.status;
  return {
    primary,
    backup,
    resumable: [dungeon.primary,dungeon.backup].some(slot => slot.status === 'valid' && slot.state.phase !== 'defeat'),
    needsRecovery: [primary, backup].some(status => status === 'invalid' || status === 'unavailable'),
    fromBackup: !(dungeon.primary.status === 'valid' && dungeon.primary.state.phase !== 'defeat') && dungeon.backup.status === 'valid' && dungeon.backup.state.phase !== 'defeat',
  };
}
