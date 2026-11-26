import { dungeonBattleCatalog, dungeonEncounterCatalog, dungeonEncounterIdentity, hobgoblinDungeonBattleCatalog,
  hobgoblinDungeonEncounterCatalog, hobgoblinEncounterIdentity, type DungeonBiome, type EncounterKind } from '../content/dungeonEncounters';
import { readBattlefieldEncounter, type BattlefieldEncounter } from '../content/battlefieldTypes';
import { HERO_PROGRESSION } from '../content/progression';
import { CONTENT_BOUNDS } from '../content/constants';
import type { ContentCatalog, EnemyId } from '../content/types';
import { canonical, hashJson } from './contentIdentity';
import { rollDie, seedRng } from './rng';
import { battlefieldEncounters } from '../content/encounters';
import { hasShape } from './validation';
import { BIOMES, EXPANDED_BIOMES } from '../map/biomes';
import {
  expandedDungeonBattleCatalog, expandedDungeonEncounterCatalog, expandedDungeonEncounterIdentity, expandedEncounterBattleCatalog,
  fullBiomeDungeonBattleCatalog, fullBiomeDungeonEncounterCatalog, fullBiomeDungeonEncounterIdentity,
} from '../content/expandedDungeonEncounters';

export const DUNGEON_ENCOUNTER_POLICY = 'dungeon-encounters-v1';
export const EXPANDED_ENCOUNTER_POLICY = 'dungeon-encounters-v2';
export const FULL_BIOME_ENCOUNTER_POLICY = 'dungeon-encounters-v3';
export const ENEMY_SCALING_POLICY = 'enemy-depth-v1';
export const LEGACY_ENCOUNTER_POLICY = 'legacy-fixed-v1';
export const PARTY_SCALING_POLICY = 'enemy-party-v1';
export const ENDLESS_SCALING_POLICY = 'enemy-party-v2';
type ScalingPolicy = typeof ENDLESS_SCALING_POLICY | typeof ENEMY_SCALING_POLICY | typeof PARTY_SCALING_POLICY;
const expandedPolicies = {
  [EXPANDED_ENCOUNTER_POLICY]: {
    biomes: EXPANDED_BIOMES, catalog: expandedDungeonEncounterCatalog,
    identity: expandedDungeonEncounterIdentity, content: expandedDungeonBattleCatalog,
  },
  [FULL_BIOME_ENCOUNTER_POLICY]: {
    biomes: BIOMES, catalog: fullBiomeDungeonEncounterCatalog,
    identity: fullBiomeDungeonEncounterIdentity, content: fullBiomeDungeonBattleCatalog,
  },
};
type SeededEncounterPolicy = typeof DUNGEON_ENCOUNTER_POLICY | keyof typeof expandedPolicies;
export function isSeededEncounterPolicy(value: unknown): value is SeededEncounterPolicy {
  return value === DUNGEON_ENCOUNTER_POLICY || (typeof value === 'string' && Object.hasOwn(expandedPolicies, value));
}
export type DungeonEncounterPolicy = SeededEncounterPolicy | typeof LEGACY_ENCOUNTER_POLICY;
export interface DungeonEncounterSelection {
  readonly policy: SeededEncounterPolicy; readonly catalogIdentity: string;
  readonly biome: DungeonBiome; readonly kind: EncounterKind; readonly depth: number;
  readonly poolId: string; readonly mapId: string; readonly compositionId: string; readonly bossId: string | null;
  readonly scalingPolicy: ScalingPolicy; readonly encounter: BattlefieldEncounter;
}
export interface LegacyEncounterSelection {
  readonly policy: typeof LEGACY_ENCOUNTER_POLICY; readonly depth: number; readonly kind: 'normal' | 'boss';
  readonly encounter: BattlefieldEncounter;
}
export type EncounterSelection = DungeonEncounterSelection | LegacyEncounterSelection;
export function encounterBattleCatalog(selection: EncounterSelection): ContentCatalog {
  if (selection.policy !== LEGACY_ENCOUNTER_POLICY && selection.policy !== DUNGEON_ENCOUNTER_POLICY) {
    const { source, roster } = selection.encounter;
    return expandedEncounterBattleCatalog(roster, source.kind === 'authored' ? source.mapId : undefined, expandedPolicies[selection.policy].content);
  }
  return selection.policy === DUNGEON_ENCOUNTER_POLICY && selection.mapId === 'hobgoblin_formation'
    ? hobgoblinDungeonBattleCatalog : dungeonBattleCatalog;
}
export function legacyDungeonEncounter(depth: number, slot: number): LegacyEncounterSelection {
  if (!depthOk(depth) || !Number.isInteger(slot) || slot < 0 || slot > 2) throw new RangeError('Invalid legacy encounter');
  const e = battlefieldEncounters[slot];
  return { policy: LEGACY_ENCOUNTER_POLICY, depth, kind: slot === 2 ? 'boss' : 'normal',
    encounter: { ...e, source: { ...e.source }, roster: e.roster.map(s => ({ ...s })) } };
}
/** Validate saved facts against the version they name. No selection stream is sampled. */
export function readDungeonEncounterSelection(input: unknown, depth: number, slot: number, biome: DungeonBiome | 'grassland', policy: DungeonEncounterPolicy): EncounterSelection | null {
  if (policy === LEGACY_ENCOUNTER_POLICY) {
    const expected = legacyDungeonEncounter(depth, slot);
    return hasShape(input, ['policy', 'depth', 'kind', 'encounter']) && readBattlefieldEncounter(input.encounter, dungeonBattleCatalog).ok && canonical(input) === canonical(expected) ? expected : null;
  }
  const expanded = policy === DUNGEON_ENCOUNTER_POLICY ? undefined : expandedPolicies[policy];
  if (!hasShape(input, ['policy', 'catalogIdentity', 'biome', 'kind', 'depth', 'poolId', 'mapId', 'compositionId', 'bossId', 'scalingPolicy', 'encounter']) ||
    input.policy !== policy || input.depth !== depth || input.biome !== biome ||
    (input.scalingPolicy !== ENEMY_SCALING_POLICY && !(expanded && (input.scalingPolicy === PARTY_SCALING_POLICY || input.scalingPolicy === ENDLESS_SCALING_POLICY))) || (slot === 0 ? input.kind !== 'normal' : slot === 2 ? input.kind !== 'boss' : !['elite', 'vault'].includes(input.kind as string))) return null;
  const hasHobgoblins = !expanded && input.catalogIdentity === hobgoblinEncounterIdentity;
  const catalogIdentity = expanded?.identity ?? (hasHobgoblins ? hobgoblinEncounterIdentity : dungeonEncounterIdentity);
  if (input.catalogIdentity !== catalogIdentity) return null;
  if ((hasHobgoblins || input.mapId === 'hobgoblin_formation') &&
    (depth < 2 || slot !== 1 || biome !== 'forest' || input.mapId !== 'hobgoblin_formation')) return null;
  const catalog = expanded?.catalog ?? (hasHobgoblins ? hobgoblinDungeonEncounterCatalog : dungeonEncounterCatalog);
  const definition = catalog.biomes.find(b => b.id === biome);
  if (!definition) return null;
  const boss = slot === 2 ? catalog.bosses.find(b => b.id === definition.bossId)! : null;
  const pool = catalog.pools.find(p => p.id === (boss?.poolId ?? definition.poolId))!;
  const map = pool.maps.find(m => m.id === input.mapId);
  const composition = catalog.compositions.find(c => c.id === input.compositionId);
  if (input.poolId !== pool.id || input.bossId !== (boss?.id ?? null) || !map || !composition || !map.compositionIds.includes(composition.id)) return null;
  const expected: DungeonEncounterSelection = { policy, catalogIdentity, biome: definition.id,
    kind: input.kind as EncounterKind, depth, poolId: pool.id, mapId: map.id, compositionId: composition.id, bossId: boss?.id ?? null,
    scalingPolicy: input.scalingPolicy as ScalingPolicy, encounter: { id: `encounter:${map.id}`, source: { ...map.source }, roster: composition.roster.map(s => ({ ...s })) } };
  const content = expanded?.content ?? (hasHobgoblins ? hobgoblinDungeonBattleCatalog : dungeonBattleCatalog);
  return readBattlefieldEncounter(input.encounter, content).ok && canonical(input) === canonical(expected) ? expected : null;
}
const depthOk = (depth: number) => Number.isSafeInteger(depth) && depth >= 1;
export function encounterSelectionSeed(seed: number, depth: number, slot: number, purpose: 'biome' | 'kind' | 'map' | 'composition' | 'hobgoblin', policy: SeededEncounterPolicy = DUNGEON_ENCOUNTER_POLICY): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !depthOk(depth) || !Number.isInteger(slot) || slot < 0 || slot > 2 ||
    !['biome', 'kind', 'map', 'composition', 'hobgoblin'].includes(purpose)) throw new RangeError('Invalid encounter seed inputs');
  return Number.parseInt(hashJson({ policy, seed, depth, slot, purpose }).slice(-8), 16);
}
export function dungeonBiome(seed: number, depth: number, policy: SeededEncounterPolicy = DUNGEON_ENCOUNTER_POLICY): DungeonBiome {
  if (!depthOk(depth)) throw new RangeError('Invalid depth');
  const biomes = policy === DUNGEON_ENCOUNTER_POLICY ? ['forest', 'desert'] as const : expandedPolicies[policy].biomes.map(biome => biome.id);
  const first = rollDie(seedRng(encounterSelectionSeed(seed, 1, 0, 'biome', policy)), biomes.length).value - 1;
  return biomes[(first + (depth - 1) % biomes.length) % biomes.length];
}
/** Select once for a fresh floor. Readers resolve saved definitions; they never call this. */
export function selectDungeonEncounter(seed: number, depth: number, slot: number, policy: SeededEncounterPolicy = DUNGEON_ENCOUNTER_POLICY): DungeonEncounterSelection {
  const choose = <T>(values: readonly T[], purpose: 'kind' | 'map' | 'composition'): T =>
    values[rollDie(seedRng(encounterSelectionSeed(seed, depth, slot, purpose, policy)), values.length).value - 1];
  const expanded = policy === DUNGEON_ENCOUNTER_POLICY ? undefined : expandedPolicies[policy];
  const biome = dungeonBiome(seed, depth, policy);
  const useHobgoblins = biome === 'forest' && depth >= 2 && slot === 1 &&
    rollDie(seedRng(encounterSelectionSeed(seed, depth, slot, 'hobgoblin', policy)), 3).value === 1;
  const catalog = expanded?.catalog ?? (useHobgoblins ? hobgoblinDungeonEncounterCatalog : dungeonEncounterCatalog);
  const definition = catalog.biomes.find(b => b.id === biome)!;
  // Validate the slot even when every selected pool contains only one definition.
  encounterSelectionSeed(seed, depth, slot, 'kind', policy);
  const kind: EncounterKind = slot === 0 ? 'normal' : slot === 2 ? 'boss' : choose(['elite', 'vault'] as const, 'kind');
  const boss = kind === 'boss' ? catalog.bosses.find(b => b.id === definition.bossId)! : null;
  const pool = catalog.pools.find(p => p.id === (boss?.poolId ?? definition.poolId))!;
  const map = useHobgoblins ? pool.maps.find(choice => choice.id === 'hobgoblin_formation')! :
    choose(pool.maps.filter(choice => choice.id !== 'hobgoblin_formation').sort((a,b) => a.id < b.id ? -1 : 1), 'map');
  const compositionId = choose([...map.compositionIds].sort(), 'composition');
  const composition = catalog.compositions.find(c => c.id === compositionId)!;
  const catalogIdentity = expanded?.identity ?? (useHobgoblins ? hobgoblinEncounterIdentity : dungeonEncounterIdentity);
  return { policy, catalogIdentity, biome, kind, depth, poolId: pool.id, mapId: map.id,
    compositionId, bossId: boss?.id ?? null, scalingPolicy: expanded ? ENDLESS_SCALING_POLICY : ENEMY_SCALING_POLICY,
    encounter: { id: `encounter:${map.id}`, source: { ...map.source }, roster: composition.roster.map(s => ({ ...s })) } };
}

export type ScaledEnemyStat = 'maxHp' | 'power' | 'accuracy' | 'armorClass';
/** Saturate before multiplying. Below the threshold all arithmetic is small and exact. */
export function scaleEnemyStat(base: number, depth: number, kind: EncounterKind, field: ScaledEnemyStat): number {
  const bounds = CONTENT_BOUNDS[field];
  if (!bounds || !Number.isSafeInteger(base) || base < bounds.min || base > bounds.max || !depthOk(depth) ||
    !dungeonEncounterCatalog.kinds.includes(kind)) throw new RangeError('Invalid enemy projection');
  const clamp = (n: number) => Math.max(bounds.min, Math.min(bounds.max, n));
  if (base === 0) return 0;
  const limit = base > 0 ? bounds.max : -bounds.min;
  const saturated = depth >= Math.ceil((limit * 10 + 5) / Math.abs(base));
  const scaled = saturated ? (base > 0 ? bounds.max : bounds.min) : clamp(Math.floor((base * (depth + 9) + 5) / 10));
  return kind === 'vault' ? clamp(Math.floor((scaled * 12 + 5) / 10)) : scaled;
}
/** The baseline is intentionally fixed; callers cannot accidentally scale a prior projection. */
export function projectDungeonEnemies(depth: number, kind: EncounterKind, catalog = dungeonBattleCatalog, scalingPolicy: ScalingPolicy = ENEMY_SCALING_POLICY, partyStrength = 3): ContentCatalog {
  if (!depthOk(depth)) throw new RangeError('Invalid depth');
  const { awards, thresholds } = HERO_PROGRESSION;
  const floorXp = awards.normal + Math.min(awards.elite, awards.vault) + awards.boss;
  const expectedLevel = thresholds.filter(xp => depth - 1 >= Math.ceil(xp / floorXp)).length;
  const cappedAtDepth = 1 + Math.ceil(thresholds[thresholds.length - 1] / floorXp);
  const extraFloors = Math.max(0, depth - cappedAtDepth);
  // Saved v1 floors retain the original taper. Fresh floors gain endurance at doubling intervals.
  const endless = scalingPolicy === ENDLESS_SCALING_POLICY;
  const partyScaled = endless || scalingPolicy === PARTY_SCALING_POLICY;
  const extraHpFraction = endless ? 0.1 * Math.log2(1 + extraFloors / 4) : 0.2 * (extraFloors / (extraFloors + 4));
  const enemies = { ...catalog.enemies };
  for (const id of Object.keys(enemies) as EnemyId[]) {
    const enemy = catalog.enemies[id], stats = { ...enemy.stats };
    for (const field of ['maxHp', 'power', 'accuracy', 'armorClass'] as const) {
      // Hero leveling adds HP and abilities, but no accuracy or armor class.
      if (partyScaled && (field === 'accuracy' || field === 'armorClass')) continue;
      stats[field] = scaleEnemyStat(enemy.stats[field], partyScaled ? expectedLevel : depth, kind, field);
    }
    if (partyScaled) {
      const projectedHp = stats.maxHp + Math.round(enemy.stats.maxHp * extraHpFraction);
      const endurance = endless ? projectedHp : Math.min(CONTENT_BOUNDS.maxHp.max, projectedHp);
      // Fewer living heroes means fewer player actions per round. Freeze the allowance at battle entry.
      const partyFactor = 0.25 + 0.75 * (partyStrength / 3);
      stats.maxHp = Math.max(1, Math.round(endurance * partyFactor));
      stats.power = Math.round(stats.power * partyFactor);
    }
    enemies[id] = { ...enemy, stats };
  }
  return { ...catalog, enemies };
}
