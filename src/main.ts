const basePath = new URL(import.meta.env.BASE_URL, location.origin).pathname.replace(/\/$/, '');
const path = location.pathname.replace(/\/$/, '');
try {
  if (path === `${basePath}/run`) {
    await import('./app/startRunApp');
  } else if (path === `${basePath}/map`) {
    const { startMap } = await import('./map/view');
    startMap();
  } else {
    await import('./app/startBattleApp');
  }
} catch {
  const status = document.querySelector<HTMLElement>('#fit-status');
  if (status) {
    status.textContent = 'Error: Could not load the application. Reload the page to retry.';
    status.setAttribute('role', 'alert');
  }
}
