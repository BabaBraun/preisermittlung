# Integration mit dem aktuellen GitHub-Stand

Die native Umsetzung basiert ursprünglich auf 7fa7d96. Vor der Veröffentlichung wurden die zehn neueren Commits bis af3afcd integriert.

Die Korrekturen zur Python-Standardausgabe, versionsgebundenen Office-/PDF-Prüfung und Container-CI bleiben erhalten. Der GitHub-Reporter wurde übernommen. Der Workflow führt Unit- und Browsertests getrennt aus, damit die komplette Browserprüfung nicht zweimal läuft. Die statische Ausgabe wird zusätzlich gebaut.

Der neue iOS-Workflow prüft die SwiftUI-App im Simulator. Bestehende Dokumentation zur früheren Web-App bleibt als historische Einordnung erhalten; maßgeblicher aktueller iOS-Umfang steht in Native-iOS-App.md.
