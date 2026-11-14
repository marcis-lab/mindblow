/* mindblow – Lektion Korrelation */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  const randn = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
  const poisson = lam => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  // Korrelationskoeffizient nach Pearson
  const corr = (x, y) => {
    const n = x.length; if (n < 3) return NaN;
    const mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
  };
  const fr = r => isNaN(r) ? '–' : (r < 0 ? '−' : '') + fmt(Math.abs(r), 2);

  /* ---------- Teil 1: Glace und Haie ---------- */
  const sharkCv = $('#sharkCv');
  const P1 = { view: 'all', c: 18, weeks: [] };
  const genWeeks = () => {
    P1.weeks = Array.from({ length: 156 }, (_, k) => {
      const T = 17 + 8 * Math.sin(TAU * k / 52 - Math.PI / 2) + randn() * 2.2;
      const ice = Math.max(.2, 2 + .6 * (T - 10) + randn() * 1.1);           // tausend Glaces pro Woche
      const shark = poisson(Math.max(.05, .22 * (T - 13)));                   // hängt nur an den Badenden, also an T
      return { T, ice, shark, jit: (Math.random() - .5) * .5 };
    });
  };
  genWeeks();
  const inWin = wk => Math.abs(wk.T - P1.c) <= 2;
  const updShark = () => {
    const all = P1.weeks, win = all.filter(inWin);
    const rA = corr(all.map(w => w.ice), all.map(w => w.shark));
    const rW = corr(win.map(w => w.ice), win.map(w => w.shark));
    $('#tWinOut').textContent = `${P1.c - 2}–${P1.c + 2} °C`;
    $('#rAll').textContent = fr(rA);
    $('#rWin').textContent = fr(rW);
    $('#nWin').textContent = `${win.length}`;
    $('#sharkStatus').textContent = P1.view === 'all'
      ? `Über alle Wochen: r = ${fr(rA)}. Mehr Glace, mehr Haiangriffe. Wähle jetzt nur gleich warme Wochen.`
      : win.length < 8 ? 'Zu wenige Wochen in diesem Fenster. Schieb die Temperatur in die Mitte.'
        : `Nur Wochen mit ${P1.c - 2} bis ${P1.c + 2} °C: r = ${fr(rW)}. Bei gleicher Hitze sagt die Glace fast nichts mehr über Haie.`;
  };
  $$('#viewBtns button').forEach(b => b.addEventListener('click', () => {
    P1.view = b.dataset.view;
    $$('#viewBtns button').forEach(x => x.classList.toggle('active', x === b));
    updShark();
  }));
  $('#tWin').addEventListener('input', e => { P1.c = +e.target.value; if (P1.view === 'all') { P1.view = 'win'; $$('#viewBtns button').forEach(x => x.classList.toggle('active', x.dataset.view === 'win')); } updShark(); });
  $('#sharkNew').addEventListener('click', () => { genWeeks(); updShark(); });
  updShark();

  const tempCol = T => T < 14 ? C.accent : T < 21 ? C.muted : C.copper;
  const fitLine = pts => {
    const mx = mean(pts.map(p => p.ice)), my = mean(pts.map(p => p.shark));
    let sxy = 0, sxx = 0;
    for (const p of pts) { sxy += (p.ice - mx) * (p.shark - my); sxx += (p.ice - mx) ** 2; }
    const b = sxx ? sxy / sxx : 0;
    return { b, a: my - b * mx, x0: Math.min(...pts.map(p => p.ice)), x1: Math.max(...pts.map(p => p.ice)) };
  };

  const drawShark = () => {
    const { ctx, w, h } = fit(sharkCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const gx = small ? 30 : 38, gy = 30, gw = w - gx - 14, gh = h - gy - 42;
    const xMax = Math.max(16, Math.ceil(Math.max(...P1.weeks.map(p => p.ice)) / 2) * 2), yMax = Math.max(6, Math.max(...P1.weeks.map(p => p.shark)) + 1);
    const X = v => gx + gw * v / xMax, Y = v => gy + gh - gh * v / yMax;
    ctx.font = MONO; ctx.lineWidth = 1;
    for (let v = 0; v <= yMax; v++) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke();
      if (!small || v % 2 === 0) { ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(v), gx - 6, Y(v) + 4); }
    }
    ctx.textAlign = 'center';
    for (let v = 0; v <= xMax; v += small ? 4 : 2) ctx.fillText(String(v), X(v), gy + gh + 15);
    ctx.textAlign = 'right'; ctx.fillText(small ? 'Glace (tausend/Woche)' : 'Glaceverkauf (tausend pro Woche)', gx + gw, gy + gh + 30);
    ctx.textAlign = 'left'; ctx.fillText(small ? 'Haiangriffe' : 'Haiangriffe pro Woche', 6, 14);
    const win = P1.view === 'win';
    for (const p of P1.weeks) {
      const on = !win || inWin(p);
      ctx.globalAlpha = on ? .85 : .12;
      ctx.beginPath(); ctx.arc(X(p.ice), Y(p.shark + p.jit), on && win ? 4 : 3.2, 0, TAU);
      ctx.fillStyle = tempCol(p.T); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const drawFit = (pts, col, dash) => {
      if (pts.length < 5) return;
      const L = fitLine(pts);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(X(L.x0), Y(L.a + L.b * L.x0)); ctx.lineTo(X(L.x1), Y(L.a + L.b * L.x1)); ctx.stroke(); ctx.setLineDash([]);
    };
    drawFit(P1.weeks, C.fg, win ? [5, 5] : []);
    if (win) drawFit(P1.weeks.filter(inWin), C.glow, []);
    // Legende Temperatur
    const lx = small ? gx + 4 : gx + 10;
    let x = lx;
    ctx.textAlign = 'left';
    for (const [col, txt] of [[C.accent, 'kühl'], [C.muted, 'mild'], [C.copper, 'heiss']]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 4, gy - 4, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = C.muted; ctx.fillText(txt, x + 12, gy);
      x += ctx.measureText(txt).width + 26;
    }
  };

  /* ---------- Teil 2: Zufallsjagd ---------- */
  const huntCv = $('#huntCv');
  const NAMES = ['Käsekonsum', 'Velounfälle', 'Kinobesuche', 'Regentage', 'Bananenimport', 'Hunde namens Luna', 'Zugverspätungen', 'Skiferien', 'Fondue-Abende', 'Bibliotheksausleihen', 'Gewitter', 'Hochzeiten'];
  const P2 = { trend: false, n: 8, series: [], rs: [], best: null, runs: 0, hits: 0 };
  const gen = () => {
    P2.series = NAMES.map(() => {
      const drift = (Math.random() * 2 - 1) * .9;
      let v = 0; const out = [];
      for (let i = 0; i < P2.n; i++) { v = P2.trend ? v + drift + randn() * .8 : randn(); out.push(v); }
      return out;
    });
    P2.rs = [];
    for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) P2.rs.push({ i, j, r: corr(P2.series[i], P2.series[j]) });
    P2.best = P2.rs.reduce((a, b) => Math.abs(b.r) > Math.abs(a.r) ? b : a);
    P2.runs++; if (Math.abs(P2.best.r) > .8) P2.hits++;
  };
  const updHunt = () => {
    $('#nOut').textContent = `${P2.n} Jahre`;
    const strong = P2.rs.filter(p => Math.abs(p.r) > .7).length;
    $('#hBest').textContent = fr(P2.best.r);
    $('#hStrong').textContent = `${strong}`;
    $('#hRuns').textContent = `${P2.hits} von ${P2.runs}`;
    const b = P2.best;
    $('#huntStatus').textContent = Math.abs(b.r) > .8
      ? `«${NAMES[b.i]}» und «${NAMES[b.j]}»: r = ${fr(b.r)}. Klingt nach einer Schlagzeile, ist aber reiner Zufall.`
      : `Bestes Paar nur r = ${fr(b.r)}. Mit ${P2.n} Werten pro Reihe täuscht der Zufall seltener.`;
  };
  const reroll = (resetCount) => { if (resetCount) { P2.runs = 0; P2.hits = 0; } gen(); updHunt(); };
  $$('#trendBtns button').forEach(b => b.addEventListener('click', () => {
    P2.trend = b.dataset.trend === '1';
    $$('#trendBtns button').forEach(x => x.classList.toggle('active', x === b));
    reroll(true);
  }));
  $('#nIn').addEventListener('input', e => { P2.n = +e.target.value; reroll(true); });
  $('#huntBtn').addEventListener('click', () => reroll(false));
  reroll(true);

  const drawHunt = () => {
    const { ctx, w, h } = fit(huntCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const b = P2.best, A = P2.series[b.i], B = P2.series[b.j];
    const gx = 14, gy = 46, gw = w - 28, gh = h - gy - 96;
    const n = A.length, year0 = 2025 - n + 1;
    const X = i => gx + gw * (n > 1 ? i / (n - 1) : .5);
    const norm = (s, flip) => { const lo = Math.min(...s), hi = Math.max(...s), d = hi - lo || 1; return s.map(v => flip ? (hi - v) / d : (v - lo) / d); };
    const a = norm(A, false), bb = norm(B, b.r < 0); // gegenläufige Reihe gespiegelt zeigen, damit das Muster sichtbar ist
    ctx.font = MONO; ctx.lineWidth = 1;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    const step = n > 24 ? 10 : n > 12 ? 5 : n > 7 ? 2 : 1;
    for (let i = 0; i < n; i++) if ((year0 + i) % step === 0 || n <= 7) ctx.fillText(String(year0 + i), X(i), gy + gh + 15);
    const line = (vals, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.beginPath();
      vals.forEach((v, i) => i ? ctx.lineTo(X(i), gy + gh - v * gh) : ctx.moveTo(X(i), gy + gh - v * gh)); ctx.stroke();
      ctx.fillStyle = col; vals.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), gy + gh - v * gh, 3, 0, TAU); ctx.fill(); });
    };
    line(a, C.accent); line(bb, C.copper);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillText(NAMES[b.i], gx, 14);
    ctx.fillStyle = C.copper; ctx.fillText(NAMES[b.j] + (b.r < 0 ? ' (umgedreht)' : ''), gx, 30);
    ctx.fillStyle = C.fg; ctx.textAlign = 'right'; ctx.fillText(`r = ${fr(b.r)}`, w - 14, 14);
    ctx.fillStyle = C.muted; ctx.fillText(small ? 'jede Linie eigene Skala' : 'jede Linie auf eigener Skala', w - 14, 30);
    // alle 66 Paare auf einer Linie von −1 bis 1
    const sy = h - 34, sx0 = 22, sx1 = w - 22;
    const SX = r => lerp(sx0, sx1, (r + 1) / 2);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke();
    ctx.fillStyle = C.bad; ctx.globalAlpha = .1;
    ctx.fillRect(sx0, sy - 14, SX(-.7) - sx0, 28); ctx.fillRect(SX(.7), sy - 14, sx1 - SX(.7), 28); ctx.globalAlpha = 1;
    const bins = {};
    for (const p of P2.rs) {
      const k = Math.round(SX(p.r) / 5); bins[k] = (bins[k] || 0) + 1;
      const y = sy - 3 - (bins[k] - 1) * 4;
      ctx.fillStyle = p === b ? C.copper : Math.abs(p.r) > .7 ? C.bad : C.muted;
      ctx.beginPath(); ctx.arc(SX(p.r), Math.max(sy - 30, y), p === b ? 4 : 2.4, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const r of [-1, -.5, 0, .5, 1]) ctx.fillText(r === 0 ? '0' : (r < 0 ? '−' : '') + fmt(Math.abs(r), 1), SX(r), sy + 16);
    ctx.textAlign = 'left'; ctx.fillText(small ? 'alle 66 Paare' : 'alle 66 Paare, nach r', sx0, sy + 30);
  };

  /* ---------- Teil 3: Beobachten oder Los ---------- */
  const rctCv = $('#rctCv');
  const P3 = { mode: 'obs', eff: 0, hidden: false, people: [] };
  const genPeople = () => {
    P3.people = Array.from({ length: 200 }, () => {
      const hdn = Math.random();                       // verborgen: wie sehr jemand auf die Gesundheit achtet
      return { h: hdn, base: 40 + 40 * hdn + randn() * 6, uo: Math.random(), ur: Math.random() < .5, jx: Math.random(), px: null, py: null };
    });
  };
  genPeople();
  const takes = p => P3.mode === 'obs' ? p.uo < .15 + .7 * p.h : p.ur;
  const health = p => p.base + (takes(p) ? P3.eff : 0);
  const diff = () => {
    const a = P3.people.filter(takes).map(health), b = P3.people.filter(p => !takes(p)).map(health);
    return { d: mean(a) - mean(b), ma: mean(a), mb: mean(b), na: a.length, nb: b.length };
  };
  const pts = v => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v), 1)}`;
  const updRct = () => {
    const D = diff();
    $('#effOut').textContent = `${P3.eff} Punkte`;
    $('#mDiff').textContent = `${pts(D.d)}`;
    $('#mTrue').textContent = `${pts(P3.eff)}`;
    $('#mErr').textContent = `${pts(D.d - P3.eff)}`;
    $('#rctStatus').textContent = P3.mode === 'obs'
      ? (P3.eff === 0
        ? `Die Pille wirkt gar nicht. Trotzdem sind die Pillen-Schlucker ${fmt(D.d, 1)} Punkte gesünder. Wer will, achtet auch sonst mehr auf sich.`
        : `Gemessen ${fmt(D.d, 1)}, wahr wären ${P3.eff}. Der Störfaktor bläht die Wirkung auf.`)
      : `Mit dem Los: ${fmt(D.d, 1)} Punkte Unterschied, nahe an der Wahrheit (${P3.eff}). Der Rest ist Zufall.`;
  };
  $$('#modeBtns button').forEach(b => b.addEventListener('click', () => {
    P3.mode = b.dataset.mode;
    $$('#modeBtns button').forEach(x => x.classList.toggle('active', x === b));
    updRct();
  }));
  $('#effIn').addEventListener('input', e => { P3.eff = +e.target.value; updRct(); });
  $('#hideBtn').addEventListener('click', () => {
    P3.hidden = !P3.hidden; $('#hideBtn').textContent = P3.hidden ? 'Verstecktes ausblenden' : 'Verstecktes zeigen';
  });
  $('#rctNew').addEventListener('click', () => { genPeople(); updRct(); });
  updRct();

  const drawRct = dt => {
    const { ctx, w, h } = fit(rctCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const gx = small ? 30 : 38, gy = 34, gw = w - gx - 12, gh = h - gy - 50;
    const Y = v => gy + gh - gh * clamp((v - 20) / 90, 0, 1);
    const colW = gw / 2;
    ctx.font = MONO; ctx.lineWidth = 1;
    for (let v = 20; v <= 110; v += 20) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(v), gx - 6, Y(v) + 4);
    }
    ctx.textAlign = 'left'; ctx.fillText('Gesundheit', 6, 14);
    const D = diff();
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText(`ohne Pille (${D.nb})`, gx + colW / 2, gy + gh + 18);
    ctx.fillText(`mit Pille (${D.na})`, gx + colW * 1.5, gy + gh + 18);
    const k = reduced ? 1 : Math.min(1, dt * 6);
    for (const p of P3.people) {
      const g = takes(p) ? 1 : 0;
      const tx = gx + colW * g + 14 + p.jx * (colW - 28), ty = Y(health(p));
      if (p.px === null) { p.px = tx; p.py = ty; }
      p.px = lerp(p.px, tx, k); p.py = lerp(p.py, ty, k);
      ctx.fillStyle = P3.hidden ? (p.h > .66 ? C.good : p.h < .33 ? C.bad : C.muted) : g ? C.accent : C.muted;
      ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(p.px, p.py, small ? 2.6 : 3.2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Durchschnitte
    for (const [g, m] of [[0, D.mb], [1, D.ma]]) {
      ctx.strokeStyle = C.copper; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx + colW * g + 8, Y(m)); ctx.lineTo(gx + colW * (g + 1) - 8, Y(m)); ctx.stroke();
      ctx.fillStyle = C.copper; ctx.textAlign = g ? 'right' : 'left';
      ctx.fillText(`Ø ${fmt(m, 1)}`, g ? gx + gw - 8 : gx + 8, Y(m) - 7);
    }
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx + colW, gy); ctx.lineTo(gx + colW, gy + gh); ctx.stroke();
    if (P3.hidden) {
      ctx.textAlign = 'right'; let x = w - 12;
      for (const [col, txt] of [[C.good, 'achtet sehr'], [C.muted, 'mittel'], [C.bad, 'kaum']].reverse()) {
        ctx.fillStyle = C.muted; ctx.fillText(txt, x, 14); x -= ctx.measureText(txt).width + 6;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - 3, 10, 4, 0, TAU); ctx.fill(); x -= 16;
      }
    } else {
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
      ctx.fillText(P3.mode === 'obs' ? 'jede Person entscheidet selbst' : 'eine Münze entscheidet', w - 12, 14);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('korrelation', 4, {
    sharkLock: () => { $$('#viewBtns button').forEach(b => b.disabled = false); $('#tWin').disabled = false; $('#sharkNew').disabled = false; },
    huntLock: () => { $$('#trendBtns button').forEach(b => b.disabled = false); $('#nIn').disabled = false; $('#huntBtn').disabled = false; },
    rctLock: () => { $$('#modeBtns button').forEach(b => b.disabled = false); $('#effIn').disabled = false; $('#hideBtn').disabled = false; $('#rctNew').disabled = false; },
  });

  loop(dt => { drawShark(); drawHunt(); drawRct(dt); });
})();
