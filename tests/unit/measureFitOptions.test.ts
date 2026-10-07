import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT, PREVIEW_URL, buildIdentity, collectorConditions, parseMeasureArgs } from '../../scripts/measure-fit-options';

describe('measure:fit options', () => {
  it('defaults to the collector-owned preview and the baseline output path', () => {
    expect(parseMeasureArgs([], {})).toEqual({ output: DEFAULT_OUTPUT, url: PREVIEW_URL, remote: false });
    expect(parseMeasureArgs(['/tmp/out.json'], {})).toEqual({ output: '/tmp/out.json', url: PREVIEW_URL, remote: false });
  });

  it('measures a deployed origin named by --url or FIT_URL, flag first, without a trailing slash', () => {
    expect(parseMeasureArgs(['out.json', '--url', 'https://example.pages.dev/'], {})).toEqual({ output: 'out.json', url: 'https://example.pages.dev', remote: true });
    expect(parseMeasureArgs(['--url=https://example.pages.dev'], {})).toEqual({ output: DEFAULT_OUTPUT, url: 'https://example.pages.dev', remote: true });
    expect(parseMeasureArgs([], { FIT_URL: 'https://env.pages.dev' })).toMatchObject({ url: 'https://env.pages.dev', remote: true });
    expect(parseMeasureArgs(['--url', 'https://flag.pages.dev'], { FIT_URL: 'https://env.pages.dev' })).toMatchObject({ url: 'https://flag.pages.dev' });
    expect(parseMeasureArgs([], { FIT_URL: '' })).toMatchObject({ url: PREVIEW_URL, remote: false });
  });

  it('rejects a non-http URL, a missing --url value, unknown flags and a second output path', () => {
    expect(() => parseMeasureArgs(['--url', 'ftp://example'], {})).toThrow(/http/);
    expect(() => parseMeasureArgs(['--url', 'pages.dev'], {})).toThrow(/http/);
    expect(() => parseMeasureArgs(['--url'], {})).toThrow(/--url/);
    expect(() => parseMeasureArgs(['--bogus'], {})).toThrow(/--bogus/);
    expect(() => parseMeasureArgs(['a.json', 'b.json'], {})).toThrow(/output/);
  });

  it('describes the network and cache conditions of each mode', () => {
    const local = collectorConditions({ output: 'x', url: PREVIEW_URL, remote: false });
    expect(local.url).toBe(PREVIEW_URL);
    expect(local.network).toMatch(/loopback/);
    const remote = collectorConditions({ output: 'x', url: 'https://example.pages.dev', remote: true });
    expect(remote.url).toBe('https://example.pages.dev');
    expect(remote.network).toMatch(/HTTPS/);
    expect(remote.cache).toMatch(/edge/);
    expect(remote.frames).toBe(local.frames);
  });

  it('reports the one build the samples were served from and refuses a mixed set', () => {
    const sample = (commit: string, dirty = false) => ({ diagnostics: { build: { commit, dirty } } });
    expect(buildIdentity([sample('aaa'), sample('aaa')])).toEqual({ commit: 'aaa', dirty: false });
    expect(() => buildIdentity([sample('aaa'), sample('bbb')])).toThrow(/aaa.*bbb/);
    expect(() => buildIdentity([sample('aaa'), sample('aaa', true)])).toThrow(/dirty/);
    expect(() => buildIdentity([])).toThrow(/no samples/i);
  });
});
