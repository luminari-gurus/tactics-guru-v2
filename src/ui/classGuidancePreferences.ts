export const CLASS_GUIDANCE_KEY = 'tactics-guru:class-guidance';
export const CLASS_GUIDANCE_MAX_SEEN = 128;
export type ClassGuidancePreferences = {
  readonly version: 1;
  readonly enabled: boolean;
  readonly seen: readonly string[];
};
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
type DismissedRun = { readonly runId: string; readonly ids: readonly string[] };
type Envelope = { preferences: ClassGuidancePreferences; dismissedRuns: readonly DismissedRun[]; fields: Record<string, unknown>; resetRevision: number };
type Pending = { enabled?: boolean; reset: boolean; seen: readonly string[]; dismissedRuns: readonly DismissedRun[] };
type Memory = { last: Envelope; pending: Pending };
type ReadResult = { kind: 'known' | 'empty' | 'invalid'; envelope: Envelope } | { kind: 'future' | 'unavailable' };
const MAX_STORED_LENGTH = 32_768;
const MAX_DISMISSED_RUNS = 8;
const MAX_DISMISSED_IDS = 128;
const emptyEnvelope = (): Envelope => ({ preferences: { version: 1, enabled: true, seen: [] }, dismissedRuns: [], fields: {}, resetRevision: 0 });
const emptyPending = (): Pending => ({ reset: false, seen: [], dismissedRuns: [] });
const createMemory = (): Memory => ({ last: emptyEnvelope(), pending: emptyPending() });
const pageMemory = createMemory();
const injectedMemory = new WeakMap<PreferenceStorage, Memory>();
const watchers = new Set<(reset: boolean) => void>();
let mountedCount = 0;

function validLesson(id: unknown): id is string {
  return typeof id === 'string' && id.length <= 96 &&
    (/^preview:(rail|radial):v1$/.test(id) || /^skill:ability:[a-z][a-z0-9]*(?:_[a-z0-9]+)*:v1$/.test(id));
}
function lessonIds(ids: readonly unknown[]): string[] {
  return [...new Set(ids.filter(validLesson))].slice(-CLASS_GUIDANCE_MAX_SEEN);
}
function validRunId(id: unknown): id is string {
  return typeof id === 'string' && id.length <= 96 && /^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(id);
}
/** Keep recent run scopes bounded independently of permanent lesson history. */
function dismissedRuns(records: readonly unknown[]): DismissedRun[] {
  const runs = new Map<string, string[]>();
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
    const { runId, ids } = record as Record<string, unknown>;
    if (!validRunId(runId) || !Array.isArray(ids)) continue;
    const skills = lessonIds(ids).filter(id => id.startsWith('skill:'));
    if (!skills.length) continue;
    const merged = lessonIds([...(runs.get(runId) ?? []), ...skills]);
    runs.delete(runId);
    runs.set(runId, merged);
    if (runs.size > MAX_DISMISSED_RUNS) runs.delete(runs.keys().next().value!);
  }
  let remaining = MAX_DISMISSED_IDS;
  const bounded: DismissedRun[] = [];
  for (const [runId, ids] of [...runs].reverse()) {
    if (!remaining) break;
    const kept = ids.slice(-remaining);
    bounded.unshift({ runId, ids: kept });
    remaining -= kept.length;
  }
  return bounded;
}
function decode(raw: string | null): ReadResult {
  if (raw === null) return { kind: 'empty', envelope: emptyEnvelope() };
  if (raw.length > MAX_STORED_LENGTH) return { kind: 'invalid', envelope: emptyEnvelope() };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { kind: 'invalid', envelope: emptyEnvelope() };
    const fields = value as Record<string, unknown>;
    if (typeof fields.version === 'number' && fields.version > 1) return { kind: 'future' };
    if (fields.version !== 1 || typeof fields.enabled !== 'boolean' || !Array.isArray(fields.seen)) {
      return { kind: 'invalid', envelope: emptyEnvelope() };
    }
    return { kind: 'known', envelope: {
      preferences: { version: 1, enabled: fields.enabled, seen: lessonIds(fields.seen) }, fields,
      dismissedRuns: dismissedRuns(Array.isArray(fields.dismissedRuns) ? fields.dismissedRuns : []),
      resetRevision: typeof fields.resetRevision === 'number' && Number.isSafeInteger(fields.resetRevision) && fields.resetRevision >= 0
        ? fields.resetRevision : 0,
    } };
  } catch { return { kind: 'invalid', envelope: emptyEnvelope() }; }
}
function readContext(storage?: PreferenceStorage) {
  let memory = pageMemory;
  if (storage !== undefined) {
    memory = injectedMemory.get(storage) ?? createMemory();
    injectedMemory.set(storage, memory);
  }
  let destination: PreferenceStorage | undefined, result: ReadResult = { kind: 'unavailable' };
  try {
    destination = storage ?? globalThis.localStorage;
    if (destination) result = decode(destination.getItem(CLASS_GUIDANCE_KEY));
  } catch { /* Keep the last readable state and explicit choices for this visit. */ }
  if ('envelope' in result) memory.last = result.envelope;
  else if (result.kind === 'future') memory.last = emptyEnvelope();
  return { memory, destination, result };
}
function effective(memory: Memory): ClassGuidancePreferences {
  return { version: 1, enabled: memory.pending.enabled ?? memory.last.preferences.enabled,
    seen: lessonIds([...(memory.pending.reset ? [] : memory.last.preferences.seen), ...memory.pending.seen]) };
}
function effectiveDismissedRuns(memory: Memory): DismissedRun[] {
  return dismissedRuns([...(memory.pending.reset ? [] : memory.last.dismissedRuns), ...memory.pending.dismissedRuns]);
}
function hasPending(memory: Memory) {
  return memory.pending.enabled !== undefined || memory.pending.reset || memory.pending.seen.length > 0 || memory.pending.dismissedRuns.length > 0;
}
function notify(reset: boolean) { for (const watcher of [...watchers]) watcher(reset); }

/** Reading never writes preferences, acknowledges lessons, or accesses combat saves. */
export function readClassGuidancePreferences(storage?: PreferenceStorage): ClassGuidancePreferences {
  return effective(readContext(storage).memory);
}
/** Run dismissals are presentation preferences, separate from battle saves. */
export function readClassGuidanceDismissed(runId: string, storage?: PreferenceStorage): readonly string[] {
  if (!validRunId(runId)) return [];
  return effectiveDismissedRuns(readContext(storage).memory).find(run => run.runId === runId)?.ids ?? [];
}
function update(change: (pending: Pending) => Pending, reset: boolean, storage?: PreferenceStorage): boolean {
  const { memory, destination, result } = readContext(storage);
  memory.pending = change(memory.pending);
  const preferences = effective(memory);
  const runs = effectiveDismissedRuns(memory);
  const resetRevision = memory.pending.reset
    ? (memory.last.resetRevision === Number.MAX_SAFE_INTEGER ? 0 : memory.last.resetRevision + 1)
    : memory.last.resetRevision;
  const fields = { ...memory.last.fields, ...preferences, dismissedRuns: runs, resetRevision };
  let saved = false;
  // Do not downgrade a future version or replace fields we could not read.
  if (destination && result.kind !== 'future' && result.kind !== 'unavailable') {
    try {
      const serialized = JSON.stringify(fields);
      if (serialized.length <= MAX_STORED_LENGTH) {
        destination.setItem(CLASS_GUIDANCE_KEY, serialized);
        memory.last = { preferences, dismissedRuns: runs, fields, resetRevision };
        memory.pending = emptyPending();
        saved = true;
      }
    } catch { /* Pending field changes are merged with fresh storage on the next explicit write. */ }
  }
  if (storage === undefined) notify(reset);
  return saved;
}
export function setClassGuidanceEnabled(enabled: boolean, storage?: PreferenceStorage): boolean {
  if (typeof enabled !== 'boolean') return false;
  return update(pending => ({ ...pending, enabled }), false, storage);
}
export function markClassGuidanceSeen(ids: readonly string[], storage?: PreferenceStorage): boolean {
  const seen = lessonIds(ids);
  if (!seen.length) return false;
  return update(pending => ({ ...pending, seen: lessonIds([...pending.seen, ...seen]) }), false, storage);
}
/** Acknowledge the displayed lessons and suppress their skill tips for this run atomically. */
export function dismissClassGuidanceTip(runId: string, ids: readonly string[], storage?: PreferenceStorage): boolean {
  const seen = lessonIds(ids);
  if (!validRunId(runId) || !seen.length) return false;
  return update(pending => ({ ...pending, seen: lessonIds([...pending.seen, ...seen]),
    dismissedRuns: dismissedRuns([...pending.dismissedRuns, { runId, ids: seen }]),
  }), false, storage);
}
export function resetClassGuidanceTutorials(storage?: PreferenceStorage): boolean {
  return update(pending => ({ ...pending, reset: true, seen: [], dismissedRuns: [] }), true, storage);
}

function storageChanged(event: StorageEvent) {
  if (event.key !== CLASS_GUIDANCE_KEY && event.key !== null) return;
  try {
    if (event.storageArea && event.storageArea !== globalThis.localStorage) return;
  } catch { return; }
  const before = decode(event.oldValue), after = decode(event.newValue);
  const reset = event.key === null || event.newValue === null ||
    after.kind === 'known' && after.envelope.resetRevision !== ('envelope' in before ? before.envelope.resetRevision : 0);
  if (reset) pageMemory.pending = { ...pageMemory.pending, reset: false, seen: [], dismissedRuns: [] };
  if ('envelope' in after) pageMemory.last = after.envelope;
  notify(reset);
}

/** Reset is distinct from normal updates so open HUDs can clear run dismissals. */
export function watchClassGuidancePreferences(onChange: (reset: boolean) => void): () => void {
  const listener = (reset: boolean) => onChange(reset);
  watchers.add(listener);
  if (watchers.size === 1) globalThis.addEventListener?.('storage', storageChanged);
  return () => {
    watchers.delete(listener);
    if (!watchers.size) globalThis.removeEventListener?.('storage', storageChanged);
  };
}

export function mountClassGuidancePreferences(parent: HTMLElement): () => void {
  if (parent.querySelector('[data-class-guidance-preferences]')) return () => {};
  const abort = new AbortController();
  const field = document.createElement('fieldset');
  field.dataset.classGuidancePreferences = '';
  const legend = document.createElement('legend'); legend.textContent = 'Battle guidance';
  const label = document.createElement('label');
  const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.classGuidanceEnabled = '';
  const help = document.createElement('p'); help.id = `class-guidance-help-${++mountedCount}`;
  help.textContent = 'Show class tips for your current hero. Dismissing a tip hides that tip for the rest of this run and marks its lessons as seen. Other tips can still appear. Reset tutorials to show dismissed tips and preview/confirm guidance again; your Class tips choice stays unchanged.';
  input.setAttribute('aria-describedby', help.id);
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Reset tutorials';
  reset.dataset.classGuidanceReset = ''; reset.setAttribute('aria-describedby', help.id);
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const unsaved = 'This browser could not save your guidance preferences. Your choices apply until you leave the page.';
  const refresh = () => {
    input.checked = readClassGuidancePreferences().enabled;
    status.textContent = hasPending(pageMemory) ? unsaved : '';
  };
  input.addEventListener('change', () => {
    const saved = setClassGuidanceEnabled(input.checked);
    refresh(); if (!saved) status.textContent = unsaved;
  }, { signal: abort.signal });
  reset.addEventListener('click', () => {
    const saved = resetClassGuidanceTutorials();
    refresh(); status.textContent = saved ? 'Tutorials reset. Your Class tips choice is unchanged.' : unsaved;
  }, { signal: abort.signal });
  label.append(input, ' Class tips'); field.append(legend, label, help, reset, status); parent.append(field);
  const unwatch = watchClassGuidancePreferences(refresh);
  refresh();
  return () => { abort.abort(); unwatch(); field.remove(); };
}
