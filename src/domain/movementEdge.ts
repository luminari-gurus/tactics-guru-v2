import type { MapCell, TerrainRecord } from '../content/types';

/** One cardinal step. Downhill is unrestricted; only ascent costs extra. */
export function movementEdgeCost(from: MapCell, to: MapCell, terrain: TerrainRecord,
  stats: { readonly move: number; readonly jump: number }, occupied = false): number | null {
  if (occupied || Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1 || !terrain.walkable) return null;
  const uphill = Math.max(0, to.elevation - from.elevation);
  const cost = terrain.moveCost + uphill;
  return uphill <= stats.jump && cost <= stats.move ? cost : null;
}
