/* mindblow – Lektion Verschlüsselung */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(c => SUP[+c]).join('');
  // Grosse Zahlen lesbar: 1'234 · 4,3 Mrd. · 3,4 · 10³⁸
  const sci = n => { const e = Math.floor(Math.log10(n)); let m = n / Math.pow(10, e); if (m >= 9.95) return `1,0 · 10${sup(e + 1)}`; return `${fmt(m, 1)} · 10${sup(e)}`; };
  const big = n => n < 1e6 ? fmt(n, 0) : n < 1e9 ? `${fmt(n / 1e6, 1)} Mio.` : n < 1e12 ? `${fmt(n / 1e9, 1)} Mrd.` : sci(n);

  /* ---------- Teil 1: Caesar-Verschiebung ---------- */
  const caesarCv = $('#caesarCv');
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const MSGS = ['TREFFPUNKT UM ACHT', 'DAS PASSWORT IST GEHEIM', 'KOMM MORGEN ZUM BAHNHOF'];
  const shiftText = (t, k) => t.replace(/[A-Z]/g, ch => ABC[(ABC.indexOf(ch) + k + 26) % 26]);
  const CS = { shift: 3, shown: 3, msg: 0, crack: null };
  // crack: { k: aktueller Versuch, t: Zeit seit letztem Versuch, done }

  const updCaesar = () => {
    $('#shiftIn').value = CS.shift; $('#shiftOut').textContent = CS.shift;
    $('#cKey').textContent = CS.shift;
    const c = CS.crack;
    $('#cTries').textContent = c ? `${c.k} von 25` : '–';
  };
  const resetCrack = () => { CS.crack = null; $('#crackBtn').disabled = $('#shiftIn').disabled; updCaesar(); };
  $('#shiftIn').addEventListener('input', e => {
    CS.shift = +e.target.value; if (reduced) CS.shown = CS.shift;
    resetCrack();
    $('#caesarStatus').textContent = `A wird zu ${ABC[CS.shift]}, B zu ${ABC[(1 + CS.shift) % 26]}. Jeder Buchstabe rutscht um ${CS.shift} Stellen.`;
  });
  $$('#msgPick button').forEach(b => b.addEventListener('click', () => {
    CS.msg = +b.dataset.m;
    $$('#msgPick button').forEach(x => x.classList.toggle('active', x === b));
    resetCrack();
  }));
  $('#crackBtn').addEventListener('click', () => {
    CS.crack = { k: 1, t: 0, done: false };
    $('#crackBtn').disabled = true;
    $('#caesarStatus').textContent = 'Der Angreifer kennt das Verfahren, aber nicht den Schlüssel. Also probiert er einfach alle aus.';
    if (reduced) { CS.crack.k = CS.shift; CS.crack.done = true; crackDone(); }
    updCaesar();
  });
  const crackDone = () => {
    $('#crackBtn').disabled = false;
    $('#caesarStatus').textContent = `Geknackt nach ${CS.crack.k} Versuchen. Ein Computer schafft alle 25 in weniger als einer Millisekunde. Hier läuft es langsam, damit du zuschauen kannst.`;
    updCaesar();
  };
  updCaesar();

  const tickCrack = dt => {
    const c = CS.crack;
    if (!c || c.done) return;
    c.t += dt;
    if (c.t > .22) {
      c.t = 0;
      if (c.k >= CS.shift) { c.done = true; crackDone(); }
      else { c.k++; updCaesar(); }
    }
  };

  const drawCaesar = dt => {
    tickCrack(dt);
    // Alphabet gleitet sanft zur neuen Verschiebung
    if (!reduced) CS.shown += (CS.shift - CS.shown) * Math.min(1, dt * 10); else CS.shown = CS.shift;
    const { ctx, w, h } = fit(caesarCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420, pad = 14;
    const cw = (w - pad * 2) / 26, rh = 22, y1 = 30, y2 = y1 + rh + 6;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Klar oben, geheim unten' : 'Klartext-Alphabet oben, Geheim-Alphabet unten', pad, 20);
    // obere Reihe: normales Alphabet
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.min(13, cw * .95);
    for (let i = 0; i < 26; i++) {
      const x = pad + i * cw;
      roundRect(ctx, x + 1, y1, cw - 2, rh, 4); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.fillStyle = C.fg; ctx.font = `${fs}px ${MONO}`; ctx.fillText(ABC[i], x + cw / 2, y1 + rh / 2 + 1);
    }
    // untere Reihe: verschobenes Alphabet, gleitend
    ctx.save(); ctx.beginPath(); ctx.rect(pad, y2 - 2, w - pad * 2, rh + 4); ctx.clip();
    const off = CS.shown % 26;
    for (let j = -1; j < 27; j++) {
      const x = pad + (j - (off - Math.floor(off))) * cw;
      const letter = ABC[((j + Math.floor(off)) % 26 + 26) % 26];
      roundRect(ctx, x + 1, y2, cw - 2, rh, 4); ctx.fillStyle = C.accent; ctx.globalAlpha = .16; ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.accent; ctx.font = `500 ${fs}px ${MONO}`; ctx.fillText(letter, x + cw / 2, y2 + rh / 2 + 1);
    }
    ctx.restore();
    // Pfeil A → Schlüsselbuchstabe
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
    roundRect(ctx, pad + 1, y1 - 1, cw - 2, rh * 2 + 8, 5); ctx.stroke();

    // Klartext und Geheimtext
    const msg = MSGS[CS.msg], enc = shiftText(msg, CS.shift);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    let y = y2 + rh + 34;
    const fsz = narrow ? 13 : 16;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.fillText('Klartext', pad, y);
    ctx.font = `${fsz}px ${MONO}`; ctx.fillStyle = C.fg; ctx.fillText(msg, pad, y + 20, w - pad * 2);
    y += 46;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.fillText('Geheimtext (das sieht der Lauscher)', pad, y, w - pad * 2);
    ctx.font = `500 ${fsz}px ${MONO}`; ctx.fillStyle = C.copper; ctx.fillText(enc, pad, y + 20, w - pad * 2);

    // Knack-Feld
    const by = y + 36, bh = h - by - 12;
    roundRect(ctx, pad, by, w - pad * 2, bh, 12); ctx.fillStyle = C.sunk; ctx.fill();
    const c = CS.crack;
    ctx.font = `11px ${MONO}`;
    if (!c) {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'Drück «Knack es»' : 'Drück «Knack es», um alle Schlüssel durchzuprobieren', w / 2, by + bh / 2 + 4);
      return;
    }
    const lines = Math.max(1, Math.floor((bh - 14) / 17));
    const from = Math.max(1, c.k - lines + 1);
    for (let k = from, i = 0; k <= c.k; k++, i++) {
      const ly = by + 18 + i * 17;
      const hit = c.done && k === CS.shift;
      const txt = `${narrow ? 'S' : 'Schlüssel '}${String(k).padStart(2, ' ')}: ${shiftText(enc, -k)}`;
      if (hit) { roundRect(ctx, pad + 6, ly - 12, w - pad * 2 - 12, 17, 6); ctx.fillStyle = C.good; ctx.globalAlpha = .18; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.textAlign = 'left';
      ctx.fillStyle = hit ? C.good : k === c.k ? C.fg : C.muted;
      ctx.font = `${hit ? '600 ' : ''}11px ${MONO}`;
      ctx.fillText(txt, pad + 12, ly, w - pad * 2 - 24);
    }
  };

  /* ---------- Teil 2: Schlüssellänge ---------- */
  const bitsCv = $('#bitsCv');
  const RATE = 1e9;                         // Versuche pro Sekunde
  const YEAR = 365.25 * 86400;
  const UNIVERSE = 13.8e9 * YEAR;           // Sekunden
  const BS = { bits: 40, shown: 40 };
  const dur = s => {
    if (s < 1e-3) return 'unter 1 ms';
    if (s < 1) return `${fmt(s * 1000, 0)} ms`;
    if (s < 60) return `${fmt(s, s < 10 ? 1 : 0)} s`;
    if (s < 3600) return `${fmt(s / 60, 0)} min`;
    if (s < 86400) return `${fmt(s / 3600, 1)} h`;
    if (s < YEAR) return `${fmt(s / 86400, 0)} Tage`;
    return `${big(s / YEAR)} Jahre`;
  };
  const compare = s => {
    if (s < .3) return 'schneller als ein Lidschlag';
    if (s < 3600) return 'eine Kaffeepause';
    if (s < YEAR) return 'weniger als ein Jahr';
    if (s < 80 * YEAR) return 'innerhalb eines Menschenlebens';
    if (s < UNIVERSE) return `${big(s / (80 * YEAR))} Menschenleben`;
    return `${big(s / UNIVERSE)} × Alter des Universums`;
  };
  const updBits = () => {
    const b = BS.bits, n = Math.pow(2, b), s = n / RATE;
    $('#bitsIn').value = b; $('#bitsOut').textContent = `${b} Bit`;
    $('#bKeys').textContent = big(n);
    $('#bPow').textContent = `2 hoch ${b}`;
    $('#bTime').textContent = dur(s);
    $('#bComp').textContent = compare(s);
    let st = 'Vereinfacht: Der Angreifer probiert stur alle Schlüssel durch.';
    if (b === 56) st = 'DES mit 56 Bit war bis in die 1990er Standard. 1998 hat eine Spezialmaschine einen DES-Schlüssel in gut zwei Tagen geknackt.';
    else if (b === 128) st = '128 Bit nutzt dein Browser heute für fast jede Seite mit Schloss. Durchprobieren ist hoffnungslos.';
    else if (b >= 129) st = 'Jedes Bit mehr verdoppelt die Zeit. Die Zahlen sind längst jenseits jeder Vorstellung.';
    $('#bitsStatus').textContent = st;
  };
  $('#bitsIn').addEventListener('input', e => { BS.bits = +e.target.value; if (reduced) BS.shown = BS.bits; updBits(); });
  [['#b56', 56], ['#b128', 128], ['#b256', 256]].forEach(([id, v]) => $(id).addEventListener('click', () => { BS.bits = v; if (reduced) BS.shown = v; updBits(); }));
  updBits();

  // senkrecht: log10 der Sekunden
  const Y0 = -10, Y1 = 70;
  const ZONES = [
    { to: 0, name: 'sofort', col: 'good' },
    { to: Math.log10(80 * YEAR), name: 'machbar', col: 'glow' },
    { to: Math.log10(UNIVERSE), name: 'hoffnungslos', col: 'copper' },
    { to: Y1, name: 'länger als das Universum alt ist', short: 'älter als Universum', col: 'bad' },
  ];
  const drawBits = dt => {
    if (!reduced) BS.shown += (BS.bits - BS.shown) * Math.min(1, dt * 9); else BS.shown = BS.bits;
    const { ctx, w, h } = fit(bitsCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const L = narrow ? 14 : 22, R = 14, T = 16, B = 44;
    const pw = w - L - R, ph = h - T - B;
    const X = b => L + (b - 8) / (256 - 8) * pw;
    const Y = v => T + ph - (v - Y0) / (Y1 - Y0) * ph;
    // Zonen
    let lo = Y0;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = `11px ${MONO}`;
    for (const z of ZONES) {
      const ya = Y(z.to), yb = Y(lo);
      ctx.fillStyle = C[z.col]; ctx.globalAlpha = .1; ctx.fillRect(L, ya, pw, yb - ya); ctx.globalAlpha = 1;
      ctx.strokeStyle = C[z.col]; ctx.globalAlpha = .5; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, ya); ctx.lineTo(L + pw, ya); ctx.stroke(); ctx.globalAlpha = 1;
      if (yb - ya > 16) { const top = z.to === Y1; ctx.textAlign = top ? 'left' : 'right'; ctx.fillStyle = C[z.col]; ctx.fillText(narrow && z.short ? z.short : z.name, top ? L + 6 : L + pw - 6, ya + 4); }
      lo = z.to;
    }
    // Kurve: Zeit = 2^b / 1 Mrd.
    const f = b => b * Math.LOG10E * Math.log(2) - 9;
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
    ctx.beginPath();
    for (let b = 8; b <= 256; b += 2) { const x = X(b), y = Y(f(b)); b === 8 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // Markierungen
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    for (const b of [8, 56, 128, 256]) {
      const x = X(b);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x, T + ph); ctx.lineTo(x, T + ph + 5); ctx.stroke();
      ctx.textAlign = b === 8 ? 'left' : b === 256 ? 'right' : 'center';
      ctx.fillText(String(b), x, T + ph + 8);
    }
    ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Schlüssellänge in Bit' : 'Schlüssellänge in Bit · senkrecht: Zeit in Zehnerstufen', L + pw / 2, T + ph + 24, w - 20);
    // aktueller Punkt
    const cb = BS.shown, cx = X(cb), cy = Y(f(cb));
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, T + ph); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.surface; ctx.stroke();
    // Beschriftung am Punkt
    const label = `${Math.round(cb)} Bit: ${dur(Math.pow(2, Math.round(cb)) / RATE)}`;
    ctx.font = `12px ${MONO}`;
    const tw = ctx.measureText(label).width + 18;
    const lx = clamp(cx - tw / 2, 6, w - tw - 6), ly = cy - 36 < T ? cy + 14 : cy - 36;
    roundRect(ctx, lx, ly, tw, 24, 12); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, lx + 9, ly + 12.5);
  };

  /* ---------- Teil 3: Farben mischen statt treffen ---------- */
  const dhCv = $('#dhCv');
  const PUBLIC = [240, 200, 40];            // öffentliches Gelb, bewusst feste Farbe
  const hsl = hue => {                      // Sättigung 85 %, Helligkeit 50 %
    const s = .85, l = .5, k = n => (n + hue / 30) % 12, a = s * Math.min(l, 1 - l);
    return [0, 8, 4].map(n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))));
  };
  // Vereinfachte Mischung: gleiche Teile, Mittelwert der Farbanteile
  const mixOf = (...cols) => [0, 1, 2].map(i => cols.reduce((s, c) => s + c[i], 0) / cols.length);
  const css = c => `rgb(${c.map(Math.round).join(',')})`;
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const DH = { a: 350, b: 210, step: 0, t: 1 };
  const STEPS = [
    'Schritt 1 von 4: Alle kennen die öffentliche Farbe Gelb. Auch Eva.',
    'Schritt 2 von 4: Anna und Ben wählen je eine geheime Farbe. Die verlässt nie ihr Zimmer.',
    'Schritt 3 von 4: Jeder mischt Gelb mit seiner Geheimfarbe und schickt die Mischung los. Eva sieht beide Mischungen.',
    'Schritt 4 von 4: Jeder gibt seine Geheimfarbe in die Mischung des anderen. Beide haben jetzt dieselbe Farbe. Eva nicht.',
  ];
  const dhColors = () => {
    const a = hsl(DH.a), b = hsl(DH.b);
    const ma = mixOf(PUBLIC, a), mb = mixOf(PUBLIC, b);
    // Anna: (Gelb + B) + A = Gelb + A + B, je ein Teil
    const fa = mixOf(PUBLIC, b, a), fb = mixOf(PUBLIC, a, b);
    const fe = mixOf(PUBLIC, a, PUBLIC, b);  // Eva: beide Mischungen, doppelt Gelb
    return { a, b, ma, mb, fa, fb, fe };
  };
  const updDH = () => {
    $('#aIn').value = DH.a; $('#aOut').textContent = `${DH.a}°`;
    $('#bIn').value = DH.b; $('#bOut').textContent = `${DH.b}°`;
    $('#dhStatus').textContent = STEPS[DH.step];
    const k = dhColors(), done = DH.step === 3;
    $('#dA').textContent = done ? hex(k.fa) : '–';
    $('#dB').textContent = done ? hex(k.fb) : '–';
    $('#dE').textContent = done ? hex(k.fe) : '–';
    $('#dhNext').disabled = $('#aIn').disabled || done;
  };
  $('#aIn').addEventListener('input', e => { DH.a = +e.target.value; updDH(); });
  $('#bIn').addEventListener('input', e => { DH.b = +e.target.value; updDH(); });
  $('#dhNext').addEventListener('click', () => { DH.step = Math.min(3, DH.step + 1); DH.t = reduced ? 1 : 0; updDH(); });
  $('#dhReset').addEventListener('click', () => { DH.step = 0; DH.t = 1; updDH(); });
  updDH();

  const blob = (ctx, x, y, r, col, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = css(col); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const ghost = (ctx, x, y, r) => {
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.font = `600 ${r * .8}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', x, y + 1);
  };
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const drawDH = dt => {
    if (DH.t < 1) DH.t = Math.min(1, DH.t + dt / .9);
    const { ctx, w, h } = fit(dhCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420, k = dhColors(), s = DH.step, t = ease(DH.t);
    const cols = [w * .17, w * .5, w * .83];
    const colW = w / 3;
    // Evas Spalte als Lauschzone
    roundRect(ctx, colW + 6, 8, colW - 12, h - 16, 14); ctx.fillStyle = C.bad; ctx.globalAlpha = .07; ctx.fill(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `600 13px ${MONO}`;
    ctx.fillStyle = C.fg; ctx.fillText('Anna', cols[0], 30); ctx.fillText('Ben', cols[2], 30);
    ctx.fillStyle = C.bad; ctx.fillText(narrow ? 'Eva' : 'Eva (hört mit)', cols[1], 30);
    const r = Math.min(22, colW * .18);
    const rows = [72, 140, 208, 276, 352].map(v => v * (h / 420));
    const cap = (txt, x, y) => { ctx.font = `10.5px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(txt, x, y + r + 14, colW - 10); };

    // Zeile 1: öffentlich
    for (const x of cols) { blob(ctx, x, rows[0], r, PUBLIC); cap('öffentlich', x, rows[0]); }
    // Zeile 2: geheim
    if (s >= 1) {
      const al = s === 1 ? t : 1;
      blob(ctx, cols[0], rows[1], r, k.a, al); cap('geheim', cols[0], rows[1]);
      blob(ctx, cols[2], rows[1], r, k.b, al); cap('geheim', cols[2], rows[1]);
      ghost(ctx, cols[1], rows[1], r); cap(narrow ? 'unbekannt' : 'sieht sie nie', cols[1], rows[1]);
    }
    // Zeile 3: eigene Mischung, wird verschickt
    if (s >= 2) {
      blob(ctx, cols[0], rows[2], r, k.ma); cap(narrow ? 'Gelb + A' : 'Gelb + Anna', cols[0], rows[2]);
      blob(ctx, cols[2], rows[2], r, k.mb); cap(narrow ? 'Gelb + B' : 'Gelb + Ben', cols[2], rows[2]);
      // unterwegs: Mischungen fliegen zur anderen Seite (Zeile 4), Eva kopiert mit
      const p = s === 2 ? t : 1;
      const yA = rows[2] + (rows[3] - rows[2]) * p;
      const ra = r * .8;
      if (p < 1) {
        blob(ctx, cols[0] + (cols[2] - cols[0]) * p, yA, ra, k.ma);
        blob(ctx, cols[2] + (cols[0] - cols[2]) * p, yA, ra, k.mb);
      }
      if (p > .45) {
        const al = clamp((p - .45) / .3, 0, 1);
        blob(ctx, cols[1] - r * .75, rows[2], r * .7, k.ma, al);
        blob(ctx, cols[1] + r * .75, rows[2], r * .7, k.mb, al);
        cap('abgefangen', cols[1], rows[2]);
      }
      if (p >= 1) {
        blob(ctx, cols[0], rows[3], r, k.mb); cap(narrow ? 'von Ben' : 'erhalten von Ben', cols[0], rows[3]);
        blob(ctx, cols[2], rows[3], r, k.ma); cap(narrow ? 'von Anna' : 'erhalten von Anna', cols[2], rows[3]);
      }
      // Pfeil durch Evas Zone
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(cols[0] + r + 4, rows[2] + 6); ctx.lineTo(cols[2] - r - 4, rows[3] - 6);
      ctx.moveTo(cols[2] - r - 4, rows[2] + 6); ctx.lineTo(cols[0] + r + 4, rows[3] - 6); ctx.stroke(); ctx.setLineDash([]);
    }
    // Zeile 5: Ergebnis
    if (s >= 3) {
      const al = t, R5 = r * 1.2;
      blob(ctx, cols[0], rows[4], R5, k.fa, al);
      blob(ctx, cols[2], rows[4], R5, k.fb, al);
      blob(ctx, cols[1], rows[4], R5, k.fe, al);
      ctx.globalAlpha = al;
      ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.good;
      ctx.fillText(narrow ? 'gleich' : 'gemeinsam', cols[0], rows[4] + R5 + 16);
      ctx.fillText(narrow ? 'gleich' : 'gemeinsam', cols[2], rows[4] + R5 + 16);
      ctx.fillStyle = C.bad; ctx.fillText(narrow ? 'falsch' : 'zu viel Gelb', cols[1], rows[4] + R5 + 16);
      ctx.globalAlpha = 1;
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('verschluesselung', 4, {
    caesarLock: () => { ['#shiftIn', '#crackBtn'].forEach(s => $(s).disabled = false); $$('#msgPick button').forEach(b => b.disabled = false); },
    bitsLock: () => { ['#bitsIn', '#b56', '#b128', '#b256'].forEach(s => $(s).disabled = false); },
    dhLock: () => { ['#aIn', '#bIn', '#dhReset'].forEach(s => $(s).disabled = false); updDH(); },
  });

  loop(dt => { drawCaesar(dt); drawBits(dt); drawDH(dt); });
})();
