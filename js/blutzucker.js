/* mindblow – Lektion Blutzucker */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  const hexagon = (ctx, x, y, r) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    ctx.closePath();
  };

  /* ---------- Körpermodell (stark vereinfacht, Zeit in Minuten) ----------
     G Blutzucker in mmol/L, I eigenes Insulin, Gn Glukagon (0 bis 1, relativ).
     Aufnahme in Zellen wächst mit Insulin, die Leber gibt Zucker ab, wenn wenig Insulin oder viel Glukagon da ist. */
  const BODY = {
    gesund: { secr: 1, slope: .5, sens: 1, basal: 0 },
    typ1: { secr: 0, slope: 0, sens: 1, basal: .1 },   // kein eigenes Insulin, nur Langzeit-Insulin als Grundversorgung
    typ2: { secr: 1.6, slope: .1, sens: .22, basal: 0 }, // viel Insulin, aber die Zellen reagieren schlecht
  };
  const U0 = .004, KI = .03, L0 = .035, KL = .15, GPG = .16; // GPG: mmol/L pro Gramm aufgenommenem Zucker
  const mkBody = (type, reg = true) => ({ type, reg, G: 5, I: .1 * BODY[type].secr, Gn: 0, meals: [], depot: 0, Iext: 0, ex: 0 });
  const stepBody = (s, dt) => {
    const b = BODY[s.type];
    let abs = 0;
    for (const m of s.meals) { const a = m.q * m.ka * dt; m.q -= a; abs += a; }
    s.meals = s.meals.filter(m => m.q > .05);
    const It = s.reg ? b.secr * clamp(.1 + b.slope * Math.max(0, s.G - 5), 0, 1.2) : .1 * b.secr;
    const Gt = s.reg ? clamp((4.8 - s.G) * 1.2, 0, 1) : 0;
    s.I += (It - s.I) * Math.min(1, dt / 15);
    s.Gn += (Gt - s.Gn) * Math.min(1, dt / 5);
    const flow = s.depot * Math.min(1, dt / 20); s.depot -= flow; s.Iext += flow; s.Iext -= s.Iext * Math.min(1, dt / 70);
    const eff = (s.I + s.Iext + b.basal) * b.sens;
    const uptake = (U0 + KI * eff + .03 * s.ex) * s.G;              // Sport öffnet Muskeltüren auch ohne Insulin
    const liver = L0 * clamp(1.5 - 5 * eff, 0, 1.5) + KL * s.Gn;
    s.ex = Math.max(0, s.ex - dt / 60);
    s.G = Math.max(1.5, s.G + GPG * abs + (liver - uptake) * dt);
  };
  const advance = (s, mins) => { const n = Math.max(1, Math.ceil(mins / .5)), h = mins / n; for (let i = 0; i < n; i++) stepBody(s, h); };
  const settle = s => advance(s, 600);

  /* ---------- Teil 1: Insulin öffnet die Türen ---------- */
  const cellCv = $('#cellCv');
  const PER = .2; // mmol/L pro Sechseck
  const P1 = { ins: 0, door: 0, parts: [], queue: 0, burned: 0, lastWarn: '' };
  const newBlood = (x = Math.random()) => ({ st: 'blood', x, y: Math.random(), ph: Math.random() * TAU });
  const resetCells = () => { P1.parts = Array.from({ length: 25 }, () => newBlood()); P1.queue = 0; P1.burned = 0; };
  resetCells();
  const rbc = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * TAU }));
  const keys = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random() }));

  const layout1 = (w, h) => {
    const small = w < 420;
    const n = small ? 3 : 4, gap = small ? 8 : 12, mx = 12;
    const vy0 = h * .37, vy1 = h * .63;
    const cw = (w - 2 * mx - (n - 1) * gap) / n;
    const cells = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) {
      const x = mx + i * (cw + gap);
      const y = r ? vy1 + 14 : 26, ch = r ? h - vy1 - 26 : vy0 - 40;
      cells.push({ x, y, w: cw, h: ch, top: !r, dx: x + cw / 2, dy: r ? y : y + ch });
    }
    return { small, vy0, vy1, cells, dw: Math.min(22, cw * .22) };
  };

  const updCells = () => {
    const blood = P1.parts.filter(p => p.st === 'blood').length;
    const inCell = P1.parts.length - blood;
    const G = blood * PER;
    $('#insOut').textContent = `${Math.round(P1.ins * 100)} %`;
    $('#cG').textContent = `${fmt(G, 1)} mmol/L`;
    $('#cDoor').textContent = `${Math.round(P1.door * 100)} %`;
    $('#cIn').textContent = `${inCell}`;
    let msg = '';
    if (G < 3.5) msg = 'Unterzucker! Zittern, Schwitzen, Heisshunger. Im echten Körper würde jetzt die Leber Zucker nachliefern.';
    else if (G > 9 && P1.ins < .2) msg = 'Der Zucker staut sich im Blut. Ohne Insulin bleiben die Türen fast zu.';
    if (msg !== P1.lastWarn) { P1.lastWarn = msg; if (msg) { $('#cellStatus').textContent = msg; } }
    $('#cellStatus').classList.toggle('warn', G < 3.5);
  };

  $('#insIn').addEventListener('input', e => {
    P1.ins = +e.target.value / 100; updCells();
    if (!P1.lastWarn) $('#cellStatus').textContent = P1.ins > .5
      ? 'Viel Insulin: Die Zellen bauen viele Türen ein, der Zucker strömt hinein.'
      : P1.ins > 0 ? 'Etwas Insulin: Ein paar Türen gehen auf.' : 'Kein Insulin: Die Türen der Muskelzellen bleiben zu.';
  });
  $('#mealBtn').addEventListener('click', () => {
    P1.queue += 30; P1.lastWarn = '';
    $('#cellStatus').textContent = 'Aus dem Darm kommen 30 Portionen Glukose ins Blut. Wohin damit?';
  });
  $('#cellReset').addEventListener('click', () => {
    resetCells(); P1.ins = 0; $('#insIn').value = 0; P1.lastWarn = '';
    $('#cellStatus').textContent = 'Jedes Sechseck steht für eine Portion Glukose.'; updCells();
  });
  updCells();

  let spawnAcc = 0;
  const simCells = (dt, L, w) => {
    P1.door += (P1.ins - P1.door) * Math.min(1, dt * 1.5);
    if (P1.queue > 0) { spawnAcc += dt * 18; while (spawnAcc >= 1 && P1.queue > 0) { spawnAcc--; P1.queue--; P1.parts.push(newBlood(0)); } }
    const flow = 50 / Math.max(200, w);
    for (const p of P1.parts) {
      if (p.st === 'blood') {
        p.x += flow * dt; if (p.x > 1) p.x -= 1;
        p.ph += dt * 2;
        // an einer Tür vorbei? Dann mit einer Wahrscheinlichkeit hinein, die mit den offenen Türen wächst
        const px = p.x * w;
        const c = L.cells.find(c => Math.abs(c.dx - px) < L.dw / 2 + 4 && (c.top ? p.y < .5 : p.y >= .5));
        if (c && Math.random() < P1.door * 6 * dt) {
          p.st = 'move'; p.cell = L.cells.indexOf(c); p.t = 0; p.u = .15 + Math.random() * .7; p.v = .2 + Math.random() * .6;
          p.sx = p.x; p.sy = p.y; p.life = 7 + Math.random() * 6;
        }
      } else {
        if (p.st === 'move') { p.t += dt * 1.6; if (p.t >= 1) { p.st = 'cell'; p.t = 1; } }
        else { p.u = clamp(p.u + (Math.random() - .5) * dt * .4, .08, .92); p.v = clamp(p.v + (Math.random() - .5) * dt * .4, .1, .9); }
        p.life -= dt;
        if (p.life <= 0) { p.dead = true; P1.burned++; }
      }
    }
    if (P1.parts.some(p => p.dead)) P1.parts = P1.parts.filter(p => !p.dead);
  };

  const drawCells = (dt, now) => {
    const { ctx, w, h } = fit(cellCv);
    const L = layout1(w, h);
    simCells(dt, L, w);
    ctx.clearRect(0, 0, w, h);
    const t = reduced ? 0 : now / 1000;
    // Blutgefäss
    ctx.fillStyle = C.bad; ctx.globalAlpha = .1; ctx.fillRect(0, L.vy0, w, L.vy1 - L.vy0); ctx.globalAlpha = .5;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, L.vy0); ctx.lineTo(w, L.vy0); ctx.moveTo(0, L.vy1); ctx.lineTo(w, L.vy1); ctx.stroke();
    ctx.globalAlpha = .22; ctx.fillStyle = C.bad;
    for (const r of rbc) {
      const x = ((r.x + (reduced ? 0 : t * .06)) % 1) * w, y = lerp(L.vy0 + 8, L.vy1 - 8, r.y);
      ctx.beginPath(); ctx.ellipse(x, y, 7, 4, r.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Insulin als kleine Schlüssel im Blut
    const nk = Math.round(P1.ins * keys.length);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6;
    for (let i = 0; i < nk; i++) {
      const k = keys[i];
      const x = ((k.x + (reduced ? 0 : t * .05)) % 1) * w, y = lerp(L.vy0 + 6, L.vy1 - 6, k.y);
      ctx.beginPath(); ctx.arc(x - 3, y, 2.6, 0, TAU); ctx.moveTo(x - .4, y); ctx.lineTo(x + 5, y); ctx.moveTo(x + 3.5, y); ctx.lineTo(x + 3.5, y + 2.5); ctx.stroke();
    }
    // Zellen mit Türen
    ctx.font = MONO;
    L.cells.forEach((c, i) => {
      roundRect(ctx, c.x, c.y, c.w, c.h, 14); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.stroke();
      // Türöffnung: die Wand wird an der Tür durch einen Riegel geschlossen, der mit Insulin verschwindet
      const dw = L.dw, x0 = c.dx - dw / 2;
      ctx.fillStyle = C.sunk; ctx.fillRect(x0, c.dy - 3, dw, 6);
      ctx.fillStyle = C.accent;
      ctx.fillRect(x0 - 3, c.dy - 5, 3, 10); ctx.fillRect(x0 + dw, c.dy - 5, 3, 10);
      ctx.globalAlpha = 1 - P1.door; ctx.fillStyle = C.fg; ctx.fillRect(x0, c.dy - 2, dw, 4); ctx.globalAlpha = 1;
      if (i === 0) { ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('Muskelzelle', c.x + 10, c.y + 16); }
    });
    // Glukose
    const pos = p => {
      if (p.st === 'blood') return [p.x * w, lerp(L.vy0 + 8, L.vy1 - 8, p.y) + (reduced ? 0 : Math.sin(p.ph) * 1.5)];
      const c = L.cells[p.cell];
      const ix = c.x + c.w * p.u, iy = c.y + c.h * p.v;
      if (p.st === 'cell') return [ix, iy];
      const bx = p.sx * w, by = lerp(L.vy0 + 8, L.vy1 - 8, p.sy);
      return p.t < .5 ? [lerp(bx, c.dx, p.t * 2), lerp(by, c.dy, p.t * 2)] : [lerp(c.dx, ix, p.t * 2 - 1), lerp(c.dy, iy, p.t * 2 - 1)];
    };
    for (const p of P1.parts) {
      const [x, y] = pos(p);
      hexagon(ctx, x, y, 4.6);
      ctx.fillStyle = C.copper; ctx.globalAlpha = p.st === 'cell' ? clamp(p.life / 4, .25, 1) : 1; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Beschriftung
    ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(L.small ? 'Blut →' : 'Blutgefäss →', 8, L.vy0 + 14);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    if (P1.burned) ctx.fillText(`${P1.burned} verbrannt`, w - 10, h - 8);
  };

  /* ---------- gemeinsames Diagramm ---------- */
  const yAxis = (ctx, gx, gy, gw, gh, gMax, small) => {
    ctx.font = MONO; ctx.lineWidth = 1;
    // Zielbereich 4 bis 8
    ctx.fillStyle = C.good; ctx.globalAlpha = .13;
    ctx.fillRect(gx, gy + gh - gh * 8 / gMax, gw, gh * 4 / gMax); ctx.globalAlpha = 1;
    for (let v = 0; v <= gMax; v += 2) {
      const y = gy + gh - gh * v / gMax;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(v), gx - 6, y + 4);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('mmol/L', 6, gy - 8);
    ctx.fillStyle = C.good; ctx.textAlign = 'right';
    ctx.fillText(small ? 'Ziel' : 'Zielbereich', gx + gw - 4, gy + gh - gh * 8 / gMax + 13);
  };

  /* ---------- Teil 2: Regelkreis über Stunden ---------- */
  const loopCv = $('#loopCv');
  const SPEED = 6, WIN = 360; // Minuten pro Sekunde, Fensterbreite
  const P2 = { s: null, t: 0, hist: [], marks: [], warned: {} };
  const resetLoop = keepReg => {
    const reg = keepReg ? P2.s.reg : true;
    P2.s = mkBody('gesund', reg); settle(P2.s);
    P2.t = 0; P2.hist = [{ t: 0, G: P2.s.G, I: P2.s.I, Gn: P2.s.Gn }]; P2.marks = []; P2.warned = {};
  };
  resetLoop(false);
  let running2 = false;
  const updLoop = () => {
    const s = P2.s;
    $('#lG').textContent = `${fmt(s.G, 1)} mmol/L`;
    $('#lI').textContent = `${Math.round(s.I * 100)} %`;
    $('#lGn').textContent = `${Math.round(s.Gn * 100)} %`;
  };
  $$('#regBtns button').forEach(b => b.addEventListener('click', () => {
    P2.s.reg = b.dataset.reg === '1';
    $$('#regBtns button').forEach(x => x.classList.toggle('active', x === b));
    P2.marks.push({ t: P2.t, txt: P2.s.reg ? 'Regelung ein' : 'Regelung aus' });
    $('#loopStatus').textContent = P2.s.reg
      ? 'Regelung ein: Insulin und Glukagon reagieren auf jeden Messwert.'
      : 'Regelung aus: Die Bauchspeicheldrüse gibt stur gleich viel Insulin ab, egal was passiert.';
  }));
  $('#drinkBtn').addEventListener('click', () => {
    P2.s.meals.push({ q: 50, ka: .045 }); P2.marks.push({ t: P2.t, txt: 'Getränk' }); P2.warned = {}; running2 = true;
    $('#loopStatus').textContent = '50 g Zucker gehen ins Blut. Schau, was Insulin macht.';
  });
  $('#sportBtn').addEventListener('click', () => {
    P2.s.ex = 1; P2.marks.push({ t: P2.t, txt: 'Sport' }); P2.warned = {}; running2 = true;
    $('#loopStatus').textContent = 'Die Muskeln arbeiten und holen sich Zucker aus dem Blut.';
  });
  $('#loopReset').addEventListener('click', () => { resetLoop(true); updLoop(); $('#loopStatus').textContent = 'Neue Messung. 1 Sekunde sind 6 Minuten.'; });
  updLoop();

  const simLoop = dt => {
    if (!running2) return;
    const mins = dt * SPEED;
    advance(P2.s, mins); P2.t += mins;
    const s = P2.s;
    const last = P2.hist[P2.hist.length - 1];
    if (P2.t - last.t >= 1) P2.hist.push({ t: P2.t, G: s.G, I: s.I, Gn: s.Gn });
    if (P2.hist.length > 900) P2.hist.shift();
    if (s.G > 9 && !P2.warned.hi) { P2.warned.hi = true; $('#loopStatus').textContent = s.reg ? 'Hoch. Aber das Insulin steigt schon.' : 'Über 9 mmol/L, und niemand bremst. So geht es bei unbehandeltem Diabetes nach jedem Essen.'; }
    if (s.G < 3.9 && !P2.warned.lo) { P2.warned.lo = true; $('#loopStatus').textContent = s.reg ? 'Knapp. Glukagon arbeitet auf Hochtouren.' : 'Unterzucker unter 3,9 mmol/L! Ohne Glukagon liefert die Leber kaum Nachschub.'; }
    if (s.Gn > .25 && !P2.warned.gn) { P2.warned.gn = true; $('#loopStatus').textContent = 'Zucker sinkt: Glukagon steigt, die Leber gibt gespeicherten Zucker ab.'; }
    // nichts mehr los? Dann anhalten
    if (!s.meals.length && s.ex < .01 && Math.abs(s.G - last.G) < .002 && P2.t > 30) running2 = false;
    updLoop();
  };

  const drawLoop = dt => {
    simLoop(dt);
    const { ctx, w, h } = fit(loopCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const gx = small ? 34 : 44, gy = 26, gw = w - gx - 12, gh = h - gy - 104;
    const gMax = 14, t0 = Math.max(0, P2.t - WIN);
    const X = t => gx + gw * (t - t0) / WIN, Y = v => gy + gh - gh * clamp(v / gMax, 0, 1);
    yAxis(ctx, gx, gy, gw, gh, gMax, small);
    // Zeitachse in Stunden
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let m = Math.ceil(t0 / 60) * 60; m <= t0 + WIN; m += 60) ctx.fillText(`${m / 60} h`, X(m), gy + gh + 15);
    // Ereignisse
    for (const mk of P2.marks) {
      if (mk.t < t0) continue;
      const x = X(mk.t);
      ctx.strokeStyle = C.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(x + 4, gy + 4); ctx.rotate(Math.PI / 2); ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText(mk.txt, 0, 0); ctx.restore();
    }
    // Blutzuckerkurve
    const pts = P2.hist.filter(p => p.t >= t0);
    const line = (key, Yf, col, lw) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(X(p.t), Yf(p[key])) : ctx.moveTo(X(p.t), Yf(p[key])));
      ctx.stroke();
    };
    line('G', Y, C.accent, 2.5);
    const cur = P2.s;
    ctx.beginPath(); ctx.arc(X(P2.t), Y(cur.G), 4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
    // Hormone unten
    const hy = gy + gh + 30, hh = h - hy - 22;
    const H = v => hy + hh - hh * clamp(v / 1.2, 0, 1);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, hy + hh); ctx.lineTo(gx + gw, hy + hh); ctx.stroke();
    line('I', H, C.copper, 2);
    line('Gn', H, C.glow, 2);
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.copper; ctx.fillText('Insulin', gx, h - 6);
    ctx.fillStyle = C.glow; ctx.fillText('Glukagon', gx + (small ? 66 : 80), h - 6);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(cur.reg ? 'Regelung ein' : 'Regelung aus', w - 12, h - 6);
    if (!running2 && P2.hist.length < 3) { ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.fillText('Drück auf Süssgetränk oder Sport', gx + gw / 2, gy + gh / 2 - 16); }
  };

  /* ---------- Teil 3: Saft gegen Vollkorn, gesund gegen Diabetes ---------- */
  const carbCv = $('#carbCv');
  const FOOD = { fast: { ka: .045, name: 'Saft' }, slow: { ka: .012, name: 'Brot' } };
  const BNAME = { gesund: 'Gesund', typ1: 'Typ 1', typ2: 'Typ 2' };
  const TMAX = 240, SPEED3 = 12;
  const P3 = { food: 'fast', body: 'gesund', runs: [], cur: null };
  const bodyCol = b => b === 'gesund' ? C.good : b === 'typ1' ? C.bad : C.copper;
  const stats = r => {
    let peak = 0, tp = 0, high = 0, low = 99;
    for (let i = 0; i < r.pts.length; i++) {
      const p = r.pts[i];
      if (p.G > peak) { peak = p.G; tp = p.t; }
      low = Math.min(low, p.G);
      if (i && p.G > 10) high += p.t - r.pts[i - 1].t;
    }
    return { peak, tp, high, low };
  };
  const updCarb = () => {
    const r = P3.cur || P3.runs[P3.runs.length - 1];
    if (!r) { $('#kPeak').textContent = '–'; $('#kTp').textContent = '–'; $('#kHigh').textContent = '–'; return; }
    const st = stats(r);
    $('#kPeak').textContent = `${fmt(st.peak, 1)} mmol/L`;
    $('#kTp').textContent = `${fmt(st.tp, 0)} min`;
    $('#kHigh').textContent = `${fmt(st.high, 0)} min`;
  };
  const pick = (sel, attr, key) => $$(sel + ' button').forEach(b => b.addEventListener('click', () => {
    P3[key] = b.dataset[attr];
    $$(sel + ' button').forEach(x => x.classList.toggle('active', x === b));
    if (key === 'body') $('#carbStatus').textContent = P3.body === 'typ1'
      ? 'Typ 1: Kein eigenes Insulin, nur eine kleine Grundversorgung aus der Spritze. Zum Essen musst du selbst spritzen.'
      : P3.body === 'typ2' ? 'Typ 2: Viel Insulin, aber die Zellen reagieren schlecht darauf.' : 'Gesund: Insulin kommt genau nach Bedarf.';
  }));
  pick('#foodBtns', 'food', 'food');
  pick('#bodyBtns', 'body', 'body');
  $('#eatBtn').addEventListener('click', () => {
    if (P3.cur) P3.runs.push(P3.cur);
    while (P3.runs.length > 4) P3.runs.shift();
    const s = mkBody(P3.body); settle(s);
    s.meals.push({ q: 50, ka: FOOD[P3.food].ka });
    P3.cur = { s, food: P3.food, body: P3.body, t: 0, pts: [{ t: 0, G: s.G }], inj: [] };
    $('#injBtn').disabled = false;
    $('#carbStatus').textContent = `${FOOD[P3.food].name} bei ${BNAME[P3.body]}: 50 g Kohlenhydrate. 1 Sekunde sind 12 Minuten.`;
    if (reduced) { while (P3.cur.t < TMAX) stepRun(P3.cur, 1); finishRun(); }
    updCarb();
  });
  $('#injBtn').addEventListener('click', () => {
    if (!P3.cur) return;
    P3.cur.s.depot += .6; P3.cur.inj.push(P3.cur.t);
    $('#carbStatus').textContent = 'Insulin gespritzt. Es braucht eine Weile, bis es unter der Haut ins Blut gelangt.';
  });
  $('#carbClear').addEventListener('click', () => {
    P3.runs = []; P3.cur = null; $('#injBtn').disabled = true; updCarb();
    $('#carbStatus').textContent = 'Alles gelöscht. Wähle Essen und Körper.';
  });
  const stepRun = (r, mins) => {
    advance(r.s, mins); r.t += mins;
    const last = r.pts[r.pts.length - 1];
    if (r.t - last.t >= 1 || r.t >= TMAX) r.pts.push({ t: Math.min(r.t, TMAX), G: r.s.G });
  };
  const finishRun = () => {
    const r = P3.cur; if (!r) return;
    const st = stats(r);
    const both = P3.runs.concat(r);
    $('#carbStatus').textContent = st.low < 4 && r.inj.length
      ? 'Zu viel Insulin für dieses Essen: Unterzucker. Die Menge muss zum Essen passen.'
      : st.high > 0
        ? `${fmt(st.high, 0)} Minuten über 10 mmol/L. Das ist zu hoch, auf Dauer schadet das Gefässen und Nerven.`
        : r.food === 'fast' ? 'Schnell rauf, schnell runter. Das Brot gibt einen flacheren Hügel. Probier es.'
          : both.length > 1 ? 'Gleich viel Zucker, aber langsam. Die Kurve bleibt flach.' : 'Ein sanfter Hügel. Probier jetzt das Süssgetränk.';
    $('#injBtn').disabled = true;
    P3.runs.push(r); P3.cur = null;
    while (P3.runs.length > 5) P3.runs.shift();
  };
  updCarb();

  const drawCarb = dt => {
    if (P3.cur) {
      stepRun(P3.cur, dt * SPEED3);
      if (P3.cur.t >= TMAX) finishRun();
      updCarb();
    }
    const { ctx, w, h } = fit(carbCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const gx = small ? 34 : 44, gy = 26, gw = w - gx - (small ? 64 : 92), gh = h - gy - 40;
    const gMax = 16;
    const X = t => gx + gw * t / TMAX, Y = v => gy + gh - gh * clamp(v / gMax, 0, 1);
    yAxis(ctx, gx, gy, gw, gh, gMax, small);
    // 10er Linie
    ctx.strokeStyle = C.bad; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, Y(10)); ctx.lineTo(gx + gw, Y(10)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.bad; ctx.textAlign = 'left'; ctx.fillText('10', gx + gw + 4, Y(10) + 4);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let m = 0; m <= TMAX; m += 60) ctx.fillText(`${m} min`, X(m), gy + gh + 15);
    const all = P3.runs.concat(P3.cur ? [P3.cur] : []);
    const labels = [];
    all.forEach(r => {
      const isCur = r === P3.cur || r === all[all.length - 1];
      ctx.strokeStyle = bodyCol(r.body); ctx.lineWidth = isCur ? 2.6 : 1.6; ctx.globalAlpha = isCur ? 1 : .55;
      ctx.setLineDash(r.food === 'slow' ? [7, 4] : []); ctx.lineJoin = 'round';
      ctx.beginPath(); r.pts.forEach((p, i) => i ? ctx.lineTo(X(p.t), Y(p.G)) : ctx.moveTo(X(p.t), Y(p.G))); ctx.stroke();
      ctx.setLineDash([]);
      for (const ti of r.inj) {
        const p = r.pts.reduce((a, b) => Math.abs(b.t - ti) < Math.abs(a.t - ti) ? b : a);
        ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(X(ti), Y(p.G) - 6); ctx.lineTo(X(ti) - 5, Y(p.G) - 14); ctx.lineTo(X(ti) + 5, Y(p.G) - 14); ctx.closePath(); ctx.fill();
      }
      const lp = r.pts[r.pts.length - 1];
      labels.push({ y: Y(lp.G), x: X(lp.t), txt: `${FOOD[r.food].name} ${small ? BNAME[r.body].replace('Gesund', 'ges.') : BNAME[r.body]}`, col: bodyCol(r.body), a: ctx.globalAlpha, done: r.t >= TMAX });
      ctx.globalAlpha = 1;
    });
    // Beschriftungen rechts, ohne Überlappung
    labels.filter(l => l.done).sort((a, b) => a.y - b.y).forEach((l, i, arr) => {
      if (i && l.y < arr[i - 1].y + 13) l.y = arr[i - 1].y + 13;
      ctx.globalAlpha = l.a; ctx.fillStyle = l.col; ctx.textAlign = 'left'; ctx.fillText(l.txt, gx + gw + 4, l.y + 4);
    });
    ctx.globalAlpha = 1;
    if (!all.length) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('Drück auf «Essen und messen»', gx + gw / 2, gy + gh / 2 - 20); }
    else if (P3.cur) { ctx.beginPath(); ctx.arc(X(P3.cur.t), Y(P3.cur.s.G), 4, 0, TAU); ctx.fillStyle = bodyCol(P3.cur.body); ctx.fill(); }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(small ? '— Saft  - - Brot' : '— Süssgetränk   - - Vollkornbrot   ▼ Insulin', gx + (small ? 50 : 70), gy - 8);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('blutzucker', 4, {
    cellLock: () => { $('#insIn').disabled = false; $('#mealBtn').disabled = false; $('#cellReset').disabled = false; },
    loopLock: () => { $$('#regBtns button').forEach(b => b.disabled = false); $('#drinkBtn').disabled = false; $('#sportBtn').disabled = false; $('#loopReset').disabled = false; },
    carbLock: () => { $$('#foodBtns button, #bodyBtns button').forEach(b => b.disabled = false); $('#eatBtn').disabled = false; $('#carbClear').disabled = false; },
  });

  loop((dt, now) => { drawCells(dt, now); drawLoop(dt); drawCarb(dt); });
})();
