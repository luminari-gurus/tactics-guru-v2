import { assert, beforeAll, describe, expect, it, vi } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { encodeBattleSave, SAVE_MAX_CODE_UNITS } from '../../src/domain/saveEnvelope';
import { createBattle, dispatch } from '../../src/domain/turns';
import { planEnemyTurn } from '../../src/domain/ai';
import { nextUint32 } from '../../src/domain/rng';
import { saveFixtures, type SaveFixture } from '../helpers/saveFixtures';
import { playerDecision } from '../helpers/battlePolicy';
import { BATTLE_STORAGE_KEYS as keys, createBattleStorage, type BattleStorageAccess } from '../../src/persistence/battleStorage';

type Call = { operation: 'read' | 'write' | 'remove'; key: string; text?: string };
class RecordingStorage implements BattleStorageAccess {
  readonly data = new Map<string, string>();
  readonly calls: Call[] = [];
  fail: (call: Call, index: number) => boolean = () => false;
  thrown: unknown = new DOMException('test failure', 'SecurityError');
  constructor(primary?: string | null, backup?: string | null) {
    if (primary != null) this.data.set(keys.primary, primary);
    if (backup != null) this.data.set(keys.backup, backup);
    this.data.set('godot:save', 'legacy sentinel');
    this.data.set('unrelated:setting', 'other sentinel');
  }
  private record(call: Call) {
    // Do not let a namespace regression hide behind a caught storage exception.
    expect(Object.values(keys)).toContain(call.key);
    this.calls.push(call);
    if (this.fail(call, this.calls.length)) throw this.thrown;
  }
  getItem(key: string) { this.record({ operation: 'read', key }); return this.data.get(key) ?? null; }
  setItem(key: string, text: string) { this.record({ operation: 'write', key, text }); this.data.set(key, text); }
  removeItem(key: string) { this.record({ operation: 'remove', key }); this.data.delete(key); }
}

const initial = createBattle('map:forest_ruins', 1, battleCatalog); assert(initial.ok);
const next = createBattle('map:forest_ruins', 2, battleCatalog); assert(next.ok);
const encoded = encodeBattleSave(initial.state, battleCatalog); assert(encoded.ok);
const encodedNext = encodeBattleSave(next.state, battleCatalog); assert(encodedNext.ok);
const oldText = encoded.text;
const newText = encodedNext.text;
const reader = (storage: RecordingStorage) => createBattleStorage(battleCatalog, () => storage);

describe('guarded acquisition and read-only recovery', () => {
  it('imports and acquires safely without a browser, and lazily guards the browser getter', () => {
    expect(typeof window).toBe('undefined');
    expect(createBattleStorage(battleCatalog).load()).toMatchObject({ ok: false, operation: 'acquire', kind: 'unavailable' });
    const getter = vi.fn(() => { throw new DOMException('denied', 'SecurityError'); });
    vi.stubGlobal('window', Object.defineProperty({}, 'localStorage', { get: getter }));
    try {
      const adapter = createBattleStorage(battleCatalog);
      expect(getter).not.toHaveBeenCalled();
      expect(adapter.load()).toMatchObject({ ok: false, operation: 'acquire', kind: 'security' });
    } finally { vi.unstubAllGlobals(); }
  });

  for (const primary of ['missing', 'valid', 'invalid', 'unavailable'] as const) {
    for (const backup of ['missing', 'valid', 'invalid', 'unavailable'] as const) {
      it(`selects from ${primary} primary / ${backup} backup without mutation`, () => {
        const value = (status: string, valid: string) => status === 'missing' ? null : status === 'invalid' ? ' {bad raw\n' : valid;
        const storage = new RecordingStorage(value(primary, oldText), value(backup, newText));
        storage.fail = call => call.key === keys.primary ? primary === 'unavailable' : backup === 'unavailable';
        const before = [...storage.data];
        const result = reader(storage).load(); assert(result.ok);
        expect(result.inspection.primary.status).toBe(primary);
        expect(result.inspection.backup.status).toBe(backup);
        expect(result.selected?.slot ?? null).toBe(primary === 'valid' ? 'primary' : backup === 'valid' ? 'backup' : null);
        if (result.selected) expect(result.selected.state).toEqual(primary === 'valid' ? initial.state : next.state);
        expect(storage.calls).toEqual([{ operation: 'read', key: keys.primary }, { operation: 'read', key: keys.backup }]);
        expect([...storage.data]).toEqual(before);
      });
    }
  }

  it('retains exact invalid bytes and every codec failure category in either slot', () => {
    const envelope = JSON.parse(oldText);
    const cases = [
      ['['.repeat(SAVE_MAX_CODE_UNITS + 1), 'tooLarge'], [' \n{bad\ud800', 'invalidJson'], ['{}', 'invalidEnvelope'],
      [JSON.stringify({ ...envelope, format: 2 }), 'incompatible'],
      [JSON.stringify({ ...envelope, payload: { ...envelope.payload, round: 0 } }), 'invalidState'],
      [JSON.stringify({ ...envelope, digest: 'sha256:' + '0'.repeat(64) }), 'corrupt'],
      ...['rules', 'rng', 'content'].map(version => [JSON.stringify({ ...envelope, payload: { ...envelope.payload,
        versions: { ...envelope.payload.versions, [version]: 'future' } } }), 'incompatible']),
    ];
    for (const [text, reason] of cases) for (const slot of ['primary', 'backup'] as const) {
      const storage = new RecordingStorage(slot === 'primary' ? text : oldText, slot === 'backup' ? text : oldText);
      const before = [...storage.data];
      const result = reader(storage).load(); assert(result.ok);
      expect(result.inspection[slot]).toEqual({ status: 'invalid', text, reason });
      expect(result.selected?.slot).toBe(slot === 'primary' ? 'backup' : 'primary');
      expect([...storage.data]).toEqual(before);
    }
  });

  it('returns owned state and preserves noncanonical valid text for recovery', () => {
    const text = JSON.stringify(JSON.parse(oldText), null, 2);
    const storage = new RecordingStorage(text);
    const result = reader(storage).load(); assert(result.ok && result.selected);
    expect(result.inspection.primary).toMatchObject({ status: 'valid', text });
    expect(result.selected.state).toEqual(initial.state);
    expect(result.selected.state).not.toBe(initial.state);
    expect(storage.data.get(keys.primary)).toBe(text);
  });
});

describe('write preflight and backup ordering', () => {
  it('rejects invalid input before any storage access and re-reads slots on every save', () => {
    const storage = new RecordingStorage(oldText);
    const provider = vi.fn(() => storage);
    const adapter = createBattleStorage(battleCatalog, provider);
    expect(adapter.save({})).toEqual({ ok: false, reason: 'invalidState' });
    expect(provider).not.toHaveBeenCalled();
    expect(adapter.save(next.state)).toEqual({ ok: true });
    storage.data.set(keys.backup, 'newly corrupt');
    storage.calls.length = 0;
    expect(adapter.save(initial.state)).toMatchObject({ ok: false, reason: 'recoveryRequired' });
    expect(storage.calls.map(c => c.operation)).toEqual(['read', 'read']);
    expect(storage.data.get(keys.backup)).toBe('newly corrupt');
  });

  for (const slot of ['primary', 'backup'] as const) {
    it(`preserves invalid ${slot} and refuses all mutations`, () => {
      const invalids = [' {corrupt bytes\n', 'x'.repeat(SAVE_MAX_CODE_UNITS + 1), JSON.stringify({ ...JSON.parse(oldText), format: 2 })];
      for (const text of invalids) {
        const storage = new RecordingStorage(slot === 'primary' ? text : oldText, slot === 'backup' ? text : newText);
        const before = [...storage.data];
        const result = reader(storage).save(next.state);
        assert(!result.ok && result.reason === 'recoveryRequired');
        expect(result.inspection[slot]).toMatchObject({ status: 'invalid', text });
        expect([...storage.data]).toEqual(before);
        expect(storage.calls.map(c => c.operation)).toEqual(['read', 'read']);
      }
    });

    it(`a failed ${slot} read is not treated as an absent slot`, () => {
      const storage = new RecordingStorage(oldText, newText);
      storage.fail = call => call.key === keys[slot];
      const before = [...storage.data];
      expect(reader(storage).save(next.state)).toMatchObject({ ok: false, reason: 'storage', operation: 'read', slot });
      expect(storage.calls.map(c => c.operation)).toEqual(['read', 'read']);
      expect([...storage.data]).toEqual(before);
    });
  }

  const cases = [
    { name: 'existing primary and backup', primary: oldText, backup: newText, recovery: oldText, backupAfter: oldText, writes: ['backup', 'primary'] },
    { name: 'primary only', primary: oldText, backup: null, recovery: oldText, backupAfter: oldText, writes: ['backup', 'primary'] },
    { name: 'backup only', primary: null, backup: oldText, recovery: oldText, backupAfter: oldText, writes: ['primary'] },
    { name: 'first save', primary: null, backup: null, recovery: newText, backupAfter: newText, writes: ['backup', 'primary'] },
  ] as const;
  for (const scenario of cases) {
    it(`publishes safely from ${scenario.name}`, () => {
      const storage = new RecordingStorage(scenario.primary, scenario.backup);
      expect(reader(storage).save(next.state)).toEqual({ ok: true });
      expect(storage.calls.filter(c => c.operation === 'write').map(c => c.key)).toEqual(scenario.writes.map(s => keys[s]));
      expect(storage.data.get(keys.primary)).toBe(newText);
      expect(storage.data.get(keys.backup)).toBe(scenario.backupAfter);
      expect(storage.data.get('godot:save')).toBe('legacy sentinel');
      expect(storage.data.get('unrelated:setting')).toBe('other sentinel');
    });

    for (const failingSlot of scenario.writes) {
      it(`retains recovery after ${failingSlot} write failure from ${scenario.name}`, () => {
        const storage = new RecordingStorage(scenario.primary, scenario.backup);
        storage.thrown = new DOMException('full', 'QuotaExceededError');
        storage.fail = call => call.operation === 'write' && call.key === keys[failingSlot];
        expect(reader(storage).save(next.state)).toMatchObject({ ok: false, reason: 'storage', operation: 'write', slot: failingSlot, kind: 'quota' });
        const writes = storage.calls.filter(c => c.operation === 'write').map(c => c.key);
        expect(writes).toEqual(scenario.writes.slice(0, scenario.writes.findIndex(s => s === failingSlot) + 1).map(s => keys[s]));
        storage.fail = () => false;
        const restored = reader(storage).load(); assert(restored.ok);
        if (scenario.name === 'first save' && failingSlot === 'backup') expect(restored.selected).toBeNull();
        else {
          assert(restored.selected);
          const recovered = encodeBattleSave(restored.selected.state, battleCatalog); assert(recovered.ok);
          expect(recovered.text).toBe(scenario.recovery);
        }
        expect(storage.data.get(keys.primary) ?? null).toBe(scenario.primary);
        expect(storage.calls.some(c => c.operation === 'remove')).toBe(false);
      });
    }
  }

  it('recovers from each between-operation snapshot without executing the remainder', () => {
    for (const scenario of cases) {
      const storage = new RecordingStorage(scenario.primary, scenario.backup);
      const checkpoints: Map<string, string>[] = [];
      const setItem = storage.setItem.bind(storage);
      storage.setItem = (key, text) => { setItem(key, text); checkpoints.push(new Map(storage.data)); };
      expect(reader(storage).save(next.state)).toEqual({ ok: true });
      for (let index = 0; index < checkpoints.length; index++) {
        const snapshot = checkpoints[index];
        const afterStop = new RecordingStorage(snapshot.get(keys.primary), snapshot.get(keys.backup));
        const result = reader(afterStop).load(); assert(result.ok && result.selected);
        const saved = encodeBattleSave(result.selected.state, battleCatalog); assert(saved.ok);
        expect(saved.text).toBe(index === checkpoints.length - 1 ? newText : scenario.recovery);
      }
    }
  });

  it('backs up the exact noncanonical validated primary text', () => {
    const text = JSON.stringify(JSON.parse(oldText), null, 2);
    const storage = new RecordingStorage(text, newText);
    expect(reader(storage).save(next.state)).toEqual({ ok: true });
    expect(storage.data.get(keys.backup)).toBe(text);
  });
});

describe('explicit single-slot removal', () => {
  it('rejects unknown slot names before acquiring or accessing storage', () => {
    const provider = vi.fn(() => new RecordingStorage(oldText));
    const adapter = createBattleStorage(battleCatalog, provider);
    for (const slot of ['godot:save', '__proto__', 'toString', undefined, null]) {
      expect(adapter.removeSlot(slot as never, oldText)).toEqual({ ok: false, reason: 'invalidSlot' });
    }
    expect(provider).not.toHaveBeenCalled();
  });
  for (const slot of ['primary', 'backup'] as const) {
    it(`removes only explicitly inspected ${slot}, including undecodable text`, () => {
      const storage = new RecordingStorage(' original bad\n', ' original bad\n');
      expect(reader(storage).removeSlot(slot, ' original bad\n')).toEqual({ ok: true });
      expect(storage.data.has(keys[slot])).toBe(false);
      expect(storage.data.get(keys[slot === 'primary' ? 'backup' : 'primary'])).toBe(' original bad\n');
      expect(storage.calls).toEqual([{ operation: 'read', key: keys[slot] }, { operation: 'remove', key: keys[slot] }]);
      expect(storage.data.get('godot:save')).toBe('legacy sentinel');
    });

    it(`refuses stale ${slot} inspection and succeeds idempotently only after a read`, () => {
      for (const [actual, expected] of [[newText, oldText], [null, oldText], [newText, null]] as const) {
        const storage = new RecordingStorage(actual, actual);
        expect(reader(storage).removeSlot(slot, expected)).toEqual({ ok: false, reason: 'changed', slot, expectedText: expected, text: actual });
        expect(storage.calls).toEqual([{ operation: 'read', key: keys[slot] }]);
      }
      const storage = new RecordingStorage();
      expect(reader(storage).removeSlot(slot, null)).toEqual({ ok: true });
      expect(storage.calls).toEqual([{ operation: 'read', key: keys[slot] }]);
    });

    for (const operation of ['read', 'remove'] as const) {
      it(`preserves inspected bytes after ${slot} ${operation} failure`, () => {
        const storage = new RecordingStorage(oldText, oldText);
        storage.fail = call => call.operation === operation;
        const before = [...storage.data];
        expect(reader(storage).removeSlot(slot, oldText)).toMatchObject({ ok: false, reason: 'storage', operation, slot, expectedText: oldText });
        expect([...storage.data]).toEqual(before);
      });
    }
  }

  it('reports partial reset without pretending to provide a two-slot transaction', () => {
    const storage = new RecordingStorage(oldText, oldText);
    const adapter = reader(storage);
    expect(adapter.removeSlot('backup', oldText)).toEqual({ ok: true });
    storage.fail = call => call.operation === 'remove';
    expect(adapter.removeSlot('primary', oldText).ok).toBe(false);
    const restored = adapter.load(); assert(restored.ok);
    expect(restored.selected?.slot).toBe('primary');
  });
});

describe('failure taxonomy and unchanged memory', () => {
  const exceptions = [
    { error: new DOMException('full', 'QuotaExceededError'), kind: 'quota' },
    { error: { name: 'SecurityError' }, kind: 'security' },
    { error: new Error('offline'), kind: 'other' },
    { error: null, kind: 'other' },
    { error: Object.defineProperty({}, 'name', { get() { throw new Error('foreign accessor'); } }), kind: 'other' },
  ];
  for (const [index, exception] of exceptions.entries()) {
    it(`guards acquisition for all operations with exception shape ${index}`, () => {
      const adapter = createBattleStorage(battleCatalog, () => { throw exception.error; });
      for (const result of [adapter.load(), adapter.save(initial.state), adapter.removeSlot('primary', oldText)]) {
        expect(result).toMatchObject({ ok: false, operation: 'acquire', kind: exception.kind });
      }
      expect(adapter.removeSlot('primary', oldText)).toMatchObject({ expectedText: oldText });
    });
  }
  it('treats null and undefined providers as unavailable for every operation', () => {
    for (const unavailable of [null, undefined]) {
      const adapter = createBattleStorage(battleCatalog, () => unavailable);
      for (const result of [adapter.load(), adapter.save(initial.state), adapter.removeSlot('backup', oldText)]) {
        expect(result).toMatchObject({ ok: false, operation: 'acquire', kind: 'unavailable' });
      }
    }
  });

  it('keeps browser Storage method receivers and guards method accessors', () => {
    const storage = new RecordingStorage(oldText);
    vi.stubGlobal('window', { localStorage: storage });
    try {
      const adapter = createBattleStorage(battleCatalog);
      expect(adapter.save(next.state)).toEqual({ ok: true });
      const restored = adapter.load(); assert(restored.ok && restored.selected);
      expect(restored.selected.state).toEqual(next.state);
      expect(adapter.removeSlot('backup', oldText)).toEqual({ ok: true });
    } finally { vi.unstubAllGlobals(); }
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      const broken = new RecordingStorage(oldText);
      Object.defineProperty(broken, method, { get() { throw new DOMException('denied', 'SecurityError'); } });
      const adapter = reader(broken);
      const result = method === 'removeItem' ? adapter.removeSlot('primary', oldText) : adapter.save(next.state);
      expect(result).toMatchObject({ ok: false, kind: 'security' });
      expect(broken.data.get(keys.primary)).toBe(oldText);
    }
  });

  let fixtures: SaveFixture[];
  beforeAll(() => { fixtures = saveFixtures(); }, 15_000);
  it('preserves accepted state, next command/RNG/enemy decisions across all shared boundaries', () => {
    for (const fixture of fixtures) {
      const storage = new RecordingStorage();
      const adapter = createBattleStorage(fixture.catalog, () => storage);
      expect(adapter.save(fixture.state)).toEqual({ ok: true });
      const restored = adapter.load(); assert(restored.ok && restored.selected);
      const state = restored.selected.state;
      expect(state).toEqual(fixture.state);
      expect(nextUint32(state.rng)).toEqual(nextUint32(fixture.state.rng));
      const actor = state.units.find(u => u.id === state.initiative[state.activeIndex])!;
      const plan = planEnemyTurn(fixture.state, actor.id, fixture.catalog);
      expect(planEnemyTurn(state, actor.id, fixture.catalog)).toEqual(plan);
      const command = state.outcome !== 'ongoing' || state.commandCount === 10_000 ? { type: 'endTurn' as const, unitId: actor.id }
        : plan.ok ? plan.commands[0] : playerDecision(fixture.state,fixture.catalog);
      expect(dispatch(state, command, fixture.catalog)).toEqual(dispatch(fixture.state, command, fixture.catalog));
    }
  });

  it('never mutates frozen caller state/catalog after success or failure at each effect', () => {
    const freeze = <T>(value: T): T => {
      if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
      return value;
    };
    const state = freeze(structuredClone(initial.state));
    const catalog = freeze(structuredClone(battleCatalog));
    const before = JSON.stringify({ state, catalog });
    for (let failAt = 0; failAt <= 4; failAt++) {
      const storage = new RecordingStorage(newText, oldText);
      storage.fail = (_call, index) => index === failAt;
      createBattleStorage(catalog, () => storage).save(state);
      expect(JSON.stringify({ state, catalog })).toBe(before);
    }
    const storage = new RecordingStorage('invalid', oldText);
    createBattleStorage(catalog, () => storage).save(state);
    expect(JSON.stringify({ state, catalog })).toBe(before);
  });
});
