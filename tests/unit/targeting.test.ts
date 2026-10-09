import { describe, expect, it, vi } from 'vitest';
import { catalogFixture } from './fixtures/contentContract';
import type { CellPosition, ContentCatalog, MapRecord, TerrainId } from '../../src/content/types';
import { lineCellsBetween, lineOfSightBlocked, manhattanDistance } from '../../src/domain/targeting';

// 5 × 5 synthetic map; forest is the only terrain that blocks line of sight here.
function losFixture(overrides: readonly { x: number; y: number; terrainId?: TerrainId; elevation?: number }[]) {
  const cells = Array.from({ length: 25 }, (_, i) => {
    const cell = { x: i % 5, y: Math.floor(i / 5), elevation: 0, terrainId: 'grass' as TerrainId };
    const override = overrides.find(o => o.x === cell.x && o.y === cell.y);
    return { ...cell, ...override };
  });
  const map: MapRecord = { id: 'map:los_fixture', width: 5, height: 5, cells, spawns: [] };
  const base: ContentCatalog = JSON.parse(JSON.stringify(catalogFixture));
  const catalog: ContentCatalog = { ...base, maps: { [map.id]: map },
    terrains: { ...base.terrains, forest: { ...base.terrains.forest, blocksLineOfSight: true } } };
  return { catalog, mapId: map.id };
}
const blocked = (overrides: Parameters<typeof losFixture>[0], from: CellPosition, to: CellPosition) => {
  const { catalog, mapId } = losFixture(overrides);
  return lineOfSightBlocked(catalog, mapId, from, to);
};

describe('targeting geometry (legacy TargetingService.gd:79-107,135-136)', () => {
  it('measures range as Manhattan distance', () => {
    expect(manhattanDistance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
    expect(manhattanDistance({ x: 2, y: 2 }, { x: 3, y: 3 })).toBe(2);
    expect(manhattanDistance({ x: 0, y: 4 }, { x: 4, y: 0 })).toBe(8);
  });
  it('samples the cells strictly between two cells in all eight directions', () => {
    const centre = { x: 2, y: 2 };
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]])
      expect(lineCellsBetween(centre, { x: 2 + 2 * dx, y: 2 + 2 * dy })).toEqual([{ x: 2 + dx, y: 2 + dy }]);
    expect(lineCellsBetween(centre, centre)).toEqual([]);
    expect(lineCellsBetween(centre, { x: 3, y: 2 })).toEqual([]);
    expect(lineCellsBetween(centre, { x: 3, y: 3 })).toEqual([]);
  });
  it('rounds exact halves up, as legacy roundi does on non-negative coordinates', () => {
    expect(lineCellsBetween({ x: 0, y: 0 }, { x: 2, y: 1 })).toEqual([{ x: 1, y: 1 }]);
    expect(lineCellsBetween({ x: 0, y: 1 }, { x: 2, y: 0 })).toEqual([{ x: 1, y: 1 }]);
    expect(lineCellsBetween({ x: 2, y: 1 }, { x: 0, y: 0 })).toEqual([{ x: 1, y: 1 }]);
    expect(lineCellsBetween({ x: 0, y: 0 }, { x: 4, y: 1 })).toEqual([{ x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }]);
  });
  it('keeps the legacy float lerp, not exact geometry', () => {
    // 11 · (15/22) is 7.499999999999999 in IEEE doubles (and in Godot's lerpf), so legacy samples x = 7, not 8.
    const cells = lineCellsBetween({ x: 0, y: 0 }, { x: 11, y: 22 });
    expect(cells[14]).toEqual({ x: 7, y: 15 });
    expect(cells).toHaveLength(21);
  });
  it('yields one distinct cell per step, never an endpoint, across the content coordinate bounds', () => {
    // Legacy deduplicates and drops endpoints defensively; the major axis advancing one cell per step makes both no-ops.
    for (let a = 0; a < 32 * 32; a += 3) for (let b = 0; b < 32 * 32; b += 5) {
      const from = { x: a % 32, y: Math.floor(a / 32) }, to = { x: b % 32, y: Math.floor(b / 32) };
      const cells = lineCellsBetween(from, to);
      const keys = new Set(cells.map(c => `${c.x},${c.y}`));
      expect(keys.size).toBe(Math.max(0, Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) - 1));
      expect(keys.has(`${from.x},${from.y}`) || keys.has(`${to.x},${to.y}`)).toBe(false);
    }
  });
  it('blocks only on line-of-sight terrain strictly between the two cells', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    try {
      expect(blocked([], { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
      expect(blocked([{ x: 2, y: 0, terrainId: 'forest' }], { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
      expect(blocked([{ x: 0, y: 0, terrainId: 'forest' }, { x: 4, y: 0, terrainId: 'forest' }], { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
      expect(blocked([{ x: 1, y: 0, terrainId: 'forest' }], { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
      expect(blocked([{ x: 2, y: 0, elevation: 4 }], { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
      expect(blocked([{ x: 2, y: 0, terrainId: 'stone' }], { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(false);
      expect(blocked([{ x: 1, y: 1, terrainId: 'forest' }], { x: 0, y: 0 }, { x: 2, y: 1 })).toBe(true);
      expect(blocked([{ x: 1, y: 0, terrainId: 'forest' }], { x: 0, y: 0 }, { x: 2, y: 1 })).toBe(false);
    } finally { vi.restoreAllMocks(); }
  });
});
