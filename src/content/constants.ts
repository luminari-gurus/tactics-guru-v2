/** Inclusive safe-integer limits enforced by runtime content validation. */
export const CONTENT_BOUNDS = {
  mapWidth: { min: 1, max: 32 }, mapHeight: { min: 1, max: 32 },
  coordinate: { min: 0, max: 31 }, elevation: { min: 0, max: 4 },
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
export const ENEMY_IDS = ['goblin_grunt', 'goblin_archer'] as const;
/** Initial attack catalog limits; runtime validation also requires min range <= max range. */
export const ATTACK_BOUNDS = {
  rangeMin: { min: 1, max: 20 }, rangeMax: { min: 1, max: 20 },
  baseDamage: { min: 1, max: 20 }, uphillDamage: { min: 0, max: 20 },
} as const;
export const FIGHTING_DEFENSIVELY = { attackPenalty: 4, armorClassBonus: 2 } as const;
export const TERRAIN_TEXTURE_SPEC = {
  sourceWidth: 1024, sourceHeight: 1024, runtimeWidth: 256, runtimeHeight: 256,
  format: 'png', orientation: 'top-down', cellsPerTexture: 1,
  opaque: true, edgeTreatment: 'seamless-repeat', bakedGeometry: false,
} as const;

/** 3.5E damage/count; slice targeting uses a five-tile maximum and three-tile target spread. */
export const MAGIC_MISSILE = { damageDie: 4, damageBonus: 1, maxMissiles: 5, targetSpread: 3 } as const;
