import { defineConfig } from '@playwright/test';
import fixtures from '../../../playwright.fixtures.config';
import exploration from '../../../playwright.exploration.config';

// The normal fixture stage is Chromium. Add real WebKit input/feedback proof for
// the new Ranger cases without changing the established full-suite selection.
export default defineConfig({ ...fixtures, testDir: '../../../tests',
  projects: exploration.projects,
  use: { ...fixtures.use, launchOptions: {} },
});
