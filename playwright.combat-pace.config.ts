import { defineConfig } from '@playwright/test';
import base from './playwright.device-acceptance.config';

// The ordinary device matrix intentionally excludes the animation fixture file.
// Keep this issue's WebKit pace witnesses bounded without expanding that matrix.
export default defineConfig({ ...base,
  testMatch: ['**/battle-animations.spec.ts', '**/battle-audio.spec.ts', '**/main-menu.spec.ts'],
  grep: /combat pace/,
});
