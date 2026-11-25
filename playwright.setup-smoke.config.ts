import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';

// Both engines must start a Dungeon from the main menu.
export default defineConfig({
  ...base,
  testMatch: '**/main-menu.spec.ts',
  testIgnore: [],
  grep: /main menu: New Game starts immediately when no dungeon save exists/,
  projects: [
    { name: 'setup-chromium', use: { ...devices['Desktop Chrome'], screen: undefined, channel: 'chromium' } },
    { name: 'setup-webkit', use: { ...devices['iPhone 13'], screen: undefined, launchOptions: {} } },
  ],
});
