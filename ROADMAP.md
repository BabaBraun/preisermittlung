# Roadmap — ImmoApp

Priorisiert nach Impact vs. Aufwand. Grundlage: AUDIT.md und DECISIONS.md. Wird nach jedem fertigen Block
neu bewertet und ergänzt (siehe Abschnitt „Fortschreibung" unten).

Status-Zeichen: [ ] offen · [~] in Arbeit · [x] fertig · [→] verschoben (mit Begründung)

## Phase 1 — Quick Wins (hoher Impact, geringer Aufwand)

| # | Was | Kategorie | Begründung |
|---|---|---|---|
| 1 | [x] Kontrastfehler beheben (gedämpfte Textfarbe hell/dunkel, Warnfarbe hell) | Barrierefreiheit | 3 CSS-Variablen, behebt WCAG-AA-Verstoß in sehr vielem Text |
| 2 | [x] Label-Feld-Kopplung für Screenreader (for/id, generisch per Skript) | Barrierefreiheit | Betrifft über 200 Felder, mit einer generischen Laufzeit-Kopplung lösbar statt 200 Handänderungen |
| 3 | [x] aria-label auf allen Icon-only-Buttons | Barrierefreiheit | Ergänzt vorhandene title-Attribute um verlässliche Screenreader-Unterstützung |
| 4 | [x] alt-Text auf allen Bildern (Fotos, Unterschrift, Titelbild) | Barrierefreiheit | 3 Stellen |
| 5 | [x] Touch-Targets der Icon-Buttons auf 44×44 px | Barrierefreiheit | Apple-HIG-/WCAG-Empfehlung, wenige CSS-Zeilen |
| 6 | [x] Subresource-Integrity-Hash für html2pdf.js | Sicherheit | Schließt eine konkrete, kleine Lücke |
| 7 | [x] Kamera-Eingaben mit capture="environment" | native Funktion | Ein-Tap-Kamera statt allgemeinem Dateidialog, kein Zusatzcode nötig |
| 8 | [x] DSGVO-Hinweis gebündelt (wo liegen Daten, wie löschen) | Datenschutz | Ein Infopunkt in der App statt verstreuter Einzelfunktionen |

## Phase 2 — Substanzielle Erweiterungen (hoher Impact, mittlerer Aufwand)

| # | Was | Kategorie | Begründung |
|---|---|---|---|
| 9 | [x] App-Sperre über WebAuthn (Face ID/Touch ID/Windows Hello) | Sicherheit, native Funktion | Schließt die größte reale Sicherheitslücke (unbeaufsichtigtes Gerät), vollständig ohne Server umsetzbar (D5) |
| 10 | [x] Standort erfassen (GPS) im Aufnahmebogen | native Funktion | Ein-Klick-Koordinaten statt Adresse abtippen, nützlich für spätere Kartenanbindung |
| 11 | [x] Energetische Qualität als Wertfaktor | Bewertung (C) | Größte fachliche Lücke neben Beleihungswert: Energiekennwert/Klasse fließen bislang nirgends in den Wert ein |
| 12 | [x] Plausibilitätswarnungen bei Eingaben (unrealistische Werte) | Bewertung (C) | Auftrag nennt das explizit; verhindert Zahlendreher, die sonst unbemerkt in den Bericht wandern |
| 13 | [x] Finanzierungsrechner (Annuität, Tilgungsplan, Nebenkosten, KfW-Hinweis) | Berater-Feature (D) | Kernwerkzeug für Beratungsgespräche, bisher nicht vorhanden |
| 14 | [x] Aufgaben/Wiedervorlagen (In-App-Liste, siehe D1) | Berater-Feature (D) | Ersetzt Zettelwirtschaft, funktioniert vollständig offline |
| 15 | [x] Unterlagen-Checkliste als eigenständiges, teilbares Dokument | Berater-Feature (D) | Der Aufnahmebogen hat das schon, aber nur eingebettet in eine Wertermittlung |

## Phase 3 — Große Bausteine (hoher Impact, hoher Aufwand)

| # | Was | Kategorie | Begründung |
|---|---|---|---|
| 16 | [x] Beleihungswert nach BelWertV inkl. Sicherheitsabschläge | Bewertung (C) | Größte fachliche Lücke; eigenes Regelwerk (§§ 4–7, 16 ff. BelWertV), braucht sorgfältige, separate Umsetzung |
| 17 | [x] Exposé-Generator (Vertriebsdokument, nicht Bewertungsbericht) — 2026-09-29 | Berater-Feature (D) | Eigenständiges Layout, eigene Textbausteine, Fotoauswahl getrennt vom Wertermittlungsbericht |
| 18 | [x] Kundenakte (mehrere Objekte/Vorgänge je Kunde, Historie) — 2026-09-29, D8 | Berater-Feature (D) | Geht über die heutige „ein Bewertungsstand = ein Projekt"-Logik hinaus, braucht ein neues Datenmodell |
| 19 | [x] compute() modularisieren — Rechenkern ohne DOM in `js/kern.js` (2026-09-30, D10) | Code-Qualität | Kein Nutzerwert direkt sichtbar, aber Voraussetzung, um Phase-3-Verfahren wie BelWertV sauber einzuhängen |
| 20 | [x] Automatisierte Regressionstests — Selbsttest (2026-09-29), Node- und Browsertests mit GitHub Actions (2026-09-30) | Code-Qualität | Schützt die bereits verifizierten Berechnungen vor künftigen Änderungen |

## Später / dokumentiert, aber nicht jetzt (siehe Begründung in DECISIONS.md)

| # | Was | Warum zurückgestellt |
|---|---|---|
| 21 | [→] Capacitor-iOS-Build fertigstellen | Braucht einen Mac mit Xcode (D1) — Grundgerüst wird vorbereitet, letzter Schritt nicht von hier aus möglich |
| 22 | [→] Echte Push-Benachrichtigungen | Braucht Backend-Infrastruktur (D1) — als Ausbaustufe dokumentiert, wenn Bedarf entsteht |
| 23 | [→] Verschlüsselung der lokalen Datenbank | Deutlich höherer Aufwand als die App-Sperre (D5), Nutzen erst bei sehr sensiblen Datenmengen groß |
| 24 | [→] Geräteübergreifender Sync (Cloud) | Bewusste Entscheidung gegen Server-Architektur (D2) |
| 25 | [→] Live-Anbindung Bodenrichtwert-Dienst (BORIS-D) | Bräuchte einen Proxy-Server wegen CORS — passt nicht zur Zero-Backend-Architektur |

---

## Fortschreibung (wird nach jedem fertigen Block ergänzt)

**2026-09-23, nach Phase 1:** Alle 8 Quick Wins umgesetzt, im Browser verifiziert, einzeln committet.
Keine Regression im Rechenkern, im Marktüberblick oder in der Suche.

**2026-09-23, nach Phase 2 und dem ersten Phase-3-Baustein:** Punkte 9 bis 16 umgesetzt, jeder einzeln
getestet und committet. Die Rechenwege von Finanzierung, energetischer Qualität und Beleihungswert wurden
jeweils gegen eine unabhängige Kontrollrechnung geprüft.

Kritische Neubewertung nach diesem Block — was dabei aufgefallen ist:

| # | Neuer Punkt | Warum |
|---|---|---|
| 26 | [x] Einheitliche Zahlenauswertung statt zweier Parser (zahlLesen, 2026-09-29) | `parseNum` (Vordruck) und `mdbNum` (Marktüberblick) behandeln deutsche Tausenderpunkte unterschiedlich. Das hat inzwischen **drei** Fehler verursacht (Übergabe aus dem Marktüberblick, „Aus Bewertung" im Finanzierungsrechner, beinahe auch beim Beleihungswert). Eine gemeinsame Funktion schließt die Falle. **Hohe Priorität** |
| 27 | [x] Regressionstests mit den verifizierten Sollwerten (selbsttest.js, 46 Prüfungen) | Aus dieser Sitzung liegen exakt gegengerechnete Werte vor (Rate 1.660 €, Restschuld nach Zinsbindung 275.675 €, Beleihungswert 285.773 €, Sachwert nach BelWertV 389.054 €, energetischer Abschlag −10.501 € bzw. −14.729 €). Als Testfälle festgehalten schützen sie jede künftige Änderung. Hebt #20 in der Dringlichkeit |
| 28 | [x] Die zwei Plausibilitätsprüfungen zusammenführen — erledigt 2026-10-02 (D37): Plausibilisierung in den Prüfhinweisen, dazu Gegenproben aus dem Aufnahmebogen | Die neue Eingabeprüfung (#12) und die Ergebnis-Plausibilisierung in Abschnitt 9.1 stehen unverbunden nebeneinander |
| 29 | [x] Vergleichswert nach § 19 BelWertV ergänzen — erledigt 2026-10-02 (D37): Sicherheitsabschlag mind. 10 %, Ausgangs- oder Kontrollwert nach § 4 | Das Modul deckt Ertrags- und Sachwert ab; der Vergleichswert mit eigenem Sicherheitsabschlag von mindestens 10 % fehlt noch |
| 30 | [x] Berichtsabschnitte auswählbar machen (2026-09-29) | Der Bericht ist durch die neuen Module deutlich länger geworden; nicht jeder Abschnitt gehört in jedes Gutachten |
| 31 | [ ] Dateigröße im Blick behalten | index.html ist von 324 KB auf 388 KB gewachsen. Noch unkritisch, aber die Einzeldatei-Architektur nähert sich der Grenze dessen, was sich angenehm bearbeiten und über eine langsame Mobilverbindung laden lässt |
| 32 | [ ] Manifest um Schnellzugriffe ergänzen | Marktüberblick und Finanzierung direkt aus dem Kontextmenü des App-Icons — kleiner Aufwand, nette Wirkung |

Zweimal hat sich die Regel „keine Features halb fertig liegen lassen" konkret ausgewirkt: die Warnung auf die
Abweichung zwischen Substanz- und Ertragswert wurde **wieder entfernt**, weil sie bei eigengenutzten Häusern
strukturell falsch anschlägt und damit alle übrigen Hinweise entwertet hätte; und echte
Push-Benachrichtigungen wurden **nicht** gebaut, weil sie ohne Server nicht zuverlässig funktionieren —
stattdessen die verlässliche In-App-Liste.

**2026-09-28, Raumliste nach WoFlV:** Im Aufnahmebogen gibt es jetzt eine Raumliste mit Anrechnung nach § 4 WoFlV
(am Verordnungswortlaut geprüft: ab 2 m voll, 1–2 m halb, unter 1 m nicht; Balkone und Terrassen in der Regel ein
Viertel, höchstens die Hälfte; Zubehörräume nach § 2 Abs. 3 gar nicht; kein pauschaler Putzabzug). Die Wohnfläche
in den Eckdaten bleibt frei eintragbar — die Übernahme aus der Liste ist ein Schalter, und beim Ausschalten bleibt
der Wert stehen und ist wieder änderbar. Am Handy erscheint jeder Raum als Karte statt als Tabelle.

**2026-09-29, Grundrisse (D6):** Grundrisse werden von Claude aus Foto oder PDF gelesen und als Code in die
App eingefügt. Die App zeichnet sie maßstabsgetreu in vier Darstellungen (Raumaufteilung, Raumumrisse mit
Maßen, Architektenplan, mit Einrichtung) und fragt beim Anlegen jedes Mal, welche. Die Räume gehen mit der
Fläche laut Plan in die Raumliste, die Pläne erscheinen im Aufnahmebogen, bei den Fotos, im Bericht und im
Word-Export. Offen: Test mit echten Plänen des Nutzers; ein Zeichen-Editor in der App wurde bewusst
zurückgestellt (Räume sind bearbeitbar, Wände und Maße laufen über den Code).

**2026-09-29, Umsetzungsrunde „Punkte 1–5“** (vom Nutzer beauftragt: Speicher, Rechenkern, Exposé,
Berichtsabschnitte, Kundenakte):

- **1. Speicherumbau (D7) — erledigt.** Projekte und Fotos in der IndexedDB, automatische Übernahme des
  Altbestands, sichtbarer Hinweis statt stiller Verluste, Belegungsanzeige, Gesamtsicherung mit Einspielen
  und Erinnerung. Dabei gefunden und behoben: Die Fotogalerie der App brach seit Phase 1 beim ersten Foto
  ohne Bildunterschrift ab (Bezeichnungstabelle nur lokal im Bericht definiert) — neu aufgenommene Fotos
  waren in der App unsichtbar, im Bericht aber vorhanden.
- **2. Rechenkern absichern — erledigt.** Eine Zahlenregel `zahlLesen()` für die ganze App statt `parseNum`
  und `mdbNum`. Neu dabei: In Betragsfeldern (€, m², m³, kWh — erkannt an der Einheit im Label bzw. im
  Spaltenkopf) gilt „450.000“ als Tausenderschreibweise; vorher wurde ein so eingetippter Kaufpreis oder
  Bodenrichtwert als 450 gelesen. Faktor- und Prozentfelder („1.406“, „3.5“) bleiben dezimal, „0.082“ ebenso.
  Selbsttest im Export-Menü (`selbsttest.js`, nur bei Bedarf geladen, offline im Cache): 46 Prüfungen —
  Zahlenlesen, Finanzierung, Barwertfaktor, Restnutzungsdauer nach Anlage 2, WoFlV-Anrechnung, Grundriss,
  zwei vollständige Referenzbewertungen (Wohnhaus mit PV, Energie und Beleihungswert; Eigentumswohnung).
  Alle Sollwerte unabhängig nachgerechnet; ein eingebauter Fehler von 0,1 % im Barwertfaktor schlägt an
  12 Stellen an. Die offene Bewertung bleibt beim Test unverändert.
- **3. Exposé — erledigt.** Abschnitt ⑪ mit Titel- und Textvorschlägen aus der Bewertung, Kaufpreis bewusst
  als eigene Eingabe (Preisempfehlung nur als Vorschlag), Fotoauswahl mit Titelbild (Schadensfotos
  abgewählt), Grundrisse in wählbarer Darstellung, Ansprechpartner (auf Wunsch gemerkt) und die
  Pflichtangaben zum Energieausweis nach § 87 GModG — am Wortlaut geprüft; das GEG heißt inzwischen
  Gebäudemodernisierungsgesetz, § 87 ist unverändert. Die Angaben werden nur aus eindeutig erfassten Quellen
  übernommen, eine Prüfung meldet fehlende Pflichtangaben. Ausgabe als eigenes Dokument (ohne Bewertungszahlen,
  ohne Straße, wenn nicht gewünscht) zum Ansehen, Drucken und als PDF.
- **4. Berichtsumfang — erledigt.** In ⑩ lassen sich 20 Abschnitte in vier Gruppen einzeln abwählen;
  mitgeliefert sind die Vorlagen „Vollständiger Bericht“, „Kurzbewertung für den Kunden“ (ohne Grundbuch-
  und Besichtigungsinterna, Beleihungswert, Sensitivität, Plausibilisierung, Rendite) und „Bank intern“;
  eigene Auswahlen lassen sich als Vorlage speichern. Die Vorlage lässt sich direkt in der Berichtsansicht
  wechseln. Umsetzung als Filter über die fertigen Abschnitte (h2 bis h2), damit der geprüfte Berichtsaufbau
  unverändert bleibt; Inhaltsverzeichnis und Nummerierung folgen der Auswahl. Der frühere Einzelschalter für
  das Diagramm ist in der Auswahl aufgegangen.
- **5. Kundenakte (D8) — erledigt.** Kunden mit Stammdaten, Rechtsgrundlage und Löschprüfdatum;
  zugeordnete Bewertungen, Wiedervorlagen, Finanzierungsrechnungen („Beim Kunden ablegen“ im
  Finanzierungsrechner) und Gesprächsnotizen; Auskunft als Textdatei, Löschen je Kunde. Einstiege über
  Kopfzeile, Startseite, Handy-Leiste, Eckdaten („Kunde zuordnen“) und die Suche. Datenbank auf Version 2
  gehoben; Gesamtsicherung enthält Kunden und Wiedervorlagen.

Neu aufgefallen in dieser Runde (für später):

| # | Neuer Punkt | Warum |
|---|---|---|
| 33 | [ ] Echte Grundrisse des Nutzers einlesen und die Leseanleitung daran nachschärfen | Die Anleitung ist bisher nur an einem Testplan geprüft |
| 34 | [ ] App-Sperre, GPS und Speicherumzug auf dem iPhone gegenprüfen | Nur mit simulierten Antworten bzw. in Chrome getestet |
| 35 | [x] Neue Bewertung direkt aus der Kundenakte beginnen — erledigt 2026-10-02 (D32) | Heute: Bewertung anlegen, dann zuordnen — ein Schritt zu viel |
| 36 | [ ] Dateigröße: index.html ist auf 552 KB gewachsen | Weitere Module (wie der Selbsttest) als eigene, bei Bedarf geladene Dateien auslagern |

**2026-09-29, Runde „Profi-Qualität, dann Vertrieb“** (vom Nutzer beauftragt: erst Richtung Gutachter, dann
Verkäufer-Präsentation, Käuferkartei, Vermarktung, Finanzierbarkeit, Investorenrechnung):

- **A1 Datengrundlagen (D9) — erledigt.** Abschnitt ④b: je Ansatz Wert, Wert laut Marktbericht und Quelle;
  Verwaltung der Marktberichte mit Modell und Tabellen; Modellkonformität nach § 10 ImmoWertV mit Warnung
  in der Plausibilitätsprüfung; Berichtsabschnitt „Datengrundlagen und Modellkonformität“. Nebenbei behoben:
  Der Projektname in der Kopfzeile überlappte bei rund 1.200 px Breite das Suchfeld.
- **A2 Sanierungsweg — erledigt.** Abschnitt ⑦f: Ausgangslage, sechs Maßnahmen mit Richtwerten (überschreibbar),
  Förderung nach BAFA BEG EM Gebäudehülle (Stand 07/2026) und KfW 458 (Merkblatt 09/2026) inklusive der
  datumsabhängigen Absenkungen ab 2027, Effizienzklasse vorher/nachher, Heizkosten, grobe Wertwirkung;
  Berichtsabschnitt „Sanierungsweg“; acht neue Prüfungen im Selbsttest (jetzt 54).
- **A3 Lage-Check — erledigt.** In ④: acht Prüfpunkte (Bodenrichtwert, Hochwasser, Starkregen, Umgebungslärm,
  Bebauungsplan, Baugrund, Altlasten, Baulasten) mit Link zum amtlichen Dienst; die App legt Adresse bzw.
  UTM-32-Koordinaten in die Zwischenablage (Umrechnung gegen pyproj geprüft, < 1 mm). Ergebnis, Notiz und
  Prüfdatum je Punkt, Berichtsabschnitt „Lage-Check“. Keine Adresssuche über fremde Dienste (Datenschutz).
  Breiten- und Längengrad sind jetzt auch von Hand eintragbar.
- **B1 Verkäufer-Präsentation — erledigt.** Abschnitt ⑫: acht Folien (Titel, Wert mit Preisspanne und €/m²-Vergleich zu
  den Verkäufen im Ort, Markt mit Quartalsverlauf, Vergleichsverkäufe ohne Hausnummer, Angebot gegen Kaufpreis mit
  eigener Abschlagsquote und Preisstrategie, Vermarktungsplan, Vorteile, Kontakt). Marktzahlen erst ab 5 eigenen
  Fällen; Vollbild mit Wischen/Tippen/Pfeiltasten, PDF im Querformat, Teilen. Bewusst keine Zwischenwerte (Sachwert)
  auf den Folien — sie laden im Verkäufergespräch zu falschen Preiserwartungen ein.
- **B2 Käuferkartei — erledigt.** Suchprofil in der Kundenakte (Objektarten, Orte, Budget, Wohnfläche, Zimmer,
  Grundstück, Finanzierungsstand, Wünsche). Abgleich in beide Richtungen: im Exposé-Abschnitt die passenden
  Interessenten („passt“ bzw. „passt fast“ mit Begründung, geprüfte Finanzierung zuerst) mit „Angebot vermerken“,
  in der Akte die passenden Objekte aus Projekten und offener Bewertung. Kundenliste mit Filter
  „Kaufinteressenten“. Präsentationsfolie „Vorgemerkte Käufer“ nur mit Anzahlen.
- **B3 Vermarktung und Eigentümer-Bericht — erledigt.** Abschnitt ⑬: Stand (Akquise bis Verkauft), Marktbeginn,
  Angebotspreis, Protokoll mit Rückmeldungen der Interessenten (Besichtigungen bekannter Kunden landen auch in deren
  Akte), Kennzahlen und häufigste Einwände. Eigentümer-Bericht ohne Interessentennamen mit Empfehlung der App (z. B.
  Preisüberprüfung ab 40 % „Preis zu hoch“ bei mindestens fünf Besichtigungen), teilbar als PDF. Übersicht aller
  Objekte in Vermarktung mit fälligen Berichten (älter als sieben Tage), Hinweis auf der Startseite.

- **B4 Finanzierbarkeit — erledigt.** Im Finanzierungsrechner „Was kann ich mir leisten?“: Haushaltsrechnung
  (Einnahmen, Lebenshaltung je Erwachsenem/Kind, Kreditraten, Neben- und Instandhaltungskosten, Puffer) → tragbare
  Rate → Darlehen → darstellbarer Kaufpreis nach Nebenkosten, Belastungsquote, Vergleich mit dem Kaufpreis.
  Budget ins Suchprofil, „Finanzierungsgespräch vereinbaren“ (Wiedervorlage, Vermerk in der Akte, .ics-Termin),
  „Finanzierungs-Check“ aus dem Exposé. Einkommensangaben nicht im Projekt, nur ausdrücklich in der Kundenakte;
  keine Raten im Exposé (§ 17 PAngV). Sechs neue Prüfungen im Selbsttest (jetzt 62).
- **B5 Investitionsrechnung — erledigt.** In ⑨b zuschaltbar: Cashflow Jahr für Jahr über 1–30 Jahre (Miet- und
  Kostensteigerung, Annuitätendarlehen wie im Finanzierungsrechner, AfA nach § 7 Abs. 4 EStG mit Gebäudeanteil aus
  dem Sachwert-Verhältnis, Steuer mit Grenzsteuersatz, Verkauf mit Verkaufskosten und § 23 EStG innerhalb von zehn
  Jahren). Kennzahlen: Eigenkapitalrendite vor/nach Steuern (interner Zinsfuß), Gesamtkapitalrendite ohne Kredit
  als Maß für den Hebel, Kapitaldienstdeckung, Vermögenszuwachs. Berichtsabschnitt „Investitionsrechnung“ und
  eigenes Dokument für den Anleger. Zwölf neue Prüfungen im Selbsttest gegen eine unabhängige Vergleichsrechnung
  (jetzt 74). Nebenbei behoben: lange Prüfhinweise und der Knopf „Vergleichsobjekte aus dem Marktüberblick“ liefen
  über den Rand.


**2026-09-30, Wartbarkeit, Exporte, Datensicherung, Tests:** Rechenkern, Speicherschicht, Prüfung von
Sicherungsdateien, Office-Export und PDF-Seitenaufteilung als eigene Dateien (D10); Alter nach Stichtag,
Höchst-RND im Beleihungswert, typografisches Minus korrigiert; Eingabeprüfung ohne Preisempfehlung bei
ungültigen Angaben (D13); Maskierung aller Eingaben; echte `.docx`/`.xlsx` (D11); PDF offline mit eigenen
Seitenumbrüchen (D12); Importe geprüft und atomar; App-Sperre als Sichtschutz beschrieben; 43 Node- und
28 Browsertests (Desktop und iPhone/WebKit), GitHub Actions grün. Einzelheiten in `SUMMARY.md` und `AUDIT.md`.

**2026-09-30, Liegenschaftsverwaltung Stufe 1 (Mietverwaltung):** neue Kachel mit Liegenschaften, Einheiten,
Mietverträgen (Fest-, Staffel-, Indexmiete, Mietänderungen), Sollstellung, Zahlungseingängen, offenen Posten,
Verzugszinsen, Mahnvorschlag mit Word-Schreiben, Kaution, Leerstand, Fristen, Excel-Mieterliste und -Mietkonto,
eigener Datensicherung (D15). Weitere Stufen siehe unten.

### Offen nach dem 2026-09-30

| # | Was | Warum |
|---|---|---|
| 37 | [ ] Geräteprüfung auf dem iPhone: Face ID, Kamera, GPS, Teilen-Menü/„In Dateien sichern“, `.ics`, Home-Bildschirm-Installation offline | nur simuliert (WebKit-Profil, nicht iOS) |
| 38 | [x] Restlebenserwartung aus der amtlichen Sterbetafel statt Näherung — erledigt 2026-09-30 (D20), monatliche Aktualisierung | genauer Kapitalwert bei Nießbrauch/Wohnrecht |
| 39 | [x] Grundrisse, Marktüberblick und Kundenakte schrittweise aus `index.html` in eigene Dateien — erledigt 2026-09-30 mit dem Umbau in `src/` (D19) | Wartbarkeit der Oberfläche |
| 40 | [ ] Fachliche Durchsicht der Modelle durch eine Sachverständige/einen Gutachterausschuss | bisher nur gegen Verordnung, ein Gutachten und eigene Vergleichsrechnung geprüft |
| 41 | [x] Service-Worker-Version automatisch aus dem Inhalt ableiten statt von Hand hochzählen — erledigt 2026-09-30 (D19, `npm run build`) | Prozessrisiko (siehe AUDIT, Abschnitt 7) |
| 42 | [x] Liegenschaftsverwaltung Stufe 2: Nebenkostenabrechnung (BetrKV, HeizkostenV, CO2KostAufG, § 35a EStG) — erledigt 2026-09-30 (D16) | Auftrag „alles“ |
| 43 | [x] Liegenschaftsverwaltung Stufe 3: Instandhaltung, Dienstleister, Wartungs- und Prüfpflichten — erledigt 2026-09-30 (D17) | Auftrag „alles“ |
| 44 | [x] Liegenschaftsverwaltung Stufe 4: WEG (Wirtschaftsplan, Hausgeld, Jahresabrechnung, Versammlung, Beschlusssammlung) — erledigt 2026-09-30 (D18) | Auftrag „alles“ |
| 45 | [x] Liegenschaftsverwaltung Stufe 5: Mieterhöhung (§§ 557a–559 BGB), Eigentümerbericht, Anlage V, Dokumente, Kontoauszug-Import — erledigt 2026-09-30 (D21), dazu Miete in Überblick/Einheiten | Auftrag „alles“ |
| 46 | [–] entfällt mit der Liegenschaftsverwaltung (D27) | |
| 47 | [–] entfällt mit der Liegenschaftsverwaltung (D27) | |
| 48 | [–] entfällt mit der Liegenschaftsverwaltung (D27) | |
| 49 | [x] Bewertungen je Liegenschaft mit Fortschreibung, amtlicher Baupreisindex BW, Eigennutzung — erledigt 2026-10-01 (D23) | jährliche Bewertung der Liegenschaften der Bank |
| 50 | [ ] Baupreisindex BW vierteljährlich nachtragen (`js/baupreisindex.js`): August 2026 erscheint im Oktober (am 02.10.2026 noch nicht veröffentlicht, neuester Stand Mai 2026), November 2026 Anfang 2027 | Stichtag 31.12.2026 braucht den Novemberwert |
| 51 | [x] Ertragswert getrennt je Gebäude: in der Jahresbewertung (D24) und seit 2026-10-02 in der Preisermittlung (Mietanteil des Anbaus, eigene Restnutzungsdauer, D33); fehlende Bauteile mit Kostenanteil 0 auch in der Preisermittlung — erledigt 2026-10-02 (D37) | Bank- und Lagergebäude in einer Bewertung |
| 52 | [x] Jahresbewertung als eigener Bereich mit änderbarem Vordruck der Bank, Fortschreiben aller Objekte, Excel-Übersicht — erledigt 2026-10-01 (D24) | Liegenschaften der Bank 2023/2024/2026 |
| 53 | [x] Bereich „Liegenschaften“ statt Liegenschaftsverwaltung und Jahresbewertung; Update-Hinweis „Neue Version“ — erledigt 2026-10-01 (D27) | Rückmeldung des Auftraggebers |
| 54 | [x] Historischer Vergleich zweier Stichtage je Liegenschaft (Veränderung je Kennzahl, jede Zahl änderbar, ohne Namen und Anschrift) — erledigt 2026-10-01 (D29) | Vorlage „Historischer Vergleich“ des Auftraggebers |
| 55 | [x] Neue Bewertung: nur Objektart wählen (Eigentumswohnung, Wohnhaus, Laden / Büro / Praxis, Gewerbe / Betrieb), keine zweite Vordruck-Auswahl — erledigt 2026-10-01 (D30) | Rückmeldung des Auftraggebers |
| 56 | [x] Klicktest der ganzen App (PC und iPhone-Ansicht) und Befunde behoben: Export-Menü am iPhone, Effizienzklasse von Hand, Beschriftung der Kopfzeilen-Knöpfe, Hinweis im Sanierungsweg, Dateinamen, Handzeiger — erledigt 2026-10-02 (D31) | Auftrag „die ganze App einmal komplett testen“ |
| 57 | [x] Klicktest der ganzen App dauerhaft im Repository (`npm run klicktest`, GitHub Actions für PC und iPhone) und Sonderabläufe als Browsertest — erledigt 2026-10-02 (D32) | Vorschlag 4 nach dem Klicktest |
| 58 | [x] Liegenschaften: Verlauf über alle Stichtage als Diagramm im historischen Vergleich und im Dokument — erledigt 2026-10-02 (D32) | Vorschlag 7 |
| 59 | [x] Erste vollständige Klicktest-Läufe: Haken der Exposé-Fotos über dem Bild, ungültiges Datum in der Vermarktung, Fehlalarme des Tests, Listen „ohne Wirkung“ — erledigt 2026-10-02 (D34) | Klicktest |
| 60 | [x] Gliederung der Bewertung neu (Eckdaten · Aufnahmebogen · Objektdaten · Allgemeine Angaben · Hauptgebäude …), Aufnahmebogen überträgt Standardstufen, Modernisierungen und Technik, § 8 in zwei Listen mit ＋, Schalter je Abschnitt — erledigt 2026-10-02 (D35) | Rückmeldung |
| 61 | [x] Grundrisse und Raumliste unter „Allgemeine Angaben“ (hinter Flächen & Baujahr), Wohnfläche trotz Raumliste änderbar, „Sonstiges“ in Planungsrecht, Modernisierungen, Bauteilen, Unterlagen und Lage-Check — erledigt 2026-10-02 (D36) | Rückmeldung |
| 62 | [x] Feststellung mit Foto im Aufnahmebogen (Foto im Bericht bei der Feststellung), fehlende Bauteile (Kostenanteil 0), Prüfhinweise mit Plausibilisierung und Gegenproben, Vergleichswert im Beleihungswert (§ 19 BelWertV) — erledigt 2026-10-02 (D37) | Vorschläge 1, 2, 4, 5 |
| 63 | [x] Beratung & Werkzeuge: acht neue Kacheln — Übergeben & Vererben (ErbStG/BewG), Wohnen im Alter (Verrentung), Übergabeprotokoll mit Fotos und Unterschriften, Mein Jahr (Provision, Herkunft), Grundstückspotenzial (Residualwert), ETW-Kaufcheck, Wertmonitor — erledigt 2026-10-02 (D38); Mieterhöhung nach der Prüfung wieder entfernt | Auftrag „Neues erschaffen“ |
| 64 | [ ] Werkzeuge pflegen: BMF-Vervielfältigertabelle jedes Jahr nachtragen (2026 eingebaut; die Tabelle 2027 erscheint etwa im Herbst 2026), Versorgungsfreibetrag beim Erbe (§ 17 ErbStG) | Grenzen von D38, Quellenprüfung |
| 65 | [x] Notarauftrag (Angaben für den Kaufvertragsentwurf, Ampeln §§ 656b–656d BGB und § 17 Abs. 2a BeurkG, Kalenderdatei, Wiedervorlagen, Übergabeprotokoll), Portal-Export (OpenImmo 1.2.7 mit Bildern, Änderung und Löschen), Datenstand (Rechengrundlagen und Daten mit Erinnerung) — erledigt 2026-10-03 (D39) | Vorschläge 2 und 3, Portal-Export vorbereiten |
| 66 | [x] Gesuchverwaltung: Abgleich aller Suchprofile mit allen Objekten in Vermarktung, Übernahme als Anfrage, Einwilligung angezeigt — erledigt 2026-10-03 (D40, Kachel „Interessenten“); Benachrichtigung bleibt beim Berater (die App versendet nichts) | Abgleich mit FIO |
| 67 | [ ] Später auf dem Bankserver: Export direkt an die Portale übertragen, Anfragen der Portale (Rückmeldungen) einlesen | braucht Server und Zugangsdaten der Portale |
| 68 | [ ] Später auf dem Bankserver: Web-Exposé als Link mit Abruf-Statistik, mehrere Nutzer mit Rollen und Rechten, gemeinsamer Bestand | braucht Server |
| 69 | [x] Bieterverfahren: Frist, Mindestgebot, Regeln, Gebote mit Rang, Übersicht für den Eigentümer ohne Namen — erledigt 2026-10-03 (D40) | Abgleich mit FIO |
| 70 | [x] Provisionsrechnung und Vermittlungsnachweis als Dokument (Halbteilung, Fälligkeit nach § 656d BGB) — erledigt 2026-10-03 (D42, Kachel „Provision“; Nachweis der Zahlung auf der Rechnung, E-Rechnung an Unternehmer über das Buchungssystem der Bank); dazu Kachel „Kaufnebenkosten“ nach GNotKG | Abgleich mit FIO |
| 75 | [x] Verknüpfungen: Zahlungsziele im Kalender, Provision und Unterlagen in den Aktivitäten, Abrechnungen in der Suche, Datenstand erinnert an das Löschen erledigter Abrechnungen und Vollmachten — erledigt 2026-10-03 (D45) | Abgleich mit FIO |
| 74 | [x] Social Media: Bild in drei Formaten und Text je Objekt, mit Pflichtangaben zum Energieausweis, im Farbschema — erledigt 2026-10-03 (D44); Veröffentlichen direkt aus der App erst mit Server und Zugängen | Abgleich mit FIO (Vermarktung) |
| 73 | [x] Unterlagen je Verkauf: Liste nach Objektart mit Stelle und Stand, „liegt vor“ aus dem Aufnahmebogen, Anforderung je Stelle, Vollmacht mit Unterschrift, Verkaufsfahrplan erkennt sie — erledigt 2026-10-03 (D43) | Abgleich mit FIO (Dokumente) |
| 71 | [x] Fotos und abfotografierte Unterlagen schwärzen oder verpixeln, Fotos aufbereiten — erledigt 2026-10-03 (D40, Kachel „Fotostudio“); PDF-Dateien selbst bleiben offen | Abgleich mit FIO; Datenschutz |
| 72 | [x] Akquise, Kalender mit Kalenderdatei, Vorlagen für Schreiben und E-Mails, Verkaufsfahrplan, Aushang, Kaufen oder Mieten; Startseite in vier Bereichen mit eigener Farbe; fünf Farbschemata — erledigt 2026-10-03 (D40); Besichtigungsnachweis mit Unterschrift und Kachel „Aktivitäten“ (D41) | Auftrag „FIO als Vorbild, weitere Kacheln“ |
