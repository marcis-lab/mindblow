/* mindblow – Lektion Zinseszins */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  const MONO = '11px Geist Mono, monospace';
  const chf = n => 'CHF ' + fmt(Math.round(n), 0);
  const chf2 = n => 'CHF ' + fmt(n, 2);
  const niceStep = (range, count) => {
    const raw = range / count, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  };
  const niceInt = (range, count) => [1, 2, 5, 10, 20, 50].find(s => range / s <= count) || 100;

  /* ---------- Teil 1: 1 Rappen, jeden Tag doppelt ---------- */
  const dayVal = d => 0.01 * Math.pow(2, d - 1);
  const daySum = d => 0.01 * (Math.pow(2, d) - 1);
  const D = { day: 10, log: false, mix: 0, play: null, unlocked: false };
  const dayCv = $('#dayCv');
  const LOG_MIN = -3, LOG_MAX = 7; // 0,1 Rappen bis 10 Mio. Franken

  const dayReadout = () => {
    $('#dayOut').textContent = D.day;
    $('#zA').textContent = chf2(dayVal(D.day));
    $('#zS').textContent = chf2(daySum(D.day));
    $('#zN').textContent = fmt(D.day - 1, 0);
  };
  const dayStatus = () => {
    $('#dayStatus').textContent = D.log
      ? 'Logarithmische Skala: Jede Linie ist zehnmal so viel wie die darunter. Verdoppeln wird hier zu einer gleichmässigen Treppe.'
      : 'Lineare Skala: Jeder Abschnitt ist gleich viele Franken. Die ersten 20 Tage sind kaum zu sehen.';
  };
  const setDay = d => { D.day = d; $('#dayIn').value = d; dayReadout(); };
  const setLog = on => {
    D.log = on;
    $('#linBtn').classList.toggle('active', !on); $('#logBtn').classList.toggle('active', on);
    dayStatus();
  };
  $('#dayIn').addEventListener('input', e => { if (D.play) { clearInterval(D.play); D.play = null; } setDay(+e.target.value); });
  $('#linBtn').addEventListener('click', () => setLog(false));
  $('#logBtn').addEventListener('click', () => setLog(true));
  $('#playBtn').addEventListener('click', () => {
    if (D.play) return;
    if (reduced) { setDay(30); return; }
    setDay(1);
    D.play = setInterval(() => {
      if (D.day >= 30) { clearInterval(D.play); D.play = null; return; }
      setDay(D.day + 1);
    }, 170);
  });
  dayReadout(); dayStatus();

  const logLabel = e => e === -2 ? '1 Rp.' : e === -1 ? '10 Rp.' : e === 6 ? '1 Mio.' : e === 7 ? '10 Mio.' : fmt(Math.pow(10, e), 0);

  const drawDays = dt => {
    const target = D.log ? 1 : 0;
    D.mix = reduced ? target : D.mix + (target - D.mix) * (1 - Math.exp(-dt * 6));
    const { ctx, w, h } = fit(dayCv);
    ctx.clearRect(0, 0, w, h);
    const p = { l: 58, r: 14, t: 30, b: 38 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph;
    const LIN_MAX = 6e6;
    const hLin = v => v / LIN_MAX * ph;
    const hLog = v => Math.max(0, (Math.log10(v) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * ph;
    const hh = v => hLin(v) * (1 - D.mix) + hLog(v) * D.mix;

    // Gitter mit echten Werten der aktuellen Skala
    ctx.font = MONO; ctx.lineWidth = 1; ctx.textAlign = 'right';
    const ticks = D.mix < .5
      ? [0, 1, 2, 3, 4, 5, 6].map(m => [m * 1e6, m === 0 ? '0' : `${m} Mio.`])
      : [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(e => [Math.pow(10, e), logLabel(e)]);
    ctx.globalAlpha = Math.abs(D.mix - .5) * 2;
    for (const [v, lbl] of ticks) {
      const y = base - (v === 0 ? 0 : hh(v));
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(p.l, y + .5); ctx.lineTo(w - p.r, y + .5); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(lbl, p.l - 8, y + 4);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(D.mix < .5 ? 'Betrag pro Tag in CHF (linear)' : 'Betrag pro Tag in CHF (logarithmisch)', p.l, 16);

    // Säulen
    const bw = pw / 30, gap = bw > 8 ? 2 : 1;
    for (let d = 1; d <= 30; d++) {
      const v = dayVal(d), bh = hh(v), x = p.l + (d - 1) * bw + gap / 2;
      ctx.fillStyle = d === D.day ? C.copper : d < D.day ? C.glow : C.line;
      ctx.fillRect(x, base - bh, bw - gap, bh);
    }
    // Wert über dem gewählten Tag
    const cx = p.l + (D.day - .5) * bw, cy = base - hh(dayVal(D.day)) - 8;
    ctx.fillStyle = C.fg; ctx.font = '600 11px Geist Mono, monospace';
    const lbl = chf2(dayVal(D.day)), lw = ctx.measureText(lbl).width;
    ctx.textAlign = 'left';
    ctx.fillText(lbl, Math.min(w - p.r - lw, Math.max(p.l + 2, cx - lw / 2)), Math.max(p.t + 12, cy));

    // x-Achse
    ctx.strokeStyle = C.fg; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(p.l, base + .5); ctx.lineTo(w - p.r, base + .5); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'center';
    for (const d of [1, 5, 10, 15, 20, 25, 30]) ctx.fillText(d, p.l + (d - .5) * bw, base + 16);
    ctx.fillText('Tag', p.l + pw / 2, h - 6);
  };

  /* ---------- Teil 2: einfacher Zins gegen Zinseszins ---------- */
  const G = { start: 1000, rate: 5, years: 40 };
  const growCv = $('#growCv');
  const simple = t => G.start * (1 + G.rate / 100 * t);
  const comp = t => G.start * Math.pow(1 + G.rate / 100, t);
  const growReadout = () => {
    $('#startOut').textContent = fmt(G.start, 0);
    $('#rateOut').textContent = `${fmt(G.rate, 1)} %`;
    $('#yearsOut').textContent = G.years;
    const s = simple(G.years), c = comp(G.years);
    $('#gSimple').textContent = chf(s);
    $('#gComp').textContent = chf(c);
    $('#gDiff').textContent = (c - s >= 0.5 ? '+ ' : '') + chf(c - s);
    $('#growStatus').textContent = G.rate === 0
      ? 'Ohne Zins wächst gar nichts. Beide Linien liegen aufeinander.'
      : `Nach ${G.years} Jahren: ${chf(c)} statt ${chf(s)}, also ${fmt(c / s, 1)}-mal so viel. Zinssatz als Beispiel, vereinfacht ohne Steuern, Gebühren und Teuerung.`;
  };
  const bindRange = (id, key) => $(id).addEventListener('input', e => { G[key] = +e.target.value; growReadout(); });
  bindRange('#startIn', 'start'); bindRange('#rateIn', 'rate'); bindRange('#yearsIn', 'years');
  $('#exBtn').addEventListener('click', () => {
    Object.assign(G, { start: 1000, rate: 5, years: 40 });
    $('#startIn').value = 1000; $('#rateIn').value = 5; $('#yearsIn').value = 40;
    growReadout();
  });
  growReadout();

  const drawGrow = () => {
    const { ctx, w, h } = fit(growCv);
    ctx.clearRect(0, 0, w, h);
    const N = G.years;
    const top = Math.max(comp(N), simple(N), G.start);
    const yStep = niceStep(top, 5), yMax = Math.ceil(top / yStep) * yStep;
    ctx.font = MONO;
    const labW = ctx.measureText(fmt(yMax, 0)).width;
    const p = { l: Math.ceil(labW) + 16, r: 16, t: 34, b: 38 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph;
    const X = t => p.l + t / N * pw, Y = v => p.t + (1 - v / yMax) * ph;

    // Gitter
    ctx.lineWidth = 1; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (let v = 0; v <= yMax + yStep / 2; v += yStep) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(p.l, Y(v) + .5); ctx.lineTo(w - p.r, Y(v) + .5); ctx.stroke();
      ctx.fillText(fmt(v, 0), p.l - 8, Y(v) + 4);
    }
    const xs = niceInt(N, w < 420 ? 5 : 8);
    ctx.textAlign = 'center';
    for (let t = 0; t <= N; t += xs) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(t) + .5, base); ctx.lineTo(X(t) + .5, base + 5); ctx.stroke();
      ctx.fillText(t, X(t), base + 18);
    }
    ctx.fillText('Jahre', p.l + pw / 2, h - 6);
    ctx.textAlign = 'left'; ctx.fillText('CHF', 8, 16);

    // Fläche zwischen den Linien: Zins auf Zins
    const steps = Math.max(N * 4, 40);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) { const t = i / steps * N; i ? ctx.lineTo(X(t), Y(comp(t))) : ctx.moveTo(X(t), Y(comp(t))); }
    for (let i = steps; i >= 0; i--) { const t = i / steps * N; ctx.lineTo(X(t), Y(simple(t))); }
    ctx.closePath(); ctx.globalAlpha = .18; ctx.fillStyle = C.glow; ctx.fill(); ctx.globalAlpha = 1;

    // Linien (Kontostand am Ende jedes Jahres, dazwischen verbunden)
    const line = (fn, color, width, dash) => {
      ctx.beginPath();
      for (let t = 0; t <= N; t++) t ? ctx.lineTo(X(t), Y(fn(t))) : ctx.moveTo(X(t), Y(fn(t)));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    };
    line(simple, C.fiber, 2, [6, 4]);
    line(comp, C.glow, 2.5, []);
    for (const [fn, col] of [[simple, C.fiber], [comp, C.glow]]) {
      ctx.beginPath(); ctx.arc(X(N), Y(fn(N)), 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    }

    // Legende
    ctx.font = MONO; ctx.textAlign = 'right';
    ctx.fillStyle = C.glow; ctx.fillText('— Zins im Konto', w - p.r, 16);
    ctx.fillStyle = C.fiber; ctx.fillText('- - Zins ausbezahlt', w - p.r, 29);
  };

  /* ---------- Teil 3: Verdopplungszeit und Faustregel 72 ---------- */
  const V = { rate: 7, mode: '7' };
  const dblCv = $('#dblCv');
  const exact = r => Math.log(2) / Math.log(1 + r / 100);
  const rule = r => 72 / r;
  const dblReadout = () => {
    const r = V.rate, t = exact(r);
    $('#dRateOut').textContent = `${fmt(r, 1)} %`;
    $('#dExact').textContent = `${fmt(t, 2)} Jahre`;
    $('#dRule').textContent = `${fmt(rule(r), 1)} Jahre`;
    $('#dFactor').textContent = `× ${fmt(Math.pow(1 + r / 100, 30), 1)}`;
    const msg = {
      '7': 'Beispiel aus der Frage: exakt 10,24 Jahre, mit der Faustregel 10,3 Jahre. Fast gleich.',
      '12': 'Schulden auf einer Kreditkarte mit 12 % Zins (Beispiel) verdoppeln sich in rund 6 Jahren, wenn nichts zurückbezahlt wird. Zinseszins wirkt auch bei Schulden.',
      '2': 'Bei 2 % Teuerung pro Jahr verdoppeln sich die Preise in rund 35 Jahren. Mit demselben Geld kann man dann nur noch halb so viel kaufen.',
    }[V.mode];
    $('#dblStatus').textContent = msg || `Bei ${fmt(r, 1)} % pro Jahr verdoppelt sich ein Betrag in ${fmt(t, 1)} Jahren. Die Faustregel ergibt ${fmt(rule(r), 1)} Jahre. Zinssatz als Beispiel.`;
  };
  const setRate = (r, mode) => { V.rate = r; V.mode = mode; $('#dRateIn').value = r; dblReadout(); };
  $('#dRateIn').addEventListener('input', e => setRate(+e.target.value, ''));
  $('#d7').addEventListener('click', () => setRate(7, '7'));
  $('#d12').addEventListener('click', () => setRate(12, '12'));
  $('#d2').addEventListener('click', () => setRate(2, '2'));
  dblReadout();

  const drawDbl = () => {
    const { ctx, w, h } = fit(dblCv);
    ctx.clearRect(0, 0, w, h);
    const p = { l: 44, r: 16, t: 34, b: 38 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph;
    const R0 = 1, R1 = 15, YM = 80;
    const X = r => p.l + (r - R0) / (R1 - R0) * pw, Y = v => p.t + (1 - Math.min(v, YM) / YM) * ph;

    ctx.font = MONO; ctx.lineWidth = 1; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (let v = 0; v <= YM; v += 10) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(p.l, Y(v) + .5); ctx.lineTo(w - p.r, Y(v) + .5); ctx.stroke();
      ctx.fillText(v, p.l - 8, Y(v) + 4);
    }
    ctx.textAlign = 'center';
    const xs = w < 420 ? 2 : 1;
    for (let r = R0; r <= R1; r += xs) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(r) + .5, base); ctx.lineTo(X(r) + .5, base + 5); ctx.stroke();
      ctx.fillText(`${r}`, X(r), base + 18);
    }
    ctx.fillText('Wachstum pro Jahr in %', p.l + pw / 2, h - 6);
    ctx.textAlign = 'left'; ctx.fillText('Jahre bis zur Verdopplung', 8, 16);

    const curve = (fn, color, width, dash) => {
      ctx.beginPath();
      for (let i = 0; i <= 140; i++) { const r = R0 + i / 140 * (R1 - R0); i ? ctx.lineTo(X(r), Y(fn(r))) : ctx.moveTo(X(r), Y(fn(r))); }
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    };
    curve(rule, C.glow, 2, [6, 4]);
    curve(exact, C.fg, 2, []);

    // Markierung des gewählten Werts
    const r = V.rate, t = exact(r), x = X(r), y = Y(t);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x + .5, base); ctx.lineTo(x + .5, y); ctx.lineTo(p.l, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
    const lbl = `${fmt(t, 1)} Jahre`;
    ctx.font = '600 11px Geist Mono, monospace'; ctx.fillStyle = C.fg;
    const lw = ctx.measureText(lbl).width;
    ctx.textAlign = 'left';
    ctx.fillText(lbl, Math.min(w - p.r - lw, x + 9), Math.max(p.t + 10, y - 9));

    ctx.font = MONO; ctx.textAlign = 'right';
    ctx.fillStyle = C.fg; ctx.fillText('— exakt', w - p.r, 16);
    ctx.fillStyle = C.glow; ctx.fillText('- - Faustregel 72', w - p.r, 29);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('zinseszins', 4, {
    dayLock: () => { ['#dayIn', '#linBtn', '#logBtn', '#playBtn'].forEach(s => $(s).disabled = false); },
    growLock: () => { ['#startIn', '#rateIn', '#yearsIn', '#exBtn'].forEach(s => $(s).disabled = false); },
    dblLock: () => { ['#dRateIn', '#d7', '#d12', '#d2'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawDays(dt); drawGrow(); drawDbl(); });
})();
