import type { RunState } from './run';
import type { DungeonState } from './dungeon';
import { hasShape, isDenseArray, isPlainRecord } from './validation';

export const RECORD_LIMIT = 100;
export const RECORD_MODES = ['run', 'dungeon'] as const;
export type RecordMode = typeof RECORD_MODES[number];
export interface RunRecord {
  readonly mode: RecordMode; readonly id: string;
  readonly outcome: 'victory' | 'defeat' | 'abandoned'; readonly recordedAt: number;
  readonly battlesWon: number; readonly floorsCleared: number | null; readonly deepestFloor: number | null;
}
export type SealedRecordReceipt = { readonly kind: 'sealed'; readonly id: string; readonly otherId?: string };
export type PendingRecordReceipt = { readonly kind: 'pending'; readonly record: RunRecord; readonly newId: string;
  readonly other?: RunRecord; readonly sealed?: SealedRecordReceipt };
export type RecordReceipt = SealedRecordReceipt | PendingRecordReceipt;
export interface RunRecords {
  readonly version: 1; readonly records: readonly RunRecord[];
  readonly receipts: Readonly<Record<RecordMode, RecordReceipt | null>>;
}
const idOk = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id);
const count = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
export const recordKey = (record: Pick<RunRecord, 'mode' | 'id'>) => `${record.mode}:${record.id}`;
export const emptyRunRecords = (): RunRecords => ({ version: 1, records: [], receipts: { run: null, dungeon: null } });
export const compareRunRecords = (a: RunRecord, b: RunRecord) => b.recordedAt - a.recordedAt ||
  (recordKey(a) < recordKey(b) ? -1 : recordKey(a) > recordKey(b) ? 1 : 0);
/** A reviewed save and a distinct admitted live journey can both be current. */
export function sealedRecordIds(receipt: RecordReceipt | null): readonly string[] {
  const seal = receipt?.kind === 'pending' ? receipt.sealed : receipt;
  return seal ? [seal.id, ...(seal.otherId ? [seal.otherId] : [])] : [];
}
export function sealedRecordReceipt(ids: readonly string[]): SealedRecordReceipt | null {
  const unique = [...new Set(ids)].slice(0, 2);
  return unique.length ? { kind: 'sealed', id: unique[0], ...(unique[1] ? { otherId: unique[1] } : {}) } : null;
}
export const isRecorded = (history: RunRecords, record: RunRecord) =>
  history.records.some(row => recordKey(row) === recordKey(record)) || sealedRecordIds(history.receipts[record.mode]).includes(record.id);

function readSeal(input: unknown): SealedRecordReceipt | null {
  if ((!hasShape(input, ['kind', 'id']) && !hasShape(input, ['kind', 'id', 'otherId'])) ||
    input.kind !== 'sealed' || !idOk(input.id) || Object.hasOwn(input, 'otherId') &&
    (!idOk(input.otherId) || input.otherId === input.id)) return null;
  return { kind: 'sealed', id: input.id, ...(Object.hasOwn(input, 'otherId') ? { otherId: input.otherId as string } : {}) };
}

export function readRunRecord(input: unknown): RunRecord | null {
  if (!hasShape(input, ['mode', 'id', 'outcome', 'recordedAt', 'battlesWon', 'floorsCleared', 'deepestFloor']) ||
    !RECORD_MODES.includes(input.mode as RecordMode) || !idOk(input.id) ||
    !['victory', 'defeat', 'abandoned'].includes(input.outcome as string) || !count(input.recordedAt, 8_640_000_000_000_000) ||
    !count(input.battlesWon, input.mode === 'run' ? 3 : 8192 * 3)) return null;
  if (input.mode === 'run' ? input.floorsCleared !== null || input.deepestFloor !== null ||
    (input.outcome === 'victory' ? input.battlesWon !== 3 : input.battlesWon === 3)
    : input.outcome === 'victory' || !count(input.deepestFloor, 8192) || input.deepestFloor === 0 ||
      !count(input.floorsCleared, input.deepestFloor) || input.battlesWon < input.floorsCleared * 3 || input.battlesWon > input.deepestFloor * 3) return null;
  return { ...input } as unknown as RunRecord;
}

/** Callers supply a validated authoritative run, never a rendered counter. */
export function authoredRunRecord(run: RunState, recordedAt: number, abandoning = false): RunRecord | null {
  const terminal = run.phase === 'victory' || run.phase === 'defeat';
  if (!terminal && !abandoning) return null;
  return readRunRecord({ mode: 'run', id: run.id, outcome: terminal ? run.phase : 'abandoned', recordedAt,
    battlesWon: run.phase === 'victory' ? 3 : run.encounterIndex + (run.phase === 'reward' ? 1 : 0),
    floorsCleared: null, deepestFloor: null });
}
/** Validated floor.completed is the cardinality of its unique cleared slots. No dungeon/content runtime import. */
export function dungeonRunRecord(state: DungeonState, recordedAt: number, abandoning = false): RunRecord | null {
  if (state.phase !== 'defeat' && !abandoning) return null;
  return readRunRecord({ mode: 'dungeon', id: state.id, outcome: state.phase === 'defeat' ? 'defeat' : 'abandoned', recordedAt,
    battlesWon: state.floors.reduce((sum, f) => sum + f.completed, 0),
    floorsCleared: state.floors.filter(f => f.completed === 3).length,
    deepestFloor: Math.max(...state.floors.map(f => f.descriptor.depth)) });
}

export function readRunRecords(input: unknown): RunRecords | null {
  if (!hasShape(input, ['version', 'records', 'receipts']) || input.version !== 1 || !isDenseArray(input.records, RECORD_LIMIT) ||
    !hasShape(input.receipts, RECORD_MODES)) return null;
  const records: RunRecord[] = [], receipts: Record<RecordMode, RecordReceipt | null> = { run: null, dungeon: null };
  for (const entry of input.records) {
    const record = readRunRecord(entry);
    if (!record || records.some(r => recordKey(r) === recordKey(record))) return null;
    records.push(record);
  }
  for (const mode of RECORD_MODES) {
    const receipt = input.receipts[mode];
    if (receipt === null) continue;
    const seal = readSeal(receipt);
    if (seal) receipts[mode] = seal;
    else if (isPlainRecord(receipt)) {
      const hasOther = Object.hasOwn(receipt, 'other'), hasSeal = Object.hasOwn(receipt, 'sealed');
      if (!hasShape(receipt, ['kind', 'record', 'newId', ...(hasOther ? ['other'] : []), ...(hasSeal ? ['sealed'] : [])]) ||
        receipt.kind !== 'pending' || !idOk(receipt.newId)) return null;
      const record = readRunRecord(receipt.record);
      if (!record || record.mode !== mode || record.id === receipt.newId) return null;
      const other = hasOther ? readRunRecord(receipt.other) : null, previousSeal = hasSeal ? readSeal(receipt.sealed) : null;
      if (hasOther && (!other || other.mode !== mode || other.id === record.id || other.id === receipt.newId) || hasSeal && !previousSeal) return null;
      receipts[mode] = { kind: 'pending', record, newId: receipt.newId,
        ...(other ? { other } : {}), ...(previousSeal ? { sealed: previousSeal } : {}) };
    } else return null;
  }
  return { version: 1, records: records.sort(compareRunRecords), receipts };
}

/** First result wins, including after its visible entry is evicted while its terminal save still exists. */
export function appendRunRecord(history: RunRecords, record: RunRecord): RunRecords {
  const receipt = history.receipts[record.mode];
  if (isRecorded(history, record)) return history;
  const sealed = sealedRecordReceipt([record.id, ...sealedRecordIds(receipt)])!;
  return { ...history, records: [...history.records, { ...record }].sort(compareRunRecords).slice(0, RECORD_LIMIT),
    receipts: { ...history.receipts, [record.mode]: receipt?.kind === 'pending'
      ? receipt.record.id === record.id || receipt.other?.id === record.id ? { ...receipt, sealed } : receipt
      : sealed } };
}
