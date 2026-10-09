# CLAUDE.md – ImmoApp (Preisermittlung)

Kontext und Regeln für Claude Code in diesem Repo. Vor Änderungen an Bewertungslogik lesen. Begründungen stehen in
DECISIONS.md (D1 …), der Stand in ROADMAP.md und SUMMARY.md, die Bedienung in docs/App-Bedienung.md.

## Projekt
- Offline-PWA zur rechnerischen Preisermittlung von Immobilien für Immobilienberater einer Volksbank in Baden-Württemberg;
  dazu Liegenschaften der Bank, Marktüberblick, Beratungs- und Vermarktungswerkzeuge (Kacheln).
- Live: https://bababraun.github.io/preisermittlung/ (GitHub Pages, Repo BabaBraun/preisermittlung, öffentlich).
- Bleibt eine PWA: keine native App (D19/D20), kein Server, keine kostenpflichtigen Dienste. Daten nur im Gerät
  (IndexedDB, localStorage). Funktionen, die einen Server brauchen, erst „auf dem Bankserver“.

## Aufbau
- `index.html`: Formular und Skriptreihenfolge. `js/`: reine Module ohne DOM (globalThis + module.exports, in Node testbar),
  z. B. kern.js (`bewerte()`, `pruefen()`), modell.js (BelWertV), jahresbewertung.js (Liegenschaften-Vordruck), *-regeln.js.
  `src/`: Oberfläche (base.js mit TYPES und Prüfregeln, valuation.js, report.js, werkzeuge.js + wz-*.js, misch.js …).
  `assets/`: CSS. `vendor/`: fremde Bibliotheken, Lizenzen in vendor/LIZENZEN.md.
- `npm run build` erzeugt sw.js mit Inhalts-Hash — nach jeder Änderung an ausgelieferten Dateien ausführen und mit committen.

## Harte Regeln
1. **Datenschutz:** Repo und Pages sind öffentlich. Keine bankinternen Daten (Liegenschaften, Kunden, Mieter, Mitarbeiter,
   Anschriften interner Objekte, Gutachten) committen; Tests nur mit erfundenen Daten. Echte Daten bleiben in lokalen Dateien
   außerhalb des Repos. Ein lokaler pre-commit-Haken (.git/hooks/sperre.py) stoppt solche Commits — nie mit `--no-verify`
   umgehen. Keine sensiblen Kundendaten ungeschützt speichern (DSGVO); Personen nur über die Kundenakte, keine Namen in Rechnern.
2. **Bewertungen und Liegenschaften nicht umbauen:** Darstellung (lange, aufklappbare Liste) und Abläufe bleiben. Neues als
   eigene Kachel oder eigener, zuschaltbarer Abschnitt; Umgestaltung nur farblich — außer auf ausdrücklichen Wunsch.
3. **Rechenlogik nie ohne Test ändern.** Referenzfälle: tests/fixtures/golden.json (Charakterisierung) — Änderungen nur mit
   Beleg in tests/fixtures/golden-aenderungen.md; unabhängige Nachrechnung in tests/referenz/*.py; Selbsttest (selbsttest.js).
   Bei Abweichung erst die Ursache klären, nicht den Sollwert anpassen.
4. **Rechenlogik ohne DOM** in js/; die Oberfläche zeigt nur Ergebnisse an.
5. **Keine Werte erfinden:** Marktdaten (Liegenschaftszins, Sachwertfaktor, Bodenrichtwert, Mieten) sind Eingaben (D9).
6. **Quellen:** Rechts- und Fachaussagen nur mit am Wortlaut geprüfter Quelle (gesetze-im-internet.de, BGBl.) und zitiert.
   Das GEG heißt seit 2026 Gebäudemodernisierungsgesetz (GModG).
7. Bei fachlicher Unsicherheit nachfragen statt raten; Annahmen im Code kommentieren.

## Fachliche Grundlagen (ImmoWertV 2021; Verkehrswert § 194 BauGB)
- Ablauf: vorläufiger Verfahrenswert → Marktanpassung → besondere objektspezifische Grundstücksmerkmale (§ 8 Abs. 3).
- **Ertragswert** (§§ 27–34): Rohertrag = marktüblich erzielbar (§ 31 Abs. 2); Reinertrag = Rohertrag − Bewirtschaftungskosten;
  Gebäudereinertrag = Reinertrag − Bodenwert × Liegenschaftszins; × Barwertfaktor (qⁿ − 1)/(qⁿ(q − 1)); + Bodenwert.
  Kein Sachwertfaktor im Ertragswert.
- **Bewirtschaftungskosten** (Anlage 3): Wohnen Verwaltung je Wohnung (2021: 298 €, Eigentumswohnung 357 €, Garage 39 €),
  Instandhaltung je m² Wohnfläche (2021: 11,70 €, Garage 88 €), Mietausfallwagnis 2 %. Gewerbe Verwaltung 3 %, Mietausfallwagnis
  4 %, Instandhaltung 100 % (Büros, Praxen, Geschäfte) / 50 % (SB-Märkte u. ä.) / 30 % (Lager, Logistik, Produktion) des
  Wohnansatzes je m². Wohnbeträge jährlich nach dem Verbraucherpreisindex fortschreiben (Basis Oktober 2001).
- **Sachwert** (§§ 35–39): NHK 2010 (Anlage 4) × BGF × Baupreisindex × Regionalfaktor; Alterswertminderung linear;
  Restnutzungsdauer nach Anlage 2 (Modernisierungspunkte, für Wohngebäude); Gesamtnutzungsdauer nach Anlage 1.
  Gebäudetypen in src/base.js `TYPES` (Ein-, Doppel-, Reihenhäuser mit allen NHK-Zeilen, D67). Die Schlüssel stehen in
  gespeicherten Bewertungen — umbenennen nur mit Migration (`TYP_ALT`).
- **Vergleichswert** (§§ 24–26): Vergleichspreise bzw. -faktoren, Anpassung über Indexreihen und Umrechnungskoeffizienten
  (Ausbau offen). Bei Eigentumswohnungen ersetzt er den Sachwert.
- **Beleihungswert** (BelWertV, js/modell.js) getrennt vom Verkehrswert; Ertragswert maßgeblich, eigene Mindestsätze.

## Bank-Praxis (bewusst so)
- Preisempfehlung = gewichtetes Mittel Substanz : Ertrag (Gewichtung je Gebäudetyp); „Abschlag gewerbliche Vermietung“.
- Der Liegenschaften-Vordruck rechnet und rundet wie die Excel-Mappe der Bank, mit Zwischenrundungen (D24).
- Baupreisindex: amtlicher Index Baden-Württemberg wie im Bank-Vordruck (D23); der Bundesindex (§ 36 Abs. 2) ist offen.

## Fallstricke
- `ek_miete_wohnen`, `ek_miete_gewerbe`, `ek_miete_stellplatz` sind Jahresbeträge.
- Zahlen über `zahlLesen(s, betrag)`: „450.000“ ist nur in Betragsfeldern 450000 — beim Schreiben ohne Tausenderpunkt.
- Neue, zuschaltbare Abschnitte: ausgeschaltet ohne Wirkung auf bestehende Fälle; Anzeigen nicht `o_…` nennen
  (die Charakterisierung liest alle `o_`-Ausgaben).
- src/app-shell.js ersetzt `pickVordruck` (ohne Rückgabewert). Eine erneut gewählte, schon ausgewählte Option löst kein change aus.

## Tests und Arbeitsweise
- `npm run test:unit` (Node), `npm run test:browser` (Playwright, desktop + iphone),
  Klicktest: `node tests/klick/klicktest.mjs desktop|iphone --nur="Bereich"`.
- Nur Betroffenes testen; die ganze App und große Prüfungen nur auf Wunsch. Klicktest nur für neue oder geänderte Bereiche,
  in GitHub nur auf Anfrage („Run workflow“). Oberflächen auch in Handy-Breite (iPhone, WebKit) prüfen.
- Commits auf Deutsch. Push: `GIT_TERMINAL_PROMPT=1 git -c credential.guiPrompt=true push origin main`.
- Nichts herunterladen ohne Rückfrage, keine Konten anlegen, keine System- oder Sicherheitseinstellungen ändern.
  OpenImmo-XSD nie ins Repo; Namen, Design und Texte von FIO nicht übernehmen.
- Begriffe in Code und Oberfläche deutsch, mit richtigen Umlauten.
