import { expect, test } from 'vitest';
import { build } from 'vite';

for (const base of ['/', '/tactics/']) {
  test(`built cache rules cover only emitted versioned code at ${base}`, async () => {
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
      expect(path.slice(base.length)).toMatch(/^assets\/.+-[\w-]{8}\.(js|css)$/);
      return path.slice(base.length);
    });
    const code = result.output.filter(file => /\.(js|css)$/.test(file.fileName));
    expect(code.length).toBeGreaterThan(0);
    expect(paths.sort()).toEqual(code.map(file => file.fileName).sort());
    expect(paths.length).toBeLessThanOrEqual(100); // Cloudflare Pages rule limit.
    expect(paths).not.toContain('index.html');
    expect(result.output.some(file => file.fileName === 'index.html')).toBe(true);
  }, 60_000);
}
