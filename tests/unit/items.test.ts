import { describe, expect, it } from 'vitest';
import { itemCatalog } from '../../src/content/items';
import type { ItemCatalog } from '../../src/content/itemTypes';
import { validateItems } from '../../src/content/validateItems';

const copy = () => structuredClone(itemCatalog) as Record<string, any>;
const draught = 'item:healing_draught';

it('validates the three reviewed entries through the runtime validator', () => {
  const read = validateItems(itemCatalog);
  expect(read.ok).toBe(true);
  expect(Object.keys(itemCatalog)).toHaveLength(3);
  expect(itemCatalog[draught].effect).toEqual({ kind: 'restoreHp', amount: 6 });
  expect(itemCatalog['item:warding_charm'].effect).toEqual({ kind: 'statBonus', stat: 'armorClass', amount: 1 });
  expect(itemCatalog['item:aiming_charm'].effect).toEqual({ kind: 'statBonus', stat: 'accuracy', amount: 1 });
  for (const item of Object.values(itemCatalog)) {
    expect(item.eligibleHeroes).toEqual(['fighter', 'ranger', 'mage']);
    expect(item.context).toBe('betweenEncounters');
  }
});

describe('invalid catalog data is rejected with located errors', () => {
  const mutations: [string, (c: Record<string, any>) => void][] = [
    ['empty catalog', c => { for (const key of Object.keys(c)) delete c[key]; }],
    ['key', c => { c['item:Bad'] = c[draught]; }],
    ['long id', c => { c[`item:${'x'.repeat(65)}`] = c[draught]; }],
    ['mismatched id', c => { c[draught].id = 'item:other'; }],
    ['duplicate id', c => { c['item:duplicate'] = c[draught]; }],
    ['unknown kind', c => { c[draught].kind = 'wand'; }],
    ['extra field', c => { c[draught].extra = true; }],
    ['blank label', c => { c[draught].label = ' '; }],
    ['long label', c => { c[draught].label = 'x'.repeat(65); }],
    ['unknown hero', c => { c[draught].eligibleHeroes = ['rogue']; }],
    ['duplicate heroes', c => { c[draught].eligibleHeroes = ['mage', 'mage']; }],
    ['empty heroes', c => { c[draught].eligibleHeroes = []; }],
    ['sparse heroes', c => { c[draught].eligibleHeroes = Array(1); }],
    ['battle context', c => { c[draught].context = 'battle'; }],
    ['unknown effect', c => { c[draught].effect.kind = 'revive'; }],
    ['extra effect', c => { c[draught].effect.extra = 1; }],
    ['wrong slot', c => { c['item:warding_charm'].slot = 'weapon'; }],
    ['unknown stat', c => { c['item:warding_charm'].effect.stat = 'maxHp'; }],
    ...[0, 19, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(n =>
      [`heal ${n}`, (c: Record<string, any>) => { c[draught].effect.amount = n; }] as [string, (c: Record<string, any>) => void]),
    ...[0, 3, 1.5].map(n => [`bonus ${n}`, (c: Record<string, any>) => { c['item:warding_charm'].effect.amount = n; }] as [string, (c: Record<string, any>) => void]),
  ];
  for (const [name, mutate] of mutations) it(name, () => {
    const catalog = copy(); mutate(catalog);
    const result = validateItems(catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.every(e => e.path.length && e.message.length)).toBe(true);
    expect(result).not.toHaveProperty('catalog');
  });
});

it('rejects hidden fields, symbols, prototypes and accessors without evaluating getters', () => {
  for (const target of ['catalog', 'item', 'effect', 'heroes']) {
    for (const decoration of ['accessor', 'hidden', 'symbol']) {
      const catalog = copy();
      const object = target === 'catalog' ? catalog : target === 'item' ? catalog[draught] : target === 'effect' ? catalog[draught].effect : catalog[draught].eligibleHeroes;
      if (decoration === 'accessor') Object.defineProperty(object, target === 'catalog' ? draught : target === 'item' ? 'kind' : target === 'effect' ? 'kind' : '0',
        { enumerable: true, get() { throw Error('getter evaluated'); } });
      if (decoration === 'hidden') Object.defineProperty(object, 'hidden', { value: 1 });
      if (decoration === 'symbol') object[Symbol('extra')] = 1;
      expect(validateItems(catalog).ok).toBe(false);
    }
  }
  for (const input of [null, [], Object.create(null), new Date()]) expect(validateItems(input).ok).toBe(false);
});

it('accepts bounds and additional typed items and returns an owned copy', () => {
  const catalog = copy();
  catalog[draught].effect.amount = 18;
  catalog['item:warding_charm'].effect.amount = 2;
  catalog['item:test_draught'] = { ...catalog[draught], id: 'item:test_draught', label: 'Test Draught' };
  const result = validateItems(catalog);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error('invalid fixture');
  const before = structuredClone(result.catalog);
  catalog[draught].eligibleHeroes[0] = 'rogue';
  catalog[draught].effect.amount = 0;
  expect(result.catalog).toEqual(before);
  const typed: ItemCatalog = { 'item:fixture': { id: 'item:fixture', label: 'Fixture', kind: 'consumable',
    context: 'betweenEncounters', eligibleHeroes: ['mage'], effect: { kind: 'restoreHp', amount: 1 } } };
  expect(validateItems(typed).ok).toBe(true);
  const many = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`item:test_${i}`, { ...typed['item:fixture'], id: `item:test_${i}` }]));
  expect(validateItems(many).ok).toBe(true);
  expect(validateItems({ ...many, 'item:extra': { ...typed['item:fixture'], id: 'item:extra' } }).ok).toBe(false);
});
