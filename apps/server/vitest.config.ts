import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./test/setupEnv.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    // Tests share one database, so test files run one at a time.
    fileParallelism: false,
  },
});
