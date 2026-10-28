import { atEncounter, atDownstairs, atStairApproach, atCell } from '../helpers/dungeonFixtures';
import { freshExploration, neighbors, poiCell } from '../../src/domain/exploration';
import { generateMap } from '../../src/map/generate';
import { HERO_PROGRESSION } from '../../src/content/progression';
import { describe, expect, it, vi } from 'vitest';
import { dungeonCapacityFixture } from '../helpers/dungeonFixtures';
import { clearedDungeonSlots, freshDungeon, stepDungeon, dungeonBattle, dungeonOffer, floorDescriptor, FloorCache, dungeonSeed, readDungeon, travelDungeon, startDungeonBattle, acceptDungeonBattle, dungeonItem, dungeonBoundary, type DungeonState, type DungeonResult } from '../../src/domain/dungeon';
import { encodeDungeon, decodeDungeon, utf8Bytes } from '../../src/domain/dungeonSaveEnvelope';
import { dungeonContent, dungeonIdentity } from '../../src/content/dungeon';
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
function enterStairs(session: DungeonSession, direction: 'ascend' | 'descend' = 'descend') {
  const s = session.snapshot, f = s.floors[s.depth-1];
  return session.step({id:s.id,depth:s.depth,revision:s.revision,destination:direction === 'ascend' ? f.descriptor.upstairs : f.descriptor.downstairs});
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
      return {descriptor,completed:i===249?0:3,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs)};
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
    const state={...base,depth:2,floors:[{...first,completed:3},{descriptor,completed:0,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs)}]};
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
  const move = (s: DungeonState) => {
    const f=s.floors[s.depth-1], map=generateMap(f.descriptor.seed,'rooms');
    const destination=neighbors(f.position).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n&&!clearedDungeonSlots(f).includes(p.encounterSlot)));
    if(destination===undefined)throw Error('No safe step');
    return good(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination}));
  };
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
    expect(stepDungeon(s,{id:s.id,depth:s.depth,revision:s.revision,destination:-1})).toEqual({ok:false,reason:'blockedStep'});
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
  it('continues an authenticated format-4 active battle and upgrades after victory', () => {
    const initial=fresh(), started=good(startDungeonBattle(atEncounter(initial,0)));
    const oldExploration={...initial.floors[0].exploration,revealed:started.floors[0].exploration.revealed,visited:started.floors[0].exploration.visited};
    const legacyState={...started,floors:[{...started.floors[0],exploration:oldExploration}]};
    const body={kind:'tactics-guru:dungeon',format:4,identity:hashJson({dungeonIdentity,progression:HERO_PROGRESSION}),payload:legacyState};
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
  it('reads an authenticated format-4 save and upgrades it only after movement', () => {
    const s=fresh(), body={kind:'tactics-guru:dungeon',format:4,identity:hashJson({dungeonIdentity,progression:HERO_PROGRESSION}),payload:s};
    const legacy=decodeDungeon(canonical({...body,digest:hashJson(body)}));
    if(!legacy.ok)throw Error(legacy.reason);
    expect(legacy.state.floors[0].exploration.version).toBe('exploration-v1');
    const upgraded=move(legacy.state);
    const next=encodeDungeon(upgraded);if(!next.ok)throw Error(next.reason);
    expect(JSON.parse(next.text).format).toBe(5);
    expect(decodeDungeon(next.text)).toEqual({ok:true,state:upgraded});
  });
});
