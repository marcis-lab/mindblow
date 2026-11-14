# mindblow

Wie funktioniert die Welt? Interaktiv lernen, indem man zuerst selbst denkt.
Jede Lektion: vermuten → ausprobieren → verstehen.

## Themen

- `strom.html`: Wie funktioniert Strom?
- `internet.html`: Wie funktioniert das Internet?
- `ki.html`: Was ist eigentlich KI?

## Lokal starten

```bash
node server.js
```

Dann http://localhost:8080 öffnen.

## Veröffentlichen (Cloudflare Pages)

Das Repository ist mit Cloudflare Pages verbunden. Jede Änderung auf dem Branch `main`
wird automatisch veröffentlicht. Einstellungen: kein Build-Befehl, Ausgabeordner `/`.

## Neues Thema hinzufügen

1. Eine bestehende Lektion (z. B. `ki.html`) kopieren.
2. Ein eigenes Skript in `js/` anlegen und `MB.lesson('<name>', <anzahl>, { ... })` aufrufen.
3. Eine Karte in `index.html` ergänzen und den Link in allen Navigationen eintragen.

Gemeinsames Design: `css/style.css`. Gemeinsame Logik: `js/common.js`.
