import { routeHref } from '../app/routes';
/** Return false after reopening recovery when the player cancels departure. */
export function confirmMenuDeparture(unsaved: () => boolean, recover: () => void): boolean {
  if (unsaved() && !window.confirm('Progress is unsaved. Leave for the main menu? Cancel to access Save recovery.')) {
    recover(); return false;
  }
  return true;
}
/** Keep save/recovery available if the current owner reports unsaved progress. */
export function menuReturnLink(unsaved: () => boolean, recover: () => void) {
  const link = document.createElement('a'); link.href = routeHref('menu', import.meta.env.BASE_URL);
  link.textContent = 'Main menu'; link.className = 'run-entry-link';
  link.addEventListener('click', event => {
    if (!confirmMenuDeparture(unsaved, recover)) event.preventDefault();
  });
  return link;
}
