/* mindblow – Lektion Muskelkater */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => (1 - Math.cos(Math.PI * clamp(k, 0, 1))) / 2;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farbe: Muskelfleisch
  const MUSCLE = '#c8504a';

  // Vereinfachte Verläufe nach einem harten, ungewohnten Training (t in Stunden)
  const lactate = t => 1 + 11 * Math.exp(-t / 0.3);                 // mmol/l, nach rund 1 h fast wieder Ruhewert
  const pain = t => {                                                 // 0..10, Beginn nach Stunden, Gipfel nach 1 bis 3 Tagen
    if (t <= 6) return 0;
    const x = (t - 6) / 34;
    return 10 * x * x * Math.exp(2 * (1 - x));
  };
  const timeTxt = t => t < 1 ? `${fmt(t * 60, 0)} min`
    : t < 48 ? `${fmt(t, t < 10 ? 1 : 0)} h`
    : `${fmt(t / 24, 1)} Tage`;

  /* ---------- Teil 1: Zeitachse Laktat und Muskelkater ---------- */
  const timeCv = $('#timeCv');
  const TMAX = 120;
  const T1 = { v: 0, play: false, last: '' };
  const tOf = v => TMAX * Math.pow(v / 1000, 2);
  const vOf = t => 1000 * Math.sqrt(t / TMAX);
  const phaseMsg = t =>
    t < 0.4 ? ['a', 'Direkt nach dem Training: viel Laktat, aber noch kein Muskelkater.']
    : t < 3 ? ['b', 'Das Laktat ist schon fast wieder auf dem Ruhewert. Muskelkater: keine Spur.']
    : t < 12 ? ['c', 'Das Laktat ist längst abgebaut. Erst jetzt beginnt sich der Muskel langsam zu melden.']
    : t < 24 ? ['d', 'Der Muskelkater wird stärker. Laktat ist seit vielen Stunden keines mehr übrig.']
    : t <= 72 ? ['e', 'Jetzt ist der Muskelkater am stärksten, 1 bis 3 Tage nach dem Training. Laktat: normal.']
    : ['f', 'Der Muskelkater klingt ab. Nach rund einer Woche ist er meist ganz weg.'];
  const updTime = () => {
    const t = tOf(T1.v);
    $('#tIn').value = Math.round(T1.v);
    $('#tOut').textContent = timeTxt(t);
    $('#rTime').textContent = timeTxt(t);
    $('#rLac').textContent = `${fmt(lactate(t), 1)} mmol/l`;
    $('#rPain').textContent = `${fmt(pain(t), 0)} von 10`;
    const [k, msg] = phaseMsg(t);
    if (k !== T1.last) { T1.last = k; $('#timeStatus').textContent = msg; }
  };
  const stopPlay = () => { T1.play = false; $('#tPlay').textContent = 'Zeit laufen lassen'; };
  $('#tIn').addEventListener('input', e => { T1.v = +e.target.value; stopPlay(); updTime(); });
  $('#tPlay').addEventListener('click', () => {
    if (reduced) { T1.v = vOf(48); updTime(); return; }
    if (T1.play) { stopPlay(); return; }
    if (T1.v >= 999) T1.v = 0;
    T1.play = true; $('#tPlay').textContent = 'Anhalten';
  });
  $('#tHour').addEventListener('click', () => { stopPlay(); T1.v = vOf(1); updTime(); });
  $('#tDay2').addEventListener('click', () => { stopPlay(); T1.v = vOf(48); updTime(); });
  updTime();

  const drawTime = dt => {
    if (T1.play) {
      T1.v = Math.min(1000, T1.v + dt * 90);
      if (T1.v >= 1000) stopPlay();
      updTime();
    }
    const t = tOf(T1.v);
    const { ctx, w, h } = fit(timeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const gx0 = narrow ? 14 : 20, gx1 = w - (narrow ? 14 : 20), gy0 = 46, gy1 = h - 56;
    const X = s => gx0 + Math.sqrt(s / TMAX) * (gx1 - gx0);
    const Y = k => gy1 - k * (gy1 - gy0);

    // Zeitraum, in dem Muskelkater am stärksten ist
    ctx.fillStyle = C.sunk; ctx.fillRect(X(24), gy0, X(72) - X(24), gy1 - gy0);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'am stärksten' : 'am stärksten: 1 bis 3 Tage', (X(24) + X(72)) / 2, gy0 + 13);

    // Achse und Markierungen
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const ticks = [[0, '0', '0'], [1, '1 h', '1h'], [6, '6 h', '6h'], [12, '12 h', '12h'], [24, '1 Tag', '1T'], [48, '2 Tage', '2T'], [72, '3 Tage', '3T'], [120, '5 Tage', '5T']];
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    for (const [s, a, b] of ticks) {
      const x = X(s);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x, gy1); ctx.lineTo(x, gy1 + 5); ctx.stroke();
      ctx.textAlign = s === 0 ? 'left' : s === TMAX ? 'right' : 'center';
      ctx.fillText(narrow ? b : a, x, gy1 + 17);
    }
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Zeitachse gestaucht' : 'Zeitachse gestaucht: die ersten Stunden sind breiter gezeichnet', gx0, h - 12);

    // Legende
    ctx.font = `500 11px ${MONO}`;
    ctx.textAlign = 'left'; ctx.fillStyle = C.copper; ctx.fillText(narrow ? 'Laktat' : 'Laktat (Milchsäure)', gx0, 18);
    ctx.textAlign = 'right'; ctx.fillStyle = C.accent; ctx.fillText('Muskelkater', gx1, 18);

    // Kurven
    const curve = (f, col, fillA) => {
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const s = TMAX * Math.pow(i / 240, 2), x = X(s), y = Y(f(s));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.lineTo(gx1, gy1); ctx.lineTo(gx0, gy1); ctx.closePath();
      ctx.globalAlpha = fillA; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    };
    const fL = s => lactate(s) / 12, fP = s => pain(s) / 10 * .92;
    curve(fL, C.copper, .14);
    curve(fP, C.accent, .14);
    // Ruhewert Laktat
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.copper; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, Y(1 / 12)); ctx.lineTo(gx1, Y(1 / 12)); ctx.stroke(); ctx.setLineDash([]);

    // Training
    ctx.fillStyle = C.fg; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('Training', gx0 + 4, gy0 - 8);

    // Zeitpunkt
    const x = X(t);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, gy0 - 2); ctx.lineTo(x, gy1); ctx.stroke();
    for (const [f, col] of [[fL, C.copper], [fP, C.accent]]) {
      ctx.beginPath(); ctx.arc(x, Y(f(t)), 5, 0, TAU); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = C.surface; ctx.lineWidth = 2; ctx.stroke();
    }
    // Zeit-Etikett
    const lbl = timeTxt(t);
    ctx.font = `500 11px ${MONO}`;
    const tw = ctx.measureText(lbl).width + 12;
    const lx = clamp(x - tw / 2, gx0, gx1 - tw);
    roundRect(ctx, lx, gy1 + 24, tw, 0, 0);
    ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    if (!narrow || Math.abs(x - X(0)) > 0) {
      roundRect(ctx, lx, gy1 - 22, tw, 18, 9); ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.fg; ctx.fillText(lbl, lx + tw / 2, gy1 - 9);
    }
  };

  /* ---------- Teil 2: Muskelfaser beim Heben und Bremsen ---------- */
  const fiberCv = $('#fiberCv');
  const ROWS = 2, NMAX = 8;
  const F = { mode: 'down', load: .6, ph: 0, reps: 0, tears: 0, acc: 0, dmg: [], n: NMAX, flash: [], lastSt: '' };
  const newMuscle = () => {
    F.reps = 0; F.tears = 0; F.acc = 0;
    F.dmg = Array.from({ length: ROWS }, () => new Array(NMAX + 1).fill(0));
    F.flash = [];
  };
  newMuscle();
  const CYCLE = 3.4;
  // Phase: 0..0.45 aktiv, 0.45..0.5 halten, 0.5..0.95 abgestützt, 0.95..1 halten
  const stateOf = ph => ph < .45 ? 'act' : ph < .5 ? 'holdA' : ph < .95 ? 'pas' : 'holdB';
  // Länge der Faser 0 (kurz) .. 1 (lang)
  const lenOf = ph => {
    const up = F.mode === 'up';
    const k = ph < .45 ? ease(ph / .45) : ph < .5 ? 1 : ph < .95 ? 1 - ease((ph - .5) / .45) : 0;
    // up: aktiv lang→kurz ; down: aktiv kurz→lang
    return up ? 1 - k : k;
  };
  const addTear = () => {
    const free = [];
    for (let r = 0; r < ROWS; r++) for (let i = 1; i <= F.n; i++) if (F.dmg[r][i] < 3) free.push([r, i]);
    F.tears++;
    if (!free.length) return;
    // bevorzugt schon geschwächte Stellen: schwache Sarkomere werden am stärksten überdehnt
    const weak = free.filter(([r, i]) => F.dmg[r][i] > 0);
    const pool = weak.length && Math.random() < .4 ? weak : free;
    const [r, i] = pool[Math.floor(Math.random() * pool.length)];
    F.dmg[r][i]++;
    F.flash.push({ r, i, a: 1 });
  };
  const fiberMsg = () => F.mode === 'up'
    ? 'Der Muskel hebt das Gewicht und wird dabei kürzer. Selbst bei grosser Last entstehen kaum Schäden.'
    : 'Der Muskel bremst das Gewicht beim Absenken und wird dabei unter Last länger. Achte auf die Z-Scheiben.';
  $$('#modeSel button').forEach(b => b.addEventListener('click', () => {
    F.mode = b.dataset.m; F.ph = 0; F.acc = 0;
    $$('#modeSel button').forEach(x => x.classList.toggle('active', x === b));
    $('#fiberStatus').textContent = fiberMsg();
  }));
  $('#loadIn').addEventListener('input', e => { F.load = +e.target.value / 100; $('#loadOut').textContent = `${e.target.value} %`; });
  $('#fiberReset').addEventListener('click', () => { newMuscle(); F.ph = 0; updFiber(); $('#fiberStatus').textContent = fiberMsg(); });
  const updFiber = () => {
    $('#fReps').textContent = fmt(F.reps, 0);
    $('#fTears').textContent = fmt(F.tears, 0);
  };
  const STATE_TXT = {
    up: { act: ['zieht sich zusammen', 'aktiv: hebt'], pas: ['locker', 'wird abgestützt'] },
    down: { act: ['bremst, wird länger', 'aktiv: bremst'], pas: ['locker', 'wird abgestützt'] },
  };
  let unlockedFiber = false;

  const drawFiber = dt => {
    const { ctx, w, h } = fit(fiberCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    F.n = narrow ? 6 : 8;

    // Ablauf
    const prevPh = F.ph;
    if (unlockedFiber && !reduced) {
      F.ph += dt / CYCLE;
      if (F.ph >= 1) { F.ph -= 1; F.reps++; updFiber(); }
    } else if (unlockedFiber && reduced) {
      F.ph = .2;
    }
    const st = stateOf(F.ph);
    if (unlockedFiber && !reduced && st === 'act') {
      const d = (F.ph - (prevPh > F.ph ? 0 : prevPh)) / .45;
      const rate = (F.mode === 'down' ? 2.4 : .12) * F.load * F.load;
      F.acc += rate * d;
      while (F.acc >= 1) { F.acc -= 1; addTear(); updFiber(); }
    }
    const active = st === 'act';
    const key = F.mode + (active || st === 'holdA' ? 'act' : 'pas');
    if (key !== F.lastSt) {
      F.lastSt = key;
      const [a, b] = STATE_TXT[F.mode][active || st === 'holdA' ? 'act' : 'pas'];
      $('#fState').textContent = unlockedFiber ? a : 'locker';
      $('#fState2').textContent = unlockedFiber ? b : 'wartet';
    }

    // Geometrie
    const xa = 26, r = 13;
    const px = w - (narrow ? 34 : 46), fy = 92;
    const Lmax = (px - r - 18 - xa), Lmin = Lmax * .8 / 1.2;
    const k = lenOf(F.ph);
    const L = lerp(Lmin, Lmax, k);
    const s0 = Lmax / (1.2 * F.n);
    const rh = 28, rowY = [fy - 17, fy + 17];

    // Wand
    ctx.fillStyle = C.sunk; ctx.fillRect(4, fy - 52, xa - 6, 104);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    for (let y = fy - 48; y < fy + 50; y += 9) { ctx.beginPath(); ctx.moveTo(4, y + 7); ctx.lineTo(xa - 2, y); ctx.stroke(); }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa - 1, fy - 52); ctx.lineTo(xa - 1, fy + 52); ctx.stroke();

    // Hülle der Faser
    roundRect(ctx, xa, fy - 40, L, 80, 14);
    ctx.fillStyle = C.sunk; ctx.fill();
    if (active && unlockedFiber) { ctx.globalAlpha = .18 * F.load + .08; ctx.fillStyle = MUSCLE; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = MUSCLE; ctx.lineWidth = 2; ctx.stroke();

    // Sarkomere: geschwächte werden stärker gedehnt
    for (let row = 0; row < ROWS; row++) {
      const dm = F.dmg[row];
      const wts = [];
      for (let i = 0; i < F.n; i++) wts.push(1 + .14 * (Math.min(3, dm[i] || 0) + Math.min(3, dm[i + 1] || 0)) * (.3 + .7 * k));
      const sum = wts.reduce((a, b) => a + b, 0);
      const zs = [xa];
      for (let i = 0; i < F.n; i++) zs.push(zs[i] + L * wts[i] / sum);
      const yc = rowY[row];
      for (let i = 0; i < F.n; i++) {
        const z0 = zs[i], z1 = zs[i + 1], mid = (z0 + z1) / 2;
        // Aktin (dünne Fäden) von den Z-Scheiben nach innen
        ctx.strokeStyle = C.copper; ctx.lineWidth = 1.4;
        const al = s0 * .38;
        for (const dy of [-9, -3, 3, 9]) {
          ctx.beginPath(); ctx.moveTo(z0, yc + dy); ctx.lineTo(z0 + al, yc + dy);
          ctx.moveTo(z1, yc + dy); ctx.lineTo(z1 - al, yc + dy); ctx.stroke();
        }
        // Myosin (dicke Fäden) in der Mitte
        const ml = s0 * .3;
        ctx.strokeStyle = C.accent; ctx.lineWidth = 3.2;
        for (const dy of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(mid - ml, yc + dy); ctx.lineTo(mid + ml, yc + dy); ctx.stroke(); }
      }
      // Z-Scheiben
      for (let i = 0; i <= F.n; i++) {
        const z = zs[i], d = Math.min(3, dm[i] || 0);
        if (i === 0) continue;
        if (!d) {
          ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(z, yc - rh / 2); ctx.lineTo(z, yc + rh / 2); ctx.stroke();
        } else {
          ctx.strokeStyle = C.bad; ctx.lineWidth = 2.2;
          const amp = 1.5 + d * 1.3;
          ctx.beginPath();
          for (let j = 0; j <= 7; j++) {
            const y = yc - rh / 2 + rh * j / 7;
            const xx = z + (j % 2 ? amp : -amp);
            if (d >= 2 && j === 4) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(xx, y + 2); continue; }
            j ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y);
          }
          ctx.stroke();
        }
        const fl = F.flash.find(f => f.r === row && f.i === i);
        if (fl) {
          ctx.globalAlpha = fl.a; ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(z, yc, 8 + (1 - fl.a) * 12, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      // Beschriftung über der oberen Reihe
      if (row === 0) {
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
        const b0 = zs[1], b1 = zs[2];
        ctx.beginPath(); ctx.moveTo(b0, fy - 46); ctx.lineTo(b0, fy - 50); ctx.lineTo(b1, fy - 50); ctx.lineTo(b1, fy - 46); ctx.stroke();
        ctx.fillText('Sarkomer', (b0 + b1) / 2, fy - 56);
        const zi = Math.min(4, F.n - 1), zx = zs[zi];
        ctx.fillText('Z-Scheibe', zx, fy - 56);
        ctx.beginPath(); ctx.moveTo(zx, fy - 52); ctx.lineTo(zx, fy - 42); ctx.stroke();
      }
    }
    F.flash.forEach(f => { f.a -= dt * 1.2; }); F.flash = F.flash.filter(f => f.a > 0);

    // Sehne zur Rolle
    const xe = xa + L;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(xe, fy); ctx.lineTo(px, fy - r); ctx.stroke();
    // Rolle
    ctx.beginPath(); ctx.arc(px, fy, r, 0, TAU); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, fy, 3, 0, TAU); ctx.fillStyle = C.muted; ctx.fill();
    ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, fy); ctx.lineTo(px, fy - 40); ctx.lineTo(px + 22, fy - 40); ctx.stroke();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, fy, r, -Math.PI / 2, 0); ctx.stroke();

    // Gewicht
    const floor = h - 66;
    const ws = 22 + 20 * F.load;
    const wyTop = fy + 26 + (L - Lmin);
    const wx = px + r;
    ctx.beginPath(); ctx.moveTo(wx, fy); ctx.lineTo(wx, wyTop); ctx.stroke();
    roundRect(ctx, wx - ws / 2, wyTop, ws, ws * .9, 5);
    ctx.fillStyle = C.fg; ctx.fill();
    ctx.fillStyle = C.bg; ctx.font = `500 ${narrow ? 9 : 10}px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(F.load * 100)}%`, wx, wyTop + ws * .45 + 3);
    // Stütze, wenn der Muskel locker ist
    const wyBot = wyTop + ws * .9;
    if (unlockedFiber && !active && st !== 'holdA') {
      ctx.fillStyle = C.line; ctx.fillRect(wx - 4, wyBot, 8, floor - wyBot);
      ctx.fillRect(wx - ws / 2, wyBot, ws, 3);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
      ctx.fillText('Stütze', wx - ws / 2 - 6, Math.min(floor - 4, wyBot + 14));
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px - 40, floor); ctx.lineTo(w - 4, floor); ctx.stroke();

    // Bewegungspfeil
    if (unlockedFiber && active) {
      const dir = F.mode === 'up' ? -1 : 1;
      const ax = wx - ws / 2 - 14, ay = wyTop + ws * .45;
      ctx.strokeStyle = F.mode === 'up' ? C.good : C.bad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay - dir * 12); ctx.lineTo(ax, ay + dir * 12);
      ctx.moveTo(ax - 5, ay + dir * 6); ctx.lineTo(ax, ay + dir * 12); ctx.lineTo(ax + 5, ay + dir * 6); ctx.stroke();
    }

    // Titelzeile
    ctx.textAlign = 'left'; ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg;
    const head = !unlockedFiber ? 'Muskelfaser, stark vergrössert'
      : F.mode === 'up' ? (narrow ? 'Heben: Faser wird kürzer' : 'Heben: die Faser zieht und wird kürzer')
      : (narrow ? 'Bremsen: Faser wird länger' : 'Bremsen: die Faser hält dagegen und wird länger');
    ctx.fillText(head, 6, 16);

    // Legende unten
    const ly = h - 34;
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    let lx = 8;
    const leg = (draw, txt) => { draw(lx, ly); ctx.fillStyle = C.muted; ctx.fillText(txt, lx + 16, ly + 4); lx += 16 + ctx.measureText(txt).width + 14; };
    leg((x, y) => { ctx.strokeStyle = C.copper; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 11, y); ctx.stroke(); }, 'Aktin');
    leg((x, y) => { ctx.strokeStyle = C.accent; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 11, y); ctx.stroke(); }, 'Myosin');
    if (narrow) { lx = 8; }
    const ly2 = narrow ? ly + 18 : ly;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx + 3, ly2 - 6); ctx.lineTo(lx + 8, ly2 - 2); ctx.lineTo(lx + 3, ly2 + 2); ctx.lineTo(lx + 8, ly2 + 6); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.fillText(narrow ? 'Riss an Z-Scheibe' : 'beschädigte Z-Scheibe (Mikroriss)', lx + 16, ly2 + 4);
  };

  /* ---------- Teil 3: Wiederholungseffekt ---------- */
  const weekCv = $('#weekCv');
  const TAUW = 20;                       // Schutz klingt in rund 20 Wochen auf gut ein Drittel ab (vereinfacht)
  const PMAX = .85;
  const W = { gap: 1, sessions: [] };
  // Schutz und Muskelkater aller Trainings aus der Liste neu berechnen
  const sim = () => {
    let p = 0, last = null;
    for (const s of W.sessions) {
      if (last !== null) p *= Math.exp(-(s.wk - last) / TAUW);
      s.pBefore = p; s.s = 10 * (1 - p);
      p = p + (PMAX - p) * .8; s.pAfter = p; last = s.wk;
    }
  };
  const protAt = t => {
    let p = 0, last = null;
    for (const s of W.sessions) {
      if (s.wk > t) break;
      if (last !== null) p *= Math.exp(-(s.wk - last) / TAUW);
      p = p + (PMAX - p) * .8; last = s.wk;
    }
    return last === null ? 0 : p * Math.exp(-(t - last) / TAUW);
  };
  const nextWk = () => W.sessions[W.sessions.length - 1].wk + W.gap;
  const XMAXW = 60;
  const resetWeeks = () => { W.sessions = [{ wk: 1, born: -1e9 }]; sim(); };
  resetWeeks();
  const updWeeks = () => {
    const ls = W.sessions[W.sessions.length - 1];
    $('#gapOut').textContent = W.gap === 1 ? '1 Woche' : `${W.gap} Wochen`;
    $('#wN').textContent = fmt(W.sessions.length, 0);
    $('#wLast').textContent = `${fmt(ls.s, 0)} von 10`;
    $('#wProt').textContent = `${fmt(protAt(nextWk()) * 100, 0)} %`;
    $('#wTrain').disabled = !unlockedWeek || nextWk() > XMAXW - 1 || W.sessions.length >= 10;
  };
  let unlockedWeek = false;
  $('#gapIn').addEventListener('input', e => { W.gap = +e.target.value; updWeeks(); });
  $('#wTrain').addEventListener('click', () => {
    W.sessions.push({ wk: nextWk(), born: performance.now() });
    sim(); updWeeks();
    const s = W.sessions[W.sessions.length - 1].s;
    $('#weekStatus').textContent = s < 4 ? `Nur noch ${fmt(s, 0)} von 10: Der Muskel hat sich angepasst und ist gut geschützt.`
      : s < 7 ? `${fmt(s, 0)} von 10: Die Pause war lang, ein Teil des Schutzes ist schon weg.`
      : `${fmt(s, 0)} von 10: Nach so langer Pause ist der Schutz fast weg. Fast wie beim ersten Mal.`;
    if (nextWk() > XMAXW - 1 || W.sessions.length >= 10) $('#weekStatus').textContent += ' Die Zeitachse ist voll. Starte von vorn.';
  });
  $('#wReset').addEventListener('click', () => { resetWeeks(); updWeeks(); $('#weekStatus').textContent = 'Das erste Training ist eingetragen. Mach das nächste.'; });
  updWeeks();

  const drawWeeks = (dt, now) => {
    const { ctx, w, h } = fit(weekCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const nx = nextWk();
    const xmax = clamp(Math.max(8, Math.ceil((nx + 1.5) / 2) * 2), 8, XMAXW);
    const gx0 = narrow ? 30 : 36, gx1 = w - (narrow ? 34 : 42), gy0 = 44, gy1 = h - 50;
    const X = t => gx0 + t / xmax * (gx1 - gx0);
    const Y = k => gy1 - k * (gy1 - gy0);

    // Gitter
    ctx.font = `10px ${MONO}`; ctx.lineWidth = 1;
    for (const v of [0, 5, 10]) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx0, Y(v / 10)); ctx.lineTo(gx1, Y(v / 10)); ctx.stroke();
      ctx.fillStyle = C.accent; ctx.textAlign = 'right'; ctx.fillText(String(v), gx0 - 6, Y(v / 10) + 3);
      ctx.fillStyle = C.good; ctx.textAlign = 'left'; ctx.fillText(`${v * 10}%`, gx1 + 5, Y(v / 10) + 3);
    }
    const step = xmax <= 12 ? 2 : xmax <= 30 ? 5 : 10;
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let t = 0; t <= xmax; t += step) ctx.fillText(String(t), X(t), gy1 + 15);
    ctx.textAlign = 'right'; ctx.fillText(narrow ? 'Wochen' : 'Wochen seit dem ersten Mal', gx1, gy1 + 32);
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.accent;
    ctx.fillText('Muskelkater', gx0 - (narrow ? 24 : 30), 18);
    ctx.textAlign = 'right'; ctx.fillStyle = C.good;
    ctx.fillText(narrow ? '- - Schutz' : '- - Schutz des Muskels', w - 4, 18);

    // Schutzkurve
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.good; ctx.lineWidth = 2;
    ctx.beginPath();
    const N = 300;
    for (let i = 0; i <= N; i++) {
      const t = xmax * i / N, p = protAt(t);
      i ? ctx.lineTo(X(t), Y(p)) : ctx.moveTo(X(t), Y(p));
      // senkrechter Sprung beim Training
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Balken
    const bw = clamp((gx1 - gx0) / xmax * .7, 8, 22);
    for (const s of W.sessions) {
      const g = reduced ? 1 : ease((now - s.born) / 700);
      const top = Y(s.s / 10 * g);
      roundRect(ctx, X(s.wk) - bw / 2, top, bw, gy1 - top, Math.min(5, bw / 3));
      ctx.fillStyle = C.accent; ctx.fill();
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      if (g > .95) ctx.fillText(fmt(s.s, 0), X(s.wk), top - 6);
    }
    // nächstes Training als Platzhalter
    if (unlockedWeek && nx <= XMAXW - 1 && W.sessions.length < 10) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
      roundRect(ctx, X(nx) - bw / 2, Y(.5), bw, gy1 - Y(.5), Math.min(5, bw / 3)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('?', X(nx), Y(.5) - 6);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('muskelkater', 4, {
    timeLock: () => { ['#tIn', '#tPlay', '#tHour', '#tDay2'].forEach(s => $(s).disabled = false); },
    fiberLock: () => {
      unlockedFiber = true; F.lastSt = '';
      ['#loadIn', '#fiberReset'].forEach(s => $(s).disabled = false);
      $$('#modeSel button').forEach(b => b.disabled = false);
      if (reduced) { for (let i = 0; i < 3; i++) addTear(); F.reps = 3; updFiber(); }
    },
    weekLock: () => { unlockedWeek = true; $('#gapIn').disabled = false; $('#wReset').disabled = false; updWeeks(); },
  });

  loop((dt, now) => { drawTime(dt); drawFiber(dt); drawWeeks(dt, now); });
})();
