import type { HeroId } from './types';

export type ItemId = `item:${string}`;
export const EQUIPMENT_SLOTS = { charm: 'Charm' } as const;
export type EquipmentSlot = keyof typeof EQUIPMENT_SLOTS;
export function isEquipmentSlot(value: unknown): value is EquipmentSlot {
  return typeof value === 'string' && Object.hasOwn(EQUIPMENT_SLOTS, value);
}
interface ItemBase {
  readonly id: ItemId;
  readonly label: string;
  readonly eligibleHeroes: readonly HeroId[];
}
export type ConsumableDef = ItemBase & { readonly kind: 'consumable' } & (
  | { readonly context: 'betweenEncounters' | 'preparationAndCombat'; readonly effect: { readonly kind: 'restoreHp'; readonly amount: number } }
  | { readonly context: 'betweenEncounters'; readonly effect: { readonly kind: 'revive'; readonly percent: number } }
);
export interface EquipmentDef extends ItemBase {
  readonly kind: 'equipment';
  readonly context: 'betweenEncounters';
  readonly slot: EquipmentSlot;
  readonly effect: { readonly kind: 'statBonus'; readonly stat: 'accuracy' | 'armorClass'; readonly amount: number };
}
export type ItemDef = ConsumableDef | EquipmentDef;
export type ItemCatalog = Readonly<Record<ItemId, ItemDef>>;
export const ITEM_BOUNDS = {
  definitions: { min: 1, max: 32 },
  labelLength: { min: 1, max: 64 },
  healing: { min: 1, max: 18 },
  revivePercent: { min: 1, max: 100 },
  bonus: { min: 1, max: 2 },
  stack: { min: 1, max: 9 },
  equipmentInstances: { min: 0, max: 6 },
} as const;

/** Owned data consumed by pure domain/items commands and future #79/#80 save integration. */
export interface OwnedConsumable { readonly itemId: ItemId; readonly quantity: number }
export interface OwnedEquipment { readonly instanceId: string; readonly itemId: ItemId }
export interface EquipmentAssignment { readonly heroId: HeroId; readonly slot: EquipmentSlot; readonly instanceId: string }
export interface ItemOwnership {
  readonly consumables: readonly OwnedConsumable[];
  readonly equipment: readonly OwnedEquipment[];
  readonly assignments: readonly EquipmentAssignment[];
}
