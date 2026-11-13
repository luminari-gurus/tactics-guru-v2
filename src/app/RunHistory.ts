import { appendRunRecord, isRecorded, sealedRecordIds, sealedRecordReceipt,
  type PendingRecordReceipt, type RecordMode, type RunRecord, type RunRecords } from '../domain/runRecords';
import { createRunRecordsStorage, type RecordsWrite, type RunRecordsStorage } from '../persistence/runRecordsStorage';
const pendingRecords = (receipt: PendingRecordReceipt) => receipt.other ? [receipt.record, receipt.other] : [receipt.record];

/** History effects around accepted journey boundaries; owns no gameplay or active-save state. */
export class RunHistory {
  status = '';
  onChange: (() => void) | null = null;
  private pending: Promise<void> = Promise.resolve();
  constructor(readonly mode: RecordMode, readonly store: RunRecordsStorage = createRunRecordsStorage(), readonly now: () => number = Date.now) {}
  whenIdle() { return this.pending; }
  private notify() { try { this.onChange?.(); } catch { /* An observer cannot undo a history write. */ } }
  private commit(update: (history: RunRecords) => RunRecords, notify = true): Promise<RecordsWrite> {
    const work = this.store.mutate(update).then(result => {
      const status = result.ok ? '' : `Run history could not be confirmed (${result.reason}). Review Hall of Records; gameplay is unaffected.`;
      if (this.status !== status) { this.status = status; if (notify) this.notify(); }
      return result;
    });
    this.pending = Promise.all([this.pending, work]).then(() => {});
    return work;
  }
  record(record: RunRecord | null) {
    if (record && record.mode === this.mode) return this.commit(history => appendRunRecord(history, record));
    return Promise.resolve<RecordsWrite>({ ok: true });
  }
  private closePending(history: RunRecords, receipt: PendingRecordReceipt): RunRecords {
    return { ...history, receipts: { ...history.receipts, [this.mode]: receipt.sealed ?? null } };
  }
  resume(currentId: string, terminal: RunRecord | null) {
    let unresolved = false;
    const work = this.commit(history => {
      const receipt = history.receipts[this.mode];
      if (receipt?.kind === 'pending') {
        if (receipt.newId === currentId || pendingRecords(receipt).some(record => record.id === currentId)) {
          history = this.closePending(history, receipt);
          if (receipt.newId === currentId) for (const record of pendingRecords(receipt)) history = appendRunRecord(history, record);
        } else unresolved = true;
      }
      return terminal ? appendRunRecord(history, terminal) : history;
    });
    void work.then(result => { if (result.ok && unresolved) { this.status = 'A previous replacement has unresolved run history. Review Hall of Records.'; this.notify(); } });
    return work;
  }
  async replace(record: RunRecord | null, newId: string, replace: () => Promise<boolean>, other: RunRecord | null = null): Promise<boolean> {
    const records = [record, other].filter((row): row is RunRecord => row !== null)
      .filter((row, index, all) => all.findIndex(r => r.mode === row.mode && r.id === row.id) === index);
    if (!records.length) return replace(); // Never record the startup placeholder.
    let staged = false;
    await this.commit(history => {
      const previous = history.receipts[this.mode];
      // An explicit review of the still-active old identity can replace its canceled intent.
      // A saved new identity is evidence the prior replacement was accepted.
      if (previous?.kind === 'pending') {
        if (records.some(row => row.id === previous.newId)) {
          history = this.closePending(history, previous);
          for (const row of pendingRecords(previous)) history = appendRunRecord(history, row);
        } else if (records.some(row => pendingRecords(previous).some(old => old.id === row.id))) history = this.closePending(history, previous);
        else return history;
      }
      const frozen = records.filter(row => isRecorded(history, row));
      const sealed = sealedRecordReceipt([...frozen.map(row => row.id), ...sealedRecordIds(history.receipts[this.mode])]);
      if (frozen.length === records.length) return { ...history, receipts: { ...history.receipts, [this.mode]: sealed } };
      staged = true;
      return { ...history, receipts: { ...history.receipts, [this.mode]: { kind: 'pending', record: records[0], newId,
        ...(records[1] ? { other: records[1] } : {}), ...(sealed ? { sealed } : {}) } } };
    }, false); // A preparatory status must not rerender and invalidate the owner's reviewed save token.
    // History denial is nonfatal. The existing save owner still validates and accepts/refuses replacement.
    const accepted = await replace();
    await this.commit(history => {
      const receipt = history.receipts[this.mode];
      if (staged && receipt?.kind === 'pending' && receipt.newId === newId &&
        pendingRecords(receipt).length === records.length && pendingRecords(receipt).every((row, index) => row.id === records[index].id)) {
        history = this.closePending(history, receipt);
      }
      if (accepted) for (const row of records) history = appendRunRecord(history, row);
      return history;
    });
    return accepted;
  }
}
