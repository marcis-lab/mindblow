/* mindblow – Lektion GPS */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const TAU = Math.PI * 2;
  const LIGHT_KM_S = 299792.458;        // Lichtgeschwindigkeit in km/s
  const LIGHT_M_US = 299.792458;        // Meter pro Mikrosekunde
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SAT_COL = ['glow', 'fiber', 'copper'];

  /* ---------- Teil 1: Trilateration ---------- */
  const gpsCv = $('#gpsCv');
  // Positionen als Anteile der Canvas-Fläche (vereinfacht, nicht massstäblich)
  const SATS = [{ fx: .15, fy: .12 }, { fx: .52, fy: .07 }, { fx: .86, fy: .14 }];
  const MAP = { x0: .07, x1: .93, y0: .6, y1: .93 };
  const G = { fx: .4, fy: .8, shown: 3, unlocked: false, drag: false, geo: null };

  // Massstab: Satellit S2 bis Kartenmitte entspricht etwa 20'200 km Höhe
  const geometry = (w, h) => {
    const kmPerPx = 20200 / (((MAP.y0 + MAP.y1) / 2 - SATS[1].fy) * h);
    const sats = SATS.map(s => ({ x: s.fx * w, y: s.fy * h }));
    const phone = { x: G.fx * w, y: G.fy * h };
    const d = sats.map(s => Math.hypot(s.x - phone.x, s.y - phone.y));
    return { kmPerPx, sats, phone, d };
  };

  const updGps = () => {
    const r = gpsCv.getBoundingClientRect();
    if (!r.width) return;
    const g = geometry(r.width, r.height);
    G.geo = g;
    g.d.forEach((dp, i) => {
      const km = dp * g.kmPerPx;
      $('#d' + (i + 1)).textContent = G.unlocked ? `${fmt(Math.round(km), 0)} km` : '–';
      $('#t' + (i + 1)).textContent = G.unlocked ? `Laufzeit ${fmt(km / LIGHT_KM_S * 1000, 1)} ms` : 'Laufzeit –';
    });
  };

  const STATUS = {
    1: 'Ein Satellit: Du bist irgendwo auf diesem Kreis.',
    2: 'Zwei Satelliten: Nur noch zwei Punkte kommen in Frage.',
    3: 'Drei Satelliten: Alle Kreise treffen sich in genau einem Punkt. Da bist du.',
  };
  const setShown = n => {
    G.shown = n;
    $('#circBtn').textContent = `Kreise: ${n} von 3`;
    $('#gpsStatus').textContent = STATUS[n] + ' (Vereinfacht in 2D)';
  };
  $('#circBtn').addEventListener('click', () => setShown(G.shown % 3 + 1));
  $('#jumpBtn').addEventListener('click', () => {
    G.fx = MAP.x0 + Math.random() * (MAP.x1 - MAP.x0);
    G.fy = MAP.y0 + .04 + Math.random() * (MAP.y1 - MAP.y0 - .04);
    updGps();
  });

  const movePhone = e => {
    const r = gpsCv.getBoundingClientRect();
    G.fx = clamp((e.clientX - r.left) / r.width, MAP.x0, MAP.x1);
    G.fy = clamp((e.clientY - r.top) / r.height, MAP.y0 + .02, MAP.y1);
    updGps();
  };
  gpsCv.addEventListener('pointerdown', e => {
    if (!G.unlocked) return;
    G.drag = true; gpsCv.setPointerCapture(e.pointerId); movePhone(e);
  });
  gpsCv.addEventListener('pointermove', e => { if (G.drag) movePhone(e); });
  const endDrag = () => { G.drag = false; };
  gpsCv.addEventListener('pointerup', endDrag);
  gpsCv.addEventListener('pointercancel', endDrag);
  gpsCv.addEventListener('keydown', e => {
    if (!G.unlocked) return;
    const k = { ArrowLeft: [-.02, 0], ArrowRight: [.02, 0], ArrowUp: [0, -.02], ArrowDown: [0, .02] }[e.key];
    if (!k) return;
    e.preventDefault();
    G.fx = clamp(G.fx + k[0], MAP.x0, MAP.x1);
    G.fy = clamp(G.fy + k[1], MAP.y0 + .02, MAP.y1);
    updGps();
  });

  // Schnittpunkte zweier Kreise
  const intersect = (a, ra, b, rb) => {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 1e-6 || d > ra + rb || d < Math.abs(ra - rb)) return [];
    const l = (ra * ra - rb * rb + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, ra * ra - l * l));
    const mx = a.x + l * dx / d, my = a.y + l * dy / d;
    return [{ x: mx + hh * dy / d, y: my - hh * dx / d }, { x: mx - hh * dy / d, y: my + hh * dx / d }];
  };

  const drawSat = (ctx, x, y, col, label) => {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.fillRect(-14, -3.5, 9, 7); ctx.fillRect(5, -3.5, 9, 7);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.fillStyle = C.fg; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, 0, -10);
    ctx.restore();
  };
  const drawPhone = (ctx, x, y) => {
    ctx.fillStyle = C.fg; roundRect(ctx, x - 6, y - 10, 12, 20, 3); ctx.fill();
    ctx.fillStyle = C.surface; ctx.fillRect(x - 4, y - 7, 8, 12);
  };

  const drawGps = (dt, now) => {
    const { ctx, w, h } = fit(gpsCv);
    ctx.clearRect(0, 0, w, h);
    const g = geometry(w, h);
    if (!G.geo || Math.abs(G.geo.kmPerPx - g.kmPerPx) > 1e-9 || G.geo.phone.x !== g.phone.x) { G.geo = g; updGps(); }
    const small = w < 480;
    // Karte
    const my0 = MAP.y0 * h - 6;
    ctx.fillStyle = C.sunk; ctx.fillRect(0, my0, w, h - my0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, my0); ctx.lineTo(w, my0); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText('Erde (vereinfacht flach)', 10, h - 10);
    ctx.textAlign = 'right';
    ctx.fillText(small ? 'nicht massstäblich' : 'vereinfacht · nicht massstäblich', w - 10, my0 - 8);

    // Kreise
    ctx.save();
    for (let i = 0; i < G.shown; i++) {
      const s = g.sats[i];
      ctx.beginPath(); ctx.arc(s.x, s.y, g.d[i], 0, TAU);
      ctx.strokeStyle = C[SAT_COL[i]]; ctx.lineWidth = 2; ctx.globalAlpha = G.unlocked ? .9 : .35; ctx.stroke();
      ctx.globalAlpha = 1;
      // Signal-Wellen
      if (G.unlocked && !reduced) {
        const f = ((now / 1000 + i * .45) % 1.8) / 1.4;
        if (f < 1) {
          ctx.beginPath(); ctx.arc(s.x, s.y, g.d[i] * f, 0, TAU);
          ctx.strokeStyle = C[SAT_COL[i]]; ctx.lineWidth = 1; ctx.globalAlpha = .45 * (1 - f * .6); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
    // Sichtlinien
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.strokeStyle = C.line;
    for (let i = 0; i < G.shown; i++) {
      ctx.beginPath(); ctx.moveTo(g.sats[i].x, g.sats[i].y); ctx.lineTo(g.phone.x, g.phone.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Abstände an der Sichtlinie
    if (G.unlocked && !small) {
      ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'center';
      for (let i = 0; i < G.shown; i++) {
        const s = g.sats[i], mx = (s.x + g.phone.x) / 2, my = (s.y + g.phone.y) / 2;
        const txt = `${fmt(Math.round(g.d[i] * g.kmPerPx / 100) * 100, 0)} km`;
        const tw = ctx.measureText(txt).width + 10;
        ctx.fillStyle = C.surface; ctx.globalAlpha = .85; ctx.fillRect(mx - tw / 2, my - 9, tw, 16); ctx.globalAlpha = 1;
        ctx.fillStyle = C[SAT_COL[i]]; ctx.fillText(txt, mx, my + 3);
      }
    }
    // Satelliten
    g.sats.forEach((s, i) => drawSat(ctx, s.x, s.y, C[SAT_COL[i]], 'S' + (i + 1)));

    // Kandidaten
    if (G.shown === 2) {
      const pts = intersect(g.sats[0], g.d[0], g.sats[1], g.d[1]);
      ctx.font = '600 12px Geist Mono, monospace'; ctx.textAlign = 'center';
      for (const p of pts) {
        if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) continue;
        ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = C.fg; ctx.fillText('?', p.x + 20, p.y - 10);
      }
    }
    // Handy
    if (G.shown === 3 && G.unlocked) {
      const pulse = reduced ? 0 : (Math.sin(now / 300) + 1) * 3;
      ctx.beginPath(); ctx.arc(g.phone.x, g.phone.y, 16 + pulse, 0, TAU);
      ctx.strokeStyle = C.good; ctx.lineWidth = 2; ctx.stroke();
    }
    drawPhone(ctx, g.phone.x, g.phone.y);
    if (G.unlocked) {
      ctx.fillStyle = C.fg; ctx.font = '11px Geist Mono, monospace';
      const right = g.phone.x < w - 110;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.fillText(G.shown === 3 ? 'hier bist du' : 'dein Handy', g.phone.x + (right ? 22 : -22), g.phone.y + 4);
    }
  };

  /* ---------- Teil 2: Uhrenfehler im vergrösserten Ausschnitt ---------- */
  const errCv = $('#errCv');
  const E = { us: 0, unlocked: false };
  // Richtungen vom Handy zu den Satelliten (Mathe-Koordinaten, y nach oben)
  const dirs = () => {
    const g = G.geo;
    if (!g) return [{ x: -.6, y: .8 }, { x: .1, y: 1 }, { x: .7, y: .7 }].map(u => { const n = Math.hypot(u.x, u.y); return { x: u.x / n, y: u.y / n }; });
    return g.sats.map(s => { const dx = s.x - g.phone.x, dy = -(s.y - g.phone.y), n = Math.hypot(dx, dy); return { x: dx / n, y: dy / n }; });
  };
  // Beste Schätzung (kleinste Quadrate): u_i · p = -b für alle i
  const solve = (us, b) => {
    let a = 0, bb = 0, c = 0, sx = 0, sy = 0;
    for (const u of us) { a += u.x * u.x; bb += u.x * u.y; c += u.y * u.y; sx += u.x; sy += u.y; }
    const det = a * c - bb * bb;
    if (Math.abs(det) < 1e-9) return { x: 0, y: 0 };
    const rx = -b * sx, ry = -b * sy;
    return { x: (c * rx - bb * ry) / det, y: (a * ry - bb * rx) / det };
  };
  const updErr = () => {
    const b = E.us * LIGHT_M_US, p = solve(dirs(), b), off = Math.hypot(p.x, p.y);
    $('#clkOut').textContent = `${fmt(E.us, 1)} µs`;
    $('#eClk').textContent = `${fmt(E.us, 1)} µs`;
    $('#eRange').textContent = `${fmt(Math.round(b), 0)} m`;
    $('#ePos').textContent = `${fmt(Math.round(off / 10) * 10, 0)} m`;
    if (!E.unlocked) return;
    $('#errStatus').textContent = E.us === 0
      ? 'Uhr stimmt: Alle drei Linien treffen sich genau bei dir.'
      : `Alle Abstände sind ${fmt(Math.round(b), 0)} m zu lang. Die Linien bilden ein Dreieck, und die beste Schätzung liegt daneben.`;
  };
  $('#clkIn').addEventListener('input', e => { E.us = +e.target.value; updErr(); });
  const setUs = v => { E.us = v; $('#clkIn').value = v; updErr(); };
  $('#oneUs').addEventListener('click', () => setUs(1));
  $('#zeroUs').addEventListener('click', () => setUs(0));
  updErr();

  const drawErr = () => {
    const { ctx, w, h } = fit(errCv);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, k = Math.min(w, h) / 2 / 3200; // Pixel pro Meter
    const S = (x, y) => [cx + x * k, cy - y * k];
    // Raster alle 500 m
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    const step = 500 * k;
    for (let x = cx % step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = cy % step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // Massstab
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillRect(12, h - 18, 1000 * k, 2);
    ctx.fillText('1 km', 12, h - 24);
    ctx.textAlign = 'right';
    ctx.fillText('Ausschnitt um dein Handy', w - 10, 18);

    const us = dirs(), b = E.us * LIGHT_M_US, L = 6000;
    us.forEach((u, i) => {
      const p0 = { x: -b * u.x, y: -b * u.y }, t = { x: -u.y, y: u.x };
      const [ax, ay] = S(p0.x - L * t.x, p0.y - L * t.y), [bx, by] = S(p0.x + L * t.x, p0.y + L * t.y);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = C[SAT_COL[i]]; ctx.lineWidth = 2.5; ctx.globalAlpha = E.unlocked ? 1 : .35; ctx.stroke(); ctx.globalAlpha = 1;
      // Richtung zum Satelliten
      const R = Math.min(w, h) / 2 - 22, [lx, ly] = [cx + u.x * R, cy - u.y * R];
      ctx.fillStyle = C[SAT_COL[i]]; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(`S${i + 1}`, lx - u.x * 12, ly + u.y * 12 + 4);
      ctx.beginPath(); ctx.moveTo(lx + u.x * 14, ly - u.y * 14);
      ctx.lineTo(lx + u.x * 6 - u.y * 5, ly - u.y * 6 - u.x * 5);
      ctx.lineTo(lx + u.x * 6 + u.y * 5, ly - u.y * 6 + u.x * 5); ctx.closePath(); ctx.fill();
    });
    // wahrer Ort und Schätzung
    const est = solve(us, b), [ex, ey] = S(est.x, est.y);
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText('wirklich hier', cx + 10, cy - 8);
    if (E.unlocked && b > 0) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(ex, ey, 9, 0, TAU); ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.bad; ctx.textAlign = ex > w - 120 ? 'right' : 'left';
      ctx.fillText('Handy rechnet hier', ex + (ex > w - 120 ? -14 : 14), ey + 16);
    }
  };

  /* ---------- Teil 3: Relativität ---------- */
  const relCv = $('#relCv');
  const US_PER_DAY = 38.4, GRAV = 45.7, SPEED = -7.2;
  const PLACES = [['Winterthur', 19], ['Luzern', 41], ['Basel', 74], ['Bern', 95], ['Lugano', 156], ['Genf', 225]];
  const COMPARE = [['Uster', 14], ...PLACES];
  const R = { days: 1, fix: false, play: false, unlocked: false, shown: 1 };
  const errKm = () => (R.fix ? 0 : US_PER_DAY * R.days * LIGHT_M_US / 1000);
  const updRel = () => {
    const d = Math.round(R.days), us = R.fix ? 0 : US_PER_DAY * R.days, km = errKm();
    $('#dayOut').textContent = d === 1 ? '1 Tag' : `${d} Tage`;
    $('#rT').textContent = `${fmt(Math.round(us), 0)} µs`;
    $('#rD').textContent = R.fix ? '≈ 0 km' : `${fmt(km, km < 100 ? 1 : 0)} km`;
    let like = '–';
    if (R.fix) like = 'praktisch nichts';
    else if (km > 0) {
      const below = COMPARE.filter(p => p[1] <= km).pop();
      like = below ? `weiter als Zürich–${below[0]}` : km > 9 ? `fast Zürich–${COMPARE[0][0]}` : 'mehrere Kilometer';
    }
    $('#rL').textContent = like;
    if (!R.unlocked) return;
    $('#relStatus').textContent = R.fix
      ? 'Mit Korrektur gehen die Uhren im All im Gleichschritt mit der Erde. Die Ortung bleibt auf wenige Meter genau.'
      : 'Vereinfacht: Ohne Korrektur wächst der Fehler Tag für Tag weiter.';
  };
  $('#dayIn').addEventListener('input', e => { R.days = +e.target.value; R.play = false; updRel(); });
  $('#playBtn').addEventListener('click', () => {
    if (R.days >= 30) R.days = 0;
    if (reduced) { R.days = 30; $('#dayIn').value = 30; updRel(); return; }
    R.play = true;
  });
  $('#fixBtn').addEventListener('click', () => {
    R.fix = !R.fix;
    $('#fixBtn').textContent = R.fix ? 'Einstein-Korrektur ausschalten' : 'Einstein-Korrektur einschalten';
    updRel();
  });
  updRel();

  const drawRel = (dt) => {
    if (R.play) {
      R.days = Math.min(30, R.days + dt * 5);
      $('#dayIn').value = Math.round(R.days);
      if (R.days >= 30) R.play = false;
      updRel();
    }
    // weiches Nachziehen der Anzeige
    const target = errKm();
    R.shown += (target - R.shown) * (reduced ? 1 : Math.min(1, dt * 8));

    const { ctx, w, h } = fit(relCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 480, pad = 16;
    ctx.font = '11px Geist Mono, monospace';

    // Balken: Wirkung pro Tag
    const labelW = small ? 96 : 170, bx0 = pad + labelW, bx1 = w - pad - 64;
    const unit = (bx1 - bx0) / 54, zero = bx0 + 8 * unit; // Pixel pro µs
    const bars = [
      ['Schwerkraft schwächer', GRAV, C.glow],
      ['hohes Tempo', SPEED, C.fiber],
      ['zusammen', US_PER_DAY, C.copper],
    ];
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText('Uhr im Satellit pro Tag', pad, 20);
    bars.forEach(([lbl, v, col], i) => {
      const y = 34 + i * 28;
      ctx.globalAlpha = R.fix ? .3 : 1;
      ctx.fillStyle = col;
      const x = v >= 0 ? zero : zero + v * unit;
      roundRect(ctx, x, y, Math.abs(v) * unit, 14, 4); ctx.fill();
      ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      ctx.fillText(small ? lbl.replace('Schwerkraft schwächer', 'Schwerkraft') : lbl, pad, y + 11);
      ctx.fillText(`${v > 0 ? '+' : '−'}${fmt(Math.abs(v), 1)} µs`, (v >= 0 ? zero + v * unit : zero) + 6, y + 11);
      ctx.globalAlpha = 1;
    });
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(zero, 30); ctx.lineTo(zero, 34 + 3 * 28 - 10); ctx.stroke();
    if (R.fix) {
      ctx.fillStyle = C.good; ctx.textAlign = 'right';
      ctx.fillText('korrigiert', w - pad, 20);
    }

    // Strecke ab Zürich
    const x0 = pad + 4, x1 = w - pad - 4, maxKm = 360, sc = (x1 - x0) / maxKm;
    const ry = h - 70;
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(small ? 'Fehler ab Zürich, km' : 'So weit daneben ab Zürich, in km (Luftlinie)', pad, ry - 46);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x1, ry); ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k <= maxKm; k += 50) {
      const x = x0 + k * sc;
      ctx.beginPath(); ctx.moveTo(x, ry - 3); ctx.lineTo(x, ry + 3); ctx.stroke();
      if (!small || k % 100 === 0) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(`${k}`, x, ry + 40); }
    }
    const places = small ? PLACES.filter(p => ['Luzern', 'Bern', 'Lugano', 'Genf'].includes(p[0])) : PLACES;
    places.forEach(([name, km], i) => {
      const x = x0 + km * sc, up = i % 2 === 1;
      ctx.fillStyle = C.fg;
      ctx.beginPath(); ctx.arc(x, ry, 3, 0, TAU); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
      ctx.fillText(name, x, up ? ry - 12 : ry + 20);
    });
    // Zürich
    ctx.beginPath(); ctx.arc(x0, ry, 6, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.fillText('Zürich', x0 - 2, ry - 26);
    // Fehlerbalken
    const ex = x0 + Math.min(maxKm, R.shown) * sc;
    if (R.shown > .05) {
      ctx.strokeStyle = C.bad; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(ex, ry); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(ex, ry, 8, 0, TAU); ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.stroke();
    }
    if (R.unlocked) {
      ctx.fillStyle = R.fix ? C.good : C.bad; ctx.font = '600 11px Geist Mono, monospace';
      const txt = R.fix ? 'Handy liegt richtig' : 'Handy meint, du bist hier';
      const tw = ctx.measureText(txt).width;
      ctx.textAlign = 'left';
      ctx.fillText(txt, clamp(ex - tw / 2, pad, w - pad - tw), ry + 58 > h - 4 ? h - 4 : ry + 58);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('gps', 4, {
    gpsLock: () => {
      G.unlocked = true; gpsCv.classList.add('live');
      ['#circBtn', '#jumpBtn'].forEach(s => $(s).disabled = false);
      setShown(3); updGps();
    },
    errLock: () => {
      E.unlocked = true;
      ['#clkIn', '#oneUs', '#zeroUs'].forEach(s => $(s).disabled = false);
      updErr();
    },
    relLock: () => {
      R.unlocked = true;
      ['#dayIn', '#playBtn', '#fixBtn'].forEach(s => $(s).disabled = false);
      updRel();
    },
  });

  loop((dt, now) => { drawGps(dt, now); drawErr(); drawRel(dt); });
})();
