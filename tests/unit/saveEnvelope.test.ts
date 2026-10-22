import { combatStats } from '../../src/domain/effects';
import { createHash } from 'node:crypto';
import { assert, beforeAll, describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';
import type { ContentCatalog, MapRecord } from '../../src/content/types';
import { validateContent } from '../../src/content/validate';
import { planEnemyTurn } from '../../src/domain/ai';
import { contentVersion, readReplay } from '../../src/domain/battle';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { RNG_WARMUP_DRAWS, RULE_BOUNDS, UINT32_RANGE } from '../../src/domain/constants';
import { nextUint32 } from '../../src/domain/rng';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import { decodeBattleSave, encodeBattleSave, SAVE_KIND, SAVE_MAX_CODE_UNITS, SAVE_MAX_MAP_ID_CODE_UNITS } from '../../src/domain/saveEnvelope';
import type { BattleState } from '../../src/domain/types';
import { playerDecision } from '../helpers/battlePolicy';
import { saveFixtures, type SaveFixture } from '../helpers/saveFixtures';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
let fixtures: SaveFixture[];
beforeAll(() => { fixtures = saveFixtures(); }, 15_000);
function encoded(state = fixtures[0].state, catalog = fixtures[0].catalog): string {
  const result = encodeBattleSave(state, catalog); assert(result.ok); return result.text;
}
const wrap = (payload: unknown) => {
  const body = { kind: SAVE_KIND, format: 1, payload };
  return JSON.stringify({ ...body, digest: hashJson(body) });
};

describe('accepted snapshot boundaries', () => {
  it.each([1, 2, 3, 4, 5])('matches the uninterrupted queued continuation at every boundary: seed %i', seed => {
    const session = new BattleSession(battleCatalog, 'map:forest_ruins', seed);
    let restored = decodeBattleSave(encoded(session.state, battleCatalog), battleCatalog); assert(restored.ok);
    let postAttackBoundary = false;
    for (let i = 0; session.phase !== 'ended' && i < 300; i++) {
      const state = restored.state;
      const actor = state.units.find(u => u.id === state.initiative[state.activeIndex])!;
      const plan = actor.side === 'enemy' ? planEnemyTurn(state, actor.id, battleCatalog) : null;
      if (plan) assert(plan.ok);
      const command = plan?.ok ? plan.commands[0] : playerDecision(state);
      if (seed === 2 && state.commandCount === 29) {
        postAttackBoundary = true;
        expect(actor).toMatchObject({ id: 5, cell: { x: 3, y: 4 }, hasActed: true, hasMoved: false });
        expect(command).toEqual({ type: 'endTurn', unitId: 5 });
      }
      // Select the original session's command independently; its existing queue is the oracle.
      if (session.phase === 'player') expect(session.prepare(playerDecision(session.state)).ok).toBe(true);
      const step = session.phase === 'player' ? session.confirm() : session.nextEnemy(); assert(step);
      expect(command).toEqual(session.replay!.commands.at(-1));
      expect(dispatch(state, command, battleCatalog)).toEqual({ ok: true, state: step.after, events: step.events });
      expect(session.phase).toBe('presenting');
      restored = decodeBattleSave(encoded(session.state, battleCatalog), battleCatalog); assert(restored.ok);
      expect(restored.state).toEqual(step.after);
      expect(nextUint32(restored.state.rng)).toEqual(nextUint32(step.after.rng));
      session.finishPresentation(step.token);
    }
    expect(session.phase).toBe('ended');
    if (seed === 2) expect(postAttackBoundary).toBe(true);
  });

  for (const name of ['start-1', 'start-2', 'player-presenting', 'enemy-presenting', 'guarded-presenting', 'playerWin', 'playerLoss', 'maximum-commands']) {
    it(`preserves state, next command/events, RNG and enemy decisions: ${name}`, () => {
      const fixture = fixtures.find(f => f.name === name)!;
      const { state, catalog } = fixture;
      const result = decodeBattleSave(encoded(state, catalog), catalog); assert(result.ok);
      expect(result.state).toEqual(state);
      expect(result.state).not.toBe(state);
      expect(result.state.units).not.toBe(state.units);
      expect(nextUint32(result.state.rng)).toEqual(nextUint32(state.rng));
      const actor = state.units.find(u => u.id === state.initiative[state.activeIndex])!;
      const enemy = planEnemyTurn(state, actor.id, catalog);
      expect(planEnemyTurn(result.state, actor.id, catalog)).toEqual(enemy);
      const stopped = state.outcome !== 'ongoing' || state.commandCount === RULE_BOUNDS.commandCount.max;
      const command = stopped ? { type: 'endTurn' as const, unitId: actor.id }
        : enemy.ok ? enemy.commands[0] : playerDecision(state);
      const next = dispatch(state, command, catalog);
      expect(dispatch(result.state, command, catalog)).toEqual(next);
      if (stopped) expect(next).toEqual({ ok: false, reason: state.outcome !== 'ongoing' ? 'battleOver' : 'commandLimit' });
      else expect(next.ok).toBe(true);
    });
  }

  it('captures committed presentation state and excludes pending, rejected and cancelled previews', () => {
    const session = new BattleSession(battleCatalog, 'map:forest_ruins', 2);
    while (session.phase === 'enemy') {
      const step = session.nextEnemy(); assert(step); session.finishPresentation(step.token);
    }
    const before = encoded(session.state, battleCatalog);
    expect(session.prepare({ type: 'move', unitId: session.active.id, to: { x: -1, y: -1 } }).ok).toBe(false);
    expect(encoded(session.state, battleCatalog)).toBe(before);
    const command = playerDecision(session.state);
    expect(session.prepare(command).ok).toBe(true);
    expect(session.pending).not.toBeNull();
    expect(encoded(session.state, battleCatalog)).toBe(before);
    session.cancel(); expect(encoded(session.state, battleCatalog)).toBe(before);
    session.prepare(command);
    const step = session.confirm(); assert(step);
    expect(session.phase).toBe('presenting');
    const text = encoded(session.state, battleCatalog);
    expect(decodeBattleSave(text, battleCatalog)).toEqual({ ok: true, state: step.after });
    expect(text).not.toBe(before);
    expect(text).not.toMatch(/pending|phase|token|events|enemyQueue|audio|callback/);
    expect(encodeBattleSave(session, battleCatalog)).toEqual({ ok: false, reason: 'invalidState' });
    session.finishPresentation(step.token);
    expect(encoded(session.state, battleCatalog)).toBe(text);
  });

  it('has canonical output and an independent SHA-256 oracle over every covered field', () => {
    const text = encoded();
    const { digest, ...body } = JSON.parse(text);
    expect(digest).toBe('sha256:' + createHash('sha256').update(canonical(body), 'utf8').digest('hex'));
    const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key, v]) => [key, reorder(v)])) : value;
    const decoded = decodeBattleSave(JSON.stringify(reorder(JSON.parse(text)), null, 2), battleCatalog);
    assert(decoded.ok); expect(encoded(decoded.state, battleCatalog)).toBe(text);
  });
});

describe('untrusted serialized input', () => {
  const invalid = (text: string, reason: string) => expect(decodeBattleSave(text, battleCatalog)).toEqual({ ok: false, reason });
  it('bounds text before parsing and handles malformed JSON/envelopes without throwing', () => {
    invalid('['.repeat(SAVE_MAX_CODE_UNITS + 1), 'tooLarge');
    for (const text of ['', '{', 'undefined']) invalid(text, 'invalidJson');
    for (const value of [null, [], 42, {}, { kind: SAVE_KIND }]) invalid(JSON.stringify(value), 'invalidEnvelope');
    const object = JSON.parse(encoded());
    invalid(JSON.stringify({ ...object, extra: true }), 'invalidEnvelope');
    invalid(JSON.stringify({ ...object, digest: 'sha256:abc' }), 'invalidEnvelope');
    invalid(encoded().replace('"commandCount":0', '"commandCount":1e309'), 'invalidState');
    // Fixed shape validation rejects deep unknown data without recursively hashing it.
    invalid('{"kind":"' + SAVE_KIND + '","format":1,"digest":"sha256:' + '0'.repeat(64) + '","payload":' + '['.repeat(4000) + '0' + ']'.repeat(4000) + '}', 'invalidState');
    const text = encoded();
    expect(decodeBattleSave(text.padEnd(SAVE_MAX_CODE_UNITS, ' '), battleCatalog).ok).toBe(true);
    invalid(text.padEnd(SAVE_MAX_CODE_UNITS + 1, ' '), 'tooLarge');
  });

  it('rejects unsafe numbers, unknown IDs, extra fields, bounds and state invariants even with a fresh digest', () => {
    const original = fixtures[0].state;
    const payloads = [
      { ...original, commandCount: 10_001 }, { ...original, round: 0 },
      { ...original, seed: -1 }, { ...original, mapId: 'map:unknown' },
      { ...original, outcome: 'playerWin' }, { ...original, activeIndex: original.units.length },
      { ...original, rng: { ...original.rng, cursor: original.rng.cursor + 1 } },
      { ...original, initiative: original.initiative.map(() => original.initiative[0]) },
      { ...original, units: Array.from({ length: 65 }, () => original.units[0]) },
      { ...original, units: original.units.map((u, i) => i ? u : { ...u, hp: 101 }) },
      { ...original, units: original.units.map((u, i) => i ? u : { ...u, defId: 'unknown' }) },
      { ...original, units: original.units.map((u, i) => i ? u : { ...u, cell: { x: 32, y: 0 } }) },
      { ...original, units: original.units.map((u, i) => i === 1 ? { ...u, cell: original.units[0].cell } : u) },
      { ...original, units: original.units.map((u, i) => i ? u : { ...u, guarded: false }) },
      { ...original, pending: {} },
    ];
    for (const payload of payloads) {
      invalid(wrap(payload), 'invalidState');
      expect(encodeBattleSave(payload, battleCatalog)).toEqual({ ok: false, reason: 'invalidState' });
    }
    // The production hash deliberately refuses unsafe numbers, so retain the old digest here.
    const envelope = JSON.parse(encoded());
    for (const value of [Number.MAX_SAFE_INTEGER + 1, 1.5, null]) {
      envelope.payload.round = value; invalid(JSON.stringify(envelope), 'invalidState');
    }
  });

  it('rejects corrupt covered values and incompatible format/state/rules/RNG/content identities', () => {
    const envelope = JSON.parse(encoded());
    invalid(JSON.stringify({ ...envelope, payload: { ...envelope.payload, commandCount: 1 } }), 'corrupt');
    invalid(JSON.stringify({ ...envelope, digest: 'sha256:' + '0'.repeat(64) }), 'corrupt');
    for (const format of [0, 2, '1']) invalid(JSON.stringify({ ...envelope, format }), 'incompatible');
    invalid(JSON.stringify({ ...envelope, kind: 'tactics-guru:battle-replay' }), 'incompatible');
    invalid(wrap({ ...envelope.payload, format: 2 }), 'incompatible');
    for (const [key, value] of [['rules', 1], ['rng', 2], ['content', 'sha256:' + '0'.repeat(64)]]) {
      invalid(wrap({ ...envelope.payload, versions: { ...envelope.payload.versions, [key]: value } }), 'incompatible');
    }
    const changed: ContentCatalog = { ...battleCatalog, heroes: { ...battleCatalog.heroes,
      fighter: { ...battleCatalog.heroes.fighter, stats: { ...battleCatalog.heroes.fighter.stats, maxHp: 19 } } } };
    expect(validateContent(changed).ok).toBe(true);
    expect(decodeBattleSave(encoded(), changed)).toEqual({ ok: false, reason: 'incompatible' });
    // Presentation asset changes are deliberately outside rules/content identity.
    const [assetId, asset] = Object.entries(battleCatalog.assets)[0];
    const artOnly: ContentCatalog = { ...battleCatalog, assets: { ...battleCatalog.assets,
      [assetId]: { ...asset, provenance: { ...asset.provenance, prompt: 'Presentation-only provenance revision' } } } };
    expect(validateContent(artOnly).ok).toBe(true);
    expect(contentVersion(artOnly)).toBe(contentVersion(battleCatalog));
    expect(decodeBattleSave(encoded(), artOnly).ok).toBe(true);
  });

  it('preserves frozen inputs and original text on both success and failure', () => {
    const catalog = freeze(structuredClone(battleCatalog));
    const state = freeze(structuredClone(fixtures[0].state));
    const before = JSON.stringify({ catalog, state });
    const text = encoded(state, catalog);
    expect(decodeBattleSave(text, catalog).ok).toBe(true);
    const badText = text.replace('"commandCount":0', '"commandCount":1');
    const retained = badText;
    expect(decodeBattleSave(badText, catalog)).toEqual({ ok: false, reason: 'corrupt' });
    expect(badText).toBe(retained);
    expect(JSON.stringify({ catalog, state })).toBe(before);
    const getterState = { ...state };
    Object.defineProperty(getterState, 'units', { enumerable: true, get() { throw Error('Getter executed'); } });
    expect(encodeBattleSave(getterState, catalog)).toEqual({ ok: false, reason: 'invalidState' });
  });

  it('requires semantic replay validation in the comparison and never accepts replay as a snapshot', () => {
    const replay = fixtures[0].replay;
    const wrongActor = replay.initial.units.find(u => u.id !== replay.initial.initiative[0])!.id;
    const illegal = { ...replay, commands: [{ type: 'endTurn', unitId: wrongActor }] };
    expect(readReplay(illegal, battleCatalog).ok).toBe(true);
    expect(replayBattle(illegal, battleCatalog)).toEqual({ ok: false, reason: 'invalidReplay', index: 0, rejection: 'notActiveUnit' });
    invalid(wrap(illegal), 'invalidState');
    invalid(wrap(replay), 'invalidState');
  });
});

it('supports the documented 64-unit/128-ID/numeric limits within the cap', () => {
  const map: MapRecord = { id: `map:${'a'.repeat(SAVE_MAX_MAP_ID_CODE_UNITS - 4)}`, width: 32, height: 32,
    cells: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elevation: 0, terrainId: 'grass' })),
    spawns: Array.from({ length: 64 }, (_, i) => i < 32
      ? { id: i + 1, side: 'heroes', unitId: 'fighter', x: i % 32, y: Math.floor(i / 32) }
      : { id: i + 1, side: 'enemies', unitId: 'goblin_grunt', x: i % 32, y: Math.floor(i / 32) }) };
  const content = validateContent({ ...battleCatalog, maps: { [map.id]: map } }); assert(content.ok);
  const created = createBattle(map.id, RULE_BOUNDS.uint32.max, content.catalog); assert(created.ok);
  const cursor = Number.MAX_SAFE_INTEGER;
  const state: BattleState = { ...created.state, round: Number.MAX_SAFE_INTEGER, commandCount: 10_000,
    units: created.state.units.map(u => u.side === 'player' ? { ...u, guarded: true } : u),
    rng: { cursor, words: [0xffffffff, 0xffffffff, 0xffffffff, (cursor % UINT32_RANGE + RNG_WARMUP_DRAWS + 1) % UINT32_RANGE] } };
  const text = encoded(state, content.catalog);
  expect(text.length).toBeLessThan(12 * 1024);
  expect(decodeBattleSave(text, content.catalog)).toEqual({ ok: true, state });
  const longerMap = { ...map, id: `${map.id}a` as const };
  const longerCatalog = { ...content.catalog, maps: { [longerMap.id]: longerMap } };
  const longerState = { ...state, mapId: longerMap.id, versions: { ...state.versions, content: contentVersion(longerCatalog) } };
  expect(encodeBattleSave(longerState, longerCatalog)).toEqual({ ok: false, reason: 'invalidState' });
  expect(decodeBattleSave(wrap(longerState), longerCatalog)).toEqual({ ok: false, reason: 'invalidState' });
});

it('verifies historic defeated Guarded digest without normalizing input and cleans only accepted turns', () => {
  const created = createBattle('map:forest_ruins', 2, battleCatalog); assert(created.ok);
  const state = { ...created.state, activeIndex: created.state.initiative.findIndex(id => id !== 1),
    units: created.state.units.map(u => u.id === 1 ? { ...u, hp: 0, guarded: true as const } : u) };
  const text = encoded(state, battleCatalog), read = decodeBattleSave(text, battleCatalog); assert(read.ok);
  expect(read.state).toEqual(state); expect(encodeBattleSave(read.state, battleCatalog)).toEqual({ ok: true, text });
  expect(combatStats(read.state.units[0], battleCatalog)).toEqual({ accuracy: 4, armorClass: 14 });
  const result = dispatch(read.state, { type: 'endTurn', unitId: read.state.initiative[read.state.activeIndex] }, battleCatalog); assert(result.ok);
  expect(result.state.units[0].guarded).toBeUndefined(); expect(read.state.units[0].guarded).toBe(true);
  for (const field of ['statuses', 'resources']) {
    const invalid = { ...state, units: state.units.map((u, i) => i ? u : { ...u, [field]: [] }) };
    expect(decodeBattleSave(wrap(invalid), battleCatalog)).toEqual({ ok: false, reason: 'invalidState' });
  }
});
