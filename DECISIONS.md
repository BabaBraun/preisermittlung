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

---

## D6 (2026-09-29) — Grundrisse: Claude liest das Bild, die App zeichnet aus einem Datenformat

**Entscheidung:** Die App erkennt Grundrisse nicht selbst. Den fotografierten Plan liest Claude außerhalb der
App (claude.ai-Projekt, Claude-App am Handy oder Claude Code am PC) nach `GRUNDRISS-ANLEITUNG.md` und gibt
einen JSON-Code aus. Die App liest diesen Code, zeichnet daraus den Plan als SVG in vier Darstellungen und
übernimmt die Räume in die Raumliste. Gespeichert wird der Code des Geschosses, nicht die Zeichnung.

**Begründung:** Eine Bilderkennung in der App bräuchte entweder einen Server mit KI-Zugang (widerspricht D2,
dazu ein API-Schlüssel, der in einer öffentlichen App nicht sicher abzulegen ist) oder eine Erkennung im
Browser, die Maßzahlen und Wände aus Fotos nicht verlässlich genug liest. Das Datenformat trennt die zwei
Aufgaben sauber: Lesen (fehleranfällig, braucht Rückfragen und Prüfsummen) und Zeichnen (deterministisch,
prüfbar). Weil die Zeichnung erst beim Anzeigen entsteht, lassen sich alle vier Darstellungen aus denselben
Daten erzeugen, Korrekturen laufen über den Code, und der Plan ist wenige KB groß statt eines Bildes.

**Grenzen:** Genau wird der Plan nur so weit, wie die Maße im Original stehen. Ohne Maße ist er
proportional und wird als „nicht maßstäblich“ gekennzeichnet, bis ein bekanntes Maß eingetragen ist.
Die Raumliste übernimmt auf Wunsch des Nutzers die Fläche laut Plan; die aus den Maßen berechnete Fläche
dient als Kontrolle (Markierung ab 3 % Abweichung). Das Foto geht an Anthropic — deshalb der Hinweis, den
Plankopf mit Eigentümer und Adresse abzudecken.

---

## D7 (2026-09-29) — Projekte und Fotos in die IndexedDB

**Entscheidung:** Gesicherte Projekte (samt Fotos) und die Fotos der laufenden Bewertung liegen in der
IndexedDB `ia_bewertungen`. Im localStorage bleibt nur der kleine Arbeitsstand (Felder, Grundrisse,
Unterschrift) mit dem Merker `fotosInDb`. Beim ersten Start übernimmt die App den Altbestand und löscht den
alten Schlüssel erst, nachdem sie geprüft hat, dass jedes Projekt in der Datenbank angekommen ist.

**Begründung:** Der localStorage fasst auf dem iPhone rund 5 MB. Nach zwei, drei Objekten mit
Fotodokumentation schlug das Sichern fehl, und die automatische Zwischenspeicherung ließ die Fotos
stillschweigend weg. Die IndexedDB hat um Größenordnungen mehr Platz, trägt `navigator.storage.persist()`
und wird vom Marktüberblick bereits genutzt (D2 bleibt gewahrt: alles lokal, kein Server).

**Umsetzung und Grenzen:** Die Projektliste ohne Fotos liegt zusätzlich im Arbeitsspeicher, damit
Startseite und Suche synchron lesen können; Fotos werden erst beim Öffnen geholt. Fotos der laufenden
Bewertung werden gebündelt (400 ms) und beim Wechsel in den Hintergrund sofort geschrieben. Schlägt ein
Schreibvorgang fehl, erscheint ein roter Hinweis mit „Als Datei sichern“ — es gibt keinen stillen Verlust
mehr. Ohne IndexedDB (manche privaten Fenster) arbeitet die App wie vorher mit dem localStorage weiter und
übernimmt diesen Bestand beim nächsten Start mit Datenbank. Die Datenbank verschwindet weiterhin, wenn die
App vom Home-Bildschirm gelöscht wird; dafür gibt es die Gesamtsicherung aller Projekte als Datei mit
Erinnerung auf der Startseite (nach 14 Tagen bzw. wenn seitdem Projekte geändert wurden).

---

## D8 (2026-09-29) — Kundenakte: personenbezogene Daten nur lokal, mit Auskunft und Löschung

**Entscheidung:** Die Kundenakte speichert Kunden (Stammdaten, Rechtsgrundlage, Löschprüfdatum,
Gesprächsnotizen, abgelegte Finanzierungsrechnungen) im Speicher `kunden` der IndexedDB
`ia_bewertungen` (Version 2). Bewertungen verweisen über das versteckte Feld `ek_kunde_id` auf den Kunden,
Wiedervorlagen über `kundeId`. Kundennamen gelangen nie in den Marktüberblick (D4 bleibt).

**Begründung:** Die App wird im Beratungsalltag für Kunden genutzt; ohne Akte landen dieselben Daten
verstreut im Auftraggeberfeld, in Aufgabentexten und Notizzetteln — schlechter geschützt und nicht löschbar.
Eine Akte bündelt sie und macht die DSGVO-Pflichten handhabbar: Rechtsgrundlage je Kunde (Art. 6 Abs. 1
lit. a oder b), Löschprüfdatum mit Markierung in der Liste (Speicherbegrenzung), Auskunft als lesbare
Textdatei (Art. 15), vollständige Löschung je Kunde (Art. 17). Hinweis auf die App-Sperre, sobald
Kunden gespeichert sind.

**Umsetzung und Grenzen:** Beim Löschen eines Kunden bleiben zugeordnete Bewertungen erhalten, nur die
Zuordnung wird gelöst; seine Wiedervorlagen werden auf Nachfrage gelöscht oder ohne Kundenbezug behalten.
Die Gesamtsicherung enthält Kunden und Wiedervorlagen (Dateiversion 2). Das Datenbank-Upgrade von
Version 1 auf 2 wartet, statt abzubrechen, wenn ein älteres Fenster die Datenbank noch offen hält — ein
Abbruch hätte die App auf den leeren localStorage zurückfallen lassen. Ohne IndexedDB (manche privaten
Fenster) ist die Kundenakte nicht verfügbar; die App sagt das, statt Kundendaten ungeschützter abzulegen.

---

## D9 (2026-09-29) — Marktdaten des Gutachterausschusses: Struktur ja, vorbelegte Werte nein

**Entscheidung:** Sachwertfaktoren und Liegenschaftszinssätze werden je Immobilienmarktbericht als Datensatz
mit Quelle, Stand, Gebiet und Modell (NHK, Gesamtnutzungsdauer, Restnutzungsdauer, Alterswertminderung)
gepflegt. Die App gibt keine Werte vor. Jede Bewertung merkt sich den verwendeten Satz und je Ansatz die
Quelle; der Bericht weist beides im Abschnitt „Datengrundlagen und Modellkonformität“ aus.

**Begründung:** Zuständig für Abstatt, Beilstein und Ilsfeld ist der Gemeinsame Gutachterausschuss
südwestlicher Landkreis Heilbronn (Geschäftsstelle Eppingen). Er stellt online nur die Bodenrichtwerte
bereit; einen frei verfügbaren Marktbericht mit Sachwertfaktoren und Liegenschaftszinsen gab es bei der
Recherche nicht. Werte aus anderen Berichten (etwa Stadt Heilbronn) zu übernehmen wäre fachlich falsch.
Nach § 10 ImmoWertV dürfen die Daten zudem nur im Modell ihrer Ableitung angewendet werden — deshalb
vergleicht die App das Modell des Satzes mit der Bewertung und warnt bei Abweichungen.

**Umsetzung:** Datensätze im localStorage (`ia_parameter`), teilbar als Datei für Kolleginnen und Kollegen
und Teil der Gesamtsicherung. Die Abfrage des Sachwertfaktors wählt die Zeile, in deren Spanne der
vorläufige Sachwert fällt; liegt er außerhalb, die nächste Klasse mit Hinweis.

## D10 (2026-09-30) — Modularisierung und lokale iOS-Hülle

Die während der Arbeit aktualisierte GitHub-Fassung `7fa7d96` bleibt die fachliche Grundlage. Zusätzlich werden CSS und Browseradapter aus der HTML-Datei gelöst. Klassische Skripte erhalten ihre bisherigen globalen Schnittstellen; die Initialisierung findet nach dem Laden aller Module statt. Der pure Rechenkern wird weiter über unabhängige Sollwerte geprüft.

Die Build-Werkzeuge erzeugen lokale Schriftarten, eine native Capacitor-Brücke und einen vollständigen Offline-Cache mit Inhalts-Hash. Ein Update wartet auf das Schließen alter Fenster; eine fehlende Datei verhindert die Installation der unvollständigen Version. Einzeldatei-Uploads werden zugunsten des vollständigen statischen Ordners aufgegeben und in der Anleitung korrigiert.

Der Mac besitzt Xcode. Deshalb wird die bisher nur theoretische Capacitor-Vorbereitung konkret als Xcode-Projekt umgesetzt und im Simulator geprüft. Keine SwiftUI-Neuentwicklung und keine Veröffentlichung. Gerätesperre über LocalAuthentication, Dateiausgabe über Filesystem/Share. PWA-Speicher und native App-Speicher werden nicht automatisch zusammengeführt.

## Aktueller Stand nach der nativen Umsetzung

Die frühere Capacitor-Vorbereitung wurde durch eine echte SwiftUI-App ersetzt. Hauptprojekt ist `ios/ImmoAppNative.xcodeproj`. Der gemeinsame Formelkern läuft lokal in JavaScriptCore; Bedienung, Speicherung und PDF-Ausgabe sind nativ. Frühere Aussagen zur WebView-Vorbereitung dokumentieren den damaligen Zwischenschritt.
