import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { generateMap, validMapCells, MAP_TYPES, type MapType, type MapCell } from '../../src/map/generate';
import * as rng from '../../src/domain/rng';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';

const seeds = [...new Set([...Array.from({ length: 256 }, (_, i) => i), 12345, 424242, 2147483648, 4294967295])];

// Independent flood-fill checks the output rather than trusting the generator validator.
function inspect(cells: readonly MapCell[]): void {
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
  it('preserves the pre-change Rooms matrix fingerprint', () => {
    const signature = createHash('sha256').update(seeds.map(seed => generateMap(seed, 'rooms').cells.join('')).join('\n')).digest('hex');
    expect(signature).toBe('d7dbea289cd9cdec54837ad1b0367a41a894b1503c5b9f862a4d54da5da6c8b0');
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
