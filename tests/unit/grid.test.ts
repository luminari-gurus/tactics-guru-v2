import { assert, expect, it, vi } from 'vitest';
import { catalogFixture } from './fixtures/contentContract';
import type { ContentCatalog } from '../../src/content/types';
import type { BattleState } from '../../src/domain/types';
import { contentVersion } from '../../src/domain/battle';
import { seedRng } from '../../src/domain/rng';
import { previewMovement, previewMove, moveUnit } from '../../src/domain/grid';
// contentVersion hashes each catalog object once, so map edits are applied before the hash.
function fixture(edit: (cells: { elevation: number; terrainId: import('../../src/content/types').TerrainId }[]) => void = () => {}) {
  const catalog: ContentCatalog = JSON.parse(JSON.stringify(catalogFixture));
  const map = { id: 'map:grid_fixture' as const, width: 4, height: 3,
    cells: Array.from({length:12}, (_,i) => ({x:i%4,y:Math.floor(i/4),elevation:0,terrainId:'grass' as import('../../src/content/types').TerrainId})),
    spawns: [{id:1,side:'heroes' as const,unitId:'fighter' as const,x:0,y:0},{id:2,side:'enemies' as const,unitId:'goblin_grunt' as const,x:3,y:2}] };
  edit(map.cells);
  const c = {...catalog,maps:{[map.id]:map}};
  const state: BattleState = {format:1,versions:{rules:1,rng:1,content:contentVersion(c)},seed:1,rng:seedRng(1),mapId:map.id,
    units:[{id:1,side:'player',defId:'fighter',cell:{x:0,y:0},hp:18,hasMoved:false,hasActed:false},{id:2,side:'enemy',defId:'goblin_grunt',cell:{x:3,y:2},hp:18,hasMoved:false,hasActed:false}],initiative:[1,2],activeIndex:0,round:1,outcome:'ongoing',commandCount:0};
  return {catalog:c,map,state};
}
const command = (x:number,y:number) => ({type:'move' as const,unitId:1,to:{x,y}});
it('orders equal-cost paths by cost, y, x and isolates pure previews', () => {
  const {catalog,state}=fixture(); const before=JSON.stringify(state);
  vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('entropy');});
  try {
    const p=previewMove(state,command(1,1),catalog); assert(p.ok);
    expect(p.path).toEqual([{x:0,y:0},{x:1,y:0},{x:1,y:1}]); expect(p.cost).toBe(2);
    const reachable=previewMovement(state,1,catalog); assert(reachable.ok);
    expect(reachable.cells.slice(0,3)).toEqual([{cell:{x:0,y:0},cost:0},{cell:{x:1,y:0},cost:1},{cell:{x:0,y:1},cost:1}]);
    Reflect.set(p.path[0],'x',3); expect(JSON.stringify(state)).toBe(before);
  } finally {vi.restoreAllMocks();}
});
it('enforces uphill Jump and cost boundaries while allowing unrestricted downhill', () => {
  const move = (edit: Parameters<typeof fixture>[0]) => { const {catalog,state}=fixture(edit); return previewMove(state,command(1,0),catalog); };
  expect(move(cells=>{cells[1].elevation=1;})).toMatchObject({ok:true,cost:2});
  expect(move(cells=>{cells[1].elevation=2;})).toEqual({ok:false,reason:'unreachable'});
  expect(move(cells=>{cells[0].elevation=4;})).toMatchObject({ok:true,cost:1});
});
it('rejects same cell, bounds, blocked, occupied, and over-budget destinations without mutation', () => {
  const {catalog,state:s}=fixture(cells=>{cells[1].terrainId='water';}); const before=JSON.stringify(s);
  for(const [x,y,reason] of [[0,0,'sameCell'],[4,0,'outOfBounds'],[1,0,'notWalkable'],[3,2,'occupied'],[3,0,'unreachable']] as const)
    expect(moveUnit(s,command(x,y),catalog)).toEqual({ok:false,reason});
  expect(JSON.stringify(s)).toBe(before);
});
it('moves atomically, derives current occupancy and rejects stale overlapping snapshots', () => {
  const {catalog,state}=fixture(); const result=moveUnit(state,command(1,0),catalog); assert(result.ok);
  expect(result.state.units[0]).toMatchObject({cell:{x:1,y:0},hasMoved:true,hasActed:false});
  expect(result.state.rng).toEqual(state.rng); expect(result.state.commandCount).toBe(1);
  expect(result.events).toEqual([{type:'moved',unitId:1,path:[{x:0,y:0},{x:1,y:0}]}]);
  expect(previewMove(result.state,command(2,0),catalog)).toEqual({ok:false,reason:'alreadyMoved'});
  const stale={...state,units:[state.units[0],{...state.units[1],cell:{x:0,y:0}}]};
  expect(moveUnit(stale,command(1,0),catalog)).toEqual({ok:false,reason:'invalidState'});
  const occupied={...state,units:[state.units[0],{...state.units[1],cell:{x:1,y:0}}]};
  expect(previewMove(occupied,command(1,0),catalog)).toEqual({ok:false,reason:'occupied'});
  expect(state.units[0].cell).toEqual({x:0,y:0});
});

it('uses weighted shortest routes, exact allowance and zero Jump on flat ground', () => {
  const variant = (edit: Parameters<typeof fixture>[0]) => {
    const {catalog,state}=fixture(edit);
    const c={...catalog,heroes:{...catalog.heroes,fighter:{...catalog.heroes.fighter,stats:{...catalog.heroes.fighter.stats,jump:0}}},terrains:{...catalog.terrains,stone:{...catalog.terrains.stone,moveCost:4}}};
    return {c,s:{...state,versions:{...state.versions,content:contentVersion(c)}}};
  };
  const {c,s}=variant(cells=>{cells[1].terrainId='stone';});
  expect(previewMove(s,command(1,0),c)).toMatchObject({ok:true,cost:4});
  const p=previewMove(s,command(2,0),c); assert(p.ok);
  expect(p.cost).toBe(4); expect(p.path).toEqual([{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:2,y:0}]);
  const raised=variant(cells=>{cells[1].terrainId='stone'; cells[4].elevation=1;});
  expect(previewMove(raised.s,command(0,1),raised.c)).toEqual({ok:false,reason:'unreachable'});
});
it('blocks traversal through either side and releases the previous cell after a move', () => {
  const {catalog,state}=fixture();
  const blocked={...state,units:[state.units[0],{...state.units[1],cell:{x:1,y:0}}]};
  const p=previewMove(blocked,command(2,0),catalog); assert(p.ok); expect(p.cost).toBe(4);
  const moved=moveUnit(state,command(1,0),catalog); assert(moved.ok);
  const next={...moved.state,activeIndex:1};
  const reachable=previewMovement(next,2,catalog); assert(reachable.ok);
  expect(reachable.cells.some(r=>r.cell.x===0 && r.cell.y===0)).toBe(false); // distance five exceeds Move
  expect(reachable.cells.some(r=>r.cell.x===1 && r.cell.y===0)).toBe(false);
  const reset={...moved.state,units:moved.state.units.map(u=>({...u,hasMoved:false}))};
  expect(previewMove(reset,command(0,0),catalog)).toMatchObject({ok:true,cost:1});
});
it('rejects invalid actor and intent boundaries and command counter exhaustion', () => {
  const {catalog,state}=fixture();
  for (const input of [null,{type:'endTurn',unitId:1},command(-1,0),command(0.5,0)])
    expect(moveUnit(state,input,catalog)).toEqual({ok:false,reason:'malformedCommand'});
  expect(previewMove(state,{...command(1,0),unitId:2},catalog)).toEqual({ok:false,reason:'notActiveUnit'});
  expect(moveUnit({...state,commandCount:Number.MAX_SAFE_INTEGER},command(1,0),catalog)).toEqual({ok:false,reason:'invalidState'});
});
it('living allies block while defeated units release occupancy', () => {
  const {catalog,map,state}=fixture();
  const c={...catalog,maps:{[map.id]:{...map,spawns:[...map.spawns,{id:3,side:'heroes' as const,unitId:'ranger' as const,x:1,y:0}]}}};
  const ally={id:3,side:'player' as const,defId:'ranger' as const,cell:{x:1,y:0},hp:18,hasMoved:false,hasActed:false};
  const s={...state,versions:{...state.versions,content:contentVersion(c)},units:[...state.units,ally],initiative:[1,2,3]};
  expect(previewMove(s,command(1,0),c)).toEqual({ok:false,reason:'occupied'});
  const defeated={...s,units:[...state.units,{...ally,hp:0}]};
  expect(previewMove(defeated,command(1,0),c)).toMatchObject({ok:true,cost:1});
});
