import { SHORTBOW_OPTIONAL_ENEMY_IDS } from './constants';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, UnitStats } from './types';

export const FOREST_FAMILY_IDS = [
  'briar_thrall', 'rotcap_sprout', 'spore_acolyte', 'thornback_beetle', 'blob',
  'cinder_archer', 'ash_hound', 'bellows_imp', 'mossback_boar', 'rootling_skirmisher',
] as const;
export const FOREST_FAMILY_MELEE_IDS = [
  'briar_thrall', 'rotcap_sprout', 'spore_acolyte', 'thornback_beetle', 'blob',
  'ash_hound', 'bellows_imp', 'mossback_boar', 'rootling_skirmisher',
] as const;
type FamilyId = typeof FOREST_FAMILY_IDS[number];
type Illustrated = { readonly origin: 'canonical'; readonly repository: string; readonly revision: string; readonly rightsNote: string };

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'eea51c961b092ee4df8c7ac6cfe0748fba7e2db2', rightsNote,
} as const;
const illustratedBatch3 = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: '1fc10bb6c96caa511107b3102b61c101f3daf4cf', rightsNote,
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
  cinder_archer: enemy('cinder_archer', { maxHp: 9, move: 4, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 2, will: 0 }),
  ash_hound: enemy('ash_hound', { maxHp: 12, move: 5, jump: 1, accuracy: 4, armorClass: 12, power: 3, dexterity: 2, will: 0 }),
  bellows_imp: enemy('bellows_imp', { maxHp: 8, move: 5, jump: 1, accuracy: 5, armorClass: 11, power: 2, dexterity: 2, will: 1 }),
  mossback_boar: enemy('mossback_boar', { maxHp: 14, move: 3, jump: 1, accuracy: 3, armorClass: 13, power: 2, dexterity: 0, will: 0 }),
  rootling_skirmisher: enemy('rootling_skirmisher', { maxHp: 10, move: 5, jump: 1, accuracy: 4, armorClass: 11, power: 4, dexterity: 0, will: 1 }),
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
  'asset:cinder_archer_sprite': sprite('cinder_archer', '8b43210648b43d7ac44b73726d25c3b6853f48e9eabcf36f88c1c3be91e8d0a9', '(8,12)-(56,80)', illustratedBatch3),
  'asset:cinder_archer_portrait': portrait('cinder_archer', '21a1a4adc57d8d93242647aeef9c5ec4b3cd2f814b3e24453c99c7a1e27d222c', 'ea8b19b173795c410e44e9364ed97f10068b764e36dfb7baf4b243be3832ce44', illustratedBatch3),
  'asset:ash_hound_sprite': sprite('ash_hound', '2c72d239678d6f9fa7747170ddec0de3e33cd14fd393c87d0155c987bf8fb4ae', '(3,20)-(61,80)', illustratedBatch3),
  'asset:ash_hound_portrait': portrait('ash_hound', '7a0ff342866e6f03d16229dbd321138656485e543e3d1fc8418ae9d5f2ae116c', '87c5b8cd7f418b5c864d50dfa5b822c90ec8a38296bb894492106ba0972ac6e0', illustratedBatch3),
  'asset:bellows_imp_sprite': sprite('bellows_imp', '3e283334b822147ca544f827d9f0b4c8ff573dbc0f9eac0845c1dd7c3183442b', '(8,16)-(56,80)', illustratedBatch3),
  'asset:bellows_imp_portrait': portrait('bellows_imp', 'd35c6b0e8b95d5a1900b3e6dcc99bc91cd31631eae1584984500ca5ceec836e4', '751b7318baacf5b2524185d85d1a2be0d860bb99431bd599ae799966c4b985a4', illustratedBatch3),
  'asset:mossback_boar_sprite': sprite('mossback_boar', '1e03aa9fb254923f524f59e6066dda611f553942186c6c51e7f5385bf76993cb', '(5,16)-(60,80)', illustratedBatch3),
  'asset:mossback_boar_portrait': portrait('mossback_boar', '58ebe2b4b067499e2222aa63bfd1b9ceb9ca1ff1c0a167ab8bd135962f64edd2', '3670834bcae5937f03162bc65c9f844acc2d76493b885af856b81ea9df5b3803', illustratedBatch3),
  'asset:rootling_skirmisher_sprite': sprite('rootling_skirmisher', 'fa7d75f63723ff4bf358b2e2c58a3f65e16cf6e602fc168465b10afb403ea186', '(6,12)-(59,80)', illustratedBatch3),
  'asset:rootling_skirmisher_portrait': portrait('rootling_skirmisher', '0b5ea12d8a93aa103736a344fa4d124062467ca1a5b94b8ebaf77b560ec9301f', 'ad2898d83e526744e764e09e068fb3272a511b8e7471f19a743d25ddba784ef2', illustratedBatch3),
} satisfies Record<AssetId, AssetRecord>;

export function forestFamilyBattleContent(baseline: ContentCatalog): ContentCatalog {
  const basic = baseline.abilities['ability:basic_attack'];
  const bow = baseline.abilities['ability:shortbow_shot'];
  const forestBow = SHORTBOW_OPTIONAL_ENEMY_IDS.filter(id => Object.hasOwn(forestFamilyEnemies, id));
  return {
    ...baseline,
    abilities: {
      ...baseline.abilities,
      [basic.id]: { ...basic, owners: [...basic.owners, ...FOREST_FAMILY_MELEE_IDS] },
      [bow.id]: { ...bow, owners: [...bow.owners, ...forestBow] },
    },
    enemies: { ...baseline.enemies, ...forestFamilyEnemies },
    assets: { ...baseline.assets, ...forestFamilyAssets },
  };
}
