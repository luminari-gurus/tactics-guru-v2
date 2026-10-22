import { defineConfig } from '@playwright/test';
import fixtures from './playwright.fixtures.config';

// Compatibility entry point for running this fixture suite independently.
export default defineConfig({ ...fixtures, testMatch: '**/run-items.spec.ts' });
