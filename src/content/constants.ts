/** Inclusive safe-integer limits; runtime validation belongs to subsequent content work. */
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
export const TERRAIN_TEXTURE_SPEC = {
  sourceWidth: 1024, sourceHeight: 1024, runtimeWidth: 256, runtimeHeight: 256,
  format: 'png', orientation: 'top-down', cellsPerTexture: 1,
  opaque: true, edgeTreatment: 'seamless-repeat', bakedGeometry: false,
} as const;
