import { defineConfig, devices } from '@playwright/test';

// Focused asset-base checks can exercise the same consumers in dev and built preview.
const basePath = process.env.PLAYWRIGHT_BASE_PATH ?? '/';
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE === 'dev' ? 'dev' : 'preview';
const baseURL = `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // Encounter fixtures are Vite source entries, verified by the dev-only config.
  testIgnore: '**/authored-encounters.spec.ts',
  // Phaser renderers share the host GPU; serialize to avoid headless boot contention.
  workers: 1,
  use: {
    baseURL,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    command: `npm run ${serverMode} -- --base=${basePath} --port 4173 --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-portrait', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-landscape', use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
  ],
});
