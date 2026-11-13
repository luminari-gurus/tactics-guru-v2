import { mountTelemetryPreferences } from './telemetry/preferences';
import { startTelemetry } from './telemetry/browser';
import { reportFailure } from './telemetry/telemetry';
import { appEntry } from './app/entry';
import { showGameError } from './ui/gameError';
import { reportApplicationLoadFailure } from './diagnostics/applicationLoadFailure';

const { route } = appEntry;
// Menu, dungeon and the /qbert prototype have no approved collection taxonomy.
if (route !== 'menu' && route !== 'dungeon' && route !== 'qbert') startTelemetry();
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
  reportApplicationLoadFailure(error, route);
  reportFailure('application_load', { phase: 'entry' }, error);
  showGameError('Error: Could not load the application. Reload the page to retry.');
}

const privacyTools = document.querySelector<HTMLElement>('#battle-scroll') ?? document.querySelector<HTMLElement>('#fit-panel, #map-page');
if (route !== 'menu' && privacyTools) mountTelemetryPreferences(privacyTools);
