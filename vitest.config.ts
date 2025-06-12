/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path'; // Added path import

export default defineConfig({
  plugins: [react()],
  resolve: { // Added resolve configuration
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // Optional: if we need setup files
    css: true, // If you have CSS imports in components
  },
});
