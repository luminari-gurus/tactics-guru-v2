import { expect, test } from 'vitest';
import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { battleAssets } from '../../src/content/assets';
import { desertAssets } from '../../src/content/desertAssets';
import { runInNewContext } from 'node:vm';

for (const base of ['/', '/tactics/']) {
  test(`built cache rules cover only versioned code and unchanged battle images at ${base}`, async () => {
    const result = await build({ base, logLevel: 'silent', build: { write: false } });
    if (!('output' in result)) throw new Error('Expected one production bundle');
    const headers = result.output.find(file => file.fileName === '_headers');
    if (headers?.type !== 'asset') throw new Error('Missing cache headers');
    const rules = String(headers.source).trim().split('\n\n');
    const paths = rules.map(rule => {
      const [path, header, ...extra] = rule.split('\n');
      expect(header).toBe('  Cache-Control: public, max-age=31536000, immutable');
      expect(extra).toEqual([]);
      expect(path.startsWith(base)).toBe(true);
      return path.slice(base.length);
    });
    const code = result.output.filter(file => /\.(js|css)$/.test(file.fileName));
    expect(code.length).toBeGreaterThan(0);
    const images = Object.values({...battleAssets,...desertAssets}).map(asset => {
      const bytes = readFileSync(`public${asset.runtimePath}`);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0,16);
      const path = `assets/${hash}${asset.runtimePath}`;
      const emitted = result.output.find(file => file.fileName === path);
      expect(emitted?.type, asset.id).toBe('asset');
      if (emitted?.type !== 'asset') throw new Error(`Missing versioned image: ${asset.id}`);
      expect(Buffer.from(emitted.source)).toEqual(bytes);
      expect(paths).not.toContain(asset.runtimePath.slice(1));
      return path;
    });
    expect(paths.sort()).toEqual([...code.map(file => file.fileName), ...images].sort());
    expect(paths.length).toBeLessThanOrEqual(100); // Cloudflare Pages rule limit.
    expect(paths).not.toContain('index.html');
    expect(result.output.some(file => file.fileName === 'index.html')).toBe(true);
    const html = result.output.find(file => file.fileName === 'index.html');
    if (html?.type !== 'asset') throw new Error('Missing HTML');
    const script = String(html.source).match(/<script[^>]*data-game-preloads[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!script) throw new Error('Missing route preloader');
    const preloads = (pathname: string, search = '') => {
      const links: { href: string; rel: string; as?: string }[] = [];
      runInNewContext(script, { location: { pathname, search }, URLSearchParams,
        document: { createElement: () => ({}), head: { appendChild: (link: typeof links[number]) => links.push(link) } } });
      return links;
    };
    expect(preloads(base)).toEqual([]);
    for (const search of ['?game=dungeon', '?game=map', '?game=unknown', '?game=battle&game=run']) expect(preloads(base, search)).toEqual([]);
    for (const mode of ['battle', 'run']) {
      const direct = preloads(`${base}${mode}`);
      expect(direct.length).toBeGreaterThan(0);
      expect(direct.every(link => link.href.startsWith(base))).toBe(true);
      expect(preloads(base, `?game=${mode}&entry=continue`)).toEqual(direct);
      expect(preloads(base, `?game=${mode}&scene=unknown&scene=proof`)).toEqual(direct);
      expect(preloads(base.replace(/\/$/, ''), `?game=${mode}`)).toEqual(direct);
    }
    for (const scene of ['battle', 'proof', 'content-smoke']) {
      const diagnostic = preloads(base, `?scene=${scene}`);
      expect(diagnostic.length).toBeGreaterThan(0);
      expect(preloads(base, `?game=run&scene=${scene}`)).toEqual(diagnostic);
      expect(diagnostic.some(link => link.as === 'image')).toBe(scene === 'battle');
      expect(preloads(base, `?game=run&scene=${scene}&scene=unknown`)).toEqual(diagnostic);
    }
  }, 60_000);
}
