import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const WETLANDS_FAMILY_IDS = [
  'lantern_imp', 'bog_gnawer', 'fenstalker', 'mire_hexer', 'bog_leech_swarm',
  'marsh_croaker', 'siltback_turtle', 'fen_strider', 'reed_whisperer', 'swamp_stalker',
  'fen_hag', 'rotbloom_tendril', 'drowned_warden',
  'lantern_hag', 'maw_of_the_fen',
] as const;
type FamilyId = typeof WETLANDS_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'ea5d30c3f36a3394f9aaefe1c5e93a0c6d7bc8f9', rightsNote,
} as const;
const illustratedBatch7 = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '51e56fe5596116038d59f9b8c3d5bcd5cc28c03b', rightsNote,
} as const;
const illustratedBatch8 = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '21f02e5389820f36482c7c0a0a5483f91aa0508c', rightsNote,
} as const;
const illustratedBatch9 = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'd55e881710caae126d6d7c53c985a425f963ea08', rightsNote,
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
  marsh_croaker: enemy('marsh_croaker', { maxHp: 9, move: 4, jump: 1, accuracy: 5, armorClass: 10, power: 3, dexterity: 2, will: 0 }),
  siltback_turtle: enemy('siltback_turtle', { maxHp: 16, move: 3, jump: 1, accuracy: 3, armorClass: 13, power: 1, dexterity: 0, will: 0 }),
  fen_strider: enemy('fen_strider', { maxHp: 13, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 2, dexterity: 1, will: 1 }),
  reed_whisperer: enemy('reed_whisperer', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 2, will: 1 }),
  swamp_stalker: enemy('swamp_stalker', { maxHp: 12, move: 5, jump: 1, accuracy: 5, armorClass: 12, power: 3, dexterity: 2, will: 1 }),
  fen_hag: enemy('fen_hag', { maxHp: 13, move: 3, jump: 1, accuracy: 5, armorClass: 12, power: 2, dexterity: 2, will: 2 }),
  rotbloom_tendril: enemy('rotbloom_tendril', { maxHp: 15, move: 3, jump: 1, accuracy: 4, armorClass: 13, power: 2, dexterity: 1, will: 1 }),
  drowned_warden: enemy('drowned_warden', { maxHp: 18, move: 3, jump: 1, accuracy: 4, armorClass: 14, power: 1, dexterity: 0, will: 3 }),
  lantern_hag: enemy('lantern_hag', { maxHp: 28, move: 3, jump: 1, accuracy: 5, armorClass: 13, power: 5, dexterity: 0, will: 2 }),
  maw_of_the_fen: enemy('maw_of_the_fen', { maxHp: 28, move: 3, jump: 1, accuracy: 5, armorClass: 13, power: 5, dexterity: 1, will: 2 }),
} as const satisfies Record<FamilyId, EnemyRecord>;

const sprite = (id: FamilyId, sourceSha256: string, alphaBounds: string, art: Illustrated = illustrated) => {
  const sourcePath = `public/battle/source/${id}_sprite.png`;
  return {
    id: `asset:${id}_sprite` as const, kind: 'unit-sprite' as const, sourcePath, runtimePath: `/battle/source/${id}_sprite.png`,
    sourceWidth: 64, sourceHeight: 80, runtimeWidth: 64, runtimeHeight: 80, format: 'png' as const, anchor: { x: 32, y: 76 },
    provenance: {
      ...art, originalPath: sourcePath, sourceSha256,
      productionNotes: `Illustrated 64×80 RGBA PNG matching existing goblin unit sprites; alpha bounds ${alphaBounds}, source-pixel foot anchor (32,76). Feet on the bottom edge.`,
    },
  };
};
const bossSprite = (id: FamilyId, sourceSha256: string, alphaBounds: string, art: Illustrated) => {
  const sourcePath = `public/battle/source/${id}_sprite.png`;
  const { width, height, anchor } = BOSS_SPRITE_CANVAS;
  return {
    id: `asset:${id}_sprite` as const, kind: 'unit-sprite' as const, sourcePath, runtimePath: `/battle/source/${id}_sprite.png`,
    sourceWidth: width, sourceHeight: height, runtimeWidth: width, runtimeHeight: height, format: 'png' as const, anchor,
    provenance: {
      ...art, originalPath: sourcePath, sourceSha256,
      productionNotes: `Illustrated 96×120 RGBA PNG (1.5× the ordinary 64×80 canvas) loaded at native size; alpha bounds ${alphaBounds}, source-pixel foot anchor (48,114). Single-tile occupancy. Feet on the bottom edge. No runtime 1.5× stretch or pixelArt/nearest-neighbor special case.`,
    },
  };
};
const portrait = (id: FamilyId, sourceSha256: string, runtimeSha256: string, art: Illustrated = illustrated) => {
  const sourcePath = `public/battle/source/${id}_portrait.png`;
  return {
    id: `asset:${id}_portrait` as const, kind: 'portrait' as const, sourcePath,
    runtimePath: `/battle/portraits/${id}.png`,
    sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 96, runtimeHeight: 96, format: 'png' as const,
    provenance: {
      ...art, originalPath: sourcePath, sourceSha256,
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
  'asset:marsh_croaker_sprite': sprite('marsh_croaker', '0ff70ff80c228f1f358b3d29283abde1213f89f921cb85698ecce722c0339be5', '(2,27)-(62,80)', illustratedBatch7),
  'asset:marsh_croaker_portrait': portrait('marsh_croaker', '707010e5c31ec3282acae22593f79a4a65396a6a78be1ac04ba5510ff557c278', '0dd6476212920b48c56a33ef8ddc90e253a11b6d3fb3d706cc1f88efa1c2a6fa', illustratedBatch7),
  'asset:siltback_turtle_sprite': sprite('siltback_turtle', '5abc4dff98795ab61fdd3dfaed7ed53e16c15faf647bae0bbcb39d86b9090045', '(2,31)-(62,80)', illustratedBatch7),
  'asset:siltback_turtle_portrait': portrait('siltback_turtle', '838dd8339cc4122cb1bb551e5ac517273c414f9333ab9cc2e4e681850b116937', 'e2dc6412bf722398ba58a483c044d0f56895c10e1fbdc850d1be69959131577e', illustratedBatch7),
  'asset:fen_strider_sprite': sprite('fen_strider', 'a65f248e4b4b0fe55e1a8d0f901edb5c90c3dca66a019031eff41d77e83e2458', '(11,4)-(54,80)', illustratedBatch7),
  'asset:fen_strider_portrait': portrait('fen_strider', '60d3c15b512f191827bbbd33886068e0707562515063b097e15b8fbcaf3fee82', '2ac75647593d51aee97f7c2312a9aa3cb5a3fc9887798524c5bae08f66d8256e', illustratedBatch7),
  'asset:reed_whisperer_sprite': sprite('reed_whisperer', 'da61ab72f101ec6d471ab5b08ebb91ee884d2891833b727c88bc43618cd425cb', '(16,10)-(48,80)', illustratedBatch7),
  'asset:reed_whisperer_portrait': portrait('reed_whisperer', '6acb3829ba2dba194c92ebf4ef26bfb579e4764e0a9559324bb3c7b6c5027e23', '2c1e6a894cdb11ea6f6e12b58187dda39aed17c5359a1ae025814de06c805f08', illustratedBatch7),
  'asset:swamp_stalker_sprite': sprite('swamp_stalker', '92f59b516888ca88983073e40f10b7d180c0f588b3ad2885cf4f92f85f5d34cd', '(7,14)-(58,80)', illustratedBatch7),
  'asset:swamp_stalker_portrait': portrait('swamp_stalker', 'a40cddfca45949a9ee94a47a5c8439899aeebd2cab0a083d7025f786af729bbe', '31ede37affa51e5f57cd3adf6771391d47c1236a6337cd38a0c5018c493c91e4', illustratedBatch7),
  'asset:fen_hag_sprite': sprite('fen_hag', '314295290b10bd4476fe48f8236a967cdaa95c601a14c080fa7c67032ca09260', '(10,4)-(55,80)', illustratedBatch8),
  'asset:fen_hag_portrait': portrait('fen_hag', '1bf730e371defb68e47b6b19d87ff805014a157e14f812ff2f0d7bba8d67f0f5', '25871eb8e800af56476138a78865db9b7cc113e418a42d0d00ee9ad4b176a4d6', illustratedBatch8),
  'asset:rotbloom_tendril_sprite': sprite('rotbloom_tendril', '85d3d1932c85886d32495b46db246355a8be2ee62d6ff953c77d4fb85e4bf08f', '(2,14)-(62,80)', illustratedBatch8),
  'asset:rotbloom_tendril_portrait': portrait('rotbloom_tendril', '8d749b3ecdae2bce72cb8e24d0d959dd2d7a8cd336a8b90f63b3746eb194bae6', '03f12dff8fed2ee825b842dcc0362a96a98bec1d25501f54cdf19ecd638ee15d', illustratedBatch8),
  'asset:drowned_warden_sprite': sprite('drowned_warden', '6109fd7ff48f36ec5332c826e33d6d53756ca2e8cc82ffa8faf5809b9e85d2b9', '(15,10)-(50,80)', illustratedBatch8),
  'asset:drowned_warden_portrait': portrait('drowned_warden', 'db9ee7a277f01f72efd28c2cdbd7a466792e0fa82c059904d2fbf540e2e2b8de', 'c37d1f15bc6ecad3b5f9e80cf55ce70ed16279a3244632967e283bad11cb3dac', illustratedBatch8),
  'asset:lantern_hag_sprite': bossSprite('lantern_hag', '9a0aa8aba4ee584a2d4fbcea13bc884bb6b591b142f4b0073a8485fc9200c867', '(8,13)-(87,120)', illustratedBatch9),
  'asset:lantern_hag_portrait': portrait('lantern_hag', '0071b69eab854203f37570249f1c463fcf7ed16e66dda94e27a126e368bfbb91', '94c36b9160b725f4a0b387e509846ca03624bc1513e425c466e56911008d0029', illustratedBatch9),
  'asset:maw_of_the_fen_sprite': bossSprite('maw_of_the_fen', 'fe369d35065e77934ce95daa71fd1f30719d2be0c4f053102f48ff18a15ebcc7', '(3,23)-(93,120)', illustratedBatch9),
  'asset:maw_of_the_fen_portrait': portrait('maw_of_the_fen', 'a98a453a0bbf84d32170995f9fda82a189576c1efebb1bed1ca3bd2c809e24b9', 'f8872dd20e40420b75c3ed6d00d04e3eae391d2ee05ddc0bd22a781dbc3d7d13', illustratedBatch9),
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
