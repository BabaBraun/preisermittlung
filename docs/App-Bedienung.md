# App-Bedienung — 30. September 2026

Die Oberfläche wurde für die tägliche Arbeit mit einer Immobilie umgebaut. Der Rechenkern, alle Formularfelder und bestehende Speicherformate bleiben erhalten.

## Hauptbereiche

- **Übersicht:** neue Bewertung beginnen, Objekte suchen, zuletzt bearbeitete Bewertungen und fällige Aufgaben finden.
- **Objekte:** Bewertungen öffnen und sichern, Projektdateien übertragen und Sicherungen wiederherstellen.
- **Markt:** die eigene Marktdatenbank erfassen, vergleichen und auswerten.
- **Mehr:** Finanzierung, Kunden, Wiedervorlagen, Darstellung, Datensicherung, Datenschutz und App-Sperre.

## Innerhalb einer Bewertung

Die Objektübersicht zeigt die rechnerische Preisempfehlung bzw. den Hinweis auf unvollständige/ungültige Angaben, die Zahl der Pflichtangaben und einen direkten Einstieg zur nächsten fehlenden Angabe.

Die Arbeit ist in **Objekt, Besichtigung, Bewertung und Ergebnis** gegliedert. Ein Abschnitt wird jeweils gezielt geöffnet. Die sichtbaren Formulare verwenden dieselben Eingaben wie bisher; es entstehen keine separaten Kopien je Ansicht. Längere Abschnitte sind aufklappbar. Tabellen lassen sich innerhalb ihres Bereichs seitlich verschieben, ohne dass die gesamte Seite zu breit wird.

Prüfhinweise öffnen Abschnitt und geschlossene Details direkt. Suchtreffer zeigen geladene Projekte auch dann, wenn die Suche aus einem anderen Hauptbereich aufgerufen wurde. Browser-Zurück erhält den Navigationskontext und löscht keine Eingaben.

## Prüfung

42 Unit-Tests und 39 Browsertests im vollständigen Lauf bestanden. Zusätzlich ist der tatsächliche Textkontrast der aktiven Navigation, Arbeitsschritte und des Exportbuttons im iPhone-Dunkelmodus geprüft (mindestens 4,5:1). Fotos, Sicherungen, ältere Formate, Rechenwerte und Office-/PDF-Dateien wurden erneut geprüft. Der iOS-Simulator-Build des neuen Layouts kompiliert erfolgreich.

Screenshots unter `docs/vorschau/` zeigen synthetische Testdaten; die Uhr ist für reproduzierbare Tests festgesetzt. Geräteprüfungen und Veröffentlichung bleiben gesonderte Schritte.

## Dateien

`src/app-shell.js` verwaltet die Navigation und die gezielte Darstellung; `assets/app-shell.css` die App-Oberfläche. Die bestehenden Module werden über ihre bisherigen Funktionen angebunden. UI-Auswahlfelder werden ausdrücklich nicht in der Bewertungsdatei gespeichert.
