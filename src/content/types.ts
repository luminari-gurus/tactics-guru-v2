import type { ENEMY_IDS, FIRST_MAP_TERRAIN_IDS, HERO_IDS, TERRAIN_TEXTURE_SPEC } from './constants';

// Template prefixes prevent mixing map/unit/asset references without runtime wrappers.
export type MapId = `map:${string}`;
export type AssetId = `asset:${string}`;
export type HeroId = typeof HERO_IDS[number];
export type EnemyId = typeof ENEMY_IDS[number];
export type UnitId = HeroId | EnemyId;
export type TerrainId = typeof FIRST_MAP_TERRAIN_IDS[number];

/** Immutable baseline stats, not mutable battle HP. All numbers obey CONTENT_BOUNDS. */
export interface UnitStats {
  readonly maxHp: number;
  readonly move: number;
  readonly jump: number;
  readonly accuracy: number;
  readonly armorClass: number;
  readonly power: number;
  readonly dexterity: number;
  readonly will: number;
}
export interface UnitArt {
  readonly spriteAssetId: AssetId;
  readonly portraitAssetId: AssetId;
}
export interface HeroRecord extends UnitArt {
  readonly id: HeroId;
  readonly kind: 'hero';
  readonly stats: UnitStats;
}
export interface EnemyRecord extends UnitArt {
  readonly id: EnemyId;
  readonly kind: 'enemy';
  readonly stats: UnitStats;
}
export interface CellPosition { readonly x: number; readonly y: number }
export interface MapCell extends CellPosition {
  readonly elevation: number;
  readonly terrainId: TerrainId;
  readonly propAssetId?: AssetId;
}
export type SpawnRecord = CellPosition & { readonly id: number } & (
  | { readonly side: 'heroes'; readonly unitId: HeroId }
  | { readonly side: 'enemies'; readonly unitId: EnemyId }
);
export interface MapRecord {
  readonly id: MapId;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly MapCell[];
  readonly spawns: readonly SpawnRecord[];
}
export interface TerrainRecord {
  readonly id: TerrainId;
  readonly surfaceAssetId: AssetId;
  readonly moveCost: number;
  readonly walkable: boolean;
  readonly blocksLineOfSight: boolean;
}
export interface AssetMetadata {
  readonly id: AssetId;
  readonly sourcePath: string;
  readonly runtimePath: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly runtimeWidth: number;
  readonly runtimeHeight: number;
  readonly format: 'png';
  readonly provenance: AssetProvenance;
}
export type AssetProvenance =
  | { readonly origin: 'canonical'; readonly repository: string; readonly revision: string;
      readonly originalPath: string; readonly sourceSha256: string; readonly rightsNote: string;
      readonly productionNotes: string }
  | { readonly origin: 'generated'; readonly tool: string; readonly generatedAt: string;
      readonly prompt: string; readonly referenceAssetIds: readonly AssetId[];
      readonly sourceSha256: string; readonly rightsNote: string; readonly productionNotes: string };
export type AssetRecord = AssetMetadata & (
  | { readonly kind: 'terrain-surface'; readonly provenance: Extract<AssetProvenance, { origin: 'generated' }>;
      readonly textureSpec: typeof TERRAIN_TEXTURE_SPEC }
  | { readonly kind: 'unit-sprite' | 'prop'; readonly anchor: { readonly x: number; readonly y: number } }
  | { readonly kind: 'portrait' }
);
/** Complete keyed catalogs are checked with `satisfies`; semantic validation is a later task. */
export interface ContentCatalog {
  readonly maps: Readonly<Record<MapId, MapRecord>>;
  readonly heroes: Readonly<Record<HeroId, HeroRecord>>;
  readonly enemies: Readonly<Record<EnemyId, EnemyRecord>>;
  readonly terrains: Readonly<Record<TerrainId, TerrainRecord>>;
  readonly assets: Readonly<Record<AssetId, AssetRecord>>;
}
