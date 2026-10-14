import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { itemCatalog } from '../../src/content/items';
import type { ItemCatalog, ItemId } from '../../src/content/itemTypes';
import { validateItems } from '../../src/content/validateItems';
import { authoredRun, runCatalog } from '../../src/content/encounters';
import { createRun, runBoundaryId, transitionRun, type RunState, type RunResult } from '../../src/domain/run';
import { createRewardOffer, itemCatalogIdentity, readRewardOffer, REWARD_POLICY } from '../../src/domain/rewards';

function accepted(result: ReturnType<typeof createRun> | RunResult): RunState {
  if (!result.ok) throw Error(result.reason); return result.state;
}
const fresh = (seed = 123) => accepted(createRun('attempt-1', seed, authoredRun, runCatalog));
const boundary = (s: RunState) => ({ runId: s.id, revision: s.revision, encounterId: s.encounters[s.encounterIndex], boundaryId: runBoundaryId(s) });
const apply = (s: RunState, command: unknown) => accepted(transitionRun(s, command, authoredRun, runCatalog));
const victory = (s: RunState) => apply(s, { ...boundary(s), type: 'completeBattle', outcome: 'victory', party: s.party });
const advance = (s: RunState) => apply(s, { ...boundary(s), type: 'acknowledgeReward' });
const reward = (seed = 123) => victory(fresh(seed));

/** Independent BigInt sfc32 recurrence and integer selection; no production RNG helpers. */
function oracle(seed: number, ids: string[]): string[] {
  const mask = 0xffffffffn;
  let a = 0n, b = BigInt(seed), c = 0n, d = 1n;
  const remaining = [...ids].sort(), choices: string[] = [];
  for (let i = 0; i < 14; i++) {
    const value = (a + b + d) & mask;
    a = (b ^ (b >> 9n)) & mask; b = (c * 9n) & mask;
    c = (((c << 21n) | (c >> 11n)) + value) & mask; d = (d + 1n) & mask;
    if (i >= 12) choices.push(remaining.splice(Number(value * BigInt(remaining.length) / 0x100000000n), 1)[0]);
  }
  return choices;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value;
}

it('offers only at the two reward boundaries, with independently pinned seeds/options', () => {
  const first = reward(), second = victory(advance(first)), terminal = victory(advance(second));
  expect(createRewardOffer(fresh(), itemCatalog)).toBeNull();
  expect(createRewardOffer(terminal, itemCatalog)).toBeNull();
  const defeat = apply(fresh(), { ...boundary(fresh()), type: 'completeBattle', outcome: 'defeat', party: fresh().party.map(h => ({ ...h, hp: 0 })) });
  expect(createRewardOffer(defeat, itemCatalog)).toBeNull();
  for (const [state, index, seed] of [[first, 0, 1746306032], [second, 1, 2025501471]] as const) {
    const offer = createRewardOffer(state, itemCatalog)!;
    expect(offer).toEqual({ version: 1, id: `attempt-1:reward:${index}`, seed,
      catalogIdentity: itemCatalogIdentity(itemCatalog), options: [
        { itemId: 'item:aiming_charm', quantity: 1 }, { itemId: 'item:warding_charm', quantity: 1 },
      ] });
    expect(offer.options.map(o => o.itemId)).toEqual(oracle(seed, Object.keys(itemCatalog)));
  }
});

it('agrees with independent selection across seeds and returns catalog-derived labels', () => {
  const observed = new Set<ItemId>();
  for (const seed of [0, 1, 2, 3, 4, 5, 6, 123, 0xffffffff]) {
    const state = reward(seed), offer = createRewardOffer(state, itemCatalog)!;
    expect(offer.options.map(o => o.itemId)).toEqual(oracle(state.pendingReward!.seed, Object.keys(itemCatalog)));
    expect(new Set(offer.options.map(o => o.itemId)).size).toBe(2);
    offer.options.forEach(o => { observed.add(o.itemId); expect(itemCatalog[o.itemId].label).toBeTruthy(); });
  }
  expect(observed.size).toBe(3);
});

it('uses canonical catalog/policy identity verified with Node SHA256', () => {
  const sorted = (value: any): any => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, sorted(value[k])])) : value;
  const hash = 'sha256:' + createHash('sha256').update(JSON.stringify(sorted({ catalog: itemCatalog, policy: REWARD_POLICY }))).digest('hex');
  expect(itemCatalogIdentity(itemCatalog)).toBe(hash);
  const reordered = Object.fromEntries(Object.entries(itemCatalog).reverse()) as ItemCatalog;
  expect(createRewardOffer(reward(), reordered)).toEqual(createRewardOffer(reward(), itemCatalog));
  expect(itemCatalogIdentity({ ...itemCatalog, 'item:healing_draught': { ...itemCatalog['item:healing_draught'], label: 'New label' } })).not.toBe(hash);
});

it('adds a fourth fixture item without ID-specific generation or labels', () => {
  const checked = validateItems({ ...itemCatalog, 'item:fixture': { id: 'item:fixture', label: 'Fixture Tonic',
    kind: 'consumable', context: 'betweenEncounters', eligibleHeroes: ['mage'], effect: { kind: 'restoreHp', amount: 2 } } });
  if (!checked.ok) throw Error('invalid fixture');
  let seen = false;
  for (let seed = 0; seed < 16; seed++) {
    const state = reward(seed), offer = createRewardOffer(state, checked.catalog)!;
    expect(offer.options.map(o => o.itemId)).toEqual(oracle(state.pendingReward!.seed, Object.keys(checked.catalog)));
    for (const option of offer.options) if (option.itemId === 'item:fixture') {
      expect(checked.catalog[option.itemId].label).toBe('Fixture Tonic'); seen = true;
    }
  }
  expect(seen).toBe(true);
  const one = validateItems({ 'item:fixture': checked.catalog['item:fixture'] });
  if (!one.ok) throw Error('invalid single definition');
  expect(createRewardOffer(reward(), one.catalog)).toBeNull();
});

it('round-trips owned offers without changing frozen inputs or RNG boundaries', () => {
  const state = freeze(reward()), catalog = freeze(structuredClone(itemCatalog));
  const before = JSON.stringify({ state, catalog }), offer = freeze(createRewardOffer(state, catalog)!);
  for (let i = 0; i < 3; i++) {
    expect(createRewardOffer(state, catalog)).toEqual(offer);
    const restored = readRewardOffer(JSON.parse(JSON.stringify(offer)), state, catalog);
    expect(restored).toEqual({ ok: true, offer });
    if (restored.ok) { expect(restored.offer).not.toBe(offer); expect(restored.offer.options[0]).not.toBe(offer.options[0]); }
  }
  expect(JSON.stringify({ state, catalog })).toBe(before);
});

it('rejects altered, incompatible and stale stored offers', () => {
  const state = reward(), original = createRewardOffer(state, itemCatalog)!;
  const mutations: ((v: any) => void)[] = [
    v => { v.version = 2; }, v => { v.id = 'attempt-2:reward:0'; }, v => { v.seed++; },
    v => { v.catalogIdentity = 'sha256:bad'; }, v => { v.extra = true; },
    v => { v.options.reverse(); }, v => { v.options.pop(); }, v => { v.options.push(v.options[0]); },
    v => { v.options[1] = v.options[0]; }, v => { v.options[0].itemId = 'item:missing'; },
    v => { v.options[0].quantity = 2; }, v => { v.options[0].extra = 1; },
    v => { v.options = Array(2); }, v => { v.seed = NaN; },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(original); mutate(input);
    expect(readRewardOffer(input, state, itemCatalog)).toEqual({ ok: false, reason: 'invalidOffer' });
  }
  for (const input of [null, [], {}, Object.create(null)]) expect(readRewardOffer(input, state, itemCatalog).ok).toBe(false);
  expect(readRewardOffer(original, advance(state), itemCatalog).ok).toBe(false);
  expect(readRewardOffer(original, victory(advance(state)), itemCatalog).ok).toBe(false);
});

it('rejects offer accessors/hidden fields/symbols without evaluating them', () => {
  for (const where of ['offer', 'options', 'option']) for (const decoration of ['accessor', 'hidden', 'symbol']) {
    const offer = structuredClone(createRewardOffer(reward(), itemCatalog)!) as any;
    const object = where === 'offer' ? offer : where === 'options' ? offer.options : offer.options[0];
    const field = where === 'offer' ? 'id' : where === 'options' ? '0' : 'itemId';
    if (decoration === 'accessor') Object.defineProperty(object, field, { enumerable: true, get() { throw Error('getter evaluated'); } });
    if (decoration === 'hidden') Object.defineProperty(object, 'extra', { value: 1 });
    if (decoration === 'symbol') object[Symbol('extra')] = 1;
    expect(readRewardOffer(offer, reward(), itemCatalog).ok).toBe(false);
  }
});
