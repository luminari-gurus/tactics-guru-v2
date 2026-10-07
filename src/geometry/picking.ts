import { orderTiles, tileFaces, type Tile, type Point, type Bounds } from './iso';
export interface View { x: number; y: number; scale: number; }
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const DRAG_THRESHOLD = 6;
export function screenToBoard(point: Point, view: View): Point {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}
function contains(vertices: readonly Point[], point: Point): boolean {
  const crosses = vertices.map((a, i) => {
    const b = vertices[(i + 1) % vertices.length]!;
    return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
  });
  return crosses.every(value => value >= -1e-8) || crosses.every(value => value <= 1e-8);
}
/** Reverse painter order, including solid side faces. Occupant art passes through. */
export function pickTile(tiles: readonly Tile[], point: Point): Tile | null {
  return orderTiles(tiles).reverse().find(tile => Object.values(tileFaces(tile)).some(face => contains(face, point))) ?? null;
}
export function constrainView(view: View, bounds: Bounds, viewport: {width:number;height:number}, panelBottom: number, fitScale: number): View {
  const scale = Math.max(fitScale * MIN_ZOOM, Math.min(fitScale * MAX_ZOOM, view.scale));
  const clampAxis = (value:number, low:number, high:number):number => low > high ? (low + high) / 2 : Math.max(low, Math.min(high, value));
  return { scale,
    x: clampAxis(view.x, viewport.width / 2 - bounds.right * scale, viewport.width / 2 - bounds.left * scale),
    y: clampAxis(view.y, panelBottom + (viewport.height-panelBottom)/2 - bounds.bottom*scale, panelBottom + (viewport.height-panelBottom)/2 - bounds.top*scale),
  };
}
