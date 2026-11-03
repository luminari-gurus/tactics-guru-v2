import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Chromium functional coverage is retained with merged #124. This matrix adds
// current WebKit persistence, legal outcomes/restarts, audio and full-run evidence.
export default defineConfig({ ...base,
  testMatch: ['**/main-menu.spec.ts','**/battle-loop.spec.ts','**/battle-persistence.spec.ts','**/run-progression.spec.ts','**/battle-audio.spec.ts','**/battle-radial.spec.ts'],
  grep: /testing routes:|main menu:|startup is read-only|complete legal authored|player HUD|keyboard-only|sound control uses|mute, hidden|reload during legal|backup recovery retains|unknown storage blocks|failed partial reset|changed saved data|successful reset|invalid startup|legal run outcomes|legal defeat reload|accepted player presentation reload|enemy presentation reload|run startup preserves|run preparation and dialogs|review: recovery dismissal|review: read-level|review: reopened|review: in-flow|radial hold|radial tap fallback|radial hub cancel|radial End turn|radial labels|radial plan specials|radial plan cancellation|radial compact landscape|radial resize|radial stays open on a layout reflow|radial special tap|radial invalid reselection|radial switching to rail|radial testing|radial menu/,
  projects: [
    {name:'acceptance-webkit-portrait',use:{...devices['iPhone 13'],screen:undefined,launchOptions:{}}},
    {name:'acceptance-webkit-landscape',use:{...devices['iPhone 13 landscape'],screen:undefined,launchOptions:{}}},
  ],
});
