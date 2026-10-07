/* Preisempfehlung, Gewichtung und Verhandlungsspanne stimmen überall überein — nach jedem Vorlagenwechsel,
   nach dem Import einer Datei und nach dem Selbsttest: Abschnitt ⑨, Seitenleiste, Handyleiste, Bericht. */
import { test, expect } from '@playwright/test';
import { appOeffnen, arbeitsflaeche, fallAnwenden, keineSkriptfehler } from './helfer.mjs';
import { FALL_HAUS, FALL_ETW } from '../fixtures/szenarien.mjs';

async function pruefeUeberall(page, wo) {
  const r = await page.evaluate(() => {
    const R = window._R, P = window._PRUEF, t = id => (document.getElementById(id) || {}).textContent;
    const w = modus() === 'wohnung', vw = !w && R.vwAktiv, gv = vw ? R.gv : 0;
    return { ok: P.status === 'ok', empf: eur(R.empfehlung), spanne: eur(R.empfehlung * (1 - R.vh)) + '  –  ' + eur(R.empfehlung * (1 + R.vh)),
      o: t('o_empfehlung'), r: t('r_empfehlung'), mb: t('mb_empf'), os: t('o_spanne'), cps: t('cp_spanne'),
      sub: t('cp_sub_w'), er: t('cp_er_w'), subSoll: w ? '' : Math.round(R.g * (1 - gv) * 100) + ' %', erSoll: Math.round((1 - R.g) * (1 - gv) * 100) + ' %',
      gewAuswahl: parseFloat(document.getElementById('gewichtung').value), g: R.g };
  });
  expect(r.ok, wo + ': Bewertung gültig').toBe(true);
  expect(r.o, wo + ': Abschnitt ⑨').toBe(r.empf);
  expect(r.r, wo + ': Seitenleiste').toBe(r.empf);
  expect(r.mb, wo + ': Handyleiste').toBe(r.empf);
  expect(r.os, wo + ': Spanne ⑨').toBe(r.spanne);
  expect(r.cps, wo + ': Spanne Seitenleiste').toContain(r.spanne);
  expect(r.g, wo + ': Gewichtung wie ausgewählt').toBe(r.gewAuswahl);
  expect(r.sub, wo + ': Gewicht Substanz').toBe(r.subSoll);
  expect(r.er, wo + ': Gewicht Ertrag').toBe(r.erSoll);
  await page.evaluate(() => druckbericht());
  const bericht = await page.evaluate(() => {
    const zeile = t => { const tr = [...document.querySelectorAll('#report tr')].find(x => x.cells[0] && x.cells[0].textContent.trim() === t); return tr ? tr.cells[tr.cells.length - 1].textContent.trim() : null; };
    return { deck: (document.querySelector('#report .cover .val') || {}).textContent, summe: zeile('Empfohlener Preisansatz'), spanne: zeile('Verhandlungsspanne') };
  });
  expect(bericht.deck, wo + ': Deckblatt').toBe(r.empf);
  expect(bericht.summe, wo + ': Bericht').toBe(r.empf);
  expect(bericht.spanne.replace(/\s+/g, ' '), wo + ': Spanne im Bericht').toBe(r.spanne.replace(/\s+/g, ' '));
  await page.evaluate(() => document.body.classList.remove('report-mode'));
}

test('nach jedem Vorlagenwechsel stimmen Empfehlung, Gewichtung und Spanne überall überein', async ({ page }) => {
  await appOeffnen(page); await arbeitsflaeche(page);
  const vordrucke = await page.evaluate(() => VORDRUCKE.map(v => ({ id: v.id, modus: v.modus })));
  expect(vordrucke.map(v => v.id)).toEqual(['etw_vergleich', 'wh_bgf', 'wgh_misch', 'laden_buero_praxis', 'gewerbe_bgf']);
  // die früheren Untervarianten (ETW mit Nießbrauch, Wohnhaus mit PV, mit Anbau und Nießbrauch, Gewichtung 40 : 60)
  // sind jetzt Schalter in der Bewertung (D30) — dieselben Fälle werden so geprüft
  const zusaetze = [{}, { niess_aktiv: true }, { pv_aktiv: true }, { anbau_aktiv: true, niess_aktiv: true }, { anbau_aktiv: true, niess_aktiv: true, gewichtung: '0.4' }];
  for (const v of vordrucke) for (const z of v.modus === 'wohnung' ? zusaetze.slice(0, 2) : v.id === 'wh_bgf' ? zusaetze : zusaetze.slice(0, 1)) {
    await fallAnwenden(page, { felder: v.modus === 'wohnung' ? FALL_ETW : FALL_HAUS });
    await page.evaluate(([id, z])=>{applyVordruck(VORDRUCKE.find(x=>x.id===id));apply(Object.assign({ni_leben:'12',ni_miete:'6000',ni_umfang:'teil'},z));},[v.id, z]);
    await pruefeUeberall(page, v.id + ' ' + JSON.stringify(z));
  }
  await keineSkriptfehler(page);
});

test('nach Datei-Import und nach dem Selbsttest bleibt alles übereinstimmend', async ({ page }) => {
  page.on('dialog', d => d.accept());
  await appOeffnen(page); await arbeitsflaeche(page);
  await fallAnwenden(page, { felder: Object.assign({}, FALL_HAUS, { vw_aktiv: true, vw_preis: '3.200', gew_vergleich: '25', verhandlung: '7' }) });
  await pruefeUeberall(page, 'Ausgangslage');
  const vorher = await page.evaluate(() => window._R.empfehlung);
  const text = await page.evaluate(() => JSON.stringify(snapshot()));
  await fallAnwenden(page, { felder: FALL_ETW });
  await page.evaluate(t => projektDateiEinlesen(t, 'test.json'), text);
  expect(await page.evaluate(() => window._R.empfehlung)).toBe(vorher);
  await pruefeUeberall(page, 'nach Import');
  await page.addScriptTag({ url: '/selbsttest.js' });
  await page.evaluate(() => window.iaSelbsttest());
  expect(await page.evaluate(() => window._R.empfehlung)).toBe(vorher);
  await pruefeUeberall(page, 'nach Selbsttest');
  await keineSkriptfehler(page);
});
