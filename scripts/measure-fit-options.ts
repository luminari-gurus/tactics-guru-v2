/**
 * Pure option handling for `scripts/measure-fit.ts`, kept apart from Playwright so the
 * argument parsing and the build-identity check are unit-tested (`tests/unit/measureFitOptions.test.ts`).
 */
export const PREVIEW_URL = 'http://127.0.0.1:4174';
export const DEFAULT_OUTPUT = 'test-results/fit-baseline.json';

export interface MeasureOptions {
  output: string;
  scene: 'proof' | 'battle';
  url: string;
  /** True when the collector measures an origin it does not serve: no preview is started and `dist` is not inventoried. */
  remote: boolean;
}

/** `argv` is `process.argv.slice(2)`: `[output] [--url <origin> | --url=<origin>]`; `FIT_URL` is the fallback for `--url`. */
export function parseMeasureArgs(argv: readonly string[], env: { FIT_URL?: string }): MeasureOptions {
  let output: string | undefined;
  let scene: string | undefined = 'proof';
  let url: string | undefined = env.FIT_URL?.trim() || undefined;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--url') {
      url = argv[++index];
      if (url === undefined) throw new Error('--url needs a value');
    } else if (argument === '--scene') scene = argv[++index];
    else if (argument.startsWith('--scene=')) scene = argument.slice('--scene='.length);
    else if (argument.startsWith('--url=')) url = argument.slice('--url='.length);
    else if (argument.startsWith('--')) throw new Error(`Unknown option ${argument}`);
    else if (output === undefined) output = argument;
    else throw new Error(`Only one output path is accepted; got ${output} and ${argument}`);
  }
  if (scene !== 'proof' && scene !== 'battle') throw new Error('--scene must be proof or battle');
  if (url === undefined) return { output: output ?? DEFAULT_OUTPUT, url: PREVIEW_URL, remote: false, scene };
  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch { /* reported below */ }
  if (parsed === null || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) throw new Error(`--url must be an absolute http(s) URL; got "${url}"`);
  return { output: output ?? DEFAULT_OUTPUT, url: url.replace(/\/+$/, ''), remote: true, scene };
}

/** The `conditions` block written into the results file. */
export function collectorConditions(options: MeasureOptions) {
  return {
    url: options.url,
    mode: 'headless Chromium; mobile profiles are emulation',
    network: options.remote
      ? 'host network to the deployed origin over HTTPS, CDN and TLS included; no throttling'
      : 'unthrottled loopback HTTP, no TLS; HTTP content compression negotiated by Vite preview',
    cache: options.remote
      ? 'cold: fresh browser context, CDN edge cache state not controlled; warm: same-context reload; inspect per-resource transfer bytes'
      : 'cold: fresh context; warm: same-context reload; inspect per-resource transfer bytes',
    frames: options.scene === 'proof'
      ? 'first >=120 visible active scene update intervals; nearest-rank p50/p95; cap 600; no interaction workload'
      : 'first >=120 visible player-idle post-render intervals, then real selection/pan/zoom/move windows; nearest-rank p50/p95; cap 600 per window, 60 windows; first post-render input response',
  };
}

export interface BuildIdentity { commit: string; dirty: boolean }

/** The one build every sample was served from, read from the page's baked `build` info; a mixed set is a measurement error. */
export function buildIdentity(samples: readonly { diagnostics: { build: BuildIdentity } }[]): BuildIdentity {
  if (samples.length === 0) throw new Error('No samples, so no measured build');
  const builds = new Map<string, BuildIdentity>();
  for (const { diagnostics: { build } } of samples) builds.set(`${build.commit}${build.dirty ? ' (dirty)' : ''}`, { commit: build.commit, dirty: build.dirty });
  if (builds.size > 1) throw new Error(`Samples span more than one build: ${[...builds.keys()].join(', ')}`);
  return [...builds.values()][0];
}

/** Shared route and real readiness control, used by local and remote captures. */
export function captureTarget(options: MeasureOptions) {
  const url = new URL(options.url);
  url.searchParams.set('scene', options.scene);
  return {url: url.href, restart: options.scene === 'battle' ? 'Restart battle' : 'Restart proof scene'};
}

/** Validate without losing the raw samples when identity or browser checks fail. */
export function captureFailures(samples: readonly {diagnostics: {build: BuildIdentity}; errors: readonly string[]}[]): string[] {
  const failures: string[] = [];
  try { buildIdentity(samples); } catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
  if (samples.some(sample => sample.errors.length)) failures.push('Console/page errors detected');
  return failures;
}
