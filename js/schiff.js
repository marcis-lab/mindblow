/* mindblow – Lektion Schiff */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const G = 9.81;
  const MONO = '11px Geist Mono, monospace';
  const nTxt = F => `${fmt(F, F < 10 ? 2 : F < 100 ? 1 : 0)} N`;

  // Pfeil von (x, y1) nach (x, y2)
  const arrow = (ctx, x, y1, y2, col, lw = 3) => {
    if (Math.abs(y2 - y1) < 3) return;
    const dir = Math.sign(y2 - y1), hd = Math.min(9, Math.abs(y2 - y1));
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2 - dir * hd * .8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 6, y2 - dir * hd); ctx.lineTo(x + 6, y2 - dir * hd); ctx.closePath(); ctx.fill();
  };

  /* ---------- Teil 1: Würfel im Becken ---------- */
  const tankCv = $('#tankCv');
  const RW = 1000;                              // Süsswasser, kg/m³
  const TW = .5, TD = .3, TH = .45, H0 = .26;   // Becken: Breite, Tiefe, Höhe, Wasserstand leer (m)
  const AT = TW * TD;
  const MAT = { 240: 'Kork', 600: 'Holz', 920: 'Eis', 7850: 'Stahl' };
  const T = { rho: 600, a: .12, y: TH + .02, v: 0, running: false, calm: 0, done: false };
  const subD = () => clamp((H0 - T.y) / (1 - T.a * T.a / AT), 0, T.a);   // eingetauchte Höhe, Wasserstand steigt mit
  const level = () => H0 + T.a * T.a * subD() / AT;
  const mass = () => T.rho * T.a ** 3;
  const updTank = () => {
    const d = subD();
    $('#sizeOut').textContent = `${Math.round(T.a * 100)} cm`;
    $('#tW').textContent = nTxt(mass() * G);
    $('#tB').textContent = nTxt(RW * G * T.a * T.a * d);
    $('#tV').textContent = `${fmt(T.a * T.a * d * 1000, T.a * T.a * d * 1000 < 10 ? 2 : 1)} L`;
  };
  const tankMsg = () => {
    const d = subD(), m = mass();
    if (T.y <= 1e-4 && d >= T.a - 1e-6) {
      const vol = T.a ** 3 * 1000;
      $('#tankStatus').textContent = `Gesunken. Ganz untergetaucht verdrängt der Würfel ${fmt(vol, 1)} L Wasser, also ${fmt(vol, 1)} kg. Er selbst wiegt aber ${fmt(m, 1)} kg.`;
    } else {
      $('#tankStatus').textContent = `Schwimmt. ${fmt(d / T.a * 100, 0)} % des Würfels sind unter Wasser. Das verdrängte Wasser wiegt ${fmt(m, m < 1 ? 2 : 1)} kg, genau so viel wie der Würfel.`;
    }
  };
  const resetCube = () => { Object.assign(T, { y: TH + .02, v: 0, running: false, calm: 0, done: false }); updTank(); };
  $$('#matBtns button').forEach(b => b.addEventListener('click', () => {
    T.rho = +b.dataset.rho; $$('#matBtns button').forEach(x => x.classList.toggle('active', x === b)); resetCube();
    $('#tankStatus').textContent = `${MAT[T.rho]}: ${fmt(T.rho, 0)} kg pro m³. Wasser: 1'000 kg pro m³. Lass ihn fallen.`;
  }));
  $('#sizeIn').addEventListener('input', e => {
    T.a = +e.target.value / 100; resetCube();
    $('#tankStatus').textContent = `Würfel mit ${Math.round(T.a * 100)} cm Kantenlänge, ${fmt(mass(), mass() < 1 ? 2 : 1)} kg schwer. Lass ihn fallen.`;
  });
  $('#dropBtn').addEventListener('click', () => {
    resetCube(); T.running = true; $('#tankStatus').textContent = 'Platsch …';
    if (reduced) { // gleich in die Ruhelage
      const dEq = T.rho / RW * T.a;
      T.y = dEq >= T.a ? 0 : H0 - dEq * (1 - T.a * T.a / AT);
      T.running = false; T.done = true; updTank(); tankMsg();
    }
  });
  updTank();

  const simTank = dt => {
    if (!T.running) return;
    const n = 20, hh = dt / n;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const d = subD(), m = mass();
      const meff = m + .5 * RW * T.a * T.a * d;   // mitbewegtes Wasser
      const F = RW * G * T.a * T.a * d - m * G - (d > 0 ? .5 * RW * T.a * T.a * T.v * Math.abs(T.v) : 0);
      acc = F / meff - (d > 0 ? 4 * T.v : 0);
      T.v += acc * hh; T.y += T.v * hh;
      if (T.y <= 0) { T.y = 0; T.v = Math.max(0, T.v); if (acc < 0) acc = 0; }
    }
    T.calm = Math.abs(T.v) < .004 && Math.abs(acc) < .05 ? T.calm + dt : 0;
    if (T.calm > .4) { T.running = false; T.done = true; tankMsg(); }
    updTank();
  };

  const drawTank = dt => {
    simTank(dt);
    const { ctx, w, h } = fit(tankCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const sc = Math.min((w - (small ? 70 : 140)) / TW, (h - 40) / (TH + .25));
    const tx = (w - TW * sc) / 2, floor = h - 16, Y = m => floor - m * sc;
    // Würfel
    const a = T.a * sc, bx = w / 2 - a / 2, by = Y(T.y) - a;
    const col = { 240: C.glow, 600: C.copper, 920: C.surface, 7850: C.muted }[T.rho];
    ctx.fillStyle = col; ctx.fillRect(bx, by, a, a);
    ctx.strokeStyle = T.rho === 920 ? C.fiber : C.fg; ctx.globalAlpha = T.rho === 920 ? 1 : .35; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, a, a); ctx.globalAlpha = 1;
    if (T.rho === 600) { // Maserung
      ctx.strokeStyle = C.bg; ctx.globalAlpha = .35; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(bx + 3, by + a * k / 4); ctx.quadraticCurveTo(bx + a / 2, by + a * k / 4 + 4, bx + a - 3, by + a * k / 4); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // Wasser
    const lv = level();
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .22; ctx.fillRect(tx, Y(lv), TW * sc, lv * sc); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, Y(lv)); ctx.lineTo(tx + TW * sc, Y(lv)); ctx.stroke();
    // Wasserstand vorher
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx - 8, Y(H0)); ctx.lineTo(tx + TW * sc + 8, Y(H0)); ctx.stroke(); ctx.setLineDash([]);
    // Becken
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(tx, Y(TH)); ctx.lineTo(tx, floor); ctx.lineTo(tx + TW * sc, floor); ctx.lineTo(tx + TW * sc, Y(TH)); ctx.stroke();
    // Kräfte
    const m = mass(), W = m * G, Bf = RW * G * T.a * T.a * subD(), Fmax = Math.max(W, RW * G * T.a ** 3);
    const cy = by + a / 2, len = small ? 62 : 80;
    arrow(ctx, bx + a * .3, cy, cy + len * W / Fmax, C.copper);
    arrow(ctx, bx + a * .7, cy, cy - len * Bf / Fmax, C.accent);
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.copper; ctx.fillText('Gewicht', bx + a + 8, cy + len * W / Fmax);
    if (Bf > 0) { ctx.fillStyle = C.accent; ctx.fillText('Auftrieb', bx + a + 8, cy - len * Bf / Fmax + 8); }
    // Beschriftung
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`${MAT[T.rho]} · ${fmt(T.rho, 0)} kg/m³`, 8, 16);
    ctx.textAlign = 'right';
    const rise = (lv - H0) * 1000;
    ctx.fillText(rise > .5 ? `Wasser +${fmt(rise, 0)} mm` : 'Wasser: 1\'000 kg/m³', w - 8, 16);
  };

  /* ---------- Teil 2: Stahlschiff ---------- */
  const shipCv = $('#shipCv');
  const STEEL = 2000, VS = STEEL / 7.85, B0 = Math.cbrt(VS), DEPTH = 45, LL = .75; // t, m³, m, m, Ladelinie bei 75 % der Höhe
  const SH = { f: 0, load: 0, rho: 1025, y: 0 };
  // Kastenrumpf: Länge 2B, Breite B, Höhe B/2. Bei f = 0 ein massiver Klotz, bei f = 1 fünfmal so gross.
  const dims = () => { const B = B0 * (1 + 4 * SH.f); return { B, L: 2 * B, H: B / 2 }; };
  const shipState = () => {
    const { B, L, H } = dims(), M = STEEL + SH.load;
    const d = M * 1000 / (SH.rho * L * B), maxDisp = SH.rho * L * B * H / 1000;
    const mark = H * LL * (SH.rho < 1010 ? 1.025 : 1);
    return { B, L, H, M, d, maxDisp, sinks: d >= H, over: d > mark };
  };
  const updShip = () => {
    const s = shipState();
    $('#formOut').textContent = SH.f < .03 ? 'Klotz' : `${fmt(s.L, 0)} m lang`;
    $('#loadOut').textContent = `${fmt(SH.load, 0)} t`;
    $('#sMass').textContent = `${fmt(s.M, 0)} t`;
    $('#sDisp').textContent = `${fmt(s.sinks ? s.maxDisp : s.M, 0)} t`;
    $('#sDraft').textContent = s.sinks ? 'gesunken' : `${fmt(s.d, 1)} m`;
    let t;
    if (s.sinks && SH.f < .03) t = `Ein Klotz aus 2'000 t Stahl braucht nur ${fmt(VS, 0)} m³ Platz. Er verdrängt höchstens ${fmt(s.maxDisp, 0)} t Wasser. Viel zu wenig: Er sinkt.`;
    else if (s.sinks) t = `Selbst bis zum Rand eingetaucht verdrängt der Rumpf nur ${fmt(s.maxDisp, 0)} t Wasser. Schiff und Ladung wiegen ${fmt(s.M, 0)} t. Wasser läuft hinein, es sinkt.`;
    else if (s.over) t = `Es schwimmt, aber das Wasser steht über der Ladelinie. Bei Wellen schwappt es an Deck. Zu viel Ladung!`;
    else t = `Es schwimmt. Der Rumpf taucht ${fmt(s.d, 1)} m ein und verdrängt ${fmt(s.M, 0)} t Wasser, genau so viel, wie Schiff und Ladung wiegen.${SH.rho < 1010 ? ' Im Süsswasser liegt es etwas tiefer als im Meer.' : ''}`;
    $('#shipStatus').textContent = t;
  };
  $('#formIn').addEventListener('input', e => { SH.f = +e.target.value / 100; updShip(); });
  $('#loadIn').addEventListener('input', e => { SH.load = +e.target.value; updShip(); });
  $$('#waterBtns button').forEach(b => b.addEventListener('click', () => {
    SH.rho = +b.dataset.rho; $$('#waterBtns button').forEach(x => x.classList.toggle('active', x === b)); updShip();
  }));
  updShip();
  SH.y = DEPTH; // der Klotz liegt am Anfang am Grund

  const drawShip = dt => {
    const s = shipState();
    const tgt = s.sinks ? DEPTH : s.d;
    if (reduced) SH.y = tgt;
    else if (s.sinks && SH.y < tgt) SH.y = Math.min(tgt, SH.y + dt * Math.max(3, (tgt - SH.y) * .8));
    else SH.y += (tgt - SH.y) * Math.min(1, dt * 3);
    const { ctx, w, h } = fit(shipCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const Lmax = 2 * B0 * 5;
    const sc = Math.min((w - 30) / (Lmax * 1.1), (h - 34) / (DEPTH + 17));
    const sy = 12 + 17 * sc, bedY = sy + DEPTH * sc;
    // Rumpf
    const x0 = w / 2 - s.L * sc / 2 - s.L * sc * .03, bot = Math.min(sy + SH.y * sc, bedY), top = bot - s.H * sc;
    const Lp = s.L * sc;
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + Lp * 1.06, top); ctx.lineTo(x0 + Lp, bot); ctx.lineTo(x0, bot); ctx.closePath();
    ctx.fillStyle = C.muted; ctx.fill();
    const t = Math.max(2, VS / (5 * s.B * s.B) * sc);
    const solid = SH.f < .03;
    if (!solid) {
      const ix = x0 + t, iw = Lp - 2 * t, ih = s.H * sc - t;
      ctx.fillStyle = C.surface; ctx.fillRect(ix, top, iw, ih);
      // Ladung als Container
      const cap = Math.max(1, s.maxDisp - STEEL);
      const ch = ih * clamp(SH.load / cap, 0, 1);
      if (ch > 0) {
        const cw = Math.max(8, Math.min(18, iw / 10));
        ctx.fillStyle = C.copper;
        for (let x = ix + 2; x + cw <= ix + iw - 1; x += cw + 2) ctx.fillRect(x, top + ih - ch, cw, ch);
      }
      // Ladelinie (Plimsoll-Marke)
      const mx = x0 + Lp * .3, yS = bot - s.H * LL * sc, yF = bot - s.H * LL * 1.025 * sc;
      ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, yS, 6, 0, TAU); ctx.moveTo(mx - 10, yS); ctx.lineTo(mx + 10, yS); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 14, yS); ctx.lineTo(mx + 26, yS); ctx.moveTo(mx + 14, yF); ctx.lineTo(mx + 26, yF); ctx.stroke();
      if (!small) {
        ctx.font = '9px Geist Mono, monospace'; ctx.fillStyle = C.glow; ctx.textAlign = 'left';
        ctx.fillText('S', mx + 29, yS + 4); ctx.fillText('FW', mx + 29, yF - 2);
      }
    } else if (SH.load > 0) {
      ctx.fillStyle = C.copper; const lh = 4 + 16 * SH.load / 30000;
      ctx.fillRect(x0 + 2, top - lh, Lp - 4, lh);
    }
    // Meer
    ctx.fillStyle = C.fiber; ctx.globalAlpha = SH.rho > 1010 ? .24 : .16; ctx.fillRect(0, sy, w, bedY - sy); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
    ctx.fillStyle = C.copper; ctx.globalAlpha = .3; ctx.fillRect(0, bedY, w, h - bedY); ctx.globalAlpha = 1;
    // Texte
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(SH.rho > 1010 ? 'Meer · 1\'025 kg/m³' : 'Süsswasser · 1\'000 kg/m³', 8, sy - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(DEPTH, 0)} m tief`, w - 8, bedY - 6);
    if (!s.sinks && Math.abs(SH.y - s.d) < .3) {
      ctx.fillStyle = s.over ? C.bad : C.fg;
      ctx.fillText(s.over ? 'über der Ladelinie' : `Tiefgang ${fmt(s.d, 1)} m`, w - 8, 16);
    }
  };

  /* ---------- Teil 3: U-Boot ---------- */
  const subCv = $('#subCv');
  const SEA = 1025, VOL = 1000, M0 = 900, CAP = 250, HH = 7, LEN = 60, BED = 300, TL = 6; // m³, t, t, m, m, m, Zeitraffer
  const U = { target: 0, fill: 0, z: -(HH - HH * M0 / SEA), v: 0, msg: '', bubbles: [] };
  const subMass = () => (M0 + U.fill * CAP) * 1000;           // kg
  const frac = () => clamp((U.z + HH) / HH, 0, 1);            // eingetauchter Anteil
  const netF = () => SEA * VOL * frac() * G - subMass() * G;  // N, positiv = nach oben
  const updSub = () => {
    $('#tankIn').value = Math.round(U.target * 100);
    $('#tankOut').textContent = `${Math.round(U.fill * 100)} %`;
    $('#uRho').textContent = `${fmt(subMass() / VOL, 0)} kg/m³`;
    const F = netF() / 1000;
    $('#uF').textContent = Math.abs(F) < 5 ? '≈ 0 kN' : `${F > 0 ? '+' : '−'}${fmt(Math.abs(F), 0)} kN`;
    $('#uZ').textContent = `${fmt(Math.max(0, U.z), 0)} m`;
    const rho = subMass() / VOL;
    let t;
    if (U.z >= BED - HH - .05) t = 'Auf dem Meeresgrund. Blas die Tanks an, um wieder aufzusteigen.';
    else if (frac() < .999 && Math.abs(U.v) < .05) t = 'An der Oberfläche: Das Boot ist leichter als das Wasser, das es ganz untergetaucht verdrängen würde. Ein Stück ragt heraus.';
    else if (Math.abs(rho - SEA) < 3) t = 'Fast genau so dicht wie Meerwasser: Das Boot schwebt.';
    else if (rho > SEA) t = 'Schwerer als das Wasser, das es verdrängt: Das Boot sinkt.';
    else t = 'Leichter als das Wasser, das es verdrängt: Das Boot steigt.';
    if (t !== U.msg) { U.msg = t; $('#subStatus').textContent = t; }
  };
  const setTarget = v => { U.target = clamp(v, 0, 1); updSub(); };
  $('#tankIn').addEventListener('input', e => setTarget(+e.target.value / 100));
  $('#floodBtn').addEventListener('click', () => setTarget(1));
  $('#blowBtn').addEventListener('click', () => setTarget(0));
  updSub();

  const simSub = dt => {
    const df = U.target - U.fill;
    if (Math.abs(df) > 1e-4) {
      const blowing = df < 0;
      U.fill += Math.sign(df) * Math.min(Math.abs(df), (reduced ? 1 : .12) * dt);
      if (blowing && U.z > 1 && !reduced && Math.random() < dt * 25)
        U.bubbles.push({ x: (Math.random() < .5 ? -.32 : .28) + Math.random() * .06, z: U.z + HH * .85, r: 1.5 + Math.random() * 3 });
    }
    const T2 = dt * TL, n = 20, hh = T2 / n;
    for (let i = 0; i < n; i++) {
      const m = subMass();
      const drag = .5 * SEA * 420 * U.v * Math.abs(U.v);
      let acc = (-netF() - drag) / (2 * m);   // mitbewegtes Wasser: etwa doppelte Trägheit (vereinfacht)
      if (frac() < 1) acc -= .3 * U.v;
      U.v += acc * hh; U.z += U.v * hh;
      if (U.z > BED - HH) { U.z = BED - HH; U.v = Math.min(0, U.v); }
    }
    U.bubbles.forEach(b => { b.z -= 2.5 * T2; });
    U.bubbles = U.bubbles.filter(b => b.z > 0);
    updSub();
  };

  const drawSub = dt => {
    simSub(dt);
    const { ctx, w, h } = fit(subCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const gw = small ? 40 : 54;            // Tiefenmesser links
    const mx = gw + 8, mw = w - mx;
    const sc = Math.min(mw * .6 / LEN, 7);
    const cz = Math.max(U.z + HH / 2, h * .18 / sc);
    const Y = d => h / 2 + (d - cz) * sc;
    // Wasser
    const ys = Math.max(0, Y(0));
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .12 + .25 * clamp(cz / BED, 0, 1);
    ctx.fillRect(mx, ys, mw, h - ys); ctx.globalAlpha = 1;
    if (Y(0) > 0) { ctx.strokeStyle = C.fiber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke(); }
    // Tiefenlinien
    ctx.font = MONO; ctx.textAlign = 'right'; ctx.lineWidth = 1;
    for (let d = 10; d <= BED; d += 10) {
      const y = Y(d); if (y < -10 || y > h + 10) continue;
      ctx.strokeStyle = C.line; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(w, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.fillText(`${d} m`, w - 6, y - 4);
    }
    if (Y(BED) < h) { ctx.fillStyle = C.copper; ctx.globalAlpha = .35; ctx.fillRect(mx, Y(BED), mw, h - Y(BED)); ctx.globalAlpha = 1; }
    // Blasen
    ctx.strokeStyle = C.surface; ctx.lineWidth = 1.2;
    const sx = mx + mw / 2;
    for (const b of U.bubbles) { ctx.beginPath(); ctx.arc(sx + b.x * LEN * sc, Y(b.z), b.r, 0, TAU); ctx.stroke(); }
    // U-Boot
    const L = LEN * sc, H = HH * sc, x = sx - L / 2, y = Y(U.z);
    ctx.fillStyle = C.muted;
    roundRect(ctx, x + L * .38, y - H * .55, L * .14, H * .7, 4); ctx.fill();
    roundRect(ctx, x, y, L, H, H / 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 3, y + H / 2, 3, H * .3, 0, 0, TAU); ctx.fill();
    // Ballasttanks
    for (const tx of [x + L * .08, x + L * .7]) {
      const tw = L * .22, th = H * .58, ty = y + H * .3;
      ctx.fillStyle = C.surface; ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = C.fiber; ctx.fillRect(tx, ty + th * (1 - U.fill), tw, th * U.fill);
      ctx.strokeStyle = C.bg; ctx.lineWidth = 1; ctx.strokeRect(tx, ty, tw, th);
    }
    // Pfeil der Nettokraft
    const F = netF(), Fl = clamp(F / (CAP * 1000 * G) * 2, -1, 1) * (small ? 50 : 70);
    if (Math.abs(Fl) > 4) {
      const ax = x + L + (small ? 12 : 18), y0 = y + H / 2, y1 = y0 - Fl, dir = Math.sign(y1 - y0);
      ctx.strokeStyle = F > 0 ? C.accent : C.copper; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ax, y0); ctx.lineTo(ax, y1 - dir * 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, y1); ctx.lineTo(ax - 6, y1 - dir * 9); ctx.lineTo(ax + 6, y1 - dir * 9); ctx.closePath(); ctx.fill();
    }
    // Tiefenmesser
    const gt = 22, gb = h - 22, gx = 8, gc = gx + (gw - 16) / 2;
    roundRect(ctx, gx, gt, gw - 16, gb - gt, 6); ctx.fillStyle = C.sunk; ctx.fill();
    const gy = gt + (gb - gt) * clamp(Math.max(0, U.z) / BED, 0, 1);
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(gc, gy, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = '9px Geist Mono, monospace';
    ctx.fillText('0 m', gc, gt - 8); ctx.fillText(`${BED} m`, gc, gb + 14);
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillText(`Zeitraffer ×${TL}`, mx + 6, h - 8);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('schiff', 4, {
    tankLock: () => { $$('#matBtns button').forEach(b => b.disabled = false); $('#sizeIn').disabled = false; $('#dropBtn').disabled = false; },
    shipLock: () => { $('#formIn').disabled = false; $('#loadIn').disabled = false; $$('#waterBtns button').forEach(b => b.disabled = false); },
    subLock: () => { $('#tankIn').disabled = false; $('#floodBtn').disabled = false; $('#blowBtn').disabled = false; },
  });

  loop(dt => { drawTank(dt); drawShip(dt); drawSub(dt); });
})();
