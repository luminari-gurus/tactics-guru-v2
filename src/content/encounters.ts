import { readProgressHero } from '../domain/progression';
import { battleCatalog } from './catalog';
import { HERO_IDS } from './constants';
import type { ContentCatalog, MapId, MapRecord, SpawnRecord } from './types';
import { validateContent, type ContentError } from './validate';
import { woodlandCrossing } from './woodlandCrossing';
import { ruinedApproach } from './ruinedApproach';
import type { EncounterId, RunDefinition } from '../domain/run';
import { hasShape, isDenseArray } from '../domain/validation';

export interface EncounterRecord { readonly id: EncounterId; readonly mapId: MapId }
export type EncounterRead = { readonly ok: true; readonly encounters: readonly [EncounterRecord, EncounterRecord, EncounterRecord]; readonly catalog: ContentCatalog }
  | { readonly ok: false; readonly errors: readonly ContentError[] };

/** Unknown data is validated before any map or spawn can be consumed. */
export function readEncounters(input: unknown, content: unknown): EncounterRead {
  const checked = validateContent(content);
  if (!checked.ok) return checked;
  const errors: ContentError[] = [];
  const fail = (path: string, message: string) => errors.push({ code: 'reference', path, message });
  if (!isDenseArray(input, 3) || input.length !== 3) return { ok: false, errors: [{ code: 'shape', path: 'encounters', message: 'Expected exactly three encounter records.' }] };
  const ids = new Set<string>(), maps = new Set<string>();
  for (const [index, record] of input.entries()) {
    const path = `encounters[${index}]`;
    if (!hasShape(record, ['id', 'mapId']) || typeof record.id !== 'string' || !/^encounter:[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(record.id) || record.id.length > 74 ||
      typeof record.mapId !== 'string' || !Object.hasOwn(checked.catalog.maps, record.mapId)) { fail(path, 'Expected a bounded encounter ID and known map reference.'); continue; }
    if (ids.has(record.id) || maps.has(record.mapId)) fail(path, 'Encounter IDs and maps must be distinct.');
    ids.add(record.id); maps.add(record.mapId);
    const spawns = checked.catalog.maps[record.mapId as MapId].spawns;
    for (const heroId of HERO_IDS) if (spawns.filter(s => s.side === 'heroes' && s.unitId === heroId).length !== 1) fail(path, `Expected one ${heroId} spawn.`);
    if (!spawns.some(s => s.side === 'enemies')) fail(path, 'Expected an enemy spawn.');
  }
  return errors.length ? { ok: false, errors } : { ok: true, catalog: checked.catalog,
    encounters: input.map(record => ({ ...(record as unknown as EncounterRecord) })) as [EncounterRecord, EncounterRecord, EncounterRecord] };
}

const authored = readEncounters([
  { id: 'encounter:forest_ruins', mapId: 'map:forest_ruins' },
  { id: 'encounter:woodland_crossing', mapId: 'map:woodland_crossing' },
  { id: 'encounter:ruined_approach', mapId: 'map:ruined_approach' },
], { ...battleCatalog, maps: { ...battleCatalog.maps, [woodlandCrossing.id]: woodlandCrossing, [ruinedApproach.id]: ruinedApproach } });
if (!authored.ok) throw new Error(`Invalid authored encounters: ${JSON.stringify(authored.errors)}`);
export const runCatalog = authored.catalog;
export const authoredEncounters = authored.encounters;
export const authoredRun: RunDefinition = { encounters: authoredEncounters.map(e => e.id) as [EncounterId, EncounterId, EncounterId] };

/** Accept either the full carried party or describeRunBattle's living subset.
 * Return spawn data only; #80 owns carried-HP construction and replay. Trusted catalog/roster. */
export function projectEncounterSpawns(encounterId: unknown, party: unknown):
  { readonly ok: true; readonly map: MapRecord } | { readonly ok: false; readonly reason: 'invalidEncounter' | 'invalidParty' } {
  const catalog = runCatalog;
  const encounter = authoredEncounters.find(e => e.id === encounterId);
  if (!encounter || !Object.hasOwn(catalog.maps, encounter.mapId)) return { ok: false, reason: 'invalidEncounter' };
  if (!isDenseArray(party, 3) || party.length === 0) return { ok: false, reason: 'invalidParty' };
  const seen = new Set<string>(), living = new Set<string>();
  for (const hero of party) {
    if (typeof hero !== 'object' || hero === null || !hasShape(hero,Object.keys(hero))) return {ok:false,reason:'invalidParty'};
    const heroId = HERO_IDS.find(id => id === hero.heroId);
    if (!heroId || seen.has(heroId)) return {ok:false,reason:'invalidParty'};
    const progressed = Object.hasOwn(hero,'xp'), progress = progressed ? readProgressHero(hero,heroId,catalog) : null;
    if (progressed ? !progress : !hasShape(hero,['heroId','hp'])) return {ok:false,reason:'invalidParty'};
    if (typeof hero.hp !== 'number' || !Number.isSafeInteger(hero.hp) || hero.hp < 0 ||
      hero.hp > (progress?.maxHp ?? catalog.heroes[heroId].stats.maxHp)) return {ok:false,reason:'invalidParty'};
    seen.add(hero.heroId as string); if (hero.hp > 0) living.add(hero.heroId as string);
  }
  if (living.size === 0) return { ok: false, reason: 'invalidParty' };
  const map = catalog.maps[encounter.mapId];
  return { ok: true, map: { ...map, cells: map.cells.map(c => ({ ...c })),
    spawns: map.spawns.filter(s => s.side === 'enemies' || living.has(s.unitId)).map(s => ({ ...s }) as SpawnRecord) } };
}

/** Production source configuration. Authored fixtures remain available for content regression. */
export const battlefieldEncounters: readonly import('./battlefieldTypes').BattlefieldEncounter[] = authoredEncounters.map((encounter,index) => ({
  id: encounter.id,
  source: index < 2 ? {kind:'generated',biome:'desert',generatorVersion:1,profileVersion:'desert-v1'} : {kind:'authored',mapId:encounter.mapId},
  roster: runCatalog.maps[encounter.mapId].spawns.map((spawn,i) => index < 2 ? {...spawn,x:3+(i%3)*2,y:spawn.side==='heroes'?10:1} : {...spawn}),
}));
