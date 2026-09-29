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
| 19 | [ ] compute() modularisieren (ein Verfahren = eine Funktion) | Code-Qualität | Kein Nutzerwert direkt sichtbar, aber Voraussetzung, um Phase-3-Verfahren wie BelWertV sauber einzuhängen |
| 20 | [x] Automatisierte Regressionstests für die Rechenkerne (Selbsttest, 2026-09-29) | Code-Qualität | Schützt die bereits verifizierten Berechnungen vor künftigen Änderungen |

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
| 28 | [ ] Die zwei Plausibilitätsprüfungen zusammenführen | Die neue Eingabeprüfung (#12) und die Ergebnis-Plausibilisierung in Abschnitt 9.1 stehen unverbunden nebeneinander |
| 29 | [ ] Vergleichswert nach § 19 BelWertV ergänzen | Das Modul deckt Ertrags- und Sachwert ab; der Vergleichswert mit eigenem Sicherheitsabschlag von mindestens 10 % fehlt noch |
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
| 35 | [ ] Neue Bewertung direkt aus der Kundenakte beginnen | Heute: Bewertung anlegen, dann zuordnen — ein Schritt zu viel |
| 36 | [ ] Dateigröße: index.html ist auf 552 KB gewachsen | Weitere Module (wie der Selbsttest) als eigene, bei Bedarf geladene Dateien auslagern |
