import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardRenderer } from '../../src/phaser/BoardRenderer';
import { fitBoard, type BoardRegion } from '../../src/geometry/iso';
import { MAX_ZOOM } from '../../src/geometry/picking';

vi.mock('phaser', () => ({ default: {} }));

const bounds = { left: -488, right: 480, top: -49.5, bottom: 472 };
const region = (height: number, width = 390): BoardRegion => ({ x: 0, y: 100, width, height });

/** Exercise the real camera methods without constructing Phaser's display objects. */
function camera() {
  const viewport = { innerWidth: 390, innerHeight: 1000 };
  vi.stubGlobal('window', viewport);
  const transform = { x: 0, y: 0, scale: 1 };
  const root = {
    setPosition(x: number, y: number) { Object.assign(transform, { x, y }); return this; },
    setScale(scale: number) { transform.scale = scale; return this; },
  };
  const renderer: BoardRenderer = Object.assign(Object.create(BoardRenderer.prototype), {
    bounds, root,
    view: { x: 0, y: 0, scale: 1 },
    navigationView: { x: 0, y: 0, scale: 1 },
    viewport: { width: 1, height: 1 },
    region: { x: 0, y: 0, width: 1, height: 1 },
    fitScale: 1,
    effectLabels: [], effect: null, healthBars: new Map(),
  });
  return { renderer, transform, viewport };
}

afterEach(() => vi.unstubAllGlobals());

describe('battle camera layout constraints', () => {
  it('centers a real viewport refit after the layout caps a larger saved zoom', () => {
    const { renderer, transform, viewport } = camera();
    renderer.fit(390, 1000, region(240));
    renderer.resetView();
    renderer.zoom(MAX_ZOOM, { x: 195, y: 220 });
    const savedScale = transform.scale;
    expect(savedScale).toBeCloseTo(fitBoard(bounds, region(240)).scale * MAX_ZOOM, 8);

    renderer.fit(390, 1000, region(80));
    expect(transform.scale).toBeCloseTo(fitBoard(bounds, region(80)).scale * MAX_ZOOM, 8);
    expect(transform.scale).toBeLessThan(savedScale);

    // Resize without navigating again, keeping the pre-clamp navigation intent.
    viewport.innerWidth = 391;
    const resized = region(80, 391);
    renderer.fit(391, 1000, resized);
    expect(transform.scale).toBeCloseTo(fitBoard(bounds, resized).scale * MAX_ZOOM, 8);
    expect(transform.y + (bounds.top + bounds.bottom) / 2 * transform.scale)
      .toBeCloseTo(resized.y + resized.height / 2, 8);
    expect(transform.x + (bounds.left + bounds.right) / 2 * transform.scale)
      .toBeCloseTo(resized.x + resized.width / 2, 8);
  });

  it('restores the saved view after repeated temporary HUD size changes', () => {
    const { renderer, transform } = camera();
    renderer.fit(390, 1000, region(80));
    renderer.resetView();
    const saved = { ...transform };
    for (let cycle = 0; cycle < 3; cycle++) {
      renderer.fit(390, 1000, region(240));
      expect(transform.scale).toBeGreaterThan(saved.scale);
      renderer.fit(390, 1000, region(80));
      expect(transform).toEqual(saved);
    }
  });
});
