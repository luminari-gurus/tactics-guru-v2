export const AUTO_COLLECT_LOOT_KEY = 'tactics-guru:auto-collect-loot';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
let unsavedPreference: boolean | undefined;

/** Read when a victory is accepted; changing this preference never starts movement. */
export function readAutoCollectLootPreference(storage?: PreferenceStorage): boolean {
  if (storage === undefined && unsavedPreference !== undefined) return unsavedPreference;
  try {
    return (storage ?? globalThis.localStorage)?.getItem(AUTO_COLLECT_LOOT_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeAutoCollectLootPreference(enabled: boolean, storage?: PreferenceStorage): boolean {
  let saved = false;
  try {
    const destination = storage ?? globalThis.localStorage;
    if (destination) {
      destination.setItem(AUTO_COLLECT_LOOT_KEY, enabled ? 'on' : 'off');
      saved = true;
    }
  } catch { /* Keep the preference for this visit when browser storage is unavailable. */ }
  if (storage === undefined) unsavedPreference = saved ? undefined : enabled;
  return saved;
}

export function mountAutoCollectLootPreference(parent: HTMLElement): void {
  if (parent.querySelector('[data-auto-collect-loot]')) return;
  const field = document.createElement('fieldset');
  field.dataset.autoCollectLoot = '';
  const legend = document.createElement('legend');
  legend.textContent = 'Dungeon loot';
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = readAutoCollectLootPreference();
  const help = document.createElement('p');
  help.id = 'auto-collect-loot-help';
  help.textContent = "After victory, automatically move onto the defeated enemy's square and collect its loot.";
  input.setAttribute('aria-describedby', help.id);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  input.addEventListener('change', () => {
    status.textContent = writeAutoCollectLootPreference(input.checked)
      ? ''
      : 'This browser could not save your preference. The choice applies until you leave the page.';
  });
  label.append(input, ' Auto-collect loot');
  field.append(legend, label, help, status);
  parent.append(field);
}
