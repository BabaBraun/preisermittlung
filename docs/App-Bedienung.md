# App-Bedienung — 30. September 2026

Die Oberfläche wurde für die tägliche Arbeit mit einer Immobilie umgebaut. Der Rechenkern, alle Formularfelder und bestehende Speicherformate bleiben erhalten.

## Hauptbereiche

- **Übersicht:** neue Bewertung beginnen, Objekte suchen, zuletzt bearbeitete Bewertungen und fällige Aufgaben finden.
- **Objekte:** Bewertungen öffnen und sichern, Projektdateien übertragen und Sicherungen wiederherstellen.
- **Markt:** die eigene Marktdatenbank erfassen, vergleichen und auswerten.
- **Mehr:** Finanzierung, Kunden, Wiedervorlagen, Liegenschaftsverwaltung, Darstellung, Datensicherung, Datenschutz und App-Sperre.

## Innerhalb einer Bewertung (seit 30.09.2026 wieder wie früher)

Alle Abschnitte stehen untereinander in der bekannten Reihenfolge (Eckdaten, Aufnahmebogen, Hauptgebäude, Anbau,
Objektdaten & Beschreibung … Preisempfehlung … Vermarktung), fortlaufend nummeriert 1, 2, 3 … ohne Lücken — beim Haus
und bei der Wohnung jeweils passend zu den angezeigten Abschnitten; die Blöcke darin entsprechend 5.1, 5.2 … Jeder
Abschnitt lässt sich über den Pfeil rechts (oder einen Klick auf die Überschrift) auf- und zuklappen, jeder Block
darin (z. B. „Lage“, „Restnutzungsdauer“) ebenso. Die Seitenleiste zeigt dieselben Nummern. „Alle aufklappen“ / „Alle zuklappen“ stehen über der Liste. Die App
merkt sich auf dem Gerät, was zugeklappt ist.

Links steht die Abschnittsliste mit Status (Erfassung, Verfahren, Abschluss) zum Springen, rechts das Ergebnis mit
Preisempfehlung, Gewichtung, Vollständigkeit und Prüfhinweisen. Am Handy ist die Abschnittsliste eine Leiste unter
der Kopfzeile, das Ergebnis steht als Karte über der Liste. Ein Sprung oder Prüfhinweis öffnet zugeklappte Abschnitte
und Blöcke automatisch. Beim Drucken wird alles aufgeklappt. Die Eingaben und Rechnungen sind unverändert.

## Baupreisindex

Im Abschnitt „Hauptgebäude“ (2.3 Gebäudepreis) die Gebäudeart wählen (Wohngebäude; Bürogebäude, auch für Bank- und
Geschäftshäuser; gewerbliche Betriebsgebäude) und „Wert zum Stichtag übernehmen“ tippen: Die App trägt den
Quartalswert des Statistischen Landesamts Baden-Württemberg zum Wertermittlungsstichtag ein, dazu den
Umrechnungsfaktor auf NHK 2010 (100 / Jahresdurchschnitt 2010) und die Quelle. Liegt der Stichtag nach dem neuesten
eingebauten Quartal, steht „vorläufig“ dabei — den neueren Wert dann aus dem Statistischen Bericht selbst eintragen.

## Bewertungen einer Liegenschaft

Liegenschaftsverwaltung → Liegenschaft → Reiter „Bewertungen“:

- **Bewertung eintragen:** Ergebnisse früherer Preiseinschätzungen oder Gutachten (z. B. aus Excel) mit Stichtag,
  Bodenwert, Substanz, Ertrag, Ergebnis, Baupreisindex und Quelle.
- **Aus Preisermittlung übernehmen:** eine gespeicherte Bewertung wählen; die App rechnet sie und trägt die Werte ein.
  Die Bewertung bleibt verknüpft („Öffnen“, „Neu rechnen“).
- **Auf neuen Stichtag fortschreiben:** legt eine Kopie der verknüpften Bewertung als Entwurf an — neuer Stichtag,
  amtlicher Baupreisindex, angepasste Restnutzungsdauer und PV-Laufzeit fortgeschrieben. Bodenrichtwert, Mieten und
  Zinssätze bleiben stehen und sind zu prüfen (die Liste steht in der Notiz).
- Für Objekte der Bank und eigene Objekte erscheint die jährliche Bewertung (ein Jahr nach der letzten
  abgeschlossenen) in den Fristen. Einheiten können als „Eigennutzung“ markiert werden; sie zählen nicht als
  Leerstand, die Zielmiete gilt dann als fiktive Miete.

## Prüfung

42 Unit-Tests und 39 Browsertests im vollständigen Lauf bestanden. Zusätzlich ist der tatsächliche Textkontrast der aktiven Navigation, Arbeitsschritte und des Exportbuttons im iPhone-Dunkelmodus geprüft (mindestens 4,5:1). Fotos, Sicherungen, ältere Formate, Rechenwerte und Office-/PDF-Dateien wurden erneut geprüft.

Geräteprüfungen auf echten Telefonen bleiben ein gesonderter Schritt.

## Dateien

`src/app-shell.js` verwaltet die Navigation und die gezielte Darstellung; `assets/app-shell.css` die App-Oberfläche. Die bestehenden Module werden über ihre bisherigen Funktionen angebunden. UI-Auswahlfelder werden ausdrücklich nicht in der Bewertungsdatei gespeichert.
