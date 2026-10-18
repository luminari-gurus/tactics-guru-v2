import { applyItemCommand, type ItemCommand, type ItemFailure } from '../domain/items';
import { BattleSession } from './BattleSession';
import { completeRunBattle, freshRunSnapshot } from '../domain/runBattle';
import { runBattleCatalog } from '../domain/runSaveEnvelope';
import { isIntegerIn } from '../domain/rng';
import { RULE_BOUNDS } from '../domain/constants';
import { runBoundaryId } from '../domain/run';
import { readRunSnapshot, type RunSaveContext, type RunSnapshot } from '../domain/runSaveEnvelope';
import { createRunStorage, type RunLoadResult, type RunStorageSlot } from '../persistence/runStorage';

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
  get isUnsavedOnly() { return this.unsavedOnly; }
  private lastRecord: unknown = null;
  get completedBattle(): unknown { return JSON.parse(JSON.stringify(this.lastRecord)); }
  status = 'Progress has not been saved';
  onChange: (() => void) | null = null;
  constructor(initial: unknown, readonly context: RunSaveContext,
    readonly storage = createRunStorage(context)) {
    const read = readRunSnapshot(initial, context);
    if (!read.ok) throw Error('Invalid run snapshot');
    this.current = read.state;
  }
  get snapshot(): RunSnapshot { return JSON.parse(JSON.stringify(this.current)); }
  get activeSession() { return this.battle; }
  dispose() { this.disposed = true; this.battle?.dispose(); this.battle = null; this.onChange = null; }
  startEncounter(): BattleSession | null {
    if (this.disposed || this.current.items.run.phase !== 'battle') return null;
    if (this.battle && this.battle.phase !== 'disposed') return this.battle;
    let session: BattleSession;
    const entry = this.snapshot.items;
    const accepted = () => {
      if (this.disposed || this.battle !== session || session.phase === 'disposed') return;
      const next = session.state.outcome === 'ongoing'
        ? readRunSnapshot({ ...this.current, activeBattle: session.state }, this.context)
        : completeRunBattle(this.current, session.state, this.context);
      if (!next.ok) { this.report('Run boundary rejected. Progress unchanged.'); return; }
      if (session.state.outcome !== 'ongoing') this.lastRecord = { entry, state: session.state, replay: session.replay, continuation: session.continuation, events: session.events };
      this.current = next.state; this.review = null; this.save();
    };
    const restoring = this.current.activeBattle !== null;
    const catalog = runBattleCatalog(this.current.items, this.context);
    const created = this.current.activeBattle && catalog
      ? BattleSession.fromSnapshot(catalog, this.current.activeBattle, accepted)
      : BattleSession.fromRun(this.current.items, this.context, accepted);
    if (!created.ok) { this.report('Could not start this encounter. Progress unchanged.'); return null; }
    session = created.session; this.battle = session;
    if (session.state.outcome !== 'ongoing') { accepted(); return null; }
    this.current = { ...this.current, activeBattle: session.state }; this.review = null;
    if (!restoring) this.save(); return session;
  }
  recoveryTexts(load: RunLoadResult) {
    const values = [...this.retained];
    if (load.ok) for (const slot of ['primary', 'backup'] as const) {
      const value = load.inspection[slot];
      if ('text' in value && value.text !== null && !values.some(v => v.slot === slot && v.text === value.text)) values.push({ slot, text: value.text });
    }
    return values;
  }
  replace(review: RunLoadResult, id: string, seed: number) {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id) || !isIntegerIn(seed, RULE_BOUNDS.uint32) || this.disposed || review !== this.review || !review.ok || id === this.current.items.run.id || seed === this.current.items.run.seed) return false;
    const next = freshRunSnapshot(id, seed, this.context);
    this.retained = this.recoveryTexts(review);
    for (const slot of ['backup', 'primary'] as const) {
      const value = review.inspection[slot];
      if (!('text' in value) || !this.storage.removeSlot(slot, value.text).ok) {
        this.review = null; this.report('Reset incomplete. Run and seed unchanged. Export recovery copies, review again and retry.'); return false;
      }
    }
    const checked = this.storage.load();
    if (!checked.ok || Object.values(checked.inspection).some(s => s.status !== 'missing')) {
      this.review = null; this.report('Reset incomplete. Run and seed unchanged. Review saved data again.'); return false;
    }
    this.battle?.dispose(); this.battle = null; this.current = next; this.review = null; this.retained = []; this.lastRecord = null;
    this.unsavedOnly = false; this.save(); return true;
  }
  boundary() {
    const { run, itemRevision } = this.current.items;
    return { runId: run.id, revision: run.revision, encounterId: run.encounters[run.encounterIndex],
      boundaryId: runBoundaryId(run), itemRevision };
  }
  private report(message: string) {
    this.status = message;
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
    this.current = { items: result.state, activeBattle: null };
    this.review = null;
    this.save();
    return { ...result, state: this.snapshot.items };
  }
  playUnsaved() {
    if (this.disposed) return;
    this.unsavedOnly = true; this.review = null; this.save();
  }
  save() {
    if (this.disposed) return { ok: false, reason: 'invalidState' } as const;
    if (this.unsavedOnly) {
      this.report('Progress unsaved by choice. Review saved data to Continue or Start new run before saving.');
      return { ok: false, reason: 'unsaved' } as const;
    }
    const result = this.storage.save(this.current);
    this.report(result.ok ? 'Run saved on this device' : result.reason === 'storage'
      ? `Progress unsaved: storage ${result.kind}. Open Save recovery to retry.`
      : result.reason === 'recoveryRequired' ? 'Progress unsaved: saved data needs recovery. Open Save recovery.'
      : 'Progress unsaved: the run could not be encoded. Open Save recovery.');
    return result;
  }
  inspect() {
    const load = this.storage.load();
    this.review = load;
    if (!load.ok || Object.values(load.inspection).some(slot => slot.status === 'invalid' || slot.status === 'unavailable'))
      this.report('Saved data needs recovery. Progress is unsaved until Save recovery resolves damaged or unreadable data.');
    return load;
  }
  continue(review: RunLoadResult) {
    if (this.disposed || review !== this.review || !review.ok || !review.selected) return false;
    const checked = readRunSnapshot(review.selected.state, this.context);
    if (!checked.ok) return false;
    this.battle?.dispose(); this.battle = null;
    this.current = checked.state;
    this.review = null; this.unsavedOnly = false;
    const blocked = Object.values(review.inspection).some(slot => slot.status === 'invalid' || slot.status === 'unavailable');
    this.report((review.selected.slot === 'backup' ? 'Continued backup. Some progress may be lost.' : 'Continued saved run') +
      (blocked ? ' Progress unsaved until Save recovery resolves damaged or unreadable data.' : ''));
    return true;
  }
  remove(slot: RunStorageSlot, review: RunLoadResult) {
    if (this.disposed || review !== this.review || !review.ok) return false;
    const value = review.inspection[slot];
    if (!('text' in value)) return false;
    this.retained = this.recoveryTexts(review);
    const removed = this.storage.removeSlot(slot, value.text);
    this.review = null;
    this.report(removed.ok ? 'Save removed. Retry saving when recovery is complete.' : 'Removal refused: saved data changed or storage failed. Review again.');
    return removed.ok;
  }
}
