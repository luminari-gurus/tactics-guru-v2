import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const development = process.env.PLAYWRIGHT_TELEMETRY_DEV === 'true';
export default defineConfig({
  ...base,
  testMatch: '**/telemetry.spec.ts', testIgnore: [],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4288' },
  webServer: {
    command: development ? 'npm run dev -- --port 4288 --strictPort'
      : 'npm run build -- --outDir tmp/issue128-dist && npm run preview -- --outDir tmp/issue128-dist --port 4288 --strictPort',
    url: 'http://127.0.0.1:4288', reuseExistingServer: false,
    env: {
      POSTHOG_SOURCEMAPS: 'true', VITE_POSTHOG_DEV_OPT_IN: development ? 'true' : 'false',
      VITE_POSTHOG_ENABLED: 'true', VITE_POSTHOG_KEY: 'phc_test', VITE_POSTHOG_HOST: 'https://us.i.posthog.com',
      VITE_POSTHOG_TEST_OPT_IN: 'true', VITE_POSTHOG_VERIFY_ERROR: 'true',
    },
  },
});
