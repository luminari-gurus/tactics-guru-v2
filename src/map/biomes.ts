import type { GeneratedMap } from './generate';

export const EXPANDED_BIOMES = [
  { id: 'grassland', label: 'Grassland', version: 'grassland-v1', open: 'Grass', blocked: 'Rock' },
  { id: 'forest', label: 'Forest', version: 'forest-v1', open: 'Clearing', blocked: 'Dense pines' },
  { id: 'desert', label: 'Desert', version: 'desert-v1', open: 'Sand', blocked: 'Rock' },
  { id: 'wetlands', label: 'Wetlands', version: 'wetlands-v1', open: 'Marsh path', blocked: 'Reed beds' },
  { id: 'underdeep-caverns', label: 'Underdeep Caverns', version: 'underdeep-caverns-v1', open: 'Cavern floor', blocked: 'Crystal walls' },
  { id: 'quarry', label: 'Quarry', version: 'quarry-v1', open: 'Gravel', blocked: 'Cut stone' },
  { id: 'graveyard', label: 'Graveyard', version: 'graveyard-v1', open: 'Earth', blocked: 'Gravestones' },
  { id: 'ember-wastes', label: 'Ember Wastes', version: 'ember-wastes-v1', open: 'Ash', blocked: 'Lava' },
  { id: 'winter-tundra', label: 'Winter Tundra', version: 'winter-tundra-v1', open: 'Packed snow', blocked: 'Ice ridges' },
] as const;
export const BIOMES = [
  ...EXPANDED_BIOMES,
  { id: 'storm-coast', label: 'Storm Coast', version: 'storm-coast-v1', open: 'Shore', blocked: 'Surf' },
  { id: 'shattered-citadel', label: 'Shattered Citadel', version: 'shattered-citadel-v1', open: 'Courtyard', blocked: 'Rubble' },
] as const;
export type Biome = typeof BIOMES[number]['id'];
export type Terrain = `${Biome}-open` | `${Biome}-blocked`;
export interface BiomeMap extends GeneratedMap {
  readonly biome: Biome;
  readonly biomeVersion: string;
  readonly terrain: readonly Terrain[];
}

/** Pure treatment: no random draws, topology changes or input mutation. */
export function applyBiome(layout: GeneratedMap, biome: Biome = 'grassland'): BiomeMap {
  const entry = BIOMES.find(entry => entry.id === biome);
  if (!entry) throw new RangeError('Invalid biome');
  return {
    ...layout,
    biome,
    biomeVersion: entry.version,
    terrain: layout.cells.map(cell => `${biome}-${cell === 1 ? 'open' : 'blocked'}` as Terrain),
  };
}
