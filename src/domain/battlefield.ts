import type { BattlefieldEncounter } from '../content/battlefieldTypes';
import { isBattlefieldSource } from '../content/battlefieldTypes';
import type { ContentCatalog, MapCell, MapRecord } from '../content/types';
import { hashJson, canonical } from './contentIdentity';
import { hasShape } from './validation';
import { seedRng, nextUint32 } from './rng';
import { validateBattlefield, type BattlefieldFailure } from './battlefieldValidation';
export type BattlefieldDescriptor = {
  readonly encounterId: string; readonly kind: 'authored'; readonly mapId: MapRecord['id']; readonly mapHash: string;
} | {
  readonly encounterId: string; readonly kind: 'generated'; readonly mapId: MapRecord['id']; readonly mapHash: string;
  readonly layoutSeed: number; readonly biome: 'desert'; readonly generatorVersion: 1; readonly profileVersion: 'desert-v1';
};
export function layoutSeed(seed: number, encounterId: string): number {
  return Number.parseInt(hashJson({seed,encounterId,purpose:'battle-layout-v1'}).slice(-8),16);
}
export function readBattlefieldDescriptor(input: unknown): input is BattlefieldDescriptor {
  const common=['encounterId','kind','mapId','mapHash'];
  if(!hasShape(input,common)&&!hasShape(input,[...common,'layoutSeed','biome','generatorVersion','profileVersion']))return false;
  if(typeof input.encounterId!=='string'||!/^encounter:[a-z][a-z0-9_]{0,63}$/.test(input.encounterId)||typeof input.mapId!=='string'||!/^map:[a-z][a-z0-9_]{0,63}$/.test(input.mapId)||typeof input.mapHash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(input.mapHash))return false;
  return input.kind==='authored'?hasShape(input,common):input.kind==='generated'&&input.biome==='desert'&&input.generatorVersion===1&&input.profileVersion==='desert-v1'&&typeof input.layoutSeed==='number'&&Number.isInteger(input.layoutSeed)&&input.layoutSeed>=0&&input.layoutSeed<=0xffffffff;
}
function immutableMap(map:MapRecord):MapRecord {
  return Object.freeze({...map,cells:Object.freeze(map.cells.map(c=>Object.freeze({...c}))),spawns:Object.freeze(map.spawns.map(s=>Object.freeze({...s})))});
}
/** Deployment bands and two broad parallel approaches are never decorated. */
export function desertCandidate(encounter:BattlefieldEncounter,seed:number,attempt:number|null):MapRecord {
  let rng=seedRng(Number.parseInt(hashJson({seed,attempt,purpose:'battle-attempt-v1'}).slice(-8),16));
  const draw=(n:number)=>{const next=nextUint32(rng);rng=next.rng;return next.value%n;};
  const cells:MapCell[]=Array.from({length:144},(_,i)=>({x:i%12,y:Math.floor(i/12),terrainId:'sand',elevation:0}));
  if(attempt!==null) {
    // Sparse clusters stay outside the protected x=4..7 approaches and y=0..2/9..11 bands.
    const available=cells.filter(c=>(c.x<4||c.x>7)&&c.y>=3&&c.y<=8);
    for(let i=available.length-1;i>0;i--){const j=draw(i+1);[available[i],available[j]]=[available[j],available[i]];}
    const count=6+draw(9);
    for(const c of available.slice(0,count))cells[c.y*12+c.x]={...c,terrainId:'rock'};
    // A single broad 2x2 plateau consumes four of the 28 non-flat-sand slots.
    const x=draw(2)?0:10,y=3+draw(5);
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)cells[(y+dy)*12+x+dx]={x:x+dx,y:y+dy,terrainId:'sand',elevation:1};
  }
  return {id:`map:desert_${encounter.id.slice(10)}`,width:12,height:12,cells,spawns:encounter.roster.map(s=>({...s}))};
}
export function resolveBattlefield(encounter:BattlefieldEncounter,encounterSeed:number,catalog:ContentCatalog,
  options: { readonly rejectCandidate?: (attempt:number)=>boolean } = {}) {
  const fail=(errors:readonly BattlefieldFailure[])=>({ok:false as const,errors});
  if(!isBattlefieldSource(encounter.source)||!Number.isInteger(encounterSeed)||encounterSeed<0||encounterSeed>0xffffffff)return fail([{code:'structure',detail:'Unsupported source or seed'}]);
  let map:MapRecord|undefined,attempt:number|null=null;
  const failures:BattlefieldFailure[]=[];
  const seed=layoutSeed(encounterSeed,encounter.id);
  if(encounter.source.kind==='authored') {
    map=catalog.maps[encounter.source.mapId];
    if(!map)return fail([{code:'structure',detail:'Unknown authored map'}]);
    if(canonical(encounter.roster)!==canonical(map.spawns))return fail([{code:'structure',detail:'Authored roster differs from fixed map'}]);
    const admitted=validateBattlefield(map,catalog);
    if(!admitted.ok)return admitted;
  }else {
    for(let i=0;i<4;i++) {
      const candidate=desertCandidate(encounter,seed,i),admitted=validateBattlefield(candidate,catalog,true);
      if(admitted.ok&&!options.rejectCandidate?.(i)){map=candidate;attempt=i;break;}
      failures.push(...(admitted.ok?[{code:'profile' as const,detail:'Forced candidate rejection'}]:admitted.errors));
    }
    if(!map) {
      map=desertCandidate(encounter,seed,null);
      const admitted=validateBattlefield(map,catalog,true);if(!admitted.ok)return admitted;
    }
  }
  const common={encounterId:encounter.id,mapId:map.id,mapHash:hashJson(map)};
  const descriptor:BattlefieldDescriptor=encounter.source.kind==='authored'?{...common,kind:'authored'}:
    {...common,...encounter.source,layoutSeed:seed};
  if(!readBattlefieldDescriptor(descriptor))return fail([{code:'structure',detail:'Battlefield identity exceeds descriptor bounds'}]);
  return {ok:true as const,map:immutableMap(map),descriptor:Object.freeze(descriptor),diagnostics:{attempt,fallback:encounter.source.kind==='generated'&&attempt===null,failures}};
}
export function sameBattlefield(a:unknown,b:BattlefieldDescriptor):boolean {return readBattlefieldDescriptor(a)&&canonical(a)===canonical(b);}
