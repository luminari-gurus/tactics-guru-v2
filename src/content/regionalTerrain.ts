import { ORIGINAL_TERRAIN_TEXTURE_SPEC } from './constants';
import type { GeneratedBattlefieldSource } from './battlefieldTypes';
import type { AssetRecord, ContentCatalog, TerrainRecord } from './types';

function material(id: 'mud' | 'ash' | 'lava', sourceSha256: string, prompt: string): AssetRecord {
  const textureSpec = ORIGINAL_TERRAIN_TEXTURE_SPEC;
  return {
    id: `asset:terrain_${id}`, kind: 'terrain-surface',
    sourcePath: `public/textures/terrain/${id}-top-down-v1.png`,
    runtimePath: `/textures/terrain/runtime/${id}-top-down-v1.png`,
    sourceWidth: textureSpec.sourceWidth, sourceHeight: textureSpec.sourceHeight,
    runtimeWidth: textureSpec.runtimeWidth, runtimeHeight: textureSpec.runtimeHeight,
    format: textureSpec.format, textureSpec,
    provenance: {
      origin: 'generated', tool: 'Built-in image_gen', generatedAt: '2026-10-07', prompt,
      referenceAssetIds: [], sourceSha256,
      rightsNote: 'Existing project-generated terrain material.',
      productionNotes: 'Original square source and Lanczos runtime export are recorded in docs/art/terrain-manifest-v1.json.',
    },
  };
}

export const regionalTerrainAssets = {
  'asset:terrain_mud': material('mud', 'ea341bef832f0e5160779b70a4d0044758e16f355495f84dd0605a1024683cd8', 'Opaque top-down marsh mud. See docs/art/terrain-prompts-v1.json.'),
  'asset:terrain_ash': material('ash', '35aadd201ef9dd77993e4144514791770f1a1cfa751d72773dbc67894721620b', 'Opaque top-down volcanic ash. See docs/art/terrain-prompts-v1.json.'),
  'asset:terrain_lava': material('lava', 'c245b7b9b5c3b724322398e603164cfdabdf7b85f134eed9eec41993d30561ea', 'Opaque top-down lava. See docs/art/terrain-prompts-v1.json.'),
};

const terrains = {
  mud: { id: 'mud', surfaceAssetId: 'asset:terrain_mud', moveCost: 2, walkable: true, blocksLineOfSight: false },
  ash: { id: 'ash', surfaceAssetId: 'asset:terrain_ash', moveCost: 1, walkable: true, blocksLineOfSight: false },
  lava: { id: 'lava', surfaceAssetId: 'asset:terrain_lava', moveCost: 1, walkable: false, blocksLineOfSight: false },
  snow: { id: 'snow', surfaceAssetId: 'asset:terrain_stone', moveCost: 2, walkable: true, blocksLineOfSight: false },
  ice: { id: 'ice', surfaceAssetId: 'asset:terrain_water', moveCost: 1, walkable: true, blocksLineOfSight: false },
  crystal: { id: 'crystal', surfaceAssetId: 'asset:terrain_rock', moveCost: 1, walkable: false, blocksLineOfSight: true },
  rubble: { id: 'rubble', surfaceAssetId: 'asset:terrain_rock', moveCost: 1, walkable: false, blocksLineOfSight: true },
} as const satisfies Record<string, TerrainRecord>;
type RegionalTerrain = keyof typeof terrains;

const profileTerrains: Partial<Record<GeneratedBattlefieldSource['profileVersion'], readonly RegionalTerrain[]>> = {
  'wetlands-v1': ['mud'],
  'underdeep-caverns-v1': ['crystal', 'rubble'],
  'quarry-v1': ['rubble'],
  'graveyard-v1': ['rubble'],
  'ember-wastes-v1': ['ash', 'lava', 'rubble'],
  'winter-tundra-v1': ['snow', 'ice', 'rubble'],
  'storm-coast-v1': ['rubble'],
  'shattered-citadel-v1': ['rubble'],
};

/** Project only the profile's rules, preserving existing content hashes for earlier maps. */
export function regionalTerrainContent(catalog: ContentCatalog, source: GeneratedBattlefieldSource): ContentCatalog {
  const ids = profileTerrains[source.profileVersion];
  if (!ids) return catalog;
  const selected = ids.map(id => terrains[id]);
  const assets = { ...catalog.assets };
  for (const { surfaceAssetId } of selected) {
    if (Object.hasOwn(regionalTerrainAssets, surfaceAssetId)) {
      assets[surfaceAssetId] = regionalTerrainAssets[surfaceAssetId as keyof typeof regionalTerrainAssets];
    }
  }
  return { ...catalog, assets, terrains: { ...catalog.terrains, ...Object.fromEntries(selected.map(terrain => [terrain.id, terrain])) } };
}
