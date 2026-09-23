# Audit — ImmoApp (Stand 2026-09-23)

Grundlage: vollständiger Codescan (index.html, 4.349 Zeilen / 324 KB, sw.js, manifest.webmanifest),
Git-Historie (7 Commits), Kontrastberechnung nach WCAG-Formel, Stichproben in allen Modulen.

## 1. Tech-Stack & Architektur

- **Eine einzige Datei** index.html (Vanilla JS, kein Framework, kein Build-Schritt, kein package.json).
  Icons als data:-URI eingebettet, damit ein Upload dieser einen Datei eine installierbare App ergibt.
- **Kein Server, kein Backend.** Alles läuft im Browser. Hosting: GitHub Pages (BabaBraun/preisermittlung,
  öffentliches Repo — Pages ist nur für öffentliche Repos kostenlos).
- **Zwei getrennte Datenspeicher:**
  - localStorage (Schlüssel vb_wert2) — der aktuelle Bewertungsvordruck (Autosave), plus vb_projekte
    (Bibliothek gesicherter Bewertungen) und ia_theme (Hell/Dunkel).
  - **IndexedDB, Datenbank vb_marktdaten** (Stores objekte, anhaenge, meta) — der Marktüberblick, inkl. PDF-
    Anhänge als Blob. Zusätzlich eine Zweitkopie ohne Anhänge in localStorage (vb_markt_mirror) als Notfall-
    Backup.
- **PWA:** manifest.webmanifest + sw.js (Service Worker, network-first mit Cache-Fallback, Cache-Version
  aktuell v10, manuell hochzuzählen — siehe Abschnitt 7).
- **Externe Abhängigkeiten:** Google Fonts (IBM Plex Sans/Serif) und html2pdf.js von cdnjs.cloudflare.com
  — beide unversioniert eingebunden ohne Subresource-Integrity-Hash (siehe Abschnitt 4). Kein Tracking, keine
  Analytics, kein Drittanbieter-Skript, das Daten sendet.
- **Rechenkern:** compute(), eine einzelne ~270-zeilige Funktion, an document.addEventListener für input und
  change gebunden — läuft bei jedem Tastendruck neu. In der Praxis performant genug (kein spürbares Lag in
  Tests), aber ein Wartbarkeits-Hotspot: alle Verfahren (Substanz, Ertrag, Vergleich, Nießbrauch, PV,
  Erbbaurecht, Wertkorrekturen) hängen an dieser einen Funktion.

## 2. Feature-Inventar (was bereits funktioniert)

**Bewertung (ImmoWertV):**
- Sachwertverfahren über NHK 2010 (Anlage 4), Standardstufen 1–5 mit linearer Interpolation, Baupreisindex,
  Regionalfaktor, Restnutzungsdauer nach Modernisierungspunkten (Anlage 2, amtliche Koeffiziententabelle).
- Ertragswertverfahren, gespaltenes Verfahren, Bewirtschaftungskosten (pauschal oder detailliert je
  Wohneinheit/Stellplatz), optionale Mietrolle, Liegenschaftszins als Basis plus Zu-/Abschlag.
- Vergleichswertverfahren (auch für Häuser, nicht nur Wohnungen), Vergleichsobjekt-Tabelle.
- Nießbrauch/Wohnrecht/Leibrente (§ 48 ImmoWertV), Erbbaurecht, Wertkorrekturen nach § 8 Abs. 3 (14 Positionen).
- PV-Anlage (Barwert Solarertrag), Plausibilisierung (Ergebnis €/m² vs. Marktbericht mit Bewertungstext),
  Sensitivitätsanalyse (7 Szenarien), Rendite-/Investitionsrechner (Kaufnebenkosten, Bruttorendite).
- 9 Vordrucke (Eigentumswohnung/Wohnhaus/Gewerbe), Aufnahmebogen für den Ortstermin mit Unterlagen-Checkliste.
- Bericht: Deckblatt, Inhaltsverzeichnis, Fotodokumentation, Unterschriftsblock, Export als PDF/Word/Excel.

**Marktüberblick (eigenständiges Modul):**
- Erfassung von 48 Objektmerkmalen je Fall, Preisverlauf mit Datum, PDF-Exposé-Anhang, Exposé-Text-Parser
  (füllt das Formular aus eingefügtem Inseratstext vor).
- Auswertung: Kennzahlen-Kacheln (Median €/m², Trend, Vermarktungsdauer, Reduzierungsquote, eigene
  Abschlagsquote Angebot-zu-Kaufpreis), sechs Diagramme als handgeschriebenes Inline-SVG (offlinefähig).
- Ähnlichkeitssuche für Vergleichsobjekte mit Übergabe in den Vordruck.
- Speicherabsicherung: storage.persist(), Quota-Anzeige, automatische Zweitkopie, Sicherung als Datei.

**Oberfläche (seit dem letzten Redesign):**
- Einheitliches Designsystem über CSS-Variablen, Hell-/Dunkelmodus, Statusnavigation je Abschnitt,
  Ergebnis-Cockpit (Preisempfehlung, Plausibilität, Vollständigkeit), Startseite als Arbeitsplatz,
  Volltextsuche über Bewertungen und Marktüberblick (Strg K).

## 3. Bugs & Korrektheitsprobleme

Keine offenen funktionalen Bugs gefunden, die die Berechnung selbst verfälschen — die Rechenkerne waren in
früheren Sitzungen bereits gegen die Excel-Vorlage und ein reales Verkehrswertgutachten verifiziert. Gefunden
wurden dagegen mehrere fehlende Funktionen, die im Auftrag explizit als Schwerpunkt genannt sind (siehe
Abschnitt 8) — das sind Lücken, keine Bugs im engeren Sinn.

## 4. Sicherheit

- **Keine serverseitige Angriffsfläche** (kein Server, keine Authentifizierung, keine Übertragung von Daten
  an Dritte) — die übliche Web-Bedrohungslandschaft (SQL-Injection, Session-Hijacking, Server-XSS) entfällt
  strukturell.
- **Self-XSS-Potenzial in Report/Export:** In der Berichtsgenerierung (druckbericht, exportWord, exportExcel)
  werden die meisten Nutzereingaben maskiert, aber nicht lückenlos geprüft. Da es keinen zweiten Nutzer und
  keinen Server gibt, ist der reale Schaden minimal — trotzdem sauber zu schließen, weil Berichte an Kunden
  und die Bank weitergegeben werden.
- **CDN-Skripte ohne Subresource Integrity:** html2pdf.js (cdnjs) und die Google-Fonts-Stylesheets werden
  ohne integrity-Hash geladen. Bei einer CDN-Kompromittierung könnte fremder Code im Browser des Nutzers
  laufen. Geringes, aber vermeidbares Risiko.
- **Keine Zugriffssperre auf dem Gerät.** Wer das entsperrte Handy/Laptop in die Hand bekommt, sieht sofort
  alle Bewertungen und den kompletten Marktüberblick — inklusive Adressen und (bei eigenen Vermittlungen)
  Kaufpreisen. Für einen Bankberater mit Kundendaten unterwegs ein reales Risiko.
- **Keine Verschlüsselung der IndexedDB-/localStorage-Inhalte** — Standardverhalten aller Browser, aber bei
  einem verlorenen, nicht durch Geräte-PIN gesperrten Gerät sind die Daten lesbar.

## 5. Datenschutz (DSGVO)

- **Bereits gute Praxis:** Die Marktdatenbank speichert bewusst keine Käufer-/Verkäufernamen (nur
  Objektdaten, Preise, Quelle, Datengüte) — das wurde in einer früheren Iteration explizit so entschieden
  und ist im Code auch so umgesetzt (keine entsprechenden Felder vorhanden).
- **Datenminimierung strukturell gegeben:** Kein Tracking, keine Cookies außer den eigenen localStorage-
  Werten, keine Übertragung an Dritte.
- **Lücke:** Es gibt keinen gebündelten Hinweis darauf, wo welche personenbezogenen Daten liegen (z. B. der
  Auftraggeber-Name im Eckdatenfeld) und wie sie gelöscht werden — die Löschfunktionen existieren (Neu,
  Projekt löschen, PDF-Anhang löschen), sind aber nicht an einer Stelle erklärt.
- **Kein Gerätesync** heißt auch: Backups liegen als Klartext-JSON-Dateien, wo der Nutzer sie ablegt (z. B.
  OneDrive) — außerhalb der App-Kontrolle, sollte im Hinweistext einmal benannt werden.

## 6. Barrierefreiheit (WCAG-Kontrastprüfung durchgerechnet)

- **Kontrastfehler (Verstoß gegen WCAG AA, 4,5:1 für Normaltext):**
  - Gedämpfte Textfarbe (Hellmodus) auf Kartenfläche/Hintergrund: 3,2–3,6:1 — betrifft sehr viel Text
    (Hinweiszeilen, Kennzahl-Unterzeilen, Einheiten-Labels).
  - Gedämpfte Textfarbe (Dunkelmodus) auf dem dunklen Hintergrund: 4,07:1 — knapp unter der Schwelle.
  - Warnfarbe (Hellmodus) auf dem Warn-Hintergrund: 3,29:1 — betrifft die „Pflichtfelder offen"-Anzeige und
    Warnhinweise.
  - Alle anderen geprüften Farbpaare (Fließtext, Akzentfarbe, Buttons, Ok-/Fehler-Farben) liegen über 4,5:1,
    teils deutlich (bis 15:1).
- **Keine Screenreader-Kopplung von Label und Feld:** Über 200 Formularfelder nutzen das Muster Label-Text
  gefolgt vom Eingabefeld als Geschwister-Elemente — ohne for-/id-Kopplung und ohne Verschachtelung liest
  ein Screenreader Label und Feld nicht als zusammengehörig vor.
- **aria-label kommt im gesamten Dokument kein einziges Mal vor.** Icon-only-Buttons (Suche, Dunkelmodus,
  Menü, Schließen) haben zwar ein title-Attribut (9 Stellen), das reicht aber nicht zuverlässig für
  Screenreader und mobile Sprachsteuerung.
- **Bilder ohne Alternativtext:** Von 5 img-Vorkommen haben 3 kein alt (Objektfotos im Bericht, Unterschrift-
  Bild, Titelbild) — für Screenreader-Nutzer unsichtbar/unverständlich.
- **Touch-Targets:** Icon-Buttons sind 36×36 px — unter der empfohlenen 44×44-px-Mindestgröße für
  Fingerbedienung. Textfelder sind auf dem Handy bereits korrekt auf 46 px Höhe vergrößert.

## 7. Performance & Prozessrisiken

- **Manuelles Service-Worker-Cache-Versionieren** ist fehleranfällig — vergisst man es, bekommen installierte
  Geräte trotz Deploy die alte Fassung. Bisher immer korrekt gemacht, aber ein Prozessrisiko ohne
  Automatisierung.
- **GitHub-Pages-Deploy dauert 1–4 Minuten** nach dem Push, bevor die neue Fassung live ist — kein Bug, aber
  relevant für das Testen.
- **compute() bei jedem Tastendruck:** für die aktuelle Feldmenge unproblematisch, sollte aber im Auge
  behalten werden, wenn weitere Verfahren dazukommen.
- **Keine automatisierten Tests.** Jede Änderung wird manuell im Browser verifiziert, es gibt aber keine
  Regressionstest-Suite, die künftige Änderungen automatisch gegen verifizierte Rechenergebnisse prüft.

## 8. Fachliche Lücken gegenüber dem Auftrag

- **Beleihungswert nach BelWertV existiert nicht.** Weder Sicherheitsabschläge noch ein eigener
  Beleihungswert-Block sind im Code vorhanden. Für eine Bank mit Finanzierungsbezug ist das die größte
  fachliche Lücke.
- **Energetische Qualität wird erfasst, aber nicht bewertet.** Energiekennwert und Effizienzklasse sind
  Freitext-/Auswahlfelder im Aufnahmebogen und im Marktüberblick — sie fließen nirgends als Zu-/Abschlag in
  die Wertermittlung ein. Reine Dokumentation, keine Berechnung.
- **Keine Kunden-/Objektverwaltung über die einzelne Bewertung hinaus** — die Projekte-Bibliothek speichert
  einzelne Bewertungsstände, aber es gibt keine Kundenakte, keine Wiedervorlage, keine Aufgabenliste.
- **Kein Finanzierungsrechner** (Annuität, Tilgungsplan, Nebenkosten, Fördermittel).
- **Kein Exposé-Generator** für den Vertrieb (der Bericht ist ein Bewertungsdokument, kein Verkaufsexposé).
- **Kein Besichtigungsprotokoll als eigenständiges Dokument** (der Aufnahmebogen ist Teil des
  Bewertungsvordrucks, nicht separat nutzbar für reine Besichtigungen ohne Wertermittlung).

## 9. Zusammenfassung der Einschätzung

Die App ist in ihrem Kernbereich — der rechnerischen Preisermittlung — ungewöhnlich ausgereift für ein
Solo-Projekt ohne Build-Tooling: fachlich korrekt, gegen echte Vorlagen verifiziert, mit einem durchdachten,
gerade neu gestalteten Bedienkonzept. Die Lücken liegen konsequent dort, wo der Auftrag sie auch benennt:
Beleihungswert, energetische Bewertung, Berater-Werkzeuge jenseits der reinen Wertermittlung,
Barrierefreiheit im Detail, und die Frage nach einer echten iPhone-App statt eines Home-Screen-Icons.
