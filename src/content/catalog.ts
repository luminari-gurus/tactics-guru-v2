import { battleAssets } from './assets';
import { forestRuins } from './forestRuins';
import type { ContentCatalog } from './types';
import { validateContent } from './validate';

// Baseline evidence and deliberate map adaptations: docs/first-battle-content.md.
const authoredCatalog = {
  maps: { 'map:forest_ruins': forestRuins },
  heroes: {
    fighter: {
      id: 'fighter', kind: 'hero',
      spriteAssetId: 'asset:fighter_sprite', portraitAssetId: 'asset:fighter_portrait',
      stats: { maxHp: 18, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 3, dexterity: 0, will: 1 },
    },
    ranger: {
      id: 'ranger', kind: 'hero',
      spriteAssetId: 'asset:ranger_sprite', portraitAssetId: 'asset:ranger_portrait',
      stats: { maxHp: 12, move: 4, jump: 1, accuracy: 5, armorClass: 12, power: 2, dexterity: 2, will: 0 },
    },
    mage: {
      id: 'mage', kind: 'hero',
      spriteAssetId: 'asset:mage_sprite', portraitAssetId: 'asset:mage_portrait',
      stats: { maxHp: 11, move: 4, jump: 1, accuracy: 3, armorClass: 11, power: 4, dexterity: 1, will: 2 },
    },
  },
  enemies: {
    goblin_grunt: {
      id: 'goblin_grunt', kind: 'enemy',
      spriteAssetId: 'asset:goblin_grunt_sprite', portraitAssetId: 'asset:goblin_grunt_portrait',
      stats: { maxHp: 9, move: 4, jump: 1, accuracy: 4, armorClass: 12, power: 2, dexterity: 1, will: 0 },
    },
    goblin_archer: {
      id: 'goblin_archer', kind: 'enemy',
      spriteAssetId: 'asset:goblin_archer_sprite', portraitAssetId: 'asset:goblin_archer_portrait',
      stats: { maxHp: 8, move: 4, jump: 1, accuracy: 4, armorClass: 11, power: 2, dexterity: 2, will: 0 },
    },
  },
  terrains: {
    grass: { id: 'grass', surfaceAssetId: 'asset:terrain_grass', moveCost: 1, walkable: true, blocksLineOfSight: false },
    grass_path: { id: 'grass_path', surfaceAssetId: 'asset:terrain_grass_path', moveCost: 1, walkable: true, blocksLineOfSight: false },
    stone: { id: 'stone', surfaceAssetId: 'asset:terrain_stone', moveCost: 1, walkable: true, blocksLineOfSight: false },
    forest: { id: 'forest', surfaceAssetId: 'asset:terrain_forest', moveCost: 1, walkable: false, blocksLineOfSight: true },
    water: { id: 'water', surfaceAssetId: 'asset:terrain_water', moveCost: 3, walkable: true, blocksLineOfSight: false },
  },
  assets: battleAssets,
} satisfies ContentCatalog;

const result = validateContent(authoredCatalog);
if (!result.ok) throw new Error(`Invalid authored battle content: ${JSON.stringify(result.errors)}`);
/** Only validated, renderer-independent definitions cross the catalog boundary. */
export const battleCatalog: ContentCatalog = result.catalog;
