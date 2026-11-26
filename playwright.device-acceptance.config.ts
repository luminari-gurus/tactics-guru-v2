import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';

export default defineConfig({
  ...base,
  testMatch: '**/main-menu.spec.ts',
  projects: [
    { name: 'acceptance-webkit-portrait', use: { ...devices['iPhone 13'], screen: undefined, launchOptions: {} } },
    { name: 'acceptance-webkit-landscape', use: { ...devices['iPhone 13 landscape'], screen: undefined, launchOptions: {} } },
  ],
});
