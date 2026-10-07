/**
 * Pure option handling for `scripts/measure-fit.ts`, kept apart from Playwright so the
 * argument parsing and the build-identity check are unit-tested (`tests/unit/measureFitOptions.test.ts`).
 */
export const PREVIEW_URL = 'http://127.0.0.1:4174';
export const DEFAULT_OUTPUT = 'test-results/fit-baseline.json';

export interface MeasureOptions {
  output: string;
  url: string;
  /** True when the collector measures an origin it does not serve: no preview is started and `dist` is not inventoried. */
  remote: boolean;
}

/** `argv` is `process.argv.slice(2)`: `[output] [--url <origin> | --url=<origin>]`; `FIT_URL` is the fallback for `--url`. */
export function parseMeasureArgs(argv: readonly string[], env: { FIT_URL?: string }): MeasureOptions {
  let output: string | undefined;
  let url: string | undefined = env.FIT_URL?.trim() || undefined;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--url') {
      url = argv[++index];
      if (url === undefined) throw new Error('--url needs a value');
    } else if (argument.startsWith('--url=')) url = argument.slice('--url='.length);
    else if (argument.startsWith('--')) throw new Error(`Unknown option ${argument}`);
    else if (output === undefined) output = argument;
    else throw new Error(`Only one output path is accepted; got ${output} and ${argument}`);
  }
  if (url === undefined) return { output: output ?? DEFAULT_OUTPUT, url: PREVIEW_URL, remote: false };
  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch { /* reported below */ }
  if (parsed === null || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) throw new Error(`--url must be an absolute http(s) URL; got "${url}"`);
  return { output: output ?? DEFAULT_OUTPUT, url: url.replace(/\/+$/, ''), remote: true };
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
    frames: 'first >=120 active scene update intervals; nearest-rank p50/p95; cap 600; no interaction workload',
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
