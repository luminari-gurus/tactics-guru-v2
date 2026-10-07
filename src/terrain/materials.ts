// Square top-down sources; Phaser supplies projection and elevation geometry.
export const TERRAIN_IDS = ["grass","grass_path","stone","forest","tree_single","tree_cluster","tree_dense","water","cliff","mud","sand","ash","lava","brush"] as const;
export type TerrainId = typeof TERRAIN_IDS[number];
export const TERRAIN_MATERIALS = TERRAIN_IDS.map(id => ({
  id, key: `terrain-${id}`, url: `/textures/terrain/runtime/${id}-top-down-v1.png`,
  sourceUrl: `/textures/terrain/${id}-top-down-v1.png`,
}));
export function terrainTextureKey(id: TerrainId = 'grass'): string {
  return `terrain-${id}`;
}
