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

## Veröffentlichen

Cloudflare Worker `mindblow`, online unter https://mindblow.thinklabs.workers.dev

Cloudflare ist direkt mit diesem GitHub-Repo verbunden: **Jeder Push auf `main` wird automatisch veröffentlicht.**
Nichts von Hand hochladen. Konfiguration: `wrangler.jsonc`, ausgeschlossene Dateien: `.assetsignore`.

## Neues Thema hinzufügen

1. Eine bestehende Lektion (z. B. `ki.html`) kopieren.
2. Ein eigenes Skript in `js/` anlegen und `MB.lesson('<name>', <anzahl>, { ... })` aufrufen.
3. Eine Karte in `index.html` ergänzen und den Link in allen Navigationen eintragen.

Gemeinsames Design: `css/style.css`. Gemeinsame Logik: `js/common.js`.
