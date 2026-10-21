import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// These source-entry fixtures share one dev server and the unchanged device matrix.
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ['**/authored-encounters.spec.ts', '**/run-items.spec.ts'],
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:4173' },
});
