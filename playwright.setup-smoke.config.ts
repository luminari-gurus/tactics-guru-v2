import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Both engines must boot Phaser, not merely launch an empty browser.
export default defineConfig({
  ...base,
  testMatch: '**/boot.spec.ts',
  testIgnore: [],
  grep: /boots a Phaser scene and fits the viewport after resize/,
  projects: [
    { name: 'setup-chromium', use: { ...devices['Desktop Chrome'], screen: undefined, channel: 'chromium' } },
    { name: 'setup-webkit', use: { ...devices['iPhone 13'], screen: undefined, launchOptions: {} } },
  ],
});
