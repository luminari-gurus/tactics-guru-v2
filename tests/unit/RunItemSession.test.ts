import { assert, expect, it } from 'vitest';
import { RunItemSession } from '../../src/app/RunItemSession';
import { activeSnapshot, preparedSnapshot, rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { createRunStorage } from '../../src/persistence/runStorage';
const unavailable = () => createRunStorage(runContext, () => null);
it('commits claim once, rejects stale review and preserves accepted state after storage failure', () => {
  const s = new RunItemSession(rewardSnapshot(), runContext, unavailable());
  const command = { ...s.boundary(), type: 'claimReward' as const, offerId: s.snapshot.items.offer!.id, itemId: s.snapshot.items.offer!.options[0].itemId };
  expect(s.dispatch(command).ok).toBe(true);
  const after = s.snapshot;
  expect(after.items.run.encounterIndex).toBe(1); expect(after.items.itemRevision).toBe(1);
  expect(s.status).toContain('unsaved');
  expect(s.dispatch(command)).toMatchObject({ ok: false, reason: 'staleBoundary' });
  expect(s.snapshot).toEqual(after);
});
it('rejects invalid targets and active battle changes, and never exposes mutable session state', () => {
  const s = new RunItemSession(preparedSnapshot(), runContext, unavailable());
  s.inspect(); expect(s.status).toContain('needs recovery');
  const before = s.snapshot;
  expect(s.dispatch({ ...s.boundary(), type: 'useItem', itemId: 'item:healing_draught', heroId: 'mage' }).ok).toBe(false);
  expect(s.snapshot).toEqual(before);
  const copy = s.snapshot; (copy.items.ownership.consumables[0] as any).quantity = 99;
  expect(s.snapshot).toEqual(before);
  const active = new RunItemSession(activeSnapshot(), runContext, unavailable());
  expect(active.dispatch({ ...active.boundary(), type: 'useItem', itemId: 'item:healing_draught', heroId: 'fighter' })).toMatchObject({ ok: false, reason: 'wrongContext' });
});
it('uses once and restores a reviewed saved boundary without mutating RNG', () => {
  const data = new Map<string, string>();
  const storage = createRunStorage(runContext, () => ({ getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); }, removeItem: k => { data.delete(k); } }));
  const s = new RunItemSession(preparedSnapshot(), runContext, storage);
  const use = { ...s.boundary(), type: 'useItem' as const, itemId: 'item:healing_draught' as const, heroId: 'fighter' as const };
  const result = s.dispatch(use); assert(result.ok); const after = s.snapshot;
  (result.state.ownership.consumables[0] as any).quantity = 9;
  expect(s.snapshot).toEqual(after);
  expect(after.items.ownership.consumables[0].quantity).toBe(1);
  expect(after.items.run.party[0].hp).toBe(10);
  const restored = new RunItemSession(rewardSnapshot(), runContext, storage);
  const review = restored.inspect(); assert(review.ok);
  expect(restored.continue(structuredClone(review))).toBe(false);
  expect(restored.continue(review)).toBe(true); expect(restored.snapshot).toEqual(after);
  expect(restored.continue(review)).toBe(false);
  expect(restored.dispatch(use).ok).toBe(false); expect(restored.snapshot).toEqual(after);
});
