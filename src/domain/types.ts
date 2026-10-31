import type { AbilityId, CellPosition, EnemyId, HeroId, MapId } from '../content/types';
import type { RngState } from './rng';
import type { RNG_VERSION, RULES_VERSION, STATE_FORMAT_VERSION, BASE_REPLAY_FORMAT_VERSION, REPLAY_FORMAT_VERSION } from './constants';
export interface Versions {
  readonly rules: typeof RULES_VERSION;
  readonly rng: typeof RNG_VERSION;
  readonly content: string;
}
export interface MovementBlock {
  readonly sourceId: number;
  readonly abilityId: 'ability:pinning_shot' | 'ability:frost_snare';
}
export type UnitState = {
  readonly id: number; readonly cell: CellPosition; readonly hp: number;
  readonly hasMoved: boolean; readonly hasActed: boolean;
  /** Guarded Strike is active until this unit's next turn; absence means inactive. */
  readonly guarded?: true;
  readonly secondWindUsed?: true;
  /** One living opposing Fighter; expires after this unit's next accepted endTurn. */
  readonly tauntedBy?: number;
  /** One living opposing Ranger; consumed by the next player attack roll. */
  readonly markedBy?: number;
  /** Blocks ordinary movement until this target ends its next turn. */
  readonly movementBlock?: MovementBlock;
  /** One living opposing Shaman; expires at this target's next accepted turn end. */
  readonly weakenedBy?: number;
} & ({ readonly side: 'player'; readonly defId: HeroId } | { readonly side: 'enemy'; readonly defId: EnemyId });
/** Snapshot data only: no duplicated grid/stats or scene references. */
export interface BattleState {
  readonly format: typeof STATE_FORMAT_VERSION; readonly versions: Versions;
  readonly seed: number; readonly rng: RngState; readonly mapId: MapId;
  readonly units: readonly UnitState[]; readonly initiative: readonly number[];
  readonly activeIndex: number; readonly round: number;
  readonly outcome: 'ongoing' | 'playerWin' | 'playerLoss'; readonly commandCount: number;
}
/** Ability identities are syntactic intent; validated content defines available profiles. */
export type { AbilityId } from '../content/types';
export type Command =
  | { readonly type: 'move'; readonly unitId: number; readonly to: CellPosition }
  | { readonly type: 'useAbility'; readonly unitId: number; readonly abilityId: AbilityId;
      readonly target: { readonly unitId: number } | { readonly cell: CellPosition } | { readonly missileTargets: readonly number[] } }
  | { readonly type: 'endTurn'; readonly unitId: number };
export type RejectionReason = 'malformedCommand' | 'invalidState' | 'battleOver' | 'commandLimit' | 'unknownUnit' |
  'unitDefeated' | 'notActiveUnit' | 'alreadyMoved' | 'outOfBounds' | 'sameCell' | 'notWalkable' |
  'occupied' | 'unreachable' | 'alreadyActed' | 'unknownAbility' | 'abilityNotOwned' |
  'wrongTargetKind' | 'missingTarget' | 'targetDefeated' | 'sameSide' | 'outOfRange' | 'blockedLos' | 'wrongMissileCount' | 'targetsTooFarApart' |
  'fullHealth' | 'useExhausted' | 'selfTargetRequired' | 'tauntedTargetRequired' | 'alreadyImmobilized' | 'immobilized' | 'ineligibleAlly' | 'immune';
export type Rejection = { readonly ok: false; readonly reason: RejectionReason };
export type CommandPreview = { readonly ok: true; readonly command: Command } | Rejection;
/** Events are data contracts, not implementations of combat or turn flow. */
export type BattleEvent =
  | { readonly type: 'initiativeRolled'; readonly unitId: number; readonly natural: number; readonly total: number }
  | { readonly type: 'turnStarted'; readonly unitId: number; readonly round: number }
  | { readonly type: 'turnEnded'; readonly unitId: number }
  | { readonly type: 'moved'; readonly unitId: number; readonly path: readonly CellPosition[] }
  | { readonly type: 'moveUndone'; readonly unitId: number; readonly path: readonly CellPosition[] }
  | { readonly type: 'abilityUsed'; readonly unitId: number; readonly abilityId: AbilityId; readonly target: Extract<Command, {type:'useAbility'}>['target'] }
  | { readonly type: 'attackRolled'; readonly unitId: number; readonly targetId: number; readonly natural: number; readonly bonus: number; readonly total: number; readonly armorClass: number; readonly result: 'miss' | 'hit' | 'critical' }
  | { readonly type: 'saveRolled'; readonly unitId: number; readonly natural: number; readonly modifier: number; readonly total: number; readonly dc: number; readonly saved: boolean }
  | { readonly type: 'weakened' | 'weakenedExpired'; readonly unitId: number; readonly sourceId: number }
  | { readonly type: 'missileRolled'; readonly unitId: number; readonly targetId: number; readonly missile: number; readonly natural: number; readonly damage: number }
  | { readonly type: 'damaged'; readonly unitId: number; readonly damage: number; readonly hp: number }
  | { readonly type: 'defeated'; readonly unitId: number }
  | { readonly type: 'guarded' | 'guardExpired'; readonly unitId: number }
  | { readonly type: 'healed'; readonly unitId: number; readonly healing: number; readonly hp: number }
  | { readonly type: 'taunted' | 'tauntExpired'; readonly unitId: number; readonly sourceId: number }
  | { readonly type: 'marked' | 'markConsumed' | 'markExpired'; readonly unitId: number; readonly sourceId: number }
  | { readonly type: 'movementBlocked' | 'movementBlockExpired'; readonly unitId: number; readonly sourceId: number; readonly abilityId: MovementBlock['abilityId'] }
  | { readonly type: 'battleEnded'; readonly outcome: Exclude<BattleState['outcome'], 'ongoing'> };
export type CommandResult = { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] } | Rejection;
export type ReplayCommand = Command | {readonly type:'undoMove';readonly unitId:number};
/** Initial boundary + accepted intents; replayBattle (turns.ts) re-executes them. */
export interface Replay {
  readonly format: typeof BASE_REPLAY_FORMAT_VERSION | typeof REPLAY_FORMAT_VERSION; readonly versions: Versions;
  readonly initial: BattleState; readonly commands: readonly ReplayCommand[];
}
