import { afterEach, expect, it, vi } from 'vitest';
import { bindTelemetry, reportFailure, track } from '../../src/telemetry/telemetry';
import { sanitizeEvent } from '../../src/telemetry/privacy';
import { collectionAllowed } from '../../src/telemetry/browser';
import { RunItemSession } from '../../src/app/RunItemSession';
import { rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { createRunStorage } from '../../src/persistence/runStorage';
import { BattlePersistence } from '../../src/app/BattlePersistence';
import { battleCatalog } from '../../src/content/catalog';
import { createBattleStorage } from '../../src/persistence/battleStorage';
afterEach(() => bindTelemetry());
it('fails closed for missing config, dev, automation, DNT and opt-out', () => {
  const env = { VITE_POSTHOG_ENABLED: 'true', VITE_POSTHOG_KEY: 'phc_test', VITE_POSTHOG_HOST: 'https://us.i.posthog.com' };
  const signals = { automated: false, dnt: false, optedOut: false };
  expect(collectionAllowed(env, signals)).toBe(true);
  for (const key of Object.keys(env)) expect(collectionAllowed({ ...env, [key]: '' }, signals)).toBe(false);
  for (const key of Object.keys(signals)) expect(collectionAllowed(env, { ...signals, [key]: true })).toBe(false);
  expect(collectionAllowed({ ...env, DEV: true }, signals)).toBe(false);
  expect(collectionAllowed({ ...env, DEV: true, VITE_POSTHOG_DEV_OPT_IN: 'true' }, signals)).toBe(true);
  expect(collectionAllowed({ ...env, VITE_POSTHOG_HOST: 'https://evil.invalid/?secret' }, signals)).toBe(false);
});
it('removes SDK defaults, URL, messages, causes and arbitrary fields while preserving actionable frames', () => {
  const result = sanitizeEvent({ uuid: 'event', event: '$exception', $set: { email: 'secret' }, properties: {
    token: 'phc_test', distinct_id: 'anonymous', $current_url: 'https://game.invalid/?token=secret', email: 'secret', save: 'secret',
    route: 'run', phase: 'battle', encounter: 1, failure: 'runtime_error',
    $exception_list: [{ type: 'TypeError', value: 'secret', cause: 'secret', stacktrace: { frames: [
      { filename: 'https://game.invalid/assets/main-12345678.js?secret#secret', lineno: 4, colno: 9, vars: { secret: 'secret' }, function: 'secret', chunk_id: '12345678-1234-1234-1234-123456789012' },
      { filename: 'https://evil.invalid/secret.js', lineno: 8 },
      { filename: 'https://game.invalid/private/secret.js', lineno: 8 },
    ] } }],
  } }, 'https://game.invalid', 'release', false)!;
  expect(JSON.stringify(result)).not.toContain('secret');
  expect(JSON.parse(JSON.stringify(result.properties.$exception_list))[0].stacktrace.frames).toEqual([{ platform: 'web:javascript', filename: 'https://game.invalid/assets/main-12345678.js', in_app: true, lineno: 4, colno: 9, chunk_id: '12345678-1234-1234-1234-123456789012' }]);
  expect(result.properties.$process_person_profile).toBe(false);
  expect(sanitizeEvent({ uuid: 'x', event: '$autocapture', properties: {} }, '', '', false)).toBeNull();
});
it('emits reward only after acceptance and telemetry failure cannot change the boundary', () => {
  const event = vi.fn(), error = vi.fn(); bindTelemetry({ event, error });
  const session = new RunItemSession(rewardSnapshot(), runContext, createRunStorage(runContext, () => null));
  const command = { ...session.boundary(), type: 'claimReward' as const, offerId: session.snapshot.items.offer!.id, itemId: session.snapshot.items.offer!.options[0].itemId };
  expect(session.dispatch(command).ok).toBe(true); expect(session.dispatch(command).ok).toBe(false);
  expect(event.mock.calls.filter(([name]) => name === 'reward_chosen')).toHaveLength(1);
  const saved = session.snapshot;
  bindTelemetry({ event() { throw Error('blocked'); }, error() { throw Error('blocked'); } });
  expect(() => { session.save(); track('app_entered'); reportFailure('save_read'); }).not.toThrow();
  expect(session.snapshot).toEqual(saved);
});
it('single battle startup and continue emit once despite repeated activation', () => {
  const event = vi.fn(); bindTelemetry({ event, error() {} });
  const data = new Map<string,string>();
  const storage = createBattleStorage(battleCatalog, () => ({ getItem: k => data.get(k) ?? null, setItem: (k,v) => { data.set(k,v); }, removeItem: k => { data.delete(k); } }));
  const first = new BattlePersistence(battleCatalog, 'map:forest_ruins', storage);
  first.startup(); first.startup();
  const resumed = new BattlePersistence(battleCatalog, 'map:forest_ruins', storage); resumed.startup();
  const review = resumed.inspect(); resumed.continue(review); resumed.continue(review);
  expect(event.mock.calls.map(([name]) => name)).toEqual(['battle_started','battle_continued']);
});
it('records uncaught/rejection error payloads without messages, and stops in-flight collection on opt-out', async () => {
  const { createTransport } = await import('../../src/telemetry/transport');
  const requests: RequestInit[] = [];
  const fetch = vi.fn((_url: string, request: RequestInit) => { requests.push(request); return Promise.resolve({ ok: true }); });
  vi.stubGlobal('fetch', fetch);
  try {
    const transport = createTransport('phc_test', 'https://us.i.posthog.com', 'https://game.invalid', { commit: 'commit', dirty: true });
    vi.stubGlobal('_posthogChunkIds', { 'Error\n at bundle (https://game.invalid/assets/index-12345678.js?private:1:1)': '12345678-1234-1234-1234-123456789012' });
    const error = new Error('raw secret');
    error.stack = 'Error: raw secret\n at run (https://game.invalid/assets/index-12345678.js?private:12:3)';
    transport.error(error, { failure: 'runtime_error', route: 'run', encounter: 2, save: 'secret' });
    const payload = JSON.parse(requests[0].body as string);
    expect(payload.event).toBe('$exception'); expect(JSON.stringify(payload)).not.toMatch(/secret|private/);
    expect(payload.properties.$exception_list[0].stacktrace.frames[0]).toMatchObject({ lineno: 12, colno: 3, chunk_id: '12345678-1234-1234-1234-123456789012' });
    expect(requests[0]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    transport.stop(); expect(requests[0].signal!.aborted).toBe(true);
    transport.capture('app_entered', {}); expect(fetch).toHaveBeenCalledTimes(1);
    const failing = createTransport('phc_test', 'https://us.i.posthog.com', 'https://game.invalid', { commit: 'commit', dirty: true });
    fetch.mockImplementation(() => Promise.reject(new Error('offline')));
    failing.capture('app_entered', {}); await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledTimes(2); failing.stop();
  } finally { vi.unstubAllGlobals(); }
});
it('accepted defeat emits encounter and run outcomes once, including after retries', async () => {
  const { freshRunSnapshot } = await import('../../src/domain/runBattle');
  const event = vi.fn(); bindTelemetry({ event, error() {} });
  const run = new RunItemSession(freshRunSnapshot('telemetry-defeat', 13, runContext), runContext, createRunStorage(runContext, () => null));
  run.startNew(); const battle = run.startEncounter()!;
  for (let step = 0; step < 1000 && battle.state.outcome === 'ongoing'; step++) {
    const presentation = battle.phase === 'enemy' ? battle.nextEnemy()
      : (battle.prepare({ type: 'endTurn', unitId: battle.active.id }), battle.confirm());
    if (presentation) battle.finishPresentation(presentation.token);
  }
  expect(run.snapshot.items.run.phase).toBe('defeat');
  run.save(); expect(run.startEncounter()).toBeNull();
  expect(event.mock.calls.filter(([name]) => name === 'encounter_outcome')).toEqual([
    ['encounter_outcome', { route: 'run', encounter: 0, outcome: 'defeat' }, 'telemetry-defeat:0'],
  ]);
  expect(event.mock.calls.filter(([name]) => name === 'run_outcome')).toEqual([
    ['run_outcome', { route: 'run', phase: 'defeat', encounter: 0, outcome: 'defeat' }, 'telemetry-defeat'],
  ]);
});
it('single-battle outcomes occur at acceptance and never repeat on save retries', () => {
  const event = vi.fn(); bindTelemetry({ event, error() {} });
  const data = new Map<string,string>();
  const device = new BattlePersistence(battleCatalog, 'map:forest_ruins', createBattleStorage(battleCatalog, () => ({ getItem:k=>data.get(k)??null, setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);} })));
  const live = device.startup()!;
  for (let step = 0; step < 1000 && live.state.outcome === 'ongoing'; step++) {
    const presentation = live.phase === 'enemy' ? live.nextEnemy()
      : (live.prepare({ type: 'endTurn', unitId: live.active.id }), live.confirm());
    if (presentation) live.finishPresentation(presentation.token);
  }
  expect(live.state.outcome).toBe('playerLoss'); device.save(); device.retry();
  expect(event.mock.calls.filter(([name]) => name === 'battle_outcome')).toHaveLength(1);
});
it('local previews require explicit development opt-in or isolated automated-test opt-in', () => {
  const env = { VITE_POSTHOG_ENABLED: 'true', VITE_POSTHOG_KEY: 'phc_test', VITE_POSTHOG_HOST: 'https://us.i.posthog.com' };
  const signals = { local: true, automated: false, dnt: false, optedOut: false };
  expect(collectionAllowed(env, signals)).toBe(false);
  expect(collectionAllowed({ ...env, VITE_POSTHOG_DEV_OPT_IN: 'true' }, signals)).toBe(true);
  expect(collectionAllowed({ ...env, VITE_POSTHOG_TEST_OPT_IN: 'true' }, signals)).toBe(false);
  expect(collectionAllowed({ ...env, VITE_POSTHOG_TEST_OPT_IN: 'true' }, { ...signals, automated: true })).toBe(true);
});
