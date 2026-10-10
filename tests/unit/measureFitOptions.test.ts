import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT, PREVIEW_URL, buildIdentity, collectorConditions, parseMeasureArgs, captureTarget, captureFailures } from '../../scripts/measure-fit-options';

describe('measure:fit options', () => {
  it('defaults to the collector-owned preview and the baseline output path', () => {
    expect(parseMeasureArgs([], {})).toEqual({ output: DEFAULT_OUTPUT, url: PREVIEW_URL, remote: false, scene: 'proof' });
    expect(parseMeasureArgs(['/tmp/out.json'], {})).toEqual({ output: '/tmp/out.json', url: PREVIEW_URL, remote: false, scene: 'proof' });
  });

  it('measures a deployed origin named by --url or FIT_URL, flag first, without a trailing slash', () => {
    expect(parseMeasureArgs(['out.json', '--url', 'https://example.pages.dev/'], {})).toEqual({ output: 'out.json', url: 'https://example.pages.dev', remote: true, scene: 'proof' });
    expect(parseMeasureArgs(['--url=https://example.pages.dev'], {})).toEqual({ output: DEFAULT_OUTPUT, url: 'https://example.pages.dev', remote: true, scene: 'proof' });
    expect(parseMeasureArgs([], { FIT_URL: 'https://env.pages.dev' })).toMatchObject({ url: 'https://env.pages.dev', remote: true, scene: 'proof' });
    expect(parseMeasureArgs(['--url', 'https://flag.pages.dev'], { FIT_URL: 'https://env.pages.dev' })).toMatchObject({ url: 'https://flag.pages.dev' });
    expect(parseMeasureArgs([], { FIT_URL: '' })).toMatchObject({ url: PREVIEW_URL, remote: false, scene: 'proof' });
  });

  it('rejects a non-http URL, a missing --url value, unknown flags and a second output path', () => {
    expect(() => parseMeasureArgs(['--url', 'ftp://example'], {})).toThrow(/http/);
    expect(() => parseMeasureArgs(['--url', 'pages.dev'], {})).toThrow(/http/);
    expect(() => parseMeasureArgs(['--url'], {})).toThrow(/--url/);
    expect(() => parseMeasureArgs(['--bogus'], {})).toThrow(/--bogus/);
    expect(() => parseMeasureArgs(['a.json', 'b.json'], {})).toThrow(/output/);
  });

  it('describes the network and cache conditions of each mode', () => {
    const local = collectorConditions({ output: 'x', url: PREVIEW_URL, remote: false, scene: 'proof' });
    expect(local.url).toBe(PREVIEW_URL);
    expect(local.network).toMatch(/loopback/);
    const remote = collectorConditions({ output: 'x', url: 'https://example.pages.dev', remote: true, scene: 'proof' });
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

it('selects battle readiness explicitly while preserving proof default', () => {
  const options = parseMeasureArgs(['--scene', 'battle', 'battle.json'], {});
  expect(options.scene).toBe('battle');
  expect(captureTarget(options)).toEqual({url: PREVIEW_URL + '/?scene=battle', restart: 'Restart battle'});
  expect(captureTarget(parseMeasureArgs([], {})).restart).toBe('Restart proof scene');
  expect(parseMeasureArgs(['--scene=proof'], {}).scene).toBe('proof');
  expect(() => parseMeasureArgs(['--scene=bad'], {})).toThrow(/scene/);
  expect(() => parseMeasureArgs(['--scene'], {})).toThrow(/scene/);
});
it('retains validation failures for error or mixed-build output', () => {
  const sample = (commit: string, errors: string[] = []) => ({diagnostics: {build: {commit, dirty: false}}, errors});
  expect(captureFailures([sample('a')])).toEqual([]);
  expect(captureFailures([sample('a', ['broken'])])).toEqual(['Console/page errors detected']);
  expect(captureFailures([sample('a'), sample('b')]).join()).toMatch(/more than one build/);
});
