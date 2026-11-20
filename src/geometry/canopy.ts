import { projectTile, tileDepth, type Bounds, type Tile } from './iso';

/** Ordinary unit source/runtime canvas. Board display is 5/8 of these pixels (40×50). */
export const UNIT_SPRITE_CANVAS = { width: 64, height: 80, anchor: { x: 32, y: 76 } } as const;
/** First larger boss canvas: 1.5× the ordinary source, still one tile, native display 60×75. */
export const BOSS_SPRITE_CANVAS = { width: 96, height: 120, anchor: { x: 48, y: 114 } } as const;
export const UNIT_ART = { width: 40, height: 50 } as const;
export const BOSS_UNIT_ART = {
  width: BOSS_SPRITE_CANVAS.width * UNIT_ART.width / UNIT_SPRITE_CANVAS.width,
  height: BOSS_SPRITE_CANVAS.height * UNIT_ART.height / UNIT_SPRITE_CANVAS.height,
} as const;
export const CANOPY_ART = { radius: 28, top: -82, bottom: -18, fadedAlpha: 0.35 } as const;

/** Board display size at the ordinary 5/8 pixels-per-source-pixel scale. No extra stretch. */
export function unitArtSize(asset: { readonly runtimeWidth: number; readonly runtimeHeight: number }):
  { readonly width: number; readonly height: number } {
  return {
    width: asset.runtimeWidth * UNIT_ART.width / UNIT_SPRITE_CANVAS.width,
    height: asset.runtimeHeight * UNIT_ART.height / UNIT_SPRITE_CANVAS.height,
  };
}

/**
 * Foot-relative overlay Y offsets derived from per-unit board height.
 * Defaults match the ordinary 40×50 sprite: chest −28, result −54, damage −64, defeat −88.
 * Health bars stay at the tile foot (`HEALTH_BAR.offsetY`); turn rings stay tile-sized.
 */
export function unitOverlayOffsets(artHeight: number = UNIT_ART.height): {
  readonly chest: number; readonly result: number; readonly damage: number; readonly defeat: number;
} {
  const k = artHeight / UNIT_ART.height;
  return { chest: -28 * k, result: -54 * k, damage: -64 * k, defeat: -88 * k };
}

export function unitBounds(
  tile: Tile, anchor: { x: number; y: number }, art: { readonly width: number; readonly height: number } = UNIT_ART,
): Bounds {
  const point = projectTile(tile);
  const left = point.x - art.width * anchor.x;
  const top = point.y - art.height * anchor.y;
  return { left, top, right: left + art.width, bottom: top + art.height };
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
