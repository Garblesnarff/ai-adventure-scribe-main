import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    // Base URL is provided per-project
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  projects: [
    {
      name: 'api-user',
      use: {
        baseURL: 'http://localhost:8891',
      },
      webServer: {
        command: 'npm run server:start:ci',
        url: 'http://localhost:8891/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT: '8891',
          NODE_ENV: 'test',
          SUPABASE_JWT_SECRET: 'testsecret',
          BLOG_ADMIN_DEV_OVERRIDE: '0',
        },
      },
      metadata: { role: 'user' },
    },
    {
      name: 'api-admin',
      use: {
        baseURL: 'http://localhost:8892',
      },
      webServer: {
        command: 'npm run server:start:ci',
        url: 'http://localhost:8892/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT: '8892',
          NODE_ENV: 'test',
          SUPABASE_JWT_SECRET: 'testsecret',
          BLOG_ADMIN_DEV_OVERRIDE: '1',
        },
      },
      metadata: { role: 'admin' },
    },
  ],
});
