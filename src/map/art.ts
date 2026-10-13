import type { Terrain } from './biomes';

export const ART_STYLES = [
  { id: 'simple', label: 'Simple' },
  { id: 'legacy-8bit', label: 'Legacy 8-bit' },
] as const;
export type ArtStyle = typeof ART_STYLES[number]['id'];

const grass = '00_terrain_grass_plains.png';
const artwork: Record<Terrain, string | undefined> = {
  'grassland-open': grass,
  'grassland-blocked': '04_terrain_mountain_blocked.png',
  'forest-open': grass,
  'forest-blocked': '01_terrain_forest.png',
  'desert-open': undefined,
  'desert-blocked': undefined,
};
export type ArtTreatment = { url?: string; fallback?: 'missing' | 'loading' | 'failed' };

/** One bounded cache per map view. Rendering and image completion consume no RNG. */
export function createMapArt(changed: () => void): (terrain: Terrain, style: ArtStyle) => ArtTreatment {
  const images = new Map<string, 'loading' | 'ready' | 'failed'>();
  return (terrain, style) => {
    if (style === 'simple') return {};
    const file = artwork[terrain];
    if (!file) return { fallback: 'missing' };
    const url = `${import.meta.env.BASE_URL}map-art/legacy-8bit/${file}`;
    if (!images.has(file)) {
      images.set(file, 'loading');
      const image = new Image();
      image.src = url;
      void image.decode().then(() => {
        images.set(file, 'ready');
        changed();
      }, () => {
        images.set(file, 'failed');
        changed();
      });
    }
    const state = images.get(file)!;
    return state === 'ready' ? { url } : { fallback: state };
  };
}
