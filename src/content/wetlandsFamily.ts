import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';

export const WETLANDS_FAMILY_IDS = [
  'lantern_imp', 'bog_gnawer', 'fenstalker', 'mire_hexer', 'bog_leech_swarm',
] as const;
type FamilyId = typeof WETLANDS_FAMILY_IDS[number];

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'ea5d30c3f36a3394f9aaefe1c5e93a0c6d7bc8f9', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
export const wetlandsFamilyEnemies = {
  lantern_imp: enemy('lantern_imp', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 2, will: 0 }),
  bog_gnawer: enemy('bog_gnawer', { maxHp: 11, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 0 }),
  fenstalker: enemy('fenstalker', { maxHp: 13, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 2, will: 0 }),
  mire_hexer: enemy('mire_hexer', { maxHp: 10, move: 3, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 2 }),
  bog_leech_swarm: enemy('bog_leech_swarm', { maxHp: 10, move: 4, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 1, will: 0 }),
} as const satisfies Record<FamilyId, EnemyRecord>;

const sprite = (id: FamilyId, sourceSha256: string, alphaBounds: string) => {
  const sourcePath = `public/battle/source/${id}_sprite.png`;
  return {
    id: `asset:${id}_sprite` as const, kind: 'unit-sprite' as const, sourcePath, runtimePath: `/battle/source/${id}_sprite.png`,
    sourceWidth: 64, sourceHeight: 80, runtimeWidth: 64, runtimeHeight: 80, format: 'png' as const, anchor: { x: 32, y: 76 },
    provenance: {
      ...illustrated, originalPath: sourcePath, sourceSha256,
      productionNotes: `Illustrated 64×80 RGBA PNG matching existing goblin unit sprites; alpha bounds ${alphaBounds}, source-pixel foot anchor (32,76). Feet on the bottom edge.`,
    },
  };
};
const portrait = (id: FamilyId, sourceSha256: string, runtimeSha256: string) => {
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

export const wetlandsFamilyAssets = {
  'asset:lantern_imp_sprite': sprite('lantern_imp', 'be249aacd186f76b2124641e5f6b632a45ec9d922bee701f484b3fd2fff3c38e', '(11,14)-(53,80)'),
  'asset:lantern_imp_portrait': portrait('lantern_imp', '9cf0c5530500cd77c231e30e2197434db8160ccb0cf90e4df1c21e1fdd23ac94', 'd8df8e8055a6eb2456fd285a98fccbeef29d3eebcd92b77cfd942728af036d9d'),
  'asset:bog_gnawer_sprite': sprite('bog_gnawer', '0e559f32e7f1e31de9e8ad885a8295af4523419c810b68823fb9a36bfc15513f', '(9,18)-(55,80)'),
  'asset:bog_gnawer_portrait': portrait('bog_gnawer', '7e8eafc23837620621c12ad9085593d03c9a65de6341854806be842450699724', 'd03ed492371e96720919c849ea542ea8a2d7467175088c8cfcb23eb394545f1a'),
  'asset:fenstalker_sprite': sprite('fenstalker', '275c76982c4b309801881145994bdc418f73a37590862f0ed1785ac62d970a9a', '(12,10)-(52,80)'),
  'asset:fenstalker_portrait': portrait('fenstalker', '9229b0cffee7d7c19ddadc863970ddf46459cdd4e30c690f55be4396f4d99368', '27b6103ed11378cc1368730e292af9244bf6cd929b02842406bbdf3ea249471a'),
  'asset:mire_hexer_sprite': sprite('mire_hexer', '19a6b7f6a9be12e97a6605f136a3dd9751d96cc6e144f70febf0245a9aa1f86b', '(7,10)-(58,80)'),
  'asset:mire_hexer_portrait': portrait('mire_hexer', 'b6857a9d92cec9ffd059181c10eb6570bc3d63f7c2dad8e6155b6124eb9e0af0', 'c4902abb3a99dbdc4bd680b15451421ef130bd595d34187074f425c5635c29ac'),
  'asset:bog_leech_swarm_sprite': sprite('bog_leech_swarm', '85db7978c86c8d711c1afc64ea09590542415b570cb97916c15782e78b5110d6', '(2,33)-(62,80)'),
  'asset:bog_leech_swarm_portrait': portrait('bog_leech_swarm', '8fa57f3da90fe67e47b233e6777c2c1a9d9a54b33ac9467ceffbc77dc470e165', '76a897653df4fd3952d1d6d5d2c1c2b033a97fa1c7fedb031d7cc5dd4b8ef527'),
} satisfies Record<AssetId, AssetRecord>;

export function wetlandsFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...WETLANDS_FAMILY_IDS] },
    },
    enemies: { ...baseline.enemies, ...wetlandsFamilyEnemies },
    assets: { ...baseline.assets, ...wetlandsFamilyAssets },
  };
}
