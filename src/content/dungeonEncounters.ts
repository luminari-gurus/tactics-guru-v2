import { battlefieldEncounters, authoredEncounters, runCatalog } from './encounters';
import { desertRunCatalog } from './desertCatalog';
import { isBattlefieldSource, readBattlefieldEncounter, type BattlefieldSource } from './battlefieldTypes';
import type { ContentCatalog, SpawnRecord } from './types';
import { hasShape, isDenseArray } from '../domain/validation';
import { resolveBattlefield } from '../domain/battlefield';
import { hashJson } from '../domain/contentIdentity';

export const ENCOUNTER_KINDS = ['normal', 'elite', 'vault', 'boss'] as const;
export type EncounterKind = typeof ENCOUNTER_KINDS[number];
export type DungeonBiome = 'forest' | 'desert';
export interface DungeonComposition { readonly id: string; readonly roster: readonly SpawnRecord[] }
export interface DungeonMapChoice { readonly id: string; readonly source: BattlefieldSource; readonly compositionIds: readonly string[] }
export interface DungeonMapPool { readonly id: string; readonly biome: DungeonBiome; readonly maps: readonly DungeonMapChoice[] }
export interface DungeonBoss { readonly id: string; readonly biome: DungeonBiome; readonly poolId: string; readonly victory: 'all-enemies' }
export interface DungeonEncounterCatalog {
  readonly version: 1;
  readonly kinds: readonly EncounterKind[];
  readonly biomes: readonly { readonly id: DungeonBiome; readonly poolId: string; readonly bossId: string }[];
  readonly pools: readonly DungeonMapPool[];
  readonly compositions: readonly DungeonComposition[];
  readonly bosses: readonly DungeonBoss[];
}
const idOk = (id: unknown): id is string => typeof id === 'string' && /^[a-z][a-z0-9_]{0,47}$/.test(id);
const list = (value: unknown): value is unknown[] => isDenseArray(value, 32) && value.length > 0;
const biomeOk = (value: unknown): value is DungeonBiome => value === 'forest' || value === 'desert';

/** Bounded unknown data is checked before graph construction; no fallback to another pool. */
export function readDungeonEncounterCatalog(input: unknown, content: ContentCatalog = dungeonBattleCatalog):
  { readonly ok: true; readonly catalog: DungeonEncounterCatalog } | { readonly ok: false; readonly reason: string } {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!hasShape(input, ['version', 'kinds', 'biomes', 'pools', 'compositions', 'bosses']) || input.version !== 1 ||
    !isDenseArray(input.kinds, 4) || input.kinds.length !== 4 || new Set(input.kinds).size !== 4 || input.kinds.some(k => !ENCOUNTER_KINDS.includes(k as EncounterKind)) ||
    !list(input.biomes) || input.biomes.length !== 2 || !list(input.pools) || !list(input.compositions) || !list(input.bosses)) return fail('Invalid catalog shape or version');
  const compositions = new Map<string, DungeonComposition>();
  for (const c of input.compositions) {
    if (!hasShape(c, ['id', 'roster']) || !idOk(c.id) || compositions.has(c.id) || !isDenseArray(c.roster, 64)) return fail('Invalid composition');
    compositions.set(c.id, c as unknown as DungeonComposition);
  }
  const pools = new Map<string, DungeonMapPool>();
  for (const p of input.pools) {
    if (!hasShape(p, ['id', 'biome', 'maps']) || !idOk(p.id) || pools.has(p.id) || !biomeOk(p.biome) || !list(p.maps)) return fail('Invalid map pool');
    const maps = new Set<string>();
    for (const m of p.maps) {
      if (!hasShape(m, ['id', 'source', 'compositionIds']) || !idOk(m.id) || maps.has(m.id) || !isBattlefieldSource(m.source) ||
        (p.biome === 'forest' && m.source.kind !== 'authored') || (p.biome === 'desert' && m.source.kind !== 'generated') ||
        !list(m.compositionIds) || new Set(m.compositionIds).size !== m.compositionIds.length) return fail('Invalid map choice');
      maps.add(m.id);
      for (const id of m.compositionIds) {
        const c = typeof id === 'string' && compositions.get(id);
        if (!c) return fail('Unknown composition');
        const encounter = { id: `encounter:${m.id}`, source: m.source, roster: c.roster };
        const checked = readBattlefieldEncounter(encounter, content);
        if (!checked.ok) return fail(checked.reason);
        const resolved = resolveBattlefield(checked.encounter, 0, content);
        if (!resolved.ok) return fail(`Illegal ${p.id}/${m.id}/${id}: ${resolved.errors.map(e => e.detail).join('; ')}`);
        if (m.source.kind === 'generated' && !resolveBattlefield(checked.encounter, 0, content, { rejectCandidate: () => true }).ok) return fail('Illegal generated fallback');
      }
    }
    pools.set(p.id, p as unknown as DungeonMapPool);
  }
  const bosses = new Map<string, DungeonBoss>();
  for (const b of input.bosses) {
    if (!hasShape(b, ['id', 'biome', 'poolId', 'victory']) || !idOk(b.id) || bosses.has(b.id) || !biomeOk(b.biome) || b.victory !== 'all-enemies' ||
      typeof b.poolId !== 'string' || pools.get(b.poolId)?.biome !== b.biome) return fail('Invalid boss');
    bosses.set(b.id, b as unknown as DungeonBoss);
  }
  const biomes = new Set<string>(), usedPools = new Set<string>(), usedBosses = new Set<string>();
  for (const b of input.biomes) {
    if (!hasShape(b, ['id', 'poolId', 'bossId']) || !biomeOk(b.id) || biomes.has(b.id) || typeof b.poolId !== 'string' || pools.get(b.poolId)?.biome !== b.id ||
      typeof b.bossId !== 'string' || bosses.get(b.bossId)?.biome !== b.id) return fail('Invalid biome');
    biomes.add(b.id);
    usedPools.add(b.poolId); usedBosses.add(b.bossId);
  }
  // Unreferenced definitions are not enabled content and must not hide invalid rosters/packs.
  if ([...pools.keys()].some(id => !usedPools.has(id) && ![...bosses.values()].some(b => b.poolId === id)) ||
    [...bosses.keys()].some(id => !usedBosses.has(id)) ||
    [...compositions.keys()].some(id => ![...pools.values()].some(p => p.maps.some(m => m.compositionIds.includes(id))))) return fail('Unreferenced definition');
  return { ok: true, catalog: input as unknown as DungeonEncounterCatalog };
}

const forestCompositionId = (id: string) => id === 'encounter:forest_ruins' ? 'forest_ruins_shaman_v1' : id.slice(10);
const forestCompositions = authoredEncounters.map(e => ({ id: forestCompositionId(e.id),
  roster: runCatalog.maps[e.mapId].spawns.map(s => e.id === 'encounter:forest_ruins' && s.id === 6 && s.side === 'enemies'
    ? { ...s, unitId: 'goblin_shaman' as const } : s) }));
const desertCompositions = battlefieldEncounters.map((e, i) => ({ id: `desert_${i}`, roster: i < 2 ? e.roster :
  e.roster.map((s, n) => ({ ...s, x: 3 + (n % 3) * 2, y: s.side === 'heroes' ? 10 : 1 })) }));
const generated = { kind: 'generated', biome: 'desert', generatorVersion: 1, profileVersion: 'desert-v1' } as const;
// One step connects the isolated height-2 ruin to jump-1 actors. Other modes keep their original map.
const forestRuins = desertRunCatalog.maps['map:forest_ruins'];
export const dungeonBattleCatalog: ContentCatalog = { ...desertRunCatalog, maps: { ...desertRunCatalog.maps,
  [forestRuins.id]: { ...forestRuins, spawns: forestCompositions.find(c => c.id === 'forest_ruins_shaman_v1')!.roster,
    cells: forestRuins.cells.map(c => c.x === 4 && c.y === 2 ? { ...c, elevation: 1, terrainId: 'stone' } : c) },
} };
export const dungeonEncounterCatalog: DungeonEncounterCatalog = {
  version: 1, kinds: ENCOUNTER_KINDS,
  biomes: [{ id: 'forest', poolId: 'forest', bossId: 'forest_guardian' }, { id: 'desert', poolId: 'desert', bossId: 'desert_guardian' }],
  compositions: [...forestCompositions, ...desertCompositions],
  pools: [
    { id: 'forest', biome: 'forest', maps: authoredEncounters.slice(0, 2).map(e => ({ id: e.id.slice(10), source: { kind: 'authored', mapId: e.mapId }, compositionIds: [forestCompositionId(e.id)] })) },
    { id: 'forest_boss', biome: 'forest', maps: [{ id: 'ruined_approach', source: { kind: 'authored', mapId: authoredEncounters[2].mapId }, compositionIds: ['ruined_approach'] }] },
    { id: 'desert', biome: 'desert', maps: [{ id: 'desert_arena', source: generated, compositionIds: ['desert_0', 'desert_1'] }] },
    { id: 'desert_boss', biome: 'desert', maps: [{ id: 'desert_guardian', source: generated, compositionIds: ['desert_2'] }] },
  ],
  bosses: [{ id: 'forest_guardian', biome: 'forest', poolId: 'forest_boss', victory: 'all-enemies' }, { id: 'desert_guardian', biome: 'desert', poolId: 'desert_boss', victory: 'all-enemies' }],
};
/** Definition ordering is semantic only through stable IDs, never authoring array order. */
export function dungeonEncounterCatalogIdentity(catalog = dungeonEncounterCatalog): string {
  const sorted = <T extends {readonly id:string}>(xs: readonly T[]) => [...xs].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return hashJson({ ...catalog, kinds: [...catalog.kinds].sort(), biomes: sorted(catalog.biomes), compositions: sorted(catalog.compositions), bosses: sorted(catalog.bosses),
    pools: sorted(catalog.pools).map(p => ({ ...p, maps: sorted(p.maps).map(m => ({ ...m, compositionIds: [...m.compositionIds].sort() })) })) });
}
export const dungeonEncounterIdentity = dungeonEncounterCatalogIdentity();
