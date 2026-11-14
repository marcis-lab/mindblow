/* mindblow – Lektion Immunsystem */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- Teil 1: Fresszellen gegen Bakterien ---------- */
  const bacCv = $('#bacCv');
  const START = 8, CAP = 400, END_MIN = 480;
  const MIN_PER_S = 5;                           // 1 Sekunde = 5 Minuten
  const U = { bac: false, ab: false };
  const B = { t: 0, run: false, over: false, bac: [], phag: [], eaten: 0 };
  const newBac = (x, y) => ({ x, y, a: rnd(0, TAU), div: rnd(17, 23), age: rnd(0, 15) });
  const newPhag = () => {
    const side = Math.random() < .5;
    return { x: side ? rnd(.04, .2) : rnd(.8, .96), y: rnd(.1, .9), busy: 0, ph: rnd(0, TAU), tx: 0, ty: 0 };
  };
  const syncPhag = () => {
    const n = +$('#phagIn').value;
    while (B.phag.length < n) B.phag.push(newPhag());
    B.phag.length = n;
  };
  const resetBac = () => {
    B.t = 0; B.run = false; B.over = false; B.eaten = 0;
    B.bac = Array.from({ length: START }, () => newBac(.5 + rnd(-.06, .06), .5 + rnd(-.08, .08)));
    B.phag = []; syncPhag();
    $('#bacRun').textContent = 'Start'; $('#bacRun').disabled = !U.bac;
    $('#bacStatus').textContent = 'Acht Bakterien sitzen in der Wunde. Wähle, wie viele Fresszellen in der Nähe sind, und starte.';
    updBac();
  };
  const timeStr = m => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); return h ? `${h} h ${String(mm).padStart(2, '0')} min` : `${mm} min`; };
  const updBac = () => {
    $('#bacTime').textContent = timeStr(B.t);
    $('#bacCount').textContent = B.over ? `über ${fmt(CAP, 0)}` : fmt(B.bac.length, 0);
    $('#bacFree').textContent = fmt(START * Math.pow(2, Math.floor(B.t / 20)), 0);
  };
  const finish = msg => { B.run = false; $('#bacRun').textContent = 'Start'; $('#bacRun').disabled = true; $('#bacStatus').textContent = msg; };
  $('#phagIn').addEventListener('input', e => { $('#phagOut').textContent = e.target.value; syncPhag(); });
  $('#bacRun').addEventListener('click', () => {
    B.run = !B.run;
    $('#bacRun').textContent = B.run ? 'Pause' : 'Weiter';
    if (B.run) $('#bacStatus').textContent = 'Die Fresszellen kriechen zum nächsten Bakterium. Du kannst die Zahl auch während des Laufs ändern.';
  });
  $('#bacReset').addEventListener('click', resetBac);

  const stepBac = (dt, aspect) => {
    const dm = dt * MIN_PER_S;
    B.t = Math.min(END_MIN, B.t + dm);
    // Teilung: alle etwa 20 Minuten Simulationszeit
    const born = [];
    for (const b of B.bac) {
      b.age += dm;
      if (b.age >= b.div && B.bac.length + born.length < CAP) {
        b.age = 0; b.div = rnd(17, 23);
        const ang = rnd(0, TAU);
        born.push(newBac(clamp(b.x + Math.cos(ang) * .025, .02, .98), clamp(b.y + Math.sin(ang) * .025 * aspect, .04, .96)));
      }
      // leichtes Zittern
      b.x = clamp(b.x + rnd(-1, 1) * dt * .01, .02, .98); b.y = clamp(b.y + rnd(-1, 1) * dt * .01 * aspect, .04, .96);
    }
    for (const n of born) B.bac.push(n);
    // Fresszellen: zum nächsten Bakterium kriechen, fressen, kurz verdauen
    const sp = .16 / 12 * MIN_PER_S;                // Anteil der Breite pro Sekunde
    for (const p of B.phag) {
      p.ph += dt * 3;
      if (p.busy > 0) { p.busy -= dt; continue; }
      let best = -1, bd = Infinity;
      for (let i = 0; i < B.bac.length; i++) {
        const dx = B.bac[i].x - p.x, dy = (B.bac[i].y - p.y) / aspect, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) continue;
      const b = B.bac[best], d = Math.sqrt(bd);
      if (d < .025) { B.bac.splice(best, 1); B.eaten++; p.busy = 3 / MIN_PER_S; continue; }   // etwa 3 Minuten verdauen
      const s = Math.min(d, sp * dt);
      p.x += (b.x - p.x) / d * s; p.y += (b.y - p.y) / d * s;
    }
    if (B.bac.length >= CAP) { B.over = true; finish(`Mehr als ${fmt(CAP, 0)} Bakterien: Die Fresszellen sind überrannt. Im echten Körper kommt jetzt Verstärkung: Entzündung, Fieber und die Antikörper aus Teil 2.`); }
    else if (B.bac.length === 0) finish(`Alle Bakterien gefressen, nach ${timeStr(B.t)}. Die Wunde ist sauber. So läuft es bei den meisten kleinen Verletzungen.`);
    else if (B.t >= END_MIN) finish(`8 Stunden vorbei, noch ${fmt(B.bac.length, 0)} Bakterien. Ohne Abwehr wären es über 134 Millionen.`);
  };

  const drawBac = dt => {
    const { ctx, w, h } = fit(bacCv);
    const aspect = w / h;
    if (B.run) stepBac(dt, aspect);
    if (B.run || B.over) updBac();
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 0, 0, w, h, 14); ctx.fillStyle = C.sunk; ctx.fill();
    // Wunde
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(w * .5, h * .5, w * .14, h * .2, 0, 0, TAU); ctx.stroke(); ctx.restore();
    const s = clamp(w / 120, 3, 5);
    // Bakterien als kleine Stäbchen
    ctx.fillStyle = C.bad;
    for (const b of B.bac) {
      ctx.save(); ctx.translate(b.x * w, b.y * h); ctx.rotate(b.a);
      roundRect(ctx, -s * 1.1, -s * .55, s * 2.2, s * 1.1, s * .55); ctx.fill(); ctx.restore();
    }
    // Fresszellen als weiche Blasen
    const R = clamp(w / 34, 9, 15);
    for (const p of B.phag) {
      const x = p.x * w, y = p.y * h;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = k / 24 * TAU, wob = reduced ? 0 : Math.sin(a * 3 + p.ph) * .12 + Math.sin(a * 5 - p.ph * 1.3) * .06;
        const r = R * (1 + wob);
        k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.globalAlpha = .35; ctx.fillStyle = C.accent; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 2; ctx.strokeStyle = C.accent; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, R * .35, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      if (p.busy > 0) { ctx.beginPath(); ctx.arc(x + R * .45, y - R * .2, s * .8, 0, TAU); ctx.fillStyle = C.bad; ctx.globalAlpha = clamp(p.busy * 2, 0, 1); ctx.fill(); ctx.globalAlpha = 1; }
    }
    // Legende
    const narrow = w < 420;
    ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    const lbl = narrow ? `${timeStr(B.t)} · gefressen ${fmt(B.eaten, 0)}` : `${timeStr(B.t)} · gefressen: ${fmt(B.eaten, 0)} · Bakterien teilen sich alle ~20 min`;
    const tw = Math.min(ctx.measureText(lbl).width, w - 40);
    roundRect(ctx, 10, 10, tw + 20, 24, 12); ctx.fillStyle = C.surface; ctx.fill();
    ctx.fillStyle = C.fg; ctx.fillText(lbl, 20, 26, w - 40);
    ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'rot: Bakterien · grün: Fresszellen' : 'rot: Bakterien · grün: Fresszellen (vereinfacht)', 12, h - 12);
  };

  /* ---------- Teil 2: Schlüssel und Schloss ---------- */
  const abCv = $('#abCv');
  const GERMS = [[2, 0, 1], [0, 2, 2], [1, 2, 0]];
  const GERM_NAMES = ['Keim A', 'Keim B', 'Keim C'];
  const germColor = i => [C.bad, C.copper, C.glow][i];
  // alle 27 Fühler, einmal gemischt
  const CELLS = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) CELLS.push([a, b, c]);
  for (let i = CELLS.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [CELLS[i], CELLS[j]] = [CELLS[j], CELLS[i]]; }
  const same = (p, q) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];
  const A = { g: 0, phase: 'idle', idx: -1, tt: 0, found: -1, checked: 0, clones: 0, cloneT: 0, abs: [], germs: [], abT: 0 };
  const spawnGerms = () => { A.germs = Array.from({ length: 4 }, (_, i) => ({ x: .52 + i * .12 + rnd(-.03, .03), y: rnd(.35, .65), ph: rnd(0, TAU), bound: 0 })); };
  const resetAb = () => {
    A.phase = 'idle'; A.idx = -1; A.found = -1; A.checked = 0; A.clones = 0; A.abs = []; A.g = 0;
    $$('#abGerms button').forEach(x => x.classList.toggle('active', x.dataset.g === '0'));
    spawnGerms(); updAb();
    $('#abSearch').disabled = !U.ab;
    $('#abStatus').textContent = 'Vergleiche die Zacken auf dem Keim mit den Fühlern der B-Zellen.';
  };
  const updAb = () => {
    $('#abChecked').textContent = fmt(A.checked, 0);
    $('#abClones').textContent = A.clones ? fmt(Math.pow(2, A.clones), 0) : '–';
    $('#abFits').textContent = A.found >= 0 ? `nur ${GERM_NAMES[GERMS.findIndex(g => same(g, CELLS[A.found]))]}` : '–';
  };
  $$('#abGerms button').forEach(b => b.addEventListener('click', () => {
    if (A.phase === 'search') return;
    A.g = +b.dataset.g;
    $$('#abGerms button').forEach(x => x.classList.toggle('active', x === b));
    spawnGerms();
    A.phase = 'idle'; A.checked = 0; A.idx = -1;
    $('#abSearch').disabled = false;
    const fits = A.found >= 0 && same(CELLS[A.found], GERMS[A.g]);
    $('#abStatus').textContent = A.found < 0 ? 'Neuer Keim, neue Zacken. Suche die passende B-Zelle.'
      : fits ? 'Diesen Keim kennt dein Körper schon: Die Antikörper passen sofort.'
      : `Die Antikörper gegen ${GERM_NAMES[GERMS.findIndex(g => same(g, CELLS[A.found]))]} passen hier nicht. Sie treiben vorbei. Für diesen Keim braucht es eine andere B-Zelle.`;
    updAb();
  }));
  $('#abSearch').addEventListener('click', () => {
    A.phase = 'search'; A.idx = -1; A.tt = 0; A.checked = 0;
    $('#abSearch').disabled = true;
    $('#abStatus').textContent = 'Eine B-Zelle nach der anderen prüft mit ihrem Fühler, ob sie zum Antigen passt …';
    if (reduced) { A.idx = CELLS.findIndex(c => same(c, GERMS[A.g])); A.checked = A.idx + 1; foundCell(); }
  });
  $('#abReset').addEventListener('click', resetAb);
  const foundCell = () => {
    A.phase = 'grow'; A.found = A.idx; A.clones = 0; A.cloneT = 0; A.abs = [];
    $('#abStatus').textContent = `Treffer nach ${fmt(A.checked, 0)} B-Zellen. Diese eine Zelle teilt sich jetzt immer wieder. Im Körper dauert das einige Tage.`;
    updAb();
  };

  // Zacken zeichnen: Antigen ragt nach oben, der Fühler ist das Gegenstück
  const drawKey = (ctx, x, y, wd, prof, step, up, fill) => {
    const tw = wd / 3;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < 3; i++) {
      const hgt = (up ? prof[i] + 1 : 3 - prof[i]) * step * (up ? -1 : 1);
      ctx.lineTo(x + i * tw, y + hgt); ctx.lineTo(x + (i + 1) * tw, y + hgt);
    }
    ctx.lineTo(x + wd, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  const drawY = (ctx, x, y, s, col, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(0, 0); ctx.lineTo(-s * .7, -s * .8); ctx.moveTo(0, 0); ctx.lineTo(s * .7, -s * .8); ctx.stroke(); ctx.restore();
  };

  const drawAb = (dt, now) => {
    const { ctx, w, h } = fit(abCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const topH = h * .3, gridY = topH + 8, cols = 9, cw = w / cols, ch = Math.min(cw * 1.05, 46);
    const gridH = ch * 3, cloneY = gridY + gridH + 10;
    // Logik
    if (A.phase === 'search') {
      A.tt += dt;
      if (A.tt > .14) {
        A.tt = 0; A.idx++; A.checked = A.idx + 1; updAb();
        if (same(CELLS[A.idx], GERMS[A.g])) foundCell();
      }
    } else if (A.phase === 'grow') {
      A.cloneT += dt;
      if (A.cloneT > (reduced ? 0 : .35) && A.clones < 10) { A.cloneT = 0; A.clones++; updAb(); if (A.clones === 10) { A.phase = 'make'; $('#abStatus').textContent = 'Aus einer Zelle wurden 1\'024. Die Klone schütten Antikörper aus, die nur auf dieses Antigen passen.'; } }
    }
    if (A.found >= 0 && A.clones >= 4) {
      A.abT += dt;
      if (A.abT > .12 && A.abs.length < 60) {
        A.abT = 0;
        A.abs.push({ x: rnd(.05, .95), y: (cloneY + 10) / h, vx: rnd(-.02, .02), vy: rnd(-.12, -.08), prof: CELLS[A.found], r: rnd(-.5, .5), stuck: null, life: 1 });
      }
    }
    // Keim-Bereich
    roundRect(ctx, 0, 0, w, topH, 12); ctx.fillStyle = C.sunk; ctx.fill();
    const gc = germColor(A.g), prof = GERMS[A.g];
    // Lupe mit dem Antigen
    const lx = 10, lw = Math.min(w * .36, 150), step = clamp(lw / 16, 4, 9);
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText(narrow ? `Antigen ${GERM_NAMES[A.g].slice(-1)}` : `Antigen von ${GERM_NAMES[A.g]}`, lx + 4, 18);
    drawKey(ctx, lx + lw * .15, topH - 18, lw * .7, prof, step, true, gc);
    roundRect(ctx, lx + lw * .05, topH - 18, lw * .9, 8, 4); ctx.fillStyle = gc; ctx.fill();
    // schwebende Keime
    const gR = clamp(w / 40, 9, 16);
    for (const gm of A.germs) {
      const x = gm.x * w, y = gm.y * topH + (reduced ? 0 : Math.sin(now / 900 + gm.ph) * 4);
      gm.px = x; gm.py = y;
      ctx.beginPath(); ctx.arc(x, y, gR, 0, TAU); ctx.fillStyle = gc; ctx.fill();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU + gm.ph;
        ctx.save(); ctx.translate(x + Math.cos(a) * gR, y + Math.sin(a) * gR); ctx.rotate(a + Math.PI / 2);
        drawKey(ctx, -4, 0, 8, prof, 1.3, true, gc); ctx.restore();
      }
    }
    // B-Zellen
    for (let i = 0; i < CELLS.length; i++) {
      const cx = (i % cols + .5) * cw, cy = gridY + (Math.floor(i / cols) + .55) * ch;
      const r = Math.min(cw, ch) * .3;
      const isFound = i === A.found, checked = A.phase === 'search' ? i < A.idx : (A.found >= 0 && !isFound && A.checked > i);
      const current = A.phase === 'search' && i === A.idx;
      ctx.globalAlpha = checked ? .3 : 1;
      if (isFound || current) { ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, TAU); ctx.fillStyle = isFound ? C.glow : C.line; ctx.globalAlpha = isFound ? .35 : 1; ctx.fill(); ctx.globalAlpha = checked ? .3 : 1; }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      // Fühler oben: Becher mit Kerben
      const fw = r * 1.4, fs = clamp(r / 4.5, 1.6, 3);
      const fx = cx - fw / 2, fy = cy - r - fs * 4 + 1;
      ctx.fillStyle = C.accent; ctx.fillRect(fx, fy, fw, fs * 4);
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 3; k++) { const d = (CELLS[i][k] + 1) * fs; ctx.fillRect(fx + k * fw / 3 + .3, fy, fw / 3 - .6, d); }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // Klone
    if (A.found >= 0) {
      const n = Math.min(Math.pow(2, A.clones), 64), r = clamp(w / 90, 3, 6);
      ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace';
      ctx.fillText(narrow ? `Klone: ${fmt(Math.pow(2, A.clones), 0)}` : `Klone der passenden B-Zelle: ${fmt(Math.pow(2, A.clones), 0)}`, 10, cloneY + 4);
      for (let k = 0; k < n; k++) {
        const x = 14 + (k % 32) * (w - 28) / 32 + r, y = cloneY + 18 + Math.floor(k / 32) * (r * 2.6);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      }
    }
    // Antikörper fliegen zu den Keimen
    const yS = clamp(w / 70, 4, 7);
    for (const ab of A.abs) {
      if (ab.stuck && A.germs.includes(ab.stuck.g)) {
        const g = ab.stuck.g;
        drawY(ctx, g.px + Math.cos(ab.stuck.a) * (gR + yS * 1.2), g.py + Math.sin(ab.stuck.a) * (gR + yS * 1.2), yS, C.fg, ab.stuck.a - Math.PI / 2);
        continue;
      }
      ab.stuck = null;
      ab.x += ab.vx * dt; ab.y += ab.vy * dt;
      const px = ab.x * w, py = ab.y * h;
      if (same(ab.prof, GERMS[A.g])) {
        for (const g of A.germs) {
          if (g.px === undefined) continue;
          const dx = px - g.px, dy = py - g.py;
          if (dx * dx + dy * dy < (gR * 3) ** 2) { ab.stuck = { g, a: Math.atan2(dy, dx) }; break; }
          // sanft zum nächsten Keim lenken
          if (py < topH + 30) { ab.vx += (-dx / w) * dt * .6; }
        }
      }
      if (ab.y < -.05) ab.life = 0;
      if (!ab.stuck) drawY(ctx, px, py, yS, C.fg, ab.r);
    }
    A.abs = A.abs.filter(a => a.life > 0);
    if (A.phase === 'make' || A.phase === 'idle') {
      const bound = A.abs.filter(a => a.stuck).length;
      if (bound > 12 && A.phase === 'make') { A.phase = 'done'; $('#abStatus').textContent = 'Die Keime sind mit Antikörpern gespickt. So markiert, werden sie von den Fresszellen schnell erkannt und gefressen. Probier jetzt einen anderen Keim.'; }
    }
  };

  /* ---------- Teil 3: Gedächtnis und Impfung ---------- */
  const memCv = $('#memCv');
  const DAYS = 70, SICK = .3;
  const M = { mode: 'inf', sec: 35, shown: DAYS, play: false };
  const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  // Antikörper-Antwort: Verzögerung, Anstieg, langsamer Abfall auf einen Rest (vereinfacht)
  const resp = (t, lag, peak, amp, rest, tau) => {
    if (t < lag) return 0;
    if (t < peak) return amp * smooth((t - lag) / (peak - lag));
    return rest + (amp - rest) * Math.exp(-(t - peak) / tau);
  };
  const primary = (t, amp) => resp(t, 4, 14, amp, amp * .15, 12);
  const secondary = t => resp(t, 1.5, 7, 10, 2, 20);
  const antibodies = t => {
    const a1 = primary(t, M.mode === 'vac' ? .8 : 1);
    return t < M.sec ? a1 : Math.max(a1, a1 + secondary(t - M.sec));
  };
  // Keime: beim ersten Mal kräftiger Anstieg, beim zweiten Mal gestoppt
  const germs = t => {
    let g = 0;
    if (M.mode === 'inf' && t > 0) g += smooth(t / 2) * Math.exp(-(((t - 8) / 3.2) ** 2));
    const d = t - M.sec;
    if (d > 0) g += smooth(d / 1) * .14 * Math.exp(-(((d - 2.5) / 1.4) ** 2));
    return g;
  };
  const sickDays = (a, b) => { let n = 0; for (let t = a; t < b; t += .1) if (germs(t) > SICK) n += .1; return n; };
  const updMem = () => {
    $('#secOut').textContent = M.sec;
    $('#memL1').textContent = M.mode === 'vac' ? 'Krank nach der Impfung' : 'Krank nach Ansteckung am Tag 0';
    const s1 = sickDays(0, M.sec), s2 = sickDays(M.sec, DAYS);
    $('#memSick1').textContent = s1 < .5 ? 'nein' : `ca. ${fmt(s1, 0)} Tage`;
    $('#memSick2').textContent = s2 < .5 ? 'kaum' : `ca. ${fmt(s2, 0)} Tage`;
    let p1 = 0, p2 = 0;
    for (let t = 0; t < DAYS; t += .1) { const a = antibodies(t); if (t < M.sec) p1 = Math.max(p1, a); else p2 = Math.max(p2, a); }
    $('#memRatio').textContent = `×${fmt(p2 / p1, 0)}`;
  };
  $$('#memMode button').forEach(b => b.addEventListener('click', () => {
    M.mode = b.dataset.m;
    $$('#memMode button').forEach(x => x.classList.toggle('active', x === b));
    $('#memStatus').textContent = M.mode === 'vac'
      ? 'Die Impfung zeigt dem Körper den Keim ohne Krankheit. Beim ersten echten Kontakt antwortet er schon wie beim zweiten Mal.'
      : 'Ohne Vorwissen braucht der Körper beim ersten Kontakt etwa ein bis zwei Wochen. So lange vermehren sich die Keime.';
    updMem(); startPlay();
  }));
  $('#secIn').addEventListener('input', e => { M.sec = +e.target.value; updMem(); if (!M.play) M.shown = DAYS; });
  const startPlay = () => { if (reduced) { M.shown = DAYS; return; } M.shown = 0; M.play = true; };
  $('#memPlay').addEventListener('click', startPlay);
  updMem();

  const drawMem = dt => {
    if (M.play) { M.shown += dt * 10; if (M.shown >= DAYS) { M.shown = DAYS; M.play = false; } }
    const { ctx, w, h } = fit(memCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const L = narrow ? 30 : 44, R = 12, T = 30, Bm = 34, pw = w - L - R, ph = h - T - Bm;
    const X = t => L + t / DAYS * pw;
    const YA = a => T + ph - a / 11 * ph;           // Antikörper 0..11
    const YG = g => T + ph - g * ph * .45;          // Keime, eigene Skala
    roundRect(ctx, 0, 0, w, h, 14); ctx.fillStyle = C.sunk; ctx.fill();
    // Achsen und Raster
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted;
    ctx.textAlign = 'center';
    for (let d = 0; d <= DAYS; d += narrow ? 20 : 10) {
      ctx.beginPath(); ctx.moveTo(X(d), T); ctx.lineTo(X(d), T + ph); ctx.stroke();
      ctx.fillText(String(d), X(d), T + ph + 14);
    }
    ctx.fillText(narrow ? 'Tage' : 'Tage nach dem ersten Kontakt', L + pw / 2, h - 6);
    ctx.textAlign = 'left';
    // Krank-Schwelle
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.bad; ctx.globalAlpha = .7;
    ctx.beginPath(); ctx.moveTo(L, YG(SICK)); ctx.lineTo(L + pw, YG(SICK)); ctx.stroke(); ctx.restore();
    ctx.fillStyle = C.bad; ctx.fillText(narrow ? 'krank' : 'ab hier fühlst du dich krank', L + 4, YG(SICK) - 5);
    // Ereignisse
    const ev = [[0, M.mode === 'vac' ? 'Impfung' : 'Ansteckung', M.mode === 'vac' ? C.fiber : C.bad], [M.sec, 'Ansteckung', C.bad]];
    for (const [d, t, c] of ev) {
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(d), T - 4); ctx.lineTo(X(d), T + ph); ctx.stroke();
      ctx.fillStyle = c; ctx.textAlign = d === 0 ? 'left' : 'center'; ctx.fillText(t, X(d) + (d === 0 ? 4 : 0), T - 10);
    }
    ctx.textAlign = 'left';
    const end = M.shown;
    // Keime als Fläche
    ctx.beginPath(); ctx.moveTo(X(0), YG(0));
    for (let t = 0; t <= end; t += .25) ctx.lineTo(X(t), YG(germs(t)));
    ctx.lineTo(X(end), YG(0)); ctx.closePath();
    ctx.globalAlpha = .3; ctx.fillStyle = C.bad; ctx.fill(); ctx.globalAlpha = 1;
    // Antikörper als Linie
    ctx.beginPath();
    for (let t = 0; t <= end; t += .25) { const y = YA(antibodies(t)); t ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.stroke();
    if (M.play) { ctx.beginPath(); ctx.arc(X(end), YA(antibodies(end)), 4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill(); }
    // Legende
    const ly = T + 8, lx = L + pw - (narrow ? 112 : 150);
    ctx.fillStyle = C.accent; ctx.fillRect(lx, ly, 14, 3);
    ctx.fillStyle = C.fg; ctx.fillText('Antikörper', lx + 20, ly + 5);
    ctx.globalAlpha = .45; ctx.fillStyle = C.bad; ctx.fillRect(lx, ly + 14, 14, 8); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.fillText(narrow ? 'Keime' : 'Keime (eigene Skala)', lx + 20, ly + 22);
  };

  /* ---------- Lektion verdrahten ---------- */
  resetBac();
  resetAb();
  lesson('immunsystem', 4, {
    bacLock: () => { U.bac = true; $('#phagIn').disabled = false; $('#bacRun').disabled = false; $('#bacReset').disabled = false; },
    abLock: () => { U.ab = true; $$('#abGerms button').forEach(b => b.disabled = false); $('#abSearch').disabled = false; $('#abReset').disabled = false; },
    memLock: () => { $$('#memMode button').forEach(b => b.disabled = false); $('#secIn').disabled = false; $('#memPlay').disabled = false; startPlay(); },
  });

  loop((dt, now) => { drawBac(dt); drawAb(dt, now); drawMem(dt); });
})();
