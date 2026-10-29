import type { ProgressHero } from '../domain/progression';
import { reportFailure, setTelemetryContext } from '../telemetry/telemetry';
import type { BattlefieldDescriptor } from '../domain/battlefield';
import { createRunBattle } from '../domain/runBattle';
import type { RunSaveContext } from '../domain/runSaveEnvelope';
import type { ContentCatalog, MapId } from '../content/types';
import { previewCommand, readBattleState } from '../domain/battle';
import { previewMove } from '../domain/grid';
import { previewAbility } from '../domain/combat';
import { previewTacticalPlan } from '../domain/tacticalPlan';
import { undoRecordedMove } from '../domain/movementUndo';
import { REPLAY_FORMAT_VERSION, RULE_BOUNDS } from '../domain/constants';
import { planEnemyTurn } from '../domain/ai';
import { createBattle, dispatch } from '../domain/turns';
import type { BattleEvent, BattleState, Command, Replay, ReplayCommand } from '../domain/types';

export type SessionPhase = 'player' | 'enemy' | 'presenting' | 'ended' | 'error' | 'disposed';
export type AcceptedState = (state: BattleState) => void;
export interface Presentation { readonly before: BattleState; readonly after: BattleState; readonly events: readonly BattleEvent[]; readonly token: number }
export type ActionPreview = ReturnType<typeof previewMove> | ReturnType<typeof previewAbility> | ReturnType<typeof previewCommand>;
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
/** Orchestrates accepted intents; animation only acknowledges an already resolved command. */
export class BattleSession {
  private current: BattleState;
  private readonly initial: BattleState;
  private commands: ReplayCommand[] = [];
  private lastMove: {before:BattleState;move:Extract<Command,{type:'move'}>} | null = null;
  private resolvedEvents: BattleEvent[] = [];
  private intent: Command | null = null;
  private plan: { move: Extract<Command, {type:'move'}>; ability: Extract<Command, {type:'useAbility'}> } | null = null;
  private plannedAbility: Extract<Command, {type:'useAbility'}> | null = null;
  private enemyQueue: Command[] = [];
  private generation = 0;
  phase: SessionPhase;
  error: string | null = null;
  readonly resumed: boolean;
  progression: readonly ProgressHero[] = [];
  constructor(readonly catalog: ContentCatalog, mapId: MapId | BattleState, seed: number, private readonly accepted?: AcceptedState, fresh = false, readonly battlefield?: BattlefieldDescriptor) {
    this.resumed = typeof mapId !== 'string' && !fresh;
    const created = typeof mapId === 'string' ? createBattle(mapId, seed, catalog) : readBattleState(mapId, catalog);
    if (!created.ok) throw new Error(`Could not create battle: ${created.reason}`);
    this.current = this.initial = freeze(created.state);
    this.phase = this.decisionPhase();
    setTelemetryContext({ phase: this.phase });
  }
  static fromRun(entry: unknown, context: RunSaveContext, accepted?: AcceptedState) {
    const created = createRunBattle(entry, context);
    return created.ok ? { ok: true as const, session: new BattleSession(created.catalog, created.state, created.state.seed, accepted, true, created.battlefield) } : created;
  }
  static fromSnapshot(catalog: ContentCatalog, input: unknown, accepted?: AcceptedState, battlefield?: BattlefieldDescriptor):
    { ok: true; session: BattleSession } | { ok: false; reason: 'invalidState' } {
    const read = readBattleState(input, catalog);
    if (!read.ok) return { ok: false, reason: 'invalidState' };
    return { ok: true, session: new BattleSession(catalog, read.state, read.state.seed, accepted, false, battlefield) };
  }
  get state() { return this.current; }
  get active() { return this.current.units.find(u=>u.id === this.current.initiative[this.current.activeIndex])!; }
  get pending() { return this.intent; }
  get pendingPlan() { return this.plan; }
  get canUndoMove() { return this.phase === 'player' && this.lastMove !== null && this.current.commandCount < RULE_BOUNDS.commandCount.max; }
  get events(): readonly BattleEvent[] { return [...this.resolvedEvents]; }
  get replay(): (Replay & {readonly battlefield?:BattlefieldDescriptor}) | null { return this.resumed ? null : freeze({format:this.commands.some(c=>c.type==='undoMove')?REPLAY_FORMAT_VERSION:this.initial.format, versions:this.initial.versions, initial:this.initial, commands:[...this.commands],...(this.battlefield?{battlefield:this.battlefield}:{})}); }
  get continuation() { return this.resumed ? freeze({snapshot:this.initial, ...(this.battlefield?{battlefield:this.battlefield}:{}), commands:[...this.commands], events:[...this.resolvedEvents]}) : null; }
  private decisionPhase(): SessionPhase { return this.current.outcome !== 'ongoing' ? 'ended' : this.active.side === 'enemy' ? 'enemy' : 'player'; }
  preview(command: Command): ActionPreview {
    if (command.type === 'move') return previewMove(this.current, command, this.catalog);
    if (command.type === 'useAbility') return previewAbility(this.current, command, this.catalog);
    return previewCommand(this.current, command, this.catalog);
  }
  prepare(command: Command): ActionPreview {
    this.cancel(); this.error = null;
    if (this.phase !== 'player' || command.unitId !== this.active.id) return {ok:false,reason:'notActiveUnit'};
    const preview = this.preview(command);
    if (preview.ok) this.intent = freeze(structuredClone(command));
    return preview;
  }
  preparePlan(move: Extract<Command, {type:'move'}>, ability: Extract<Command, {type:'useAbility'}>) {
    this.cancel(); this.error = null;
    if (this.phase !== 'player' || move.unitId !== this.active.id) return {ok:false,reason:'notActiveUnit'} as const;
    const preview = previewTacticalPlan(this.current, move, ability, this.catalog);
    if (preview.ok) this.plan = freeze(structuredClone({move, ability}));
    return preview;
  }
  clearPrepared() { this.intent = null; this.plan = null; }
  cancel() { this.clearPrepared(); this.plannedAbility = null; }
  confirmPlan(): Presentation | null {
    if (this.phase !== 'player' || !this.plan) return null;
    const plan = this.plan; this.plan = null;
    const preview = previewTacticalPlan(this.current, plan.move, plan.ability, this.catalog);
    if (!preview.ok) { this.error = preview.reason; return null; }
    const presentation = this.resolve(plan.move, false);
    if (presentation) this.plannedAbility = plan.ability;
    return presentation;
  }
  confirmPlannedAbility(): Presentation | null {
    if (this.phase !== 'player' || !this.plannedAbility) return null;
    const ability = this.plannedAbility; this.plannedAbility = null;
    return this.resolve(ability, false);
  }
  undoMove(): Presentation | null {
    if (!this.canUndoMove || !this.lastMove) return null;
    const before=this.current, previous=this.lastMove;this.lastMove=null;this.cancel();this.error=null;
    const result=undoRecordedMove(previous.before,before,previous.move,this.catalog);
    if (!result.ok) {this.error=result.reason;return null;}
    this.current=freeze(result.state);this.commands.push(freeze({type:'undoMove',unitId:previous.move.unitId}));
    const events=freeze(result.events);this.resolvedEvents.push(...events);
    this.phase='presenting';setTelemetryContext({phase:'presenting'});
    try {this.accepted?.(this.current);} catch { /* Persistence reports its own nonfatal status. */ }
    return {before,after:this.current,events,token:++this.generation};
  }
  confirm(): Presentation | null {
    if (this.phase !== 'player' || !this.intent) return null;
    const command = this.intent; this.intent = null;
    return this.resolve(command, false);
  }
  nextEnemy(): Presentation | null {
    if (this.phase !== 'enemy') return null;
    if (!this.enemyQueue.length) {
      const plan = planEnemyTurn(this.current, this.active.id, this.catalog);
      if (!plan.ok) { this.fail(plan.reason); return null; }
      this.enemyQueue = [...plan.commands];
    }
    return this.resolve(this.enemyQueue.shift()!, true);
  }
  private resolve(command: Command, enemy: boolean): Presentation | null {
    const before = this.current;
    const result = dispatch(before, command, this.catalog);
    if (!result.ok) { this.error = result.reason; if (enemy) this.fail(result.reason); return null; }
    this.current = freeze(result.state);
    this.lastMove = !enemy && command.type === 'move' && result.events.length === 1 && result.events[0].type === 'moved' && !before.units.find(u=>u.id===command.unitId)!.hasActed ? {before,move:command} : null;
    this.commands.push(freeze(structuredClone(command)));
    const events = freeze(result.events);
    this.resolvedEvents.push(...events);
    this.phase = 'presenting';
    setTelemetryContext({ phase: 'presenting' });
    // Observers cannot undo an accepted command or prevent its presentation.
    try { this.accepted?.(this.current); } catch { /* Persistence reports its own nonfatal status. */ }
    return {before,after:this.current,events,token:++this.generation};
  }
  finishPresentation(token: number) {
    if (this.phase !== 'presenting' || token !== this.generation) return;
    this.phase = this.decisionPhase();
    setTelemetryContext({ phase: this.phase });
    if (this.phase !== 'enemy') this.enemyQueue = [];
  }
  private fail(reason: string) { reportFailure('battle_resolution', { phase: this.phase }); this.error = reason; this.phase = 'error'; this.enemyQueue = []; }
  dispose() { this.generation++; this.phase = 'disposed'; this.cancel(); this.lastMove = null; this.enemyQueue = []; }
}
