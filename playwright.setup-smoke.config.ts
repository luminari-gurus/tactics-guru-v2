import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';

// Both engines must boot the Dungeon battle renderer.
export default defineConfig({
  ...base,
  testMatch: '**/dungeon-smoke.spec.ts',
  testIgnore: [],
  projects: [
    { name: 'setup-chromium', use: { ...devices['Desktop Chrome'], screen: undefined, channel: 'chromium' } },
    { name: 'setup-webkit', use: { ...devices['iPhone 13'], screen: undefined, launchOptions: {} } },
  ],
});
