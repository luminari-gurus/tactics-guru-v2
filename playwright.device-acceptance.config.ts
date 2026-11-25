import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';

// WebKit's driver forces active/focused pages. Chromium owns native tab focus.
const unsupportedWebKitCases = /statistics: (actual background|Chromium BFCache)/;

// Chromium functional coverage is retained with merged #124. This matrix adds
// current WebKit persistence, legal outcomes/restarts, audio and full-run evidence.
export default defineConfig({ ...base,
  testMatch: ['**/main-menu.spec.ts','**/battle-loop.spec.ts','**/battle-persistence.spec.ts','**/run-progression.spec.ts','**/battle-audio.spec.ts','**/battle-radial.spec.ts','**/battle-board.spec.ts'],
  grep: /testing routes:|main menu:|startup is read-only|complete legal authored|run battle undo|run statistics:|review repair: (Single battle|Dungeon floors|Main menu) confirms unsaved departure|review repair: recovery removal stays deleted|player HUD|keyboard-only|sound control uses|mute, hidden|reload during legal|backup recovery retains|unknown storage blocks|failed partial reset|changed saved data|successful reset|invalid startup|legal run outcomes|legal defeat reload|accepted player presentation reload|enemy presentation reload|run startup preserves|run preparation and dialogs|review: recovery dismissal|review: read-level|review: reopened|review: in-flow|radial hold|radial tap fallback|radial hub cancel|radial End turn|radial labels|radial plan specials|radial plan cancellation|radial compact landscape|radial resize|radial stays open on a layout reflow|radial special tap|radial invalid reselection|radial switching to rail|radial testing|radial menu|temporary HUD expansion does not leave the battle camera zoomed|viewport resize recenters a camera capped by temporary HUD reflow/,
  projects: [
    {
      name: 'acceptance-webkit-portrait',
      use: { ...devices['iPhone 13'], screen: undefined, launchOptions: {} },
      grepInvert: [
        unsupportedWebKitCases,
        /battle-loop\.spec\.ts complete legal authored battle seed 2 reaches playerWin through controls and replays$/,
      ],
    },
    {
      name: 'acceptance-webkit-landscape',
      use: { ...devices['iPhone 13 landscape'], screen: undefined, launchOptions: {} },
      // Keep valid storage here for each fresh-play, diagnostic and Qbert journey.
      // Run preparation, native touch, and radial/layout checks still run in both projects.
      grepInvert: [
        unsupportedWebKitCases,
        /battle-loop\.spec\.ts complete legal authored battle seed 1 reaches playerLoss through controls and replays$/,
        /run-progression\.spec\.ts (legal run outcomes, earned rewards and fresh restart|testing routes: an earned combat draught stays in the transient authored run)$/,
        /battle-persistence\.spec\.ts testing routes: (fresh play|diagnostic play|Qbert) never accesses (missing|corrupt|backup-only|unavailable) saved games$/,
      ],
    },
  ],
});
