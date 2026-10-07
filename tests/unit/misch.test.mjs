/* Gemischte Nutzung (D66): Rohertrag nach Wohnen und Gewerbe, Bewirtschaftungskosten getrennt nach Anlage 3 ImmoWertV,
   Liegenschaftszins anteilig. Sollwerte von Hand gerechnet (im Test als Zahlen bzw. Grundrechenarten), nicht mit der Implementierung. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { K, leser, nahe } from './hilfen.mjs';

const BETRAG = ['ek_miete_wohnen', 'ek_miete_gewerbe', 'ek_miete_stellplatz', 'er_bw_verw_we', 'er_bw_verw_sp', 'er_bw_inst_m2', 'er_bw_inst_sp', 'er_bw_nuk', 'ek_brw'];
/* Beispiel wie bei Fabian: OG privat (120 m²), EG und UG Firma (240 m²), marktübliche Mieten 9,00 und 7,50 €/m² */
const BASIS = {
  ek_modus: 'haus', ek_baujahr: '1995', nhkhg_gnd: '67', nhkhg_base: '895, 895, 895, 1342, 1663', nhkhg_rnd: '40',
  ek_gs_flaeche: '900', ek_brw: '180', ek_wohnflaeche: '120', ek_nutzflaeche: '240', ek_anz_we: '1', ek_anz_stell: '4',
  ek_miete_wohnen: '12960', ek_miete_gewerbe: '21600', ek_miete_stellplatz: '0',
  er_bw_verw_we: '300', er_bw_verw_sp: '48', er_bw_inst_m2: '12', er_bw_inst_sp: '100', er_bw_mietausfall: '2', er_bw_nuk: '0',
  er_bewirt: '20', er_zins_basis: '4', er_zins_adj: '0', er_gewerbe: '0', gewichtung: '0.4', markt_faktor: '1'
};
const MISCH = { mx_aktiv: true, mx_bwk: true, mx_verw_g: '3', mx_maw_g: '4', mx_inst_g: '100', mx_lz_modus: 'gesamt' };
const rechne = (f, jahr = 2026) => K.bewerte(leser(f, BETRAG), { jahr });

test('ausgeschaltet: Ergebnis wie ohne den Abschnitt (pauschal 20 %)', () => {
  const ohne = rechne(BASIS), aus = rechne({ ...BASIS, ...MISCH, mx_aktiv: false });
  assert.deepEqual(aus.R, ohne.R);
  assert.equal(aus.D.misch, null);
  nahe(assert, ohne.R.bewirt, 34560 * 0.2, 1e-9, 'Pauschale');
});

test('Bewirtschaftungskosten getrennt nach Anlage 3: Wohnen je Wohnung und m², Gewerbe 3 % / 4 % / 100 % je m²', () => {
  const { R, D } = rechne({ ...BASIS, ...MISCH });
  const q = D.bwQuelle;
  assert.equal(q.art, 'misch');
  nahe(assert, q.wohnen.verw, 1 * 300 + 4 * 48, 1e-9, 'Verwaltung Wohnen');
  nahe(assert, q.wohnen.inst, 120 * 12 + 4 * 100, 1e-9, 'Instandhaltung Wohnen');
  nahe(assert, q.wohnen.mausf, 12960 * 0.02, 1e-9, 'Mietausfallwagnis Wohnen');
  nahe(assert, q.gewerbe.verw, 21600 * 0.03, 1e-9, 'Verwaltung Gewerbe');
  nahe(assert, q.gewerbe.inst, 240 * 12 * 1.0, 1e-9, 'Instandhaltung Gewerbe');
  nahe(assert, q.gewerbe.mausf, 21600 * 0.04, 1e-9, 'Mietausfallwagnis Gewerbe');
  nahe(assert, R.bewirt, 492 + 1840 + 259.2 + 648 + 2880 + 864, 1e-9, 'Summe');
  assert.equal(R.bwMisch, true);
  // Ertragswert mit diesen Kosten: (Rohertrag − BWK − Bodenwert × 4 %) × Vervielfältiger (4 %, 40 J) + Bodenwert
  const boden = 900 * 180, vf = (1 - Math.pow(1.04, -40)) / 0.04;
  nahe(assert, R.ertrag, (34560 - 6983.2 - boden * 0.04) * vf + boden, 0.01, 'Ertragswert');
  // Instandhaltung Gewerbe 30 % (Lager, Produktion)
  nahe(assert, rechne({ ...BASIS, ...MISCH, mx_inst_g: '30' }).D.bwQuelle.gewerbe.inst, 240 * 12 * 0.3, 1e-9, '30 %');
  // getrennte Kosten aus: wieder die Pauschale aus ⑥
  assert.equal(rechne({ ...BASIS, ...MISCH, mx_bwk: false }).D.bwQuelle.art, 'pauschal');
});

test('Liegenschaftszins anteilig nach Rohertrag; ohne beide Zinssätze bleibt der Basiszins', () => {
  const { R, D } = rechne({ ...BASIS, ...MISCH, mx_lz_modus: 'anteilig', mx_lz_w: '3', mx_lz_g: '5', er_zins_adj: '0,25' });
  const gew = 21600 / 34560;
  nahe(assert, D.misch.lzMisch, (1 - gew) * 3 + gew * 5, 1e-12, 'anteilig');
  nahe(assert, R.effLZ, (1 - gew) * 3 + gew * 5 + 0.25, 1e-12, 'mit Zu-/Abschlag aus ⑥');
  assert.equal(rechne({ ...BASIS, ...MISCH, mx_lz_modus: 'anteilig', mx_lz_w: '3' }).R.effLZ, 4);
  assert.equal(rechne({ ...BASIS, ...MISCH, mx_lz_w: '3', mx_lz_g: '5' }).R.effLZ, 4);   // Ansatz „gesamt“
});

test('Anteile: Stellplätze beim Wohnen, Mietrolle nach den Mietanteilen geteilt, ohne Mieten nach Fläche', () => {
  const mitSP = rechne({ ...BASIS, ...MISCH, ek_miete_stellplatz: '1440' }).D.misch;
  nahe(assert, mitSP.rohW, 12960 + 1440, 1e-9, 'Wohnen mit Stellplätzen');
  nahe(assert, mitSP.anteilG, 21600 / 36000, 1e-12, 'Gewerbeanteil');
  const mr = rechne({ ...BASIS, ...MISCH, er_mietrolle: true, mr_fl0: '120', mr_pm20: '0', mr_pau0: '1000', mr_fl1: '0', mr_pau1: '2000' }).D.misch;
  nahe(assert, mr.rohG, 36000 * (21600 / 34560), 1e-9, 'Mietrolle geteilt');
  const fl = rechne({ ...BASIS, ...MISCH, ek_miete_wohnen: '0', ek_miete_gewerbe: '0' }).D.misch;
  assert.equal(fl.anteilQuelle, 'flaeche');
  nahe(assert, fl.anteilG, 240 / 360, 1e-12, 'nach Fläche');
});

test('Wohnung: der Abschnitt gilt nicht; Prüfhinweise bei fehlender Gewerbemiete und fehlenden Zinssätzen', () => {
  const w = rechne({ ...BASIS, ...MISCH, ek_modus: 'wohnung' });
  assert.equal(w.D.misch, null);
  assert.notEqual(w.D.bwQuelle.art, 'misch');
  const f = { ...BASIS, ...MISCH, ek_miete_gewerbe: '0', mx_lz_modus: 'anteilig' };
  const { R, D } = rechne(f), P = K.pruefen(leser(f, BETRAG), R, D, new Set());
  const t = P.hinweise.filter(h => h.art === 'misch').map(h => h.text).join(' | ');
  assert.match(t, /Gewerbefläche ohne Gewerbemiete/);
  assert.match(t, /Liegenschaftszins für Wohnen und Gewerbe eintragen/);
  const ok = { ...BASIS, ...MISCH }, r2 = rechne(ok);
  assert.equal(K.pruefen(leser(ok, BETRAG), r2.R, r2.D, new Set()).hinweise.filter(h => h.art === 'misch').length, 0);
});
