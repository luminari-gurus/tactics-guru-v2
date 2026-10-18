import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
// Mobile WebKit exposes native taps but not Playwright's wheel/CDP gesture APIs.
// Chromium covers the wheel/pointer capture scenario in the main suite.
export default defineConfig({...base,testMatch:'**/battle-hud-collapse.spec.ts',grepInvert:/collapsed camera/,projects:[
  {name:'hud-webkit-portrait',use:{...devices['iPhone 13'],launchOptions:{}}},
  {name:'hud-webkit-landscape',use:{...devices['iPhone 13 landscape'],launchOptions:{}}},
]});
