import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __BATTLE_IMAGE_URLS__: '{}' },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
});
