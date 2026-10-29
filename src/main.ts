import { mountTelemetryPreferences } from './telemetry/preferences';
import { startTelemetry } from './telemetry/browser';
import { reportFailure } from './telemetry/telemetry';
const basePath = new URL(import.meta.env.BASE_URL, location.origin).pathname.replace(/\/$/, '');
const path = location.pathname.replace(/\/$/, '');
// The dungeon has no approved telemetry taxonomy yet; keep collection off on this route.
if (path !== `${basePath}/dungeon`) startTelemetry();
try {
  if (path === `${basePath}/dungeon`) {
    await import('./app/startDungeonApp');
  } else if (path === `${basePath}/run`) {
    await import('./app/startRunApp');
  } else if (path === `${basePath}/map`) {
    const { startMap } = await import('./map/view');
    const disposeMap = startMap();
    import.meta.hot?.on('vite:beforeFullReload', disposeMap);
  } else {
    await import('./app/startBattleApp');
  }
} catch (error) {
  reportFailure('application_load', { phase: 'entry' }, error);
  const status = document.querySelector<HTMLElement>('#fit-status');
  if (status) {
    status.textContent = 'Error: Could not load the application. Reload the page to retry.';
    status.setAttribute('role', 'alert');
  }
}

const privacyTools = document.querySelector<HTMLElement>('#battle-scroll') ?? document.querySelector<HTMLElement>('#fit-panel, #map-page');
if (privacyTools) mountTelemetryPreferences(privacyTools);
