import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const SUNSCORCHED_DESERT_FAMILY_IDS = [
  'sand_jackal', 'dune_archer', 'mirage_pup', 'saltbone_howler', 'dune_jackal',
  'sand_bandit', 'scarab_swarm', 'mirage_adept', 'camel_lancer', 'sand_mummy',
  'glass_viper', 'obelisk_guardian', 'sandstorm_djinn', 'caravan_reaver',
  'sirocco_jackal_king', 'saffron_colossus',
] as const;
export const SUNSCORCHED_DESERT_FAMILY_MELEE_IDS = [
  'sand_jackal', 'mirage_pup', 'saltbone_howler', 'dune_jackal',
  'sand_bandit', 'scarab_swarm', 'camel_lancer', 'sand_mummy',
  'glass_viper', 'obelisk_guardian', 'caravan_reaver',
  'sirocco_jackal_king', 'saffron_colossus',
] as const;
export const SUNSCORCHED_DESERT_BOSS_IDS = ['sirocco_jackal_king', 'saffron_colossus'] as const;
type FamilyId = typeof SUNSCORCHED_DESERT_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'c613fc860799c37b6194b4d10b7c51fc0c380280', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// Quarry `glass_squire` is a different unit from `glass_viper`.
export const sunscorchedDesertFamilyEnemies = {
  sand_jackal: enemy('sand_jackal', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 2, will: 0 }),
  dune_archer: enemy('dune_archer', { maxHp: 9, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 2, will: 0 }),
  mirage_pup: enemy('mirage_pup', { maxHp: 7, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 2, will: 1 }),
  saltbone_howler: enemy('saltbone_howler', { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 12, power: 2, dexterity: 1, will: 2 }),
  dune_jackal: enemy('dune_jackal', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  sand_bandit: enemy('sand_bandit', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  scarab_swarm: enemy('scarab_swarm', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 10, power: 2, dexterity: 1, will: 1 }),
  mirage_adept: enemy('mirage_adept', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  camel_lancer: enemy('camel_lancer', { maxHp: 15, move: 4, jump: 1, accuracy: 4, armorClass: 13, power: 3, dexterity: 1, will: 1 }),
  sand_mummy: enemy('sand_mummy', { maxHp: 16, move: 3, jump: 1, accuracy: 3, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  glass_viper: enemy('glass_viper', { maxHp: 13, move: 5, jump: 1, accuracy: 5, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  obelisk_guardian: enemy('obelisk_guardian', { maxHp: 19, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  sandstorm_djinn: enemy('sandstorm_djinn', { maxHp: 14, move: 4, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  caravan_reaver: enemy('caravan_reaver', { maxHp: 17, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  sirocco_jackal_king: enemy('sirocco_jackal_king', { maxHp: 30, move: 5, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 2, will: 2 }),
  saffron_colossus: enemy('saffron_colossus', { maxHp: 30, move: 5, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
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

export const sunscorchedDesertFamilyAssets = {
  'asset:sand_jackal_sprite': sprite('sand_jackal', 'a39be80b9d679a0592b6bce462b15a634322f01388c69ee70874887fd96a07a5', '(4,10)-(60,80)'),
  'asset:sand_jackal_portrait': portrait('sand_jackal', 'bef730210dde12b735ceaa0d7d1bb198443f1c28e19a777c4c32770a972c2152', '1ee2658c2ef599f72bc1bdb9335eeae07416b160bb893c409f135e2a2d644d3b'),
  'asset:dune_archer_sprite': sprite('dune_archer', 'c60b804327f58c7df5cfe11eb3dfb57b5a8827f2f7e7f04f2c85f29c44f15305', '(7,10)-(58,80)'),
  'asset:dune_archer_portrait': portrait('dune_archer', 'b01c69e68df1b19449d080e163116b2f77fab8eace0396f0e1e643cc6969d910', '53c34cb5f0a6bad8848437ff8f85364d3304f0496f21e4483341063ad151114a'),
  'asset:mirage_pup_sprite': sprite('mirage_pup', '6e7c75ecc12292f27ebe995df0eaabcaf884587907f2717ac27128dc4765a3fb', '(11,20)-(54,80)'),
  'asset:mirage_pup_portrait': portrait('mirage_pup', '949a114d72d315833579940e131815c995264d50563bad5445317876cc64f375', '889453a0173289ce91844ffdaa75dda94a6bbff5e5be8e5f1a33abf86d4029ad'),
  'asset:saltbone_howler_sprite': sprite('saltbone_howler', '0f9c3ba3daba6cde44367c33dd7fbdb903aceddd319453955d878ca709c98e7c', '(5,8)-(60,80)'),
  'asset:saltbone_howler_portrait': portrait('saltbone_howler', 'ecfec41bf34fbb7f5e590a00393c1c9b427231ab06e4f3f58207765ba8960ee0', 'fd6beca244fc876fe9241f2652994f753b35f199b705ebf64448c51f02d5413f'),
  'asset:dune_jackal_sprite': sprite('dune_jackal', 'c554dc67446c287d4c5dff022bd7cabd4b7b9fa4745b7f78596c71605f6223f3', '(10,6)-(55,80)'),
  'asset:dune_jackal_portrait': portrait('dune_jackal', 'b983b7c3a1abcf4993ed40643a070145432429c485c2b87c6ab139735a90414e', 'f47cbe52af71ba50b1e114c36661c692b743eb442eeb0139b82475d06ff71768'),
  'asset:sand_bandit_sprite': sprite('sand_bandit', 'c2807efb207c2551276b001812d59ca7d6e8f86a63397abdd2920c0767a6560a', '(9,10)-(55,80)'),
  'asset:sand_bandit_portrait': portrait('sand_bandit', 'f61b3f102b663d180f3877d0d69ab193ad2b96eca64ffe0b6cbb53e0b89171de', '63c91ba141bc8d75c12cf174d8df5145985632489f6b0aace2ba3def13c644ee'),
  'asset:scarab_swarm_sprite': sprite('scarab_swarm', '516e2876c8c2619492cfdea6e9148995e6cd47947c551b54d61d2b9be5614edf', '(2,17)-(62,80)'),
  'asset:scarab_swarm_portrait': portrait('scarab_swarm', '5b35a425b22d51630df3032b3421962575b1d455773a5599308f751400bdb54c', 'c7211657a39b90cccb3e601cb2f926ee8789fbb3276aba30bed536e6362bcb1d'),
  'asset:mirage_adept_sprite': sprite('mirage_adept', '2d102d1e5200ebac6a3545b330073db2a357a6a543844ae697b2c775b5b9174e', '(9,8)-(55,80)'),
  'asset:mirage_adept_portrait': portrait('mirage_adept', '6d5c6247b4b982fbbbb8d4fecf639e73ce596d49247f23d9ee94e8e305b52b30', '5d3300fa61c5ab1d9017c7ccd27c8dce0268616613885f297430bc52d421446f'),
  'asset:camel_lancer_sprite': sprite('camel_lancer', 'e45b5d16b10fe5230dadfeb7e32e1f483648820f01eae323aeb41f72764b4247', '(10,6)-(55,80)'),
  'asset:camel_lancer_portrait': portrait('camel_lancer', '0d4b1356819cc7d489868e1f6eb452b741843a7c767f0aceb0705cc8747c2523', '9ede4272ec27990342d56eed770fa5d5f9e828049e1cebe8bc8b91c41faead43'),
  'asset:sand_mummy_sprite': sprite('sand_mummy', '5bca8c6dd070d2c7b21647a176198f29b517b2819d075d0955ba6016a6090259', '(10,14)-(54,80)'),
  'asset:sand_mummy_portrait': portrait('sand_mummy', '58284f9808ef2cffae1e81f2a3024c37fca79e6b2a597c10b4fedd2903835816', 'f3db487344f9ca12251050c30fa80a3d68fe7c5c4d90291d8cb97794286f789f'),
  'asset:glass_viper_sprite': sprite('glass_viper', '69b05700183014eaa94388880728202adddd8a69bbe316d858d428d50fb4c8ee', '(6,16)-(59,80)'),
  'asset:glass_viper_portrait': portrait('glass_viper', '0f7ff76636a8260832a1442d70bda6f206b3d849d3eee88c9544e566e4aafa50', '474900a66f5fd225699bb5b1b048a1445a8969df02a89a69ce26e568b6368fe9'),
  'asset:obelisk_guardian_sprite': sprite('obelisk_guardian', 'a0ce8ff2b10419e7fe47af97f0a02be27b55cadfdf827e0ec586af26741bccde', '(9,8)-(56,80)'),
  'asset:obelisk_guardian_portrait': portrait('obelisk_guardian', '75a8dd1f9cc2655655501dc1320b578c2049b0856c401f9258b57e17b0bf219d', 'ee953dbff061a71078ec446ad056de2427263372fb32cd80c585931dc0437866'),
  'asset:sandstorm_djinn_sprite': sprite('sandstorm_djinn', '83d325b878203679f3723a1fb1b37ec7e99a736e56457aded95212b46b3d3e4a', '(5,8)-(60,80)'),
  'asset:sandstorm_djinn_portrait': portrait('sandstorm_djinn', '979d6e6a4532de969f31c1a00f29247947033f421cfec203d9940d075ece9f91', 'deadbc8ceae779dfa60eef68fbaf5b181bb1ac10b07e231a75812fb2086aab35'),
  'asset:caravan_reaver_sprite': sprite('caravan_reaver', '83cfa547119281e9cae5957fca74a0e5a35a6dbedabab104cc87b62b69672760', '(9,8)-(55,80)'),
  'asset:caravan_reaver_portrait': portrait('caravan_reaver', '8b4042401e26bf4e334cadb0166004894fe91d50982b056aa2cdb2728e01f1c8', '16e2ac2dfadfb725ad9d9bf279f8cbe274c11af3606f2690c5d0c40b3e1f50d2'),
  'asset:sirocco_jackal_king_sprite': bossSprite('sirocco_jackal_king', '45cc20aa81536427beaf6f13a00c5fa09fc00ae7d9a6f7903461c157c5d10f84', '(14,8)-(83,120)'),
  'asset:sirocco_jackal_king_portrait': portrait('sirocco_jackal_king', '2e4ba0f2a7e148a22a8c2c48a64ba37654c100b07c1e3dfd939c70abaebdc666', '38cbd1837cbe634ed9d86e924702af4f7053a6e735e8bba7b10d428a6aad7f04'),
  'asset:saffron_colossus_sprite': bossSprite('saffron_colossus', '32455ec1b966c2cc2722463781d66ce957801cd02ac44439aa08df3469603e07', '(8,8)-(89,120)'),
  'asset:saffron_colossus_portrait': portrait('saffron_colossus', '5add37640b1618f47d47b41982f4a37791b8983b1dc7be8dd5ab20d1ec8570ea', '5c00225b786cd25e9847af531efafaf1f7e101abaf634ac0dcbab2406afb970c'),
} satisfies Record<AssetId, AssetRecord>;

export function sunscorchedDesertFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const desertBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(sunscorchedDesertFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...SUNSCORCHED_DESERT_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...desertBow] },
    },
    enemies: { ...baseline.enemies, ...sunscorchedDesertFamilyEnemies },
    assets: { ...baseline.assets, ...sunscorchedDesertFamilyAssets },
  };
}
