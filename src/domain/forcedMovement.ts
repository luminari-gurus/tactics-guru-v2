import type { CellPosition, ContentCatalog } from '../content/types';
import { manhattanDistance } from './targeting';
import type { BattleState, UnitState } from './types';

type PushPreview = { readonly ok: true; readonly from: CellPosition; readonly to: CellPosition } |
  { readonly ok: false; readonly reason: 'direction' | 'edge' | 'terrain' | 'occupied' | 'elevation' };

/** One cardinal tile away from an adjacent source. A stopped push does not invalidate the attack. */
export function previewPush(state: BattleState, source: UnitState, target: UnitState, catalog: ContentCatalog): PushPreview {
  const from = target.cell;
  if (manhattanDistance(source.cell, from) !== 1) return { ok: false, reason: 'direction' };
  const to = { x: 2 * from.x - source.cell.x, y: 2 * from.y - source.cell.y };
  const map = catalog.maps[state.mapId];
  const destination = map.cells.find(cell => cell.x === to.x && cell.y === to.y);
  if (!destination) return { ok: false, reason: 'edge' };
  if (!catalog.terrains[destination.terrainId].walkable) return { ok: false, reason: 'terrain' };
  if (state.units.some(unit => unit.hp > 0 && unit.cell.x === to.x && unit.cell.y === to.y))
    return { ok: false, reason: 'occupied' };
  const origin = map.cells.find(cell => cell.x === from.x && cell.y === from.y)!;
  if (destination.elevation > origin.elevation || origin.elevation - destination.elevation > 1)
    return { ok: false, reason: 'elevation' };
  return { ok: true, from, to };
}
