/** Inclusive safe-integer limits enforced by runtime content validation. */
export const CONTENT_BOUNDS = {
  mapWidth: { min: 1, max: 32 }, mapHeight: { min: 1, max: 32 },
  coordinate: { min: 0, max: 31 }, elevation: { min: 0, max: 6 },
  spawnId: { min: 1, max: 64 }, maxHp: { min: 1, max: 100 },
  move: { min: 1, max: 8 }, jump: { min: 0, max: 4 },
  accuracy: { min: -10, max: 20 }, armorClass: { min: 1, max: 30 },
  power: { min: 0, max: 20 }, dexterity: { min: -10, max: 20 },
  will: { min: -10, max: 20 }, moveCost: { min: 1, max: 8 },
  imageDimension: { min: 1, max: 4096 },
} as const;

/** Forest ground, paths, ruins/platforms, forest floor and water; props are separate. */
export const FIRST_MAP_TERRAIN_IDS = ['grass', 'grass_path', 'stone', 'forest', 'water'] as const;
export const HERO_IDS = ['fighter', 'ranger', 'mage'] as const;
export const CORE_ENEMY_IDS = ['goblin_grunt', 'goblin_archer', 'goblin_shaman'] as const;
/** Extra enemies a catalog may omit; required only when that catalog includes them. */
export const OPTIONAL_ENEMY_IDS = [
  'hobgoblin_warrior', 'bramble_goblin', 'goblin_snarehand', 'mire_goblin', 'coal_goblin', 'ruin_lookout',
  'briar_thrall', 'rotcap_sprout', 'spore_acolyte', 'thornback_beetle', 'blob',
  'cinder_archer', 'ash_hound', 'bellows_imp', 'mossback_boar', 'rootling_skirmisher',
  'thornhide_warg', 'grove_hexer', 'ancient_treantling', 'owlbear_forager', 'ivybound_knight',
  'hollow_root_matriarch', 'ironmaw_furnace_beast', 'green_warden',
  'lantern_imp', 'bog_gnawer', 'fenstalker', 'mire_hexer', 'bog_leech_swarm',
  'marsh_croaker', 'siltback_turtle', 'fen_strider', 'reed_whisperer', 'swamp_stalker',
  'fen_hag', 'rotbloom_tendril', 'drowned_warden',
  'lantern_hag', 'maw_of_the_fen',
  'cave_skulk', 'spore_mite_cluster', 'tunnel_beetle', 'fungus_slinger', 'echo_bat_swarm',
  'deep_delver', 'crystal_hermit', 'cave_troll', 'mycelial_shepherd', 'chasm_drake',
  'hollow_matriarch_boss',
  'blast_adept', 'chain_hauler', 'clockwork_drillguard', 'dust_rat', 'echo_duelist',
  'glass_squire', 'ironhide_foreman', 'pit_ogre', 'prism_seer', 'quarry_scab',
  'quarry_vulture', 'shardling', 'sling_sapper', 'stonebound_laborer',
  'grimgor', 'gorrak_the_breaker', 'mirror_knight',
  'bone_pickman', 'bone_porter', 'corpse_bride', 'crypt_bulwark', 'crypt_rat',
  'dust_wraith', 'grave_lantern', 'gravebinder', 'ossuary_hound', 'sepulcher_golem',
  'shard_hurler', 'skeleton_archer', 'tomb_shield', 'wailing_mourner',
  'gravelord_kharrox', 'vorlach_the_hollow_crown',
] as const;
export const ENEMY_IDS = [...CORE_ENEMY_IDS, ...OPTIONAL_ENEMY_IDS] as const;
export const BASIC_ATTACK_OPTIONAL_ENEMY_IDS = [
  'hobgoblin_warrior', 'bramble_goblin', 'goblin_snarehand', 'mire_goblin', 'coal_goblin',
  'briar_thrall', 'rotcap_sprout', 'spore_acolyte', 'thornback_beetle', 'blob',
  'ash_hound', 'bellows_imp', 'mossback_boar', 'rootling_skirmisher',
  'thornhide_warg', 'grove_hexer', 'ancient_treantling', 'owlbear_forager', 'ivybound_knight',
  'hollow_root_matriarch', 'ironmaw_furnace_beast', 'green_warden',
  'lantern_imp', 'bog_gnawer', 'fenstalker', 'mire_hexer', 'bog_leech_swarm',
  'marsh_croaker', 'siltback_turtle', 'fen_strider', 'reed_whisperer', 'swamp_stalker',
  'fen_hag', 'rotbloom_tendril', 'drowned_warden',
  'lantern_hag', 'maw_of_the_fen',
  'cave_skulk', 'spore_mite_cluster', 'tunnel_beetle', 'echo_bat_swarm',
  'deep_delver', 'cave_troll', 'mycelial_shepherd', 'chasm_drake',
  'hollow_matriarch_boss',
  'blast_adept', 'chain_hauler', 'clockwork_drillguard', 'dust_rat', 'echo_duelist',
  'glass_squire', 'ironhide_foreman', 'pit_ogre', 'prism_seer', 'quarry_scab',
  'shardling', 'stonebound_laborer',
  'grimgor', 'gorrak_the_breaker', 'mirror_knight',
  'bone_pickman', 'bone_porter', 'corpse_bride', 'crypt_bulwark', 'crypt_rat',
  'dust_wraith', 'grave_lantern', 'gravebinder', 'ossuary_hound', 'sepulcher_golem',
  'tomb_shield', 'wailing_mourner',
  'gravelord_kharrox', 'vorlach_the_hollow_crown',
] as const;
export const SHORTBOW_OPTIONAL_ENEMY_IDS = [
  'ruin_lookout', 'cinder_archer', 'fungus_slinger', 'crystal_hermit', 'sling_sapper', 'quarry_vulture',
  'shard_hurler', 'skeleton_archer',
] as const;
/** Explicit eligible support targets; future enemy IDs do not acquire healing by name. */
export const HEAL_GOBLIN_IDS = ['goblin_grunt', 'goblin_archer', 'goblin_shaman'] as const;
/** Initial attack catalog limits; runtime validation also requires min range <= max range. */
export const ATTACK_BOUNDS = {
  rangeMin: { min: 1, max: 20 }, rangeMax: { min: 1, max: 20 },
  baseDamage: { min: 1, max: 20 }, uphillDamage: { min: 0, max: 20 },
} as const;
export const GUARDED_STRIKE_TRADEOFF = { attackPenalty: 2, armorClassBonus: 2 } as const;
export const TERRAIN_TEXTURE_SPEC = {
  sourceWidth: 1024, sourceHeight: 1024, runtimeWidth: 256, runtimeHeight: 256,
  format: 'png', orientation: 'top-down', cellsPerTexture: 1,
  opaque: true, edgeTreatment: 'seamless-repeat', bakedGeometry: false,
} as const;

/** 3.5E damage/count; slice targeting uses a five-tile maximum and three-tile target spread. */
export const MAGIC_MISSILE = { damageDie: 4, damageBonus: 1, maxMissiles: 5, targetSpread: 3 } as const;
