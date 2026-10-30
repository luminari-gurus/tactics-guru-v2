import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Chromium functional coverage is retained with merged #124. This matrix adds
// current WebKit persistence, legal outcomes/restarts, audio and full-run evidence.
export default defineConfig({ ...base,
  testMatch: ['**/main-menu.spec.ts','**/battle-loop.spec.ts','**/battle-persistence.spec.ts','**/run-progression.spec.ts','**/battle-audio.spec.ts'],
  grep: /main menu:|startup is read-only|complete legal authored|player HUD|keyboard-only|sound control uses|mute, hidden|reload during legal|backup recovery retains|unknown storage blocks|failed partial reset|changed saved data|successful reset|invalid startup|legal run outcomes|legal defeat reload|accepted player presentation reload|enemy presentation reload|run startup preserves|run preparation and dialogs|review: recovery dismissal|review: read-level|review: reopened|review: in-flow/,
  projects: [
    {name:'acceptance-webkit-portrait',use:{...devices['iPhone 13'],launchOptions:{}}},
    {name:'acceptance-webkit-landscape',use:{...devices['iPhone 13 landscape'],launchOptions:{}}},
  ],
});
