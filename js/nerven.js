/* mindblow – Lektion Nerven */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Ampel für den Reaktionstest, Herdplatte
  const WAIT = '#c0393b', GO = '#1e9a57', HOT = '#e0502a';

  /* ---------- Teil 1: Reaktionstest ---------- */
  const rtCv = $('#rtCv');
  const RT = { on: false, state: 'idle', until: 0, goAt: 0, tries: [], last: null };
  const MAXN = 5;
  const updRT = () => {
    const n = RT.tries.length;
    $('#rtLast').textContent = RT.last == null ? '–' : `${fmt(RT.last, 0)} ms`;
    const avg = n ? RT.tries.reduce((a, b) => a + b, 0) / n : null;
    $('#rtAvg').textContent = avg == null ? '–' : `${fmt(avg, 0)} ms`;
    $('#rtN').textContent = `${n} von ${MAXN} Versuchen`;
    $('#rtDist').textContent = avg == null ? '–' : `${fmt(avg / 1000 * 100, 0)} m`;
  };
  const rtStatus = t => { $('#rtStatus').textContent = t; };
  const startTry = () => {
    if (RT.tries.length >= MAXN) { RT.tries = []; RT.last = null; updRT(); }
    RT.state = 'wait'; RT.goAt = 0;
    RT.until = performance.now() + 1200 + Math.random() * 2600;
    rtStatus('Warte, bis die Fläche grün wird …');
  };
  const tap = stamp => {
    if (!RT.on) return;
    if (RT.state === 'wait') {
      RT.state = 'early';
      rtStatus('Zu früh! Dein Gehirn hat geraten. Dieser Versuch zählt nicht.');
    } else if (RT.state === 'go') {
      if (!RT.goAt) return;
      const ms = Math.max(0, stamp - RT.goAt);
      RT.last = ms; RT.tries.push(ms); updRT();
      if (RT.tries.length >= MAXN) {
        RT.state = 'done';
        const avg = RT.tries.reduce((a, b) => a + b, 0) / RT.tries.length;
        rtStatus(avg < 200 ? 'Sehr schnell! Unter 200 ms schaffen nur wenige.'
          : avg <= 320 ? 'Typisch menschlich: rund 200 bis 300 ms. Das meiste davon braucht dein Gehirn.'
          : 'Etwas langsamer als typisch. Müdigkeit, Ablenkung oder ein träger Bildschirm machen viel aus.');
      } else {
        RT.state = 'result';
        rtStatus(`${fmt(ms, 0)} ms. Klicke für den nächsten Versuch.`);
      }
    } else startTry();
  };
  rtCv.addEventListener('pointerdown', e => { e.preventDefault(); tap(e.timeStamp || performance.now()); });
  rtCv.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) tap(performance.now()); }
  });
  $('#rtStart').addEventListener('click', () => { if (RT.state === 'wait' || RT.state === 'go') return; startTry(); rtCv.focus({ preventScroll: true }); });
  $('#rtClear').addEventListener('click', () => {
    RT.tries = []; RT.last = null; RT.state = 'idle'; updRT();
    rtStatus('Neue Serie. Fünf Versuche, klicke in die Fläche, sobald sie grün wird.');
  });
  updRT();

  const drawRT = now => {
    const { ctx, w, h } = fit(rtCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    if (RT.state === 'wait' && now >= RT.until) { RT.state = 'go'; RT.goAt = performance.now(); }
    const chartH = 104, pad = 12;
    const bx = pad, by = pad, bw = w - 2 * pad, bh = h - chartH - pad - 4;
    let bg = C.sunk, fg = C.fg, big = 'Bereit?', small = narrow ? 'Klick hier zum Starten' : 'Klicke hier oder auf «Test starten»';
    if (RT.state === 'wait') { bg = WAIT; fg = '#fff'; big = 'Warte …'; small = 'Klicke, sobald es grün wird'; }
    else if (RT.state === 'go') { bg = GO; fg = '#fff'; big = 'JETZT!'; small = 'Klick!'; }
    else if (RT.state === 'early') { bg = C.sunk; big = 'Zu früh!'; small = 'Klick für einen neuen Versuch'; }
    else if (RT.state === 'result') { big = `${fmt(RT.last, 0)} ms`; small = 'Klick für den nächsten Versuch'; }
    else if (RT.state === 'done') {
      const avg = RT.tries.reduce((a, b) => a + b, 0) / RT.tries.length;
      big = `Ø ${fmt(avg, 0)} ms`; small = 'Klick für eine neue Serie';
    }
    roundRect(ctx, bx, by, bw, bh, 14); ctx.fillStyle = bg; ctx.fill();
    if (!RT.on) { big = 'Reaktionstest'; small = ''; }
    ctx.textAlign = 'center'; ctx.fillStyle = RT.state === 'early' ? C.bad : fg;
    ctx.font = `600 ${narrow ? 34 : 44}px Outfit, sans-serif`;
    ctx.fillText(big, w / 2, by + bh / 2 + 6);
    ctx.font = `13px ${MONO}`; ctx.fillStyle = (RT.state === 'wait' || RT.state === 'go') ? 'rgba(255,255,255,.85)' : C.muted;
    ctx.fillText(small, w / 2, by + bh / 2 + 34);

    // Diagramm der Versuche
    const gx0 = narrow ? 40 : 56, gx1 = w - pad - 4, gy0 = h - chartH + 14, gy1 = h - 22;
    const MAXMS = 600, Y = ms => gy1 - (gy1 - gy0) * clamp(ms, 0, MAXMS) / MAXMS;
    ctx.fillStyle = C.sunk; ctx.fillRect(gx0, Y(300), gx1 - gx0, Y(200) - Y(300));
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (const v of [0, 300, 600]) ctx.fillText(String(v), gx0 - 6, Y(v) + 3);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'typisch' : 'typisch 200 bis 300 ms', gx1 - 4, (Y(200) + Y(300)) / 2 + 3);
    const slot = (gx1 - gx0) / MAXN;
    for (let i = 0; i < MAXN; i++) {
      const cx = gx0 + slot * (i + .5), bwid = Math.min(34, slot * .5);
      ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      ctx.fillText(`${i + 1}`, cx, gy1 + 14);
      const ms = RT.tries[i];
      if (ms == null) continue;
      ctx.fillStyle = C.accent; ctx.fillRect(cx - bwid / 2, Y(ms), bwid, gy1 - Y(ms));
      ctx.fillStyle = C.fg; ctx.font = `500 10px ${MONO}`;
      ctx.fillText(ms > MAXMS ? `${fmt(ms, 0)}+` : fmt(ms, 0), cx, Math.max(gy0 - 2, Y(ms) - 4));
    }
  };

  /* ---------- Teil 2: Wettrennen der Fasern ---------- */
  const raceCv = $('#raceCv');
  const R = { on: false, d: 10, anim: 0, running: false, ran: false };
  const FAST = 2.2, CAP = 10;   // Sekunden Animation: Myelin braucht 2,2 s, nach 10 s ist Schluss
  // vereinfachte Faustregeln: mit Myelin etwa 6 m/s pro µm Dicke, ohne etwa 1,5 m/s mal Wurzel aus der Dicke
  const vMy = d => 6 * d, vUn = d => 1.5 * Math.sqrt(d);
  const updRace = () => {
    const vm = vMy(R.d), vu = vUn(R.d);
    $('#dIn').value = R.d; $('#dOut').textContent = `${R.d} µm`;
    $('#vM').textContent = `${fmt(vm, 0)} m/s`; $('#tM').textContent = `1 m in ${fmt(1000 / vm, 0)} ms`;
    $('#vU').textContent = `${fmt(vu, 1)} m/s`; $('#tU').textContent = `1 m in ${fmt(1000 / vu, 0)} ms`;
    $('#vRatio').textContent = `×${fmt(vm / vu, 0)}`;
  };
  const raceEnd = () => {
    const pU = Math.min(1, CAP / FAST * vUn(R.d) / vMy(R.d));
    return pU >= 1 ? FAST * vMy(R.d) / vUn(R.d) : CAP;
  };
  const finishMsg = () => {
    const tm = 1000 / vMy(R.d), tu = 1000 / vUn(R.d);
    const pU = clamp(tm / tu, 0, 1);
    $('#raceStatus').textContent = `Mit Myelin nach ${fmt(tm, 0)} ms im Ziel. Ohne Myelin war das Signal da erst bei ${fmt(pU * 100, 0)} cm und brauchte insgesamt ${fmt(tu, 0)} ms.`;
  };
  const startRace = () => {
    R.ran = true;
    if (reduced) { R.anim = raceEnd(); R.running = false; finishMsg(); return; }
    R.anim = 0; R.running = true;
    $('#raceStatus').textContent = 'Das Rennen läuft in starker Zeitlupe. Schau, wie das obere Signal springt.';
  };
  $('#dIn').addEventListener('input', e => {
    R.d = +e.target.value; updRace(); R.anim = 0; R.running = false; R.ran = false;
    $('#raceStatus').textContent = R.d <= 3 ? 'Dünne Fasern: Auch mit Myelin sind sie eher gemächlich.'
      : R.d >= 15 ? 'Dicke Faser mit Myelin: so schnell wie die schnellsten Nerven zu deinen Muskeln.'
      : 'Beide Fasern sind gleich dick. Nur eine hat eine Myelinhülle.';
  });
  $('#raceBtn').addEventListener('click', startRace);
  updRace();

  const drawRace = dt => {
    const { ctx, w, h } = fit(raceCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    if (R.running) {
      R.anim += dt;
      const end = raceEnd();
      if (R.anim >= end) { R.anim = end; R.running = false; finishMsg(); }
    }
    const tm = 1 / vMy(R.d);                                 // echte Sekunden für 1 m mit Myelin
    const real = R.anim / FAST * tm;                        // echte Zeit seit Start
    const pM = clamp(real / tm, 0, 1), pU = clamp(real * vUn(R.d), 0, 1);
    const x0 = 22, x1 = w - 30;
    const yM = h * .34, yU = h * .74;
    const ax = 2 + R.d * .32;                               // sichtbare Dicke der Faser
    // Kopfzeile: Uhr
    ctx.font = `500 13px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText(`${narrow ? 'Zeit' : 'Echte Zeit'}: ${fmt(real * 1000, 1)} ms`, x0, 24);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'Zeitlupe' : 'Zeitlupe, nicht massstäblich', x1 + 8, 24);
    // Ziel
    ctx.strokeStyle = C.muted; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, 40); ctx.lineTo(x1, h - 22); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.fillText('1 m', x1, h - 8);
    ctx.fillText('Start', x0 + 4, h - 8);

    // Faser mit Myelin
    const N = narrow ? 7 : 11, sh = ax + 14;
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${MONO}`;
    ctx.fillText('Mit Myelin', x0, yM - sh / 2 - 26);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.line; ctx.lineWidth = ax;
    ctx.beginPath(); ctx.moveTo(x0, yM); ctx.lineTo(x1, yM); ctx.stroke();
    const nodeX = i => x0 + (x1 - x0) * i / N;
    for (let i = 0; i < N; i++) {
      const a = nodeX(i) + 4, b = nodeX(i + 1) - 4;
      roundRect(ctx, a, yM - sh / 2, b - a, sh, sh / 2);
      ctx.globalAlpha = .28; ctx.fillStyle = C.copper; ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = C.copper; ctx.lineWidth = 1.2; ctx.stroke();
    }
    if (!narrow) {
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('Schnürring', nodeX(1), yM + sh / 2 + 16);
      ctx.fillText('Myelinhülle', (nodeX(2) + nodeX(3)) / 2, yM + sh / 2 + 16);
    }
    if (R.ran || R.anim > 0) {
      const k = pM * N, cur = Math.min(N, Math.floor(k)), f = k - cur;
      for (let i = 0; i <= cur; i++) {
        const age = k - i, a = clamp(Math.exp(-age * 1.1), .12, 1);
        ctx.beginPath(); ctx.arc(nodeX(i), yM, ax / 2 + 5 * a + 2, 0, TAU);
        ctx.fillStyle = C.glow; ctx.globalAlpha = a; ctx.fill(); ctx.globalAlpha = 1;
      }
      if (cur < N) {
        // am Schnürring kurz aufladen, dann springen
        const j = clamp((f - .55) / .45, 0, 1);
        if (j > 0) {
          const xa = nodeX(cur), xb = nodeX(cur + 1), lift = sh / 2 + 12;
          ctx.strokeStyle = C.glow; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
          ctx.beginPath();
          for (let s = 0; s <= 20; s++) {
            const q = s / 20 * j, x = xa + (xb - xa) * q, y = yM - Math.sin(Math.PI * q) * lift;
            s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke(); ctx.setLineDash([]);
          const hx = xa + (xb - xa) * j, hy = yM - Math.sin(Math.PI * j) * lift;
          ctx.beginPath(); ctx.arc(hx, hy, 4, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
        }
      }
    }
    if (pM >= 1) { ctx.fillStyle = C.good; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText(`Ziel: ${fmt(1000 * tm, 0)} ms`, x1 - 4, yM - sh / 2 - 26); }

    // Faser ohne Myelin
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${MONO}`;
    ctx.fillText('Ohne Myelin', x0, yU - ax / 2 - 22);
    ctx.strokeStyle = C.line; ctx.lineWidth = ax;
    ctx.beginPath(); ctx.moveTo(x0, yU); ctx.lineTo(x1, yU); ctx.stroke();
    if (R.ran || R.anim > 0) {
      const xp = x0 + (x1 - x0) * pU;
      const tail = Math.min(xp - x0, (x1 - x0) * .25);
      if (tail > 0.5) {
        const g = ctx.createLinearGradient(xp - tail, 0, xp, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, C.glow);
        ctx.strokeStyle = g; ctx.lineWidth = ax + 4;
        ctx.beginPath(); ctx.moveTo(xp - tail, yU); ctx.lineTo(xp, yU); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(xp, yU, ax / 2 + 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
      ctx.textAlign = 'right'; ctx.font = `500 12px ${MONO}`;
      if (pU >= 1) { ctx.fillStyle = C.good; ctx.fillText(`Ziel: ${fmt(1000 / vUn(R.d), 0)} ms`, x1 - 4, yU - ax / 2 - 22); }
      else if (!R.running && R.anim > 0) { ctx.fillStyle = C.muted; ctx.fillText(`noch unterwegs: ${fmt(pU * 100, 0)} cm`, x1 - 4, yU - ax / 2 - 22); }
    }
    ctx.lineCap = 'butt';
  };

  /* ---------- Teil 3: Reflex gegen bewusste Reaktion ---------- */
  const reflexCv = $('#reflexCv');
  // gerundete, vereinfachte Annahmen: Strecken in m, Tempo in m/s, Zeiten in ms
  const CASES = {
    hand: { sens: [.8, 20], syn: 3, mot: [.7, 60], up: [.25, 20], think: 150, down: [.25, 60],
      rec: 'Hitze', recS: 'Hitze', mus: 'Armmuskel' },
    knee: { sens: [.6, 100], syn: 1, mot: [.5, 60], up: [.5, 50], think: 150, down: [.5, 60],
      rec: 'Kniesehne', recS: 'Sehne', mus: 'Oberschenkel' },
  };
  const ms = ([d, v]) => d / v * 1000;
  const timesOf = c => {
    const s = ms(c.sens), ref = s + c.syn + ms(c.mot), brain = s + ms(c.up);
    const dec = brain + c.think, down = dec + ms(c.down), con = down + ms(c.mot);
    return { s, ref, brain, dec, down, con };
  };
  const RF = { on: false, mode: 'hand', t: 0, playing: false };
  const TMAX = 240;
  const updRF = () => {
    const T = timesOf(CASES[RF.mode]);
    $('#rfT').value = Math.round(RF.t); $('#rfOut').textContent = `${fmt(RF.t, 0)} ms`;
    $('#rfRef').textContent = `${fmt(T.ref, 0)} ms`;
    $('#rfBrain').textContent = `${fmt(T.brain, 0)} ms`;
    $('#rfCon').textContent = `${fmt(T.con, 0)} ms`;
    const t = RF.t, st = $('#rfStatus');
    if (!RF.on) return;
    if (t < 1) st.textContent = 'Die Zeitlupe läuft rund 20-mal langsamer als in echt.';
    else if (t < T.s) st.textContent = 'Der Fühlnerv meldet den Reiz zum Rückenmark.';
    else if (t < T.ref) st.textContent = 'Im Rückenmark wird direkt auf den Muskelnerv umgeschaltet. Gleichzeitig läuft eine Meldung hinauf ins Gehirn.';
    else if (t < T.dec) st.textContent = RF.mode === 'hand'
      ? 'Der Reflex hat die Hand schon weggezogen. Das Gehirn ist noch beim Wahrnehmen und Entscheiden.'
      : 'Das Bein hat schon gezuckt. Das Gehirn ist noch beim Wahrnehmen und Entscheiden.';
    else if (t < T.con) st.textContent = 'Erst jetzt schickt das Gehirn einen eigenen Befehl los.';
    else st.textContent = `Der Reflex war rund ${fmt(T.con / T.ref, 0)}-mal schneller als die bewusste Reaktion.`;
  };
  $$('#rfSel button').forEach(b => b.addEventListener('click', () => {
    $$('#rfSel button').forEach(x => x.classList.toggle('active', x === b));
    RF.mode = b.dataset.c; RF.t = 0; RF.playing = false; updRF();
  }));
  $('#rfT').addEventListener('input', e => { RF.t = +e.target.value; RF.playing = false; updRF(); });
  $('#rfPlay').addEventListener('click', () => {
    if (reduced) { RF.t = TMAX; updRF(); return; }
    if (RF.t >= TMAX - 1) RF.t = 0;
    RF.playing = true;
  });
  updRF();

  // Punkt auf einem Linienzug bei Anteil f
  const along = (pts, f) => {
    const L = []; let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
    let d = f * tot;
    for (let i = 0; i < L.length; i++) {
      if (d <= L[i] || i === L.length - 1) { const q = L[i] ? clamp(d / L[i], 0, 1) : 0; return { i, x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q }; }
      d -= L[i];
    }
    return { i: 0, x: pts[0][0], y: pts[0][1] };
  };
  const strokePath = (ctx, pts, f = 1) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    const p = along(pts, f);
    for (let i = 1; i <= p.i; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const pulse = (ctx, pts, t0, t1, t, col) => {
    if (t < t0) return;
    const f = clamp((t - t0) / Math.max(.001, t1 - t0), 0, 1);
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = f < 1 ? 1 : .55;
    strokePath(ctx, pts, f); ctx.globalAlpha = 1;
    if (f < 1) {
      const p = along(pts, f);
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1;
    }
  };

  const drawReflex = dt => {
    const { ctx, w, h } = fit(reflexCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    if (RF.playing) {
      RF.t += dt * 50;
      if (RF.t >= TMAX) { RF.t = TMAX; RF.playing = false; }
      updRF();
    }
    const c = CASES[RF.mode], T = timesOf(c), t = RF.t;
    const knee = RF.mode === 'knee';
    const dh = h - 150;                                     // Höhe des Schemas, darunter die Zeitleiste
    const cx = Math.max(52, w * .16), by = 52;
    const ly = knee ? dh - 84 : 128;                        // Höhe des Arms oder Beins
    const xr = knee ? w * .74 : w - 52, xm = cx + (xr - cx) * .5;

    // Gehirn
    ctx.beginPath(); ctx.ellipse(cx, by, 38, 28, 0, 0, TAU);
    const thinking = t >= T.brain && t < T.dec;
    ctx.fillStyle = C.sunk; ctx.fill();
    if (thinking && !reduced) { ctx.globalAlpha = .35 + .25 * Math.sin(t / 6); ctx.fillStyle = C.glow; ctx.fill(); ctx.globalAlpha = 1; }
    else if (thinking) { ctx.globalAlpha = .45; ctx.fillStyle = C.glow; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('Gehirn', cx, by + 4);
    // Rückenmark
    const cTop = by + 28, cBot = dh - 6;
    roundRect(ctx, cx - 14, cTop, 28, cBot - cTop, 12); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(cx - 24, (cTop + cBot) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.fillText('Rückenmark', 0, 0); ctx.restore();

    // Arm oder Bein
    const moved = t >= T.ref;
    ctx.lineCap = 'round'; ctx.strokeStyle = C.line; ctx.lineWidth = 22;
    const tip = knee ? xr : xr - (moved ? (narrow ? 14 : 24) : 0);
    ctx.beginPath(); ctx.moveTo(cx + 20, ly); ctx.lineTo(tip, ly); ctx.stroke();
    if (knee) {
      // Unterschenkel, schnellt beim Reflex nach vorne
      const ang = moved ? .6 : 0, L = 64;
      ctx.beginPath(); ctx.moveTo(xr, ly); ctx.lineTo(xr + L * Math.sin(ang), ly + L * Math.cos(ang)); ctx.stroke();
      // Hammer, trifft die Sehne unter dem Knie
      if (!moved) {
        ctx.lineWidth = 3; ctx.strokeStyle = C.fg;
        ctx.beginPath(); ctx.moveTo(xr + 26, ly + 22); ctx.lineTo(xr + 50, ly - 4); ctx.stroke();
        roundRect(ctx, xr + 14, ly + 15, 18, 12, 4); ctx.fillStyle = C.fg; ctx.fill();
      }
    } else {
      // Herdplatte
      const px = xr - 34, pw = 68, py = ly + 18;
      roundRect(ctx, px, py, pw, 10, 4); ctx.fillStyle = HOT; ctx.fill();
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('heiss', xr, py + 24);
      if (moved) { ctx.fillStyle = C.good; ctx.font = `500 12px ${MONO}`; ctx.fillText('← weg!', xr - 6, ly + 56); }
    }
    ctx.lineCap = 'butt';
    // Muskel
    ctx.beginPath(); ctx.ellipse(xm, ly, 30, 13, 0, 0, TAU);
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = moved ? C.accent : C.muted; ctx.lineWidth = moved ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Muskel' : c.mus, xm, ly + (knee ? -20 : 28));
    if (knee && moved) { ctx.fillStyle = C.good; ctx.font = `500 12px ${MONO}`; ctx.fillText('zuck!', xr + 30, ly + 50); }
    // Fühler
    ctx.beginPath(); ctx.arc(xr - (knee ? 0 : 6), ly - 8, 5, 0, TAU); ctx.fillStyle = C.fiber; ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? c.recS : `Fühler: ${c.rec}`, xr - (knee ? 0 : 16), ly - 22);

    // Nervenbahnen
    const yS = ly - 5, yM = ly + 5;
    const sens = [[xr - (knee ? 0 : 6), ly - 8], [xr - 20, yS], [cx + 6, yS]];
    const mot = [[cx + 6, yM], [xm, yM]];
    const up = [[cx + 6, yS], [cx + 6, cTop - 2]];
    const down = [[cx - 6, cTop - 2], [cx - 6, yM], [cx + 6, yM]];
    ctx.strokeStyle = C.muted; ctx.globalAlpha = .45; ctx.lineWidth = 1.5;
    for (const p of [sens, mot, up, down]) strokePath(ctx, p);
    ctx.globalAlpha = 1;
    // Umschaltstelle im Rückenmark
    ctx.beginPath(); ctx.arc(cx + 6, ly, 4, 0, TAU); ctx.fillStyle = t >= T.s ? C.accent : C.muted; ctx.fill();
    // Signale
    pulse(ctx, sens, 0, T.s, t, C.fiber);
    pulse(ctx, up, T.s, T.brain, t, C.fiber);
    pulse(ctx, mot, T.s + c.syn, T.ref, t, C.accent);
    pulse(ctx, down, T.dec, T.down, t, C.copper);
    pulse(ctx, mot, T.down, T.con, t, C.copper);

    // Zeitleiste
    const gx0 = narrow ? 14 : 92, gx1 = w - 18;
    const X = v => gx0 + (gx1 - gx0) * clamp(v, 0, TMAX) / TMAX;
    const r1 = dh + (narrow ? 54 : 40), r2 = dh + (narrow ? 100 : 88), bh = 14;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, dh + 14); ctx.lineTo(gx1, dh + 14); ctx.stroke();
    const rows = [
      [r1, 'Reflex', [[0, T.s, C.fiber], [T.s, T.s + c.syn, C.fg], [T.s + c.syn, T.ref, C.accent]], T.ref],
      [r2, 'Bewusst', [[0, T.s, C.fiber], [T.s, T.brain, C.fiber], [T.brain, T.dec, C.glow], [T.dec, T.con, C.copper]], T.con],
    ];
    for (const [ry, name, segs, end] of rows) {
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
      if (narrow) ctx.fillText(name, gx0, ry - 6); else ctx.fillText(name, 14, ry + bh - 3);
      for (const [a, b, col] of segs) {
        ctx.fillStyle = col; ctx.globalAlpha = .22; ctx.fillRect(X(a), ry, Math.max(1.5, X(b) - X(a)), bh);
        ctx.globalAlpha = 1; if (t > a) ctx.fillRect(X(a), ry, Math.max(1.5, X(Math.min(b, t)) - X(a)), bh);
      }
      ctx.fillStyle = t >= end ? C.fg : C.muted; ctx.font = `11px ${MONO}`;
      const lbl = `${fmt(end, 0)} ms`, lw = ctx.measureText(lbl).width;
      if (narrow) { ctx.textAlign = 'right'; ctx.fillText(lbl, gx1, ry - 6); }
      else ctx.fillText(lbl, X(end) + 6 + lw > gx1 ? X(end) - lw - 6 : X(end) + 6, ry + bh - 3);
    }
    // Beschriftung der Gehirn-Phase
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Gehirn denkt' : 'Wahrnehmen und Entscheiden', (X(T.brain) + X(T.dec)) / 2, r2 + bh + 14);
    // Zeitachse
    ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    for (let v = 0; v <= TMAX; v += narrow ? 80 : 40) {
      ctx.fillRect(X(v), dh + 11, 1, 6);
      ctx.fillText(String(v), X(v), dh + 30);
    }
    // aktueller Zeitpunkt
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(t), dh + 14); ctx.lineTo(X(t), r2 + bh + 2); ctx.stroke();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('nerven', 4, {
    rtLock: () => { RT.on = true; ['#rtStart', '#rtClear'].forEach(s => $(s).disabled = false); },
    raceLock: () => { R.on = true; ['#dIn', '#raceBtn'].forEach(s => $(s).disabled = false); if (!R.ran) startRace(); },
    reflexLock: () => {
      RF.on = true; ['#rfT', '#rfPlay'].forEach(s => $(s).disabled = false); $$('#rfSel button').forEach(b => b.disabled = false);
      updRF();
    },
  });

  loop((dt, now) => { drawRT(now); drawRace(dt); drawReflex(dt); });
})();
