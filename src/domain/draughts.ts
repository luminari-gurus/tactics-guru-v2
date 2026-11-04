import { HERO_IDS } from '../content/constants';
import { ITEM_BOUNDS, type ItemOwnership } from '../content/itemTypes';
import { HEALING_DRAUGHT_HP, HEALING_DRAUGHT_ID } from '../content/items';
import type { HeroId } from '../content/types';
import { isIntegerIn } from './rng';
import type { BattleState, UnitState } from './types';
import { hasShape } from './validation';

/** Run/dungeon ownership is held at entry until the encounter settles. */
export interface DraughtLedger {
  readonly stock: number;
  readonly used: Readonly<Record<HeroId, number>>;
}

const stockAtEntry = (ownership: ItemOwnership) => ownership.consumables.find(stack => stack.itemId === HEALING_DRAUGHT_ID)?.quantity ?? 0;

export function enterWithDraughts(ownership: ItemOwnership): Pick<BattleState, 'draughts'> {
  const stock = stockAtEntry(ownership);
  return stock ? { draughts: { stock, used: { fighter: 0, ranger: 0, mage: 0 } } } : {};
}

export function draughtsSpent(ledger: DraughtLedger): number {
  return HERO_IDS.reduce((sum, hero) => sum + ledger.used[hero], 0);
}

export function draughtHealing(ledger: DraughtLedger | undefined, hero: HeroId): number {
  return (ledger?.used[hero] ?? 0) * HEALING_DRAUGHT_HP;
}

export function matchesDraughtStock(ledger: DraughtLedger | undefined, ownership: ItemOwnership): boolean {
  // Previous active snapshots omit the capability. Their stock is still carried into the next encounter.
  return ledger === undefined || ledger.stock === stockAtEntry(ownership);
}

export function isDraughtLedger(input: unknown, units: readonly UnitState[], commandCount: number, round: number): input is DraughtLedger {
  if (!hasShape(input, ['stock', 'used']) || !isIntegerIn(input.stock, ITEM_BOUNDS.stack) || !hasShape(input.used, HERO_IDS)) return false;
  const used = input.used;
  let total = 0;
  for (const hero of HERO_IDS) {
    const count = used[hero];
    if (!isIntegerIn(count, { min: 0, max: Math.min(round, input.stock) })) return false;
    if (count > 0 && !units.some(unit => unit.side === 'player' && unit.defId === hero)) return false;
    total += count;
  }
  return total <= input.stock && total <= commandCount;
}
