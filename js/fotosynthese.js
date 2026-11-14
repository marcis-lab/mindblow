/* mindblow – Lektion Fotosynthese */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  /* ---------- Teil 1: Van Helmonts Weide ---------- */
  const treeCv = $('#treeCv');
  // Van Helmont: 5 Pfund → 169 Pfund 3 Unzen, Erde 200 Pfund, minus etwa 2 Unzen
  const M0 = 2.27, M5 = 76.7, SOIL = 90.7, SOIL_LOSS = 57;
  const WATER = .5;                         // frische Weide: etwa die Hälfte Wasser (vereinfacht)
  // Trockenmasse von Holz, gerundet: C 50 %, O 42 %, H 6 %, Mineralien und Stickstoff 2 %
  const PARTS = [
    { k: 'C', name: 'C aus CO₂', short: 'C', p: .50, col: () => C.accent, src: 'Luft' },
    { k: 'O', name: 'O aus CO₂', short: 'O', p: .42, col: () => C.fiber, src: 'Luft' },
    { k: 'H', name: 'H aus Wasser', short: 'H', p: .06, col: () => '#4f9fd0', src: 'Wasser' },
    { k: 'M', name: 'Boden', short: 'B', p: .02, col: () => C.copper, src: 'Boden' },
  ];
  const T = { yrs: 0, mode: 'fresh', grow: 0, t: 0 };
  const massAt = y => M0 + (M5 - M0) * Math.pow(y / 5, 1.6);
  const updTree = () => {
    const m = massAt(T.yrs), dm = m - M0;
    $('#yrOut').textContent = fmt(T.yrs, 1);
    $('#trMass').textContent = `${fmt(T.mode === 'dry' ? m * (1 - WATER) : m, 1)} kg`;
    $('#trMassF').textContent = T.mode === 'dry' ? 'getrocknet, ohne Wasser' : 'frisch, mit Wasser';
    $('#trSoil').textContent = `−${fmt(SOIL_LOSS * dm / (M5 - M0), 0)} g`;
    $('#trAir').textContent = `${fmt(dm * (1 - WATER) * .92, 1)} kg`;
    if (T.yrs >= 5) $('#treeStatus').textContent = T.mode === 'dry'
      ? 'Getrocknet bleiben rund 38 kg. Über 90 % davon waren vorher CO₂ in der Luft.'
      : 'Nach 5 Jahren: 74 kg mehr Weide, aber nur 57 g weniger Erde. Jetzt trockne die Weide.';
  };
  $('#yrIn').addEventListener('input', e => { T.yrs = +e.target.value; updTree(); });
  $$('#treeMode button').forEach(b => b.addEventListener('click', () => {
    T.mode = b.dataset.mode;
    $$('#treeMode button').forEach(x => x.classList.toggle('active', x === b));
    if (T.mode === 'dry' && T.yrs < 5) $('#treeStatus').textContent = 'Ohne Wasser bleibt die Trockenmasse: das eigentliche Holz.';
    updTree();
  }));
  updTree();

  // Teilchen, die von oben (CO₂) und von unten (Wasser) zur Weide wandern
  const parts = Array.from({ length: 26 }, (_, i) => ({ air: i < 18, s: Math.random(), x: Math.random(), sp: .15 + Math.random() * .15 }));

  const drawTree = dt => {
    const target = T.yrs / 5;
    T.grow = reduced ? target : T.grow + (target - T.grow) * Math.min(1, dt * 6);
    T.t += dt;
    const { ctx, w, h } = fit(treeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440, pad = 14;
    const barH = 26, barY = h - 70, groundY = barY - 30;
    // Topf
    const potW = Math.min(150, w * .34), potH = 46, cx = w * (narrow ? .5 : .42);
    const px = cx - potW / 2, py = groundY - potH;
    ctx.fillStyle = C.copper; ctx.globalAlpha = .85;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + potW, py); ctx.lineTo(px + potW - 12, groundY); ctx.lineTo(px + 12, groundY); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a4128'; ctx.fillRect(px + 4, py, potW - 8, 7);
    // Weide: Grösse wächst mit der dritten Wurzel der Masse
    const m = massAt(T.grow * 5);
    const s = Math.cbrt(m / M5);
    const maxH = py - 48;                    // Platz für die Beschriftung oben
    const crR = maxH * (.06 + .22 * s);
    const trunkH = Math.min(maxH * (.18 + .4 * s), maxH - crR * 1.75), trunkW = 3 + 10 * s;
    const topY = py - trunkH;
    ctx.fillStyle = '#7a5532';
    ctx.beginPath(); ctx.moveTo(cx - trunkW / 2, py); ctx.lineTo(cx - trunkW * .3, topY); ctx.lineTo(cx + trunkW * .3, topY); ctx.lineTo(cx + trunkW / 2, py); ctx.closePath(); ctx.fill();
    const sway = reduced ? 0 : Math.sin(T.t * 1.3) * 2 * s;
    const blobs = [[0, 0, 1], [-.6, .25, .7], [.6, .25, .7], [-.3, -.45, .7], [.35, -.4, .65], [0, .45, .6]];
    for (const [bx, by, br] of blobs) {
      ctx.beginPath(); ctx.arc(cx + bx * crR + sway, topY - crR * .55 + by * crR, crR * br, 0, TAU);
      ctx.fillStyle = by < 0 ? '#5aa04a' : '#3f8a3a'; ctx.fill();
    }
    // Hängende Weidenzweige
    ctx.strokeStyle = '#4c9640'; ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) {
      const x0 = cx + i * crR * .2 + sway;
      ctx.beginPath(); ctx.moveTo(x0, topY - crR * .2); ctx.quadraticCurveTo(x0 + i * 3, topY + crR * .5, x0 + i * 4 + sway, topY + crR * (.7 + .1 * Math.abs(i % 2)));
      ctx.stroke();
    }
    // wandernde Teilchen (nur nach dem Freischalten sinnvoll, laufen aber ruhig immer)
    const crownY = topY - crR * .55;
    if (T.yrs > 0 && !reduced) {
      ctx.font = '10px Geist Mono, monospace'; ctx.textAlign = 'center';
      for (const p of parts) {
        p.s += dt * p.sp; if (p.s > 1) { p.s -= 1; p.x = Math.random(); }
        let x, y;
        if (p.air) { const sx = pad + p.x * (w - pad * 2); x = lerp(sx, cx, p.s); y = lerp(8, crownY, p.s); }
        else { x = lerp(px + 20 + p.x * (potW - 40), cx, p.s * .5); y = lerp(py + 4, crownY, p.s); }
        ctx.globalAlpha = Math.sin(p.s * Math.PI) * .9;
        ctx.fillStyle = p.air ? C.fiber : '#4f9fd0';
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Beschriftungen
    ctx.textAlign = 'left'; ctx.font = MONO; ctx.fillStyle = C.fiber;
    ctx.fillText(narrow ? '● CO₂ aus der Luft' : '● CO₂ aus der Luft strömt in die Blätter', pad, 18);
    ctx.fillStyle = '#4f9fd0'; ctx.fillText('● Wasser', pad, 34);
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.font = '600 13px Geist Mono, monospace';
    ctx.fillText(`${fmt(T.yrs, 1)} Jahre`, w - pad, 18);
    ctx.font = MONO; ctx.fillStyle = C.muted;
    ctx.fillText(`Erde: ${fmt(SOIL - SOIL_LOSS * (massAt(T.yrs) - M0) / (M5 - M0) / 1000, 3)} kg`, w - pad, 34);
    // Boden-Linie
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, groundY); ctx.lineTo(w - pad, groundY); ctx.stroke();

    // Gestapelter Balken: woher kommt die Masse?
    const bw = w - pad * 2;
    const segs = T.mode === 'fresh'
      ? [{ name: 'Wasser', short: 'Wasser', p: WATER, col: '#9cc9e6' }, ...PARTS.map(q => ({ name: q.name, short: q.short, p: q.p * (1 - WATER), col: q.col() }))]
      : PARTS.map(q => ({ name: q.name, short: q.short, p: q.p, col: q.col() }));
    ctx.save(); roundRect(ctx, pad, barY, bw, barH, 8); ctx.clip();
    let x = pad;
    ctx.font = '600 11px Geist Mono, monospace'; ctx.textBaseline = 'middle';
    for (const sg of segs) {
      const sw = bw * sg.p;
      ctx.fillStyle = sg.col; ctx.fillRect(x, barY, sw + .5, barH);
      const lab = `${sg.short} ${fmt(sg.p * 100, 0)} %`;
      ctx.textAlign = 'center';
      if (ctx.measureText(lab).width < sw - 6) { ctx.fillStyle = sg.col === '#9cc9e6' ? '#12304a' : '#ffffff'; ctx.fillText(lab, x + sw / 2, barY + barH / 2 + 1); }
      x += sw;
    }
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    // Legende unter dem Balken
    const air = PARTS[0].p + PARTS[1].p, f = T.mode === 'fresh' ? 1 - WATER : 1;
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    const head = T.mode === 'fresh' ? 'Frische Weide' : 'Trockenmasse';
    const leg = narrow
      ? `Luft ${fmt(air * f * 100, 0)} % · H ${fmt(6 * f, 0)} % · Boden ${fmt(2 * f, 0)} %`
      : `${head}: Luft ${fmt(air * f * 100, 0)} % · H aus Wasser ${fmt(6 * f, 0)} % · Boden ${fmt(2 * f, 0)} %`;
    ctx.fillText(leg, pad, barY + barH + 18);
    ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? `${head}, vereinfacht` : 'Holz, gerundete Massenanteile · vereinfacht', pad, barY + barH + 34);
  };

  /* ---------- Teil 2: Atome neu ordnen ---------- */
  const rxCv = $('#rxCv');
  const R = { light: 1000, co2: 420, t: 0, paused: false };
  // Vereinfachtes Blattmodell: Lichtkurve als Sättigungskurve, Atmung als kleiner fester Abzug
  const rate = (I, c) => {
    const pmax = 40 * c / (c + 400);
    const gross = pmax * I / (I + 350);
    return { net: gross - 1.5, sat: I / (I + 350), gross };
  };

  // Atome bauen. Virtuelle Fläche 400 × 200.
  const atoms = [];
  const bondsL = [], bondsR = [];
  const A = (el, sx, sy, ex, ey, fromWater) => { atoms.push({ el, sx, sy, ex, ey, w: fromWater, d: Math.random() * .25 }); return atoms.length - 1; };
  // Ziele rechts
  const gluC = i => [232 + i * 30, 40], gluO = i => [232 + i * 30, 22], gluH = (i, k) => [232 + i * 30 + (k ? 8 : -8), 55];
  const o2 = (k, a) => [250 + (k % 3) * 52 + (a ? 7 : -7), 98 + Math.floor(k / 3) * 26];
  const nw = k => [250 + (k % 3) * 52, 152 + Math.floor(k / 3) * 28];
  // 6 CO₂ links oben
  const hNew = [];  // Wasserstoff-Atome, die in neues Wasser gehen
  for (let i = 0; i < 6; i++) {
    const x = 22 + (i % 3) * 52, y = 24 + Math.floor(i / 3) * 26;
    const c = A('C', x, y, ...gluC(i), false);
    const o1 = A('O', x - 12, y, ...gluO(i), false);
    const [nx, ny] = nw(i);
    const o2i = A('O', x + 12, y, nx, ny, false);
    bondsL.push([c, o1], [c, o2i]);
    bondsR.push([c, o1]);
    if (i) bondsR.push([c - 3, c]);
    hNew.push(o2i);
  }
  // 12 H₂O links unten
  let hG = 0, hW = 0;
  for (let j = 0; j < 12; j++) {
    const x = 18 + (j % 4) * 44, y = 92 + Math.floor(j / 4) * 34;
    const o = A('O', x, y, ...o2(j >> 1, j & 1), true);
    if (j & 1) bondsR.push([o - 3, o]);
    for (let k = 0; k < 2; k++) {
      let end, partner;
      if (hG < 12) { const i = hG >> 1; end = gluH(i, hG & 1); partner = atoms.findIndex(a => a.el === 'C' && a.ex === gluC(i)[0]); hG++; }
      else { const i = hW >> 1; const [nx, ny] = nw(i); end = [nx + ((hW & 1) ? 8 : -8), ny + 8]; partner = hNew[i]; hW++; }
      const hI = A('H', x + (k ? 8 : -8), y + 8, end[0], end[1], true);
      bondsL.push([o, hI]); bondsR.push([partner, hI]);
    }
  }

  $('#litIn').addEventListener('input', e => { R.light = +e.target.value; updRx(); });
  $('#co2In').addEventListener('input', e => { R.co2 = +e.target.value; updRx(); });
  $('#rxPause').addEventListener('click', () => { R.paused = !R.paused; $('#rxPause').textContent = R.paused ? 'Weiter' : 'Pause'; });
  $('#rxToday').addEventListener('click', () => { R.co2 = 420; R.light = 1000; $('#co2In').value = 420; $('#litIn').value = 1000; updRx(); });
  const updRx = () => {
    const { net, sat } = rate(R.light, R.co2);
    $('#litOut').textContent = fmt(R.light, 0);
    $('#co2Out').textContent = `${fmt(R.co2, 0)} ppm`;
    $('#rxRate').textContent = (net < 0 ? '−' : '') + fmt(Math.abs(net), 1);
    $('#rxSat').textContent = `${fmt(sat * 100, 0)} %`;
    let msg;
    if (net <= 0) msg = 'Zu dunkel: Das Blatt atmet mehr CO₂ aus, als es einbaut. Die Reaktion steht still.';
    else if (sat > .8) msg = 'Fast gesättigt: Mehr Licht bringt kaum noch etwas. Jetzt bremst das CO₂. Probier mehr CO₂.';
    else if (R.co2 < 200) msg = 'Wenig CO₂: Selbst bei viel Licht fehlt der Baustoff.';
    else msg = 'Mehr Licht, schnellere Reaktion. Aber nur bis zu einer Grenze.';
    $('#rxStatus').textContent = msg;
  };
  updRx();

  const drawRx = dt => {
    const { net } = rate(R.light, R.co2);
    const speed = Math.max(0, net) / 18;           // bei heutiger Luft und viel Licht etwa 1
    if (!R.paused) R.t = (R.t + dt * speed * .22) % 1;
    const { ctx, w, h } = fit(rxCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const sc = Math.min((w - 20) / 400, (h - 190) / 190);
    const topH = 190 * sc + 60;
    const ox = (w - 400 * sc) / 2, oy = 34;
    const P = (x, y) => [ox + x * sc, oy + y * sc];
    // Phasen: 0–0.2 links, 0.2–0.75 Umbau, 0.75–1 rechts
    const t = R.t;
    const glob = clamp((t - .2) / .55, 0, 1);
    const posOf = a => {
      let k;
      if (reduced) k = t < .5 ? 0 : 1;
      else k = ease(clamp((glob - a.d) / (1 - .25), 0, 1));
      return P(lerp(a.sx, a.ex, k), lerp(a.sy, a.ey, k));
    };
    const pos = atoms.map(posOf);
    // Überschriften
    ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? '6 CO₂ + 12 H₂O' : 'vorher: 6 CO₂ + 12 H₂O', P(85, 0)[0], 18);
    ctx.fillText(narrow ? 'Zucker + 6 O₂ + 6 H₂O' : 'nachher: C₆H₁₂O₆ + 6 O₂ + 6 H₂O', P(310, 0)[0], 18);
    // Lichtpfeil in der Mitte
    const [ax, ay] = P(200, 92);
    const glow = clamp(R.light / 2000, 0, 1) * (reduced ? .7 : .5 + .5 * Math.sin(t * TAU * 2) ** 2);
    ctx.beginPath(); ctx.arc(ax, ay, 22 * sc, 0, TAU); ctx.fillStyle = C.glow; ctx.globalAlpha = .15 + .45 * glow; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax - 14 * sc, ay); ctx.lineTo(ax + 14 * sc, ay); ctx.lineTo(ax + 8 * sc, ay - 5 * sc); ctx.moveTo(ax + 14 * sc, ay); ctx.lineTo(ax + 8 * sc, ay + 5 * sc); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = MONO; ctx.fillText('Licht', ax, ay + 32 * sc + 4);
    // Bindungen, nur wenn die Moleküle ruhig liegen
    const aL = reduced ? (t < .5 ? 1 : 0) : clamp(1 - glob * 6, 0, 1);
    const aR = reduced ? (t < .5 ? 0 : 1) : clamp((t - .72) / .06, 0, 1);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    for (const [list, al] of [[bondsL, aL], [bondsR, aR]]) {
      if (al <= 0) continue;
      ctx.globalAlpha = al; ctx.beginPath();
      for (const [i, j] of list) { ctx.moveTo(...pos[i]); ctx.lineTo(...pos[j]); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Atome
    const r = clamp(5.2 * sc, 3, 6.5);
    atoms.forEach((a, i) => {
      const [x, y] = pos[i];
      const rr = a.el === 'H' ? r * .7 : r;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU);
      ctx.fillStyle = a.el === 'C' ? C.fg : a.el === 'O' ? C.bad : C.surface; ctx.fill();
      if (a.el === 'H') { ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.stroke(); }
      if (a.el === 'O' && a.w) { ctx.beginPath(); ctx.arc(x, y, rr + 2.2, 0, TAU); ctx.strokeStyle = '#3b8fd6'; ctx.lineWidth = 1.8; ctx.stroke(); }
    });
    // Legende
    const ly = topH - 4;
    ctx.font = MONO; ctx.textAlign = 'left';
    let lx = 12;
    const leg = (draw, txt) => { draw(lx + 5, ly - 4); ctx.fillStyle = C.fg; ctx.fillText(txt, lx + 14, ly); lx += ctx.measureText(txt).width + 26; };
    const dot = (fill, stroke) => (x, y) => { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } };
    leg(dot(C.fg), 'C'); leg(dot(C.bad), 'O'); leg(dot(C.surface, C.muted), 'H');
    leg(dot(C.bad, '#3b8fd6'), narrow ? 'O aus H₂O' : 'O aus dem Wasser');

    // Lichtkurve
    const gx = 46, gy = topH + 18, gw = w - gx - 16, gh = h - gy - 24;
    const maxY = 30, minY = -3;
    const X = I => gx + gw * I / 2000, Y = v => gy + gh * (1 - (v - minY) / (maxY - minY));
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gx, Y(0)); ctx.lineTo(gx + gw, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    // Vergleichskurve bei heutiger Luft
    const curve = (c, col, width) => {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath();
      for (let I = 0; I <= 2000; I += 20) { const v = rate(I, c).net; I ? ctx.lineTo(X(I), Y(v)) : ctx.moveTo(X(I), Y(v)); }
      ctx.stroke();
    };
    if (R.co2 !== 420) { ctx.globalAlpha = .45; curve(420, C.muted, 1.5); ctx.globalAlpha = 1; }
    curve(R.co2, C.accent, 2.5);
    const v = rate(R.light, R.co2).net;
    ctx.beginPath(); ctx.arc(X(R.light), Y(v), 5.5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    ctx.strokeStyle = C.surface; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '10px Geist Mono, monospace'; ctx.textAlign = 'right';
    ctx.fillText('0', gx - 6, Y(0) + 3); ctx.fillText(fmt(maxY, 0), gx - 6, gy + 8);
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'CO₂-Aufnahme' : 'CO₂-Aufnahme (netto)', gx + 6, gy + 8);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'Licht →' : 'Licht → · vereinfacht', gx + gw, gy + gh + 14);
    if (R.co2 !== 420 && !narrow) { ctx.textAlign = 'left'; ctx.fillText('grau: 420 ppm', gx + 6, gy + 22); }
  };

  /* ---------- Teil 3: Spektrum und Chlorophyll ---------- */
  const specCv = $('#specCv');
  const g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  // Ungefähre Absorption in Lösung, normiert (Chlorophyll a: 430 und 662 nm, b: 453 und 642 nm)
  const chlA = l => 1 * g(l, 430, 13) + .25 * g(l, 410, 14) + .78 * g(l, 662, 10) + .14 * g(l, 615, 12) + .08 * g(l, 578, 14);
  const chlB = l => 1 * g(l, 455, 13) + .3 * g(l, 432, 14) + .34 * g(l, 643, 10) + .12 * g(l, 598, 14);
  const mixAbs = l => (3 * chlA(l) + chlB(l)) / 4;     // in Blättern etwa 3 Teile a auf 1 Teil b
  let MIXMAX = 0; for (let l = 400; l <= 700; l++) MIXMAX = Math.max(MIXMAX, mixAbs(l));
  // Ganzes Blatt: ungefähre Wirkung pro Lichtteilchen (nach McCree 1972, geglättet), Rot = 100 %
  const LEAF = [[400, .6], [425, .7], [440, .75], [460, .72], [480, .67], [500, .64], [520, .66], [540, .69], [560, .72], [580, .8], [600, .9], [620, .98], [640, 1], [660, .98], [680, .9], [700, .5]];
  const leaf = l => {
    if (l <= LEAF[0][0]) return LEAF[0][1];
    for (let i = 1; i < LEAF.length; i++) if (l <= LEAF[i][0]) { const [a, va] = LEAF[i - 1], [b, vb] = LEAF[i]; return lerp(va, vb, (l - a) / (b - a)); }
    return LEAF[LEAF.length - 1][1];
  };
  const LAMP_S = 12;
  const lampSpec = (nm, l) => nm === 'white' ? 1 : g(l, nm, LAMP_S);
  const integ = (nm, f) => { let s = 0, n = 0; for (let l = 400; l <= 700; l += 2) { const p = lampSpec(nm, l); s += p * f(l); n += p; } return s / n; };
  const REF = integ(660, leaf);
  // Wellenlänge → ungefähre Bildschirmfarbe
  const nmRGB = l => {
    let r = 0, gg = 0, b = 0;
    if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { gg = (l - 440) / 50; b = 1; }
    else if (l < 510) { gg = 1; b = (510 - l) / 20; } else if (l < 580) { r = (l - 510) / 70; gg = 1; }
    else if (l < 645) { r = 1; gg = (645 - l) / 65; } else r = 1;
    const f = l < 420 ? .3 + .7 * (l - 380) / 40 : l > 680 ? .3 + .7 * (750 - l) / 70 : 1;
    return [r, gg, b].map(v => Math.round(255 * Math.pow(v * f, .8)));
  };
  const nmName = l => l < 450 ? 'Violettblau' : l < 495 ? 'Blau' : l < 510 ? 'Türkis' : l < 565 ? 'Grün' : l < 590 ? 'Gelb' : l < 625 ? 'Orange' : 'Rot';
  const S = { nm: 530, shown: 530 };
  const updSpec = () => {
    const white = S.nm === 'white';
    $('#nmOut').textContent = white ? 'Sonne' : `${S.nm} nm`;
    $('#spLamp').textContent = white ? 'Sonne' : `${S.nm} nm`;
    $('#spName').textContent = white ? 'alle Farben gemischt' : nmName(S.nm);
    $('#spAbs').textContent = `${fmt(integ(S.nm, l => mixAbs(l) / MIXMAX) * 100, 0)} %`;
    $('#spRate').textContent = `${fmt(integ(S.nm, leaf) / REF * 100, 0)} %`;
    $$('#lampSet button').forEach(b => b.classList.toggle('active', b.dataset.nm === String(S.nm)));
    const n = S.nm;
    $('#specStatus').textContent = white ? 'Sonnenlicht enthält alle Farben. Die Pflanze nutzt Blau und Rot am besten, Grün etwas schlechter.'
      : (n >= 500 && n < 580) ? 'Grün: Im Glas fast durchsichtig. Das ganze Blatt nutzt es trotzdem zu rund zwei Dritteln.'
      : n >= 620 && n <= 680 ? 'Rot: Hier arbeitet die Fotosynthese pro Lichtteilchen am besten.'
      : n < 500 ? 'Blau wird stark geschluckt. Ein Teil der Energie geht aber unterwegs verloren.'
      : 'Verschiebe die Lampe und vergleiche die beiden Werte.';
  };
  $('#nmIn').addEventListener('input', e => { S.nm = +e.target.value; updSpec(); });
  $$('#lampSet button').forEach(b => b.addEventListener('click', () => {
    S.nm = b.dataset.nm === 'white' ? 'white' : +b.dataset.nm;
    if (S.nm !== 'white') $('#nmIn').value = S.nm;
    updSpec();
  }));
  updSpec();

  const drawSpec = dt => {
    const target = S.nm === 'white' ? 550 : S.nm;
    S.shown = reduced ? target : S.shown + (target - S.shown) * Math.min(1, dt * 8);
    const { ctx, w, h } = fit(specCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const gx = 16, gw = w - 32, gy = 44, gh = h - 44 - 64;
    const X = l => gx + gw * (l - 400) / 300, Y = v => gy + gh * (1 - v);
    // Lampe als leuchtende Fläche
    const white = S.nm === 'white';
    ctx.beginPath(); ctx.moveTo(X(400), Y(0));
    for (let l = 400; l <= 700; l += 2) ctx.lineTo(X(l), Y(white ? .92 : .92 * g(l, S.shown, LAMP_S)));
    ctx.lineTo(X(700), Y(0)); ctx.closePath();
    if (white) {
      const grd = ctx.createLinearGradient(X(400), 0, X(700), 0);
      for (let l = 400; l <= 700; l += 20) grd.addColorStop((l - 400) / 300, `rgb(${nmRGB(l).join(',')})`);
      ctx.fillStyle = grd; ctx.globalAlpha = .18;
    } else { ctx.fillStyle = `rgb(${nmRGB(S.shown).join(',')})`; ctx.globalAlpha = .35; }
    ctx.fill(); ctx.globalAlpha = 1;
    // Kurven
    const curve = (f, col, wd, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.beginPath();
      for (let l = 400; l <= 700; l += 2) { const y = Y(f(l)); l === 400 ? ctx.moveTo(X(l), y) : ctx.lineTo(X(l), y); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    const nA = Math.max(...Array.from({ length: 301 }, (_, i) => chlA(400 + i)));
    const nB = Math.max(...Array.from({ length: 301 }, (_, i) => chlB(400 + i)));
    curve(l => chlA(l) / nA, C.accent, 2.2);
    curve(l => chlB(l) / nB, C.fiber, 2.2);
    curve(leaf, C.fg, 1.6, [5, 4]);
    // Spektrum-Band
    const by = gy + gh + 8, bh = 14;
    for (let px = 0; px < gw; px += 2) {
      const l = 400 + 300 * px / gw;
      ctx.fillStyle = `rgb(${nmRGB(l).join(',')})`; ctx.fillRect(gx + px, by, 2.5, bh);
    }
    ctx.fillStyle = C.muted; ctx.font = '10px Geist Mono, monospace'; ctx.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) ctx.fillText(`${l}`, clamp(X(l), gx + 10, gx + gw - 10), by + bh + 13);
    ctx.textAlign = 'right'; ctx.fillText('nm', gx + gw, by + bh + 26);
    // Lampen-Marker
    if (!white) {
      const lx = X(S.shown);
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, by - 3); ctx.lineTo(lx, by + bh + 3); ctx.stroke();
    }
    // Grüne Lücke markieren
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = '10px Geist Mono, monospace';
    ctx.fillText(narrow ? 'Lücke' : 'Grünlücke: wird zurückgeworfen', X(545), Y(.2));
    // Legende oben
    ctx.font = MONO; ctx.textAlign = 'left';
    let lx = gx;
    const leg = (col, txt, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(lx, 16); ctx.lineTo(lx + 16, 16); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.fg; ctx.fillText(txt, lx + 21, 20); lx += ctx.measureText(txt).width + 34;
    };
    leg(C.accent, narrow ? 'Chl a' : 'Chlorophyll a');
    leg(C.fiber, narrow ? 'Chl b' : 'Chlorophyll b');
    leg(C.fg, narrow ? 'Blatt' : 'ganzes Blatt', [5, 4]);
    ctx.fillStyle = C.muted; ctx.font = '10px Geist Mono, monospace';
    ctx.fillText(narrow ? 'Chl im Glas, ungefähr' : 'Chlorophyll gelöst im Glas, Blatt nach Messungen: ungefähr', gx, 36);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('fotosynthese', 4, {
    treeLock: () => { $('#yrIn').disabled = false; $$('#treeMode button').forEach(b => b.disabled = false); },
    rxLock: () => { ['#litIn', '#co2In', '#rxPause', '#rxToday'].forEach(s => $(s).disabled = false); },
    specLock: () => { $('#nmIn').disabled = false; $$('#lampSet button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawTree(dt); drawRx(dt); drawSpec(dt); });
})();
