import { expect, test } from 'vitest';
import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { battleAssets } from '../../src/content/assets';

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
    const images = Object.values(battleAssets).map(asset => {
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
  }, 60_000);
}
