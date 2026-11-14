/* mindblow – Lektion Fallen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const G = 9.81;
  const MONO = '11px Geist Mono, monospace';
  const kmh = v => v * 3.6;

  // Pfeil von (x, y1) nach (x, y2)
  const arrow = (ctx, x, y1, y2, col, lw = 3) => {
    const dir = Math.sign(y2 - y1) || 1, hd = Math.min(9, Math.abs(y2 - y1));
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2 - dir * hd * .8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 6, y2 - dir * hd); ctx.lineTo(x + 6, y2 - dir * hd); ctx.closePath(); ctx.fill();
  };

  /* ---------- Teil 1: Fallrohr mit Luft oder Vakuum ---------- */
  const tubeCv = $('#tubeCv');
  const TUBE = 2; // Meter
  // Endgeschwindigkeiten in Luft (vereinfacht): Bowlingkugel 7 kg etwa 80 m/s, Feder etwa 0,6 m/s
  const T1 = { air: true, mass: 7, running: false, t: 0 };
  const mkObj = () => ({ y: 0, v: 0, done: false, tEnd: null });
  let ball = mkObj(), fea = mkObj();
  const vtBall = () => 80 * Math.sqrt(T1.mass / 7); // gleiche Grösse, andere Masse
  const VT_FEA = 0.6;
  const airDots = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * TAU }));

  const stepObj = (o, vt, dt) => {
    if (o.done) return;
    const n = 12, h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = G - (T1.air ? G * o.v * Math.abs(o.v) / (vt * vt) : 0);
      o.v += a * h; o.y += o.v * h;
      if (o.y >= TUBE) {
        // Ankunftszeit fein interpolieren
        const over = (o.y - TUBE) / Math.max(o.v, 1e-6);
        o.y = TUBE; o.done = true; o.tEnd = T1.t + (i + 1) * h - over; return;
      }
    }
  };
  const updTube = () => {
    $('#tBall').textContent = ball.done ? `${fmt(ball.tEnd, 2)} s` : T1.running ? `${fmt(T1.t, 2)} s` : '–';
    $('#tFea').textContent = fea.done ? `${fmt(fea.tEnd, 2)} s` : T1.running ? `${fmt(T1.t, 2)} s` : '–';
    $('#vNow').textContent = T1.running || ball.done ? `${fmt(kmh(ball.done ? 0 : ball.v), 0)} · ${fmt(kmh(fea.done ? 0 : fea.v), 1)}` : '–';
  };
  const resetDrop = () => { ball = mkObj(); fea = mkObj(); T1.t = 0; T1.running = false; updTube(); };
  $$('#airBtns button').forEach(b => b.addEventListener('click', () => {
    T1.air = b.dataset.air === '1';
    $$('#airBtns button').forEach(x => x.classList.toggle('active', x === b));
    resetDrop();
    $('#tubeStatus').textContent = T1.air ? 'Luft im Rohr. Lass beide fallen.' : 'Die Luft ist abgepumpt. Lass beide fallen.';
  }));
  $('#ballMass').addEventListener('input', e => {
    T1.mass = +e.target.value; $('#ballMassOut').textContent = `${fmt(T1.mass, 1)} kg`; resetDrop();
    $('#tubeStatus').textContent = `Die Kugel wiegt jetzt ${fmt(T1.mass, 1)} kg, ist aber gleich gross. Lass beide fallen.`;
  });
  $('#dropBtn').addEventListener('click', () => {
    resetDrop(); T1.running = true;
    $('#tubeStatus').textContent = 'Und los …';
  });

  const simTube = dt => {
    if (!T1.running) return;
    stepObj(ball, vtBall(), dt); stepObj(fea, VT_FEA, dt);
    T1.t += dt;
    if (ball.done && fea.done) {
      T1.running = false;
      const diff = fea.tEnd - ball.tEnd;
      $('#tubeStatus').textContent = Math.abs(diff) < 0.005
        ? 'Gleichzeitig unten. Ohne Luft spielt die Masse keine Rolle.'
        : `Die Feder braucht ${fmt(diff, 1)} s länger. Die Luft bremst sie, nicht ihr kleines Gewicht.`;
    }
    updTube();
  };

  const drawFeather = (ctx, x, y, s, rot, col) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * .55, -s * .2, 0, s);
    ctx.quadraticCurveTo(-s * .55, -s * .2, 0, -s);
    ctx.fillStyle = col; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.25); ctx.stroke();
    for (let k = -3; k <= 3; k++) {
      const yy = k * s * .22;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(s * .3, yy - s * .18); ctx.moveTo(0, yy); ctx.lineTo(-s * .3, yy - s * .18); ctx.stroke();
    }
    ctx.restore();
  };

  const drawTube = (dt, now) => {
    simTube(dt);
    const { ctx, w, h } = fit(tubeCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const tw = Math.min(w - (small ? 96 : 140), 260), tx = (w - tw) / 2 + (small ? 14 : 10), ty = 34, th = h - 52;
    // Rohr
    roundRect(ctx, tx, ty, tw, th, 18);
    ctx.fillStyle = T1.air ? C.sunk : C.surface; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    // Luftteilchen
    if (T1.air) {
      ctx.fillStyle = C.muted; ctx.globalAlpha = .35;
      const t = reduced ? 0 : now / 1000;
      for (const d of airDots) {
        const x = tx + 10 + (tw - 20) * ((d.x + .02 * Math.sin(t * .9 + d.p)) % 1);
        const y = ty + 10 + (th - 20) * ((d.y + .02 * Math.cos(t * .7 + d.p * 2)) % 1);
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Messlatte
    const y0 = ty + 26, y1 = ty + th - 26, sc = (y1 - y0) / TUBE;
    ctx.font = MONO; ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let m = 0; m <= TUBE + 1e-9; m += .5) {
      const y = y0 + m * sc;
      ctx.beginPath(); ctx.moveTo(tx - 12, y); ctx.lineTo(tx - 4, y); ctx.stroke();
      ctx.fillText(`${fmt(m, 1)} m`, tx - 16, y + 4);
    }
    // Kugel
    const bx = tx + tw * .3, R = Math.min(16, tw * .08);
    const by = y0 + ball.y * sc;
    ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
    ctx.fillStyle = C.bg;
    for (const [dx, dy] of [[-.25, -.35], [.15, -.45], [-.05, -.1]]) { ctx.beginPath(); ctx.arc(bx + dx * R, by + dy * R, R * .13, 0, TAU); ctx.fill(); }
    // Feder
    const fx = tx + tw * .7;
    const fl = T1.air && !reduced && (T1.running || fea.done) && !fea.done;
    const sway = fl ? Math.sin(T1.t * 3.2) : 0;
    drawFeather(ctx, fx + sway * Math.min(14, tw * .07), y0 + fea.y * sc - 4, R * 1.4, fl ? sway * .5 + .25 : .25, C.copper);
    // Beschriftungen
    ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.font = MONO;
    ctx.fillText(small ? 'Kugel' : `Kugel ${fmt(T1.mass, 1)} kg`, bx, ty + th + 14);
    ctx.fillText(small ? 'Feder' : 'Feder 0,005 kg', fx, ty + th + 14);
    ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(T1.air ? 'Mit Luft' : 'Vakuum', tx, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`t = ${fmt(T1.running ? T1.t : Math.max(ball.tEnd || 0, fea.tEnd || 0), 2)} s`, tx + tw, 20);
  };

  /* ---------- Teil 2: Stroboskop ---------- */
  const strobeCv = $('#strobeCv');
  const T2 = { t: 0, g: G, playing: false };
  const T_MAX = 3, FLASH = 0.25;
  const s2 = t => .5 * T2.g * t * t;
  const updStrobe = () => {
    $('#tIn').value = T2.t;
    $('#tOut').textContent = `${fmt(T2.t, 2)} s`;
    $('#sT').textContent = `${fmt(T2.t, 2)} s`;
    $('#sS').textContent = `${fmt(s2(T2.t), 1)} m`;
    $('#sV').textContent = `${fmt(kmh(T2.g * T2.t), 0)} km/h`;
  };
  $('#tIn').addEventListener('input', e => { T2.t = +e.target.value; T2.playing = false; $('#playBtn').textContent = 'Abspielen'; updStrobe(); });
  $$('#gBtns button').forEach(b => b.addEventListener('click', () => {
    T2.g = +b.dataset.g;
    $$('#gBtns button').forEach(x => x.classList.toggle('active', x === b));
    $('#strobeStatus').textContent = T2.g < 5
      ? 'Auf dem Mond zieht die Schwerkraft rund sechsmal schwächer. Das Muster 1 : 3 : 5 bleibt gleich.'
      : 'Auf der Erde: 4,9 m in der ersten Sekunde.';
    updStrobe();
  }));
  $('#playBtn').addEventListener('click', () => {
    if (reduced) { T2.t = T_MAX; T2.playing = false; updStrobe(); return; }
    if (T2.playing) { T2.playing = false; $('#playBtn').textContent = 'Abspielen'; return; }
    if (T2.t >= T_MAX - 1e-6) T2.t = 0;
    T2.playing = true; $('#playBtn').textContent = 'Pause';
  });
  updStrobe();

  const drawStrobe = dt => {
    if (T2.playing) {
      T2.t = Math.min(T_MAX, T2.t + dt);
      if (T2.t >= T_MAX) { T2.playing = false; $('#playBtn').textContent = 'Nochmal'; $('#strobeStatus').textContent = 'Pro Sekunde: 4,9 m, dann 14,7 m, dann 24,5 m. Wie 1 : 3 : 5.'; }
      updStrobe();
    }
    const { ctx, w, h } = fit(strobeCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const top = 22, bot = h - 18;
    const sc = (bot - top) / (.5 * G * T_MAX * T_MAX); // fester Massstab: 3 s auf der Erde
    const rx = small ? 42 : 56;
    // Messlatte
    ctx.font = MONO; ctx.textAlign = 'right'; ctx.lineWidth = 1;
    for (let m = 0; m <= 45; m += 5) {
      const y = top + m * sc;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(rx - (m % 10 ? 4 : 8), y); ctx.lineTo(rx, y); ctx.stroke();
      if (m % 10 === 0) { ctx.fillStyle = C.muted; ctx.fillText(`${m} m`, rx - 11, y + 4); }
    }
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(rx, top); ctx.lineTo(rx, bot); ctx.stroke();
    const bx = rx + (w - rx) * (small ? .2 : .25), R = 8;
    // Blitzbilder
    const n = Math.floor(T2.t / FLASH + 1e-9);
    for (let k = 0; k <= n; k++) {
      const tk = k * FLASH, y = top + s2(tk) * sc;
      const whole = Math.abs(tk - Math.round(tk)) < 1e-9;
      ctx.globalAlpha = whole ? .5 : .22;
      ctx.beginPath(); ctx.arc(bx, y, R, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      ctx.globalAlpha = 1;
      if (whole && tk > 0) {
        ctx.strokeStyle = C.line; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(w - 12, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.fg; ctx.textAlign = 'left';
        ctx.fillText(small ? `${tk} s: ${fmt(s2(tk), 1)} m` : `${tk} s · ${fmt(s2(tk), 1)} m`, bx + R + 8, y - 4);
      }
    }
    // Zuwachs pro Sekunde rechts
    ctx.textAlign = 'right';
    for (let k = 1; k <= Math.floor(T2.t + 1e-9); k++) {
      const ya = top + s2(k - 1) * sc, yb = top + s2(k) * sc, xr = w - 14;
      ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xr - 5, ya + 2); ctx.lineTo(xr, ya + 2); ctx.lineTo(xr, yb - 2); ctx.lineTo(xr - 5, yb - 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.fillStyle = C.glow;
      const lbl = `+${fmt(s2(k) - s2(k - 1), 1)} m`;
      ctx.fillText(lbl, xr - 9, Math.max(ya + 13, (ya + yb) / 2 + 4));
    }
    // aktueller Ball
    const y = top + s2(T2.t) * sc;
    ctx.beginPath(); ctx.arc(bx, y, R, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
    ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(T2.g < 5 ? 'Mond' : 'Erde', rx + 8, 14);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(small ? 'Blitz alle 0,25 s' : 'Blitz alle 0,25 s · ohne Luft', w - 12, 14);
  };

  /* ---------- Teil 3: Fallschirmsprung ---------- */
  const diveCv = $('#diveCv');
  const RHO = 1.1, CHUTE = 64, ALT0 = 4000; // Luftdichte konstant (vereinfacht), Fallschirm als wirksame Fläche
  const D = { m: 90, A: .52, t: 0, v: 0, alt: ALT0, running: false, chute: false, tau: 0, hist: [], landed: false, reached: false, scroll: 0 };
  const clouds = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random(), s: .6 + Math.random() * .8 }));
  const cdA = () => D.chute ? D.A + (CHUTE - D.A) * Math.pow(clamp(D.tau / 4, 0, 1), 3) : D.A;
  const vTerm = () => Math.sqrt(2 * D.m * G / (RHO * cdA()));
  const posture = A => A < .32 ? 'Kopfüber' : A < .7 ? 'Bauchlage' : 'Arme weit';
  const updDive = () => {
    $('#massOut').textContent = `${D.m} kg`;
    $('#areaOut').textContent = `${fmt(D.A, 2)} m²`;
    $('#dV').textContent = `${fmt(kmh(D.v), 0)} km/h`;
    $('#dVt').textContent = `${fmt(kmh(vTerm()), 0)} km/h`;
    $('#dAlt').textContent = `${fmt(Math.max(0, D.alt), 0)} m`;
  };
  $('#massIn').addEventListener('input', e => { D.m = +e.target.value; updDive(); });
  $('#areaIn').addEventListener('input', e => {
    D.A = +e.target.value; updDive();
    if (!D.chute) $('#diveStatus').textContent = `${posture(D.A)}: Endgeschwindigkeit etwa ${fmt(kmh(vTerm()), 0)} km/h.`;
  });
  $('#jumpBtn').addEventListener('click', () => {
    Object.assign(D, { t: 0, v: 0, alt: ALT0, running: true, chute: false, tau: 0, hist: [{ t: 0, v: 0 }], landed: false, reached: false });
    $('#jumpBtn').textContent = 'Neu springen';
    $('#chuteBtn').disabled = false;
    $('#diveStatus').textContent = 'Absprung. Am Anfang zieht nur das Gewicht, die Luft bremst noch kaum.';
    updDive();
  });
  $('#chuteBtn').addEventListener('click', () => {
    if (!D.running || D.chute) return;
    D.chute = true; D.tau = 0; $('#chuteBtn').disabled = true;
    $('#diveStatus').textContent = 'Schirm auf: riesige Fläche, der Luftwiderstand ist kurz viel grösser als das Gewicht. Du wirst gebremst.';
  });
  updDive();

  const simDive = dt => {
    if (!D.running) return;
    const speed = D.chute && D.tau > 6 ? 10 : 1; // Zeitraffer am Fallschirm
    const T = dt * speed, n = 30, hh = T / n;
    for (let i = 0; i < n; i++) {
      const k = RHO * cdA() / (2 * D.m);
      D.v += (G - k * D.v * Math.abs(D.v)) * hh;
      D.alt -= D.v * hh; D.t += hh;
      if (D.chute) D.tau += hh;
    }
    D.scroll += D.v * T;
    const last = D.hist[D.hist.length - 1];
    if (D.t - last.t >= .1 * speed) D.hist.push({ t: D.t, v: D.v });
    if (!D.chute && !D.reached && D.v > .98 * vTerm()) {
      D.reached = true;
      $('#diveStatus').textContent = `Nach ${fmt(D.t, 0)} s: Luftwiderstand gleich Gewicht. Das Tempo bleibt bei ${fmt(kmh(D.v), 0)} km/h.`;
    }
    if (D.alt <= 0) {
      D.alt = 0; D.running = false; D.landed = true; $('#chuteBtn').disabled = true;
      $('#diveStatus').textContent = D.v > 10
        ? `Aufprall mit ${fmt(kmh(D.v), 0)} km/h. Ohne offenen Fallschirm geht das nicht gut aus.`
        : `Gelandet mit ${fmt(kmh(D.v), 0)} km/h. Der Schirm hat die Endgeschwindigkeit stark gesenkt.`;
    }
    updDive();
  };

  const drawDiver = (ctx, x, y, s) => {
    ctx.strokeStyle = C.fg; ctx.fillStyle = C.fg; ctx.lineCap = 'round'; ctx.lineWidth = 3.5 * s;
    if (D.chute) {
      const open = clamp(D.tau / 4, 0, 1), cw = (16 + 44 * open) * s, ch = (10 + 14 * open) * s, cy = y - 58 * s;
      ctx.beginPath(); ctx.ellipse(x, cy, cw, ch, 0, Math.PI, TAU); ctx.closePath();
      ctx.fillStyle = C.glow; ctx.fill(); ctx.fillStyle = C.fg;
      ctx.lineWidth = 1; ctx.strokeStyle = C.muted;
      for (const dx of [-1, -.4, .4, 1]) { ctx.beginPath(); ctx.moveTo(x + dx * cw, cy); ctx.lineTo(x, y - 12 * s); ctx.stroke(); }
      ctx.strokeStyle = C.fg; ctx.lineWidth = 3.5 * s;
      // aufrecht unter dem Schirm
      ctx.beginPath(); ctx.arc(x, y - 16 * s, 5 * s, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 10 * s); ctx.lineTo(x, y + 8 * s);
      ctx.moveTo(x, y - 8 * s); ctx.lineTo(x - 8 * s, y - 16 * s); ctx.moveTo(x, y - 8 * s); ctx.lineTo(x + 8 * s, y - 16 * s);
      ctx.moveTo(x, y + 8 * s); ctx.lineTo(x - 5 * s, y + 20 * s); ctx.moveTo(x, y + 8 * s); ctx.lineTo(x + 5 * s, y + 20 * s); ctx.stroke();
      return;
    }
    if (D.A < .32) {
      // kopfüber
      ctx.beginPath(); ctx.arc(x, y + 14 * s, 5 * s, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y + 8 * s); ctx.lineTo(x, y - 10 * s);
      ctx.moveTo(x, y + 6 * s); ctx.lineTo(x - 4 * s, y - 6 * s); ctx.moveTo(x, y + 6 * s); ctx.lineTo(x + 4 * s, y - 6 * s);
      ctx.moveTo(x, y - 10 * s); ctx.lineTo(x - 3 * s, y - 24 * s); ctx.moveTo(x, y - 10 * s); ctx.lineTo(x + 3 * s, y - 24 * s); ctx.stroke();
      return;
    }
    // Bauchlage: Spannweite wächst mit der Fläche
    const sp = (8 + 14 * clamp((D.A - .3) / .7, 0, 1)) * s;
    ctx.beginPath(); ctx.arc(x + 17 * s, y, 5 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 11 * s, y); ctx.lineTo(x + 11 * s, y);
    ctx.moveTo(x + 8 * s, y); ctx.lineTo(x + 8 * s + sp * .6, y - sp * .8); ctx.moveTo(x + 8 * s, y); ctx.lineTo(x + 2 * s + sp * .3, y - sp);
    ctx.moveTo(x - 11 * s, y); ctx.lineTo(x - 11 * s - sp * .7, y - sp * .6); ctx.moveTo(x - 11 * s, y); ctx.lineTo(x - 6 * s - sp * .4, y - sp * .9); ctx.stroke();
  };

  const drawDive = dt => {
    simDive(dt);
    const { ctx, w, h } = fit(diveCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 480;
    // Himmel links
    const pw = Math.round(w * (small ? .42 : .38)), px = 10, py = 10, ph = h - 20;
    ctx.save(); roundRect(ctx, px, py, pw, ph, 14); ctx.fillStyle = C.sunk; ctx.fill(); ctx.clip();
    const pxm = .6; // Pixel pro Meter für Wolken und Boden
    for (const c of clouds) {
      const yy = py + (((c.y * ph * 1.4 - D.scroll * pxm) % (ph * 1.4)) + ph * 1.4) % (ph * 1.4) - ph * .2;
      ctx.fillStyle = C.line;
      ctx.beginPath(); ctx.ellipse(px + c.x * pw, yy, 26 * c.s, 9 * c.s, 0, 0, TAU); ctx.fill();
    }
    const fx = px + pw / 2, fy = py + ph * (D.chute ? .52 : .42);
    const groundY = fy + 24 + D.alt * pxm;
    if (groundY < py + ph) { ctx.fillStyle = C.good; ctx.globalAlpha = .35; ctx.fillRect(px, groundY, pw, ph); ctx.globalAlpha = 1; }
    const s = small ? 1.05 : 1.25;
    drawDiver(ctx, fx, fy, s);
    // Kräfte: Gewicht nach unten, Luftwiderstand nach oben (beim Schirm oberhalb der Kappe)
    const W = D.m * G, Fd = .5 * RHO * cdA() * D.v * D.v;
    const wl = 22 + D.m * .28;
    const ax = fx + (D.chute ? 14 : small ? 30 : 40) * s;
    const dy0 = D.chute ? fy - 58 * s - (10 + 14 * clamp(D.tau / 4, 0, 1)) * s - 4 : fy - 6;
    const dl = Math.min(wl * Fd / W, dy0 - py - 8);
    const dx = D.chute ? fx : ax + 12;
    arrow(ctx, ax, fy + 6, fy + 6 + wl, C.copper);
    if (dl > 3) arrow(ctx, dx, dy0, dy0 - dl, C.accent);
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.copper; ctx.fillText(small ? 'G' : 'Gewicht', ax + 8, fy + 2 + wl);
    if (dl > 3) { ctx.fillStyle = C.accent; ctx.fillText(small ? 'L' : 'Luft', dx + 8, dy0 - dl + 10); }
    ctx.restore();
    if (D.chute && D.tau > 6 && D.running) {
      ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      ctx.fillText('Zeitraffer ×10', px + 8, py + ph - 8);
    }

    // Diagramm rechts
    const gx = px + pw + (small ? 38 : 50), gy = 22, gw = w - gx - 12, gh = h - gy - 36;
    const vMax = 450, tMax = Math.max(40, Math.ceil(D.t / 10) * 10);
    const X = t => gx + gw * t / tMax, Y = v => gy + gh - gh * clamp(kmh(v) / vMax, 0, 1.02);
    ctx.font = MONO; ctx.lineWidth = 1;
    for (let v = 0; v <= vMax; v += 100) {
      const y = gy + gh - gh * v / vMax;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(v), gx - 6, y + 4);
    }
    ctx.textAlign = 'left'; ctx.fillText('km/h', gx - (small ? 34 : 40), 12);
    ctx.textAlign = 'center';
    const step = tMax > 100 ? 50 : tMax > 60 ? 20 : 10;
    for (let t = 0; t <= tMax; t += step) ctx.fillText(`${t}`, X(t), gy + gh + 15);
    ctx.textAlign = 'right'; ctx.fillText('Sekunden', gx + gw, gy + gh + 30);
    // Endgeschwindigkeit gestrichelt
    const yt = Y(vTerm());
    ctx.strokeStyle = C.glow; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, yt); ctx.lineTo(gx + gw, yt); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.glow; ctx.textAlign = 'right';
    ctx.fillText(small ? 'Endgeschw.' : 'Endgeschwindigkeit', gx + gw, yt - 6);
    // Kurve
    if (D.hist.length > 1) {
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath();
      D.hist.forEach((p, i) => { i ? ctx.lineTo(X(p.t), Y(p.v)) : ctx.moveTo(X(p.t), Y(p.v)); });
      ctx.lineTo(X(D.t), Y(D.v)); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(D.t), Y(D.v), 4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
    } else {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(small ? 'Drück Absprung' : 'Drück auf Absprung', gx + gw / 2, gy + gh / 2);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('fallen', 4, {
    tubeLock: () => { $$('#airBtns button').forEach(b => b.disabled = false); $('#ballMass').disabled = false; $('#dropBtn').disabled = false; },
    strobeLock: () => { $('#tIn').disabled = false; $('#playBtn').disabled = false; $$('#gBtns button').forEach(b => b.disabled = false); },
    diveLock: () => { $('#massIn').disabled = false; $('#areaIn').disabled = false; $('#jumpBtn').disabled = false; },
  });

  loop((dt, now) => { drawTube(dt, now); drawStrobe(dt); drawDive(dt); });
})();
