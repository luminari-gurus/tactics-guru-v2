import type { ContentCatalog, MapId } from '../content/types';
import { previewCommand } from '../domain/battle';
import { previewMove } from '../domain/grid';
import { previewAttack, previewMagicMissile } from '../domain/combat';
import { planEnemyTurn } from '../domain/ai';
import { createBattle, dispatch } from '../domain/turns';
import type { BattleEvent, BattleState, Command, Replay } from '../domain/types';

export type SessionPhase = 'player' | 'enemy' | 'presenting' | 'ended' | 'error' | 'disposed';
export interface Presentation { readonly before: BattleState; readonly after: BattleState; readonly events: readonly BattleEvent[]; readonly token: number }
export type ActionPreview = ReturnType<typeof previewMove> | ReturnType<typeof previewAttack> | ReturnType<typeof previewMagicMissile> | ReturnType<typeof previewCommand>;
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
  private commands: Command[] = [];
  private resolvedEvents: BattleEvent[] = [];
  private intent: Command | null = null;
  private enemyQueue: Command[] = [];
  private generation = 0;
  phase: SessionPhase;
  error: string | null = null;
  constructor(readonly catalog: ContentCatalog, mapId: MapId, seed: number) {
    const created = createBattle(mapId, seed, catalog);
    if (!created.ok) throw new Error(`Could not create battle: ${created.reason}`);
    this.current = this.initial = freeze(created.state);
    this.phase = this.decisionPhase();
  }
  get state() { return this.current; }
  get active() { return this.current.units.find(u=>u.id === this.current.initiative[this.current.activeIndex])!; }
  get pending() { return this.intent; }
  get events(): readonly BattleEvent[] { return [...this.resolvedEvents]; }
  get replay(): Replay { return freeze({format:this.initial.format, versions:this.initial.versions, initial:this.initial, commands:[...this.commands]}); }
  private decisionPhase(): SessionPhase { return this.current.outcome !== 'ongoing' ? 'ended' : this.active.side === 'enemy' ? 'enemy' : 'player'; }
  preview(command: Command): ActionPreview {
    if (command.type === 'move') return previewMove(this.current, command, this.catalog);
    if (command.type === 'useAbility') return this.catalog.abilities[command.abilityId]?.kind === 'magicMissile'
      ? previewMagicMissile(this.current, command, this.catalog) : previewAttack(this.current, command, this.catalog);
    return previewCommand(this.current, command, this.catalog);
  }
  prepare(command: Command): ActionPreview {
    this.intent = null; this.error = null;
    if (this.phase !== 'player' || command.unitId !== this.active.id) return {ok:false,reason:'notActiveUnit'};
    const preview = this.preview(command);
    if (preview.ok) this.intent = freeze(structuredClone(command));
    return preview;
  }
  cancel() { this.intent = null; }
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
    this.commands.push(freeze(structuredClone(command)));
    const events = freeze(result.events);
    this.resolvedEvents.push(...events);
    this.phase = 'presenting';
    return {before,after:this.current,events,token:++this.generation};
  }
  finishPresentation(token: number) {
    if (this.phase !== 'presenting' || token !== this.generation) return;
    this.phase = this.decisionPhase();
    if (this.phase !== 'enemy') this.enemyQueue = [];
  }
  private fail(reason: string) { this.error = reason; this.phase = 'error'; this.enemyQueue = []; }
  dispose() { this.generation++; this.phase = 'disposed'; this.intent = null; this.enemyQueue = []; }
}
