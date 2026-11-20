import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const GRAVEYARD_FAMILY_IDS = [
  'bone_pickman', 'bone_porter', 'corpse_bride', 'crypt_bulwark', 'crypt_rat',
  'dust_wraith', 'grave_lantern', 'gravebinder', 'ossuary_hound', 'sepulcher_golem',
  'shard_hurler', 'skeleton_archer', 'tomb_shield', 'wailing_mourner',
  'gravelord_kharrox', 'vorlach_the_hollow_crown',
] as const;
export const GRAVEYARD_FAMILY_MELEE_IDS = [
  'bone_pickman', 'bone_porter', 'corpse_bride', 'crypt_bulwark', 'crypt_rat',
  'dust_wraith', 'grave_lantern', 'gravebinder', 'ossuary_hound', 'sepulcher_golem',
  'tomb_shield', 'wailing_mourner',
  'gravelord_kharrox', 'vorlach_the_hollow_crown',
] as const;
export const GRAVEYARD_BOSS_IDS = ['gravelord_kharrox', 'vorlach_the_hollow_crown'] as const;
type FamilyId = typeof GRAVEYARD_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '9e94007ea936baae4911cfcd80868739d2bb9bfd', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// `skeleton_archer` is not a registered official unit in this repo (historical issue-98
// provenance paths only), so the batch-12 slug is used as-is.
// `vorlach_the_hollow_crown` ("Vorlach the Hollow Crown") uses supplement id
// `gravelord_kharrox_boss` stats.
export const graveyardFamilyEnemies = {
  bone_pickman: enemy('bone_pickman', { maxHp: 10, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 0 }),
  bone_porter: enemy('bone_porter', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 2, dexterity: 1, will: 0 }),
  corpse_bride: enemy('corpse_bride', { maxHp: 17, move: 3, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 2, will: 1 }),
  crypt_bulwark: enemy('crypt_bulwark', { maxHp: 14, move: 4, jump: 1, accuracy: 3, armorClass: 13, power: 3, dexterity: 1, will: 1 }),
  crypt_rat: enemy('crypt_rat', { maxHp: 11, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 0, will: 0 }),
  dust_wraith: enemy('dust_wraith', { maxHp: 11, move: 5, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 2, will: 0 }),
  grave_lantern: enemy('grave_lantern', { maxHp: 10, move: 4, jump: 1, accuracy: 4, armorClass: 11, power: 3, dexterity: 2, will: 1 }),
  gravebinder: enemy('gravebinder', { maxHp: 16, move: 3, jump: 1, accuracy: 5, armorClass: 13, power: 4, dexterity: 2, will: 1 }),
  ossuary_hound: enemy('ossuary_hound', { maxHp: 13, move: 5, jump: 1, accuracy: 5, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  sepulcher_golem: enemy('sepulcher_golem', { maxHp: 18, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 4, dexterity: 0, will: 2 }),
  shard_hurler: enemy('shard_hurler', { maxHp: 8, move: 4, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 2, will: 0 }),
  skeleton_archer: enemy('skeleton_archer', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 0 }),
  tomb_shield: enemy('tomb_shield', { maxHp: 14, move: 4, jump: 1, accuracy: 3, armorClass: 13, power: 2, dexterity: 1, will: 1 }),
  wailing_mourner: enemy('wailing_mourner', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  gravelord_kharrox: enemy('gravelord_kharrox', { maxHp: 28, move: 3, jump: 1, accuracy: 7, armorClass: 14, power: 5, dexterity: 0, will: 2 }),
  vorlach_the_hollow_crown: enemy('vorlach_the_hollow_crown', { maxHp: 30, move: 4, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
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
const bossSprite = (id: FamilyId, sourceSha256: string, alphaBounds: string) => {
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

export const graveyardFamilyAssets = {
  'asset:bone_pickman_sprite': sprite('bone_pickman', '67e9063ad38a411d68a9c0b9232162418cc2f94609cd03904a65120e35d17325', '(8,12)-(56,80)'),
  'asset:bone_pickman_portrait': portrait('bone_pickman', '9123eefc7c27e6fde23bf342224172a28fda18b2f0a70c782cfcc7301ea6a137', 'b87978b90e07c0012c713df81ddc1d2a7ab4d6f003ef701895effb506dd71b09'),
  'asset:bone_porter_sprite': sprite('bone_porter', 'f1cd7656f91f2ffc463d6a5e19d09b096e1e8ac5606285a64f4bc11add8a90fb', '(9,10)-(56,80)'),
  'asset:bone_porter_portrait': portrait('bone_porter', '55e24d813d9bced76e3f44a5b1936f75b534bcc84335841cc9e0b3131d33411c', '6ae710c0cefcd09c8f67795e6a6fca516c8f9481ead1c06724b4fb8f7d33836e'),
  'asset:corpse_bride_sprite': sprite('corpse_bride', '0dffa7c50d623310653842695917d71d48f19e4425836bcb6ba7e76d6a600da6', '(10,8)-(54,80)'),
  'asset:corpse_bride_portrait': portrait('corpse_bride', 'c192df1f1cdc51dc00b188a712954f7c760c5d13fb5a0cd38657963f22782ba5', 'f40b6430469cbef661957d6f2b4a35513855e2b57afef4b09a82ebefb219340c'),
  'asset:crypt_bulwark_sprite': sprite('crypt_bulwark', 'e56b204d8842cb5766612c70fccfb25b7c4f873b8c8c2f336d960153a9912ac5', '(6,12)-(59,80)'),
  'asset:crypt_bulwark_portrait': portrait('crypt_bulwark', '95e9e193154dfae7f9381d7bef1c1ef5ba46c3a0d39dbe0baf15d6782abb6b06', '3665ca06593fa076b7d3f26e74ee8d0780f3514d424d6ab1b51ba00be8e20b38'),
  'asset:crypt_rat_sprite': sprite('crypt_rat', 'cc68cbe022390ef75f0880703df544dc381324367ba9bad1115ab2b1f4464cf9', '(2,22)-(62,80)'),
  'asset:crypt_rat_portrait': portrait('crypt_rat', '1864e55a2e8fa3810d6474ada4f15b6e455ae6b541f9102c316d245a6c2e6585', 'fda5786328cb2555e269bfbfb64d0f69e8b578c370742cdb6949b7142c949223'),
  'asset:dust_wraith_sprite': sprite('dust_wraith', '4b583aee2c3436e98ee2411a8a2a02cce0d7c48ea58826af03907a1263b1f07d', '(6,12)-(58,80)'),
  'asset:dust_wraith_portrait': portrait('dust_wraith', 'f886caaceeb34168a8436dcfdff7fa9faa78e7461d99f01d3bb87e9d31d49fe5', '92834595534e8ca92403f7416152b355eaa399c998701bc90e9c5952467b41a6'),
  'asset:grave_lantern_sprite': sprite('grave_lantern', 'a088a2b51dc700220df7e21187d8b8de220c00201eb72e7b066c9770949d1ab5', '(14,8)-(49,80)'),
  'asset:grave_lantern_portrait': portrait('grave_lantern', '4af13b8c4b3dc012583e719f82d9b4cb3f9dcfbb35c6d997cd9789f609d6bcde', '44020a48d8d2c96e980112d7e9a860b6c2768ed4927ac1c5f29234fa260dafe3'),
  'asset:gravebinder_sprite': sprite('gravebinder', '833297e22d65a21fe28574622be4e0a90447e56dbe8ea81d0e285ad520010919', '(9,8)-(55,80)'),
  'asset:gravebinder_portrait': portrait('gravebinder', '1ae4eeff6ff42c2f7991f5a94615892555f7ffacf9b51663e19bdbf932d6db3e', '2dfae74b9ecf74e5ed3641dccf8d71b886ec5bcea3a8ac9ff1eef30268de3069'),
  'asset:ossuary_hound_sprite': sprite('ossuary_hound', '805358e2c5465c9cab3778636a4f99672d4c69d5ab438e3953dc30f289628a91', '(6,8)-(58,80)'),
  'asset:ossuary_hound_portrait': portrait('ossuary_hound', '7c69e5fe4b3c1f2cf5e1eeb14059cc2948faf8a82aacad4e8f0f52f3c9f35d3a', '5932773f61343db0868744ed4d0456e442e3b4e8e0b2e4c852eb3bfbe7a894ee'),
  'asset:sepulcher_golem_sprite': sprite('sepulcher_golem', 'ecea004577681e375963dc2784f5a0ab75553cc512bc0be1fc250b7cc1e07fac', '(4,13)-(60,80)'),
  'asset:sepulcher_golem_portrait': portrait('sepulcher_golem', '59c3682a5339e21d6a61ced8ee33e3934e992b5d1831999484b81dc96c0256a0', '11c5b7bca2b29de87378675858cc3205d6b218dbbe7de01eb75ce453da4fb817'),
  'asset:shard_hurler_sprite': sprite('shard_hurler', 'bab2ec95f9c37c8cd5cbf081d0409e18e84e28b3d4165633638da5a05c2a1bae', '(9,12)-(56,80)'),
  'asset:shard_hurler_portrait': portrait('shard_hurler', '41e897753bfc119cc0def734acc0aa232b64d2c76c47d081c5246a62d28f2f4c', '2605f5024f4b08136ada213442524c96d99d9512a89ba99bb635cea79c43b12c'),
  'asset:skeleton_archer_sprite': sprite('skeleton_archer', '92b078264ea49a6a548afc4bbc8427b2ff0e6eea828de75975b79f6501591772', '(7,10)-(58,80)'),
  'asset:skeleton_archer_portrait': portrait('skeleton_archer', '040c17689d52c96bc5999897a364f0211ef4e6718bcf50f32f8838e5cca311c5', '1d3629a1d2efd8cf915bd53d3d2a4efe3f118ceb0b0796b3966b8c116d8a9929'),
  'asset:tomb_shield_sprite': sprite('tomb_shield', 'f885eb5950208628cb9dd6be233378ad8bf36f3ab1f037a358bc88c87af28473', '(7,4)-(57,80)'),
  'asset:tomb_shield_portrait': portrait('tomb_shield', '30b49e57c7a113a61f1a34eb42ebe642febe77024a602d2bb2143bada65ee0a9', '3932f47fe2025bf508c02e66e316579550ca5a46b52aa413bdc0bc2c3211236c'),
  'asset:wailing_mourner_sprite': sprite('wailing_mourner', '92e2e9ba5132053da4d85ec6ef82b255e4a39cb1e8f6eef9741b14fd346b0456', '(12,8)-(52,80)'),
  'asset:wailing_mourner_portrait': portrait('wailing_mourner', 'eef562fcb7cb979bafecb7e26d7826debdd8461edf7e5e4b7535b8d327988e65', '233e2a9a555f3ad360e5dcf717c838f1826dc8a6f2794790360ce51932ede5ed'),
  'asset:gravelord_kharrox_sprite': bossSprite('gravelord_kharrox', '961ae5074fe4ed1f9d9e902fa2071edc3ddd005fba90f175859636224f0c9f7b', '(6,8)-(91,120)'),
  'asset:gravelord_kharrox_portrait': portrait('gravelord_kharrox', '2e0dbe29f17151eba37b2803bbc055ec377e874e486adb2e1e152885530a98dc', '4811f24052c4663db7d60d5741a3a2b03443386852424ee73b3a49b9f1f4476f'),
  'asset:vorlach_the_hollow_crown_sprite': bossSprite('vorlach_the_hollow_crown', 'b72fc7c1783a38562bee9de58272b07643d872f00f0874f0a5e79948b5adfec7', '(8,8)-(89,120)'),
  'asset:vorlach_the_hollow_crown_portrait': portrait('vorlach_the_hollow_crown', '5c1bd83e937633e0a9c02056690482de4c7b6ba342969bf39cd4f1cd2821b867', '67f35a9604c87efe81d69956d168a5b863f7c972c24a0e964486d796af8bf984'),
} satisfies Record<AssetId, AssetRecord>;

export function graveyardFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const graveyardBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(graveyardFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...GRAVEYARD_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...graveyardBow] },
    },
    enemies: { ...baseline.enemies, ...graveyardFamilyEnemies },
    assets: { ...baseline.assets, ...graveyardFamilyAssets },
  };
}
