import { generatedBattlefieldSources } from './battlefieldTypes';
import {
  dungeonBattleCatalog, dungeonEncounterCatalog, dungeonEncounterCatalogIdentity, hobgoblinDungeonBattleCatalog,
  hobgoblinDungeonEncounterCatalog, type DungeonBiome, type DungeonComposition, type DungeonEncounterCatalog,
  type DungeonMapChoice,
} from './dungeonEncounters';
import { cavernsFamilyBattleContent } from './cavernsFamily';
import { emberWastesFamilyBattleContent } from './emberWastesFamily';
import { forestBossBattleContent } from './forestBosses';
import { forestFamilyBattleContent } from './forestFamily';
import { goblinFamilyBattleContent } from './goblinFamily';
import { graveyardFamilyBattleContent } from './graveyardFamily';
import { quarryFamilyBattleContent } from './quarryFamily';
import { wetlandsFamilyBattleContent } from './wetlandsFamily';
import { winterTundraFamilyBattleContent } from './winterTundraFamily';
import { sunscorchedDesertFamilyBattleContent } from './sunscorchedDesertFamily';
import { stormCoastFamilyBattleContent } from './stormCoastFamily';
import { shatteredCitadelFamilyBattleContent } from './shatteredCitadelFamily';
import { ruinedApproach } from './ruinedApproach';
import type { ContentCatalog, EnemyId, MapRecord, SpawnRecord, TerrainId } from './types';

type Roster = readonly [EnemyId, EnemyId?, EnemyId?];
interface ArenaPack {
  readonly biome: Exclude<DungeonBiome, 'desert'>;
  readonly ground: TerrainId;
  readonly obstacle: TerrainId;
  readonly patrols: readonly Roster[];
  readonly guardians: readonly Roster[];
}

const packs: readonly ArenaPack[] = [
  {
    biome: 'grassland', ground: 'grass', obstacle: 'forest',
    patrols: [['bramble_goblin', 'ruin_lookout'], ['goblin_snarehand', 'goblin_archer']],
    guardians: [['hobgoblin_warrior', 'goblin_grunt']],
  },
  {
    biome: 'forest', ground: 'grass', obstacle: 'forest',
    patrols: [
      ['briar_thrall', 'rotcap_sprout', 'spore_acolyte'],
      ['thornback_beetle', 'blob'],
      ['mossback_boar', 'rootling_skirmisher', 'bramble_goblin'],
      ['thornhide_warg', 'grove_hexer'],
      ['ancient_treantling', 'ivybound_knight'],
      ['owlbear_forager', 'goblin_snarehand'],
    ],
    guardians: [['hollow_root_matriarch', 'rootling_skirmisher'], ['ironmaw_furnace_beast', 'cinder_archer'], ['green_warden', 'briar_thrall']],
  },
  {
    biome: 'wetlands', ground: 'grass', obstacle: 'water',
    patrols: [
      ['lantern_imp', 'bog_gnawer', 'mire_goblin'],
      ['fenstalker', 'mire_hexer', 'bog_leech_swarm'],
      ['marsh_croaker', 'siltback_turtle', 'fen_strider'],
      ['reed_whisperer', 'swamp_stalker'],
      ['fen_hag', 'rotbloom_tendril'],
    ],
    guardians: [['drowned_warden', 'bog_gnawer'], ['lantern_hag', 'lantern_imp'], ['maw_of_the_fen', 'bog_leech_swarm']],
  },
  {
    biome: 'underdeep-caverns', ground: 'stone', obstacle: 'rock',
    patrols: [
      ['cave_skulk', 'spore_mite_cluster', 'tunnel_beetle'],
      ['fungus_slinger', 'echo_bat_swarm', 'deep_delver'],
      ['crystal_hermit', 'cave_troll'],
      ['mycelial_shepherd', 'chasm_drake'],
    ],
    guardians: [['hollow_matriarch_boss', 'cave_skulk']],
  },
  {
    biome: 'quarry', ground: 'sand', obstacle: 'rock',
    patrols: [
      ['blast_adept', 'chain_hauler', 'clockwork_drillguard'],
      ['dust_rat', 'echo_duelist', 'glass_squire'],
      ['ironhide_foreman', 'pit_ogre'],
      ['prism_seer', 'quarry_scab', 'quarry_vulture'],
      ['shardling', 'sling_sapper', 'stonebound_laborer'],
    ],
    guardians: [['grimgor', 'goblin_archer'], ['gorrak_the_breaker', 'quarry_scab'], ['mirror_knight', 'glass_squire']],
  },
  {
    biome: 'graveyard', ground: 'grass_path', obstacle: 'rock',
    patrols: [
      ['bone_pickman', 'bone_porter', 'skeleton_archer'],
      ['corpse_bride', 'crypt_bulwark', 'crypt_rat'],
      ['dust_wraith', 'grave_lantern', 'gravebinder'],
      ['ossuary_hound', 'shard_hurler'],
      ['sepulcher_golem', 'tomb_shield', 'wailing_mourner'],
    ],
    guardians: [['gravelord_kharrox', 'bone_pickman'], ['vorlach_the_hollow_crown', 'skeleton_archer']],
  },
  {
    biome: 'ember-wastes', ground: 'sand', obstacle: 'rock',
    patrols: [
      ['ash_crawler', 'ashen_duelist', 'ash_hound'],
      ['cinder_imp', 'ember_cultist', 'bellows_imp'],
      ['furnace_golem', 'lava_serpent', 'coal_goblin'],
      ['magma_crab', 'pyre_oracle', 'cinder_archer'],
      ['scoria_hound', 'smoke_wisp'],
    ],
    guardians: [['kiln_saint', 'cinder_imp']],
  },
  {
    biome: 'winter-tundra', ground: 'stone', obstacle: 'water',
    patrols: [['crystal_hermit', 'shardling'], ['bone_porter', 'ossuary_hound']],
    guardians: [['sepulcher_golem', 'skeleton_archer']],
  },
];

function buildArena(pack: ArenaPack, id: string, rosters: readonly Roster[]) {
  // Some registered enemies have jump 0 and need a fully connected level arena.
  const cells = ruinedApproach.cells.map(cell => ({
    ...cell, elevation: 0, terrainId: cell.terrainId === 'forest' ? pack.obstacle : cell.terrainId === 'grass' ? pack.ground : cell.terrainId,
  }));
  return rosters.map((units, index) => {
    const roster: SpawnRecord[] = ruinedApproach.spawns.filter(spawn => spawn.side === 'heroes');
    units.forEach((unitId, slot) => {
      if (!unitId) return;
      const { id: spawnId, x, y } = ruinedApproach.spawns[slot + 3];
      roster.push({ id: spawnId, x, y, side: 'enemies', unitId });
    });
    const choiceId = `${id}_${index + 1}`;
    const map: MapRecord = { ...ruinedApproach, id: `map:${choiceId}`, cells, spawns: roster };
    const composition: DungeonComposition = { id: choiceId, roster };
    const choice: DungeonMapChoice = {
      id: choiceId, source: { kind: 'authored', mapId: map.id }, compositionIds: [composition.id],
    };
    return { map, choice, composition };
  });
}

function biomeArenas(pack: ArenaPack, arenaId = pack.biome.replaceAll('-', '_')) {
  const id = pack.biome.replaceAll('-', '_');
  return {
    biome: pack.biome, poolId: id, bossId: `${id}_guardian`,
    patrol: buildArena(pack, `${arenaId}_patrol`, pack.patrols),
    guardian: buildArena(pack, `${arenaId}_guardian_arena`, pack.guardians),
  };
}

const arenas = packs.map(pack => biomeArenas(pack));

// Keep registry order aligned with the approved attack owner lists. Battles
// project only the optional units and textures used by the saved roster.
export const expandedDungeonBattleCatalog = [
  goblinFamilyBattleContent, forestFamilyBattleContent, forestBossBattleContent,
  wetlandsFamilyBattleContent, cavernsFamilyBattleContent, quarryFamilyBattleContent,
  graveyardFamilyBattleContent, emberWastesFamilyBattleContent,
].reduce<ContentCatalog>((catalog, addFamily) => addFamily(catalog), {
  ...hobgoblinDungeonBattleCatalog,
  maps: {
    ...hobgoblinDungeonBattleCatalog.maps,
    ...Object.fromEntries(arenas.flatMap(({ patrol, guardian }) => [...patrol, ...guardian].map(arena => arena.map)).map(map => [map.id, map])),
  },
});

export const expandedDungeonEncounterCatalog: DungeonEncounterCatalog = {
  ...hobgoblinDungeonEncounterCatalog,
  version: 2,
  biomes: [
    ...dungeonEncounterCatalog.biomes,
    ...arenas.filter(arena => arena.biome !== 'forest').map(({ biome, poolId, bossId }) => ({ id: biome, poolId, bossId })),
  ],
  compositions: [
    ...hobgoblinDungeonEncounterCatalog.compositions,
    ...arenas.flatMap(({ patrol, guardian }) => [...patrol, ...guardian].map(arena => arena.composition)),
  ],
  pools: [
    ...hobgoblinDungeonEncounterCatalog.pools.filter(pool => pool.biome === 'desert'),
    ...arenas.flatMap(({ biome, poolId, patrol, guardian }) => {
      const prior = hobgoblinDungeonEncounterCatalog.pools.find(pool => pool.id === poolId);
      const priorBoss = dungeonEncounterCatalog.pools.find(pool => pool.id === `${poolId}_boss`);
      return [
        { id: poolId, biome, maps: [...(prior?.maps ?? []), ...patrol.map(arena => arena.choice)] },
        { id: `${poolId}_boss`, biome, maps: [...(priorBoss?.maps ?? []), ...guardian.map(arena => arena.choice)] },
      ];
    }),
  ],
  bosses: [
    ...dungeonEncounterCatalog.bosses,
    ...arenas.filter(arena => arena.biome !== 'forest').map(({ biome, poolId, bossId }) => ({
      id: bossId, biome, poolId: `${poolId}_boss`, victory: 'all-enemies' as const,
    })),
  ],
};
export const expandedDungeonEncounterIdentity = dungeonEncounterCatalogIdentity(expandedDungeonEncounterCatalog);

const newArenas = [
  biomeArenas({
    biome: 'winter-tundra', ground: 'stone', obstacle: 'water',
    patrols: [
      ['frost_gnawer', 'drift_archer', 'snowblind_crow'],
      ['icebound_raider', 'rime_shaman', 'glacier_ram'],
      ['yeti_bruiser', 'ice_wraith'],
      ['frostforge_sentinel', 'aurora_seer'],
    ],
    guardians: [['hroth_whitehorn_king', 'frost_gnawer']],
  }, 'tundra_family'),
  biomeArenas({
    biome: 'storm-coast', ground: 'sand', obstacle: 'water',
    patrols: [
      ['salt_rat', 'gull_harrier', 'net_caster'],
      ['tide_crab', 'stormcaller_acolyte'],
      ['reef_stalker', 'siren_shade'],
      ['barnacle_golem', 'deckbreaker'],
      ['blackwake_captain', 'salt_rat'],
    ],
    guardians: [['admiral_blackwake', 'gull_harrier']],
  }),
  biomeArenas({
    biome: 'shattered-citadel', ground: 'stone', obstacle: 'rock',
    patrols: [
      ['ruin_squire', 'crossbow_levy', 'rubble_imp'],
      ['gate_warden', 'siege_engineer'],
      ['banner_knight', 'arcane_bailiff'],
      ['gargoyle_sentinel', 'crownless_champion'],
      ['iron_ram', 'ruin_squire'],
    ],
    guardians: [['crownless_regent', 'rubble_imp']],
  }),
];

const desertRosters: readonly Roster[] = [
  ['sand_jackal', 'dune_archer', 'mirage_pup'],
  ['saltbone_howler', 'dune_jackal', 'sand_bandit'],
  ['scarab_swarm', 'mirage_adept', 'camel_lancer'],
  ['sand_mummy', 'glass_viper'],
  ['obelisk_guardian', 'sandstorm_djinn'],
  ['caravan_reaver', 'mirage_pup'],
  ['sirocco_jackal_king', 'sand_jackal'],
  ['saffron_colossus', 'mirage_pup'],
];
const desertSpawns = dungeonEncounterCatalog.compositions.find(composition => composition.id === 'desert_2')!.roster;
const desertCompositions = desertRosters.map((units, index): DungeonComposition => {
  const roster: SpawnRecord[] = desertSpawns.filter(spawn => spawn.side === 'heroes');
  const enemySpawns = desertSpawns.filter(spawn => spawn.side === 'enemies');
  units.forEach((unitId, slot) => {
    if (unitId) roster.push({ ...enemySpawns[slot], side: 'enemies', unitId });
  });
  return { id: `sunscorched_desert_${index + 1}`, roster };
});

export const fullBiomeDungeonBattleCatalog = [
  winterTundraFamilyBattleContent, sunscorchedDesertFamilyBattleContent,
  stormCoastFamilyBattleContent, shatteredCitadelFamilyBattleContent,
].reduce<ContentCatalog>((catalog, addFamily) => addFamily(catalog), {
  ...expandedDungeonBattleCatalog,
  maps: {
    ...expandedDungeonBattleCatalog.maps,
    ...Object.fromEntries(newArenas.flatMap(({ patrol, guardian }) =>
      [...patrol, ...guardian].map(({ map }) => [map.id, map]))),
  },
});

const addedBiomes = newArenas.filter(arena => arena.biome !== 'winter-tundra');
export const fullBiomeDungeonEncounterCatalog: DungeonEncounterCatalog = {
  ...expandedDungeonEncounterCatalog,
  version: 3,
  biomes: [
    ...expandedDungeonEncounterCatalog.biomes,
    ...addedBiomes.map(({ biome, poolId, bossId }) => ({ id: biome, poolId, bossId })),
  ],
  compositions: [
    ...expandedDungeonEncounterCatalog.compositions,
    ...desertCompositions,
    ...newArenas.flatMap(({ patrol, guardian }) => [...patrol, ...guardian].map(arena => arena.composition)),
  ],
  pools: [
    ...expandedDungeonEncounterCatalog.pools.map(pool => pool.biome === 'desert'
      ? { ...pool, maps: pool.maps.map(map => ({
        ...map,
        compositionIds: [...map.compositionIds, ...(pool.id === 'desert'
          ? desertCompositions.slice(0, -2) : desertCompositions.slice(-2)).map(composition => composition.id)],
      })) }
      : pool.biome === 'winter-tundra'
        ? { ...pool, maps: [...pool.maps, ...(pool.id === 'winter_tundra' ? newArenas[0].patrol : newArenas[0].guardian).map(arena => arena.choice)] }
        : pool),
    ...addedBiomes.flatMap(({ biome, poolId, patrol, guardian }) => [
      { id: poolId, biome, maps: patrol.map(arena => arena.choice) },
      { id: `${poolId}_boss`, biome, maps: guardian.map(arena => arena.choice) },
    ]),
  ],
  bosses: [
    ...expandedDungeonEncounterCatalog.bosses,
    ...addedBiomes.map(({ biome, poolId, bossId }) => ({
      id: bossId, biome, poolId: `${poolId}_boss`, victory: 'all-enemies' as const,
    })),
  ],
};
export const fullBiomeDungeonEncounterIdentity = dungeonEncounterCatalogIdentity(fullBiomeDungeonEncounterCatalog);

export const proceduralDungeonEncounterCatalog: DungeonEncounterCatalog = {
  ...fullBiomeDungeonEncounterCatalog,
  version: 4,
  pools: fullBiomeDungeonEncounterCatalog.pools.map(pool => pool.biome === 'grassland' ? {
    ...pool,
    maps: pool.maps.map(map => ({ ...map, source: generatedBattlefieldSources['grassland-v1'] })),
  } : pool),
};
export const proceduralDungeonEncounterIdentity = dungeonEncounterCatalogIdentity(proceduralDungeonEncounterCatalog);

export const forestProceduralDungeonEncounterCatalog: DungeonEncounterCatalog = {
  ...proceduralDungeonEncounterCatalog,
  version: 5,
  pools: proceduralDungeonEncounterCatalog.pools.map(pool => pool.biome === 'forest' ? {
    ...pool,
    // The scripted formation keeps its authored deployment and tactical board.
    maps: pool.maps.map(map => map.id === 'hobgoblin_formation' ? map : {
      ...map, source: generatedBattlefieldSources['forest-v1'],
    }),
  } : pool),
};
export const forestProceduralDungeonEncounterIdentity = dungeonEncounterCatalogIdentity(forestProceduralDungeonEncounterCatalog);

export function expandedEncounterBattleCatalog(
  roster: readonly SpawnRecord[], mapId?: MapRecord['id'], catalog = expandedDungeonBattleCatalog,
): ContentCatalog {
  const selected = new Set(roster.map(spawn => spawn.unitId));
  const enemies = { ...dungeonBattleCatalog.enemies };
  const assets = { ...dungeonBattleCatalog.assets };
  for (const spawn of roster) {
    if (spawn.side !== 'enemies' || Object.hasOwn(enemies, spawn.unitId)) continue;
    const enemy = catalog.enemies[spawn.unitId];
    enemies[enemy.id] = enemy;
    assets[enemy.spriteAssetId] = catalog.assets[enemy.spriteAssetId];
    assets[enemy.portraitAssetId] = catalog.assets[enemy.portraitAssetId];
  }
  const abilities = { ...dungeonBattleCatalog.abilities };
  for (const ability of Object.values(catalog.abilities)) {
    if (ability.id === 'ability:shield_bash' && !selected.has('hobgoblin_warrior')) continue;
    const owners = ability.owners.filter(owner => Object.hasOwn(enemies, owner) || Object.hasOwn(dungeonBattleCatalog.heroes, owner));
    if (owners.length) abilities[ability.id] = { ...ability, owners };
  }
  const maps = mapId ? { [mapId]: catalog.maps[mapId] } : dungeonBattleCatalog.maps;
  return { ...dungeonBattleCatalog, enemies, assets, abilities, maps };
}
