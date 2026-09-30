# App-Bedienung — 30. September 2026

Die Oberfläche wurde für die tägliche Arbeit mit einer Immobilie umgebaut. Der Rechenkern, alle Formularfelder und bestehende Speicherformate bleiben erhalten.

## Hauptbereiche

- **Übersicht:** neue Bewertung beginnen, Objekte suchen, zuletzt bearbeitete Bewertungen und fällige Aufgaben finden.
- **Objekte:** Bewertungen öffnen und sichern, Projektdateien übertragen und Sicherungen wiederherstellen.
- **Markt:** die eigene Marktdatenbank erfassen, vergleichen und auswerten.
- **Mehr:** Finanzierung, Kunden, Wiedervorlagen, Liegenschaftsverwaltung, Darstellung, Datensicherung, Datenschutz und App-Sperre.

## Innerhalb einer Bewertung (seit 30.09.2026 wieder wie früher)

Alle Abschnitte stehen untereinander in der bekannten Reihenfolge mit Nummer: ① Eckdaten, ①b Aufnahmebogen,
② Hauptgebäude, ③ Anbau, ④ Objektdaten & Beschreibung … ⑨ Preisempfehlung … ⑬ Vermarktung. Jeder Abschnitt lässt
sich über den Pfeil rechts (oder einen Klick auf die Überschrift) auf- und zuklappen, jeder Block darin (z. B.
„4.4 Lage“, „2.2 Restnutzungsdauer“) ebenso. „Alle aufklappen“ / „Alle zuklappen“ stehen über der Liste. Die App
merkt sich auf dem Gerät, was zugeklappt ist.

Links steht die Abschnittsliste mit Status (Erfassung, Verfahren, Abschluss) zum Springen, rechts das Ergebnis mit
Preisempfehlung, Gewichtung, Vollständigkeit und Prüfhinweisen. Am Handy ist die Abschnittsliste eine Leiste unter
der Kopfzeile, das Ergebnis steht als Karte über der Liste. Ein Sprung oder Prüfhinweis öffnet zugeklappte Abschnitte
und Blöcke automatisch. Beim Drucken wird alles aufgeklappt. Die Eingaben und Rechnungen sind unverändert.

## Prüfung

42 Unit-Tests und 39 Browsertests im vollständigen Lauf bestanden. Zusätzlich ist der tatsächliche Textkontrast der aktiven Navigation, Arbeitsschritte und des Exportbuttons im iPhone-Dunkelmodus geprüft (mindestens 4,5:1). Fotos, Sicherungen, ältere Formate, Rechenwerte und Office-/PDF-Dateien wurden erneut geprüft.

Geräteprüfungen auf echten Telefonen bleiben ein gesonderter Schritt.

## Dateien

`src/app-shell.js` verwaltet die Navigation und die gezielte Darstellung; `assets/app-shell.css` die App-Oberfläche. Die bestehenden Module werden über ihre bisherigen Funktionen angebunden. UI-Auswahlfelder werden ausdrücklich nicht in der Bewertungsdatei gespeichert.
