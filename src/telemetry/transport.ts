import { ErrorPropertiesBuilder, ErrorCoercer, createDefaultStackParser } from '@posthog/core/error-tracking';
import { sanitizeEvent } from './privacy';

/** PostHog's capture API plus its official cross-browser stack parser; no browser SDK features. */
export function createTransport(key: string, host: string, origin: string, build: { commit: string; dirty: boolean }, assetBase = '/') {
  const parser = new ErrorPropertiesBuilder([new ErrorCoercer()], createDefaultStackParser());
  const distinctId = crypto.randomUUID(); // Anonymous per document, unrelated to saves or accounts.
  const requests = new Set<AbortController>();
  let stopped = false;
  function capture(event: string, properties: Record<string, unknown>) {
    if (stopped || requests.size >= 4) return;
    try {
      const clean = sanitizeEvent({ event, uuid: crypto.randomUUID(), timestamp: new Date(),
        properties: { ...properties, token: key, distinct_id: distinctId } }, origin, build.commit, build.dirty, assetBase);
      if (!clean) return;
      const controller = new AbortController(); requests.add(controller);
      const timer = setTimeout(() => controller.abort(), 3000);
      // No cookies, referrer, custom headers, automatic enrichment, retry queue or remote configuration.
      void fetch(host + '/i/v0/e/', { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ api_key: key, ...clean }),
        keepalive: true, signal: controller.signal,
      }).catch(() => { /* Offline and blockers never feed back into reporting. */ })
        .finally(() => { clearTimeout(timer); requests.delete(controller); });
    } catch { /* Serialization, SDK or fetch failure cannot escape. */ }
  }
  return {
    capture,
    error(error: Error, context: Record<string, unknown>) {
      try { capture('$exception', { ...parser.buildFromUnknown(error), ...context }); } catch { /* Parser failures are nonfatal. */ }
    },
    stop() { stopped = true; requests.forEach(request => request.abort()); requests.clear(); },
  };
}
