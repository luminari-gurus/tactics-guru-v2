export const ROUTINE_CUTSCENES_KEY = 'tactics-guru:routine-cutscenes';
let unsavedPreference: boolean | undefined;

export function routineCutscenesEnabled(): boolean {
  if (unsavedPreference !== undefined) return unsavedPreference;
  try {
    return localStorage.getItem(ROUTINE_CUTSCENES_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function mountCutscenePreference(parent: HTMLElement): void {
  const label = document.createElement('label');
  label.className = 'menu-cutscene-setting';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = routineCutscenesEnabled();
  const help = document.createElement('p');
  help.id = 'routine-cutscenes-help';
  help.textContent = 'Turn off to skip routine cutscenes, including dungeon battle victory and defeat. Designated story or progression cutscenes may still play. You can skip any cutscene.';
  input.setAttribute('aria-describedby', help.id);
  const status = document.createElement('div');
  status.setAttribute('role', 'status');
  input.addEventListener('change', () => {
    try {
      localStorage.setItem(ROUTINE_CUTSCENES_KEY, input.checked ? 'on' : 'off');
      unsavedPreference = undefined;
      status.textContent = '';
    } catch {
      unsavedPreference = input.checked;
      status.textContent = 'This browser could not save your preference. The choice applies until you leave the page.';
    }
  });
  label.append(input, ' Play routine cutscenes');
  parent.append(label, help, status);
}
