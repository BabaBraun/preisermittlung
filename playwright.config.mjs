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
    baseURL: 'http://127.0.0.1:' + PORT,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    acceptDownloads: true,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions: process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {} }, testIgnore: /iphone\.spec/ },
    { name: 'iphone', use: { ...devices['iPhone 13'] }, testMatch: /iphone\.spec/ }
  ],
  webServer: {
    command: 'node tests/server.mjs',
    url: 'http://127.0.0.1:' + PORT + '/index.html',
    reuseExistingServer: false,
    env: { PORT: String(PORT), TEST_STEUERUNG: '1' }
  }
});
