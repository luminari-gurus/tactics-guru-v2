import { applyItemCommand, type ItemCommand, type ItemFailure } from '../domain/items';
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
  status = 'Progress has not been saved';
  onChange: (() => void) | null = null;
  constructor(initial: unknown, readonly context: RunSaveContext,
    readonly storage = createRunStorage(context)) {
    const read = readRunSnapshot(initial, context);
    if (!read.ok) throw Error('Invalid run snapshot');
    this.current = read.state;
  }
  get snapshot(): RunSnapshot { return JSON.parse(JSON.stringify(this.current)); }
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
    const boundary = this.boundary();
    const result = applyItemCommand(this.current.items, command,
      { runId: boundary.runId, encounterId: boundary.encounterId, boundaryId: boundary.boundaryId, activeBattle: this.current.activeBattle !== null },
      this.context.definition, this.context.catalog, this.context.items);
    if (!result.ok) { this.report(`${rejectionText[result.reason]}. Nothing changed.`); return result; }
    this.current = { items: result.state, activeBattle: null };
    this.review = null;
    this.save();
    return { ...result, state: this.snapshot.items };
  }
  save() {
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
    if (review !== this.review || !review.ok || !review.selected) return false;
    const checked = readRunSnapshot(review.selected.state, this.context);
    if (!checked.ok) return false;
    this.current = checked.state;
    this.review = null;
    const blocked = Object.values(review.inspection).some(slot => slot.status === 'invalid' || slot.status === 'unavailable');
    this.report((review.selected.slot === 'backup' ? 'Continued backup. Some progress may be lost.' : 'Continued saved run') +
      (blocked ? ' Progress unsaved until Save recovery resolves damaged or unreadable data.' : ''));
    return true;
  }
  remove(slot: RunStorageSlot, review: RunLoadResult) {
    if (review !== this.review || !review.ok) return false;
    const value = review.inspection[slot];
    if (!('text' in value)) return false;
    const removed = this.storage.removeSlot(slot, value.text);
    this.review = null;
    this.report(removed.ok ? 'Save removed. Retry saving when recovery is complete.' : 'Removal refused: saved data changed or storage failed. Review again.');
    return removed.ok;
  }
}
