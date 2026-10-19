import { bindTelemetry, reportFailure, track, setTelemetryContext, telemetryContext, type Context, type Failure } from './telemetry';

const OPT_OUT = 'tactics-guru:telemetry-opt-out';
export function collectionAllowed(env: Record<string, unknown>, signals: { automated: boolean; dnt: boolean; optedOut: boolean; local?: boolean }): boolean {
  return env.VITE_POSTHOG_ENABLED === 'true' && typeof env.VITE_POSTHOG_KEY === 'string' && /^phc_[A-Za-z0-9]+$/.test(env.VITE_POSTHOG_KEY)
    && ['https://us.i.posthog.com','https://eu.i.posthog.com'].includes(String(env.VITE_POSTHOG_HOST))
    && (!(env.DEV || signals.local) || env.VITE_POSTHOG_DEV_OPT_IN === 'true' || signals.automated && env.VITE_POSTHOG_TEST_OPT_IN === 'true')
    && (!signals.automated || env.VITE_POSTHOG_TEST_OPT_IN === 'true') && !signals.dnt && !signals.optedOut;
}

/** Explicit local opt-out, also available before the next page load. */
export function optOutTelemetry() {
  stopped = true;
  pagePreference = false;
  bindTelemetry();
  client?.stop();
  try { localStorage.setItem(OPT_OUT, 'true'); return true; } catch { return false; /* Memory opt-out still applies. */ }
}
let client: Awaited<ReturnType<typeof import('./transport').createTransport>> | undefined;
let pagePreference: boolean | undefined;
let accepting = false;
export function telemetryPreference() {
  try { return { allowed: pagePreference ?? localStorage.getItem(OPT_OUT) !== 'true', collecting: accepting && !stopped }; }
  catch { return { allowed: !stopped, collecting: false }; }
}
export function allowTelemetryNextVisit() {
  try { localStorage.removeItem(OPT_OUT); pagePreference = true; return true; } catch { return false; }
}
let initialized = false;
let stopped = false;
export function startTelemetry() {
  if (initialized) return;
  initialized = true;
  try {
    const env = import.meta.env;
    if (!collectionAllowed(env, { automated: navigator.webdriver, local: ['localhost','127.0.0.1','[::1]'].includes(location.hostname), dnt: navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
      optedOut: localStorage.getItem(OPT_OUT) === 'true' })) return;
    accepting = true;
    const base = new URL(env.BASE_URL, location.origin).pathname.replace(/\/$/, '');
    const route = location.pathname.replace(/\/$/,'') === base + '/run' ? 'run' : location.pathname.replace(/\/$/,'') === base + '/map' ? 'map' : 'battle';
    const context: Context = { route, phase: 'entry' };
    setTelemetryContext({ ...context, visibility: document.hidden ? 'hidden' : 'visible' });
    document.addEventListener('visibilitychange', () => setTelemetryContext({ visibility: document.hidden ? 'hidden' : 'visible' }));
    const pending: (() => void)[] = [];
    let ready = false, failed = false, reporting = false;
    const seen = new Set<string>();
    const objects = new WeakSet<object>();
    const boundaries = new Set<string>();
    try {
      const stored = JSON.parse(sessionStorage.getItem('tactics-guru:telemetry-boundaries') ?? '[]');
      if (Array.isArray(stored)) stored.slice(-256).filter(k => typeof k === 'string' && /^[a-f0-9]{16}$/.test(k)).forEach(k => boundaries.add(k));
    } catch { /* Memory-only deduplication when storage is unavailable. */ }
    const once = (key: string) => {
      let a = 2166136261, b = 5381;
      for (const char of key) { a = Math.imul(a ^ char.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ char.charCodeAt(0); }
      const hash = [a,b].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
      if (boundaries.has(hash)) return false;
      boundaries.add(hash);
      if (boundaries.size > 256) boundaries.delete(boundaries.values().next().value!);
      try { sessionStorage.setItem('tactics-guru:telemetry-boundaries', JSON.stringify([...boundaries])); } catch { /* Nonfatal. */ }
      return true;
    };
    const enqueue = (run: () => void) => { if (failed || stopped) return; if (ready) run(); else if (pending.length < 50) pending.push(run); };
    bindTelemetry({
      event(name, properties, key) {
        const captured = { ...telemetryContext(), ...properties };
        if (key && !once(name + ':' + key)) return;
        if (name === 'save_recovery_failed' && !once(JSON.stringify([name, properties]))) return;
        enqueue(() => client?.capture(name, captured));
      },
      error(error, failure: Failure, details) {
        if (reporting || failed) return;
        try {
          reporting = true;
          if (error && typeof error === 'object') { if (objects.has(error)) return; objects.add(error); }
          const captured = { ...telemetryContext(), ...details, failure };
          const key = JSON.stringify(captured);
          if (seen.has(key) || seen.size >= 20) return;
          seen.add(key);
          // Do not retain arbitrary rejection objects. Only genuine Error stacks are parsed by the SDK.
          const safe = error instanceof Error ? error : new Error(failure);
          enqueue(() => { try { client?.error(safe, captured); } catch { /* No loop. */ } });
        } catch { /* Thrown values can have hostile accessors. */ }
        finally { reporting = false; }
      },
    });
    window.addEventListener('error', event => reportFailure('runtime_error', {}, event.error));
    window.addEventListener('unhandledrejection', event => reportFailure('unhandled_rejection', {}, event.reason));
    // No await in application boot; no external scripts, replay, flags, surveys or broad autocapture.
    void import('./transport').then(({ createTransport }) => {
      if (stopped) { pending.length = 0; return; }
      client = createTransport(env.VITE_POSTHOG_KEY, env.VITE_POSTHOG_HOST, location.origin, __BUILD_INFO__, env.BASE_URL);
      ready = true;
      pending.splice(0).forEach(run => { try { run(); } catch { /* SDK failure is nonfatal. */ } });
    }).catch(() => { accepting = false; failed = true; pending.length = 0; bindTelemetry(); });
    track('app_entered', context);
    // Only explicit dev/test opt-in can deliberately exercise the production stack parser.
    if ((env.VITE_POSTHOG_DEV_OPT_IN === 'true' || env.VITE_POSTHOG_TEST_OPT_IN === 'true') && env.VITE_POSTHOG_VERIFY_ERROR === 'true')
      reportFailure('verification', context, new Error('verification'));
    window.addEventListener('storage', event => { if (event.key === OPT_OUT && event.newValue === 'true') optOutTelemetry(); });
  } catch { accepting = false; bindTelemetry(); /* Inaccessible storage fails closed. */ }
}
