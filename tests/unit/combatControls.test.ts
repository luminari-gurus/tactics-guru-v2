import { afterEach, expect, it } from 'vitest';
import {
  COMBAT_CONTROLS_KEY, readCombatControlsPreference, writeCombatControlsPreference,
  isCoarsePointer, resolveCombatControlsSkin,
} from '../../src/ui/combatControls';

afterEach(() => {
  try { localStorage?.removeItem(COMBAT_CONTROLS_KEY); } catch { /* node */ }
  delete (globalThis as { __tacticsGuruCombatControls?: string }).__tacticsGuruCombatControls;
});

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  } as unknown as Storage;
}

it('defaults to Auto and persists Radial or Rail', () => {
  const storage = memory();
  expect(readCombatControlsPreference(storage)).toBe('auto');
  expect(writeCombatControlsPreference('radial', storage)).toBe(true);
  expect(readCombatControlsPreference(storage)).toBe('radial');
  expect(writeCombatControlsPreference('rail', storage)).toBe(true);
  expect(readCombatControlsPreference(storage)).toBe('rail');
  expect(readCombatControlsPreference(memory())).toBe('auto');
});

it('treats unknown stored values as Auto', () => {
  const storage = memory();
  storage.setItem(COMBAT_CONTROLS_KEY, 'wheel');
  expect(readCombatControlsPreference(storage)).toBe('auto');
});

it('honours an injected test override before storage', () => {
  const storage = memory();
  writeCombatControlsPreference('auto', storage);
  (globalThis as { __tacticsGuruCombatControls?: string }).__tacticsGuruCombatControls = 'rail';
  expect(readCombatControlsPreference(storage)).toBe('rail');
  delete (globalThis as { __tacticsGuruCombatControls?: string }).__tacticsGuruCombatControls;
});

it('Auto uses radial on every coarse pointer, including landscape tablets, and rail on fine pointers', () => {
  expect(resolveCombatControlsSkin('auto', true)).toBe('radial');
  expect(resolveCombatControlsSkin('auto', false)).toBe('rail');
  expect(resolveCombatControlsSkin('radial', false)).toBe('radial');
  expect(resolveCombatControlsSkin('rail', true)).toBe('rail');
  expect(isCoarsePointer(() => ({ matches: true }))).toBe(true);
  expect(isCoarsePointer(() => ({ matches: false }))).toBe(false);
});
