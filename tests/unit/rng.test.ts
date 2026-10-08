import { describe, expect, it } from 'vitest';

import * as rng from '../../src/domain/rng';
// Deliberately bypass the static contract only for malformed runtime inputs.
const nextInvalid = (input: unknown) => rng.nextUint32(input as rng.RngState);

describe('versioned sfc32 boundary', () => {
  const vectors = [
    [1, [725930813,1286218714,3405868155,13], [2012149540,1872316204,1707632675,1779833415,2026416846]],
    [12345, [658686678,3871441195,854079202,13], [235160590,2967261163,116171463,2882324903,362604721]],
    [4294967295, [3163937632,3115766180,1501450466,13], [1984736529,3747275468,1287205723,2021412065,2215341480]],
  ] as const;
  for (const [seed, state, outputs] of vectors) it(`matches reference seed ${seed}`, () => {
    let current = rng.seedRng(seed);
    expect(current).toEqual({ words: state, cursor: 0 });
    for (const value of outputs) {
      const result = rng.nextUint32(current);
      expect(result.value).toBe(value); current = result.rng;
    }
    expect(current.cursor).toBe(outputs.length);
    expect(rng.nextUint32(JSON.parse(JSON.stringify(current)))).toEqual(rng.nextUint32(current));
  });
  it('counts rejected draws, not just returned dice', () => {
    expect(rng.rollDie({ words: [4294967279,0,0,0], cursor: 0 }, 20).value).toBe(20);
    expect(rng.rollDie({ words: [4294967280,0,0,0], cursor: 0 }, 20)).toEqual({ value: 2, rng: { words: [0,4294967152,4263510016,2], cursor: 2 } });
  });
  it('isolates nested words and carries counter wrap with an explicit cursor', () => {
    const input = Object.freeze({ words: Object.freeze([0,0,0,4294967295] as const), cursor: 9 });
    const output = rng.nextUint32(input);
    expect(output.rng.words[3]).toBe(0); expect(output.rng.cursor).toBe(10);
    expect(output.rng.words).not.toBe(input.words);
  });
  it('rejects sparse and decorated tuples before any arithmetic', () => {
    for (const words of [new Array(4), Object.assign([0,0,0,0], { extra: 1 }), [undefined,0,0,0]])
      expect(() => nextInvalid({ words, cursor: 0 })).toThrow();
    expect(() => nextInvalid({ words:[0,0,0,0], cursor:0, extra:1 })).toThrow();
  });
  it('rejects malformed snapshots, seeds, bounds and exhausted cursors', () => {
    for (const seed of [-1,1.5,NaN,Infinity,4294967296,Number.MAX_SAFE_INTEGER]) expect(() => rng.seedRng(seed)).toThrow();
    for (const words of [[0,0,0], [0,0,0,0,0], [-1,0,0,0], [1.1,0,0,0], [NaN,0,0,0]]) expect(() => nextInvalid({ words, cursor: 0 })).toThrow();
    for (const cursor of [-1,0.5,NaN,Number.MAX_SAFE_INTEGER]) expect(() => rng.nextUint32({ words:[0,0,0,0], cursor })).toThrow();
    for (const sides of [0,-1,1.5,NaN,4294967297]) expect(() => rng.rollDie(rng.seedRng(1), sides)).toThrow();
  });
});
