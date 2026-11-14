/* mindblow – Lektion Polarlicht */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const DEG = 180 / Math.PI;
  // Nachthimmel: bewusst dunkel in beiden Farbschemen, mit festen Lichtfarben der Gase
  const NIGHT = '#0b1020', GROUND = '#1b2232', INK = 'rgba(235,240,255,.78)', INK2 = 'rgba(235,240,255,.45)';
  const GREEN = [80, 255, 140], RED = [255, 70, 70], VIOLET = [150, 110, 255];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- Teil 1: Sonnenwind und Magnetfeld ---------- */
  const windCv = $('#windCv');
  const WIND = ['sehr ruhig', 'ruhig', 'lebhaft', 'stark', 'Sturm'];
  const P1 = { field: true, wind: 2, parts: [], acc: 0, storm: 0, def: 0, pole: 0, day: 0, glowN: 0, glowS: 0, latN: 67, flashes: [] };
  const effWind = () => clamp(P1.wind + P1.storm * 2.5, 1, 7);
  const updWind = () => {
    $('#windOut').textContent = WIND[P1.wind - 1];
    $('#wDef').textContent = `${P1.def}`;
    $('#wPole').textContent = `${P1.pole}`;
    $('#wDay').textContent = `${P1.day}`;
  };
  $$('#fieldBtns button').forEach(b => b.addEventListener('click', () => {
    P1.field = b.dataset.field === '1';
    $$('#fieldBtns button').forEach(x => x.classList.toggle('active', x === b));
    P1.def = P1.pole = P1.day = 0; updWind();
    $('#windStatus').textContent = P1.field
      ? 'Magnetfeld an: Die meisten Teilchen werden um die Erde herumgelenkt.'
      : 'Ohne Magnetfeld prallt der Sonnenwind ungebremst auf die Tagseite. Kein Ring an den Polen.';
  }));
  $('#windIn').addEventListener('input', e => {
    P1.wind = +e.target.value; updWind();
    $('#windStatus').textContent = P1.wind >= 4
      ? 'Starker Sonnenwind drückt das Magnetfeld zusammen. Die Teilchen landen weiter vom Pol entfernt.'
      : 'Schwacher Sonnenwind: Das Magnetfeld reicht weit hinaus.';
  });
  $('#cmeBtn').addEventListener('click', () => {
    P1.storm = 1;
    for (let i = 0; i < 70; i++) P1.parts.push(newPart(-Math.random() * .25, 1.4));
    $('#windStatus').textContent = 'Ein Sonnensturm: eine riesige Wolke schneller Teilchen. Das Magnetfeld wird zusammengedrückt.';
  });
  const newPart = (x0 = 0, fast = 1) => ({ st: 'free', x: x0, y: .08 + Math.random() * .84, vy: (Math.random() - .5) * .02, fast, ph: Math.random() * TAU });

  const geo1 = (w, h) => {
    const small = w < 420;
    const Re = small ? 15 : 19;
    return { small, Re, ex: w * (small ? .66 : .64), ey: h / 2, sunX: small ? 18 : 30 };
  };
  const standoff = () => 6.4 - .55 * effWind();                                        // Abstand der Magnetopause in Erdradien
  const boundary = (th, Re) => standoff() * Re * Math.pow(2 / (1 + Math.cos(th)), .62); // Form nach Shue, vereinfacht

  const simWind = (dt, G, w, h) => {
    P1.storm = Math.max(0, P1.storm - dt / 8);
    P1.acc += dt * (3 + effWind() * 2.2);
    while (P1.acc >= 1) { P1.acc--; P1.parts.push(newPart(0)); }
    const sp = (70 + effWind() * 14) / w; // Anteil der Breite pro Sekunde
    for (const p of P1.parts) {
      const px = G.sunX + p.x * (w - G.sunX), py = p.y * h;
      if (p.st === 'free' || p.st === 'defl') {
        if (p.st === 'free') { p.x += sp * p.fast * dt; p.y += p.vy * dt; }
        else { p.x += p.dvx * dt; p.y += p.dvy * dt; }
        const dx = px - G.ex, dy = py - G.ey, r = Math.hypot(dx, dy);
        if (P1.field && p.st === 'free') {
          const th = Math.acos(clamp(-dx / r, -1, 1)); // Winkel zur Richtung der Sonne
          if (r < boundary(th, G.Re)) {
            const pc = .07 + .06 * effWind();
            if (Math.random() < pc) {
              const L = clamp(standoff() * (.85 + Math.random() * .35), 2.2, 9);
              const north = dy < 0;
              p.st = 'cap'; p.L = L; p.north = north; p.t = 0; p.sx = px; p.sy = py;
            } else {
              // an der Grenze entlanggleiten
              const nx = dx / r, ny = dy / r, vx = sp * p.fast * (w - G.sunX), vy = p.vy * h;
              const dot = vx * nx + vy * ny;
              let tx = vx - dot * nx, ty = vy - dot * ny;
              if (Math.hypot(tx, ty) < 1e-3) { tx = 0; ty = dy < 0 ? -1 : 1; }
              const m = Math.hypot(tx, ty), v = Math.hypot(vx, vy);
              p.st = 'defl'; p.dvx = tx / m * v / (w - G.sunX); p.dvy = ty / m * v / h;
            }
          }
        } else if (!P1.field && r < G.Re * 1.12) {
          p.dead = true; P1.day++;
          P1.flashes.push({ x: (px - G.ex) / G.Re, y: (py - G.ey) / G.Re, life: 1 });
        }
        if (p.st === 'defl') {
          // sanft wieder nach rechts drehen, damit sie am Schweif vorbeiziehen
          p.dvx += dt * .08; if (p.x > 1.02 || p.y < -.05 || p.y > 1.05) { p.dead = true; P1.def++; }
        }
        if (p.x > 1.02) { p.dead = true; if (p.st === 'free' && P1.field) P1.def++; }
      } else if (p.st === 'cap') {
        p.t += dt * (p.fast > 1 ? 1.3 : 1) / 1.6;
        p.ph += dt * 26;
        if (p.t >= 1) {
          p.dead = true; P1.pole++;
          const lat = Math.acos(Math.sqrt(1 / p.L)) * DEG;
          if (p.north) { P1.glowN = Math.min(1, P1.glowN + .12); P1.latN = lerp(P1.latN, lat, .2); }
          else P1.glowS = Math.min(1, P1.glowS + .12);
        }
      }
    }
    if (P1.parts.some(p => p.dead)) { P1.parts = P1.parts.filter(p => !p.dead); updWind(); }
    P1.glowN = Math.max(0, P1.glowN - dt * .12); P1.glowS = Math.max(0, P1.glowS - dt * .12);
    for (const f of P1.flashes) f.life -= dt * 1.5;
    P1.flashes = P1.flashes.filter(f => f.life > 0);
  };
  // Punkt auf einer Dipol-Feldlinie: r = L · sin²(c), c ist der Winkel vom Nordpol
  const fieldPt = (G, L, c, side) => {
    const r = L * G.Re * Math.sin(c) ** 2;
    return [G.ex + side * r * Math.sin(c), G.ey - r * Math.cos(c)];
  };
  const capPos = (p, G) => {
    const c0 = Math.PI / 2, c1 = Math.asin(Math.sqrt(1 / p.L));
    const cEnd = p.north ? c1 : Math.PI - c1;
    if (p.t < .2) {
      const [qx, qy] = fieldPt(G, p.L, c0, -1);
      return [lerp(p.sx, qx, p.t / .2), lerp(p.sy, qy, p.t / .2)];
    }
    const c = lerp(c0, cEnd, (p.t - .2) / .8);
    const [x, y] = fieldPt(G, p.L, c, -1);
    const wob = reduced ? 0 : Math.sin(p.ph) * 3;
    return [x + wob * Math.cos(c), y + wob * Math.sin(c)];
  };

  const drawWind = dt => {
    const { ctx, w, h } = fit(windCv);
    const G = geo1(w, h);
    simWind(dt, G, w, h);
    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, w, h);
    // Sonne
    const sg = ctx.createRadialGradient(G.sunX - 60, h / 2, 10, G.sunX - 60, h / 2, 120);
    sg.addColorStop(0, 'rgba(255,220,140,1)'); sg.addColorStop(.6, 'rgba(255,170,60,.85)'); sg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(G.sunX - 60, h / 2, 120, 0, TAU); ctx.fill();
    // Magnetopause und Feldlinien
    if (P1.field) {
      ctx.strokeStyle = 'rgba(140,170,255,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
      ctx.beginPath();
      for (let th = -2.3; th <= 2.3; th += .05) {
        const r = boundary(Math.abs(th), G.Re);
        const x = G.ex - r * Math.cos(th), y = G.ey + r * Math.sin(th);
        th === -2.3 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(140,170,255,.28)'; ctx.lineWidth = 1;
      for (const L of [2, 3, 4.5, 6.5, 9, 13]) for (const side of [-1, 1]) {
        ctx.beginPath(); let started = false;
        for (let c = .05; c <= Math.PI - .05; c += .02) {
          const [x, y] = fieldPt(G, L, c, side);
          const dx = x - G.ex, dy = y - G.ey, r = Math.hypot(dx, dy);
          if (r < G.Re) { started = false; continue; }
          const th = Math.acos(clamp(-dx / r, -1, 1));
          if (r > boundary(th, G.Re) * (side > 0 ? 1.6 : 1)) { started = false; continue; }
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true;
        }
        ctx.stroke();
      }
    }
    // Teilchen
    for (const p of P1.parts) {
      let x, y;
      if (p.st === 'cap') [x, y] = capPos(p, G);
      else { x = G.sunX + p.x * (w - G.sunX); y = p.y * h; }
      ctx.fillStyle = p.st === 'cap' ? rgba(GREEN, .95) : 'rgba(255,210,150,.85)';
      ctx.beginPath(); ctx.arc(x, y, p.st === 'cap' ? 2.2 : 1.7, 0, TAU); ctx.fill();
    }
    // Erde mit Tag- und Nachtseite
    ctx.beginPath(); ctx.arc(G.ex, G.ey, G.Re, 0, TAU); ctx.fillStyle = '#3d6fd8'; ctx.fill();
    ctx.beginPath(); ctx.arc(G.ex, G.ey, G.Re, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fillStyle = 'rgba(5,8,20,.6)'; ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(G.ex, G.ey, G.Re * 1.1, 0, TAU); ctx.stroke();
    // Polarlicht-Ringe (von der Seite gesehen als leuchtende Kappen)
    const ring = (north, glow) => {
      if (glow <= .01) return;
      const a = (90 - P1.latN) / DEG;
      ctx.strokeStyle = rgba(GREEN, clamp(glow, 0, 1)); ctx.lineWidth = 4;
      ctx.shadowColor = rgba(GREEN, 1); ctx.shadowBlur = 12;
      ctx.beginPath();
      const base = north ? -Math.PI / 2 : Math.PI / 2;
      ctx.arc(G.ex, G.ey, G.Re * 1.12, base - a, base + a); ctx.stroke();
      ctx.shadowBlur = 0;
    };
    ring(true, P1.glowN); ring(false, P1.glowS);
    // Einschläge ohne Magnetfeld
    for (const f of P1.flashes) {
      ctx.fillStyle = `rgba(255,190,120,${f.life})`;
      ctx.beginPath(); ctx.arc(G.ex + f.x * G.Re, G.ey + f.y * G.Re, 3 + (1 - f.life) * 5, 0, TAU); ctx.fill();
    }
    ctx.font = MONO; ctx.fillStyle = INK; ctx.textAlign = 'left';
    ctx.fillText('Sonne', 6, 16);
    ctx.textAlign = 'center'; ctx.fillText('Erde', G.ex, G.ey + G.Re + 18);
    ctx.fillStyle = INK2; ctx.textAlign = 'right';
    if (P1.field && !G.small) ctx.fillText('Grenze des Magnetfelds', w - 10, 16);
    ctx.textAlign = 'left'; ctx.fillText(G.small ? 'Tag | Nacht' : 'Tagseite | Nachtseite', G.ex - (G.small ? 32 : 58), h - 10);
  };

  /* ---------- Teil 2: Farben nach Höhe ---------- */
  const colCv = $('#colCv');
  const A0 = 60, A1 = 400, BIN = 4, NB = (A1 - A0) / BIN;
  const P2 = { v: 55, bins: Array.from({ length: NB }, () => [0, 0, 0]), els: [], queue: 0, acc: 0 };
  const energy = () => .1 * Math.pow(10, P2.v / 100 * Math.log10(300)); // 0,1 bis 30 keV
  // Höhe, in der Elektronen dieser Energie gestoppt werden (vereinfachte Faustregel)
  const stopAlt = E => E >= 1 ? 130 - 25 * Math.log10(E) : 130 - 90 * Math.log10(E);
  const fmtE = E => E < 1 ? `${fmt(E, 1)} keV` : `${fmt(E, E < 10 ? 1 : 0)} keV`;
  const updCol = () => {
    const E = energy();
    $('#enOut').textContent = fmtE(E);
    $('#cStop').textContent = `${fmt(stopAlt(E), 0)} km`;
    const tot = [0, 0, 0];
    for (const b of P2.bins) for (let k = 0; k < 3; k++) tot[k] += b[k];
    const sum = tot[0] + tot[1] + tot[2];
    if (sum < .5) { $('#cMain').textContent = '–'; $('#cGas').textContent = '–'; return; }
    const k = tot.indexOf(Math.max(...tot));
    $('#cMain').textContent = ['Rot', 'Grün', 'Violett'][k];
    $('#cGas').textContent = ['Sauerstoff, ganz oben', 'Sauerstoff', 'Stickstoff'][k];
  };
  $('#enIn').addEventListener('input', e => {
    P2.v = +e.target.value; updCol();
    const a = stopAlt(energy());
    $('#colStatus').textContent = a > 200 ? 'Langsame Elektronen bleiben ganz oben stecken. Dort leuchtet Sauerstoff rot.'
      : a > 110 ? 'Mittlere Energie: Die Elektronen kommen bis in die Zone, wo Sauerstoff grün leuchtet.'
        : 'Sehr schnelle Elektronen dringen tief ein. Am unteren Rand leuchtet Stickstoff violett.';
  });
  $('#shootBtn').addEventListener('click', () => { P2.queue += 60; });
  $('#colClear').addEventListener('click', () => { P2.bins.forEach(b => { b[0] = b[1] = b[2] = 0; }); P2.els = []; P2.queue = 0; updCol(); });
  updCol();

  const emit = alt => {
    const i = Math.floor((alt - A0) / BIN); if (i < 0 || i >= NB) return;
    const b = P2.bins[i], r = Math.random();
    if (alt > 220) b[0] += .5;
    else if (alt > 195) { if (r < .5) b[0] += .5; else b[1] += .5; }
    else if (alt >= 100) { if (r < .85) b[1] += .5; else b[2] += .4; }
    else { if (r < .75) b[2] += .5; else b[1] += .3; }
  };
  let lastCol = 0;
  const simCol = (dt, now) => {
    if (P2.queue > 0) { P2.acc += dt * 40; while (P2.acc >= 1 && P2.queue > 0) { P2.acc--; P2.queue--; P2.els.push({ x: Math.random(), alt: A1, stop: stopAlt(energy()) * (.95 + Math.random() * .1) }); } }
    for (const e of P2.els) {
      const v = reduced ? 1e4 : 220; // km pro Sekunde im Modell
      const prev = e.alt; e.alt -= v * dt;
      // Licht entlang des Weges: wenig ganz oben, am meisten kurz vor dem Stopp
      for (let a = prev; a > Math.max(e.alt, e.stop); a -= 2) {
        const p = .015 + .35 * Math.exp(-(a - e.stop) / 25);
        if (Math.random() < p) emit(a);
      }
      if (e.alt <= e.stop) e.dead = true;
    }
    P2.els = P2.els.filter(e => !e.dead);
    const fade = Math.exp(-dt / 6);
    for (const b of P2.bins) { b[0] *= fade; b[1] *= fade; b[2] *= fade; }
    if (now - lastCol > 250) { lastCol = now; updCol(); }
  };

  const drawCol = (dt, now) => {
    simCol(dt, now);
    const { ctx, w, h } = fit(colCv);
    const small = w < 420;
    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, w, h);
    const top = 14, bot = h - 18, ax = small ? 46 : 56;
    const Y = a => bot - (a - A0) / (A1 - A0) * (bot - top);
    const cx0 = ax + 14, cx1 = w - (small ? 70 : 120);
    // Leuchten
    ctx.globalCompositeOperation = 'lighter';
    const bh = (bot - top) / NB + 1;
    for (let i = 0; i < NB; i++) {
      const b = P2.bins[i], a = A0 + (i + .5) * BIN, y = Y(a + BIN / 2);
      for (const [k, col] of [[0, RED], [1, GREEN], [2, VIOLET]]) {
        const I = b[k] / 20; if (I < .005) continue;
        const wob = reduced ? 0 : Math.sin(i * .25 + now / 900) * 6;
        const g = ctx.createLinearGradient(cx0, 0, cx1, 0);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(.25, rgba(col, Math.min(.9, I))); g.addColorStop(.75, rgba(col, Math.min(.9, I))); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.fillRect(cx0 + wob, y, cx1 - cx0, bh);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // Elektronen
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const e of P2.els) { ctx.beginPath(); ctx.arc(lerp(cx0 + 10, cx1 - 10, e.x), Y(e.alt), 1.8, 0, TAU); ctx.fill(); }
    // Höhenachse
    ctx.font = MONO; ctx.lineWidth = 1;
    for (let a = 100; a <= A1; a += 50) {
      const y = Y(a);
      ctx.strokeStyle = 'rgba(235,240,255,.12)'; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(w - 8, y); ctx.stroke();
      ctx.fillStyle = INK2; ctx.textAlign = 'right'; ctx.fillText(`${a} km`, ax - 4, y + 4);
    }
    // Zonen rechts
    const zx = cx1 + 8;
    ctx.textAlign = 'left';
    const zone = (a0, a1, col, txt) => {
      ctx.fillStyle = rgba(col, .8); ctx.fillRect(zx, Y(a1), 3, Y(a0) - Y(a1));
      ctx.fillStyle = INK; ctx.fillText(txt, zx + 8, (Y(a0) + Y(a1)) / 2 + 4);
    };
    zone(205, 400, RED, small ? 'O rot' : 'Sauerstoff rot');
    zone(100, 195, GREEN, small ? 'O grün' : 'Sauerstoff grün');
    zone(A0 + 10, 100, VIOLET, small ? 'N₂' : 'Stickstoff violett');
    // Stopphöhe
    const sa = stopAlt(energy());
    ctx.strokeStyle = INK2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx0, Y(sa)); ctx.lineTo(cx1, Y(sa)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(small ? 'Stopp' : 'hier stoppen sie', cx0 + 4, Y(sa) - 5);
    ctx.fillStyle = INK2; ctx.textAlign = 'right';
    ctx.fillText(small ? 'Flug: 10 km' : 'Linienflug: 10 km, weit unten', w - 10, h - 4);
  };

  /* ---------- Teil 3: Oval und Sichtbarkeit ---------- */
  const ovalCv = $('#ovalCv');
  const R = 6371, BAND = 6;
  const P3 = { kp: 3, obs: 48 };
  const edge = () => 67 - 2 * P3.kp; // Südrand des Ovals in magnetischer Breite (vereinfachte Faustregel)
  // Erhebung über dem Horizont für einen Punkt in Höhe hh, der um dLat Grad entfernt ist
  const elev = (dLat, hh) => {
    const d = Math.abs(dLat) / DEG;
    return Math.atan2((R + hh) * Math.cos(d) - R, (R + hh) * Math.sin(d)) * DEG;
  };
  const view = () => {
    const e0 = edge(), e1 = e0 + BAND;
    if (P3.obs >= e0 && P3.obs <= e1) return { inside: true, d: 0 };
    const nearLat = P3.obs < e0 ? e0 : e1;
    const d = nearLat - P3.obs;
    return { inside: false, d, nearLat, green: elev(d, 110), red: elev(d, 400), north: d > 0 };
  };
  const updOval = () => {
    const v = view(), e0 = edge();
    $('#kpOut').textContent = `Kp ${P3.kp}`;
    $('#oLat').textContent = `${e0}°`;
    $('#oDist').textContent = v.inside ? 'darunter' : `${fmt(Math.abs(v.d) * 111, 0)} km`;
    let txt, st;
    const where = v.north ? 'Nordhorizont' : 'Südhorizont';
    if (v.inside) { txt = 'direkt über dir'; st = 'Du stehst unter dem Oval. Das Licht tanzt über den ganzen Himmel.'; }
    else if (v.green > 0) { txt = `Grün ${fmt(v.green, 0)}° · Rot ${fmt(v.red, 0)}°`; st = `Gut sichtbar am ${where}: grün unten, rot darüber.`; }
    else if (v.red > 0) { txt = `nur Rot, ${fmt(v.red, 0)}°`; st = `Nur das hohe rote Leuchten ragt über den ${where}. Genau so sah man es in der Schweiz im Mai 2024.`; }
    else { txt = 'unsichtbar'; st = 'Das Oval liegt hinter der Erdkrümmung. Selbst die höchsten Lichter bleiben unter deinem Horizont.'; }
    $('#oSee').textContent = txt;
    $('#ovalStatus').textContent = st;
  };
  $('#kpIn').addEventListener('input', e => { P3.kp = +e.target.value; updOval(); });
  $$('#placeBtns button').forEach(b => b.addEventListener('click', () => {
    P3.obs = +b.dataset.lat;
    $$('#placeBtns button').forEach(x => x.classList.toggle('active', x === b));
    updOval();
  }));
  updOval();

  const drawOval = (dt, now) => {
    const { ctx, w, h } = fit(ovalCv);
    const small = w < 420;
    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, w, h);
    const L0 = 42, L1 = 76, mid = (L0 + L1) / 2;
    const s = (w - 24) / (R * (L1 - L0) / DEG);       // Pixel pro km, massstäblich
    const cx = w / 2, groundY = h - 70, cy = groundY + R * s;
    const P = (lat, hh) => { const a = (lat - mid) / DEG; return [cx + (R + hh) * s * Math.sin(a), cy - (R + hh) * s * Math.cos(a)]; };
    // Boden
    ctx.beginPath();
    for (let lat = L0 - 3; lat <= L1 + 3; lat += .5) { const [x, y] = P(lat, 0); lat === L0 - 3 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.lineTo(w + 10, h + 10); ctx.lineTo(-10, h + 10); ctx.closePath();
    ctx.fillStyle = GROUND; ctx.fill(); ctx.strokeStyle = 'rgba(160,180,220,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Breitengrade
    ctx.font = MONO; ctx.textAlign = 'center';
    for (let lat = 45; lat <= L1; lat += 5) {
      const [x, y] = P(lat, 0);
      ctx.strokeStyle = 'rgba(160,180,220,.4)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5); ctx.stroke();
      if (!small || lat % 10 === 0) { ctx.fillStyle = INK2; ctx.fillText(`${lat}°`, x, y + 17); }
    }
    // Vorhang des Polarlichts
    const e0 = edge();
    ctx.globalCompositeOperation = 'lighter';
    for (let lat = e0; lat <= e0 + BAND; lat += .25) {
      const fall = Math.sin((lat - e0) / BAND * Math.PI) * .7 + .3;
      const flick = reduced ? 1 : .8 + .2 * Math.sin(now / 400 + lat * 3);
      const [gx0, gy0] = P(lat, 100), [rx1, ry1] = P(lat, 400);
      const gg = ctx.createLinearGradient(gx0, gy0, rx1, ry1);
      gg.addColorStop(0, rgba(VIOLET, .25 * fall * flick));
      gg.addColorStop(.06, rgba(GREEN, .55 * fall * flick));
      gg.addColorStop(.3, rgba(GREEN, .25 * fall * flick));
      gg.addColorStop(.4, rgba(RED, .22 * fall * flick));
      gg.addColorStop(1, rgba(RED, 0));
      ctx.strokeStyle = gg; ctx.lineWidth = Math.max(1.5, s * 25);
      ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(rx1, ry1); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Beobachter mit Horizont
    const [ox, oy] = P(P3.obs, 0);
    const a = (P3.obs - mid) / DEG, tx = Math.cos(a), ty = Math.sin(a); // Tangente nach Norden
    const v = view();
    const dirN = v.inside || v.north ? 1 : -1;
    ctx.strokeStyle = INK2; ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox - dirN * tx * 30, oy - dirN * ty * 30); ctx.lineTo(ox + dirN * tx * w, oy + dirN * ty * w); ctx.stroke(); ctx.setLineDash([]);
    if (!v.inside && v.red > 0) {
      // Sichtlinie zum höchsten sichtbaren Punkt
      const hh = v.green > 0 ? 110 : 400;
      const [qx, qy] = P(v.nearLat, hh);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox, oy - 3); ctx.lineTo(qx, qy); ctx.stroke();
      if (v.green > 0) { const [rx, ry] = P(v.nearLat, 400); ctx.strokeStyle = INK2; ctx.beginPath(); ctx.moveTo(ox, oy - 3); ctx.lineTo(rx, ry); ctx.stroke(); }
    }
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(ox, oy - 3, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.fillText('du', ox, oy + 32);
    ctx.textAlign = 'left'; ctx.fillStyle = INK2;
    ctx.fillText(small ? 'Süden ←' : '← Süden', 8, 16);
    ctx.textAlign = 'right'; ctx.fillText(small ? '→ Norden' : 'Norden →', w - 8, 16);
    ctx.textAlign = 'center'; ctx.fillStyle = INK2;
    const [lx, ly] = P(e0 + BAND / 2, 430);
    ctx.fillText('Polarlicht', lx, Math.max(30, ly));
    ctx.textAlign = 'left';
    ctx.fillText(small ? 'Höhen massstäblich' : 'Erdkrümmung und Höhen massstäblich', 8, h - 8);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('polarlicht', 4, {
    windLock: () => { $$('#fieldBtns button').forEach(b => b.disabled = false); $('#windIn').disabled = false; $('#cmeBtn').disabled = false; },
    colLock: () => { $('#enIn').disabled = false; $('#shootBtn').disabled = false; $('#colClear').disabled = false; },
    ovalLock: () => { $('#kpIn').disabled = false; $$('#placeBtns button').forEach(b => b.disabled = false); },
  });

  loop((dt, now) => { drawWind(dt); drawCol(dt, now); drawOval(dt, now); });
})();
