# ImmoApp

Web-App für Immobilienberater: rechnerische Preisermittlung nach ImmoWertV (Sachwert, Ertragswert,
Vergleichswert), Beleihungswert nach BelWertV, Aufnahmebogen, Fotos und Grundrisse, Bericht, Exposé,
Präsentation, Vermarktung, Kundenakte, Finanzierung und Investitionsrechnung — als installierbare
Web-App (PWA), die auch offline funktioniert.

Die App läuft vollständig im Browser. **Alle Daten bleiben auf dem Gerät**; es gibt keinen Server und keine
Übertragung an Dritte. Die Ergebnisse sind eine rechnerische Preiseinschätzung und **kein
Verkehrswertgutachten**.

Aufruf: <https://bababraun.github.io/preisermittlung/> — Installation auf dem Handy siehe
[ANLEITUNG-App-aufs-Handy.md](ANLEITUNG-App-aufs-Handy.md).

## Funktionsumfang

- **Bewertung:** 9 Vordrucke (Wohnung, Wohnhaus, Gewerbe); Sachwert über NHK 2010 mit Standardstufen,
  Baupreisindex und Regionalfaktor; Restnutzungsdauer nach Modernisierungspunkten (Anlage 2 ImmoWertV,
  Alter bezogen auf das Stichtagsjahr); Ertragswert mit Mietrolle und Bewirtschaftungskosten; Vergleichswert;
  Nießbrauch, Wohnungsrecht, Leibrente, Erbbaurecht; Wertkorrekturen § 8 Abs. 3; PV-Anlage; energetische
  Qualität; Sanierungsweg mit Förderung; Beleihungswert nach BelWertV; Datengrundlagen und
  Modellkonformität (§ 10 ImmoWertV); Lage-Check.
- **Eingabeprüfung:** ungültige Zahlen, unzulässig negative Werte, Prozentwerte über 100 und fehlende
  Mindestangaben werden gemeldet; dann zeigt die App keine Preisempfehlung, der Bericht ist als Entwurf
  gekennzeichnet.
- **Dokumente:** Bericht (Abschnitte wählbar), Exposé, Präsentation für das Akquisegespräch,
  Eigentümer-Bericht zur Vermarktung, Unterlagenliste, Investitionsrechnung — als Druckansicht, PDF, Word
  (`.docx`) und Excel (`.xlsx`), alles offline.
- **Beratung:** Kundenakte mit Suchprofil und Käuferabgleich, Wiedervorlagen, Finanzierungsrechner mit
  Budget-Check, Marktüberblick (eigene Angebots- und Kaufpreise mit Auswertung).
- **Liegenschaftsverwaltung:** Liegenschaften von Kunden, eigene und Objekte der Bank mit Einheiten und
  Mietverträgen (Fest-, Staffel-, Indexmiete); Sollstellung mit Fälligkeit am 3. Werktag, Zahlungseingänge,
  offene Posten nach § 366 BGB, Verzugszinsen, Mahnvorschlag und Mahnschreiben (Word), Hinweis auf die
  Kündigungsschwelle, Kaution nach § 551 BGB, Leerstand, Fristen; Mieterliste und Mietkonto als Excel.
  Betriebs- und Heizkostenabrechnung: Kosten nach § 2 BetrKV mit Leistungszeitraum, Verteilerschlüssel
  (Fläche, Personen, Einheiten, MEA, Verbrauch, direkt) und Umlagekreis; Heizung und Warmwasser nach
  HeizkostenV (§§ 7–9b) oder laut Messdienst; CO2-Kostenaufteilung; § 35a-Anteile; Abrechnung je Mieter (Word),
  Übersicht (Excel), Buchung ins Mietkonto mit Anpassung der Vorauszahlungen; Frist nach § 556 Abs. 3 BGB.
  Instandhaltung: Schäden und Aufträge mit Dringlichkeit, Stand, Fotos, Verlauf, Dienstleister, Angebot und
  Rechnung (automatisch in den Kosten), Auftrag an den Handwerker als Word; Wartungs- und Prüfpflichten aus
  einem Katalog mit Rechtsgrundlage (Rauchwarnmelder, Legionellen, Aufzug, Schornsteinfeger u. a.) mit
  Fälligkeiten in den Fristen.
  WEG-Verwaltung: Eigentümer mit Miteigentum und Eigentümerwechsel, Wirtschaftsplan mit Einzelwirtschaftsplänen
  und Fortgeltung, Hausgeldkonten, Sonderumlagen, Jahresabrechnung mit Abrechnungsspitze und
  Vermögensbericht, Versammlungen mit Einladungsfrist, Abstimmung (Kopf-, Wert-, Objektprinzip; § 21 WEG),
  Einladung und Niederschrift als Word, Beschluss-Sammlung mit Vermerken (Excel).

## Aufbau

Die Dateien werden so ausgeliefert, wie sie im Repository liegen. Einziger Build-Schritt: `npm run build`
erzeugt `sw.js` aus `sw.template.js` — Version aus dem Inhalts-Hash, vollständige Liste der Offline-Dateien.
Nach jeder Änderung an App-Dateien ausführen und `sw.js` mit committen; GitHub Actions prüft das.

| Datei | Zweck |
|---|---|
| `index.html` | Formulare und Grundgerüst der Oberfläche; lädt die Module in fester Reihenfolge |
| `src/*.js` | Oberfläche in Modulen (Navigation `app-shell.js`, Bewertung, Bericht, Exporte, Kunden, Markt, Grundrisse, Fotos u. a.); `src/init.js` startet zuletzt |
| `assets/` | Stylesheets (`app.css`, `app-shell.css`, `verwaltung.css`) und lokale Schriften IBM Plex (SIL OFL) |
| `js/kern.js` | Rechenkern ohne Bildschirmzugriff: alle Bewertungsverfahren, Eingabeprüfung, Finanzierung, Investition |
| `js/modell.js` | Beleihungswert nach BelWertV, Modell- und Quellenprüfung der Preisempfehlung |
| `js/sterbetafel.js` | amtliche Sterbetafel (Statistisches Bundesamt) für Nießbrauch, Wohnungsrecht, Leibrente — automatisch erzeugt |
| `js/speicher.js` | Speicherschicht (IndexedDB öffnen, Transaktionen, die bei Fehlern vollständig abbrechen) |
| `js/daten.js` | Prüfung von Projekt-, Gesamt- und Marktdaten-Sicherungen vor dem Einlesen |
| `js/office.js` | Word- und Excel-Dateien (Office Open XML) ohne fremde Bibliothek |
| `js/pdf.js` | Seitenaufteilung für den PDF-Download |
| `js/verwaltung.js` | Rechenkern der Liegenschaftsverwaltung ohne Bildschirmzugriff (Sollstellung, offene Posten, Zinsen, Fristen, Prüfung von Sicherungen) |
| `js/verwaltung-nk.js` | Rechenkern der Betriebs- und Heizkostenabrechnung (BetrKV, HeizkostenV, CO2KostAufG) |
| `js/verwaltung-ui.js` | Oberfläche der Liegenschaftsverwaltung; eigene Datenbank `ia_verwaltung` |
| `js/verwaltung-nk-ui.js` | Oberfläche „Nebenkosten“ (Kosten, Abrechnung, Word/Excel, Buchung) |
| `js/verwaltung-ih.js` | Instandhaltung und Prüfpflichten: Katalog, Fälligkeiten, Fristen, Übernahme in die Kosten |
| `js/verwaltung-ih-ui.js` | Oberfläche „Instandhaltung“ (Vorgänge mit Fotos, Pflichten) und „Dienstleister“ |
| `js/verwaltung-weg.js` | WEG: Einzelwirtschaftspläne, Hausgeld, Jahresabrechnung, Abstimmung, Fristen |
| `js/verwaltung-weg-ui.js` | Oberfläche „WEG“ (Eigentümer, Hausgeld, Jahresabrechnung, Versammlungen, Beschluss-Sammlung) |
| `vendor/html2pdf.bundle.min.js` | PDF-Baustein (MIT), unverändert, mit Integritäts-Hash — siehe `vendor/LIZENZEN.md` |
| `selbsttest.js` | Selbsttest im Export-Menü (wird nur bei Bedarf geladen) |
| `sw.js` | Service Worker für den Offline-Betrieb — erzeugt von `npm run build` (`scripts/build.mjs`), nicht von Hand ändern |
| `scripts/sterbetafel.py` | holt die neueste Sterbetafel von destatis.de (monatlich per GitHub-Action „Sterbetafel“) |
| `manifest.webmanifest`, `icons/` | App-Name, Farben, Symbole |
| `tests/` | automatisierte Tests (siehe unten) |

Entscheidungen mit Begründung stehen in [DECISIONS.md](DECISIONS.md), der Arbeitsstand in
[ROADMAP.md](ROADMAP.md), die letzte Zusammenfassung in [SUMMARY.md](SUMMARY.md).

## Tests

Voraussetzungen: Node.js 24, Python 3 mit den Bibliotheken aus `tests/requirements.txt` (PyMuPDF,
python-docx, openpyxl in festen Versionen) für die Prüfung der erzeugten Dateien. Fehlt Python, werden diese
Prüfungen lokal übersprungen; in GitHub Actions sind sie Pflicht.

```bash
npm install
npx playwright install chromium webkit
pip install -r tests/requirements.txt
npm test                     # Rechenkern, Office-Dateien, Sicherungsprüfung (Node, ohne Browser)
npm run test:e2e             # Browsertests: Desktop (Chromium) und iPhone 13 (WebKit)
npm run test:alle            # beides
python tests/referenz/sollwerte.py   # Sollwerte der unabhängigen Vergleichsrechnung neu erzeugen
python tests/referenz/verwaltung_sollwerte.py   # dasselbe für die Liegenschaftsverwaltung
PDF_SCHRIFT=Verdana npx playwright test pdf   # PDF-Umbrüche mit breiterer Ersatzschrift gegenprüfen
```

- **Node** (`tests/unit/`): Zahlenformate, Barwertfaktor, Restnutzungsdauer, Grenzfälle (Zins 0 %, Laufzeit 0,
  sehr alte Gebäude, leere, negative und extreme Werte), Finanzierung, Budget, Investition, die beiden
  Referenzbewertungen des Selbsttests und sieben Fälle gegen eine unabhängige Python-Vergleichsrechnung
  (`tests/referenz/`); Office-Dateien (mit python-docx/openpyxl geöffnet); Prüfung von Sicherungsdateien
  einschließlich älterer Formate; Liegenschaftsverwaltung (Feiertage, Fälligkeit, Sollstellung, offene Posten,
  Verzugszinsen über Basiszins-Wechsel, Kündigungsschwelle, Kaution, Leerstand, Betriebs- und
  Heizkostenabrechnung mit Mieterwechsel, Abgrenzung, § 9 HeizkostenV und CO2) gegen eine eigene
  Python-Vergleichsrechnung.
- **Browser** (`tests/e2e/`): Vergleich aller Rechenergebnisse mit dem festgehaltenen Stand
  (`tests/fixtures/golden.json`, Änderungen nur mit Beleg in `golden-aenderungen.md`), Selbsttest samt
  Erhalt der offenen Bewertung, Eingabeprüfung, Maskierung von Eingaben, Word/Excel/PDF/Druck,
  Datensicherung (vollständiger Ablauf, Datei-Import/-Export, Gesamtsicherung, PDF-Anhänge, beschädigte
  Dateien, voller Speicher, fehlende Datenbank), Übereinstimmung der Werte über alle Vordrucke,
  Offline-Start und Service-Worker-Update, alle Ansichten auf Desktop und iPhone.
- **Python-Prüfskripte** (`tests/referenz/pruefe_*.py`) öffnen die erzeugten Dateien mit unabhängigen
  Bibliotheken. Auf ihre Standardausgabe geht nur das JSON-Ergebnis; Meldungen der Bibliotheken landen auf
  stderr. Jede andere Ausgabe lässt den Test mit vollständiger stdout-/stderr-Ausgabe scheitern.
- **GitHub Actions** führt beides bei jedem Push aus (`.github/workflows/tests.yml`), im offiziellen
  Playwright-Image mit fertig installierten Browsern. Dessen Version muss zu `@playwright/test` in
  `package.json` passen — beim Aktualisieren beide ändern; `npm test` prüft das.
- Alle Testdaten sind synthetisch.

## Datensicherung

Die Daten liegen im Browser des jeweiligen Geräts (IndexedDB, dazu der Arbeitsstand im localStorage) und
werden **nicht** zwischen Geräten abgeglichen. Löscht man die App vom Home-Bildschirm oder die Website-Daten,
sind sie weg. Deshalb regelmäßig sichern und die Dateien außerhalb des Geräts ablegen (z. B. OneDrive der Bank):

| Was | Wo in der App | Datei |
|---|---|---|
| alle Projekte mit Fotos, Kunden, Wiedervorlagen, Marktberichte | Projekte → „Alle Projekte sichern“ | `ImmoApp Projekte JJJJ-MM-TT.json` |
| die offene Bewertung | Export-Menü → „Als Datei sichern“ | `<Adresse>.json` |
| Marktüberblick (schlank oder mit PDF-Anhängen) | Marktüberblick → Datensicherung | `Marktdaten_….json` |
| Liegenschaftsverwaltung (Liegenschaften, Verträge, Zahlungen, Kosten, Abrechnungen, Vorgänge mit Fotos, Pflichten, Dienstleister, Absender) | Liegenschaftsverwaltung → Datensicherung | `ImmoApp Verwaltung JJJJ-MM-TT.json` |

Einspielen: „Sicherung einspielen“ bzw. „Datei öffnen“ bzw. im Marktüberblick „Sicherung einlesen“ bzw. in
der Liegenschaftsverwaltung „Sicherung einspielen“. Jede
Datei wird vollständig geprüft, bevor etwas überschrieben wird; beschädigte oder fremde Dateien werden mit
einer Meldung abgelehnt, unlesbare Einträge übersprungen. Bei vorhandenen Einträgen gewinnt die neuere
Fassung. Ältere Dateiformate bleiben lesbar. **Die Dateien sind nicht verschlüsselt** — so sensibel
behandeln wie Kundenakten auf Papier.

**App-Sperre:** Face ID/Touch ID/Gerätecode verdecken die App, bis man sich ausweist. Das ist ein Sichtschutz,
**keine Verschlüsselung** der gespeicherten Daten. Geschützt werden die Daten durch Gerätesperre und
Geräteverschlüsselung des Betriebssystems.

## Bekannte Einschränkungen

- Nießbrauch/Wohnrecht/Leibrente: Sterbetafel ist eine Periodentafel (keine Generationentafel); individuelle
  Gesundheit bleibt unberücksichtigt — dafür „Eigene Laufzeit“ oder einen eigenen Faktor mit Quelle verwenden.
- Marktdaten des Gutachterausschusses (Sachwertfaktoren, Liegenschaftszinsen) sind nicht vorbelegt (D9).
- Der PDF-Download ist ein Bild-PDF (Text nicht durchsuchbar); für das Bewertungsdokument ist die
  Druckansicht („Als PDF sichern“) mit echtem Text vorzuziehen.
- Keine Synchronisation zwischen Geräten, kein Server (D2).
- Liegenschaftsverwaltung: Hinweise zu Kündigung, Kaution und Mahnung sind Arbeitshilfen, keine Rechtsberatung;
  Mahnschreiben vor dem Versand prüfen. Kappungsgrenzen-Gemeinden sind nicht hinterlegt (Häkchen je Liegenschaft).
  Der Pflichtenkatalog nennt übliche Turnusse als Richtwert; maßgeblich sind Bescheide, Herstellerangaben und die Anlage.
- Auf echten Geräten noch **nicht** geprüft, nur simuliert: Face ID/Touch ID (App-Sperre), Kamera beim
  Fotografieren, GPS im Aufnahmebogen, Teilen-Menü und „In Dateien sichern“ auf dem iPhone, Öffnen von
  `.ics`-Kalendereinträgen, Installation als Home-Bildschirm-App.
