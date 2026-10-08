import { describe, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { validateContent } from '../../src/content/validate';

describe('authored first battle', () => {
  it('accepts the actual catalog and complete fixed map', () => {
    expect(validateContent(battleCatalog)).toEqual({ ok: true, catalog: battleCatalog });
    const map = battleCatalog.maps['map:forest_ruins'];
    expect(map.cells).toHaveLength(144);
    expect(map.spawns.map(s => s.unitId)).toEqual(['fighter', 'ranger', 'mage', 'goblin_grunt', 'goblin_archer', 'goblin_grunt']);
    expect(map.cells.filter(c => c.elevation === 1)).toHaveLength(15);
    expect(map.cells.filter(c => c.elevation === 2)).toHaveLength(9);
    expect(Object.keys(battleCatalog.assets)).toHaveLength(15);
    expect(battleCatalog.heroes.fighter.stats.maxHp).toBe(18);
    expect(battleCatalog.heroes.ranger.stats.accuracy).toBe(5);
    expect(battleCatalog.heroes.mage.stats.power).toBe(4);
  });
  it.each(['reference', 'occupiedSpawn', 'coordinate', 'walkability', 'number', 'cells'])('rejects an authored-content %s regression', code => {
    const c: any = structuredClone(battleCatalog);
    const map = c.maps['map:forest_ruins'];
    if (code === 'reference') c.heroes.fighter.spriteAssetId = 'asset:missing';
    if (code === 'occupiedSpawn') Object.assign(map.spawns[1], { x: 1, y: 8 });
    if (code === 'coordinate') map.spawns[0].x = 12;
    if (code === 'walkability') c.terrains.grass.walkable = false;
    if (code === 'number') c.heroes.mage.stats.maxHp = 101;
    if (code === 'cells') map.cells.pop();
    const result = validateContent(c);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.code === code)).toBe(true);
  });
});
