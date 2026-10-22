import { combatStats } from '../../src/domain/effects';
import { assert, expect, it } from 'vitest';
import { activeSnapshot, preparedSnapshot, rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { decodeRunSave, encodeRunSave, readRunSnapshot, runBattleCatalog, resolveRunBattlefield, RUN_SAVE_MAX_CODE_UNITS } from '../../src/domain/runSaveEnvelope';
import { createBattle, dispatch } from '../../src/domain/turns';
import { nextUint32 } from '../../src/domain/rng';
import { contentVersion } from '../../src/domain/battle';
import { createRun, deriveRunSeed } from '../../src/domain/run';
import { emptyItemOwnership } from '../../src/domain/items';

it('round trips reward, entry, active and terminal states with owned copies', () => {
  const fresh = createRun('fresh', 1, runContext.definition, runContext.catalog); assert(fresh.ok);
  const entry = { items: { run: fresh.state, ownership: emptyItemOwnership(), offer: null, itemRevision: 0 }, activeBattle: null, battlefield:null };
  const defeat: any = rewardSnapshot();
  defeat.items = { ...defeat.items, offer: null, run: { ...defeat.items.run, phase: 'defeat', pendingReward: null,
    party: defeat.items.run.party.map((h: any) => ({ ...h, hp: 0 })) } };
  const victory: any = preparedSnapshot();
  victory.items = { ...victory.items, run: { ...victory.items.run, phase: 'victory', encounterIndex: 2, revision: 5, pendingReward: null } };
  for (const snapshot of [entry, rewardSnapshot(), preparedSnapshot(), activeSnapshot(), defeat, victory]) {
    const encoded = encodeRunSave(snapshot, runContext); assert(encoded.ok);
    expect(encoded.text.length).toBeLessThan(RUN_SAVE_MAX_CODE_UNITS);
    const decoded = decodeRunSave(encoded.text, runContext); assert(decoded.ok);
    expect(decoded.state).toEqual(snapshot);
    expect(decoded.state.items).not.toBe(snapshot.items);
    expect(encodeRunSave(decoded.state, runContext)).toEqual(encoded);
  }
});
it('restores equipped projection and active next command/RNG exactly once', () => {
  const snapshot: any = activeSnapshot();
  snapshot.items.ownership = { ...snapshot.items.ownership, assignments: [
    { instanceId: snapshot.items.ownership.equipment[0].instanceId, heroId: 'fighter', slot: 'charm' }] };
  const catalog = runBattleCatalog(snapshot.items, runContext)!;
  snapshot.activeBattle = { ...snapshot.activeBattle!, versions: { ...snapshot.activeBattle!.versions, content: contentVersion(catalog) } };
  const encoded = encodeRunSave(snapshot, runContext); assert(encoded.ok);
  const restored = decodeRunSave(encoded.text, runContext); assert(restored.ok && restored.state.activeBattle);
  const restoredCatalog = runBattleCatalog(restored.state.items, runContext)!;
  expect(restoredCatalog.heroes.fighter.stats.armorClass).toBe(runContext.catalog.heroes.fighter.stats.armorClass + 1);
  const command = { type: 'endTurn', unitId: snapshot.activeBattle.initiative[snapshot.activeBattle.activeIndex] };
  expect(dispatch(restored.state.activeBattle, command, restoredCatalog)).toEqual(dispatch(snapshot.activeBattle, command, catalog));
  expect(nextUint32(restored.state.activeBattle.rng)).toEqual(nextUint32(snapshot.activeBattle.rng));
});
it('rejects malformed, oversized, incompatible and corrupt envelopes before hydration', () => {
  const encoded = encodeRunSave(rewardSnapshot(), runContext); assert(encoded.ok);
  const envelope = JSON.parse(encoded.text);
  for (const [text, reason] of [
    ['{', 'invalidJson'], [' '.repeat(RUN_SAVE_MAX_CODE_UNITS + 1), 'tooLarge'], ['{}', 'invalidEnvelope'],
    [JSON.stringify({ ...envelope, format: 1 }), 'incompatible'],
    [JSON.stringify({ ...envelope, identity: { ...envelope.identity, items: 'future' } }), 'incompatible'],
    [JSON.stringify({ ...envelope, digest: 'sha256:' + '0'.repeat(64) }), 'corrupt'],
  ]) expect(decodeRunSave(text, runContext)).toEqual({ ok: false, reason });
  const changed = { ...runContext, items: { ...runContext.items, 'item:healing_draught': {
    ...runContext.items['item:healing_draught'], label: 'Changed' } } };
  expect(decodeRunSave(encoded.text, changed)).toEqual({ ok: false, reason: 'incompatible' });
});
it('rejects mismatched roster, map, seed, stats, HP, phase, offer and owned data', () => {
  const mutations: ((s: any) => void)[] = [
    s => { s.activeBattle.seed++; }, s => { s.activeBattle.mapId = 'map:forest_ruins'; },
    s => { s.activeBattle.units[0].hp = 18; }, s => { s.activeBattle.units.pop(); },
    s => { s.items.run.phase = 'reward'; }, s => { s.items.ownership.consumables[0].quantity = 10; },
    s => { s.items.itemRevision = Number.MAX_SAFE_INTEGER + 1; }, s => { s.extra = true; },
    s => { s.items.ownership.assignments = [{ heroId: 'fighter', slot: 'charm', instanceId: s.items.ownership.equipment[0].instanceId }]; },
  ];
  for (const mutate of mutations) {
    const snapshot = activeSnapshot(); mutate(snapshot);
    expect(readRunSnapshot(snapshot, runContext).ok).toBe(false);
  }
  const reward = rewardSnapshot(); (reward.items.offer!.options[0] as any).itemId = 'item:missing';
  expect(encodeRunSave(reward, runContext).ok).toBe(false);
  const accessor = Object.defineProperty({}, 'items', { enumerable: true, get() { throw Error('getter'); } });
  expect(readRunSnapshot(accessor, runContext).ok).toBe(false);
});
it('keeps the authored catalog maximum roster, inventory and numeric widths inside the bound', () => {
  const snapshot: any = preparedSnapshot();
  snapshot.items.run = { ...snapshot.items.run, encounterIndex: 2, revision: 4, party: snapshot.items.run.party.map((h: any) =>
    ({ ...h, hp: runContext.catalog.heroes[h.heroId as keyof typeof runContext.catalog.heroes].stats.maxHp })) };
  snapshot.items.itemRevision = Number.MAX_SAFE_INTEGER;
  snapshot.items.ownership = { consumables: [{ itemId: 'item:healing_draught', quantity: 9 }],
    equipment: [0, 1].flatMap(r => [0, 1].map(o => ({ instanceId: `item-fixture:reward:${r}:option:${o}`, itemId: 'item:warding_charm' }))),
    assignments: ['fighter', 'ranger', 'mage'].map((heroId, i) => ({ heroId, slot: 'charm', instanceId: `item-fixture:reward:${Math.floor(i / 2)}:option:${i % 2}` })) };
  const catalog = runBattleCatalog(snapshot.items, runContext)!;
  const made = createBattle('map:ruined_approach', deriveRunSeed(snapshot.items.run.seed, 'encounter', 2), catalog); assert(made.ok);
  snapshot.battlefield = resolveRunBattlefield(snapshot.items,runContext)!.ok ? (resolveRunBattlefield(snapshot.items,runContext) as any).descriptor : null;
  snapshot.activeBattle = { ...made.state, commandCount: 10000, round: Number.MAX_SAFE_INTEGER };
  const encoded = encodeRunSave(snapshot, runContext); assert(encoded.ok);
  expect(encoded.text.length).toBeLessThan(5000);
  expect(decodeRunSave(encoded.text, runContext).ok).toBe(true);
  console.log(`Authored run stress snapshot: ${encoded.text.length} / ${RUN_SAVE_MAX_CODE_UNITS} code units`);
});

it.each(['seed','hash','source','encounter','version','extra','long','missing'])('rejects active battlefield descriptor mismatch: %s',problem=>{
 const snapshot:any=structuredClone(activeSnapshot());
 if(problem==='seed')snapshot.battlefield.layoutSeed++;
 if(problem==='hash')snapshot.battlefield.mapHash='sha256:'+'0'.repeat(64);
 if(problem==='source')snapshot.battlefield.kind='authored';
 if(problem==='encounter')snapshot.battlefield.encounterId='encounter:ruined_approach';
 if(problem==='version')snapshot.battlefield.generatorVersion=2;
 if(problem==='extra')snapshot.battlefield.attempt=0;
 if(problem==='long')snapshot.battlefield.mapId='map:'+'a'.repeat(1000);
 if(problem==='missing')delete snapshot.battlefield;
 expect(readRunSnapshot(snapshot,runContext).ok).toBe(false);
});

it('preserves equipped Guarded and historical defeated guard bytes, rejecting unsupported effect resources', () => {
  const original: any = activeSnapshot();
  original.items.ownership.assignments = [{ instanceId: original.items.ownership.equipment[0].instanceId, heroId: 'fighter', slot: 'charm' }];
  const catalog = runBattleCatalog(original.items, runContext)!;
  original.activeBattle = { ...original.activeBattle, versions: { ...original.activeBattle.versions, content: contentVersion(catalog) },
    units: original.activeBattle.units.map((u: any) => u.defId === 'fighter' ? { ...u, guarded: true } : u) };
  for (const defeated of [false, true]) {
    const snapshot = structuredClone(original);
    if (defeated) {
      snapshot.activeBattle.units[0].hp = 0;
      snapshot.activeBattle.activeIndex = snapshot.activeBattle.initiative.findIndex((id: number) => id !== 1);
    }
    const saved = encodeRunSave(snapshot, runContext); assert(saved.ok);
    const read = decodeRunSave(saved.text, runContext); assert(read.ok && read.state.activeBattle);
    expect(read.state).toEqual(snapshot); expect(encodeRunSave(read.state, runContext)).toEqual(saved);
    const fighter = read.state.activeBattle.units.find(u => u.defId === 'fighter')!;
    expect(combatStats(fighter, catalog).armorClass).toBe(catalog.heroes.fighter.stats.armorClass + (defeated ? 0 : 2));
    let live = snapshot.activeBattle, resumed = read.state.activeBattle;
    for (let i = 0; i < live.units.length; i++) {
      const command = { type: 'endTurn', unitId: live.initiative[live.activeIndex] };
      const a = dispatch(live, command, catalog), b = dispatch(resumed, command, catalog); expect(a).toEqual(b); assert(a.ok && b.ok);
      live = a.state; resumed = b.state;
    }
    expect(live.units.find((u: any) => u.defId === 'fighter').guarded).toBeUndefined();
    for (const field of ['statuses', 'resources']) {
      const bad = structuredClone(snapshot); bad.activeBattle.units[0][field] = [];
      expect(readRunSnapshot(bad, runContext).ok).toBe(false);
    }
  }
});
