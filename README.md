# mindblow

Wie funktioniert die Welt? Interaktiv lernen, indem man zuerst selbst denkt.
Jede Lektion: vermuten → ausprobieren → verstehen.

## Themen

Alle Themen stehen im Register in `js/common.js` (`TOPICS`). Startseite und Navigation werden daraus erzeugt.

- **Körper & Gesundheit:** herz, blut, lunge, bewegung, immunsystem, verdauung, farben, gehoer, gedaechtnis, schlaf
- **Pflanzen, Tiere & Evolution:** fotosynthese, herbst, dna, evolution, zugvoegel, bienen, nahrungsnetz
- **Physik & Chemie:** fallen, himmel, regenbogen, waerme, atome
- **Erde & Weltall:** jahreszeiten, gezeiten, mondphasen, treibhaus, gewitter, universum, vulkane
- **Technik:** strom, kuehlschrank, akku, internet, ki, verschluesselung, computer, gps, flugzeug
- **Geld & Gesellschaft:** geld, zinseszins, inflation, lotto, stau

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
3. Das Thema im Register `TOPICS` in `js/common.js` eintragen (Karte und Navigation entstehen automatisch).
4. Nummer im Eyebrow (`Thema NN`) und die «Weiter»-Links der Nachbarseiten anpassen.

Gemeinsames Design: `css/style.css`. Gemeinsame Logik: `js/common.js`.

## Lexikon-Verbund

mindblow ist mit timewarp (Weltgeschichte) und dem Periodensystem verbunden. Bibel verstehen ist vorbereitet, aber vorerst nicht dabei (in `SITES` auskommentiert). Das gemeinsame Skript liegt hier:
`lexikon/lexikon.js` (Knopf «Lexikon» und Suche über alle Seiten). Die anderen Seiten laden es von
https://mindblow.thinklabs.workers.dev/lexikon/lexikon.js.

Jede Seite hat einen Suchindex `lexikon.json`. Für mindblow nach jeder Änderung an `js/themen.js` ausführen:

```bash
node tools/lexikon-index.js
```

`_headers` erlaubt anderen Seiten, `lexikon.json` zu lesen.
