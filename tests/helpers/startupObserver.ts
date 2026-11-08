import { type ConsoleMessage, type Frame, type Page, type Request, type Response, type TestInfo } from '@playwright/test';
import { availableParallelism, freemem, loadavg, totalmem } from 'node:os';
import { performance as hostClock } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';

const marks = ['fit:scene-start', 'fit:scene-ready', 'fit:controls-usable'];
const phases = ['player', 'enemy', 'presenting', 'ended', 'error', 'disposed'];
const developmentPaths = new Set([
  '/@vite/client', '/src/main.ts', '/src/style.css', '/src/app/entry.ts',
  '/src/app/startBattleApp.ts', '/src/app/startRunApp.ts', '/src/app/startDungeonApp.ts',
  '/src/phaser/start.ts', '/src/map/view.ts', '/node_modules/.vite/deps/phaser.js',
]);
const requestTypes = new Set(['document', 'script', 'stylesheet', 'image', 'media', 'xhr', 'fetch']);
const failureTokens = ['ERR_ABORTED', 'ERR_FAILED', 'ERR_INTERNET_DISCONNECTED',
  'ERR_CONNECTION_REFUSED', 'ERR_CONNECTION_RESET', 'ERR_NAME_NOT_RESOLVED',
  'ERR_TIMED_OUT', 'ERR_NETWORK_CHANGED', 'ERR_BLOCKED_BY_CLIENT',
  'Load request cancelled', 'Importing a module script failed',
  'Failed to fetch dynamically imported module', 'Unable to preload CSS', 'Load failed'];

/** Retain only build-owned filenames or exact dev entries inside the configured base. */
function asset(raw: string, base: URL | undefined, buildFiles?: ReadonlySet<string>): string {
  try {
    const url = new URL(raw);
    if (!base || url.origin !== base.origin || url.pathname.length > 256) return '[other]';
    const path = url.pathname.replace(/:\d+(?::\d+)?$/, '');
    const prefix = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    if (!path.startsWith(prefix)) return '[other]';
    const relative = `/${path.slice(prefix.length)}`;
    const built = buildFiles ? buildFiles.has(relative.slice(1))
      : /^\/assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.(?:js|css)$/.test(relative);
    return built || developmentPaths.has(relative) ? relative : '[other]';
  } catch { return '[other]'; }
}

function failure(raw: string): string {
  return failureTokens.find(value => raw.slice(0, 2000).includes(value)) ?? '[redacted]';
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function choice(value: unknown, allowed: string[]): string {
  return typeof value === 'string' && allowed.includes(value) ? value : 'other';
}

function pressureTotal(resource: 'cpu' | 'io'): number | null {
  try {
    const pressure = readFileSync(`/proc/pressure/${resource}`, 'utf8');
    const total = /^some [^\n]*\btotal=(\d+)$/m.exec(pressure)?.[1];
    return total === undefined ? null : number(Number(total));
  } catch {
    return null;
  }
}

/** Preserve only our fixed state fields even if page code replaces the probe. */
function samples(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-32).filter(entry => entry && typeof entry === 'object').map(entry => ({
    at: number(entry.at), ready: choice(entry.ready, ['loading', 'interactive', 'complete']),
    screen: entry.screen === true, boot: entry.boot === true,
    game: entry.game === true, gameReady: entry.gameReady === true,
    phase: choice(entry.phase, ['absent', ...phases]),
    status: choice(entry.status, ['error', 'ready', 'loading', 'other']),
  }));
}

/**
 * Observe without routing requests, changing waits/retries, or reading storage.
 * The caller owns its fixtures; finalize in finally after use(). Only unexpected
 * failures receive an attachment. Host sampling uses Node time, never page.clock.
 */
export async function startStartupDiagnostics(page: Page, info: TestInfo, buildFiles?: ReadonlySet<string>): Promise<() => Promise<void>> {
  const base = typeof info.project.use.baseURL === 'string' ? new URL(info.project.use.baseURL) : undefined;
  const assetPath = (raw: string) => asset(raw, base, buildFiles);
  const started = hostClock.now();
  const elapsed = () => hostClock.now() - started;
  const events: Record<string, unknown>[] = [];
  const pending = new Map<Request, { path: string; type: string; startedMs: number }>();
  const dropped = { events: 0, pending: 0, runner: 0 };
  const record = (value: Record<string, unknown>) => {
    if (events.length === 128) { events.shift(); dropped.events++; }
    events.push({ at: Date.now(), elapsedMs: elapsed(), ...value });
  };
  const runner = { cpus: availableParallelism(), totalMemoryBytes: totalmem(), samples: [] as Record<string, unknown>[] };
  const capturePressure = process.env.ISSUE_257_STARTUP_CAPTURE === '1';
  const intervalMs = 1000;
  let previousHeartbeat = elapsed();
  const sampleRunner = (heartbeatDelayMs: number | null = null) => {
    if (runner.samples.length === 32) { runner.samples.shift(); dropped.runner++; }
    runner.samples.push({ at: Date.now(), elapsedMs: elapsed(), load: loadavg(), freeMemoryBytes: freemem(),
      ...(capturePressure ? { heartbeatDelayMs, cpuPressureUs: pressureTotal('cpu'), ioPressureUs: pressureTotal('io') } : {}),
    });
  };
  sampleRunner();
  const interval = setInterval(() => {
    const now = elapsed();
    sampleRunner(Math.max(0, now - previousHeartbeat - intervalMs));
    previousHeartbeat = now;
  }, intervalMs);
  interval.unref();

  const onRequest = (request: Request) => {
    if (!requestTypes.has(request.resourceType())) return;
    const entry = { path: assetPath(request.url()), type: request.resourceType(), startedMs: elapsed() };
    if (pending.size < 64) pending.set(request, entry); else dropped.pending++;
    record({ kind: 'request', type: entry.type, path: entry.path });
  };
  const onFinished = (request: Request) => {
    const entry = pending.get(request);
    if (entry) { pending.delete(request); record({ kind: 'finished', path: entry.path, durationMs: elapsed() - entry.startedMs }); }
  };
  const onFailed = (request: Request) => {
    pending.delete(request);
    record({ kind: 'requestfailed', type: request.resourceType(), path: assetPath(request.url()), error: failure(request.failure()?.errorText ?? '') });
  };
  const responseListener = (response: Response) => {
    if (response.status() >= 400) record({ kind: 'http-error', path: assetPath(response.url()), status: response.status() });
  };
  const errorListener = (error: Error) => record({ kind: 'pageerror',
    name: choice(error.name, ['Error', 'TypeError', 'SyntaxError', 'RangeError', 'ReferenceError', 'URIError', 'EvalError', 'AggregateError']),
    error: failure(error.message), frames: (error.stack?.slice(0, 4000).match(/https?:\/\/[^\s)]+/g) ?? []).slice(-8).map(assetPath),
  });
  const consoleListener = (message: ConsoleMessage) => {
    if (message.type() === 'error') record({ kind: 'console-error', error: failure(message.text()) });
  };
  const crashListener = () => record({ kind: 'crash' });
  const navigationListener = (frame: Frame) => {
    if (frame === page.mainFrame()) record({ kind: 'navigation' });
  };
  page.on('request', onRequest);
  page.on('requestfinished', onFinished);
  page.on('requestfailed', onFailed);
  page.on('response', responseListener);
  page.on('pageerror', errorListener);
  page.on('console', consoleListener);
  page.on('crash', crashListener);
  page.on('framenavigated', navigationListener);
  const stop = () => {
    clearInterval(interval);
    page.off('request', onRequest);
    page.off('requestfinished', onFinished);
    page.off('requestfailed', onFailed);
    page.off('response', responseListener);
    page.off('pageerror', errorListener);
    page.off('console', consoleListener);
    page.off('crash', crashListener);
    page.off('framenavigated', navigationListener);
  };

  try {
    await page.addInitScript(({ phases }) => {
      const samples: Record<string, unknown>[] = [];
      (window as unknown as { __tacticsStartupProbe: unknown }).__tacticsStartupProbe = samples;
      let previous = '';
      const sample = () => {
        const text = document.querySelector('#fit-status')?.textContent ?? '';
        const dungeon = document.querySelector<HTMLElement>('#dungeon-screen');
        const game = document.querySelector<HTMLElement>('#game');
        const phase = game?.dataset.phase;
        const state = { ready: document.readyState, screen: !!dungeon, boot: dungeon?.dataset.boot === 'ready',
          game: !!game, gameReady: game?.dataset.ready === 'true',
          phase: phase === undefined ? 'absent' : phases.includes(phase) ? phase : 'other',
          status: /error/i.test(text) ? 'error' : /ready/i.test(text) ? 'ready' : /loading/i.test(text) ? 'loading' : 'other',
        };
        const key = JSON.stringify(state);
        if (key === previous) return;
        previous = key;
        if (samples.length === 32) samples.shift();
        samples.push({ at: performance.now(), ...state });
      };
      new MutationObserver(sample).observe(document, { subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['data-boot', 'data-ready', 'data-phase'] });
      document.addEventListener('DOMContentLoaded', sample);
      window.addEventListener('load', sample);
      sample();
    }, { phases });
  } catch (error) { stop(); throw error; }

  let finalized = false;
  return async () => {
    if (finalized) return;
    finalized = true;
    sampleRunner();
    stop();
    if (info.status === info.expectedStatus) return;
    const capture = page.evaluate(markNames => {
      let measurements: { run: number | null; sceneStartedMs: number | null; sceneReadyMs: number | null; controlsUsableMs: number | null } | null = null;
      try {
        // BattleScene updates this interface, while proof scenes also emit marks.
        // Select four numeric fields inside the page; never serialize its payload.
        if (typeof window.fitDiagnostics === 'function') {
          const { run, sceneStartedMs, sceneReadyMs, controlsUsableMs } = window.fitDiagnostics();
          const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
          measurements = { run: Number.isSafeInteger(run) && run >= 0 ? run : null,
            sceneStartedMs: numeric(sceneStartedMs), sceneReadyMs: numeric(sceneReadyMs), controlsUsableMs: numeric(controlsUsableMs) };
        }
      } catch { /* An unavailable diagnostic provider must not hide other evidence. */ }
      return {
        samples: (window as unknown as { __tacticsStartupProbe: unknown }).__tacticsStartupProbe,
        ready: document.readyState, visibility: document.visibilityState, measurements,
        marks: markNames.flatMap(name => performance.getEntriesByName(name, 'mark').slice(-8).map(entry => ({ name, at: entry.startTime }))),
        scripts: Array.from(document.scripts).slice(0, 32).map(script => script.src),
        styles: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).slice(0, 32).map(link => ({ url: link.href, sheet: !!link.sheet })),
        resources: performance.getEntriesByType('resource').filter(entry => ['script', 'link', 'img', 'css', 'fetch', 'xmlhttprequest', 'video', 'audio'].includes((entry as PerformanceResourceTiming).initiatorType))
          .slice(-64).map(entry => ({ url: entry.name, at: entry.startTime, duration: entry.duration })),
      };
    }, marks).catch(() => null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const snapshot = await Promise.race([capture, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 1500); })]);
    clearTimeout(timer);
    const browser = snapshot ? { samples: samples(snapshot.samples),
      ready: choice(snapshot.ready, ['loading', 'interactive', 'complete']), visibility: choice(snapshot.visibility, ['visible', 'hidden']),
      marks: snapshot.marks.map(mark => ({ name: choice(mark.name, marks), at: number(mark.at) })), measurements: snapshot.measurements,
      scripts: snapshot.scripts.map(assetPath), styles: snapshot.styles.map(style => ({ url: assetPath(style.url), sheet: style.sheet })),
      resources: snapshot.resources.map(resource => ({ url: assetPath(resource.url), at: number(resource.at), duration: number(resource.duration) })),
    } : null;
    await info.attach('startup-evidence', { body: JSON.stringify({ events, pending: [...pending.values()], browser, runner, dropped }, null, 2), contentType: 'application/json' });
  };
}
