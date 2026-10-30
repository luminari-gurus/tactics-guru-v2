import { routeHref } from '../app/routes';
/** Keep save/recovery available if the current owner reports unsaved progress. */
export function menuReturnLink(unsaved: () => boolean, recover: () => void) {
  const link = document.createElement('a'); link.href = routeHref('menu', import.meta.env.BASE_URL);
  link.textContent = 'Main menu'; link.className = 'run-entry-link';
  link.addEventListener('click', event => {
    if (unsaved() && !window.confirm('Progress is unsaved. Leave for the main menu? Cancel to access Save recovery.')) {
      event.preventDefault(); recover();
    }
  });
  return link;
}
