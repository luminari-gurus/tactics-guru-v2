import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, runInContext } from 'node:vm';

// Execute the actual serialized browser initializer without loading Playwright's runner.
const source = readFileSync('tests/helpers/dungeonEntropy.ts', 'utf8');
const initializer = stripTypeScriptTypes(source.slice(source.indexOf('export function pinDungeonEntropy'), source.indexOf('export async function')).replace('export ', ''));
function browser(seed: boolean | number, storageBlocked = false) {
  const values = new Map<string, string>();
  const context = createContext({ Uint32Array, crypto: { getRandomValues: (array: Uint32Array) => { array.fill(999); return array; } },
    sessionStorage: {
      getItem: (key: string) => { if (storageBlocked) throw Error('Storage blocked'); return values.get(key) ?? null; },
      setItem: (key: string, value: string) => { if (storageBlocked) throw Error('Storage blocked'); values.set(key, value); },
    },
  });
  const install = () => runInContext(`${initializer};pinDungeonEntropy(${JSON.stringify(seed)});`, context);
  install();
  return { context, install, draw: () => runInContext('crypto.getRandomValues(new Uint32Array(1))[0]', context) };
}
describe('dungeon entropy initializer', () => {
  it('continues sequential draws when the document initializer runs again', () => {
    const page = browser(true);
    expect(page.draw()).toBe(100); expect(page.draw()).toBe(101);
    page.install(); expect(page.draw()).toBe(102);
  });
  for (const seed of [0, 28, 0xffffffff]) it(`keeps fixed seed ${seed} without touching storage`, () => {
    const page = browser(seed, true);
    expect(page.draw()).toBe(seed); expect(page.draw()).toBe(seed);
    page.install(); expect(page.draw()).toBe(seed);
  });
  it('delegates other array shapes to the original crypto draw', () => {
    const page = browser(28);
    expect([...runInContext('crypto.getRandomValues(new Uint32Array(2))', page.context)]).toEqual([999, 999]);
  });
});
