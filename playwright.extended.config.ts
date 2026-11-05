import { defineConfig } from '@playwright/test';
import base from './playwright.regression.config';

export default defineConfig({ ...base, testMatch: '**/dungeon-extended.spec.ts', testIgnore: [] });
