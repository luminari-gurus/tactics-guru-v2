import { afterEach, expect, it, vi } from 'vitest';
import { APPLICATION_LOAD_FAILURE_EVENT, describeApplicationLoadFailure, readApplicationLoadFailure, reportApplicationLoadFailure } from '../../src/diagnostics/applicationLoadFailure';
import { bindTelemetry } from '../../src/telemetry/telemetry';

afterEach(() => { bindTelemetry(); vi.unstubAllGlobals(); });

it('retains the import category and build-owned frame locations without raw error or URL data', () => {
  const error = {
    name: 'TypeError', message: 'Failed to fetch dynamically imported module: https://game.invalid/prototype/assets/startBattleApp-12345678.js?save=PRIVATE#PRIVATE',
    stack: 'TypeError: PRIVATE\n at secretFunction (https://game.invalid/prototype/assets/main-abcdefgh.js:41:9)\n'
      + 'at https://game.invalid/prototype/assets/main-abcdefgh.js?PRIVATE#PRIVATE:123:456\n'
      + 'at https://external.invalid/prototype/assets/vendor-12345678.js:2:3\n'
      + 'at https://game.invalid/assets/outside-12345678.js:2:3\n'
      + 'at https://game.invalid/prototype/private/PRIVATE.js:1:2',
    cause: { save: 'PRIVATE' }, save: 'PRIVATE',
  };
  const result = describeApplicationLoadFailure(error, 'battle', 'https://game.invalid', '/prototype/');
  expect(result).toEqual({ route: 'battle', name: 'TypeError', category: 'module-fetch', frames: [
    { file: 'assets/startBattleApp-12345678.js' }, { file: 'assets/main-abcdefgh.js', line: 41, column: 9 },
    { file: 'assets/main-abcdefgh.js' },
  ] });
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|https?:|secretFunction|cause|save/);
});

it('classifies browser module failures and CSS preload failures without depending on Vite production events', () => {
  for (const message of ['Failed to fetch dynamically imported module', 'Importing a module script failed.', 'error loading dynamically imported module']) {
    expect(describeApplicationLoadFailure(new TypeError(message), 'battle', 'https://game.invalid').category).toBe('module-fetch');
  }
  expect(describeApplicationLoadFailure(Error('Unable to preload CSS for /PRIVATE.css'), 'run', '').category).toBe('css-preload');
  expect(describeApplicationLoadFailure(new TypeError('Load failed'), 'menu', '').category).toBe('network');
  expect(describeApplicationLoadFailure(new SyntaxError('PRIVATE'), 'dungeon', '')).toMatchObject({ name: 'SyntaxError', category: 'other' });
});

it('uses only fixed development entry labels and drops arbitrary source paths and URL components', () => {
  const stack = 'https://game.invalid/prototype/src/main.ts:27:5\n'
    + 'https://game.invalid/prototype/src/app/startBattleApp.ts?token=PRIVATE#PRIVATE\n'
    + 'https://game.invalid/prototype/src/private/PRIVATE.ts:1:1\n'
    + 'https://other.invalid/prototype/src/main.ts:1:1';
  expect(describeApplicationLoadFailure({ name: 'ReferenceError', message: 'PRIVATE', stack }, 'battle', 'https://game.invalid', '/prototype/')).toEqual({
    route: 'battle', name: 'ReferenceError', category: 'other', frames: [{ file: 'dev:main', line: 27, column: 5 }, { file: 'dev:battle' }],
  });
});

it('bounds and deduplicates frames, tolerates hostile getters and never reads causes or arbitrary fields', () => {
  const stack = Array.from({ length: 30 }, (_, i) => `https://game.invalid/assets/chunk${i}-12345678.js:1:2`).join('\n');
  const error = { name: 'PRIVATE', message: 'PRIVATE', stack: stack.split('\n')[0] + '\n' + stack };
  Object.defineProperty(error, 'cause', { get() { throw Error('must not inspect causes'); } });
  const result = describeApplicationLoadFailure(error, 'battle', 'https://game.invalid');
  expect(result.frames).toHaveLength(8); expect(new Set(result.frames.map(f => f.file)).size).toBe(8);
  expect(result.name).toBe('Error'); expect(result.category).toBe('other');
  const hostile = new Proxy({}, { get() { throw Error('PRIVATE'); } });
  expect(describeApplicationLoadFailure(hostile, 'battle', 'https://game.invalid')).toEqual({ route: 'battle', name: 'Error', category: 'other', frames: [] });
  expect(describeApplicationLoadFailure({ stack: 'x'.repeat(6000) + stack }, 'battle', 'https://game.invalid').frames).toEqual([]);
});

it('rebuilds local event data from a closed bounded schema before retaining it', () => {
  const input = { route: 'battle', name: 'TypeError', category: 'module-fetch', message: 'PRIVATE', save: 'PRIVATE', frames: [
    { file: 'assets/main-12345678.js', line: 4, column: 8, locals: { save: 'PRIVATE' } },
    { file: 'dev:main', line: Infinity, column: -1 },
    { file: 'https://game.invalid/assets/main-12345678.js?PRIVATE' },
    { file: 'dev:PRIVATE' },
  ] };
  expect(readApplicationLoadFailure(input)).toEqual({ route: 'battle', name: 'TypeError', category: 'module-fetch', frames: [
    { file: 'assets/main-12345678.js', line: 4, column: 8 }, { file: 'dev:main' },
  ] });
  expect(readApplicationLoadFailure({ ...input, route: 'PRIVATE' })).toBeNull();
  expect(readApplicationLoadFailure({ ...input, name: 'PRIVATE' })).toBeNull();
  expect(readApplicationLoadFailure({ ...input, category: 'PRIVATE' })).toBeNull();
  expect(readApplicationLoadFailure({ ...input, frames: Array(100).fill(input.frames[0]) })?.frames).toHaveLength(8);
  expect(readApplicationLoadFailure(new Proxy({}, { get() { throw Error('PRIVATE'); } }))).toBeNull();
});

it('validates and retains the same primitive snapshot when event getters change after the first read', () => {
  const reads: Record<string, number> = {};
  const changing = (prefix: string, values: Record<string, unknown>) => Object.defineProperties({}, Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { get() {
      const label = `${prefix}.${key}`;
      reads[label] = (reads[label] ?? 0) + 1;
      return reads[label] === 1 ? value : 'PRIVATE_SENTINEL';
    } }]),
  ));
  const entry = changing('frame', { file: 'assets/main-12345678.js', line: 4, column: 8 });
  const input = changing('event', { route: 'battle', name: 'TypeError', category: 'module-fetch', frames: [entry] });
  const result = readApplicationLoadFailure(input);
  expect(result).toEqual({ route: 'battle', name: 'TypeError', category: 'module-fetch', frames: [
    { file: 'assets/main-12345678.js', line: 4, column: 8 },
  ] });
  expect(reads).toEqual({ 'event.route': 1, 'event.name': 1, 'event.category': 1, 'event.frames': 1,
    'frame.file': 1, 'frame.line': 1, 'frame.column': 1 });
  expect(JSON.stringify(result)).not.toContain('PRIVATE_SENTINEL');
});

it('emits one local notification independently of telemetry, storage and network, and cannot break recovery', () => {
  const target = new EventTarget(), received: unknown[] = [], network = vi.fn(), telemetry = vi.fn(), storage = vi.fn();
  target.addEventListener(APPLICATION_LOAD_FAILURE_EVENT, event => received.push((event as CustomEvent).detail));
  vi.stubGlobal('window', target); vi.stubGlobal('location', { origin: 'https://game.invalid' });
  vi.stubGlobal('fetch', network); vi.stubGlobal('localStorage', { getItem: storage, setItem: storage });
  bindTelemetry({ event: telemetry, error: telemetry });
  reportApplicationLoadFailure(new TypeError('Importing a module script failed.'), 'battle');
  expect(received).toEqual([{ route: 'battle', name: 'TypeError', category: 'module-fetch', frames: [] }]);
  expect(network).not.toHaveBeenCalled(); expect(telemetry).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
  vi.stubGlobal('window', { dispatchEvent() { throw Error('diagnostic receiver failed'); } });
  expect(() => reportApplicationLoadFailure(new Error('PRIVATE'), 'battle')).not.toThrow();
});
