import { defineConfig } from '@playwright/test';
import base from './playwright.regression.config';

// Prefixed asset modes: all cases on desktop, touch-audio cases also on Pixel portrait.
export default defineConfig({
  ...base,
  testMatch: '**/public-asset-base.spec.ts',
  projects: base.projects
    .filter(project => project.name !== 'mobile-landscape')
    .map(project => project.name === 'mobile-portrait' ? { ...project, grep: /@touch-audio/ } : project),
});
