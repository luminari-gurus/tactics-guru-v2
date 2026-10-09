import type { AssetId, ContentCatalog, MapId } from '../content/types';
import { tileDepth, type Tile } from './iso';

export const OCCUPANT_LAYER = 2.5;

/** Build render data from a validated catalog without owning or changing battle state. */
export function buildBoardPresentation(catalog: ContentCatalog, mapId: MapId) {
  const map = catalog.maps[mapId];
  const tiles = map.cells.map(cell => ({
    x: cell.x, y: cell.y, elevation: cell.elevation, terrain: cell.terrainId,
    surfaceAssetId: catalog.terrains[cell.terrainId].surfaceAssetId,
    depth: tileDepth(cell, map.height),
  } satisfies Tile & { surfaceAssetId: AssetId; depth: number }));
  const byCell = new Map(tiles.map(tile => [`${tile.x},${tile.y}`, tile]));
  const occupants = map.spawns.map(spawn => {
    const unit = spawn.side === 'heroes' ? catalog.heroes[spawn.unitId] : catalog.enemies[spawn.unitId];
    const asset = catalog.assets[unit.spriteAssetId];
    const tile = byCell.get(`${spawn.x},${spawn.y}`);
    if (!tile || asset.kind !== 'unit-sprite') throw new Error(`Invalid render content for spawn ${spawn.id}`);
    return {
      id: spawn.id, unitId: spawn.unitId, side: spawn.side,
      tile, assetId: unit.spriteAssetId, anchor: { ...asset.anchor },
      depth: tile.depth + OCCUPANT_LAYER,
    };
  });
  return { tiles, occupants };
}
