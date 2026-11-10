import { appendRunRecord, type RecordMode, type RunRecord, type RunRecords } from '../domain/runRecords';
import { createRunRecordsStorage, type RecordsWrite, type RunRecordsStorage } from '../persistence/runRecordsStorage';

/** History effects around accepted journey boundaries; owns no gameplay or active-save state. */
export class RunHistory {
  status = '';
  onChange: (() => void) | null = null;
  private pending: Promise<void> = Promise.resolve();
  constructor(readonly mode: RecordMode, readonly store: RunRecordsStorage = createRunRecordsStorage(), readonly now: () => number = Date.now) {}
  whenIdle() { return this.pending; }
  private notify() { try { this.onChange?.(); } catch { /* An observer cannot undo a history write. */ } }
  private commit(update: (history: RunRecords) => RunRecords): Promise<RecordsWrite> {
    const work = this.store.mutate(update).then(result => {
      const status = result.ok ? '' : `Run history could not be confirmed (${result.reason}). Review Hall of Records; gameplay is unaffected.`;
      if (this.status !== status) { this.status = status; this.notify(); }
      return result;
    });
    this.pending = Promise.all([this.pending, work]).then(() => {});
    return work;
  }
  record(record: RunRecord | null) {
    if (record && record.mode === this.mode) return this.commit(history => appendRunRecord(history, record));
    return Promise.resolve<RecordsWrite>({ ok: true });
  }
  resume(currentId: string, terminal: RunRecord | null) {
    let unresolved = false;
    const work = this.commit(history => {
      const receipt = history.receipts[this.mode];
      if (receipt?.kind === 'pending') {
        if (receipt.newId === currentId || receipt.record.id === currentId) {
          history = { ...history, receipts: { ...history.receipts, [this.mode]: null } };
          if (receipt.newId === currentId) history = appendRunRecord(history, receipt.record);
        } else unresolved = true;
      }
      return terminal ? appendRunRecord(history, terminal) : history;
    });
    void work.then(result => { if (result.ok && unresolved) { this.status = 'A previous replacement has unresolved run history. Review Hall of Records.'; this.notify(); } });
    return work;
  }
  async replace(record: RunRecord | null, newId: string, replace: () => Promise<boolean>): Promise<boolean> {
    if (!record) return replace(); // No admitted old journey: never record the startup placeholder.
    let staged = false;
    await this.commit(history => {
      const previous = history.receipts[this.mode];
      if (previous?.kind === 'sealed' && previous.id === record.id ||
        history.records.some(row => row.mode === record.mode && row.id === record.id)) return history;
      // An explicit review of the still-active old identity can replace its canceled intent.
      // A saved new identity is evidence the prior replacement was accepted.
      if (previous?.kind === 'pending') {
        if (previous.newId === record.id) {
          history = { ...history, receipts: { ...history.receipts, [this.mode]: null } };
          history = appendRunRecord(history, previous.record);
        } else if (previous.record.id !== record.id) return history;
      }
      staged = true;
      return { ...history, receipts: { ...history.receipts, [this.mode]: { kind: 'pending', record, newId } } };
    });
    // History denial is nonfatal. The existing save owner still validates and accepts/refuses replacement.
    const accepted = await replace();
    await this.commit(history => {
      const receipt = history.receipts[this.mode];
      if (staged && receipt?.kind === 'pending' && receipt.newId === newId && receipt.record.id === record.id) {
        history = { ...history, receipts: { ...history.receipts, [this.mode]: null } };
        return accepted ? appendRunRecord(history, receipt.record) : history;
      }
      return accepted ? appendRunRecord(history, record) : history;
    });
    return accepted;
  }
}
