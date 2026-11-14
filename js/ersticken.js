/* mindblow – Lektion Atemreiz (Warum musst du atmen?) */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';

  /* ---------- Vereinfachtes Modell ----------
     Drücke in mmHg. Ruhe, nach einem normalen Atemzug:
     O₂ im Blut sinkt um rund 20 mmHg pro Minute, CO₂ steigt um rund 6 mmHg pro Minute.
     Die Sättigung folgt einer S-Kurve (Hill-Gleichung), darum sinkt sie anfangs kaum. */
  const satOf = po2 => 100 / (1 + Math.pow(26.8 / Math.max(po2, 1), 2.7));
  const phOf = pco2 => 6.1 + Math.log10(24 / (0.03 * pco2));
  const URGE_CO2 = 50, CRIT_O2 = 30;
  const state = (t, hyp = 0, m = 1) => {
    const co2 = 40 - 18 * hyp + 6 * m * t / 60;
    const o2 = Math.max(12, 100 + 15 * hyp - 20 * m * t / 60);
    return { co2, o2, sat: satOf(o2) };
  };
  const urgeOf = s => clamp(Math.pow(Math.max(0, (s.co2 - 40) / (URGE_CO2 - 40)), 1.4) + 0.3 * Math.max(0, (60 - s.o2) / 60), 0, 1);

  const label = (ctx, txt, x, y, col, font, align = 'left') => { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = align; ctx.fillText(txt, x, y); };

  /* ---------- Teil 1: Luft anhalten ---------- */
  const holdCv = $('#holdCv');
  const H = { t: 0, play: false, T: 150 };
  const updHold = () => {
    const s = state(H.t), u = urgeOf(s);
    $('#tHold').value = Math.round(H.t);
    $('#tHoldOut').textContent = `${Math.round(H.t)} s`;
    $('#hSat').textContent = `${fmt(s.sat, 0)} %`;
    $('#hCo2').textContent = `${fmt(s.co2, 0)} mmHg`;
    $('#hPh').textContent = `pH ${fmt(phOf(s.co2), 2)}`;
    $('#hUrge').textContent = `${fmt(u * 100, 0)} %`;
    const st = $('#holdStatus');
    st.classList.toggle('warn', u >= 1);
    if (H.t < 1) st.textContent = 'Halte die Luft an. Im Modell läuft die Zeit fünfmal schneller.';
    else if (u < .25) st.textContent = 'Alles ruhig. Das CO₂ steigt schon, die Sättigung bleibt fast gleich.';
    else if (u < .7) st.textContent = 'Der Drang wird spürbar. Der Sauerstoff reicht noch locker.';
    else if (u < 1) st.textContent = 'Jetzt wird es unangenehm. Das Blut wird saurer, das Zwerchfell zuckt.';
    else st.textContent = `Du musst atmen! Die Sättigung liegt aber noch bei rund ${fmt(s.sat, 0)} %.`;
  };
  $('#tHold').addEventListener('input', e => { H.t = +e.target.value; H.play = false; $('#holdBtn').textContent = 'Luft anhalten'; updHold(); });
  $('#holdBtn').addEventListener('click', () => {
    if (H.t >= H.T) H.t = 0;
    H.play = !H.play;
    if (reduced && H.play) { H.t = 105; H.play = false; }
    $('#holdBtn').textContent = H.play ? 'Pause' : 'Luft anhalten';
    updHold();
  });
  $('#breathBtn').addEventListener('click', () => { H.t = 0; H.play = false; $('#holdBtn').textContent = 'Luft anhalten'; updHold(); });
  updHold();

  const drawHold = dt => {
    const { ctx, w, h } = fit(holdCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    if (H.play) {
      H.t += dt * 5;
      if (H.t >= H.T) { H.t = H.T; H.play = false; $('#holdBtn').textContent = 'Luft anhalten'; }
      updHold();
    }
    const barW = narrow ? 22 : 30;
    const gx0 = narrow ? 34 : 44, gx1 = w - barW - (narrow ? 34 : 48);
    const X = t => gx0 + t / H.T * (gx1 - gx0);
    const p1 = [30, h * .47], p2 = [h * .55 + 14, h - 34];
    const Y1 = v => p1[1] - (v - 50) / 50 * (p1[1] - p1[0]);
    const Y2 = v => p2[1] - (v - 35) / 25 * (p2[1] - p2[0]);
    const cur = state(H.t), u = urgeOf(cur);

    const panel = (y0, y1, ticks, Y, title, unit) => {
      ctx.fillStyle = C.sunk; ctx.fillRect(gx0, y0, gx1 - gx0, y1 - y0);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
      for (const v of ticks) { const y = Y(v); ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); ctx.fillText(String(v), gx0 - 5, y + 3); }
      label(ctx, `${title} ${unit}`, gx0, y0 - 8, C.fg, `500 11px ${MONO}`);
    };
    panel(p1[0], p1[1], [50, 75, 100], Y1, narrow ? 'O₂-Sättigung' : 'Sauerstoff-Sättigung', 'in %');
    panel(p2[0], p2[1], [40, 50, 60], Y2, 'CO₂ im Blut', 'in mmHg');

    // Schwelle Atemdrang
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx0, Y2(URGE_CO2)); ctx.lineTo(gx1, Y2(URGE_CO2)); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, narrow ? 'starker Drang' : 'starker Atemdrang', gx0 + 6, Y2(URGE_CO2) - 5, C.glow, `10px ${MONO}`);

    const curve = (f, Y, col, t1, alpha) => {
      ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const t = t1 * i / 120, y = Y(f(state(t))); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    };
    curve(s => s.sat, Y1, C.fiber, H.T, .22); curve(s => s.sat, Y1, C.fiber, H.t, 1);
    curve(s => s.co2, Y2, C.copper, H.T, .22); curve(s => s.co2, Y2, C.copper, H.t, 1);

    // Zeitachse und Cursor
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const t of [0, 30, 60, 90, 120, 150]) ctx.fillText(narrow && t % 60 && t !== 150 ? '' : `${t} s`, X(t), h - 18);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(X(H.t), p1[0]); ctx.lineTo(X(H.t), p2[1]); ctx.stroke();
    for (const [v, Y, col] of [[cur.sat, Y1, C.fiber], [cur.co2, Y2, C.copper]]) {
      ctx.beginPath(); ctx.arc(X(H.t), Y(v), 5, 0, TAU); ctx.fillStyle = col; ctx.fill();
    }
    label(ctx, 'Luft angehalten', (gx0 + gx1) / 2, h - 4, C.muted, `10px ${MONO}`, 'center');

    // Atemdrang-Balken
    const bx = w - barW - (narrow ? 8 : 14), by0 = 30, by1 = h - 34;
    roundRect(ctx, bx, by0, barW, by1 - by0, 6); ctx.fillStyle = C.sunk; ctx.fill();
    const bh = (by1 - by0) * u;
    if (bh > 1) {
      roundRect(ctx, bx, by1 - bh, barW, bh, 6);
      ctx.fillStyle = u >= 1 ? C.bad : u > .6 ? C.glow : C.accent;
      if (!reduced && u >= 1) { ctx.globalAlpha = .75 + .25 * Math.sin(performance.now() / 120); }
      ctx.fill(); ctx.globalAlpha = 1;
    }
    roundRect(ctx, bx, by0, barW, by1 - by0, 6); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, 'Drang', bx + barW / 2, by0 - 8, C.fg, `500 11px ${MONO}`, 'center');
    label(ctx, `${fmt(u * 100, 0)}%`, bx + barW / 2, by1 + 16, u >= 1 ? C.bad : C.muted, `10px ${MONO}`, 'center');
  };

  /* ---------- Teil 2: Regelkreis im Atemzentrum ---------- */
  const ctrlCv = $('#ctrlCv');
  const R = { c: 0, o: 21, f: 1, pco2: 40, po2: 100, rate: 14, vt: .5, phase: 0, hist: [], acc: 0 };
  // Gleichgewicht suchen: Lüftung f (1 = Ruhe) bestimmt die Gase in der Lunge, die Gase bestimmen f
  const solveCtrl = () => {
    let f = 1;
    for (let i = 0; i < 60; i++) {
      const pco2 = R.c * 7.13 + 40 / f;
      const po2 = R.o * 7.13 - pco2 / 0.8;
      const d = pco2 - 40;
      const base = Math.exp((d >= 0 ? .12 : .04) * d);
      const hyp = po2 < 70 ? Math.pow((70 - po2) / 30, 2) : 0;
      const nf = clamp(base * (1 + hyp), .5, 6);
      f += (nf - f) * .35;
    }
    R.f = f; R.pco2 = R.c * 7.13 + 40 / f; R.po2 = R.o * 7.13 - R.pco2 / 0.8;
    R.rate = 14 * Math.pow(f, .4); R.vt = .5 * Math.pow(f, .6);
  };
  const updCtrl = (msg) => {
    solveCtrl();
    $('#co2In').value = R.c; $('#o2In').value = R.o;
    $('#co2Out').textContent = R.c < .05 ? '0,04 %' : `${fmt(R.c, 1)} %`;
    $('#o2Out').textContent = `${fmt(R.o, R.o % 1 ? 1 : 0)} %`;
    const sat = satOf(R.po2);
    $('#cBlood').textContent = `${fmt(R.pco2, 0)} mmHg`;
    $('#cSat').textContent = `Sättigung ${fmt(sat, 0)} %`;
    $('#cRate').textContent = `${fmt(R.rate, 0)} / min`;
    $('#cDepth').textContent = `${fmt(R.vt, 1)} l pro Atemzug`;
    $('#cVent').textContent = `${fmt(R.rate * R.vt, 1)} l`;
    if (msg) { $('#ctrlStatus').textContent = msg; return; }
    const x = R.rate * R.vt / 7;
    let t;
    if (R.c < .05 && R.o >= 20.5) t = 'Normale Luft: ruhiger Atem, rund 14 Züge pro Minute.';
    else if (R.c >= .05 && R.o >= 18) t = `Schon ${fmt(R.pco2 - 40, 0)} mmHg mehr CO₂ im Blut, und du atmest ${fmt(x, 1)}-mal so viel Luft. Das Atemzentrum reagiert sehr empfindlich.`;
    else if (R.c < .05 && sat > 85) t = `Weniger Sauerstoff, und die Atmung ändert sich kaum. Die Sättigung sinkt aber schon auf ${fmt(sat, 0)} %.`;
    else if (R.c < .05) t = `Erst bei starkem Mangel atmest du mehr. Das senkt zugleich das CO₂ und bremst die Atmung wieder (vereinfacht).`;
    else t = `Beides zusammen: Das CO₂ treibt die Atmung am stärksten an.`;
    $('#ctrlStatus').textContent = t;
  };
  $('#co2In').addEventListener('input', e => { R.c = +e.target.value; updCtrl(); });
  $('#o2In').addEventListener('input', e => { R.o = +e.target.value; updCtrl(); });
  $('#cNorm').addEventListener('click', () => { R.c = 0; R.o = 21; updCtrl(); });
  $('#cCo2').addEventListener('click', () => { R.c = 5; R.o = 21; updCtrl(); });
  $('#cLowO2').addEventListener('click', () => { R.c = 0; R.o = 15; updCtrl(); });
  updCtrl();

  const arrow = (ctx, x0, y0, x1, y1, col) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 8 * Math.cos(a - .4), y1 - 8 * Math.sin(a - .4)); ctx.lineTo(x1 - 8 * Math.cos(a + .4), y1 - 8 * Math.sin(a + .4)); ctx.closePath(); ctx.fill();
  };
  const node = (ctx, x, y, bw, bh, title, sub, col, narrow) => {
    roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 10); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, title, x, y - (sub ? 3 : -4), C.fg, `500 ${narrow ? 11 : 12}px ${MONO}`, 'center');
    if (sub) label(ctx, sub, x, y + 12, C.muted, `10px ${MONO}`, 'center');
  };

  const drawCtrl = dt => {
    const { ctx, w, h } = fit(ctrlCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const vol = ph => R.vt * (1 - Math.cos(TAU * ph)) / 2;
    if (!reduced) {
      R.phase = (R.phase + dt * R.rate / 60) % 1;
      R.acc += dt;
      while (R.acc >= .05) { R.acc -= .05; R.hist.push(vol(R.phase)); }
      if (R.hist.length > 300) R.hist.splice(0, R.hist.length - 300);
    }
    const v = reduced ? R.vt * .7 : vol(R.phase);

    // Regelkreis: vier Stationen im Uhrzeigersinn
    const top = 26, bot = h * .56;
    const cy = (top + bot) / 2;
    const xl = w * (narrow ? .2 : .2), xr = w * (narrow ? .8 : .8), xc = w / 2;
    const bw = narrow ? 96 : 130, bh = 40;
    const PTS = [[xl, cy], [xc, top + bh / 2], [xr, cy], [xc, bot - bh / 2]];
    // Kreisbahn mit Punkten
    ctx.strokeStyle = C.line; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(xc, cy, (xr - xl) / 2, (bot - top - bh) / 2, 0, 0, TAU); ctx.stroke();
    const speed = R.rate * R.vt / 7;
    const tt = reduced ? 0 : performance.now() / 1000 * .12 * speed;
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI + TAU * ((i / 14 + tt) % 1);
      ctx.beginPath(); ctx.arc(xc + Math.cos(a) * (xr - xl) / 2, cy + Math.sin(a) * (bot - top - bh) / 2, 3, 0, TAU);
      ctx.fillStyle = C.accent; ctx.fill();
    }
    // Pfeilspitzen auf der Bahn (Uhrzeigersinn)
    for (const a of [-Math.PI * .75, -Math.PI * .25, Math.PI * .25, Math.PI * .75]) {
      const rx = (xr - xl) / 2, ry = (bot - top - bh) / 2;
      const x = xc + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      const tx = -Math.sin(a) * rx, ty = Math.cos(a) * ry, n = Math.hypot(tx, ty);
      arrow(ctx, x - tx / n * 10, y - ty / n * 10, x + tx / n * 6, y + ty / n * 6, C.muted);
    }
    const co2c = R.pco2 > 44 ? C.bad : R.pco2 < 37 ? C.fiber : C.copper;
    node(ctx, ...PTS[1], bw, bh, 'Blut', `CO₂ ${fmt(R.pco2, 0)} mmHg`, co2c, narrow);
    node(ctx, ...PTS[2], bw, bh, narrow ? 'Atem­zentrum' : 'Atemzentrum', 'im Hirnstamm', C.accent, narrow);
    node(ctx, ...PTS[3], bw, bh, 'Zwerchfell', `${fmt(R.rate, 0)} Züge / min`, C.accent, narrow);
    // Lunge als atmende Form
    const [lx, ly] = PTS[0];
    const ls = (narrow ? 16 : 20) * (0.75 + .5 * v / 1.5);
    ctx.fillStyle = 'rgba(214, 120, 130, .85)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(lx + sx * ls * .62, ly + 2, ls * .55, ls, sx * .12, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly - ls - 8); ctx.lineTo(lx, ly - ls * .4); ctx.stroke();
    label(ctx, 'Lunge', lx, ly + ls + 15, C.fg, `500 ${narrow ? 11 : 12}px ${MONO}`, 'center');
    // Beschriftung der Wege
    const fs = `10px ${MONO}`;
    if (!narrow) {
      label(ctx, 'Gasaustausch', (xl + xc) / 2 - 24, top + 30, C.muted, fs, 'right');
      label(ctx, 'Sensoren messen CO₂, pH', (xr + xc) / 2 + 24, top + 30, C.muted, fs, 'left');
      label(ctx, 'Nerven geben den Takt', (xr + xc) / 2 + 24, bot - 4, C.muted, fs, 'left');
      label(ctx, 'zieht Luft hinein', (xl + xc) / 2 - 24, bot - 4, C.muted, fs, 'right');
    }
    // Einatemluft
    label(ctx, `Luft: ${R.c < .05 ? '0,04' : fmt(R.c, 1)} % CO₂`, xc, cy - 4, C.muted, fs, 'center');
    label(ctx, `${fmt(R.o, R.o % 1 ? 1 : 0)} % O₂`, xc, cy + 10, C.muted, fs, 'center');

    // Atemkurve
    const sx0 = narrow ? 30 : 40, sx1 = w - 12, sy0 = h * .64, sy1 = h - 22;
    const SY = l => sy1 - l / 1.6 * (sy1 - sy0);
    ctx.fillStyle = C.sunk; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (const l of [0, .5, 1, 1.5]) { ctx.beginPath(); ctx.moveTo(sx0, SY(l)); ctx.lineTo(sx1, SY(l)); ctx.stroke(); ctx.fillText(fmt(l, 1), sx0 - 4, SY(l) + 3); }
    label(ctx, narrow ? 'Atemkurve in Litern, 15 s' : 'Atemkurve: Luft pro Atemzug in Litern, letzte 15 Sekunden', sx0, sy0 - 8, C.fg, `500 11px ${MONO}`);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath();
    if (reduced) {
      for (let i = 0; i <= 200; i++) { const t = 15 * i / 200, y = SY(vol(t * R.rate / 60)); i ? ctx.lineTo(sx0 + (sx1 - sx0) * i / 200, y) : ctx.moveTo(sx0, y); }
    } else {
      const n = R.hist.length;
      R.hist.forEach((l, i) => { const x = sx1 - (n - 1 - i) / 299 * (sx1 - sx0); i ? ctx.lineTo(x, SY(l)) : ctx.moveTo(x, SY(l)); });
    }
    ctx.stroke();
  };

  /* ---------- Teil 3: Hyperventilieren vor dem Tauchen ---------- */
  const diveCv = $('#diveCv');
  const D = { hyp: 0, m: 1, T: 300 };
  const times = (hyp, m) => {
    let tU = null, tC = null;
    for (let t = 0; t <= 600; t += .5) {
      const s = state(t, hyp, m);
      if (tU === null && s.co2 >= URGE_CO2) tU = t;
      if (tC === null && s.o2 <= CRIT_O2) tC = t;
      if (tU !== null && tC !== null) break;
    }
    return { tU, tC };
  };
  const updDive = () => {
    $('#hypIn').value = Math.round(D.hyp * 100);
    $('#hypOut').textContent = `${Math.round(D.hyp * 100)} %`;
    $$('#actSel button').forEach(b => b.classList.toggle('active', +b.dataset.a === D.m));
    const { tU, tC } = times(D.hyp, D.m), gap = tC - tU;
    $('#dUrge').textContent = `${fmt(tU, 0)} s`;
    $('#dCrit').textContent = `${fmt(tC, 0)} s`;
    $('#dGap').textContent = gap > 0 ? `${fmt(gap, 0)} s` : 'keine';
    $('#dGap').style.color = gap > 40 ? '' : C.bad;
    const st = $('#diveStatus');
    st.classList.toggle('warn', gap <= 20);
    if (D.hyp === 0) st.textContent = D.m === 1 ? 'Normal: Der Atemdrang kommt lange, bevor der Sauerstoff knapp wird.' : 'Beim Schwimmen geht alles etwa doppelt so schnell. Der Drang warnt trotzdem rechtzeitig.';
    else if (gap > 40) st.textContent = 'Das CO₂ startet tiefer, also kommt der Drang später. Der Sauerstoff steigt dabei kaum.';
    else if (gap > 0) st.textContent = 'Die Vorwarnzeit schrumpft. Viel Reserve bleibt nicht mehr.';
    else st.textContent = 'Gefahr: Der Sauerstoff wird knapp, bevor der Drang kommt. Bewusstlos ohne Vorwarnung.';
  };
  $('#hypIn').addEventListener('input', e => { D.hyp = +e.target.value / 100; updDive(); });
  $$('#actSel button').forEach(b => b.addEventListener('click', () => { D.m = +b.dataset.a; updDive(); }));
  updDive();

  const drawDive = () => {
    const { ctx, w, h } = fit(diveCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const gx0 = narrow ? 34 : 44, gx1 = w - 12;
    const X = t => gx0 + clamp(t, 0, D.T) / D.T * (gx1 - gx0);
    const p1 = [28, h * .32], p2 = [h * .32 + 34, h * .62];
    const Y1 = v => p1[1] - (clamp(v, 30, 100) - 30) / 70 * (p1[1] - p1[0]);
    const Y2 = v => p2[1] - (clamp(v, 15, 65) - 15) / 50 * (p2[1] - p2[0]);
    const panel = (y0, y1, ticks, Y, title) => {
      ctx.fillStyle = C.sunk; ctx.fillRect(gx0, y0, gx1 - gx0, y1 - y0);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
      for (const v of ticks) { const y = Y(v); ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); ctx.fillText(String(v), gx0 - 5, y + 3); }
      label(ctx, title, gx0, y0 - 8, C.fg, `500 11px ${MONO}`);
    };
    panel(p1[0], p1[1], [50, 100], Y1, narrow ? 'O₂-Sättigung in %' : 'Sauerstoff-Sättigung in %');
    panel(p2[0], p2[1], [20, 40, 60], Y2, 'CO₂ im Blut in mmHg');
    // Schwellen
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    const critSat = satOf(CRIT_O2);
    ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.moveTo(gx0, Y1(critSat)); ctx.lineTo(gx1, Y1(critSat)); ctx.stroke();
    ctx.strokeStyle = C.glow; ctx.beginPath(); ctx.moveTo(gx0, Y2(URGE_CO2)); ctx.lineTo(gx1, Y2(URGE_CO2)); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'kritisch', gx1 - 4, Y1(critSat) + 13, C.bad, `10px ${MONO}`, 'right');
    label(ctx, 'Atemdrang', gx1 - 4, Y2(URGE_CO2) - 5, C.glow, `10px ${MONO}`, 'right');

    const curve = (hyp, f, Y, col, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = dash ? 1.5 : 2.5; ctx.setLineDash(dash ? [3, 4] : []); ctx.beginPath();
      for (let i = 0; i <= 150; i++) { const t = D.T * i / 150, y = Y(f(state(t, hyp, D.m))); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    if (D.hyp > 0) { curve(0, s => s.sat, Y1, C.muted, true); curve(0, s => s.co2, Y2, C.muted, true); }
    curve(D.hyp, s => s.sat, Y1, C.fiber, false);
    curve(D.hyp, s => s.co2, Y2, C.copper, false);

    const cur = times(D.hyp, D.m), nor = times(0, D.m);
    // Markierungen
    const mark = (t, col) => {
      if (t > D.T) return;
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.moveTo(X(t), p1[0]); ctx.lineTo(X(t), p2[1]); ctx.stroke(); ctx.globalAlpha = 1;
    };
    mark(cur.tU, C.glow); mark(cur.tC, C.bad);

    // Zeitachse
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let t = 0; t <= D.T; t += 60) ctx.fillText(narrow && t % 120 && t !== 300 ? '' : `${t} s`, X(t), p2[1] + 14);

    // Vergleich als Zeitbalken
    const rows = [['normal', nor], [narrow ? 'so' : 'mit Einstellung', cur]];
    const ry0 = p2[1] + 36, rh = narrow ? 24 : 26, rg = 22;
    label(ctx, narrow ? 'Warnung vor dem Notfall?' : 'Kommt die Warnung vor dem Notfall?', gx0, ry0 - 6, C.fg, `500 11px ${MONO}`);
    rows.forEach(([name, r], i) => {
      const y = ry0 + 4 + i * (rh + rg);
      roundRect(ctx, gx0, y, gx1 - gx0, rh, 6); ctx.fillStyle = C.sunk; ctx.fill();
      const a = Math.min(r.tU, r.tC), b = Math.max(r.tU, r.tC);
      if (b > a) {
        ctx.fillStyle = r.tU < r.tC ? C.good : C.bad; ctx.globalAlpha = .8;
        roundRect(ctx, X(a), y, Math.max(2, X(b) - X(a)), rh, 6); ctx.fill(); ctx.globalAlpha = 1;
      }
      const txt = r.tU < r.tC ? (narrow ? 'Vorwarnung' : 'Vorwarnung: Zeit zum Auftauchen') : (narrow ? 'keine Warnung' : 'keine Warnung, Blackout-Gefahr');
      const mid = (X(a) + X(b)) / 2;
      ctx.font = `500 10px ${MONO}`;
      const tw = ctx.measureText(txt).width;
      const tx = clamp(mid, gx0 + tw / 2 + 4, gx1 - tw / 2 - 4);
      label(ctx, txt, tx, y + rh / 2 + 4, b - a > 0 && Math.abs(X(b) - X(a)) > tw + 8 ? '#ffffff' : C.fg, `500 10px ${MONO}`, 'center');
      label(ctx, name, gx0 + 6, y + rh + 13, C.muted, `10px ${MONO}`);
    });
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('ersticken', 4, {
    holdLock: () => { ['#tHold', '#holdBtn', '#breathBtn'].forEach(s => $(s).disabled = false); },
    ctrlLock: () => { ['#co2In', '#o2In', '#cNorm', '#cCo2', '#cLowO2'].forEach(s => $(s).disabled = false); },
    diveLock: () => { $('#hypIn').disabled = false; $$('#actSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawHold(dt); drawCtrl(dt); drawDive(); });
})();
