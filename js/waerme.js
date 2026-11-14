/* mindblow – Lektion Wärme */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const deg = (t, d = 0) => `${fmt(t, d)} °C`;
  const setTxt = (sel, s) => { const el = $(sel); if (el.textContent !== s) el.textContent = s; };

  // bewusst feste Farben: Temperaturskala von kalt (blau) bis heiss (rot), Haut, Wärmepunkte
  const RAMP = [[-20, [40, 80, 190]], [0, [70, 135, 225]], [15, [110, 185, 215]], [25, [225, 200, 120]], [40, [240, 140, 60]], [60, [215, 55, 45]], [100, [150, 20, 40]]];
  const tcolA = t => {
    if (t <= RAMP[0][0]) return RAMP[0][1];
    for (let i = 0; i < RAMP.length - 1; i++) {
      const [t0, c0] = RAMP[i], [t1, c1] = RAMP[i + 1];
      if (t <= t1) { const k = (t - t0) / (t1 - t0); return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)]; }
    }
    return RAMP[RAMP.length - 1][1];
  };
  const tcol = (t, a = 1) => { const c = tcolA(t); return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`; };
  const HEAT = '#f08a3c', COLDF = '#4a8be0', SKINC = '#e6b293', SKIND = '#c98a6a';
  // feste Pseudo-Zufallszahlen, damit Muster nicht flackern
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const arrowHead = (ctx, x, y, ang, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s * Math.cos(ang - .45), y - s * Math.sin(ang - .45));
    ctx.lineTo(x - s * Math.cos(ang + .45), y - s * Math.sin(ang + .45));
    ctx.closePath(); ctx.fill();
  };

  /* ---------- Teil 1: Kontakttemperatur ---------- */
  // b = Wärmeeindringkoeffizient (rund, in W·s^½/(m²·K)), a = Temperaturleitfähigkeit (rund, m²/s)
  const SKIN = 1100, TS = 33;
  const MATS = {
    holz: { name: 'Holz', b: 350, a: 1.6e-7, col: '#b98552', dark: '#8a5a30', txt: '#ffffff',
      msg: 'Holz leitet schlecht. Deine Haut wärmt die Oberfläche schnell auf, danach fliesst kaum noch Wärme ab.' },
    plastik: { name: 'Kunststoff', b: 550, a: 1.1e-7, col: '#3f9c98', dark: '#2a6f6c', txt: '#ffffff',
      msg: 'Kunststoff leitet ähnlich schlecht wie Holz. Darum haben Pfannen oft Griffe aus Kunststoff.' },
    stein: { name: 'Stein', b: 2300, a: 1.3e-6, col: '#8e9196', dark: '#5f6268', txt: '#ffffff',
      msg: 'Stein leitet schon deutlich besser. Darum fühlen sich Steinplatten im Bad am Morgen kühl an.' },
    stahl: { name: 'Stahl', b: 7500, a: 4e-6, col: '#b9c0c8', dark: '#7d858f', txt: '#1d2126',
      msg: 'Stahl zieht die Wärme schnell aus deinem Finger. Die Haut kühlt an der Berührung fast auf 20 °C ab.' },
    kupfer: { name: 'Kupfer', b: 37000, a: 1.1e-4, col: '#c87533', dark: '#8f4f1f', txt: '#ffffff',
      msg: 'Kupfer leitet etwa tausendmal besser als Holz. Die Haut an der Berührung hat fast genau die Temperatur des Kupfers.' },
  };
  const K = { m: 'stahl', T: 20, t: 1, dots: [], acc: 0 };
  const beff = m => SKIN * MATS[m].b / (SKIN + MATS[m].b);
  const contact = () => { const b = MATS[K.m].b; return (SKIN * TS + b * K.T) / (SKIN + b); };
  const feel = tc => tc < 14 ? 'eiskalt' : tc < 23 ? 'kalt' : tc < 27 ? 'kühl' : tc < 29.5 ? 'leicht kühl'
    : tc < 35 ? 'neutral' : tc < 38 ? 'warm' : tc < 43 ? 'heiss' : 'zu heiss, autsch';
  const updK = () => {
    const tc = contact();
    $('#kTIn').value = K.T;
    $('#kTOut').textContent = deg(K.T);
    $('#kTc').textContent = deg(tc, 1);
    $('#kFlow').textContent = `×${fmt(beff(K.m) / beff('holz'), 1)}`;
    $('#kFeel').textContent = feel(tc);
    $$('#matSel button').forEach(b => b.classList.toggle('active', b.dataset.m === K.m));
    let msg = MATS[K.m].msg;
    if (Math.abs(K.T - TS) < 1.5) msg = 'Gegenstand und Haut sind gleich warm. Jetzt fliesst gar keine Wärme, und jedes Material fühlt sich gleich an.';
    else if (K.T > TS + 8) msg = K.m === 'holz' || K.m === 'plastik'
      ? 'Heiss, aber Holz und Kunststoff geben ihre Wärme nur langsam an deine Haut ab. Vergleiche mit Metall.'
      : 'Jetzt fliesst die Wärme in deinen Finger. Gut leitendes Material fühlt sich darum heisser an als Holz.';
    $('#touchStatus').textContent = msg;
  };
  $$('#matSel button').forEach(b => b.addEventListener('click', () => { K.m = b.dataset.m; K.t = 0; K.dots = []; updK(); }));
  $('#kTIn').addEventListener('input', e => { K.T = +e.target.value; updK(); });
  updK();

  const touchCv = $('#touchCv');
  const drawTouch = dt => {
    const { ctx, w, h } = fit(touchCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const mat = MATS[K.m], tc = contact();
    K.t += dt;
    const press = reduced ? 1 : clamp(K.t / .45, 0, 1);
    const ease = 1 - (1 - press) * (1 - press);
    const sw = narrow ? 96 : 140, mw = w - sw;
    const sx0 = 14, sx1 = mw - 6, sy0 = h * .56, sy1 = h - 18;
    const cx = sx0 + (sx1 - sx0) * .68;
    const fw = narrow ? 54 : 66;

    // Platte
    ctx.save();
    roundRect(ctx, sx0, sy0, sx1 - sx0, sy1 - sy0, 8);
    ctx.fillStyle = mat.col; ctx.fill(); ctx.clip();
    if (K.m === 'holz') {
      ctx.strokeStyle = mat.dark; ctx.globalAlpha = .45; ctx.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const y = sy0 + 8 + i * (sy1 - sy0 - 10) / 8;
        ctx.beginPath();
        for (let x = sx0; x <= sx1; x += 8) { const yy = y + 3 * Math.sin(x / 37 + i * 1.7) + 2 * Math.sin(x / 13 + i); x === sx0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke();
      }
    } else if (K.m === 'stein') {
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = i % 3 ? mat.dark : '#d5d7da'; ctx.globalAlpha = .55;
        ctx.fillRect(sx0 + rnd(i) * (sx1 - sx0), sy0 + rnd(i + 500) * (sy1 - sy0), 2 + rnd(i + 900) * 3, 2);
      }
    } else {
      const g = ctx.createLinearGradient(sx0, sy0, sx1, sy1);
      g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(.7, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
      ctx.fillStyle = g; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    }
    ctx.globalAlpha = 1;
    // Wärmezone im Material: wie weit sich die Berührung ausbreitet (vereinfacht)
    if (press >= 1 && Math.abs(K.T - TS) > .5) {
      const tt = reduced ? 3 : K.t - .45;
      const la = clamp((Math.log10(mat.a) + 7) / 3, 0, 1);
      const r = lerp(26, (sx1 - sx0) * .55, la) * clamp(Math.sqrt(tt / 2.5), .05, 1);
      const g = ctx.createRadialGradient(cx, sy0, 0, cx, sy0, r);
      g.addColorStop(0, tcol(tc, .85)); g.addColorStop(1, tcol(tc, 0));
      ctx.fillStyle = g; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    }
    ctx.restore();
    ctx.fillStyle = mat.txt; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(`${mat.name} · ${deg(K.T)}`, sx0 + 10, sy1 - 10);

    // Finger
    const fy = sy0 - (1 - ease) * 40;
    ctx.save();
    const fg = ctx.createLinearGradient(cx - fw / 2, 0, cx + fw / 2, 0);
    fg.addColorStop(0, SKIND); fg.addColorStop(.35, SKINC); fg.addColorStop(1, SKIND);
    roundRect(ctx, cx - fw / 2, -30, fw, fy + 30, fw * .42);
    ctx.fillStyle = fg; ctx.fill();
    // Fingernagel
    roundRect(ctx, cx + fw * .06, fy - fw * 1.15, fw * .34, fw * .78, fw * .14);
    ctx.fillStyle = 'rgba(255,240,235,.55)'; ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#5a3426'; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('Haut', cx - fw * .1, fy - fw * 1.6);
    ctx.fillText(deg(TS), cx - fw * .1, fy - fw * 1.6 + 14);
    // Berührungsfläche in Kontakttemperatur
    if (press >= 1) {
      ctx.fillStyle = tcol(tc); roundRect(ctx, cx - fw * .36, sy0 - 3, fw * .72, 6, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // Wärmepunkte: so viele, wie Wärme fliesst
    const flux = beff(K.m) * (TS - K.T);
    if (press >= 1 && !reduced) {
      K.acc += Math.abs(flux) / 420 * dt;
      while (K.acc >= 1 && K.dots.length < 220) {
        K.acc -= 1;
        const depth = 14 + Math.random() * lerp(24, sy1 - sy0 - 26, clamp((Math.log10(mat.a) + 7) / 3, 0, 1));
        K.dots.push({ x: cx + (Math.random() - .5) * fw * .55, dx: (Math.random() - .5) * 2.2, y0: sy0 - 50, y1: sy0 + depth, k: 0, dir: flux > 0 ? 1 : -1 });
      }
      if (K.acc > 1) K.acc = 0;
    }
    for (const d of K.dots) d.k += dt * 1.1;
    K.dots = K.dots.filter(d => d.k < 1);
    for (const d of K.dots) {
      const k = d.dir > 0 ? d.k : 1 - d.k;
      const y = lerp(d.y0, d.y1, k), x = d.x + d.dx * Math.max(0, y - sy0) * .9;
      ctx.globalAlpha = Math.sin(Math.PI * d.k) * .9 + .1;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fillStyle = HEAT; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (reduced && Math.abs(flux) > 1) {
      // statt bewegter Punkte: Pfeile, deren Zahl dem Wärmefluss entspricht
      const n = clamp(Math.round(Math.abs(flux) / 1500), 1, 8);
      ctx.strokeStyle = HEAT; ctx.fillStyle = HEAT; ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * 7, ya = flux > 0 ? sy0 - 24 : sy0 + 22, yb = flux > 0 ? sy0 + 22 : sy0 - 24;
        ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x, yb); ctx.stroke(); arrowHead(ctx, x, yb, flux > 0 ? Math.PI / 2 : -Math.PI / 2, 6);
      }
    }
    // Kopfzeile
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText('fühlt sich an:', 14, 22);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 14 : 16}px ${MONO}`;
    ctx.fillText(feel(tc), 14, 42);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    const fl = Math.abs(flux) < 1 ? (narrow ? 'kein Fluss' : 'kein Wärmefluss') : flux > 0 ? (narrow ? 'Wärme ↓' : 'Wärme fliesst ab') : (narrow ? 'Wärme ↑' : 'Wärme fliesst zu');
    ctx.fillText(fl, 14, 60);

    // Temperaturskala rechts
    const bx = mw + 8, by0 = 22, by1 = h - 22, Tmin = -10, Tmax = 60;
    const Y = t => by1 - (t - Tmin) / (Tmax - Tmin) * (by1 - by0);
    const g = ctx.createLinearGradient(0, by1, 0, by0);
    for (let t = Tmin; t <= Tmax; t += 10) g.addColorStop((t - Tmin) / (Tmax - Tmin), tcol(t));
    roundRect(ctx, bx, by0, 10, by1 - by0, 5); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = `9px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('60°', bx - 2, by0 - 8); ctx.fillText('−10°', bx - 2, by1 + 15);
    const marks = [
      { t: TS, col: SKINC, l: narrow ? 'Haut 33°' : 'Haut 33 °C' },
      { t: tc, col: C.fg, l: narrow ? `Kontakt ${fmt(tc, 0)}°` : `Berührung ${fmt(tc, 1)} °C` },
      { t: K.T, col: mat.col, l: narrow ? `Objekt ${fmt(K.T, 0)}°` : `${mat.name} ${fmt(K.T, 0)} °C` },
    ].map(m => ({ ...m, y: Y(m.t), ly: Y(m.t) }));
    // Beschriftungen auseinanderschieben
    const sorted = [...marks].sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < sorted.length; i++) if (sorted[i].ly - sorted[i - 1].ly < 14) sorted[i].ly = sorted[i - 1].ly + 14;
    const over = sorted[sorted.length - 1].ly - (by1 + 2);
    if (over > 0) sorted.forEach(m => m.ly -= over);
    ctx.font = `${narrow ? 10 : 11}px ${MONO}`;
    for (const m of marks) {
      ctx.fillStyle = m.col; ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 2, m.y); ctx.lineTo(bx + 12, m.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 5, m.y, 4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(bx + 13, m.y); ctx.lineTo(bx + 18, m.ly); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.fillText(m.l, bx + 20, m.ly + 4);
    }
  };

  /* ---------- Teil 2: Teilchen tauschen Energie ---------- */
  const H = { t: [80, 10], touch: false, off: 1, ph: [0, 0], pk: [], acc: 0 };
  const PH = Array.from({ length: 120 }, (_, i) => [rnd(i) * TAU, rnd(i + 200) * TAU, .8 + rnd(i + 400) * .5, .8 + rnd(i + 600) * .5]);
  const lvl = t => clamp((t + 20) / 120, 0, 1);
  let lastStat = '';
  const updH = () => {
    const [a, b] = H.t;
    $('#t1In').value = Math.round(a); $('#t2In').value = Math.round(b);
    setTxt('#t1Out', deg(a)); setTxt('#t2Out', deg(b));
    setTxt('#hL', deg(a, 1)); setTxt('#hR', deg(b, 1));
    const d = a - b, eq = Math.abs(d) < .3;
    const desc = t => t > 60 ? 'Teilchen zittern heftig' : t > 25 ? 'Teilchen zittern stark' : t > 0 ? 'Teilchen zittern schwach' : 'Teilchen zittern kaum';
    setTxt('#hL + .formula', desc(a)); setTxt('#hR + .formula', desc(b));
    let flow, ff, st;
    if (!H.touch) { flow = 'gar nicht'; ff = 'Blöcke getrennt'; st = 'Die Blöcke sind getrennt. Dazwischen fliesst keine Wärme.'; }
    else if (eq) { flow = 'nicht mehr'; ff = `beide ${deg((a + b) / 2, 1)}`; st = 'Gleichgewicht: Beide Blöcke sind gleich warm. Die Teilchen stossen sich zwar weiter an, aber im Mittel fliesst keine Wärme mehr.'; }
    else {
      flow = d > 0 ? 'links → rechts' : 'rechts → links'; ff = 'vom Wärmeren zum Kälteren';
      st = `Die heftig zitternden Teilchen ${d > 0 ? 'links' : 'rechts'} stossen ihre Nachbarn an und geben Energie ab. Je grösser der Unterschied, desto schneller.`;
    }
    setTxt('#hFlow', flow); setTxt('#hFlowF', ff);
    if (st !== lastStat) { lastStat = st; $('#partStatus').textContent = st; }
  };
  $('#t1In').addEventListener('input', e => { H.t[0] = +e.target.value; updH(); });
  $('#t2In').addEventListener('input', e => { H.t[1] = +e.target.value; updH(); });
  $('#touchBtn').addEventListener('click', () => {
    H.touch = !H.touch; H.pk = [];
    $('#touchBtn').textContent = H.touch ? 'Trennen' : 'Zusammenschieben';
    updH();
  });
  $('#partReset').addEventListener('click', () => {
    H.t = [80, 10]; H.touch = false; H.pk = []; $('#touchBtn').textContent = 'Zusammenschieben'; updH();
  });
  updH();

  const partCv = $('#partCv');
  const drawPart = dt => {
    const { ctx, w, h } = fit(partCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const target = H.touch ? 0 : 1;
    H.off = reduced ? target : H.off + (target - H.off) * Math.min(1, dt * 5);
    const touching = H.touch && H.off < .03;
    // Wärmeaustausch: beide Blöcke gleich gross, vereinfacht
    if (touching) {
      const d = (H.t[0] - H.t[1]) * (1 - Math.exp(-2 * .12 * dt)) / 2;
      H.t[0] -= d; H.t[1] += d;
      updH();
    }
    const cols = narrow ? 4 : 6, rows = 6;
    const bw = Math.min((w - 40 - 40) / 2, 230), gap = 2 + H.off * 40;
    const x0 = (w - 2 * bw - gap) / 2, by0 = 58, bh = h - by0 - 58;
    const sx = bw / cols, sy = bh / rows, pr = Math.min(sx, sy) * .2;
    const blocks = [0, 1].map(i => ({ x: x0 + i * (bw + gap), T: H.t[i] }));
    const pos = (bi, i, j) => {
      const B = blocks[bi], T = B.T, L = lvl(T), p = PH[(bi * 60 + j * cols + i) % PH.length];
      const amp = reduced ? 0 : (1.2 + 7 * L) * Math.min(1, sx / 40);
      const ph = H.ph[bi];
      return [B.x + (i + .5) * sx + amp * (.7 * Math.sin(p[0] + ph * p[2]) + .3 * Math.sin(p[1] + ph * 1.9 * p[3])),
        by0 + (j + .5) * sy + amp * (.7 * Math.cos(p[1] + ph * p[3] * 1.1) + .3 * Math.sin(p[0] + ph * 2.3 * p[2]))];
    };
    for (let bi = 0; bi < 2; bi++) H.ph[bi] += dt * (3 + 16 * lvl(H.t[bi]));
    // Blöcke
    for (let bi = 0; bi < 2; bi++) {
      const B = blocks[bi];
      roundRect(ctx, B.x, by0, bw, bh, 10);
      ctx.fillStyle = tcol(B.T, .14); ctx.fill();
      ctx.strokeStyle = tcol(B.T, .8); ctx.lineWidth = 1.5; ctx.stroke();
      // Gitter der Nachbarn (fester Körper)
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = pos(bi, i, j);
        if (i < cols - 1) { const q = pos(bi, i + 1, j); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
        if (j < rows - 1) { const q = pos(bi, i, j + 1); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = pos(bi, i, j);
        if (reduced) { ctx.beginPath(); ctx.arc(p[0], p[1], pr + 1 + 7 * lvl(B.T) * Math.min(1, sx / 40), 0, TAU); ctx.strokeStyle = tcol(B.T, .5); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p[0], p[1], pr, 0, TAU); ctx.fillStyle = tcol(B.T); ctx.fill();
      }
      ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 15 : 17}px ${MONO}`;
      ctx.fillText(deg(B.T, 1), B.x + bw / 2, 30);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      ctx.fillText(bi ? 'rechts' : 'links', B.x + bw / 2, 46);
    }
    // Energiepakete über die Grenze
    const d = H.t[0] - H.t[1];
    if (touching && Math.abs(d) > .3 && !reduced) {
      H.acc += Math.abs(d) * .12 * dt;
      while (H.acc >= 1) {
        H.acc -= 1;
        const from = d > 0 ? 0 : 1;
        const j1 = Math.floor(Math.random() * rows), j2 = clamp(j1 + Math.floor(Math.random() * 3) - 1, 0, rows - 1);
        const i1 = from === 0 ? cols - 1 - Math.floor(Math.random() * 2) : Math.floor(Math.random() * 2);
        const i2 = from === 0 ? Math.floor(Math.random() * 2) : cols - 1 - Math.floor(Math.random() * 2);
        H.pk.push({ from, i1, j1, i2, j2, k: 0 });
      }
    }
    for (const p of H.pk) p.k += dt * 1.3;
    H.pk = H.pk.filter(p => p.k < 1);
    for (const p of H.pk) {
      const a = pos(p.from, p.i1, p.j1), b = pos(1 - p.from, p.i2, p.j2);
      const x = lerp(a[0], b[0], p.k), y = lerp(a[1], b[1], p.k) - Math.sin(Math.PI * p.k) * 10;
      ctx.save(); ctx.shadowColor = HEAT; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fillStyle = HEAT; ctx.fill(); ctx.restore();
    }
    // Pfeil unten
    ctx.textAlign = 'center'; ctx.font = `500 12px ${MONO}`;
    const ay = h - 26, mx = w / 2;
    if (!H.touch) { ctx.fillStyle = C.muted; ctx.fillText(narrow ? 'getrennt' : 'getrennt: keine Berührung', mx, ay + 4); }
    else if (Math.abs(d) < .3) { ctx.fillStyle = C.fg; ctx.fillText('Gleichgewicht', mx, ay + 4); }
    else {
      const len = clamp(20 + Math.abs(d) * 1.2, 24, Math.min(140, w * .35)), dir = d > 0 ? 1 : -1;
      ctx.strokeStyle = HEAT; ctx.fillStyle = HEAT; ctx.lineWidth = clamp(1.5 + Math.abs(d) / 20, 1.5, 6);
      ctx.beginPath(); ctx.moveTo(mx - dir * len / 2, ay - 8); ctx.lineTo(mx + dir * (len / 2 - 6), ay - 8); ctx.stroke();
      arrowHead(ctx, mx + dir * len / 2 + dir * 2, ay - 8, dir > 0 ? 0 : Math.PI, 10);
      ctx.fillStyle = C.fg; ctx.fillText('Wärme', mx, ay + 14);
    }
  };

  /* ---------- Teil 3: Abkühlen in verschiedenen Verpackungen ---------- */
  // tau: Zeitkonstante in Minuten (Newton-Abkühlung, rund und vereinfacht). p: Anteile Leitung, Strömung, Strahlung
  const CUPS = {
    open: { name: 'Offene Tasse', short: 'Offen', tau: 35, p: [.2, .55, .25],
      msg: 'Offen geht viel Wärme mit der aufsteigenden warmen Luft und dem Dampf verloren. Strömen und Verdunsten sind hier die grössten Wege.' },
    lid: { name: 'Mit Deckel', short: 'Deckel', tau: 50, p: [.3, .35, .35],
      msg: 'Der Deckel hält Dampf und warme Luft zurück. Leiten durch die Wand und Strahlen bleiben.' },
    wool: { name: 'Deckel und Wollhülle', short: 'Wolle', tau: 110, p: [.25, .35, .4],
      msg: 'Die Wollhülle hält eine Schicht stehende Luft fest. Die leitet schlecht und kann nicht strömen.' },
    thermos: { name: 'Thermoskanne', short: 'Thermos', tau: 1200, p: [.4, .3, .3],
      msg: 'Vakuum zwischen den Wänden stoppt Leiten und Strömen fast ganz, die Spiegelschicht die Strahlung. Nur am Verschluss entweicht etwas.' },
  };
  const ROOM = 20;
  const CU = { c: 'open', T0: 85, time: 0, play: false, ph: 0 };
  const tempAt = (c, t) => ROOM + (CU.T0 - ROOM) * Math.exp(-t / CUPS[c].tau);
  const fmtMin = m => {
    m = Math.round(m);
    if (m < 60) return `${m} min`;
    if (m >= 180) m = Math.round(m / 10) * 10;
    const hh = Math.floor(m / 60), mm = m % 60;
    return mm ? `${hh} h ${mm} min` : `${hh} h`;
  };
  const updCup = () => {
    const T = tempAt(CU.c, CU.time);
    $('#cTIn').value = Math.round(CU.time); $('#c0In').value = CU.T0;
    setTxt('#cTOut', fmtMin(CU.time)); setTxt('#c0Out', deg(CU.T0));
    setTxt('#cNow', deg(T, 1)); setTxt('#cNowF', CU.time < .5 ? 'am Anfang' : `nach ${fmtMin(CU.time)}`);
    setTxt('#cHalf', Math.abs(CU.T0 - ROOM) < .5 ? 'schon da' : fmtMin(CUPS[CU.c].tau * Math.LN2));
    const diff = T - ROOM;
    setTxt('#cDiff', `${fmt(Math.abs(diff), Math.abs(diff) < 10 ? 1 : 0)} °C`);
    $$('#cupSel button').forEach(b => b.classList.toggle('active', b.dataset.c === CU.c));
  };
  const setCupMsg = () => {
    let m = CUPS[CU.c].msg;
    if (CU.T0 < ROOM - 2) m = 'Kaltes Getränk: Jetzt fliesst Wärme von der Luft hinein. Die Verpackung bremst auch das.';
    $('#cupStatus').textContent = m;
  };
  $$('#cupSel button').forEach(b => b.addEventListener('click', () => { CU.c = b.dataset.c; updCup(); setCupMsg(); }));
  $('#c0In').addEventListener('input', e => { CU.T0 = +e.target.value; updCup(); setCupMsg(); });
  $('#cTIn').addEventListener('input', e => { CU.time = +e.target.value; updCup(); });
  const setPlay = on => { CU.play = on; $('#cPlay').textContent = on ? 'Pause' : 'Zeit laufen lassen'; };
  $('#cPlay').addEventListener('click', () => {
    if (!CU.play && CU.time >= 359) CU.time = 0;
    setPlay(!CU.play);
  });
  updCup();

  const cupCv = $('#cupCv');
  const drawCup = dt => {
    const { ctx, w, h } = fit(cupCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 520;
    if (CU.play) {
      CU.time += dt * 8;   // 1 Sekunde = 8 Minuten
      if (CU.time >= 360) { CU.time = 360; setPlay(false); }
      updCup();
    }
    if (!reduced) CU.ph += dt;
    const cup = CUPS[CU.c], T = tempAt(CU.c, CU.time);

    // Bereiche
    const A = narrow ? { x: 0, y: 0, w, h: h * .46 } : { x: 0, y: 0, w: w * .4, h };
    const G = narrow ? { x0: 40, y0: h * .46 + 26, x1: w - 14, y1: h - 26 } : { x0: w * .4 + 34, y0: 36, x1: w - 16, y1: h - 30 };

    // --- Gefäss ---
    const cx = A.x + A.w / 2, base = A.y + A.h - (narrow ? 22 : 70);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(A.x + 12, base); ctx.lineTo(A.x + A.w - 12, base); ctx.stroke();
    const isTh = CU.c === 'thermos';
    const bw = isTh ? Math.min(A.w * .26, 62) : Math.min(A.w * .32, 84);
    const bh = isTh ? Math.min(A.h * .62, 200) : Math.min(A.h * .44, 120);
    const top = base - bh;
    const liquid = tcol(T);
    if (isTh) {
      roundRect(ctx, cx - bw / 2, top, bw, bh, 12); ctx.fillStyle = '#9aa3ad'; ctx.fill();
      const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
      g.addColorStop(0, 'rgba(255,255,255,.0)'); g.addColorStop(.3, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.15)');
      ctx.fillStyle = g; ctx.fill();
      // Vakuum und Spiegel
      roundRect(ctx, cx - bw / 2 + 6, top + 14, bw - 12, bh - 20, 9); ctx.fillStyle = C.surface; ctx.fill();
      roundRect(ctx, cx - bw / 2 + 11, top + 19, bw - 22, bh - 30, 7); ctx.fillStyle = '#dfe4ea'; ctx.fill();
      roundRect(ctx, cx - bw / 2 + 14, top + 34, bw - 28, bh - 48, 5); ctx.fillStyle = liquid; ctx.fill();
      roundRect(ctx, cx - bw / 2 + 4, top - 14, bw - 8, 22, 6); ctx.fillStyle = '#3c4148'; ctx.fill();
    } else {
      // Henkel
      ctx.strokeStyle = '#d9d4cc'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx + bw / 2, top + bh * .45, bh * .2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.stroke();
      roundRect(ctx, cx - bw / 2, top, bw, bh, 10); ctx.fillStyle = '#ece8e1'; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke();
      roundRect(ctx, cx - bw / 2 + 6, top + 12, bw - 12, bh - 18, 6); ctx.fillStyle = liquid; ctx.fill();
      if (CU.c === 'wool') {
        ctx.save(); roundRect(ctx, cx - bw / 2 - 7, top + 8, bw + 14, bh - 8, 10); ctx.fillStyle = '#c7913a'; ctx.fill(); ctx.clip();
        ctx.strokeStyle = '#9e6f24'; ctx.lineWidth = 2;
        for (let y = top + 14; y < base; y += 9) {
          ctx.beginPath();
          for (let x = cx - bw / 2 - 8, k = 0; x <= cx + bw / 2 + 8; x += 6, k++) ctx.lineTo(x, y + (k % 2 ? 4 : 0));
          ctx.stroke();
        }
        ctx.restore();
      }
      if (CU.c !== 'open') { roundRect(ctx, cx - bw / 2 - 4, top - 8, bw + 8, 12, 5); ctx.fillStyle = '#3c4148'; ctx.fill(); }
    }

    // --- Wärmewege ---
    const drive = clamp(Math.abs(T - ROOM) / 65, 0, 1), dirOut = T >= ROOM;
    const col = dirOut ? HEAT : COLDF;
    const mag = cup.p.map(p => clamp(p * (35 / cup.tau) * 1.6 * drive, 0, 1));
    const labels = ['Leitung', 'Strömung', 'Strahlung'];
    ctx.font = `10px ${MONO}`;
    // Strömung: nach oben
    if (mag[1] > .01) {
      ctx.strokeStyle = col; ctx.globalAlpha = .25 + .75 * mag[1]; ctx.lineWidth = 1 + 3 * mag[1];
      const yTop = (isTh ? top - 14 : top) - 8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        for (let k = 0; k <= 20; k++) {
          const y = yTop - k * 2.2, x = cx + i * bw * .28 + 4 * Math.sin(k * .5 - CU.ph * 4 * (dirOut ? 1 : -1) + i);
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = col;
      arrowHead(ctx, cx, dirOut ? yTop - 50 : yTop + 2, dirOut ? -Math.PI / 2 : Math.PI / 2, 7);
      ctx.globalAlpha = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(labels[1], cx, Math.max(12, yTop - 56));
    }
    // Strahlung: nach rechts
    if (mag[2] > .01) {
      ctx.strokeStyle = col; ctx.globalAlpha = .25 + .75 * mag[2]; ctx.lineWidth = 1 + 2.5 * mag[2];
      const x0 = cx + bw / 2 + (isTh ? 8 : 20), ym = top + bh * .55, len = Math.min(42, A.w * .5 - bw / 2 - 26);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        for (let k = 0; k <= len; k += 2) {
          const x = x0 + k, y = ym + i * 14 + 3 * Math.sin(k * .45 - CU.ph * 8 * (dirOut ? 1 : -1));
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = col; arrowHead(ctx, dirOut ? x0 + len + 6 : x0 - 4, ym, dirOut ? 0 : Math.PI, 7);
      ctx.globalAlpha = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(labels[2], x0 + len / 2, ym - 24);
    }
    // Leitung: nach links durch die Wand und nach unten in den Tisch
    if (mag[0] > .01) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.globalAlpha = .25 + .75 * mag[0]; ctx.lineWidth = 1 + 3 * mag[0];
      const xw = cx - bw / 2 - (CU.c === 'wool' ? 10 : 3), len = Math.min(30, A.w * .5 - bw / 2 - 20);
      for (const yy of [top + bh * .45, top + bh * .7]) {
        const a = dirOut ? xw : xw - len, b = dirOut ? xw - len : xw;
        ctx.beginPath(); ctx.moveTo(a, yy); ctx.lineTo(b + (dirOut ? 4 : -4), yy); ctx.stroke();
        arrowHead(ctx, b, yy, dirOut ? Math.PI : 0, 7);
      }
      ctx.beginPath(); ctx.moveTo(cx - bw * .2, dirOut ? base + 2 : base + 16); ctx.lineTo(cx - bw * .2, dirOut ? base + 12 : base + 6); ctx.stroke();
      arrowHead(ctx, cx - bw * .2, dirOut ? base + 16 : base + 2, dirOut ? Math.PI / 2 : -Math.PI / 2, 6);
      ctx.globalAlpha = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      ctx.fillText(labels[0], xw - 4, top + bh * .45 - 10);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    if (narrow) { ctx.textAlign = 'left'; ctx.fillText(deg(T, 1), 12, 22); }
    else { ctx.textAlign = 'center'; ctx.fillText(deg(T, 1), cx, base + 34); }

    // --- Abkühlkurven ---
    const X = t => G.x0 + t / 360 * (G.x1 - G.x0), Yc = v => G.y1 - v / 100 * (G.y1 - G.y0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right';
    for (const v of [0, 20, 40, 60, 80, 100]) {
      ctx.beginPath(); ctx.moveTo(G.x0, Yc(v)); ctx.lineTo(G.x1, Yc(v)); ctx.stroke();
      ctx.fillText(`${v}°`, G.x0 - 5, Yc(v) + 3);
    }
    ctx.textAlign = 'center';
    for (let hh = 0; hh <= 6; hh++) ctx.fillText(`${hh} h`, X(hh * 60), G.y1 + 14);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(G.x0, Yc(ROOM)); ctx.lineTo(G.x1, Yc(ROOM)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'left'; ctx.fillText('Raumluft 20 °C', G.x0 + 4, Yc(ROOM) + (CU.T0 < ROOM ? -5 : 13));
    for (const k of Object.keys(CUPS)) {
      if (k === CU.c) continue;
      ctx.strokeStyle = C.muted; ctx.globalAlpha = .45; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const t = 360 * i / 120; i ? ctx.lineTo(X(t), Yc(tempAt(k, t))) : ctx.moveTo(X(t), Yc(tempAt(k, t))); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 160; i++) { const t = 360 * i / 160; i ? ctx.lineTo(X(t), Yc(tempAt(CU.c, t))) : ctx.moveTo(X(t), Yc(tempAt(CU.c, t))); }
    ctx.stroke();
    // Name an der gewählten Kurve
    ctx.fillStyle = C.accent; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'right';
    const endT = tempAt(CU.c, 360), ly = Yc(endT) + (endT > ROOM + 6 ? -8 : CU.T0 >= ROOM ? -12 : 16);
    ctx.fillText(narrow ? cup.short : cup.name, G.x1 - 2, ly);
    // Zeitpunkt
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(CU.time), G.y0); ctx.lineTo(X(CU.time), G.y1); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(CU.time), Yc(T), 5, 0, TAU); ctx.fillStyle = liquid; ctx.fill(); ctx.strokeStyle = C.fg; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('Temperatur des Getränks', G.x0, G.y0 - 10);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('waerme', 4, {
    touchLock: () => { $('#kTIn').disabled = false; $$('#matSel button').forEach(b => b.disabled = false); },
    partLock: () => { ['#t1In', '#t2In', '#touchBtn', '#partReset'].forEach(s => $(s).disabled = false); },
    cupLock: () => { ['#c0In', '#cTIn', '#cPlay'].forEach(s => $(s).disabled = false); $$('#cupSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawTouch(dt); drawPart(dt); drawCup(dt); });
})();
