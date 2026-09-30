/* Gemeinsame Helfer für die Browsertests. */
import { expect } from '@playwright/test';

/* Fester Zeitpunkt: Alter, Stichtag-Vorgaben und Fristen hängen am Datum. */
export const JETZT = new Date('2026-09-29T10:00:00+02:00');

/* App frisch öffnen: leerer Speicher (neuer Kontext), feste Uhr, Startseite übersprungen. */
export async function appOeffnen(page, { pfad = '/index.html', uhr = true } = {}) {
  if (uhr) await page.clock.setFixedTime(JETZT);
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e && e.message || e)));
  await page.goto(pfad);
  await page.waitForFunction(() => typeof window.compute === 'function' && window.IA_BEREIT_P !== undefined);
  await page.evaluate(() => window.IA_BEREIT_P);
  page.__fehler = fehler;
  return fehler;
}

export async function arbeitsflaeche(page) {
  await page.evaluate(() => { document.body.classList.add('started'); if(window.appShowSection)appShowSection('s-eck',{record:false}); });
}

/* Alle Eingaben auf die Vorgabewerte des Formulars zurücksetzen (wie der Selbsttest), dann Fall anwenden. */
export async function fallAnwenden(page, fall) {
  await page.evaluate(({ felder, vordruck }) => {
    const ausnahmen = '#mdb_overlay,#suche,#gr_overlay,#fin_overlay,#auf_overlay,#projekt_overlay,#lock_setup_overlay,#dsgvo_overlay,#st_overlay,#kd_overlay,#pq_overlay,#vm_overlay,#lv_overlay';
    document.querySelectorAll('input[id],select[id],textarea[id]').forEach(e => {
      if (e.closest(ausnahmen) || e.type === 'file') return;
      if (e.type === 'checkbox' || e.type === 'radio') e.checked = e.defaultChecked;
      else if (e.tagName === 'SELECT') { const o = [...e.options].find(x => x.defaultSelected); e.value = o ? o.value : (e.options[0] ? e.options[0].value : ''); }
      else e.value = e.defaultValue;
    });
    const k = document.getElementById('en_klasse'); if (k) delete k.dataset.manuell;
    if (vordruck) window.applyVordruck(window.VORDRUCKE_LISTE ? window.VORDRUCKE_LISTE.find(v => v.id === vordruck) : VORDRUCKE.find(v => v.id === vordruck));
    window.apply(felder || {});
    window.compute();
  }, { felder: fall.felder, vordruck: fall.vordruck || null });
}

/* Ergebnis lesen: alle Zahlen aus window._R (gerundet) und alle Ausgabetexte (o_*, r_*). */
export async function ergebnisLesen(page) {
  return page.evaluate(() => {
    const zahlen = {};
    const lauf = (o, p) => {
      for (const [k, v] of Object.entries(o || {})) {
        const n = p ? p + '.' + k : k;
        if (typeof v === 'number') zahlen[n] = Number.isFinite(v) ? (Math.round(v * 1e6) / 1e6 || 0) : String(v);   // −0 wie 0 (JSON kennt kein −0)
        else if (typeof v === 'boolean' || typeof v === 'string') zahlen[n] = v;
        else if (v && typeof v === 'object' && !Array.isArray(v) && p.split('.').length < 2) lauf(v, n);
      }
    };
    lauf(window._R, '');
    const texte = {};
    document.querySelectorAll('[id^="o_"],[id^="r_"]').forEach(el => { texte[el.id] = el.textContent.replace(/\s+/g, ' ').trim(); });
    return { zahlen, texte };
  });
}

export async function keineSkriptfehler(page) {
  expect(page.__fehler || [], 'JavaScript-Fehler auf der Seite').toEqual([]);
}
