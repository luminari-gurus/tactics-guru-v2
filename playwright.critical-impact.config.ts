import { defineConfig } from '@playwright/test';
import base from './playwright.device-acceptance.config';

// Bounded WebKit witnesses for the shared battle renderer, in both orientations.
export default defineConfig({ ...base,
  testMatch: ['**/battle-animations.spec.ts'],
  grep: /critical impact:/,
});
