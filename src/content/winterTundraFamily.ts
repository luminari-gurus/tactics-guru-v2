import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const WINTER_TUNDRA_FAMILY_IDS = [
  'frost_gnawer', 'icebound_raider', 'snowblind_crow', 'drift_archer', 'rime_shaman',
  'glacier_ram', 'ice_wraith', 'yeti_bruiser', 'aurora_seer', 'frostforge_sentinel',
  'hroth_whitehorn_king',
] as const;
export const WINTER_TUNDRA_FAMILY_MELEE_IDS = [
  'frost_gnawer', 'icebound_raider', 'snowblind_crow', 'glacier_ram',
  'yeti_bruiser', 'frostforge_sentinel',
  'hroth_whitehorn_king',
] as const;
export const WINTER_TUNDRA_BOSS_IDS = ['hroth_whitehorn_king'] as const;
type FamilyId = typeof WINTER_TUNDRA_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '22e8d611aea68418328354c6a50c7e3e82f82e3e', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// Core `goblin_shaman` and graveyard `dust_wraith` are different units.
export const winterTundraFamilyEnemies = {
  frost_gnawer: enemy('frost_gnawer', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  icebound_raider: enemy('icebound_raider', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  snowblind_crow: enemy('snowblind_crow', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 10, power: 2, dexterity: 1, will: 1 }),
  drift_archer: enemy('drift_archer', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  rime_shaman: enemy('rime_shaman', { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 1 }),
  glacier_ram: enemy('glacier_ram', { maxHp: 15, move: 3, jump: 1, accuracy: 3, armorClass: 14, power: 3, dexterity: 1, will: 1 }),
  ice_wraith: enemy('ice_wraith', { maxHp: 12, move: 5, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 1 }),
  yeti_bruiser: enemy('yeti_bruiser', { maxHp: 19, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  aurora_seer: enemy('aurora_seer', { maxHp: 14, move: 4, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  frostforge_sentinel: enemy('frostforge_sentinel', { maxHp: 17, move: 3, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  hroth_whitehorn_king: enemy('hroth_whitehorn_king', { maxHp: 30, move: 4, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
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

export const winterTundraFamilyAssets = {
  'asset:frost_gnawer_sprite': sprite('frost_gnawer', 'ca49ca84557c2ddf0bb63cc27b8544f9b7cfdaec57ad7e8930ebb478a7e91a8a', '(5,18)-(60,80)'),
  'asset:frost_gnawer_portrait': portrait('frost_gnawer', '3a50bed96faa939d99325b853399ce95c5db621f94ebb6095f2d9f85b13bc15c', '69d83a9d1ba7d6fee66bf89c9dc36398fac460fea8da32dee15731d9d503c29e'),
  'asset:icebound_raider_sprite': sprite('icebound_raider', 'd2050809c98cd6966e1d22bcf7e6f4dbae431e3f3eec879b10cfa633c18f8f56', '(5,10)-(59,80)'),
  'asset:icebound_raider_portrait': portrait('icebound_raider', '100a0e47f4847f15ed87462ddc02f60af40aa57a5ea189cc9b7ff9062b5b4c86', '1b97bb01b72c9b30f33384a1e008b0253304c026482f123249a0129c5fecdd05'),
  'asset:snowblind_crow_sprite': sprite('snowblind_crow', '07ae3a0feb3734f4638568b16a1dc544ffd9d9f38a79cf92c6613417bebed1d9', '(6,14)-(59,80)'),
  'asset:snowblind_crow_portrait': portrait('snowblind_crow', '03d55ea8eb613a22cc4e6c5e788ac838b2fe91a0d11d46cf2cb28a0544091493', '90c28d010b8c4382cf4c49368a60ded5381d2ab3b382c26e17f691588b891d6f'),
  'asset:drift_archer_sprite': sprite('drift_archer', 'd16f41c9162867234f1a441b007c3122bda99365af23fed0fe1665753f46fb03', '(10,10)-(55,80)'),
  'asset:drift_archer_portrait': portrait('drift_archer', '9bc3ef40799c5135626b692a6e341ff3f5954af7cacf860e924bef9b0ef85c1a', '98eda25ae60c5fad5875a7843bebd6413979c24db202c9cdc35c6e64148d8be6'),
  'asset:rime_shaman_sprite': sprite('rime_shaman', '9e04f80176f6448b373f3b2d4b2d2cd721de18c4d9e911f888dffb3956aee54a', '(8,10)-(57,80)'),
  'asset:rime_shaman_portrait': portrait('rime_shaman', '93916de6c22e09783eb9ea9df20ce9d42f00e5b3953b90f108a8708804e108fc', 'bf475b9ff2737b2d482f6ee38df6c7af5c822c7ac2b1cf4e613bb5ed15e89910'),
  'asset:glacier_ram_sprite': sprite('glacier_ram', '18df2793d22aea7f09b7b8f7413133f2b6311b472d927959d8d20d2b936f9a76', '(7,18)-(58,80)'),
  'asset:glacier_ram_portrait': portrait('glacier_ram', 'bb2cc0d0a5f7cb4b320ea08d30c839ad2419534fc2d0add47a580c91ece43c1c', 'edc4299f80757a4e51f9d536f602344e4d7307b6acd5a76746a1765cb40f0364'),
  'asset:ice_wraith_sprite': sprite('ice_wraith', '764e6275d56f07896b3a004dbba3e1b46a9c8de3809a25ec9be0868a33a7fccc', '(9,10)-(56,80)'),
  'asset:ice_wraith_portrait': portrait('ice_wraith', '4205ddaad0f524637851fecca7fe8c3f4d241396ff114aa55f682ed96b9aa275', 'c3969b7df1d2727b46181893c325a5309cf72899f7e20a670b044b03af205bba'),
  'asset:yeti_bruiser_sprite': sprite('yeti_bruiser', '8044184e906c87faefcdd8126ff619cfc53ec4ebb5106fb8bb352b2bbc2840ef', '(5,8)-(59,80)'),
  'asset:yeti_bruiser_portrait': portrait('yeti_bruiser', 'dffbd11c112e3e910c8d8c94c25455d8626235b7e78018b67fbc5d4418932e50', 'e859daa15cbb8a033c900947d6f7e8e4c1e23289df0a4dd112dedfb86df2176d'),
  'asset:aurora_seer_sprite': sprite('aurora_seer', '7350ca679aa188cf42ead503db5dd6a7d0526f0915047a7bbf6cf8772ac237bb', '(12,10)-(52,80)'),
  'asset:aurora_seer_portrait': portrait('aurora_seer', 'fb7a155dc22cf9b636b6ee1f25edc3ae803d22fe3d5253737756c804feef3b5d', 'af2bbe5b75deb2c96289576256d358f6089ce2d0f252252f50029a3a4ce70804'),
  'asset:frostforge_sentinel_sprite': sprite('frostforge_sentinel', 'b277d6854d12279bfb4ac9d11867118b574c3c6d10229eabd1c9d1b87f4ef982', '(2,16)-(62,80)'),
  'asset:frostforge_sentinel_portrait': portrait('frostforge_sentinel', '9f5fb3bd84266ff830f333fc47e169462e4611bce65685be31bee32b6d08d413', '24243580fa9d5058307d5bbcb5cd5290f4dcb394d0864ac63a3185ea2dc9510c'),
  'asset:hroth_whitehorn_king_sprite': bossSprite('hroth_whitehorn_king', 'b963ebe72095afb851749de2e4584d4779331fddf1cb34757cbece5f2a3288f4', '(12,8)-(85,120)'),
  'asset:hroth_whitehorn_king_portrait': portrait('hroth_whitehorn_king', '28626949ead2548d63849580b06d878bba4c2a83efc6a61b317843e6f709a288', '64aef75233b65fb13f0e0aed2e7f918e6cdbb3b0b6b4f12ed26dad8dbe4bf22e'),
} satisfies Record<AssetId, AssetRecord>;

export function winterTundraFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const tundraBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(winterTundraFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...WINTER_TUNDRA_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...tundraBow] },
    },
    enemies: { ...baseline.enemies, ...winterTundraFamilyEnemies },
    assets: { ...baseline.assets, ...winterTundraFamilyAssets },
  };
}
