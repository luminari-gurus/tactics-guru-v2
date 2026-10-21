import { defineConfig } from 'vitest/config';
import unit from './vitest.config';

export default defineConfig({
  ...unit,
  test: { ...unit.test, include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"] },
});
