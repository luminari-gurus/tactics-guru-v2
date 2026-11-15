export type CombatPace = 'normal' | 'fast';
export const COMBAT_PACE_KEY = 'tactics-guru:combat-pace';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
type Memory = { last: CombatPace; pending?: CombatPace };
type Decoded = { pace: CombatPace; writable: boolean; fields?: Record<string, unknown> };
const MAX_STORED_LENGTH = 4_096;
const pageMemory: Memory = { last: 'normal' };
const injectedMemory = new WeakMap<PreferenceStorage, Memory>();
const watchers = new Set<() => void>();
let mountedCount = 0;

function validPace(value: unknown): value is CombatPace { return value === 'normal' || value === 'fast'; }
function decode(raw: string | null): Decoded {
  if (raw === null) return { pace: 'normal', writable: true };
  // An unbounded envelope may belong to a future version; leave it intact.
  if (raw.length > MAX_STORED_LENGTH) return { pace: 'normal', writable: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const fields = value as Record<string, unknown>;
      if (typeof fields.version === 'number' && fields.version > 1) return { pace: 'normal', writable: false };
      if (fields.version === 1 && validPace(fields.pace)) return { pace: fields.pace, writable: true, fields };
    }
  } catch { /* Malformed preferences use Normal until an explicit choice repairs them. */ }
  return { pace: 'normal', writable: true };
}

function readContext(storage?: PreferenceStorage) {
  let memory = pageMemory;
  if (storage !== undefined) {
    memory = injectedMemory.get(storage) ?? { last: 'normal' };
    injectedMemory.set(storage, memory);
  }
  let destination: PreferenceStorage | undefined, decoded: Decoded | undefined;
  try {
    destination = storage ?? globalThis.localStorage;
    if (destination) decoded = decode(destination.getItem(COMBAT_PACE_KEY));
  } catch { /* Keep the last readable pace and any unsaved explicit choice. */ }
  if (decoded) memory.last = decoded.pace;
  return { memory, destination, decoded };
}

/** Presentation only: reading never writes or accesses combat saves. */
export function readCombatPacePreference(storage?: PreferenceStorage): CombatPace {
  const { memory } = readContext(storage);
  return memory.pending ?? memory.last;
}

/** Normal is the reset choice. False means the choice is retained only for this visit. */
export function writeCombatPacePreference(pace: CombatPace, storage?: PreferenceStorage): boolean {
  if (!validPace(pace)) return false;
  const { memory, destination, decoded } = readContext(storage);
  memory.pending = pace;
  let saved = false;
  // Do not downgrade a future version or replace an envelope we could not read.
  if (destination && decoded?.writable) {
    try {
      const serialized = JSON.stringify({ ...decoded.fields, version: 1, pace });
      if (serialized.length <= MAX_STORED_LENGTH) {
        destination.setItem(COMBAT_PACE_KEY, serialized);
        memory.last = pace;
        memory.pending = undefined;
        saved = true;
      }
    } catch { /* Retry persistence only on the next explicit choice. */ }
  }
  if (storage === undefined) notify();
  return saved;
}

function notify() { for (const watcher of [...watchers]) watcher(); }
function storageChanged(event: StorageEvent) {
  if (event.key !== COMBAT_PACE_KEY && event.key !== null) return;
  try {
    if (event.storageArea && event.storageArea !== globalThis.localStorage) return;
  } catch { return; }
  pageMemory.last = decode(event.newValue).pace;
  notify();
}

export function watchCombatPacePreference(onChange: () => void): () => void {
  const listener = () => onChange();
  watchers.add(listener);
  if (watchers.size === 1) globalThis.addEventListener?.('storage', storageChanged);
  return () => {
    watchers.delete(listener);
    if (!watchers.size) globalThis.removeEventListener?.('storage', storageChanged);
  };
}

export function mountCombatPacePreference(parent: HTMLElement): () => void {
  if (parent.querySelector('[data-combat-pace]')) return () => {};
  const abort = new AbortController(), document = parent.ownerDocument;
  const field = document.createElement('fieldset'); field.dataset.combatPace = '';
  const legend = document.createElement('legend'); legend.textContent = 'Battle speed';
  const name = `combat-pace-${++mountedCount}`;
  const help = document.createElement('p'); help.id = `${name}-help`;
  help.textContent = 'Affects battle animations. Changes apply to the next action. Reduced motion omits travel and effects, and keeps result text. Choose Normal to reset battle speed.';
  field.setAttribute('aria-describedby', help.id);
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const inputs: HTMLInputElement[] = [];
  const refresh = () => {
    const pace = readCombatPacePreference();
    for (const input of inputs) input.checked = input.value === pace;
    status.textContent = pageMemory.pending === undefined ? ''
      : 'This browser could not save your battle speed. The choice applies until you leave the page.';
  };
  field.append(legend);
  for (const [pace, text] of [['normal', 'Normal'], ['fast', 'Fast (2×)']] as const) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = pace; input.dataset.combatPaceValue = pace;
    input.setAttribute('aria-describedby', help.id);
    input.addEventListener('change', () => {
      if (!input.checked) return;
      writeCombatPacePreference(pace);
      refresh();
    }, { signal: abort.signal });
    inputs.push(input); label.append(input, ` ${text}`); field.append(label);
  }
  field.append(help, status); parent.append(field);
  const unwatch = watchCombatPacePreference(refresh);
  refresh();
  return () => { abort.abort(); unwatch(); field.remove(); };
}
