import { levelUpFeedback } from '../domain/progression';
import { track, reportFailure, rewardChoices, setTelemetryContext } from '../telemetry/telemetry';
import { applyItemCommand, type ItemCommand, type ItemFailure } from '../domain/items';
import { BattleSession } from './BattleSession';
import { completeRunBattle, freshRunSnapshot } from '../domain/runBattle';
import { runBattleCatalog, resolveRunBattlefield } from '../domain/runSaveEnvelope';
import { isIntegerIn } from '../domain/rng';
import { RULE_BOUNDS } from '../domain/constants';
import { runBoundaryId } from '../domain/run';
import { encodeRunSave, readRunSnapshot, type RunSaveContext, type RunSnapshot } from '../domain/runSaveEnvelope';
import { createRunStorage, type RunLoadResult, type RunStorageSlot } from '../persistence/runStorage';
import { authoredRunRecord } from '../domain/runRecords';
import type { RunHistory } from './RunHistory';
import { acceptBattleStats, authoredWins, freshRunStats, type AcceptedBattle } from '../domain/runStats';
import type { BattleState } from '../domain/types';

const rejectionText: Record<ItemFailure['reason'], string> = {
  invalidOwnership: 'The owned items are invalid', invalidItems: 'The item state is invalid',
  invalidCommand: 'This choice is invalid', staleBoundary: 'This choice is out of date; review it again',
  wrongContext: 'Items cannot be changed in this phase', invalidTarget: 'This hero cannot receive that item',
  notOwned: 'That item is not owned', capacity: 'There is no room for that reward', revisionLimit: 'The item operation limit was reached',
};

/** Owns accepted item boundaries. No DOM, presentation state or caller-supplied battle context. */
export class RunItemSession {
  private current: RunSnapshot;
  private review: RunLoadResult | null = null;
  private battle: BattleSession | null = null;
  private retained: { slot: RunStorageSlot; text: string }[] = [];
  private disposed = false;
  private unsavedOnly = false;
  private progressSaved = false;
  private expectedPrimary: string | null = null;
  private saveConflict = false;
  private started = false;
  readonly history: RunHistory | null;
  get hasSaveConflict() { return this.saveConflict; }
  exportCurrent() { return encodeRunSave(this.current, this.context); }
  get isUnsavedOnly() { return this.unsavedOnly; }
  /** Durable progress is independent of transient command/recovery feedback. */
  get hasUnsavedProgress() { return this.storage !== null && (this.unsavedOnly || !this.progressSaved); }
  private lastRecord: unknown = null;
  get completedBattle(): unknown { return JSON.parse(JSON.stringify(this.lastRecord)); }
  private message = 'Progress has not been saved';
  get status() { return this.history?.status ? `${this.message}. ${this.history.status}` : this.message; }
  onChange: (() => void) | null = null;
  constructor(initial: unknown, readonly context: RunSaveContext,
    readonly storage: ReturnType<typeof createRunStorage> | null = createRunStorage(context),
    private readonly serializeWrite?: (task:()=>void, unavailable:()=>void)=>void, history: RunHistory | null = null) {
    const read = readRunSnapshot(initial, context);
    if (!read.ok) throw Error('Invalid run snapshot');
    this.current = read.state;
    if (!storage) { const { stats: _, ...untracked } = this.current; this.current = untracked; }
    this.history = storage ? history : null;
    if (this.history) this.history.onChange = () => { if (!this.disposed) this.report(this.message); };
    if (!storage) this.message = 'Testing run. Progress resets on reload.';
  }
  get snapshot(): RunSnapshot { return JSON.parse(JSON.stringify(this.current)); }
  get activeSession() { return this.battle; }
  dispose() { this.disposed = true; this.battle?.dispose(); this.battle = null; this.onChange = null; if (this.history) this.history.onChange = null; }
  startEncounter(): BattleSession | null {
    if (this.disposed || this.current.items.run.phase !== 'battle') return null;
    if (this.battle && this.battle.phase !== 'disposed') return this.battle;
    const restoring = this.current.activeBattle !== null;
    const source = this.context.encounters.find(e => e.id === this.current.items.run.encounters[this.current.items.run.encounterIndex])?.source;
    const began = source?.kind === 'generated' ? performance.now() : null;
    const resolved = resolveRunBattlefield(this.current.items,this.context);
    // One foreground resolution sample per entry/resume, not repeated save validation.
    if (began !== null && source?.kind === 'generated') track('battlefield_generation_measured', {
      route: 'run', encounter: this.current.items.run.encounterIndex,
      generation_context: restoring ? 'resume' : 'entry',
      generation_duration_ms: Math.round(Math.max(0, performance.now() - began) * 100) / 100,
      generation_status: resolved?.ok ? resolved.diagnostics.fallback ? 'fallback' : 'generated' : 'failed',
      ...(resolved?.ok ? { generation_attempts: resolved.diagnostics.fallback ? 4 : resolved.diagnostics.attempt! + 1 } : {}),
      biome: source.biome, generator_version: source.generatorVersion, profile_version: source.profileVersion,
    });
    if(!resolved?.ok) { this.report('Could not resolve this battlefield. Progress unchanged.'); return null; }
    const battlefield = resolved.descriptor;
    let session: BattleSession;
    const entry = this.snapshot.items;
    const accepted = (_state?: BattleState, batch?: AcceptedBattle) => {
      if (this.disposed || this.battle !== session || session.phase === 'disposed') return;
      const next = session.state.outcome === 'ongoing'
        ? readRunSnapshot({ ...this.current, activeBattle: session.state, battlefield:battlefield }, this.context)
        : completeRunBattle(this.current, session.state, this.context);
      if (!next.ok) { reportFailure('run_boundary', { route: 'run', encounter: this.current.items.run.encounterIndex }); this.report('Run boundary rejected. Progress unchanged.'); return; }
      if (session.state.outcome !== 'ongoing') this.lastRecord = { entry, state: session.state, replay: session.replay, continuation: session.continuation, events: session.events };
      const feedback = levelUpFeedback(this.current.items.run.party, next.state.items.run.party);
      this.current = this.storage && batch ? { ...next.state, stats: acceptBattleStats(
        this.current.stats ?? freshRunStats('since-upgrade'), authoredWins(this.current.items.run), batch) } : next.state;
      this.review = null;
      if (session.state.outcome !== 'ongoing') {
        const run = this.current.items.run;
        track('encounter_outcome', { route: 'run', encounter: run.encounterIndex, outcome: session.state.outcome === 'playerWin' ? 'victory' : 'defeat' }, `${run.id}:${run.encounterIndex}`);
        if (run.phase === 'victory' || run.phase === 'defeat') track('run_outcome', { route: 'run', phase: run.phase, encounter: run.encounterIndex, outcome: run.phase }, run.id);
      }
      this.requestSave();
      if (feedback) this.report(`${this.status}. ${feedback}`);
    };
    const catalog = runBattleCatalog(this.current.items, this.context);
    const created = this.current.activeBattle && catalog
      ? BattleSession.fromSnapshot(catalog, this.current.activeBattle, accepted, battlefield)
      : BattleSession.fromRun(this.current.items, this.context, accepted);
    if (!created.ok) { reportFailure('encounter_start', { route: 'run', encounter: this.current.items.run.encounterIndex }); this.report('Could not start this encounter. Progress unchanged.'); return null; }
    session = created.session; this.battle = session; this.started = true; session.progression = structuredClone(this.current.items.run.party);
    if (session.state.outcome !== 'ongoing') { accepted(); return null; }
    this.current = { ...this.current, activeBattle: session.state, battlefield:battlefield }; this.review = null;
    if (!restoring) { track('encounter_started', { route: 'run', encounter: this.current.items.run.encounterIndex, phase: 'battle' }, `${this.current.items.run.id}:${this.current.items.run.encounterIndex}`); this.requestSave(); } return session;
  }
  recoveryTexts(load: RunLoadResult) {
    if (!this.storage) return [];
    const values = [...this.retained];
    if (load.ok) for (const slot of ['primary', 'backup'] as const) {
      const value = load.inspection[slot];
      if ('text' in value && value.text !== null && !values.some(v => v.slot === slot && v.text === value.text)) values.push({ slot, text: value.text });
    }
    return values;
  }
  async replace(review: RunLoadResult, id: string, seed: number): Promise<boolean> {
    if (!this.storage || this.disposed || review !== this.review || !review.ok) return false;
    const selected = review.selected?.state;
    const expected = this.current;
    const old = this.started && (!selected || selected.items.run.id === this.current.items.run.id) ? this.current : selected;
    const recordedAt = this.history?.now();
    const record = old && recordedAt !== undefined ? authoredRunRecord(old.items.run, recordedAt, true) : null;
    const other = this.started && old && old.items.run.id !== this.current.items.run.id && recordedAt !== undefined
      ? authoredRunRecord(this.current.items.run, recordedAt, true) : null;
    const perform = () => new Promise<boolean>(resolve => {
      this.queueWrite(() => {
        if (this.current !== expected) { this.report('Reset refused: the run changed while confirming. Review again.'); resolve(false); }
        else resolve(this.replaceNow(review, id, seed));
      }, () => resolve(false));
    });
    return this.history ? this.history.replace(record, id, perform, other) : perform();
  }
  private replaceNow(review: RunLoadResult, id: string, seed: number) {
    if (!this.storage || !/^[A-Za-z0-9-]{1,64}$/.test(id) || !isIntegerIn(seed, RULE_BOUNDS.uint32) || this.disposed || review !== this.review || !review.ok || id === this.current.items.run.id || seed === this.current.items.run.seed) return false;
    const next = freshRunSnapshot(id, seed, this.context, true);
    const latest = this.storage.load();
    if (!latest.ok || !(['primary','backup'] as const).every(slot => {
      const before = review.inspection[slot], now = latest.inspection[slot];
      return 'text' in before && 'text' in now && before.text === now.text;
    })) {
      this.review = null; this.report('Reset refused: saved data changed or is unavailable. Review again.'); return false;
    }
    this.retained = this.recoveryTexts(review);
    for (const slot of ['backup', 'primary'] as const) {
      const value = review.inspection[slot];
      if (!('text' in value) || !this.storage.removeSlot(slot, value.text).ok) {
        this.review = null; reportFailure('save_reset', { route: 'run' }); this.report('Reset incomplete. Run and seed unchanged. Export recovery copies, review again and retry.'); return false;
      }
    }
    const checked = this.storage.load();
    if (!checked.ok || Object.values(checked.inspection).some(s => s.status !== 'missing')) {
      this.review = null; reportFailure('save_reset', { route: 'run' }); this.report('Reset incomplete. Run and seed unchanged. Review saved data again.'); return false;
    }
    this.expectedPrimary = null;
    this.reset(next); return true;
  }
  /** Testing restart discards only the in-memory run and its pending callbacks. */
  restart(id: string, seed: number) {
    if (this.storage || this.disposed || !/^[A-Za-z0-9-]{1,64}$/.test(id) || !isIntegerIn(seed, RULE_BOUNDS.uint32)) return false;
    this.reset(freshRunSnapshot(id, seed, this.context)); return true;
  }
  private reset(next: RunSnapshot) {
    this.battle?.dispose(); this.battle = null; this.current = next; this.review = null; this.retained = []; this.lastRecord = null;
    this.unsavedOnly = false;
    this.saveConflict = false;
    this.started = true;
    track('run_started', { route: 'run', phase: this.current.items.run.phase }, this.current.items.run.id);
    this.save();
  }
  startNew() {
    if (this.disposed) return;
    this.started = true;
    track('run_started', { route: 'run', phase: this.current.items.run.phase }, this.current.items.run.id);
    this.requestSave();
  }
  boundary() {
    const { run, itemRevision } = this.current.items;
    return { runId: run.id, revision: run.revision, encounterId: run.encounters[run.encounterIndex],
      boundaryId: runBoundaryId(run), itemRevision };
  }
  private report(message: string) {
    this.message = message;
    try { this.onChange?.(); } catch { /* Observers cannot undo committed state. */ }
  }
  dispatch(command: ItemCommand) {
    if (this.disposed) return { ok: false, reason: 'wrongContext' } as const;
    const boundary = this.boundary();
    const result = applyItemCommand(this.current.items, command,
      { runId: boundary.runId, encounterId: boundary.encounterId, boundaryId: boundary.boundaryId, activeBattle: this.current.activeBattle !== null },
      this.context.definition, this.context.catalog, this.context.items);
    if (!result.ok) { this.report(`${rejectionText[result.reason]}. Nothing changed.`); return result; }
    this.battle?.dispose(); this.battle = null;
    const encounter = this.current.items.run.encounterIndex;
    this.current = { ...this.current, items: result.state, activeBattle: null, battlefield:null };
    this.started = true;
    if (command.type === 'claimReward') track('reward_chosen', { route: 'run', encounter, phase: 'reward',
      choice: rewardChoices.find(choice => `item:${choice}` === command.itemId) }, `${this.current.items.run.id}:${encounter}`);
    this.review = null;
    this.requestSave();
    return { ...result, state: this.snapshot.items };
  }
  playUnsaved() {
    if (this.disposed || !this.storage) return;
    this.unsavedOnly = true; this.review = null; this.startNew();
  }
  queueWrite(task:()=>void, unavailable?:()=>void) {
    const guarded = () => { if (!this.disposed) task(); else unavailable?.(); };
    if (!this.storage || !this.serializeWrite) { guarded(); return; }
    this.serializeWrite(guarded, () => {
      if (this.disposed) return;
      this.progressSaved = false;
      this.report('Progress unsaved: exclusive save access unavailable. Open Save recovery to export.');
      unavailable?.();
    });
  }
  requestSave(done?:()=>void) {
    if (this.disposed) return;
    const snapshot = this.current;
    // An accepted ending belongs to history even when active saving is disabled or denied.
    if (this.history && this.started) void this.history.record(authoredRunRecord(snapshot.items.run, this.history.now()));
    this.progressSaved = false;
    if (this.storage && this.serializeWrite && !this.unsavedOnly) this.report('Saving run…');
    this.queueWrite(() => {
      if (this.current === snapshot) this.save();
      done?.();
    });
  }
  save() {
    if (this.disposed) return { ok: false, reason: 'invalidState' } as const;
    setTelemetryContext({ phase: this.current.items.run.phase, encounter: this.current.items.run.encounterIndex });
    if (!this.storage) {
      this.report('Testing run. Progress resets on reload.');
      return { ok: false, reason: 'transient' } as const;
    }
    if (this.unsavedOnly) {
      this.report('Progress unsaved by choice. Review saved data to Continue or Start new run before saving.');
      return { ok: false, reason: 'unsaved' } as const;
    }
    const result = this.storage.save(this.current, this.expectedPrimary);
    if (result.ok) this.expectedPrimary = this.storage.lastSavedText()!;
    if (result.ok || result.reason === 'changed') this.saveConflict = !result.ok;
    this.progressSaved = result.ok;
    if (!result.ok) reportFailure('save_write', { route: 'run', phase: this.current.items.run.phase, encounter: this.current.items.run.encounterIndex });
    this.report(result.ok ? 'Run saved on this device' : result.reason === 'storage'
      ? `Progress unsaved: storage ${result.kind}. Open Save recovery to retry.`
      : result.reason === 'recoveryRequired' ? 'Progress unsaved: saved data needs recovery. Open Save recovery.'
      : result.reason === 'changed' ? 'Progress unsaved: another tab changed the run save. Open Save recovery.'
      : 'Progress unsaved: the run could not be encoded. Open Save recovery.');
    return result;
  }
  inspect() {
    if (!this.storage) throw Error('Testing runs have no save storage');
    const load = this.storage.load();
    this.review = load;
    if (!load.ok || Object.values(load.inspection).some(slot => slot.status === 'invalid' || slot.status === 'unavailable')) {
      track('save_recovery_failed', { route: 'run', operation: 'read' });
      reportFailure('save_read', { route: 'run' });
      this.report('Saved data needs recovery. Progress is unsaved until Save recovery resolves damaged or unreadable data.');
    }
    return load;
  }
  continue(review: RunLoadResult) {
    if (!this.storage || this.disposed || review !== this.review || !review.ok || !review.selected) return false;
    const checked = readRunSnapshot(review.selected.state, this.context);
    if (!checked.ok) return false;
    this.battle?.dispose(); this.battle = null;
    this.current = checked.state;
    this.started = true;
    const primary = review.inspection.primary;
    if ('text' in primary) this.expectedPrimary = primary.text;
    this.review = null; this.unsavedOnly = false;
    this.saveConflict = false;
    track('run_continued', { route: 'run', phase: this.current.items.run.phase, encounter: this.current.items.run.encounterIndex });
    const blocked = Object.values(review.inspection).some(slot => slot.status === 'invalid' || slot.status === 'unavailable');
    this.progressSaved = !blocked;
    this.report((review.selected.slot === 'backup' ? 'Continued backup. Some progress may be lost.' : 'Continued saved run') +
      (blocked ? ' Progress unsaved until Save recovery resolves damaged or unreadable data.' : ''));
    if (this.history) void this.history.resume(this.current.items.run.id, authoredRunRecord(this.current.items.run, this.history.now()));
    return true;
  }
  remove(slot: RunStorageSlot, review: RunLoadResult) {
    if (!this.storage || this.disposed || review !== this.review || !review.ok) return false;
    const value = review.inspection[slot];
    if (!('text' in value)) return false;
    this.retained = this.recoveryTexts(review);
    const removed = this.storage.removeSlot(slot, value.text);
    this.review = null;
    if (!removed.ok) reportFailure('save_remove', { route: 'run' });
    else {
      this.progressSaved = false;
      if (slot === 'primary') this.expectedPrimary = null;
    }
    this.report(removed.ok ? 'Save removed. Retry saving when recovery is complete.' : 'Removal refused: saved data changed or storage failed. Review again.');
    return removed.ok;
  }
}
