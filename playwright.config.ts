import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['dot'], ['junit', { outputFile: 'e2e-results/junit.xml' }], ['html', { outputFolder: 'e2e-results/playwright-report' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm start',
    url: process.env.E2E_BASE_URL || 'http://localhost:4200',
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
