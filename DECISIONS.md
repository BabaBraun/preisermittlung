# Architekturentscheidungen — ImmoApp

Kurz begründet, dann weitergearbeitet (siehe Auftrag). Jede Entscheidung mit Datum, damit sie später
nachvollziehbar bleibt, wenn sich die Lage ändert.

---

## D1 (2026-09-23) — Native App: PWA ausbauen, Capacitor vorbereiten statt Neuschreiben

**Frage:** Capacitor, React Native/Expo, SwiftUI oder eine ausgebaute PWA?

**Entscheidung:** Die PWA bleibt die Primärstrategie und wird gezielt um native Fähigkeiten erweitert
(Kamera, GPS, Geräte-Sperre über Face ID/Touch ID, Offline — siehe unten). Ein Capacitor-Grundgerüst wird
vorbereitet, aber nicht fertig gebaut, weil der letzte Schritt (iOS-Plattform hinzufügen, in Xcode öffnen,
auf ein Gerät bringen) zwingend einen Mac mit Xcode voraussetzt — das kann von einer Windows-Umgebung aus
nicht ausgeführt werden. SwiftUI und React Native/Expo werden verworfen.

**Begründung:**
- Die App ist ein gereiftes, aktiv genutztes Single-File-Projekt mit einem fachlich verifizierten
  Rechenkern (ImmoWertV-Verfahren, gegen Excel-Vorlage und ein reales Gutachten geprüft). Eine
  Neuentwicklung in SwiftUI oder React Native würde diesen Rechenkern komplett neu schreiben oder eine
  zweite, parallel zu pflegende Codebasis erzeugen. Für das Ziel „mittelfristig Gutachter werden" ist das
  unverhältnismäßig — jede Stunde in einem Rewrite ist eine Stunde, die nicht in Bewertungsqualität fließt.
- **Capacitor** wäre der richtige Weg, wenn eine echte App-Store-App gebraucht wird: Es verpackt die
  bestehende HTML/CSS/JS-App fast unverändert in eine native Hülle und gibt über eine Brücke Zugriff auf
  native APIs (Kamera, Dateisystem, Push, Biometrie). Der Aufwand ist gering — aber der iOS-Build läuft
  ausschließlich über Xcode/CocoaPods, und die läuft nur auf macOS. Ohne Mac und ohne (mindestens kostenlose)
  Apple-ID zum Signieren ist dieser letzte Schritt von hier aus nicht möglich. Das Grundgerüst (siehe
  CAPACITOR-SETUP.md) liegt bereit, sobald ein Mac verfügbar ist.
- **Was eine PWA auf dem iPhone bereits heute kann, ganz ohne Apple-Developer-Account:** Installation über
  „Zum Home-Bildschirm" mit eigenem Icon und eigenständigem Fenster (bereits umgesetzt), Offline-Betrieb
  über den Service Worker (bereits umgesetzt und verifiziert), Kamerazugriff über ein Datei-Eingabefeld mit
  `capture="environment"` (öffnet direkt die Rückkamera, kein Umweg über die Fotomediathek), Standortabfrage
  über die Geolocation-API, und eine Geräte-Sperre über die WebAuthn-Plattform-Authentifizierung (Face
  ID/Touch ID) — das läuft vollständig lokal im Browser, ganz ohne eigenen Server.

**Grenze, die ehrlich benannt werden muss — echte Push-Benachrichtigungen:** Web Push funktioniert seit
iOS 16.4 auch für zum Home-Bildschirm hinzugefügte Web-Apps, **braucht aber zwingend einen Server**, der die
Push-Nachricht auslöst (VAPID-signierter Aufruf an Apples Push-Dienst) — das App selbst kann sich nicht
selbst anstoßen, wenn sie geschlossen ist. Diese App hat aktuell keinerlei Backend. Echte
Hintergrund-Benachrichtigungen sind deshalb ohne zusätzliche Server-Infrastruktur nicht erreichbar. Statt
eine halbfertige, unzuverlässige Push-Funktion zu bauen (verboten laut Auftrag: „keine Features halb fertig
liegen lassen"), werden Wiedervorlagen/Aufgaben zunächst als **In-App-Liste mit Fällig-/Überfällig-Anzeige**
umgesetzt — funktioniert vollständig offline, ohne Server, zeigt sich beim nächsten Öffnen der App. Echte
Push-Benachrichtigungen bleiben eine dokumentierte spätere Ausbaustufe (z. B. über einen kleinen Cloudflare
Worker als Mini-Backend), wenn der Bedarf entsteht.

---

## D2 (2026-09-23) — Datenhaltung bleibt lokal, kein Server-Sync

**Entscheidung:** Kein Wechsel auf eine Cloud-Datenbank oder einen eigenen Server. Bewertungen und
Marktüberblick bleiben in localStorage/IndexedDB auf dem jeweiligen Gerät.

**Begründung:** Deckt sich mit der DSGVO-Minimierung (keine Kundendaten verlassen das Gerät), erfordert
keinen Betrieb/keine Kosten für ein Backend, und passt zum bisherigen Ansatz. Kehrseite (kein Sync zwischen
Geräten, Verlustrisiko bei defektem Gerät) ist durch die vorhandene Export-/Backup-Funktion bereits
gemildert, wird aber in ROADMAP.md als Komfortlücke vermerkt.

---

## D3 (2026-09-23) — PDF-Erzeugung bleibt html2pdf.js, aber mit Integritätsschutz

**Entscheidung:** Kein Wechsel der PDF-Bibliothek. Der bestehende Ansatz (html2pdf.js vom CDN, Fallback auf
den Browser-Druckdialog wenn offline) bleibt, wird aber um einen Subresource-Integrity-Hash ergänzt.

**Begründung:** Die Bibliothek funktioniert, ein Wechsel wäre Aufwand ohne erkennbaren Nutzen für den
Berater. Der fehlende Integritätsschutz ist dagegen eine kleine, konkrete Sicherheitslücke (siehe AUDIT.md
Abschnitt 4) und wird als Quick Win behoben.

---

## D4 (2026-09-23) — Keine Namen in der Marktdatenbank bleibt verbindlicher Grundsatz

**Entscheidung:** Die bereits gelebte Praxis (keine Käufer-/Verkäufernamen im Marktüberblick) wird als
festes Prinzip fortgeschrieben, nicht nur als Zufall des aktuellen Feldschemas. Neue Felder werden daraufhin
geprüft, bevor sie ergänzt werden.

**Begründung:** Der Marktüberblick lebt von Masse an Objektdaten, nicht von Personenbezug — die
Kaufpreissammlung eines Gutachterausschusses macht es genauso. Personenbezogene Daten wären hier ein
unnötiges DSGVO-Risiko ohne fachlichen Mehrwert.

---

## D5 (2026-09-23) — App-Sperre über WebAuthn (Face ID/Touch ID) als lokales Gerätegate

**Entscheidung:** Eine optionale App-Sperre wird ergänzt, die die Plattform-Biometrie (Face ID, Touch ID,
Windows Hello, Android-Fingerabdruck) über die WebAuthn-API nutzt, um die App zu entsperren.

**Begründung/Grenzen:** Das ist **kein** echtes Server-Auth (es gibt keinen Server, der etwas verifiziert)
und auch keine eigene kryptografische Signaturprüfung im Code — implementiert ist der Standard-Ablauf
`navigator.credentials.create()`/`.get()` mit `userVerification:'required'`. Eine erfolgreich aufgelöste
`get()`-Anfrage beweist, dass Betriebssystem und Browser auf diesem Gerät gerade eine Face-ID-/Touch-ID-/
Gerätecode-Prüfung verlangt und bestanden haben — die App vertraut dieser Plattform-Zusicherung, statt selbst
eine COSE-Public-Key-Signatur zu verifizieren (das würde einen CBOR-Parser erfordern und stünde in keinem
Verhältnis zum Sicherheitsgewinn, da ohne Server ohnehin kein unabhängiger zweiter Prüfpfad existiert). Das
schützt zuverlässig vor einem kurzen Blick auf das offen herumliegende Handy (die App zeigt bis zur
erfolgreichen Prüfung nichts an und blockiert auch die Bedienung), schützt aber nicht vor jemandem mit
direktem technischen Zugriff auf den Browserspeicher (z. B. über die Entwicklertools). **Bewusst kein
Wiederherstellungscode:** Funktioniert die Biometrie auf diesem Gerät später nicht mehr, ist der einzige
Weg zurück das Löschen der Website-Daten (Datenverlust, wenn keine Sicherung vorliegt) — ein Recovery-Code
wäre entweder eine Sicherheitslücke (Umgehung der Sperre) oder unverhältnismäßiger Aufwand für ein rein
lokales Gate; die Einrichtung weist deshalb ausdrücklich darauf hin, vorher eine Sicherung anzulegen. Eine
vollständige Verschlüsselung der IndexedDB-Inhalte wäre der nächste, deutlich aufwendigere Schritt und wird
in der Roadmap als spätere Ausbaustufe vermerkt, nicht jetzt umgesetzt.
