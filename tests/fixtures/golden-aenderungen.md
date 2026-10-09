# Fachliche Änderungen am Rechenkern

`tests/fixtures/golden.json` hält die Rechenergebnisse der Vergleichsfälle fest. Der Stand wurde am
2026-09-29 **vor** dem Umbau des Rechenkerns aufgenommen; der Umbau selbst war ergebnisgleich (Commit
„Rechenkern in js/kern.js ausgelagert“). Jede spätere Abweichung ist hier mit Quelle und Vorher/Nachher
belegt. Ohne Eintrag hier darf sich golden.json nicht ändern.

---

## 1. Gebäudealter bezieht sich auf den Wertermittlungsstichtag

- **Quelle:** § 4 Abs. 1 ImmoWertV 2021 — das Alter ergibt sich aus der Differenz zwischen dem
  Kalenderjahr des maßgeblichen Stichtags und dem Baujahr.
- **Fehler vorher:** Die App rechnete mit dem laufenden Kalenderjahr. Eine gespeicherte Bewertung
  änderte dadurch jedes Jahr beim Öffnen ihren Wert, und eine Bewertung auf einen zurückliegenden
  Stichtag war falsch.
- **Nachher:** Bezugsjahr ist das Jahr aus „Wertermittlungsstichtag“; ohne Stichtag wie bisher das
  laufende Jahr.
- **Beispiel** (Referenzfall Wohnhaus, Baujahr 1985, Stichtag 01.09.2026, geöffnet im Jahr 2027):
  vorher Alter 42 → Restnutzungsdauer 43,35 J; nachher Alter 41 → 43,99 J (wie am Stichtag).
  Nachgewiesen im Test `tests/unit/kern.test.mjs` („Alter bezieht sich auf das Stichtagsjahr“).
- **golden.json:** keine Änderung, weil alle Vergleichsfälle den Stichtag 2026 bzw. die feste Testuhr
  2026 verwenden.

## 2. Restnutzungsdauer bei einem Alter über der Gesamtnutzungsdauer — keine Formeländerung

- **Befund:** Die Formel der Anlage 2 ImmoWertV (RND = a·Alter²/GND − b·Alter + c·GND) ist eine nach oben
  offene Parabel. Jenseits ihres Scheitels (bei 0 Punkten ab 1,05 × GND) steigt die Restnutzungsdauer mit
  zunehmendem Alter wieder an; im Vergleichsfall `extremwerte` (Baujahr 1850, GND 80, 9 Punkte) ergeben sich
  78,93 Jahre (98,7 % der GND).
- **Prüfung:** Anlage 2 und die gefundenen Kommentierungen regeln den Fall Alter > GND nicht ausdrücklich.
  Das Modell „geht davon aus, dass die Restnutzungsdauer auf maximal 70 Prozent der jeweiligen
  Gesamtnutzungsdauer gestreckt wird“. Ein reales Verkehrswertgutachten (Referenz „ALEX99“, Alter 121,
  GND 80, 8 Punkte) wendet die Formel unbegrenzt an und kommt auf 38,41 Jahre.
- **Entscheidung:** Kein Eingriff in die Formel, weil ein Fehler nicht nachgewiesen ist. Stattdessen meldet
  die Eingabeprüfung einen Hinweis, sobald das Alter die GND übersteigt und keine Restnutzungsdauer von
  Hand gesetzt ist, und bei einem Ergebnis über 70 % der GND einen kritischen Hinweis — die Bewertung
  erscheint dann nicht unbemerkt als plausibel.
- **golden.json:** keine Änderung.

## 3. Höchst-Restnutzungsdauer im Beleihungswert je Objektart

- **Quelle:** Anlage 2 BelWertV (Höchstnutzungsdauern) — die Auswahl „Objektart“ im Abschnitt 9c.
- **Fehler vorher:** Der gewählte Wert wurde als Feldname statt als Zahl gelesen (`num('60')`) und war
  deshalb immer 0 → es galt stets 80 Jahre, auch bei Geschäfts-/Bürohaus (60), Hotel/Lager (40) und
  Freizeitimmobilie (30).
- **Nachher:** Die Auswahl wird als Zahl gelesen.
- **Beispiel:** Geschäftshaus, Restnutzungsdauer-Eingabe 70 J: vorher 70 J angesetzt, nachher auf
  60 J gekürzt (Test `tests/unit/kern.test.mjs`, „Höchst-RND im Beleihungswert“).
- **golden.json:** keine Änderung (alle Vergleichsfälle nutzen „Wohnhaus — max. 80 Jahre“).

## 4. Minuszeichen „−“ (U+2212) und Gedankenstrich werden als Minus gelesen

- **Fehler vorher:** „−3.000“ (typografisches Minus, z. B. aus einem kopierten Bericht) wurde als
  +3.000 gelesen — das Vorzeichen ging still verloren.
- **Nachher:** −, ‒ und – vor einer Zahl gelten als Minus.
- **golden.json:** keine Änderung.

## 5. Eingabeprüfung: keine Preisempfehlung aus ungültigen oder fehlenden Angaben (nur Anzeige)

- **Anforderung:** Ungültige Eingaben dürfen nicht unbemerkt als plausible Bewertung erscheinen.
- **Fehler vorher:** Ein leeres Formular zeigte eine Preisempfehlung von 25.875 € (nur aus Vorgabewerten).
  Text statt Zahl („abc“) wurde still als 0 gerechnet, negative Bodenrichtwerte und Abschläge über 100 %
  liefen ohne Hinweis durch.
- **Nachher:** `ImmoKern.pruefen()` prüft jedes Feld, das die Rechnung liest (gültige Zahl, nicht negativ,
  Prozent ≤ 100), die NHK-Kostenkennwerte, die Modellgrenze der Anlage 2 und die Mindestangaben
  (Haus: Bodenwert, BGF bei Sachwertgewicht > 0; Wohnung: Wohnfläche, Vergleichspreis; Miete bei
  Ertragsgewicht > 0). Bei Status „fehler“ oder „unvollständig“ zeigen Seitenleiste und Abschnitt ⑨ „–“
  mit Begründung; der Bericht trägt oben einen Entwurfshinweis mit allen Gründen und weist den Wert als
  „Entwurf“ aus. Die Rechnung selbst (window._R) ist unverändert.
- **golden.json:** neues Anzeigefeld `o_empf_status` in allen Fällen (leer bei gültigen Bewertungen);
  Fall `leer`: Empfehlung 25.875 € → „–“ („Bodenwert fehlt · Bruttogrundfläche fehlt · Keine Miete
  erfasst“); Fall `extremwerte`: 275.596 € → „–“ (3 ungültige Eingaben: Abschlag 120 %, Bodenrichtwert
  −50 €/m², Restnutzungsdauer jenseits der Modellgrenze).

## 6. Numerische Stabilität bei kleinen positiven Zinsen (2026-09-30)

- Der mathematisch gleiche Barwertfaktor nutzt `expm1` und `log1p`, um Auslöschung bei Zinsen nahe null zu vermeiden.
- Vorher: bei 0,000000001 % und 20 Jahren 20,0000016548. Nachher: nahe 20 innerhalb 0,000001.
- Keine Änderung fachlicher Parameter oder Referenzbewertungen; Test `tests/unit/grenzfaelle.test.mjs`.

## 7. Restschuld zum Beginn des Tilgungsplans (2026-09-30)

- `restNach(0)` lieferte vorher die Restschuld am Ende des gesamten Plans. Jetzt ist es die ursprüngliche Darlehenssumme.
- Beispiel: 100.000 € Darlehen mit 0 % Zins und 10 % Tilgung: vorher praktisch 0 €, jetzt 100.000 € zum Beginn.
- Test `tests/unit/grenzfaelle.test.mjs`; keine Änderung der laufenden Bewertungs-Sollwerte.

## 8. Belegbare Modellansätze und getrennte Szenarien (2026-09-30)

- Quellen: BelWertV §§ 4, 11–14, 16 und Anlagen 1–3; ImmoWertV §§ 6, 8, 10, 46–47.
- Beleihung: mindestens 15 % Kernkosten, höhere Einzel-/Gesamtkosten und zusätzliche Kosten; mindestens 10 % Sicherheitsabschlag. Ertragswert als regulärer Ausgangswert. Nutzungsaufschläge und Sonderfälle für kurze Restnutzung bzw. nichtpositiven Gebäudeertrag werden berücksichtigt. Fehlende Grundlagen bleiben als Entwurf sichtbar.
- Wohnhaus-Referenz: bisher 285.773,30 €, jetzt 263.323,44 € Beleihungsszenario, wegen des ausdrücklich dokumentierten synthetischen Mindestzinses 5,5 % statt 5 %. Diese Quelle ist eine Testangabe, keine reale amtliche Veröffentlichung.
- Neue Formulare enthalten keine unbelegten Garagen-/Außenanlagenwerte. Beispiel- und Vergleichsfälle deklarieren ihre synthetischen Annahmen ausdrücklich.
- PV/Energetik: bereits im Grundwert enthaltene Vorteile werden nicht erneut gerechnet. Energiekosten-Barwerte werden separat ausgewiesen; der Energiekosten-Referenzfall verwendet ausdrücklich −12.000 € Marktansatz.
- Rechte: keine erfundene Lebenserwartung aus dem Alter. Vergleichsfälle geben bisherige Laufzeiten ausdrücklich als synthetische Annahmen an. Teilrechte verwenden keine automatische Gesamtmiete; steuerliche Szenarien werden nicht als Marktbelastung übernommen.
- Gewichtung, Quellen und Modellübereinstimmung werden separat dokumentiert; fehlende Angaben ändern den sichtbaren Prüfstatus.
- Frühere Vergleichsdaten sind unter `historisch/` archiviert. Neue Sollwerte wurden nach gezielten Regressionstests und unabhängigen Python-Vergleichsrechnungen aufgenommen.

## 9. Nießbrauch: Sterbetafel oder eigene Laufzeit — nur Anzeigetext (2026-09-30)

- Quelle: Statistisches Bundesamt, Sterbetafel 2023/2025 (D20). Keine Zahl der Vergleichsfälle ändert sich:
  alle Fälle mit Recht haben eine eigene Laufzeit und werden als „Eigene Laufzeit“ geladen.
- `o_ni_kwinfo`: vorher „(Restleben ≈ 0,00 J)“ auch ohne aktives Recht, bei eigener Laufzeit leer. Jetzt ohne
  aktives Recht leer, bei eigener Laufzeit „(Zeitrente über … J)“, bei Sterbetafel „(Leibrente, Sterbetafel …)“.
- Tests: `tests/unit/kern.test.mjs` (64 Fälle gegen `tests/referenz/leibrente.py`),
  `tests/unit/modellkorrekturen.test.mjs`, `tests/e2e/modellkorrekturen.spec.mjs`.


## 10. Mietertrag je Gebäude — nur neue Anzeigefelder (2026-10-02)

- Quelle: Vordruck der Bank „Preiseinschätzung Bank- und Lagergebäude“ (Ertrag je Gebäude mit eigener
  Restnutzungsdauer, Boden nach Mietanteil), ImmoWertV § 27 ff.; D33.
- Keine Zahl und kein bisheriger Text der zehn Vergleichsfälle ändert sich (maschinell verglichen): Keiner hat eine
  Miete für den Anbau eingetragen, der Anteil des Hauptgebäudes ist damit genau 1.
- Neu in `texte`: `o_er_hg_info`, `o_er_hg_wert`, `o_er_an_info`, `o_er_an_wert` (leer bzw. „0 €“ — die Zeilen je
  Gebäude sind ausgeblendet, solange nichts aufgeteilt ist).
- Tests: `tests/unit/kern.test.mjs` (Handrechnung), neuer Fall `haus_anbau_miete_je_gebaeude` der Python-
  Vergleichsrechnung (`tests/referenz/`), Selbsttest, `tests/e2e/app-bedienung.spec.mjs`.

## 11. Neue Gliederung der Bewertung — nur Anzeigetexte (2026-10-02)

- Anlass: Gliederung neu (D35) — Grundstück, Flächen, Baujahr und Mieten stehen unter „Allgemeine Angaben“ statt in
  den Eckdaten; § 8 Abs. 3 in zwei Listen (Abschläge, Zuschläge).
- Keine Zahl der Vergleichsfälle ändert sich (maschinell verglichen, 9 Unterschiede, alle in `texte`):
  - `o_er_rohsrc` (8 Fälle): „(Wohnen + Gewerbe + Stellplätze aus Eckdaten)“ → „… aus den Allgemeinen Angaben)“.
  - `o_wk_summe` (`haus_anbau_niessbrauch_vergleich`): „9.000 €“ → „− 9.000 €“ — der Saldo zeigt jetzt, ob er
    abgezogen oder zugeschlagen wird (vorher erschien ein Zuschlag in der Preisempfehlung als „− -… €“).
- Tests: neue Fälle `haus_merkmale_zuschlag_als_art` und `haus_merkmale_ausgeschaltet` der Python-Vergleichsrechnung,
  `tests/unit/referenz.test.mjs` (Zuschlag als Art = früherer negativer Betrag), Browsertests der neuen Gliederung.


## 12. Vergleichswert im Beleihungswert, fehlende Bauteile — nur neue Felder und ein Hinweistext (2026-10-02)

- Quelle: BelWertV § 19 Abs. 1 (Vergleichswert mit Sicherheitsabschlag von mindestens 10 %), § 4 Abs. 1 und 2
  (Vergleichswert statt Sachwert als Kontrollwert bei Ein- und Zweifamilienhäusern und Wohnungseigentum,
  Orientierung bei Eignung zur Eigennutzung); fehlende Bauteile: Vordruck der Bank / Jahresbewertung (D24) —
  Kostenanteil 0, die übrigen Anteile werden nicht hochgerechnet; D37.
- Keine Zahl der zehn Vergleichsfälle ändert sich (maschinell verglichen): Keiner hat einen Vergleichswert im
  Beleihungswert eingetragen oder ein Bauteil als fehlend markiert.
- Neu in `zahlen`: `bwVgl`, `bwVglSicherP` (10 — Mindestsatz), `bwVglSicherBetrag`, `bwVergleich` (0), `bwKontroll`
  („sach“ — wie bisher). Neu in `texte`: `o_bw_vgl_sicher_p`, `o_bw_vgl_sicherbetrag`, `o_bw_vergleich`, `o_bw_e_vgl`.
- Geändert (Fälle `leer` und `extremwerte`, `plTxt` / `o_pl_text`): „Wohn-/Nutzfläche in ① eintragen …“ →
  „Wohn-/Nutzfläche unter „Allgemeine Angaben“ eintragen …“ — die Fläche steht seit D35 nicht mehr in ①.
- Tests: `tests/unit/kern.test.mjs` (fehlende Bauteile), `tests/unit/modellkorrekturen.test.mjs` (Vergleichswert,
  Mindestabschlag, Prüfungen nach § 4), neuer Fall `gewerbe_ohne_heizung_sanitaer` der Python-Vergleichsrechnung,
  Browsertests (D37) in `tests/e2e/app-bedienung.spec.mjs`.


## 13. Gebäudetypen nach NHK 2010 für Ein-, Doppel- und Reihenhäuser — keine Änderung der Vergleichsfälle (2026-10-09)

- Quelle: Anlage 4 ImmoWertV 2021, Teil II Nr. 1 (amtliche Grafik j2805-1_0090.jpg), gleichlautend Sachwertrichtlinie 2012
  Anlage 1 (BAnz AT 18.10.2012 B1, S. 12) und Anlage 24 BewG — am 09.10.2026 aus allen drei Quellen gelesen, 36 Typen × 5 Stufen
  übereinstimmend; D67.
- Korrigiert: „EFH freistehend · nicht unterkellert, DG ausgeb.“ trug die Werte der Zeile 1.02 (545/605/695/840/1050, unterkellert,
  DG nicht ausgebaut). Richtig ist 1.21 (nur EG, 790/875/1005/1215/1515) bzw. 1.31 (EG + OG, 720/800/920/1105/1385).
- Umbenannt (Werte gleich): „unterkellert, DG nicht ausgeb.“ → „unterkellert, EG + OG, DG nicht ausgeb.“ (1.12),
  „unterkellert, Flachdach“ → „unterkellert, EG + OG, Flachdach“ (1.13). Neu: alle übrigen Zeilen 1.02–3.33.
- Keine Zahl und kein Text der Vergleichsfälle ändert sich: Kein Fall nutzt die geänderten Typen; alle tragen ihre Kostenkennwerte
  fest ein (Charakterisierung und Selbsttest unverändert grün).
- Tests: `tests/unit/nhk2010.test.mjs` (alle 33 Typen gegen die Tabelle als Literal, Bezeichnung passend zu Keller/Geschossen/Dach,
  frühere Schlüssel), `tests/e2e/nhk2010.spec.mjs` (Auswahlliste, Umstellung beim Öffnen, Hinweis auf die alten Werte).
