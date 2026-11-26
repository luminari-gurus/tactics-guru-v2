import { expect, test } from 'vitest';
import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { battleAssets } from '../../src/content/assets';
import { desertAssets } from '../../src/content/desertAssets';
import { forestBossAssets } from '../../src/content/forestBosses';
import { forestFamilyAssets } from '../../src/content/forestFamily';
import { goblinFamilyAssets } from '../../src/content/goblinFamily';
import { hobgoblinAssets } from '../../src/content/hobgoblin';
import { cavernsFamilyAssets } from '../../src/content/cavernsFamily';
import { quarryFamilyAssets } from '../../src/content/quarryFamily';
import { graveyardFamilyAssets } from '../../src/content/graveyardFamily';
import { emberWastesFamilyAssets } from '../../src/content/emberWastesFamily';
import { winterTundraFamilyAssets } from '../../src/content/winterTundraFamily';
import { sunscorchedDesertFamilyAssets } from '../../src/content/sunscorchedDesertFamily';
import { stormCoastFamilyAssets } from '../../src/content/stormCoastFamily';
import { shatteredCitadelFamilyAssets } from '../../src/content/shatteredCitadelFamily';
import { wetlandsFamilyAssets } from '../../src/content/wetlandsFamily';
import { runInNewContext } from 'node:vm';
import { APPLICATION_LOAD_FILES_MANIFEST, APPLICATION_LOAD_FILES_META } from '../../src/diagnostics/applicationLoadFailure';

for (const base of ['/', '/tactics/']) {
  test(`built cache rules cover only versioned code and unchanged battle images at ${base}`, async () => {
    const result = await build({ base, logLevel: 'silent', build: { write: false } });
    if (!('output' in result)) throw new Error('Expected one production bundle');
    const headers = result.output.find(file => file.fileName === '_headers');
    if (headers?.type !== 'asset') throw new Error('Missing cache headers');
    const rules = String(headers.source).trim().split('\n\n');
    expect(rules).toHaveLength(1); // Cloudflare Pages rule limit is 100; hashed files share one prefix.
    const [path, header, ...extra] = rules[0].split('\n');
    expect(header).toBe('  Cache-Control: public, max-age=31536000, immutable');
    expect(extra).toEqual([]);
    expect(path).toBe(`${base}assets/*`);
    const code = result.output.filter(file => /\.(js|css)$/.test(file.fileName));
    expect(code.length).toBeGreaterThan(0);
    expect(code.every(file => file.fileName.startsWith('assets/'))).toBe(true);
    const images = Object.values({...battleAssets,...desertAssets,...hobgoblinAssets,...goblinFamilyAssets,...forestFamilyAssets,...forestBossAssets,...wetlandsFamilyAssets,...cavernsFamilyAssets,...quarryFamilyAssets,...graveyardFamilyAssets,...emberWastesFamilyAssets,...winterTundraFamilyAssets,...sunscorchedDesertFamilyAssets,...stormCoastFamilyAssets,...shatteredCitadelFamilyAssets}).map(asset => {
      const bytes = readFileSync(`public${asset.runtimePath}`);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0,16);
      const path = `assets/${hash}${asset.runtimePath}`;
      const emitted = result.output.find(file => file.fileName === path);
      expect(emitted?.type, asset.id).toBe('asset');
      if (emitted?.type !== 'asset') throw new Error(`Missing versioned image: ${asset.id}`);
      const builtBytes = Buffer.from(emitted.source);
      // Use the native byte comparison on success and retain the assertion diff on failure.
      if (!builtBytes.equals(bytes)) expect(builtBytes, asset.id).toEqual(bytes);
      expect(asset.runtimePath.startsWith('/assets/')).toBe(false);
      return path;
    });
    expect(images.every(file => file.startsWith('assets/'))).toBe(true);
    expect(result.output.some(file => file.fileName === 'index.html')).toBe(true);
    const html = result.output.find(file => file.fileName === 'index.html');
    if (html?.type !== 'asset') throw new Error('Missing HTML');
    const manifest = result.output.find(file => file.fileName === APPLICATION_LOAD_FILES_MANIFEST);
    if (manifest?.type !== 'asset') throw new Error('Missing application load file manifest');
    expect(JSON.parse(String(manifest.source))).toEqual(code.map(file => file.fileName).sort());
    const metaFiles = String(html.source).match(new RegExp(`<meta name="${APPLICATION_LOAD_FILES_META}" content="([^"]+)"`))?.[1];
    expect(metaFiles?.split(' ')).toEqual(code.filter(file => file.type === 'chunk').map(file => file.fileName).sort());
    const script = String(html.source).match(/<script[^>]*data-game-preloads[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!script) throw new Error('Missing route preloader');
    const preloads = (pathname: string, search = '') => {
      const links: { href: string; rel: string; as?: string }[] = [];
      runInNewContext(script, { location: { pathname, search }, URLSearchParams,
        document: { createElement: () => ({}), head: { appendChild: (link: typeof links[number]) => links.push(link) } } });
      return links;
    };
    expect(preloads(base)).toEqual([]);
    expect(preloads(`${base}dungeon`)).toEqual([]);
    for (const search of ['?game=dungeon', '?game=map', '?game=unknown', '?game=battle&game=run']) expect(preloads(base, search)).toEqual([]);
    for (const mode of ['battle', 'run']) {
      const direct = preloads(`${base}${mode}`);
      expect(direct.length).toBeGreaterThan(0);
      expect(direct.every(link => link.href.startsWith(base))).toBe(true);
      for (const asset of Object.values({...hobgoblinAssets, ...goblinFamilyAssets, ...forestFamilyAssets, ...forestBossAssets, ...wetlandsFamilyAssets, ...cavernsFamilyAssets, ...quarryFamilyAssets, ...graveyardFamilyAssets, ...emberWastesFamilyAssets, ...winterTundraFamilyAssets, ...sunscorchedDesertFamilyAssets, ...stormCoastFamilyAssets, ...shatteredCitadelFamilyAssets})) {
        expect(direct.some(link => link.href.endsWith(asset.runtimePath))).toBe(false);
      }
      expect(preloads(base, `?game=${mode}`)).toEqual([]);
      expect(preloads(base, `?game=${mode}&entry=continue`)).toEqual([]);
      expect(preloads(base, `?game=${mode}&entry=new&scene=unknown&scene=proof`)).toEqual(direct);
      expect(preloads(base.replace(/\/$/, ''), `?game=${mode}&entry=new`)).toEqual(direct);
    }
    const battleEntry = code.find(file => file.type === 'chunk' &&
      file.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/app/startBattleApp.ts'));
    if (!battleEntry) throw new Error('Missing built battle entry');
    const battleHints = preloads(`${base}battle`);
    expect(battleHints.some(link => link.href === base + battleEntry.fileName)).toBe(false);
    expect(battleHints.some(link => link.rel === 'modulepreload' && link.href.includes('/assets/start-'))).toBe(true);
    for (const scene of ['battle', 'proof', 'content-smoke']) {
      const diagnostic = preloads(base, `?scene=${scene}`);
      expect(diagnostic.length).toBeGreaterThan(0);
      expect(preloads(base, `?game=run&scene=${scene}`)).toEqual(diagnostic);
      expect(diagnostic.some(link => link.as === 'image')).toBe(scene === 'battle');
      expect(preloads(base, `?game=run&scene=${scene}&scene=unknown`)).toEqual(diagnostic);
    }
  }, 60_000);
}
