import { describe, expect, it } from 'vitest';
import { HERO_IDS } from '../../src/content/constants';
import { createRun, deriveRunSeed, describeRunBattle, readRunState, runBoundaryId, transitionRun,
  type RunCommand, type RunDefinition, type RunResult, type RunState } from '../../src/domain/run';
import { nextUint32, seedRng } from '../../src/domain/rng';
import { catalogFixture as catalog } from './fixtures/contentContract';

const definition = { encounters: ['encounter:first', 'encounter:second', 'encounter:third'] } as const satisfies RunDefinition;
function accepted(result: ReturnType<typeof createRun> | RunResult): RunState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}
function fresh() { return accepted(createRun('attempt-1', 123, definition, catalog)); }
function boundary(state: RunState) {
  return { runId: state.id, revision: state.revision, encounterId: state.encounters[state.encounterIndex], boundaryId: runBoundaryId(state) };
}
function complete(state: RunState, hp: readonly number[], outcome: 'victory' | 'defeat' = 'victory'): RunCommand {
  return { ...boundary(state), type: 'completeBattle', outcome, party: state.party.map((h, i) => ({ ...h, hp: hp[i] })) };
}
function apply(state: RunState, command: unknown) { return accepted(transitionRun(state, command, definition, catalog)); }
function claim(state: RunState): RunCommand { return { ...boundary(state), type: 'acknowledgeReward' }; }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function trace() {
  const states = [fresh()];
  for (const hp of [[12, 0, 9], [8, 0, 7], [3, 0, 2]]) {
    states.push(apply(states.at(-1)!, complete(states.at(-1)!, hp)));
    if (states.at(-1)!.phase === 'reward') states.push(apply(states.at(-1)!, claim(states.at(-1)!)));
  }
  return states;
}

describe('run identity and validation', () => {
  it('creates the fixed full-HP party and owns all returned arrays', () => {
    const state = fresh();
    expect(state.party).toEqual(['fighter', 'ranger', 'mage'].map(heroId => ({ heroId, hp: 18 })));
    expect(state).toMatchObject({ encounterIndex: 0, revision: 0, phase: 'battle', pendingReward: null });
    expect(state.encounters).not.toBe(definition.encounters);
    const restored = accepted(readRunState(JSON.parse(JSON.stringify(state)), definition, catalog));
    expect(restored).toEqual(state);
    expect(restored.party).not.toBe(state.party);
    expect(restored.versions).not.toBe(state.versions);
  });
  it.each(HERO_IDS.flatMap(heroId => [
    { heroId, condition: 'damaged', hp: catalog.heroes[heroId].stats.maxHp - 1 },
    { heroId, condition: 'defeated', hp: 0 },
  ]))('rejects a $condition $heroId at initial battle entry', ({ heroId, hp }) => {
    const saved = JSON.parse(JSON.stringify(fresh())) as RunState;
    const party = saved.party.map(hero => hero.heroId === heroId ? { ...hero, hp } : hero);
    const state = freeze({ ...saved, party });
    const before = JSON.stringify(state);
    expect(readRunState(state, definition, catalog)).toEqual({ ok: false, reason: 'invalidRun' });
    expect(transitionRun(state, complete(state, party.map(hero => hero.hp)), definition, catalog))
      .toEqual({ ok: false, reason: 'invalidRun' });
    expect(JSON.stringify(state)).toBe(before);
  });
  it.each([1, 2])('accepts damaged survivor entry HP at later encounter %s', index => {
    const state = trace()[index * 2];
    expect(state.party.some(hero => hero.hp === 0)).toBe(true);
    expect(state.party.some(hero => hero.hp > 0 && hero.hp < catalog.heroes[hero.heroId].stats.maxHp)).toBe(true);
    expect(accepted(readRunState(JSON.parse(JSON.stringify(state)), definition, catalog))).toEqual(state);
  });
  it.each([-1, 2 ** 32, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects seed %s', seed => {
    expect(createRun('attempt', seed, definition, catalog).ok).toBe(false);
  });
  it.each(['', 'x'.repeat(65), 'attempt:1', 'é', 'attempt\n'])('rejects run ID %j', id => {
    expect(createRun(id, 0, definition, catalog).ok).toBe(false);
  });
  it('accepts uint32 endpoints, distinct trusted encounter IDs and catalog HP maxima', () => {
    for (const seed of [0, 0xffffffff]) expect(createRun('x', seed, definition, catalog).ok).toBe(true);
    const changed = { ...catalog, heroes: { ...catalog.heroes, mage: { ...catalog.heroes.mage, stats: { ...catalog.heroes.mage.stats, maxHp: 7 } } } };
    expect(accepted(createRun('x', 0, definition, changed)).party[2].hp).toBe(7);
    expect(createRun('x', 0, { encounters: ['encounter:a', 'encounter:a', 'encounter:b'] }, catalog).ok).toBe(false);
    expect(createRun('x', 0, { encounters: ['encounter:a', 'encounter:b', 'bad'] } as unknown as RunDefinition, catalog).ok).toBe(false);
  });
  const mutations: [string, (s: any) => void][] = [
    ['extra field', s => { s.guarded = true; }], ['future format', s => { s.format = 2; }],
    ['future rules', s => { s.versions.rules++; }], ['future RNG', s => { s.versions.rng++; }],
    ['different content', s => { s.versions.content = 'unknown'; }], ['extra version', s => { s.versions.extra = 1; }],
    ['unknown encounter', s => { s.encounters[0] = 'encounter:unknown'; }], ['fourth encounter', s => { s.encounters.push('encounter:fourth'); }],
    ['negative index', s => { s.encounterIndex = -1; }], ['fourth index', s => { s.encounterIndex = 3; }],
    ['unsafe revision', s => { s.revision = Number.MAX_SAFE_INTEGER; }], ['fraction revision', s => { s.revision = 0.5; }],
    ['inconsistent revision', s => { s.revision = 2; }], ['unknown phase', s => { s.phase = 'shop'; }],
    ['early victory', s => { s.phase = 'victory'; }], ['living defeat', s => { s.phase = 'defeat'; s.revision = 1; }],
    ['dead active party', s => { s.party.forEach((h: any) => { h.hp = 0; }); }],
    ['missing hero', s => { s.party.pop(); }], ['duplicate hero', s => { s.party[1].heroId = 'fighter'; }],
    ['wrong hero order', s => { s.party.reverse(); }], ['negative HP', s => { s.party[0].hp = -1; }],
    ['excess HP', s => { s.party[0].hp = 19; }], ['unsafe HP', s => { s.party[0].hp = Infinity; }],
    ['fraction HP', s => { s.party[0].hp = 1.5; }], ['battle flags', s => { s.party[0].hasActed = true; }],
    ['extra pending reward', s => { s.pendingReward = { id: 'fake', seed: 0 }; }],
    ['sparse party', s => { delete s.party[0]; }], ['hidden array field', s => { s.party.extra = 1; }],
  ];
  it.each(mutations)('rejects %s', (_, mutate) => {
    const state = structuredClone(fresh()); mutate(state);
    expect(readRunState(state, definition, catalog)).toEqual({ ok: false, reason: 'invalidRun' });
  });
  it('does not evaluate accessors in state or commands', () => {
    const state = fresh();
    Object.defineProperty(state, 'phase', { enumerable: true, get() { throw Error('accessed'); } });
    expect(readRunState(state, definition, catalog).ok).toBe(false);
    const command = complete(fresh(), [1, 1, 1]);
    Object.defineProperty(command, 'type', { enumerable: true, get() { throw Error('accessed'); } });
    expect(transitionRun(fresh(), command, definition, catalog).ok).toBe(false);
  });
  it('validates pending reward identity/seed and phase bounds after JSON round trip', () => {
    const reward = apply(fresh(), complete(fresh(), [12, 0, 9]));
    expect(accepted(readRunState(JSON.parse(JSON.stringify(reward)), definition, catalog))).toEqual(reward);
    for (const mutate of [(s: any) => { s.pendingReward.id = 'wrong'; }, (s: any) => { s.pendingReward.seed++; },
      (s: any) => { s.pendingReward.extra = 1; }, (s: any) => { s.encounterIndex = 2; s.revision = 5; }]) {
      const changed = structuredClone(reward); mutate(changed);
      expect(readRunState(changed, definition, catalog).ok).toBe(false);
    }
  });
});

describe('deterministic boundaries', () => {
  it('matches independent uint32 mixing and fixed seed vectors', () => {
    // Golden outputs also verified with an independent Python uint32 sfc32 calculation.
    const vectors = [0, 123, 0xffffffff].flatMap(seed => ['encounter', 'reward'].flatMap(purpose =>
      [0, 1, 2].map(index => {
        const tag = purpose === 'encounter' ? 0x454e4331 : 0x52574431;
        const mixed = (BigInt(seed) ^ BigInt(tag) ^ ((BigInt(index + 1) * 0x9e3779b9n) & 0xffffffffn)) & 0xffffffffn;
        return deriveRunSeed(seed, purpose as 'encounter' | 'reward', index) === nextUint32(seedRng(Number(mixed))).value;
      })));
    expect(vectors.every(Boolean)).toBe(true);
    expect([0, 1, 2].map(i => deriveRunSeed(123, 'encounter', i))).toEqual([1167576323, 1556857405, 3704156101]);
    expect([0, 1, 2].map(i => deriveRunSeed(123, 'reward', i))).toEqual([1746306032, 2025501471, 731033742]);
  });
  it('rejects invalid derivation inputs', () => {
    expect(() => deriveRunSeed(-1, 'encounter', 0)).toThrow(RangeError);
    expect(() => deriveRunSeed(0, 'reward', 3)).toThrow(RangeError);
    expect(() => deriveRunSeed(0, 'unknown' as 'reward', 0)).toThrow(RangeError);
  });
  it('repeated previews do not alter run or unrelated battle RNG; purposes are independent', () => {
    const state = freeze(fresh()), rng = freeze(seedRng(123)), before = JSON.stringify({ state, rng });
    const descriptor = describeRunBattle(state);
    for (let i = 0; i < 10; i++) expect(describeRunBattle(state)).toEqual(descriptor);
    expect(JSON.stringify({ state, rng })).toBe(before);
    expect(deriveRunSeed(123, 'reward', 0)).not.toBe(descriptor!.seed);
    expect(new Set([0, 1, 2].map(i => deriveRunSeed(123, 'encounter', i))).size).toBe(3);
  });
});

describe('atomic run progression', () => {
  it('replays the complete acyclic trace identically and retains survivor HP', () => {
    const states = trace();
    expect(states).toEqual(trace());
    expect(states.map(s => s.phase)).toEqual(['battle', 'reward', 'battle', 'reward', 'battle', 'victory']);
    expect(states.map(s => s.revision)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(states.map(s => s.encounterIndex)).toEqual([0, 0, 1, 1, 2, 2]);
    const descriptor = describeRunBattle(states[2]);
    expect(descriptor!.party).toEqual([{ heroId: 'fighter', hp: 12 }, { heroId: 'mage', hp: 9 }]);
    expect(descriptor!.party.every(h => Object.keys(h).sort().join() === 'heroId,hp')).toBe(true);
    expect(describeRunBattle(states[1])).toBeNull();
    for (const state of states) expect(accepted(readRunState(state, definition, catalog))).toEqual(state);
  });
  it.each([0, 1, 2])('party wipe ends encounter %s with no pending reward', index => {
    const state = trace()[index * 2];
    const ended = apply(state, complete(state, [0, 0, 0], 'defeat'));
    expect(ended).toMatchObject({ phase: 'defeat', pendingReward: null, encounterIndex: index });
    expect(readRunState(ended, definition, catalog).ok).toBe(true);
    expect(transitionRun(ended, claim(ended), definition, catalog)).toEqual({ ok: false, reason: 'wrongPhase' });
  });
  it('rejects stale and malformed commands without changing frozen state or command', () => {
    const state = freeze(fresh()), reward = apply(state, complete(state, [12, 0, 9]));
    const commands: unknown[] = [
      { ...complete(state, [12, 0, 9]), runId: 'old' }, { ...complete(state, [12, 0, 9]), revision: 1 },
      { ...complete(state, [12, 0, 9]), encounterId: definition.encounters[1] },
      { ...complete(state, [12, 0, 9]), boundaryId: 'old' },
      { ...complete(state, [12, 0, 9]), extra: 1 }, { ...boundary(state), type: 'completeBattle' },
      { ...complete(state, [12, 0, 9]), type: 'unknown' }, complete(state, [0, 0, 0]),
      complete(state, [12, 0, 9], 'defeat'), complete(state, [19, 0, 9]), claim(state), null,
    ];
    for (const command of commands) {
      freeze(command); const before = JSON.stringify({ state, command });
      expect(transitionRun(state, command, definition, catalog).ok).toBe(false);
      expect(JSON.stringify({ state, command })).toBe(before);
    }
    expect(transitionRun(reward, complete(state, [12, 0, 9]), definition, catalog)).toEqual({ ok: false, reason: 'staleBoundary' });
    const next = apply(reward, claim(reward));
    expect(transitionRun(next, claim(reward), definition, catalog)).toEqual({ ok: false, reason: 'staleBoundary' });
    expect(transitionRun(next, complete(next, [13, 0, 9]), definition, catalog).ok).toBe(false);
    expect(transitionRun(next, complete(next, [12, 1, 9]), definition, catalog).ok).toBe(false);
  });
  it('owns output and event payloads, preserving inputs on successful transitions', () => {
    const state = freeze(fresh()), command = freeze(complete(state, [12, 0, 9]));
    const result = transitionRun(state, command, definition, catalog);
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.phase !== 'reward' || result.events[0].type !== 'rewardPending') throw Error('reward expected');
    expect(result.state.party).not.toBe(state.party);
    expect(result.state.pendingReward).not.toBe(result.events[0].reward);
    expect(result.state.party).not.toBe(command.type === 'completeBattle' ? command.party : null);
    expect(state.party[0].hp).toBe(18);
  });
  it.each(['victory', 'defeat'] as const)('starts fresh from %s and rejects old callbacks', outcome => {
    const ended = outcome === 'victory' ? trace().at(-1)! : apply(fresh(), complete(fresh(), [0, 0, 0], 'defeat'));
    const command = { ...boundary(ended), type: 'startNewRun', newRunId: 'attempt-2', newSeed: 124 };
    const next = apply(ended, command);
    expect(next).toEqual(accepted(createRun('attempt-2', 124, definition, catalog)));
    expect(transitionRun(next, command, definition, catalog)).toEqual({ ok: false, reason: 'staleBoundary' });
    for (const changes of [{ newRunId: ended.id }, { newSeed: ended.seed }, { newSeed: -1 }, { newRunId: '' }])
      expect(transitionRun(ended, { ...command, ...changes }, definition, catalog).ok).toBe(false);
    expect(transitionRun(fresh(), { ...command, ...boundary(fresh()) }, definition, catalog)).toEqual({ ok: false, reason: 'wrongPhase' });
    expect(transitionRun(ended, complete(ended, [1, 1, 1]), definition, catalog)).toEqual({ ok: false, reason: 'wrongPhase' });
  });
});
