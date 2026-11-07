/** Preparation/loading screens can own the UI while the battle status is hidden. */
export function showGameError(message: string): void {
  const status = document.querySelector<HTMLElement>('#fit-status');
  if (status) {
    status.textContent = message;
    status.setAttribute('role', 'alert');
  }
  const screen = document.querySelector<HTMLElement>('#run-screen:not([hidden]), #dungeon-screen:not([hidden])');
  if (!screen) { status?.scrollIntoView({ block: 'nearest' }); return; }
  let alert = screen.querySelector<HTMLElement>('#game-error');
  if (!alert) {
    alert = document.createElement('p');
    alert.id = 'game-error';
    alert.setAttribute('role', 'alert');
    screen.prepend(alert);
  }
  alert.textContent = message;
  alert.scrollIntoView({ block: 'nearest' });
}
