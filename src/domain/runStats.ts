import type { BattleEvent, BattleState } from './types';
import type { RunState } from './run';
import type { DungeonState } from './dungeon';
import { hasShape, isPlainRecord } from './validation';

/** Store only facts that validated journey progress cannot reconstruct.
 * Future class/type damage totals belong in a new accepted-event reducer version,
 * with domain attribution, rather than UI observers or replaying old events. */
export interface RunStats {
  readonly version: 2;
  /** Kills/moves and playtime can begin in different application upgrades. */
  readonly coverage: 'whole-run' | 'since-upgrade';
  readonly timeCoverage: 'whole-run' | 'since-upgrade';
  readonly enemiesKilled: number;
  readonly movesTaken: number;
  readonly activeMs: number;
  /** Monotone encounter ordinal (wins before this battle), then accepted command. */
  readonly boundary: { readonly battle: number; readonly command: number } | null;
}
export const statCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export const boundedStat = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, value));
export const freshRunStats = (coverage: RunStats['coverage'] = 'whole-run'): RunStats =>
  ({ version: 2, coverage, timeCoverage: coverage, enemiesKilled: 0, movesTaken: 0, activeMs: 0, boundary: null });

export function readRunStats(input: unknown): RunStats | null {
  if (!isPlainRecord(input)) return null;
  const counterOnly = Object.getOwnPropertyDescriptor(input, 'version')?.value === 1;
  if (!hasShape(input, ['version', 'coverage', 'enemiesKilled', 'movesTaken', 'activeMs', 'boundary', ...(counterOnly ? [] : ['timeCoverage'])]) ||
    (!counterOnly && input.version !== 2) || !['whole-run', 'since-upgrade'].includes(input.coverage as string) ||
    (!counterOnly && !['whole-run', 'since-upgrade'].includes(input.timeCoverage as string)) ||
    !statCount(input.enemiesKilled) || !statCount(input.movesTaken) || !statCount(input.activeMs)) return null;
  const boundary = input.boundary;
  if (boundary !== null && (!hasShape(boundary, ['battle', 'command']) ||
    !statCount(boundary.battle) || boundary.battle > 8192 * 3 || !statCount(boundary.command))) return null;
  return { ...input, version: 2, timeCoverage: counterOnly ? 'since-upgrade' : input.timeCoverage,
    boundary: boundary === null ? null : { ...boundary } } as unknown as RunStats;
}

export interface AcceptedBattle {
  readonly before: BattleState;
  readonly after: BattleState;
  readonly events: readonly BattleEvent[];
}

/** The owner validates its result, then reduces only this accepted batch.
 * A constant-size receipt rejects duplicate and out-of-order delivery. */
export function acceptBattleStats(stats: RunStats, battle: number, accepted: AcceptedBattle): RunStats {
  const { before, after, events } = accepted, previous = stats.boundary;
  if (!statCount(battle) || battle > 8192 * 3 || before.outcome !== 'ongoing' ||
    after.commandCount !== before.commandCount + 1 || before.seed !== after.seed || before.mapId !== after.mapId ||
    previous && (battle < previous.battle || battle === previous.battle && before.commandCount !== previous.command)) return stats;
  const kills = new Set<number>();
  for (const event of events) if (event.type === 'defeated' &&
    before.units.some(unit => unit.id === event.unitId && unit.side === 'enemy' && unit.hp > 0) &&
    after.units.some(unit => unit.id === event.unitId && unit.hp === 0)) kills.add(event.unitId);
  const playerEvent = (type: 'moved' | 'moveUndone') => events.some(event => event.type === type &&
    before.units.some(unit => unit.id === event.unitId && unit.side === 'player'));
  return { ...stats, enemiesKilled: boundedStat(stats.enemiesKilled + kills.size),
    movesTaken: boundedStat(stats.movesTaken + (playerEvent('moved') ? 1 : 0) - (playerEvent('moveUndone') ? 1 : 0)),
    boundary: { battle, command: after.commandCount } };
}

export const authoredWins = (run: RunState) => run.phase === 'victory' ? run.encounters.length :
  run.encounterIndex + (run.phase === 'reward' ? 1 : 0);
export const dungeonProgressStats = (state: DungeonState) => ({
  battlesWon: state.floors.reduce((sum, floor) => sum + floor.completed, 0),
  floorsCleared: state.floors.filter(floor => floor.completed === 3).length,
});
