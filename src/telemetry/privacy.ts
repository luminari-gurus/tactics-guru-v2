import type { Exception } from '@posthog/core/error-tracking';
import { events } from './telemetry';
export interface CaptureResult { uuid: string; event: string; timestamp?: Date; properties: Record<string, unknown>; $set?: Record<string, unknown> }
const allowed: Record<string, readonly unknown[]> = {
  visibility: ['visible','hidden'],
  route: ['battle','run','map'], phase: ['entry','player','enemy','presenting','ended','error','disposed','battle','reward','victory','defeat'],
  encounter: [0,1,2], outcome: ['victory','defeat'], choice: ['healing_draught','warding_charm','aiming_charm'],
  operation: ['read','write','remove','reset'],
  failure: ['application_load','scene_load','battle_resolution','encounter_start','run_boundary','save_read','save_write','save_remove','save_reset','runtime_error','unhandled_rejection','verification'],
};
const errorTypes = ['Error','TypeError','RangeError','ReferenceError','SyntaxError','URIError','EvalError','AggregateError'];
/** Rebuild the envelope: SDK defaults, URL/referrer, messages, locals and causes never leave the browser. */
export function sanitizeEvent(event: CaptureResult, origin: string, release: string, dirty: boolean, assetBase = '/'): CaptureResult | null {
  if (!(events as readonly string[]).includes(event.event) && event.event !== '$exception') return null;
  const input = event.properties, properties: Record<string, unknown> = {
    distinct_id: input.distinct_id, token: input.token, $process_person_profile: false, $geoip_disable: true,
    release, build_dirty: dirty,
  };
  for (const [key, values] of Object.entries(allowed)) if (values.includes(input[key])) properties[key] = input[key];
  if (event.event === 'battlefield_generation_measured') {
    const dimensions = { generation_status: ['generated','fallback','failed'], generation_context: ['entry','resume'],
      biome: ['desert'], generator_version: [1], profile_version: ['desert-v1'] };
    for (const [key, values] of Object.entries(dimensions)) if ((values as readonly unknown[]).includes(input[key])) properties[key] = input[key];
    const duration = input.generation_duration_ms, attempts = input.generation_attempts;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 && duration <= 600_000) properties.generation_duration_ms = duration;
    if (typeof attempts === 'number' && Number.isInteger(attempts) && attempts >= 1 && attempts <= 4) properties.generation_attempts = attempts;
  }
  if (event.event === '$exception') {
    const exception = (input.$exception_list as Exception[] | undefined)?.[0];
    const frames = (exception?.stacktrace?.frames ?? []).slice(-20).flatMap(frame => {
      try {
        if (typeof frame.filename !== 'string') return [];
        const url = new URL(frame.filename);
        // Only build-owned JS. Drop query/hash and all user-controlled path components.
        const root = new URL(assetBase, origin).pathname.replace(/\/$/, '') + '/assets/';
        if (url.origin !== origin || !url.pathname.startsWith(root) || !/^[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js$/.test(url.pathname.slice(root.length))) return [];
        const clean: Record<string, unknown> = { platform: 'web:javascript', filename: origin + url.pathname, in_app: true };
        for (const key of ['lineno','colno'] as const) if (Number.isInteger(frame[key]) && Number(frame[key]) >= 0) clean[key] = frame[key];
        if (typeof frame.chunk_id === 'string' && /^[a-f0-9-]{36}$/i.test(frame.chunk_id)) clean.chunk_id = frame.chunk_id;
        return [clean];
      } catch { return []; }
    });
    properties.$exception_list = [{ type: errorTypes.includes(exception?.type!) ? exception!.type : 'Error',
      value: allowed.failure.includes(input.failure) ? input.failure : 'runtime_error',
      mechanism: { handled: !['runtime_error','unhandled_rejection'].includes(input.failure as string), type: 'generic' },
      stacktrace: { type: 'raw', frames } }];
    properties.$exception_level = 'error';
    if (typeof input.$release_id === 'string' && /^[a-f0-9-]{36}$/i.test(input.$release_id)) properties.$release_id = input.$release_id;
  }
  return { uuid: event.uuid, event: event.event, timestamp: event.timestamp, properties };
}
