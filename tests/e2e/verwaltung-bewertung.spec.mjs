/* Bewertungen je Liegenschaft und amtlicher Baupreisindex im Browser. Nur synthetische Daten.
   Sollwerte von Hand (Python-Zeile im Kommentar): Geschäftshaus ohne Wohnungen, Stufe 3 = 930 €/m², BGF 200 m²,
   Grundstück 500 m² × 300 €/m², GND 80, angepasste RND 56, Miete 24.000 €/Jahr, Bewirtschaftung 20 %, Zins 4 %.
   Stichtag 31.12.2024: Index Bürogebäude November 2024 = 130,9 × 1,4472
     Substanz = 150.000 + 200 × 930 × 1,4472 × 1,309 × (1 − 24/80)            = 396.648,90
     Ertrag   = (19.200 − 6.000) × (1 − 1,04^−56) / 0,04 + 150.000              = 443.301,62  → Mittel 419.975,26
   Fortschreibung auf 31.12.2026: Index Mai 2026 = 143,1 (vorläufig), RND 54
     Substanz = 150.000 + 200 × 930 × 1,4472 × 1,431 × (1 − 26/80)            = 410.006,92
     Ertrag   = 13.200 × (1 − 1,04^−54) / 0,04 + 150.000                        = 440.307,03  → Mittel 425.156,97 */
import { test, expect } from '@playwright/test';
import { appOeffnen, keineSkriptfehler } from './helfer.mjs';

const lv = page => page.locator('#lv_overlay');
const nahe = (ist, soll, tol, t) => expect(Math.abs(ist - soll), t + ': ' + ist + ' statt ' + soll).toBeLessThanOrEqual(tol);

test('Amtlicher Baupreisindex: Wert zum Stichtag übernehmen; Bewertungen eintragen, übernehmen, fortschreiben', async ({ page }) => {
  page.on('dialog', d => d.type() === 'confirm' && /jetzt in der Preisermittlung öffnen/.test(d.message()) ? d.dismiss() : d.accept());
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

  // Liegenschaft der Bank, Reiter Bewertungen
  await page.evaluate(async () => { lvOeffnen('uebersicht'); await lvStart();
    await lvSpeichern({ id: 'LBW', name: 'Musterfiliale', strasse: 'Musterweg 1', plz: '74000', ort: 'Musterstadt', art: 'gewerbe', eigentuemerArt: 'bank',
      einheiten: [{ id: 'e1', nr: 'Bank EG', art: 'gewerbe', flaeche: 200, sollmiete: 2000, eigennutzung: true }, { id: 'e2', nr: 'Laden', art: 'gewerbe', flaeche: 50 }] });
    lvLiegenschaftOeffnen('LBW', 'ueberblick'); });
  // Eigennutzung: kein Leerstand, keine Vermietung angeboten
  await expect(lv(page).locator('.kpis')).toContainText('1 in Eigennutzung');
  await expect(lv(page).locator('.kpis')).toContainText('Leerstand 20 % der Fläche');   // 50 von 250 m²
  const bankZeile = lv(page).locator('.lv-tbl tr', { hasText: 'Bank EG' });
  await expect(bankZeile).toContainText('Eigennutzung'); await expect(bankZeile).toContainText('fiktiv 2.000,00 €');
  await expect(bankZeile.getByRole('button', { name: 'Vermieten' })).toHaveCount(0);
  await lv(page).locator('#lvt_bewertungen').click();
  await expect(lv(page)).toContainText('Noch keine Bewertung erfasst');
  await lv(page).getByRole('button', { name: 'Bewertung eintragen' }).click();
  await lv(page).locator('#lvf_b_stichtag').fill('2023-12-31'); await lv(page).locator('#lvf_b_ergebnis').fill('390.000');
  await lv(page).locator('#lvf_b_substanz').fill('400.000'); await lv(page).locator('#lvf_b_ertrag').fill('380.000');
  await lv(page).locator('#lvf_b_bpi').fill('125,7'); await lv(page).locator('#lvf_b_quelle').fill('Preiseinschätzung Musterfiliale 2023.xls');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-tbl')).toContainText('390.000 €');
  // Ergebnis aus der Preisermittlung übernehmen
  await lv(page).getByRole('button', { name: 'Aus Preisermittlung übernehmen' }).click();
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Ergebnis übernommen: 419.975 € zum 31.12.2024');
  const kpis = lv(page).locator('.kpis');
  await expect(kpis).toContainText('419.975 €'); await expect(kpis).toContainText('+7,69 %');   // 419.975 / 390.000 − 1
  await expect(kpis).toContainText('31.12.2025');                                                  // nächste jährliche Bewertung
  const fr = await page.evaluate(() => lvFristenL(lvAktiv(), '2026-10-01', 60).filter(f => f.art === 'bewertung').map(f => f.titel));
  expect(fr).toEqual(['Bewertung zum Stichtag 31.12.2025']);
  // Fortschreiben auf den 31.12.2026
  await lv(page).getByRole('button', { name: 'Auf neuen Stichtag fortschreiben' }).click();
  await expect(lv(page).locator('#lvf_bf_stichtag')).toHaveValue('2025-12-31');
  await expect(lv(page).locator('#lvf_bf_art')).toHaveValue('buero');
  await lv(page).locator('#lvf_bf_stichtag').fill('2026-12-31');
  await lv(page).locator('#lvf_bf_name').fill('Musterfiliale – Stichtag 31.12.2026');
  await lv(page).locator('.lv-formbox button.primary').click();
  await expect(lv(page).locator('.lv-ok')).toContainText('Entwurf zum 31.12.2026 angelegt (vorläufig 425.157 €)');
  await expect(lv(page).locator('.lv-ok')).toContainText('56 → 54 Jahre');
  const neu = await page.evaluate(() => { const b = lvAktiv().bewertungen.find(x => x.status === 'entwurf'); const p = pjLoad().find(x => x.id === b.projektId);
    return { b, f: p.data.fields, n: pjLoad().length }; });
  expect(neu.n).toBe(2);
  expect([neu.f.ek_stichtag, neu.f.bpi, neu.f.bpi_faktor, neu.f.nhkhg_rnd, neu.f.ek_brw]).toEqual(['2026-12-31', '143,1', '1,4472', '54', '300']);
  nahe(neu.b.substanz, 410006.92, 0.05, 'Substanz 2026'); nahe(neu.b.ertrag, 440307.03, 0.05, 'Ertrag 2026'); nahe(neu.b.ergebnis, 425156.97, 0.05, 'Mittel 2026');
  expect(neu.b.notiz).toContain('vorläufig');
  await expect(lv(page).locator('.lv-tbl tbody tr').first()).toContainText('Entwurf');
  // Öffnen lädt die Bewertung in die Preisermittlung
  await lv(page).locator('.lv-tbl tbody tr').first().getByRole('button', { name: 'Öffnen' }).click();
  await expect(page.locator('#ek_stichtag')).toHaveValue('2026-12-31');
  await expect(page.locator('#bpi')).toHaveValue('143,1');
  await keineSkriptfehler(page);
});
