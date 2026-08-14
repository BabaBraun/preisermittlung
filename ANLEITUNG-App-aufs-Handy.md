# Preisermittlung als App aufs Handy

Die Wertermittlung ist jetzt eine **PWA** (Progressive Web App): Sie lässt sich auf dem
Homescreen installieren, startet mit eigenem Icon im Vollbild und funktioniert **ohne
Internet** – ideal für den Ortstermin im Keller ohne Empfang.

## Dateien

| Datei | Zweck | nötig? |
|---|---|---|
| `index.html` | **die komplette App** – Icons sind eingebettet | **ja** |
| `manifest.webmanifest` | App-Name, Icon, Farben | optional |
| `sw.js` | Service Worker – macht die App offlinefähig | optional |
| `icons/` | Icons als Einzeldateien | optional |
| `Wertermittlung.html` | alte Adresse, leitet auf `index.html` weiter | nein |

**Die App steckt vollständig in `index.html`.** Die übrigen Dateien sind Zugabe:
Liegen sie daneben, kommt der **Offline-Betrieb** dazu.

## Schritt 1 – Ins Netz stellen

Für die Installation als App braucht der Browser eine **https://**-Adresse.
(Ein reines Öffnen der Datei vom Handy-Speicher reicht dafür nicht.)

**Variante A – Netlify Drop, nur eine Datei (am einfachsten)**
1. <https://app.netlify.com/drop> öffnen
2. **`index.html`** allein auf die Seite ziehen
3. Fertig – es entsteht sofort eine `https://…netlify.app`-Adresse

Die App ist damit vollständig nutzbar und installierbar. Nur der Offline-Betrieb fehlt.

**Variante B – Netlify Drop, ganzer Ordner (mit Offline-Betrieb)**
Statt der einzelnen Datei den **Ordner** `Wertermittlungen` aufs Drop-Feld ziehen –
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

- **Offline:** Nur mit `sw.js` (Variante B/C). Dann läuft nach dem ersten Start alles
  ohne Internet – rechnen, Fotos aufnehmen, Bericht ansehen. Bei der Einzeldatei
  (Variante A) braucht die App eine Verbindung.
- **Daten bleiben auf dem Gerät.** Es werden keine Daten an einen Server gesendet.
  Handy und PC teilen sich die Projekte **nicht** – zum Übertragen „💾 Datei" nutzen
  und die JSON-Datei auf dem anderen Gerät über „📂 Öffnen" laden.
- **PDF:** Der direkte PDF-Download braucht einmalig Internet. Offline öffnet sich
  stattdessen der Druckdialog – dort „Als PDF sichern" wählen (funktioniert auf
  iPhone und Android genauso).
- **Speicherplatz:** Fotos werden im Gerätespeicher des Browsers abgelegt (ca. 5–10 MB).
  Bei vielen Fotos die Bewertung über „💾 Datei" sichern und im Browser aufräumen.
- **Update:** Neue Fassung wieder auf Netlify ziehen. Wird `sw.js` mitgeliefert,
  dort zusätzlich `const CACHE = 'preisermittlung-vX';` hochzählen – sonst behalten
  installierte Geräte die alte Fassung.
