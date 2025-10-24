import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/lib/test/setup-env.ts'],
    include: ['./tests/**/*.test.ts'],
  },
});
