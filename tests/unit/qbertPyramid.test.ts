import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/content/validate';
import { standaloneBattleCatalog } from '../../src/content/standaloneCatalog';
import { QBERT_MAP_ID, QBERT_SIZE, isPyramidCell, qbertCatalog, qbertPyramid } from '../../src/content/qbertPyramid';
import { createBattle } from '../../src/domain/turns';
import { previewMovement } from '../../src/domain/grid';

describe('Q*bert pyramid battle map', () => {
  it('is a 7x7 grid whose 28-cube pyramid steps down one level per row', () => {
    expect([qbertPyramid.width, qbertPyramid.height]).toEqual([QBERT_SIZE, QBERT_SIZE]);
    const cubes = qbertPyramid.cells.filter(c => c.terrainId !== 'void');
    expect(cubes).toHaveLength(28);
    for (let row = 0; row < QBERT_SIZE; row++) expect(cubes.filter(c => c.x + c.y === row)).toHaveLength(row + 1);
    for (const c of qbertPyramid.cells) {
      expect(c.terrainId === 'void').toBe(!isPyramidCell(c.x, c.y));
      if (c.terrainId !== 'void') expect(c.elevation).toBe(QBERT_SIZE - 1 - (c.x + c.y));
    }
  });

  it('starts the party at the apex and passes content validation', () => {
    expect(qbertPyramid.spawns.find(s => s.unitId === 'fighter')).toMatchObject({ side: 'heroes', x: 0, y: 0 });
    for (const s of qbertPyramid.spawns) expect(isPyramidCell(s.x, s.y)).toBe(true);
    const checked = validateContent(qbertCatalog);
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it('creates a battle where movement never leaves the pyramid', () => {
    const catalog = standaloneBattleCatalog(qbertCatalog);
    const battle = createBattle(QBERT_MAP_ID, 1, catalog);
    expect(battle.ok).toBe(true);
    if (!battle.ok) return;
    for (const unit of battle.state.units) {
      const reach = previewMovement(battle.state, unit.id, catalog);
      if (!reach.ok) continue; // Only the active unit has a movement preview.
      expect(reach.cells.length).toBeGreaterThan(0);
      for (const { cell } of reach.cells) expect(isPyramidCell(cell.x, cell.y)).toBe(true);
    }
  });
});
