import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { generateMap, validMapCells, MAP_TYPES, type MapType, type MapCell } from '../../src/map/generate';
import { applyBiome, BIOMES, type Biome } from '../../src/map/biomes';
import { createOverworld, type OverworldState, type OverworldMarker } from '../../src/map/state';
import { createMovement, stepMovement, DEFAULT_BEHAVIORS, type EnemyBehavior, type OverworldMovement } from '../../src/map/movement';
import * as rng from '../../src/domain/rng';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';

const seeds = [...new Set([...Array.from({ length: 256 }, (_, i) => i), 12345, 424242, 2147483648, 4294967295])];

// Independent flood-fill checks the output rather than trusting the generator validator.
function inspect(cells: readonly MapCell[]): Set<number> {
  expect(cells).toHaveLength(400);
  expect(cells.every(c => c === 0 || c === 1)).toBe(true);
  const floors = cells.flatMap((cell, i) => cell === 1 ? [i] : []);
  expect(floors.length).toBeGreaterThanOrEqual(60);
  expect(floors.length).toBeLessThanOrEqual(320);
  expect(floors.every(i => i % 20 > 0 && i % 20 < 19 && Math.floor(i / 20) > 0 && Math.floor(i / 20) < 19)).toBe(true);
  const reached = new Set([floors[0]]);
  const todo = [floors[0]];
  while (todo.length) {
    const cell = todo.pop()!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const x = cell % 20 + dx, y = Math.floor(cell / 20) + dy;
      const next = y * 20 + x;
      if (x >= 0 && x < 20 && y >= 0 && y < 20 && cells[next] === 1 && !reached.has(next)) {
        reached.add(next); todo.push(next);
      }
    }
  }
  expect(reached.size).toBe(floors.length);
  return reached;
}

describe('independent seeded map', () => {
  it('keeps dimensions, borders, connectivity and repeatability across the representative seed matrix', () => {
    const layouts = new Set<string>();
    for (const seed of seeds) {
      const map = generateMap(seed);
      expect(map).toMatchObject({ seed, width: 20, height: 20, version: 'rooms-v1', fallback: false });
      inspect(map.cells);
      expect(generateMap(seed)).toEqual(map);
      if (seed < 256) layouts.add(map.cells.join(''));
    }
    expect(layouts.size).toBeGreaterThanOrEqual(Math.ceil(256 * 0.9));
  });
  it.each([-1, 0x100000000, 1.5, NaN, Infinity])('rejects invalid numeric seed %s', seed => {
    expect(() => generateMap(seed)).toThrow(RangeError);
  });
  it.each(MAP_TYPES)('has no clock dependency or effect on an existing battle and its next RNG draw ($id)', ({ id }) => {
    const battle = new BattleSession(battleCatalog, 'map:forest_ruins', 42);
    const before = structuredClone(battle.state);
    const expected = generateMap(12345, id);
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock accessed'); });
    const entropy = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy accessed'); });
    try {
      expect(generateMap(12345, id)).toEqual(expected);
      expect(battle.state).toEqual(before);
      expect(rng.nextUint32(battle.state.rng)).toEqual(rng.nextUint32(before.rng));
    } finally { clock.mockRestore(); entropy.mockRestore(); }
    const source = readFileSync('src/map/generate.ts', 'utf8');
    expect(source).not.toMatch(/\b(?:window|document|localStorage|sessionStorage|BattleSession|Math\.random|Date\.now)\b/);
  });
  it.each(MAP_TYPES)('caps unusable candidates and returns the same validated fallback ($id)', ({ id }) => {
    const draw = vi.spyOn(rng, 'nextUint32').mockImplementation(state => ({ value: id === 'cellular' ? 99 : 0, rng: state }));
    try {
      const map = generateMap(1, id);
      expect(map.type).toBe(id);
      expect(map.fallback).toBe(true);
      inspect(map.cells);
      expect(draw.mock.calls.length).toBeLessThanOrEqual(id === 'rooms' ? 120 : id === 'cellular' ? 1400 : 30000);
      expect(generateMap(1, id)).toEqual(map);
    } finally { draw.mockRestore(); }
  });
  it('rejects malformed, empty, border-crossing and disconnected candidates', () => {
    expect(validMapCells([])).toBe(false);
    expect(validMapCells(Array(400).fill(0))).toBe(false);
    const map = [...generateMap(1).cells];
    map[0] = 1;
    expect(validMapCells(map)).toBe(false);
    map[0] = 0;
    map[21] = 2 as MapCell;
    expect(validMapCells(map)).toBe(false);
    const isolated: MapCell[] = Array<MapCell>(400).fill(0);
    for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) isolated[y * 20 + x] = 1;
    isolated[357] = 1;
    expect(validMapCells(isolated)).toBe(false);
  });
});


describe('map type contract', () => {
  it.each([
    ['rooms', 'd7dbea289cd9cdec54837ad1b0367a41a894b1503c5b9f862a4d54da5da6c8b0'],
    ['random-walker', 'dc2715ef5fc6b56526bd19300eea7157bada57f32ebdf580eff0ac70d3d3d893'],
    ['cellular', '31583dad387235929096a42f680f782551474198495569c9e6c54710f23dc88e'],
  ] as const)('preserves the pre-marker %s matrix fingerprint', (type, expected) => {
    const signature = createHash('sha256').update(seeds.map(seed => generateMap(seed, type).cells.join('')).join('\n')).digest('hex');
    expect(signature).toBe(expected);
  });
  it.each(MAP_TYPES)('$id is valid, deterministic and diverse', ({ id, version }) => {
    const layouts = new Set<string>();
    for (const seed of seeds) {
      const map = generateMap(seed, id);
      inspect(map.cells);
      expect(map).toMatchObject({ seed, type: id, version, width: 20, height: 20 });
      expect(generateMap(seed, id)).toEqual(map);
      if (seed < 256) layouts.add(map.cells.join(''));
    }
    expect(layouts.size).toBeGreaterThanOrEqual(Math.ceil(256 * 0.9));
  });
  it('rejects unknown types and invalid seeds for all types', () => {
    expect(() => generateMap(1, 'unknown' as MapType)).toThrow(RangeError);
    for (const { id } of MAP_TYPES) for (const seed of [-1, 0x100000000, 1.5, NaN, Infinity]) {
      expect(() => generateMap(seed, id)).toThrow(RangeError);
    }
  });
  it('the three algorithms have different layouts at representative seeds', () => {
    for (const seed of [1, 12345, 424242]) {
      expect(new Set(MAP_TYPES.map(({ id }) => generateMap(seed, id).cells.join(''))).size).toBe(3);
    }
  });
});

describe('authoritative overworld markers', () => {
  it.each([
    ['rooms', 0, [[7, 8], [14, 3], [4, 15], [5, 15]]],
    ['rooms', 1, [[5, 11], [12, 8], [12, 9], [6, 10]]],
    ['rooms', 4294967295, [[4, 5], [4, 12], [2, 13], [11, 10]]],
    ['random-walker', 0, [[1, 15], [11, 12], [7, 18], [7, 11]]],
    ['random-walker', 1, [[5, 13], [9, 5], [10, 8], [11, 6]]],
    ['random-walker', 4294967295, [[5, 14], [9, 18], [1, 14], [12, 13]]],
    ['cellular', 0, [[13, 11], [17, 5], [6, 17], [5, 5]]],
    ['cellular', 1, [[2, 5], [1, 12], [4, 7], [3, 11]]],
    ['cellular', 4294967295, [[15, 11], [13, 3], [11, 7], [7, 10]]],
  ] as const)('pins markers-v1 for %s seed %s', (type, seed, positions) => {
    const result = createOverworld(applyBiome(generateMap(seed, type)));
    if (!result.ok) throw Error(result.reason);
    expect(result.state.markers.map(({ x, y }) => [x, y])).toEqual(positions);
  });

  it.each(MAP_TYPES)('$id populates every seed/biome with reproducible distinct reachable markers', ({ id }) => {
    for (const seed of seeds) {
      const layout = generateMap(seed, id);
      const reached = inspect(layout.cells);
      const baseline = createOverworld(applyBiome(layout));
      expect(baseline.ok).toBe(true);
      if (!baseline.ok) throw Error(baseline.reason);
      for (const { id: biome } of BIOMES) {
        const map = applyBiome(layout, biome);
        const before = structuredClone(map);
        Object.freeze(map.cells); Object.freeze(map.terrain); Object.freeze(map);
        const result = createOverworld(map);
        expect(result.ok).toBe(true);
        if (!result.ok) throw Error(result.reason);
        expect(result.state.map).toBe(map);
        expect(result.state.placementVersion).toBe('markers-v1');
        expect(result.state.markers.map(({ id, kind }) => [id, kind])).toEqual([
          ['player', 'player'], ['enemy-1', 'enemy'], ['enemy-2', 'enemy'], ['enemy-3', 'enemy'],
        ]);
        const positions = result.state.markers.map(({ x, y }) => {
          expect(Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 20 && y >= 0 && y < 20).toBe(true);
          expect(reached.has(y * 20 + x)).toBe(true);
          return y * 20 + x;
        });
        expect(new Set(positions).size).toBe(4);
        expect(result.state.markers).toEqual(baseline.state.markers);
        expect(createOverworld(map)).toEqual(result);
        expect(map).toEqual(before);
      }
    }
  });

  it.each(MAP_TYPES)('populates the real generator fallback with unmocked placement ($id)', ({ id }) => {
    const draw = vi.spyOn(rng, 'nextUint32').mockImplementation(state => ({ value: id === 'cellular' ? 99 : 0, rng: state }));
    let layout;
    try { layout = generateMap(1, id); } finally { draw.mockRestore(); }
    expect(layout.fallback).toBe(true);
    const reached = inspect(layout.cells);
    const result = createOverworld(applyBiome(layout));
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.reason);
    expect(new Set(result.state.markers.map(({ x, y }) => y * 20 + x)).size).toBe(4);
    expect(result.state.markers.every(({ x, y }) => reached.has(y * 20 + x))).toBe(true);
  });

  it('fails explicitly without partial state for malformed or unusable layouts', () => {
    const map = applyBiome(generateMap(1));
    const disconnected: MapCell[] = Array<MapCell>(400).fill(0);
    for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) disconnected[y * 20 + x] = 1;
    disconnected[357] = 1;
    const sparse = [...map.cells]; delete sparse[0];
    for (const invalid of [
      { ...map, cells: [] }, { ...map, cells: Array<MapCell>(400).fill(0) },
      { ...map, cells: Array.from({ length: 400 }, (_, i): MapCell => i >= 21 && i < 24 ? 1 : 0) },
      { ...map, cells: disconnected }, { ...map, cells: sparse },
      { ...map, cells: map.cells.map((cell, i) => i === 21 ? 2 as MapCell : cell) },
      { ...map, width: 19 }, { ...map, height: 21 }, { ...map, seed: -1 },
      { ...map, terrain: [] }, { ...map, terrain: map.terrain.map(() => 'forest-open' as const) },
    ]) {
      expect(createOverworld(invalid)).toEqual({ ok: false, reason: expect.any(String) });
    }
  });

  it('uses exactly four local selection draws without entropy, time or battle changes', () => {
    const map = applyBiome(generateMap(0xffffffff));
    const battle = new BattleSession(battleCatalog, 'map:forest_ruins', 42);
    const before = structuredClone(battle.state);
    const expected = createOverworld(map);
    const draw = vi.spyOn(rng, 'nextUint32');
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock accessed'); });
    const entropy = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy accessed'); });
    try {
      expect(createOverworld(map)).toEqual(expected);
      expect(draw.mock.calls.map(([state]) => state.cursor)).toEqual([0, 1, 2, 3]);
      expect(battle.state).toEqual(before);
    } finally { draw.mockRestore(); clock.mockRestore(); entropy.mockRestore(); }
    expect(rng.nextUint32(battle.state.rng)).toEqual(rng.nextUint32(before.rng));
  });
});


describe('topology-preserving biome treatment', () => {
  it.each(BIOMES)('$id reproduces every map type without mutating frozen layout', ({ id, version }) => {
    for (const { id: type } of MAP_TYPES) for (const seed of seeds) {
      const layout = generateMap(seed, type);
      const before = structuredClone(layout);
      Object.freeze(layout.cells);
      Object.freeze(layout);
      const map = applyBiome(layout, id);
      expect(map).toMatchObject({ ...before, biome: id, biomeVersion: version });
      expect(map.terrain).toHaveLength(400);
      expect(map.terrain.every((terrain, i) => terrain === `${id}-${layout.cells[i] ? 'open' : 'blocked'}`)).toBe(true);
      inspect(map.cells);
      expect(layout).toEqual(before);
      expect(applyBiome(layout, id)).toEqual(map);
      applyBiome(layout, id === 'forest' ? 'desert' : 'forest');
      expect(applyBiome(layout, id)).toEqual(map);
    }
  });
  it('defaults to grassland and rejects unknown biomes', () => {
    expect(applyBiome(generateMap(1)).biome).toBe('grassland');
    expect(() => applyBiome(generateMap(1), 'snow' as Biome)).toThrow(RangeError);
  });
  it.each(MAP_TYPES)('retains bounded fallback for every biome ($id)', ({ id }) => {
    const draw = vi.spyOn(rng, 'nextUint32').mockImplementation(state => ({ value: id === 'cellular' ? 99 : 0, rng: state }));
    try {
      const layout = generateMap(1, id);
      expect(layout.fallback).toBe(true);
      for (const { id: biome } of BIOMES) {
        const map = applyBiome(layout, biome);
        expect(map.fallback).toBe(true);
        expect(map.cells).toEqual(layout.cells);
        inspect(map.cells);
      }
    } finally { draw.mockRestore(); }
  });
  it('has no entropy/clock dependency and preserves battle RNG and layout', () => {
    const battle = new BattleSession(battleCatalog, 'map:forest_ruins', 42);
    const before = structuredClone(battle.state);
    const layouts = MAP_TYPES.map(({ id }) => generateMap(12345, id));
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock accessed'); });
    const entropy = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy accessed'); });
    const draw = vi.spyOn(rng, 'nextUint32').mockImplementation(() => { throw Error('RNG accessed'); });
    try {
      for (const layout of layouts) for (const { id } of BIOMES) expect(applyBiome(layout, id).cells).toEqual(layout.cells);
      expect(battle.state).toEqual(before);
      expect(draw).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); entropy.mockRestore(); draw.mockRestore(); }
    expect(rng.nextUint32(battle.state.rng)).toEqual(rng.nextUint32(before.rng));
  });
});

describe('independent overworld enemy movement', () => {
  function fixture(positions = [[10,10],[3,3],[3,10],[17,17]], walls: number[] = []): OverworldState {
    const map = applyBiome(generateMap(1));
    const cells = Array.from({ length: 400 }, (_, i): MapCell =>
      i % 20 > 0 && i % 20 < 19 && i >= 20 && i < 380 && !walls.includes(i) ? 1 : 0);
    return { map: { ...map, cells, terrain: cells.map(c => c ? 'grassland-open' : 'grassland-blocked') },
      placementVersion: 'markers-v1', markers: positions.map(([x,y], i) => ({
        id: ['player','enemy-1','enemy-2','enemy-3'][i] as OverworldMarker['id'], kind: i ? 'enemy' : 'player', x,y,
      })) };
  }
  const idle: readonly EnemyBehavior[] = [
    { id: 'enemy-1', kind: 'passive' }, { id: 'enemy-2', kind: 'aggressive', range: 1 },
    { id: 'enemy-3', kind: 'aggressive', range: 1 },
  ];
  const position = (state: OverworldMovement, id = 'enemy-2') => state.world.markers.find(m => m.id === id)!;
  it('copies and validates complete per-enemy configuration before initialization', () => {
    const world = fixture();
    const profiles = idle.map(b => ({ ...b }));
    const state = createMovement(world, profiles);
    profiles[0].kind = 'aggressive';
    expect(state.behaviors[0].kind).toBe('passive');
    expect(createMovement(world).behaviors).toEqual(DEFAULT_BEHAVIORS);
    for (const invalid of [[], [...idle, idle[0]], [idle[0],idle[0],idle[2]],
      [idle[0],{ id:'player',kind:'passive' },idle[2]],
      [idle[0],{ id:'enemy-2',kind:'other' },idle[2]],
      ...[0,39,1.5,NaN,Infinity].map(range => [idle[0],{ id:'enemy-2',kind:'aggressive',range },idle[2]])]) {
      expect(() => createMovement(world, invalid as readonly EnemyBehavior[])).toThrow(RangeError);
    }
  });
  it('wanders only to legal neighbors and draws once even when enclosed', () => {
    const closed = [43,64,83,62]; // N/E/S/W around (3,3)
    for (const [walls, expected] of [[closed,[3,3]], [closed.filter(c => c !== 64),[4,3]]] as const) {
      const state = createMovement(fixture(undefined, [...walls]), idle);
      const next = stepMovement(state);
      expect([position(next,'enemy-1').x,position(next,'enemy-1').y]).toEqual(expected);
      expect(next.rng.cursor).toBe(1);
      expect(next.step).toBe(1);
      expect(state.rng.cursor).toBe(0);
      expect(state.world.markers[1]).toMatchObject({x:3,y:3});
    }
  });
  it('uses inclusive Manhattan detection without terrain occlusion and loses detection immediately', () => {
    const world = fixture(undefined, [204]); // wall directly between enemy-2 and player
    const configured = (range: number) => createMovement(world, [idle[0],{ id:'enemy-2',kind:'aggressive',range },idle[2]]);
    expect(position(stepMovement(configured(6)))).toMatchObject({x:3,y:10});
    const detected = stepMovement(configured(7));
    expect(position(detected)).toMatchObject({x:3,y:9}); // north wins equal detours
    const movedPlayer = { ...detected, world: { ...detected.world, markers: detected.world.markers.map(m => m.id === 'player' ? {...m,x:18,y:1} : m) } };
    expect(position(stepMovement(movedPlayer))).toEqual(position(detected));
  });
  it('waits adjacent and when every player approach is blocked', () => {
    const profiles: readonly EnemyBehavior[] = idle.map(b => b.id === 'enemy-2' ? {...b,kind:'aggressive',range:38} : b);
    const adjacent = createMovement(fixture([[10,10],[3,3],[9,10],[17,17]]), profiles);
    expect(position(stepMovement(adjacent))).toEqual(position(adjacent));
    const enclosed = createMovement(fixture(undefined,[190,211,230,209]),profiles);
    expect(position(stepMovement(enclosed))).toEqual(position(enclosed));
  });
  it('resolves a genuinely contested only-exit cell in ID order', () => {
    const profiles = DEFAULT_BEHAVIORS.map(b => ({id:b.id,kind:'aggressive' as const,range:38}));
    // Both enemies have only (4,4) as a legal exit. It is initially free.
    const walls = [63,82,103,44,65];
    const state = createMovement(fixture([[5,5],[3,4],[4,3],[17,17]],walls),profiles);
    const next = stepMovement(state);
    expect(position(next,'enemy-1')).toMatchObject({x:4,y:4});
    expect(position(next,'enemy-2')).toMatchObject({x:4,y:3});
    // Without the earlier claim, enemy-2 really does choose that same cell.
    const unclaimed = createMovement(fixture([[5,5],[2,2],[4,3],[17,17]],walls),profiles);
    expect(position(stepMovement(unclaimed),'enemy-2')).toMatchObject({x:4,y:4});
    expect(next.rng).toEqual(state.rng);
  });
  it('takes the shortest escape from a dead-end instead of moving greedily toward the player', () => {
    // East gets closer but ends at x=7. North/south are walled off; the
    // shortest path must first go west, then around the end of the U.
    const walls = [207,...[3,4,5,6,7].flatMap(x => [180+x,220+x])];
    const profiles: readonly EnemyBehavior[] = [idle[0],{id:'enemy-2',kind:'aggressive',range:38},idle[2]];
    let state = createMovement(fixture([[10,10],[3,3],[5,10],[17,17]],walls),profiles);
    state = stepMovement(state);
    expect(position(state)).toMatchObject({x:4,y:10});
    for (let i = 1; i < 13; i++) state = stepMovement(state);
    const distance = (s: OverworldMovement) => Math.abs(position(s).x-10)+Math.abs(position(s).y-10);
    expect(distance(state)).toBeGreaterThan(1);
    state = stepMovement(state);
    expect(distance(state)).toBe(1); // shortest route is 14 steps
  });
  it('never swaps occupied cells and later enemies can use vacated cells', () => {
    // A one-cell-wide corridor. First passive has only its western exit;
    // second passive may then enter the vacated cell, but cannot swap.
    const world = fixture([[10,10],[3,3],[4,3],[17,17]], [43,83,44,84,65]);
    const profiles: readonly EnemyBehavior[] = [idle[0],{id:'enemy-2',kind:'passive'},idle[2]];
    const next = stepMovement(createMovement(world,profiles));
    expect(position(next,'enemy-1')).toMatchObject({x:2,y:3});
    expect(position(next,'enemy-2')).toMatchObject({x:3,y:3});
  });
  it('is pure, bounded and reproducible across seed/type/biome movement corpora', () => {
    const battle = new BattleSession(battleCatalog, 'map:forest_ruins', 42);
    const battleBefore = structuredClone(battle.state);
    for (const type of MAP_TYPES) for (const biome of BIOMES) for (const seed of [0,1,2,12345,0xffffffff]) {
      const result = createOverworld(applyBiome(generateMap(seed,type.id),biome.id));
      if (!result.ok) throw Error(result.reason);
      const initial = createMovement(result.state);
      const before = structuredClone(initial);
      Object.freeze(initial.world.map.cells); Object.freeze(initial.world.map.terrain);
      initial.world.markers.forEach(Object.freeze); Object.freeze(initial.world.markers);
      Object.freeze(initial.world); Object.freeze(initial);
      let a = initial, b = createMovement(result.state);
      for (let step = 1; step <= 30; step++) {
        const previous = a;
        a = stepMovement(a); b = stepMovement(b);
        expect(a).toEqual(b);
        expect(a.step).toBe(step); expect(a.rng.cursor).toBe(step);
        expect(a.world.map).toBe(initial.world.map);
        expect(a.world.markers[0]).toEqual(initial.world.markers[0]);
        expect(new Set(a.world.markers.map(m => m.y*20+m.x)).size).toBe(4);
        for (const marker of a.world.markers) {
          expect(a.world.map.cells[marker.y*20+marker.x]).toBe(1);
          const old = previous.world.markers.find(m => m.id === marker.id)!;
          expect(Math.abs(marker.x-old.x)+Math.abs(marker.y-old.y)).toBeLessThanOrEqual(1);
        }
      }
      expect(initial).toEqual(before);
      expect(createMovement(result.state)).toEqual(before);
    }
    expect(battle.state).toEqual(battleBefore);
    expect(rng.nextUint32(battle.state.rng)).toEqual(rng.nextUint32(battleBefore.rng));
  });
  it('uses no clock or ambient randomness and rejects exhausted state', () => {
    const state = createMovement(fixture());
    const clock = vi.spyOn(Date,'now').mockImplementation(() => {throw Error('clock');});
    const random = vi.spyOn(Math,'random').mockImplementation(() => {throw Error('entropy');});
    try { expect(stepMovement(state)).toEqual(stepMovement(state)); }
    finally { clock.mockRestore(); random.mockRestore(); }
    expect(() => stepMovement({...state,step:Number.MAX_SAFE_INTEGER})).toThrow(RangeError);
  });
});
