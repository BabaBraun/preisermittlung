# Zusammenfassung — Ausbau der ImmoApp (2026-09-23)

Ausgangspunkt war eine funktionierende, fachlich verifizierte Web-App für rechnerische Preisermittlungen mit
angeschlossenem Marktüberblick. Gearbeitet wurde nach dem vorgegebenen Ablauf: vollständiges Audit,
priorisierte Roadmap, schrittweise Umsetzung mit Test und eigenem Commit je Schritt, anschließend kritische
Neubewertung.

**Zahlen:** 10 Commits, 17 abgeschlossene Roadmap-Punkte, index.html von 324 KB auf 388 KB gewachsen,
Service-Worker-Cache von v10 auf v19. Alles live unter
[bababraun.github.io/preisermittlung](https://bababraun.github.io/preisermittlung/).

---

## Was umgesetzt wurde

### Barrierefreiheit und Sicherheit (Phase 1)

- **Kontrastfehler behoben.** Drei Farbwerte verstießen gegen WCAG AA (3,2:1 statt 4,5:1) und betrafen sehr
  viel Text — Hinweiszeilen, Kennzahl-Unterzeilen, Warnungen. Jetzt durchgehend über 4,5:1, in beiden Modi.
- **Screenreader-Kopplung** von Label und Eingabefeld für 208 von 209 Formularfeldern nachgerüstet, generisch
  zur Laufzeit statt 200 Handänderungen — greift auch für die dynamisch erzeugten Felder des Marktüberblicks.
- **aria-label** auf allen Icon-Schaltern, **alt-Text** auf allen Bildern, **Touch-Targets** von 36 auf 44 px.
- **Subresource-Integrity-Hash** für die PDF-Bibliothek vom CDN.
- **Kamera** öffnet bei Objekt-, Schadens- und Kartenfotos direkt (capture-Attribut).
- **Datenschutz-Hinweis gebündelt**: ein Panel erklärt, wo welche Daten liegen und wie man sie löscht,
  erreichbar von Startseite, Export-Menü und Projekte-Übersicht.

### Native Fähigkeiten und Schutz (Phase 2)

- **App-Sperre über Face ID / Touch ID / Windows Hello** (WebAuthn, vollständig ohne Server). Der
  Sperrbildschirm blockiert Sicht und Bedienung ab dem ersten Bildaufbau. Mit deutlichem Hinweis bei der
  Einrichtung: ohne Server gibt es keinen Wiederherstellungscode, vorher sichern.
- **Standort per GPS** im Aufnahmebogen, mit Genauigkeitsangabe, Kartenlink und Übernahme in den Bericht.

### Bewertungsfunktionen (Phase 2 und 3)

- **Energetische Qualität als Wertfaktor** (§ 8 Abs. 3 ImmoWertV). Vorher wurden Energiekennwert und
  Effizienzklasse nur dokumentiert und flossen nirgends in den Wert ein. Jetzt zwei nachvollziehbare
  Herleitungen: Marktabschlag je Effizienzklasse oder kapitalisierte Energiekostendifferenz. Mit
  ausdrücklichem Warnhinweis gegen Doppelzählung mit den Modernisierungspunkten.
- **Beleihungswert nach BelWertV** — die größte fachliche Lücke für den Bankkontext. Ertrags- und Sachwertweg
  mit der Ableitung nach § 4, alle normativen Mindestwerte am Wortlaut der Verordnung geprüft und als
  überschreibbare Felder mit Paragraphenverweis hinterlegt (15 % Bewirtschaftungskosten, Zinsbandbreiten
  3,5–5,5 % bzw. 4,5–6,5 %, Höchst-Restnutzungsdauern der Anlage 2, 10 % Sicherheitsabschlag,
  Kleindarlehensgrenze, Besichtigungsabschläge).
- **Plausibilitätsprüfung** mit 17 Regeln auf logische Widersprüche und typische Zahlendreher, gesammelt im
  Cockpit, mit Sprung zum betroffenen Feld.

### Werkzeuge für den Beratungsalltag (Phase 2)

- **Finanzierungsrechner**: Nebenkosten, Finanzierungsbedarf, monatliche Rate, Restschuld am Ende der
  Zinsbindung, vollständiger Tilgungsplan, optionales Förderdarlehen als zweite Tranche, Sondertilgung,
  Beleihungsauslauf zum Kaufpreis **und** zum Beleihungswert.
- **Wiedervorlagen**: Aufgaben mit Frist und Objektbezug, fällige Vorgänge auf der Startseite und als Zähler
  in der Kopfzeile.
- **Unterlagenliste** als eigenes Dokument für den Eigentümer.

---

## Was bewusst nicht umgesetzt wurde

Drei Dinge wurden nach Prüfung verworfen oder zurückgestellt — jeweils begründet in `DECISIONS.md`:

1. **Keine Neuentwicklung als native App.** Capacitor, React Native und SwiftUI wurden bewertet. Ergebnis:
   Die PWA bleibt die Strategie und wurde um native Fähigkeiten erweitert. Ein Rewrite würde den fachlich
   verifizierten Rechenkern wegwerfen oder eine zweite Codebasis erzeugen. Capacitor bleibt der Weg für eine
   echte App-Store-App — der iOS-Build braucht zwingend einen Mac mit Xcode und ist von hier aus nicht
   abschließbar.
2. **Keine Push-Benachrichtigungen.** Web Push funktioniert auf dem iPhone seit iOS 16.4 auch für
   Home-Screen-Apps, braucht aber zwingend einen Server, der die Nachricht auslöst. Ohne Backend wäre das
   eine unzuverlässige Halblösung gewesen. Stattdessen die verlässliche In-App-Liste.
3. **Eine bereits gebaute Warnung wieder entfernt.** Die Prüfung auf große Abweichung zwischen Substanz- und
   Ertragswert schlug bei eigengenutzten Einfamilienhäusern strukturell an — dort liegt der Sachwert
   regelmäßig weit über dem Ertragswert. Sie hätte bei fast jeder Hausbewertung gewarnt und damit alle
   übrigen Hinweise entwertet.

---

## Gefundene und behobene Fehler

- **Mietregeln rechneten mit der falschen Einheit.** Zwei der neuen Plausibilitätsregeln behandelten das
  Mietfeld als Monatsmiete, obwohl es die Jahresmiete führt. Die App hätte bei korrekten Eingaben gewarnt
  und den echten Fehler verfehlt. Beim Bau des Beleihungswerts aufgefallen und behoben.
- **Kopfzeile am Handy überlief.** Durch die neuen Schalter lagen ausgerechnet Export und Bericht außerhalb
  eines 375-px-Bildschirms.
- **„Aus Bewertung" verlor die Tausenderstellen** im Finanzierungsrechner (267.901 € wurden zu 268 €) — der
  bekannte Unterschied zwischen den beiden Zahlenparsern der App.
- **Tilgung null erzeugte einen 60-Jahre-Plan aus Nullzeilen** statt einer ehrlichen Meldung.
- **Abschnittskürzel mit Suffix „e"** wurden in Navigation und Schrittplakette verstümmelt dargestellt.

---

## Offene Punkte

Vollständig in `ROADMAP.md`. Der Stand: Phase 1 und 2 sind abgeschlossen, aus Phase 3 ist der Beleihungswert
umgesetzt. Offen bleiben Exposé-Generator, Kundenakte, die Modularisierung des Rechenkerns und
Regressionstests — dazu sieben neue Punkte, die sich erst aus dieser Arbeit ergeben haben.

**Nicht abschließend geprüft:** Die App-Sperre wurde mit simulierten WebAuthn-Antworten über alle Codepfade
getestet (Einrichten, Erfolg, Fehlschlag, Deaktivieren). Ein echter Face-ID-Dialog lässt sich in der
Entwicklungsumgebung nicht auslösen — **bitte auf dem iPhone einmal gegenprüfen**, bevor du dich darauf
verlässt. Gleiches gilt für die Standorterfassung, die hier nur mit gestellten Koordinaten lief.

---

## Top 10 für die nächsten Schritte

1. **Zahlenauswertung vereinheitlichen.** Die zwei unterschiedlichen Parser haben inzwischen drei Fehler
   verursacht. Eine gemeinsame Funktion schließt eine Fehlerquelle, die sonst immer wieder zuschlägt.
2. **Regressionstests aus den verifizierten Sollwerten.** Aus dieser Sitzung liegen exakt gegengerechnete
   Ergebnisse vor. Als Testfälle festgehalten schützen sie jede künftige Änderung — gerade weil der
   Rechenkern das Wertvollste an der App ist.
3. **App-Sperre und GPS auf dem iPhone gegenprüfen.** Zwei Funktionen, die nur auf echter Hardware
   abschließend beweisbar sind.
4. **Beleihungswert um den Vergleichswert nach § 19 ergänzen** und einmal gegen einen echten Bankfall
   rechnen, den du kennst — das ist die beste Validierung.
5. **Die zwei Plausibilitätsprüfungen zusammenführen**, damit nicht zwei ähnliche Warnungen an
   verschiedenen Stellen stehen.
6. **Berichtsabschnitte auswählbar machen.** Der Bericht ist deutlich länger geworden; nicht jeder Abschnitt
   gehört in jedes Dokument.
7. **Exposé-Generator** als nächstes großes Vertriebswerkzeug — der Bericht ist ein Bewertungsdokument, kein
   Verkaufsexposé.
8. **Rechenkern modularisieren.** `compute()` ist auf über 400 Zeilen gewachsen und hat beim Einbau der
   neuen Verfahren zweimal zu Reihenfolgefehlern geführt. Voraussetzung für alles Weitere.
9. **Kundenakte**, wenn die Wiedervorlagen sich im Alltag bewähren — dann lohnt das größere Datenmodell.
10. **Capacitor-Grundgerüst aufsetzen**, sobald ein Mac verfügbar ist. Die App ist dafür vorbereitet; es
    fehlt nur der Schritt, den nur macOS gehen kann.
