# Roadmap — ImmoApp

Priorisiert nach Impact vs. Aufwand. Grundlage: AUDIT.md und DECISIONS.md. Wird nach jedem fertigen Block
neu bewertet und ergänzt (siehe Abschnitt „Fortschreibung" unten).

Status-Zeichen: [ ] offen · [~] in Arbeit · [x] fertig · [→] verschoben (mit Begründung)

## Phase 1 — Quick Wins (hoher Impact, geringer Aufwand)

| # | Was | Kategorie | Begründung |
|---|---|---|---|
| 1 | [ ] Kontrastfehler beheben (gedämpfte Textfarbe hell/dunkel, Warnfarbe hell) | Barrierefreiheit | 3 CSS-Variablen, behebt WCAG-AA-Verstoß in sehr vielem Text |
| 2 | [ ] Label-Feld-Kopplung für Screenreader (for/id, generisch per Skript) | Barrierefreiheit | Betrifft über 200 Felder, mit einer generischen Laufzeit-Kopplung lösbar statt 200 Handänderungen |
| 3 | [ ] aria-label auf allen Icon-only-Buttons | Barrierefreiheit | Ergänzt vorhandene title-Attribute um verlässliche Screenreader-Unterstützung |
| 4 | [ ] alt-Text auf allen Bildern (Fotos, Unterschrift, Titelbild) | Barrierefreiheit | 3 Stellen |
| 5 | [ ] Touch-Targets der Icon-Buttons auf 44×44 px | Barrierefreiheit | Apple-HIG-/WCAG-Empfehlung, wenige CSS-Zeilen |
| 6 | [ ] Subresource-Integrity-Hash für html2pdf.js | Sicherheit | Schließt eine konkrete, kleine Lücke |
| 7 | [ ] Kamera-Eingaben mit capture="environment" | native Funktion | Ein-Tap-Kamera statt allgemeinem Dateidialog, kein Zusatzcode nötig |
| 8 | [ ] DSGVO-Hinweis gebündelt (wo liegen Daten, wie löschen) | Datenschutz | Ein Infopunkt in der App statt verstreuter Einzelfunktionen |

## Phase 2 — Substanzielle Erweiterungen (hoher Impact, mittlerer Aufwand)

| # | Was | Kategorie | Begründung |
|---|---|---|---|
| 9 | [ ] App-Sperre über WebAuthn (Face ID/Touch ID/Windows Hello) | Sicherheit, native Funktion | Schließt die größte reale Sicherheitslücke (unbeaufsichtigtes Gerät), vollständig ohne Server umsetzbar (D5) |
| 10 | [ ] Standort erfassen (GPS) im Aufnahmebogen | native Funktion | Ein-Klick-Koordinaten statt Adresse abtippen, nützlich für spätere Kartenanbindung |
| 11 | [ ] Energetische Qualität als Wertfaktor | Bewertung (C) | Größte fachliche Lücke neben Beleihungswert: Energiekennwert/Klasse fließen bislang nirgends in den Wert ein |
| 12 | [ ] Plausibilitätswarnungen bei Eingaben (unrealistische Werte) | Bewertung (C) | Auftrag nennt das explizit; verhindert Zahlendreher, die sonst unbemerkt in den Bericht wandern |
| 13 | [ ] Finanzierungsrechner (Annuität, Tilgungsplan, Nebenkosten, KfW-Hinweis) | Berater-Feature (D) | Kernwerkzeug für Beratungsgespräche, bisher nicht vorhanden |
| 14 | [ ] Aufgaben/Wiedervorlagen (In-App-Liste, siehe D1) | Berater-Feature (D) | Ersetzt Zettelwirtschaft, funktioniert vollständig offline |
| 15 | [ ] Unterlagen-Checkliste als eigenständiges, teilbares Dokument | Berater-Feature (D) | Der Aufnahmebogen hat das schon, aber nur eingebettet in eine Wertermittlung |

## Phase 3 — Große Bausteine (hoher Impact, hoher Aufwand)

| # | Was | Kategorie | Begründung |
|---|---|---|---|
| 16 | [ ] Beleihungswert nach BelWertV inkl. Sicherheitsabschläge | Bewertung (C) | Größte fachliche Lücke; eigenes Regelwerk (§§ 4–7, 16 ff. BelWertV), braucht sorgfältige, separate Umsetzung |
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

Noch keine Iteration abgeschlossen — Stand direkt nach Audit und Priorisierung, bevor die erste Zeile
Code geändert wurde. Wird nach Phase 1 aktualisiert.
