# Umsetzung der festgestellten Modellkorrekturen

Freigegebener Auftrag: alle Befunde der Berechnungsprüfung verbessern. Rechenkern und UI bleiben lokal; gespeicherte Daten werden weder gelöscht noch durch neue Vorgaben überschrieben.

## Arbeitsschritte

- [ ] Regressionstests für Mindestkosten, Mindestabschlag, kurze Restnutzungsdauer, negative Gebäudereinerträge, Verfahrensableitung, Doppelzählung und beschränkte Rechte.
- [ ] Reine Berechnungs-/Prüfschicht: effektive Mindestsätze, getrennte Status für Preis/Beleihung, vollständige Herkunft und Begründungen.
- [ ] Frische Bewertungen ohne automatisch angenommene Garagen/Außenanlagen/Marktparameter; ältere Werte bleiben lesbar und erhalten Prüfhinweise.
- [ ] BelWertV: detaillierte Kosten und Modernisierungsrisiko, bestätigter veröffentlichter Mindestzins einschließlich Nutzungsaufschlag, Sonderfälle unter 30 Jahren und Freilegungskosten, Ertragswert als regulärer Ausgangswert mit Kontrollprüfung.
- [ ] Energie/PV: bereits enthaltene Vorteile nicht erneut addieren; Energiekosten-Barwert getrennt von einem belegten Marktwertansatz.
- [ ] Rechte: ausdrücklicher Umfang und Mietansatz, belegte Laufzeit oder Kapitalwert statt eigener Lebensdauer-Näherung, Markt-/Steuerzweck trennen.
- [ ] Sichtbare effektive Werte, Anpassungen, Begründungen und Status in Oberfläche sowie DOCX/XLSX/PDF.
- [ ] Unabhängige Referenzen gezielt aktualisieren; Altstände als Nachweis erhalten. Keine Aktualisierung von Sollwerten nur damit ein Test grün wird.
- [ ] Gesamtsuite, iPhone-/Desktop-Flows, iOS-Build, Dokumentation und gesicherte Übertragung.

## Grenzen

Keine erfundenen örtlichen Marktdaten oder amtlichen Sterbetafeln. Ein Datum, eine Quelle und eine Anwenderbestätigung machen eine Quelle nachvollziehbar, aber nicht automatisch fachlich richtig. Unvollständige Sonderfälle werden als Entwurf ausgewiesen und können nicht als geprüfter Wert erscheinen.
