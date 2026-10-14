import { HERO_IDS } from './constants';
import type { ItemCatalog } from './itemTypes';
import { validateItems } from './validateItems';

const authoredItems = {
  'item:healing_draught': {
    id: 'item:healing_draught', label: 'Healing Draught', kind: 'consumable',
    eligibleHeroes: HERO_IDS, context: 'betweenEncounters', effect: { kind: 'restoreHp', amount: 6 },
  },
  'item:warding_charm': {
    id: 'item:warding_charm', label: 'Warding Charm', kind: 'equipment', slot: 'charm',
    eligibleHeroes: HERO_IDS, context: 'betweenEncounters', effect: { kind: 'statBonus', stat: 'armorClass', amount: 1 },
  },
  'item:aiming_charm': {
    id: 'item:aiming_charm', label: 'Aiming Charm', kind: 'equipment', slot: 'charm',
    eligibleHeroes: HERO_IDS, context: 'betweenEncounters', effect: { kind: 'statBonus', stat: 'accuracy', amount: 1 },
  },
} satisfies ItemCatalog;

const result = validateItems(authoredItems);
if (!result.ok) throw new Error(`Invalid authored items: ${JSON.stringify(result.errors)}`);
/** Separate from battleCatalog: item changes must not invalidate single-battle saves. */
export const itemCatalog: ItemCatalog = result.catalog;
