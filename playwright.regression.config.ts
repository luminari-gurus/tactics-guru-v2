import { defineConfig, devices } from '@playwright/test';

// Focused asset-base checks can exercise the same consumers in dev and built preview.
const basePath = process.env.PLAYWRIGHT_BASE_PATH ?? '/';
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE === 'dev' ? 'dev' : 'preview';
const baseURL = `http://127.0.0.1:4173${basePath}`;

// Each engine clears one full floor per profile: saved manual pickup on desktop,
// saved automatic pickup on portrait, and unsaved manual pickup on landscape.
export const redundantProfileJourneys = [
  /@extended-shaman(?: |$)/,
  /^(?:mobile-portrait|mobile-landscape|portrait-webkit|landscape-webkit) .*@desktop-keyboard(?: |$)/,
  // Frost Snare exercises wheel zoom, native Chromium pinch, and WebKit pointer gestures.
  /^(?:mobile-landscape|desktop-webkit|portrait-webkit) .*staged Mage Frost Snare cancels invalid casts and restores the active badge$/,
  // Cover an occupied loot tile with a landscape Chromium tap and a desktop WebKit click.
  /^(?:desktop|mobile-portrait|portrait-webkit|landscape-webkit) .*ground loot: entering an occupied pile starts combat and closes inventory$/,
  // Tagged loading scenarios run on both desktops and one touch orientation per engine.
  /^(?:mobile-portrait|portrait-webkit) .*@mobile-landscape(?: |$)/,
  /^(?:mobile-landscape|landscape-webkit) .*@mobile-portrait(?: |$)/,
  // Keep desktop Chromium and portrait WebKit for paired desktop and touch interactions.
  /^(?:mobile-portrait|mobile-landscape|desktop-webkit|landscape-webkit|acceptance-webkit-landscape) .*@desktop-chromium-portrait-webkit(?: |$)/,
  // One real reload per engine verifies that boot leaves the automatic pickup unscheduled.
  /^(?:mobile-portrait|mobile-landscape|portrait-webkit|landscape-webkit) .*reload before the pending step restores the ground pile without surprise movement or collection$/,
  /^(?:mobile-portrait|mobile-landscape|portrait-webkit|landscape-webkit) .*saved menu dungeon keeps proof tools hidden across legal encounters$/,
  /^(?:desktop|desktop-webkit|mobile-portrait|portrait-webkit) .*testing dungeon legally clears a floor, descends and backtracks without accessing saves$/,
  /^(?:desktop|desktop-webkit|mobile-landscape|landscape-webkit) .*saved menu dungeon auto-collects loot across a complete first floor$/,
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
