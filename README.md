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
  Baupreisindex (amtliche Quartalswerte Baden-Württemberg für Wohn-, Büro- und gewerbliche Betriebsgebäude
  eingebaut, Übernahme zum Stichtag mit Umrechnung auf NHK 2010) und Regionalfaktor; Restnutzungsdauer nach Modernisierungspunkten (Anlage 2 ImmoWertV,
  Alter bezogen auf das Stichtagsjahr); Ertragswert mit Mietrolle und Bewirtschaftungskosten; Vergleichswert;
  Nießbrauch, Wohnungsrecht, Leibrente, Erbbaurecht; besondere objektspezifische Merkmale § 8 Abs. 3 (Ab- und
  Zuschläge); Aufnahmebogen, der Standardstufen, Modernisierungen und Technik in die Bewertung überträgt; PV-Anlage; energetische
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
- **Liegenschaften:** Liegenschaften der Bank mit ihren Preiseinschätzungen je Stichtag nebeneinander; je Liegenschaft
  und Stichtag ein Vordruck im Aufbau der Excel-Mappe der Bank (Deckblatt, 1. Objektdaten, 2. Bodenrichtwert,
  3. Bautechnische Daten, PV-Anlage, Grund und Boden, Bausubstanz, Mietertrag, Zusammenfassung) — jede Angabe änderbar
  und sofort neu gerechnet, mit den Rundungen des Vordrucks; Vorlagen für neue Vordrucke, alle Liegenschaften auf
  einen neuen Stichtag fortschreiben, Dokument (Drucken, PDF, Word), Übersicht als Excel; historischer Vergleich
  zweier Stichtage mit Veränderung je Kennzahl (jede Zahl änderbar, ohne Namen und Anschrift).
- **Beratung & Werkzeuge** (eigene Kacheln): Übergeben & Vererben (Schenkung oder Erbe mit Nießbrauch und Freibeträgen
  nach ErbStG/BewG), Wohnen im Alter (Einmalzahlung, Leibrente, Teilverkauf, Rückmiete), Übergabeprotokoll mit Fotos und
  Unterschriften auf dem Gerät, Mein Jahr (Aufträge, Provision, Herkunft), Grundstückspotenzial (Residualwert),
  ETW-Kaufcheck (Rücklage, Beschlüsse, Heizung), Wertmonitor (gesicherte Bewertungen fortschreiben), Notarauftrag
  (Angaben für den Kaufvertragsentwurf, Termin als Kalenderdatei, Übergabe), Portal-Export (Objekte mit Bildern als Datei im
  Austauschformat OpenImmo 1.2.7) und Datenstand (Rechengrundlagen und Daten: was ist aktuell, was steht an). Dazu (D40)
  Akquise, Interessenten mit Abgleich der Suchprofile, Bieterverfahren, Fotostudio (aufhellen, zuschneiden, schwärzen), Aushang für
  Schaufenster und Filiale,
  Vorlagen für Schreiben und E-Mails, Verkaufsfahrplan, Kalender mit Kalenderdatei und Besichtigungsnachweis, Aktivitäten je
  Zeitraum und Kaufen oder Mieten; dazu (D42) Kaufnebenkosten mit Notar und Grundbuch genau nach GNotKG und Provision mit
  Abrechnung, Rechnung und Zahlungseingang, (D43) Unterlagen je Verkauf mit Vollmacht und Anforderung je Stelle, (D44) Social-Media-Bild und -Text je Objekt, (D46) Rundschreiben als Serienbrief oder E-Mail in Bcc, (D48) Eigentümerbericht aus allen Quellen und Pflichtangaben der
  Genossenschaft unter allen Schreiben, (D50) Energieausweis nach dem GModG mit den Pflichtangaben ab 01.01.2027, Vorlage bei der Besichtigung und Übergabe an den Käufer, (D51) Werbung je Kanal und Datenschutzinformation in der Kundenakte, (D52) Anfrage-Mail einfügen, (D53) PDF schwärzen, (D54–D61) Maklerverträge, Geldwäsche-Prüfung, Tipps, Weitergaben, „Wer verkauft?“, Vermietet verkaufen, Schlüsselbuch und Objektauskunft. Die Kacheln
  stehen in vier Bereichen mit eigener Farbe. Jedes Werkzeug mit Dokument (PDF, Word) und Notiz in der Kundenakte.
- **Darstellung:** fünf Farbschemata (Petrol, Blau, Bordeaux, Graphit, Waldgrün), jeweils hell und dunkel.

## Aufbau

Die Dateien werden so ausgeliefert, wie sie im Repository liegen. Einziger Build-Schritt: `npm run build`
erzeugt `sw.js` aus `sw.template.js` — Version aus dem Inhalts-Hash, vollständige Liste der Offline-Dateien.
Nach jeder Änderung an App-Dateien ausführen und `sw.js` mit committen; GitHub Actions prüft das.

| Datei | Zweck |
|---|---|
| `index.html` | Formulare und Grundgerüst der Oberfläche; lädt die Module in fester Reihenfolge |
| `src/*.js` | Oberfläche in Modulen (Navigation `app-shell.js`, Bewertung, Bericht, Exporte, Kunden, Markt, Grundrisse, Fotos u. a.); `src/init.js` startet zuletzt |
| `assets/` | Stylesheets (`app.css`, `app-shell.css`, `liegenschaften.css`, `werkzeuge.css`) und lokale Schriften IBM Plex (SIL OFL) |
| `js/kern.js` | Rechenkern ohne Bildschirmzugriff: alle Bewertungsverfahren, Eingabeprüfung, Finanzierung, Investition |
| `js/modell.js` | Beleihungswert nach BelWertV, Modell- und Quellenprüfung der Preisempfehlung |
| `js/sterbetafel.js` | amtliche Sterbetafel (Statistisches Bundesamt) für Nießbrauch, Wohnungsrecht, Leibrente — automatisch erzeugt |
| `js/speicher.js` | Speicherschicht (IndexedDB öffnen, Transaktionen, die bei Fehlern vollständig abbrechen) |
| `js/daten.js` | Prüfung von Projekt-, Gesamt- und Marktdaten-Sicherungen vor dem Einlesen |
| `js/office.js` | Word- und Excel-Dateien (Office Open XML) ohne fremde Bibliothek |
| `js/pdf.js` | Seitenaufteilung für den PDF-Download |
| `js/liegenschaften.js`, `js/liegenschaften-ui.js` | Liegenschaften: Kern (Bewertungsverlauf, Sicherung) und Fenster mit Speicher (Datenbank `ia_verwaltung`), Formularen, Ansprechpartner, Datensicherung |
| `js/jahresbewertung.js`, `js/jahresbewertung-ui.js`, `js/jahresbewertung-editor.js`, `js/jahresbewertung-dok.js` | Preiseinschätzung nach dem Vordruck der Bank: Rechnung und Modell, Übersicht, Vordruck (Deckblatt, Kapitel wie die Excel-Mappe), Dokument (Drucken, PDF, Word), Fortschreibung |
| `js/liegenschaften-vergleich.js` | Historischer Vergleich zweier Stichtage einer Liegenschaft (Rechnung: `vergleich`, `vergleichSetzen`, `vergleichText` in `js/jahresbewertung.js`) |
| `js/baupreisindex.js` | Baupreisindex Baden-Württemberg (Statistisches Landesamt, 2021 = 100) mit Umrechnung auf NHK 2010 |
| `js/beratung.js` | Rechnungen der Beratungswerkzeuge ohne Bildschirmzugriff: Erbschaft- und Schenkungsteuer, Vervielfältiger nach § 14 BewG (BMF-Tabelle 2026 eingebaut), Leibrenten, Residualwert, ETW-Kennzahlen, Vertriebsübersicht |
| `src/werkzeuge.js`, `src/wz-*.js` | Beratung & Werkzeuge: gemeinsames Fenster (Felder, Speicher, Dokument, Kundenakte) und die zehn Werkzeuge |
| `js/portal.js` | Portal-Export ohne Seitenbezug: Objekt aus den Feldern einer Bewertung, Prüfung, XML im Austauschformat OpenImmo 1.2.7 |
| `js/bild.js` | Bildbearbeitung ohne Seitenbezug (Licht, Farbe, Tonwert, Schwärzen, Verpixeln) für das Fotostudio |
| `src/wz-daten.js`, `src/wz-start.js` | gemeinsame Datensätze der Vermarktungs-Kacheln (Termine, Vorgänge, Bieterverfahren) und die Kacheln nach Bereichen |
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
npm run klicktest            # ganze App durchklicken: jeder Knopf, jedes Feld, jedes Auf-/Zuklappen (PC, ~1 Std.)
npm run klicktest:iphone     # dasselbe in der iPhone-Ansicht (WebKit)
python tests/referenz/sollwerte.py   # Sollwerte der unabhängigen Vergleichsrechnung neu erzeugen
PDF_SCHRIFT=Verdana npx playwright test pdf   # PDF-Umbrüche mit breiterer Ersatzschrift gegenprüfen
```

- **Node** (`tests/unit/`): Zahlenformate, Barwertfaktor, Restnutzungsdauer, Grenzfälle (Zins 0 %, Laufzeit 0,
  sehr alte Gebäude, leere, negative und extreme Werte), Finanzierung, Budget, Investition, die beiden
  Referenzbewertungen des Selbsttests und sieben Fälle gegen eine unabhängige Python-Vergleichsrechnung
  (`tests/referenz/`); Office-Dateien (mit python-docx/openpyxl geöffnet); Prüfung von Sicherungsdateien
  einschließlich älterer Formate; Liegenschaften (Vordruck gegen eine eigene Python-Vergleichsrechnung, Kapitel und
  Zwischenzeilen, Bewertungsverlauf, Sicherung).
- **Browser** (`tests/e2e/`): Vergleich aller Rechenergebnisse mit dem festgehaltenen Stand
  (`tests/fixtures/golden.json`, Änderungen nur mit Beleg in `golden-aenderungen.md`), Selbsttest samt
  Erhalt der offenen Bewertung, Eingabeprüfung, Maskierung von Eingaben, Word/Excel/PDF/Druck,
  Datensicherung (vollständiger Ablauf, Datei-Import/-Export, Gesamtsicherung, PDF-Anhänge, beschädigte
  Dateien, voller Speicher, fehlende Datenbank), Übereinstimmung der Werte über alle Vordrucke,
  Offline-Start und Service-Worker-Update, alle Ansichten auf Desktop und iPhone.
- **Klicktest** (`tests/klick/klicktest.mjs`): öffnet alle Bereiche mit Musterdaten, klappt jeden Abschnitt und
  Block auf und zu, füllt jedes Feld bzw. stellt jeden Schalter und jede Auswahl um und klickt jeden Knopf und Link —
  rot bei Skriptfehlern, nicht funktionierenden Feldern, verdeckten Knöpfen und NaN mit dem Musterfall; Knöpfe „ohne
  Wirkung“ werden mit `tests/klick/ohne-wirkung-*.json` verglichen. Bericht unter `tests/ausgabe/klicktest/`.
  Abläufe, die er nur anstößt (App-Sperre mit simuliertem Face ID, Grundriss, Fotos …), prüft
  `tests/e2e/sonderablaeufe.spec.mjs` Schritt für Schritt.
- **Python-Prüfskripte** (`tests/referenz/pruefe_*.py`) öffnen die erzeugten Dateien mit unabhängigen
  Bibliotheken. Auf ihre Standardausgabe geht nur das JSON-Ergebnis; Meldungen der Bibliotheken landen auf
  stderr. Jede andere Ausgabe lässt den Test mit vollständiger stdout-/stderr-Ausgabe scheitern.
- **GitHub Actions** führt beides bei jedem Push aus (`.github/workflows/tests.yml`). Den Klicktest für PC und
  iPhone (`.github/workflows/klicktest.yml`) gibt es nur noch auf Anfrage: Actions → Klicktest → „Run workflow“,
  im Feld „Bereiche“ auf neue oder geänderte Bereiche beschränkbar. Beide laufen im offiziellen
  Playwright-Image mit fertig installierten Browsern. Dessen Version muss zu `@playwright/test` in
  `package.json` passen — beim Aktualisieren beide ändern; `npm test` prüft das.
- Alle Testdaten sind synthetisch.

## Datensicherung

Die Daten liegen im Browser des jeweiligen Geräts (IndexedDB, dazu der Arbeitsstand im localStorage) und
werden **nicht** zwischen Geräten abgeglichen. Löscht man die App vom Home-Bildschirm oder die Website-Daten,
sind sie weg. Deshalb regelmäßig sichern und die Dateien außerhalb des Geräts ablegen (z. B. OneDrive der Bank):

| Was | Wo in der App | Datei |
|---|---|---|
| alle Projekte mit Fotos, Kunden, Wiedervorlagen, Marktberichte, Übergabeprotokolle, Notaraufträge, Termine, Anfragen, Akquise, Bieterverfahren und Eingaben der Werkzeuge | Projekte → „Alle Projekte sichern“ | `ImmoApp Projekte JJJJ-MM-TT.json` |
| die offene Bewertung | Export-Menü → „Als Datei sichern“ | `<Adresse>.json` |
| Marktüberblick (schlank oder mit PDF-Anhängen) | Marktüberblick → Datensicherung | `Marktdaten_….json` |
| Liegenschaften (Vordrucke mit Bildern, Ansprechpartner) | Liegenschaften → Datensicherung | `ImmoApp Liegenschaften JJJJ-MM-TT.json` |

Einspielen: „Sicherung einspielen“ bzw. „Datei öffnen“ bzw. im Marktüberblick „Sicherung einlesen“ bzw. unter
„Liegenschaften“ „Sicherung einspielen“ (auch Sicherungen der früheren Liegenschaftsverwaltung). Jede
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
- Beratung & Werkzeuge: Orientierungsrechnungen, keine Steuer-, Rechts- oder Anlageberatung. Rechtsstand Oktober 2026,
  am Wortlaut geprüft (u. a. Gebäudemodernisierungsgesetz statt GEG seit 29.07.2026). Vervielfältiger für Nießbrauch und
  Wohnrecht: für 2026 die amtliche BMF-Tabelle, für spätere Jahre nach dem BMF-Verfahren aus der Sterbetafel berechnet
  (ROADMAP #64). Der Wertmonitor braucht für eine marktgerechte Fortschreibung eine Preisindexreihe (Grundstücksmarktbericht).
- Portal-Export: erzeugt die Datei, überträgt sie aber nicht — die Übertragung an ein Portal braucht einen Server
  (ROADMAP #67). Die Formatbeschreibung liegt aus Lizenzgründen nicht im Repository; die Tests prüfen Aufbau und Werte.
- Liegenschaften: rechnerische Preiseinschätzung nach dem Vordruck der Bank, kein Verkehrswertgutachten; der
  Baupreisindex zum Stichtag ist vierteljährlich nachzutragen (ROADMAP #50).
- Auf echten Geräten noch **nicht** geprüft, nur simuliert: Face ID/Touch ID (App-Sperre), Kamera beim
  Fotografieren, GPS im Aufnahmebogen, Teilen-Menü und „In Dateien sichern“ auf dem iPhone, Öffnen von
  `.ics`-Kalendereinträgen, Installation als Home-Bildschirm-App.
