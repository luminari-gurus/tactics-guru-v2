import { describe, expect, it } from 'vitest';
import { BOARD_FIXTURE, BOARD_SIZE } from '../../src/diagnostics/boardFixture';
import { boardBounds, fitBoard, orderTiles, projectTile, tileFaces } from '../../src/geometry/iso';

describe('diagnostic isometric geometry', () => {
  it('projects known origin, axes and elevation fixtures', () => {
    expect(projectTile({ x: 0, y: 0, elevation: 0 })).toEqual({ x: 0, y: 0 });
    expect(projectTile({ x: 1, y: 0, elevation: 0 })).toEqual({ x: 40, y: 20 });
    expect(projectTile({ x: 0, y: 1, elevation: 0 })).toEqual({ x: -40, y: 20 });
    expect(projectTile({ x: 2, y: 3, elevation: 2 })).toEqual({ x: -40, y: 52 });
  });

  it('shares exact top edges for adjacent equal-height cells', () => {
    const origin = tileFaces({ x: 0, y: 0, elevation: 0 });
    const next = tileFaces({ x: 1, y: 0, elevation: 0 });
    expect(origin.top[1]).toEqual(next.top[0]);
    expect(origin.top[2]).toEqual(next.top[3]);
  });

  it('extends elevated columns to the common base and keeps faces joined', () => {
    const faces = tileFaces({ x: 1, y: 1, elevation: 2 });
    expect(faces.top).toEqual([{ x: 0, y: -28 }, { x: 40, y: -8 }, { x: 0, y: 12 }, { x: -40, y: -8 }]);
    expect(faces.left).toEqual([{ x: -40, y: -8 }, { x: 0, y: 12 }, { x: 0, y: 72 }, { x: -40, y: 52 }]);
    expect(faces.right).toEqual([{ x: 0, y: 12 }, { x: 40, y: -8 }, { x: 40, y: 52 }, { x: 0, y: 72 }]);
  });

  it('orders back to front, with stable coordinate tie-breaks, without sorting by elevation', () => {
    const tiles = [{ x: 1, y: 1, elevation: 0 }, { x: 0, y: 1, elevation: 2 }, { x: 1, y: 0, elevation: 0 }, { x: 0, y: 0, elevation: 1 }];
    const before = structuredClone(tiles);
    const expected = [tiles[3], tiles[2], tiles[1], tiles[0]];
    expect(orderTiles(tiles)).toEqual(expected);
    expect(orderTiles([...tiles].reverse())).toEqual(expected);
    expect(tiles).toEqual(before);
  });

  it('provides a complete bounded immutable fixed fixture with elevation steps', () => {
    expect(BOARD_FIXTURE).toHaveLength(16);
    expect(new Set(BOARD_FIXTURE.map(tile => `${tile.x},${tile.y}`)).size).toBe(16);
    expect([...new Set(BOARD_FIXTURE.map(tile => tile.elevation))].sort()).toEqual([0, 1, 2]);
    expect(BOARD_FIXTURE.every(tile => Number.isInteger(tile.x) && Number.isInteger(tile.y) && tile.x >= 0 && tile.y >= 0 && tile.x < BOARD_SIZE && tile.y < BOARD_SIZE)).toBe(true);
    expect(Object.isFrozen(BOARD_FIXTURE)).toBe(true);
    expect(BOARD_FIXTURE.every(Object.isFrozen)).toBe(true);
  });

  it('includes complete side walls and negative projection coordinates in board bounds', () => {
    expect(boardBounds([{ x: 0, y: 0, elevation: 2 }])).toEqual({ left: -40, top: -68, right: 40, bottom: 32 });
    expect(boardBounds(BOARD_FIXTURE)).toEqual({ left: -160, top: -20, right: 160, bottom: 152 });
  });

  it.each([{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 320 }])('fits every face below the panel within $width x $height', viewport => {
    const bounds = boardBounds(BOARD_FIXTURE);
    const layout = fitBoard(bounds, viewport, 140);
    expect(layout.x + bounds.left * layout.scale).toBeGreaterThanOrEqual(16 - 1e-8);
    expect(layout.x + bounds.right * layout.scale).toBeLessThanOrEqual(viewport.width - 16 + 1e-8);
    expect(layout.y + bounds.top * layout.scale).toBeGreaterThanOrEqual(156 - 1e-8);
    expect(layout.y + bounds.bottom * layout.scale).toBeLessThanOrEqual(viewport.height - 16 + 1e-8);
    expect(layout.scale).toBeGreaterThan(0);
  });
});
