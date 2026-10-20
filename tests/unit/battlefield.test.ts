import { assert, expect, it } from 'vitest';
import { runCatalog, authoredEncounters, battlefieldEncounters } from '../../src/content/encounters';
import { validateBattlefield } from '../../src/domain/battlefieldValidation';
import { createBattle } from '../../src/domain/turns';
import { resolveBattlefield } from '../../src/domain/battlefield';
const desertCatalog={...runCatalog,terrains:{...runCatalog.terrains,
 sand:{id:'sand' as const,surfaceAssetId:'asset:terrain_grass' as const,moveCost:1,walkable:true,blocksLineOfSight:false},
 rock:{id:'rock' as const,surfaceAssetId:'asset:terrain_stone' as const,moveCost:1,walkable:false,blocksLineOfSight:true}}};
it('admits the authored final unchanged',()=>{
 expect(validateBattlefield(runCatalog.maps[authoredEncounters[2].mapId],runCatalog)).toEqual({ok:true});
});
it('resolves deterministic desert and fallback',()=>{
 const first=resolveBattlefield(battlefieldEncounters[0],123,desertCatalog);assert(first.ok,JSON.stringify(first));
 expect(resolveBattlefield(battlefieldEncounters[0],123,desertCatalog)).toEqual(first);
 expect(first.descriptor).toMatchSnapshot('desert generator 1 profile desert-v1 seed 123');
 const fallback=resolveBattlefield(battlefieldEncounters[0],123,desertCatalog,{rejectCandidate:()=>true});assert(fallback.ok,JSON.stringify(fallback));
 expect(fallback.diagnostics.fallback).toBe(true);
});

it.each(['cells','plateau','pit','budget','spawn','noAttack','density','raised','exit','gateway'])('rejects adversarial %s with structured diagnostics',problem=>{
 const resolved=resolveBattlefield(battlefieldEncounters[0],123,desertCatalog);assert(resolved.ok);
 const map:any=structuredClone(resolved.map),catalog:any=structuredClone(desertCatalog);
 if(problem==='cells')map.cells.pop();
 if(problem==='plateau')map.cells.find((c:any)=>c.x===0&&c.y===0).elevation=4;
 if(problem==='pit') {map.cells=map.cells.map((c:any)=>({...c,elevation:4}));map.cells[0].elevation=0;}
 if(problem==='budget')catalog.terrains.sand.moveCost=8;
 if(problem==='spawn')map.spawns[0]={...map.spawns[0],x:map.spawns[1].x,y:map.spawns[1].y};
 if(problem==='noAttack')for(const a of Object.values(catalog.abilities) as any[]){a.rangeMin=20;a.rangeMax=20;}
 if(problem==='density')map.cells=map.cells.map((c:any)=>({...c,terrainId:'grass'}));
 if(problem==='raised') {map.cells=map.cells.map((c:any)=>({...c,elevation:0}));map.cells[0].elevation=1;}
 if(problem==='exit') {const s=map.spawns[0];for(const c of map.cells)if(Math.abs(c.x-s.x)+Math.abs(c.y-s.y)===1&&c.x!==s.x+1)c.terrainId='rock';}
 if(problem==='gateway')map.cells=map.cells.map((c:any)=>c.y===5&&c.x!==5?{...c,terrainId:'rock'}:c);
 const result=validateBattlefield(map,catalog,true);expect(result.ok).toBe(false);
 if(!result.ok){expect(result.errors.length).toBeGreaterThan(0);expect(result.errors.every(e=>typeof e.code==='string'&&typeof e.detail==='string')).toBe(true);}
});

it('keeps initiative and combat RNG identical to the same seeded authored roster',()=>{
 const resolved=resolveBattlefield(battlefieldEncounters[0],123,desertCatalog);assert(resolved.ok);
 const generated=createBattle(resolved.map.id,123,{...desertCatalog,maps:{...desertCatalog.maps,[resolved.map.id]:resolved.map}});
 const authored=createBattle(authoredEncounters[0].mapId,123,runCatalog);assert(generated.ok);assert(authored.ok);
 expect(generated.state.rng).toEqual(authored.state.rng);expect(generated.state.initiative).toEqual(authored.state.initiative);
});
