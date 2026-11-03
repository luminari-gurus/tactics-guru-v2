export const COMBAT_CONTROLS_KEY = 'tactics-guru:combat-controls';
export type CombatControlsPreference = 'auto' | 'radial' | 'rail';
export type CombatSkin = 'radial' | 'rail';
export const COMBAT_CONTROLS_CHANGE = 'combat-controls-change';
const TEST_OVERRIDE = '__tacticsGuruCombatControls';
let unsavedPreference: CombatControlsPreference | null = null;

export function readCombatControlsPreference(storage?: Storage | null): CombatControlsPreference {
  try {
    const injected = (globalThis as Record<string, unknown>)[TEST_OVERRIDE];
    if (injected === 'radial' || injected === 'rail' || injected === 'auto') return injected;
  } catch { /* Ignore missing globals in non-DOM unit tests. */ }
  if (storage == null && unsavedPreference !== null) return unsavedPreference;
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(COMBAT_CONTROLS_KEY);
    if (raw === 'radial' || raw === 'rail' || raw === 'auto') return raw;
  } catch { /* Private mode and missing storage both fall back to Auto. */ }
  return 'auto';
}

export function writeCombatControlsPreference(value: CombatControlsPreference, storage?: Storage | null): boolean {
  let saved = false;
  try {
    (storage ?? globalThis.localStorage)?.setItem(COMBAT_CONTROLS_KEY, value);
    saved = true;
  } catch { /* Retain the choice in memory when storage is unavailable. */ }
  if (storage == null) unsavedPreference = saved ? null : value;
  globalThis.dispatchEvent?.(new Event(COMBAT_CONTROLS_CHANGE));
  return saved;
}

export function isCoarsePointer(query: (query: string) => { matches: boolean } = (q) => matchMedia(q)): boolean {
  try { return query('(pointer: coarse)').matches; }
  catch { return false; }
}

/** Preference first; Auto then uses coarse pointer, including landscape tablets. */
export function resolveCombatControlsSkin(
  preference: CombatControlsPreference = readCombatControlsPreference(),
  coarse = isCoarsePointer(),
): CombatSkin {
  if (preference === 'radial' || preference === 'rail') return preference;
  return coarse ? 'radial' : 'rail';
}

type MediaQueryLike = {
  matches: boolean;
  addEventListener?: (type: string, fn: () => void) => void;
  removeEventListener?: (type: string, fn: () => void) => void;
};

export function watchCombatControls(onChange: () => void, query: (q: string) => MediaQueryList | MediaQueryLike = (q) => matchMedia(q)): () => void {
  const media = query('(pointer: coarse)');
  const handle = () => onChange();
  media.addEventListener?.('change', handle);
  globalThis.addEventListener?.(COMBAT_CONTROLS_CHANGE, handle);
  globalThis.addEventListener?.('storage', handle);
  return () => {
    media.removeEventListener?.('change', handle);
    globalThis.removeEventListener?.(COMBAT_CONTROLS_CHANGE, handle);
    globalThis.removeEventListener?.('storage', handle);
  };
}

export function mountCombatControlsPreference(parent: HTMLElement): void {
  if (parent.querySelector('[data-combat-controls]')) return;
  const field = document.createElement('fieldset');
  field.dataset.combatControls = '';
  const legend = document.createElement('legend');
  legend.textContent = 'Combat controls';
  field.append(legend, document.createTextNode(' Auto uses the radial menu on touch-first devices, including landscape tablets, and the rail on a mouse or trackpad.'));
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const refresh = () => {
    const preference = readCombatControlsPreference();
    field.querySelectorAll<HTMLInputElement>('input[name="combat-controls"]').forEach((input) => { input.checked = input.value === preference; });
    const skin = resolveCombatControlsSkin(preference);
    status.textContent = preference === 'auto'
      ? `Auto · currently ${skin === 'radial' ? 'radial (touch)' : 'rail (fine pointer)'}.`
      : `${preference === 'radial' ? 'Radial' : 'Rail'} · saved on this device.`;
  };
  for (const [value, label] of [['auto', 'Auto'], ['radial', 'Radial'], ['rail', 'Rail']] as const) {
    const item = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'combat-controls'; input.value = value;
    input.addEventListener('change', () => {
      const stored = writeCombatControlsPreference(value);
      refresh();
      if (!stored) status.textContent = 'This browser could not save your preference. The choice applies until you leave the page.';
    });
    item.append(input, ` ${label}`);
    field.append(item);
  }
  field.append(status);
  parent.append(field);
  refresh();
}
