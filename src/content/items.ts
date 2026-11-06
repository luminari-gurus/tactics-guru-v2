import { HERO_IDS } from './constants';
import type { ItemCatalog } from './itemTypes';
import { validateItems } from './validateItems';

export const HEALING_DRAUGHT_ID = 'item:healing_draught';
export const HEALING_DRAUGHT_HP = 6;

const previousItems = {
  [HEALING_DRAUGHT_ID]: {
    id: HEALING_DRAUGHT_ID, label: 'Healing Draught', kind: 'consumable',
    eligibleHeroes: HERO_IDS, context: 'betweenEncounters', effect: { kind: 'restoreHp', amount: HEALING_DRAUGHT_HP },
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

function checked(items: ItemCatalog): ItemCatalog {
  const result = validateItems(items);
  if (!result.ok) throw new Error(`Invalid authored items: ${JSON.stringify(result.errors)}`);
  return result.catalog;
}

/** Exact catalog for the preceding save and pending reward formats. */
export const previousItemCatalog = checked(previousItems);
/** Separate from battleCatalog: item changes must not invalidate single-battle saves. */
export const itemCatalog = checked({
  ...previousItems,
  [HEALING_DRAUGHT_ID]: { ...previousItems[HEALING_DRAUGHT_ID], context: 'preparationAndCombat' },
  'item:revive_kit': {
    id: 'item:revive_kit', label: 'Revive Kit', kind: 'consumable', eligibleHeroes: HERO_IDS,
    context: 'betweenEncounters', effect: { kind: 'revive', percent: 35 },
  },
});
