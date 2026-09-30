# ImmoApp auf dem Handy

## PWA

1. Den vollständigen Inhalt von `dist/` auf einem HTTPS-Webserver bereitstellen. Vorher `npm ci` und `npm run build` ausführen.
2. Auf dem iPhone in Safari öffnen und über „Teilen → Zum Home-Bildschirm“ hinzufügen; auf Android über „App installieren“.
3. Beim ersten Besuch online bleiben, bis die App vollständig geladen ist. Danach stehen Formulare, Rechenkern, Schriftarten und Exporte offline bereit.

`index.html` allein reicht nicht mehr: Die Anwendung verwendet fachliche Module, CSS und lokale Bibliotheken. Wer den Repository-Ordner direkt bereitstellt, muss alle dort vorhandenen Laufzeitdateien einschließlich `src/`, `js/`, `assets/`, `vendor/`, Icons und `sw.js` mitnehmen.

Updates werden vollständig vorgeladen. Für die Aktivierung alle geöffneten ImmoApp-Fenster schließen und neu öffnen. Ein unvollständiges Update ersetzt keine funktionierende Version.

## Native iOS-App

Das lokale Xcode-Projekt steht unter `ios/App/App.xcodeproj` bereit:

```sh
npm ci
npm run ios:sync
npm run ios:open
```

In Xcode Signing-Team und Zielgerät wählen. Der Simulator-Build wurde geprüft. Die Installation und Gerätefunktionen auf einem echten iPhone sowie TestFlight bleiben gesonderte Schritte; siehe [iOS-Hinweise](docs/Verbesserungen-und-iOS.md).

## Daten mitnehmen

PWA, PC-Browser und native iOS-App speichern getrennt. Projekte/Kunden/Wiedervorlagen über die Projektsicherung, Marktdaten einschließlich PDF-Anhängen über die Marktsicherung übertragen. Fotos und Grundrisse sind Teil der Projektdateien. Sicherungen außerhalb des Browsers aufbewahren und einen Import prüfen, bevor Originaldaten gelöscht werden.

Face ID/Touch ID bzw. Gerätecode schützen nur den App-Zugang. Exportierte Dateien und Datenbanken sind dadurch nicht verschlüsselt.
