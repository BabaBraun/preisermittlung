# ImmoApp: Verbesserungen und iOS

Stand: 30. September 2026.

Die Umsetzung verwendet den während der Arbeit aktualisierten GitHub-Stand `7fa7d96` als Grundlage. Dadurch bleiben die dort bereits hinzugefügten fachlichen Verbesserungen, Office-Exporte, Sicherungsprüfungen und Vertriebsfunktionen erhalten.

## Umsetzung

- Rechenkern, Datei-Prüfung, Speichermechanik, Office-Formate und PDF-Seitenaufteilung liegen in `js/` und sind ohne Browser testbar.
- Die bisherige große HTML-Datei ist in Formular, CSS und 28 fachliche Browsermodule in `src/` aufgeteilt. Der Bootstrap läuft erst, nachdem alle Module geladen sind.
- Schriftarten und PDF-Bibliothek liegen lokal. Der Build erzeugt einen Service Worker mit Inhalts-Hash und vollständiger Liste der benötigten Dateien.
- Eine neue PWA-Version installiert sich nur vollständig. Sie wartet mit der Aktivierung, bis die alte Version in allen Fenstern geschlossen ist. So werden keine alten Formulare mit neuen Skripten vermischt. Fremde Caches bleiben erhalten.
- Zwei zusätzliche Rechenfehler sind mit Regressionstests behoben: numerische Ungenauigkeit bei sehr kleinen positiven Zinsen und falsche Restschuld zum Beginn eines Tilgungsplans.
- Native Exporte verwenden Filesystem/Share; Abbruch oder Fehler dürfen keinen erfolgreichen Sicherungszeitpunkt erzeugen.

## Prüfungen

Die Tests nutzen synthetische Daten und unabhängige Referenzwerte. Erfasst sind Rechenverfahren, Grenzfälle, Einlesen alter Dateien, vollständige Projekte mit Fotos und Grundrissen, Kunden und Wiedervorlagen, Marktdaten mit PDF-Anhängen, voller/gesperrter Speicher, HTML-Einschleusung, Vorlagenwechsel und Selbsttest-Zustand, DOCX/XLSX, PDF/Druck, Offline-Start und Versionswechsel sowie Desktop- und iPhone-Darstellung.

Die aktuelle vollständige Prüfung und ihre Ergebnisse sind in `SUMMARY.md` festgehalten. Tests ersetzen keine fachliche Freigabe sämtlicher Bewertungsmodelle oder Marktparameter.

## iOS-Projekt

`ios/App/App.xcodeproj` ist ein erzeugtes und im Simulator gebautes Capacitor-Projekt. Es verwendet den vorhandenen Rechenkern und eine WKWebView. Die App-Dateien sind eingebettet; für den Start wird kein Webserver benötigt. Die JavaScript-Brücke stellt Filesystem/Share bereit. Ein kleiner Swift-Baustein verwendet LocalAuthentication für die optionale Gerätesperre.

Die Simulator-App ist gebaut, installiert und gestartet worden. Der obere Sicherheitsabstand ist an die Statusleiste angepasst. Das Datenschutzmanifest für Dateizugriffe und die Beschreibungen für Kamera, Fotos, Standort und Face ID sind hinterlegt.

Die Hülle ist eine native installierbare iOS-Anwendung, ihre Oberfläche bleibt Web-Technik. Eine vollständig in SwiftUI geschriebene Oberfläche wäre ein eigener Umbau mit zusätzlichem Aufwand für Formulare, Berichte, Grundrisse, Speichermigration und erneute fachliche Tests.

### Selbst starten

```sh
npm ci
npm run ios:sync
npm run ios:open
```

In Xcode das persönliche Signing-Team und das gewünschte iPhone wählen. Für Simulator-Builds ist kein kostenpflichtiges Entwicklerkonto nötig. Für TestFlight oder den App Store muss das Projekt anschließend signiert und der Veröffentlichungsprozess vollständig durchgeführt werden.

PWA und native App haben getrennte Datenspeicher. Vorhandene Bewertungen/Kunden/Marktdaten werden über die jeweiligen Sicherungsdateien übertragen. Ein Umzug geschieht nicht automatisch. Die Gerätesperre verschlüsselt weder Datenbanken noch exportierte Sicherungen.

Noch offen für eine Geräte-/Veröffentlichungsfreigabe: echte Face ID/Touch ID bzw. Gerätecode, Kamera/Fotobibliothek, GPS, Dateiimport und Teilen-Menü auf einem physischen iPhone, Hintergrundwechsel, endgültiges App-Icon/Launchscreen, Signierung und TestFlight-Verfügbarkeit. Ein erfolgreicher Simulator-Build bestätigt diese Punkte nicht.

## Aufwandseinschätzung

Die technische Capacitor-Grundlage steht bereits. Für eine persönlich nutzbare iPhone-Fassung ist als grobe, ungeprüfte Planung noch mit einigen Arbeitstagen für Geräteprüfung, Dateiabläufe, Branding und Signierung zu rechnen. Eine hochwertige vollständige SwiftUI-Neuentwicklung läge eher bei mehreren Wochen. Das sind Schätzungen, keine gemessenen Fertigstellungstermine.
