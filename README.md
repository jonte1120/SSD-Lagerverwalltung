# Lageruebersicht

Eine statische Lager-App fuer GitHub Pages. Die Seite ist zugleich eine installierbare Web-App (PWA).

## Bereiche

- Bestand: aktueller Lagerbestand mit Mindestbestand, Status und Warenwert.
- Datenstamm: Materialien, Einheiten, Anfangsbestand, Mindestbestand und Preis.
- Austragen: Verbrauch, Eingang und Korrekturen buchen.
- Durchschnitt: Wochenverbrauch je Kalenderwoche und Material.

## Formeln

Die Berechnungen laufen direkt im Browser:

```text
Aktueller Bestand = Anfangsbestand + Eingang - Verbrauch + Korrektur
Wert = Aktueller Bestand * Preis pro Einheit
Durchschnitt je Buchung = Wochenverbrauch / Anzahl Verbrauchsbuchungen
Status = Aktueller Bestand <= Mindestbestand
```

Die Daten werden lokal im Browser gespeichert und koennen als JSON gesichert oder wieder importiert werden.

## Als App installieren

Nach dem Hosting im Browser oeffnen und im Browser-Menue `App installieren` beziehungsweise `Zum Startbildschirm hinzufuegen` waehlen.

## GitHub Pages

Repository auf GitHub hochladen und unter `Settings > Pages` die Quelle `Deploy from a branch`, Branch `main`, Ordner `/root` auswaehlen.
