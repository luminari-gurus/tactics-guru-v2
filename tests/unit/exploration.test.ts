import { describe, expect, it } from 'vitest';
import { freshDungeon, stepDungeon, readDungeon, startDungeonBattle, acceptDungeonBattle, travelDungeon, currentFloor } from '../../src/domain/dungeon';
import { encounterPois, freshExploration, neighbors, poiCell, readExploration, reveal } from '../../src/domain/exploration';
import { generateMap } from '../../src/map/generate';
import { encodeDungeon, decodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { legacyDungeonIdentity } from '../../src/content/dungeon';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { atEncounter, atCell, dungeonCapacityFixture, priorDungeonPayload } from '../helpers/dungeonFixtures';
import { LEGACY_ENCOUNTER_POLICY } from '../../src/domain/dungeonEncounters';
import { DungeonSession } from '../../src/app/DungeonSession';
import { createDungeonStorage, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
const fresh=()=>freshDungeon('exploration-test',13);
const command=(s:ReturnType<typeof fresh>,destination:number)=>({id:s.id,depth:s.depth,revision:s.revision,destination});
const legacy=(s:ReturnType<typeof fresh>)=>priorDungeonPayload(s, 1);
const envelope=(payload:unknown)=>{const body={kind:'tactics-guru:dungeon',format:1,identity:legacyDungeonIdentity,payload};return canonical({...body,digest:hashJson(body)});};
describe('exploration placement and validation',()=>{
 it('reproduces connected distinct markers without changing terrain for 100 seeds',()=>{
  for(let seed=0;seed<100;seed++){const map=generateMap(seed,'rooms'),before=canonical(map),pois=encounterPois(seed,map);expect(pois).toEqual(encounterPois(seed));expect(new Set(pois.map(poiCell)).size).toBe(3);for(const p of pois){expect(map.cells[poiCell(p)]).toBe(1);expect([map.cells.indexOf(1),map.cells.lastIndexOf(1)]).not.toContain(poiCell(p));}expect(canonical(map)).toBe(before);}
  expect(()=>encounterPois(1,{...generateMap(1,'rooms'),cells:Array(400).fill(0)})).toThrow();
 });
 it('reveals exactly radius two through walls, with bounded sorted indices',()=>{expect(reveal(0)).toEqual([0,1,2,20,21,40]);expect(reveal(210)).toHaveLength(13);const s=fresh();expect(readDungeon(s)).toEqual({ok:true,state:s});});
 it.each(['duplicate','foreign','position','unsorted','missing-position','visited-hidden','blocked-visit','extra'])('rejects malformed %s without aliases',kind=>{
  const s=fresh(),f=currentFloor(s),x=JSON.parse(JSON.stringify(f.exploration));
  if(kind==='duplicate')x.pois[1]=x.pois[0];if(kind==='foreign')x.pois[0].id='foreign';if(kind==='position')x.pois[0].x=999;
  if(kind==='unsorted')x.revealed.reverse();if(kind==='missing-position')x.visited=[];if(kind==='visited-hidden')x.visited=[399];if(kind==='blocked-visit'){x.visited=[0,f.position].sort((a:number,b:number)=>a-b);x.revealed=[...new Set([0,...x.revealed])].sort((a,b)=>Number(a)-Number(b));}if(kind==='extra')x.extra=true;
  expect(readExploration(x,f.descriptor.seed,f.position)).toBeNull();
 });
 it('owns copied arrays and validates encounter position',()=>{const s=fresh(),read=readDungeon(s);expect(read.ok).toBe(true);if(read.ok){expect(read.state.floors[0].exploration).not.toBe(s.floors[0].exploration);}
  expect(startDungeonBattle(s)).toEqual({ok:false,reason:'remoteEncounter'});const b=startDungeonBattle(atEncounter(s));expect(b.ok).toBe(true);if(b.ok)expect(readDungeon(atCell(b.state,currentFloor(s).position)).ok).toBe(false);
 });
});
describe('accepted steps and battle ownership',()=>{
 it('steps once and rejects stale/repeated/foreign/blocked/diagonal/phase input without RNG changes',()=>{
  const s=fresh(),f=currentFloor(s),map=generateMap(f.descriptor.seed,'rooms'),n=neighbors(f.position).find(n=>map.cells[n])!;
  const before=canonical(s),c=command(s,n),next=stepDungeon(s,c);expect(next.ok).toBe(true);if(!next.ok)return;expect(next.state.revision).toBe(s.revision+1);expect(stepDungeon(next.state,c)).toEqual({ok:false,reason:'staleBoundary'});
  for(const dest of [-1,400,f.position,f.position+21])expect(stepDungeon(s,command(s,dest)).ok).toBe(false);
  expect(stepDungeon(s,{...c,id:'foreign'}).ok).toBe(false);expect(stepDungeon(s,{...c,depth:2}).ok).toBe(false);
  const battle=startDungeonBattle(atEncounter(s));if(!battle.ok)throw Error(battle.reason);expect(stepDungeon(battle.state,command(battle.state,n)).ok).toBe(false);expect(canonical(s)).toBe(before);
 });
 it('enters next encounter in the same revision and rejects remote stairs',()=>{
  const s=fresh(),f=currentFloor(s),target=poiCell(f.exploration.pois[0]),map=generateMap(f.descriptor.seed,'rooms'),origin=neighbors(target).find(n=>map.cells[n])!;
  const before=atCell(s,origin),entered=stepDungeon(before,command(before,target));expect(entered.ok).toBe(true);if(!entered.ok)return;
  expect(entered.state.phase).toBe('battle');expect(entered.state.revision).toBe(before.revision+1);expect(currentFloor(entered.state).position).toBe(target);
  const b=entered.state.activeBattle!,win=acceptDungeonBattle(entered.state,{...b,outcome:'playerWin',units:b.units.map(u=>u.side==='enemy'?{...u,hp:0}:u)});expect(win.ok).toBe(true);if(win.ok){expect(currentFloor(win.state).position).toBe(target);expect(win.state.phase).toBe('reward');expect(acceptDungeonBattle(win.state,b).ok).toBe(false);}
  expect(travelDungeon({...atCell(s,target),floors:[{...currentFloor(atCell(s,target)),completed:3}]},'descend',0)).toEqual({ok:false,reason:'remoteStairs'});
 });
 it.each(['quota','security','unavailable','uncertain'])('refuses uncommitted spatial entry on %s',failure=>{
  const s=atEncounter(fresh()),values=new Map<string,string>();let fail=false;
  const provider=()=>({getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(fail&&failure==='uncertain'){values.set(k,v);throw Error('after write');}if(fail)throw Object.assign(Error('failure'),{name:failure==='quota'?'QuotaExceededError':failure==='security'?'SecurityError':'Error'});values.set(k,v);},removeItem:(k:string)=>values.delete(k)});
  const store=createDungeonStorage(provider);expect(store.save(s).ok).toBe(true);const session=new DungeonSession(s,store);fail=true;expect(session.startEncounter()).toBeNull();expect(session.snapshot).toEqual(s);expect(session.status).toContain('not published');expect(session.exports(session.inspect()).length).toBeGreaterThan(0);
 });
 it('blocks a readback mismatch until explicit durable recovery',()=>{
  const s=atEncounter(fresh()),values=new Map<string,string>();let mismatch=false,armed=false;
  const store=createDungeonStorage(()=>({getItem:(k:string)=>mismatch&&k===DUNGEON_KEYS.primary?'mismatched':values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);if(armed&&k===DUNGEON_KEYS.primary)mismatch=true;},removeItem:(k:string)=>values.delete(k)}));store.save(s);const session=new DungeonSession(s,store);armed=true;
  expect(session.startEncounter()).toBeNull();expect(session.snapshot).toEqual(s);mismatch=false;armed=false;
  expect(session.startEncounter()).toBeNull();expect(session.continue(session.inspect())).toBe(true);expect(session.snapshot.phase).toBe('battle');expect(session.startEncounter()).not.toBeNull();
 });
 it('permits explicit unsaved entry and disposes stale movement',()=>{const s=atEncounter(fresh()),session=new DungeonSession(s,createDungeonStorage(()=>null));session.playUnsaved();expect(session.startEncounter()).not.toBeNull();session.dispose();expect(session.step(command(s,0))).toBe(false);});
});
describe('pre-progression exploration recovery',()=>{
 it('rejects legacy data while preserving the recovery source',()=>{
  const original=freshDungeon('exploration-test',13,LEGACY_ENCOUNTER_POLICY),raw=envelope(legacy(original));
  expect(decodeDungeon(raw)).toEqual({ok:false,reason:'incompatible'});
  const values=new Map<string,string>([[DUNGEON_KEYS.primary,raw]]),store=createDungeonStorage(()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}}));
  expect(store.inspect().primary.status).toBe('invalid');expect(values.get(DUNGEON_KEYS.primary)).toBe(raw);
 });
});
