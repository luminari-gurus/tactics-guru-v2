import type { RunState } from './run';
import type { DungeonState } from './dungeon';
import { hasShape, isDenseArray, isPlainRecord } from './validation';
import { authoredWins, dungeonProgressStats, readRunStats, type RunStats } from './runStats';
import { canonical } from './contentIdentity';

export const RECORD_LIMIT = 100;
export const RECORD_MODES = ['run', 'dungeon'] as const;
export type RecordMode = typeof RECORD_MODES[number];
export type RecordStats = Omit<RunStats, 'boundary'>;
export const BEST_STATS = ['enemiesKilled', 'battlesWon', 'movesTaken', 'floorsCleared', 'activeMs'] as const;
export type BestStat = typeof BEST_STATS[number];
export type BestRuns = Readonly<Record<RecordMode, Readonly<Partial<Record<BestStat, RunRecord>>>>>;
export interface RunRecord {
  readonly mode: RecordMode; readonly id: string;
  readonly outcome: 'victory' | 'defeat' | 'abandoned'; readonly recordedAt: number;
  readonly battlesWon: number; readonly floorsCleared: number | null; readonly deepestFloor: number | null;
  readonly stats?: RecordStats;
}
export type SealedRecordReceipt = { readonly kind: 'sealed'; readonly id: string; readonly otherId?: string };
export type PendingRecordReceipt = { readonly kind: 'pending'; readonly record: RunRecord; readonly newId: string;
  readonly other?: RunRecord; readonly sealed?: SealedRecordReceipt };
export type RecordReceipt = SealedRecordReceipt | PendingRecordReceipt;
export interface RunRecords {
  readonly version: 2; readonly records: readonly RunRecord[];
  readonly bests: BestRuns;
  readonly legacyBestCoverage: boolean;
  readonly receipts: Readonly<Record<RecordMode, RecordReceipt | null>>;
}
const idOk = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id);
const count = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
export const recordKey = (record: Pick<RunRecord, 'mode' | 'id'>) => `${record.mode}:${record.id}`;
export const emptyRunRecords = (): RunRecords => ({ version: 2, records: [], receipts: { run: null, dungeon: null },
  bests: { run: {}, dungeon: {} }, legacyBestCoverage: false });
export const compareRunRecords = (a: RunRecord, b: RunRecord) => b.recordedAt - a.recordedAt ||
  (recordKey(a) < recordKey(b) ? -1 : recordKey(a) > recordKey(b) ? 1 : 0);
export function recordStatValue(record: RunRecord, stat: BestStat): number | null {
  if (stat === 'battlesWon' || stat === 'floorsCleared') return record[stat];
  if (stat === 'activeMs') return record.stats?.timeCoverage === 'whole-run' ? record.stats.activeMs : null;
  return record.stats?.coverage === 'whole-run' ? record.stats[stat] : null;
}
const counterOnlyStats = (input: unknown) => isPlainRecord(input) && isPlainRecord(input.stats) && input.stats.version === 1;
function winningRuns(previous: BestRuns, records: readonly RunRecord[]): BestRuns {
  const bests = { run: { ...previous.run }, dungeon: { ...previous.dungeon } };
  for (const record of records) for (const stat of BEST_STATS) {
    const value = recordStatValue(record, stat), old = bests[record.mode][stat];
    if (value !== null && (!old || value > recordStatValue(old, stat)! ||
      value === recordStatValue(old, stat) && compareRunRecords(record, old) < 0)) bests[record.mode][stat] = record;
  }
  return bests;
}
function summaryStats(stats: RunStats | undefined): { stats?: RecordStats } {
  if (!stats) return {};
  const { boundary: _, ...summary } = stats; return { stats: summary };
}
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
  history.records.some(row => recordKey(row) === recordKey(record)) || sealedRecordIds(history.receipts[record.mode]).includes(record.id) ||
  Object.values(history.bests[record.mode]).some(row => row.id === record.id);

function readSeal(input: unknown): SealedRecordReceipt | null {
  if ((!hasShape(input, ['kind', 'id']) && !hasShape(input, ['kind', 'id', 'otherId'])) ||
    input.kind !== 'sealed' || !idOk(input.id) || Object.hasOwn(input, 'otherId') &&
    (!idOk(input.otherId) || input.otherId === input.id)) return null;
  return { kind: 'sealed', id: input.id, ...(Object.hasOwn(input, 'otherId') ? { otherId: input.otherId as string } : {}) };
}

export function readRunRecord(input: unknown): RunRecord | null {
  const tracked = isPlainRecord(input) && Object.hasOwn(input, 'stats');
  if (!hasShape(input, ['mode', 'id', 'outcome', 'recordedAt', 'battlesWon', 'floorsCleared', 'deepestFloor', ...(tracked ? ['stats'] : [])]) ||
    !RECORD_MODES.includes(input.mode as RecordMode) || !idOk(input.id) ||
    !['victory', 'defeat', 'abandoned'].includes(input.outcome as string) || !count(input.recordedAt, 8_640_000_000_000_000) ||
    !count(input.battlesWon, input.mode === 'run' ? 3 : 8192 * 3)) return null;
  if (input.mode === 'run' ? input.floorsCleared !== null || input.deepestFloor !== null ||
    (input.outcome === 'victory' ? input.battlesWon !== 3 : input.battlesWon === 3)
    : input.outcome === 'victory' || !count(input.deepestFloor, 8192) || input.deepestFloor === 0 ||
      !count(input.floorsCleared, input.deepestFloor) || input.battlesWon < input.floorsCleared * 3 || input.battlesWon > input.deepestFloor * 3) return null;
  if (tracked) {
    if (!hasShape(input.stats, ['version', 'coverage', 'enemiesKilled', 'movesTaken', 'activeMs']) &&
      !hasShape(input.stats, ['version', 'coverage', 'timeCoverage', 'enemiesKilled', 'movesTaken', 'activeMs'])) return null;
    const stats = readRunStats({ ...input.stats, boundary: null }); if (!stats) return null;
    return { ...input, ...summaryStats(stats) } as unknown as RunRecord;
  }
  return { ...input } as unknown as RunRecord;
}

/** Callers supply a validated authoritative run, never a rendered counter. */
export function authoredRunRecord(run: RunState, recordedAt: number, abandoning = false, stats?: RunStats): RunRecord | null {
  const terminal = run.phase === 'victory' || run.phase === 'defeat';
  if (!terminal && !abandoning) return null;
  return readRunRecord({ mode: 'run', id: run.id, outcome: terminal ? run.phase : 'abandoned', recordedAt,
    battlesWon: authoredWins(run),
    floorsCleared: null, deepestFloor: null, ...summaryStats(stats) });
}
/** Validated floor.completed is the cardinality of its unique cleared slots. No dungeon/content runtime import. */
export function dungeonRunRecord(state: DungeonState, recordedAt: number, abandoning = false): RunRecord | null {
  if (state.phase !== 'defeat' && !abandoning) return null;
  return readRunRecord({ mode: 'dungeon', id: state.id, outcome: state.phase === 'defeat' ? 'defeat' : 'abandoned', recordedAt,
    ...dungeonProgressStats(state),
    deepestFloor: Math.max(...state.floors.map(f => f.descriptor.depth)), ...summaryStats(state.stats) });
}

export function readRunRecords(input: unknown): RunRecords | null {
  if (!isPlainRecord(input)) return null;
  const legacy = input.version === 1;
  if (!hasShape(input, ['version', 'records', 'receipts', ...(legacy ? [] : ['bests', 'legacyBestCoverage'])]) ||
    (!legacy && (input.version !== 2 || typeof input.legacyBestCoverage !== 'boolean')) || !isDenseArray(input.records, RECORD_LIMIT) ||
    !hasShape(input.receipts, RECORD_MODES)) return null;
  const records: RunRecord[] = [], receipts: Record<RecordMode, RecordReceipt | null> = { run: null, dungeon: null };
  let limitedTime = false;
  for (const entry of input.records) {
    const record = readRunRecord(entry);
    if (!record || legacy && record.stats || records.some(r => recordKey(r) === recordKey(record))) return null;
    if (counterOnlyStats(entry)) limitedTime = true;
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
      if (!record || legacy && record.stats || record.mode !== mode || record.id === receipt.newId) return null;
      const other = hasOther ? readRunRecord(receipt.other) : null, previousSeal = hasSeal ? readSeal(receipt.sealed) : null;
      if (hasOther && (!other || legacy && other.stats || other.mode !== mode || other.id === record.id || other.id === receipt.newId) || hasSeal && !previousSeal) return null;
      receipts[mode] = { kind: 'pending', record, newId: receipt.newId,
        ...(other ? { other } : {}), ...(previousSeal ? { sealed: previousSeal } : {}) };
    } else return null;
  }
  const retained: RunRecord[] = [];
  if (!legacy) {
    if (!hasShape(input.bests, RECORD_MODES)) return null;
    for (const mode of RECORD_MODES) {
      const winners = input.bests[mode];
      if (!isPlainRecord(winners) || !hasShape(winners, Object.keys(winners)) ||
        Object.keys(winners).some(key => !BEST_STATS.includes(key as BestStat))) return null;
      for (const [key, value] of Object.entries(winners)) {
        const record = readRunRecord(value);
        if (!record || record.mode !== mode) return null;
        const untimed = counterOnlyStats(value);
        if (recordStatValue(record, key as BestStat) === null &&
          !(key === 'activeMs' && untimed && record.stats?.coverage === 'whole-run')) return null;
        if (untimed) limitedTime = true;
        const same = [...records, ...retained].find(row => recordKey(row) === recordKey(record));
        if (same && canonical(same) !== canonical(record)) return null;
        retained.push(record);
      }
    }
  }
  return { version: 2, records: records.sort(compareRunRecords), receipts,
    bests: winningRuns({ run: {}, dungeon: {} }, [...retained, ...records]),
    legacyBestCoverage: legacy || limitedTime || input.legacyBestCoverage === true };
}

/** First result wins, including after its visible entry is evicted while its terminal save still exists. */
export function appendRunRecord(history: RunRecords, record: RunRecord): RunRecords {
  const receipt = history.receipts[record.mode];
  if (isRecorded(history, record)) return history;
  record = { ...record, ...(record.stats ? { stats: { ...record.stats } } : {}) };
  const sealed = sealedRecordReceipt([record.id, ...sealedRecordIds(receipt)])!;
  return { ...history, records: [...history.records, { ...record }].sort(compareRunRecords).slice(0, RECORD_LIMIT),
    bests: winningRuns(history.bests, [record]),
    receipts: { ...history.receipts, [record.mode]: receipt?.kind === 'pending'
      ? receipt.record.id === record.id || receipt.other?.id === record.id ? { ...receipt, sealed } : receipt
      : sealed } };
}
