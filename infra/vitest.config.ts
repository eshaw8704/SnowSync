import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Synthesizing every stack takes a few seconds.
    testTimeout: 60_000,
  },
});
