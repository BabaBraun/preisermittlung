# Native iOS-App

Die aktuelle iOS-App liegt unter `ios/ImmoAppNative.xcodeproj`, Scheme **ImmoApp**, Mindestversion **iOS 17**. Die Oberfläche besteht aus SwiftUI und UIKit. Das App-Bundle enthält keine HTML-/CSS-Oberfläche, keine WebView und keine Capacitor-Abhängigkeit.

## Umgesetzt

- Native Übersicht, Objektliste, Suche und Navigation zwischen Erfassung, Besichtigung, Bewertung und Ergebnis.
- Geführte Eingabe mit kurzen Seiten, Zurück/Weiter, Feldnavigation und echten Ganzzahl-/Dezimalfeldern. [Überarbeitung der Eingabeführung](Native-Eingabeführung.md). Native Auswahllisten und Datumsauswahl. Bewertungsfelder bleiben über dieselben stabilen Feldkennungen mit vorhandenen Dateien kompatibel.
- Rechenweg und getrennte Prüfhinweise für Preisansatz und Beleihung. Fehlende Grundlagen erscheinen als Entwurf.
- Lokale, atomare Speicherung mit iOS-Dateischutz. Fehler beim Speichern werden sichtbar; der vorherige Stand bleibt erhalten.
- Einzelbewertungen und ältere Projektsicherungen importieren; JSON-Bewertungen teilen; native Gesamtsicherungen erstellen und wieder einlesen. Unbekannte Felder und Anhänge bleiben beim nativen Sicherungswechsel erhalten.
- Fotos aus der Fotomediathek, verkleinerte Bildspeicherung und PDF-Berichte direkt über UIKit. Der Bericht enthält Rechenwerte, Prüfhinweise, Eingaben und Fotos.
- Optionaler Schutz mit Gerätesperre/Face ID; erneutes Sperren nach Wechsel in den Hintergrund.

## Rechenkern

Die vorhandenen geprüften Formeln laufen lokal in Apples **JavaScriptCore**. Das ist ein iOS-Framework für isolierte JavaScript-Berechnungen, kein Browser und keine Weboberfläche. Die Bedienung, Speicherung und PDF-Ausgabe sind in Swift implementiert. Die Formeln wurden nicht parallel neu erfunden: zehn charakterisierte Fälle wurden zwischen der bisherigen Laufzeit und JavaScriptCore verglichen.

Der Quellcode des gemeinsamen Kerns bleibt in `js/kern.js`, `js/modell.js` und `js/daten.js`. `npm run ios:sync` aktualisiert nur diese lokalen Rechenressourcen. Der Xcode-Build benötigt keinen Node-Prozess, Webserver oder Internetzugriff für die App-Laufzeit.

`ios/project.yml` ist die reproduzierbare XcodeGen-Projektdefinition. Das erzeugte Xcode-Projekt ist mitgeliefert; XcodeGen ist zum Öffnen und Bauen nicht erforderlich.

## Getestet

Zwölf native XCTest-/UI-Tests, einschließlich Zahlen-Tastatur, Feldnavigation, kurzer Eingabeschritte und Fortsetzen der Eingabe. Die bisherigen Prüfungen: Referenzergebnisse und Mindestansätze, alle zehn charakterisierten Fälle, Speicherung/Neustart/fehlerhafter Import, Sicherungswechsel mit Anhängen, mehrseitiger PDF-Bericht, kein HTML/Capacitor im Bundle und echter UI-Ablauf ohne WebView. Alle bestanden, keine übersprungenen Tests. Die App wurde zusätzlich im iPhone-17-Simulator gestartet und visuell geprüft.

## Noch offen

Diese native Fassung deckt die Immobilienerfassung und Bewertung ab. Die frühere PWA bleibt als separate Quellfassung erhalten. Deren eigenständige Markt-Datenbank, Kunden-/Aufgabenverwaltung, interaktive Grundrisszeichnung, Office-Exporte, Präsentationsabläufe und komplette Finanzierungsberatung sind noch nicht als eigenständige native Abläufe übertragen. Importierte Zusatzdaten bleiben in Sicherungen erhalten; das ist keine fertige native Bedienung dieser Funktionen.

Eine vollständige Portierung sämtlicher früherer Zusatzfunktionen wird hier ausdrücklich nicht behauptet. Ebenso fehlen Prüfung auf einem physischen iPhone, finale App-Store-Grafiken, Signierung und TestFlight-Veröffentlichung. Örtliche Marktdaten und fachliche Freigabe müssen weiterhin objektspezifisch geprüft werden.
