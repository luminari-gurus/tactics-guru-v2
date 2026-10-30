import { battleCatalog } from '../content/catalog';
import { createBattleStorage, type BattleStorageProvider } from '../persistence/battleStorage';
import { createRunStorage } from '../persistence/runStorage';
import { createDungeonStorage } from '../persistence/dungeonStorage';
import { runSaveContext } from './runContext';
export type SaveMode = 'dungeon' | 'run' | 'battle';
type SlotStatus = 'missing' | 'valid' | 'invalid' | 'unavailable';
export interface MenuSave {
  mode: SaveMode; label: string; primary: SlotStatus; backup: SlotStatus;
  resumable: boolean; needsRecovery: boolean; fromBackup: boolean;
}
/** Reads validators only. No sessions, RNG, writes, repair or save-byte exposure. */
export function inspectMenuSaves(provider?: BattleStorageProvider): MenuSave[] {
  const dungeon = createDungeonStorage(provider).inspect();
  const run = createRunStorage(runSaveContext, provider).load();
  const battle = createBattleStorage(battleCatalog, provider).load();
  const summarize = (mode: SaveMode, label: string, primary: SlotStatus, backup: SlotStatus): MenuSave => ({
    mode, label, primary, backup, resumable: primary === 'valid' || backup === 'valid',
    needsRecovery: [primary, backup].some(s => s === 'invalid' || s === 'unavailable'),
    fromBackup: primary !== 'valid' && backup === 'valid',
  });
  return [summarize('dungeon', 'Dungeon', dungeon.primary.status, dungeon.backup.status),
    summarize('run', 'Three-encounter run', run.ok ? run.inspection.primary.status : 'unavailable', run.ok ? run.inspection.backup.status : 'unavailable'),
    summarize('battle', 'Standalone battle', battle.ok ? battle.inspection.primary.status : 'unavailable', battle.ok ? battle.inspection.backup.status : 'unavailable')];
}
