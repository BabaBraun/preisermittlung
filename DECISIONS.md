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

---

## D10 (2026-09-30) — Module ohne Build-Schritt, Tests mit Node und Playwright

**Entscheidung:** Rechenkern (`js/kern.js`), Speicherschicht (`js/speicher.js`), Prüfung von Sicherungsdateien
(`js/daten.js`), Office-Export (`js/office.js`) und PDF-Seitenaufteilung (`js/pdf.js`) liegen als eigene
Dateien neben `index.html`. Es sind klassische Skripte (kein ES-Modul, kein Bundler): Sie hängen ein Objekt an
`globalThis` (`ImmoKern`, `ImmoSpeicher`, …) und exportieren dasselbe per `module.exports` für Node. Die
Oberfläche bleibt in `index.html`.

**Begründung:** Die Bereitstellung als statische PWA (GitHub Pages, keine Installation, kein Build) bleibt
unverändert; der Service Worker cacht die zusätzlichen Dateien. ES-Module hätten den Start über `file://`
verhindert und einen Build nahegelegt. Der Rechenkern liest keine Seitenelemente mehr, sondern bekommt einen
Eingabe-Leser `{n, v, an}` — damit ist er in Node ohne Browser prüfbar. Die frühere Anforderung „läuft als
einzelne hochgeladene Datei“ (Netlify Drop) gilt nicht mehr, seit die App auf GitHub Pages liegt.

**Absicherung des Umbaus:** Vor dem Umbau wurden zehn synthetische Bewertungen im Browser gerechnet und alle
Zahlen aus `window._R` sowie alle angezeigten Ergebnisse festgehalten (`tests/fixtures/golden.json`). Der
Umbau war ergebnisgleich; jede spätere Abweichung ist in `tests/fixtures/golden-aenderungen.md` mit Quelle
und Vorher/Nachher begründet.

---

## D11 (2026-09-30) — Word und Excel als echte Office-Dateien, selbst erzeugt

**Entscheidung:** `.docx` und `.xlsx` werden in `js/office.js` direkt als Office Open XML geschrieben,
einschließlich des ZIP-Containers (Einträge unkomprimiert). Keine fremde Bibliothek.

**Begründung:** Die bisherigen Exporte waren HTML-Dateien mit `.doc`/`.xls`-Endung (Office warnt beim Öffnen,
Excel speicherte Zahlen als Text, Werte wurden unmaskiert eingesetzt). Bibliotheken wie `docx` oder SheetJS
wären mehrere hundert Kilobyte groß und für den kleinen Funktionsumfang (Überschriften, Absätze, Tabellen,
Bilder; Zellen mit Zahlenformat) nicht nötig. Die erzeugten Dateien werden in den Tests mit python-docx,
openpyxl und zipfile geöffnet und wurden zusätzlich manuell in Word, Excel und LibreOffice geprüft.

---

## D12 (2026-09-30) — PDF: html2pdf lokal, Seitenumbrüche selbst gesetzt

**Entscheidung:** html2pdf 0.10.1 liegt unverändert in `vendor/` (Integritäts-Hash wie zuvor beim CDN, das
nur noch als Rückfall dient) und im Service-Worker-Cache. Die Seitenumbrüche setzt `js/pdf.js` selbst;
html2pdfs eigene Umbruchlogik ist abgeschaltet.

**Begründung:** Offline war bisher kein PDF möglich. html2pdfs Umbruchlogik misst relativ zum Fenster, kennt
keine Raster und rechnet mit der Breite des Berichts statt der des gerenderten Containers — Grundriss und
Fotos wurden zerschnitten, Präsentationsfolien verrutschten. Die eigene Aufteilung misst im Container von
html2pdf, hält Überschriften bei ihrem Block, teilt Fotoraster in Zeilen und lange Texte in Absätze und
setzt jede Folie auf genau eine Seite. Die Druckansicht des Browsers (echter Text, durchsuchbar) bleibt der
empfohlene Weg für das Bewertungsdokument; der PDF-Download ist ein Bild-PDF.

---

## D13 (2026-09-30) — Keine Preisempfehlung aus ungültigen oder fehlenden Angaben

**Entscheidung:** `ImmoKern.pruefen()` prüft jedes Feld, das die Rechnung gelesen hat, und die Mindestangaben.
Bei Fehlern oder fehlenden Angaben zeigen Seitenleiste, Handyleiste und Abschnitt ⑨ „–“ mit Begründung;
der Bericht erscheint mit Entwurfshinweis und weist den Wert als „Entwurf“ aus. Die Rechnung selbst läuft
unverändert weiter (wichtig für Zwischenstände).

**Begründung:** Vorher zeigte ein leeres Formular 25.875 €, „abc“ wurde still als 0 gerechnet, negative
Bodenrichtwerte liefen durch. Ein Wert, der plausibel aussieht, aber auf ungültigen Eingaben beruht, ist
gefährlicher als gar keiner.

---

## D14 (2026-09-30) — Restnutzungsdauer jenseits der Gesamtnutzungsdauer: Hinweis statt Formeländerung

**Entscheidung:** Die Formel der Anlage 2 ImmoWertV bleibt unverändert, auch wenn das Alter die
Gesamtnutzungsdauer übersteigt. Die Eingabeprüfung meldet diesen Fall (bei einem Ergebnis über 70 % der
GND als kritisch) und empfiehlt, die Restnutzungsdauer sachverständig zu prüfen und von Hand einzutragen.

**Begründung:** Die Formel steigt jenseits ihres Scheitels wieder an; die Anlage 2 regelt diesen Bereich nicht
ausdrücklich, und ein reales Gutachten (Referenz ALEX99) wendet sie dort an. Ein Eingriff wäre nicht
nachgewiesen gewesen. Anders beim Gebäudealter: § 4 Abs. 1 ImmoWertV bezieht es eindeutig auf das
Stichtagsjahr — das wurde korrigiert (siehe `tests/fixtures/golden-aenderungen.md`).

---

## D15 (2026-09-30) — Liegenschaftsverwaltung als eigenes Modul mit eigener Datenbank

**Entscheidung:** Die Verwaltung (Kachel „Liegenschaftsverwaltung“) hat einen eigenen Rechenkern ohne DOM
(`js/verwaltung.js`, `ImmoVerwaltung`), eine eigene Oberfläche (`js/verwaltung-ui.js`) und eine eigene
IndexedDB `ia_verwaltung` (ein Dokument je Liegenschaft mit Einheiten, Verträgen, Zahlungen und Mahnungen).
Fachliche Regeln:
- Fälligkeit am dritten Werktag (§ 556b Abs. 1 BGB); der Samstag zählt dabei nicht (BGH VIII ZR 129/09),
  Feiertage nach dem Feiertagsgesetz Baden-Württemberg.
- Sollstellung je Monat, anteilig nur bei Beginn, Ende oder Änderung innerhalb des Monats (Kalendertage).
- Zahlungen zuerst auf den bestimmten Monat, sonst auf die älteste Schuld (§ 366 BGB); Rücklastschriften als
  neue Forderung am Buchungstag, Gutschriften wie Zahlungen.
- Verzugszinsen mit dem jeweils gültigen Basiszins (Tabelle der Bundesbank, je Liegenschaft ergänzbar),
  + 5 Pp. bei Wohnraum, + 9 Pp. bei Gewerbe (§ 288 BGB).
- Kündigungsschwelle (§ 543 Abs. 2 Nr. 3, § 569 Abs. 3 Nr. 1 BGB) und Kaution über drei Nettokaltmieten
  (§ 551 BGB) nur als Hinweis „prüfen“, nie als Rechtsfolge.

**Begründung:** Getrennte Datenbank, damit ein Fehler oder ein voller Speicher in der Verwaltung Bewertungen
und Kundenakte nicht berührt und die Sicherung einzeln möglich ist. Ein Dokument je Liegenschaft hält
Änderungen atomar (eine Transaktion) und die Sicherung einfach; bei den erwarteten Mengen (einige Tausend
Zahlungen je Objekt) ist das schnell genug. Der Rechenkern ist gegen eine unabhängige Python-Rechnung
(`tests/referenz/verwaltung_sollwerte.py`) auf den Cent geprüft.

---

## D16 (2026-09-30) — Betriebs- und Heizkostenabrechnung: Regeln und Vereinfachungen

**Entscheidung:** `js/verwaltung-nk.js` (`ImmoNebenkosten`) rechnet die Abrechnung aus den erfassten Kosten und
gespeicherten Einstellungen jedes Mal neu; erst „Zustellung vermerken und buchen“ schreibt Nachzahlung bzw.
Guthaben ins Mietkonto und passt die Vorauszahlungen an (§ 560 Abs. 4 BGB) — mit vollständiger Rücknahme.
- Kosten mit Leistungszeitraum (z. B. Versicherungsjahr) werden tagesgenau auf den Abrechnungszeitraum
  abgegrenzt; innerhalb des Zeitraums wird nach Nutzungstagen verteilt, Leerstand trägt der Vermieter.
- Umlage nach Personen: leere Einheiten zählen mit einer einstellbaren Personenzahl (Vorgabe 1), damit der
  Leerstand nicht auf die Mieter abgewälzt wird.
- Heizung/Warmwasser: selbst nach HeizkostenV verteilen oder die Beträge des Messdienstes übernehmen. Beim
  eigenen Verteilen gibt es keine Zwischenablesung; bei Mieterwechsel gilt § 9b Abs. 3 (Heizung nach
  Gradtagszahlen oder zeitanteilig, Warmwasser zeitanteilig) — mit Hinweis in der Abrechnung.
- CO2-Kosten: Einstufung nach der Anlage zum CO2KostAufG (Nichtwohngebäude 50 %), Anteil je Mieter wie seine
  Heiz- und Warmwasserkosten.
- Vorauszahlungen: vereinbarte (Soll) als Vorgabe, Rückstände bleiben im Mietkonto; wahlweise tatsächlich
  gezahlte (Ist).
- Rundung auf Cent je Mieter und Position; die Rundungsdifferenz wird in der Kontrolle ausgewiesen.

**Begründung:** Die Rechnung bleibt nachvollziehbar und jederzeit korrigierbar, solange nicht gebucht ist; die
Buchung ist der bewusste Schritt „Abrechnung ist raus“. Die Vereinfachungen (keine Zwischenablesung, fiktive
Person bei Leerstand) sind in der Abrechnung sichtbar und bei Messdienst-Abrechnungen nicht nötig. Der Kern
ist gegen eine unabhängige Python-Rechnung (Tag-für-Tag-Belegung, exakte Brüche) auf den Cent geprüft.

---

## D17 (2026-09-30) — Instandhaltung und Prüfpflichten: Katalog als Richtwert, Kosten aus Vorgängen

**Entscheidung:** `js/verwaltung-ih.js` (`ImmoInstandhaltung`) führt Vorgänge (gemeldet → beauftragt → in Arbeit →
erledigt → abgerechnet) mit Verlauf, Fotos und Dienstleister sowie Pflichten mit Turnus und letzter Erledigung.
- Der Pflichtenkatalog nennt je Eintrag Rechtsgrundlage, „Pflicht“ oder „Empfehlung“ und den üblichen Turnus
  (u. a. LBO BW § 15 Abs. 7 Rauchwarnmelder, § 31 TrinkwV Legionellen, BetrSichV Aufzug, SchfHwG, AwSV, GEG).
  Er wird nicht automatisch angewendet — der Nutzer übernimmt, was für die Liegenschaft zutrifft.
- Pflichten ohne eingetragene letzte Erledigung erscheinen sofort als Frist („letzte Erledigung eintragen“).
- Abgerechnete Vorgänge erscheinen automatisch in den Kosten der Liegenschaft (Instandhaltung nicht umlagefähig,
  Wartung wahlweise als vereinbarte Betriebskostenart), mit Arbeitskosten nach § 35a Abs. 3 EStG; beim
  Zurücksetzen oder Löschen des Vorgangs verschwinden sie wieder.
- Dienstleister gelten für alle Liegenschaften; Fotos liegen als Anhänge in der Datenbank der Verwaltung.

**Begründung:** Prüfpflichten hängen von Anlage, Größe, Nutzung und Bescheiden ab (z. B. Legionellen nur bei
Großanlagen, Heizöltank nach Größe und Schutzgebiet); ein automatisch angelegter Katalog würde falsche Fristen
erzeugen. Die Verknüpfung Vorgang → Kosten vermeidet doppelte Erfassung und hält die Nebenkostenabrechnung
und die Eigentümerauswertung konsistent.

---

## D18 (2026-09-30) — WEG-Verwaltung: Hausgeld über dieselbe Kontoführung, Stimmrecht nach Gesetz

**Entscheidung:** `js/verwaltung-weg.js` (`ImmoWeg`) mit Reiter „WEG“ (nur bei Liegenschaften der Art WEG):
- Eigentümer je Einheit mit „seit“-Datum; Miteigentümer tragen dasselbe Datum, ein späterer Eintrag ist ein
  Eigentümerwechsel. Einzelwirtschaftsplan und Abstimmung nehmen den Eigentümer zum jeweiligen Tag.
- Hausgeld aus dem beschlossenen Wirtschaftsplan (Fortgeltung nur mit Beschluss), fällig am 3. Werktag,
  Sonderumlagen und gebuchte Abrechnungsspitzen — alles über dieselbe Kontoführung wie das Mietkonto
  (`ImmoVerwaltung.kontoFuehren`: § 366 BGB, Verzugszinsen).
- Jahresabrechnung: Kostenanteil nach MEA oder abweichendem Schlüssel, Heizkosten je Einheit laut Messdienst,
  Kosten aus der Erhaltungsrücklage nicht umgelegt; Abrechnungsspitze = Kostenanteil + Soll-Zuführung −
  Soll-Vorschüsse (§ 28 Abs. 2 WEG); Vermögensbericht (§ 28 Abs. 4 WEG).
- Abstimmung: Kopfprinzip als gesetzliche Regel (§ 25 Abs. 2 WEG), Wert- oder Objektprinzip wählbar;
  Enthaltungen zählen nicht; widersprüchliche Stimmen desselben Eigentümers werden nicht gewertet;
  bauliche Veränderung nach § 21 Abs. 2 Nr. 1 WEG. Einladungsfrist drei Wochen (§ 24 Abs. 4 WEG).
- Beschluss-Sammlung fortlaufend nummeriert mit Vermerken (§ 24 Abs. 7 WEG).

**Begründung:** Eine gemeinsame Kontoführung vermeidet zwei unterschiedliche Zuordnungsregeln für Miete und
Hausgeld. Der Kern ist gegen eine unabhängige Python-Rechnung geprüft (Einzelpläne, Jahresabrechnung,
Rücklage, Rückstände, fünf Abstimmungen einschließlich Kopfprinzip mit mehreren Einheiten und Widerspruch).

---

## D19 (2026-09-30) — Übernahme aus dem Fork maxschlecht2000-code/preisermittlung (ohne iOS-App)

**Entscheidung:** Aus dem Fork von Henry (github.com/maxschlecht2000-code/preisermittlung) übernommen, nach
Durchsicht des Codes (keine fremden Netzwerkziele, nur synthetische Testdaten) und Prüfung der Rechtsgrundlagen:
- **Beleihungswert nach BelWertV** (`js/modell.js`): Ertragswert als regulärer Ausgangswert, Sachwert als
  Kontrolle (§ 4); mindestens 15 % Bewirtschaftungskosten mit den Einzelansätzen der Anlage 1 (§ 11);
  Mindest-Kapitalisierungszins je Nutzungsart mit Aufschlägen der Anlage 3 (§ 12); Sicherheitsabschlag
  mindestens 10 %, Außenanlagen und Baunebenkosten begrenzt (§ 16). Fehlende Grundlagen bleiben „Entwurf“.
- **Rechenfehler:** Barwertfaktor mit `expm1`/`log1p` (stabil bei Zinsen nahe 0); `restNach(0)` ist die
  Darlehenssumme zu Beginn statt der Restschuld am Planende.
- **PV und energetischer Zustand nicht doppelt:** Ist der Vorteil/Nachteil bereits im Grundwert enthalten,
  wird er nicht nochmals addiert/abgezogen; Energiekosten-Barwerte nur als getrenntes Szenario.
- **Quellenpflicht:** Gewichtung, Sachwertfaktor, Liegenschaftszins, Miete, Bewirtschaftung, PV, Energetik
  und Rechte brauchen eine dokumentierte Quelle; fehlende Angaben ändern den sichtbaren Prüfstatus.
- **Umbau in Module:** Oberfläche aus `index.html` in `src/*.js` (28 Module, `src/init.js` zuletzt), Styles in
  `assets/`, Schriften IBM Plex lokal (OFL), App-Navigation Übersicht/Objekte/Markt/Mehr.
- **Service Worker aus dem Inhalt:** `npm run build` erzeugt `sw.js` mit Inhalts-Hash als Version und
  vollständiger Dateiliste; GitHub Actions prüft, dass `sw.js` zum Inhalt passt (ROADMAP #41).

**Nicht übernommen:** die native iOS-App (Capacitor, Xcode-Projekt, native Brücke, iOS-Workflow) — Wunsch des
Auftraggebers; die App bleibt eine reine PWA ohne App-Store und ohne Backend. Ebenfalls nicht übernommen:
Überarbeitungen von README, AUDIT, SUMMARY, DECISIONS und ANLEITUNG, die iOS-Inhalte an die Stelle der
bisherigen Dokumentation gesetzt hätten. Die Regel „keine Lebenserwartung aus dem Alter“ des Forks ist durch
D20 ersetzt.

**Anpassungen bei der Übernahme:** Liegenschaftsverwaltung (D15–D18) in die neue Navigation eingehängt (Kachel,
„Mehr“-Menü, Fristen-Hinweis); Build-Hash mit einheitlichen Zeilenenden (Windows und Linux ergeben dieselbe
Version); der Service Worker lädt beim Installieren am HTTP-Cache vorbei (`cache: 'reload'`), sonst konnte
GitHub Pages bis zu zehn Minuten alte Dateien in eine neue Version mischen.

---

## D20 (2026-09-30) — Nießbrauch, Wohnungsrecht, Leibrente: amtliche Sterbetafel oder eigene Laufzeit

**Entscheidung:** Auswahl „Laufzeit des Rechts“:
- **Amtliche Sterbetafel (lebenslang)** — Standard. Fernere Lebenserwartung und Leibrentenbarwertfaktor aus der
  Periodensterbetafel für Deutschland des Statistischen Bundesamts (derzeit 2023/2025, `js/sterbetafel.js`),
  nach Alter (vollendete Jahre) und Geschlecht. Faktor monatlich vorschüssig:
  ä(12)x ≈ ax + 13/24 mit ax = Σ v^t · l(x+t)/l(x) (Woolhouse); über 100 Jahre mit der
  Überlebenswahrscheinlichkeit des Alters 100 fortgesetzt.
- **Eigene Laufzeit in Jahren** — für befristete Rechte oder eine belegte abweichende Laufzeit; Zeitrente
  (Barwertfaktor). Dann ist eine Quelle Pflicht.
- Ein eingetragener Kapitalisierungsfaktor hat immer Vorrang (Quelle Pflicht).
- Ältere Bewertungen mit eingetragener Laufzeit werden beim Laden auf „Eigene Laufzeit“ gestellt und rechnen
  unverändert.

**Aktualisierung:** `scripts/sterbetafel.py` sucht auf destatis.de die neueste Ausgabe des Statistischen
Berichts „Sterbetafeln“, prüft sie (lx fallend ab 100.000, ex plausibel, Frauen > Männer) und ersetzt die
Tafel nur bei neuerem Zeitraum. Die GitHub-Action „Sterbetafel“ läuft monatlich, baut den Service Worker neu,
führt alle Tests aus und übernimmt die neue Tafel nur bei grünen Tests. Datenlizenz Deutschland –
Namensnennung – Version 2.0; die Quelle steht im Bericht.

**Begründung:** Die Periodensterbetafel ist die übliche amtliche Grundlage für Leibrenten- und
Nießbrauchsbarwerte in der Verkehrswertermittlung; eine selbst geschätzte Lebenserwartung (wie in der früheren
Näherung) ist nicht belegbar, eine Pflicht zur freien Eingabe (wie im Fork) für lebenslange Rechte unnötig
aufwendig. Die Sterbetafel des Statistischen Bundesamts ist kein Kapitalisierungszins: der Zins bleibt eine
eigene, belegte Eingabe (i. d. R. der Liegenschaftszins). Der Kern ist gegen eine unabhängige Rechnung mit
Kommutationszahlen in Python geprüft (64 Fälle, Abweichung < 1e-9). Die Sollwerte der Tests werden aus der
jeweils geladenen Tafel berechnet, damit eine neue Ausgabe die Tests nicht bricht.

---

## D21 (2026-09-30) — Liegenschaftsverwaltung Stufe 5: Miete sichtbar, Mieterhöhung, Kontoauszug, Jahresbericht, Dokumente

**Miete sichtbar (Rückmeldung des Auftraggebers):** Die Miete stand bisher nur im Vertrag. Jetzt: Mietaufstellung im
Überblick jeder Liegenschaft, Miete und €/m² in der Einheitenliste, „Vermieten“ für leere Einheiten und beim Anlegen
einer Liegenschaft optional gleich Einheit, Mieter und Miete (nur vollständig: Mieter, Beginn, Kaltmiete).

**Mieterhöhung (`js/verwaltung-mh.js`):** Wortlaut §§ 557a, 557b, 558, 558a, 558b, 559, 559a, 559b, 559c, 559e BGB
geprüft (gesetze-im-internet.de, 30.09.2026). Auslegungen: Jahressperrfrist auch ab Mietbeginn; bei zu frühem
Wirksamwerden (15 Monate) verschiebt sich der Termin; Ausgangsmiete der Kappungsgrenze ist die Miete drei Jahre vor
dem Wirksamwerden, Modernisierungserhöhungen in diesem Zeitraum kommen hinzu; Indexanpassung auf die Miete der
letzten Anpassung, spätere Modernisierungserhöhungen bleiben als fester Betrag. Kappungsgrenze 15 % für die 130
Gemeinden der KappVO BW vom 16.12.2025 (GBl. 2025 Nr. 145, gültig 01.01.–31.12.2026; im Gesetzblatt geprüft,
Heilbronn ja, Ilsfeld/Beilstein/Abstatt nein); außerhalb BW oder nach Ablauf über das Häkchen in den Stammdaten.
Eintragen erst nach Zustimmung (§ 558) bzw. Zugang (§§ 557b, 559).

**Kontoauszug (`js/verwaltung-bank.js`):** CAMT (ISO 20022, eigener kleiner XML-Leser, damit er auch in Node testbar
ist) und CSV mit Spaltenerkennung. Nur gebuchte Umsätze; Sammelbuchungen einzeln. Vorschläge nur, wenn eindeutig
(Punkte aus IBAN früherer Buchungen, Name, Einheit, Betrag); gebucht wird nur, was bestätigt ist. Kennung gegen
Doppelbuchungen; die IBAN des Zahlers wird an der Zahlung gespeichert, um sie wiederzuerkennen.

**Kontoführung korrigiert:** Eine Zahlung wird nicht mehr auf eine Rücklastschrift angerechnet, die erst nach ihr
entsteht (Randfall Rückbuchung nach Vorauszahlung). Vergleichsrechnung angepasst; bisherige Sollwerte unverändert.

**Jahresbericht (`js/verwaltung-bericht.js`):** Zuflussprinzip mit Zehn-Tage-Regel (§ 11 Abs. 1 Satz 2 EStG; Fälligkeit
im Zeitraum nach BFH X R 44/16), Zuordnung über die Kontoführung; Aufteilung im Verhältnis der Sollmiete; Ausgaben
nach Datum. Anlage V ohne Zeilennummern (ändern sich jährlich); AfA und Zinsen ergänzt der Eigentümer.

**Dokumente (`js/verwaltung-dok.js`):** Dateien als Anhang in der Verwaltungsdatenbank (nur lokal, in der Sicherung,
unverschlüsselt), bis 25 MB je Datei, Speicherprüfung vorher. Löschen einer Liegenschaft löscht jetzt auch ihre
Anhänge (vorher blieben Fotos der Instandhaltung zurück — Datenschutz).

**Begründung:** Alles offline und ohne Dienst Dritter; Kern jeweils gegen eine unabhängige Python-Rechnung geprüft
(15 Mieterhöhungsfälle, 5 Jahresberichte) bzw. gegen Beispieldateien (CAMT, drei CSV-Formate).

---

## D22 (2026-09-30) — Bewertung wieder als durchgehende Liste, auf- und zuklappbar

**Rückmeldung des Auftraggebers:** Die Aufteilung aus dem Fork (Objektübersicht, vier Schritte, jeweils nur ein
Abschnitt sichtbar) gefiel weniger als die frühere Darstellung, in der alle Abschnitte untereinander standen.

**Entscheidung:** In einer Bewertung stehen wieder alle Abschnitte untereinander mit Nummer (① … ⑬), links die
Abschnittsliste mit Status, rechts das Ergebnis (am Handy: Leiste oben, Ergebniskarte über der Liste). Neu: jeder
Abschnitt und jeder Block (Unterüberschrift, z. B. „4.4 Lage“) ist auf- und zuklappbar; der Zustand wird je Gerät im
Browserspeicher gemerkt (nur eine Anzeigeeinstellung, keine Daten). Die Hauptnavigation des Forks (Übersicht,
Objekte, Markt, Mehr) bleibt. Formularfelder, Rechenkern und Berichte sind unverändert — der Abgleich aller
Referenzbewertungen (golden.json) ist unverändert grün.

**Nachtrag (2026-09-30):** Die festen Nummern aus früheren Erweiterungen (⑦, ⑦c, ⑦d, ⑦b, ⑦e … bzw. Lücken bei der
Wohnung) passten nicht zur Reihenfolge. Jetzt fortlaufend 1 … N in der angezeigten Reihenfolge, Blöcke N.1 … (neu
berechnet, wenn Abschnitte je nach Vordruck ein- oder ausgeblendet werden); Verweise in Texten nennen den Abschnitt
beim Namen statt mit Nummer. Fehler behoben: Der Titel „Preisansatz nach Vergleichswert“ wurde bei jeder Berechnung
neu geschrieben und verlor dabei Pfeil und Nummer — der Abschnitt ließ sich nicht mehr zuklappen.

---

## D23 (2026-10-01) — Bewertungen je Liegenschaft, amtlicher Baupreisindex BW, Eigennutzung

**Anlass:** Die Liegenschaften der Bank werden jährlich zum 31.12. rechnerisch bewertet (Excel-Vordrucke, Substanz-
und Ertragsansatz im Mittel). Gewünscht: die Bewertungen bei den Liegenschaften führen und daraus den nächsten
Stichtag mit aktuellem Baupreisindex erstellen.

**Entscheidung:**
- Baupreisindex: Die Quartalswerte des Statistischen Landesamts BW (Statistischer Bericht M I 4 – vj 2/26, Basis
  2021 = 100, Wohn-, Büro- und gewerbliche Betriebsgebäude, ab 2016) liegen in `js/baupreisindex.js`. Maßgeblich ist
  das letzte Quartal, dessen Berichtsmonat nicht nach dem Stichtag liegt; danach „vorläufig“. Umrechnung auf NHK 2010
  = 100 / Jahresdurchschnitt 2010 (1,4164 / 1,4472 / 1,4368 — dieselben Faktoren wie in den Vordrucken der Bank).
  Der Test prüft die Abschrift (Jahresdurchschnitt = Mittel der Quartale). Die Rechnung selbst ist unverändert
  (Index × Faktor wie bisher), es wird nur der Wert vorgeschlagen.
- Bewertungen je Liegenschaft (`l.bewertungen`): Stichtag, Art, Stand (abgeschlossen/Entwurf), Bodenwert, Substanz,
  Ertrag, Ergebnis, Baupreisindex, Quelle, Notiz, optional verknüpfte Bewertung der Preisermittlung. Ergebnisse
  verknüpfter Bewertungen rechnet der Rechenkern aus den gespeicherten Feldern; der PV-Barwert steht wie in den
  Vordrucken der Bank in Substanz und Ertrag. Fortschreibung = Kopie als Entwurf mit neuem Stichtag, amtlichem Index,
  um die vergangenen Jahre verringerter angepasster Restnutzungsdauer und PV-Laufzeit; alles Übrige bleibt und ist zu
  prüfen.
- Einheiten in Eigennutzung (`eigennutzung`) zählen weder als Leerstand noch als entgangene Miete (auch in der
  Python-Gegenrechnung); ohne Markierung bleibt alles wie bisher.

**Datenschutz:** Echte Bewertungen der Bank gehören nicht ins öffentliche Repository. Sie werden über die üblichen
Sicherungsdateien (Projekte, Verwaltung) auf dem Gerät eingespielt; Tests verwenden nur synthetische Werte.

---

## D24 (2026-10-01) — Jahresbewertung als eigener Bereich, Vordruck der Bank änderbar

**Wunsch des Auftraggebers:** Die Bewertungen 2023 und 2024 der Liegenschaften der Bank unter einem eigenen Punkt
einpflegen, so dass die Angaben noch geändert werden können.

**Entscheidung:** Neuer Bereich „Jahresbewertung“ (Ansicht der Liegenschaftsverwaltung, Kachel und Mehr-Menü). Je
Objekt und Stichtag ein Vordruck (`l.bewertungen[].vordruck`) mit allen Eingaben des Excel-Vordrucks; Rechnung in
`js/jahresbewertung.js` exakt nach dem Excel-Rechenweg einschließlich seiner Rundungen (nicht nach dem Rechenkern
der Preisermittlung, der ohne diese Rundungen und mit einer gemeinsamen RND rechnet). Abgleich: alle 13 Excel-Dateien
der Bank auf den Cent (lokal geprüft, Daten nicht im Repository; der Summenfehler einer Datei wird richtig gerechnet).
Im Repository prüft eine unabhängige Python-Rechnung (Dezimalarithmetik) vier synthetische Fälle.
Ergebnisse des Vordrucks werden beim Speichern in die Felder der Bewertung übernommen (Verlauf, Fristen, Rendite).

**Datenschutz:** Die echten Vordrucke kommen über eine Sicherungsdatei der Verwaltung auf das Gerät; Mieter- und
Mitarbeiternamen aus den Excel-Dateien werden nicht übernommen.

---

## D25 (2026-10-01) — Vordruck anlegen mit Vorlagen; Formularfehler sichtbar

**Anlass:** Rückmeldung des Auftraggebers: Liegenschaft anlegen „funktioniert nicht“, „Vordruck anlegen“ führt zu nichts,
die Bewertungen 2023/2024 sind nicht zu sehen.

**Befund:** (1) Die Fehlermeldung eines Formulars wurde mit `scrollIntoView({block:'nearest'})` an den oberen Rand
gescrollt und lag damit unter der festen Kopfzeile und den Reitern — am PC wie am iPhone; „Speichern“ wirkte, als
passiere nichts (z. B. ohne Bezeichnung). (2) „Vordruck anlegen“ verlangte eine schon angelegte Liegenschaft; ohne
Liegenschaft blieb nur eine Meldung. (3) Die Bewertungen kommen nur über die Sicherungsdatei auf das Gerät (echte Daten
nicht im Repository); der Weg dorthin war in der Jahresbewertung nicht zu sehen.

**Entscheidung:** Fehler werden oben und über den Knöpfen gezeigt, das erste rot markierte Feld wird unterhalb von
Kopfzeile und Reitern in den sichtbaren Bereich geholt. Ohne Bezeichnung gilt die Anschrift. „Vordruck anlegen“ bietet
Vorlagen wie „Neue Bewertung“ und legt bei Bedarf die Liegenschaft mit an (erst beim Speichern des Vordrucks, als
„Objekt der Bank“). Vorlagen in `js/jahresbewertung.js` (`VORLAGEN`, `vorlage()`): Aufbau, Kostenkennwerte, GND,
Bewirtschaftung und Zins wie in den Excel-Vordrucken der Bank (NHK 2010 Stufen 3–5 amtlich), amtlicher Baupreisindex
zum Stichtag; alle Werte änderbar. „Sicherung einspielen“ steht direkt in der Jahresbewertung und auf der leeren Übersicht.

---

## D26 (2026-10-01) — Vordruck der Jahresbewertung im Aufbau der Excel-Mappe, mit Dokument

**Anlass:** Rückmeldung des Auftraggebers: Der Vordruck in der App stimmt nicht mit den Excel-Preiseinschätzungen überein;
die Bewertung der Liegenschaften soll nach diesem Beispiel als Vordruck in der App folgen.

**Befund (alle 13 Mappen, als Seiten gerendert und Zelle für Zelle gelesen):** Die Mappe ist ein Dokument — Deckblatt,
1. Objektdaten (1.1 Allgemein, 1.2 Grundstück, 1.3 Gebäude bzw. Bebauung, Aufstellung der Mieterträge mit Bemerkung),
2. Bodenrichtwert (Erläuterung, 2.1 Grundstücksmerkmale, Karte und BORIS-Auszug), 3. Bautechnische Daten (3.1–3.4),
4. PV-Anlage (nur wenn vorhanden), Preisansatz Grund und Boden, Bausubstanz (RND und Wertminderung, Gebäudepreis,
Grund und Boden, Gebäude und Außenanlagen, Summe), Mietertrag (RND, Daten, Preisansatz je Gebäude, Summe),
Zusammenfassung / Sonstiges (Überblick, Hinweise, Ort und Datum). Die Nummern verschieben sich ohne PV-Kapitel; ohne
Gebäude folgt auf den Grund und Boden gleich die Zusammenfassung. Die App kannte nur die Zahlen, in eigener Gliederung.

**Entscheidung:** Vordruck und Dokument folgen der Mappe: gleiche Kapitel, Nummern (`kapitel()`), Beschriftungen und
Zwischenzeilen (`modell()`, aus derselben Rechnung wie bisher — die Ergebnisse aller 13 Mappen stimmen weiter auf den
Cent). Neue Angaben im Vordruck: Deckblatt, Objektdaten mit frei benennbaren Merkmalszeilen, Bodenrichtwert-Merkmale,
Bautechnik 3.1–3.4, Erläuterungstexte, Ort, Bemerkung je Mietzeile, „gewerblich“ (Anteil gewerbliche Kaltmiete),
Bemerkung zum Gewerbeabschlag, PV-Nutzungsgrad, Bilder der Bodenrichtwertkarte (Anhänge der Liegenschaft). Das
Dokument steht im Bericht (#report) mit Drucken, PDF, Word und Teilen. Bei zwei Gebäuden ist die Nummerierung durchgehend
(die Mappe vergibt dort 5.2 doppelt).

**Texte:** Die Erläuterungstexte im Repository sind eigene Formulierungen; die Texte der Bank kommen mit der
Sicherungsdatei auf das Gerät, und neue Vordrucke übernehmen die Texte des zuletzt bearbeiteten Vordrucks. Kein Logo,
kein Foto des Ansprechpartners — der Ansprechpartner auf dem Deckblatt kommt aus „Absender“.

---

## D27 (2026-10-01) — Bereich „Liegenschaften“; Liegenschaftsverwaltung entfernt; Update auf Tipp

**Wunsch des Auftraggebers:** Den Bereich nicht „Jahresbewertung“ nennen, sondern „Liegenschaften“; die
Liegenschaftsverwaltung ganz aus der App entfernen. Außerdem: Am Schluss kam als Ergebnis 0 heraus, und der Vordruck
folgte nicht der Reihenfolge der Excel-Mappe.

**Entscheidung:**
- Die Liegenschaftsverwaltung (Mietverwaltung, Nebenkosten, Instandhaltung, WEG, Mieterhöhung, Kontoauszug, Berichte,
  Dokumente, Fristen, Dienstleister; D15–D18, D21) ist entfernt — Module, Tests und Vergleichsrechnungen. Geblieben
  ist ein eigener, kleiner Bereich „Liegenschaften“: Liegenschaften mit ihren Preiseinschätzungen je Stichtag
  (Vordruck, D24–D26), Ansprechpartner fürs Deckblatt, Datensicherung. Kern `js/liegenschaften.js`, Fenster
  `js/liegenschaften-ui.js`.
- **Daten bleiben erhalten:** Speicher ist weiter die Datenbank `ia_verwaltung`; Angaben früherer Fassungen (Einheiten,
  Verträge …) bleiben beim Bereinigen unverändert im Dokument stehen, werden aber nicht mehr angezeigt. Sicherungen der
  früheren Verwaltung lassen sich einspielen.
- **Ergebnis 0:** nachgestellt — wer den Bodenrichtwert wie in der Mappe unter 2.1 „Richtwert“ einträgt, ließ den
  „Preisansatz“ leer (Bodenwert 0); der „Leere Vordruck“ hatte weder NHK noch Baupreisindex noch Mietzeilen (alles 0).
  Jetzt übernimmt der Preisansatz den Richtwert, solange er nicht abweichend eingetragen ist; die leere Vorlage ist
  entfallen; unter dem Ergebnis steht „Noch offen: …“ mit der Ziffer im Vordruck.
- **Reihenfolge:** Die NHK-Tabelle steht wie im Blatt „Preis m² BGF“ vor 6.1.
- **Updates:** Eine neue Version wartete bisher, bis alle Fenster geschlossen waren — am iPhone sind Home-Bildschirm-Apps
  selten ganz geschlossen, Änderungen kamen daher nicht an. Jetzt erscheint „Neue Version — Jetzt aktualisieren“; ein
  Tipp übernimmt die wartende Fassung (skipWaiting) und lädt neu. Beim Zurückkehren in die App wird nach Updates gesucht.

---

## D28 (2026-10-01) — Jede Zahl im Vordruck änderbar (wie eine Excel-Zelle)

**Wunsch des Auftraggebers:** Alles, was eine Zahl ist, muss sich bearbeiten lassen; es darf keine Felder geben, deren
Zahlen man nicht ändern kann. Dazu der Hinweis, die Reihenfolge der Excel-Mappe genau einzuhalten und „Ergebnis 0“ zu prüfen.

**Befund:** Der Bodenrichtwert stand in 1.2 nur als Anzeige — wer der Mappe folgend dort eintragen wollte, konnte es
nicht, und der Bodenwert blieb 0. Ebenso waren Baujahr, Restnutzungsdauer und Sätze in 6.1/7.1–7.3 nur Anzeige, alle
gerechneten Zwischenwerte (Alter, Wertminderung, NHK, Index, Gebäudepreis, Vervielfältiger, Summen, Ergebnis) ebenfalls.

**Entscheidung:** Jede Zahl ist ein Eingabefeld. Eingaben, die an mehreren Stellen stehen, sind dieselbe Angabe. Jede
gerechnete Zahl hat einen Schlüssel in `v.manuell`; der Rechenkern (`rechnen`) nimmt an jeder Zwischenstufe den
eingetragenen Wert, die folgenden Zeilen rechnen damit weiter — wie eine überschriebene Formelzelle in Excel. Ohne
Einträge bleibt die Rechnung unverändert (alle 13 Mappen weiter auf den Cent). Überschriebene Felder sind gelb, „↺“
setzt zurück. Die Wägungsanteile der NHK-Tabelle sind je Gebäude änderbar. Der frühere „feste Abschlag“ wird zum
eingetragenen Wert in der Zeile „- Abschlag für gewerbliche Vermietung“ (wie Zelle C33 der Mappe). Fortschreiben und
Kopie übernehmen eingetragene Werte wie eine kopierte Excel-Datei und listen sie zum Prüfen auf. Einheiten in der Eingabe
(€/m², Jahre, kWh, kWp) werden überlesen.

---

## D29 (2026-10-01) — Historischer Vergleich zweier Stichtage

**Wunsch des Auftraggebers:** Ein „Historischer Vergleich“ nach seiner Vorlage (Kennzahlen zweier Stichtage, Veränderung
grün/rot, Bausubstanz und Mittelwert hervorgehoben). Eckdaten wie Gebäudegröße dürfen genannt werden; keine Namen, keine
Angabe, woher eine Miete stammt, keine genaue Anschrift — und die Felder müssen bearbeitbar bleiben.

**Entscheidung:** Kein fest eingebauter Datensatz einer echten Liegenschaft (die Vorlage sah eine Datei mit Anschrift
und Werten vor), sondern ein allgemeiner Vergleich je Liegenschaft aus den eigenen Vordrucken — die echten Zahlen
kommen nur aus der Sicherungsdatei auf dem Gerät; im Repository stehen weiter nur synthetische Testdaten. Gezeigt werden
Eckdaten (Fläche, Bodenrichtwert, Abschlag, BGF, Baujahr, Restnutzungsdauer, Baupreisindex, Gebäudepreis je m²,
Monatsmiete als Summe, bei mehreren Gebäuden je Gebäude) und Preisansätze mit Veränderung in € und %. Der
Baupreisindex steht auf Basis 2010 (Index × Faktor wie im Vordruck), weil die Vordrucke verschiedene Basisjahre nutzen
(2015 bzw. 2021) — sonst sähe ein Basiswechsel wie ein Rückgang aus. Jede Zahl ist ein Feld; eine Änderung geht in den
Vordruck des Stichtags (Eingabe bzw. eingetragener Wert wie in D28) und wird erst mit „Speichern“ übernommen — so gibt
es keine zweite, abweichende Zahl neben dem Vordruck. Die Monatsmiete je Gebäude geht als Jahresrohertrag des Gebäudes
(× 12) in den Vordruck. Ein kurzer Hinweistext nennt nur die Zahlen (keine Begründungen). Anzeige und Dokument nennen
Objektart und Ort, aber weder Straße noch Hausnummer, Namen oder Mietzeilen.

---

## D30 (2026-10-01) — Neue Bewertung: nur die Objektart wählen

**Wunsch des Auftraggebers:** Am Anfang nur grob nach Objektart unterteilen (Eigentumswohnung, Wohnhaus, Gewerbe,
Büro …); die zweite Unterteilung (Wohnhaus mit PV, mit Anbau und Nießbrauch, ETW mit Nießbrauch …) ist unnötig, weil
das in der Bewertung ohnehin enthalten ist.

**Entscheidung:** Der Startbildschirm hat nur noch eine Stufe mit vier Kacheln, die direkt die Bewertung öffnen:
Eigentumswohnung (Vergleichs- + Ertragswert), Wohnhaus (Substanz + Ertrag), Laden / Büro / Praxis (Geschäftshaus) und
Gewerbe / Betrieb (Betriebs- und Werkstattgebäude) — die beiden früheren Gewerbe-Vordrucke unterscheiden sich in
Gebäudeart und NHK und sind deshalb eigene Objektarten. Die früheren Untervarianten setzten nur Schalter (PV-Anlage,
Anbau, Nießbrauch) und in einem Fall die Gewichtung 40 : 60; diese Schalter stehen in den Abschnitten der Bewertung,
die Gewichtung in der Preisempfehlung. Rechnung, Felder und gespeicherte Bewertungen bleiben unverändert (ältere
Bewertungen behalten ihre Vordruck-Bezeichnung).

---

## D31 (2026-10-02) — Klicktest der ganzen App, Befunde behoben

**Wunsch des Auftraggebers:** Die ganze App auf ihre Funktion testen — jeder Knopf, jedes Auf- und Zuklappen, jedes
Eingabefeld —, ohne dabei an der Rechnung etwas zu ändern; danach die Befunde beheben.

**Vorgehen:** Ein Prüfprogramm (außerhalb des Repositorys) öffnete am PC (Chromium) und in der iPhone-Ansicht (WebKit)
38 Bereiche mit Musterdaten, klappte jeden Abschnitt und Block auf und zu, füllte jedes Feld bzw. stellte jeden
Schalter und jede Auswahl um und las den Wert zurück, klickte jeden Knopf und Link und prüfte, ob etwas passiert
(Ansicht, Inhalt, Feldwerte, Meldung, Download, Druck, Teilen) und kein Skriptfehler auftritt — rund 3.900 Elemente am
PC, 2.400 in der iPhone-Ansicht. Gegenproben: Klick ins Leere zählt als „ohne Wirkung“, App-Sperre mit simuliertem Face ID, Grundriss mit echtem
Plan-Code, Foto, Selbsttest. Keine Skriptfehler, alle Downloads vollständig, falsche Dateien sauber abgewiesen.

**Befunde und Korrektur:**
- iPhone: Die unteren sechs Einträge des Export-Menüs lagen hinter der unteren Leiste bzw. unterhalb des Bildschirms
  (die Kopfzeile scrollt nicht mit). Das Menü endet jetzt über der Leiste und hat einen eigenen Bildlauf.
- Effizienzklasse: Bei eingetragenem Energiekennwert ersetzte die Neuberechnung beim ersten Auswählen die Klasse von
  Hand durch die errechnete (das „input“-Ereignis kam vor „change“). Die Auswahl gilt jetzt schon beim „input“.
- iPhone: Kopfzeilen-Knöpfe in Finanzierung, Marktüberblick und Liegenschaften zeigten nur ein Symbol (↓ sah wie
  „Herunterladen“ aus, meint aber „Aus Bewertung“) und hatten keinen Namen für die Sprachausgabe — jetzt Symbol mit
  kurzer Beschriftung darunter, wie die untere Leiste.
- Sanierungsweg: „Aus Aufnahmebogen und Energetischer Qualität übernehmen“ meldet jetzt, wenn nichts einzutragen ist.
- Dateinamen ohne Anschrift: „Preisermittlung.pdf/.docx/.xlsx“ statt „Preisermittlung Preisermittlung“.
- Tabellen: Handzeiger nur noch, wo ein Klick etwas tut (Sortieren, Objekt öffnen) — nicht im Tilgungsplan und nicht
  in den Tabellen der Liegenschaften.

Kein Befund: Knöpfe „ohne Wirkung“ waren aktive Reiter, bereits offene Ansichten, leere Eingaben (dann springt der
Cursor ins Feld) und Tabellenzeilen; „NaN Tage“ trat nur in der Testumgebung auf (WebKit unter Windows kennt keine
Datumsfelder, das iPhone zeigt immer den Datumswähler). Rechnung unverändert.

---

## D32 (2026-10-02) — Klicktest dauerhaft; neue Bewertung aus der Kundenakte; Verlauf der Liegenschaften

**Wunsch des Auftraggebers:** Vorschläge 4 und 7 umsetzen — den Klicktest dauerhaft einbauen, eine Bewertung direkt aus
der Kundenakte beginnen, den Verlauf der Liegenschaften als Diagramm zeigen (und den Mietertrag je Gebäude rechnen, D33).

**Klicktest:** `tests/klick/klicktest.mjs` (aus dem Prüfprogramm von D31) startet einen eigenen Testserver, arbeitet nur
mit Musterdaten und ruft keine fremden Seiten auf. Rot werden Skriptfehler, Felder oder Klappbereiche ohne Funktion,
verdeckte Knöpfe und NaN schon mit dem Musterfall. Knöpfe „ohne Wirkung“ sind oft richtig (aktiver Reiter, schon offene
Ansicht, leere Eingabe) — sie werden mit einer festgehaltenen Liste verglichen, neue melden sich als Warnung statt den
Lauf rot zu machen. Er dauert rund eine Stunde je Gerät, deshalb ein eigener GitHub-Ablauf (bei Änderungen und
wöchentlich), nicht Teil von `npm test`. Die Sonderabläufe (App-Sperre mit virtuellem Authenticator, Grundriss,
Fotos, Präsentation, Übernahme-Knöpfe, Vergleichssuche) laufen als schneller Browsertest in der normalen Testreihe.

**Neue Bewertung aus der Kundenakte:** Knopf in der Akte → dieselbe Objektart-Wahl wie „Neue Bewertung“ mit dem Hinweis,
für wen → leeres Formular, Kunde zugeordnet und als Auftraggeber eingetragen. Eine angefangene Bewertung (eigene
Eingaben, Fotos, Grundrisse — Auswahlfelder und Vorgaben der Objektart zählen nicht) wird nach Rückfrage als Projekt
gesichert; ohne Name und Anschrift unter „Wertermittlung <Datum Uhrzeit>“, damit kein anderes Projekt überschrieben
wird. Das leere Formular entsteht wie bei „Neue leere Bewertung“ über einen Neustart; Objektart und Kunde werden danach
übernommen. „Neue Bewertung“ auf der Startseite bleibt unverändert.

**Verlauf der Liegenschaften:** Diagramm im historischen Vergleich über alle Stichtage mit Vordruck: Mittelwert,
Bausubstanz, Mietertrag (Grund und Boden nur ohne Gebäude — er steckt in beiden Ansätzen und würde die Achse bis 0 €
dehnen). Entwürfe hohl, verglichene Stichtage hinterlegt, rechnet beim Eintippen mit; eigenes SVG ohne Bibliothek, in
der App so breit wie der Platz (lesbar am iPhone), im Dokument mit festen Farben und für Word als Bild.

---

## D33 (2026-10-02) — Mietertrag je Gebäude in der Preisermittlung

**Wunsch des Auftraggebers:** Vorschlag 7 — den Mietertrag in der normalen Bewertung getrennt je Gebäude rechnen, wie bei
Bank- und Lagergebäude in Gronau.

**Befund:** Die Preisermittlung rechnete den Anbau / das Nebengebäude in der Bausubstanz mit eigener Restnutzungsdauer,
kapitalisierte im Ertragswert aber den ganzen Gebäudereinertrag mit der Restnutzungsdauer des Hauptgebäudes.

**Beleg:** Der Vordruck der Bank (Preiseinschätzung Bank- und Lagergebäude, Stichtage 2023/2024) rechnet je Gebäude:
Rohertrag des Gebäudes, Bewirtschaftung und Abschlag, Bodenwert nach dem Mietanteil, Bodenwertverzinsung,
Gebäudereinertrag × Vervielfältiger aus der Restnutzungsdauer des Gebäudes; die Jahresbewertung bildet das seit D24 auf
den Cent nach. ImmoWertV § 27 ff.: Kapitalisiert wird über die Restnutzungsdauer der baulichen Anlagen.

**Entscheidung:** Neues Feld „davon Anbau / Nebengebäude (€/Jahr)“ (nur mit Anbau, nur Haus). Dieser Teil des Rohertrags
trägt Bewirtschaftung, Abschlag und Bodenwert(-verzinsung) nach seinem Mietanteil und wird mit der Restnutzungsdauer
des Anbaus kapitalisiert, der Rest mit der des Hauptgebäudes. Weil alles vor dem Vervielfältiger anteilig ist,
entspricht das einem nach Miete gewichteten Vervielfältiger. Ohne Eintrag (Vorgabe 0) ist der Anteil des Hauptgebäudes
genau 1 — alle bisherigen Ergebnisse bleiben gleich (keine Änderung an golden.json und an den Sollwerten der bisherigen
Fälle). Mehr als der Rohertrag wird auf den ganzen Rohertrag begrenzt, mit Hinweis. Der Beleihungswert (BelWertV) behält
sein eigenes Modell. Geprüft: Handrechnung (Unit-Test und Selbsttest), neuer Fall der unabhängigen Python-Vergleichs-
rechnung (dort jetzt auch Substanz des Anbaus), Browsertest der Anzeige und des Berichts.

---

## D34 (2026-10-02) — Erste vollständige Läufe des Klicktests aus dem Repository

**Anlass:** Der dauerhafte Klicktest (D32) lief zum ersten Mal ganz durch: am PC 307 Klappbereiche, 2.848 Felder und
661 Knöpfe/Links (62 min), in der iPhone-Ansicht 141 / 1.581 / 657 (50 min). Keine Skriptfehler, keine Downloads leer.

**Befunde in der App:**
- Exposé, Fotoauswahl: Bei einem nicht gewählten Foto lag das blasse Bild über dem Haken — ein Element mit
  `opacity` unter 1 bildet eine eigene Ebene und wird nach dem davor stehenden Haken gezeichnet. Der leere Haken war kaum
  zu sehen, ein echter Klick traf das Bild (umgeschaltet hat er trotzdem, weil das Bild im selben Label liegt). Der Haken
  liegt jetzt darüber (`z-index`). Browsertest: Haken mit echtem Mausklick ab und wieder an; ohne die Korrektur
  scheitert er.
- Vermarktung: Ein ungültiges Datum ergab „NaN Tage“ („Am Markt seit“) bzw. „Invalid Date“ („Bericht ab“, Datum eines
  Eintrags). Das Datumsfeld selbst lässt nichts anderes zu, eine ältere oder fremde Projektdatei aber schon — und die
  Testumgebung der iPhone-Ansicht unter Windows kennt kein Datumsfeld. Jetzt zählen nur gültige Daten, sonst „–“
  (Browsertest mit einem Projekt, dessen Datum ungültig ist).

**Fehlalarme des Klicktests behoben:**
- Listen, die die App beim Umschalten neu aufbaut (Berichtsumfang, Exposé-Fotos), machten das gemerkte Feld ungültig;
  der zweite Klick ging ins Leere und erschien als „verdeckt“ oder „Haken ändert sich nicht“. Das Feld wird jetzt über
  seinen Weg im Dokument wiedergefunden — die Beschriftung ändert sich dabei („Titelbild“, „Als Titelbild“). „Verdeckt“
  meldet er nur noch, wenn der Klick auf das vorhandene Feld scheitert, mit Playwrights Begründung (welches Element den
  Klick abfängt).
- Drei Musterfotos gehören zu den Musterdaten: Fotodokumentation, Exposé-Auswahl und Titelbild werden in jedem Bereich
  geprüft, nicht erst nach „Foto hinzufügen“ in einem früheren Bereich.
- Monat und Datum in Knopfnamen (Titelfolie „Ihr Haus Oktober 2026“) ersetzt der Vergleich „ohne Wirkung“ durch
  Platzhalter, sonst meldete er sich jeden Monat neu.

**Listen „ohne Wirkung“** (`tests/klick/ohne-wirkung-desktop.json`, `-iphone.json`) festgehalten, jeder Eintrag geprüft:
aktiver Reiter, schon offene Ansicht, leere Eingabe („Hinzufügen“, „Notiz speichern“), Filter schon zurückgesetzt,
Klick in die Fläche eines Fensters, Budget schon leer, „Alle aufklappen“ bei offenen Abschnitten, „Vorige Folie“ auf
der ersten und „Nächste Folie“ auf der letzten Folie (das Blättern prüft `sonderablaeufe.spec.mjs`).

---

## D35 (2026-10-02) — Gliederung der Bewertung neu; Aufnahmebogen fließt in die Bewertung; Schalter je Abschnitt

**Wunsch des Auftraggebers:** Die Gliederung der Preiseinschätzung verbessern, zuerst beim Wohnhaus, dann ebenso bei
Eigentumswohnung und Gewerbe: 1. Eckdaten nur mit Vordruck, Gebäudetyp, Auftraggeber (mit Adresse, Telefon …),
Objektanschrift, Nutzung, Verwendungszweck und Stichtag; 2. Aufnahmebogen, in dem man während der Besichtigung
erfasst — z. B. wie die Fenster sind — und das in die Bewertung übertragen wird; 3. Objektdaten & Beschreibung;
4. Allgemeines (Grundstücksflächen usw.); dann Hauptgebäude, Anbau … wie bisher. Bei den besonderen
objektspezifischen Merkmalen mehr Auswahl für Plus und Minus und mit ＋ einfügen statt vorbereiteter leerer Zeilen.
Jeder große Punkt mit einem Schalter, um ihn auszuschalten, wenn er nicht mitbewertet werden soll. Der Rest bleibt.

**Gliederung:** Eckdaten · Aufnahmebogen · Objektdaten & Beschreibung · Allgemeine Angaben (neu; Grundstück,
Wohnung/Gemeinschaft, Flächen & Baujahr, Erträge — vorher in den Eckdaten) · Hauptgebäude · Anbau · Datengrundlagen ·
Substanz · Vergleichswert · Ertrag · ab Nießbrauch unverändert. Alle Objektarten teilen sich die Abschnitte; was nicht
passt, ist ausgeblendet — Eigentumswohnung und Gewerbe haben damit dieselbe Reihenfolge. Die Felder behalten ihre
Kennung, die Rechnung liest sie unabhängig von ihrer Stelle: keine Zahl ändert sich (Golden-Test maschinell
verglichen, nur Anzeigetexte, golden-aenderungen.md §11). Die Ortsbesichtigung steht jetzt im Aufnahmebogen; das
doppelte Feld „Besichtigung am“ entfällt (ältere Bewertungen: dessen Datum wird übernommen, wenn die Ortsbesichtigung
leer ist).

**Objektdaten & Beschreibung (Nachtrag, Wunsch des Auftraggebers):** Blöcke in der Reihenfolge Lage (Makro-/Mikrolage) ·
Lage-Check mit amtlichen Karten · Gebäudedaten · Grundstück, Grundbuch & Recht · Planungsrecht · Grundstück & Gebäude ·
Zustand & Bautechnik · Rechtliches & Vermarktung. Nur die Anordnung im Formular; der Bericht behält seinen Aufbau.

**Auftraggeber:** Anschrift, Telefon und E-Mail zeigen die Eckdaten aus der Kundenakte. Personenbezogene Daten bleiben
in der Akte gebündelt, mit Auskunft und Löschung (D8); die Bewertung speichert wie bisher nur Name und Zuordnung.

**Aufnahmebogen → Bewertung (Haus):** „Bauteile & Ausstattungsstandard“ — je Bauteil die Beschreibung der
Standardstufe 1–5 (NHK 2010, Anlage 4 ImmoWertV; dieselben Texte wie die Referenztabelle im Hauptgebäude, jetzt aus
einer Quelle) → Standardstufe im Gebäudepreis. „Modernisierungen“ — Elemente nach ImmoWertV Anlage 2 mit Umfang und
Jahr → „vollständig erneuert“ = Höchstpunktzahl des Elements, „nicht modernisiert“ = 0; „teilweise“ und länger
zurückliegende Maßnahmen legt der Bewerter fest (Anlage 2: dann ggf. weniger als die Höchstpunktzahl), das Jahr steht
in der Punktetabelle. Technik & Ausstattung → Objektdaten (Heizung und Fenster nur bei eindeutigem Stichwort,
Energieausweis, Effizienzklasse, Aufzug), Keller → Unterkellerung, Kennwert und Klasse → Energetische Qualität (wie
bisher der Knopf „Aus Aufnahmebogen“). Übertragen wird nur beim Ändern im Aufnahmebogen, beim Laden nichts; in der
Bewertung bleibt jeder Wert änderbar, übernommene Felder sind markiert. Keine neue Formel — es werden nur Eingaben
gesetzt.

**§ 8 Abs. 3:** zwei Listen, „Wertmindernd“ (Abschläge) und „Werterhöhend“ (Zuschläge), jeweils mit ＋ und einer
Vorschlagsliste typischer Merkmale nach § 8 Abs. 3 ImmoWertV (Baumängel und Bauschäden, besondere
Ertragsverhältnisse, Rechte und Belastungen, Bodenverunreinigungen, Freilegung, Bodenschätze …); Beträge positiv.
Gespeichert wie bisher in 14 Plätzen, zusätzlich die Art (`wk_art`). Ein Zuschlag zählt in der Summe negativ —
genau wie vorher ein negativer Betrag (neuer Fall der Python-Vergleichsrechnung, Gleichheit im Unit-Test). Ältere
Bewertungen: negative Beträge erscheinen als Zuschlag. Die Anzeige zeigt das Vorzeichen (vorher „− -… €“ bei
Zuschlägen); die Vorlage „Typische Positionen einfügen“ und die leeren Zeilen entfallen.

**Schalter je Abschnitt:** oben rechts in der Kopfzeile. Aus = fließt nicht in die Bewertung; darstellende Abschnitte
erscheinen dann auch nicht im Bericht. Die vorhandenen Schalter (Anbau, Vergleichswert, Nießbrauch, Erbbaurecht, PV,
Energie, Sanierungsweg, Beleihungswert) wandern nach oben — gleiche Felder, gleiche Rechnung. Neu: Aufnahmebogen,
Objektdaten & Beschreibung, Datengrundlagen, Fotos, Rendite (Bericht) und § 8 (`wk_aus`: keine Zu- und Abschläge).
Substanz und Ertrag (bei der Wohnung Vergleich und Ertrag) stellen die vorhandene Gewichtung auf „nur …“ und beim
Einschalten auf die vorige zurück; beide aus geht nicht — keine neue Formel. Die neuen Felder heißen `…_aus`: fehlen sie
in älteren Bewertungen oder Referenzfällen, ist der Abschnitt an. Ausgeschaltete Abschnitte zeigen nur Kopfzeile und
Hinweis, ihre Pflichtfelder zählen nicht. Ohne Schalter bleiben Eckdaten, Allgemeine Angaben, Hauptgebäude,
Preisempfehlung und Ersteller (ohne sie keine Bewertung). Exposé, Präsentation und Vermarktung fließen ohnehin nicht in
die Bewertung ein; auf Wunsch des Auftraggebers blendet ihr Schalter sie aus (`ex_aus`, `vp_aus`, `vm_aus`), die
Eingaben bleiben erhalten.

**Geprüft:** 94 Unit-Tests (neu: Zuschlag als Art = früherer negativer Betrag; zwei neue Fälle der
Python-Vergleichsrechnung), 75 Browsertests (neu: Gliederung, Übernahme aus dem Aufnahmebogen, Schalter, § 8,
ältere Bewertung, Kontaktdaten aus der Akte), Golden-Test (nur Anzeigetexte). Klicktest PC 296 Klappbereiche,
2.963 Felder, 670 Knöpfe; iPhone 138 / 1.625 / 666 — Listen „ohne Wirkung“ unverändert. Ein Fehlalarm am
Substanz-Schalter ist im Test behoben: Der Klicktest stellt beim Durchprobieren den Gebäudetyp um, der die Gewichtung
auf den Standard des Typs setzt (Einfamilienhaus: nur Substanz); dann verweigert die App zu Recht, auch die Substanz
auszuschalten, und sagt warum. Ein Haken, der mit Meldung stehen bleibt, gilt jetzt als in Ordnung (Nachprüfung der
Bewertungsbereiche ohne Befund).

---

## D36 (2026-10-02) — Raumliste und Grundrisse zu den Flächen; Wohnfläche änderbar; „Sonstiges“

**Wunsch des Auftraggebers:** Grundrisse und Raumliste aus dem Aufnahmebogen zu „Flächen & Baujahr“ unter den
Allgemeinen Angaben; eine schon genannte Wohnfläche wird übernommen, muss aber änderbar bleiben — die Felder sollen
nicht voneinander abhängen; „Sonstiges“ selbst eintragen können bei Planungsrecht, Modernisierungen, Lage-Check,
besonderen Bauteilen und Unterlagen.

**Umsetzung:** Allgemeine Angaben in Blöcken: Grundstück (bei der Wohnung: Wohnung / Gemeinschaft) · Flächen & Baujahr ·
Grundrisse · Raumliste & Wohnfläche nach WoFlV · Erträge. Die Wohnfläche hat weiter nur ein Feld; die Raumliste füllt
es, solange „übernehmen“ an ist, sperrt es aber nicht mehr (vorher schreibgeschützt). Eine eigene Zahl gilt und
schaltet die Übernahme aus; „übernehmen“ daneben holt die Summe der Raumliste zurück. Eigene Einträge: Planungsrecht
„Sonstiges“ (Freitext), sonstige Modernisierung (Bezeichnung, Umfang, Jahr — nur Dokumentation, keine Punkte, weil
Anlage 2 ImmoWertV nur die acht Elemente kennt), sonstige Bauteile (Freitext, mehrere mit Komma), sonstige Unterlage
(mit „liegt vor“, auch in der Unterlagenliste für den Eigentümer und ihrer Vollständigkeit), eigener Prüfpunkt im
Lage-Check (Bezeichnung, Quelle, Ergebnis, Notiz, Datum). Alles erscheint im Bericht; die Modernisierungen laut
Aufnahmebogen stehen jetzt unter „Feststellungen der Ortsbesichtigung“.

**Bericht:** Die Wohnflächenberechnung stand unter „Feststellungen der Ortsbesichtigung“ und wäre mit ausgeschaltetem
Aufnahmebogen verschwunden. Jetzt lässt der Bericht bei ausgeschaltetem Aufnahmebogen nur dessen Feststellungen weg;
die Wohnflächenberechnung erscheint dann als eigener Teil (im Berichtsumfang weiter unter „Feststellungen … mit
Wohnflächenberechnung“). Keine Rechnung ändert sich.

**Bericht wie das Formular (Nachtrag, Wunsch des Auftraggebers):** Feststellungen der Ortsbesichtigung (Aufnahmebogen) ·
Lage (eigene Überschrift, vorher Teil der Objektbeschreibung) · Lage-Check · Gebäudedaten · Grundstück, Grundbuch & Recht ·
Planungsrecht · Objektbeschreibung · danach wie bisher Grundstück & Bodenwert und die Preisansätze. Im Berichtsumfang
umfasst „Objektbeschreibung (mit Lage)“ auch die Lage.

**Nummern (Fehler behoben):** War ein Abschnitt beim Nummerieren zugeklappt, zählten Blöcke mit, die es nur beim Haus
gibt — bei der Wohnung begannen die Allgemeinen Angaben mit 4.2, im Aufnahmebogen fehlten 2.3 und 2.4. Jetzt zählen
solche Blöcke in der anderen Objektart nicht mit; beim Auf- und Zuklappen wird neu nummeriert (Browsertest).

## D37 (2026-10-02) — Foto an der Feststellung, fehlende Bauteile, Prüfhinweise zusammengeführt, Vergleichswert im Beleihungswert

**Auftrag:** Vorschläge 1, 2, 4, 5 und 7 aus der Liste „Was könnte man noch verbessern“.

**1 · Foto direkt an der Feststellung:** Im Aufnahmebogen („Feststellungen vor Ort“) gibt es Feststellungen mit Foto:
kurzer Text, Foto mit der Kamera, mehrere Fotos je Feststellung. Die Feststellungen stehen als Liste im versteckten Feld
`au_fest` und reisen damit in Speicherstand, Sicherung und Teilen mit. Die Fotos sind gewöhnliche Schadensfotos mit
Verweis auf ihre Feststellung (`fest`) — sie bleiben in der Fotodokumentation sichtbar und liegen wie alle Fotos nur
lokal auf dem Gerät.
Der Bericht zeigt sie unter „Feststellungen mit Foto“ bei ihrem Text und nicht noch einmal unter den Schadensfotos;
ist der Aufnahmebogen ausgeschaltet, stehen sie wie bisher unter den Schadensfotos. Die Bildunterschrift folgt dem Text
der Feststellung (vor Ort wird oft zuerst fotografiert), bis sie in der Fotodokumentation selbst geändert wird; eine
eigene Bildunterschrift zeigt der Bericht unter dem Foto. Löschen der Feststellung löscht nach Rückfrage auch ihre
Fotos. Keine Rechnung ändert sich.

**2 · Fehlende Bauteile (Roadmap #51, offener Teil):** Bisher zählte ein leeres Bauteil in der Preisermittlung wie
Stufe 3 — eine Lagerhalle ohne Heizung bekam Heizungskosten. Jetzt hat jedes Bauteil der Standardstufen den Haken
„fehlt“ (Hauptgebäude und Anbau), im Aufnahmebogen die Auswahl „fehlt“. Quelle: Vordruck der Bank in der
Jahresbewertung (D24) — ein fehlendes Bauteil hat dort die Anteile 0; seine Kosten entfallen, die übrigen Anteile
werden **nicht** auf 100 % hochgerechnet. So rechnet jetzt auch die Preisermittlung (`nhkRechnen`: Anteil × Kennwert,
fehlend = 0). Die Python-Vergleichsrechnung hat dafür den Fall `gewerbe_ohne_heizung_sanitaer`, der Unittest eine
Handrechnung (785 €/m² × 0,82). Ohne Haken ändert sich nichts (golden-aenderungen §12).

**4 · Prüfhinweise zusammengeführt (Roadmap #28) und erweitert:** Die Ergebnis-Plausibilisierung gegen den Marktbericht
stand nur im Abschnitt Preisempfehlung und als Anzeige oben, unverbunden mit der Eingabeprüfung. Sie steht jetzt mit
denselben Stufen wie dort (bis 10 % plausibel, bis 25 % erklärungsbedürftig, darüber erheblich) auch in der Liste der
Prüfhinweise. Neu sind außerdem Gegenproben, die Widersprüche zwischen Aufnahmebogen und Bewertung zeigen:
- Keller und Dachgeschoss laut Aufnahmebogen gegen den Gebäudetyp — an ihm hängen die NHK-Basiswerte;
- Effizienzklasse gegen den Energiekennwert (GEG-Skala, wie die bestehende Klassenermittlung);
- Modernisierungsjahr vor dem Baujahr (Fehler) oder nach dem Stichtag (Warnung);
- „vollständig erneuert“ bei Standardstufe 1–2 des Bauteils (Dach, Fenster und Außentüren, Heizung, Außenwände) —
  die Stufen 1–2 beschreiben alte Bauteile (Anlage 4 ImmoWertV);
- Wohnfläche gegen die Summe der Raumliste (ab 5 % Abweichung), wenn die Übernahme ausgeschaltet ist.

Die Gegenproben gelten nur, solange der Aufnahmebogen eingeschaltet ist. Es sind reine Hinweise, keine Rechnung ändert
sich. Der alte Hinweis „Wohn-/Nutzfläche in ① eintragen“ verweist jetzt auf „Allgemeine Angaben“, wo die Fläche seit
D35 steht (golden-aenderungen §12).

**5 · Vergleichswert im Beleihungswert (Roadmap #29):** Quelle: BelWertV (gesetze-im-internet.de).
- § 19 Abs. 1: Vergleichswert aus nachhaltig erzielbaren Vergleichspreisen, Sicherheitsabschlag von mindestens 10 %.
  Eine kleinere Eingabe rechnet die App mit 10 % und meldet die Korrektur, wie beim Sicherheitsabschlag des Sachwerts
  (§ 16 Abs. 2).
- § 4 Abs. 1: Der Ertragswert ist maßgeblich. Als Kontrollwert dient der Sachwert, bei Ein- und Zweifamilienhäusern
  und Wohnungs- und Teileigentum anstelle des Sachwerts der Vergleichswert. Liegt der Kontrollwert mehr als 20 % unter
  dem Ertragswert, verlangt die App wie bisher die besondere Nachhaltigkeitsprüfung.
- § 4 Abs. 2: Orientierung am Sach- oder Vergleichswert nur bei zweifelsfreier Eignung zur Eigennutzung. Beim Ein- und
  Zweifamilienhaus verlangt die App mindestens fünf aktuelle Vergleichspreise.
- Der Vergleichswert außerhalb von EFH/ZFH und Wohnungseigentum (als Ausgangs- oder Kontrollwert) ist ein Fehler.
- Der Abzug für bestehende Vermietung gilt für Sach- und Vergleichswertorientierung.

„Werte übernehmen“ holt Vergleichswert und Anzahl der Vergleichsobjekte aus dem Abschnitt Vergleichswert. Vorgabe bleibt
Ertragswert mit Sachwert als Kontrolle — bestehende Bewertungen rechnen unverändert (golden-aenderungen §12, neue
Felder mit 0).

**7 · Baupreisindex:** Der Wert für August 2026 (3. Vierteljahr) ist noch nicht veröffentlicht; die neueste
Pressemitteilung des Statistischen Landesamts (17.07.2026) betrifft das 2. Vierteljahr (Mai 2026), der eingebaute
Stand. Stichtage danach sind in der App weiter als „vorläufig“ gekennzeichnet. Roadmap #50 bleibt offen.

**Tests:** Unit- und Python-Vergleichsrechnung wie oben; Browsertests (D37) für Feststellung mit Foto, fehlende
Bauteile, Prüfhinweise und Vergleichswert im Beleihungswert; Klicktest der Bewertungen und des Berichts.

**Klicktest auf GitHub (Nachtrag):** Lauf 11 war am iPhone grün. Am PC kam die App vor „Liegenschaften – Übersicht“
einmal nicht innerhalb von 30 s in Gang („Test abgebrochen“). Alle übrigen Bereiche liefen durch, lokal laufen alle
Liegenschaften-Bereiche ohne Befund. Das war ein Hänger des Testrechners. Der Klicktest lädt bei einem solchen Hänger
jetzt einmal neu und vermerkt das als Hinweis. Hängt der Start auch beim zweiten Mal, bleibt es ein Befund.
