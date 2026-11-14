/* mindblow – Lektion Touchscreen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

  /* ---------- Teil 1: Feld zwischen Sender und Empfänger ----------
     Vereinfacht: Der Signalverlust fällt mit dem Abstand exponentiell ab und hängt davon ab, wie gut
     das Ding leitet und mit dem Körper verbunden ist. */
  const fieldCv = $('#fieldCv');
  const TOOLS = {
    finger: { k: 1, extra: 0 },
    wool: { k: 1, extra: 1.6 },     // Wolle: hält den Finger 1,6 mm auf Abstand und leitet nicht
    tglove: { k: .9, extra: 0 },    // leitende Fäden
    pen: { k: .03, extra: 0 },      // Plastik: verändert das Feld kaum
    sausage: { k: .8, extra: 0 },   // salzig und feucht, in der Hand gehalten
  };
  const THRESH = 20;
  const FD = { tool: 'finger', gap: 3, shown: 3 };
  const sig = gap => { const t = TOOLS[FD.tool]; return 40 * t.k * Math.exp(-(gap + t.extra) / 1.2); };
  const updField = () => {
    const s = sig(FD.gap), hit = s >= THRESH;
    $('#gapOut').textContent = `${fmt(FD.gap, 1)} mm`;
    $('#fSig').textContent = `${fmt(s, 1)} %`;
    $('#fHit').textContent = hit ? 'ja' : 'nein';
    const touch = FD.gap < .05;
    let t;
    if (hit) {
      t = `Erkannt: Beim Empfänger kommt ${fmt(s, 0)} % weniger an.`;
      if (!touch) t += ' Sogar ohne Berührung, so nah ist es schon.';
      if (FD.tool === 'sausage') t += ' Das Wienerli leitet, weil es salzig und feucht ist. Halten musst du es aber in der Hand, damit es mit deinem Körper verbunden ist.';
      if (FD.tool === 'tglove') t += ' In diesem Handschuh stecken leitende Fäden. Sie verbinden das Glas mit deinem Finger.';
    } else if (FD.tool === 'wool' && touch) t = 'Nichts. Die Wolle leitet nicht und hält den Finger auf Abstand. Es wird zu wenig Feld abgezogen.';
    else if (FD.tool === 'pen' && touch) t = 'Nichts. Plastik leitet nicht. Das Feld bleibt fast gleich, egal wie fest du drückst.';
    else if (s > THRESH * .5) t = 'Nah dran: Das Signal sinkt schon, aber noch nicht unter die Schwelle.';
    else t = 'Noch zu weit weg. Das Feld reicht nur wenige Millimeter über das Glas.';
    $('#fieldStatus').textContent = t;
  };
  $$('#toolBtns button').forEach(b => b.addEventListener('click', () => {
    FD.tool = b.dataset.t; $$('#toolBtns button').forEach(x => x.classList.toggle('active', x === b)); updField();
  }));
  $('#gapIn').addEventListener('input', e => { FD.gap = +e.target.value; updField(); });
  updField();

  const rr = (ctx, x, y, w, h, r) => roundRect(ctx, x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
  const drawTool = (ctx, cx, bot, px) => {
    const t = FD.tool;
    ctx.lineWidth = 1.5;
    if (t === 'pen') {
      ctx.fillStyle = C.surface; ctx.strokeStyle = C.fg;
      ctx.beginPath(); ctx.moveTo(cx - 8, -10); ctx.lineTo(cx + 8, -10); ctx.lineTo(cx + 8, bot - 16); ctx.lineTo(cx + 3, bot); ctx.lineTo(cx - 3, bot); ctx.lineTo(cx - 8, bot - 16); ctx.closePath();
      ctx.fill(); ctx.stroke(); return;
    }
    if (t === 'sausage') {
      rr(ctx, cx - 15, bot - 90, 30, 90, 15); ctx.fillStyle = C.bad; ctx.globalAlpha = .6; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.bad; ctx.stroke();
      const hh = bot - 70; // Hand, die das Wienerli hält
      if (hh > 10) { rr(ctx, cx - 28, -20, 56, hh + 20, 20); ctx.fillStyle = C.copper; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1; }
      return;
    }
    const ex = t === 'wool' ? TOOLS.wool.extra * px : t === 'tglove' ? 5 : 0;
    if (ex) {
      rr(ctx, cx - 26 - ex, -20, 52 + 2 * ex, bot + 20, 26 + ex);
      ctx.fillStyle = C.muted; ctx.globalAlpha = t === 'wool' ? .45 : .35; ctx.fill(); ctx.globalAlpha = 1;
      if (t === 'wool') {
        ctx.strokeStyle = C.surface; ctx.globalAlpha = .5; ctx.lineWidth = 1;
        for (let y = bot - 6; y > 0; y -= 7) { ctx.beginPath(); ctx.moveTo(cx - 24 - ex, y); ctx.lineTo(cx + 24 + ex, y - 3); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = C.copper;
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx + i * 7, bot - 2, 1.6, 0, TAU); ctx.fill(); }
      }
    }
    rr(ctx, cx - 26, -20, 52, bot - ex + 20, 26);
    ctx.fillStyle = C.copper; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.copper; ctx.stroke();
  };

  const drawField = (dt, now) => {
    FD.shown = reduced ? FD.gap : FD.shown + (FD.gap - FD.shown) * Math.min(1, dt * 8);
    const { ctx, w, h } = fit(fieldCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const PX = 18; // Pixel pro mm über dem Glas
    const cx = w / 2, gTop = h * .52, gBot = gTop + 24, eY = gBot + 10;
    const sep = Math.min(70, w * .17);
    const s = sig(FD.shown), tipY = gTop - FD.shown * PX;
    // Feldlinien
    const lines = 8, stolen = Math.round(s / 40 * 5);
    const t0 = reduced ? 0 : now / 1000;
    for (let k = 0; k < lines; k++) {
      const ry = 14 + k * 18, above = eY - ry < gTop;
      const st = above && k >= 2 && k < 2 + stolen;
      ctx.strokeStyle = st ? C.copper : C.fiber; ctx.lineWidth = 1.5; ctx.globalAlpha = st ? .9 : .6;
      ctx.beginPath();
      if (st) { ctx.moveTo(cx - sep, eY); ctx.quadraticCurveTo(cx - sep * .9, tipY - 10 - k * 4, cx - 10 + (k - 3) * 5, tipY + 2); }
      else ctx.ellipse(cx, eY, sep, ry, 0, Math.PI, TAU);
      ctx.stroke(); ctx.globalAlpha = 1;
      // wandernde Ladung
      const p = (t0 * .5 + k * .13) % 1;
      let x, y;
      if (st) { const u = p, x0 = cx - sep, y0 = eY, x1c = cx - sep * .9, y1c = tipY - 10 - k * 4, x2 = cx - 10 + (k - 3) * 5, y2 = tipY + 2; x = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * x1c + u * u * x2; y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * y1c + u * u * y2; }
      else { const a = Math.PI + p * Math.PI; x = cx + sep * Math.cos(a); y = eY + ry * Math.sin(a); }
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fillStyle = st ? C.copper : C.fiber; ctx.fill();
    }
    // Glas
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .1; ctx.fillRect(8, gTop, w - 16, gBot - gTop); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(8, gTop, w - 16, gBot - gTop);
    // Elektroden
    ctx.fillStyle = C.copper; ctx.fillRect(cx - sep - 20, eY, 40, 7);
    ctx.fillStyle = C.accent; ctx.fillRect(cx + sep - 20, eY, 40, 7);
    // Werkzeug
    drawTool(ctx, cx, tipY, PX);
    // Beschriftungen
    ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText('Sender', cx - sep, eY + 22); ctx.fillText('Empfänger', cx + sep, eY + 22);
    ctx.textAlign = 'left'; ctx.fillText('Glas', 14, gTop + 16);
    // Signalanzeige
    const mw = small ? 120 : 150, mx = w - mw - 12, my = h - 22;
    ctx.fillText(small ? 'Empfänger' : 'Signal am Empfänger', mx, my - 8);
    roundRect(ctx, mx, my, mw, 9, 4); ctx.fillStyle = C.sunk; ctx.fill();
    const lvl = (100 - s) / 100;
    roundRect(ctx, mx, my, Math.max(9, mw * lvl), 9, 4); ctx.fillStyle = s >= THRESH ? C.good : C.accent; ctx.fill();
    const tx = mx + mw * (100 - THRESH) / 100;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, my - 3); ctx.lineTo(tx, my + 12); ctx.stroke();
    if (s >= THRESH) { ctx.fillStyle = C.good; ctx.textAlign = 'left'; ctx.font = '600 13px Outfit, sans-serif'; ctx.fillText('Berührung!', 14, h - 14); }
  };

  /* ---------- Teil 2: Interpolation ---------- */
  const interpCv = $('#interpCv');
  const NE = 7, PITCH = 5, SIG = 3.2;
  const I = { x: 12.2, noise: .05, mode: 'avg', vals: Array(NE).fill(0), est: null, acc: 0, scan: 0 };
  const measure = () => {
    for (let i = 0; i < NE; i++) I.vals[i] = Math.exp(-.5 * ((I.x - i * PITCH) / SIG) ** 2) + I.noise * .35 * randn();
    if (I.mode === 'max') {
      let b = 0; I.vals.forEach((v, i) => { if (v > I.vals[b]) b = i; }); I.est = b * PITCH;
    } else {
      let sw = 0, sx = 0;
      I.vals.forEach((v, i) => { const u = v - .12; if (u > 0) { sw += u; sx += u * i * PITCH; } });
      I.est = sw > 0 ? sx / sw : null;
    }
  };
  const updInterp = () => {
    $('#posOut').textContent = `${fmt(I.x, 1)} mm`;
    $('#noiseOut').textContent = `${Math.round(I.noise * 100)} %`;
    $('#iTrue').textContent = `${fmt(I.x, 1)} mm`;
    $('#iMeas').textContent = I.est == null ? '–' : `${fmt(I.est, 1)} mm`;
    $('#iErr').textContent = I.est == null ? '–' : `${fmt(Math.abs(I.est - I.x), 1)} mm`;
  };
  const interpMsg = () => {
    let t;
    if (I.mode === 'max') t = 'Nur die stärkste Elektrode zählt: Die Position springt in 5-mm-Schritten. Zwischen zwei Streifen liegst du bis zu 2,5 mm daneben.';
    else if (I.noise > .5) t = 'Starke Störungen: Die Balken zappeln, die Position springt hin und her. Handys filtern darum über mehrere Messungen.';
    else t = 'Der Schwerpunkt aller Balken trifft den Finger fast genau, auch zwischen zwei Streifen.';
    $('#interpStatus').textContent = t;
  };
  $('#posIn').addEventListener('input', e => { I.x = +e.target.value; });
  $('#noiseIn').addEventListener('input', e => { I.noise = +e.target.value / 100; interpMsg(); });
  $$('#modeBtns button').forEach(b => b.addEventListener('click', () => {
    I.mode = b.dataset.m; $$('#modeBtns button').forEach(x => x.classList.toggle('active', x === b)); interpMsg();
  }));
  measure(); updInterp();

  const drawInterp = dt => {
    measure();
    I.acc += dt; if (I.acc > .12) { I.acc = 0; updInterp(); }
    I.scan = (I.scan + dt * (reduced ? 0 : 14)) % NE;
    const { ctx, w, h } = fit(interpCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const left = 20, right = w - 20, X = mm => left + (mm + 2.5) * (right - left) / (NE * PITCH);
    const base = h - 66, bmax = base - 96, eW = (right - left) / NE * .62;
    // Finger
    const fx = X(I.x);
    ctx.fillStyle = C.copper; ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.ellipse(fx, 46, (X(SIG * 1.25) - X(0)), 16, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.copper; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fx, 62); ctx.lineTo(fx, base + 30); ctx.stroke(); ctx.setLineDash([]);
    // Balken
    let best = 0; I.vals.forEach((v, i) => { if (v > I.vals[best]) best = i; });
    for (let i = 0; i < NE; i++) {
      const x = X(i * PITCH), v = clamp(I.vals[i], 0, 1.3), bh = v * (base - bmax);
      ctx.fillStyle = I.mode === 'max' && i === best ? C.accent : C.fiber; ctx.globalAlpha = .75;
      ctx.fillRect(x - eW / 2, base - bh, eW, bh); ctx.globalAlpha = 1;
      // Elektrodenstreifen
      const on = Math.floor(I.scan) === i;
      ctx.fillStyle = on ? C.glow : C.muted; ctx.fillRect(x - eW / 2, base + 6, eW, 7);
      ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      if (!small || i % 2 === 0) ctx.fillText(`${i * PITCH}`, x, base + 28);
    }
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(left, base); ctx.lineTo(right, base); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText('mm', right, base + 44);
    // Schwelle beim Schwerpunkt
    if (I.mode === 'avg') {
      const ty = base - .12 * (base - bmax);
      ctx.strokeStyle = C.line; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(left, ty); ctx.lineTo(right, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    // Gemessene Position
    if (I.est != null) {
      const ex = X(I.est), ey = base + 15;
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 7, ey + 11); ctx.lineTo(ex + 7, ey + 11); ctx.closePath(); ctx.fill();
      ctx.textAlign = ex > w - 70 ? 'right' : 'left';
      ctx.fillText('gemessen', ex + (ctx.textAlign === 'left' ? 10 : -10), ey + 22);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.copper;
    ctx.fillText('Finger', 10, 18);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(small ? 'Streifen alle 5 mm' : 'Elektrodenstreifen alle 5 mm', w - 10, 18);
  };

  /* ---------- Teil 3: Multitouch ---------- */
  const multiCv = $('#multiCv');
  const COLS = 8, ROWS = 6, SP = .55;
  const MT = { mode: 'self', fingers: [{ c: 2.2, r: 1.4 }, { c: 5.4, r: 3.8 }], on: false, scan: 0, geo: null, res: null };
  const g1 = d => Math.exp(-d * d / (2 * SP * SP));
  const peaks = (arr, thr) => {
    const out = [];
    arr.forEach((v, i) => {
      if (v < thr || v < (arr[i - 1] ?? 0) || v <= (arr[i + 1] ?? 0)) return;
      const a = arr[i - 1] ?? 0, b = arr[i + 1] ?? 0;
      out.push(i + (b - a) / (a + v + b) * .9); // Schwerpunkt mit den Nachbarn
    });
    return out;
  };
  const analyse = () => {
    const F = MT.fingers;
    const rowP = Array.from({ length: ROWS }, (_, j) => F.reduce((s, f) => s + g1(j - f.r), 0));
    const colP = Array.from({ length: COLS }, (_, i) => F.reduce((s, f) => s + g1(i - f.c), 0));
    const node = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => F.reduce((s, f) => s + g1(Math.hypot(i - f.c, j - f.r)), 0)));
    let pts = [];
    if (MT.mode === 'self') {
      const rs = peaks(rowP, .45), cs = peaks(colP, .45);
      rs.forEach(r => cs.forEach(c => pts.push({ c, r })));
    } else {
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const v = node[j][i]; if (v < .45) continue;
        let isMax = true, sw = 0, sc = 0, sr = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const u = node[j + dj]?.[i + di]; if (u == null) continue;
          if (u > v || (u === v && (dj < 0 || (dj === 0 && di < 0)))) isMax = false;
          sw += u; sc += u * (i + di); sr += u * (j + dj);
        }
        if (isMax) pts.push({ c: sc / sw, r: sr / sw });
      }
    }
    pts = pts.map(p => ({ ...p, real: F.some(f => Math.hypot(f.c - p.c, f.r - p.r) < .7) }));
    MT.res = { rowP, colP, node, pts };
  };
  const updMulti = () => {
    analyse();
    const { pts } = MT.res, ghosts = pts.filter(p => !p.real).length;
    $('#mN').textContent = String(MT.fingers.length);
    $('#mDet').textContent = ghosts ? `${pts.length} (${ghosts} falsch)` : String(pts.length);
    $('#mMeas').textContent = MT.mode === 'self' ? `${ROWS + COLS}` : `${ROWS * COLS}`;
    let t;
    if (!MT.fingers.length) t = 'Tippe aufs Gitter, um Finger hinzuzufügen.';
    else if (MT.mode === 'self' && ghosts) t = `Es melden sich mehrere Zeilen und Spalten. Daraus ergeben sich ${pts.length} mögliche Punkte, ${ghosts} davon sind Geister. Welche echt sind, weiss der Chip nicht. Wechsle die Messart.`;
    else if (MT.mode === 'self') t = 'Mit einem Finger (oder Fingern in derselben Zeile) klappt es. Tippe einen zweiten Finger schräg daneben.';
    else t = `Jede Kreuzung einzeln gemessen: Jeder Finger ergibt seinen eigenen Fleck. Dafür braucht es ${ROWS * COLS} statt ${ROWS + COLS} Messungen pro Durchgang.`;
    $('#multiStatus').textContent = t;
  };
  $$('#scanBtns button').forEach(b => b.addEventListener('click', () => {
    MT.mode = b.dataset.s; $$('#scanBtns button').forEach(x => x.classList.toggle('active', x === b)); updMulti();
  }));
  $('#clearBtn').addEventListener('click', () => { MT.fingers = []; updMulti(); });
  multiCv.addEventListener('pointerdown', e => {
    if (!MT.on || !MT.geo) return;
    const r = multiCv.getBoundingClientRect(), { gx, gy, cell } = MT.geo;
    const c = (e.clientX - r.left - gx) / cell, rr = (e.clientY - r.top - gy) / cell;
    if (c < -.5 || c > COLS - .5 || rr < -.5 || rr > ROWS - .5) return;
    const i = MT.fingers.findIndex(f => Math.hypot(f.c - c, f.r - rr) < .7);
    if (i >= 0) MT.fingers.splice(i, 1);
    else { MT.fingers.push({ c: clamp(c, 0, COLS - 1), r: clamp(rr, 0, ROWS - 1) }); if (MT.fingers.length > 4) MT.fingers.shift(); }
    updMulti();
  });
  updMulti();

  const drawMulti = dt => {
    const { ctx, w, h } = fit(multiCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const lm = 38, tm = 36;
    const cell = Math.min((w - lm - 14) / COLS, (h - tm - 34) / ROWS);
    const gl = lm + ((w - lm - 14) - COLS * cell) / 2, gx = gl + cell / 2, gy = tm + cell / 2;
    MT.geo = { gx, gy, cell };
    const { rowP, colP, node, pts } = MT.res;
    const X = c => gx + c * cell, Y = r => gy + r * cell;
    MT.scan = (MT.scan + dt * (reduced ? 0 : 6)) % (MT.mode === 'self' ? ROWS + COLS : ROWS);
    const sIdx = Math.floor(MT.scan);
    // Glasfläche
    roundRect(ctx, gl - 4, tm - 4, COLS * cell + 8, ROWS * cell + 8, 10); ctx.fillStyle = C.sunk; ctx.fill();
    // Leitungen
    for (let j = 0; j < ROWS; j++) {
      const on = MT.mode === 'self' ? sIdx === j : sIdx === j;
      ctx.strokeStyle = on ? C.glow : C.fiber; ctx.globalAlpha = on ? .9 : .45; ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(gl, Y(j)); ctx.lineTo(gl + COLS * cell, Y(j)); ctx.stroke();
    }
    for (let i = 0; i < COLS; i++) {
      const on = MT.mode === 'self' && sIdx === ROWS + i;
      ctx.strokeStyle = on ? C.glow : C.accent; ctx.globalAlpha = on ? .9 : .35; ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(X(i), tm); ctx.lineTo(X(i), tm + ROWS * cell); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Messwerte
    if (MT.mode === 'self') {
      const bl = lm - 10, bt = tm - 10;
      for (let j = 0; j < ROWS; j++) {
        const v = clamp(rowP[j], 0, 1.2) / 1.2;
        ctx.fillStyle = v > .375 ? C.glow : C.muted; ctx.fillRect(gl - 8 - v * bl, Y(j) - 4, v * bl, 8);
      }
      for (let i = 0; i < COLS; i++) {
        const v = clamp(colP[i], 0, 1.2) / 1.2;
        ctx.fillStyle = v > .375 ? C.glow : C.muted; ctx.fillRect(X(i) - 4, tm - 8 - v * bt, 8, v * bt);
      }
    } else {
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const v = clamp(node[j][i], 0, 1.2);
        ctx.beginPath(); ctx.arc(X(i), Y(j), 2 + v * cell * .32, 0, TAU);
        ctx.fillStyle = v > .1 ? C.glow : C.line; ctx.globalAlpha = .25 + .6 * clamp(v, 0, 1); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    // Finger
    for (const f of MT.fingers) {
      ctx.beginPath(); ctx.arc(X(f.c), Y(f.r), cell * .42, 0, TAU);
      ctx.fillStyle = C.copper; ctx.globalAlpha = .4; ctx.fill(); ctx.globalAlpha = 1;
    }
    // Erkannte Punkte
    ctx.lineWidth = 2.5;
    for (const p of pts) {
      ctx.strokeStyle = p.real ? C.good : C.bad;
      if (!p.real) ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(X(p.c), Y(p.r), cell * .3, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (!p.real) { ctx.fillStyle = C.bad; ctx.font = '600 13px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', X(p.c), Y(p.r) + 5); }
    }
    // Legende
    ctx.font = MONO; ctx.textAlign = 'left';
    const ly = tm + ROWS * cell + 22;
    ctx.fillStyle = C.good; ctx.fillText('○ echt', gl, ly);
    ctx.fillStyle = C.bad; ctx.fillText('○ Geist', gl + 64, ly);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(small ? (MT.mode === 'self' ? 'Zeilen + Spalten' : 'jede Kreuzung') : (MT.mode === 'self' ? 'misst Zeilen und Spalten einzeln' : 'misst jede Kreuzung einzeln'), gl + COLS * cell, ly);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('touchscreen', 4, {
    fieldLock: () => { $$('#toolBtns button').forEach(b => b.disabled = false); $('#gapIn').disabled = false; },
    interpLock: () => { $('#posIn').disabled = false; $('#noiseIn').disabled = false; $$('#modeBtns button').forEach(b => b.disabled = false); },
    multiLock: () => { $$('#scanBtns button').forEach(b => b.disabled = false); $('#clearBtn').disabled = false; MT.on = true; },
  });

  loop((dt, now) => { drawField(dt, now); drawInterp(dt); drawMulti(dt); });
})();
