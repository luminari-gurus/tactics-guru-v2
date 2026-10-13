import type { GeneratedMap } from './generate';

export const BIOMES = [
  { id: 'grassland', label: 'Grassland', version: 'grassland-v1', open: 'Grass', blocked: 'Rock' },
  { id: 'forest', label: 'Forest', version: 'forest-v1', open: 'Clearing', blocked: 'Dense pines' },
  { id: 'desert', label: 'Desert', version: 'desert-v1', open: 'Sand', blocked: 'Rock' },
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
