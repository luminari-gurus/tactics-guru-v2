import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const CAVERNS_FAMILY_IDS = [
  'cave_skulk', 'spore_mite_cluster', 'tunnel_beetle', 'fungus_slinger', 'echo_bat_swarm',
  'deep_delver', 'crystal_hermit', 'cave_troll', 'mycelial_shepherd', 'chasm_drake',
  'hollow_matriarch_boss',
] as const;
export const CAVERNS_FAMILY_MELEE_IDS = [
  'cave_skulk', 'spore_mite_cluster', 'tunnel_beetle', 'echo_bat_swarm',
  'deep_delver', 'cave_troll', 'mycelial_shepherd', 'chasm_drake',
  'hollow_matriarch_boss',
] as const;
export const CAVERNS_BOSS_IDS = ['hollow_matriarch_boss'] as const;
type FamilyId = typeof CAVERNS_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'f9cfcea43e890b6cd3ea3223e2a3a6dcd0b72584', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// Forest `hollow_root_matriarch` ("Hollow Root Matriarch") is a different unit.
export const cavernsFamilyEnemies = {
  cave_skulk: enemy('cave_skulk', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  spore_mite_cluster: enemy('spore_mite_cluster', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 10, power: 2, dexterity: 1, will: 1 }),
  tunnel_beetle: enemy('tunnel_beetle', { maxHp: 13, move: 3, jump: 1, accuracy: 3, armorClass: 13, power: 3, dexterity: 1, will: 1 }),
  fungus_slinger: enemy('fungus_slinger', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  echo_bat_swarm: enemy('echo_bat_swarm', { maxHp: 11, move: 5, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 1 }),
  deep_delver: enemy('deep_delver', { maxHp: 15, move: 4, jump: 1, accuracy: 4, armorClass: 13, power: 3, dexterity: 1, will: 1 }),
  crystal_hermit: enemy('crystal_hermit', { maxHp: 14, move: 4, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  cave_troll: enemy('cave_troll', { maxHp: 19, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  mycelial_shepherd: enemy('mycelial_shepherd', { maxHp: 17, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  chasm_drake: enemy('chasm_drake', { maxHp: 16, move: 5, jump: 1, accuracy: 5, armorClass: 13, power: 4, dexterity: 1, will: 1 }),
  hollow_matriarch_boss: enemy('hollow_matriarch_boss', { maxHp: 30, move: 4, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
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

export const cavernsFamilyAssets = {
  'asset:cave_skulk_sprite': sprite('cave_skulk', '2f35d0733e6bbee7270a39a7eb5f9416588413ede7d1350c112a5f9dfc6413ad', '(2,4)-(62,80)'),
  'asset:cave_skulk_portrait': portrait('cave_skulk', '1bfbc77566afe30183d1f67f331544793e07cedd8ce2e19836d3c9aa5c1e9a20', '0c16f502e809de2cf0931192d8d7c2958ccfc90303b1c3c8a5bd2aae2e2029ec'),
  'asset:spore_mite_cluster_sprite': sprite('spore_mite_cluster', 'c06ec8c2b4c0a4dabc76bf141ceb2293b49e616089598f81dad6ff0655013222', '(3,26)-(61,80)'),
  'asset:spore_mite_cluster_portrait': portrait('spore_mite_cluster', '7558cfc1d3d76a5fb640f2f4b18901b04ea53c09c7ba241c2fb272b11a619491', '5c0017904ebfcc6d7bf0111071c51d51b21878885739c498ba8ee4a0a3d57ba5'),
  'asset:tunnel_beetle_sprite': sprite('tunnel_beetle', '56d04dc4d50d1974dc3c8289e9d3e03d5e7664090fde8f3a6ae997867749a799', '(4,26)-(61,80)'),
  'asset:tunnel_beetle_portrait': portrait('tunnel_beetle', '22ca58d18903b093ac62975f41e579e6577ee215fbc317b22f64db479ca0263a', 'de3a6c7822bf860fa6ec419666c1bd199540a34a7206b93ca79f2e099105dd3b'),
  'asset:fungus_slinger_sprite': sprite('fungus_slinger', '6cd8b66bbaa93eab4111d8c54d737b9e1ecc09694f9e49936776bf837785b69f', '(2,4)-(62,80)'),
  'asset:fungus_slinger_portrait': portrait('fungus_slinger', '57789ab770c82a462658841380e10f6e5aa7de629ba70575d3c95d5163d248b4', 'c734cdd5d232e9abb846269a314d12d0573c87c925025a8535394803cf0542de'),
  'asset:echo_bat_swarm_sprite': sprite('echo_bat_swarm', '1d73e42040f767aadc3ac4f5c380e7b0586a20389edacf98dae2219b54aafcc9', '(3,18)-(62,80)'),
  'asset:echo_bat_swarm_portrait': portrait('echo_bat_swarm', '5632ee64213a094a55b6b53e40f9811b6bfd65fc424a645ed74c4ef6f5296223', '835554bca0cd031d86a76cba5d771b596043eadd05929a30bbb39994f5e42e5a'),
  'asset:deep_delver_sprite': sprite('deep_delver', '97f0ff9eef05d3b9c2e3e38cf89c8ebb399a87c823fceed726245f41c679b80b', '(10,14)-(55,80)'),
  'asset:deep_delver_portrait': portrait('deep_delver', 'df6f4fdb35c70b072c00cb8c652b27ff49d937e8af8cce49bed50ebe0c6548dd', 'b0886b77ae72e307928f09658e94909720a56096b6392424287f1e12d4d2b2c9'),
  'asset:crystal_hermit_sprite': sprite('crystal_hermit', '71d6b3a54c23501cd792cc7c7d12d5a1f7497bd4c0504d9aa5f888772e060a2b', '(12,8)-(52,80)'),
  'asset:crystal_hermit_portrait': portrait('crystal_hermit', 'b8aabaef19ebbcf11bdaa6f584caca67261c8f8ca6ece6309d1d106eb9d1a7d8', 'dd47377cb9151eac635b9e6af79f791612a6a5278b9ec92419c35081e6c99cc4'),
  'asset:cave_troll_sprite': sprite('cave_troll', '44ad26eb88b20ef6b2fabeb7a14e50bc834019ca6d3be8aa75eeb832defa2b5c', '(4,10)-(61,80)'),
  'asset:cave_troll_portrait': portrait('cave_troll', 'fdc702e29a1c6e674601b3dbf567e85d97abc73da90f7919f2998616a69fb02a', '312939850b10fa31edf95a876c2e90df400665e50c4b6d548a0005a3e7be7caa'),
  'asset:mycelial_shepherd_sprite': sprite('mycelial_shepherd', 'f33b597e042545ab5be9a776ea25817e153f51ba6cfe36748863cd7f470b51a7', '(10,8)-(54,80)'),
  'asset:mycelial_shepherd_portrait': portrait('mycelial_shepherd', '59dac0e7512d1560cb0a6d6197c857c9f409335439199ca87daad56a63b25d77', 'a1ee0f2874f3070470a97015469f155a661c59adf947c7adfbc3f022384e5046'),
  'asset:chasm_drake_sprite': sprite('chasm_drake', '593f24733e50332d01663fe7521dcde5bd3893934c2a5253d198a45b4732271b', '(8,14)-(57,80)'),
  'asset:chasm_drake_portrait': portrait('chasm_drake', 'af192366d653ebf7a0f76b8e8801ea0cef8375e701f04bff6d0568daa0436a92', '87e87eacc0f50026d4355d74196d191847bc55634034e539a0803f1c31b87534'),
  'asset:hollow_matriarch_boss_sprite': bossSprite('hollow_matriarch_boss', '69607689cfc1b3a7fe862c10100c8ea7b8c6c6ac48a3d91659807b7ebc22dc35', '(6,8)-(90,120)'),
  'asset:hollow_matriarch_boss_portrait': portrait('hollow_matriarch_boss', 'a94d086a015c70277cfd82a6e54c30d9c49c310740a2b2e791f37b117428b02f', '1652fa65f6c982dd0fb76e179c05c0ebc5818f9d34fd5414d7e7c2bdb832c7d0'),
} satisfies Record<AssetId, AssetRecord>;

export function cavernsFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const cavernsBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(cavernsFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...CAVERNS_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...cavernsBow] },
    },
    enemies: { ...baseline.enemies, ...cavernsFamilyEnemies },
    assets: { ...baseline.assets, ...cavernsFamilyAssets },
  };
}
