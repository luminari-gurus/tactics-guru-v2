import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';

export const GOBLIN_FAMILY_IDS = ['bramble_goblin', 'goblin_snarehand', 'mire_goblin', 'coal_goblin', 'ruin_lookout'] as const;
export const GOBLIN_FAMILY_MELEE_IDS = ['bramble_goblin', 'goblin_snarehand', 'mire_goblin', 'coal_goblin'] as const;
type FamilyId = typeof GOBLIN_FAMILY_IDS[number];

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '905ea28005a0a62d386d7ae57f8f280bafea23f9', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
export const goblinFamilyEnemies = {
  bramble_goblin: enemy('bramble_goblin', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 0, will: 1 }),
  goblin_snarehand: enemy('goblin_snarehand', { maxHp: 11, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 0, will: 0 }),
  mire_goblin: enemy('mire_goblin', { maxHp: 11, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 2, dexterity: 1, will: 1 }),
  coal_goblin: enemy('coal_goblin', { maxHp: 11, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 0 }),
  ruin_lookout: enemy('ruin_lookout', { maxHp: 12, move: 4, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 2, will: 1 }),
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

export const goblinFamilyAssets = {
  'asset:bramble_goblin_sprite': sprite('bramble_goblin', '022de77f103a58c9ff9bc0e02082d2c2a25261bb2cd6a904b7a9e4fb00501067', '(8,12)-(56,80)'),
  'asset:bramble_goblin_portrait': portrait('bramble_goblin', '792040d78265e4c9f65d64e2514fe9f4f3f9548c76ef982a671e149033c3cf9a', 'd8c891c6ce01df847713f01a3299df522bbc69d6da7f3f210f4d7980460d6abb'),
  'asset:goblin_snarehand_sprite': sprite('goblin_snarehand', '6b61196479186e1ce0ad1f5d54225f99e319864a9fd062784daeb1e7d7f361ae', '(7,12)-(58,80)'),
  'asset:goblin_snarehand_portrait': portrait('goblin_snarehand', 'b0f38578d612e4f50d76bdf6ad81c35f69021c417e091caec12e6d4d71650bd5', '1226f0b1e7e70e7415b22c01a64fa5cfbd14cd335124eaf9246b2872d1fa116e'),
  'asset:mire_goblin_sprite': sprite('mire_goblin', '59278c00804485b3f2b1d6ab5aed49a99c1bf644d3e85e4ba928694bda84fa8f', '(7,8)-(57,80)'),
  'asset:mire_goblin_portrait': portrait('mire_goblin', '4fb92221487acfc3bec51dde65f46f7ae38172a2993c22315eedce749f185a61', 'e45e053d7f1f10201c049eaccb51000b9876a44f54ee5c68861bf809771f1964'),
  'asset:coal_goblin_sprite': sprite('coal_goblin', '428f8559a2083428d5c8d6a0852a3854b8d24c5b04c26bd7b6b9ad3387fdee35', '(6,12)-(59,80)'),
  'asset:coal_goblin_portrait': portrait('coal_goblin', 'ed0eb89595c24ce60deef9e6cace7656119c86ad924e9965ecde3ec540bd4f7a', '40117ec34644ca65cf887d22f4b72d9c8db1803803c7816f8831fbb4b334084f'),
  'asset:ruin_lookout_sprite': sprite('ruin_lookout', '0a3d7e17e26918023c4ac1b8b9e517ec386fe1ca1e555665049b2c66e8105040', '(7,12)-(57,80)'),
  'asset:ruin_lookout_portrait': portrait('ruin_lookout', '86071c3a331f992bcee5897d91bcf74e0e588ec9764743321fc6f4851b903911', '68f7547d80f0dfad2af302573615abfe77b32dcea94308c877f6b64a3e29b770'),
} satisfies Record<AssetId, AssetRecord>;

export function goblinFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...GOBLIN_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(goblinFamilyEnemies, id))] },
    },
    enemies: { ...baseline.enemies, ...goblinFamilyEnemies },
    assets: { ...baseline.assets, ...goblinFamilyAssets },
  };
}
