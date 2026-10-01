/* Amtlicher Baupreisindex in der Preisermittlung im Browser. Nur synthetische Daten.
   Sollwerte von Hand (Python-Zeile im Kommentar): Geschäftshaus ohne Wohnungen, Stufe 3 = 930 €/m², BGF 200 m²,
   Grundstück 500 m² × 300 €/m², GND 80, angepasste RND 56, Miete 24.000 €/Jahr, Bewirtschaftung 20 %, Zins 4 %.
   Stichtag 31.12.2024: Index Bürogebäude November 2024 = 130,9 × 1,4472
     Substanz = 150.000 + 200 × 930 × 1,4472 × 1,309 × (1 − 24/80)            = 396.648,90
     Ertrag   = (19.200 − 6.000) × (1 − 1,04^−56) / 0,04 + 150.000              = 443.301,62  → Mittel 419.975,26
*/
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

const nahe = (ist, soll, tol, t) => expect(Math.abs(ist - soll), t + ': ' + ist + ' statt ' + soll).toBeLessThanOrEqual(tol);

test('Amtlicher Baupreisindex: Wert zum Stichtag übernehmen, Bewertung rechnet mit dem Index des Stichtags', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page);
  // Bewertung mit Stichtag 31.12.2024 anlegen; Index über die neue Auswahl
  await page.evaluate(() => {
    pickVordruck('laden_buero_praxis');
    const f = { ek_anschrift: 'Musterweg 1, 74000 Musterstadt', ek_stichtag: '2024-12-31', ek_gs_flaeche: '500', ek_brw: '300', ek_baujahr: '2000',
      bgfhg_e0: '200', nhkhg_gnd: '80', nhkhg_rnd: '56', ek_miete_gewerbe: '24000', er_zins_basis: '4', er_bewirt: '20', markt_faktor: '1', pj_name: 'Musterfiliale – Stichtag 31.12.2024' };
    Object.entries(f).forEach(([k, v]) => { document.getElementById(k).value = v; });
    document.getElementById('gewichtung').value = '0.5';
    compute();
  });
  await expect(page.locator('#bpi_art')).toHaveValue('buero');          // aus dem Gebäudetyp „Geschäftshaus“
  await expect(page.locator('#bpi_amtlich_info')).toContainText('Bürogebäude, November 2024: 130,9 × 1,4472');
  await page.getByRole('button', { name: 'Wert zum Stichtag übernehmen' }).click();
  await expect(page.locator('#bpi')).toHaveValue('130,9'); await expect(page.locator('#bpi_faktor')).toHaveValue('1,4472');
  expect(await page.locator('#pq_bpi_quelle').inputValue()).toMatch(/Statistisches Landesamt Baden-Württemberg.*Bürogebäude, November 2024: 130,9/);
  const form = await page.evaluate(async () => { await projektSichern(); return { R: window._R, n: pjLoad().length }; });
  nahe(form.R.substanz, 396648.90, 0.05, 'Substanz'); nahe(form.R.ertrag, 443301.62, 0.05, 'Ertrag'); nahe(form.R.empfehlung, 419975.26, 0.05, 'Mittel');

  await keineSkriptfehler(page);
});
