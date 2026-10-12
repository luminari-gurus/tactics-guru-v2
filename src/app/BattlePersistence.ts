import type { ContentCatalog, MapId } from '../content/types';
import { BattleSession } from './BattleSession';
import { createBattleStorage, type BattleLoadResult, type BattleStorageSlot } from '../persistence/battleStorage';

type StorageAdapter = ReturnType<typeof createBattleStorage>;
export interface RecoveryText { readonly slot: BattleStorageSlot; readonly text: string }
const slots = ['backup', 'primary'] as const;
const empty = (load: BattleLoadResult): boolean => load.ok && slots.every(slot => load.inspection[slot].status === 'missing');

/** One lifecycle owner; storage never receives scene objects or presentation history. */
export class BattlePersistence {
  session: BattleSession | null = null;
  inspection: BattleLoadResult | null = null;
  status = 'Checking saved battle';
  onChange: (() => void) | null = null;
  private retained: RecoveryText[] = [];
  constructor(private readonly catalog: ContentCatalog, private readonly mapId: MapId,
    private readonly storage: StorageAdapter = createBattleStorage(catalog)) {}

  private report(message: string) {
    this.status = message;
    try { this.onChange?.(); } catch { /* UI observers cannot break committed state. */ }
  }
  inspect(): BattleLoadResult {
    const load = this.storage.load();
    this.inspection = load;
    return load;
  }
  startup(): BattleSession | null {
    if (this.session) return this.session;
    const load = this.inspect();
    if (empty(load)) return this.adopt(this.fresh(1), true);
    this.report(load.ok && load.selected ? load.selected.slot === 'primary'
      ? 'Saved battle found. Choose Continue or New battle.'
      : 'Backup recovery available. Some progress may be lost.'
      : 'Saved battle could not be loaded. Review recovery or retry.');
    return null;
  }
  private accepted(session: BattleSession) {
    if (this.session === session && session.phase !== 'disposed') this.save();
  }
  private fresh(seed: number) {
    const session = new BattleSession(this.catalog, this.mapId, seed, () => this.accepted(session));
    return session;
  }
  private adopt(session: BattleSession, save: boolean) {
    this.session?.dispose();
    this.session = session;
    // Consume the reviewed values: a duplicate confirm cannot replace twice.
    this.inspection = null;
    if (save) this.save();
    return session;
  }
  continue(review: BattleLoadResult): BattleSession | null {
    if (this.session || review !== this.inspection || !review.ok || !review.selected) return null;
    const restored = BattleSession.fromSnapshot(this.catalog, review.selected.state, () => this.accepted(session));
    if (!restored.ok) { this.report('Saved battle is invalid. Review recovery.'); return null; }
    const session = restored.session;
    this.adopt(session, false);
    const blocked = slots.some(slot => ['invalid', 'unavailable'].includes(review.inspection[slot].status));
    this.report(blocked ? 'Continued recovery. Progress is unsaved until damaged or unreadable storage is resolved.'
      : review.selected.slot === 'backup' ? 'Continued backup. Some progress may be lost.' : 'Continued saved battle');
    return session;
  }
  save() {
    if (!this.session || this.session.phase === 'disposed') return;
    const result = this.storage.save(this.session.state);
    this.report(result.ok ? 'Battle saved on this device' : result.reason === 'recoveryRequired'
      ? 'Progress unsaved. Saved data needs recovery.'
      : result.reason === 'storage' ? `Progress unsaved. Storage ${result.kind}; retry in Save recovery.`
      : 'Progress unsaved. This battle could not be encoded.');
  }
  retry() {
    if (this.session) { this.save(); return this.inspect(); }
    this.startup();
    return this.inspection;
  }
  recoveryTexts(review: BattleLoadResult | null = this.inspection): readonly RecoveryText[] {
    const values = [...this.retained];
    if (review?.ok) for (const slot of slots) {
      const value = review.inspection[slot];
      if ('text' in value && value.text !== null && !values.some(v => v.slot === slot && v.text === value.text))
        values.push({slot, text:value.text});
    }
    return values;
  }
  private retain(review: BattleLoadResult) { this.retained = [...this.recoveryTexts(review)]; }
  private failedReset() {
    this.inspect();
    this.report('Reset incomplete. Battle and seed unchanged; some slots may have been removed. Export recovery copies, review again, then retry or cancel.');
  }
  remove(slot: BattleStorageSlot, review: BattleLoadResult): boolean {
    if (review !== this.inspection || !review.ok) return false;
    const value = review.inspection[slot];
    if (!('text' in value)) { this.report('Cannot remove unreadable data. Retry storage first.'); return false; }
    this.retain(review);
    const result = this.storage.removeSlot(slot, value.text);
    this.inspect();
    if (!result.ok) { this.report('Removal refused. Saved data changed or storage failed; review again before retrying.'); return false; }
    // A successful explicit removal no longer requires retaining that slot's copies.
    this.retained = this.retained.filter(v => v.slot !== slot);
    this.report(`${slot === 'primary' ? 'Primary' : 'Backup'} save removed. Retry saving when recovery is complete.`);
    return true;
  }
  replace(review: BattleLoadResult): BattleSession | null {
    if (review !== this.inspection || !review.ok) { this.report('Cannot reset without inspecting saved data. Retry first.'); return null; }
    this.retain(review);
    const priorSeed = this.session?.state.seed ?? review.selected?.state.seed;
    const next = this.fresh(priorSeed === undefined ? 1 : (priorSeed + 1) >>> 0);
    for (const slot of slots) {
      const value = review.inspection[slot];
      if (!('text' in value) || !this.storage.removeSlot(slot, value.text).ok) {
        next.dispose(); this.failedReset(); return null;
      }
    }
    if (!empty(this.inspect())) { next.dispose(); this.failedReset(); return null; }
    this.retained = [];
    return this.adopt(next, true);
  }
}
