import { assert, describe, expect, it, vi } from 'vitest';
import type { ContentCatalog, MapRecord } from '../../src/content/types';
import { RULE_BOUNDS } from '../../src/domain/constants';
import { createBattle, endTurn } from '../../src/domain/turns';
import type { BattleState } from '../../src/domain/types';
import { turnQueue } from '../../src/ui/turnQueue';
import { catalogFixture } from './fixtures/contentContract';

const map = {
  id: 'map:turn_queue_fixture', width: 5, height: 1,
  cells: Array.from({ length: 5 }, (_, x) => ({ x, y: 0, elevation: 0, terrainId: 'grass' as const })),
  spawns: [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 7, side: 'enemies', unitId: 'goblin_grunt', x: 2, y: 0 },
    { id: 8, side: 'enemies', unitId: 'goblin_grunt', x: 3, y: 0 },
    { id: 9, side: 'enemies', unitId: 'goblin_archer', x: 4, y: 0 },
  ],
} as const satisfies MapRecord;
const catalog: ContentCatalog = { ...catalogFixture, maps: { [map.id]: map } };

function snapshot(activeIndex = 0, defeated: readonly number[] = []): BattleState {
  const result = createBattle(map.id, 7, catalog); assert(result.ok);
  return { ...result.state, initiative: [7, 2, 9, 1, 8], activeIndex, round: 4, commandCount: 19,
    units: result.state.units.map(unit => defeated.includes(unit.id) ? { ...unit, hp: 0 } : unit) };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function summary(state: BattleState) {
  return turnQueue(state).map(entry => entry.kind === 'round' ? `Round ${entry.round}` :
    `${entry.current ? 'Now' : 'Next'} ${entry.unit.id} (${entry.round})`);
}

describe('read-only turn queue', () => {
  it('uses initiative rather than unit/portrait order and keeps duplicate enemy definitions distinct', () => {
    const state = snapshot();
    expect(state.units.map(unit => unit.id)).toEqual([1, 2, 7, 8, 9]);
    expect(summary(state)).toEqual(['Now 7 (4)', 'Next 2 (4)', 'Next 9 (4)', 'Next 1 (4)', 'Next 8 (4)', 'Round 5']);
    const grunts = turnQueue(state).filter(entry => entry.kind === 'unit' && entry.unit.defId === 'goblin_grunt');
    expect(grunts).toHaveLength(2);
  });

  it('marks the round boundary when the current actor is in the middle or last in initiative', () => {
    expect(summary(snapshot(2))).toEqual(['Now 9 (4)', 'Next 1 (4)', 'Next 8 (4)', 'Round 5', 'Next 7 (5)', 'Next 2 (5)']);
    expect(summary(snapshot(4))).toEqual(['Now 8 (4)', 'Round 5', 'Next 7 (5)', 'Next 2 (5)', 'Next 9 (5)', 'Next 1 (5)']);
  });

  it('excludes defeated actors on both sides of the boundary without hiding the boundary itself', () => {
    expect(summary(snapshot(3, [7, 9]))).toEqual(['Now 1 (4)', 'Next 8 (4)', 'Round 5', 'Next 2 (5)']);
    expect(summary(snapshot(2, [7, 2, 8]))).toEqual(['Now 9 (4)', 'Next 1 (4)', 'Round 5']);
    expect(summary(snapshot(0, [9, 8]))).toEqual(['Now 7 (4)', 'Next 2 (4)', 'Next 1 (4)', 'Round 5']);
  });

  it('matches legal endTurn progression for each living starting actor, including skipped units at wrap', () => {
    for (const defeated of [[], [7], [9, 8], [7, 2, 8]]) {
      for (let index = 0; index < 5; index++) {
        let state = snapshot(index, defeated);
        if (defeated.includes(state.initiative[index])) continue;
        const entries = turnQueue(state).filter(entry => entry.kind === 'unit');
        for (const entry of entries) {
          expect({ id: state.initiative[state.activeIndex], round: state.round }).toEqual({ id: entry.unit.id, round: entry.round });
          const result = endTurn(state, { type: 'endTurn', unitId: entry.unit.id }, catalog);
          assert(result.ok, JSON.stringify(result)); state = result.state;
        }
      }
    }
  });

  it('does not mutate the snapshot, advance RNG, consult entropy, or change repeated projections', () => {
    const state = freeze(snapshot(3, [9]));
    const before = JSON.stringify(state);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      const first = turnQueue(state);
      expect(turnQueue(state)).toEqual(first);
      expect(JSON.stringify(state)).toBe(before);
      for (const entry of first) if (entry.kind === 'unit') expect(entry.unit).toBe(state.units.find(unit => unit.id === entry.unit.id));
    } finally { vi.restoreAllMocks(); }
  });

  it('stops forecasting when battle is complete', () => {
    for (const outcome of ['playerWin', 'playerLoss'] as const) {
      const defeated = outcome === 'playerWin' ? [7, 8, 9] : [1, 2];
      expect(turnQueue({ ...snapshot(0, defeated), outcome })).toEqual([]);
    }
  });

  it('does not invent a next round or actors beyond the domain round limit', () => {
    const state = { ...snapshot(3, [8]), round: RULE_BOUNDS.round.max };
    expect(summary(state)).toEqual([`Now 1 (${RULE_BOUNDS.round.max})`]);
    expect(endTurn(state, { type: 'endTurn', unitId: 1 }, catalog)).toEqual({ ok: false, reason: 'invalidState' });
    const first = turnQueue({ ...snapshot(), round: RULE_BOUNDS.round.max });
    expect(first).toHaveLength(5);
    expect(first.every(entry => entry.kind === 'unit' && entry.round === RULE_BOUNDS.round.max)).toBe(true);
  });
});
