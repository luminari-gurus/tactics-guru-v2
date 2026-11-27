import type { MapId, SpawnRecord } from './types';
import type { EncounterId } from '../domain/run';
import { hasShape, isDenseArray } from '../domain/validation';
export const generatedBattlefieldSources = {
  'desert-v1': { kind: 'generated', biome: 'desert', generatorVersion: 1, profileVersion: 'desert-v1' },
  'forest-v1': { kind: 'generated', biome: 'forest', generatorVersion: 1, profileVersion: 'forest-v1' },
  'grassland-v1': { kind: 'generated', biome: 'grassland', generatorVersion: 1, profileVersion: 'grassland-v1' },
  'wetlands-v1': { kind: 'generated', biome: 'wetlands', generatorVersion: 1, profileVersion: 'wetlands-v1' },
  'underdeep-caverns-v1': { kind: 'generated', biome: 'underdeep-caverns', generatorVersion: 1, profileVersion: 'underdeep-caverns-v1' },
  'quarry-v1': { kind: 'generated', biome: 'quarry', generatorVersion: 1, profileVersion: 'quarry-v1' },
  'graveyard-v1': { kind: 'generated', biome: 'graveyard', generatorVersion: 1, profileVersion: 'graveyard-v1' },
  'ember-wastes-v1': { kind: 'generated', biome: 'ember-wastes', generatorVersion: 1, profileVersion: 'ember-wastes-v1' },
  'winter-tundra-v1': { kind: 'generated', biome: 'winter-tundra', generatorVersion: 1, profileVersion: 'winter-tundra-v1' },
  'storm-coast-v1': { kind: 'generated', biome: 'storm-coast', generatorVersion: 1, profileVersion: 'storm-coast-v1' },
  'shattered-citadel-v1': { kind: 'generated', biome: 'shattered-citadel', generatorVersion: 1, profileVersion: 'shattered-citadel-v1' },
} as const;
export type GeneratedBattlefieldSource = typeof generatedBattlefieldSources[keyof typeof generatedBattlefieldSources];
export type BattlefieldSource = { readonly kind: 'authored'; readonly mapId: MapId } | GeneratedBattlefieldSource;

const generatedVersions = Object.values(generatedBattlefieldSources);
export function isGeneratedBattlefieldVersion(biome: unknown, generatorVersion: unknown, profileVersion: unknown): boolean {
  return generatedVersions.some(source => biome === source.biome && generatorVersion === source.generatorVersion &&
    profileVersion === source.profileVersion);
}
const generatedMapPrefixes = {
  'desert-v1': 'desert_',
  'forest-v1': 'forest_',
  'grassland-v1': 'grass_',
  'wetlands-v1': 'wetlands_',
  'underdeep-caverns-v1': 'underdeep_caverns_',
  'quarry-v1': 'quarry_',
  'graveyard-v1': 'graveyard_',
  'ember-wastes-v1': 'ember_wastes_',
  'winter-tundra-v1': 'winter_tundra_',
  'storm-coast-v1': 'storm_coast_',
  'shattered-citadel-v1': 'shattered_citadel_',
} satisfies Record<GeneratedBattlefieldSource['profileVersion'], string>;
export function generatedBattlefieldMapId(encounterId: string, profileVersion: GeneratedBattlefieldSource['profileVersion']): MapId {
  return `map:${generatedMapPrefixes[profileVersion]}${encounterId.slice(10)}`;
}

export interface BattlefieldEncounter {
  readonly id: EncounterId;
  readonly source: BattlefieldSource;
  readonly roster: readonly SpawnRecord[];
}
export function isBattlefieldSource(input: unknown): input is BattlefieldSource {
  return hasShape(input, ['kind','mapId']) && input.kind === 'authored' && typeof input.mapId === 'string' && /^map:[a-z][a-z0-9_]{0,63}$/.test(input.mapId) ||
    hasShape(input, ['kind','biome','generatorVersion','profileVersion']) && input.kind === 'generated' &&
    isGeneratedBattlefieldVersion(input.biome, input.generatorVersion, input.profileVersion);
}

/** Unknown encounter definitions must select exactly one supported source and a full stable roster. */
export function readBattlefieldEncounters(input:unknown,catalog:import('./types').ContentCatalog):
  {ok:true;encounters:readonly BattlefieldEncounter[]}|{ok:false;reason:string} {
  if(!isDenseArray(input,3)||input.length!==3)return {ok:false,reason:'Expected three encounters'};
  const seen=new Set<string>();
  for(const e of input) {
    const checked = readBattlefieldEncounter(e, catalog);
    if (!checked.ok) return checked;
    if (seen.has(checked.encounter.id)) return {ok:false,reason:'Invalid encounter source or ID'};
    seen.add(checked.encounter.id);
  }
  return {ok:true,encounters:input as BattlefieldEncounter[]};
}

/** The same admission rules also apply to a dungeon pool's individual pairing. */
export function readBattlefieldEncounter(e: unknown, catalog: import('./types').ContentCatalog):
  {ok:true;encounter:BattlefieldEncounter}|{ok:false;reason:string} {
    if(!hasShape(e,['id','source','roster'])||typeof e.id!=='string'||!/^encounter:[a-z][a-z0-9_]{0,63}$/.test(e.id)||!isBattlefieldSource(e.source))return {ok:false,reason:'Invalid encounter source or ID'};
    if(e.source.kind==='generated'&&generatedBattlefieldMapId(e.id, e.source.profileVersion).length > 68)return {ok:false,reason:'Generated encounter ID exceeds descriptor map limit'};
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
    return {ok:true,encounter:e as unknown as BattlefieldEncounter};
}
