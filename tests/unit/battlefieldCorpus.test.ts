import { assert, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { battlefieldEncounters } from '../../src/content/encounters';
import { desertRunCatalog } from '../../src/content/desertCatalog';
import { resolveBattlefield } from '../../src/domain/battlefield';

it('admits the reproducible seed corpus with bounded fallback and varied maps',()=>{
 const count=process.env.BATTLEFIELD_CORPUS==='full'?10000:32;
 const seeds=[...Array.from({length:count},(_,i)=>i),0xfffffffe,0xffffffff];
 const hashes=new Set<string>(),attempts=[0,0,0,0],times:number[]=[];let fallbacks=0;
 const examples=[];
 for(const seed of seeds){
  const start=performance.now(),resolved=resolveBattlefield(battlefieldEncounters[0],seed,desertRunCatalog);
  times.push(performance.now()-start);assert(resolved.ok,JSON.stringify({seed,resolved}));
  hashes.add(resolved.descriptor.mapHash);if(resolved.diagnostics.fallback)fallbacks++;else attempts[resolved.diagnostics.attempt!]++;
  if(seed<8)examples.push({seed,descriptor:resolved.descriptor,diagnostics:resolved.diagnostics,flatSand:resolved.map.cells.filter(c=>c.terrainId==='sand'&&c.elevation===0).length,rock:resolved.map.cells.filter(c=>c.terrainId==='rock').length});
 }
 expect(fallbacks/seeds.length).toBeLessThan(.01);expect(hashes.size/seeds.length).toBeGreaterThanOrEqual(.95);
 if(count===10000){
  times.sort((a,b)=>a-b);mkdirSync('verification-receipts/procedural-grids',{recursive:true});
  writeFileSync('verification-receipts/procedural-grids/corpus.json',JSON.stringify({generatorVersion:1,profileVersion:'desert-v1',seeds:'0..9999, 4294967294, 4294967295',survivorSubsets:7,admission:'Every resolver candidate checks all seven subsets',count:seeds.length,unique:hashes.size,fallbacks,attempts,timingMs:{min:times[0],median:times[Math.floor(times.length/2)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)},examples},null,2)+'\n');
 }
},600000);
