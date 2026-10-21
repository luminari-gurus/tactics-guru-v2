import { defineConfig } from '@playwright/test';
import fixtures from './playwright.fixtures.config';

// Compatibility entry point for running this fixture suite independently.
export default defineConfig({ ...fixtures, testMatch: '**/ability-picker.spec.ts' });
