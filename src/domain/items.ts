import { projectProgression } from './progression';
import { HERO_IDS } from '../content/constants';
import { ITEM_BOUNDS, type ItemCatalog, type ItemId, type ItemOwnership, type EquipmentSlot, type ItemDef } from '../content/itemTypes';
import type { ContentCatalog, HeroId } from '../content/types';
import { isIntegerIn } from './rng';
import { readRewardOffer, type RewardOffer, type RewardClaimIntent } from './rewards';
import { readRunState, runBoundaryId, transitionRun, type RunDefinition, type RunState, type RunEvent } from './run';
import { hasShape, isDenseArray } from './validation';

export const ITEM_REVISION_BOUNDS = { min: 0, max: Number.MAX_SAFE_INTEGER } as const;
export interface RunItems {
  readonly run: RunState;
  readonly ownership: ItemOwnership;
  readonly offer: RewardOffer | null;
  readonly itemRevision: number;
}
/** Trusted session fact: the matching encounter has not constructed an active battle. */
export interface ItemContext {
  readonly runId: string;
  readonly encounterId: string;
  readonly boundaryId: string;
  readonly activeBattle: boolean;
}
interface ItemBoundary {
  readonly runId: string; readonly revision: number; readonly encounterId: string;
  readonly boundaryId: string; readonly itemRevision: number;
}
export type ItemCommand = (RewardClaimIntent & { readonly itemRevision: number }) | (ItemBoundary & (
  | { readonly type: 'useItem'; readonly itemId: ItemId; readonly heroId: HeroId }
  | { readonly type: 'equipItem' | 'unequipItem'; readonly instanceId: string; readonly heroId: HeroId; readonly slot: EquipmentSlot }
));
export type ItemFailure = { readonly ok: false; readonly reason:
  'invalidOwnership' | 'invalidItems' | 'invalidCommand' | 'staleBoundary' | 'wrongContext' | 'invalidTarget' | 'notOwned' | 'capacity' | 'revisionLimit' };
export type ItemRead = { readonly ok: true; readonly state: RunItems } | ItemFailure;
export type ItemEvent = RunEvent | { readonly type: 'itemClaimed' | 'itemUsed'; readonly itemId: ItemId }
  | { readonly type: 'itemEquipped' | 'itemUnequipped'; readonly instanceId: string; readonly heroId: HeroId };
export type ItemResult = { readonly ok: true; readonly state: RunItems; readonly events: readonly ItemEvent[] } | ItemFailure;
const failure = (reason: ItemFailure['reason']): ItemFailure => ({ ok: false, reason });
const heroId = (value: unknown): value is HeroId => HERO_IDS.some(id => id === value);
const knownItem = (value: unknown, catalog: ItemCatalog): value is ItemId => typeof value === 'string' && Object.hasOwn(catalog, value);
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

export function emptyItemOwnership(): ItemOwnership { return { consumables: [], equipment: [], assignments: [] }; }

/** Unknown JSON ownership against a trusted validated catalog and current run ID. */
export function readItemOwnership(input: unknown, runId: string, catalog: ItemCatalog, validInstance?: (id: string) => boolean):
  { readonly ok: true; readonly ownership: ItemOwnership } | ItemFailure {
  const invalid = failure('invalidOwnership');
  if (typeof runId !== 'string' || runId.length < 1 || runId.length > 64 || /[^A-Za-z0-9-]/.test(runId) ||
    !hasShape(input, ['consumables', 'equipment', 'assignments']) ||
    !isDenseArray(input.consumables, ITEM_BOUNDS.definitions.max) ||
    !isDenseArray(input.equipment, ITEM_BOUNDS.equipmentInstances.max) || !isDenseArray(input.assignments, HERO_IDS.length)) return invalid;
  const consumables: ItemOwnership['consumables'][number][] = [];
  const equipment: ItemOwnership['equipment'][number][] = [];
  const assignments: ItemOwnership['assignments'][number][] = [];
  for (const stack of input.consumables) {
    if (!hasShape(stack, ['itemId', 'quantity']) || !knownItem(stack.itemId, catalog) || catalog[stack.itemId].kind !== 'consumable' ||
      !isIntegerIn(stack.quantity, ITEM_BOUNDS.stack) || consumables.some(s => s.itemId === stack.itemId)) return invalid;
    consumables.push({ itemId: stack.itemId, quantity: stack.quantity });
  }
  for (const instance of input.equipment) {
    if (!hasShape(instance, ['instanceId', 'itemId']) || !knownItem(instance.itemId, catalog) || catalog[instance.itemId].kind !== 'equipment' ||
      typeof instance.instanceId !== 'string' || !(validInstance ? validInstance(instance.instanceId) : instance.instanceId.length === runId.length + ':reward:0:option:0'.length &&
      new RegExp(`^${runId}:reward:[01]:option:[01]$`).test(instance.instanceId)) ||
      equipment.some(e => e.instanceId === instance.instanceId)) return invalid;
    equipment.push({ instanceId: instance.instanceId, itemId: instance.itemId });
  }
  for (const assignment of input.assignments) {
    if (!hasShape(assignment, ['heroId', 'slot', 'instanceId']) || !heroId(assignment.heroId) || assignment.slot !== 'charm' ||
      typeof assignment.instanceId !== 'string' || assignments.some(a => a.heroId === assignment.heroId || a.instanceId === assignment.instanceId)) return invalid;
    const owned = equipment.find(e => e.instanceId === assignment.instanceId), def = owned && catalog[owned.itemId];
    if (!def || def.kind !== 'equipment' || def.slot !== assignment.slot || !def.eligibleHeroes.includes(assignment.heroId)) return invalid;
    assignments.push({ heroId: assignment.heroId, slot: assignment.slot, instanceId: assignment.instanceId });
  }
  return { ok: true, ownership: {
    consumables: consumables.sort((a, b) => compare(a.itemId, b.itemId)),
    equipment: equipment.sort((a, b) => compare(a.instanceId, b.instanceId)),
    assignments: assignments.sort((a, b) => compare(a.heroId, b.heroId)),
  } };
}

/** Pure aggregate reader; current battle snapshots/actions/RNG belong to the session, not this aggregate. */
export function readRunItems(input: unknown, definition: RunDefinition, base: ContentCatalog, items: ItemCatalog): ItemRead {
  if (!hasShape(input, ['run', 'ownership', 'offer', 'itemRevision']) || !isIntegerIn(input.itemRevision, ITEM_REVISION_BOUNDS)) return failure('invalidItems');
  const run = readRunState(input.run, definition, base);
  if (!run.ok) return failure('invalidItems');
  const owned = readItemOwnership(input.ownership, run.state.id, items);
  if (!owned.ok) return owned;
  let offer: RewardOffer | null = null;
  if (run.state.phase === 'reward') {
    const read = readRewardOffer(input.offer, run.state, items);
    if (!read.ok) return failure('invalidItems');
    offer = read.offer;
  } else if (input.offer !== null) return failure('invalidItems');
  return { ok: true, state: { run: run.state, ownership: owned.ownership, offer, itemRevision: input.itemRevision } };
}

/** All preflight precedes the atomic result. Never call run acknowledgment separately to grant a reward. */
export function applyItemCommand(input: unknown, command: unknown, context: unknown,
  definition: RunDefinition, base: ContentCatalog, items: ItemCatalog): ItemResult {
  const checked = readRunItems(input, definition, base, items);
  if (!checked.ok) return checked;
  const state = checked.state, run = state.run;
  const common = ['type', 'runId', 'revision', 'encounterId', 'boundaryId', 'itemRevision'];
  if (!hasShape(command, [...common, 'offerId', 'itemId']) && !hasShape(command, [...common, 'itemId', 'heroId']) &&
    !hasShape(command, [...common, 'instanceId', 'heroId', 'slot'])) return failure('invalidCommand');
  if (command.runId !== run.id || command.revision !== run.revision || command.encounterId !== run.encounters[run.encounterIndex] ||
    command.boundaryId !== runBoundaryId(run) || command.itemRevision !== state.itemRevision) return failure('staleBoundary');
  if (!hasShape(context, ['runId', 'encounterId', 'boundaryId', 'activeBattle']) || context.runId !== run.id ||
    context.encounterId !== command.encounterId || context.boundaryId !== command.boundaryId || context.activeBattle !== false ||
    !(run.phase === 'reward' || run.phase === 'battle' && run.encounterIndex > 0)) return failure('wrongContext');
  if (state.itemRevision === ITEM_REVISION_BOUNDS.max) return failure('revisionLimit');
  const nextRevision = state.itemRevision + 1;
  const finish = (nextRun: RunState, ownership: ItemOwnership, offer: RewardOffer | null, events: readonly ItemEvent[]): ItemResult => {
    const read = readRunItems({ run: nextRun, ownership, offer, itemRevision: nextRevision }, definition, base, items);
    return read.ok ? { ...read, events } : read;
  };
  if (command.type === 'claimReward' && hasShape(command, [...common, 'offerId', 'itemId'])) {
    if (run.phase !== 'reward' || !state.offer || command.offerId !== state.offer.id) return failure('staleBoundary');
    const ordinal = state.offer.options.findIndex(option => option.itemId === command.itemId);
    if (ordinal < 0 || !knownItem(command.itemId, items)) return failure('invalidCommand');
    const def = items[command.itemId];
    const granted = grantOwnedItem(state.ownership, def, `${state.offer.id}:option:${ordinal}`);
    if (!granted) return failure('capacity');
    const advanced = transitionRun(run, { type: 'acknowledgeReward', runId: run.id, revision: run.revision,
      encounterId: run.encounters[run.encounterIndex], boundaryId: runBoundaryId(run) }, definition, base);
    if (!advanced.ok) return failure('invalidItems');
    return finish(advanced.state, granted, null, [{ type: 'itemClaimed', itemId: def.id }, ...advanced.events]);
  }
  const changed = changePreparation(state.ownership, run.party, command, base, items);
  return changed.ok ? finish({ ...run, party: changed.party }, changed.ownership, state.offer, changed.events) : changed;
}

export function changePreparation(ownership: ItemOwnership, party: RunState['party'], command: Record<string, unknown>,
  base: ContentCatalog, items: ItemCatalog): { readonly ok: true; readonly party: RunState['party']; readonly ownership: ItemOwnership; readonly events: readonly ItemEvent[] } | ItemFailure {
  const common = ['type', 'runId', 'revision', 'encounterId', 'boundaryId', 'itemRevision'];
  const finish = (party: RunState['party'], ownership: ItemOwnership, events: readonly ItemEvent[]) => ({ ok: true as const, party, ownership, events });
  if (!heroId(command.heroId)) return failure('invalidTarget');
  const target = party.find(h => h.heroId === command.heroId)!;
  if (target.hp === 0) return failure('invalidTarget');
  if (command.type === 'useItem' && hasShape(command, [...common, 'itemId', 'heroId'])) {
    if (!knownItem(command.itemId, items)) return failure('invalidCommand');
    const def = items[command.itemId], stack = ownership.consumables.find(s => s.itemId === command.itemId);
    if (def.kind !== 'consumable' || !def.eligibleHeroes.includes(target.heroId)) return failure('invalidTarget');
    if (!stack) return failure('notOwned');
    const maxHp = target.maxHp;
    if (target.hp === maxHp) return failure('invalidTarget');
    const nextRun = { party: party.map(h => h.heroId === target.heroId ? { ...h, hp: Math.min(maxHp, h.hp + def.effect.amount) } : h) };
    const consumables = ownership.consumables.flatMap(s => s.itemId !== def.id ? [s] : s.quantity === 1 ? [] : [{ ...s, quantity: s.quantity - 1 }]);
    return finish(nextRun.party, { ...ownership, consumables }, [{ type: 'itemUsed', itemId: def.id }]);
  }
  if ((command.type === 'equipItem' || command.type === 'unequipItem') && hasShape(command, [...common, 'instanceId', 'heroId', 'slot'])) {
    const instance = ownership.equipment.find(e => e.instanceId === command.instanceId);
    if (!instance) return failure('notOwned');
    const def = items[instance.itemId];
    if (def.kind !== 'equipment' || def.slot !== command.slot || !def.eligibleHeroes.includes(target.heroId)) return failure('invalidTarget');
    const existing = ownership.assignments.find(a => a.instanceId === instance.instanceId);
    if ((command.type === 'equipItem' && existing) || (command.type === 'unequipItem' && existing?.heroId !== target.heroId)) return failure('invalidTarget');
    const assignments = ownership.assignments.filter(a => a.heroId !== target.heroId);
    if (command.type === 'equipItem') assignments.push({ heroId: target.heroId, slot: def.slot, instanceId: instance.instanceId });
    return finish(party, { ...ownership, assignments },
      [{ type: command.type === 'equipItem' ? 'itemEquipped' : 'itemUnequipped', instanceId: instance.instanceId, heroId: target.heroId }]);
  }
  return failure('invalidCommand');
}

/** Always supply the immutable BASE catalog, also when reconstructing a future run replay/save. */
export function projectItemCatalog(input: unknown, definition: RunDefinition, base: ContentCatalog, items: ItemCatalog):
  { readonly ok: true; readonly catalog: ContentCatalog } | ItemFailure {
  const checked = readRunItems(input, definition, base, items);
  if (!checked.ok) return checked;
  const { run, ownership } = checked.state;
  return { ok: true, catalog: projectOwnedCatalog(ownership, run.party, base, items) };
}

export function projectOwnedCatalog(ownership: ItemOwnership, party: RunState['party'], base: ContentCatalog, items: ItemCatalog): ContentCatalog {
  base = projectProgression(party, base);
  const heroes = { ...base.heroes };
  for (const id of HERO_IDS) {
    const stats = { ...base.heroes[id].stats };
    const assignment = ownership.assignments.find(a => a.heroId === id);
    if (assignment && party.find(h => h.heroId === id)!.hp > 0) {
      const instance = ownership.equipment.find(e => e.instanceId === assignment.instanceId)!;
      const def = items[instance.itemId];
      if (def.kind === 'equipment') stats[def.effect.stat] += def.effect.amount;
    }
    heroes[id] = { ...base.heroes[id], stats };
  }
  return { ...base, heroes };
}

/** Caller validates the reward boundary; both modes share capacity and unique ownership. */
export function grantOwnedItem(ownership: ItemOwnership, def: ItemDef, instanceId: string): ItemOwnership | null {
  const itemId = def.id;
  if (def.kind === 'equipment') return ownership.equipment.length >= ITEM_BOUNDS.equipmentInstances.max || ownership.equipment.some(e => e.instanceId === instanceId) ? null
    : { ...ownership, equipment: [...ownership.equipment, { itemId, instanceId }] };
  const stack = ownership.consumables.find(c => c.itemId === itemId);
  return stack && stack.quantity >= ITEM_BOUNDS.stack.max ? null : { ...ownership, consumables: stack
    ? ownership.consumables.map(c => c.itemId === itemId ? { ...c, quantity: c.quantity + 1 } : c) : [...ownership.consumables, { itemId, quantity: 1 }] };
}
