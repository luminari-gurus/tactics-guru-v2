import { HERO_IDS } from './constants';
import { ITEM_BOUNDS, type ItemCatalog, type ItemDef, type ItemId } from './itemTypes';
import { isIntegerIn } from '../domain/rng';
import { hasShape, isDenseArray, isPlainRecord } from '../domain/validation';

export interface ItemError { readonly path: string; readonly message: string }
export type ItemValidation = { readonly ok: true; readonly catalog: ItemCatalog } |
  { readonly ok: false; readonly errors: readonly ItemError[] };

/** Unknown JSON in, owned definitions out. Rejects hidden fields and accessors before reading. */
export function validateItems(input: unknown): ItemValidation {
  const errors: ItemError[] = [];
  const fail = (path: string, message: string): void => { errors.push({ path, message }); };
  if (!isPlainRecord(input) || !hasShape(input, Object.keys(input)))
    return { ok: false, errors: [{ path: '$', message: 'Expected a plain catalog of data definitions.' }] };
  const entries = Object.entries(input);
  if (!isIntegerIn(entries.length, ITEM_BOUNDS.definitions)) fail('$', 'Expected 1–32 item definitions.');
  const catalog: Record<ItemId, ItemDef> = {};
  const seen = new Set<string>();
  for (const [key, value] of entries) {
    const path = `items.${key}`, before = errors.length;
    if (!/^item:[a-z][a-z0-9_]{0,63}$/.test(key)) fail(path, 'Malformed item ID.');
    if (!isPlainRecord(value) || !hasShape(value, Object.keys(value))) { fail(path, 'Expected a plain data definition.'); continue; }
    const keys = ['id', 'label', 'kind', 'eligibleHeroes', 'context', 'effect'];
    if (value.kind === 'equipment') keys.push('slot');
    if (!hasShape(value, keys)) { fail(path, `Expected exactly: ${keys.join(', ')}.`); continue; }
    if (value.id !== key) fail(`${path}.id`, 'ID must equal catalog key.');
    if (typeof value.id === 'string') {
      if (seen.has(value.id)) fail(`${path}.id`, 'Duplicate item ID.');
      seen.add(value.id);
    }
    if (typeof value.label !== 'string' || !value.label.trim() || !isIntegerIn(value.label.length, ITEM_BOUNDS.labelLength))
      fail(`${path}.label`, 'Expected a nonblank label of 1–64 characters.');
    const heroes = value.eligibleHeroes;
    if (!isDenseArray(heroes, 3) || heroes.length === 0 ||
      heroes.some(id => !HERO_IDS.some(hero => hero === id)) || new Set(heroes).size !== heroes.length)
      fail(`${path}.eligibleHeroes`, 'Expected unique known heroes, 1–3 entries.');
    if (value.context !== 'betweenEncounters') fail(`${path}.context`, 'Expected betweenEncounters.');
    const effect = value.effect;
    if (value.kind === 'consumable') {
      if (!hasShape(effect, ['kind', 'amount']) || effect.kind !== 'restoreHp' || !isIntegerIn(effect.amount, ITEM_BOUNDS.healing))
        fail(`${path}.effect`, 'Expected restoreHp amount 1–18.');
    } else if (value.kind === 'equipment') {
      if (value.slot !== 'charm') fail(`${path}.slot`, 'Expected charm slot.');
      if (!hasShape(effect, ['kind', 'stat', 'amount']) || effect.kind !== 'statBonus' ||
        (effect.stat !== 'accuracy' && effect.stat !== 'armorClass') || !isIntegerIn(effect.amount, ITEM_BOUNDS.bonus))
        fail(`${path}.effect`, 'Expected accuracy/armorClass statBonus amount 1–2.');
    } else fail(`${path}.kind`, 'Expected consumable or equipment.');
    if (errors.length === before) {
      const item = value as unknown as ItemDef;
      catalog[key as ItemId] = item.kind === 'consumable'
        ? { ...item, eligibleHeroes: [...item.eligibleHeroes], effect: { ...item.effect } }
        : { ...item, eligibleHeroes: [...item.eligibleHeroes], effect: { ...item.effect } };
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, catalog };
}
