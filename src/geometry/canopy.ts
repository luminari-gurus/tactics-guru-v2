import { projectTile, tileDepth, type Bounds, type Tile } from './iso';

export const UNIT_ART = { width: 40, height: 50 } as const;
export const CANOPY_ART = { radius: 28, top: -82, bottom: -18, fadedAlpha: 0.35 } as const;

export function unitBounds(tile: Tile, anchor: { x: number; y: number }): Bounds {
  const point = projectTile(tile);
  const left = point.x - UNIT_ART.width * anchor.x;
  const top = point.y - UNIT_ART.height * anchor.y;
  return { left, top, right: left + UNIT_ART.width, bottom: top + UNIT_ART.height };
}

export function canopyBounds(tile: Tile): Bounds {
  const point = projectTile(tile);
  return { left: point.x - CANOPY_ART.radius, right: point.x + CANOPY_ART.radius,
    top: point.y + CANOPY_ART.top, bottom: point.y + CANOPY_ART.bottom };
}

/** Only foliage in front of overlapping unit art fades; trunks and picking are independent. */
export function canopyOccludes(tree: Tile, unit: Tile, art: Bounds, boardHeight: number): boolean {
  const canopy = canopyBounds(tree);
  return tileDepth(tree, boardHeight) > tileDepth(unit, boardHeight)
    && canopy.left < art.right && canopy.right > art.left && canopy.top < art.bottom && canopy.bottom > art.top;
}
