import type { ItemCatalog, ItemId } from '../content/itemTypes';
import { hashJson } from './contentIdentity';
import { UINT32_RANGE } from './constants';
import { seedRng, nextUint32 } from './rng';
import type { RunState } from './run';
import { hasShape, isDenseArray } from './validation';

export const REWARD_POLICY = { version: 1, choiceCount: 2, quantity: 1, algorithm: 'sorted-two-draw-without-replacement' } as const;
export interface RewardOption { readonly itemId: ItemId; readonly quantity: 1 }
export interface RewardOffer {
  readonly version: 1;
  readonly id: string;
  readonly seed: number;
  readonly catalogIdentity: string;
  readonly options: readonly [RewardOption, RewardOption];
}
/** domain/items extends this intent with itemRevision and atomically grants/acknowledges. */
export interface RewardClaimIntent {
  readonly type: 'claimReward';
  readonly runId: string;
  readonly revision: number;
  readonly encounterId: string;
  readonly boundaryId: string;
  readonly offerId: string;
  readonly itemId: ItemId;
}

/** Trusted validated item definitions; includes labels and policy in future run compatibility. */
export function itemCatalogIdentity(catalog: ItemCatalog): string {
  return hashJson({ catalog, policy: REWARD_POLICY });
}

/** Trusted validated RunState/catalog. No live battle RNG or entropy source is accepted. */
export function createRewardOffer(state: RunState, catalog: ItemCatalog): RewardOffer | null {
  if (state.phase !== 'reward') return null;
  const remaining = Object.keys(catalog).sort() as ItemId[];
  if (remaining.length < REWARD_POLICY.choiceCount) return null;
  let rng = seedRng(state.pendingReward.seed);
  const draw = (): RewardOption => {
    const next = nextUint32(rng); rng = next.rng;
    const index = Math.floor(next.value * remaining.length / UINT32_RANGE);
    return { itemId: remaining.splice(index, 1)[0], quantity: REWARD_POLICY.quantity };
  };
  return { version: REWARD_POLICY.version, id: state.pendingReward.id, seed: state.pendingReward.seed,
    catalogIdentity: itemCatalogIdentity(catalog), options: [draw(), draw()] };
}

/** Unknown stored offer against trusted current boundary/catalog; returns owned regenerated data. */
export function readRewardOffer(input: unknown, state: RunState, catalog: ItemCatalog):
  { readonly ok: true; readonly offer: RewardOffer } | { readonly ok: false; readonly reason: 'invalidOffer' } {
  const invalid = { ok: false, reason: 'invalidOffer' } as const;
  if (!hasShape(input, ['version', 'id', 'seed', 'catalogIdentity', 'options']) ||
    !isDenseArray(input.options, 2) || input.options.length !== 2) return invalid;
  const expected = createRewardOffer(state, catalog);
  if (!expected || input.version !== expected.version || input.id !== expected.id || input.seed !== expected.seed ||
    input.catalogIdentity !== expected.catalogIdentity || input.options.some((option, i) =>
      !hasShape(option, ['itemId', 'quantity']) || option.itemId !== expected.options[i].itemId || option.quantity !== 1)) return invalid;
  return { ok: true, offer: expected };
}
