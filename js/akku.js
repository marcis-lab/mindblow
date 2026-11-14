/* mindblow – Lektion Akku */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';

  /* ---------- Teil 1: Querschnitt mit Ionen und Elektronen ---------- */
  const cellCv = $('#cellCv');
  const N = 20, ROWS = 4, COLS = 6, SLOTS = ROWS * COLS, TRAVEL = 1.6;
  const CELL = { mode: 'idle', timer: 0, ions: [], electrons: [], lamp: 0 };
  {
    const pick = n => { const a = [...Array(SLOTS).keys()]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
    pick(N / 2).forEach(s => CELL.ions.push({ side: 'a', slot: s, mv: null }));
    pick(N / 2).forEach(s => CELL.ions.push({ side: 'c', slot: s, mv: null }));
  }
  const inSide = side => CELL.ions.filter(i => !i.mv && i.side === side);
  const used = side => new Set(CELL.ions.filter(i => (i.mv ? i.mv.to : i.side) === side).map(i => i.mv ? i.mv.toSlot : i.slot));
  const socOf = () => inSide('a').length / N;
  const voltOf = s => s < .1 ? 3.0 + 4 * s : 3.4 + .8 * (s - .1) / .9;   // grob, eine Zelle
  const updCell = () => {
    const n = inSide('a').length, s = n / N;
    $('#cSoc').textContent = `${fmt(s * 100, 0)} %`;
    $('#cIons').textContent = `${n} von ${N}`;
    $('#cVolt').textContent = `${fmt(voltOf(s), 1)} V`;
  };
  const setMode = m => {
    CELL.mode = m; CELL.timer = 0;
    $('#chgBtn').classList.toggle('ghost', m !== 'chg');
    $('#disBtn').classList.toggle('ghost', m !== 'dis');
    $('#chgBtn').textContent = m === 'chg' ? 'Laden stoppen' : 'Laden';
    $('#disBtn').textContent = m === 'dis' ? 'Gerät ausschalten' : 'Entladen';
    $('#cellStatus').textContent = {
      chg: 'Laden: Das Ladegerät drückt Elektronen aussen zur Anode. Die Lithium-Ionen wandern innen durch den Elektrolyt hinterher.',
      dis: 'Entladen: Die Ionen wandern zurück zur Kathode. Ihre Elektronen müssen aussen herum, durch das Gerät. Die Lampe leuchtet.',
      idle: 'Pause: Nichts bewegt sich. Die Energie bleibt in der Anordnung der Ionen stecken.',
      full: 'Voll: Alle Lithium-Ionen sitzen im Graphit. Das Ladegerät hört auf.',
      empty: 'Leer: Alle Ionen sind zurück in der Kathode. Es gibt nichts mehr zu holen.',
    }[m];
    if (m === 'full' || m === 'empty') {
      CELL.mode = 'idle';
      $('#chgBtn').classList.add('ghost'); $('#disBtn').classList.add('ghost');
      $('#chgBtn').textContent = 'Laden'; $('#disBtn').textContent = 'Entladen';
    }
  };
  $('#chgBtn').addEventListener('click', () => setMode(CELL.mode === 'chg' ? 'idle' : 'chg'));
  $('#disBtn').addEventListener('click', () => setMode(CELL.mode === 'dis' ? 'idle' : 'dis'));
  updCell();

  const stepCell = dt => {
    // neue Ionen auf die Reise schicken
    if (CELL.mode !== 'idle') {
      const from = CELL.mode === 'chg' ? 'c' : 'a', to = CELL.mode === 'chg' ? 'a' : 'c';
      CELL.timer -= dt;
      if (CELL.timer <= 0) {
        CELL.timer = .6;
        const cand = inSide(from);
        if (!cand.length) {
          if (!CELL.ions.some(i => i.mv)) setMode(CELL.mode === 'chg' ? 'full' : 'empty');
        } else {
          const ion = cand[Math.floor(Math.random() * cand.length)];
          const busy = used(to), free = [...Array(SLOTS).keys()].filter(s => !busy.has(s));
          const toSlot = free[Math.floor(Math.random() * free.length)];
          ion.mv = { from, fromSlot: ion.slot, to, toSlot, t: reduced ? 1 : 0, wob: Math.random() * TAU };
          if (!reduced) CELL.electrons.push({ t: 0, dir: CELL.mode === 'dis' ? 1 : -1 });
        }
      }
    }
    // unterwegs
    let changed = false;
    for (const ion of CELL.ions) {
      if (!ion.mv) continue;
      ion.mv.t += dt / TRAVEL;
      if (ion.mv.t >= 1) { ion.side = ion.mv.to; ion.slot = ion.mv.toSlot; ion.mv = null; changed = true; }
    }
    for (const e of CELL.electrons) e.t += dt / TRAVEL;
    CELL.electrons = CELL.electrons.filter(e => e.t < 1);
    if (changed) updCell();
    const target = CELL.mode === 'dis' ? 1 : 0;
    CELL.lamp += (target - CELL.lamp) * Math.min(1, dt * 5);
  };

  const drawCell = dt => {
    stepCell(dt);
    const { ctx, w, h } = fit(cellCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const x0 = 14, x1 = w - 14, W = x1 - x0;
    const wireY = 34, cy0 = 96, cy1 = h - 44;
    const ew = W * (narrow ? .33 : .3);
    const A = [x0, x0 + ew], K = [x1 - ew, x1];
    const aMid = (A[0] + A[1]) / 2, kMid = (K[0] + K[1]) / 2;
    const slotXY = (side, s) => {
      const [sx0, sx1] = side === 'a' ? A : K, r = Math.floor(s / COLS), c = s % COLS;
      return [sx0 + (sx1 - sx0) * (c + .5) / COLS, cy0 + (cy1 - cy0) * (r + .5) / ROWS];
    };

    // Elektrolyt und Gehäuse
    roundRect(ctx, x0, cy0, W, cy1 - cy0, 10); ctx.fillStyle = C.sunk; ctx.fill();
    // Anode: Graphitschichten
    ctx.fillStyle = C.surface; ctx.fillRect(A[0], cy0, ew, cy1 - cy0);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
    for (let i = 0; i <= ROWS; i++) {
      const y = lerp(cy0 + 3, cy1 - 3, i / ROWS);
      ctx.beginPath();
      for (let x = A[0] + 4; x <= A[1] - 4; x += 4) { const yy = y + Math.sin(x * .45) * 1.2; x === A[0] + 4 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
    }
    // Kathode: Metalloxid-Gitter
    ctx.fillStyle = C.surface; ctx.fillRect(K[0], cy0, ew, cy1 - cy0);
    ctx.save(); ctx.beginPath(); ctx.rect(K[0] + 2, cy0 + 2, ew - 4, cy1 - cy0 - 4); ctx.clip();
    ctx.fillStyle = C.copper; ctx.globalAlpha = .55;
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) {
      const x = K[0] + ew * c / COLS, y = cy0 + (cy1 - cy0) * r / ROWS;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
    ctx.restore();
    // Rahmen
    roundRect(ctx, x0, cy0, W, cy1 - cy0, 10); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(A[1], cy0); ctx.lineTo(A[1], cy1); ctx.moveTo(K[0], cy0); ctx.lineTo(K[0], cy1); ctx.stroke();
    // Separator
    ctx.setLineDash([5, 5]); ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w / 2, cy0 + 4); ctx.lineTo(w / 2, cy1 - 4); ctx.stroke();
    ctx.setLineDash([]);

    // Äussere Leitung
    const path = [[aMid, cy0], [aMid, wireY], [kMid, wireY], [kMid, cy0]];
    ctx.strokeStyle = C.copper; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    // Gerät oder Ladegerät
    const dx = w / 2, chg = CELL.mode === 'chg';
    if (chg) {
      roundRect(ctx, dx - 34, wireY - 15, 68, 30, 7); ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('⚡ Netz', dx, wireY + 4);
    } else {
      if (CELL.lamp > .02) {
        const g = ctx.createRadialGradient(dx, wireY, 2, dx, wireY, 46);
        g.addColorStop(0, C.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = CELL.lamp * .8; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(dx, wireY, 46, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(dx, wireY, 14, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
      ctx.globalAlpha = CELL.lamp; ctx.fillStyle = C.glow; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx - 7, wireY - 7); ctx.lineTo(dx + 7, wireY + 7); ctx.moveTo(dx + 7, wireY - 7); ctx.lineTo(dx - 7, wireY + 7); ctx.stroke();
    }
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText(chg ? 'Ladegerät' : 'Gerät', dx, wireY + (chg ? 28 : 28));

    // Elektronen auf der Leitung
    const segs = [], tot = (() => { let s = 0; for (let i = 0; i < 3; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segs.push(l); s += l; } return s; })();
    const along = k => {
      let d = k * tot, i = 0;
      while (i < 2 && d > segs[i]) { d -= segs[i]; i++; }
      const q = clamp(d / segs[i], 0, 1);
      return [lerp(path[i][0], path[i + 1][0], q), lerp(path[i][1], path[i + 1][1], q)];
    };
    for (const e of CELL.electrons) {
      const k = e.dir > 0 ? e.t : 1 - e.t;
      const [x, y] = along(k);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fillStyle = C.fiber; ctx.fill();
      ctx.fillStyle = C.bg; ctx.font = `600 9px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('−', x, y + 3);
    }
    // Richtungspfeil Elektronen
    if (CELL.mode !== 'idle') {
      const right = CELL.mode === 'dis';
      ctx.fillStyle = C.fiber; ctx.font = `500 11px ${MONO}`;
      ctx.textAlign = 'center';
      const lx = lerp(aMid, dx, .5), rx = lerp(dx, kMid, .5);
      ctx.fillText(right ? 'e⁻ →' : '← e⁻', narrow ? rx : lx, wireY - 10);
      if (!narrow) ctx.fillText(right ? 'e⁻ →' : '← e⁻', rx, wireY - 10);
    }

    // Ionen
    const drawIon = (x, y, moving) => {
      ctx.beginPath(); ctx.arc(x, y, moving ? 7 : 6, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
    };
    for (const ion of CELL.ions) {
      if (ion.mv) continue;
      const [x, y] = slotXY(ion.side, ion.slot); drawIon(x, y, false);
    }
    for (const ion of CELL.ions) {
      if (!ion.mv) continue;
      const [fx, fy] = slotXY(ion.mv.from, ion.mv.fromSlot), [tx, ty] = slotXY(ion.mv.to, ion.mv.toSlot);
      const k = ease(clamp(ion.mv.t, 0, 1));
      drawIon(lerp(fx, tx, k), lerp(fy, ty, k) + Math.sin(k * Math.PI * 3 + ion.mv.wob) * 6 * Math.sin(k * Math.PI), true);
    }
    if (CELL.mode !== 'idle') {
      ctx.fillStyle = C.accent; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(CELL.mode === 'dis' ? 'Li⁺ →' : '← Li⁺', w / 2, cy0 + 16);
    }

    // Beschriftung
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Anode −' : 'Anode (−)', aMid, cy0 - 8);
    ctx.fillText(narrow ? 'Kathode +' : 'Kathode (+)', kMid, cy0 - 8);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText('Graphit', aMid, cy1 + 16);
    ctx.fillText('Metalloxid', kMid, cy1 + 16);
    ctx.fillText('Elektrolyt', w / 2, cy1 + 16);
    ctx.fillText('Separator', w / 2, cy1 + 30);
    // Ladebalken
    const s = socOf(), bw = narrow ? 70 : 90;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Ladung' : 'Ladezustand', x0, 14);
    roundRect(ctx, x0, 20, bw, 9, 4); ctx.fillStyle = C.sunk; ctx.fill();
    if (s > 0) { roundRect(ctx, x0, 20, Math.max(9, bw * s), 9, 4); ctx.fillStyle = s < .15 ? C.bad : C.good; ctx.fill(); }
  };

  /* ---------- Teil 2: Wie viel Energie ---------- */
  const energyCv = $('#energyCv');
  const VNOM = 3.8;
  const E = { mah: 4500, kwh: 60, lamp: 'led', shown: 0 };
  const LAMP = { led: { w: 8, name: 'LED' }, bulb: { w: 60, name: 'Glühbirne' } };
  const dur = hrs => hrs < 1 ? `${fmt(hrs * 60, 0)} min`
    : hrs < 48 ? `${fmt(hrs, hrs < 10 ? 1 : 0)} h`
    : hrs < 24 * 60 ? `${fmt(hrs / 24, 0)} Tage`
    : hrs < 24 * 730 ? `${fmt(hrs / 24 / 30.4, 0)} Monate`
    : `${fmt(hrs / 24 / 365, 1)} Jahre`;
  const phoneWh = () => VNOM * E.mah / 1000;
  const ratio = () => E.kwh * 1000 / phoneWh();
  const updEnergy = () => {
    const wh = phoneWh(), lw = LAMP[E.lamp].w;
    $('#mahOut').textContent = `${fmt(E.mah, 0)} mAh`;
    $('#kwhOut').textContent = `${E.kwh} kWh`;
    $('#eWh').textContent = `${fmt(wh, 1)} Wh`;
    $('#eWhF').textContent = `${fmt(VNOM, 1)} V × ${fmt(E.mah / 1000, 1)} Ah`;
    $('#eN').textContent = fmt(Math.round(ratio()), 0);
    $('#eT').textContent = dur(E.kwh * 1000 / lw);
    $('#eTF').textContent = `${fmt(E.kwh * 1000, 0)} Wh ÷ ${lw} W`;
  };
  $('#mahIn').addEventListener('input', e => { E.mah = +e.target.value; updEnergy(); });
  $('#kwhIn').addEventListener('input', e => { E.kwh = +e.target.value; updEnergy(); });
  $$('#lampSel button').forEach(b => b.addEventListener('click', () => {
    E.lamp = b.dataset.l;
    $$('#lampSel button').forEach(x => x.classList.toggle('active', x === b));
    $('#energyStatus').textContent = E.lamp === 'led'
      ? 'Die LED braucht für gleich viel Licht nur einen Bruchteil der Energie.'
      : 'Die Glühbirne macht vor allem Wärme. Nur ein kleiner Teil ihrer Energie wird Licht.';
    updEnergy();
  }));
  updEnergy();

  const drawEnergy = dt => {
    const { ctx, w, h } = fit(energyCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const x0 = 16, x1 = w - 16;
    const n = ratio(), dots = Math.round(n / 10);
    E.shown = reduced ? dots : E.shown + (dots - E.shown) * Math.min(1, dt * 3);
    const show = Math.round(E.shown);

    // Kopfzeile
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
    ctx.fillText(`1 E-Auto-Akku · ${E.kwh} kWh`, x0, 18);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    if (narrow) ctx.fillText(`= ${fmt(Math.round(n), 0)} Handy-Akkus`, x0, 34);
    else { ctx.textAlign = 'right'; ctx.fillText(`= ${fmt(Math.round(n), 0)} Handy-Akkus à ${fmt(phoneWh(), 1)} Wh`, x1, 18); }

    // Raster: jedes Symbol = 10 Handy-Akkus
    const gy0 = narrow ? 46 : 32, gy1 = h * .64;
    const gw = x1 - x0, gh = gy1 - gy0;
    const pitch = clamp(Math.floor(Math.sqrt(gw * gh / Math.max(dots, 1) * .8)), 6, 22);
    const cols = Math.floor(gw / pitch);
    const pw = pitch * .5, ph = pitch * .78;
    ctx.fillStyle = C.accent;
    for (let i = 0; i < show; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = x0 + c * pitch + (pitch - pw) / 2, y = gy0 + r * pitch + (pitch - ph) / 2;
      if (y + ph > gy1 + pitch) break;
      ctx.fillRect(x, y, pw, ph);
    }
    // Legende
    ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillStyle = C.accent; ctx.fillRect(x0, gy1 + 10, pw, ph);
    ctx.fillStyle = C.muted; ctx.fillText('= 10 Handy-Akkus', x0 + pw + 6, gy1 + 10 + ph - 1);

    // Lampe
    const ly = h * .84, lx = x0 + 26;
    const lw = LAMP[E.lamp].w, glow = .55 + .25 * (reduced ? 1 : (Math.sin(performance.now() / 600) + 1) / 2);
    const g = ctx.createRadialGradient(lx, ly - 4, 2, lx, ly - 4, 38);
    g.addColorStop(0, C.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = glow; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly - 4, 38, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(lx, ly - 6, 13, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    ctx.fillStyle = C.muted; ctx.fillRect(lx - 7, ly + 7, 14, 9);
    // Leuchtdauer
    const tx = lx + 44;
    ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(`${LAMP[E.lamp].name}, ${lw} W, leuchtet`, tx, ly - 20);
    ctx.font = `500 12px ${MONO}`; ctx.fillStyle = C.fg;
    ctx.fillText(`${narrow ? 'Handy' : 'mit 1 Handy-Akku'}: ${dur(phoneWh() / lw)}`, tx, ly - 2);
    ctx.fillText(`${narrow ? 'E-Auto' : 'mit 1 E-Auto-Akku'}: ${dur(E.kwh * 1000 / lw)}`, tx, ly + 16);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText('ohne Verluste gerechnet', tx, ly + 32);
  };

  /* ---------- Teil 3: Alterung (Modell) ---------- */
  const ageCv = $('#ageCv');
  const MAXN = 2000, K0 = 20 / Math.pow(600, .8);     // Referenz: 80 % nach rund 600 vollen Zyklen
  const RANGE = [{ f: 1, use: 1, txt: '0 bis 100 %' }, { f: .65, use: .8, txt: '10 bis 90 %' }, { f: .4, use: .6, txt: '20 bis 80 %' }];
  const A = { temp: 25, range: 0, n: 0 };
  const fT = t => t >= 25 ? Math.pow(2, (t - 25) / 10) : 1 - .015 * (25 - t);
  const factor = () => fT(A.temp) * RANGE[A.range].f;
  const cap = (n, f = factor()) => 100 - K0 * f * Math.pow(n, .8);
  const n80 = (f = factor()) => Math.pow(20 / (K0 * f), 1 / .8);
  const updAge = () => {
    $('#tempOut').textContent = `${A.temp} °C`;
    $('#aAfter').textContent = `${fmt(clamp(cap(500), 0, 100), 0)} %`;
    const m = n80();
    $('#a80').textContent = m > 5000 ? 'über 5\'000' : `${fmt(Math.round(m / 10) * 10, 0)} Zyklen`;
    $('#aCmp').textContent = `× ${fmt(m / n80(1), 1)}`;
    const msg = [];
    if (A.temp >= 38) msg.push('Sehr heiss: etwa ein Handy in der prallen Sonne oder beim Spielen am Ladekabel. Die Nebenreaktionen laufen viel schneller.');
    else if (A.temp >= 32) msg.push('Warm: Faustregel aus dem Labor, je rund 10 °C mehr altert ein Akku etwa doppelt so schnell (vereinfacht).');
    else if (A.temp < 20) msg.push('Kühl altert der Akku langsamer. Laden bei Frost kann ihm aber schaden.');
    if (A.range > 0) msg.push(`Dafür nutzt du pro Ladung nur rund ${fmt(RANGE[A.range].use * 100, 0)} % der Kapazität.`);
    $('#ageStatus').textContent = msg.length ? msg.join(' ') : 'Modell, stark vereinfacht. Echte Akkus unterscheiden sich stark.';
  };
  $('#tempIn').addEventListener('input', e => { A.temp = +e.target.value; updAge(); });
  $$('#rangeSel button').forEach(b => b.addEventListener('click', () => {
    A.range = +b.dataset.r;
    $$('#rangeSel button').forEach(x => x.classList.toggle('active', x === b));
    updAge();
  }));
  updAge();

  const drawAge = dt => {
    const { ctx, w, h } = fit(ageCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const gx0 = 40, gx1 = w - 14, gy0 = 74, gy1 = h - 40;
    const YMIN = 50;
    const GX = n => gx0 + n / MAXN * (gx1 - gx0), GY = c => gy1 - (c - YMIN) / (100 - YMIN) * (gy1 - gy0);
    // Achsen
    ctx.font = `10px ${MONO}`; ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right';
    for (const c of [50, 60, 70, 80, 90, 100]) {
      ctx.beginPath(); ctx.moveTo(gx0, GY(c)); ctx.lineTo(gx1, GY(c)); ctx.stroke();
      ctx.fillText(`${c} %`, gx0 - 5, GY(c) + 3);
    }
    ctx.textAlign = 'center';
    for (let n = 0; n <= MAXN; n += narrow ? 1000 : 500) { ctx.textAlign = n === MAXN ? 'right' : 'center'; ctx.fillText(fmt(n, 0), GX(n) + (n === MAXN ? 2 : 0), gy1 + 14); }
    ctx.textAlign = 'center';
    ctx.fillText('Ladezyklen (volle Ladungen umgerechnet)', (gx0 + gx1) / 2, gy1 + 30);
    ctx.textAlign = 'left'; ctx.fillText('Kapazität', gx0, gy0 - 10);
    // 80-%-Linie
    ctx.strokeStyle = C.bad; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx0, GY(80)); ctx.lineTo(gx1, GY(80)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.bad; ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'oft «verbraucht»' : 'ab hier gilt ein Akku oft als verbraucht', gx1, GY(80) - 5);
    // Kurven
    const curve = (f, col, wd, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 200; i++) {
        const n = MAXN * i / 200, c = cap(n, f);
        if (c < YMIN) { if (started) { ctx.lineTo(GX(n), GY(YMIN)); } break; }
        started ? ctx.lineTo(GX(n), GY(c)) : ctx.moveTo(GX(n), GY(c)); started = true;
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(1, C.muted, 1.5, [5, 4]);
    curve(factor(), C.accent, 3, []);
    // Legende oben links
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 10); ctx.lineTo(30, 10); ctx.stroke();
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(14, 26); ctx.lineTo(30, 26); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.accent; ctx.fillText(`deine Wahl: ${A.temp} °C, ${RANGE[A.range].txt}`, 36, 14);
    ctx.fillStyle = C.muted; ctx.fillText('Vergleich: 25 °C, 0 bis 100 %', 36, 30);

    // Laufender Punkt
    if (!reduced) A.n = (A.n + dt * 320) % (MAXN + 300);
    const n = reduced ? 1000 : Math.min(A.n, MAXN);
    const c = cap(n);
    if (c >= YMIN) {
      ctx.beginPath(); ctx.arc(GX(n), GY(c), 5, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
    }
    // Batterie-Symbol oben rechts
    const bw = 50, bh = 20, bx = w - 18 - bw, by = 4;
    roundRect(ctx, bx, by, bw, bh, 4); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.fillRect(bx + bw, by + bh / 2 - 4, 3, 8);
    const cc = clamp(c, 0, 100);
    ctx.fillStyle = cc < 80 ? C.bad : C.good;
    ctx.fillRect(bx + 3, by + 3, (bw - 6) * cc / 100, bh - 6);
    ctx.textAlign = 'right'; ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg;
    ctx.fillText(`${fmt(cc, 0)} % nach ${fmt(Math.round(n / 10) * 10, 0)} Zyklen`, w - 14, by + bh + 21);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('akku', 4, {
    cellLock: () => { ['#chgBtn', '#disBtn'].forEach(s => $(s).disabled = false); },
    energyLock: () => { ['#mahIn', '#kwhIn'].forEach(s => $(s).disabled = false); $$('#lampSel button').forEach(b => b.disabled = false); },
    ageLock: () => { $('#tempIn').disabled = false; $$('#rangeSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawCell(dt); drawEnergy(dt); drawAge(dt); });
})();
