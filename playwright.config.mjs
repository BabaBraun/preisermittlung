import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 8790);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  /* in GitHub Actions: Fehler zusätzlich als Anmerkungen am Lauf (ohne Anmeldung lesbar) */
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:' + PORT,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    acceptDownloads: true,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }, testIgnore: /iphone\.spec/ },
    { name: 'iphone', use: { ...devices['iPhone 13'] }, testMatch: /iphone\.spec/ }
  ],
  webServer: {
    command: 'node tests/server.mjs',
    url: 'http://localhost:' + PORT + '/index.html',
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), TEST_STEUERUNG: '1' }
  }
});
