import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const SHATTERED_CITADEL_FAMILY_IDS = [
  'ruin_squire', 'crossbow_levy', 'rubble_imp', 'gate_warden', 'siege_engineer',
  'banner_knight', 'arcane_bailiff', 'gargoyle_sentinel', 'iron_ram', 'crownless_champion',
  'crownless_regent',
] as const;
export const SHATTERED_CITADEL_FAMILY_MELEE_IDS = [
  'ruin_squire', 'rubble_imp', 'gate_warden', 'banner_knight',
  'gargoyle_sentinel', 'iron_ram', 'crownless_champion',
  'crownless_regent',
] as const;
export const SHATTERED_CITADEL_BOSS_IDS = ['crownless_regent'] as const;
type FamilyId = typeof SHATTERED_CITADEL_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'baf32fc14caec6bd8f17d1cf83d6cf8afe8e101a', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// `crownless_champion` (regular/elite) and `crownless_regent` (boss) are distinct units.
export const shatteredCitadelFamilyEnemies = {
  ruin_squire: enemy('ruin_squire', { maxHp: 10, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 2, dexterity: 1, will: 1 }),
  crossbow_levy: enemy('crossbow_levy', { maxHp: 9, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  rubble_imp: enemy('rubble_imp', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 10, power: 2, dexterity: 1, will: 1 }),
  gate_warden: enemy('gate_warden', { maxHp: 15, move: 3, jump: 1, accuracy: 3, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  siege_engineer: enemy('siege_engineer', { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  banner_knight: enemy('banner_knight', { maxHp: 16, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  arcane_bailiff: enemy('arcane_bailiff', { maxHp: 14, move: 4, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  gargoyle_sentinel: enemy('gargoyle_sentinel', { maxHp: 19, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  iron_ram: enemy('iron_ram', { maxHp: 18, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  crownless_champion: enemy('crownless_champion', { maxHp: 17, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 4, dexterity: 1, will: 1 }),
  crownless_regent: enemy('crownless_regent', { maxHp: 30, move: 4, jump: 1, accuracy: 6, armorClass: 14, power: 5, dexterity: 1, will: 2 }),
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

export const shatteredCitadelFamilyAssets = {
  'asset:ruin_squire_sprite': sprite('ruin_squire', 'c013f42ba7df46df61dbb3cfda807ab6839db669bffd0f673bb490ae83cb24a5', '(2,4)-(61,80)'),
  'asset:ruin_squire_portrait': portrait('ruin_squire', '2619c11a6c7e03f1d6e170ae1e452eac61b9f7763a4d46b2bd5c6787f253ffc6', '72ca0e0265ea3600fd03ad0fc7fb4ed4c723a5184939dc1cf8a16539152d237a'),
  'asset:crossbow_levy_sprite': sprite('crossbow_levy', '3e2a35dc608ba616bb3be839b58b2bc4f321e0a5e0022614ad3b008ee853bef6', '(7,4)-(57,80)'),
  'asset:crossbow_levy_portrait': portrait('crossbow_levy', '782981a9be6f522dd8a9c2a92667f2237b6f0a0844a89ebf90f19439e04c89fd', '4b9e4d41e4f328943d4e6c742feb94e90c988228e491b5df9bda35b6e041d0d3'),
  'asset:rubble_imp_sprite': sprite('rubble_imp', '666caf1a4462081efdc769a62b168607c31063c9eb3c56e4566d804ac11c613a', '(2,11)-(62,80)'),
  'asset:rubble_imp_portrait': portrait('rubble_imp', 'afeadf6c7987a324e19b5e302f11a9d1d9a3eeba4c7c42e0fa146befae4190f3', '9ad12059bf983628ad43c47b4fc6874c1868f8b63d324de6e63cb66aaa53b524'),
  'asset:gate_warden_sprite': sprite('gate_warden', '57d119d811fc99ec09978d1fdd2c901117f5304fb50e0132003749233e11219a', '(2,5)-(62,80)'),
  'asset:gate_warden_portrait': portrait('gate_warden', '04620ccfe32aca31ce468bffee722b6659a67b63669e436905a4a7f0177c556a', 'e915ff157f2804de21837d059def5c84876f9f3b742a184c139fb8c6d0642234'),
  'asset:siege_engineer_sprite': sprite('siege_engineer', '730638a7dc3bdf48495d4bca892881d46e287a8a9e06cc381812bef75a84f2b5', '(10,2)-(53,80)'),
  'asset:siege_engineer_portrait': portrait('siege_engineer', 'de1b2e36343743c6daf9d7368b2ba2c46fadce7aa89cd4ad4b65e4fe30a5d213', 'eb81c6ccecd99d4da5daa3a7d41ae6af194dc9c86a76240142514ab63ca9e9d8'),
  'asset:banner_knight_sprite': sprite('banner_knight', '820a2db1667f7cb28eb3f16e07bc61cde1e38bb115f3939071970a5c8e984035', '(3,2)-(61,80)'),
  'asset:banner_knight_portrait': portrait('banner_knight', '1d8ed387dbaa49eeb02e6a3cf3e3a5b50a955dbd0018e70a63148614b56ff1aa', '47c198757cd10b8b84d22a1c71d7b996a9c7b68a88f04e0de886ddd8d622aac5'),
  'asset:arcane_bailiff_sprite': sprite('arcane_bailiff', '6f4007c160c791c94e63312ca99c2b1a3483212b12b56c8f31442c8c9b184c15', '(9,4)-(56,80)'),
  'asset:arcane_bailiff_portrait': portrait('arcane_bailiff', 'd9c1aff156897d5110567e072086651bc4cd177856066bced65790c57b74af21', 'c32259b5acca6723c2f9daa39a71e96593fcb242ae12f772d162178783ce1270'),
  'asset:gargoyle_sentinel_sprite': sprite('gargoyle_sentinel', '9c0914f4f1813ecc3d9f4a5ab23a66920698c4bd31bbf2918b6a666239d1451d', '(3,4)-(60,80)'),
  'asset:gargoyle_sentinel_portrait': portrait('gargoyle_sentinel', '3e89710895e8c5f66273ffd30d34461eb5e20a951aa9f2fe62dd7c9b9e43bb39', '1a7e0d2aebbba4b7ddabe5537688c1321c03d044fb553460156ab6e910443635'),
  'asset:iron_ram_sprite': sprite('iron_ram', '9a3f8d824f4057b08e9d3c3d0abbbcf67e6a31d1e7a3f738ae73eda9cb360ed9', '(2,12)-(62,80)'),
  'asset:iron_ram_portrait': portrait('iron_ram', '8ecc6a80485900024d417ba7a498c242e0f724a463fb5a78d70176cafc4dc311', '68bf4d733156f911b8b2bd8eeb430e12d149310eece2aa2892c6440a9f2220cc'),
  'asset:crownless_champion_sprite': sprite('crownless_champion', 'a0dd0f5718a8d95583c79642c974d26f3c4f8bec957363644b5d20887a7ae36d', '(9,0)-(55,80)'),
  'asset:crownless_champion_portrait': portrait('crownless_champion', '92bdb3a86b18a1f32c6a6017b8c500c4ae6a35f6063a0cafd51b97714deff19d', '54a3ea5896f87d719ada7f887567874e1a2a6828e34ad3323da204c6190e55ec'),
  'asset:crownless_regent_sprite': bossSprite('crownless_regent', '95798cc1e5e5fa2461f87614ea0c892edf73fb880f5ff456e77dfff0acf979e2', '(6,10)-(90,120)'),
  'asset:crownless_regent_portrait': portrait('crownless_regent', '1c3c9c2d080a8c8944771a50d04bd8c346221afc7a47714ab744e71c64b4df7b', '58b0c46389c04f931bb7422a46cbc9cdb373d7f01bbbf85909c622687edd1a86'),
} satisfies Record<AssetId, AssetRecord>;

export function shatteredCitadelFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const citadelBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(shatteredCitadelFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...SHATTERED_CITADEL_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...citadelBow] },
    },
    enemies: { ...baseline.enemies, ...shatteredCitadelFamilyEnemies },
    assets: { ...baseline.assets, ...shatteredCitadelFamilyAssets },
  };
}
