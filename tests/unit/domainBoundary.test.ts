import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { previewCommand } from '../../src/domain/battle';
import { hashJson } from '../../src/domain/contentIdentity';
import { catalogFixture } from './fixtures/contentContract';
import type { ContentCatalog } from '../../src/content/types';

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return '{' + Object.entries(v).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,value]) => `${JSON.stringify(key)}:${canonical(value)}`).join(',') + '}';
  return JSON.stringify(v);
}
for (const text of ['plain', 'é元宝', '🌲⚔️', 'x'.repeat(2000), '\ud800']) it(`content SHA256 agrees with independent Node oracle for ${JSON.stringify(text.slice(0,10))}`, () => {
  const catalog: ContentCatalog = { ...catalogFixture, assets: { ...catalogFixture.assets,
    'asset:fixture_grass': { ...catalogFixture.assets['asset:fixture_grass'], provenance: { ...catalogFixture.assets['asset:fixture_grass'].provenance, prompt: text } } } };
  const expected = 'sha256:' + createHash('sha256').update(canonical(catalog), 'utf8').digest('hex');
  expect(hashJson(catalog)).toBe(expected);
});
it('command validation rejects getter fields without evaluating them', () => {
  for (const key of ['type','unitId','to']) {
    const command = { type:'move', unitId:1, to:{x:0,y:0} };
    Object.defineProperty(command,key,{enumerable:true,get(){throw Error('accessor executed');}});
    expect(previewCommand(null,command,catalogFixture)).toEqual({ok:false,reason:'malformedCommand'});
  }
});
it('pure domain/content have no entropy source or browser/Node imports', () => {
  for (const dir of ['src/domain','src/content']) for (const filename of readdirSync(resolve(dir)).filter(p=>p.endsWith('.ts'))) {
    const source=readFileSync(resolve(dir,filename),'utf8');
    expect(source).not.toMatch(/\b(?:Math\s*\.\s*random|Date\s*\.\s*now)\s*\(/);
    for (const match of source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)) expect(match[1]).toMatch(/^\.\.?\//);
  }
});
it('mechanically typechecks domain/content without DOM or Node ambient types', () => {
  const config=JSON.parse(readFileSync(resolve('tsconfig.domain.json'),'utf8'));
  expect(config.compilerOptions.lib).toEqual(['ES2022']);
  expect(config.compilerOptions.types).toEqual([]);
  const pkg=JSON.parse(readFileSync(resolve('package.json'),'utf8'));
  expect(pkg.scripts.typecheck).toContain('tsconfig.domain.json');
});
