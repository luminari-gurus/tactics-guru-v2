import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({ ...base,
  testMatch: '**/unit-health-bars.spec.ts',
  projects: [
    { name:'health-desktop', use:{...devices['Desktop Chrome'], launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}} },
    { name:'health-android-portrait', use:{...devices['Pixel 7'], launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}} },
    { name:'health-android-landscape', use:{...devices['Pixel 7'],viewport:{width:915,height:412}, launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}} },
    { name:'health-iphone-portrait', use:{...devices['iPhone 13'],launchOptions:{}} },
    { name:'health-iphone-landscape', use:{...devices['iPhone 13 landscape'],launchOptions:{}} },
  ],
});
