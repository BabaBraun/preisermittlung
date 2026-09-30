/* Synthetische Liegenschaft für Browsertests der Verwaltung (keine echten Personen oder Konten).
   IBAN: das bekannte Beispiel aus der Norm-Dokumentation (DE89 3704 0044 0532 0130 00). */
export const LIEGENSCHAFT_TEST = {
  id: 'Ltest1', name: 'Testweg 5', strasse: 'Testweg 5', plz: '74360', ort: 'Ilsfeld', art: 'mfh', eigentuemerArt: 'bank',
  eigentuemerName: 'Testbank eG', baujahr: 1968, wert: 900000, kontoInhaber: 'Testbank eG', iban: 'DE89370400440532013000', bank: 'Testbank',
  einstellungen: { kappung15: false, basiszins: [] },
  einheiten: [
    { id: 'Et1', nr: 'W1', lage: 'EG links', art: 'wohnung', flaeche: 70, zimmer: 3 },
    { id: 'Et2', nr: 'W2', lage: 'EG rechts', art: 'wohnung', flaeche: 55, zimmer: 2 },
    { id: 'Et3', nr: 'L1', lage: 'Laden', art: 'gewerbe', flaeche: 90, sollmiete: 1100 }
  ],
  vertraege: [
    { id: 'Vt1', einheitId: 'Et1', beginn: '2024-04-01', mietart: 'index', mieter: [{ name: 'Anna Test', telefon: '0000 000' }], personen: 2,
      miete: { kalt: 780, nk: 160, hk: 95, zuschlag: 0, ust: 0 }, aenderungen: [], kaution: { soll: 2340, art: 'bar', raten: false }, sonderposten: [],
      index: { basisMonat: '2024-01', basisWert: 117.6 } },
    { id: 'Vt2', einheitId: 'Et2', beginn: '2026-01-01', ende: '2026-11-30', mietart: 'fest', mieter: [{ name: 'Bernd Beispiel' }], personen: 1,
      miete: { kalt: 610, nk: 130, hk: 80, zuschlag: 40, ust: 0 }, aenderungen: [], kaution: { soll: 1830, art: 'sparbuch', raten: true }, sonderposten: [] }
  ],
  zahlungen: [
    { id: 'Zt1', vertragId: 'Vt1', datum: '2026-07-02', betrag: 1035, art: 'miete' },
    { id: 'Zt2', vertragId: 'Vt1', datum: '2026-08-04', betrag: 1035, art: 'miete' },
    { id: 'Zt3', vertragId: 'Vt2', datum: '2026-01-02', betrag: 610, art: 'kaution' }
  ],
  mahnungen: []
};
