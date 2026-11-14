/* mindblow – Lektion Solarstrom */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const GAP = 1.12; // Bandlücke von Silizium in eV

  // Farbe einer Wellenlänge (ungefähr). UV und Infrarot sind unsichtbar und werden gedämpft dargestellt.
  const waveColor = nm => {
    if (nm < 380) return 'hsl(275, 45%, 58%)';
    if (nm > 750) return 'hsl(0, 45%, 46%)';
    const hue = 270 - (nm - 380) / (750 - 380) * 270;
    return `hsl(${hue.toFixed(0)}, 85%, 52%)`;
  };
  const waveName = nm => nm < 380 ? 'Ultraviolett' : nm < 450 ? 'Violett' : nm < 495 ? 'Blau' : nm < 570 ? 'Grün' : nm < 590 ? 'Gelb' : nm < 620 ? 'Orange' : nm <= 750 ? 'Rot' : 'Infrarot';

  /* ---------- Teil 1: Photonen auf Silizium ---------- */
  const photonCv = $('#photonCv');
  const P1 = { nm: 550, bright: 4, photons: [], elec: [], flashes: [], acc: 0, freed: 0, on: false };
  const eV = () => 1240 / P1.nm;
  const updPhoton = () => {
    const E = eV();
    $('#waveOut').textContent = `${P1.nm} nm`;
    $('#brightOut').textContent = String(P1.bright);
    $('#pE').textContent = `${fmt(E, 2)} eV`;
    $('#pN').textContent = fmt(P1.freed, 0);
    $('#pH').textContent = E < GAP ? 'fliegt durch' : `${fmt((E - GAP) / E * 100, 0)} %`;
  };
  const photonText = () => {
    const E = eV(), n = waveName(P1.nm);
    if (E < GAP) return `${n}, ${fmt(E, 2)} eV: zu wenig. Das Photon fliegt durch das Silizium hindurch. Auch zehnmal heller ändert daran nichts.`;
    if (P1.nm < 380) return `${n}, ${fmt(E, 2)} eV: Ein Elektron wird frei, aber über zwei Drittel der Energie werden Wärme.`;
    if (P1.nm > 1000) return `${n}, ${fmt(E, 2)} eV: knapp genug. Fast die ganze Energie wird genutzt.`;
    if (P1.nm > 750) return `${n}, ${fmt(E, 2)} eV: unsichtbar, aber genug für ein Elektron. Der Rest wird Wärme.`;
    return `${{ Orange: 'Oranges' }[n] || n + 'es'} Licht, ${fmt(E, 2)} eV: genug für ein Elektron. Der Rest wird Wärme.`;
  };
  $('#waveIn').addEventListener('input', e => { P1.nm = +e.target.value; P1.freed = 0; updPhoton(); $('#photonStatus').textContent = photonText(); });
  $('#brightIn').addEventListener('input', e => {
    P1.bright = +e.target.value; P1.freed = 0; updPhoton();
    $('#photonStatus').textContent = eV() < GAP ? 'Mehr Photonen, aber jedes einzelne hat zu wenig Energie. Kein Elektron wird frei.' : 'Mehr Licht heisst mehr Photonen pro Sekunde, also mehr befreite Elektronen.';
  });
  updPhoton();

  const p1Geo = (w, h) => {
    const small = w < 420, bandW = small ? 70 : 96;
    const sx = 14, sw = w - bandW - 28, sy = Math.round(h * .42), sh = Math.round(h * .36);
    return { small, bandW, sx, sw, sy, sh, bx: w - bandW - 6 };
  };
  const simPhoton = (dt, g) => {
    if (!P1.on) return;
    P1.acc += dt * P1.bright * 2.2;
    while (P1.acc >= 1) {
      P1.acc -= 1;
      const E = eV();
      // kurze Wellen werden nahe der Oberfläche geschluckt, lange tiefer
      const depth = E < GAP ? Infinity : g.sh * clamp(-Math.log(Math.random()) * (P1.nm < 450 ? .08 : P1.nm < 700 ? .25 : .55), .03, .95);
      P1.photons.push({ x: g.sx + 10 + Math.random() * (g.sw - 20), y: -10, stop: g.sy + depth, E });
    }
    for (const p of P1.photons) {
      p.y += 260 * dt;
      if (p.y >= p.stop) {
        p.dead = true;
        P1.freed++;
        P1.elec.push({ x: p.x, y: p.stop, vx: 0, vy: -50, life: 0 });
        P1.flashes.push({ x: p.x, y: p.stop, a: (p.E - GAP) / p.E, life: 0 });
      }
      if (p.y > (g.sy + g.sh + 80)) p.dead = true;
    }
    P1.photons = P1.photons.filter(p => !p.dead);
    for (const e of P1.elec) {
      e.life += dt;
      e.vx += (Math.random() - .5) * 400 * dt; e.vy += (Math.random() - .5) * 400 * dt; e.vx *= .9; e.vy *= .9;
      e.x = clamp(e.x + e.vx * dt, g.sx + 4, g.sx + g.sw - 4); e.y = clamp(e.y + e.vy * dt, g.sy + 4, g.sy + g.sh - 4);
    }
    P1.elec = P1.elec.filter(e => e.life < 2.4);
    for (const f of P1.flashes) f.life += dt;
    P1.flashes = P1.flashes.filter(f => f.life < .7);
    updPhoton();
  };
  const drawPhotonShape = (ctx, x, y, col) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const yy = y - 18 + i * 1.5, xx = x + Math.sin(i * 1.1) * 3; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
  };
  const drawPhoton = dt => {
    const { ctx, w, h } = fit(photonCv);
    const g = p1Geo(w, h);
    simPhoton(dt, g);
    ctx.clearRect(0, 0, w, h);
    const col = waveColor(P1.nm);
    // Lichtquelle
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(`${waveName(P1.nm)} · ${P1.nm} nm`, g.sx, 16);
    // Silizium
    ctx.fillStyle = C.sunk; roundRect(ctx, g.sx, g.sy, g.sw, g.sh, 8); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const step = g.small ? 24 : 28;
    for (let y = g.sy + step / 2; y < g.sy + g.sh; y += step) for (let x = g.sx + step / 2; x < g.sx + g.sw; x += step) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = C.line; ctx.fill();
      ctx.beginPath(); ctx.arc(x + 6, y - 4, 1.6, 0, TAU); ctx.fillStyle = C.muted; ctx.fill();
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('Silizium', g.sx + 6, g.sy + g.sh + 16);
    // Photonen
    for (const p of P1.photons) {
      const inside = p.y > g.sy;
      ctx.globalAlpha = inside ? .45 : 1;
      drawPhotonShape(ctx, p.x, p.y, col);
      ctx.globalAlpha = 1;
    }
    // Wärme-Blitze
    for (const f of P1.flashes) {
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + 16 * f.a * (f.life / .7), 0, TAU);
      ctx.fillStyle = C.bad; ctx.globalAlpha = .35 * f.a * (1 - f.life / .7) + .02; ctx.fill(); ctx.globalAlpha = 1;
    }
    // freie Elektronen
    for (const e of P1.elec) {
      ctx.globalAlpha = 1 - clamp((e.life - 1.8) / .6, 0, 1);
      ctx.beginPath(); ctx.arc(e.x, e.y, 3.4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (!P1.on) { ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.fillText('Das Licht ist noch aus', g.sx + g.sw / 2, g.sy - 30); }
    // Energiediagramm
    const bx = g.bx, bw = g.bandW - 6, top = 34, bot = h - 40;
    const Ymax = 4.2, Y = e => bot - (bot - top) * clamp(e, 0, Ymax) / Ymax;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(bx, top - 6); ctx.lineTo(bx, bot); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.fg; ctx.beginPath(); ctx.moveTo(bx + 4, bot); ctx.lineTo(bx + bw, bot); ctx.stroke();
    ctx.strokeStyle = C.accent; ctx.beginPath(); ctx.moveTo(bx + 4, Y(GAP)); ctx.lineTo(bx + bw, Y(GAP)); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('gebunden', bx + 4, bot + 14);
    ctx.fillStyle = C.accent; ctx.fillText('frei', bx + 4, Y(GAP) - 6);
    ctx.fillStyle = C.muted; ctx.fillText(g.small ? '1,12 eV' : 'Lücke 1,12 eV', bx + 4, Y(GAP / 2) + 4);
    // Pfeil der Photonenenergie
    const E = eV(), ax = bx + bw - 10, ay = Y(E);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, bot); ctx.lineTo(ax, ay + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 5, ay + 8); ctx.lineTo(ax + 5, ay + 8); ctx.closePath(); ctx.fill();
    if (E > GAP) {
      ctx.fillStyle = C.bad; ctx.globalAlpha = .18; ctx.fillRect(ax - 8, ay, 16, Y(GAP) - ay); ctx.globalAlpha = 1;
      ctx.fillStyle = C.bad; ctx.textAlign = 'right'; if (Y(GAP) - ay > 24) ctx.fillText('Wärme', ax - 10, (ay + Y(GAP)) / 2 + 4);
    }
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText('Energie', bx + 4, 16);
  };

  /* ---------- Teil 2: p-n-Übergang ---------- */
  const pnCv = $('#pnCv');
  const P2 = { pn: true, light: .6, pairs: [], wire: [], flashes: [], acc: 0, on: false, gen: [], col: [], ratio: 0 };
  const p2Geo = (w, h) => {
    const small = w < 420;
    const x0 = 14, x1 = w - (small ? 70 : 96), top = 56, nH = 48, jH = 22, bot = h - 36;
    return { small, x0, x1, top, nY: top + nH, jY: top + nH + jH, bot, wx: w - (small ? 34 : 46) };
  };
  const wirePath = g => [[g.x1 - 30, g.top - 4], [g.x1 - 30, g.top - 22], [g.wx, g.top - 22], [g.wx, g.bot + 18], [g.x1 - 30, g.bot + 18], [g.x1 - 30, g.bot + 4]];
  const pathLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const pathAt = (pts, d) => {
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= l) { const f = d / l; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; }
      d -= l;
    }
    return pts[pts.length - 1];
  };
  const updPn = () => {
    $('#lightOut').textContent = `${fmt(P2.light * 100, 0)} %`;
    const r = P2.ratio;
    $('#nCol').textContent = P2.on && P2.light > 0 ? `${fmt(r * 100, 0)} %` : '–';
    const I = 10.5 * P2.light * r, U = P2.pn && P2.light > 0 ? Math.max(0, .62 + .0257 * Math.log(P2.light)) : 0;
    $('#nI').textContent = P2.on ? `${fmt(I, 1)} A` : '–';
    $('#nU').textContent = P2.on ? `${fmt(U, 2)} V` : '–';
  };
  $$('#pnBtns button').forEach(b => b.addEventListener('click', () => {
    P2.pn = b.dataset.pn === '1'; $$('#pnBtns button').forEach(x => x.classList.toggle('active', x === b));
    P2.gen = []; P2.col = [];
    $('#pnStatus').textContent = P2.pn
      ? 'Mit p-n-Übergang: Das Feld an der Grenze zieht Elektronen nach oben, Lücken nach unten. Die Lampe leuchtet.'
      : 'Nur Silizium, ohne Feld: Elektronen und Lücken irren herum und finden bald wieder zusammen. Die Energie wird Wärme, die Lampe bleibt dunkel.';
  }));
  $('#lightIn').addEventListener('input', e => { P2.light = +e.target.value / 100; updPn(); });

  const simPn = (dt, g) => {
    if (!P2.on) return;
    const now = performance.now() / 1000;
    P2.acc += dt * P2.light * 12;
    while (P2.acc >= 1) {
      P2.acc -= 1;
      const x = g.x0 + 10 + Math.random() * (g.x1 - g.x0 - 20), y = g.top + 6 + Math.min(g.bot - g.top - 12, -Math.log(Math.random()) * 70);
      P2.pairs.push({ e: { x, y }, h: { x: x + 4, y: y + 3 }, age: 0, life: 1.6 + Math.random() * 1.4, eDone: false, hDone: false, eSafe: false, hSafe: false, phot: 0 });
      P2.gen.push(now);
    }
    const walk = (p, s) => { p.x += (Math.random() - .5) * s * dt * 2.2; p.y += (Math.random() - .5) * s * dt * 2.2; p.x = clamp(p.x, g.x0 + 4, g.x1 - 4); p.y = clamp(p.y, g.top + 4, g.bot - 4); };
    for (const q of P2.pairs) {
      q.age += dt;
      const sp = reduced ? 1.6 : 1;
      if (P2.pn) {
        // Elektron: in p-Schicht herumirren, im Feld oder in der n-Schicht nach oben
        if (!q.eDone) {
          if (q.e.y > g.jY && !q.eSafe) walk(q.e, 260 * sp);
          else { q.eSafe = true; q.e.y -= 110 * dt * sp; q.e.x += (Math.random() - .5) * 40 * dt; }
          if (q.e.y <= g.top + 3) { q.eDone = true; P2.wire.push({ d: 0 }); P2.col.push(now); }
        }
        if (!q.hDone) {
          if (q.h.y < g.nY && !q.hSafe) walk(q.h, 200 * sp);
          else { q.hSafe = true; q.h.y += 80 * dt * sp; q.h.x += (Math.random() - .5) * 40 * dt; }
          if (q.h.y >= g.bot - 3) q.hDone = true;
        }
        if (q.age > q.life && (!q.eSafe || !q.hSafe)) { q.dead = true; P2.flashes.push({ x: q.e.x, y: q.e.y, life: 0 }); }
      } else {
        walk(q.e, 260 * sp); walk(q.h, 200 * sp);
        if (q.age > q.life) { q.dead = true; P2.flashes.push({ x: q.e.x, y: q.e.y, life: 0 }); }
      }
      if (q.eDone && q.hDone) q.dead = true;
    }
    P2.pairs = P2.pairs.filter(q => !q.dead);
    const L = pathLen(wirePath(g));
    for (const wv of P2.wire) wv.d += 170 * dt;
    P2.wire = P2.wire.filter(wv => wv.d < L);
    for (const f of P2.flashes) f.life += dt;
    P2.flashes = P2.flashes.filter(f => f.life < .5);
    // gleitender Anteil über die letzten 5 s
    while (P2.gen.length && P2.gen[0] < now - 5) P2.gen.shift();
    while (P2.col.length && P2.col[0] < now - 5) P2.col.shift();
    const target = P2.gen.length > 3 ? Math.min(1, P2.col.length / P2.gen.length) : (P2.light > 0 ? P2.ratio : 0);
    P2.ratio += (target - P2.ratio) * Math.min(1, dt * 2);
    updPn();
  };
  const drawPn = dt => {
    const { ctx, w, h } = fit(pnCv);
    const g = p2Geo(w, h);
    simPn(dt, g);
    ctx.clearRect(0, 0, w, h);
    const cw = g.x1 - g.x0;
    // Schichten
    ctx.fillStyle = C.fiber; ctx.globalAlpha = P2.pn ? .16 : .07; ctx.fillRect(g.x0, g.top, cw, g.nY - g.top);
    ctx.fillStyle = C.copper; ctx.globalAlpha = P2.pn ? .12 : .07; ctx.fillRect(g.x0, g.jY, cw, g.bot - g.jY);
    ctx.globalAlpha = 1;
    if (P2.pn) {
      ctx.fillStyle = C.glow; ctx.globalAlpha = .18; ctx.fillRect(g.x0, g.nY, cw, g.jY - g.nY); ctx.globalAlpha = 1;
      // Feldpfeile: Elektronen werden nach oben gezogen
      ctx.strokeStyle = C.glow; ctx.fillStyle = C.glow; ctx.lineWidth = 1.5;
      for (let x = g.x0 + 24; x < g.x1 - 10; x += g.small ? 46 : 60) {
        ctx.beginPath(); ctx.moveTo(x, g.jY - 3); ctx.lineTo(x, g.nY + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, g.nY + 2); ctx.lineTo(x - 4, g.nY + 8); ctx.lineTo(x + 4, g.nY + 8); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = C.sunk; ctx.fillRect(g.x0, g.nY, cw, g.jY - g.nY);
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(g.x0, g.top, cw, g.bot - g.top);
    // Kontakte
    ctx.fillStyle = C.muted;
    for (let x = g.x0 + 14; x < g.x1 - 8; x += g.small ? 36 : 44) ctx.fillRect(x, g.top - 5, 8, 6);
    ctx.fillRect(g.x1 - 34, g.top - 5, 8, 6);
    ctx.fillRect(g.x0, g.bot, cw, 5);
    // Beschriftung
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.fg;
    if (P2.pn) {
      ctx.fillText(g.small ? 'n' : 'n-Schicht (Phosphor)', g.x0 + 6, g.top + 16);
      ctx.fillText(g.small ? 'p' : 'p-Schicht (Bor)', g.x0 + 6, g.bot - 8);
      ctx.fillStyle = C.glow; ctx.fillText(g.small ? 'Feld' : 'p-n-Übergang: Feld', g.x0 + 6, g.jY - 6);
    } else {
      ctx.fillText(g.small ? 'Silizium' : 'reines Silizium, kein Feld', g.x0 + 6, g.top + 16);
    }
    // Draht und Lampe
    const wp = wirePath(g);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); wp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
    const ly = (g.top + g.bot) / 2, glow = P2.on && P2.pn ? clamp(P2.light * P2.ratio, 0, 1) : 0;
    if (glow > .02) {
      const gr = ctx.createRadialGradient(g.wx, ly, 2, g.wx, ly, 44);
      gr.addColorStop(0, C.glow); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = .7 * glow; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.wx, ly, 44, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(g.wx, ly, 13, 0, TAU); ctx.fillStyle = glow > .02 ? C.glow : C.surface; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.wx - 6, ly - 6); ctx.lineTo(g.wx + 6, ly + 6); ctx.moveTo(g.wx + 6, ly - 6); ctx.lineTo(g.wx - 6, ly + 6); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('Lampe', g.wx, ly + 28);
    // Elektronen im Draht
    for (const wv of P2.wire) { const [x, y] = pathAt(wp, wv.d); ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fillStyle = C.accent; ctx.fill(); }
    // Rekombination
    for (const f of P2.flashes) { ctx.beginPath(); ctx.arc(f.x, f.y, 3 + 12 * f.life, 0, TAU); ctx.fillStyle = C.bad; ctx.globalAlpha = .4 * (1 - f.life / .5); ctx.fill(); ctx.globalAlpha = 1; }
    // Paare
    for (const q of P2.pairs) {
      if (!q.eDone) { ctx.beginPath(); ctx.arc(q.e.x, q.e.y, 3.4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill(); }
      if (!q.hDone) { ctx.beginPath(); ctx.arc(q.h.x, q.h.y, 3.4, 0, TAU); ctx.strokeStyle = C.copper; ctx.lineWidth = 1.6; ctx.stroke(); }
    }
    // Licht von oben
    if (P2.on && P2.light > 0) {
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5; ctx.globalAlpha = .3 + .5 * P2.light;
      for (let x = g.x0 + 20; x < g.x1 - 10; x += g.small ? 40 : 52) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x + 6, g.top - 12); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('● Elektron  ○ Lücke', g.x0, h - 10);
  };

  /* ---------- Teil 3: Modul mit 12 Zellen ---------- */
  const modCv = $('#modCv');
  const ROWS = 3, COLS = 4, ICELL = 9.5, VCELL = .5, ACELL = .156 * .156, SHADE = .15, VDIODE = .4;
  const P3 = { angle: 0, bypass: true, shade: new Array(ROWS * COLS).fill(false), flow: 0 };
  const compute = () => {
    const cosA = Math.cos(P3.angle * Math.PI / 180);
    const Ic = P3.shade.map(s => ICELL * cosA * (s ? SHADE : 1));
    const gMin = [0, 1, 2].map(r => Math.min(...Ic.slice(r * COLS, r * COLS + COLS)));
    let I, P, bypassed = [false, false, false];
    if (!P3.bypass) { I = Math.min(...Ic); P = I * VCELL * ROWS * COLS; }
    else {
      P = -1; I = 0;
      for (const cand of gMin) {
        const pw = cand * gMin.reduce((s, m) => s + (m >= cand - 1e-9 ? COLS * VCELL : -VDIODE), 0);
        if (pw > P) { P = pw; I = cand; }
      }
      bypassed = gMin.map(m => m < I - 1e-9);
    }
    const light = 1000 * cosA * ACELL * ROWS * COLS;
    return { I, P: Math.max(0, P), eta: light > 0 ? Math.max(0, P) / light * 100 : 0, bypassed, cosA };
  };
  const updMod = () => {
    const r = compute();
    $('#angleOut').textContent = `${P3.angle}°`;
    $('#mP').textContent = `${fmt(r.P, 1)} W`;
    $('#mI').textContent = `${fmt(r.I, 1)} A`;
    $('#mEta').textContent = `${fmt(r.eta, 1)} %`;
    const nS = P3.shade.filter(Boolean).length, full = ICELL * VCELL * ROWS * COLS;
    let t;
    if (!nS) t = P3.angle === 0 ? 'Volle Sonne, senkrecht: Alle 12 Zellen liefern. Tippe auf eine Zelle, um ein Blatt darauf zu legen.'
      : `Bei ${P3.angle}° trifft nur noch ${fmt(r.cosA * 100, 0)} % so viel Licht auf dieselbe Fläche. Der Wirkungsgrad bleibt gleich, die Leistung sinkt.`;
    else if (!P3.bypass) t = `${nS === 1 ? 'Eine einzige Zelle' : `${nS} Zellen`} im Schatten, und das ganze Modul liefert nur noch ${fmt(r.P / (full * r.cosA || 1) * 100, 0)} %. Die Kette ist so stark wie ihre schwächste Zelle.`;
    else {
      const nb = r.bypassed.filter(Boolean).length;
      t = nb ? `Die Bypass-Diode überbrückt ${nb === 1 ? 'die Gruppe' : `${nb} Gruppen`} mit Schatten. Es fällt ${nb === 1 ? 'nur ein Drittel' : 'mehr'} aus, nicht das ganze Modul. Schalte die Dioden aus und vergleiche.`
        : 'Schatten in allen Gruppen: Umleiten lohnt sich nicht mehr, alle Zellen laufen mit dem kleinen Strom.';
    }
    $('#modStatus').textContent = t;
  };
  $('#angleIn').addEventListener('input', e => { P3.angle = +e.target.value; updMod(); });
  $$('#bypassBtns button').forEach(b => b.addEventListener('click', () => {
    P3.bypass = b.dataset.bp === '1'; $$('#bypassBtns button').forEach(x => x.classList.toggle('active', x === b)); updMod();
  }));
  $('#clearBtn').addEventListener('click', () => { P3.shade.fill(false); updMod(); });
  const modGeo = (w, h) => {
    const small = w < 420, topH = small ? 130 : 140;
    const gw = Math.min(w - (small ? 70 : 120), 440), cs = Math.min(gw / COLS, (h - topH - 40) / ROWS);
    const gx = (w - cs * COLS) / 2, gy = topH + 14;
    return { small, topH, cs, gx, gy };
  };
  modCv.addEventListener('click', e => {
    if ($('#angleIn').disabled) return;
    const r = modCv.getBoundingClientRect(), g = modGeo(r.width, r.height);
    const c = Math.floor((e.clientX - r.left - g.gx) / g.cs), row = Math.floor((e.clientY - r.top - g.gy) / g.cs);
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return;
    const i = row * COLS + c; P3.shade[i] = !P3.shade[i]; updMod();
  });
  updMod();

  const drawLeaf = (ctx, x, y, s) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.6);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * .75, s, 0); ctx.quadraticCurveTo(0, s * .75, -s, 0);
    ctx.fillStyle = C.good; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.surface; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-s * .9, 0); ctx.lineTo(s * .8, 0); ctx.stroke();
    ctx.restore();
  };
  const drawMod = (dt, now) => {
    const { ctx, w, h } = fit(modCv);
    ctx.clearRect(0, 0, w, h);
    const g = modGeo(w, h), r = compute();
    // Sonnenskizze: Modul waagrecht, Licht im Winkel zur Senkrechten
    const pcx = w / 2, pcy = g.topH - 26, pl = g.small ? 120 : 150, a = P3.angle * Math.PI / 180;
    const dx = Math.sin(a), dy = Math.cos(a); // Richtung zur Sonne (von der Mitte aus): (−dx … ) oben links
    const sunD = g.topH - 50;
    const sx = pcx - dx * sunD, sy = pcy - dy * sunD;
    ctx.beginPath(); ctx.arc(sx, Math.max(14, sy), 11, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    // Strahlen: Abstand senkrecht zum Strahl fest, darum treffen bei Schräglicht weniger das Modul
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, pcy); ctx.clip();
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.4; ctx.globalAlpha = .75;
    const sp = 16, nx = dy, ny = -dx; // senkrecht zum Strahl
    for (let k = -14; k <= 14; k++) {
      const ox = pcx + nx * k * sp, oy = pcy + ny * k * sp;
      // Schnitt mit der Modulebene y = pcy
      const t = (pcy - oy) / dy, hx = ox + dx * t;
      if (Math.abs(hx - pcx) > pl / 2) continue;
      ctx.beginPath(); ctx.moveTo(hx - dx * 200, pcy - dy * 200); ctx.lineTo(hx, pcy); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pcx - pl / 2, pcy); ctx.lineTo(pcx + pl / 2, pcy); ctx.stroke();
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(pcx, pcy - (g.topH - 40)); ctx.stroke(); ctx.setLineDash([]);
    if (P3.angle > 0) {
      ctx.beginPath(); ctx.arc(pcx, pcy, 30, -Math.PI / 2 - a, -Math.PI / 2); ctx.strokeStyle = C.fg; ctx.stroke();
      ctx.font = MONO; ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(`${P3.angle}°`, pcx + 6, pcy - 34);
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(g.small ? 'Seitenansicht' : 'Seitenansicht: Licht trifft das Modul', 10, 16);
    ctx.textAlign = 'right'; ctx.fillText(`${fmt(r.cosA * 100, 0)} % Licht`, w - 10, 16);
    // Zellen
    const cellCol = '#22324F';
    for (let i = 0; i < ROWS * COLS; i++) {
      const row = Math.floor(i / COLS), c = i % COLS, x = g.gx + c * g.cs, y = g.gy + row * g.cs;
      roundRect(ctx, x + 2, y + 2, g.cs - 4, g.cs - 4, 4);
      ctx.fillStyle = cellCol; ctx.globalAlpha = P3.shade[i] ? .45 : .25 + .75 * r.cosA; ctx.fill(); ctx.globalAlpha = 1;
      if (P3.bypass && r.bypassed[row]) { ctx.strokeStyle = C.muted; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 6, y + k * g.cs / 4); ctx.lineTo(x + g.cs - 6, y + k * g.cs / 4); ctx.stroke(); }
      if (P3.shade[i]) drawLeaf(ctx, x + g.cs / 2, y + g.cs / 2, g.cs * .32);
    }
    // Verkabelung als Schlange und Dioden
    ctx.strokeStyle = C.copper; ctx.lineWidth = 2; ctx.beginPath();
    const pts = [];
    for (let row = 0; row < ROWS; row++) {
      const y = g.gy + row * g.cs + g.cs / 2, L = g.gx - 10, R = g.gx + COLS * g.cs + 10;
      if (row % 2 === 0) { pts.push([L, y], [R, y]); } else { pts.push([R, y], [L, y]); }
    }
    pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;
    // Stromfluss
    if (!reduced && r.I > .05) {
      P3.flow = (P3.flow + dt * r.I * 9) % 24;
      const L = pathLen(pts);
      ctx.fillStyle = C.copper;
      for (let d = P3.flow; d < L; d += 24) { const [x, y] = pathAt(pts, d); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); }
    }
    // Bypass-Dioden links neben jeder Reihe
    ctx.font = MONO;
    for (let row = 0; row < ROWS; row++) {
      const x = g.gx - (g.small ? 22 : 30), y = g.gy + row * g.cs + g.cs / 2;
      const on = P3.bypass && r.bypassed[row];
      ctx.globalAlpha = P3.bypass ? 1 : .25;
      ctx.fillStyle = on ? C.glow : C.muted;
      ctx.beginPath(); ctx.moveTo(x - 6, y - 7); ctx.lineTo(x - 6, y + 7); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
      ctx.fillRect(x + 6, y - 7, 2, 14);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText(g.small ? 'Tippe auf Zellen' : 'Tippe auf eine Zelle für ein Blatt · Dreiecke: Bypass-Dioden', w / 2, g.gy + ROWS * g.cs + 18);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('solar', 4, {
    photonLock: () => { $('#waveIn').disabled = false; $('#brightIn').disabled = false; P1.on = true; $('#photonStatus').textContent = photonText(); },
    pnLock: () => { $$('#pnBtns button').forEach(b => b.disabled = false); $('#lightIn').disabled = false; P2.on = true; },
    modLock: () => { $('#angleIn').disabled = false; $$('#bypassBtns button').forEach(b => b.disabled = false); $('#clearBtn').disabled = false; },
  });

  loop((dt, now) => { drawPhoton(dt); drawPn(dt); drawMod(dt, now); });
})();
