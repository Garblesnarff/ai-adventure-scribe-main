import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': srcPath,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
});
