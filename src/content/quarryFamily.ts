import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const QUARRY_FAMILY_IDS = [
  'blast_adept', 'chain_hauler', 'clockwork_drillguard', 'dust_rat', 'echo_duelist',
  'glass_squire', 'ironhide_foreman', 'pit_ogre', 'prism_seer', 'quarry_scab',
  'quarry_vulture', 'shardling', 'sling_sapper', 'stonebound_laborer',
  'grimgor', 'gorrak_the_breaker', 'mirror_knight',
] as const;
export const QUARRY_FAMILY_MELEE_IDS = [
  'blast_adept', 'chain_hauler', 'clockwork_drillguard', 'dust_rat', 'echo_duelist',
  'glass_squire', 'ironhide_foreman', 'pit_ogre', 'prism_seer', 'quarry_scab',
  'shardling', 'stonebound_laborer',
  'grimgor', 'gorrak_the_breaker', 'mirror_knight',
] as const;
export const QUARRY_BOSS_IDS = ['grimgor', 'gorrak_the_breaker', 'mirror_knight'] as const;
type FamilyId = typeof QUARRY_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'e8b81c183fe74246a38390b9b936549571283f75', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// Quarry Goblin Grunt / Goblin Archer stay the existing core units; they are not re-registered here.
// `gorrak_the_breaker` ("Gorrak the Breaker") uses supplement id `grimgor_quarry_tyrant` stats.
export const quarryFamilyEnemies = {
  blast_adept: enemy('blast_adept', { maxHp: 12, move: 3, jump: 1, accuracy: 6, armorClass: 11, power: 4, dexterity: 1, will: 1 }),
  chain_hauler: enemy('chain_hauler', { maxHp: 14, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  clockwork_drillguard: enemy('clockwork_drillguard', { maxHp: 17, move: 3, jump: 1, accuracy: 5, armorClass: 15, power: 5, dexterity: 2, will: 2 }),
  dust_rat: enemy('dust_rat', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 4, dexterity: 0, will: 0 }),
  echo_duelist: enemy('echo_duelist', { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 12, power: 3, dexterity: 2, will: 1 }),
  glass_squire: enemy('glass_squire', { maxHp: 13, move: 4, jump: 1, accuracy: 4, armorClass: 13, power: 3, dexterity: 1, will: 0 }),
  ironhide_foreman: enemy('ironhide_foreman', { maxHp: 13, move: 3, jump: 1, accuracy: 4, armorClass: 14, power: 3, dexterity: 1, will: 2 }),
  pit_ogre: enemy('pit_ogre', { maxHp: 18, move: 2, jump: 1, accuracy: 4, armorClass: 16, power: 5, dexterity: 2, will: 1 }),
  prism_seer: enemy('prism_seer', { maxHp: 10, move: 3, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 2 }),
  quarry_scab: enemy('quarry_scab', { maxHp: 12, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 0, will: 0 }),
  quarry_vulture: enemy('quarry_vulture', { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 5, dexterity: 1, will: 0 }),
  shardling: enemy('shardling', { maxHp: 9, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 2, will: 0 }),
  sling_sapper: enemy('sling_sapper', { maxHp: 11, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 0 }),
  stonebound_laborer: enemy('stonebound_laborer', { maxHp: 16, move: 3, jump: 1, accuracy: 4, armorClass: 15, power: 5, dexterity: 2, will: 1 }),
  grimgor: enemy('grimgor', { maxHp: 26, move: 3, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 0, will: 2 }),
  gorrak_the_breaker: enemy('gorrak_the_breaker', { maxHp: 30, move: 3, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
  mirror_knight: enemy('mirror_knight', { maxHp: 30, move: 4, jump: 1, accuracy: 6, armorClass: 15, power: 5, dexterity: 1, will: 2 }),
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

export const quarryFamilyAssets = {
  'asset:blast_adept_sprite': sprite('blast_adept', 'de33cad034eecd6598a638e0c11dcd9912c42569fd965532d91ae4118740e587', '(7,8)-(56,80)'),
  'asset:blast_adept_portrait': portrait('blast_adept', 'fd1545376a4a5a8cee84e1babb08ba6ccb35db9ba8d892bdde8ba75e5ad7c4bb', '8a97a801be6de4210841d4709dcad1046d1e12110687c9f206dc827d2cf6e11e'),
  'asset:chain_hauler_sprite': sprite('chain_hauler', 'f0f005c134b8a11d8237a0a9ee3a5707532edad306044812ea6a245c6400e534', '(5,8)-(59,80)'),
  'asset:chain_hauler_portrait': portrait('chain_hauler', 'd577939fe91067a61080e76b3d2fb53e0f58241bbb913d59fb0a85c902c48858', '33fa146b8e0d4836455be894fa5f677754f7933ceb1513c57afaf4819d44ba58'),
  'asset:clockwork_drillguard_sprite': sprite('clockwork_drillguard', '2750ee3c4194d746ca7d914eae499a149ead9e306025ac6b93d623b0c89feb49', '(4,10)-(60,80)'),
  'asset:clockwork_drillguard_portrait': portrait('clockwork_drillguard', 'ff50ee6f7419e836013451afb9c40ea7f9d4ccae63aa965514f16124c252b78a', '46b0eaf3f851dada4c4387a8b2395970d0f291cf64390d59c7f4bf006bfc35c1'),
  'asset:dust_rat_sprite': sprite('dust_rat', '0be9d098e6ff2d0d12cdb9b8817f90f937f364260b92166fe22f0a76e92cd6ba', '(4,29)-(60,80)'),
  'asset:dust_rat_portrait': portrait('dust_rat', '97188b368c8672671ea3637454a6c48b38595c392f745022b5b4f8492ad801e6', 'f707d0fd6cd674f276fcbe95908146ecb9ad747c39a04900138ac44f45044202'),
  'asset:echo_duelist_sprite': sprite('echo_duelist', 'c6917f03e82b0bfdb067d950279d9cdd5926e295968e4e3d7afd8e0e29231b8c', '(10,10)-(55,80)'),
  'asset:echo_duelist_portrait': portrait('echo_duelist', 'f328530b2162696e5544129995777ef7bc5784b249c0e8077789bbdf8deca26d', 'cea059de97ec91a28627aa76f8b1825713ce319a4d8e91c2a2b0fed87efdb5d7'),
  'asset:glass_squire_sprite': sprite('glass_squire', '493350780c182682772e9108e7a82efe1de98ed12073212a174ed54c3143f70c', '(7,12)-(57,80)'),
  'asset:glass_squire_portrait': portrait('glass_squire', '34c1b3abf141183d1e0905a2a38fb663233ed27e978995d2efe21ea5f188b2a1', 'af3fe5e9479fd5be19c32e90d04ad8f2e83f6ac6947e60fd5607153362c5aa3d'),
  'asset:ironhide_foreman_sprite': sprite('ironhide_foreman', 'cceadd30dc4cc1d54f7faf2ee9edc00e4c03103ac5f5ac4342705b1ecf29061c', '(11,8)-(53,80)'),
  'asset:ironhide_foreman_portrait': portrait('ironhide_foreman', '0629465d607c040890e3229da1c63bec33ac0e121e625f93b7fcf16053592a84', '52564ffd859cd2d7bd37e05f1998974b532d87a51bfb831e31ba205a0fa01c47'),
  'asset:pit_ogre_sprite': sprite('pit_ogre', '53ab80c0cb83f4f0515fe21f6ea5870f4d87ea424c7dab780ae64cd1cb2e47f8', '(4,8)-(60,80)'),
  'asset:pit_ogre_portrait': portrait('pit_ogre', '6ea7dc94e3feb3bba18e2d76241d1f13f5a7f33a8faa876bd8601a8e9a68c181', 'f235796b2fea7fab68003587c4d330ff4c16809e81f7d470dfd98cebc659cb4b'),
  'asset:prism_seer_sprite': sprite('prism_seer', '22491e021334225e7b6752acc86ec8d9cae96df145db187a0bf462ac332037d9', '(11,8)-(53,80)'),
  'asset:prism_seer_portrait': portrait('prism_seer', 'dc29f974ee634c30bef4936d83115a1a4947d9ddc78f9b59c5f1252cb3fdb966', '0f9c1a4e9cbde8f23666f05673ed5e8ed1b5755ddb1e96efefd1d8cbc05a2795'),
  'asset:quarry_scab_sprite': sprite('quarry_scab', '4a056af4ece10faba4248100d36a3d86f5c1844d5c8a3cf51a23713f9546ca54', '(7,8)-(56,80)'),
  'asset:quarry_scab_portrait': portrait('quarry_scab', '439114bf24f9ef634862298e2650d8135dbf78c1932769b2eba42a4b0d195d81', 'fa4fb74fbf8e18836edfeb12a7abca0f7cb995cfd19862478ff11a7d2df52dc1'),
  'asset:quarry_vulture_sprite': sprite('quarry_vulture', '840e4f6bb18a19ec972955a7a5295ec0d0229423ba0a10322f3d41e6d13e447e', '(4,18)-(60,80)'),
  'asset:quarry_vulture_portrait': portrait('quarry_vulture', '2277b7c4aed9abe0042b6bfd3ff5b12c5182de2e90bdde00c31dde424a523ec4', '274db465aaec196615f4cb418364b2ac01be02756cdb6aad0c13d7d53a64a233'),
  'asset:shardling_sprite': sprite('shardling', '670ec2de5d241b77c15f19dbe806658e1a93e834da927dc197585e3928966a65', '(11,22)-(54,80)'),
  'asset:shardling_portrait': portrait('shardling', 'fac8c356c2a1f6ae505c381258f5fae6802e746cfb70b70a9ed15937e6cb0e34', '181b335c9b733541b3968f5b44c24b5190dc936852ca298fc9fa510d092bf830'),
  'asset:sling_sapper_sprite': sprite('sling_sapper', '214d5544252c57e036cb73cc12aea888ade78603ba03699339bda4821bf7c8e1', '(5,8)-(59,80)'),
  'asset:sling_sapper_portrait': portrait('sling_sapper', '88de858dc9fb246838dcd7921e15d51717d444f7ad1619bfbc00fb5ac74807fc', '02fe9b4fc18e73da3f00d1055387d4bc01fed75d51a39a8eeeacbfa0f1704158'),
  'asset:stonebound_laborer_sprite': sprite('stonebound_laborer', 'e513917ed957143564ee71db0f83944f6e0bf194c9cc845ceea7976b921aad2b', '(7,8)-(57,80)'),
  'asset:stonebound_laborer_portrait': portrait('stonebound_laborer', 'd73310f9d5eac56574a91d247284be4ef8453dc1981072f668d76fb07a448755', '711715ca72fbc95612231ed6e37165408e1741536e76ddb4a901370349f9b292'),
  'asset:grimgor_sprite': bossSprite('grimgor', 'e6873fa876529e267c5083c6f0fe5a4a23c9ced38d155d644a8b94561588d627', '(3,13)-(93,120)'),
  'asset:grimgor_portrait': portrait('grimgor', '338a90a7b4c7a5275545d1520e1ffe57b754805e810bdd3664676d3b583d2a2d', '9da602d3590a89628c33014f31fcc5f2ff898b7c0b899a0078ce79e04883d890'),
  'asset:gorrak_the_breaker_sprite': bossSprite('gorrak_the_breaker', '3552749d7e820f0b87c8efb80231f041973e4fb7432568a56ea01983c77b0b5e', '(9,8)-(88,120)'),
  'asset:gorrak_the_breaker_portrait': portrait('gorrak_the_breaker', '383d3222f234864ed29db122c0de73c37b131ce597c73495e8fc51fc7e3f086f', '96b88372626066fa8d689e4da69646eff960f8a96089d0a45948f9c53ef0882d'),
  'asset:mirror_knight_sprite': bossSprite('mirror_knight', 'c86803a62a7c28026c38beb0f84c75963454f841fb0ce845ab0f7386dcc20aea', '(8,8)-(89,120)'),
  'asset:mirror_knight_portrait': portrait('mirror_knight', 'aff4ff6939e62f5f1d8a65b6e1dc58be3b4d7e3788504b1c6b1e0b3d6e798515', 'bfd7fbe5fbf1e53da36105e6a85e53e442a076467e3489276e2b75212a6c911c'),
} satisfies Record<AssetId, AssetRecord>;

export function quarryFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const quarryBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(quarryFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...QUARRY_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...quarryBow] },
    },
    enemies: { ...baseline.enemies, ...quarryFamilyEnemies },
    assets: { ...baseline.assets, ...quarryFamilyAssets },
  };
}
