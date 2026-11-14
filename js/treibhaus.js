/* mindblow – Lektion Treibhauseffekt */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const FONT = '11px Geist Mono, monospace';
  const minus = s => s.replace('-', '−');
  const pill = (ctx, text, x, y, col, align = 'center') => {
    ctx.font = FONT;
    const tw = ctx.measureText(text).width, bw = tw + 12;
    const bx = align === 'center' ? x - bw / 2 : align === 'left' ? x : x - bw;
    roundRect(ctx, bx, y - 10, bw, 20, 10); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(text, bx + 6, y + 4);
  };

  /* ---------- Teil 1: Energiebilanz mit einer Luftschicht ---------- */
  // Vereinfachtes Modell: Sonnenlicht wird am Boden aufgenommen, eine Luftschicht schluckt
  // den Anteil eps der Wärmestrahlung und strahlt je die Hälfte nach oben und nach unten.
  const S0 = 1361, SIG = 5.670e-8, IN = S0 / 4;
  const E = { alb: .30, eps: .78, T: null };
  const calc = () => {
    const A = IN * (1 - E.alb), U = A / (1 - E.eps / 2);
    return { A, U, T: Math.pow(U / SIG, .25) - 273.15 };
  };
  const updBal = () => {
    const { A, U, T } = calc();
    $('#albIn').value = Math.round(E.alb * 100); $('#albOut').textContent = `${Math.round(E.alb * 100)} %`;
    $('#epsIn').value = Math.round(E.eps * 100); $('#epsOut').textContent = `${Math.round(E.eps * 100)} %`;
    $('#balIn').textContent = `${fmt(A, 0)} W/m²`;
    $('#balUp').textContent = `${fmt(U, 0)} W/m²`;
    $('#balT').textContent = `${minus(fmt(T, 1))} °C`;
  };
  $('#albIn').addEventListener('input', e => {
    E.alb = +e.target.value / 100; updBal();
    $('#balStatus').textContent = E.alb > .45 ? 'Viel Eis und Wolken werfen viel Licht zurück. Die Erde kühlt ab.' : 'Eine dunklere Erde schluckt mehr Sonnenlicht und wird wärmer.';
  });
  $('#epsIn').addEventListener('input', e => {
    E.eps = +e.target.value / 100; updBal();
    const T = calc().T;
    $('#balStatus').textContent = T < 0 ? 'Unter null Grad im Mittel: Die Erde wäre grösstenteils vereist.' : 'Die Luft schluckt Wärmestrahlung und schickt einen Teil zurück. Der Boden wird wärmer, bis die Bilanz wieder stimmt.';
  });
  $('#balNone').addEventListener('click', () => {
    E.eps = 0; E.alb = .30; updBal();
    $('#balStatus').textContent = 'Ohne Treibhausgase: Alle Wärme geht direkt ins All. Gleichgewicht bei etwa −18 °C.';
  });
  $('#balToday').addEventListener('click', () => {
    E.eps = .78; E.alb = .30; updBal();
    $('#balStatus').textContent = 'So ähnlich wie heute: rund +15 °C im Mittel.';
  });
  updBal();

  const balCv = $('#balCv');
  let flow = 0;
  const arrow = (ctx, x, y0, y1, flux, k, col) => {
    if (flux < 1) return;
    const wd = Math.max(2, flux * k), dir = Math.sign(y1 - y0), head = Math.min(14, wd * .9 + 5);
    const yEnd = y1 - dir * head;
    ctx.fillStyle = col;
    ctx.fillRect(x - wd / 2, Math.min(y0, yEnd), wd, Math.abs(yEnd - y0));
    ctx.beginPath(); ctx.moveTo(x - wd / 2 - 5, yEnd); ctx.lineTo(x + wd / 2 + 5, yEnd); ctx.lineTo(x, y1); ctx.closePath(); ctx.fill();
    // wandernde Streifen zeigen die Richtung
    ctx.save(); ctx.beginPath(); ctx.rect(x - wd / 2, Math.min(y0, yEnd), wd, Math.abs(yEnd - y0)); ctx.clip();
    ctx.fillStyle = C.surface; ctx.globalAlpha = .28;
    const gap = 18, off = ((flow * 30) % gap) * dir;
    for (let y = Math.min(y0, yEnd) - gap + off; y < Math.max(y0, yEnd) + gap; y += gap) ctx.fillRect(x - wd / 2, y, wd, 4);
    ctx.restore();
  };
  const drawBal = dt => {
    const { T: Tt, A, U } = calc();
    if (E.T === null || reduced) E.T = Tt; else E.T += (Tt - E.T) * Math.min(1, dt * 3);
    if (!reduced) flow += dt;
    const { ctx, w, h } = fit(balCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460, pad = 12, top = 34;
    const layY = h * .42, layH = 30, gY = h - 58;
    const k = clamp(w / 11000, .032, .055);
    // Weltall
    ctx.fillStyle = C.muted; ctx.font = FONT; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Weltall' : 'Weltall: hier zählt die Bilanz', pad + 4, 20);
    ctx.strokeStyle = C.line; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(pad, top - 4); ctx.lineTo(w - pad, top - 4); ctx.stroke(); ctx.setLineDash([]);
    // Luftschicht
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .06 + .3 * E.eps; ctx.fillRect(0, layY - layH / 2, w, layH); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.fillText('Luft', pad + 4, layY + 4);
    // Boden: kalt bläulich, warm erdig
    const cold = clamp((5 - E.T) / 25, 0, 1);
    roundRect(ctx, pad, gY, w - pad * 2, h - gY - 10, 12);
    ctx.fillStyle = C.copper; ctx.globalAlpha = .22 * (1 - cold); ctx.fill();
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .28 * cold; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line; ctx.stroke();
    // Pfeile
    const cx = f => pad + (w - pad * 2) * f;
    const xs = [cx(.2), cx(.36), cx(.53), cx(.7), cx(.86)];
    const refl = IN * E.alb, esc = U * (1 - E.eps), lay = U * E.eps / 2;
    const yTop = top + 4, lt = layY - layH / 2, lb = layY + layH / 2;
    arrow(ctx, xs[0], yTop, gY - 2, IN, k, C.glow);
    ctx.globalAlpha = .55; arrow(ctx, xs[1], gY - 2, yTop, refl, k, C.glow); ctx.globalAlpha = 1;
    arrow(ctx, xs[2], gY - 2, esc > 1 ? lt : lb, U, k, C.bad);
    if (esc > 1) { ctx.globalAlpha = .9; arrow(ctx, xs[2], lt, yTop, esc, k, C.bad); ctx.globalAlpha = 1; }
    arrow(ctx, xs[3], lt, yTop, lay, k, C.bad);
    arrow(ctx, xs[4], lb, gY - 2, lay, k, C.bad);
    // Werte
    const yUp = (lt + yTop) / 2, yLo = (lb + gY) / 2;
    const lab = (name, v) => narrow ? fmt(v, 0) : `${name} ${fmt(v, 0)}`;
    pill(ctx, lab('Sonne', IN), xs[0], yLo + 18, C.fg);
    pill(ctx, lab('zurück', refl), xs[1], yUp - 12, C.muted);
    pill(ctx, lab('Boden', U), xs[2], yLo, C.fg);
    if (esc > 1) pill(ctx, lab('durch', esc), xs[2], yUp + 12, C.fg);
    if (lay > 1) { pill(ctx, lab('Luft', lay), xs[3], yUp - 12, C.fg); pill(ctx, lab('Luft', lay), xs[4], yLo - 18, C.fg); }
    // Temperatur
    ctx.textAlign = 'left'; ctx.font = '600 15px Geist Mono, monospace'; ctx.fillStyle = C.fg;
    ctx.fillText(`Boden: ${minus(fmt(E.T, 1))} °C`, pad + 12, gY + 22);
    ctx.font = FONT; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'W/m², vereinfacht' : 'Werte in W/m² · 1-Schicht-Modell, vereinfacht', pad + 12, gY + 39);
  };

  /* ---------- Teil 2: Photonen ---------- */
  const phoCv = $('#phoCv');
  // Zufallszahlen mit festem Startwert, damit Moleküle ruhig liegen
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const r1 = rng(7);
  const mk = (n, kind) => Array.from({ length: n }, () => ({ x: r1(), y: r1(), a: r1() * TAU, kind, wob: 0 }));
  const CO2 = mk(160, 'co2'), H2O = mk(60, 'h2o'), AIR = mk(80, 'air');
  const P = { lvl: 1.5, ph: [], emit: [], spawn: 0, fates: [], w: 400, h: 330 };
  const SP = reduced ? 70 : 140, RHIT = 9;
  const counts = w => ({ co2: Math.round(P.lvl * .017 * w), h2o: Math.round(.022 * w), air: Math.round(.05 * w) });
  const geo = () => { const { w, h } = P; return { top: 30, gY: h - 34, atT: 46, atB: h - 46 }; };
  const molXY = m => { const { atT, atB } = geo(); return [8 + m.x * (P.w - 16), atT + m.y * (atB - atT)]; };
  const activeMols = () => { const n = counts(P.w); return [...CO2.slice(0, n.co2), ...H2O.slice(0, n.h2o)]; };

  const emitIR = (x, y, ang, from) => P.ph.push({ x, y, vx: Math.cos(ang) * SP, vy: Math.sin(ang) * SP, ir: true, last: from, delay: 0 });
  const groundEmit = (x, delay) => P.ph.push({ x, y: geo().gY - 2, ir: true, delay, pending: true });
  const fate = f => { P.fates.push(f); if (P.fates.length > 300) P.fates.shift(); };

  const updPho = () => {
    const n = P.fates.length, out = P.fates.filter(f => f).length;
    $('#phoOut').textContent = n < 12 ? '…' : `${fmt(out / n * 100, 0)} %`;
    $('#phoBack').textContent = n < 12 ? '…' : `${fmt((n - out) / n * 100, 0)} %`;
    $('#phoN').textContent = fmt(counts(P.w).co2, 0);
  };
  $$('#phoLevels button').forEach(b => b.addEventListener('click', () => {
    P.lvl = +b.dataset.lvl; P.fates = [];
    $$('#phoLevels button').forEach(x => x.classList.toggle('active', x === b));
    $('#phoStatus').textContent = P.lvl === 0 ? 'Ohne CO₂ schluckt nur noch der Wasserdampf. Mehr Wärme entkommt.'
      : P.lvl === 3 ? 'Doppelt so viel CO₂ wie heute: Mehr Wärmestrahlung wird zurückgeschickt, der Boden müsste wärmer werden.'
      : 'Achte auf die Moleküle: Wer Wärme schluckt, wackelt kurz und schickt sie in eine zufällige Richtung.';
    updPho();
  }));
  $('#phoReset').addEventListener('click', () => { P.fates = []; P.ph = []; P.emit = []; updPho(); });

  const stepPho = dt => {
    const { gY } = geo(), mols = activeMols();
    P.spawn += dt * (reduced ? 4 : 9);
    while (P.spawn >= 1) { P.spawn--; P.ph.push({ x: 10 + Math.random() * (P.w - 20), y: 0, vx: (Math.random() - .5) * 20, vy: SP * 1.1, ir: false }); }
    for (const m of mols) m.wob = Math.max(0, m.wob - dt * 3);
    // geschluckte Strahlung wird nach kurzer Zeit in zufällige Richtung wieder abgegeben
    for (const e of P.emit) { e.t -= dt; if (e.t <= 0) { const [x, y] = molXY(e.m); emitIR(x, y, Math.random() * TAU, e.m); } }
    P.emit = P.emit.filter(e => e.t > 0);
    for (const p of P.ph) {
      if (p.pending) { p.delay -= dt; if (p.delay <= 0) { p.pending = false; const a = -Math.PI / 2 + (Math.random() - .5) * 1.8; p.vx = Math.cos(a) * SP; p.vy = Math.sin(a) * SP; } continue; }
      // kleine Teilschritte, damit auch bei ruckelnder Bildrate kein Molekül übersprungen wird
      const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 3)), h = dt / n;
      for (let s = 0; s < n && !p.dead; s++) {
        p.x += p.vx * h; p.y += p.vy * h;
        if (p.x < 0) p.x += P.w; else if (p.x > P.w) p.x -= P.w;   // seitlich weiter, wie bei einer endlosen Ebene
        if (!p.ir) { if (p.y >= gY) { p.dead = true; groundEmit(p.x, .3 + Math.random() * .5); } continue; }
        if (p.y < 0) { p.dead = true; fate(true); break; }
        if (p.y >= gY && p.vy > 0) { p.dead = true; fate(false); groundEmit(p.x, .4 + Math.random() * .6); break; }
        for (const m of mols) {
          if (m === p.last) continue;
          const [mx, my] = molXY(m);
          if (Math.abs(p.x - mx) < RHIT && Math.abs(p.y - my) < RHIT && (p.x - mx) ** 2 + (p.y - my) ** 2 < RHIT * RHIT) {
            p.dead = true; m.wob = 1; P.emit.push({ m, t: .25 + Math.random() * .25 }); break;
          }
        }
        if (p.last && !p.dead) { const [mx, my] = molXY(p.last); if ((p.x - mx) ** 2 + (p.y - my) ** 2 > 4 * RHIT * RHIT) p.last = null; }
      }
    }
    P.ph = P.ph.filter(p => !p.dead);
    if (P.ph.length > 600) P.ph.splice(0, P.ph.length - 600);
  };
  const drawMol = (ctx, m) => {
    const [x, y] = molXY(m), s = reduced ? 0 : Math.sin(performance.now() / 30) * 2.2 * m.wob;
    const ca = Math.cos(m.a), sa = Math.sin(m.a);
    const dot = (dx, dy, r, col) => { ctx.beginPath(); ctx.arc(x + dx * ca - dy * sa, y + dx * sa + dy * ca, r, 0, TAU); ctx.fillStyle = col; ctx.fill(); };
    if (m.kind === 'co2') { dot(-6.5 - s, 0, 3.3, C.copper); dot(6.5 + s, 0, 3.3, C.copper); dot(0, 0, 3.3, C.fg); }
    else if (m.kind === 'h2o') { dot(-4.5, 3.5 + s, 2.2, C.muted); dot(4.5, 3.5 - s, 2.2, C.muted); dot(0, 0, 3.3, C.copper); }
    else { ctx.globalAlpha = .35; dot(-2.6, 0, 2.6, C.muted); dot(2.6, 0, 2.6, C.muted); ctx.globalAlpha = 1; }
    if (m.wob > 0) { ctx.beginPath(); ctx.arc(x, y, 11 + 4 * (1 - m.wob), 0, TAU); ctx.strokeStyle = C.bad; ctx.globalAlpha = m.wob * .7; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1; }
  };
  const drawPho = dt => {
    const { ctx, w, h } = fit(phoCv);
    P.w = w; P.h = h;
    stepPho(dt);
    ctx.clearRect(0, 0, w, h);
    const { gY } = geo(), narrow = w < 460;
    ctx.fillStyle = C.muted; ctx.font = FONT; ctx.textAlign = 'left';
    ctx.fillText('↑ Weltall', 12, 18);
    // Boden
    ctx.fillStyle = C.copper; ctx.globalAlpha = .2; ctx.fillRect(0, gY, w, h - gY); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(w, gY); ctx.stroke();
    // Moleküle
    const n = counts(w);
    AIR.slice(0, n.air).forEach(m => drawMol(ctx, m));
    H2O.slice(0, n.h2o).forEach(m => drawMol(ctx, m));
    CO2.slice(0, n.co2).forEach(m => drawMol(ctx, m));
    // Photonen
    for (const p of P.ph) {
      if (p.pending) continue;
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
      ctx.lineCap = 'round';
      if (p.ir) {
        // Wärmestrahlung als kleine Welle
        ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const t = i * 1.6, o = Math.sin(i * 1.4) * 2.5; const px = p.x - ux * t - uy * o, py = p.y - uy * t + ux * o; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      } else {
        ctx.strokeStyle = C.glow; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - ux * 9, p.y - uy * 9); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    // Legende im Boden
    ctx.font = FONT; ctx.textAlign = 'left'; const ly = gY + 21;
    ctx.fillStyle = C.glow; ctx.fillRect(12, ly - 5, 12, 3); ctx.fillStyle = C.fg; ctx.fillText(narrow ? 'Licht' : 'Sonnenlicht', 30, ly);
    const x2 = narrow ? 82 : 128;
    ctx.fillStyle = C.bad; ctx.fillRect(x2, ly - 5, 12, 3); ctx.fillStyle = C.fg; ctx.fillText(narrow ? 'Wärme' : 'Wärmestrahlung', x2 + 18, ly);
    const x3 = narrow ? 158 : 264;
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(x3 + 6, ly - 4, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = C.copper; ctx.beginPath(); ctx.arc(x3, ly - 4, 2.5, 0, TAU); ctx.arc(x3 + 12, ly - 4, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.fg; ctx.fillText(narrow ? 'CO₂' : 'CO₂ · H₂O mit Knick · blass: N₂/O₂', x3 + 20, ly);
  };
  let phoTick = 0;
  updPho();

  /* ---------- Teil 3: CO₂-Kurve ---------- */
  // Gerundete Jahresmittel in ppm: bis 1950 aus Eisbohrkernen, ab 1958 Messungen auf dem Mauna Loa (Hawaii)
  const DATA = [[1850, 285], [1860, 286], [1870, 288], [1880, 291], [1890, 294], [1900, 296], [1910, 300], [1920, 303], [1930, 307], [1940, 311], [1950, 311],
    [1958, 315], [1960, 317], [1965, 320], [1970, 326], [1975, 331], [1980, 339], [1985, 346], [1990, 354], [1995, 361], [2000, 369], [2005, 380], [2010, 390], [2015, 401], [2020, 414], [2024, 424]];
  const ppmAt = t => {
    if (t <= DATA[0][0]) return DATA[0][1];
    for (let i = 1; i < DATA.length; i++) { const [x1, y1] = DATA[i]; if (t <= x1) { const [x0, y0] = DATA[i - 1]; return y0 + (y1 - y0) * (t - x0) / (x1 - x0); } }
    return DATA[DATA.length - 1][1];
  };
  // Jahreszeiten-Zacken (Mauna Loa: Maximum im Mai, etwa ±3 ppm)
  const season = t => 3 * Math.cos(TAU * (t - Math.floor(t) - .37));
  const CO = { year: 2024, mode: 'zoom' };
  const updCo2 = () => {
    const p = ppmAt(CO.year);
    $('#yearOut').textContent = CO.year; $('#co2Yr').textContent = CO.year;
    $('#co2Ppm').textContent = `${fmt(p, 0)} ppm`;
    $('#co2Pct').textContent = `${fmt(p / 1e4, 3)} %`;
    const inc = (p / 280 - 1) * 100;
    $('#co2Inc').textContent = `+${fmt(inc, 0)} %`;
  };
  $('#yearIn').addEventListener('input', e => {
    CO.year = +e.target.value; updCo2();
    $('#co2Status').textContent = CO.year < 1900 ? 'Um 1850 lag der Wert noch nahe bei 280 ppm. Die Industrialisierung hatte gerade erst begonnen.'
      : CO.year < 1958 ? 'Diese Werte stammen aus Luftbläschen, die im Eis der Antarktis eingeschlossen sind.'
      : 'Seit 1958 wird das CO₂ direkt gemessen. Die Kurve steigt immer steiler.';
  });
  $$('#co2Modes button').forEach(b => b.addEventListener('click', () => {
    CO.mode = b.dataset.mode;
    $$('#co2Modes button').forEach(x => x.classList.toggle('active', x === b));
    $('#co2Status').textContent = CO.mode === 'zero' ? 'Ab null gezeichnet sieht der Anstieg kleiner aus. Er ist trotzdem rund 50 %.'
      : CO.mode === 'dots' ? 'Trockene Luft, gerundet: Unter 10\'000 Teilchen findest du nur 3 bis 4 CO₂.'
      : 'Gezoomt sieht man die Form der Kurve und die jährlichen Zacken gut.';
  }));
  updCo2();

  const co2Cv = $('#co2Cv');
  const r2 = rng(42);
  const ORDER = Array.from({ length: 10000 }, (_, i) => i);
  for (let i = ORDER.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); [ORDER[i], ORDER[j]] = [ORDER[j], ORDER[i]]; }

  const drawCurve = (ctx, w, h) => {
    const narrow = w < 460;
    const L = 44, R = 14, T = 28, B = 50;
    const y0 = CO.mode === 'zero' ? 0 : 260, y1 = 440, yStep = CO.mode === 'zero' ? 100 : 40;
    const X = t => L + (t - 1850) / (2025 - 1850) * (w - L - R);
    const Y = v => T + (1 - (v - y0) / (y1 - y0)) * (h - T - B);
    ctx.font = FONT; ctx.lineWidth = 1;
    for (let v = y0; v <= y1; v += yStep) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(fmt(v, 0), L - 6, Y(v) + 4);
    }
    ctx.textAlign = 'center';
    for (let t = 1850; t <= 2000; t += 50) ctx.fillText(t, X(t), h - B + 16);
    ctx.textAlign = 'left'; ctx.fillText('ppm', 14, 16);
    // 280 ppm
    ctx.strokeStyle = C.muted; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(L, Y(280)); ctx.lineTo(w - R, Y(280)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(narrow ? '280: vor 1800' : 'etwa 280 ppm vor der Industrialisierung', w - R - 4, Y(280) + 15);
    // Eisbohrkerne gestrichelt
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let t = 1850; t <= 1958; t += .5) { const x = X(t), y = Y(ppmAt(t)); t === 1850 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // Messung mit Jahreszeiten-Zacken
    ctx.lineWidth = narrow ? 1 : 1.5; ctx.beginPath();
    for (let t = 1958; t <= 2024.95; t += 1 / 24) { const x = X(t), y = Y(ppmAt(t) + season(t)); t === 1958 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // Cursor
    const cx = X(CO.year + .5), p = ppmAt(CO.year);
    ctx.strokeStyle = C.fg; ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(cx, T); ctx.lineTo(cx, h - B); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, Y(p), 5, 0, TAU); ctx.fillStyle = C.bad; ctx.fill(); ctx.strokeStyle = C.surface; ctx.lineWidth = 2; ctx.stroke();
    const txt = `${CO.year}: ${fmt(p, 0)} ppm`;
    ctx.font = FONT; const tw = ctx.measureText(txt).width + 12;
    pill(ctx, txt, clamp(cx - tw / 2, L, w - R - tw), Math.max(T + 12, Y(p) - 18), C.fg, 'left');
    // Legende
    ctx.font = FONT; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    const ly = h - 12;
    if (narrow) ctx.fillText('┄ Eisbohrkerne · ─ Messung Hawaii', 8, ly);
    else ctx.fillText('┄ Eisbohrkerne · ─ ab 1958 Messung auf Hawaii · gerundete Werte', L, ly);
  };
  const CO2SPOTS = [[23, 28], [72, 16], [46, 66], [84, 78], [12, 84]];
  const drawDots = (ctx, w, h) => {
    const narrow = w < 460;
    const co2 = Math.round(ppmAt(CO.year) / 100), ar = 93, o2 = 2095, n2 = 10000 - co2 - ar - o2;
    const cell = Math.min((w - 24) / 100, (h - 64) / 100), gw = cell * 100;
    const ox = (w - gw) / 2, oy = 12;
    const kind = idx => idx < co2 ? 3 : idx < co2 + ar ? 2 : idx < co2 + ar + o2 ? 1 : 0;
    const cols = [C.muted, C.fiber, C.copper, C.bad];
    for (let i = 0; i < 10000; i++) {
      const kd = kind(ORDER[i]), x = ox + (i % 100) * cell + cell / 2, y = oy + Math.floor(i / 100) * cell + cell / 2;
      ctx.fillStyle = cols[kd === 3 ? 0 : kd]; ctx.globalAlpha = kd === 0 ? .45 : .9;
      ctx.fillRect(x - cell * .32, y - cell * .32, cell * .64, cell * .64);
    }
    ctx.globalAlpha = 1;
    // CO₂ an festen, gut verteilten Stellen, damit man jedes Teilchen einzeln sieht
    for (const [gx, gy] of CO2SPOTS.slice(0, co2)) {
      const x = ox + (gx + .5) * cell, y = oy + (gy + .5) * cell;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = C.bad; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Legende
    const items = [['N₂', n2, cols[0]], ['O₂', o2, cols[1]], ['Ar', ar, cols[2]], ['CO₂', co2, cols[3]]];
    ctx.font = FONT; ctx.textAlign = 'left';
    let x = ox, y = oy + gw + 20;
    items.forEach(([nm, v, col], i) => {
      const t = `${nm} ${fmt(v, 0)}`, tw = ctx.measureText(t).width + 26;
      if (x + tw > ox + gw && i) { x = ox; y += 16; }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 4, y - 4, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = C.fg; ctx.fillText(t, x + 12, y); x += tw;
    });
    if (!narrow) { ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(`trockene Luft, ${CO.year}, gerundet`, ox + gw, y); }
  };
  const drawCo2 = () => {
    const { ctx, w, h } = fit(co2Cv);
    ctx.clearRect(0, 0, w, h);
    if (CO.mode === 'dots') drawDots(ctx, w, h); else drawCurve(ctx, w, h);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('treibhaus', 4, {
    balLock: () => { ['#albIn', '#epsIn', '#balNone', '#balToday'].forEach(s => $(s).disabled = false); },
    phoLock: () => { $('#phoReset').disabled = false; $$('#phoLevels button').forEach(b => b.disabled = false); },
    co2Lock: () => { $('#yearIn').disabled = false; $$('#co2Modes button').forEach(b => b.disabled = false); },
  });

  loop((dt, now) => {
    drawBal(dt); drawPho(dt); drawCo2();
    if (now - phoTick > 400) { phoTick = now; updPho(); }
  });
})();
