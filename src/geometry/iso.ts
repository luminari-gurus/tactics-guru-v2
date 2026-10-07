import type { TerrainId } from '../terrain/materials';
export interface Tile { readonly x: number; readonly y: number; readonly elevation: number; readonly terrain?: TerrainId; }
export interface Point { readonly x: number; readonly y: number; }
export interface Bounds { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number; }

export const TILE_WIDTH = 80;
export const TILE_HEIGHT = 40;
export const ELEVATION_STEP = 24;
export const BASE_THICKNESS = 12;
export const BOARD_MARGIN = 16;
const MAX_BOARD_SCALE = 1.5;

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
export function orderTiles(tiles: readonly Tile[]): Tile[] {
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

/** Fit the entire solid board in the viewport space below the diagnostic panel. */
export function fitBoard(bounds: Bounds, viewport: { width: number; height: number }, panelBottom: number) {
  const top = panelBottom + BOARD_MARGIN;
  const availableWidth = Math.max(1, viewport.width - BOARD_MARGIN * 2);
  const availableHeight = Math.max(1, viewport.height - top - BOARD_MARGIN);
  const scale = Math.min(MAX_BOARD_SCALE, availableWidth / (bounds.right - bounds.left), availableHeight / (bounds.bottom - bounds.top));
  return {
    scale,
    x: viewport.width / 2 - (bounds.left + bounds.right) / 2 * scale,
    y: top + availableHeight / 2 - (bounds.top + bounds.bottom) / 2 * scale,
  };
}
