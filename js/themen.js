/* mindblow – Themen-Register
   Drei Ebenen: Bereich → Gebiet → Thema. Startseite, Menü, Übersichtsseiten,
   Suche, Brotkrumen und «Weiter»-Links werden alle aus dieser Datei erzeugt.

   Neues Thema:   in THEMEN eintragen (Reihenfolge innerhalb des Gebiets = Lernreihenfolge).
   Geplantes Thema: mit soon: true eintragen. Es erscheint als «Bald» und ist suchbar, aber nicht anklickbar.
   Felder: slug (= Dateiname), b (Bereich), g (Gebiet), short (kurzer Name), title (mit <em>),
           teaser (ein Satz), tags (Suchwörter, mit Leerzeichen getrennt), added (Datum, für «Neu»). */
window.MB_THEMEN = {
  BEREICHE: [
    { id: 'koerper', name: 'Körper & Gesundheit', intro: 'Was in dir passiert, jede Sekunde, ohne dass du daran denkst.',
      gebiete: [
        { id: 'herz-kreislauf', name: 'Herz & Kreislauf' },
        { id: 'atmung', name: 'Atmung' },
        { id: 'bewegung', name: 'Knochen & Muskeln' },
        { id: 'abwehr', name: 'Abwehr & Gesundheit' },
        { id: 'verdauung', name: 'Verdauung & Stoffwechsel' },
        { id: 'sinne', name: 'Sinne' },
        { id: 'gehirn', name: 'Gehirn & Nerven' },
      ] },
    { id: 'leben', name: 'Pflanzen, Tiere & Evolution', intro: 'Wie Leben funktioniert, wächst und sich verändert.',
      gebiete: [
        { id: 'pflanzen', name: 'Pflanzen' },
        { id: 'zellen', name: 'Zellen & Gene' },
        { id: 'evolution', name: 'Evolution' },
        { id: 'tiere', name: 'Tiere' },
        { id: 'oekologie', name: 'Ökosysteme' },
      ] },
    { id: 'physik', name: 'Physik & Chemie', intro: 'Die Regeln hinter allem: Kräfte, Licht, Wärme und Stoffe.',
      gebiete: [
        { id: 'kraefte', name: 'Kräfte & Bewegung' },
        { id: 'licht', name: 'Licht & Schall' },
        { id: 'waerme', name: 'Wärme & Energie' },
        { id: 'stoffe', name: 'Stoffe & Reaktionen' },
      ] },
    { id: 'erde', name: 'Erde & Weltall', intro: 'Unser Planet, sein Klima und alles, was um ihn herum kreist.',
      gebiete: [
        { id: 'sonne-mond', name: 'Sonne, Mond & Erde' },
        { id: 'klima', name: 'Klima & Wetter' },
        { id: 'weltall', name: 'Weltall' },
        { id: 'planet', name: 'Gesteine & Vulkane' },
      ] },
    { id: 'technik', name: 'Technik', intro: 'Geräte und Netze, die du täglich benutzt, von innen erklärt.',
      gebiete: [
        { id: 'energie', name: 'Strom & Geräte' },
        { id: 'digital', name: 'Computer & Netze' },
        { id: 'unterwegs', name: 'Verkehr & Navigation' },
      ] },
    { id: 'gesellschaft', name: 'Geld & Gesellschaft', intro: 'Wie Menschen zusammen wirtschaften, entscheiden und sich bewegen.',
      gebiete: [
        { id: 'geld', name: 'Geld' },
        { id: 'zufall', name: 'Zufall & Entscheiden' },
        { id: 'zusammenleben', name: 'Zusammenleben' },
      ] },
  ],

  THEMEN: [
    /* ---------- Körper & Gesundheit ---------- */
    { slug: 'herz', b: 'koerper', g: 'herz-kreislauf', short: 'Herz', title: 'Wie arbeitet dein <em>Herz?</em>', teaser: 'Rund 100\'000 Schläge am Tag, ein Leben lang ohne Pause. Was pumpt da eigentlich wohin?', tags: 'herz puls blut kreislauf pumpe herzschlag blutdruck arterie vene anatomie', added: '2026-11-14' },
    { slug: 'blut', b: 'koerper', g: 'herz-kreislauf', short: 'Blut', title: 'Was steckt im <em>Blut?</em>', teaser: 'Rote Blutkörperchen, Plasma, Blutplättchen: ein flüssiges Organ.', tags: 'blut blutgruppe blutspende eisen hämoglobin', added: '2026-11-14' },
    { slug: 'lunge', b: 'koerper', g: 'atmung', short: 'Atmung', title: 'Wie kommt Luft <em>ins Blut?</em>', teaser: 'Innen ist deine Lunge so gross wie eine ganze Wohnung. Wozu so viel Fläche?', tags: 'lunge atmung atmen sauerstoff co2 lungenkreislauf lungenbläschen alveolen zwerchfell anatomie', added: '2026-11-14' },
    { slug: 'ersticken', b: 'koerper', g: 'atmung', soon: true, short: 'Atemreiz', title: 'Warum musst du <em>atmen?</em>', teaser: 'Nicht der fehlende Sauerstoff zwingt dich zum Luftholen, sondern etwas anderes.', tags: 'atemreiz co2 luft anhalten tauchen' },
    { slug: 'bewegung', b: 'koerper', g: 'bewegung', short: 'Knochen & Muskeln', title: 'Wie bewegt sich dein <em>Körper?</em>', teaser: 'Muskeln können nur ziehen, nie stossen. Wie streckst du dann deinen Arm?', tags: 'knochen muskeln skelett gelenk hebel sehne anatomie bizeps trizeps bewegung', added: '2026-11-14' },
    { slug: 'muskelkater', b: 'koerper', g: 'bewegung', soon: true, short: 'Muskelkater', title: 'Woher kommt <em>Muskelkater?</em>', teaser: 'Milchsäure ist es nicht. Was dann?', tags: 'muskelkater sport training milchsäure' },
    { slug: 'immunsystem', b: 'koerper', g: 'abwehr', short: 'Immunsystem', title: 'Wie wehrt sich dein <em>Körper?</em>', teaser: 'In dir tobt jeden Tag ein Krieg gegen Eindringlinge. Und eine Impfung ist ein Übungsalarm.', tags: 'immunsystem abwehr impfung antikörper bakterien viren krankheit fresszellen', added: '2026-11-14' },
    { slug: 'fieber', b: 'koerper', g: 'abwehr', soon: true, short: 'Fieber', title: 'Wozu ist <em>Fieber</em> gut?', teaser: 'Dein Körper heizt absichtlich auf. Warum?', tags: 'fieber temperatur krankheit' },
    { slug: 'verdauung', b: 'koerper', g: 'verdauung', soon: true, short: 'Verdauung', title: 'Was passiert mit deinem <em>Essen?</em>', teaser: 'Ein Rüebli auf neun Meter Reise durch deinen Körper.', tags: 'verdauung magen darm essen nahrung anatomie' },
    { slug: 'kalorien', b: 'koerper', g: 'verdauung', soon: true, short: 'Kalorien', title: 'Was ist eine <em>Kalorie?</em>', teaser: 'Du verbrennst Essen, ganz ohne Flamme.', tags: 'kalorien energie stoffwechsel essen' },
    { slug: 'farben', b: 'koerper', g: 'sinne', short: 'Farben', title: 'Gibt es Farben <em>wirklich?</em>', teaser: 'Dein Auge kennt nur drei Farben. Den ganzen Rest baut dein Gehirn.', tags: 'farben sehen auge licht zapfen rgb bildschirm nachbild', added: '2026-11-13' },
    { slug: 'gehoer', b: 'koerper', g: 'sinne', short: 'Hören', title: 'Wie hörst du <em>Töne?</em>', teaser: 'Schall ist nur Luft, die hin und her schubst. Wie wird daraus Musik in deinem Kopf?', tags: 'hören ohr schall ton frequenz musik hertz cochlea gehör', added: '2026-11-14' },
    { slug: 'geschmack', b: 'koerper', g: 'sinne', soon: true, short: 'Geschmack', title: 'Warum schmeckt Essen mit Schnupfen <em>nach nichts?</em>', teaser: 'Deine Zunge kann viel weniger, als du denkst.', tags: 'geschmack zunge nase riechen' },
    { slug: 'gedaechtnis', b: 'koerper', g: 'gehirn', short: 'Gedächtnis', title: 'Wie erinnert sich das <em>Gehirn?</em>', teaser: 'Dein Gedächtnis ist keine Festplatte. Es erfindet mit, und du merkst es nicht.', tags: 'gedächtnis gehirn erinnern lernen vergessen neuronen', added: '2026-11-13' },
    { slug: 'schlaf', b: 'koerper', g: 'gehirn', short: 'Schlaf', title: 'Warum müssen wir <em>schlafen?</em>', teaser: 'Ein Drittel des Lebens, scheinbar nutzlos. Was tut das Gehirn in der Nacht?', tags: 'schlaf traum müde gehirn', added: '2026-11-14' },
    { slug: 'nerven', b: 'koerper', g: 'gehirn', soon: true, short: 'Nerven', title: 'Wie schnell ist ein <em>Gedanke?</em>', teaser: 'Nervensignale sind elektrisch, aber viel langsamer als Strom im Kabel.', tags: 'nerven reflex reaktion neuronen' },

    /* ---------- Pflanzen, Tiere & Evolution ---------- */
    { slug: 'fotosynthese', b: 'leben', g: 'pflanzen', short: 'Fotosynthese', title: 'Wie macht ein Baum aus Luft <em>Holz?</em>', teaser: 'Ein Baum wiegt Tonnen. Fast alles davon kommt aus der Luft, nicht aus dem Boden.', tags: 'fotosynthese photosynthese pflanze baum blatt chlorophyll sauerstoff co2 licht zucker', added: '2026-11-14' },
    { slug: 'herbst', b: 'leben', g: 'pflanzen', short: 'Herbstlaub', title: 'Warum werden Blätter im Herbst <em>bunt?</em>', teaser: 'Die Farben waren schon den ganzen Sommer da.', tags: 'herbst blätter farbe laub', added: '2026-11-14' },
    { slug: 'dna', b: 'leben', g: 'zellen', short: 'DNA', title: 'Wie passt ein Bauplan in eine <em>Zelle?</em>', teaser: 'Zwei Meter DNA in jeder deiner Zellen, schön aufgewickelt.', tags: 'dna gene zelle erbgut vererbung', added: '2026-11-14' },
    { slug: 'zelle', b: 'leben', g: 'zellen', soon: true, short: 'Zellen', title: 'Woraus besteht <em>Leben?</em>', teaser: 'Du bist ein Volk aus rund 30 Billionen Zellen.', tags: 'zelle zellen mikroskop bakterien' },
    { slug: 'evolution', b: 'leben', g: 'evolution', short: 'Evolution', title: 'Wie funktioniert <em>Evolution?</em>', teaser: 'Niemand plant, und trotzdem entstehen perfekte Tarnungen. Wie geht das?', tags: 'evolution darwin selektion mutation tarnung arten', added: '2026-11-13' },
    { slug: 'zugvoegel', b: 'leben', g: 'tiere', soon: true, short: 'Zugvögel', title: 'Woher wissen Zugvögel den <em>Weg?</em>', teaser: 'Ohne Karte und GPS über tausende Kilometer.', tags: 'vögel zugvögel magnetfeld navigation tiere' },
    { slug: 'bienen', b: 'leben', g: 'tiere', short: 'Bienen', title: 'Wie sprechen <em>Bienen</em> miteinander?', teaser: 'Eine Biene tanzt, und ihre Schwestern wissen, wo die Blumen blühen.', tags: 'bienen biene honig bestäubung schwänzeltanz insekten wabe imker tiere', added: '2026-11-14' },
    { slug: 'nahrungsnetz', b: 'leben', g: 'oekologie', short: 'Nahrungsnetz', title: 'Was passiert, wenn die <em>Wölfe</em> zurückkommen?', teaser: 'Ein Tier verändert eine ganze Landschaft.', tags: 'ökosystem nahrungskette wolf natur', added: '2026-11-14' },

    /* ---------- Physik & Chemie ---------- */
    { slug: 'fallen', b: 'physik', g: 'kraefte', short: 'Schwerkraft', title: 'Fällt Schweres <em>schneller?</em>', teaser: 'Eine Bowlingkugel und eine Feder fallen gleichzeitig. Man muss nur die Luft weglassen.', tags: 'schwerkraft fallen gravitation galilei luftwiderstand fallschirm', added: '2026-11-14' },
    { slug: 'hebel', b: 'physik', g: 'kraefte', soon: true, short: 'Hebel', title: 'Wie hebt man ein <em>Auto</em> mit einer Hand?', teaser: 'Gib mir einen Hebel, und ich bewege die Welt.', tags: 'hebel kraft mechanik flaschenzug' },
    { slug: 'himmel', b: 'physik', g: 'licht', short: 'Blauer Himmel', title: 'Warum ist der Himmel <em>blau?</em>', teaser: 'Und warum wird er am Abend orange? Die Antwort steckt im Licht selbst.', tags: 'himmel blau licht streuung sonnenuntergang abendrot', added: '2026-11-13' },
    { slug: 'regenbogen', b: 'physik', g: 'licht', soon: true, short: 'Regenbogen', title: 'Wo steht der <em>Regenbogen?</em>', teaser: 'Jeder Mensch sieht seinen eigenen.', tags: 'regenbogen licht brechung regen' },
    { slug: 'waerme', b: 'physik', g: 'waerme', short: 'Wärme', title: 'Warum fühlt sich Metall <em>kälter</em> an?', teaser: 'Löffel und Holzbrett haben dieselbe Temperatur. Wirklich.', tags: 'wärme temperatur metall leiten', added: '2026-11-14' },
    { slug: 'feuer', b: 'physik', g: 'stoffe', soon: true, short: 'Feuer', title: 'Was ist eigentlich eine <em>Flamme?</em>', teaser: 'Fest, flüssig, gasförmig? Nichts davon so richtig.', tags: 'feuer flamme verbrennung chemie' },
    { slug: 'atome', b: 'physik', g: 'stoffe', short: 'Atome', title: 'Wie klein ist ein <em>Atom?</em>', teaser: 'Und warum besteht es fast nur aus Leere?', tags: 'atom teilchen chemie elemente', added: '2026-11-14' },

    /* ---------- Erde & Weltall ---------- */
    { slug: 'jahreszeiten', b: 'erde', g: 'sonne-mond', short: 'Jahreszeiten', title: 'Warum gibt es <em>Jahreszeiten?</em>', teaser: 'Im Januar ist die Erde der Sonne am nächsten. Trotzdem ist bei uns Winter.', tags: 'jahreszeiten sommer winter erdachse sonne', added: '2026-11-13' },
    { slug: 'gezeiten', b: 'erde', g: 'sonne-mond', short: 'Ebbe & Flut', title: 'Warum gibt es <em>Ebbe und Flut?</em>', teaser: 'Der Mond zieht das Meer an. Aber warum gibt es dann zwei Fluten am Tag?', tags: 'gezeiten ebbe flut mond meer springflut', added: '2026-11-14' },
    { slug: 'mondphasen', b: 'erde', g: 'sonne-mond', soon: true, short: 'Mondphasen', title: 'Warum ändert der Mond seine <em>Form?</em>', teaser: 'Der Erdschatten ist es jedenfalls nicht.', tags: 'mond mondphasen vollmond neumond' },
    { slug: 'treibhaus', b: 'erde', g: 'klima', short: 'Treibhauseffekt', title: 'Wie wärmt <em>CO₂</em> die Erde?', teaser: 'Ein Gas, das nur 0,04 Prozent der Luft ausmacht. Wie kann das den ganzen Planeten wärmen?', tags: 'treibhauseffekt klima co2 klimawandel erwärmung infrarot', added: '2026-11-14' },
    { slug: 'gewitter', b: 'erde', g: 'klima', soon: true, short: 'Gewitter', title: 'Wie entsteht ein <em>Blitz?</em>', teaser: 'Eiskristalle reiben sich, und plötzlich fliessen 30\'000 Ampere.', tags: 'gewitter blitz donner wetter' },
    { slug: 'universum', b: 'erde', g: 'weltall', short: 'Universum', title: 'Wie gross ist das <em>Universum?</em>', teaser: 'Von der Ameise bis zur nächsten Galaxie: eine Reise durch dreissig Zehnerpotenzen.', tags: 'universum weltall galaxie sterne lichtjahr grösse', added: '2026-11-13' },
    { slug: 'schwarzeloecher', b: 'erde', g: 'weltall', soon: true, short: 'Schwarze Löcher', title: 'Was passiert in einem <em>Schwarzen Loch?</em>', teaser: 'Nicht einmal Licht kommt heraus.', tags: 'schwarzes loch weltall gravitation' },
    { slug: 'vulkane', b: 'erde', g: 'planet', soon: true, short: 'Vulkane', title: 'Warum spuckt die Erde <em>Feuer?</em>', teaser: 'Unter deinen Füssen schwimmen Kontinente.', tags: 'vulkan erdbeben platten lava' },

    /* ---------- Technik ---------- */
    { slug: 'strom', b: 'technik', g: 'energie', short: 'Strom', title: 'Wie funktioniert <em>Strom?</em>', teaser: 'Warum geht das Licht sofort an, obwohl die Elektronen langsamer kriechen als eine Schnecke?', tags: 'strom elektrizität elektronen spannung volt ampere', added: '2026-11-12' },
    { slug: 'kuehlschrank', b: 'technik', g: 'energie', short: 'Kühlschrank', title: 'Wie macht ein Kühlschrank <em>Kälte?</em>', teaser: 'Er macht gar keine Kälte. Er pumpt Wärme weg, und hinten wird es warm.', tags: 'kühlschrank kälte wärmepumpe verdampfen kältemittel', added: '2026-11-14' },
    { slug: 'akku', b: 'technik', g: 'energie', short: 'Akku', title: 'Wie speichert ein Akku <em>Strom?</em>', teaser: 'Eigentlich speichert er gar keinen Strom.', tags: 'akku batterie lithium laden', added: '2026-11-14' },
    { slug: 'internet', b: 'technik', g: 'digital', short: 'Internet', title: 'Wie funktioniert das <em>Internet?</em>', teaser: 'Wie kommt ein Foto in einer Zehntelsekunde nach New York? Nicht durch die Luft.', tags: 'internet netz glasfaser pakete router wlan', added: '2026-11-12' },
    { slug: 'ki', b: 'technik', g: 'digital', short: 'Künstliche Intelligenz', title: 'Was ist eigentlich <em>KI?</em>', teaser: 'Denkt ein Chatbot? Bau ein Mini-Sprachmodell und trainiere eine Maschine.', tags: 'ki künstliche intelligenz chatbot sprachmodell lernen neuronales netz', added: '2026-11-12' },
    { slug: 'verschluesselung', b: 'technik', g: 'digital', short: 'Verschlüsselung', title: 'Wie bleiben Geheimnisse <em>geheim?</em>', teaser: 'Du schickst deine Kartennummer durchs offene Internet. Warum kann sie trotzdem niemand lesen?', tags: 'verschlüsselung geheim passwort schlüssel https sicherheit caesar', added: '2026-11-14' },
    { slug: 'computer', b: 'technik', g: 'digital', short: 'Computer', title: 'Wie rechnet ein Computer nur mit <em>0 und 1?</em>', teaser: 'Milliarden winziger Schalter, die zusammen Musik abspielen.', tags: 'computer binär bits prozessor', added: '2026-11-14' },
    { slug: 'gps', b: 'technik', g: 'unterwegs', short: 'GPS', title: 'Woher weiss dein Handy, <em>wo du bist?</em>', teaser: 'Satelliten, sehr genaue Uhren und ein Trick mit Kreisen. Einstein hilft auch mit.', tags: 'gps navigation satellit handy ortung karte', added: '2026-11-13' },
    { slug: 'flugzeug', b: 'technik', g: 'unterwegs', short: 'Fliegen', title: 'Warum fliegt ein <em>Flugzeug?</em>', teaser: 'Hunderte Tonnen in der Luft. Die Erklärung aus vielen Schulbüchern stimmt leider nicht.', tags: 'flugzeug fliegen auftrieb flügel luft', added: '2026-11-13' },

    /* ---------- Geld & Gesellschaft ---------- */
    { slug: 'geld', b: 'gesellschaft', g: 'geld', short: 'Geld', title: 'Woher kommt <em>Geld?</em>', teaser: 'Das meiste Geld wurde nie gedruckt. Es entsteht, wenn jemand einen Kredit aufnimmt.', tags: 'geld bank kredit franken nationalbank', added: '2026-11-13' },
    { slug: 'zinseszins', b: 'gesellschaft', g: 'geld', short: 'Zinseszins', title: 'Wie wächst <em>Geld?</em>', teaser: 'Ein Rappen, jeden Tag verdoppelt. Wie viel ist es nach einem Monat?', tags: 'zinseszins zins sparen exponentiell wachstum', added: '2026-11-13' },
    { slug: 'inflation', b: 'gesellschaft', g: 'geld', short: 'Inflation', title: 'Warum wird alles <em>teurer?</em>', teaser: 'Ein Kaffee kostete früher einen Franken. Ist der Kaffee besser geworden oder das Geld schlechter?', tags: 'inflation teuerung preise kaufkraft geld', added: '2026-11-14' },
    { slug: 'lotto', b: 'gesellschaft', g: 'zufall', short: 'Wahrscheinlichkeit', title: 'Warum gewinnt das Casino <em>immer?</em>', teaser: 'Glück ist launisch, aber Zufall rechnet erstaunlich genau. Und das Casino kennt die Rechnung.', tags: 'wahrscheinlichkeit lotto casino zufall roulette glück statistik', added: '2026-11-14' },
    { slug: 'stau', b: 'gesellschaft', g: 'zusammenleben', short: 'Stau', title: 'Woher kommt Stau <em>aus dem Nichts?</em>', teaser: 'Kein Unfall, keine Baustelle, und trotzdem stehst du. Schuld ist ein kurzes Bremsen, weit vorne.', tags: 'stau verkehr auto autobahn', added: '2026-11-14' },
    { slug: 'wahlen', b: 'gesellschaft', g: 'zusammenleben', soon: true, short: 'Abstimmen', title: 'Ist die Mehrheit immer <em>fair?</em>', teaser: 'Drei Wahlverfahren, drei verschiedene Sieger.', tags: 'wahlen abstimmen demokratie mehrheit' },
  ],
};
