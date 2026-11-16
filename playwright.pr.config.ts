import { defineConfig, devices } from '@playwright/test';
import base from './playwright.regression.config';

// Explicit allowlists keep new regression cases from silently growing PR latency.
// Reuse the original journeys and assertions; the broad configs remain available.
export const desktopJourneys = [
  'main menu: New Game starts immediately when no dungeon save exists',
  'missing engine chunk reports a recoverable startup error on battle',
  'complete legal authored battle seed 2 reaches playerWin through controls and replays',
  'run battle undo and a legal terminal journey reset on reload',
  'read-only entry, keyboard new dungeon, real action and active resume',
];
// Playwright appends tags to the grep title; preserve tagged startup coverage.
const exactTitles = (titles: string[]) => new RegExp(`(?:${titles.join('|')})(?: @[^ ]+)*$`);

export default defineConfig({
  ...base,
  testMatch: ['**/main-menu.spec.ts', '**/boot.spec.ts', '**/battle-loop.spec.ts', '**/run-progression.spec.ts', '**/dungeon.spec.ts'],
  testIgnore: [],
  workers: 1,
  retries: 0,
  globalTimeout: 5 * 60_000,
  forbidOnly: true,
  use: { ...base.use, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'pr-desktop', grep: exactTitles(desktopJourneys),
      use: { ...devices['Desktop Chrome'], screen: undefined, channel: 'chromium' },
    },
    {
      name: 'pr-touch',
      grep: exactTitles(['real touch previews a board move, modal backdrop captures it, and suspend resumes exactly once']),
      use: { ...devices['Pixel 7'], screen: undefined, channel: 'chromium' },
    },
    {
      name: 'pr-webkit',
      grep: exactTitles(['read-only entry, keyboard new dungeon, real action and active resume']),
      use: { ...devices['iPhone 13'], screen: undefined, launchOptions: {} },
    },
  ],
});
