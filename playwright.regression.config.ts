import { defineConfig, devices } from '@playwright/test';

// Focused asset-base checks can exercise the same consumers in dev and built preview.
const basePath = process.env.PLAYWRIGHT_BASE_PATH ?? '/';
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE === 'dev' ? 'dev' : 'preview';
const baseURL = `http://127.0.0.1:4173${basePath}`;

// Keep every full-floor journey on desktop. Touch profiles split saved automatic
// pickup (portrait) and unsaved manual pickup (landscape) within each engine.
export const redundantProfileJourneys = [
  // Tagged loading scenarios run on both desktops and one touch orientation per engine.
  /^(?:mobile-portrait|portrait-webkit) .*@mobile-landscape(?: |$)/,
  /^(?:mobile-landscape|landscape-webkit) .*@mobile-portrait(?: |$)/,
  /^(?:mobile-portrait|mobile-landscape|portrait-webkit|landscape-webkit) .*saved menu dungeon keeps proof tools hidden across legal encounters$/,
  /^(?:mobile-portrait|portrait-webkit) .*testing dungeon legally clears a floor, descends and backtracks without accessing saves$/,
  /^(?:mobile-landscape|landscape-webkit) .*saved menu dungeon auto-collects loot across a complete first floor$/,
];

export default defineConfig({
  testDir: './tests',
  grepInvert: redundantProfileJourneys,
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/dungeon-extended.spec.ts', '**/dungeon-smoke.spec.ts'],
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
    // 1.64 forwards descriptor.screen; retain the former viewport-based screen.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], screen: undefined, channel: 'chromium' } },
    { name: 'mobile-portrait', use: { ...devices['Pixel 7'], screen: undefined, channel: 'chromium' } },
    { name: 'mobile-landscape', use: { ...devices['Pixel 7'], screen: undefined, channel: 'chromium', viewport: { width: 915, height: 412 } } },
  ],
});
