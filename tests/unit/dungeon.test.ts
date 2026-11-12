import { atEncounter, atDownstairs, atStairApproach, atCell, dungeonContactApproach, withLegacySight } from '../helpers/dungeonFixtures';
import { freshExploration, movableExploration, neighbors, poiCell } from '../../src/domain/exploration';
import { generateMap } from '../../src/map/generate';
import { applyBiome } from '../../src/map/biomes';
import { DEFAULT_BEHAVIORS, stepMovement } from '../../src/map/movement';
import { HERO_PROGRESSION } from '../../src/content/progression';
import { assert, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dungeonCapacityFixture } from '../helpers/dungeonFixtures';
import { clearedDungeonSlots, freshDungeon, newDungeonSeed, stepDungeon, dungeonBattle, dungeonOffer, floorDescriptor, floorMap, FloorCache, dungeonSeed, readDungeon, travelDungeon, startDungeonBattle, acceptDungeonBattle, dungeonItem, dungeonBoundary, type DungeonState, type DungeonResult } from '../../src/domain/dungeon';
import { encodeDungeon, decodeDungeon, encodeDungeonRollback, utf8Bytes } from '../../src/domain/dungeonSaveEnvelope';
import { dungeonContent, dungeonIdentity, previousDungeonIdentity } from '../../src/content/dungeon';
import { bothDungeonSlotsMissing, createDungeonStorage, DUNGEON_BACKUP_CHECKPOINT_KEY, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import { DungeonSession } from '../../src/app/DungeonSession';
import { LEGACY_ENCOUNTER_POLICY, selectDungeonEncounter } from '../../src/domain/dungeonEncounters';
import { priorDungeonEnvelope } from '../helpers/dungeonFixtures';
import { dispatch } from '../../src/domain/turns';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { dungeonEncounterCatalog, dungeonBattleCatalog } from '../../src/content/dungeonEncounters';
import { resolveBattlefield } from '../../src/domain/battlefield';
import { RunHistory } from '../../src/app/RunHistory';
import { createRunRecordsStorage, RUN_RECORD_KEYS, selectedRunRecords } from '../../src/persistence/runRecordsStorage';
import * as battlefields from '../../src/domain/battlefield';
const good = (r: DungeonResult) => { expect(r.ok).toBe(true); if (!r.ok) throw Error(r.reason); return r.state; };
const fresh = () => freshDungeon('test-dungeon', 13);
it.each(['issue-165/dungeon.json','issue-166/dungeon.json','issue-166/dungeon-main8.json'])('retains exact %s previous-format dungeon bytes for recovery/export without migration',fixture=>{
  const raw=readFileSync(`tests/fixtures/saves/${fixture}`,'utf8'),data=new Map([[DUNGEON_KEYS.primary,raw],[DUNGEON_KEYS.backup,raw]]);
  const storage={getItem:(key:string)=>data.get(key as typeof DUNGEON_KEYS.primary)??null,setItem:(key:string,value:string)=>{throw Error(`Unexpected write ${key} ${value.length}`);},removeItem:()=>{throw Error('Unexpected removal');}};
  const store=createDungeonStorage(()=>storage),review=store.inspect();expect(review.primary).toEqual({status:'invalid',text:raw,reason:'incompatible'});
  expect(store.save(fresh())).toEqual({ok:false,reason:'recoveryRequired'});expect(new DungeonSession(fresh(),store).exports(review).map(v=>v.text)).toContain(raw);expect(data.get(DUNGEON_KEYS.primary)).toBe(raw);
});
it.each(['active', 'reward'])('loads the exact pre-consumable dungeon %s save and preserves its pending offer or battle', phase => {
  const text = readFileSync(`tests/fixtures/saves/issue-172/dungeon-${phase}.json`, 'utf8');
  const previous = JSON.parse(text);
  expect(previous.format).toBe(9);
  const read = decodeDungeon(text); assert(read.ok);
  expect(read.state).toEqual(previous.payload);
  const current = encodeDungeon(read.state); assert(current.ok);
  expect(JSON.parse(current.text).format).toBe(10);
  expect(decodeDungeon(current.text)).toEqual(read);
  if (phase === 'reward') {
    const offer = read.state.offer!; expect(offer.version).toBe(1);
    const claimed = dungeonItem(read.state, { ...dungeonBoundary(read.state), type: 'claimReward',
      offerId: offer.id, itemId: offer.options[0].itemId });
    assert(claimed.ok); expect(claimed.state.phase).toBe('ready');
    expect(claimed.state.offer).toBeNull();
  }
  expect(decodeDungeon(JSON.stringify({ ...previous, digest: `sha256:${'0'.repeat(64)}` }))).toEqual({ ok: false, reason: 'digest' });
});
it('labels wall-aware saves and rejects signed payloads with the wrong sight format', () => {
  const state = fresh();
  const rewrap = (text: string, format: number) => {
    const { kind, identity, payload } = JSON.parse(text);
    const body = { kind, format, identity, payload };
    return canonical({ ...body, digest: hashJson(body) });
  };
  const wallAware = encodeDungeon(state); assert(wallAware.ok);
  expect(JSON.parse(wallAware.text).format).toBe(14);
  expect(decodeDungeon(wallAware.text)).toEqual({ ok: true, state });
  expect(decodeDungeon(rewrap(wallAware.text, 10))).toEqual({ ok: false, reason: 'incompatible' });
  expect(decodeDungeon(rewrap(wallAware.text, 12))).toEqual({ ok: true, state });
  expect(decodeDungeon(rewrap(wallAware.text, 15))).toEqual({ ok: false, reason: 'invalidState' });
  const legacy = withLegacySight(state), old = encodeDungeon(legacy); assert(old.ok);
  expect(JSON.parse(old.text).format).toBe(10);
  expect(decodeDungeon(old.text)).toEqual({ ok: true, state: legacy });
  expect(decodeDungeon(rewrap(old.text, 14))).toEqual({ ok: false, reason: 'incompatible' });
});
it.each([false, true])('keeps a pre-fog backup after repeated writes (migrated: %s)', migrated => {
  const initial = migrated ? withLegacySight(fresh()) : fresh();
  const data = memory(), storage = createDungeonStorage(() => data);
  expect(storage.save(initial).ok).toBe(true);
  const original = storage.inspect().primary.text;
  const step = (s: DungeonState) => {
    const floor = s.floors[0], map = floorMap(floor.descriptor);
    const destination = neighbors(floor.position, map.width, map.height).find(cell => map.cells[cell])!;
    return good(stepDungeon(s, { id: s.id, depth: s.depth, revision: s.revision, destination }));
  };
  const first = step(initial);
  expect(storage.save(first, original).ok).toBe(true);
  if (migrated) expect(storage.inspect().backup.text).toBe(original);
  const second = step(first);
  expect(storage.save(second, storage.inspect().primary.text).ok).toBe(true);
  const saved = storage.inspect();
  assert(saved.primary.status === 'valid' && saved.backup.status === 'valid');
  expect(JSON.parse(saved.primary.text).format).toBe(14);
  expect(saved.primary.state).toEqual(second);
  expect(JSON.parse(saved.backup.text).format).toBe(10);
  const rollback = decodeDungeon(saved.backup.text); assert(rollback.ok);
  expect(rollback.state.floors[0].exploration.sightVersion).toBeUndefined();
  expect(rollback.state.floors[0].exploration.revealed).toEqual(expect.arrayContaining([...first.floors[0].exploration.revealed]));
  expect(saved.backup.state).toEqual(first);
  data.setItem(DUNGEON_KEYS.primary, '{broken');
  const restartedStorage = createDungeonStorage(() => data);
  const session = new DungeonSession(initial, restartedStorage), review = session.inspect();
  const exports = session.exports(review);
  expect(exports.find(entry => entry.label === 'pre-fog backup save')?.text).toBe(saved.backup.text);
  expect(decodeDungeon(exports.find(entry => entry.label === 'backup save')!.text)).toEqual({ ok: true, state: first });
  expect(session.continue(review)).toBe(true);
  expect(session.snapshot).toEqual(first);

  const reviewed = session.inspect();
  const replacement = encodeDungeonRollback(second); assert(replacement.ok);
  data.setItem(DUNGEON_KEYS.backup, replacement.text);
  expect(session.continue(reviewed, 'backup')).toBe(false);
  const changed = restartedStorage.inspect().backup; assert(changed.status === 'valid');
  expect(changed.checkpoint).toBeUndefined();
  expect(changed.state.floors[0].exploration.sightVersion).toBeUndefined();
});

it('keeps the previous exact checkpoint when a backup rotation is interrupted', () => {
  const initial = fresh(), data = memory(), storage = createDungeonStorage(() => data);
  expect(storage.save(initial).ok).toBe(true);
  const floor = initial.floors[0], map = floorMap(floor.descriptor);
  const next = good(stepDungeon(initial, { id: initial.id, depth: initial.depth, revision: initial.revision,
    destination: neighbors(floor.position, map.width, map.height).find(cell => map.cells[cell])! }));
  expect(storage.save(next).ok).toBe(true);
  const write = data.setItem;
  data.setItem = (key, value) => {
    if (key === DUNGEON_KEYS.backup) throw Object.assign(Error('denied'), { name: 'SecurityError' });
    write(key, value);
  };
  expect(storage.save(next)).toEqual({ ok: false, reason: 'security' });
  const currentStorage = createDungeonStorage(() => data);
  const backup = currentStorage.inspect().backup; assert(backup.status === 'valid');
  expect(backup.state).toEqual(initial);
  const session = new DungeonSession(next, currentStorage), reviewed = session.inspect();
  write(DUNGEON_BACKUP_CHECKPOINT_KEY, 'corrupt');
  expect(session.continue(reviewed, 'backup')).toBe(false);
  const fallback = currentStorage.inspect().backup; assert(fallback.status === 'valid');
  expect(fallback.state.floors[0].exploration.sightVersion).toBeUndefined();
  expect(currentStorage.remove('backup', fallback.text, null).ok).toBe(true);
  expect(data.getItem(DUNGEON_BACKUP_CHECKPOINT_KEY)).toBeNull();
});

function win(s: DungeonState) {
  s = good(startDungeonBattle(atEncounter(s)));
  const b = s.activeBattle!;
  return good(acceptDungeonBattle(s, { ...b, outcome: 'playerWin', units: b.units.map(u => u.side === 'enemy' ? { ...u, hp: 0 } : u) }));
}
export function clearFloor(s: DungeonState) {
  for (let i = 0; i < 3; i++) {
    s = win(s);
    if (s.offer) s = good(dungeonItem(s, { ...dungeonBoundary(s), type: 'claimReward', offerId: s.offer.id, itemId: s.offer.options[0].itemId }));
  }
  return atDownstairs(s);
}
function enterStairs(session: DungeonSession, direction: 'ascend' | 'descend' = 'descend') {
  const s = session.snapshot, f = s.floors[s.depth-1];
  return session.step({id:s.id,depth:s.depth,revision:s.revision,destination:direction === 'ascend' ? f.descriptor.upstairs : f.descriptor.downstairs});
}
function memory() {
  const values = new Map<string,string>();
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string,v: string) => { values.set(k,v); }, removeItem: (k: string) => { values.delete(k); } };
}

describe('dungeon run history boundaries', () => {
  function fixture() {
    const m = memory(), storage = createDungeonStorage(() => m);
    const records = createRunRecordsStorage(() => m, async action => action());
    const history = new RunHistory('dungeon', records, () => 200);
    return { m, storage, records, history, rows: () => selectedRunRecords(records.inspect())?.records ?? [] };
  }
  it('records staged terminal continuation exactly once without changing active save bytes', async () => {
    const f = fixture(), entry = good(startDungeonBattle(atEncounter(fresh()))), battle = entry.activeBattle!;
    const terminal = good(acceptDungeonBattle(entry, { ...battle, outcome: 'playerLoss',
      units: battle.units.map(unit => unit.side === 'player' ? { ...unit, hp: 0 } : unit) }));
    assert(f.storage.save(terminal).ok); const bytes = [f.m.getItem(DUNGEON_KEYS.primary), f.m.getItem(DUNGEON_KEYS.backup)];
    const session = new DungeonSession(freshDungeon('placeholder', 14), f.storage, f.history);
    expect(f.m.getItem(RUN_RECORD_KEYS.primary)).toBeNull();
    assert(session.continue(session.inspect())); await f.history.whenIdle();
    expect(f.rows()).toMatchObject([{ id: terminal.id, outcome: 'defeat', recordedAt: 200, battlesWon: 0 }]);
    assert(session.continue(session.inspect())); await f.history.whenIdle(); expect(f.rows()).toHaveLength(1);
    expect(session.snapshot).toEqual(terminal);
    expect([f.m.getItem(DUNGEON_KEYS.primary), f.m.getItem(DUNGEON_KEYS.backup)]).toEqual(bytes);
  });
  it.each(['unsaved', 'changed'] as const)('records a legally accepted defeat independently of active saves %s', async mode => {
    const f = fixture(), initial = fresh(), injured = atEncounter({ ...initial,
      party: initial.party.map(hero => ({ ...hero, hp: hero.heroId === 'fighter' ? 1 : 0 })),
    });
    const session = new DungeonSession(injured, f.storage, f.history);
    if (mode === 'unsaved') session.playUnsaved();
    const battle = session.startEncounter(); assert(battle);
    if (mode === 'changed') {
      const other = createDungeonStorage(() => f.m);
      assert(other.save(freshDungeon('another-tab', 14)).ok);
    }
    const bytes = [f.m.getItem(DUNGEON_KEYS.primary), f.m.getItem(DUNGEON_KEYS.backup)];
    for (let count = 0; count < 1000 && battle.phase !== 'ended'; count++) {
      const step = battle.phase === 'enemy' ? battle.nextEnemy()
        : (battle.prepare({ type: 'endTurn', unitId: battle.active.id }), battle.confirm());
      assert(step); battle.finishPresentation(step.token);
    }
    expect(session.phase).toBe('defeat'); await f.history.whenIdle();
    expect(f.rows()).toMatchObject([{ id: injured.id, outcome: 'defeat', recordedAt: 200, battlesWon: 0 }]);
    expect([f.m.getItem(DUNGEON_KEYS.primary), f.m.getItem(DUNGEON_KEYS.backup)]).toEqual(bytes);
    session.dispose();
  });
  it('does not end a cleared floor or continued descent, and records the reviewed old journey rather than a placeholder', async () => {
    const f = fixture(), cleared = atStairApproach(clearFloor(fresh())); assert(f.storage.save(cleared).ok);
    const session = new DungeonSession(freshDungeon('placeholder', 14), f.storage, f.history);
    assert(session.continue(session.inspect())); await f.history.whenIdle(); expect(f.rows()).toEqual([]);
    assert(enterStairs(session)); await f.history.whenIdle(); expect(session.snapshot.depth).toBe(2); expect(f.rows()).toEqual([]);
    const before = session.snapshot;
    assert(await session.replace(session.inspect(), 'dungeon-next', 15)); await f.history.whenIdle();
    expect(f.rows()).toMatchObject([{ id: before.id, outcome: 'abandoned', battlesWon: 3, floorsCleared: 1, deepestFloor: 2 }]);
    expect(session.snapshot.id).toBe('dungeon-next');
  });
  it.each(['stale', 'partial'])('refuses %s replacement without inventing abandonment', async failure => {
    const f = fixture(), initial = fresh(); assert(f.storage.save(initial).ok);
    const session = new DungeonSession(initial, f.storage, f.history); assert(session.continue(session.inspect())); await f.history.whenIdle();
    const review = session.inspect(), before = [f.m.getItem(DUNGEON_KEYS.primary), f.m.getItem(DUNGEON_KEYS.backup)];
    if (failure === 'stale') f.m.setItem(DUNGEON_KEYS.primary, 'changed while reviewing');
    else { const remove = f.m.removeItem; f.m.removeItem = key => { if (key === DUNGEON_KEYS.primary) throw Error('denied'); remove(key); }; }
    expect(await session.replace(review, 'dungeon-next', 14)).toBe(false); await f.history.whenIdle();
    expect(session.snapshot).toEqual(initial); expect(f.rows()).toEqual([]);
    expect(selectedRunRecords(f.records.inspect())?.receipts.dungeon?.kind).not.toBe('pending');
    if (failure === 'stale') expect(f.m.getItem(DUNGEON_KEYS.backup)).toBe(before[1]);
  });
  it('does not record the first New Game or acquire history for a testing dungeon', async () => {
    const f = fixture(), session = new DungeonSession(fresh(), f.storage, f.history);
    assert(await session.replace(session.inspect(), 'first-admitted', 14));
    expect(f.m.getItem(RUN_RECORD_KEYS.primary)).toBeNull();
    const testing = new DungeonSession(fresh(), null, new RunHistory('dungeon', createRunRecordsStorage(() => { throw Error('History acquired'); })));
    expect(testing.history).toBeNull(); expect(testing.restart('temporary', 14)).toBe(true);
  });
  it('records replacement of an explicitly started unsaved dungeon before its first move', async () => {
    const f = fixture(), initial = fresh(), session = new DungeonSession(initial, f.storage, f.history);
    session.playUnsaved();
    assert(await session.replace(session.inspect(), 'after-unsaved-start', 14)); await f.history.whenIdle();
    expect(f.rows()).toMatchObject([{ id: initial.id, outcome: 'abandoned', battlesWon: 0 }]);
  });
  it.each(['accepted', 'stale', 'partial'] as const)('records the distinct saved and admitted unsaved dungeon only when replacement is %s', async result => {
    const f = fixture(), saved = fresh(), live = freshDungeon('unsaved-live-dungeon', 23);
    assert(f.storage.save(saved).ok);
    const session = new DungeonSession(live, f.storage, f.history);
    session.playUnsaved(); const before = session.snapshot, review = session.inspect();
    if (result === 'stale') f.m.setItem(DUNGEON_KEYS.primary, 'changed while reviewing');
    if (result === 'partial') { const remove = f.m.removeItem; f.m.removeItem = key => {
      if (key === DUNGEON_KEYS.primary) throw Error('partial removal'); remove(key);
    }; }
    expect(await session.replace(review, 'after-distinct-dungeons', 24)).toBe(result === 'accepted');
    await f.history.whenIdle();
    if (result === 'accepted') {
      const rows = f.rows(); expect(rows).toHaveLength(2);
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: saved.id, outcome: 'abandoned' }),
        expect.objectContaining({ id: live.id, outcome: 'abandoned' }),
      ]));
      assert(session.continue(session.inspect())); await f.history.whenIdle(); expect(f.rows()).toEqual(rows);
    } else { expect(f.rows()).toEqual([]); expect(session.snapshot).toEqual(before); }
  });
  it('allows an accepted new dungeon when history is unavailable, without claiming its old record survived', async () => {
    const f = fixture(), old = fresh(); assert(f.storage.save(old).ok);
    const denied = new RunHistory('dungeon', createRunRecordsStorage(() => null, async action => action()));
    const session = new DungeonSession(old, f.storage, denied);
    // Startup rendering inspects saves; a preparatory history warning must not invalidate its own review.
    session.onChange = () => { session.inspect(); };
    assert(await session.replace(session.inspect(), 'after-denial', 14));
    expect(session.snapshot.id).toBe('after-denial'); expect(session.status).toContain('history could not be confirmed');
    expect(f.storage.inspect().primary.status).toBe('valid');
  });
  it('preserves a newly accepted exploration step when replacement preparation races it', async () => {
    const f = fixture(), old = fresh(); assert(f.storage.save(old).ok);
    const session = new DungeonSession(old, f.storage, f.history); assert(session.continue(session.inspect())); await f.history.whenIdle();
    const replacing = session.replace(session.inspect(), 'after-race', 14), floor = old.floors[0], map = floorMap(floor.descriptor);
    const destination = neighbors(floor.position, map.width, map.height).find(cell => map.cells[cell]); assert(destination !== undefined);
    assert(session.step({ ...session.spatialBoundary, destination })); const moved = session.snapshot;
    expect(await replacing).toBe(false); expect(session.snapshot).toEqual(moved); expect(f.rows()).toEqual([]);
  });
});
describe('dungeon floors', () => {
  it('draws a colliding-safe uint32 seed from an injectable source', () => {
    expect(newDungeonSeed(() => 7)).toBe(7);
    expect(newDungeonSeed(() => 7, 7)).toBe(8);
    expect(newDungeonSeed(() => 5, 7)).toBe(5);
    expect(newDungeonSeed(() => 0xffffffff, 0xffffffff)).toBe(0);
    expect(newDungeonSeed(() => -1)).toBe(0xffffffff);
  });
  it('builds a legal first floor for thousands of seeds', () => {
    const failed: { seed: number; message: string }[] = [];
    const seeds = new Set<number>([0, 13, 14, 0xffffffff]);
    let walk = 0x9e3779b9;
    while (seeds.size < 4096) { walk = (Math.imul(walk, 1664525) + 1013904223) >>> 0; seeds.add(walk); }
    const resolvedPairings = new Set<string>();
    let constructed = 0;
    for (const seed of seeds) {
      try {
        for (const depth of [1, 2]) for (const slot of [0, 1, 2]) {
          const selection = selectDungeonEncounter(seed, depth, slot);
          const pairing = canonical(selection.encounter);
          if (resolvedPairings.has(pairing)) continue;
          const resolved = resolveBattlefield(selection.encounter, dungeonSeed(seed, depth, 'battle', slot), dungeonBattleCatalog);
          if (!resolved.ok) throw Error('Invalid dungeon encounter pairing');
          resolvedPairings.add(pairing);
        }
        if (constructed < 64) {
          const dungeon = freshDungeon('seed-sweep', seed);
          if (dungeon.seed !== seed || dungeon.floors[0].descriptor.encounters.length !== 3) throw Error('invalid generated dungeon');
          constructed++;
        }
      } catch (error) {
        failed.push({ seed, message: error instanceof Error ? error.message : String(error) });
      }
    }
    expect(resolvedPairings.size).toBeGreaterThan(3);
    expect(failed).toEqual([]);
  }, 30_000); // Bounded 4096-seed sweep includes 64 complete dungeon constructions.
  it('uses stable separate purposes and safe numerical bounds', () => {
    expect(floorDescriptor(13, 1)).toEqual(floorDescriptor(13, 1));
    expect(new Set(['floor','battle','reward'].map(p => dungeonSeed(13, 10, p as 'floor'))).size).toBe(3);
    expect(dungeonSeed(13, Number.MAX_SAFE_INTEGER, 'floor')).toBeGreaterThanOrEqual(0);
    for (const depth of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]) expect(() => dungeonSeed(13, depth, 'floor')).toThrow();
    expect(readDungeon({ ...fresh(), revision: Number.MAX_SAFE_INTEGER+1 }).ok).toBe(false);
  });
  it('reconstructs evicted maps and retains legal distinct stairs', () => {
    const cache = new FloorCache(), d = floorDescriptor(13, 1, cache), first = cache.resolve(d.seed);
    for (let depth=2;depth<6;depth++) floorDescriptor(13, depth, cache);
    expect(cache.size).toBe(3); expect(cache.resolve(d.seed)).toEqual(first);
    expect(first.cells[d.upstairs]).toBe(1); expect(first.cells[d.downstairs]).toBe(1); expect(d.upstairs).not.toBe(d.downstairs);
  });
  it('gates stairs, rejects duplicates and restores visited positions without rewards', () => {
    const initial = fresh(); expect(travelDungeon(initial,'invalid' as 'descend',0)).toEqual({ok:false,reason:'invalidCommand'}); expect(travelDungeon(initial,'descend',0).ok).toBe(false); expect(travelDungeon(initial,'ascend',0).ok).toBe(false);
    let s = win(initial); expect(travelDungeon(s,'descend',s.revision).ok).toBe(false);
    expect(acceptDungeonBattle(s, initial.activeBattle!).ok).toBe(false);
    const command = { ...dungeonBoundary(s), type: 'claimReward' as const, offerId: s.offer!.id, itemId: s.offer!.options[0].itemId };
    s = good(dungeonItem(s,command)); expect(dungeonItem(s,command).ok).toBe(false);
    for (let i=0;i<2;i++) { s=win(s); if(s.offer)s=good(dungeonItem(s,{...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:s.offer.options[0].itemId})); }
    const carried = s.party, owned = s.ownership;
    s=atDownstairs(s);const oldRevision=s.revision;s=good(travelDungeon(s,'descend',s.revision)); expect(travelDungeon(s,'descend',oldRevision)).toEqual({ok:false,reason:'staleBoundary'}); expect(s.depth).toBe(2); expect(s.phase).toBe('ready'); expect(s.party).toEqual(carried);
    const secondPosition=s.floors[1].position;
    s=good(travelDungeon(s,'ascend',s.revision)); expect(s.floors[0].position).toBe(s.floors[0].descriptor.downstairs); expect(s.floors[0].completed).toBe(3); expect(s.ownership).toEqual(owned);
    expect(startDungeonBattle(atEncounter(s)).ok).toBe(false);
    s=good(travelDungeon(s,'descend',s.revision)); expect(s.floors[1].position).toBe(secondPosition); expect(s.ownership).toEqual(owned);
  });
  it('continues at multi-digit depth with checked resource bounds and no fixed victory', () => {
    const base=fresh();
    const floors=Array.from({length:10},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1);return {descriptor,position:descriptor.downstairs,exploration:freshExploration(descriptor.seed,descriptor.downstairs,floorMap(descriptor)),completed:3};});
    const s=good(readDungeon({...base,depth:10,floors,revision:100}));
    const next=good(travelDungeon(s,'descend',s.revision));expect(next.depth).toBe(11);expect(next.phase).toBe('ready');expect(next.floors).toHaveLength(11);
    expect(travelDungeon({...s,revision:Number.MAX_SAFE_INTEGER},'descend',Number.MAX_SAFE_INTEGER)).toEqual({ok:false,reason:'resourceLimit'});
    const id=`${s.id}:floor:10:reward:1:option:0`;
    const withItem=good(readDungeon({...s,ownership:{consumables:[],equipment:[{instanceId:id,itemId:'item:warding_charm'}],assignments:[]}}));
    expect(withItem.ownership.equipment[0].instanceId).toBe(id);
  });
  it('roundtrips battle, reward and travel boundaries and rejects malformed descriptors', () => {
    for (const s of [fresh(),good(startDungeonBattle(atEncounter(fresh()))),win(fresh()),(()=>{const s=clearFloor(fresh());return good(travelDungeon(s,'descend',s.revision));})()]) {
      const encoded=encodeDungeon(s); expect(encoded.ok).toBe(true); if(encoded.ok)expect(decodeDungeon(encoded.text)).toEqual({ok:true,state:s});
    }
    const s=fresh(); expect(readDungeon({...s,floors:[{...s.floors[0],descriptor:{...s.floors[0].descriptor,mapHash:'sha256:'+'0'.repeat(64)}}]}).ok).toBe(false);
    expect(readDungeon({...s,phase:'reward',offer:{}}).ok).toBe(false);
    expect(decodeDungeon('bad').ok).toBe(false); expect(decodeDungeon('x'.repeat(1024*1024+1)).ok).toBe(false); expect(utf8Bytes('aé🧙')).toBe(7);
  });
  it('atomically refuses a full six-charm reward without losing the pending offer', () => {
    const base=fresh(),floors=Array.from({length:4},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1);return {descriptor,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor)),completed:i===3?1:3};});
    const equipment=Array.from({length:6},(_,i)=>({instanceId:`${base.id}:floor:${Math.floor(i/2)+1}:reward:${i%2}:option:0`,itemId:'item:warding_charm' as const}));
    const candidate={...base,depth:4,floors,phase:'reward' as const,ownership:{consumables:[],equipment,assignments:[]}};
    const s=good(readDungeon({...atEncounter(candidate,0),offer:dungeonOffer(candidate)}));
    const itemId=s.offer!.options.find(o=>dungeonContent.items[o.itemId].kind==='equipment')!.itemId;
    const before=JSON.stringify(s);expect(dungeonItem(s,{...dungeonBoundary(s),type:'claimReward',offerId:s.offer!.id,itemId})).toEqual({ok:false,reason:'capacity'});expect(JSON.stringify(s)).toBe(before);
  });
  it('can leave a saved reward boundary when both consumable stacks are full', () => {
    const consumables = (['item:healing_draught', 'item:revive_kit'] as const).map(itemId => ({itemId, quantity:9}));
    const reward = Array.from({length:24}, (_,seed)=>win(freshDungeon('capped-rewards',seed)))
      .find(state=>state.offer?.options.every(option=>consumables.some(stack=>stack.itemId===option.itemId)));
    assert(reward?.offer);
    const candidate = {...reward, ownership:{...reward.ownership,consumables}};
    const wire = encodeDungeon(candidate);
    assert(wire.ok);
    const state = good(decodeDungeon(wire.text));
    const boundary = dungeonBoundary(state), offerId = state.offer!.id;
    for(const {itemId} of state.offer!.options)
      expect(dungeonItem(state,{...boundary,type:'claimReward',offerId,itemId})).toEqual({ok:false,reason:'capacity'});
    const decline = {...boundary,type:'declineReward',offerId} as const;
    const next = good(dungeonItem(state,decline));
    expect(next).toMatchObject({phase:'ready',offer:null,ownership:state.ownership});
    expect(dungeonItem(next,decline)).toEqual({ok:false,reason:'staleBoundary'});
    expect(startDungeonBattle(atEncounter(next)).ok).toBe(true);
  });
  it('owns saved reward data instead of retaining caller mutation aliases', () => {
    const original=win(fresh()),input=JSON.parse(JSON.stringify(original)),checked=good(readDungeon(input));
    input.offer.options[0].quantity=9;
    expect(checked.offer).toEqual(original.offer);expect(readDungeon(input).ok).toBe(false);
  });
  it('carries injured survivors and applies equipped charm once across reconstruction', () => {
    let s=win(freshDungeon('test-dungeon', 4)); const itemId=s.offer!.options.find(o=>dungeonContent.items[o.itemId].kind==='equipment')!.itemId;
    s=good(dungeonItem(s,{...dungeonBoundary(s),type:'claimReward',offerId:s.offer!.id,itemId}));
    s={...s,party:s.party.map((h,i)=>({...h,hp:i===2?0:Math.max(1,h.hp-2)}))};
    const instance=s.ownership.equipment[0], def=dungeonContent.items[instance.itemId];
    if(def.kind!=='equipment')throw Error('equipment expected'); const heroId=def.eligibleHeroes[0];
    s=good(dungeonItem(s,{...dungeonBoundary(s),type:'equipItem',instanceId:instance.instanceId,heroId,slot:'charm'}));
    const b=good(startDungeonBattle(atEncounter(s))); expect(b.activeBattle!.units.filter(u=>u.side==='player')).toHaveLength(2);
    expect(dungeonBattle(b)!.catalog.heroes[heroId].stats[def.effect.stat]).toBe(dungeonContent.catalog.heroes[heroId].stats[def.effect.stat]+def.effect.amount);
    expect(dungeonBattle(b)!.catalog.heroes[heroId].stats[def.effect.stat]).toBe(dungeonContent.catalog.heroes[heroId].stats[def.effect.stat]+def.effect.amount);
    expect(b.activeBattle!.units.filter(u=>u.side==='player').every(u=>u.hp===s.party.find(h=>h.heroId===u.defId)!.hp)).toBe(true);
    expect(readDungeon(b)).toEqual({ok:true,state:b});
  });
  it('claims a Revive Kit, restores a fallen hero into the next battle and rejects a party wipe', () => {
    const reward=win(fresh()), itemId='item:revive_kit';
    const claimed=good(dungeonItem(reward,{...dungeonBoundary(reward),type:'claimReward',offerId:reward.offer!.id,itemId}));
    const party=claimed.party.map(hero=>hero.heroId==='mage'?{...hero,hp:0}:hero);
    const ready={...claimed,party};
    const command={...dungeonBoundary(ready),type:'useItem',itemId,heroId:'mage'} as const;
    const revived=good(dungeonItem(ready,command));
    expect(revived.ownership.consumables).toEqual([]);
    expect(dungeonItem(revived,command)).toEqual({ok:false,reason:'staleBoundary'});
    const next=good(startDungeonBattle(atEncounter(revived)));
    expect(next.activeBattle!.units.find(u=>u.defId==='mage')?.hp).toBe(3);
    const defeated={...claimed,phase:'defeat' as const,party:claimed.party.map(hero=>({...hero,hp:0}))};
    expect(dungeonItem(defeated,{...command,...dungeonBoundary(defeated)})).toEqual({ok:false,reason:'wrongContext'});
  });
});
describe('dungeon persistence',()=>{
  it('treats only both missing dungeon slots as empty',()=>{
    const missing={status:'missing' as const,text:null};
    const unavailable={status:'unavailable' as const,text:null};
    const invalid={status:'invalid' as const,text:'broken',reason:'corrupt'};
    const valid={status:'valid' as const,text:'backup-only',state:fresh()};
    expect(bothDungeonSlotsMissing({primary:missing,backup:missing})).toBe(true);
    expect(bothDungeonSlotsMissing({primary:unavailable,backup:missing})).toBe(false);
    expect(bothDungeonSlotsMissing({primary:missing,backup:unavailable})).toBe(false);
    expect(bothDungeonSlotsMissing({primary:unavailable,backup:unavailable})).toBe(false);
    expect(bothDungeonSlotsMissing({primary:missing,backup:valid})).toBe(false);
    expect(bothDungeonSlotsMissing({primary:invalid,backup:missing})).toBe(false);
  });
  it('preserves other namespaces, corrupt bytes, backup and compare-before-removal',()=>{
    const m=memory();m.setItem('tactics-guru:phaser:run:primary:v1','old-run');const store=createDungeonStorage(()=>m);
    expect(store.save(fresh()).ok).toBe(true);expect(store.inspect().primary.status).toBe('valid');
    m.setItem(DUNGEON_KEYS.primary,'corrupt');expect(store.save(fresh()).ok).toBe(false);expect(m.getItem(DUNGEON_KEYS.primary)).toBe('corrupt');
    expect(store.remove('primary','old').ok).toBe(false);expect(store.remove('primary','corrupt').ok).toBe(true);expect(store.inspect().backup.status).toBe('valid');
    expect(m.getItem('tactics-guru:phaser:run:primary:v1')).toBe('old-run');
  });
  it('does not share inspected state across cached reads and detects changed bytes',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),state=fresh();expect(store.save(state).ok).toBe(true);
    const first=store.inspect().primary;if(first.status!=='valid')throw Error('Expected valid save');
    (first.state.party[0] as {hp:number}).hp=0;
    const again=store.inspect().primary;if(again.status!=='valid')throw Error('Expected valid save');
    expect(again.state).toEqual(state);
    m.setItem(DUNGEON_KEYS.primary,'corrupt');expect(store.inspect().primary.status).toBe('invalid');
    const replacement=encodeDungeon(freshDungeon('replacement',20));if(!replacement.ok)throw Error(replacement.reason);
    m.setItem(DUNGEON_KEYS.primary,replacement.text);const changed=store.inspect().primary;
    expect(changed.status).toBe('valid');if(changed.status==='valid')expect(changed.state.id).toBe('replacement');
  });
  it('does not publish travel on quota failure and can explicitly recover',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),s=atStairApproach(clearFloor(fresh()));expect(store.save(s).ok).toBe(true);
    const session=new DungeonSession(s,store),before=session.snapshot;const write=m.setItem;
    m.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
    expect(enterStairs(session)).toBe(false);expect(session.snapshot).toEqual(before);expect(store.inspect().primary.status).toBe('valid');
    m.setItem=write;expect(session.retry(session.inspect())).toBe(true);expect(enterStairs(session)).toBe(true);expect(session.snapshot.depth).toBe(2);
  });
  it('requires explicit recovery after uncertain primary writes',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),s=atStairApproach(clearFloor(fresh()));store.save(s);const session=new DungeonSession(s,store);
    const read=m.getItem;let failRead=false;
    m.setItem=(k,v)=>{m.values.set(k,v);if(k===DUNGEON_KEYS.primary)failRead=true;};
    m.getItem=k=>{if(failRead&&k===DUNGEON_KEYS.primary)throw Error('readback');return read(k);};
    expect(enterStairs(session)).toBe(false);expect(session.snapshot.depth).toBe(1);
    failRead=false;expect(enterStairs(session)).toBe(false);
    expect(session.continue(session.inspect())).toBe(true);expect(session.snapshot.depth).toBe(2);
  });
  it('allows explicit unsaved battles but blocks travel and disposes stale sessions',()=>{
    const session=new DungeonSession(atStairApproach(clearFloor(fresh())),createDungeonStorage(()=>null));session.playUnsaved();
    expect(enterStairs(session)).toBe(false);
    const playing=new DungeonSession(atEncounter(fresh()),createDungeonStorage(()=>memory())),battle=playing.startEncounter()!;playing.dispose();
    expect(battle.phase).toBe('disposed');expect(playing.startEncounter()).toBe(null);
  });
});

describe('dungeon recovery limits',()=>{
  it('keeps primary recoverable on backup-write/security failures and changed reset slots',async()=>{
    const m=memory(),store=createDungeonStorage(()=>m),s=clearFloor(fresh());store.save(s);const original=m.getItem(DUNGEON_KEYS.primary);
    const write=m.setItem;m.setItem=(k,v)=>{if(k===DUNGEON_KEYS.backup)throw Object.assign(Error('denied'),{name:'SecurityError'});write(k,v);};
    expect(store.save(s)).toEqual({ok:false,reason:'security'});expect(m.getItem(DUNGEON_KEYS.primary)).toBe(original);
    m.setItem=write;const session=new DungeonSession(s,store),review=session.inspect();m.setItem(DUNGEON_KEYS.backup,'changed while reviewing');
    expect(await session.replace(review,'replacement-dungeon',14)).toBe(false);expect(session.snapshot).toEqual(s);expect(session.exports(session.inspect()).some(v=>v.text===original)).toBe(true);
    expect(m.getItem(DUNGEON_KEYS.backup)).toBe('changed while reviewing');expect(m.getItem(DUNGEON_KEYS.primary)).toBe(original);
  });
  it('rejects incompatible and tampered envelopes without replacing raw bytes',()=>{
    const encoded=encodeDungeon(fresh());if(!encoded.ok)throw Error(encoded.reason);
    const value=JSON.parse(encoded.text);expect(decodeDungeon(JSON.stringify({...value,format:99}))).toEqual({ok:false,reason:'incompatible'});
    expect(decodeDungeon(JSON.stringify({...value,digest:'sha256:'+'0'.repeat(64)}))).toEqual({ok:false,reason:'digest'});
  });
  it('preserves every visited floor until the byte budget explicitly refuses the candidate',()=>{
    const base=fresh(),floors=Array.from({length:400},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1);return {descriptor,position:descriptor.downstairs,exploration:freshExploration(descriptor.seed,descriptor.downstairs,floorMap(descriptor)),completed:3};});
    const s={...base,depth:400,floors,revision:4000};expect(readDungeon(s).ok).toBe(true);
    expect(encodeDungeon(s)).toEqual({ok:false,reason:'tooLarge'});expect(s.floors).toHaveLength(400);
    expect(s.phase).toBe('ready');expect(s.floors[0].descriptor).toEqual(base.floors[0].descriptor);
  },60000);
});

describe('pre-progression save preservation',()=>{
  it.each([1,2,3] as const)('rejects old format %i without changing raw storage',format=>{
    const base=freshDungeon('old-progress',13,LEGACY_ENCOUNTER_POLICY);
    // Exact old format-3 wire shape: keep its policy/plans, strip only new hero fields.
    const oldBody={kind:'tactics-guru:dungeon',format:3,identity:dungeonIdentity,payload:{...base,party:base.party.map(({heroId,hp})=>({heroId,hp}))}};
    const raw=format===3?canonical({...oldBody,digest:hashJson(oldBody)}):priorDungeonEnvelope(base,format);
    expect(decodeDungeon(raw)).toEqual({ok:false,reason:'incompatible'});
    const m=memory();m.setItem(DUNGEON_KEYS.primary,raw);
    expect(createDungeonStorage(()=>m).inspect().primary.status).toBe('invalid');
    expect(m.getItem(DUNGEON_KEYS.primary)).toBe(raw);
  });
});
describe('durable encounter policies', () => {
  it('cold-decodes a bounded progression-format history by resolving only the current floor', async () => {
    const base=freshDungeon('cold-current',13),floors=Array.from({length:250},(_,i)=>{
      const descriptor=floorDescriptor(base.seed,i+1);
      return {descriptor,completed:i===249?0:3,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor))};
    });
    const state={...base,depth:250,floors},encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
    expect(utf8Bytes(encoded.text)).toBeLessThan(1024*1024);
    vi.resetModules();
    const coldFields=await import('../../src/domain/battlefield'),coldEnvelope=await import('../../src/domain/dungeonSaveEnvelope');
    const resolver=vi.spyOn(coldFields,'resolveBattlefield');
    try {
      const begin=performance.now(),decoded=coldEnvelope.decodeDungeon(encoded.text);
      console.info(JSON.stringify({format:JSON.parse(encoded.text).format,floors:250,bytes:utf8Bytes(encoded.text),decodeMs:performance.now()-begin,resolutions:resolver.mock.calls.length}));
      expect(decoded).toEqual({ok:true,state});expect(resolver).toHaveBeenCalledTimes(3);
      expect(encodeDungeon(decoded.ok?decoded.state:null)).toEqual(encoded);
    } finally {resolver.mockRestore();}
  },60000);
  it('rejects historical source mismatches immediately and geometry tampering before travel is published', () => {
    const base=freshDungeon('lazy-history',43),first=base.floors[0],descriptor=floorDescriptor(base.seed,2);
    const state={...base,depth:2,floors:[{...first,completed:3},{descriptor,completed:0,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor))}]};
    for(const field of ['encounterId','mapId','layoutSeed']) {
      const bad=JSON.parse(JSON.stringify(state)),battlefield=bad.floors[0].descriptor.encounters[0].battlefield;
      expect(battlefield.kind).toBe('generated');
      if(field==='layoutSeed')battlefield.layoutSeed=(battlefield.layoutSeed+1)>>>0;
      else battlefield[field]=field==='mapId'?'map:unknown':'encounter:unknown';
      expect(readDungeon(bad).ok).toBe(false);
    }
    const historical=JSON.parse(JSON.stringify(state));historical.floors[0].descriptor.encounters[0].battlefield.mapHash='sha256:'+'0'.repeat(64);
    const checked=good(readDungeon(historical)),encoded=encodeDungeon(checked);if(!encoded.ok)throw Error(encoded.reason);
    const m=memory();m.setItem(DUNGEON_KEYS.primary,encoded.text);
    const session=new DungeonSession(atStairApproach(checked,'ascend'),createDungeonStorage(()=>m)),before=session.snapshot;
    expect(enterStairs(session,'ascend')).toBe(false);expect(session.snapshot).toEqual(before);
    expect(m.getItem(DUNGEON_KEYS.primary)).toBe(encoded.text);
  });

  it('reuses admitted facts across a long retained floor history', () => {
    const base=fresh(),floors=Array.from({length:44},(_,i)=>{
      const descriptor=floorDescriptor(base.seed,i+1);
      return {descriptor,completed:3,position:descriptor.downstairs,exploration:freshExploration(descriptor.seed,descriptor.downstairs,floorMap(descriptor))};
    });
    const state={...base,depth:44,floors};
    good(readDungeon(state));
    const resolver=vi.spyOn(battlefields,'resolveBattlefield');
    try {good(readDungeon(state));expect(resolver.mock.calls.length).toBeLessThan(10);}
    finally {resolver.mockRestore();}
  },15000);
  it('resolves saved admitted definitions without selecting a map again', () => {
    let base = freshDungeon('saved-choice', 0);
    for (let seed = 1; base.floors[0].descriptor.biome !== 'forest-v1'; seed++) base = freshDungeon('saved-choice', seed);
    const descriptor = base.floors[0].descriptor, original = descriptor.encounters[0].selection;
    if (original.policy === LEGACY_ENCOUNTER_POLICY) throw Error('Expected new policy');
    const map = dungeonEncounterCatalog.pools.find(p => p.id === 'forest')!.maps.find(m => m.id !== original.mapId)!;
    const composition = dungeonEncounterCatalog.compositions.find(c => c.id === map.compositionIds[0])!;
    const selection = { ...original, mapId: map.id, compositionId: composition.id, encounter: { id:`encounter:${map.id}` as const,source:map.source,roster:composition.roster } };
    const resolved = resolveBattlefield(selection.encounter,dungeonSeed(base.seed,1,'battle',0),dungeonBattleCatalog);if(!resolved.ok)throw Error('Pairing invalid');
    const saved = { ...base, floors:[{...base.floors[0],descriptor:{...descriptor,encounters:[{selection,battlefield:resolved.descriptor},...descriptor.encounters.slice(1)]}}] };
    const read = good(readDungeon(saved)); expect(read.floors[0].descriptor.encounters[0].selection).toEqual(selection);
    expect(dungeonBattle(read)!.state.mapId).toBe(resolved.map.id);
  });
  it('keeps fully resolved legacy-policy descriptors compatible with deferred legacy entry', () => {
    const base=freshDungeon('resolved-legacy',13,LEGACY_ENCOUNTER_POLICY),floor=base.floors[0];
    const encounters=floor.descriptor.encounters.map((plan,slot)=>{
      const resolved=resolveBattlefield(plan.selection.encounter,dungeonSeed(base.seed,1,'battle',slot),dungeonContent.catalog);
      if(!resolved.ok)throw Error('Invalid legacy pairing');return {...plan,battlefield:resolved.descriptor};
    });
    const state={...base,floors:[{...floor,descriptor:{...floor.descriptor,encounters}}]};
    const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
    const decoded=good(decodeDungeon(encoded.text));expect(decoded).toEqual(state);
    expect(dungeonBattle(decoded)).toEqual(dungeonBattle(base));
    const corrupted=JSON.parse(JSON.stringify(state));corrupted.floors[0].descriptor.encounters[0].battlefield.mapHash='sha256:'+'0'.repeat(64);
    expect(readDungeon(corrupted).ok).toBe(false);
  });
  it.each(['policy', 'catalog', 'kind', 'depth', 'pool', 'composition', 'boss', 'roster', 'source', 'hash', 'version', 'deferred'])('rejects tampered %s facts and retains raw recovery bytes', field => {
    const encoded = encodeDungeon(fresh()); if (!encoded.ok) throw Error(encoded.reason);
    const envelope = JSON.parse(encoded.text), plan = envelope.payload.floors[0].descriptor.encounters[field === 'boss' ? 2 : 0], selection = plan.selection;
    if (field === 'policy') envelope.payload.encounterPolicy = 'future';
    if (field === 'catalog') selection.catalogIdentity = 'sha256:' + '0'.repeat(64);
    if (field === 'kind') selection.kind = 'vault';
    if (field === 'depth') selection.depth++;
    if (field === 'pool') selection.poolId = 'unknown';
    if (field === 'composition') selection.compositionId = 'unknown';
    if (field === 'boss') selection.bossId = null;
    if (field === 'roster') selection.encounter.roster[0].x++;
    if (field === 'source') selection.encounter.source = { kind: 'authored', mapId: 'map:unknown' };
    if (field === 'hash') plan.battlefield.mapHash = 'sha256:' + '0'.repeat(64);
    if (field === 'deferred') plan.battlefield = null;
    if (field === 'version') selection.scalingPolicy = 'enemy-depth-v2';
    const { digest, ...body } = envelope, raw = canonical({ ...body, digest: hashJson(body) });
    const m = memory(); m.setItem(DUNGEON_KEYS.primary, raw);
    const inspected = createDungeonStorage(() => m).inspect().primary;
    expect(inspected.status).toBe('invalid'); expect(inspected.text).toBe(raw); expect(m.getItem(DUNGEON_KEYS.primary)).toBe(raw);
  });


  it('retains all floor choices through travel, revisit and damage without compounding', () => {
    const first = clearFloor(fresh()), next = good(travelDungeon(first, 'descend', first.revision));
    expect(next.floors[1].descriptor.biome).not.toBe(first.floors[0].descriptor.biome);
    const started = good(startDungeonBattle(atEncounter(next))), built = dungeonBattle(started)!;
    expect(dungeonBattle(started)).toEqual(built);
    const enemy = built.state.units.find(u => u.side === 'enemy')!;
    const damaged = { ...started, activeBattle: { ...started.activeBattle!, units: started.activeBattle!.units.map(u => u.id === enemy.id ? { ...u, hp: u.hp - 1 } : u) } };
    const encoded = encodeDungeon(damaged); if (!encoded.ok) throw Error(encoded.reason);
    const resumed = good(decodeDungeon(encoded.text)); expect(resumed).toEqual(damaged);
    expect(dungeonBattle(resumed)!.catalog).toEqual(built.catalog);
    expect(resumed.activeBattle!.units.find(u => u.id === enemy.id)!.hp).toBe(enemy.hp - 1);
    const back = good(travelDungeon(next, 'ascend', next.revision)), revisit = good(travelDungeon(back, 'descend', back.revision));
    expect(revisit.floors).toEqual(next.floors); expect(revisit.ownership).toEqual(next.ownership);
  });

  it('requires the entire guardian roster, then completes exactly once', () => {
    let state = fresh();
    for (let slot = 0; slot < 2; slot++) { state = win(state); state = good(dungeonItem(state, { ...dungeonBoundary(state), type: 'claimReward', offerId: state.offer!.id, itemId: state.offer!.options[0].itemId })); }
    state = good(startDungeonBattle(atEncounter(state)));
    const battle = state.activeBattle!, firstEnemy = battle.units.find(u => u.side === 'enemy')!;
    const partial = good(acceptDungeonBattle(state, { ...battle, units: battle.units.map(u => u.id === firstEnemy.id ? { ...u, hp: 0 } : u) }));
    expect(partial.floors[0].completed).toBe(2); expect(travelDungeon(partial, 'descend', partial.revision).ok).toBe(false);
    const victory = good(acceptDungeonBattle(partial, { ...partial.activeBattle!, outcome: 'playerWin', units: partial.activeBattle!.units.map(u => u.side === 'enemy' ? { ...u, hp: 0 } : u) }));
    expect(victory.floors[0].completed).toBe(3); expect(victory.offer).toBeNull();
    expect(acceptDungeonBattle(victory, battle)).toEqual({ ok: false, reason: 'staleBoundary' });
  });
});

describe('confirmed dungeon charm disposal',()=>{
  it('frees equipped capacity once, preserves the offer/RNG and persists the separate reward claim',()=>{
    const original=dungeonCapacityFixture(),instanceId=original.ownership.equipment[0].instanceId;
    const command={...dungeonBoundary(original),type:'discardEquipment' as const,instanceId};
    const previousBattle=dungeonBattle(original)!;
    const discarded=good(dungeonItem(original,command));
    expect(discarded.ownership.equipment).toHaveLength(5);expect(discarded.ownership.assignments).toEqual([]);
    expect(discarded.ownership.equipment.some(e=>e.instanceId===instanceId)).toBe(false);
    expect(discarded.offer).toEqual(original.offer);expect(discarded.party).toEqual(original.party);expect(discarded.floors).toEqual(original.floors);
    expect(discarded.phase).toBe('reward');expect(discarded.revision).toBe(original.revision+1);
    const afterBattle=dungeonBattle(discarded)!;
    expect(afterBattle.state.rng).toEqual(previousBattle.state.rng);
    expect(afterBattle.catalog.heroes.fighter.stats.armorClass).toBe(dungeonContent.catalog.heroes.fighter.stats.armorClass);
    expect(dungeonItem(discarded,command)).toEqual({ok:false,reason:'staleBoundary'});
    const encoded=encodeDungeon(discarded);if(!encoded.ok)throw Error(encoded.reason);expect(decodeDungeon(encoded.text)).toEqual({ok:true,state:discarded});
    const claimed=good(dungeonItem(discarded,{...dungeonBoundary(discarded),type:'claimReward',offerId:discarded.offer!.id,itemId:discarded.offer!.options[0].itemId}));
    expect(claimed.ownership.equipment).toHaveLength(6);expect(claimed.phase).toBe('ready');expect(claimed.offer).toBeNull();expect(claimed.ownership.equipment.some(e=>e.instanceId===instanceId)).toBe(false);
  });
  it('rejects unowned/malformed/battle/defeat commands without mutation',()=>{
    const original=dungeonCapacityFixture(),instanceId=original.ownership.equipment[0].instanceId,command={...dungeonBoundary(original),type:'discardEquipment' as const,instanceId};
    const before=JSON.stringify(original);
    expect(dungeonItem(original,{...command,instanceId:'unowned'})).toEqual({ok:false,reason:'notOwned'});
    expect(dungeonItem(original,{...command,heroId:'fighter'} as unknown as typeof command)).toEqual({ok:false,reason:'invalidCommand'});
    expect(JSON.stringify(original)).toBe(before);
    const battle=good(startDungeonBattle(atEncounter({...original,phase:'ready',offer:null})));
    expect(dungeonItem(battle,{...command,...dungeonBoundary(battle)})).toEqual({ok:false,reason:'wrongContext'});
    const state=battle.activeBattle!,defeated=good(acceptDungeonBattle(battle,{...state,outcome:'playerLoss',units:state.units.map(u=>u.side==='player'?{...u,hp:0}:u)}));
    expect(dungeonItem(defeated,{...command,...dungeonBoundary(defeated)})).toEqual({ok:false,reason:'wrongContext'});
  });
  it('saves confirmed disposal through the existing session and reports failed saving honestly',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),initial=dungeonCapacityFixture();store.save(initial);
    const session=new DungeonSession(initial,store),command={...dungeonBoundary(initial),type:'discardEquipment' as const,instanceId:initial.ownership.equipment[0].instanceId};
    expect(session.dispatch(command)).toBe(true);const primary=store.inspect().primary;if(primary.status!=='valid')throw Error('Save invalid');expect(primary.state).toEqual(session.snapshot);
    m.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
    const current=session.snapshot;expect(session.dispatch({...dungeonBoundary(current),type:'discardEquipment',instanceId:current.ownership.equipment[0].instanceId})).toBe(true);
    expect(session.snapshot.ownership.equipment).toHaveLength(4);expect(session.status).toContain('unsaved');
  });
});

describe('unordered encounters and moving dungeon enemies', () => {
  it.each([0,1,2])('holds slot %i in contact range and enters its battle on the next step across save/reload', slot => {
    for (let seed=0;seed<20;seed++) {
      const {state,approach,target}=dungeonContactApproach(slot,seed);
      const step=(s:DungeonState,destination:number)=>good(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination}));
      const adjacent=step(state,approach), floor=adjacent.floors[0];
      expect(adjacent.phase).toBe('ready');
      expect(poiCell(floor.exploration.pois[slot])).toBe(target);
      expect(new Set(floor.exploration.pois.map(p => poiCell(p))).size).toBe(3);
      expect(floor.exploration.movement!.step).toBe(1);
      expect(adjacent.revision).toBe(state.revision+1);
      const encoded=encodeDungeon(adjacent);assert(encoded.ok);
      const restored=decodeDungeon(encoded.text);assert(restored.ok);
      const entered=step(restored.state,target);
      expect(entered.phase).toBe('battle');
      expect(entered.floors[0].exploration.active).toBe(slot);
      expect(entered.activeBattle!.seed).toBe(dungeonSeed(state.seed,1,'battle',slot));
      expect(entered.revision).toBe(state.revision+2);
      expect(entered.floors[0].exploration.movement!.step).toBe(1);
    }
  },20000);

  const move = (s: DungeonState) => {
    const f=s.floors[s.depth-1], map=generateMap(f.descriptor.seed,'rooms');
    const destination=neighbors(f.position).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n&&!clearedDungeonSlots(f).includes(p.encounterSlot)));
    if(destination===undefined)throw Error('No safe step');
    return good(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination}));
  };
  it('protects displayed upstairs from a passive enemy during a real player step', () => {
    let tested=false;
    for(let seed=0;seed<200&&!tested;seed++) {
      const base=freshDungeon('protected-stair',seed), descriptor=floorDescriptor(seed,2), map=floorMap(descriptor);
      const stair=descriptor.upstairs, adjacent=neighbors(stair,map.width,map.height).find(n=>map.cells[n]);if(adjacent===undefined)continue;
      const initial=freshExploration(descriptor.seed,stair,map), exploration=movableExploration(initial,descriptor.seed,0,'ready');
      const others=exploration.pois.slice(1);if(others.some(p=>poiCell(p,map.width)===adjacent))continue;
      const pois=exploration.pois.map((p,i)=>i===0?{...p,x:adjacent%map.width,y:Math.floor(adjacent/map.width)}:p);
      for(const from of map.cells.flatMap((c,i)=>c?[i]:[])) {
        const dest=neighbors(from,map.width,map.height).find(n=>map.cells[n]&&n!==stair&&!pois.some(p=>poiCell(p,map.width)===n));
        if(dest===undefined||pois.some(p=>poiCell(p,map.width)===from))continue;
        const player={id:'player' as const,kind:'player' as const,x:dest%map.width,y:Math.floor(dest/map.width)};
        const raw=stepMovement({world:{map:applyBiome(map),placementVersion:'markers-v1',markers:[player,...pois]},behaviors:DEFAULT_BEHAVIORS,rng:exploration.movement!.rng,step:0});
        if(poiCell(raw.world.markers[1] as typeof pois[number],map.width)!==stair)continue;
        const state=atCell({...base,depth:2,floors:[{...base.floors[0],completed:3},{descriptor,position:stair,completed:0,exploration:{...exploration,pois}}]},from);
        if(!readDungeon(state).ok)continue;
        const result=good(stepDungeon(state,{id:state.id,depth:2,revision:state.revision,destination:dest}));
        expect(poiCell(result.floors[1].exploration.pois[0],map.width)).not.toBe(stair);
        expect(result.floors[1].exploration.movement!.step).toBe(1);
        tested=true;break;
      }
    }
    expect(tested).toBe(true);
  });
  it('enters and clears slots 2, 0, 1 with the matching battle, rewards and save continuation', () => {
    let s = fresh();
    for (const [ordinal,slot] of [2,0,1].entries()) {
      const f=s.floors[0], target=f.exploration.pois[slot], cell=target.y*20+target.x;
      const map=generateMap(f.descriptor.seed,'rooms');
      const previous=neighbors(cell).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>p.y*20+p.x===n));
      if (previous===undefined) throw Error('No safe approach');
      s=atCell(s,previous);
      s=good(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination:cell}));
      expect(s.phase).toBe('battle');
      expect(s.floors[0].exploration.active).toBe(slot);
      expect(s.activeBattle!.seed).toBe(dungeonSeed(s.seed,s.depth,'battle',slot));
      const encoded=encodeDungeon(s);if(!encoded.ok)throw Error(encoded.reason);
      const decoded=decodeDungeon(encoded.text);if(!decoded.ok)throw Error(decoded.reason);s=decoded.state;
      const battle=s.activeBattle!;
      s=good(acceptDungeonBattle(s,{...battle,outcome:'playerWin',units:battle.units.map(u=>u.side==='enemy'?{...u,hp:0}:u)}));
      expect(s.floors[0].completed).toBe(ordinal+1);
      expect(s.floors[0].exploration.cleared).toEqual([2,0,1].slice(0,ordinal+1).sort());
      if(s.offer) s=good(dungeonItem(s,{...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:s.offer.options[0].itemId}));
      s=atCell(s,previous);
      s=good(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination:cell}));
      expect(s.phase).toBe('ready');
      const saved=encodeDungeon(s);if(!saved.ok)throw Error(saved.reason);
      const loaded=decodeDungeon(saved.text);if(!loaded.ok)throw Error(loaded.reason);s=loaded.state;
    }
    expect(s.floors[0].completed).toBe(3);
  });
  it('persists reproducible motion without moving cleared enemies or consuming battle RNG', () => {
    const initial=fresh(), first=move(initial);
    expect(first.floors[0].exploration.version).toBe('exploration-v2');
    expect(first.floors[0].exploration.movement!.step).toBe(1);
    expect(first).toEqual(move(initial));
    expect(first.floors[0].descriptor).toEqual(initial.floors[0].descriptor);
    const encoded=encodeDungeon(first);if(!encoded.ok)throw Error(encoded.reason);
    const loaded=decodeDungeon(encoded.text);if(!loaded.ok)throw Error(loaded.reason);
    expect(move(loaded.state)).toEqual(move(first));
    expect(initial.floors[0].exploration.version).toBe('exploration-v1');
    const unmovedBattle=good(startDungeonBattle(atEncounter(initial,0)));
    const movedBattle=good(startDungeonBattle(atEncounter(first,0)));
    expect(movedBattle.activeBattle).toEqual(unmovedBattle.activeBattle);
  });
  it('keeps cleared markers stationary and preserves a ready encounter under the player', () => {
    let s=fresh();
    s=good(startDungeonBattle(atEncounter(s,2)));
    const battle=s.activeBattle!;
    s=good(acceptDungeonBattle(s,{...battle,outcome:'playerWin',units:battle.units.map(u=>u.side==='enemy'?{...u,hp:0}:u)}));
    if(s.offer)s=good(dungeonItem(s,{...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:s.offer.options[0].itemId}));
    const cleared=s.floors[0].exploration.pois[2];
    for(let i=0;i<5;i++) {s=move(s);expect(s.floors[0].exploration.pois[2]).toEqual(cleared);}
    const beforeRejected = structuredClone(s);
    expect(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination:-1})).toEqual({ok:false,reason:'blockedStep'});
    expect(s).toEqual(beforeRejected);
    expect(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision-1,destination:-1})).toEqual({ok:false,reason:'staleBoundary'});
  });
  it('rejects malformed movable markers, completion state and RNG rather than admitting unsafe saves', () => {
    const state=move(fresh()), f=state.floors[0], e=f.exploration;
    const attempt=(exploration:typeof e)=>readDungeon({...state,floors:[{...f,exploration}]});
    const overlap=e.pois.map((p,i)=>i===1?{...p,x:e.pois[0].x,y:e.pois[0].y}:p);
    expect(attempt({...e,pois:overlap}).ok).toBe(false);
    expect(attempt({...e,cleared:[2,2]}).ok).toBe(false);
    expect(attempt({...e,cleared:[2]}).ok).toBe(false);
    expect(attempt({...e,active:2}).ok).toBe(false);
    expect(attempt({...e,movement:{...e.movement!,step:-1}}).ok).toBe(false);
  });
  it('continues a current-format legacy-exploration active battle and upgrades movement after victory', () => {
    const initial=fresh(), started=good(startDungeonBattle(atEncounter(initial,0)));
    const oldExploration={...initial.floors[0].exploration,revealed:started.floors[0].exploration.revealed,visited:started.floors[0].exploration.visited};
    const legacyState=withLegacySight({...started,floors:[{...started.floors[0],exploration:oldExploration}]});
    const body={kind:'tactics-guru:dungeon',format:9,identity:hashJson({dungeonIdentity:previousDungeonIdentity,progression:HERO_PROGRESSION}),payload:legacyState};
    const legacy=decodeDungeon(canonical({...body,digest:hashJson(body)}));if(!legacy.ok)throw Error(legacy.reason);
    const battle=legacy.state.activeBattle!;
    const won=good(acceptDungeonBattle(legacy.state,{...battle,outcome:'playerWin',units:battle.units.map(u=>u.side==='enemy'?{...u,hp:0}:u)}));
    expect(won.floors[0].exploration.version).toBe('exploration-v2');
    expect(won.floors[0].exploration.cleared).toEqual([0]);
    expect(won.floors[0].exploration.active).toBe(0);
    expect(won.offer).not.toBeNull();
  });
  it('refuses an automatic movement write after another tab changes the saved dungeon', () => {
    const m=memory(), initial=fresh(), firstStore=createDungeonStorage(()=>m), secondStore=createDungeonStorage(()=>m);
    expect(firstStore.save(initial).ok).toBe(true);
    const first=new DungeonSession(initial,firstStore), second=new DungeonSession(initial,secondStore);
    expect(first.continue(first.inspect())).toBe(true);expect(second.continue(second.inspect())).toBe(true);
    const before=second.snapshot, destination=move(before).floors[0].position;expect(first.step({id:before.id,depth:before.depth,revision:before.revision,destination})).toBe(true);
    const primary=m.getItem(DUNGEON_KEYS.primary),backup=m.getItem(DUNGEON_KEYS.backup);
    expect(second.step({id:before.id,depth:before.depth,revision:before.revision,destination})).toBe(false);expect(second.snapshot).toEqual(before);
    expect(second.status).toContain('changed');
    expect(m.getItem(DUNGEON_KEYS.primary)).toBe(primary);expect(m.getItem(DUNGEON_KEYS.backup)).toBe(backup);
    expect(second.retry(second.inspect())).toBe(true); // Explicit recovery adopts the reviewed storage boundary.
  });
  it('reads current-format legacy exploration and upgrades its movement state only after a step', () => {
    const s=withLegacySight(fresh()), body={kind:'tactics-guru:dungeon',format:9,identity:hashJson({dungeonIdentity:previousDungeonIdentity,progression:HERO_PROGRESSION}),payload:s};
    const legacy=decodeDungeon(canonical({...body,digest:hashJson(body)}));
    if(!legacy.ok)throw Error(legacy.reason);
    expect(legacy.state.floors[0].exploration.version).toBe('exploration-v1');
    const upgraded=move(legacy.state);
    const next=encodeDungeon(upgraded);if(!next.ok)throw Error(next.reason);
    expect(JSON.parse(next.text).format).toBe(14);
    expect(decodeDungeon(next.text)).toEqual({ok:true,state:upgraded});
    for(const format of [7,8]){
      const old={...body,format};expect(decodeDungeon(canonical({...old,digest:hashJson(old)}))).toEqual({ok:false,reason:'incompatible'});
    }
  });
});

describe('authoritative unsaved departure state',()=>{
  it('survives rejected commands and clears only after successful recovery saving',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),session=new DungeonSession(fresh(),store);
    session.playUnsaved();
    const before=session.snapshot;
    expect(session.step({id:before.id,depth:before.depth,revision:before.revision,destination:-1})).toBe(false);
    expect(session.status).toContain('Movement refused');
    expect(session.hasUnsavedProgress).toBe(true);
    expect(session.retry(session.inspect())).toBe(true);
    expect(session.hasUnsavedProgress).toBe(false);
    const saved=session.snapshot;
    session.step({id:saved.id,depth:saved.depth,revision:saved.revision,destination:-1});
    expect(session.hasUnsavedProgress).toBe(false);
  });
  it('retains unsaved state after failed replacement saving and unrelated feedback',async()=>{
    const m=memory(),store=createDungeonStorage(()=>m),session=new DungeonSession(fresh(),store);
    expect(session.save()).toBe(true);
    expect(session.hasUnsavedProgress).toBe(false);
    const setItem=m.setItem;
    m.setItem=()=>{throw new DOMException('full','QuotaExceededError');};
    const review=session.inspect();
    expect(await session.replace(review,'replacement-unsaved',session.snapshot.seed+1)).toBe(true);
    const before=session.snapshot;
    session.step({id:before.id,depth:before.depth,revision:before.revision,destination:-1});
    expect(session.status).toContain('Movement refused');
    expect(session.hasUnsavedProgress).toBe(true);
    m.setItem=setItem;
    expect(session.retry(session.inspect())).toBe(true);
    expect(session.hasUnsavedProgress).toBe(false);
    expect(session.remove('primary',session.inspect())).toBe(true);
    expect(session.hasUnsavedProgress).toBe(true);
  });
  it('adopts a valid saved dungeon without an unsaved warning',()=>{
    const m=memory(),store=createDungeonStorage(()=>m);expect(store.save(fresh()).ok).toBe(true);
    const session=new DungeonSession(fresh(),store);
    expect(session.continue(session.inspect())).toBe(true);
    expect(session.hasUnsavedProgress).toBe(false);
  });
});

describe('versioned floor dimensions', () => {
  it.each([2, 5])('holds and reserves an adjacent encounter on a depth-%i Arena floor across reload', depth => {
    const base = freshDungeon(`wide-contact-${depth}`, 2);
    const floors = Array.from({length:depth}, (_,i) => {
      const descriptor = floorDescriptor(base.seed, i + 1), map = floorMap(descriptor);
      return {descriptor, position:descriptor.upstairs, completed:i === depth - 1 ? 0 : 3,
        exploration:freshExploration(descriptor.seed, descriptor.upstairs, map)};
    });
    const floor = floors[depth - 1], map = floorMap(floor.descriptor), width = map.width;
    expect(map.type).toBe('arena');
    expect(width).toBe(depth === 2 ? 24 : 36);
    const from = 10 * width + 9, approach = from + 1, target = approach + 1;
    const exploration = movableExploration(freshExploration(floor.descriptor.seed, from, map), floor.descriptor.seed, 0, 'ready');
    // The blocker is directly behind the held wanderer, so its shortest approach
    // would enter the reserved cell if held markers lost their occupancy.
    const positions = [{x:11,y:10}, {x:3,y:3}, {x:12,y:10}];
    floors[depth - 1] = {...floor, position:from, exploration:{...exploration,
      pois:exploration.pois.map((poi,i) => ({...poi,...positions[i]}))}};
    const state = good(readDungeon({...base,depth,floors}));
    const adjacent = good(stepDungeon(state,{id:state.id,depth,revision:state.revision,destination:approach}));
    const current = adjacent.floors[depth - 1];
    expect(adjacent.phase).toBe('ready');
    expect(poiCell(current.exploration.pois[0],width)).toBe(target);
    expect(new Set(current.exploration.pois.map(poi => poiCell(poi,width))).size).toBe(3);
    expect(poiCell(current.exploration.pois[2],width)).not.toBe(target);
    expect(current.exploration.movement!.step).toBe(1);
    const encoded = encodeDungeon(adjacent); assert(encoded.ok);
    const restored = good(decodeDungeon(encoded.text));
    const entered = good(stepDungeon(restored,{id:state.id,depth,revision:restored.revision,destination:target}));
    expect(entered.phase).toBe('battle');
    expect(entered.floors[depth - 1].exploration.active).toBe(0);
    expect(entered.floors[depth - 1].exploration.movement!.step).toBe(1);
    expect(entered.activeBattle!.seed).toBe(dungeonSeed(state.seed,depth,'battle',0));
  });
  it.each([9, 10])('retains a format-%i rooms-v1 history through movement and revisit, then grows only a new floor', format => {
    const base = freshDungeon('legacy-room-history', 13);
    const floors = Array.from({length:2}, (_,i) => {
      const {size:_size,...selected} = floorDescriptor(base.seed, i + 1);
      const map = generateMap(selected.seed,'rooms');
      const descriptor = {...selected, generator:'rooms-v1' as const, mapHash:hashJson(map),
        upstairs:map.cells.indexOf(1), downstairs:map.cells.lastIndexOf(1)};
      return {descriptor, position:descriptor.upstairs, completed:3,
        exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};
    });
    const original = withLegacySight({...base,depth:2,floors}), descriptors = floors.map(floor => floor.descriptor);
    const body = {kind:'tactics-guru:dungeon',format,
      identity:hashJson({dungeonIdentity:format === 9 ? previousDungeonIdentity : dungeonIdentity,progression:HERO_PROGRESSION}),payload:original};
    const raw = canonical({...body,digest:hashJson(body)}), m = memory();
    m.setItem(DUNGEON_KEYS.primary,raw);
    const storage = createDungeonStorage(()=>m), inspected = storage.inspect().primary;
    assert(inspected.status === 'valid');
    expect(inspected.state).toEqual(original);
    expect(inspected.text).toBe(raw);
    const floor = inspected.state.floors[1], map = floorMap(floor.descriptor);
    expect(map.width).toBe(20);
    expect(floor.descriptor).not.toHaveProperty('size');
    const destination = neighbors(floor.position,map.width,map.height).find(cell => map.cells[cell]);
    assert(destination !== undefined);
    const moved = good(stepDungeon(inspected.state,{id:base.id,depth:2,revision:base.revision,destination}));
    expect(moved.floors[1].position).toBe(destination);
    expect(storage.save(moved,raw)).toEqual({ok:true});
    expect(storage.inspect().backup.text).toBe(raw);
    const saved = storage.inspect().primary; assert(saved.status === 'valid');
    expect(saved.state).toEqual(moved);
    expect(JSON.parse(saved.text).format).toBe(14);
    expect(saved.state.floors[0].exploration.sightVersion).toBeUndefined();
    expect(saved.state.floors[1].exploration.sightVersion).toBe('wall-sight-v1');
    const ascended = good(stepDungeon(saved.state,{id:base.id,depth:2,revision:moved.revision,destination:floor.descriptor.upstairs}));
    expect(ascended.depth).toBe(1);
    const revisited = good(travelDungeon(atDownstairs(ascended),'descend',ascended.revision));
    expect(revisited.floors[1]).toEqual(ascended.floors[1]);
    const grown = good(travelDungeon(atDownstairs(revisited),'descend',revisited.revision));
    expect(grown.depth).toBe(3);
    expect(grown.floors.slice(0,2).map(floor => floor.descriptor)).toEqual(descriptors);
    expect(grown.floors.slice(0,2).map(floor => floorMap(floor.descriptor).width)).toEqual([20,20]);
    expect(grown.floors[2].descriptor).toEqual(floorDescriptor(base.seed,3));
    expect(grown.floors[2].descriptor.size).toBe(28);
    const encoded = encodeDungeon(grown); assert(encoded.ok);
    expect(decodeDungeon(encoded.text)).toEqual({ok:true,state:grown});
  });
  it('keeps shared cached geometry immutable and keyed by generator and size', () => {
    const a=floorDescriptor(19,2), first=floorMap(a);
    expect(Object.isFrozen(first)).toBe(true);expect(Object.isFrozen(first.cells)).toBe(true);
    expect(() => { (first.cells as number[])[0]=1; }).toThrow();
    expect(floorMap(a)).toBe(first);
    const other={...a,generator:a.generator === 'arena-v1' ? 'sector-graph-v1' as const : 'arena-v1' as const};
    expect(floorMap(other).type).toBe(a.generator === 'arena-v1' ? 'sector-graph' : 'arena');expect(floorMap(other)).not.toBe(first);
    expect(floorMap(a).cells[0]).toBe(0);
  });
  it('rejects changed saved geometry after immutable floor facts are warm', () => {
    const base=freshDungeon('warm-floor-facts',19);
    const floors=Array.from({length:5},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1),map=floorMap(descriptor);return {descriptor,position:descriptor.upstairs,completed:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};});
    const state=good(readDungeon({...base,depth:5,floors}));
    const encoded=encodeDungeon(state);assert(encoded.ok);
    for(const patch of [{mapHash:'sha256:'+'0'.repeat(64)},{upstairs:state.floors[4].descriptor.upstairs+1},{downstairs:state.floors[4].descriptor.downstairs-1}]){
      const altered={...state,floors:state.floors.map((floor,i)=>i===4?{...floor,descriptor:{...floor.descriptor,...patch}}:floor)};
      expect(readDungeon(altered).ok).toBe(false);
    }
    expect(encodeDungeon(state)).toEqual(encoded);
    const cache=new FloorCache(1), original=floorDescriptor(19,5,cache);
    const map=cache.resolve(original.seed,original.generator,original.size);
    floorDescriptor(19,4,cache);
    expect(floorDescriptor(19,5,cache)).toEqual(original);
    expect(cache.resolve(original.seed,original.generator,original.size)).not.toBe(map);
  });
  it('grows new floors deterministically while preserving legacy floor geometry', () => {
    for (const [depth,size] of [[1,20],[2,24],[3,28],[4,32],[5,36],[20,36]] as const) {
      const descriptor = floorDescriptor(19,depth), map = floorMap(descriptor);
      expect(map.width).toBe(size); expect(map.height).toBe(size);
      expect(floorMap(descriptor)).toEqual(map);
      expect(map.cells[descriptor.upstairs]).toBe(1); expect(map.cells[descriptor.downstairs]).toBe(1);
      const exploration=freshExploration(descriptor.seed,descriptor.upstairs,map);
      expect(new Set(exploration.pois.map(p=>poiCell(p,size))).size).toBe(3);
      for (const poi of exploration.pois) expect(map.cells[poiCell(poi,size)]).toBe(1);
    }
  });
  it('rejects altered dimensions and retains larger floors through storage and travel', () => {
    const original=clearFloor(fresh()), next=good(travelDungeon(atDownstairs(original),'descend',original.revision));
    const descriptor=next.floors[1].descriptor;
    expect(descriptor.size).toBe(24);
    const encoded=encodeDungeon(next); if(!encoded.ok)throw Error(encoded.reason);
    expect(decodeDungeon(encoded.text)).toEqual({ok:true,state:next});
    const bad=structuredClone(next); (bad.floors[1].descriptor as {size?:number}).size=36;
    expect(readDungeon(bad).ok).toBe(false);
    const back=good(travelDungeon(next,'ascend',next.revision));
    const again=good(travelDungeon(back,'descend',back.revision));
    expect(again.floors[1]).toEqual(next.floors[1]);
  });
});
