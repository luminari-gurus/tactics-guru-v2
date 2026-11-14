import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';
export default defineConfig({ ...base,
  // Native tab-focus witness is Chromium-only: WebKit's driver forces focus.
  grepInvert: /statistics: (actual background|Chromium BFCache)/,
  testMatch: ['**/dungeon-exploration.spec.ts','**/dungeon.spec.ts','**/dungeon-lifecycle.spec.ts','**/dungeon-loot.spec.ts'],
  outputDir: 'test-results-webkit',
  use: { ...base.use, launchOptions: {} },
  projects: [
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], screen: undefined } },
    { name: 'portrait-webkit', use: { ...devices['iPhone 13'], screen: undefined } },
    { name: 'landscape-webkit', use: { ...devices['iPhone 13'], screen: undefined, viewport: { width:844,height:390 } } },
  ],
});
