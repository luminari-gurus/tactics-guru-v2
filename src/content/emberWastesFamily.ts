import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';
import { BOSS_SPRITE_CANVAS } from '../geometry/canopy';

export const EMBER_WASTES_FAMILY_IDS = [
  'ash_crawler', 'ashen_duelist', 'cinder_imp', 'ember_cultist', 'furnace_golem',
  'lava_serpent', 'magma_crab', 'pyre_oracle', 'scoria_hound', 'smoke_wisp',
  'kiln_saint',
] as const;
export const EMBER_WASTES_FAMILY_MELEE_IDS = [
  'ash_crawler', 'ashen_duelist', 'cinder_imp', 'furnace_golem',
  'lava_serpent', 'magma_crab', 'scoria_hound',
  'kiln_saint',
] as const;
export const EMBER_WASTES_BOSS_IDS = ['kiln_saint'] as const;
type FamilyId = typeof EMBER_WASTES_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'd25a903a5c721fb0c64f1dc18985db82d50876a7', rightsNote,
} as const;

const enemy = <Id extends FamilyId>(id: Id, stats: UnitStats) => ({
  id, kind: 'enemy',
  spriteAssetId: `asset:${id}_sprite`, portraitAssetId: `asset:${id}_portrait`,
  stats,
}) as const satisfies EnemyRecord;

// Bestiary HP/MOV/JMP/ACC/AC/PWR plus dexMod→dexterity and intMod→will from
// https://tactics-guru-supplement.pages.dev/bestiary/ (supplement `src/data/enemies.ts`).
// Forest `ash_hound`, `cinder_archer`, `bellows_imp`, and `ironmaw_furnace_beast` are different units.
export const emberWastesFamilyEnemies = {
  ash_crawler: enemy('ash_crawler', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  ashen_duelist: enemy('ashen_duelist', { maxHp: 13, move: 4, jump: 1, accuracy: 5, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  cinder_imp: enemy('cinder_imp', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 10, power: 2, dexterity: 1, will: 1 }),
  ember_cultist: enemy('ember_cultist', { maxHp: 10, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 1, will: 1 }),
  furnace_golem: enemy('furnace_golem', { maxHp: 19, move: 3, jump: 1, accuracy: 3, armorClass: 15, power: 5, dexterity: 1, will: 1 }),
  lava_serpent: enemy('lava_serpent', { maxHp: 16, move: 5, jump: 1, accuracy: 5, armorClass: 13, power: 4, dexterity: 1, will: 1 }),
  magma_crab: enemy('magma_crab', { maxHp: 15, move: 3, jump: 1, accuracy: 3, armorClass: 14, power: 3, dexterity: 1, will: 1 }),
  pyre_oracle: enemy('pyre_oracle', { maxHp: 14, move: 4, jump: 1, accuracy: 6, armorClass: 12, power: 4, dexterity: 1, will: 1 }),
  scoria_hound: enemy('scoria_hound', { maxHp: 12, move: 5, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 1, will: 1 }),
  smoke_wisp: enemy('smoke_wisp', { maxHp: 12, move: 5, jump: 1, accuracy: 5, armorClass: 11, power: 3, dexterity: 1, will: 1 }),
  kiln_saint: enemy('kiln_saint', { maxHp: 32, move: 3, jump: 1, accuracy: 6, armorClass: 15, power: 6, dexterity: 1, will: 2 }),
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

export const emberWastesFamilyAssets = {
  'asset:ash_crawler_sprite': sprite('ash_crawler', 'a32c85a9c0d6727bf9840da458ec5941b3a97a58b51e7fc56cd73ac8898202d2', '(5,26)-(60,80)'),
  'asset:ash_crawler_portrait': portrait('ash_crawler', '70c1536592783f51545f58509a0e32b9fcdca2d55c3e73fb7ca3385d05b3fb1a', '9e935d7c59eb3a936b415984830a9035218f431ec701a4d7a4c111c6ed1da05f'),
  'asset:ashen_duelist_sprite': sprite('ashen_duelist', '75d40693e7397026f8e3ca8586a14a491ea71622ed5222dd94c83052b117c6de', '(6,10)-(59,80)'),
  'asset:ashen_duelist_portrait': portrait('ashen_duelist', 'aa1e9664c8f4ed0c7efdd8710d646451b0c53b5348bb2ae74d7f0a7ac7c8aadc', '5ee15419552ec79a081c277dd74eeb46d88d61484ef9297a4c30f0e870b9d556'),
  'asset:cinder_imp_sprite': sprite('cinder_imp', '861f0dadc20df8cba1d07229db12f2ccb9fbc10aa0b5cef6134b9b665b8c46a4', '(8,12)-(56,80)'),
  'asset:cinder_imp_portrait': portrait('cinder_imp', '2340c834a9376a5e3961e7096973e3d2d3175c1ad6405bfd54eaa6d5f293073e', 'ae315ba5bc529fce925f89acdf7ad70a6a5bb46dc7eefa20deac2f7a28b5156b'),
  'asset:ember_cultist_sprite': sprite('ember_cultist', '270a5b8e2cf8b6f43575dcc00614e116bdefe3e986f1966bf9b6c06af3b39402', '(9,10)-(55,80)'),
  'asset:ember_cultist_portrait': portrait('ember_cultist', 'fd993b6dbf137ccead8c1a690f96215938f9197706173c0cd3f319f3a0f4c3ac', '0d965dad5bc789ae29c112ed732bd6ff05336ddaa4d81a45b751a08855d8c346'),
  'asset:furnace_golem_sprite': sprite('furnace_golem', 'ef3a866ccb1c36ab5bb05500da7eb6c5d85e79780dadce50518f6ded191b59f1', '(5,10)-(59,80)'),
  'asset:furnace_golem_portrait': portrait('furnace_golem', 'e16fb7f2d2c5907506efce0420a6d55b9fc7c2cfe29925dfdc12c67f8f0d8566', '39c1c305c9aac8debd884646fa8b6111b09b47e5d9ed517b4582c7cbfb123f71'),
  'asset:lava_serpent_sprite': sprite('lava_serpent', 'b1d0fa48be474fb4c88bd95fa542c0b6567a27089f314b8411bdfbdf399f78d6', '(5,8)-(59,80)'),
  'asset:lava_serpent_portrait': portrait('lava_serpent', '2119e43126650e00b296d3de4e7ef0b9565862744d7103f5c92d4317766102dc', '3cdd97e0e497986101015c1751f527306d56823bcc058f2394202493ba218bcd'),
  'asset:magma_crab_sprite': sprite('magma_crab', 'ae0f8e4dc792f239816feac5e9ae25b91c0070a2b15fc30d56e2a2cba24f4c24', '(2,29)-(62,80)'),
  'asset:magma_crab_portrait': portrait('magma_crab', '07c797d4a5a5eefd38c047725c0f976d27174182a2b250ac9c6e0bce2429cde0', '244bf73e25a10419dc5d9ed62002343dff3ae55f4de91f71571398555dd933d7'),
  'asset:pyre_oracle_sprite': sprite('pyre_oracle', '04bcb065bd6c074f266362593fd74d9a9de53e5c64e03670d41da6a69f3e69e0', '(7,10)-(58,80)'),
  'asset:pyre_oracle_portrait': portrait('pyre_oracle', 'ad47bd252d0db790958ac666bb302db869f7ef555cad47795a8db025c7f84b4a', '0597d23ec51f3acce98e2f17b16aef3be11670d4af4c9db3874ba3262e41d6ef'),
  'asset:scoria_hound_sprite': sprite('scoria_hound', 'e0a7e77e1df581e187c092e346ca68ac882f2ad5b2d2a5aa0ad0a5f8c32a1767', '(3,20)-(61,80)'),
  'asset:scoria_hound_portrait': portrait('scoria_hound', '34d2a3af9608ac476e3de40a3bff807413d65ae6671e612ba82281bd83d47775', '58f215385662d5917faa3aaea70829283a08fc3c7b1f4b31e0419bb120111dcd'),
  'asset:smoke_wisp_sprite': sprite('smoke_wisp', '300fab2fc07e4159070164715a5866a35f9c276bc3946868e308ad65808fe4f6', '(9,16)-(56,80)'),
  'asset:smoke_wisp_portrait': portrait('smoke_wisp', 'ae741eab4f167f6c31157e9bc81a8569b297fb6121aa5f0ff61462fa2d75d197', '1ef56f725ca41daa111d3548d11f2f81fee4e66d7f09352c490dcba0e46a4f27'),
  'asset:kiln_saint_sprite': bossSprite('kiln_saint', '987d01d2eeafbc84a2ce1977209865e1c75185e73cb86f51d59a55109abfea5c', '(11,8)-(86,120)'),
  'asset:kiln_saint_portrait': portrait('kiln_saint', 'e6f4488d6d12a87c268bf9bdfcaa21f66555a48f541c9b36c3a89f3564bd56d1', '0b920c92197ef6e825ca1f602afdc617cc2bda2c9f09885877b77885c604743f'),
} satisfies Record<AssetId, AssetRecord>;

export function emberWastesFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const emberBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(emberWastesFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...EMBER_WASTES_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...emberBow] },
    },
    enemies: { ...baseline.enemies, ...emberWastesFamilyEnemies },
    assets: { ...baseline.assets, ...emberWastesFamilyAssets },
  };
}
