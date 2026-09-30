# Preisermittlung als App aufs Handy

Die Wertermittlung ist jetzt eine **PWA** (Progressive Web App): Sie lässt sich auf dem
Homescreen installieren, startet mit eigenem Icon im Vollbild und funktioniert **ohne
Internet** – ideal für den Ortstermin im Keller ohne Empfang.

## Dateien

Die App besteht aus mehreren Dateien und Ordnern, die **alle zusammen** ins Netz gehören:
`index.html`, `sw.js`, `manifest.webmanifest`, `selbsttest.js` sowie die Ordner `js/`, `src/`, `assets/`,
`icons/` und `vendor/`. `index.html` allein reicht nicht mehr (seit dem Umbau in Module, siehe DECISIONS D19).
Nicht nötig sind `tests/`, `docs/`, `scripts/` und die Markdown-Dateien.

## Schritt 1 – Ins Netz stellen

Für die Installation als App braucht der Browser eine **https://**-Adresse.
(Ein reines Öffnen der Datei vom Handy-Speicher reicht dafür nicht.)

**Variante A – GitHub Pages (so läuft die App heute)**
Unter <https://bababraun.github.io/preisermittlung/> — jede Übernahme auf `main` wird automatisch
veröffentlicht.

**Variante B – Netlify Drop, ganzer Ordner**
Den **Ordner** `Wertermittlungen` aufs Drop-Feld von <https://app.netlify.com/drop> ziehen –
nicht die Dateien einzeln markieren, sondern den Ordner selbst greifen.
Im Datei-Dialog von Netlify lassen sich keine Ordner wählen; **Drag & Drop aus dem
Explorer** ist der Weg. Damit ist die App auch ohne Empfang nutzbar.

**Variante C – Bank-Intranet (empfohlen für den dienstlichen Einsatz)**
Ordner von der IT auf einen internen Webserver legen lassen, z. B.
`https://intranet.vb-bia.de/preisermittlung/`

> Vor dem Veröffentlichen auf einem **externen** Dienst bitte mit IT/Compliance abstimmen.
> Die App enthält keine Kundendaten (alle Eingaben bleiben lokal auf dem Gerät),
> es geht allein um das Werkzeug selbst.

## Schritt 2 – Auf dem Handy installieren

**iPhone / iPad (Safari)**
1. Adresse in **Safari** öffnen (nicht Chrome – nur Safari kann installieren)
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben)
3. **„Zum Home-Bildschirm"** wählen → **Hinzufügen**

**Android (Chrome)**
1. Adresse in Chrome öffnen
2. Auf den Button **📲 Installieren** in der App tippen
   (oder Menü ⋮ → „App installieren")

Danach liegt die App mit eigenem Icon auf dem Homescreen und startet ohne Browserleiste.

## Gut zu wissen

- **Offline:** Nach dem ersten Start läuft alles ohne Internet – rechnen, Fotos
  aufnehmen, Bericht ansehen.
- **Daten bleiben auf dem Gerät.** Es werden keine Daten an einen Server gesendet.
  Handy und PC teilen sich die Projekte **nicht** – zum Übertragen „💾 Datei" nutzen
  und die JSON-Datei auf dem anderen Gerät über „📂 Öffnen" laden.
- **PDF:** Der direkte PDF-Download braucht einmalig Internet. Offline öffnet sich
  stattdessen der Druckdialog – dort „Als PDF sichern" wählen (funktioniert auf
  iPhone und Android genauso).
- **Speicherplatz:** Fotos werden im Gerätespeicher des Browsers abgelegt (ca. 5–10 MB).
  Bei vielen Fotos die Bewertung über „💾 Datei" sichern und im Browser aufräumen.
- **Update:** Vorher `npm run build` ausführen – das erzeugt `sw.js` mit neuer Version
  aus dem Inhalt. Dann die neue Fassung hochladen. Installierte Geräte übernehmen sie,
  sobald die App einmal ganz geschlossen und neu geöffnet wurde.
