import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';

export const FOREST_FAMILY_IDS = ['briar_thrall', 'rotcap_sprout', 'spore_acolyte', 'thornback_beetle', 'blob'] as const;
type FamilyId = typeof FOREST_FAMILY_IDS[number];

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'eea51c961b092ee4df8c7ac6cfe0748fba7e2db2', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
export const forestFamilyEnemies = {
  briar_thrall: enemy('briar_thrall', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 0 }),
  rotcap_sprout: enemy('rotcap_sprout', { maxHp: 8, move: 3, jump: 0, accuracy: 3, armorClass: 10, power: 2, dexterity: 0, will: 1 }),
  spore_acolyte: enemy('spore_acolyte', { maxHp: 9, move: 4, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 2, will: 1 }),
  thornback_beetle: enemy('thornback_beetle', { maxHp: 14, move: 3, jump: 1, accuracy: 3, armorClass: 13, power: 3, dexterity: 0, will: 0 }),
  blob: enemy('blob', { maxHp: 5, move: 3, jump: 0, accuracy: 2, armorClass: 9, power: 1, dexterity: -1, will: -1 }),
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

export const forestFamilyAssets = {
  'asset:briar_thrall_sprite': sprite('briar_thrall', '2b07aaa49722886d6339c381eb257c1a56b896f0fbf3d6ce1699830e2adf8e10', '(7,10)-(57,80)'),
  'asset:briar_thrall_portrait': portrait('briar_thrall', '0df83ef3df9de3daef765c5d4b32630f068732e92f76bba0448b748023aa7974', '46a5019a7ccaa13ccdc2b788af53c2b93ad0e0ff2cd6e493fbec2f4498add6fa'),
  'asset:rotcap_sprout_sprite': sprite('rotcap_sprout', 'e29fc378fb43561846f910f61c80df532f07a171a493587ba9e44db8dddff831', '(9,24)-(55,80)'),
  'asset:rotcap_sprout_portrait': portrait('rotcap_sprout', 'f4ff73f61a557ee8a89980bea895db494aa31954e281f915b61c1e174e808283', '3e6b6d2f56f53774b6909a4cf36e7991c534f465b0f80d18eb814265e806e9eb'),
  'asset:spore_acolyte_sprite': sprite('spore_acolyte', 'be44fbe615f064a38db5d48b5f36a0ce2e66c286d58a0fdbc80a59c95c546bb7', '(7,12)-(57,80)'),
  'asset:spore_acolyte_portrait': portrait('spore_acolyte', 'c00ea445f34e27babed0ec728a1b8a6aaa4ae15dfa4aa7703801b916a9a47fcb', 'fc17538556ec5ab6b5ae01162f79880bb6f8d4bbd70edd410731665bd4e616f4'),
  'asset:thornback_beetle_sprite': sprite('thornback_beetle', '9f75fa3e112097b0a064f6143cb47b5e0c50b0cfba68d75a6fdd2c076bbc23e6', '(4,20)-(61,80)'),
  'asset:thornback_beetle_portrait': portrait('thornback_beetle', '918df9af0632d397cfa2689382c068d34d698594c0864ee5314f7db6ba06a9af', 'f3089298a821b65b2c4b493804febe1d8c25a0aa9d554fb6320058d87ab2cc9a'),
  'asset:blob_sprite': sprite('blob', '9a9021b44cc021f4ddcf9d085aa96e67ad43db890961bff1d30256d018535cc1', '(5,26)-(59,80)'),
  'asset:blob_portrait': portrait('blob', 'dff4a6b58f49441d8d1c5589d5cf01cc91644496e8c51ebceae09c168a169d4c', '0d242c73cfbe28e22174d4de8b7e762168cf4e6c3c0bd61a6e85536246b3d5c4'),
} satisfies Record<AssetId, AssetRecord>;

export function forestFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...FOREST_FAMILY_IDS] },
    },
    enemies: { ...baseline.enemies, ...forestFamilyEnemies },
    assets: { ...baseline.assets, ...forestFamilyAssets },
  };
}
