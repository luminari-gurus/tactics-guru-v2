import type { MapId, SpawnRecord } from './types';
import type { EncounterId } from '../domain/run';
import { hasShape, isDenseArray } from '../domain/validation';
export type BattlefieldSource = { readonly kind: 'authored'; readonly mapId: MapId } |
  { readonly kind: 'generated'; readonly biome: 'desert'; readonly generatorVersion: 1; readonly profileVersion: 'desert-v1' };
export interface BattlefieldEncounter {
  readonly id: EncounterId;
  readonly source: BattlefieldSource;
  readonly roster: readonly SpawnRecord[];
}
export function isBattlefieldSource(input: unknown): input is BattlefieldSource {
  return hasShape(input, ['kind','mapId']) && input.kind === 'authored' && typeof input.mapId === 'string' && /^map:[a-z][a-z0-9_]{0,63}$/.test(input.mapId) ||
    hasShape(input, ['kind','biome','generatorVersion','profileVersion']) && input.kind === 'generated' && input.biome === 'desert' &&
    input.generatorVersion === 1 && input.profileVersion === 'desert-v1';
}

/** Unknown encounter definitions must select exactly one supported source and a full stable roster. */
export function readBattlefieldEncounters(input:unknown,catalog:import('./types').ContentCatalog):
  {ok:true;encounters:readonly BattlefieldEncounter[]}|{ok:false;reason:string} {
  if(!isDenseArray(input,3)||input.length!==3)return {ok:false,reason:'Expected three encounters'};
  const seen=new Set<string>();
  for(const e of input) {
    if(!hasShape(e,['id','source','roster'])||typeof e.id!=='string'||!/^encounter:[a-z][a-z0-9_]{0,63}$/.test(e.id)||seen.has(e.id)||!isBattlefieldSource(e.source))return {ok:false,reason:'Invalid encounter source or ID'};
    if(e.source.kind==='generated'&&e.id.length>67)return {ok:false,reason:'Generated encounter ID exceeds descriptor map limit'};
    seen.add(e.id);
    if(e.source.kind==='authored'&&!Object.hasOwn(catalog.maps,e.source.mapId))return {ok:false,reason:'Unknown authored map'};
    if(!isDenseArray(e.roster,64)||e.roster.length<4)return {ok:false,reason:'Invalid roster'};
    const roster=e.roster;
    const ids=new Set<number>(),positions=new Set<string>();
    for(const s of roster) {
      if(!hasShape(s,['id','side','unitId','x','y'])||typeof s.id!=='number'||!Number.isInteger(s.id)||s.id<1||s.id>64||ids.has(s.id)||
        typeof s.x!=='number'||typeof s.y!=='number'||!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<0||s.y<0||s.x>31||s.y>31||
        (s.side!=='heroes'&&s.side!=='enemies')||typeof s.unitId!=='string'||!Object.hasOwn(s.side==='heroes'?catalog.heroes:catalog.enemies,s.unitId)||positions.has(`${s.x},${s.y}`))return {ok:false,reason:'Invalid spawn'};
      ids.add(s.id);positions.add(`${s.x},${s.y}`);
    }
    if(['fighter','ranger','mage'].some(id=>roster.filter((s:unknown)=>hasShape(s,['id','side','unitId','x','y'])&&s.side==='heroes'&&s.unitId===id).length!==1)||!roster.some((s:unknown)=>hasShape(s,['id','side','unitId','x','y'])&&s.side==='enemies'))return {ok:false,reason:'Incomplete roster'};
  }
  return {ok:true,encounters:input as BattlefieldEncounter[]};
}
