import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const FOREST_BOSS_IDS = [
  'hollow_root_matriarch', 'ironmaw_furnace_beast', 'green_warden',
] as const;
type BossId = typeof FOREST_BOSS_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '3747452b3d3db7aea8bba47aa8cc9235027e82cd', rightsNote,
} as const;

const enemy = <Id extends BossId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// Underdeep Caverns `hollow_matriarch_boss` ("Hollow Matriarch") is a different unit.
export const forestBossEnemies = {
  hollow_root_matriarch: enemy('hollow_root_matriarch', { maxHp: 30, move: 3, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 0, will: 2 }),
  ironmaw_furnace_beast: enemy('ironmaw_furnace_beast', { maxHp: 32, move: 3, jump: 1, accuracy: 6, armorClass: 15, power: 6, dexterity: 0, will: 2 }),
  green_warden: enemy('green_warden', { maxHp: 30, move: 3, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
} as const satisfies Record<BossId, EnemyRecord>;

const sprite = (id: BossId, sourceSha256: string, alphaBounds: string) => {
  const sourcePath = `public/battle/source/${id}_sprite.png`;
  const { width, height, anchor } = BOSS_SPRITE_CANVAS;
  return {
    id: `asset:${id}_sprite` as const, kind: 'unit-sprite' as const, sourcePath, runtimePath: `/battle/source/${id}_sprite.png`,
    sourceWidth: width, sourceHeight: height, runtimeWidth: width, runtimeHeight: height, format: 'png' as const, anchor,
    provenance: {
      ...illustrated, originalPath: sourcePath, sourceSha256,
      productionNotes: `Illustrated 96×120 RGBA PNG (1.5× the ordinary 64×80 canvas) loaded at native size; alpha bounds ${alphaBounds}, source-pixel foot anchor (48,114). Single-tile occupancy. Feet on the bottom edge. No runtime 1.5× stretch or pixelArt/nearest-neighbor special case.`,
    },
  };
};
const portrait = (id: BossId, sourceSha256: string, runtimeSha256: string) => {
  const sourcePath = `public/battle/source/${id}_portrait.png`;
  return {
    id: `asset:${id}_portrait` as const, kind: 'portrait' as const, sourcePath,
    runtimePath: `/battle/portraits/${id}.png`,
    sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 96, runtimeHeight: 96, format: 'png' as const,
    provenance: {
      ...illustrated, originalPath: sourcePath, sourceSha256,
      productionNotes: `Full 1254×1254 framed parchment portrait retained; reviewed 96×96 RGB PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule. Runtime SHA-256 ${runtimeSha256}.`,
    },
  };
};

export const forestBossAssets = {
  'asset:hollow_root_matriarch_sprite': sprite('hollow_root_matriarch', '3097cffd08d9c55108371c98bb9815a362f5ad0efc6ead3cb3e6d8295f639f27', '(9,8)-(87,120)'),
  'asset:hollow_root_matriarch_portrait': portrait('hollow_root_matriarch', '79f4295ac172c2fbdccdcf05594d0b08227e4eb4c8264279086f479625bcb3c0', '592d63878ca01432f09a58a3dee3ebfae9932bf4bb824359785e4e49c10b6954'),
  'asset:ironmaw_furnace_beast_sprite': sprite('ironmaw_furnace_beast', '5b13f4c82bbeac1827649f2c3c021cbbfd2ffa3849d7b18fb7144a83113bab15', '(6,14)-(91,120)'),
  'asset:ironmaw_furnace_beast_portrait': portrait('ironmaw_furnace_beast', '9e58bdab6b86148c50ba2105893c48224be2d37d3d0612dd54964ff018861e47', 'f0a18968d78426fbf7a624f863d3229e733e937cfdaf161b871724c2d48a9573'),
  'asset:green_warden_sprite': sprite('green_warden', 'a67578d90874387f62f811195ee90628dab1a17924ac9627f3724740cee9a174', '(11,10)-(86,120)'),
  'asset:green_warden_portrait': portrait('green_warden', '9fab231f14aac6241b0fada21b1a57839d30d08280ff9884b32d1f72f9f13232', '258b355adbcce92ed5696cff6063bd2f286f2297ad2131e759e8fa5500c3e242'),
} satisfies Record<AssetId, AssetRecord>;

export function forestBossBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...FOREST_BOSS_IDS] },
    },
    enemies: { ...baseline.enemies, ...forestBossEnemies },
    assets: { ...baseline.assets, ...forestBossAssets },
  };
}
