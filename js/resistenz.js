/* mindblow – Lektion Antibiotika-Resistenz */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const count = n => n < 1 ? '0' : n < 1e6 ? fmt(Math.round(n), 0) : n < 1e9 ? `${fmt(n / 1e6, 1)} Mio.` : `${fmt(n / 1e9, 1)} Mrd.`;

  /* ---------- Teil 1: Petrischale ---------- */
  const dishCv = $('#dishCv');
  const MUTS = [100, 300, 1000, 3000, 10000];
  const CAP = 700, GEN = 1; // eine Generation (20 min) dauert hier 1 Sekunde
  const D1 = { cells: [], running: false, drug: false, t: 0, mu: 1 / 300, said: '', full: false };
  const seedDish = () => {
    D1.cells = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * .7;
      D1.cells.push({ x: r * Math.cos(a), y: r * Math.sin(a), a: Math.random() * Math.PI, res: false, dead: 0 });
    }
    Object.assign(D1, { drug: false, t: 0, said: '', full: false });
  };
  seedDish();
  const alive = () => D1.cells.filter(c => !c.dead);
  const say1 = (k, t) => { if (D1.said !== k) { D1.said = k; $('#dishStatus').textContent = t; } };
  const updDish = () => {
    const a = alive(), r = a.filter(c => c.res).length;
    $('#dN').textContent = fmt(a.length, 0);
    $('#dR').textContent = a.length ? `${r} · ${fmt(r / a.length * 100, 1)} %` : '–';
    const min = Math.round(D1.t / GEN * 20), hh = Math.floor(min / 60);
    $('#dT').textContent = hh ? `${hh} h ${min % 60} min` : `${min} min`;
  };
  $('#mutIn').addEventListener('input', e => {
    const m = MUTS[clamp(Math.round(+e.target.value), 0, MUTS.length - 1)]; D1.mu = 1 / m;
    $('#mutOut').textContent = `1 von ${fmt(m, 0)}`;
  });
  $('#growBtn').addEventListener('click', () => {
    seedDish(); D1.running = true;
    $('#growBtn').textContent = 'Neue Schale';
    $('#drugBtn').disabled = false; $('#drugBtn').textContent = 'Antibiotikum geben';
    say1('grow', 'Jedes Bakterium teilt sich etwa alle 20 Minuten. Beim Kopieren des Erbguts passieren selten Fehler.');
    updDish();
  });
  $('#drugBtn').addEventListener('click', () => {
    if (!D1.running || D1.drug) return;
    D1.drug = true; D1.full = false; $('#drugBtn').disabled = true; $('#drugBtn').textContent = 'Antibiotikum wirkt';
    say1('drug', 'Antibiotikum in der Schale. Die empfindlichen Bakterien sterben.');
  });

  const simDish = dt => {
    if (!D1.running) return;
    D1.t += dt;
    let n = 0; for (const c of D1.cells) if (!c.dead) n++;
    const rate = Math.LN2 / GEN * Math.max(0, 1 - n / CAP);
    const len = D1.cells.length;
    for (let i = 0; i < len; i++) {
      const c = D1.cells[i];
      if (c.dead) { c.dead += dt; continue; }
      if (D1.drug && !c.res) { if (Math.random() < 1.3 * dt) c.dead = .001; continue; }
      if (Math.random() < rate * dt) {
        const a = Math.random() * TAU, d = .035;
        let x = c.x + d * Math.cos(a), y = c.y + d * Math.sin(a);
        const r = Math.hypot(x, y); if (r > .94) { x *= .94 / r; y *= .94 / r; }
        D1.cells.push({ x, y, a: c.a + (Math.random() - .5) * 1.2, res: c.res || Math.random() < D1.mu, dead: 0 });
      }
    }
    D1.cells = D1.cells.filter(c => c.dead < .8);
    const a = alive(), r = a.filter(c => c.res).length;
    if (!D1.drug && a.length > CAP * .95) {
      say1('full', r ? `Die Schale ist voll. ${r} von ${a.length} Bakterien sind zufällig resistent, ganz ohne Antibiotikum. Gib jetzt das Antibiotikum.`
        : 'Die Schale ist voll. Diesmal ist zufällig kein resistentes Bakterium entstanden. Gib trotzdem das Antibiotikum.');
    }
    if (D1.drug) {
      if (!a.length) { say1('dead', 'Alle tot. Ohne passende Mutation gibt es keine Resistenz. Probier eine neue Schale.'); D1.running = false; }
      else if (a.length > CAP * .9 && r === a.length) say1('back', 'Die Schale ist wieder voll, jetzt nur mit resistenten Bakterien. Das Antibiotikum hat sie nicht erzeugt, nur ausgewählt.');
      else if (a.length < CAP * .3 && r === a.length) say1('few', `Übrig sind ${r} resistente Bakterien. Jetzt haben sie Platz und Nahrung für sich allein.`);
    }
    updDish();
  };

  const drawDish = dt => {
    simDish(dt);
    const { ctx, w, h } = fit(dishCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const R = Math.min(w, h) / 2 - 20, cx = w / 2, cy = h / 2 + 8;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill();
    if (D1.drug) { ctx.fillStyle = C.accent; ctx.globalAlpha = .08; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R - 7, 0, TAU); ctx.lineWidth = 1; ctx.stroke();
    const cl = small ? 3.6 : 4.4, cw = small ? 1.9 : 2.2;
    for (const c of D1.cells) {
      const x = cx + c.x * (R - 8), y = cy + c.y * (R - 8);
      ctx.beginPath(); ctx.ellipse(x, y, cl, cw, c.a, 0, TAU);
      if (c.dead) { ctx.globalAlpha = .55 * (1 - c.dead / .8); ctx.fillStyle = C.muted; }
      else ctx.fillStyle = c.res ? C.copper : C.fiber;
      ctx.fill(); ctx.globalAlpha = 1;
    }
    // Legende
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.fiber; ctx.beginPath(); ctx.ellipse(16, 16, 5, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.muted; ctx.fillText('empfindlich', 26, 20);
    ctx.fillStyle = C.copper; ctx.beginPath(); ctx.ellipse(16, 34, 5, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.muted; ctx.fillText('resistent', 26, 38);
    if (D1.drug) { ctx.textAlign = 'right'; ctx.fillStyle = C.accent; ctx.fillText('mit Antibiotikum', w - 12, 20); }
  };

  /* ---------- Teil 2: Behandlung über 14 Tage (Modell, Zeit in Stunden) ---------- */
  const cureCv = $('#cureCv');
  const M = { G: .35, CAP: 2e9, A: 60, KM: 30, KILL: [.55, .5, .45, .42, .40, .385], N0: [1e9, 1e8, 1e7, 1e6, 1e5, 1e4], SICK: 1e6, DAYS: 14 };
  const D2 = { days: 3, traj: null, play: 0, running: false, healthy: null, stopN: 0, said: '' };
  const meanTol = N => { const t = N.reduce((a, b) => a + b, 0); return t ? N.reduce((s, n, j) => s + n * j, 0) / t : 0; };
  const simulate = days => {
    const N = M.N0.slice(), out = [{ t: 0, N: N.slice() }], dt = .05;
    let healthy = null, stopN = null;
    for (let t = dt; t <= M.DAYS * 24 + 1e-9; t += dt) {
      const tot = N.reduce((a, b) => a + b, 0), drug = t <= days * 24;
      const imm = M.A / (tot + M.KM);
      for (let j = 0; j < N.length; j++) {
        N[j] *= Math.exp((M.G * (1 - tot / M.CAP) - (drug ? M.KILL[j] : 0) - imm) * dt);
        if (N[j] < .5) N[j] = 0;
      }
      const tt = N.reduce((a, b) => a + b, 0);
      if (healthy === null && tt < M.SICK) healthy = t;
      if (stopN === null && !drug) stopN = { tot: tt, mean: meanTol(N) };
      if (Math.abs(t * 2 - Math.round(t * 2)) < 1e-6) out.push({ t, N: N.slice() });
    }
    return { out, healthy, stopN };
  };
  const sampleAt = t => D2.traj ? D2.traj.out[clamp(Math.round(t * 2), 0, D2.traj.out.length - 1)] : { t: 0, N: M.N0 };
  const tol0 = meanTol(M.N0);
  $('#daysIn').addEventListener('input', e => {
    D2.days = +e.target.value; $('#daysOut').textContent = D2.days === 1 ? '1 Tag' : `${D2.days} Tage`;
    if (!D2.running) { D2.traj = null; D2.play = 0; updCure(); }
  });
  $('#cureBtn').addEventListener('click', () => {
    D2.traj = simulate(D2.days); D2.play = 0; D2.running = true; D2.said = '';
    $('#cureBtn').textContent = 'Nochmal';
    $('#cureStatus').textContent = 'Tag 0: Du bist krank und beginnst mit dem Antibiotikum.';
    if (reduced) D2.play = M.DAYS * 24;
  });
  const updCure = () => {
    const s = sampleAt(D2.play), tot = s.N.reduce((a, b) => a + b, 0);
    $('#cN').textContent = count(tot);
    $('#cDay').textContent = fmt(D2.play / 24, 1);
    $('#cTol').textContent = tot >= 1 ? fmt(meanTol(s.N), 1) : '–';
    const end = D2.traj && D2.play >= M.DAYS * 24;
    $('#cRes').textContent = !end ? '–' : tot >= 1 ? 'Rückfall' : 'geheilt';
  };
  const statusCure = () => {
    if (!D2.traj) return;
    const tr = D2.traj, t = D2.play, say = (k, x) => { if (D2.said !== k && D2.said !== 'end') { D2.said = k; $('#cureStatus').textContent = x; } };
    const end = t >= M.DAYS * 24;
    if (end) {
      const s = sampleAt(t), tot = s.N.reduce((a, b) => a + b, 0);
      say('end', tot >= 1
        ? `Rückfall: Die Infektion ist zurück, jetzt mit zäheren Bakterien. Die mittlere Zähigkeit stieg von ${fmt(tol0, 1)} auf ${fmt(meanTol(s.N), 1)}. Das nächste Mal wirkt das Mittel schlechter.`
        : `Geheilt. ${D2.days} Tage haben gereicht: Das Antibiotikum hat die Zahl so weit gesenkt, dass dein Immunsystem den Rest geschafft hat.`);
      D2.running = false;
      return;
    }
    if (t >= D2.days * 24 && tr.stopN) {
      say('stop', tr.stopN.tot >= 1
        ? `Tag ${D2.days}: Du hörst auf. Übrig sind noch etwa ${count(tr.stopN.tot)} Bakterien, fast nur zähe.`
        : `Tag ${D2.days}: Du hörst auf. Es sind keine Bakterien mehr übrig.`);
    } else if (tr.healthy !== null && t >= tr.healthy) {
      const s = sampleAt(t), tot = s.N.reduce((a, b) => a + b, 0);
      say('healthy', `Tag ${fmt(tr.healthy / 24, 1)}: Du fühlst dich gesund. Aber es leben noch rund ${count(tot)} Bakterien, und die zähen sterben am langsamsten.`);
    }
  };
  updCure();

  const drawCure = dt => {
    if (D2.running && D2.traj) { D2.play = Math.min(M.DAYS * 24, D2.play + dt * 30); updCure(); statusCure(); }
    const { ctx, w, h } = fit(cureCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 480;
    // Diagramm
    const gx = small ? 40 : 50, gy = 26;
    const gw = small ? w - gx - 14 : w * .62 - gx, gh = small ? h * .56 - gy : h - gy - 40;
    const X = d => gx + gw * d / M.DAYS, Y = lg => gy + gh - gh * clamp(lg, 0, 10) / 10;
    ctx.font = MONO; ctx.lineWidth = 1;
    // Behandlungszeit
    ctx.fillStyle = C.accent; ctx.globalAlpha = .1; ctx.fillRect(X(0), gy, X(D2.days) - X(0), gh); ctx.globalAlpha = 1;
    ctx.fillStyle = C.accent; ctx.textAlign = 'left'; ctx.fillText(small ? 'Antibiotikum' : 'mit Antibiotikum', X(0) + 4, gy + 12);
    for (let lg = 0; lg <= 10; lg += 2) {
      const y = Y(lg);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(lg === 0 ? '1' : `10${['', '', '²', '', '⁴', '', '⁶', '', '⁸', '', '¹⁰'][lg]}`, gx - 5, y + 4);
    }
    ctx.textAlign = 'center';
    for (let d = 0; d <= M.DAYS; d += 2) ctx.fillText(String(d), X(d), gy + gh + 14);
    ctx.textAlign = 'right'; ctx.fillText('Tage', gx + gw, gy + gh + 28);
    ctx.textAlign = 'left'; ctx.fillText('Bakterien', 4, 14);
    // Schwelle krank
    const ys = Y(Math.log10(M.SICK));
    ctx.strokeStyle = C.bad; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, ys); ctx.lineTo(gx + gw, ys); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.bad; ctx.textAlign = 'right'; ctx.fillText('krank', gx + gw - 2, ys - 5);
    // Kurve
    if (D2.traj) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.beginPath();
      let last = null;
      for (const s of D2.traj.out) {
        if (s.t > D2.play) break;
        const tot = s.N.reduce((a, b) => a + b, 0), lg = tot >= 1 ? Math.log10(tot) : -1;
        const x = X(s.t / 24), y = Y(lg);
        last ? ctx.lineTo(x, y) : ctx.moveTo(x, y); last = [x, y, lg];
        if (lg < 0) break;
      }
      ctx.stroke();
      if (last) { ctx.beginPath(); ctx.arc(last[0], last[1], 4, 0, TAU); ctx.fillStyle = C.fg; ctx.fill(); }
    } else {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('Drück auf «Behandlung starten»', gx + gw / 2, gy + gh * .75);
    }
    // Histogramm der Zähigkeit
    const s = sampleAt(D2.play), tot = s.N.reduce((a, b) => a + b, 0);
    const hx = small ? gx : w * .62 + 26, hy = small ? h * .56 + 34 : gy + 18;
    const hw = small ? gw : w - hx - 14, hh = small ? h - hy - 30 : h - hy - 40;
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(small ? 'Wer lebt noch? (Anteil)' : 'Wer lebt noch?', hx, hy - 8);
    const bw = hw / 6;
    for (let j = 0; j < 6; j++) {
      const share = tot >= 1 ? s.N[j] / tot : 0;
      const bh = Math.max(share > 0 ? 2 : 0, hh * share);
      ctx.fillStyle = C.copper; ctx.globalAlpha = .25 + .75 * j / 5;
      ctx.fillRect(hx + j * bw + 3, hy + hh - bh, bw - 6, bh);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(String(j), hx + j * bw + bw / 2, hy + hh + 14);
    }
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(hx, hy + hh); ctx.lineTo(hx + hw, hy + hh); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('empfindlich', hx, hy + hh + 28);
    ctx.textAlign = 'right'; ctx.fillText('zäh', hx + hw, hy + hh + 28);
    if (tot < 1) { ctx.fillStyle = C.good; ctx.textAlign = 'center'; ctx.fillText('keine Bakterien mehr', hx + hw / 2, hy + hh / 2); }
  };

  /* ---------- Teil 3: Wo greift der Wirkstoff an? ---------- */
  const targetCv = $('#targetCv');
  const AB = {
    pen: { target: 'Zellwand', info: 'Penicillin stört den Bau der Zellwand. Ohne stabile Wand platzt das wachsende Bakterium.',
      res: 'Dieses Bakterium bildet ein Enzym, die Beta-Laktamase. Es zerschneidet das Penicillin, bevor es wirkt.', done: 'geplatzt', blocked: 'zerschnitten' },
    tet: { target: 'Ribosomen', info: 'Tetracyclin blockiert die Ribosomen der Bakterien. Ohne neue Eiweisse hört das Bakterium auf zu wachsen, das Immunsystem erledigt den Rest.',
      res: 'Dieses Bakterium hat eine Pumpe in seiner Hülle. Sie pumpt das Tetracyclin gleich wieder hinaus.', done: 'wächst nicht mehr', blocked: 'hinausgepumpt' },
    cip: { target: 'Gyrase', info: 'Ciprofloxacin blockiert die Gyrase, ein Enzym, das die Erbgut-Schnur der Bakterien entwirrt. Das Erbgut zerbricht.',
      res: 'Bei diesem Bakterium ist die Gyrase durch eine Mutation leicht verändert. Der Wirkstoff passt nicht mehr hinein.', done: 'Erbgut zerbrochen', blocked: 'passt nicht' },
  };
  const T3 = { ab: 'pen', res: false, mols: [], hits: 0, blocked: 0, effect: 0, dosed: false, t: 0, vTouch: 0, hTouch: 0, said: '' };
  const RIBO = [[-.62, -.3], [-.3, .42], [0, -.48], [.36, .38], [.62, -.18], [-.12, .1], [.45, .02]];
  const GYR = [[-.22, 0], [.26, 0]];
  const layout = (w, h) => {
    const gap = 8, pw = (w - gap * 4) / 3, s = Math.min(pw * .42, 64);
    const cy = h * .52;
    return [0, 1, 2].map(i => ({ x: gap + i * (pw + gap), w: pw, cx: gap + i * (pw + gap) + pw / 2, cy, s }));
  };
  const bactDims = P => ({ bw: Math.min(P.s * 1.7, P.w - 14), bh: P.s * .85 });
  const resetT3 = () => { Object.assign(T3, { mols: [], hits: 0, blocked: 0, effect: 0, dosed: false, said: '' }); updT3(); };
  const updT3 = () => {
    const ab = AB[T3.ab];
    $('#hBf').textContent = `Ziel: ${ab.target}`;
    $('#hB').textContent = !T3.dosed ? '–' : T3.res ? (T3.blocked ? ab.blocked : 'wartet …') : T3.effect > .5 ? ab.done : T3.hits ? `${T3.hits} angedockt` : 'wartet …';
    $('#hV').textContent = T3.dosed && T3.vTouch ? 'nichts passiert' : '–';
    $('#hH').textContent = T3.dosed && T3.hTouch ? 'nichts passiert' : '–';
  };
  const showInfo = () => { $('#targetStatus').textContent = T3.res ? AB[T3.ab].res : AB[T3.ab].info; };
  $$('#abBtns button').forEach(b => b.addEventListener('click', () => {
    T3.ab = b.dataset.ab; $$('#abBtns button').forEach(x => x.classList.toggle('active', x === b)); resetT3(); showInfo();
  }));
  $$('#resBtns button').forEach(b => b.addEventListener('click', () => {
    T3.res = b.dataset.res === '1'; $$('#resBtns button').forEach(x => x.classList.toggle('active', x === b)); resetT3(); showInfo();
  }));
  $('#doseBtn').addEventListener('click', () => {
    const r = targetCv.getBoundingClientRect(), L = layout(r.width, r.height);
    resetT3(); T3.dosed = true; T3.vTouch = 0; T3.hTouch = 0;
    for (const P of L) for (let k = 0; k < 24; k++) {
      T3.mols.push({ p: L.indexOf(P), x: P.x + 8 + Math.random() * (P.w - 16), y: 30 + Math.random() * 40, vx: 0, vy: 0, st: 'free', life: 0, tx: 0, ty: 0 });
    }
    updT3();
  });
  resetT3();

  const inBact = (P, x, y) => { const { bw, bh } = bactDims(P); return ((x - P.cx) / (bw / 2)) ** 2 + ((y - P.cy) / (bh / 2)) ** 2 < 1; };
  const simT3 = (dt, w, h) => {
    if (!T3.dosed) return;
    const L = layout(w, h);
    const sp = reduced ? 3 : 1;
    for (const m of T3.mols) {
      m.life += dt;
      if (m.st === 'bound' || m.st === 'cut') continue;
      const P = L[m.p];
      m.vx += (Math.random() - .5) * 260 * dt; m.vy += (Math.random() - .5) * 260 * dt;
      m.vx *= .92; m.vy *= .92;
      const drift = m.st === 'out' ? -26 : 26;
      m.x += (m.vx) * dt * sp; m.y += (m.vy + drift) * dt * sp;
      if (m.x < P.x + 4) { m.x = P.x + 4; m.vx = Math.abs(m.vx); }
      if (m.x > P.x + P.w - 4) { m.x = P.x + P.w - 4; m.vx = -Math.abs(m.vx); }
      if (m.y > h - 8) { m.y = 30; m.x = P.x + 8 + Math.random() * (P.w - 16); }
      if (m.st === 'out' && m.y < 24) { m.st = 'free2'; m.y = 24; }
      if (m.p === 0 && m.st === 'free' && T3.effect < .5 && inBact(P, m.x, m.y)) {
        const { bw, bh } = bactDims(P);
        if (!T3.res) {
          m.st = 'bound'; T3.hits++;
          if (T3.ab === 'pen') { const a = Math.random() * TAU; m.tx = P.cx + bw / 2 * Math.cos(a); m.ty = P.cy + bh / 2 * Math.sin(a); }
          else { const q = (T3.ab === 'tet' ? RIBO : GYR)[Math.floor(Math.random() * (T3.ab === 'tet' ? RIBO.length : GYR.length))]; m.tx = P.cx + q[0] * bw / 2 + (Math.random() - .5) * 4; m.ty = P.cy + q[1] * bh / 2 + (Math.random() - .5) * 4; }
          m.x = m.tx; m.y = m.ty;
        } else {
          T3.blocked++;
          if (T3.ab === 'pen') { m.st = 'cut'; m.life = 0; }
          else if (T3.ab === 'tet') { m.st = 'out'; m.vy = -40; }
          else m.st = 'pass';
        }
      }
      if (m.p === 1 && Math.hypot(m.x - P.cx, m.y - P.cy) < P.s * .5 + 4) {
        // abprallen: nichts zum Andocken
        const a = Math.atan2(m.y - P.cy, m.x - P.cx); m.x = P.cx + Math.cos(a) * (P.s * .5 + 5); m.y = P.cy + Math.sin(a) * (P.s * .5 + 5);
        m.vx = Math.cos(a) * 40; m.vy = Math.sin(a) * 40; T3.vTouch++;
      }
      if (m.p === 2 && Math.hypot(m.x - P.cx, m.y - P.cy) < Math.min(P.s * .95, P.w / 2 - 6)) T3.hTouch++;
    }
    T3.mols = T3.mols.filter(m => !(m.st === 'cut' && m.life > 1));
    if (!T3.res && T3.hits >= 8) T3.effect = Math.min(1, T3.effect + dt * (reduced ? 3 : .7));
    const ab = AB[T3.ab];
    if (T3.effect >= 1 && T3.said !== 'done') {
      T3.said = 'done';
      $('#targetStatus').textContent = `Das Bakterium ist erledigt (${ab.done}). Am Virus fand der Wirkstoff nichts zum Andocken, und deine Körperzelle hat keine passende Angriffsstelle.`;
    }
    if (T3.res && T3.blocked >= 6 && T3.said !== 'res') {
      T3.said = 'res';
      $('#targetStatus').textContent = `${ab.res} Das Bakterium lebt weiter.`;
    }
    updT3();
  };

  const drawBact = (ctx, P, now) => {
    const { bw, bh } = bactDims(P), cx = P.cx, cy = P.cy;
    const e = T3.effect, burst = T3.ab === 'pen' && e > .55;
    const tgt = !T3.dosed || T3.effect < 1;
    // Geissel
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath();
    const ph = reduced || e > 0 ? 0 : now / 200;
    for (let i = 0; i <= 20; i++) { const x = cx + bw / 2 + i * 1.6, y = cy + Math.sin(i * .7 + ph) * 3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    if (!burst) ctx.stroke();
    if (burst) {
      // Bruchstücke fliegen weg
      const k = (e - .55) / .45;
      ctx.fillStyle = C.fiber; ctx.globalAlpha = .7 * (1 - k);
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (bw / 2) * (1 + k), cy + Math.sin(a) * (bh / 2) * (1 + k * 1.6), 3, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillText('geplatzt', cx, cy + 4);
      return;
    }
    const sc = T3.ab === 'pen' ? 1 + e * .12 : 1;
    roundRect(ctx, cx - bw / 2 * sc, cy - bh / 2 * sc, bw * sc, bh * sc, bh / 2 * sc);
    ctx.fillStyle = T3.ab === 'tet' && e > 0 ? C.sunk : C.fiber;
    ctx.globalAlpha = T3.ab === 'tet' && e > 0 ? 1 : .22; ctx.fill(); ctx.globalAlpha = 1;
    // Zellwand
    ctx.lineWidth = 4; ctx.strokeStyle = T3.ab === 'pen' && tgt ? C.glow : C.fiber;
    if (T3.ab === 'pen' && e > 0) ctx.setLineDash([10 * (1 - e) + 2, 4 + 10 * e]);
    ctx.stroke(); ctx.setLineDash([]);
    // Erbgut
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1.6; ctx.beginPath();
    const broken = T3.ab === 'cip' && e > 0;
    for (let i = 0; i <= 40; i++) {
      const u = -.55 + 1.1 * i / 40, x = cx + u * bw / 2, y = cy + Math.sin(i * .9) * bh * .12;
      if (broken && i % 8 === 0) { ctx.moveTo(x + e * 4, y + e * 6 * Math.sin(i)); continue; }
      i ? ctx.lineTo(x, y + (broken ? e * 5 * Math.sin(Math.floor(i / 8) * 2) : 0)) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    // Ribosomen
    for (const [u, v] of RIBO) {
      ctx.beginPath(); ctx.arc(cx + u * bw / 2, cy + v * bh / 2, 2.6, 0, TAU);
      ctx.fillStyle = T3.ab === 'tet' && tgt ? C.glow : C.fg; ctx.fill();
    }
    // Gyrase
    for (const [u, v] of GYR) {
      ctx.beginPath(); ctx.arc(cx + u * bw / 2, cy + v * bh / 2, 3.6, 0, TAU);
      ctx.strokeStyle = T3.ab === 'cip' && tgt ? C.glow : C.muted; ctx.lineWidth = 2; ctx.stroke();
    }
    // Pumpe oder Enzym bei Resistenz
    if (T3.res) {
      ctx.fillStyle = C.bad;
      if (T3.ab === 'tet') { roundRect(ctx, cx - 4, cy - bh / 2 - 5, 8, 10, 2); ctx.fill(); }
      if (T3.ab === 'pen') for (const [u, v] of [[-.7, .5], [.7, -.5], [0, .7]]) { ctx.beginPath(); ctx.arc(cx + u * bw / 2, cy + v * bh / 2, 3, 0, TAU); ctx.fill(); }
      if (T3.ab === 'cip') for (const [u, v] of GYR) { ctx.beginPath(); ctx.arc(cx + u * bw / 2, cy + v * bh / 2, 2, 0, TAU); ctx.fill(); }
    }
    if (T3.ab === 'tet' && e > .5) { ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillText('gestoppt', cx, cy - bh / 2 - 10); }
  };
  const drawVirus = (ctx, P) => {
    const r = P.s * .5, cx = P.cx, cy = P.cy;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7)); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8), 2, 0, TAU); ctx.fillStyle = C.muted; ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU * 1.5, rr = r * (.2 + .35 * i / 24); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  };
  const drawHuman = (ctx, P) => {
    const r = Math.min(P.s * .95, P.w / 2 - 6), cx = P.cx, cy = P.cy;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = C.copper; ctx.globalAlpha = .1; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r * .1, cy, r * .34, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.muted; ctx.stroke();
    ctx.fillStyle = C.muted;
    for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = r * (.55 + .3 * ((i * 37) % 10) / 10); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.2, 0, TAU); ctx.fill(); }
  };
  const drawTarget = (dt, now) => {
    const { ctx, w, h } = fit(targetCv);
    simT3(dt, w, h);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420, L = layout(w, h);
    const titles = ['Bakterium', 'Virus', small ? 'Körperzelle' : 'Körperzelle'];
    const notes = small ? ['3 Ziele', 'keine Ziele', 'keine Wand'] : ['Wand, Ribosomen, Gyrase', 'Hülle und Erbgut', 'keine Zellwand'];
    L.forEach((P, i) => {
      ctx.fillStyle = C.sunk; roundRect(ctx, P.x, 8, P.w, h - 16, 12); ctx.fill();
      ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.fillText(titles[i], P.cx, 26);
      ctx.fillStyle = C.muted; ctx.fillText(notes[i], P.cx, h - 18);
    });
    drawBact(ctx, L[0], now); drawVirus(ctx, L[1]); drawHuman(ctx, L[2]);
    // Wirkstoff-Teilchen
    for (const m of T3.mols) {
      if (m.st === 'cut') {
        ctx.strokeStyle = C.muted; ctx.globalAlpha = 1 - m.life; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(m.x - 4 - m.life * 6, m.y); ctx.lineTo(m.x - 1 - m.life * 6, m.y + 2); ctx.moveTo(m.x + 1 + m.life * 6, m.y); ctx.lineTo(m.x + 4 + m.life * 6, m.y - 2); ctx.stroke();
        ctx.globalAlpha = 1; continue;
      }
      if (m.p === 0 && T3.ab === 'pen' && T3.effect > .55 && m.st === 'bound') continue;
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.moveTo(m.x, m.y - 3.5); ctx.lineTo(m.x + 3, m.y); ctx.lineTo(m.x, m.y + 3.5); ctx.lineTo(m.x - 3, m.y); ctx.closePath(); ctx.fill();
    }
    if (!T3.dosed) { ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillText(small ? 'Leuchtend: Ziel' : 'Leuchtend markiert: das Ziel des Wirkstoffs', w / 2, 46); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('resistenz', 4, {
    dishLock: () => { $('#mutIn').disabled = false; $('#growBtn').disabled = false; },
    cureLock: () => { $('#daysIn').disabled = false; $('#cureBtn').disabled = false; },
    targetLock: () => { $$('#abBtns button, #resBtns button').forEach(b => b.disabled = false); $('#doseBtn').disabled = false; },
  });

  loop((dt, now) => { drawDish(dt); drawCure(dt); drawTarget(dt, now); });
})();
