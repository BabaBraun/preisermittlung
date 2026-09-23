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
| 17 | [ ] Exposé-Generator (Vertriebsdokument, nicht Bewertungsbericht) | Berater-Feature (D) | Eigenständiges Layout, eigene Textbausteine, Fotoauswahl getrennt vom Wertermittlungsbericht |
| 18 | [ ] Kundenakte (mehrere Objekte/Vorgänge je Kunde, Historie) | Berater-Feature (D) | Geht über die heutige „ein Bewertungsstand = ein Projekt"-Logik hinaus, braucht ein neues Datenmodell |
| 19 | [ ] compute() modularisieren (ein Verfahren = eine Funktion) | Code-Qualität | Kein Nutzerwert direkt sichtbar, aber Voraussetzung, um Phase-3-Verfahren wie BelWertV sauber einzuhängen |
| 20 | [ ] Automatisierte Regressionstests für die Rechenkerne | Code-Qualität | Schützt die bereits verifizierten Berechnungen vor künftigen Änderungen |

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
| 26 | [ ] Einheitliche Zahlenauswertung statt zweier Parser | `parseNum` (Vordruck) und `mdbNum` (Marktüberblick) behandeln deutsche Tausenderpunkte unterschiedlich. Das hat inzwischen **drei** Fehler verursacht (Übergabe aus dem Marktüberblick, „Aus Bewertung" im Finanzierungsrechner, beinahe auch beim Beleihungswert). Eine gemeinsame Funktion schließt die Falle. **Hohe Priorität** |
| 27 | [ ] Regressionstests mit den verifizierten Sollwerten | Aus dieser Sitzung liegen exakt gegengerechnete Werte vor (Rate 1.660 €, Restschuld nach Zinsbindung 275.675 €, Beleihungswert 285.773 €, Sachwert nach BelWertV 389.054 €, energetischer Abschlag −10.501 € bzw. −14.729 €). Als Testfälle festgehalten schützen sie jede künftige Änderung. Hebt #20 in der Dringlichkeit |
| 28 | [ ] Die zwei Plausibilitätsprüfungen zusammenführen | Die neue Eingabeprüfung (#12) und die Ergebnis-Plausibilisierung in Abschnitt 9.1 stehen unverbunden nebeneinander |
| 29 | [ ] Vergleichswert nach § 19 BelWertV ergänzen | Das Modul deckt Ertrags- und Sachwert ab; der Vergleichswert mit eigenem Sicherheitsabschlag von mindestens 10 % fehlt noch |
| 30 | [ ] Berichtsabschnitte auswählbar machen | Der Bericht ist durch die neuen Module deutlich länger geworden; nicht jeder Abschnitt gehört in jedes Gutachten |
| 31 | [ ] Dateigröße im Blick behalten | index.html ist von 324 KB auf 388 KB gewachsen. Noch unkritisch, aber die Einzeldatei-Architektur nähert sich der Grenze dessen, was sich angenehm bearbeiten und über eine langsame Mobilverbindung laden lässt |
| 32 | [ ] Manifest um Schnellzugriffe ergänzen | Marktüberblick und Finanzierung direkt aus dem Kontextmenü des App-Icons — kleiner Aufwand, nette Wirkung |

Zweimal hat sich die Regel „keine Features halb fertig liegen lassen" konkret ausgewirkt: die Warnung auf die
Abweichung zwischen Substanz- und Ertragswert wurde **wieder entfernt**, weil sie bei eigengenutzten Häusern
strukturell falsch anschlägt und damit alle übrigen Hinweise entwertet hätte; und echte
Push-Benachrichtigungen wurden **nicht** gebaut, weil sie ohne Server nicht zuverlässig funktionieren —
stattdessen die verlässliche In-App-Liste.
