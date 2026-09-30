/* Desktop (Chromium, 1280 × 900): alle Hauptansichten ohne waagrechtes Scrollen und ohne Skriptfehler. */
import { test } from '@playwright/test';
import { alleAnsichten } from './ansichten.mjs';

test('Desktop: alle Ansichten', async ({ page }) => {
  test.setTimeout(120_000);
  await alleAnsichten(page, 'desktop');
});
