import type { CellPosition, ContentCatalog, MapId } from '../content/types';

export function manhattanDistance(a: CellPosition, b: CellPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
/**
 * Cells strictly between two cells, sampled like legacy TargetingService.gd:91-107: the same float lerp
 * (so the same doubles), and Math.round equals Godot's roundi on these non-negative values. The major
 * axis advances one cell per step, so samples are distinct and never an endpoint without legacy's checks.
 */
export function lineCellsBetween(from: CellPosition, to: CellPosition): CellPosition[] {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  const cells: CellPosition[] = [];
  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    cells.push({ x: Math.round(from.x + (to.x - from.x) * t), y: Math.round(from.y + (to.y - from.y) * t) });
  }
  return cells;
}
/** Only terrain blocks line of sight; units and height never do. Validated maps hold every in-bounds cell. */
export function lineOfSightBlocked(catalog: ContentCatalog, mapId: MapId, from: CellPosition, to: CellPosition): boolean {
  const cells = catalog.maps[mapId].cells;
  return lineCellsBetween(from, to).some(cell =>
    catalog.terrains[cells.find(c => c.x === cell.x && c.y === cell.y)!.terrainId].blocksLineOfSight);
}
