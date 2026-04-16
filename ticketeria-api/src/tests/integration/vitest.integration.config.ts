import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Include only integration test files
    include: ['src/tests/integration/**/*.integration.test.ts'],

    // Setup file that runs before all tests
    setupFiles: ['src/tests/integration/setup.ts'],

    // Timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Use forks to isolate tests from each other
    pool: 'forks',
    poolOptions: {
      forks: {
        singleThread: true, // Run tests serially to avoid database locks
      },
    },

    // Test environment
    environment: 'node',

    // Reporter
    reporters: ['verbose'],

    // Disable globals to use explicit imports
    globals: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
    },
  },
});
