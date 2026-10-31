import { mountTelemetryPreferences } from './telemetry/preferences';
import { startTelemetry } from './telemetry/browser';
import { reportFailure } from './telemetry/telemetry';
import { classifyRoute } from './app/routes';
const route = classifyRoute(location.pathname, location.search, import.meta.env.BASE_URL);
// Menu and dungeon have no approved collection taxonomy.
if (route !== 'menu' && route !== 'dungeon') startTelemetry();
try {
  if (route === 'menu') {
    const { startMainMenu } = await import('./ui/mainMenu');
    startMainMenu();
  } else if (route === 'dungeon') {
    await import('./app/startDungeonApp');
  } else if (route === 'run') {
    await import('./app/startRunApp');
  } else if (route === 'map') {
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
if (route !== 'menu' && privacyTools) mountTelemetryPreferences(privacyTools);
