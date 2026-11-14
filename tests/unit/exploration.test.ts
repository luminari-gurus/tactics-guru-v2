import { describe, expect, it, vi } from 'vitest';
import { freshDungeon, stepDungeon, readDungeon, startDungeonBattle, acceptDungeonBattle, travelDungeon, currentFloor, floorMap } from '../../src/domain/dungeon';
import { currentSight, encounterPois, freshExploration, neighbors, poiCell, readExploration, reveal } from '../../src/domain/exploration';
import { generateMap } from '../../src/map/generate';
import { encodeDungeon, decodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { legacyDungeonIdentity } from '../../src/content/dungeon';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { atEncounter, atCell, atStairApproach, dungeonCapacityFixture, priorDungeonPayload } from '../helpers/dungeonFixtures';
import { LEGACY_ENCOUNTER_POLICY } from '../../src/domain/dungeonEncounters';
import { DungeonSession } from '../../src/app/DungeonSession';
import { createDungeonStorage, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import * as dungeonStorage from '../../src/persistence/dungeonStorage';
const fresh=()=>freshDungeon('exploration-test',13);
const command=(s:ReturnType<typeof fresh>,destination:number)=>({id:s.id,depth:s.depth,revision:s.revision,destination});
const legacy=(s:ReturnType<typeof fresh>)=>priorDungeonPayload(s, 1);
const envelope=(payload:unknown)=>{const body={kind:'tactics-guru:dungeon',format:1,identity:legacyDungeonIdentity,payload};return canonical({...body,digest:hashJson(body)});};
describe('exploration placement and validation', () => {
 it('reproduces connected distinct markers without changing terrain for 100 seeds', async () => {
  for(let seed=0;seed<100;seed++){const map=generateMap(seed,'rooms'),before=canonical(map),pois=encounterPois(seed,map);expect(pois).toEqual(encounterPois(seed));expect(new Set(pois.map(p => poiCell(p))).size).toBe(3);for(const p of pois){expect(map.cells[poiCell(p)]).toBe(1);expect([map.cells.indexOf(1),map.cells.lastIndexOf(1)]).not.toContain(poiCell(p));}expect(canonical(map)).toBe(before);}
  expect(()=>encounterPois(1,{...generateMap(1,'rooms'),cells:Array(400).fill(0)})).toThrow();
 });
 it('retains the legacy radius-two save rule through walls, with bounded sorted indices', async () => {expect(reveal(0)).toEqual([0,1,2,20,21,40]);expect(reveal(210)).toHaveLength(13);const s=fresh();expect(readDungeon(s)).toEqual({ok:true,state:s});});
 it('shows nearby wall faces, blocks straight sight behind them and closes double-wall corners', () => {
  const map = { width: 5, height: 4, cells: Array<0 | 1>(20).fill(1) };
  map.cells[6] = 0;
  map.cells[12] = 0;
  expect(currentSight(7, map)).toEqual([1, 2, 3, 6, 7, 8, 9, 12, 13]);
  map.cells[12] = 1;
  expect(currentSight(7, map)).toEqual([1, 2, 3, 6, 7, 8, 9, 11, 12, 13, 17]);
  expect(currentSight(4, map)).toEqual([2, 3, 4, 8, 9, 14]);
 });
 it('retains a legacy save and all of its discoveries on the next accepted step', () => {
  const freshState = fresh(), floor = currentFloor(freshState), map = floorMap(floor.descriptor);
  const { sightVersion, ...exploration } = floor.exploration;
  const remembered = reveal(floor.position, map.width, map.height);
  const legacyState = { ...freshState, floors: [{ ...floor, exploration: { ...exploration, revealed: remembered } }] };
  expect(remembered.some(cell => !currentSight(floor.position, map).includes(cell))).toBe(true);
  const encoded = encodeDungeon(legacyState);
  if (!encoded.ok) throw Error(encoded.reason);
  expect(decodeDungeon(encoded.text)).toEqual({ ok: true, state: legacyState });
  const target = neighbors(floor.position, map.width, map.height).find(cell => map.cells[cell])!;
  expect(stepDungeon(legacyState, command(legacyState, -1)).ok).toBe(false);
  const stepped = stepDungeon(legacyState, command(legacyState, target));
  if (!stepped.ok) throw Error(stepped.reason);
  const after = currentFloor(stepped.state).exploration;
  expect(after.sightVersion).toBe(sightVersion);
  expect(after.revealed).toEqual([...new Set([...remembered, ...currentSight(target, map)])].sort((a, b) => a - b));
  const updated = encodeDungeon(stepped.state);
  if (!updated.ok) throw Error(updated.reason);
  expect(decodeDungeon(updated.text)).toEqual(stepped);
 });
 it.each([20,24,28,32,36])('retains the reveal contract at every cell of a %i-column floor',size=>{
  const cells=Array.from({length:size*size},(_,i)=>i);
  for(const position of cells){
   const expected=cells.filter(cell=>Math.abs(cell%size-position%size)+Math.abs(Math.floor(cell/size)-Math.floor(position/size))<=2);
   expect(reveal(position,size)).toEqual(expected);
  }
 });
 it('clips rectangular reveal edges without wrapping between rows', async () => {
  expect(reveal(19,20,36)).toEqual([17,18,19,38,39,59]);
  expect(reveal(700,20,36)).toEqual([660,680,681,700,701,702]);
  expect(reveal(35,36,20)).toEqual([33,34,35,70,71,107]);
  expect(reveal(684,36,20)).toEqual([612,648,649,684,685,686]);
 });
 it.each([
  ['rooms',20,1,[112,192,168]],['rooms',20,19,[262,264,245]],['rooms',20,0xffffffff,[96,114,168]],
  ['sector-graph',20,0,[194,223,144]],['sector-graph',24,19,[269,436,410]],
  ['sector-graph',28,19,[580,148,705]],['sector-graph',32,19,[604,222,548]],['sector-graph',36,19,[255,486,1129]],
  ['arena',20,0,[310,168,277]],['arena',24,19,[26,245,205]],['arena',36,19,[94,1206,1127]],
 ] as const)('retains saved marker order for %s size %i seed %i',(type,size,seed,cells)=>{
  const map=generateMap(seed,type,size);
  expect(encounterPois(seed,map).map(p=>poiCell(p,size))).toEqual(cells);
 });
 it('revalidates changed geometry and returns independent legacy markers', async () => {
  const map=generateMap(19,'sector-graph',36),position=map.cells.indexOf(1),input=freshExploration(map.seed,position,map);
  const first=readExploration(input,map.seed,position,map)!;
  (first.pois[0] as {x:number}).x=-1;
  expect(input.pois[0].x).toBeGreaterThanOrEqual(0);
  expect(readExploration(input,map.seed,position,map)).toEqual(input);
  const changed={...map,cells:[...map.cells]};changed.cells[0]=1;
  expect(()=>readExploration(input,map.seed,position,changed)).toThrow('Invalid exploration geometry');
 });
 it.each(['duplicate','foreign','position','unsorted','missing-position','visited-hidden','blocked-visit','extra'])('rejects malformed %s without aliases',kind=>{
  const s=fresh(),f=currentFloor(s),x=JSON.parse(JSON.stringify(f.exploration));
  if(kind==='duplicate')x.pois[1]=x.pois[0];if(kind==='foreign')x.pois[0].id='foreign';if(kind==='position')x.pois[0].x=999;
  if(kind==='unsorted')x.revealed.reverse();if(kind==='missing-position')x.visited=[];if(kind==='visited-hidden')x.visited=[399];if(kind==='blocked-visit'){x.visited=[0,f.position].sort((a:number,b:number)=>a-b);x.revealed=[...new Set([0,...x.revealed])].sort((a,b)=>Number(a)-Number(b));}if(kind==='extra')x.extra=true;
  expect(readExploration(x,f.descriptor.seed,f.position)).toBeNull();
 });
 it('owns copied arrays and validates encounter position', async () => {const s=fresh(),read=readDungeon(s);expect(read.ok).toBe(true);if(read.ok){expect(read.state.floors[0].exploration).not.toBe(s.floors[0].exploration);}
  expect(startDungeonBattle(s)).toEqual({ok:false,reason:'remoteEncounter'});const b=startDungeonBattle(atEncounter(s));expect(b.ok).toBe(true);if(b.ok)expect(readDungeon(atCell(b.state,currentFloor(s).position)).ok).toBe(false);
 });
});
describe('accepted steps and battle ownership', () => {
 it('steps once and rejects stale/repeated/foreign/blocked/diagonal/phase input without RNG changes', async () => {
  const s=fresh(),f=currentFloor(s),map=generateMap(f.descriptor.seed,'rooms'),n=neighbors(f.position).find(n=>map.cells[n])!;
  const before=canonical(s),c=command(s,n),next=stepDungeon(s,c);expect(next.ok).toBe(true);if(!next.ok)return;expect(next.state.revision).toBe(s.revision+1);expect(stepDungeon(next.state,c)).toEqual({ok:false,reason:'staleBoundary'});
  for(const dest of [-1,400,f.position,f.position+21])expect(stepDungeon(s,command(s,dest)).ok).toBe(false);
  expect(stepDungeon(s,{...c,id:'foreign'}).ok).toBe(false);expect(stepDungeon(s,{...c,depth:2}).ok).toBe(false);
  const battle=startDungeonBattle(atEncounter(s));if(!battle.ok)throw Error(battle.reason);expect(stepDungeon(battle.state,command(battle.state,n)).ok).toBe(false);expect(canonical(s)).toBe(before);
 });
 it('enters next encounter in the same revision and rejects remote stairs', async () => {
  const s=fresh(),f=currentFloor(s),target=poiCell(f.exploration.pois[0]),map=generateMap(f.descriptor.seed,'rooms'),origin=neighbors(target).find(n=>map.cells[n])!;
  const before=atCell(s,origin),entered=stepDungeon(before,command(before,target));expect(entered.ok).toBe(true);if(!entered.ok)return;
  expect(entered.state.phase).toBe('battle');expect(entered.state.revision).toBe(before.revision+1);expect(currentFloor(entered.state).position).toBe(origin);
  expect(entered.state.encounterEntry).toEqual({origin,contact:target,slot:0});expect(currentFloor(entered.state).exploration.visited).toEqual(currentFloor(before).exploration.visited);
  const b=entered.state.activeBattle!,win=acceptDungeonBattle(entered.state,{...b,outcome:'playerWin',units:b.units.map(u=>u.side==='enemy'?{...u,hp:0}:u)});expect(win.ok).toBe(true);if(win.ok){expect(currentFloor(win.state).position).toBe(origin);expect(win.state.phase).toBe('ready');expect(currentFloor(win.state).loot?.[0].cell).toBe(target);expect(acceptDungeonBattle(win.state,b).ok).toBe(false);}
  expect(travelDungeon({...atCell(s,target),floors:[{...currentFloor(atCell(s,target)),completed:3}]},'descend',0)).toEqual({ok:false,reason:'remoteStairs'});
 });
 it.each(['quota','security','unavailable','uncertain'])('refuses uncommitted spatial entry on %s',async failure=>{
  const s=atEncounter(fresh()),values=new Map<string,string>();let fail=false;
  const provider=()=>({getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(fail&&failure==='uncertain'){values.set(k,v);throw Error('after write');}if(fail)throw Object.assign(Error('failure'),{name:failure==='quota'?'QuotaExceededError':failure==='security'?'SecurityError':'Error'});values.set(k,v);},removeItem:(k:string)=>values.delete(k)});
  const store=createDungeonStorage(provider);expect(store.save(s).ok).toBe(true);const session=new DungeonSession(s,store);fail=true;expect((await session.startEncounter())).toBeNull();expect(session.snapshot).toEqual(s);expect(session.status).toContain('not published');expect(session.exports(session.inspect()).length).toBeGreaterThan(0);
 });
 it('blocks a readback mismatch until explicit durable recovery', async () => {
  const s=atEncounter(fresh()),values=new Map<string,string>();let mismatch=false,armed=false;
  const store=createDungeonStorage(()=>({getItem:(k:string)=>mismatch&&k===DUNGEON_KEYS.primary?'mismatched':values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);if(armed&&k===DUNGEON_KEYS.primary)mismatch=true;},removeItem:(k:string)=>values.delete(k)}));store.save(s);const session=new DungeonSession(s,store);armed=true;
  expect((await session.startEncounter())).toBeNull();expect(session.snapshot).toEqual(s);mismatch=false;armed=false;
  expect((await session.startEncounter())).toBeNull();expect(session.continue(session.inspect())).toBe(true);expect(session.snapshot.phase).toBe('battle');expect((await session.startEncounter())).not.toBeNull();
 });
 it('permits explicit unsaved entry and disposes stale movement', async () => {const s=atEncounter(fresh()),session=new DungeonSession(s,createDungeonStorage(()=>null));session.playUnsaved();expect((await session.startEncounter())).not.toBeNull();session.dispose();expect((await session.step(command(s,0)))).toBe(false);});
});
describe('pre-progression exploration recovery', () => {
 it('rejects legacy data while preserving the recovery source', async () => {
  const original=freshDungeon('exploration-test',13,LEGACY_ENCOUNTER_POLICY),raw=envelope(legacy(original));
  expect(decodeDungeon(raw)).toEqual({ok:false,reason:'incompatible'});
  const values=new Map<string,string>([[DUNGEON_KEYS.primary,raw]]),store=createDungeonStorage(()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}}));
  expect(store.inspect().primary.status).toBe('invalid');expect(values.get(DUNGEON_KEYS.primary)).toBe(raw);
 });
});

describe('movement onto stairs', () => {
 const cleared=()=>{const s=fresh();return {...s,floors:[{...currentFloor(s),completed:3}]};};
 const good=(result:ReturnType<typeof stepDungeon>)=>{if(!result.ok)throw Error(result.reason);return result.state;};
 it('descends and ascends once per entry, preserving arrival, party and ownership', async () => {
  const before=atStairApproach(cleared()),original=canonical(before);
  const down=command(before,currentFloor(before).descriptor.downstairs),second=good(stepDungeon(before,down));
  expect(second.depth).toBe(2);expect(second.revision).toBe(before.revision+1);
  expect(currentFloor(second).position).toBe(currentFloor(second).descriptor.upstairs);
  expect(second.party).toEqual(before.party);expect(second.ownership).toEqual(before.ownership);
  expect(stepDungeon(second,down)).toEqual({ok:false,reason:'staleBoundary'});
  const encoded=encodeDungeon(second);if(!encoded.ok)throw Error(encoded.reason);
  expect(decodeDungeon(encoded.text)).toEqual({ok:true,state:second});
  expect(new DungeonSession(second).snapshot).toEqual(second);
  const approach=atStairApproach(second,'ascend');
  const off=good(stepDungeon(second,command(second,currentFloor(approach).position)));
  expect(off.depth).toBe(2);
  const first=good(stepDungeon(off,command(off,currentFloor(off).descriptor.upstairs)));
  expect(first.depth).toBe(1);expect(first.revision).toBe(second.revision+2);
  expect(currentFloor(first).position).toBe(currentFloor(first).descriptor.downstairs);
  expect(first.party).toEqual(before.party);expect(first.ownership).toEqual(before.ownership);
  const away=atStairApproach(first),reentered=good(stepDungeon(first,command(first,currentFloor(away).position)));
  const revisit=good(stepDungeon(reentered,command(reentered,currentFloor(reentered).descriptor.downstairs)));
  expect(revisit.depth).toBe(2);expect(currentFloor(revisit)).toEqual(first.floors[1]);
  expect(canonical(before)).toBe(original);
 });
 it('allows movement onto unavailable stairs without traveling, and rejects phase and counter boundaries', async () => {
  const initial=fresh(),upApproach=atStairApproach(initial,'ascend');
  const atUp=good(stepDungeon(upApproach,command(upApproach,currentFloor(initial).descriptor.upstairs)));
  expect(atUp.depth).toBe(1);
  const locked=atStairApproach(initial),atDown=good(stepDungeon(locked,command(locked,currentFloor(locked).descriptor.downstairs)));
  expect(atDown.depth).toBe(1);expect(currentFloor(atDown).completed).toBe(0);
  const ready=atStairApproach(cleared()),entry=command(ready,currentFloor(ready).descriptor.downstairs);
  for(const phase of ['battle','reward','defeat'] as const)expect(stepDungeon({...ready,phase},entry)).toEqual({ok:false,reason:'wrongPhase'});
  const limited={...ready,revision:Number.MAX_SAFE_INTEGER};
  expect(stepDungeon(limited,command(limited,entry.destination))).toEqual({ok:false,reason:'resourceLimit'});
 });
 it('does not publish automatic travel in unsaved play, then recovers and restores without bouncing', async () => {
  const before=atStairApproach(cleared()),values=new Map<string,string>();
  const store=createDungeonStorage(()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}}));
  const session=new DungeonSession(before,store);session.playUnsaved();
  const entry=command(before,currentFloor(before).descriptor.downstairs);
  expect((await session.step(entry))).toBe(false);expect(session.snapshot).toEqual(before);expect(values.size).toBe(0);
  expect((await session.retry(session.inspect()))).toBe(true);expect((await session.step(entry))).toBe(true);
  const arrival=session.snapshot;expect(arrival.depth).toBe(2);
  expect(session.continue(session.inspect())).toBe(true);expect(session.snapshot).toEqual(arrival);
  (await session.save());expect(session.snapshot).toEqual(arrival);session.dispose();expect((await session.step(entry))).toBe(false);
 });
 it('publishes transient descent and ascent without constructing save storage', async () => {
  const acquire=vi.spyOn(dungeonStorage,'createDungeonStorage').mockImplementation(()=>{throw Error('Unexpected save provider');});
  try {
   const before=atStairApproach(cleared()),session=new DungeonSession(before,null);
   expect((await session.step(command(before,currentFloor(before).descriptor.downstairs)))).toBe(true);
   const second=session.snapshot,approach=atStairApproach(second,'ascend');expect(second.depth).toBe(2);
   expect((await session.step(command(second,currentFloor(approach).position)))).toBe(true);
   expect((await session.step(command(session.snapshot,currentFloor(second).descriptor.upstairs)))).toBe(true);
   expect(session.snapshot.depth).toBe(1);expect(session.snapshot.party).toEqual(before.party);expect(session.snapshot.ownership).toEqual(before.ownership);
   expect(session.hasUnsavedProgress).toBe(false);expect(session.status).toContain('resets on reload');
   expect(session.restart('testing-restart',14)).toBe(true);expect(session.snapshot).toEqual(freshDungeon('testing-restart',14));
   expect((await session.save())).toBe(false);expect(()=>session.inspect()).toThrow('no save storage');expect(acquire).not.toHaveBeenCalled();
   session.dispose();expect((await session.step(command(before,0)))).toBe(false);expect(session.restart('disposed',15)).toBe(false);
  } finally {acquire.mockRestore();}
 });
});
