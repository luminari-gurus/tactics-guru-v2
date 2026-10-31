import { defineConfig } from '@playwright/test';
import base from './playwright.exploration.config';

export default defineConfig({ ...base, testMatch: '**/dungeon-extended.spec.ts', testIgnore: [] });
