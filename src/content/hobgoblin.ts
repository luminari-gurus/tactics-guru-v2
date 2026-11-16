import { shieldBash } from './abilities';
import type { AssetId, AssetRecord, ContentCatalog, EnemyRecord, MapRecord, SpawnRecord } from './types';
import { woodlandCrossing } from './woodlandCrossing';

const warrior = {
  id: 'hobgoblin_warrior', kind: 'enemy',
  spriteAssetId: 'asset:hobgoblin_warrior_sprite', portraitAssetId: 'asset:hobgoblin_warrior_portrait',
  stats: { maxHp: 15, move: 5, jump: 1, accuracy: 5, armorClass: 14, power: 3, dexterity: 1, will: 0 },
} as const satisfies EnemyRecord;

const sourcePath = 'public/battle/source/hobgoblin_warrior.png';
const provenance = {
  origin: 'canonical', repository: 'https://github.com/luminari-gurus/tactics-guru',
  revision: 'e9433f6b608ae6b2d95418615cce9cf17dadcf74', originalPath: 'art/units/hobgoblin_warrior.png',
  sourceSha256: '00c4baf51e31876f300eecfc4a95a29eab1894c1903c7cf63fa3ac3cca7b322b',
  rightsNote: 'Canonical project artwork from owner repository. No third-party license asserted.',
} as const;
export const hobgoblinAssets = {
  [warrior.spriteAssetId]: {
    id: warrior.spriteAssetId, kind: 'unit-sprite', sourcePath, runtimePath: '/battle/source/hobgoblin_warrior.png',
    sourceWidth: 64, sourceHeight: 80, runtimeWidth: 64, runtimeHeight: 80, format: 'png', anchor: { x: 32, y: 75 },
    provenance: { ...provenance, productionNotes: 'Original 64×80 PNG with a bottom-center foot anchor.' },
  },
  [warrior.portraitAssetId]: {
    id: warrior.portraitAssetId, kind: 'portrait', sourcePath, runtimePath: '/battle/portraits/hobgoblin_warrior.png',
    sourceWidth: 64, sourceHeight: 80, runtimeWidth: 96, runtimeHeight: 96, format: 'png',
    provenance: { ...provenance, productionNotes: '48×48 crop at (14, 8), enlarged to 96×96 with nearest-neighbor.' },
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
