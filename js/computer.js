/* mindblow – Lektion Computer */
(() => {
  const { $, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const SANS = 'Outfit, sans-serif';
  let T = 0; // laufende Zeit für Animationen

  // Grosse Zahlen in Worten: 3 Mrd., 1,2 Bio.
  const big = n => {
    if (n < 1e6) return fmt(Math.floor(n), 0);
    if (n < 1e9) return `${fmt(n / 1e6, n < 1e7 ? 1 : 0)} Mio.`;
    if (n < 1e12) return `${fmt(n / 1e9, n < 1e10 ? 1 : 0).replace(/,0$/, '')} Mrd.`;
    return `${fmt(n / 1e12, n < 1e13 ? 1 : 0).replace(/,0$/, '')} Bio.`;
  };
  // Zeitdauer in Sekunden lesbar machen
  const dur = s => {
    if (s < 60) return `${fmt(s, 0)} s`;
    if (s < 3600) return `${fmt(s / 60, 0)} min`;
    if (s < 86400) return `${fmt(s / 3600, s < 36000 ? 1 : 0)} h`;
    if (s < 3.156e7) return `${fmt(s / 86400, s < 864000 ? 1 : 0)} Tage`;
    const y = s / 3.156e7;
    if (y < 1e6) return `${fmt(y, y < 10 ? 1 : 0)} Jahre`;
    return `${fmt(y / 1e6, 1)} Mio. Jahre`;
  };
  const freqTxt = f => {
    if (f >= 1e9) return `${fmt(f / 1e9, f % 1e9 ? 1 : 0)} GHz`;
    if (f >= 1e6) return `${fmt(f / 1e6, 0)} MHz`;
    if (f >= 1e3) return `${fmt(f / 1e3, 0)} kHz`;
    return `${fmt(f, 0)} Hz`;
  };
  const wire = (ctx, pts, on, speed = 70) => {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = on ? C.accent : C.line; ctx.lineWidth = on ? 3 : 2;
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    if (!on || reduced) return;
    // Lichtpunkte wandern entlang der Leitung
    const segs = []; let len = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); len += l; }
    ctx.fillStyle = C.glow;
    for (let d = (T * speed) % 26; d < len; d += 26) {
      let r = d, i = 0;
      while (i < segs.length - 1 && r > segs[i]) { r -= segs[i]; i++; }
      const k = segs[i] ? r / segs[i] : 0;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
    }
  };
  const lampDraw = (ctx, x, y, r, on, glow = 1) => {
    ctx.save();
    if (on > .05) { ctx.shadowColor = C.glow; ctx.shadowBlur = 22 * on * glow; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = C.sunk; ctx.fill();
    if (on > .02) { ctx.globalAlpha = on; ctx.fillStyle = C.glow; ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.strokeStyle = on > .5 ? C.accent : C.line; ctx.lineWidth = 1.5; ctx.stroke();
  };

  /* ---------- Teil 1: Binärzahlen ---------- */
  const bitCv = $('#bitCv');
  const B = { n: 0, lit: Array(8).fill(0), on: false };
  const VAL = [128, 64, 32, 16, 8, 4, 2, 1];
  const letter = n => (n >= 65 && n <= 90) || (n >= 97 && n <= 122) ? String.fromCharCode(n) : null;
  const updBits = msg => {
    const n = B.n;
    $('#numIn').value = n; $('#numOut').textContent = String(n);
    $('#bDec').textContent = String(n);
    const ch = letter(n);
    const chEl = $('#bChr');
    chEl.textContent = ch ? `«${ch}»` : 'kein Buchstabe';
    chEl.style.fontSize = ch ? '' : '15px';
    const bin = n.toString(2).padStart(8, '0');
    $('#bBin').textContent = `${bin.slice(0, 4)} ${bin.slice(4)}`;
    if (msg) $('#bitStatus').textContent = msg;
    else {
      const parts = VAL.filter(v => n & v);
      $('#bitStatus').textContent = n === 0 ? 'Alle Lampen aus: 0.'
        : `${parts.join(' + ')} = ${n}${ch ? `. Als Buchstabe gelesen: ${ch}` : ''}`;
    }
  };
  const setN = (n, msg) => { B.n = n & 255; updBits(msg); };
  $('#numIn').addEventListener('input', e => setN(+e.target.value));
  $('#bPlus').addEventListener('click', () => {
    if (B.n === 255) setN(0, 'Überlauf! 255 + 1 braucht eine neunte Stelle. Die gibt es hier nicht, also springt alles auf 0.');
    else setN(B.n + 1);
  });
  $('#bA').addEventListener('click', () => setN(65, '64 + 1 = 65. Im ASCII-Code steht 65 für A. Probier +1: Dann kommt B.'));
  $('#bClear').addEventListener('click', () => setN(0));
  bitCv.addEventListener('pointerdown', e => {
    if (!B.on) return;
    const r = bitCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const m = 14, cw = (r.width - 2 * m) / 8, i = Math.floor((x - m) / cw);
    if (i < 0 || i > 7 || y < 30 || y > 215) return;
    setN(B.n ^ VAL[i]);
  });
  updBits();

  const drawBits = dt => {
    const { ctx, w, h } = fit(bitCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420, m = 14, cw = (w - 2 * m) / 8;
    const r = Math.min(cw * .36, 22);
    ctx.textAlign = 'center';
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'Stellenwert' : 'Stellenwert: jede Stelle doppelt so viel wie rechts davon', w / 2, 22);
    for (let i = 0; i < 8; i++) {
      const on = (B.n & VAL[i]) ? 1 : 0;
      B.lit[i] = reduced ? on : B.lit[i] + (on - B.lit[i]) * Math.min(1, dt * 14);
      const cx = m + cw * (i + .5);
      ctx.fillStyle = on ? C.fg : C.muted; ctx.font = `500 ${narrow ? 12 : 14}px ${MONO}`;
      ctx.fillText(String(VAL[i]), cx, 50);
      lampDraw(ctx, cx, 92, r, B.lit[i]);
      ctx.fillStyle = on ? C.fg : C.muted; ctx.font = `500 ${narrow ? 18 : 22}px ${MONO}`;
      ctx.fillText(on ? '1' : '0', cx, 150);
      // kleiner Kippschalter
      const sw = Math.min(cw * .5, 26), sh = 14, sx = cx - sw / 2, sy = 172;
      roundRect(ctx, sx, sy, sw, sh, sh / 2); ctx.fillStyle = on ? C.accent : C.sunk; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx + sh / 2 + (sw - sh) * B.lit[i], sy + sh / 2, sh / 2 - 2, 0, TAU);
      ctx.fillStyle = C.surface; ctx.fill();
    }
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'antippen: an oder aus' : 'Lampe antippen: Schalter an (1) oder aus (0)', w / 2, 210);
    // Ergebnis
    const ch = letter(B.n);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 17 : 20}px ${MONO}`;
    ctx.fillText(`= ${B.n}${ch ? `  →  ${ch}` : ''}`, w / 2, 250);
  };

  /* ---------- Teil 2: Halbaddierer ---------- */
  const gateCv = $('#gateCv');
  const G = { a: 0, b: 0, on: false, demo: -1, demoT: 0 };
  const caseMsg = () => {
    const { a, b } = G;
    if (!a && !b) return '0 + 0 = 0. Kein Eingang führt Strom, also leuchtet nichts.';
    if (a !== b) return `${a} + ${b} = 1. ODER gibt 1, UND gibt 0. NICHT dreht die 0 zu 1. Beide Eingänge des letzten UND sind 1: Summe 1.`;
    return '1 + 1 = 10. UND gibt 1, das ist der Übertrag. NICHT dreht ihn zu 0, darum ist die Summe 0.';
  };
  const updGate = () => {
    const sum = (G.a | G.b) & ~(G.a & G.b) & 1, carry = G.a & G.b;
    $('#gCalc').textContent = `${G.a} + ${G.b}`;
    $('#gBin').textContent = `${carry}${sum}`;
    $('#gDec').textContent = String(carry * 2 + sum);
    $('#gA').textContent = `A umschalten (${G.a})`;
    $('#gB').textContent = `B umschalten (${G.b})`;
    $('#gateStatus').textContent = caseMsg();
  };
  const stopDemo = () => { G.demo = -1; $('#gAll').textContent = 'Alle vier Fälle zeigen'; };
  $('#gA').addEventListener('click', () => { stopDemo(); G.a ^= 1; updGate(); });
  $('#gB').addEventListener('click', () => { stopDemo(); G.b ^= 1; updGate(); });
  $('#gAll').addEventListener('click', () => {
    if (G.demo >= 0) { stopDemo(); return; }
    G.demo = 0; G.demoT = 0; G.a = 0; G.b = 0; updGate();
    $('#gAll').textContent = 'Anhalten';
  });
  let gateHit = [];
  gateCv.addEventListener('pointerdown', e => {
    if (!G.on) return;
    const r = gateCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (const [k, hx, hy] of gateHit) if (Math.hypot(x - hx, y - hy) < 28) { stopDemo(); G[k] ^= 1; updGate(); }
  });
  updGate();

  const gateBox = (ctx, x, y, bw, bh, name, out, narrow) => {
    ctx.save();
    if (out) { ctx.shadowColor = C.glow; ctx.shadowBlur = 16; }
    roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 8); ctx.fillStyle = C.surface; ctx.fill();
    ctx.restore();
    roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 8);
    ctx.strokeStyle = out ? C.accent : C.line; ctx.lineWidth = out ? 2 : 1.5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 10 : 12}px ${MONO}`;
    ctx.fillText(name, x, y - 2);
    ctx.fillStyle = out ? C.accent : C.muted; ctx.font = `500 ${narrow ? 10 : 11}px ${MONO}`;
    ctx.fillText(`→ ${out}`, x, y + 12);
  };
  const drawGate = dt => {
    if (G.demo >= 0) {
      G.demoT += dt;
      if (G.demoT > (reduced ? 3 : 2.4)) {
        G.demoT = 0; G.demo++;
        if (G.demo > 3) stopDemo();
        else { G.a = G.demo >> 1; G.b = G.demo & 1; updGate(); }
      }
    }
    const { ctx, w, h } = fit(gateCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const X = u => u * w, Y = v => v * h;
    const bw = narrow ? 54 : 74, bh = 38;
    const A = G.a, Bv = G.b, OR = A | Bv, AND = A & Bv, NOT = AND ^ 1, SUM = OR & NOT;
    // Lage der Bauteile
    const yA = Y(.26) - 9, yB = Y(.62) + 9;
    const sx = X(.07) + 4, sr = narrow ? 16 : 19;
    const orX = X(.33), orY = Y(.26), andX = X(.33), andY = Y(.62);
    const notX = X(.56), notY = Y(.44), and2X = X(.79), and2Y = Y(.30);
    const jX = X(.46), carryY = Y(.84), lampX = w - 20;
    // Leitungen
    wire(ctx, [[sx + sr, yA], [orX - bw / 2, yA]], A);
    wire(ctx, [[X(.17), yA], [X(.17), andY - 9], [andX - bw / 2, andY - 9]], A);
    wire(ctx, [[sx + sr, yB], [andX - bw / 2, yB]], Bv);
    wire(ctx, [[X(.23), yB], [X(.23), orY + 9], [orX - bw / 2, orY + 9]], Bv);
    wire(ctx, [[orX + bw / 2, orY], [X(.64), orY], [X(.64), and2Y - 9], [and2X - bw / 2, and2Y - 9]], OR);
    wire(ctx, [[andX + bw / 2, andY], [jX, andY], [jX, notY], [notX - bw / 2, notY]], AND);
    wire(ctx, [[jX, andY], [jX, carryY], [lampX - 12, carryY]], AND);
    wire(ctx, [[notX + bw / 2, notY], [X(.69), notY], [X(.69), and2Y + 9], [and2X - bw / 2, and2Y + 9]], NOT);
    wire(ctx, [[and2X + bw / 2, and2Y], [lampX - 12, and2Y]], SUM);
    // Verbindungspunkte
    for (const [x, y, v] of [[X(.17), yA, A], [X(.23), yB, Bv], [jX, andY, AND]]) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = v ? C.accent : C.muted; ctx.fill();
    }
    // Gatter
    gateBox(ctx, orX, orY, bw, bh, 'ODER', OR, narrow);
    gateBox(ctx, andX, andY, bw, bh, 'UND', AND, narrow);
    gateBox(ctx, notX, notY, bw, bh, 'NICHT', NOT, narrow);
    gateBox(ctx, and2X, and2Y, bw, bh, 'UND', SUM, narrow);
    // Eingänge
    gateHit = [['a', sx, yA], ['b', sx, yB]];
    for (const [k, y, v] of [['A', yA, A], ['B', yB, Bv]]) {
      lampDraw(ctx, sx, y, sr, v, .8);
      ctx.textAlign = 'center'; ctx.fillStyle = v ? '#121310' : C.fg; ctx.font = `600 ${narrow ? 13 : 15}px ${MONO}`;
      ctx.fillText(k, sx, y + 5);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      ctx.fillText(`= ${v}`, sx, y + sr + 14);
    }
    // Ausgänge
    for (const [name, y, v] of [['Summe', and2Y, SUM], ['Übertrag', carryY, AND]]) {
      lampDraw(ctx, lampX, y, 11, v);
      ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
      ctx.fillText(`${name} ${v}`, w - 8, y - 18);
    }
    // Kopf- und Fusszeile
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'Halbaddierer' : 'Halbaddierer aus vier Gattern', 12, 20);
    ctx.fillText(narrow ? 'A, B antippen' : 'A oder B antippen', 12, h - 14);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    ctx.fillText(`${A} + ${Bv} = ${AND}${SUM}`, narrow ? X(.62) : X(.56), carryY + (narrow ? 30 : 28));
  };

  /* ---------- Teil 3: Takt und Tempo ---------- */
  const clockCv = $('#clockCv');
  // Schöne Werte für den Regler: 1, 2, 5, 10 … bis 1 GHz, dann 2 bis 5 GHz
  const FREQS = [];
  for (let e = 0; e < 9; e++) for (const m of [1, 2, 5]) FREQS.push(m * 10 ** e);
  FREQS.push(1e9, 2e9, 3e9, 4e9, 5e9);
  const K = { f: 3e9, k: 1, t: 0, chip: 0, phase: 0, on: false };
  const fIn = $('#fIn'), kIn = $('#kIn');
  fIn.max = FREQS.length - 1;
  const nearest = f => FREQS.reduce((bi, v, i) => Math.abs(Math.log(v / f)) < Math.abs(Math.log(FREQS[bi] / f)) ? i : bi, 0);
  const restart = () => { K.t = 0; K.chip = 0; };
  const updClock = () => {
    fIn.value = nearest(K.f); kIn.value = K.k;
    $('#fOut').textContent = freqTxt(K.f);
    $('#kOut').textContent = String(K.k);
    const ops = K.f * K.k;
    $('#cOps').textContent = big(ops);
    $('#cHuman').textContent = dur(ops);
    const tk = 1 / K.f;
    const [v, u] = tk >= 1 ? [tk, 's'] : tk >= 1e-3 ? [tk * 1e3, 'ms'] : tk >= 1e-6 ? [tk * 1e6, 'µs'] : [tk * 1e9, 'ns'];
    $('#cTick').textContent = `${fmt(v, v < 10 ? 2 : v < 100 ? 1 : 0)} ${u}`;
  };
  fIn.value = nearest(K.f);
  fIn.addEventListener('input', () => {
    K.f = FREQS[+fIn.value]; updClock();
    $('#clockStatus').textContent = K.f < 1e3 ? 'So langsam könntest du die Schritte noch mitzählen.'
      : K.f < 1e9 ? 'Schon schneller, als du je zählen könntest. Heutige Chips sind aber noch viel schneller.'
      : `${freqTxt(K.f)}: ${big(K.f)} Takte pro Sekunde. Vereinfacht: ein Kern schafft hier eine Addition pro Takt.`;
  });
  kIn.addEventListener('input', () => {
    K.k = +kIn.value; updClock();
    $('#clockStatus').textContent = `${K.k} ${K.k === 1 ? 'Kern rechnet' : 'Kerne rechnen'} gleichzeitig. Jeder ist ein eigenes Rechenwerk.`;
  });
  $('#cOld').addEventListener('click', () => {
    K.f = 740e3; K.k = 1; updClock(); restart();
    $('#clockStatus').textContent = 'Der erste Mikroprozessor von 1971 lief mit rund 740 Kilohertz. Eine Addition brauchte dort sogar mehrere Takte (vereinfacht).';
  });
  $('#cNow').addEventListener('click', () => {
    K.f = 3e9; K.k = 8; updClock(); restart();
    $('#clockStatus').textContent = 'Ein Handychip mit 8 Kernen bei rund 3 GHz. Echte Kerne schaffen oft sogar mehrere Schritte pro Takt. Hier vereinfacht nur einen.';
  });
  $('#cRace').addEventListener('click', restart);
  updClock();

  const drawClock = dt => {
    const { ctx, w, h } = fit(clockCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420, m = 16;
    const ops = K.f * K.k;
    if (K.on) { K.t += dt; K.chip += ops * dt; }
    // A: Taktsignal, stark verlangsamt
    const lg = Math.log10(K.f);
    const vis = .4 + lg / 9.7 * 3.6; // sichtbare Takte pro Sekunde
    if (!reduced) K.phase += dt * vis;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'Takt (verlangsamt)' : 'Taktsignal (stark verlangsamt)', m, 20);
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
    ctx.fillText(`${freqTxt(K.f)} × ${K.k} ${narrow ? 'K.' : (K.k === 1 ? 'Kern' : 'Kerne')}`, w - m, 20);
    const wy0 = 36, wy1 = 76, per = narrow ? 44 : 60;
    ctx.save(); ctx.beginPath(); ctx.rect(m, 0, w - 2 * m, h); ctx.clip();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath();
    const off = (K.phase % 1) * per;
    for (let x = -per + off; x < w; x += per) {
      const a = x, b = x + per / 2, c = x + per;
      ctx.moveTo(a, wy1); ctx.lineTo(a, wy0); ctx.lineTo(b, wy0); ctx.lineTo(b, wy1); ctx.lineTo(c, wy1);
    }
    ctx.stroke(); ctx.restore();
    // B: Wettrennen
    const rows = [['Mensch', Math.floor(K.t), '1 pro Sekunde'], ['Chip', K.chip, `${big(ops)} pro Sekunde`]];
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(`Additionen seit ${fmt(K.t, 0)} s`, m, 112);
    rows.forEach(([name, n, rate], i) => {
      const y = 142 + i * 40;
      roundRect(ctx, m, y - 20, w - 2 * m, 32, 8); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${SANS}`;
      ctx.fillText(name, m + 10, y);
      if (!narrow) { ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.fillText(rate, m + 74, y); }
      ctx.textAlign = 'right'; ctx.fillStyle = i ? C.accent : C.fg; ctx.font = `500 ${narrow ? 14 : 16}px ${MONO}`;
      ctx.fillText(big(n), w - m - 10, y + 1);
    });
    // C: Zeitachse, logarithmisch
    const ax0 = m + 4, ax1 = w - m - 4, ay = 300, MAXE = 12;
    const AX = s => ax0 + (ax1 - ax0) * clamp(Math.log10(Math.max(1, s)) / MAXE, 0, 1);
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'Mensch für 1 s Chiparbeit' : 'So lange bräuchte ein Mensch für 1 Sekunde Chiparbeit', m, 236);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    const marks = [[1, '1 s', '1 s'], [60, '1 Minute', 'Min.'], [86400, '1 Tag', 'Tag'], [3.156e7, '1 Jahr', 'Jahr'],
      [2.52e9, '80 Jahre', '80 J.'], [1.42e11, 'Pyramiden', 'Pyram.']];
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    marks.forEach(([s, l, ls], i) => {
      const x = AX(s);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, ay - 5); ctx.lineTo(x, ay + 5); ctx.stroke();
      ctx.fillStyle = C.muted;
      const lab = narrow ? ls : l, tw = ctx.measureText(lab).width;
      ctx.fillText(lab, clamp(x, ax0 + tw / 2 - 4, ax1 - tw / 2 + 4), ay + (i % 2 ? 32 : 19));
    });
    // Markierung
    const mx = AX(ops);
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.moveTo(mx, ay - 4); ctx.lineTo(mx - 7, ay - 16); ctx.lineTo(mx + 7, ay - 16); ctx.closePath(); ctx.fill();
    ctx.font = `500 13px ${MONO}`;
    const lab = dur(ops), tw = ctx.measureText(lab).width;
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText(lab, clamp(mx, ax0 + tw / 2, ax1 - tw / 2), ay - 24);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Achse logarithmisch' : 'logarithmische Achse: gleicher Abstand = gleiches Vielfaches', m, h - 12);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('computer', 4, {
    bitLock: () => { ['#numIn', '#bPlus', '#bA', '#bClear'].forEach(s => $(s).disabled = false); B.on = true; },
    gateLock: () => { ['#gA', '#gB', '#gAll'].forEach(s => $(s).disabled = false); G.on = true; },
    clockLock: () => { ['#fIn', '#kIn', '#cOld', '#cNow', '#cRace'].forEach(s => $(s).disabled = false); K.on = true; restart(); },
  });

  loop((dt, now) => { T = now / 1000; drawBits(dt); drawGate(dt); drawClock(dt); });
})();
