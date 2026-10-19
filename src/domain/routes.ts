import type { CellPosition, ContentCatalog, MapRecord, UnitStats } from '../content/types';
import { movementEdgeCost } from './movementEdge';
export const cellKey = (p: CellPosition) => `${p.x},${p.y}`;
/** Deterministic weighted distances, with each edge affordable in a fresh turn.
 * Reverse search charges the forward destination, including its uphill cost. */
export function routeDistances(map: MapRecord, catalog: ContentCatalog, stats: Pick<UnitStats, 'move' | 'jump'>,
  start: CellPosition, occupied: ReadonlySet<string> = new Set(), reverse = false): Map<string, number> {
  const tiles = new Map(map.cells.map(c => [cellKey(c), c]));
  const distances = new Map([[cellKey(start), 0]]);
  const queue = [{ cell: start, cost: 0 }];
  while (queue.length) {
    queue.sort((a,b) => a.cost-b.cost || a.cell.y-b.cell.y || a.cell.x-b.cell.x);
    const current = queue.shift()!, from = tiles.get(cellKey(current.cell));
    if (!from || distances.get(cellKey(from)) !== current.cost) continue;
    for (const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]) {
      const to = tiles.get(`${from.x+dx},${from.y+dy}`);
      if (!to || occupied.has(cellKey(to))) continue;
      const edge = reverse ? movementEdgeCost(to, from, catalog.terrains[from.terrainId], stats)
        : movementEdgeCost(from, to, catalog.terrains[to.terrainId], stats);
      if (edge === null || !catalog.terrains[to.terrainId].walkable) continue;
      const cost = current.cost + edge;
      if (cost >= (distances.get(cellKey(to)) ?? Infinity)) continue;
      distances.set(cellKey(to), cost); queue.push({cell: to,cost});
    }
  }
  return distances;
}
