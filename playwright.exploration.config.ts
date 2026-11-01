import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base,
  testMatch: ['**/dungeon-exploration.spec.ts','**/dungeon.spec.ts','**/dungeon-lifecycle.spec.ts'],
  outputDir: 'test-results-webkit',
  use: { ...base.use, launchOptions: {} },
  projects: [
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], screen: undefined } },
    { name: 'portrait-webkit', use: { ...devices['iPhone 13'], screen: undefined } },
    { name: 'landscape-webkit', use: { ...devices['iPhone 13'], screen: undefined, viewport: { width:844,height:390 } } },
  ],
});
