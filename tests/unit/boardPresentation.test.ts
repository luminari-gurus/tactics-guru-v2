import { describe, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { orderTiles, projectTile, tileDepth } from '../../src/geometry/iso';
import { pickTile, screenToBoard } from '../../src/geometry/picking';

describe('authored board presentation', () => {
  it('uses every authored cell and resolves canonical art and anchors for every spawn', () => {
    const before = structuredClone(battleCatalog);
    const board = buildBoardPresentation(battleCatalog, 'map:forest_ruins');
    expect(board.tiles).toHaveLength(144);
    expect(board.occupants.map(unit => unit.unitId)).toEqual(['fighter', 'ranger', 'mage', 'goblin_grunt', 'goblin_archer', 'goblin_grunt']);
    for (const unit of board.occupants) {
      const asset = battleCatalog.assets[unit.assetId];
      expect(asset.kind).toBe('unit-sprite');
      if (asset.kind === 'unit-sprite') expect(unit.anchor).toEqual(asset.anchor);
      expect(unit.tile).toEqual(board.tiles.find(tile => tile.x === unit.tile.x && tile.y === unit.tile.y));
    }
    expect(board.occupants.find(unit => unit.id === 2)?.tile.elevation).toBe(1);
    expect(battleCatalog).toEqual(before);
  });

  it('matches picking painter order with unique nonoverlapping slots for every authored column', () => {
    const board = buildBoardPresentation(battleCatalog, 'map:forest_ruins');
    const ordered = orderTiles(board.tiles);
    expect([...board.tiles].sort((a, b) => a.depth - b.depth)).toEqual(ordered);
    expect(new Set(board.tiles.map(tile => tile.depth)).size).toBe(144);
    for (let i = 1; i < ordered.length; i++) expect(ordered[i].depth - ordered[i - 1].depth).toBeGreaterThanOrEqual(3);
    for (const unit of board.occupants) expect(unit.depth).toBe(unit.tile.depth + 2.5);
  });

  it.each([{ width: 3, height: 7 }, { width: 7, height: 3 }])('preserves depth ties on a $width by $height board', ({ width, height }) => {
    const tiles = Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), elevation: i % 3 }));
    expect([...tiles].reverse().sort((a, b) => tileDepth(a, height) - tileDepth(b, height))).toEqual(orderTiles(tiles));
    expect(new Set(tiles.map(tile => tileDepth(tile, height))).size).toBe(tiles.length);
  });

  it('preserves visible authored picks through pan and zoom at every elevation', () => {
    const { tiles } = buildBoardPresentation(battleCatalog, 'map:forest_ruins');
    const elevations = new Set<number>();
    for (const tile of tiles) {
      const point = projectTile(tile);
      // Some authored centers are hidden by the solid face of a nearer elevated column.
      const visible = pickTile(tiles, point);
      if (visible === tile) elevations.add(tile.elevation);
      for (const scale of [0.3, 1, 4]) {
        const view = { x: 137, y: -91, scale };
        const screen = { x: view.x + point.x * scale, y: view.y + point.y * scale };
        expect(pickTile(tiles, screenToBoard(screen, view))).toBe(visible);
      }
    }
    expect([...elevations].sort()).toEqual([0, 1, 2]);
  });
});
