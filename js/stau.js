/* mindblow – Lektion Stau */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const KMH = 3.6;
  const BRAKE = '#ff3b30';   // Bremslicht, bewusst immer rot

  // Farbe nach Tempo (Anteil am Wunschtempo)
  const speedCol = f => f < 0.15 ? C.bad : f < 0.6 ? C.glow : C.fiber;

  // kleiner Zufallsgenerator mit Startwert, damit die Messkurven immer gleich aussehen
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- Gemeinsames Modell: Autos im Kreis ----------
     Vereinfachtes Folgemodell (ähnlich dem «Optimal Velocity Model»):
     Jedes Auto will ein Tempo, das zur Lücke vor ihm passt, sieht diese Lücke aber
     erst nach der Reaktionszeit und passt sein Tempo mit etwas Verzögerung an. */
  const mkRing = o => {
    const S = { ...o, t: 0, x: new Float64Array(o.N), v: new Float64Array(o.N), a: new Float64Array(o.N), brake: null };
    S.D = Math.max(1, Math.round(o.Tr / o.dt)) + 1;
    S.hist = new Float64Array(o.N * S.D); S.hp = 0;
    const h = o.L / o.N, s = h - o.l, v0 = o.V(s);
    for (let i = 0; i < o.N; i++) { S.x[i] = i * h; S.v[i] = v0; }
    S.hist.fill(s);
    return S;
  };
  const gapOf = (S, i) => { const j = (i + 1) % S.N; let s = S.x[j] - S.x[i]; if (s <= 0) s += S.L; return s - S.l; };
  const stepRing = (S, rnd) => {
    const { N, L, x, v, a, hist, D, dt } = S;
    const w = S.hp, r = (S.hp + 1) % D;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, s = gapOf(S, i);
      hist[i * D + w] = s;
      const sd = hist[i * D + r];                 // Lücke, wie sie vor der Reaktionszeit war
      let acc = (S.V(sd) - v[i]) / S.tau + (S.noise ? (rnd() - .5) * 2 * S.noise : 0);
      const dv = v[i] - v[j];                     // Notbremse, wenn es wirklich eng wird
      if (dv > 0) { const b = dv * dv / (2 * Math.max(.2, s - 1)); if (b > 2.5) acc = Math.min(acc, -b); }
      if (s < 1.2) acc = Math.min(acc, -4);
      if (S.brake && S.brake.i === i && S.t < S.brake.until) acc = Math.min(acc, -S.brake.dec);
      a[i] = clamp(acc, -9, 3);
    }
    S.hp = r;
    for (let i = 0; i < N; i++) { v[i] = Math.max(0, v[i] + a[i] * dt); x[i] += v[i] * dt; if (x[i] >= L) x[i] -= L; }
    for (let i = N - 1; i >= 0; i--) {
      const j = (i + 1) % N, s = gapOf(S, i);
      if (s < .3) { x[i] -= .3 - s; if (x[i] < 0) x[i] += L; v[i] = Math.min(v[i], v[j]); }
    }
    S.t += dt;
  };
  const meanV = S => { let m = 0; for (let i = 0; i < S.N; i++) m += S.v[i]; return m / S.N; };

  /* ---------- Teil 1: Ringstrasse ---------- */
  const ringCv = $('#ringCv');
  const R1 = { L: 230, l: 4.5, s0: 3, Tg: .5, tau: .35, Tr: .35, vmax: 40 / KMH, noise: .15, dt: .05 };
  R1.V = s => s <= R1.s0 ? 0 : R1.vmax * (1 - Math.exp(-(s - R1.s0) / (R1.vmax * R1.Tg)));
  const SPEED1 = reduced ? 1 : 2;   // Zeitraffer
  let ring, ringOn = false, ringAcc = 0, waveHist = [], waveSince = null, waveLast = 0, ringUi = 0;
  const ringStart = () => {
    const N = +$('#ringN').value;
    ring = mkRing({ ...R1, N });
    waveHist = []; waveSince = null; ringAcc = 0;
  };
  ringStart();
  const jamCenter = () => {   // Schwerpunkt der langsamen Autos auf dem Kreis
    let sx = 0, sy = 0, wsum = 0;
    for (let i = 0; i < ring.N; i++) {
      const wt = Math.max(0, R1.vmax - ring.v[i]) ** 2, ang = ring.x[i] / R1.L * TAU;
      sx += wt * Math.cos(ang); sy += wt * Math.sin(ang); wsum += wt;
    }
    if (wsum < 1e-6) return null;
    return ((Math.atan2(sy, sx) / TAU * R1.L) % R1.L + R1.L) % R1.L;
  };
  const stoppedCount = S => { let n = 0; for (let i = 0; i < S.N; i++) if (S.v[i] < 5 / KMH) n++; return n; };

  $('#ringN').addEventListener('input', e => {
    $('#ringNOut').textContent = e.target.value; ringStart();
    const n = +e.target.value;
    $('#ringStatus').textContent = n <= 16 ? 'Wenig Autos: Jedes hat viel Platz. Kleine Bremser verpuffen.' : n >= 25 ? 'Sehr dicht: Hier dauert es nicht lange bis zum ersten Stau.' : 'Gleichmässig gestartet. Warte ein bisschen.';
  });
  $('#ringBrake').addEventListener('click', () => {
    ring.brake = { i: 0, until: ring.t + 1.2, dec: 5 };
    $('#ringStatus').textContent = 'Das markierte Auto bremst gut eine Sekunde lang. Schau, was dahinter passiert.';
  });
  $('#ringReset').addEventListener('click', () => { ringStart(); $('#ringStatus').textContent = 'Neu gestartet: alle Autos gleichmässig verteilt und gleich schnell.'; });

  const updRing = () => {
    const vm = meanV(ring), st = stoppedCount(ring);
    $('#ringV').textContent = `${fmt(vm * KMH, 0)} km/h`;
    $('#ringStop').textContent = `${st} von ${ring.N}`;
    // Tempo der Welle: Verschiebung des Stau-Schwerpunkts über die letzten 8 Sekunden
    if (st >= 1 && waveSince !== null && ring.t - waveSince > 8 && waveHist.length > 20) {
      const n = waveHist.length;
      let mt = 0, mu = 0; for (const [t, u] of waveHist) { mt += t; mu += u; } mt /= n; mu /= n;
      let num = 0, den = 0; for (const [t, u] of waveHist) { num += (t - mt) * (u - mu); den += (t - mt) ** 2; }
      const c = den ? num / den * KMH : 0;
      $('#ringWave').textContent = `${fmt(Math.abs(c), 0)} km/h`;
      $('#ringWaveF').textContent = c < 0 ? 'rückwärts, gegen die Fahrtrichtung' : 'vorwärts';
      waveLast = c;
    } else {
      $('#ringWave').textContent = 'keine'; $('#ringWaveF').textContent = 'Tempo der Welle, vereinfacht';
      waveLast = 0;
    }
  };
  updRing();

  const simRing = dt => {
    if (!ringOn) return;
    ringAcc += dt * SPEED1;
    let k = 0;
    while (ringAcc >= R1.dt && k++ < 12) {
      stepRing(ring, Math.random); ringAcc -= R1.dt;
      if (Math.round(ring.t / R1.dt) % 5 === 0) {
        const st = stoppedCount(ring), c = jamCenter();
        if (st >= 1 && c !== null) {
          if (waveSince === null) { waveSince = ring.t; waveHist = []; }
          let u = c;
          if (waveHist.length) { const prev = waveHist[waveHist.length - 1][1]; let d = c - ((prev % R1.L) + R1.L) % R1.L; if (d > R1.L / 2) d -= R1.L; if (d < -R1.L / 2) d += R1.L; u = prev + d; }
          waveHist.push([ring.t, u]);
          while (waveHist.length && ring.t - waveHist[0][0] > 8) waveHist.shift();
        } else { waveSince = null; waveHist = []; }
      }
    }
    ringUi += dt;
    if (ringUi > .25) { ringUi = 0; updRing(); }
  };

  const drawRing = () => {
    const { ctx, w, h } = fit(ringCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) / 2 - 38, rw = 20;
    // Strasse
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.lineWidth = rw; ctx.strokeStyle = C.sunk; ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = C.line;
    ctx.beginPath(); ctx.arc(cx, cy, R + rw / 2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R - rw / 2, 0, TAU); ctx.stroke();
    const px = TAU * R / R1.L, carL = R1.l * px * .92, carW = 11;
    // Stau-Markierung
    const st = stoppedCount(ring);
    if (ringOn && st >= 2) {
      const c = jamCenter();
      if (c !== null) {
        const ang = c / R1.L * TAU - Math.PI / 2, span = Math.min(1.2, st * 7 / R1.L * TAU * .6);
        ctx.beginPath(); ctx.arc(cx, cy, R + rw / 2 + 9, ang - span, ang + span);
        ctx.lineWidth = 4; ctx.strokeStyle = C.bad; ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;
        if (waveLast < 0) {   // Pfeil gegen die Fahrtrichtung
          const a0 = ang - span - .05, a1 = a0 - .22, rr = R + rw / 2 + 9;
          ctx.beginPath(); ctx.arc(cx, cy, rr, a1, a0); ctx.lineWidth = 2; ctx.stroke();
          const ex = cx + rr * Math.cos(a1), ey = cy + rr * Math.sin(a1), tx = Math.sin(a1), ty = -Math.cos(a1);
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - tx * -7 + Math.cos(a1) * 4, ey - ty * -7 + Math.sin(a1) * 4);
          ctx.moveTo(ex, ey); ctx.lineTo(ex - tx * -7 - Math.cos(a1) * 4, ey - ty * -7 - Math.sin(a1) * 4);
          ctx.strokeStyle = C.bad; ctx.stroke();
        }
        const lx = cx + (R + rw / 2 + 24) * Math.cos(ang), ly = cy + (R + rw / 2 + 24) * Math.sin(ang);
        ctx.fillStyle = C.bad; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Stau', clamp(lx, 20, w - 20), clamp(ly, 10, h - 10));
        ctx.textBaseline = 'alphabetic';
      }
    }
    // Autos
    for (let i = 0; i < ring.N; i++) {
      const ang = ring.x[i] / R1.L * TAU - Math.PI / 2;
      ctx.save();
      ctx.translate(cx + R * Math.cos(ang), cy + R * Math.sin(ang));
      ctx.rotate(ang + Math.PI / 2);
      roundRect(ctx, -carL / 2, -carW / 2, carL, carW, 3);
      ctx.fillStyle = speedCol(ring.v[i] / R1.vmax); ctx.fill();
      if (i === 0) { ctx.lineWidth = 2; ctx.strokeStyle = C.fg; ctx.stroke(); }
      if (ring.a[i] < -1.5) {   // Bremslichter hinten
        ctx.fillStyle = BRAKE; ctx.fillRect(-carL / 2 - 1, -carW / 2 + 1, 2.5, 3); ctx.fillRect(-carL / 2 - 1, carW / 2 - 4, 2.5, 3);
      }
      ctx.restore();
    }
    // Fahrtrichtung
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    const ra = R - rw / 2 - 14, a0 = -Math.PI / 2 - .35, a1 = -Math.PI / 2 + .35;
    ctx.beginPath(); ctx.arc(cx, cy, ra, a0, a1); ctx.stroke();
    const ex = cx + ra * Math.cos(a1), ey = cy + ra * Math.sin(a1);
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 7, ey - 4); ctx.moveTo(ex, ey); ctx.lineTo(ex - 5, ey + 6); ctx.stroke();
    // Mitte
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.font = `${narrow ? 30 : 36}px Fraunces, serif`;
    ctx.fillText(`${fmt(meanV(ring) * KMH, 0)} km/h`, cx, cy + 8);
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace';
    ctx.fillText('Durchschnitt', cx, cy - 26);
    ctx.fillText(`${ring.N} Autos · 230 m`, cx, cy + 30);
    if (ringOn && SPEED1 > 1) ctx.fillText(`Zeitraffer ×${SPEED1}`, cx, cy + 46);
    // Legende
    ctx.textAlign = 'left'; ctx.font = '11px Geist Mono, monospace';
    const items = [[C.fiber, 'flott'], [C.glow, 'langsam'], [C.bad, 'steht']];
    let lx = 12;
    for (const [c, t] of items) {
      roundRect(ctx, lx, h - 20, 10, 10, 3); ctx.fillStyle = c; ctx.fill();
      ctx.fillStyle = C.muted; ctx.fillText(t, lx + 15, h - 11); lx += 15 + ctx.measureText(t).width + 14;
    }
  };

  /* ---------- Teil 2: Zehn Autos hintereinander ---------- */
  const platCv = $('#platCv');
  const P2 = { n: 10, l: 4.5, s0: 2, tau: .3, v0: 80 / KMH, vlow: 50 / KMH, vmax: 90 / KMH, dt: .02, T: 36, Tr: 1, Tg: 1 };
  const SPEED2 = reduced ? 1 : 1.5;
  let plat, platOn = false, platAcc = 0, platUi = 0;
  const platInit = () => {
    const { n, l, s0, v0, Tg, Tr, dt } = P2;
    const s = s0 + v0 * Tg, D = Math.max(1, Math.round(Tr / dt)) + 1;
    plat = { t: 0, running: false, done: false, x: [], v: [], a: [], hist: [], hp: 0, D, min: [], trace: [] };
    for (let i = 0; i < n; i++) {
      plat.x.push(-i * (l + s)); plat.v.push(v0); plat.a.push(0); plat.min.push(v0);
      plat.hist.push(new Float64Array(D).fill(s)); plat.trace.push([v0]);
    }
  };
  platInit();
  const platV = s => clamp((s - P2.s0) / P2.Tg, 0, P2.vmax);
  const platStep = () => {
    const p = plat, { n, l, dt, tau } = P2;
    const w = p.hp, r = (p.hp + 1) % p.D;
    // Auto 1: bremst ab Sekunde 1 mit 3 m/s² auf 50 km/h, hält kurz, beschleunigt wieder
    const tb = 1, te = tb + (P2.v0 - P2.vlow) / 3;
    let a0 = 0;
    if (p.t >= tb && p.t < te) a0 = -3;
    else if (p.t >= te + 1 && p.v[0] < P2.v0) a0 = 1.5;
    p.a[0] = a0;
    for (let i = 1; i < n; i++) {
      const s = p.x[i - 1] - p.x[i] - l;
      p.hist[i][w] = s;
      let acc = (platV(p.hist[i][r]) - p.v[i]) / tau;
      const dv = p.v[i] - p.v[i - 1];
      if (dv > 0) { const b = dv * dv / (2 * Math.max(.2, s - 1)); if (b > 2.5) acc = Math.min(acc, -b); }
      if (s < 1.2) acc = Math.min(acc, -4);
      p.a[i] = clamp(acc, -9, 3);
    }
    p.hp = r;
    for (let i = 0; i < n; i++) {
      p.v[i] = Math.max(0, p.v[i] + p.a[i] * dt);
      if (i === 0) p.v[0] = clamp(p.v[0], P2.vlow, P2.v0);
      p.x[i] += p.v[i] * dt;
      p.min[i] = Math.min(p.min[i], p.v[i]);
    }
    for (let i = 1; i < n; i++) { const s = p.x[i - 1] - p.x[i] - l; if (s < .3) { p.x[i] = p.x[i - 1] - l - .3; p.v[i] = Math.min(p.v[i], p.v[i - 1]); } }
    p.t += dt;
    if (Math.round(p.t / dt) % 10 === 0) for (let i = 0; i < n; i++) p.trace[i].push(p.v[i]);
    if (p.t >= P2.T) { p.running = false; p.done = true; }
  };
  const ruleText = () => {
    const need = 2 * (P2.Tr + P2.tau);
    const grows = P2.Tg < need;
    return `Faustregel in diesem Modell: Die Welle schrumpft, wenn der Abstand grösser ist als 2 × (Reaktionszeit + 0,3 s) = ${fmt(need, 1)} s. Dein Abstand: ${fmt(P2.Tg, 1)} s, also ${grows ? 'wächst sie' : 'schrumpft sie'}. Bei 80 km/h sind ${fmt(P2.Tg, 1)} s etwa ${fmt(P2.v0 * P2.Tg, 0)} m.`;
  };
  const updPlat = () => {
    const p = plat, N = P2.n - 1;
    if (!p.running && !p.done) { ['#platMin1', '#platMinN', '#platVerdict'].forEach(s => $(s).textContent = '–'); return; }
    $('#platMin1').textContent = `${fmt(p.min[0] * KMH, 0)} km/h`;
    $('#platMinN').textContent = `${fmt(p.min[N] * KMH, 0)} km/h`;
    if (!p.done) { $('#platVerdict').textContent = 'läuft …'; return; }
    const d1 = P2.v0 - p.min[0], dN = P2.v0 - p.min[N];
    $('#platVerdict').textContent = p.min[N] < 3 / KMH ? 'Stillstand' : dN > d1 * 1.1 ? `wächst ×${fmt(dN / d1, 1)}` : dN < d1 * .9 ? 'schrumpft' : 'bleibt gleich';
    $('#platStatus').textContent = (p.min[N] < 3 / KMH ? 'Ganz hinten steht ein Auto still: ein Stau aus dem Nichts. ' : '') + ruleText();
  };
  const platSettings = () => {
    P2.Tr = +$('#reactIn').value; P2.Tg = +$('#gapIn').value;
    $('#reactOut').textContent = `${fmt(P2.Tr, 1)} s`; $('#gapOut').textContent = `${fmt(P2.Tg, 1)} s`;
    platInit(); updPlat();
    $('#platStatus').textContent = ruleText();
  };
  $('#reactIn').addEventListener('input', platSettings);
  $('#gapIn').addEventListener('input', platSettings);
  $('#platGo').addEventListener('click', () => {
    platInit(); plat.running = true; platAcc = 0; updPlat();
    $('#platStatus').textContent = 'Auto 1 bremst auf 50 km/h. Beobachte die Bremslichter und die Linien im Diagramm.';
  });

  const simPlat = dt => {
    if (!platOn || !plat.running) return;
    platAcc += dt * SPEED2;
    let k = 0;
    while (platAcc >= P2.dt && plat.running && k++ < 20) { platStep(); platAcc -= P2.dt; }
    platUi += dt;
    if (platUi > .2 || plat.done) { platUi = 0; updPlat(); }
  };

  const drawPlat = () => {
    const { ctx, w, h } = fit(platCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420, p = plat, n = P2.n;
    // Strasse mit schematischen Autos (Abstände nicht massstäblich)
    const ry = 34, rh = 34, pad = 12;
    roundRect(ctx, pad, ry, w - pad * 2, rh, 8); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.setLineDash([8, 8]); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad + 6, ry + rh / 2); ctx.lineTo(w - pad - 6, ry + rh / 2); ctx.stroke(); ctx.setLineDash([]);
    const slot = (w - pad * 2) / n, cw = Math.min(30, slot * .72), ch = 14;
    for (let i = 0; i < n; i++) {
      const xc = w - pad - slot * (i + .5), yc = ry + rh / 2;
      roundRect(ctx, xc - cw / 2, yc - ch / 2, cw, ch, 4);
      ctx.fillStyle = speedCol((p.v[i] - 0) / P2.v0 * .9); ctx.fill();
      if (p.a[i] < -.8) {
        const k = clamp(-p.a[i] / 4, .3, 1);
        ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = BRAKE;
        if (!reduced) { ctx.shadowColor = BRAKE; ctx.shadowBlur = 10 * k; }
        ctx.fillRect(xc - cw / 2 - 1.5, yc - ch / 2 + 1, 3, 4); ctx.fillRect(xc - cw / 2 - 1.5, yc + ch / 2 - 5, 3, 4);
        ctx.restore();
      }
      ctx.fillStyle = C.muted; ctx.font = `${narrow ? 9 : 10}px Geist Mono, monospace`; ctx.textAlign = 'center';
      ctx.fillText(fmt(p.v[i] * KMH, 0), xc, ry + rh + 13);
      ctx.fillText(String(i + 1), xc, ry - 6);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace';
    ctx.fillText(narrow ? 'Fahrtrichtung →' : 'Fahrtrichtung →   (Auto 1 vorne, Abstände nicht massstäblich)', pad, 14);
    // Diagramm: Tempo über Zeit
    const gx = 40, gy = ry + rh + 34, gw = w - gx - 14, gh = h - gy - 30;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.font = '10px Geist Mono, monospace';
    for (const kmh of [0, 20, 40, 60, 80]) {
      const y = gy + gh - kmh / 100 * gh;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillText(String(kmh), gx - 6, y + 3);
    }
    ctx.textAlign = 'left'; ctx.fillText('km/h', 4, gy - 8);
    ctx.textAlign = 'center';
    for (let t = 0; t <= P2.T; t += narrow ? 12 : 6) ctx.fillText(`${t} s`, gx + t / P2.T * gw, gy + gh + 16);
    const tx = t => gx + t / P2.T * gw, vy = v => gy + gh - v * KMH / 100 * gh;
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy - 4, gw + 2, gh + 6); ctx.clip();
    for (let i = n - 1; i >= 0; i--) {
      const tr = p.trace[i];
      if (tr.length < 2) continue;
      ctx.beginPath();
      tr.forEach((v, k) => { const X = tx(k * .2), Y = vy(v); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      if (i === 0) { ctx.strokeStyle = C.fg; ctx.lineWidth = 2.2; ctx.globalAlpha = 1; }
      else if (i === n - 1) { ctx.strokeStyle = C.bad; ctx.lineWidth = 2.4; ctx.globalAlpha = 1; }
      else { ctx.strokeStyle = C.copper; ctx.lineWidth = 1.2; ctx.globalAlpha = .25 + .5 * i / n; }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Legende
    ctx.textAlign = 'left'; ctx.font = '11px Geist Mono, monospace';
    const lg = [[C.fg, narrow ? 'Auto 1' : 'Auto 1 (vorne)'], [C.copper, '2 bis 9'], [C.bad, narrow ? 'Auto 10' : 'Auto 10 (hinten)']];
    let lx = gx + 4;
    for (const [c, t] of lg) {
      ctx.fillStyle = c; ctx.fillRect(lx, gy + gh - 12, 12, 3);
      ctx.fillStyle = C.muted; ctx.fillText(t, lx + 16, gy + gh - 7); lx += 16 + ctx.measureText(t).width + 12;
    }
    if (!p.running && !p.done && platOn) {
      ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
      ctx.fillText('Drück auf «Vorderstes Auto bremst»', gx + gw / 2, gy + gh * .35);
    }
  };

  /* ---------- Teil 3: Fundamentaldiagramm ---------- */
  const fdCv = $('#fdCv');
  const R3 = { L: 1000, l: 4.5, s0: 2, Tg: 1.5, tau: .4, Tr: 1, noise: .3, dt: .1 };
  const V3 = vmax => s => clamp((s - R3.s0) / R3.Tg, 0, vmax);
  const SPEED3 = reduced ? 3 : 5;
  const DENS = [5, 10, 14, 16, 18, 20, 22, 24, 26, 28, 30, 35, 40, 50, 60, 70, 80];
  const curves = { 120: [], 80: [] };
  const queue = [];
  for (const lim of [120, 80]) for (const k of DENS) queue.push([lim, k]);
  // Messung: 10 Minuten simulieren, die zweite Hälfte mitteln. In kleinen Häppchen pro Bild, damit nichts ruckelt.
  let job = null;
  const measureSome = budget => {
    const t0 = performance.now();
    while (performance.now() - t0 < budget) {
      if (!job) {
        if (!queue.length) return;
        const [l, k] = queue.shift();
        job = { l, k, S: mkRing({ ...R3, N: k, vmax: l / KMH, V: V3(l / KMH) }), rnd: rng(k * 7 + l), sum: 0, cnt: 0 };
      }
      for (let i = 0; i < 200 && job.S.t < 600; i++) {
        stepRing(job.S, job.rnd);
        if (job.S.t > 300) { job.sum += meanV(job.S); job.cnt++; }
      }
      if (job.S.t >= 600) {
        const v = job.sum / job.cnt * KMH;
        curves[job.l].push({ k: job.k, v, q: job.k * v });
        job = null;
      }
    }
  };
  let lim = 120, fd, fdOn = false, fdAcc = 0, fdSamples = [], fdUi = 0;
  const fdStart = () => {
    const k = +$('#densIn').value;
    fd = mkRing({ ...R3, N: k, vmax: lim / KMH, V: V3(lim / KMH) });
    fdSamples = []; fdAcc = 0;
  };
  fdStart();
  const fdFlow = () => {
    if (fdSamples.length < 4) return null;
    const m = fdSamples.reduce((a, b) => a + b, 0) / fdSamples.length;
    return fd.N * m * KMH;
  };
  const updFd = () => {
    const vm = meanV(fd) * KMH, q = fdFlow();
    let slow = 0; for (let i = 0; i < fd.N; i++) if (fd.v[i] * KMH < 30) slow++;
    $('#fdV').textContent = `${fmt(vm, 0)} km/h`;
    $('#fdQ').textContent = q === null ? 'misst …' : `${fmt(q, 0)} Fz/h`;
    $('#fdState').textContent = slow > 0 ? 'Stop-and-go' : 'flüssig';
  };
  updFd();
  $('#densIn').addEventListener('input', e => { $('#densOut').textContent = e.target.value; fdStart(); updFd(); });
  $$('#limitBtns button').forEach(b => b.addEventListener('click', () => {
    lim = +b.dataset.lim;
    $$('#limitBtns button').forEach(x => x.classList.toggle('active', x === b));
    fdStart(); updFd();
    $('#fdStatus').textContent = lim === 80
      ? 'Tempo 80: Bis etwa 25 Autos pro Kilometer haben alle Reserve, und der Verkehr bleibt flüssig.'
      : 'Tempo 120: Schon ab etwa 18 Autos pro Kilometer fahren alle am Limit der Lücke. Kleine Störungen wachsen.';
  }));
  $('#fdBrake').addEventListener('click', () => {
    fd.brake = { i: 0, until: fd.t + 1.5, dec: 5 };
    $('#fdStatus').textContent = 'Ein Auto bremst kurz. Wächst daraus eine Welle, oder wird sie geschluckt?';
  });

  const simFd = dt => {
    if (!fdOn) return;
    measureSome(6);
    fdAcc += dt * SPEED3;
    let n = 0;
    while (fdAcc >= R3.dt && n++ < 20) {
      stepRing(fd, Math.random); fdAcc -= R3.dt;
      if (Math.round(fd.t / R3.dt) % 5 === 0) { fdSamples.push(meanV(fd)); if (fdSamples.length > 120) fdSamples.shift(); }
    }
    fdUi += dt;
    if (fdUi > .3) { fdUi = 0; updFd(); }
  };

  const drawFd = now => {
    const { ctx, w, h } = fit(fdCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420, pad = 12;
    // Ausschnitt der Spur
    const WIN = 300, sy = 26, sh = 26, sx = pad, sw = w - pad * 2, scale = sw / WIN;
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText(narrow ? `300 m · ×${SPEED3} · Tempo ${lim}` : `Ausschnitt 300 m von 1 km · Zeitraffer ×${SPEED3} · Tempo ${lim}`, pad, 16);
    roundRect(ctx, sx, sy, sw, sh, 7); ctx.fillStyle = C.sunk; ctx.fill();
    for (let i = 0; i < fd.N; i++) {
      const x = fd.x[i];
      if (x > WIN) continue;
      const cw = Math.max(3, R3.l * scale);
      roundRect(ctx, sx + x * scale - cw, sy + sh / 2 - 5, cw, 10, 2.5);
      ctx.fillStyle = speedCol(fd.v[i] / (lim / KMH)); ctx.fill();
    }
    // Diagramm
    const gx = narrow ? 46 : 54, gy = sy + sh + 34, gw = w - gx - 14, gh = h - gy - 34;
    const KM = 80, QM = 2600;
    const X = k => gx + k / KM * gw, Y = q => gy + gh - q / QM * gh;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '10px Geist Mono, monospace'; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right';
    for (let q = 0; q <= 2500; q += 500) { ctx.beginPath(); ctx.moveTo(gx, Y(q)); ctx.lineTo(gx + gw, Y(q)); ctx.stroke(); ctx.fillText(fmt(q, 0), gx - 6, Y(q) + 3); }
    ctx.textAlign = 'center';
    for (let k = 0; k <= KM; k += 20) ctx.fillText(String(k), X(k), gy + gh + 15);
    ctx.textAlign = 'left'; ctx.fillText('Durchfluss (Fz/h)', 4, gy - 10);
    ctx.textAlign = 'right'; ctx.fillText('Dichte (Fz/km)', gx + gw, gy + gh + 29);
    // Kapazität
    ctx.setLineDash([5, 5]); ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(gx, Y(2000)); ctx.lineTo(gx + gw, Y(2000)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Kapazität ≈ 2\'000' : 'Kapazität einer Spur ≈ 2\'000 Fz/h', gx + gw - 2, Y(2000) - 5);
    // Messkurven
    for (const [l, col] of [[120, C.copper], [80, C.fiber]]) {
      const pts = curves[l];
      if (!pts.length) continue;
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.k), Y(p.q)) : ctx.moveTo(X(p.k), Y(p.q)));
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = lim === l ? 1 : .55; ctx.stroke();
      for (const p of pts) { ctx.beginPath(); ctx.arc(X(p.k), Y(p.q), 2.6, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // Legende
    ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    let lx = gx + 8;
    for (const [l, col] of [[120, C.copper], [80, C.fiber]]) {
      ctx.fillStyle = col; ctx.fillRect(lx, Y(2500) - 4, 12, 3);
      ctx.fillStyle = C.muted; ctx.fillText(`Tempo ${l}`, lx + 16, Y(2500)); lx += 16 + ctx.measureText(`Tempo ${l}`).width + 14;
    }
    const done = curves[120].length + curves[80].length;
    if (done < DENS.length * 2 && fdOn) { ctx.fillText(`misst … ${fmt(done / (DENS.length * 2) * 100, 0)} %`, lx, Y(2500)); }
    // aktuelle Messung
    const k = fd.N;
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.fg; ctx.globalAlpha = .4;
    ctx.beginPath(); ctx.moveTo(X(k), gy); ctx.lineTo(X(k), gy + gh); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    const q = fdFlow();
    if (q !== null && fdOn) {
      const r = reduced ? 6 : 6 + Math.sin(now / 250) * 1.5;
      ctx.beginPath(); ctx.arc(X(k), Y(q), r, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = C.fg; ctx.stroke();
      ctx.fillStyle = lim === 120 ? C.copper : C.fiber; ctx.fill();
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('stau', 4, {
    ringLock: () => { ['#ringN', '#ringBrake', '#ringReset'].forEach(s => $(s).disabled = false); ringOn = true; },
    platLock: () => { ['#reactIn', '#gapIn', '#platGo'].forEach(s => $(s).disabled = false); platOn = true; },
    fdLock: () => { $('#densIn').disabled = false; $('#fdBrake').disabled = false; $$('#limitBtns button').forEach(b => b.disabled = false); fdOn = true; },
  });

  loop((dt, now) => {
    simRing(dt); simPlat(dt); simFd(dt);
    drawRing(); drawPlat(); drawFd(now);
  });
})();
