import { assert, describe, expect, it } from 'vitest';
import { authoredRun, runCatalog } from '../../src/content/encounters';
import { itemCatalog } from '../../src/content/items';
import type { ItemCatalog, ItemId, ItemOwnership } from '../../src/content/itemTypes';
import type { ContentCatalog, HeroId } from '../../src/content/types';
import { validateItems } from '../../src/content/validateItems';
import { createRun, describeRunBattle, runBoundaryId, transitionRun, type RunState } from '../../src/domain/run';
import { createRewardOffer } from '../../src/domain/rewards';
import { applyItemCommand, emptyItemOwnership, ITEM_REVISION_BOUNDS, projectItemCatalog, readItemOwnership, readRunItems,
  type ItemContext, type ItemResult, type RunItems } from '../../src/domain/items';
import { createBattle } from '../../src/domain/turns';
import { previewAttack, resolveAttack } from '../../src/domain/combat';
import { nextUint32 } from '../../src/domain/rng';

const potion = 'item:healing_draught' as const, aim = 'item:aiming_charm' as const, ward = 'item:warding_charm' as const;
const instance = (reward = 0, option = 0) => `attempt-1:reward:${reward}:option:${option}`;
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v;
}
function fresh(seed = 123, base = runCatalog): RunState {
  const result = createRun('attempt-1', seed, authoredRun, base); assert(result.ok); return result.state;
}
const boundary = (run: RunState) => ({ runId: run.id, revision: run.revision, encounterId: run.encounters[run.encounterIndex], boundaryId: runBoundaryId(run) });
function complete(run: RunState, base = runCatalog, hp = 12): RunState {
  const result = transitionRun(run, { ...boundary(run), type: 'completeBattle', outcome: 'victory',
    party: run.party.map(h => ({ ...h, hp: Math.min(hp, h.hp) })) }, authoredRun, base);
  assert(result.ok); return result.state;
}
function reward(seed = 123, items = itemCatalog, base = runCatalog): RunItems {
  const run = complete(fresh(seed, base), base);
  return { run, ownership: emptyItemOwnership(), offer: createRewardOffer(run, items), itemRevision: 0 };
}
function prepared(items = itemCatalog, base = runCatalog): RunItems {
  const initial = reward(123, items, base);
  const result = transitionRun(initial.run, { ...boundary(initial.run), type: 'acknowledgeReward' }, authoredRun, base);
  assert(result.ok); return { ...initial, run: result.state, offer: null };
}
const context = (s: RunItems): ItemContext => ({ runId: s.run.id, encounterId: s.run.encounters[s.run.encounterIndex], boundaryId: runBoundaryId(s.run), activeBattle: false });
const intent = (s: RunItems, fields: object) => ({ ...boundary(s.run), itemRevision: s.itemRevision, ...fields });
const apply = (s: RunItems, fields: object, items = itemCatalog, base = runCatalog) =>
  applyItemCommand(s, intent(s, fields), context(s), authoredRun, base, items);
function accepted(result: ItemResult): RunItems { assert(result.ok, JSON.stringify(result)); return result.state; }
const claim = (s: RunItems, id: ItemId = s.offer!.options[0].itemId, items = itemCatalog, base = runCatalog) =>
  apply(s, { type: 'claimReward', offerId: s.offer!.id, itemId: id }, items, base);
function withOwnership(s = prepared()): RunItems {
  return { ...s, ownership: { consumables: [{ itemId: potion, quantity: 2 }], equipment: [
    { instanceId: instance(), itemId: ward }, { instanceId: instance(1), itemId: aim }], assignments: [] } };
}
const use = { type: 'useItem', itemId: potion, heroId: 'fighter' };
const equip = (id = instance(), heroId: HeroId = 'fighter', type = 'equipItem') => ({ type, instanceId: id, heroId, slot: 'charm' });

describe('strict owned data and aggregate', () => {
  it('reads independent canonical ownership with bounded identities and frozen input', () => {
    const s = freeze(withOwnership()), before = JSON.stringify(s);
    const reversed = { ...s.ownership, equipment: [...s.ownership.equipment].reverse() };
    const owned = readItemOwnership(reversed, s.run.id, itemCatalog); assert(owned.ok);
    expect(owned.ownership).toEqual(s.ownership);
    expect(owned.ownership.equipment[0]).not.toBe(s.ownership.equipment[0]);
    expect(readRunItems(copy(s), authoredRun, runCatalog, itemCatalog)).toEqual({ ok: true, state: s });
    expect(JSON.stringify(s)).toBe(before);
  });

  const invalid: [string, (o: any) => void][] = [
    ['unknown field', o => { o.extra = true; }],
    ['zero stack', o => { o.consumables[0].quantity = 0; }],
    ['stack overflow', o => { o.consumables[0].quantity = 10; }],
    ['unsafe quantity', o => { o.consumables[0].quantity = Number.MAX_SAFE_INTEGER + 1; }],
    ['fractional quantity', o => { o.consumables[0].quantity = 1.5; }],
    ['unknown item', o => { o.consumables[0].itemId = 'item:missing'; }],
    ['wrong stack kind', o => { o.consumables[0].itemId = ward; }],
    ['duplicate stack', o => { o.consumables.push(o.consumables[0]); }],
    ['wrong instance kind', o => { o.equipment[0].itemId = potion; }],
    ['duplicate instance', o => { o.equipment.push(o.equipment[0]); }],
    ['seven instances', o => { o.equipment = Array(7).fill(o.equipment[0]); }],
    ['foreign run', o => { o.equipment[0].instanceId = 'foreign:reward:0:option:0'; }],
    ['invalid ordinal', o => { o.equipment[0].instanceId = instance(0, 2); }],
    ['nonexact instance encoding', o => { o.equipment[0].instanceId += '\n'; }],
    ['unowned assignment', o => { o.assignments.push({ heroId: 'fighter', slot: 'charm', instanceId: instance(1, 1) }); }],
    ['wrong slot', o => { o.assignments.push({ heroId: 'fighter', slot: 'weapon', instanceId: instance() }); }],
    ['unknown hero', o => { o.assignments.push({ heroId: 'rogue', slot: 'charm', instanceId: instance() }); }],
    ['instance assigned twice', o => { o.assignments = ['fighter', 'ranger'].map(heroId => ({ heroId, slot: 'charm', instanceId: instance() })); }],
    ['hero assigned twice', o => { o.assignments = [instance(), instance(1)].map(instanceId => ({ heroId: 'fighter', slot: 'charm', instanceId })); }],
    ['sparse array', o => { o.equipment = Array(2); }],
    ['extended array', o => { o.consumables.extra = 1; }],
  ];
  it.each(invalid)('rejects %s without input mutation', (_name, mutate) => {
    const o = copy(withOwnership().ownership); mutate(o); const before = JSON.stringify(o);
    expect(readItemOwnership(o, 'attempt-1', itemCatalog).ok).toBe(false);
    expect(JSON.stringify(o)).toBe(before);
  });
  it('rejects hidden fields, symbols and accessors without evaluating them', () => {
    for (const place of ['ownership', 'array', 'record']) for (const kind of ['hidden', 'symbol', 'accessor']) {
      const o: any = copy(withOwnership().ownership);
      const value = place === 'ownership' ? o : place === 'array' ? o.equipment : o.equipment[0];
      if (kind === 'hidden') Object.defineProperty(value, 'extra', { value: 1 });
      if (kind === 'symbol') value[Symbol('extra')] = 1;
      if (kind === 'accessor') Object.defineProperty(value, place === 'ownership' ? 'equipment' : place === 'array' ? '0' : 'itemId',
        { enumerable: true, get() { throw Error('getter evaluated'); } });
      expect(readItemOwnership(o, 'attempt-1', itemCatalog).ok).toBe(false);
    }
  });
  it('rejects invalid aggregate revisions, runs and mismatched stored offers', () => {
    for (const value of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(readRunItems({ ...reward(), itemRevision: value }, authoredRun, runCatalog, itemCatalog).ok).toBe(false);
    for (const s of [{ ...reward(), offer: null }, { ...prepared(), offer: reward().offer },
      { ...reward(), run: { ...reward().run, revision: 2 } }, { ...reward(), extra: 1 }])
      expect(readRunItems(s, authoredRun, runCatalog, itemCatalog).ok).toBe(false);
    const tampered = copy(reward()); (tampered.offer as any).options.reverse();
    expect(readRunItems(tampered, authoredRun, runCatalog, itemCatalog).ok).toBe(false);
  });
});

describe('context, stale intents and atomic reward grant', () => {
  it('rejects initial/terminal phases, active battle and mismatched contexts', () => {
    const s = withOwnership(), command = intent(s, use);
    for (const ctx of [null, { ...context(s), activeBattle: true }, { ...context(s), activeBattle: 0 },
      { ...context(s), runId: 'foreign' }, { ...context(s), encounterId: 'encounter:foreign' },
      { ...context(s), boundaryId: 'foreign' }, { ...context(s), extra: 1 }]) {
      const before = JSON.stringify(s);
      expect(applyItemCommand(freeze(s), command, ctx, authoredRun, runCatalog, itemCatalog)).toEqual({ ok: false, reason: 'wrongContext' });
      expect(JSON.stringify(s)).toBe(before);
    }
    let run = fresh();
    for (let i = 0; i < 3; i++) {
      if (i > 0) { const advanced = transitionRun(run, { ...boundary(run), type: 'acknowledgeReward' }, authoredRun, runCatalog); assert(advanced.ok); run = advanced.state; }
      run = complete(run);
    }
    const lost = transitionRun(fresh(), { ...boundary(fresh()), type: 'completeBattle', outcome: 'defeat', party: fresh().party.map(h => ({ ...h, hp: 0 })) }, authoredRun, runCatalog);
    assert(lost.ok);
    for (const r of [fresh(), run, lost.state]) {
      const state = { ...s, run: r };
      expect(apply(state, use)).toEqual({ ok: false, reason: 'wrongContext' });
    }
  });
  it('rejects stale identity/revisions, malformed commands and exhausted item revision', () => {
    const s = freeze(withOwnership()), before = JSON.stringify(s);
    for (const field of ['runId', 'revision', 'encounterId', 'boundaryId', 'itemRevision']) {
      const cmd = { ...intent(s, use), [field]: field.includes('evision') ? 99 : 'foreign' };
      expect(applyItemCommand(s, cmd, context(s), authoredRun, runCatalog, itemCatalog)).toEqual({ ok: false, reason: 'staleBoundary' });
    }
    for (const cmd of [null, { ...intent(s, use), extra: 1 }, intent(s, { ...use, type: 'unknown' })])
      expect(applyItemCommand(s, cmd, context(s), authoredRun, runCatalog, itemCatalog).ok).toBe(false);
    expect(apply({ ...s, itemRevision: ITEM_REVISION_BOUNDS.max }, use)).toEqual({ ok: false, reason: 'revisionLimit' });
    expect(JSON.stringify(s)).toBe(before);
  });
  it('grants equipment once, advances once and has stable option-derived identity', () => {
    const s = freeze(reward()), before = JSON.stringify(s), cmd = intent(s, { type: 'claimReward', offerId: s.offer!.id, itemId: aim });
    const result = applyItemCommand(s, cmd, context(s), authoredRun, runCatalog, itemCatalog); assert(result.ok);
    expect(result.state.ownership).toEqual({ consumables: [], equipment: [{ instanceId: instance(), itemId: aim }], assignments: [] });
    expect(result.state.run).toMatchObject({ phase: 'battle', encounterIndex: 1, revision: 2, seed: s.run.seed, party: s.run.party });
    expect(result.state.offer).toBeNull(); expect(result.state.itemRevision).toBe(1);
    expect(result.events).toEqual([{ type: 'itemClaimed', itemId: aim }, { type: 'encounterReady', encounterId: authoredRun.encounters[1] }]);
    expect(applyItemCommand(result.state, cmd, context(result.state), authoredRun, runCatalog, itemCatalog)).toEqual({ ok: false, reason: 'staleBoundary' });
    expect(claim(copy(s))).toEqual(result); expect(JSON.stringify(s)).toBe(before);
    const restored = readRunItems(copy(result.state), authoredRun, runCatalog, itemCatalog); assert(restored.ok);
    expect(describeRunBattle(restored.state.run)).toEqual(describeRunBattle(result.state.run));
    const a = createBattle('map:forest_ruins', describeRunBattle(result.state.run)!.seed, runCatalog);
    const b = createBattle('map:forest_ruins', describeRunBattle(restored.state.run)!.seed, runCatalog);
    assert(a.ok && b.ok); expect(a).toEqual(b); expect(nextUint32(a.state.rng)).toEqual(nextUint32(b.state.rng));
  });
  it('preserves both sides of a failed grant or stale/invalid offer choice', () => {
    const s = reward();
    for (const fields of [{ type: 'claimReward', offerId: 'foreign', itemId: aim },
      { type: 'claimReward', offerId: s.offer!.id, itemId: potion },
      { type: 'claimReward', offerId: s.offer!.id, itemId: 'item:missing' }]) {
      const before = JSON.stringify(s); expect(apply(freeze(s), fields).ok).toBe(false); expect(JSON.stringify(s)).toBe(before);
    }
    const collision = { ...s, ownership: { ...emptyItemOwnership(), equipment: [{ instanceId: instance(), itemId: ward }] } };
    expect(claim(collision)).toEqual({ ok: false, reason: 'capacity' });
    const overflow = { ...s, ownership: { ...emptyItemOwnership(), equipment: Array(7).fill({ instanceId: instance(), itemId: aim }) } };
    expect(claim(overflow).ok).toBe(false);
    const first = accepted(claim(s, ward));
    expect(first.ownership.equipment[0].instanceId).toBe(instance(0, 1));
    const secondRun = complete(first.run), second = { ...first, run: secondRun, offer: createRewardOffer(secondRun, itemCatalog) };
    const both = accepted(claim(second, ward));
    expect(both.ownership.equipment.map(e => e.instanceId)).toEqual([instance(0, 1), instance(1, 1)]);
    expect(both.run.encounterIndex).toBe(2);
  });
  it('stacks consumable grants and rejects overflow before acknowledgment', () => {
    let s = reward(0);
    for (let seed = 0; !s.offer!.options.some(o => o.itemId === potion); seed++) s = reward(seed);
    const original = { ...s, ownership: { ...emptyItemOwnership(), consumables: [{ itemId: potion, quantity: 8 }] } };
    const granted = accepted(claim(freeze(original), potion));
    expect(granted.ownership.consumables).toEqual([{ itemId: potion, quantity: 9 }]);
    const full = { ...s, ownership: granted.ownership }, before = JSON.stringify(full);
    expect(claim(freeze(full), potion)).toEqual({ ok: false, reason: 'capacity' }); expect(JSON.stringify(full)).toBe(before);
  });
});

describe('healing and equipment operations', () => {
  it('heals at reward and encounter preparation, caps HP and consumes exactly once', () => {
    for (const runState of [reward(), prepared()]) {
      const s = freeze(withOwnership(runState)), before = JSON.stringify(s);
      const cmd = intent(s, use), result = applyItemCommand(s, cmd, context(s), authoredRun, runCatalog, itemCatalog);
      const next = accepted(result);
      expect(next.run.party[0].hp).toBe(18); expect(next.run.revision).toBe(s.run.revision);
      expect(next.ownership.consumables).toEqual([{ itemId: potion, quantity: 1 }]); expect(next.itemRevision).toBe(1);
      expect(next.offer).toEqual(s.offer); expect(next.run.seed).toBe(s.run.seed);
      expect(applyItemCommand(next, cmd, context(next), authoredRun, runCatalog, itemCatalog)).toEqual({ ok: false, reason: 'staleBoundary' });
      expect(JSON.stringify(s)).toBe(before);
    }
    const s = withOwnership();
    const almost = { ...s, run: { ...s.run, party: s.run.party.map(h => h.heroId === 'fighter' ? { ...h, hp: 16 } : h) },
      ownership: { ...s.ownership, consumables: [{ itemId: potion, quantity: 1 }] } };
    const next = accepted(apply(almost, use)); expect(next.run.party[0].hp).toBe(18); expect(next.ownership.consumables).toEqual([]);
    const badlyHurt = { ...s, run: { ...s.run, party: s.run.party.map(h => h.heroId === 'fighter' ? { ...h, hp: 1 } : h) } };
    const oldIntent = intent(badlyHurt, use), healed = accepted(apply(badlyHurt, use));
    expect(healed.run.party[0].hp).toBe(7);
    expect(applyItemCommand(healed, oldIntent, context(healed), authoredRun, runCatalog, itemCatalog)).toEqual({ ok: false, reason: 'staleBoundary' });
    expect(accepted(apply(healed, use)).run.party[0].hp).toBe(13); // fresh revision can use the second owned unit
  });
  it('rejects full-health, defeated, unknown, unowned and wrong-category targets atomically', () => {
    const s = withOwnership();
    for (const hp of [0, 18]) {
      const input = { ...s, run: { ...s.run, party: s.run.party.map(h => h.heroId === 'fighter' ? { ...h, hp } : h) } };
      const before = JSON.stringify(input); expect(apply(freeze(input), use).ok).toBe(false); expect(JSON.stringify(input)).toBe(before);
    }
    for (const fields of [{ ...use, heroId: 'rogue' }, { ...use, itemId: ward }, { ...use, itemId: 'item:missing' }]) expect(apply(s, fields).ok).toBe(false);
    expect(apply({ ...s, ownership: emptyItemOwnership() }, use)).toEqual({ ok: false, reason: 'notOwned' });
  });
  it('replaces and unequips without losing instances or sharing one across heroes', () => {
    const s = freeze(withOwnership()), before = JSON.stringify(s);
    const first = accepted(apply(s, equip()));
    expect(first.ownership.assignments).toEqual([{ heroId: 'fighter', slot: 'charm', instanceId: instance() }]);
    expect(apply(first, equip(instance(), 'ranger')).ok).toBe(false);
    expect(apply(first, equip()).ok).toBe(false);
    expect(apply(first, equip(instance(), 'ranger', 'unequipItem')).ok).toBe(false);
    const replaced = accepted(apply(first, equip(instance(1))));
    expect(replaced.ownership.equipment).toEqual(s.ownership.equipment);
    expect(replaced.ownership.assignments).toEqual([{ heroId: 'fighter', slot: 'charm', instanceId: instance(1) }]);
    expect(apply(replaced, equip(instance(), 'fighter', 'unequipItem')).ok).toBe(false);
    const cmd = intent(replaced, equip(instance(1), 'fighter', 'unequipItem'));
    const removed = accepted(applyItemCommand(replaced, cmd, context(replaced), authoredRun, runCatalog, itemCatalog));
    expect(removed.ownership.assignments).toEqual([]); expect(removed.ownership.equipment).toEqual(s.ownership.equipment);
    expect(applyItemCommand(removed, cmd, context(removed), authoredRun, runCatalog, itemCatalog).ok).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('rejects unowned/incompatible equipment and retains defeated assignments without changes', () => {
    const s = accepted(apply(withOwnership(), equip()));
    for (const fields of [equip('missing'), { ...equip(instance(1)), slot: 'weapon' }]) expect(apply(s, fields).ok).toBe(false);
    const dead = { ...s, run: { ...s.run, party: s.run.party.map(h => h.heroId === 'fighter' ? { ...h, hp: 0 } : h) } };
    expect(readRunItems(dead, authoredRun, runCatalog, itemCatalog)).toEqual({ ok: true, state: dead });
    for (const fields of [equip(instance(1)), equip(instance(), 'fighter', 'unequipItem')]) expect(apply(dead, fields).ok).toBe(false);
    const projected = projectItemCatalog(dead, authoredRun, runCatalog, itemCatalog); assert(projected.ok);
    expect(projected.catalog.heroes.fighter.stats).toEqual(runCatalog.heroes.fighter.stats);
  });
});

describe('generic effects and real domain battle composition', () => {
  function battleBase(): ContentCatalog {
    return { ...runCatalog, maps: { ...runCatalog.maps, 'map:item_fixture': { id: 'map:item_fixture', width: 2, height: 1,
      cells: [0, 1].map(x => ({ x, y: 0, elevation: 0, terrainId: 'grass' })), spawns: [
        { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 }, { id: 2, side: 'enemies', unitId: 'goblin_grunt', x: 1, y: 0 }] } } };
  }
  it('projects once from base across construction, replacement, unequip and JSON restoration', () => {
    const base = freeze(battleBase()), before = JSON.stringify(base);
    const s = withOwnership(prepared(itemCatalog, base));
    const warded = accepted(apply(s, equip(), itemCatalog, base));
    for (const state of [warded, copy(warded)]) for (let i = 0; i < 3; i++) {
      const projected = projectItemCatalog(state, authoredRun, base, itemCatalog); assert(projected.ok);
      expect(projected.catalog.heroes.fighter.stats.armorClass).toBe(base.heroes.fighter.stats.armorClass + 1);
      expect(projected.catalog.heroes.fighter.stats.accuracy).toBe(base.heroes.fighter.stats.accuracy);
      const battle = createBattle('map:item_fixture', 123, projected.catalog); assert(battle.ok);
      const actor = battle.state.units[battle.state.initiative[0] - 1];
      const target = actor.id === 1 ? 2 : 1;
      const preview = previewAttack(battle.state, { type: 'useAbility', unitId: actor.id, abilityId: 'ability:basic_attack', target: { unitId: target } }, projected.catalog);
      assert(preview.ok);
      if (target === 1) expect(preview.armorClass).toBe(base.heroes.fighter.stats.armorClass + 1);
    }
    const aimed = accepted(apply(warded, equip(instance(1)), itemCatalog, base));
    const projected = projectItemCatalog(aimed, authoredRun, base, itemCatalog); assert(projected.ok);
    expect(projected.catalog.heroes.fighter.stats).toEqual({ ...base.heroes.fighter.stats, accuracy: base.heroes.fighter.stats.accuracy + 1 });
    const removed = accepted(apply(aimed, equip(instance(1), 'fighter', 'unequipItem'), itemCatalog, base));
    const bare = projectItemCatalog(removed, authoredRun, base, itemCatalog); assert(bare.ok);
    expect(bare.catalog.heroes).toEqual(base.heroes); expect(JSON.stringify(base)).toBe(before);
    // Passing a previous projection as base fails run content identity validation instead of accumulating.
    expect(projectItemCatalog(aimed, authoredRun, projected.catalog, itemCatalog).ok).toBe(false);
  });
  it('existing attack resolution consumes projected accuracy/armor class with identical next RNG after restore', () => {
    const base = battleBase(), s = withOwnership(prepared(itemCatalog, base));
    for (const item of [ward, aim]) {
      const id = item === ward ? instance() : instance(1), equipped = accepted(apply(s, equip(id), itemCatalog, base));
      const restored = readRunItems(copy(equipped), authoredRun, base, itemCatalog); assert(restored.ok);
      const a = projectItemCatalog(equipped, authoredRun, base, itemCatalog), b = projectItemCatalog(restored.state, authoredRun, base, itemCatalog);
      assert(a.ok && b.ok);
      for (let seed = 0; seed < 8; seed++) {
        const ba = createBattle('map:item_fixture', seed, a.catalog), bb = createBattle('map:item_fixture', seed, b.catalog), baseline = createBattle('map:item_fixture', seed, base);
        assert(ba.ok && bb.ok && baseline.ok);
        const actorId = ba.state.initiative[0], command = { type: 'useAbility', unitId: actorId, abilityId: 'ability:basic_attack', target: { unitId: actorId === 1 ? 2 : 1 } };
        const preview = previewAttack(ba.state, command, a.catalog), plain = previewAttack(baseline.state, command, base); assert(preview.ok && plain.ok);
        expect(preview.bonus).toBe(plain.bonus + (item === aim && actorId === 1 ? 1 : 0));
        expect(preview.armorClass).toBe(plain.armorClass + (item === ward && actorId === 2 ? 1 : 0));
        const ra = resolveAttack(ba.state, command, a.catalog), rb = resolveAttack(bb.state, command, b.catalog);
        assert(ra.ok && rb.ok); expect(ra).toEqual(rb); expect(nextUint32(ra.state.rng)).toEqual(nextUint32(rb.state.rng));
        expect(ra.events.find(e => e.type === 'attackRolled')).toMatchObject({ bonus: preview.bonus, armorClass: preview.armorClass });
        expect(ba.state.rng).toEqual(baseline.state.rng); // equipment uses no battle draws
      }
    }
  });
  it('extends claim/use/equip/projection through allowed effect types and eligible heroes', () => {
    const tonic = 'item:fixture_tonic' as const, charm = 'item:fixture_charm' as const;
    const checked = validateItems({ ...itemCatalog,
      [tonic]: { id: tonic, label: 'Fixture Tonic', kind: 'consumable', eligibleHeroes: ['mage'], context: 'betweenEncounters', effect: { kind: 'restoreHp', amount: 2 } },
      [charm]: { id: charm, label: 'Fixture Charm', kind: 'equipment', eligibleHeroes: ['ranger'], context: 'betweenEncounters', slot: 'charm', effect: { kind: 'statBonus', stat: 'accuracy', amount: 2 } },
    }); assert(checked.ok);
    for (const id of [tonic, charm]) {
      let s = reward(0, checked.catalog);
      for (let seed = 1; !s.offer!.options.some(o => o.itemId === id); seed++) s = reward(seed, checked.catalog);
      s = { ...s, run: { ...s.run, party: s.run.party.map(h => h.heroId === 'mage' ? { ...h, hp: 8 } : h) } };
      const granted = accepted(claim(s, id, checked.catalog));
      if (id === tonic) {
        expect(apply(granted, { type: 'useItem', itemId: tonic, heroId: 'fighter' }, checked.catalog).ok).toBe(false);
        const used = accepted(apply(granted, { type: 'useItem', itemId: tonic, heroId: 'mage' }, checked.catalog));
        expect(used.run.party[2].hp).toBe(Math.min(granted.run.party[2].hp + 2, runCatalog.heroes.mage.stats.maxHp));
        expect(used.ownership.consumables).toEqual([]);
      } else {
        const ownedId = granted.ownership.equipment[0].instanceId;
        expect(apply(granted, equip(ownedId), checked.catalog).ok).toBe(false);
        const equipped = accepted(apply(granted, equip(ownedId, 'ranger'), checked.catalog));
        const projected = projectItemCatalog(equipped, authoredRun, runCatalog, checked.catalog); assert(projected.ok);
        expect(projected.catalog.heroes.ranger.stats.accuracy).toBe(runCatalog.heroes.ranger.stats.accuracy + 2);
        const invalid: ItemOwnership = { ...granted.ownership, assignments: [{ heroId: 'fighter', slot: 'charm', instanceId: ownedId }] };
        expect(readItemOwnership(invalid, granted.run.id, checked.catalog).ok).toBe(false);
      }
    }
  });
});
