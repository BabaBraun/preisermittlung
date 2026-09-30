/* GitHub Actions läuft im offiziellen Playwright-Image; dessen Browser passen nur zur gleichen Version von
   @playwright/test. Wer eines von beiden aktualisiert, soll es hier merken und nicht erst im CI-Lauf. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('Playwright-Image im Workflow passt zur Version von @playwright/test', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/tests.yml', import.meta.url), 'utf8');
  const bild = workflow.match(/mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/);
  assert.ok(bild, 'kein Playwright-Image in .github/workflows/tests.yml');
  const paket = require('../../package.json').devDependencies['@playwright/test'];
  assert.equal(paket, bild[1], 'package.json nennt ' + paket + ', der Workflow das Image v' + bild[1]);
  assert.equal(require('@playwright/test/package.json').version, bild[1], 'installierte Version weicht ab — npm ci ausführen');
});
