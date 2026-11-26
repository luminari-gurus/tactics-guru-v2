import { assert, expect, it, vi } from 'vitest';
import { dungeonBattleCatalog, dungeonEncounterCatalog, dungeonEncounterCatalogIdentity, hobgoblinDungeonBattleCatalog, hobgoblinDungeonEncounterCatalog, readDungeonEncounterCatalog, ENCOUNTER_KINDS } from '../../src/content/dungeonEncounters';
import { desertRunCatalog } from '../../src/content/desertCatalog';
import { CONTENT_BOUNDS, ENEMY_IDS, HERO_IDS } from '../../src/content/constants';
import { ENDLESS_SCALING_POLICY, PARTY_SCALING_POLICY, EXPANDED_ENCOUNTER_POLICY, dungeonBiome, encounterBattleCatalog, readDungeonEncounterSelection, encounterSelectionSeed, projectDungeonEnemies, scaleEnemyStat, selectDungeonEncounter } from '../../src/domain/dungeonEncounters';
import { resolveBattlefield, layoutSeed } from '../../src/domain/battlefield';
import { createBattle } from '../../src/domain/turns';
import * as encounterRules from '../../src/domain/dungeonEncounters';
import { atEncounter } from '../helpers/dungeonFixtures';
import { dungeonSeed, freshDungeon, floorDescriptor, floorMap, startDungeonBattle, dungeonBattle } from '../../src/domain/dungeon';
import { freshExploration } from '../../src/domain/exploration';
import { seedRng } from '../../src/domain/rng';
import { battleCatalog } from '../../src/content/catalog';
import { authoredEncounters, runCatalog } from '../../src/content/encounters';
import { expandedDungeonBattleCatalog, expandedDungeonEncounterCatalog } from '../../src/content/expandedDungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { BIOMES } from '../../src/map/biomes';
import { WINTER_TUNDRA_FAMILY_IDS } from '../../src/content/winterTundraFamily';
import { SUNSCORCHED_DESERT_FAMILY_IDS } from '../../src/content/sunscorchedDesertFamily';

it('admits every pool pairing, including generated guardian fallback and all survivor subsets', () => {
  const checked = readDungeonEncounterCatalog(hobgoblinDungeonEncounterCatalog, hobgoblinDungeonBattleCatalog); assert(checked.ok, JSON.stringify(checked));
  for (const pool of checked.catalog.pools) for (const map of pool.maps) for (const id of map.compositionIds) {
    const roster = checked.catalog.compositions.find(c => c.id === id)!.roster;
    const encounter = { id: `encounter:${map.id}` as const, source: map.source, roster };
    for (const fallback of [false, true]) {
      const resolved = resolveBattlefield(encounter, 13, hobgoblinDungeonBattleCatalog, fallback ? { rejectCandidate: () => true } : {});
      assert(resolved.ok, JSON.stringify(resolved));
      if (map.source.kind === 'generated') expect(resolved.diagnostics.fallback).toBe(fallback);
      for (let mask = 1; mask < 8; mask++) {
        const subset = { ...resolved.map, spawns: resolved.map.spawns.filter(s => s.side === 'enemies' || (mask & (1 << HERO_IDS.indexOf(s.unitId)))) };
        expect(createBattle(subset.id, 13, { ...hobgoblinDungeonBattleCatalog, maps: { [subset.id]: subset } }).ok).toBe(true);
      }
    }
  }
}, 30000);

it('selects exactly one Shaman at dungeon Forest Ruins spawn 6 without changing canonical or other rosters',()=>{
  const original=battleCatalog.maps['map:forest_ruins'].spawns;
  expect(original.map(s=>s.unitId)).toEqual(['fighter','ranger','mage','goblin_grunt','goblin_archer','goblin_grunt']);
  expect(runCatalog.maps['map:forest_ruins'].spawns).toBe(original);
  const composition=dungeonEncounterCatalog.compositions.find(c=>c.id==='forest_ruins_shaman_v1')!;
  expect(composition.roster).toEqual(original.map(s=>s.id===6?{...s,unitId:'goblin_shaman'}:s));
  expect(composition.roster.filter(s=>s.unitId==='goblin_shaman')).toHaveLength(1);
  for(const encounter of authoredEncounters.slice(1)) expect(dungeonEncounterCatalog.compositions.find(c=>c.id===encounter.id.slice(10))?.roster).toEqual(runCatalog.maps[encounter.mapId].spawns);
  for(let seed=0;seed<64;seed++) for(const slot of [0,1]) {
    const selection=selectDungeonEncounter(seed,1,slot);
    if(selection.encounter.source.kind==='authored'&&selection.encounter.source.mapId==='map:forest_ruins') {
      expect(selection.compositionId).toBe('forest_ruins_shaman_v1');expect(selection.encounter.roster).toEqual(composition.roster);
    } else expect(selection.encounter.roster.some(s=>s.unitId==='goblin_shaman')).toBe(false);
  }
});

it.each(['version', 'kind', 'empty', 'duplicate', 'biome', 'pool', 'boss', 'composition', 'authored', 'occupied', 'blocked', 'outside', 'unknownUnit', 'accessor', 'unreferenced'])('rejects invalid catalog %s', problem => {
  const c: any = structuredClone(dungeonEncounterCatalog);
  if (problem === 'version') c.version = 2;
  if (problem === 'kind') c.kinds[0] = 'future';
  if (problem === 'empty') c.pools[0].maps = [];
  if (problem === 'duplicate') c.compositions.push(c.compositions[0]);
  if (problem === 'biome') c.biomes[0].id = 'graveyard';
  if (problem === 'pool') c.biomes[0].poolId = 'unknown';
  if (problem === 'boss') c.bosses[0].victory = 'first-enemy';
  if (problem === 'composition') c.pools[0].maps[0].compositionIds = ['unknown'];
  if (problem === 'authored') c.pools[0].maps[0].compositionIds = [c.compositions[1].id];
  if (problem === 'occupied') c.compositions[0].roster[1] = { ...c.compositions[0].roster[1], x: c.compositions[0].roster[0].x, y: c.compositions[0].roster[0].y };
  if (problem === 'outside') c.compositions[0].roster[0].x = 32;
  if (problem === 'unknownUnit') c.compositions[0].roster[0].unitId = 'unknown';
  if (problem === 'accessor') Object.defineProperty(c, 'pools', { enumerable: true, get() { throw Error('must not invoke'); } });
  if (problem === 'unreferenced') c.compositions.push({ ...c.compositions[0], id: 'unused' });
  if (problem === 'blocked') {
    const content: any = structuredClone(dungeonBattleCatalog), map = content.maps['map:forest_ruins'], spawn = map.spawns[0];
    map.cells.find((cell: any) => cell.x === spawn.x && cell.y === spawn.y).terrainId = 'rock';
    expect(readDungeonEncounterCatalog(c, content).ok).toBe(false);
  } else expect(readDungeonEncounterCatalog(c).ok).toBe(false);
}, 30000);

it('pins deterministic selection, covers all kinds/biomes, and alternates only by depth', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 64; seed++) for (const depth of [1, 2, 10]) for (let slot = 0; slot < 3; slot++) {
    const selection = selectDungeonEncounter(seed, depth, slot);
    expect(selectDungeonEncounter(seed, depth, slot)).toEqual(selection);
    expect(selection.biome).toBe(dungeonBiome(seed, depth));
    expect(selection.kind).toBe(slot === 0 ? 'normal' : slot === 2 ? 'boss' : selection.kind);
    expect(selection.bossId !== null).toBe(slot === 2);
    seen.add(`${selection.biome}:${selection.kind}`);
  }
  expect([...seen].sort()).toEqual(['desert', 'forest'].flatMap(b => ENCOUNTER_KINDS.map(k => `${b}:${k}`)).sort());
  expect(dungeonBiome(0, 2)).not.toBe(dungeonBiome(0, 1));
  expect(dungeonBiome(0, 3)).toBe(dungeonBiome(0, 1));
  expect([0, 1, 2, 3].map(seed => [0, 1, 2].map(slot => {
    const { encounter, ...selection } = selectDungeonEncounter(seed, 2, slot);
    return { ...selection, source: encounter.source, spawnIds: encounter.roster.map(s => s.id) };
  }))).toMatchSnapshot('selection policy v1');
});

it('keeps the dungeon access step and Shaman roster isolated from other modes', () => {
  const original = desertRunCatalog.maps['map:forest_ruins'], dungeon = dungeonBattleCatalog.maps[original.id];
  expect(original.cells.find(c => c.x === 4 && c.y === 2)?.elevation).toBe(0);
  expect(dungeon.cells.find(c => c.x === 4 && c.y === 2)).toEqual({ x: 4, y: 2, elevation: 1, terrainId: 'stone' });
  expect(dungeon.cells.filter((c, i) => c !== original.cells[i])).toHaveLength(1);
  expect(dungeon.spawns).toEqual(original.spawns.map(s=>s.id===6?{...s,unitId:'goblin_shaman'}:s));
});

it('keeps identity independent of authored array ordering and separates every selection stream', () => {
  const c = dungeonEncounterCatalog;
  const reversed = { ...c, kinds: [...c.kinds].reverse(), biomes: [...c.biomes].reverse(), bosses: [...c.bosses].reverse(), compositions: [...c.compositions].reverse(),
    pools: [...c.pools].reverse().map(p => ({ ...p, maps: [...p.maps].reverse().map(m => ({ ...m, compositionIds: [...m.compositionIds].reverse() })) })) };
  expect(dungeonEncounterCatalogIdentity(reversed)).toBe(dungeonEncounterCatalogIdentity());
  const seeds = ['biome', 'kind', 'map', 'composition'].map(p => encounterSelectionSeed(42, 2, 1, p as 'biome'));
  expect(new Set(seeds).size).toBe(4);
  const before = { battle: seedRng(dungeonSeed(42, 2, 'battle', 1)), reward: dungeonSeed(42, 2, 'reward', 1), floor: dungeonSeed(42, 2, 'floor'),
    terrain: layoutSeed(dungeonSeed(42, 2, 'battle', 1), 'encounter:desert_arena'), exploration: freshExploration(dungeonSeed(42, 2, 'floor'), 21) };
  for (let slot = 0; slot < 3; slot++) selectDungeonEncounter(42, 2, slot);
  expect(before).toMatchSnapshot('unchanged dungeon and exploration streams');
});

it.each([1, 2, 10])('projects exact Grunt stats at depth %i with no elite/boss multiplier', depth => {
  const four = (kind: 'normal' | 'elite' | 'vault' | 'boss') => {
    const s = projectDungeonEnemies(depth, kind).enemies.goblin_grunt.stats;
    return [s.maxHp, s.power, s.accuracy, s.armorClass];
  };
  expect(four('normal')).toEqual(({ 1: [9, 2, 4, 12], 2: [10, 2, 4, 13], 10: [17, 4, 8, 23] })[depth]);
  expect(four('elite')).toEqual(four('normal')); expect(four('boss')).toEqual(four('normal'));
  expect(four('vault')).toEqual(({ 1: [11, 2, 5, 14], 2: [12, 2, 5, 16], 10: [20, 5, 10, 28] })[depth]);
});

it('rounds positive/signed halves, preserves zero, and saturates each bound without overflow', () => {
  expect(scaleEnemyStat(5, 2, 'normal', 'power')).toBe(6);
  expect(scaleEnemyStat(-5, 2, 'normal', 'accuracy')).toBe(-5);
  expect(scaleEnemyStat(-5, 2, 'vault', 'accuracy')).toBe(-6);
  for (const field of ['maxHp', 'power', 'accuracy', 'armorClass'] as const) {
    const base = desertRunCatalog.enemies.goblin_grunt.stats[field], max = CONTENT_BOUNDS[field].max;
    const threshold = Math.ceil((max * 10 - 5) / base) - 9;
    expect(scaleEnemyStat(base, threshold - 1, 'normal', field)).toBeLessThan(max);
    expect(scaleEnemyStat(base, threshold, 'normal', field)).toBe(max);
    expect(scaleEnemyStat(base, Number.MAX_SAFE_INTEGER, 'vault', field)).toBe(max);
  }
  for (const depth of [1, 2, Number.MAX_SAFE_INTEGER]) {
    expect(scaleEnemyStat(0, depth, 'vault', 'power')).toBe(0);
    expect(scaleEnemyStat(0, depth, 'vault', 'accuracy')).toBe(0);
    expect(scaleEnemyStat(-1, depth, 'vault', 'accuracy')).toBeGreaterThanOrEqual(-10);
  }
  expect(scaleEnemyStat(-1, Number.MAX_SAFE_INTEGER, 'normal', 'accuracy')).toBe(-10);
});

it('never mutates baseline stats or scales a previous projection', () => {
  const baseline = structuredClone(desertRunCatalog);
  const a = projectDungeonEnemies(10, 'vault'), b = projectDungeonEnemies(10, 'vault');
  expect(a).toEqual(b); expect(a.enemies).not.toBe(b.enemies); expect(desertRunCatalog).toEqual(baseline);
  for (const id of ['goblin_grunt', 'goblin_archer', 'goblin_shaman'] as const) {
    const { maxHp, power, accuracy, armorClass, ...rest } = a.enemies[id].stats;
    const { maxHp: h, power: p, accuracy: ac, armorClass: armor, ...original } = baseline.enemies[id].stats;
    expect(rest).toEqual(original);
  }
  expect(a.heroes).toBe(desertRunCatalog.heroes); expect(a.abilities).toBe(desertRunCatalog.abilities);
});

it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid depth %s before selection/projection', depth => {
  expect(() => selectDungeonEncounter(1, depth, 0)).toThrow(RangeError);
  expect(() => projectDungeonEnemies(depth, 'normal')).toThrow(RangeError);
});
it('rejects invalid seeds, slots, kinds and stat domains', () => {
  for (const seed of [-1, 0x100000000, 1.5, NaN]) expect(() => selectDungeonEncounter(seed, 1, 0)).toThrow(RangeError);
  for (const slot of [-1, 3, 1.5, NaN]) expect(() => selectDungeonEncounter(1, 1, slot)).toThrow(RangeError);
  expect(() => projectDungeonEnemies(1, 'unknown' as any)).toThrow(RangeError);
  expect(() => scaleEnemyStat(-1, 1, 'normal', 'power')).toThrow(RangeError);
  expect(() => scaleEnemyStat(101, 1, 'normal', 'maxHp')).toThrow(RangeError);
});


it('admits the expanded catalog and reaches every enabled enemy, composition and encounter kind through seeded selection', () => {
  const policy = EXPANDED_ENCOUNTER_POLICY;
  const content = validateContent(expandedDungeonBattleCatalog);
  assert(content.ok, content.ok ? undefined : JSON.stringify(content));
  const checked = readDungeonEncounterCatalog(expandedDungeonEncounterCatalog, expandedDungeonBattleCatalog);
  assert(checked.ok, JSON.stringify(checked));
  const seen = new Map<string, ReturnType<typeof selectDungeonEncounter>>();
  const kinds = new Set<string>();
  const startingBiomes = new Set<string>();
  for (let seed = 0; seed < 128; seed++) {
    startingBiomes.add(dungeonBiome(seed, 1, policy));
    const cycle = Array.from({ length: BIOMES.length }, (_, i) => dungeonBiome(seed, i + 1, policy));
    expect(new Set(cycle).size).toBe(BIOMES.length);
    expect(dungeonBiome(seed, cycle.length + 1, policy)).toBe(cycle[0]);
    for (let depth = 1; depth <= cycle.length * 2; depth++) for (let slot = 0; slot < 3; slot++) {
      const selection = selectDungeonEncounter(seed, depth, slot, policy);
      seen.set(selection.compositionId, selection);
      kinds.add(`${selection.biome}:${selection.kind}`);
    }
  }
  expect([...startingBiomes].sort()).toEqual(BIOMES.map(biome => biome.id).sort());
  expect([...kinds].sort()).toEqual(BIOMES.flatMap(biome => ENCOUNTER_KINDS.map(kind => `${biome.id}:${kind}`)).sort());
  expect([...seen.keys()].sort()).toEqual(checked.catalog.compositions.map(composition => composition.id).sort());
  const catalogOnlyEnemies = new Set<string>([...WINTER_TUNDRA_FAMILY_IDS, ...SUNSCORCHED_DESERT_FAMILY_IDS]);
  const enabledEnemies = ENEMY_IDS.filter(id => !catalogOnlyEnemies.has(id));
  expect([...new Set([...seen.values()].flatMap(selection => selection.encounter.roster
    .filter(spawn => spawn.side === 'enemies').map(spawn => spawn.unitId)))].sort()).toEqual(enabledEnemies.sort());

  for (const selection of seen.values()) {
    const catalog = encounterBattleCatalog(selection);
    expect(Object.keys(catalog.enemies).length).toBeLessThanOrEqual(6);
    const valid = validateContent(catalog);
    assert(valid.ok, valid.ok ? undefined : JSON.stringify(valid));
    const resolved = resolveBattlefield(selection.encounter, 13, catalog);
    assert(resolved.ok, JSON.stringify(resolved));
    for (let mask = 1; mask < 8; mask++) {
      const subset = { ...resolved.map, spawns: resolved.map.spawns.filter(spawn => spawn.side === 'enemies' ||
        (mask & (1 << HERO_IDS.indexOf(spawn.unitId)))) };
      expect(createBattle(subset.id, 13, { ...catalog, maps: { [subset.id]: subset } }).ok).toBe(true);
    }
  }
}, 30000);

it('round-trips a new dungeon in every biome and rejects selection identities from other policies', () => {
  const policy = EXPANDED_ENCOUNTER_POLICY;
  for (const biome of BIOMES) {
    const seed = Array.from({ length: 128 }, (_, index) => index).find(index => dungeonBiome(index, 1, policy) === biome.id)!;
    const state = freshDungeon(`expanded-${biome.id}`, seed, policy, true);
    expect(state.floors[0].descriptor.biome).toBe(biome.version);
    const encoded = encodeDungeon(state);
    assert(encoded.ok, JSON.stringify(encoded));
    expect(decodeDungeon(encoded.text)).toEqual({ ok: true, state });
  }
  const selection = selectDungeonEncounter(0, 1, 0, policy);
  expect(readDungeonEncounterSelection({ ...selection, catalogIdentity: dungeonEncounterCatalogIdentity() },
    1, 0, selection.biome, policy)).toBeNull();
});

it('paces fresh expanded enemies against guaranteed floor XP and preserves saved projections', () => {
  const fresh = selectDungeonEncounter(42, 5, 0, EXPANDED_ENCOUNTER_POLICY);
  expect(fresh.scalingPolicy).toBe(ENDLESS_SCALING_POLICY);
  for (const scalingPolicy of [ENDLESS_SCALING_POLICY, PARTY_SCALING_POLICY, 'enemy-depth-v1'] as const) {
    const saved = { ...fresh, scalingPolicy };
    expect(readDungeonEncounterSelection(saved, 5, 0, fresh.biome, fresh.policy)).toEqual(saved);
  }
  const stats = (depth: number) => projectDungeonEnemies(depth, 'normal', undefined, PARTY_SCALING_POLICY).enemies.goblin_grunt.stats;
  const hp = [1, 2, 3, 4, 5].map(depth => stats(depth).maxHp);
  expect(hp.every((value, i) => i === 0 || value > hp[i - 1])).toBe(true);
  expect(stats(20).maxHp).toBeGreaterThan(stats(5).maxHp);
  expect(stats(8192).maxHp - stats(5).maxHp).toBeLessThanOrEqual(Math.round(stats(1).maxHp * 0.2));
  expect(stats(8192).power).toBe(stats(5).power);
  expect(stats(5).armorClass).toBe(stats(1).armorClass);
  expect(stats(5).accuracy).toBe(stats(1).accuracy);
  const solo = projectDungeonEnemies(5, 'normal', undefined, PARTY_SCALING_POLICY, 1).enemies.goblin_grunt.stats;
  expect(solo.maxHp).toBe(Math.round(stats(5).maxHp * 0.5));
  expect(solo.power).toBe(Math.round(stats(5).power * 0.5));
  const wounded = projectDungeonEnemies(5, 'normal', undefined, PARTY_SCALING_POLICY, 2.25).enemies.goblin_grunt.stats;
  expect(wounded.maxHp).toBeLessThan(stats(5).maxHp);
  expect(wounded.maxHp).toBeGreaterThan(solo.maxHp);
});

it('keeps adding endurance across deep floors without increasing late-game damage', () => {
  const projected = (depth: number) => projectDungeonEnemies(depth, 'normal', undefined, ENDLESS_SCALING_POLICY).enemies.goblin_grunt.stats;
  const depths = [5, 25, 250, 2500, 8192, Number.MAX_SAFE_INTEGER];
  for (const [i, depth] of depths.entries()) {
    expect(projected(depth).power).toBe(projected(5).power);
    if (i) expect(projected(depth).maxHp).toBeGreaterThan(projected(depths[i - 1]).maxHp);
  }
});

it('starts and restores a battle whose scaled enemies exceed the authored HP limit', () => {
  const catalogFor = encounterRules.encounterBattleCatalog;
  const fixture = vi.spyOn(encounterRules, 'encounterBattleCatalog').mockImplementation(selection => {
    const catalog = catalogFor(selection);
    const enemies = { ...catalog.enemies };
    for (const [id, enemy] of Object.entries(enemies)) {
      enemies[id] = { ...enemy, stats: { ...enemy.stats, maxHp: 70 } };
    }
    return { ...catalog, enemies };
  });
  try {
    const policy = EXPANDED_ENCOUNTER_POLICY;
    const base = freshDungeon('high-hp', 19, policy);
    const floors = Array.from({ length: 9 }, (_, i) => {
      const descriptor = floorDescriptor(base.seed, i + 1, undefined, policy);
      const position = descriptor.upstairs;
      return { descriptor, position, completed: i < 8 ? 3 : 0,
        exploration: freshExploration(descriptor.seed, position, floorMap(descriptor)) };
    });
    const entry = startDungeonBattle(atEncounter({ ...base, floors, depth: 9 }));
    assert(entry.ok, JSON.stringify(entry));
    const enemy = entry.state.activeBattle!.units.find(unit => unit.side === 'enemy')!;
    expect(enemy.hp).toBe(105);
    const encoded = encodeDungeon(entry.state);
    assert(encoded.ok);
    const restored = decodeDungeon(encoded.text);
    assert(restored.ok);
    expect(restored.state.activeBattle).toEqual(entry.state.activeBattle);
    expect(dungeonBattle(restored.state)?.state.units.find(unit => unit.id === enemy.id)?.hp).toBe(105);
  } finally {
    fixture.mockRestore();
  }
});
