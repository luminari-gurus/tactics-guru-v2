import { clearedDungeonSlots, collectableDungeonLoot, currentFloor, floorMap, stepDungeon,
  type DungeonResult, type DungeonState } from './dungeon';
import { neighbors, poiCell } from './exploration';
import { hasShape } from './validation';

export interface DungeonAutoCollectIntent {
  readonly id: string;
  readonly depth: number;
  readonly revision: number;
  readonly origin: number;
  readonly destination: number;
  readonly slot: number;
  readonly lootId: string;
}

/** Transient notification for a newly settled victory; never reconstructed on load. */
export function victoryAutoCollectIntent(before: DungeonState, after: DungeonState): DungeonAutoCollectIntent | null {
  const entry = before.encounterEntry;
  if (!entry || before.phase !== 'battle' || after.phase !== 'ready' || before.id !== after.id || before.depth !== after.depth) return null;
  const floor = currentFloor(after), previous = currentFloor(before);
  const loot = floor.loot?.find(item => item.slot === entry.slot && item.cell === entry.contact && item.remaining > 0 &&
    !previous.loot?.some(old => old.id === item.id));
  if (!loot || floor.position !== entry.origin || !clearedDungeonSlots(floor).includes(entry.slot)) return null;
  return { id: after.id, depth: after.depth, revision: after.revision, origin: entry.origin,
    destination: entry.contact, slot: entry.slot, lootId: loot.id };
}

/** An automatic move is the ordinary step reducer after stricter, current-state preflight. */
export function autoCollectDungeon(state: DungeonState, intent: DungeonAutoCollectIntent): DungeonResult {
  const fail = (reason: string): DungeonResult => ({ ok: false, reason });
  if (!hasShape(intent, ['id', 'depth', 'revision', 'origin', 'destination', 'slot', 'lootId'])) return fail('invalidCommand');
  if (intent.id !== state.id || intent.depth !== state.depth || intent.revision !== state.revision) return fail('staleBoundary');
  if (state.phase !== 'ready') return fail('wrongPhase');
  const floor = currentFloor(state), map = floorMap(floor.descriptor), cleared = clearedDungeonSlots(floor);
  if (floor.position !== intent.origin || !map.cells[intent.destination] ||
      !neighbors(intent.origin, map.width, map.height).includes(intent.destination)) return fail('blockedStep');
  const loot = floor.loot?.find(item => item.id === intent.lootId && item.slot === intent.slot &&
    item.cell === intent.destination && item.remaining > 0);
  if (!loot || !cleared.includes(intent.slot)) return fail('staleLoot');
  if (floor.exploration.pois.some(poi => !cleared.includes(poi.encounterSlot) && poiCell(poi, map.width) === intent.destination)) return fail('occupiedLoot');
  if (intent.destination === floor.descriptor.upstairs && state.depth > 1 ||
      intent.destination === floor.descriptor.downstairs && floor.completed === 3) return fail('automaticStairs');
  if (collectableDungeonLoot(state, intent.destination) === 0) return fail('capacity');
  return stepDungeon(state, { id: intent.id, depth: intent.depth, revision: intent.revision, destination: intent.destination });
}
