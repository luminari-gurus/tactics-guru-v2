import { shieldBash } from './abilities';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, MapRecord, SpawnRecord } from './types';
import { woodlandCrossing } from './woodlandCrossing';

const warrior = {
  id: 'hobgoblin_warrior', kind: 'enemy',
  spriteAssetId: 'asset:hobgoblin_warrior_sprite', portraitAssetId: 'asset:hobgoblin_warrior_portrait',
  stats: { maxHp: 15, move: 5, jump: 1, accuracy: 5, armorClass: 14, power: 3, dexterity: 1, will: 0 },
} as const satisfies EnemyRecord;

const rightsNote = 'Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.';
const illustrated = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru-v2',
  revision: 'bb9a581f4b6a0a9130af42f301e9f726ad29c5c8', rightsNote,
} as const;
export const hobgoblinAssets = {
  [warrior.spriteAssetId]: {
    id: warrior.spriteAssetId, kind: 'unit-sprite',
    sourcePath: 'public/battle/source/hobgoblin_warrior.png', runtimePath: '/battle/source/hobgoblin_warrior.png',
    sourceWidth: 64, sourceHeight: 80, runtimeWidth: 64, runtimeHeight: 80, format: 'png', anchor: { x: 32, y: 76 },
    provenance: {
      ...illustrated, originalPath: 'public/battle/source/hobgoblin_warrior.png',
      sourceSha256: 'a038e5c02773f41ae2f12b39e034621fecf00bdc9ae4f57b889c630153679a20',
      productionNotes: 'Illustrated 64×80 RGBA PNG matching existing goblin unit sprites; alpha bounds (7,8)-(58,80), source-pixel foot anchor (32,76). Feet on the bottom edge. Replaces the previous pixel-art sprite.',
    },
  },
  [warrior.portraitAssetId]: {
    id: warrior.portraitAssetId, kind: 'portrait',
    sourcePath: 'public/battle/source/hobgoblin_warrior_portrait.png', runtimePath: '/battle/portraits/hobgoblin_warrior.png',
    sourceWidth: 1254, sourceHeight: 1254, runtimeWidth: 96, runtimeHeight: 96, format: 'png',
    provenance: {
      ...illustrated, originalPath: 'public/battle/source/hobgoblin_warrior_portrait.png',
      sourceSha256: '4d40174f0dd7810612c2614007c7ff82827462d4a8831006d2fd0b4bf9086370',
      productionNotes: 'Full 1254×1254 framed parchment portrait retained; reviewed 96×96 RGB PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule. Runtime SHA-256 c6e590fe2b23f9633965dd6de5419a14e078f083ff87ad039eb1b18173d1775e. Replaces the previous 48×48 nearest-neighbor crop from the pixel-art sprite.',
    },
  },
} satisfies Record<AssetId, AssetRecord>;

export const hobgoblinComposition = {
  id: 'hobgoblin_formation_v1',
  roster: [
    ...woodlandCrossing.spawns.filter(spawn => spawn.side === 'heroes'),
    { id: 4, side: 'enemies', unitId: warrior.id, x: 3, y: 3 },
    { id: 5, side: 'enemies', unitId: warrior.id, x: 4, y: 3 },
  ] satisfies readonly SpawnRecord[],
};

export const hobgoblinMap = {
  ...woodlandCrossing, id: 'map:hobgoblin_formation', spawns: hobgoblinComposition.roster,
} satisfies MapRecord;

export function hobgoblinBattleContent(baseline: ContentCatalog): ContentCatalog {
  return {
    ...baseline, abilities: {
      ...baseline.abilities,
      'ability:basic_attack': { ...baseline.abilities['ability:basic_attack'], owners: [...baseline.abilities['ability:basic_attack'].owners, warrior.id] },
      [shieldBash.id]: shieldBash,
    },
    enemies: { ...baseline.enemies, [warrior.id]: warrior }, assets: { ...baseline.assets, ...hobgoblinAssets },
  };
}
