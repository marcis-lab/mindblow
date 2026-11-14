/* mindblow – Lektion Schwarze Löcher */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const mixHex = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };

  // Physik (SI-Einheiten)
  const G = 6.674e-11, CL = 2.998e8, MSUN = 1.989e30, KM_C = CL / 1000;
  const rsOf = M => 2 * G * M / (CL * CL);

  // Zahlen schön schreiben
  const big = n => n < 10 ? fmt(n, 1) : n < 1e6 ? fmt(n, 0) : n < 1e9 ? `${fmt(n / 1e6, n < 1e7 ? 1 : 0)} Mio.` : n < 1e12 ? `${fmt(n / 1e9, n < 1e10 ? 1 : 0)} Mrd.` : `${fmt(n / 1e12, n < 1e13 ? 1 : 0)} Bio.`;
  const len = m => {
    if (m >= 1e12) return `${fmt(m / 1e12, m < 1e13 ? 1 : 0)} Mrd. km`;
    if (m >= 1e9) return `${fmt(m / 1e9, m < 1e11 ? 1 : 0)} Mio. km`;
    if (m >= 1e4) return `${fmt(m / 1e3, 0)} km`;
    if (m >= 1e3) return `${fmt(m / 1e3, 1)} km`;
    if (m >= 1) return `${fmt(m, m < 10 ? 1 : 0)} m`;
    if (m >= 1e-3) return `${fmt(m * 1e3, m < 1e-2 ? 1 : 0)} mm`;
    return `${fmt(m * 1e6, m < 1e-5 ? 1 : 0)} µm`;
  };

  /* ---------- Teil 1: Zusammendrücken ---------- */
  const escCv = $('#escCv');
  const BODIES = {
    mond: { name: 'Mond', gen: 'des Mondes', M: 7.342e22, R: 1.7374e6, col: '#b9b4ac' },
    erde: { name: 'Erde', gen: 'der Erde', M: 5.972e24, R: 6.371e6, col: '#3b82d6' },
    jupiter: { name: 'Jupiter', gen: 'des Jupiters', M: 1.898e27, R: 6.9911e7, col: '#d2a670' },
    sonne: { name: 'Sonne', gen: 'der Sonne', M: MSUN, R: 6.957e8, col: '#ffc94a' },
  };
  const E = { b: 'erde', v: 0, target: null, phase: 0 };
  const eGeo = () => {
    const B = BODIES[E.b], rs = rsOf(B.M), rmin = rs * .3;
    const r = B.R * Math.pow(rmin / B.R, E.v / 1000);
    return { B, rs, rmin, r, black: r <= rs, vesc: Math.sqrt(2 * G * B.M / r) };
  };
  const vAt = (B, r) => 1000 * Math.log(r / B.R) / Math.log(rsOf(B.M) * .3 / B.R);
  const updEsc = () => {
    const g = eGeo();
    $('#sqIn').value = Math.round(E.v);
    $('#sqOut').textContent = `×${big(g.B.R / g.r)}`;
    $('#eR').textContent = len(g.r);
    const kms = g.vesc / 1000;
    $('#eV').textContent = g.black ? 'mehr als Licht' : kms < 10 ? `${fmt(kms, 2)} km/s` : `${big(kms)} km/s`;
    $('#eS').textContent = len(g.rs);
    let msg;
    if (g.black) msg = `Schwarzes Loch! Die ganze Masse ${g.B.gen} steckt jetzt innerhalb von ${len(g.rs)} Radius. Kein Licht kommt mehr heraus.`;
    else if (E.v < 1) msg = `${g.B.name} in Originalgrösse: Fluchtgeschwindigkeit ${kms < 10 ? fmt(kms, 1) : big(kms)} km/s. Licht ist rund ${big(KM_C / kms)}-mal schneller.`;
    else {
      const f = g.B.R / g.r;
      msg = `${big(f)}-mal kleiner, Fluchtgeschwindigkeit ${big(Math.sqrt(f))}-mal grösser. Halber Radius heisst: rund 1,4-mal so schnell weg.`;
      if (g.vesc > .3 * CL) msg = `Schon ${fmt(g.vesc / CL * 100, 0)} % der Lichtgeschwindigkeit. Licht kommt noch heraus, wird aber immer röter.`;
    }
    $('#escStatus').textContent = msg;
  };
  $$('#bodySel button').forEach(b => b.addEventListener('click', () => {
    const wasBlack = eGeo().black;
    E.b = b.dataset.b; E.target = null;
    $$('#bodySel button').forEach(x => x.classList.toggle('active', x === b));
    E.v = wasBlack ? vAt(BODIES[E.b], rsOf(BODIES[E.b].M) * .9) : 0;
    updEsc();
  }));
  $('#sqIn').addEventListener('input', e => { E.v = +e.target.value; E.target = null; updEsc(); });
  $('#goBtn').addEventListener('click', () => {
    const B = BODIES[E.b], t = vAt(B, rsOf(B.M) * .9);
    if (reduced) { E.v = t; updEsc(); } else E.target = t;
  });
  $('#origBtn').addEventListener('click', () => { E.target = null; E.v = 0; updEsc(); });
  updEsc();

  const drawEsc = dt => {
    const { ctx, w, h } = fit(escCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (E.target !== null) {
      const d = E.target - E.v;
      E.v += Math.sign(d) * Math.min(Math.abs(d), Math.max(60 * dt, Math.abs(d) * dt * 2));
      if (Math.abs(E.target - E.v) < 2) { E.v = E.target; E.target = null; }
      updEsc();
    }
    const g = eGeo();
    const barY = h - 40;
    const top = narrow ? 52 : 40, bot = barY - 44;
    const cx = w / 2, cy = (top + bot) / 2;
    const Rp = Math.min(w * .3, (bot - top) / 2);
    const vis = r => 5 + (Rp - 5) * Math.sqrt(clamp(Math.log(r / g.rmin) / Math.log(g.B.R / g.rmin), 0, 1));
    const rp = vis(g.r), rpS = vis(g.rs);
    const z = g.black ? 0 : Math.sqrt(1 - g.rs / g.r);   // wie viel Licht noch herauskommt (vereinfacht)

    // Lichtstrahlen
    if (!g.black) {
      if (!reduced) E.phase = (E.phase + dt * .55) % 1;
      const n = 14, reach = Math.min(w / 2 - 8, Rp * 1.35 + 40);
      ctx.lineCap = 'round'; ctx.lineWidth = 2;
      for (let k = 0; k < n; k++) {
        const a = k * TAU / n + .2;
        for (let j = 0; j < 2; j++) {
          const p = (E.phase + k * .37 + j * .5) % 1;
          const d0 = rp + 4 + p * (reach - rp), d1 = d0 + 10;
          if (d1 > reach + 10) continue;
          ctx.strokeStyle = mixHex('#ffd34d', '#c0261c', 1 - z);
          ctx.globalAlpha = (1 - p) * (.25 + .75 * z);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0); ctx.lineTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    // Körper oder Schwarzes Loch
    if (g.black) {
      ctx.beginPath(); ctx.arc(cx, cy, rpS + 6, 0, TAU);
      const gr = ctx.createRadialGradient(cx, cy, rpS, cx, cy, rpS + 10);
      gr.addColorStop(0, 'rgba(243,181,80,.55)'); gr.addColorStop(1, 'rgba(243,181,80,0)');
      ctx.fillStyle = gr; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, rpS, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    } else {
      const col = mixHex(g.B.col, '#5a0d08', 1 - z);
      const gr = ctx.createRadialGradient(cx - rp * .35, cy - rp * .35, rp * .1, cx, cy, rp);
      gr.addColorStop(0, mixHex(g.B.col, '#ffffff', .35 * z)); gr.addColorStop(1, col);
      ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.fillStyle = gr; ctx.fill();
      // Grenze, ab der es schwarz wird
      ctx.setLineDash([3, 4]); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2; ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.arc(cx, cy, rpS, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // Beschriftung oben
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${MONO}`;
    ctx.fillText(g.black && !narrow ? `${g.B.name} als Schwarzes Loch` : g.B.name, 14, 22);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'Grössen log.' : 'Grössen logarithmisch', 14, 37);
    ctx.textAlign = 'right';
    const lbl = g.black ? (narrow ? 'Licht gefangen' : 'kein Licht kommt heraus') : (narrow ? 'Licht entkommt' : 'Licht kommt heraus');
    ctx.fillStyle = g.black ? C.bad : C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(lbl, w - 14, 22);
    if (g.black && narrow) { ctx.fillStyle = C.fg; ctx.fillText('Schwarzes Loch', w - 14, 37); }
    if (!g.black && rp - rpS > 16) {
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'Grenze' : 'Grenze: Schwarzschild-Radius', cx, cy + rp + 16);
    }

    // Balken: Fluchtgeschwindigkeit, logarithmisch bis zur Lichtgeschwindigkeit
    const x0 = 16, x1 = w - 16, LMAX = Math.log10(KM_C);
    const X = v => x0 + clamp(Math.log10(Math.max(1, v)) / LMAX, 0, 1) * (x1 - x0);
    const kms = g.vesc / 1000;
    ctx.fillStyle = C.sunk; roundRect(ctx, x0, barY - 6, x1 - x0, 12, 6); ctx.fill();
    const xv = g.black ? x1 : X(kms);
    ctx.fillStyle = g.black ? C.bad : C.accent; roundRect(ctx, x0, barY - 6, Math.max(12, xv - x0), 12, 6); ctx.fill();
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Fluchtgeschw. in km/s (log.)' : 'Fluchtgeschwindigkeit in km/s (logarithmisch)', x0, barY - 14);
    ctx.textAlign = 'center';
    const ticks = narrow ? [1, 100, 1e4] : [1, 10, 100, 1e3, 1e4, 1e5];
    for (const t of ticks) {
      ctx.fillStyle = C.muted; ctx.fillRect(X(t) - .5, barY + 7, 1, 4);
      ctx.fillText(fmt(t, 0), clamp(X(t), x0 + 6, x1 - 26), barY + 23);
    }
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, barY - 12); ctx.lineTo(x1, barY + 12); ctx.stroke();
    ctx.fillStyle = C.glow; ctx.textAlign = 'right'; ctx.font = `500 10px ${MONO}`;
    ctx.fillText('Licht', x1, barY - 14);
  };

  /* ---------- Teil 2: Umlaufbahn ---------- */
  const orbCv = $('#orbCv');
  const SEC_YEAR = 8;                         // ein Jahr dauert 8 Sekunden
  const O = { bh: false, M: 1, x: 1, y: 0, vx: 0, vy: 1, trail: [], path: [], frost: 0, light: 1 };
  // Sterne im Hintergrund, fest verteilt
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const STARS = Array.from({ length: 70 }, () => [rnd(), rnd(), rnd()]);
  const step = (s, hh) => {
    const acc = () => { const r = Math.hypot(s.x, s.y); const k = -O.M / (r * r * r); return [k * s.x, k * s.y]; };
    let [ax, ay] = acc();
    s.vx += ax * hh / 2; s.vy += ay * hh / 2;
    s.x += s.vx * hh; s.y += s.vy * hh;
    [ax, ay] = acc();
    s.vx += ax * hh / 2; s.vy += ay * hh / 2;
  };
  const orbitInfo = () => {
    const r = Math.hypot(O.x, O.y), En = (O.vx * O.vx + O.vy * O.vy) / 2 - O.M / r;
    const a = -O.M / (2 * En);
    return { r, a, days: 365.25 * Math.sqrt(a * a * a / O.M) };
  };
  const calcPath = () => {
    const s = { x: O.x, y: O.y, vx: O.vx, vy: O.vy }, { a } = orbitInfo();
    const T = TAU * Math.sqrt(a * a * a / O.M), n = 1200, hh = T / n;
    O.path = [];
    for (let i = 0; i <= n; i++) { if (i % 6 === 0) O.path.push([s.x, s.y]); for (let k = 0; k < 4; k++) step(s, hh / 4); }
  };
  const updOrb = () => {
    const { r, days } = orbitInfo();
    $('#oT').textContent = `${fmt(days, 0)} Tage`;
    $('#oD').textContent = `${fmt(r * 149.6, 0)} Mio. km`;
    $('#mOut').textContent = `×${fmt(O.M, 2)}`;
    $('#oL').textContent = O.bh ? (O.frost > .5 ? 'dunkel, eisig' : 'dunkel, kühlt ab') : 'hell, warm';
  };
  const resetOrb = () => { O.x = 1; O.y = 0; O.vx = 0; O.vy = 1; O.trail = []; calcPath(); updOrb(); };
  $('#bhBtn').addEventListener('click', () => {
    O.bh = !O.bh;
    $('#bhBtn').textContent = O.bh ? 'Sonne zurückholen' : 'Sonne zum Schwarzen Loch machen';
    $('#orbStatus').textContent = O.bh
      ? 'Schwarzes Loch mit gleicher Masse: Die Bahn bleibt genau gleich, kein Staubsauger. Nur das Licht fehlt. Die Erde wird dunkel und kühlt aus (vereinfacht).'
      : 'Die Sonne ist zurück: gleiche Masse, gleiche Bahn, wieder hell und warm.';
    if (reduced) O.frost = O.bh ? 1 : 0;
    updOrb();
  });
  $('#orbReset').addEventListener('click', () => {
    O.M = 1; $('#mIn').value = 100; resetOrb();
    $('#orbStatus').textContent = 'Zurück auf der heutigen Erdbahn: rund 150 Millionen km und 365 Tage.';
  });
  $('#mIn').addEventListener('input', e => {
    O.M = +e.target.value / 100; O.trail = []; calcPath(); updOrb();
    $('#orbStatus').textContent = O.M === 1
      ? 'Gleiche Masse wie die Sonne: Ab hier bleibt die Bahn so, egal ob Stern oder Schwarzes Loch.'
      : `Andere Masse in der Mitte, andere Bahn: Die Erde läuft jetzt auf einer Ellipse. Es zählt nur die Masse, nicht ob Stern oder Loch.`;
  });
  resetOrb();

  const drawOrb = dt => {
    const { ctx, w, h } = fit(orbCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (!reduced) {
      const n = 24, hh = dt * TAU / SEC_YEAR / n;
      for (let i = 0; i < n; i++) step(O, hh);
      O.trail.push([O.x, O.y]); if (O.trail.length > 110) O.trail.shift();
      O.frost = clamp(O.frost + (O.bh ? dt * .35 : -dt * .8), 0, 1);
      O.light = clamp(O.light + (O.bh ? -dt * 6 : dt * 3), 0, 1);
      updOrb();
    } else O.light = O.bh ? 0 : 1;
    const S = Math.min((w - 36) / 2.75, (h - 70) / 2.7);
    const cx = w / 2 + S * .36, cy = h / 2 - 6;
    const P = (x, y) => [cx + x * S, cy - y * S];

    // Sterne
    ctx.fillStyle = C.muted;
    for (const [sx, sy, sr] of STARS) { ctx.globalAlpha = .25 + .35 * sr; ctx.fillRect(sx * w, sy * h, 1 + sr * 1.2, 1 + sr * 1.2); }
    ctx.globalAlpha = 1;
    // Bahn
    ctx.setLineDash([4, 5]); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); O.path.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2; ctx.strokeStyle = C.accent;
    for (let i = 1; i < O.trail.length; i++) {
      ctx.globalAlpha = i / O.trail.length * .8;
      const [ax, ay] = P(...O.trail[i - 1]), [bx, by] = P(...O.trail[i]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Mitte: Sonne oder Schwarzes Loch
    const L = O.light;
    if (L > 0) {
      const gl = ctx.createRadialGradient(cx, cy, 6, cx, cy, 60);
      gl.addColorStop(0, `rgba(255,201,74,${.5 * L})`); gl.addColorStop(1, 'rgba(255,201,74,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, TAU); ctx.fill();
      ctx.globalAlpha = L; ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (O.bh) {
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, TAU);
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5; ctx.globalAlpha = .7; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.font = `11px ${MONO}`; ctx.fillStyle = C.fg;
    ctx.fillText(O.bh ? 'Schwarzes Loch' : 'Sonne', cx, cy + 34);
    if (O.bh) { ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.fillText(narrow ? '3 km, vergrössert' : 'Radius 3 km, stark vergrössert', cx, cy + 48); }

    // Erde
    const [ex, ey] = P(O.x, O.y);
    const night = mixHex('#2b3445', '#d6e6f2', O.frost * .85);
    ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU);
    ctx.fillStyle = L > .5 ? '#3b82d6' : night; ctx.fill();
    if (L > .05) {   // Tagseite zur Sonne hin
      const a = Math.atan2(cy - ey, cx - ex);
      ctx.globalAlpha = .55 * L; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex, ey, 7, a - Math.PI / 2, a + Math.PI / 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    // Beschriftung immer nach aussen, weg von der Mitte
    const ea = Math.atan2(ey - cy, ex - cx);
    ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`; ctx.textAlign = Math.cos(ea) > .3 ? 'left' : Math.cos(ea) < -.3 ? 'right' : 'center';
    ctx.fillText('Erde', ex + Math.cos(ea) * 18, ey + Math.sin(ea) * 18 + 4);

    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? '1 Jahr ≈ 8 s' : '1 Jahr ≈ 8 s · nicht massstäblich', 12, h - 12);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'gestrichelt: Bahn' : 'gestrichelt: vorausberechnete Bahn', w - 12, h - 12);
  };

  /* ---------- Teil 3: Die Astronautin fällt ---------- */
  const fallCv = $('#fallCv');
  const A_LIM = 10 * 9.81;        // ab etwa 10 g Unterschied: gestreckt (vereinfachte Grenze)
  const BODY = 2;                 // Körperlänge in m
  const F = { lm: 1, v: 0, fall: false, ang: 0, angRef: 0 };
  const fGeo = () => {
    const M = Math.pow(10, F.lm) * MSUN, rs = rsOf(M);
    const u = 3 * (1 - F.v / 1000), r = rs * Math.pow(10, u);
    const tid = 2 * G * M * BODY / (r * r * r);
    const rt = Math.cbrt(2 * G * M * BODY / A_LIM);
    return { M, rs, u, r, tid, rt, rate: Math.sqrt(Math.max(0, 1 - rs / r)) };
  };
  const updFall = () => {
    const g = fGeo();
    $('#bmIn').value = Math.round(F.lm * 100);
    $('#bmOut').textContent = big(Math.pow(10, F.lm));
    $('#abIn').value = Math.round(F.v);
    $('#abOut').textContent = F.v >= 1000 ? 'Rand' : `${big(g.r / g.rs)}×`;
    $('#hR').textContent = len(g.rs);
    if (g.rt > g.rs) { $('#hT').textContent = len(g.rt - g.rs); $('#hT2').textContent = 'vor dem Horizont'; }
    else { $('#hT').textContent = 'erst drinnen'; $('#hT2').textContent = 'hinter dem Horizont'; }
    $('#hC').textContent = `${fmt(g.rate * 100, g.rate > .995 || g.rate < .01 ? 0 : g.rate < .1 ? 1 : 0)} %`;
    const gs = g.tid / 9.81;
    const gtxt = gs < .01 ? 'kaum etwas' : gs < 1 ? `${fmt(gs, 2)} g` : `${big(gs)} g`;
    let msg = `Noch ${len(g.r - g.rs)} bis zum Horizont. Unterschied Kopf zu Füssen: ${gtxt}.`;
    if (F.v >= 1000) msg = g.rt > g.rs
      ? 'Am Horizont: Von ihr ist nur noch ein langer, dünner Faden übrig. Von aussen gesehen bleibt ihre Uhr stehen, und sie verblasst.'
      : 'Am Horizont: Sie fliegt heil hinein und merkt nichts Besonderes. Von aussen gesehen bleibt ihre Uhr aber stehen, und sie verblasst.';
    else if (g.tid >= A_LIM) msg += ' Sie wird in die Länge gezogen.';
    else if (gs >= 1) msg += ' Sie spürt einen deutlichen Zug.';
    $('#fallStatus').textContent = msg;
  };
  const setMass = lm => { F.lm = lm; $$('#bhSel button').forEach(b => b.classList.toggle('active', Math.abs(+b.dataset.m / 100 - lm) < .005)); updFall(); };
  $$('#bhSel button').forEach(b => b.addEventListener('click', () => setMass(+b.dataset.m / 100)));
  $('#bmIn').addEventListener('input', e => setMass(+e.target.value / 100));
  const stopFall = () => { F.fall = false; $('#fallBtn').textContent = F.v >= 1000 ? 'Nochmals fallen lassen' : 'Fallen lassen'; };
  $('#abIn').addEventListener('input', e => { F.v = +e.target.value; stopFall(); updFall(); });
  $('#fallBtn').addEventListener('click', () => {
    if (F.fall) { stopFall(); return; }
    if (F.v >= 1000) F.v = 0;
    if (reduced) { F.v = 1000; stopFall(); updFall(); return; }
    F.fall = true; $('#fallBtn').textContent = 'Anhalten'; updFall();
  });
  updFall();

  const drawFall = dt => {
    const { ctx, w, h } = fit(fallCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (F.fall) {
      F.v = Math.min(1000, F.v + dt * (60 + F.v * .6));
      if (F.v >= 1000) stopFall();
      updFall();
    }
    const g = fGeo();
    if (!reduced) { F.angRef += dt * TAU / 4; F.ang += dt * TAU / 4 * g.rate; }

    const RH = narrow ? 30 : 40, bx = RH + 14, cy = h * .5;
    const x0 = bx + RH, x1 = w - 22;
    const X = u => x0 + clamp(u / 3, 0, 1) * (x1 - x0);
    const axY = h - 46;

    // Streckzone
    const ut = Math.log10(g.rt / g.rs);
    if (ut > 0) {
      const xt = X(ut);
      ctx.fillStyle = C.bad; ctx.globalAlpha = .13; ctx.fillRect(x0, 54, xt - x0, axY - 64); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.bad; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xt, 54); ctx.lineTo(xt, axY - 10); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.bad; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
      if (xt - x0 > 70) ctx.fillText('Streckzone', xt - 5, 68);
      else { ctx.textAlign = 'left'; ctx.fillText('Streckzone', x0 + 4, 68); }
    } else {
      ctx.fillStyle = C.good; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
      ctx.fillText(narrow ? 'gestreckt erst drinnen' : 'Gestreckt wird erst hinter dem Horizont', x0 + 6, 68);
    }

    // Schwarzes Loch
    const gl = ctx.createRadialGradient(bx, cy, RH, bx, cy, RH + 12);
    gl.addColorStop(0, 'rgba(243,181,80,.5)'); gl.addColorStop(1, 'rgba(243,181,80,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, cy, RH + 12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, cy, RH, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('Horizont', bx, cy + RH + 24);

    // Achse: Abstand in Horizont-Radien
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, axY); ctx.lineTo(x1, axY); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    [['Rand', 0], ['10×', 1], ['100×', 2], ["1'000×", 3]].forEach(([t, u]) => {
      ctx.fillRect(X(u) - .5, axY - 3, 1, 6);
      ctx.textAlign = u === 0 ? 'left' : u === 3 ? 'right' : 'center';
      ctx.fillText(t, X(u) + (u === 0 ? -2 : u === 3 ? 4 : 0), axY + 15);
    });
    ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Abstand in Horizont-Radien (log.)' : 'Abstand zur Mitte in Horizont-Radien (logarithmisch)', (x0 + x1) / 2, axY + 32);

    // Astronautin, Füsse voran
    const q = g.tid / A_LIM;
    const s = clamp(1 + .9 * Math.max(0, Math.log10(q) + .5), 1, 8);
    const fx = X(g.u) + 2, k = narrow ? .85 : 1;
    const avail = x1 + 14 - fx;
    const sx = Math.min(s, Math.max(1, avail / (44 * k)));
    ctx.save();
    ctx.translate(fx, cy); ctx.scale(sx * k, k / Math.sqrt(s));
    ctx.globalAlpha = F.v >= 1000 ? .35 : 1;
    ctx.fillStyle = '#f2f4f7'; ctx.strokeStyle = '#7d8796'; ctx.lineWidth = 1;
    roundRect(ctx, 0, -6, 17, 12, 4); ctx.fill(); ctx.stroke();
    roundRect(ctx, 15, -9, 17, 18, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9ced6'; roundRect(ctx, 18, -12, 11, 4, 2); ctx.fill();
    ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(37, 0, 7.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a6fb0'; ctx.beginPath(); ctx.arc(39, 0, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    // Fallrichtung
    if (F.v < 1000) {
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
      const ax = fx - 8;
      ctx.beginPath(); ctx.moveTo(ax, cy + 22); ctx.lineTo(ax - 18, cy + 22); ctx.lineTo(ax - 13, cy + 18); ctx.moveTo(ax - 18, cy + 22); ctx.lineTo(ax - 13, cy + 26); ctx.stroke();
    }

    // Zwei Uhren
    const clock = (x, y, ang, label, col) => {
      ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(ang) * 11, y - Math.cos(ang) * 11); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 28);
    };
    const cyC = 24;
    clock(w - (narrow ? 112 : 150), cyC, F.angRef, narrow ? 'unsere' : 'unsere Uhr', C.fg);
    clock(w - 40, cyC, F.ang, narrow ? 'ihre' : 'ihre Uhr', C.glow);
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
    ctx.fillText(`${big(Math.pow(10, F.lm))} Sonnen`, 12, 20);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(`Horizont ${len(g.rs)}`, 12, 34);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('schwarzeloecher', 4, {
    escLock: () => { ['#sqIn', '#goBtn', '#origBtn'].forEach(s => $(s).disabled = false); $$('#bodySel button').forEach(b => b.disabled = false); },
    orbLock: () => { ['#bhBtn', '#orbReset', '#mIn'].forEach(s => $(s).disabled = false); },
    fallLock: () => { ['#bmIn', '#abIn', '#fallBtn'].forEach(s => $(s).disabled = false); $$('#bhSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawEsc(dt); drawOrb(dt); drawFall(dt); });
})();
