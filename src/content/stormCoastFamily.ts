import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const STORM_COAST_FAMILY_IDS = [
  'salt_rat', 'tide_crab', 'gull_harrier', 'net_caster', 'stormcaller_acolyte',
  'reef_stalker', 'deckbreaker', 'siren_shade', 'barnacle_golem', 'blackwake_captain',
  'admiral_blackwake',
] as const;
export const STORM_COAST_FAMILY_MELEE_IDS = [
  'salt_rat', 'tide_crab', 'gull_harrier', 'reef_stalker',
  'deckbreaker', 'barnacle_golem', 'blackwake_captain',
  'admiral_blackwake',
] as const;
export const STORM_COAST_BOSS_IDS = ['admiral_blackwake'] as const;
type FamilyId = typeof STORM_COAST_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'be39a0e49972f46105105e6962b789fb9a2c874f', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// `blackwake_captain` (regular/elite) and `admiral_blackwake` (boss) are distinct units.
export const stormCoastFamilyEnemies = {
  salt_rat: enemy('salt_rat', { maxHp: 9, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  tide_crab: enemy('tide_crab', { maxHp: 13, move: 3, jump: 1, accuracy: 3, armorClass: 13, power: 3, dexterity: 1, will: 1 }),
  gull_harrier: enemy('gull_harrier', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 10, power: 2, dexterity: 1, will: 1 }),
  net_caster: enemy('net_caster', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  stormcaller_acolyte: enemy('stormcaller_acolyte', { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 1 }),
  reef_stalker: enemy('reef_stalker', { maxHp: 14, move: 4, jump: 1, accuracy: 4, armorClass: 13, power: 3, dexterity: 1, will: 1 }),
  deckbreaker: enemy('deckbreaker', { maxHp: 18, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  siren_shade: enemy('siren_shade', { maxHp: 13, move: 5, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  barnacle_golem: enemy('barnacle_golem', { maxHp: 19, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  blackwake_captain: enemy('blackwake_captain', { maxHp: 17, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  admiral_blackwake: enemy('admiral_blackwake', { maxHp: 30, move: 4, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
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

export const stormCoastFamilyAssets = {
  'asset:salt_rat_sprite': sprite('salt_rat', '1e4ba4a84ac94ae49d0ee0f68c116ff36061fc9afc0d193eb51def9a174dcf00', '(2,10)-(62,80)'),
  'asset:salt_rat_portrait': portrait('salt_rat', '84aca8efacb66d9cc42b3579021ddbda79f2942ab02e8d3c80e34ee3f660d756', '6f97e8d6cfd7c13b3174328525521dfb0a1203400b87d6bef2908d142ca4e5d5'),
  'asset:tide_crab_sprite': sprite('tide_crab', '054aa77859175bb1ff2c368ab6fb11d477e0166934c92c853303665183b531b6', '(2,20)-(62,80)'),
  'asset:tide_crab_portrait': portrait('tide_crab', '241e0c4e8d59ec129c4f127ddefde628d41cb9001d0a73391c4b2360fe418af0', 'e71eb6f572c4c0404969383489c0346ba71c5a3c0205cbaa07d9df36a3c828ba'),
  'asset:gull_harrier_sprite': sprite('gull_harrier', '9f4dbc429adbc42972defec202ab039f23dea52a3dc6d39bbcab10757b9f4b6c', '(2,7)-(62,80)'),
  'asset:gull_harrier_portrait': portrait('gull_harrier', '221a16dc1dd6f510611833ce54db55f792ce74a2e77d07b4c3aa681a7c777cec', '0bbb16d508097d11d314c1be0cf652fdcdb86a3affd8b74c5890e99f043a411f'),
  'asset:net_caster_sprite': sprite('net_caster', '38d5b664646b7fafb081e6bb8af2bd71fef627c017686e3720c8c683e73e3c7c', '(1,5)-(63,80)'),
  'asset:net_caster_portrait': portrait('net_caster', '5465e2547615f34ce48f152b29a84f9fe29c17470752e33b514ce34a82cdd4b1', '9215e0eeff381450a8ef022f8c7aa2d7c24ee188abe2de89949e0bbdd95993e7'),
  'asset:stormcaller_acolyte_sprite': sprite('stormcaller_acolyte', '03d8e7f5dedd7f7fbd068c4f93becb96e9eafc5f6c101cf2f244f2415b3bcce4', '(5,4)-(58,80)'),
  'asset:stormcaller_acolyte_portrait': portrait('stormcaller_acolyte', '0f5c30d58ead8677faa3a5739f14b772224eceadc3901e56058d138ec67feb62', '53f61b5e1585a965bb61900866a9ab5f973126fbcf149d32896f1f9489efc940'),
  'asset:reef_stalker_sprite': sprite('reef_stalker', '724dbaa18f110c904762d12fd18462187465d040b275916c3989969d5348a1dc', '(2,9)-(62,80)'),
  'asset:reef_stalker_portrait': portrait('reef_stalker', 'dbfed80bf2ae9274b30a4d5517e32d0b1db38fe4751ef8d60e8c14fe66e4e479', '67820ec94d61667dcadf1c8d9cd819f1cada0bccbe269781f463d753db73a7b3'),
  'asset:deckbreaker_sprite': sprite('deckbreaker', '655449b2fb3b1cd1aee52f83bccc75cbd0020d6b8133514b11af471ff4f773cb', '(2,6)-(62,80)'),
  'asset:deckbreaker_portrait': portrait('deckbreaker', 'e110b7810b158a031f55f343bdc5b9ac395771ba60611422990cbe5a9467b44a', '341674ffb88a52eb1ddbd2bf943a3700e51bd1cbffecf95d08afc2510233486c'),
  'asset:siren_shade_sprite': sprite('siren_shade', '7955a620eb19c8a6447b05d54e9bd7251776a481fc3d19bb57dbbe3cb27cdfae', '(6,4)-(58,80)'),
  'asset:siren_shade_portrait': portrait('siren_shade', 'a177fb885f4d68a252b25154dcea15a794a7596017fa8cc9cd87291d5659f3c0', '853ad84ceb1e227122b1076af5f141efe9910dff89628ceb07e83d0e7ae052c5'),
  'asset:barnacle_golem_sprite': sprite('barnacle_golem', 'e8eeef4cf7828e35c9795637bd31638729966338a226b2f3ebec6b0fffb9e316', '(2,6)-(62,80)'),
  'asset:barnacle_golem_portrait': portrait('barnacle_golem', 'e3fa94907bb4ae197b2462c9b8a1f8c6b81b163647b71790d03436506b52ed88', '7f6cc43b3aa3c728b9bc06d7e7fe3714dbfe03e446a3a56db7cf89570cae7e39'),
  'asset:blackwake_captain_sprite': sprite('blackwake_captain', 'e18c7612c5f140255539689dfb3cfdcc8fd25a84a43a9fb8058049aba57dd8b0', '(2,4)-(62,80)'),
  'asset:blackwake_captain_portrait': portrait('blackwake_captain', 'a31a8e69dd71fb578711802e7bbf60dcc8a422823b8ec06ef317ef703dffb7ce', '3c844d7350e34c648ea46d2e7e288f7fc1f4e374b40de253a6ae4b53d3538a54'),
  'asset:admiral_blackwake_sprite': bossSprite('admiral_blackwake', '3a27c0376c2f8070ed1bfaeee50d144d261fb0a643ebc0fd8496bbd28f47805d', '(6,8)-(90,120)'),
  'asset:admiral_blackwake_portrait': portrait('admiral_blackwake', '6cdc1a395b2ec0928f9128df02bc48769e9b7c28ad83374be87e1547ecdc837a', '0d05f9afb9bb31e235d57ff870daec0b249e4f09434d4c2332e24964222acaf8'),
} satisfies Record<AssetId, AssetRecord>;

export function stormCoastFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const coastBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(stormCoastFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...STORM_COAST_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...coastBow] },
    },
    enemies: { ...baseline.enemies, ...stormCoastFamilyEnemies },
    assets: { ...baseline.assets, ...stormCoastFamilyAssets },
  };
}
