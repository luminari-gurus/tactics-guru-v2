// Square top-down sources; Phaser supplies projection and elevation geometry.
export const TERRAIN_IDS = ["grass","grass_path","stone","forest","tree_single","tree_cluster","tree_dense","water","cliff","mud","sand","ash","lava","brush"] as const;
export type TerrainId = typeof TERRAIN_IDS[number] | import('../content/types').TerrainId;
// Trees are separate props; their tile surfaces use the forest floor material.
export const MATERIAL_IDS = TERRAIN_IDS.filter(id =>
  id !== 'tree_single' && id !== 'tree_cluster' && id !== 'tree_dense' && id !== 'brush',
);
export const TERRAIN_MATERIALS = MATERIAL_IDS.map(id => ({
  id, key: `terrain-${id}`, url: `/textures/terrain/runtime/${id}-top-down-v1.png`,
  sourceUrl: `/textures/terrain/${id}-top-down-v1.png`,
}));
export const regionalTerrainTints: Partial<Record<TerrainId, number>> = {
  snow: 0xd8ecff,
  ice: 0x9adfff,
  crystal: 0xae8dff,
};

export function terrainTextureKey(id: TerrainId = 'grass'): string {
  const surface = id === 'rock' ? 'cliff' : id === 'tree_single' || id === 'tree_cluster' || id === 'tree_dense' ? 'forest' : id;
  return `terrain-${surface === 'brush' ? 'grass' : surface}`;
}
