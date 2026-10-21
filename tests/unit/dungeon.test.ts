import { atEncounter, atDownstairs } from '../helpers/dungeonFixtures';
import { freshExploration } from '../../src/domain/exploration';
import { describe, expect, it, vi } from 'vitest';
import { dungeonCapacityFixture } from '../helpers/dungeonFixtures';
import { freshDungeon, dungeonBattle, dungeonOffer, floorDescriptor, FloorCache, dungeonSeed, readDungeon, travelDungeon, startDungeonBattle, acceptDungeonBattle, dungeonItem, dungeonBoundary, type DungeonState, type DungeonResult } from '../../src/domain/dungeon';
import { encodeDungeon, decodeDungeon, utf8Bytes } from '../../src/domain/dungeonSaveEnvelope';
import { dungeonContent } from '../../src/content/dungeon';
import { createDungeonStorage, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import { DungeonSession } from '../../src/app/DungeonSession';
import { LEGACY_ENCOUNTER_POLICY } from '../../src/domain/dungeonEncounters';
import { priorDungeonEnvelope } from '../helpers/dungeonFixtures';
import { dispatch } from '../../src/domain/turns';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { dungeonEncounterCatalog, dungeonBattleCatalog } from '../../src/content/dungeonEncounters';
import { resolveBattlefield } from '../../src/domain/battlefield';
import * as battlefields from '../../src/domain/battlefield';
const good = (r: DungeonResult) => { expect(r.ok).toBe(true); if (!r.ok) throw Error(r.reason); return r.state; };
const fresh = () => freshDungeon('test-dungeon', 13);
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
function memory() {
  const values = new Map<string,string>();
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string,v: string) => { values.set(k,v); }, removeItem: (k: string) => { values.delete(k); } };
}
describe('dungeon floors', () => {
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
    const floors=Array.from({length:10},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1);return {descriptor,position:descriptor.downstairs,exploration:freshExploration(descriptor.seed,descriptor.downstairs),completed:3};});
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
    const base=fresh(),floors=Array.from({length:4},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1);return {descriptor,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs),completed:i===3?1:3};});
    const equipment=Array.from({length:6},(_,i)=>({instanceId:`${base.id}:floor:${Math.floor(i/2)+1}:reward:${i%2}:option:0`,itemId:'item:warding_charm' as const}));
    const candidate={...base,depth:4,floors,phase:'reward' as const,ownership:{consumables:[],equipment,assignments:[]}};
    const s=good(readDungeon({...atEncounter(candidate,0),offer:dungeonOffer(candidate)}));
    const itemId=s.offer!.options.find(o=>dungeonContent.items[o.itemId].kind==='equipment')!.itemId;
    const before=JSON.stringify(s);expect(dungeonItem(s,{...dungeonBoundary(s),type:'claimReward',offerId:s.offer!.id,itemId})).toEqual({ok:false,reason:'capacity'});expect(JSON.stringify(s)).toBe(before);
  });
  it('owns saved reward data instead of retaining caller mutation aliases', () => {
    const original=win(fresh()),input=JSON.parse(JSON.stringify(original)),checked=good(readDungeon(input));
    input.offer.options[0].quantity=9;
    expect(checked.offer).toEqual(original.offer);expect(readDungeon(input).ok).toBe(false);
  });
  it('carries injured survivors and applies equipped charm once across reconstruction', () => {
    let s=win(fresh()); const itemId=s.offer!.options.find(o=>dungeonContent.items[o.itemId].kind==='equipment')!.itemId;
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
});
describe('dungeon persistence',()=>{
  it('preserves other namespaces, corrupt bytes, backup and compare-before-removal',()=>{
    const m=memory();m.setItem('tactics-guru:phaser:run:primary:v1','old-run');const store=createDungeonStorage(()=>m);
    expect(store.save(fresh()).ok).toBe(true);expect(store.inspect().primary.status).toBe('valid');
    m.setItem(DUNGEON_KEYS.primary,'corrupt');expect(store.save(fresh()).ok).toBe(false);expect(m.getItem(DUNGEON_KEYS.primary)).toBe('corrupt');
    expect(store.remove('primary','old').ok).toBe(false);expect(store.remove('primary','corrupt').ok).toBe(true);expect(store.inspect().backup.status).toBe('valid');
    expect(m.getItem('tactics-guru:phaser:run:primary:v1')).toBe('old-run');
  });
  it('does not publish travel on quota failure and can explicitly recover',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),s=clearFloor(fresh());expect(store.save(s).ok).toBe(true);
    const session=new DungeonSession(s,store),before=session.snapshot;const write=m.setItem;
    m.setItem=()=>{throw Object.assign(Error('full'),{name:'QuotaExceededError'});};
    expect(session.travel('descend',s.revision)).toBe(false);expect(session.snapshot).toEqual(before);expect(store.inspect().primary.status).toBe('valid');
    m.setItem=write;expect(session.retry(session.inspect())).toBe(true);expect(session.travel('descend',s.revision)).toBe(true);expect(session.snapshot.depth).toBe(2);
  });
  it('requires explicit recovery after uncertain primary writes',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),s=clearFloor(fresh());store.save(s);const session=new DungeonSession(s,store);
    const read=m.getItem;let failRead=false;
    m.setItem=(k,v)=>{m.values.set(k,v);if(k===DUNGEON_KEYS.primary)failRead=true;};
    m.getItem=k=>{if(failRead&&k===DUNGEON_KEYS.primary)throw Error('readback');return read(k);};
    expect(session.travel('descend',s.revision)).toBe(false);expect(session.snapshot.depth).toBe(1);
    failRead=false;expect(session.travel('descend',s.revision)).toBe(false);
    expect(session.continue(session.inspect())).toBe(true);expect(session.snapshot.depth).toBe(2);
  });
  it('allows explicit unsaved battles but blocks travel and disposes stale sessions',()=>{
    const session=new DungeonSession(clearFloor(fresh()),createDungeonStorage(()=>null));session.playUnsaved();
    expect(session.travel('descend',session.snapshot.revision)).toBe(false);
    const playing=new DungeonSession(atEncounter(fresh()),createDungeonStorage(()=>memory())),battle=playing.startEncounter()!;playing.dispose();
    expect(battle.phase).toBe('disposed');expect(playing.startEncounter()).toBe(null);
  });
});

describe('dungeon recovery limits',()=>{
  it('keeps primary recoverable on backup-write/security failures and changed reset slots',()=>{
    const m=memory(),store=createDungeonStorage(()=>m),s=clearFloor(fresh());store.save(s);const original=m.getItem(DUNGEON_KEYS.primary);
    const write=m.setItem;m.setItem=(k,v)=>{if(k===DUNGEON_KEYS.backup)throw Object.assign(Error('denied'),{name:'SecurityError'});write(k,v);};
    expect(store.save(s)).toEqual({ok:false,reason:'security'});expect(m.getItem(DUNGEON_KEYS.primary)).toBe(original);
    m.setItem=write;const session=new DungeonSession(s,store),review=session.inspect();m.setItem(DUNGEON_KEYS.backup,'changed while reviewing');
    expect(session.replace(review,'replacement-dungeon',14)).toBe(false);expect(session.snapshot).toEqual(s);expect(session.exports(session.inspect()).some(v=>v.text===original)).toBe(true);
    expect(m.getItem(DUNGEON_KEYS.backup)).toBe('changed while reviewing');expect(m.getItem(DUNGEON_KEYS.primary)).toBe(original);
  });
  it('rejects incompatible and tampered envelopes without replacing raw bytes',()=>{
    const encoded=encodeDungeon(fresh());if(!encoded.ok)throw Error(encoded.reason);
    const value=JSON.parse(encoded.text);expect(decodeDungeon(JSON.stringify({...value,format:99}))).toEqual({ok:false,reason:'incompatible'});
    expect(decodeDungeon(JSON.stringify({...value,digest:'sha256:'+'0'.repeat(64)}))).toEqual({ok:false,reason:'digest'});
  });
  it('preserves every visited floor until the byte budget explicitly refuses the candidate',()=>{
    const base=fresh(),floors=Array.from({length:400},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1);return {descriptor,position:descriptor.downstairs,exploration:freshExploration(descriptor.seed,descriptor.downstairs),completed:3};});
    const s={...base,depth:400,floors,revision:4000};expect(readDungeon(s).ok).toBe(true);
    expect(encodeDungeon(s)).toEqual({ok:false,reason:'tooLarge'});expect(s.floors).toHaveLength(400);
    expect(s.phase).toBe('ready');expect(s.floors[0].descriptor).toEqual(base.floors[0].descriptor);
  },60000);
});

describe('durable encounter policies', () => {
  it('reuses admitted facts across a long retained floor history', () => {
    const base=fresh(),floors=Array.from({length:44},(_,i)=>{
      const descriptor=floorDescriptor(base.seed,i+1);
      return {descriptor,completed:3,position:descriptor.downstairs,exploration:freshExploration(descriptor.seed,descriptor.downstairs)};
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
  it.each(['policy', 'catalog', 'kind', 'depth', 'pool', 'composition', 'boss', 'roster', 'source', 'hash', 'version'])('rejects tampered %s facts and retains raw recovery bytes', field => {
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
    if (field === 'version') selection.scalingPolicy = 'enemy-depth-v2';
    const { digest, ...body } = envelope, raw = canonical({ ...body, digest: hashJson(body) });
    const m = memory(); m.setItem(DUNGEON_KEYS.primary, raw);
    const inspected = createDungeonStorage(() => m).inspect().primary;
    expect(inspected.status).toBe('invalid'); expect(inspected.text).toBe(raw); expect(m.getItem(DUNGEON_KEYS.primary)).toBe(raw);
  });

  it.each([1, 2] as const)('normalizes format %i across prior phases and keeps later floors fixed/unscaled', format => {
    const base = freshDungeon('prior-policy', 13, LEGACY_ENCOUNTER_POLICY), active = good(startDungeonBattle(atEncounter(base))), reward = win(base);
    const dead = good(acceptDungeonBattle(active, { ...active.activeBattle!, outcome: 'playerLoss', units: active.activeBattle!.units.map(u => u.side === 'player' ? { ...u, hp: 0 } : u) }));
    const cleared = clearFloor(base), second = good(travelDungeon(cleared, 'descend', cleared.revision));
    const backtracked = good(travelDungeon(second, 'ascend', second.revision));
    for (const original of [base, active, reward, dead, second, backtracked]) {
      const raw = priorDungeonEnvelope(original, format), decoded = good(decodeDungeon(raw));
      expect(decoded.encounterPolicy).toBe(LEGACY_ENCOUNTER_POLICY);
      for (const field of ['party', 'ownership', 'activeBattle', 'offer', 'revision', 'phase', 'depth'] as const) expect(decoded[field]).toEqual(original[field]);
      expect(decoded.floors.map(f => f.completed)).toEqual(original.floors.map(f => f.completed));
      if (format === 2) expect(decoded).toEqual(original);
      if (original.activeBattle) {
        const command = { type: 'endTurn' as const, unitId: original.activeBattle.initiative[original.activeBattle.activeIndex] };
        expect(dispatch(decoded.activeBattle!, command, dungeonBattle(decoded)!.catalog)).toEqual(dispatch(original.activeBattle, command, dungeonBattle(original)!.catalog));
      }
      const values = memory(); values.setItem(DUNGEON_KEYS.primary, raw); const store = createDungeonStorage(() => values);
      expect(store.inspect().primary.status).toBe('valid'); expect(values.getItem(DUNGEON_KEYS.primary)).toBe(raw);
      expect(store.save(decoded).ok).toBe(true); expect(values.getItem(DUNGEON_KEYS.backup)).toBe(raw);
      expect(JSON.parse(values.getItem(DUNGEON_KEYS.primary)!).format).toBe(3);
    }
    const decoded = good(decodeDungeon(priorDungeonEnvelope(cleared, format))), next = good(travelDungeon(decoded, 'descend', decoded.revision));
    expect(next.floors[1].descriptor.biome).toBe('grassland-v1');
    const built = dungeonBattle(next)!;
    expect(built.catalog.enemies).toEqual(dungeonContent.catalog.enemies);
    expect(built.selection.policy).toBe(LEGACY_ENCOUNTER_POLICY);
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
