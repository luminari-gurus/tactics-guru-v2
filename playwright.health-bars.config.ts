import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({ ...base,
  testMatch: '**/unit-health-bars.spec.ts',
  projects: [
    { name:'health-desktop', use:{...devices['Desktop Chrome'],screen:undefined, launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}} },
    { name:'health-android-portrait', use:{...devices['Pixel 7'],screen:undefined, launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}} },
    { name:'health-android-landscape', use:{...devices['Pixel 7'],screen:undefined,viewport:{width:915,height:412}, launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}} },
    { name:'health-iphone-portrait', use:{...devices['iPhone 13'],screen:undefined,launchOptions:{}} },
    { name:'health-iphone-landscape', use:{...devices['iPhone 13 landscape'],screen:undefined,launchOptions:{}} },
  ],
});
