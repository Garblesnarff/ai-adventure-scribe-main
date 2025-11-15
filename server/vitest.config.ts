import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));
const rootDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@server': srcPath,
    },
  },
  test: {
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
    globals: true,
    setupFiles: ['dotenv/config'],
    env: {
      DOTENV_CONFIG_PATH: path.resolve(rootDir, 'server/.env'),
    },
    // Integration tests need more time
    testTimeout: 30000,
    // Run tests sequentially for integration tests (they use database)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run one test at a time for database tests
      },
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/rules/**/*.ts',
        'src/trpc/**/*.ts',
        'src/services/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/__tests__/**',
      ],
    },
  },
});
