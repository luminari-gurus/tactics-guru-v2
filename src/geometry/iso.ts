import type { TerrainId } from '../terrain/materials';
export interface Tile { readonly x: number; readonly y: number; readonly elevation: number; readonly terrain?: TerrainId; }
export interface Point { readonly x: number; readonly y: number; }
export interface Bounds { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number; }
/** Drawable area in canvas coordinates, before the single fit padding inset. */
export interface BoardRegion { readonly x: number; readonly y: number; readonly width: number; readonly height: number; }

export const TILE_WIDTH = 80;
export const TILE_HEIGHT = 40;
export const ELEVATION_STEP = 24;
export const BASE_THICKNESS = 12;
export const BOARD_MARGIN = 16;
export const MAX_BOARD_SCALE = 1.5;
export const COLUMN_DEPTH_STRIDE = 3;

/** Match orderTiles, reserving each column's layers before the next column. */
export function tileDepth(tile: { readonly x: number; readonly y: number }, boardHeight: number, layer = 0): number {
  return ((tile.x + tile.y) * boardHeight + tile.y) * COLUMN_DEPTH_STRIDE + layer;
}

/** Projects a tile's top-surface center; positive grid axes extend toward the viewer. */
export function projectTile(tile: Tile): Point {
  return { x: (tile.x - tile.y) * TILE_WIDTH / 2, y: (tile.x + tile.y) * TILE_HEIGHT / 2 - tile.elevation * ELEVATION_STEP };
}

export function tileFaces(tile: Tile) {
  const center = projectTile(tile);
  const thickness = BASE_THICKNESS + tile.elevation * ELEVATION_STEP;
  const top = { x: center.x, y: center.y - TILE_HEIGHT / 2 };
  const right = { x: center.x + TILE_WIDTH / 2, y: center.y };
  const bottom = { x: center.x, y: center.y + TILE_HEIGHT / 2 };
  const left = { x: center.x - TILE_WIDTH / 2, y: center.y };
  const lower = (point: Point): Point => ({ x: point.x, y: point.y + thickness });
  return {
    top: [top, right, bottom, left],
    left: [left, bottom, lower(bottom), lower(left)],
    right: [bottom, right, lower(right), lower(bottom)],
  };
}

/** Draw complete columns back to front. Elevation changes geometry, not grid depth. */
export function orderTiles<T extends Tile>(tiles: readonly T[]): T[] {
  return [...tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.y - b.y || a.x - b.x);
}

export function boardBounds(tiles: readonly Tile[]): Bounds {
  const points = tiles.flatMap(tile => Object.values(tileFaces(tile)).flat());
  return {
    left: Math.min(...points.map(point => point.x)),
    top: Math.min(...points.map(point => point.y)),
    right: Math.max(...points.map(point => point.x)),
    bottom: Math.max(...points.map(point => point.y)),
  };
}

/** Fit the complete board in the unobscured region, applying BOARD_MARGIN once. */
export function fitBoard(bounds: Bounds, region: BoardRegion) {
  const availableWidth = Math.max(1, region.width - BOARD_MARGIN * 2);
  const availableHeight = Math.max(1, region.height - BOARD_MARGIN * 2);
  const scale = Math.min(MAX_BOARD_SCALE, availableWidth / (bounds.right - bounds.left), availableHeight / (bounds.bottom - bounds.top));
  return {
    scale,
    x: region.x + region.width / 2 - (bounds.left + bounds.right) / 2 * scale,
    y: region.y + region.height / 2 - (bounds.top + bounds.bottom) / 2 * scale,
  };
}
