import { routeHref } from '../app/routes';
/** Return false after reopening recovery when the player cancels departure. */
export function confirmMenuDeparture(unsaved: () => boolean, recover: () => void): boolean {
  if (unsaved() && !window.confirm('Progress is unsaved. Leave this journey? Cancel to access Save recovery.')) {
    recover(); return false;
  }
  return true;
}
/** Keep save/recovery available if the current owner reports unsaved progress. */
export function menuReturnLink(unsaved?: () => boolean, recover?: () => void, beforeLeave?: () => void | boolean | Promise<void | boolean>) {
  const link = document.createElement('a'); link.href = routeHref('menu', import.meta.env.BASE_URL);
  link.textContent = 'Main menu'; link.className = 'run-entry-link';
  if (!unsaved || !recover) return link;
  link.addEventListener('click', async event => {
    if (beforeLeave && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); if (await beforeLeave() === false) return;
      if (confirmMenuDeparture(unsaved, recover)) location.assign(link.href);
    } else if (!confirmMenuDeparture(unsaved, recover)) event.preventDefault();
  });
  return link;
}
