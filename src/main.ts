const basePath = new URL(import.meta.env.BASE_URL, location.origin).pathname.replace(/\/$/, '');
const path = location.pathname.replace(/\/$/, '');
if (path === `${basePath}/map`) {
  const { startMap } = await import('./map/view');
  startMap();
} else {
  await import('./app/startBattleApp');
}
