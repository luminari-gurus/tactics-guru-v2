import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';

export default defineConfig({ ...base,
  testMatch: '**/unit-health-bars.spec.ts',
  // Chromium desktop/Pixel coverage stays in the default suite; this config is WebKit-only.
  projects: [
    { name:'health-iphone-portrait', use:{...devices['iPhone 13'],screen:undefined,launchOptions:{}} },
    { name:'health-iphone-landscape', use:{...devices['iPhone 13 landscape'],screen:undefined,launchOptions:{}} },
  ],
});
