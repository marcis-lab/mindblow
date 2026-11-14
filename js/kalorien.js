/* mindblow – Lektion Kalorien */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const KJ = 4.184;                      // 1 kcal in kJ
  // bewusst feste Farben: Wasser kalt/heiss, Fett, Lebensmittel
  const COLD = [86, 156, 214], HOT = [214, 64, 48];
  const FAT = '#e7b93a', FATDARK = '#b98a17';
  const rgbMix = (k, a = 1) => `rgba(${Math.round(lerp(COLD[0], HOT[0], k))},${Math.round(lerp(COLD[1], HOT[1], k))},${Math.round(lerp(COLD[2], HOT[2], k))},${a})`;
  const thin = n => fmt(n, 0);

  /* ---------- Teil 1: Energie messen ---------- */
  const foodCv = $('#foodCv');
  const FOODS = {
    apfel: { name: 'Apfel', por: '1 Apfel (150 g)', kcal: 80 },
    brot: { name: 'Brot', por: '1 Scheibe Brot (50 g)', kcal: 120 },
    schoko: { name: 'Schokolade', por: '1 Tafel Schokolade (100 g)', kcal: 540 },
    nuss: { name: 'Nüsse', por: '1 Handvoll Nüsse (30 g)', kcal: 190 },
  };
  const F = { food: 'apfel', n: 1, mode: 'water', anim: 0 };
  const kcalNow = () => FOODS[F.food].kcal * F.n;
  const liftM = kcal => kcal * KJ * 1000 / (70 * 9.81);
  const updFood = () => {
    const k = kcalNow(), f = FOODS[F.food];
    $('#portOut').textContent = String(F.n);
    $('#fKcal').textContent = `${thin(k)} kcal`;
    $('#fKj').textContent = `≈ ${thin(Math.round(k * KJ / 5) * 5)} kJ`;
    $('#fWater').textContent = `${fmt(k / 80, 1)} l`;
    $('#fLift').textContent = `${thin(Math.round(liftM(k) / 10) * 10)} m`;
    const por = F.n === 1 ? f.por : `${F.n} × ${f.por.replace(/^1 /, '')}`;
    $('#foodStatus').textContent = F.mode === 'water'
      ? `${por}: rund ${thin(k)} kcal. Das reicht, um ${fmt(k / 80, 1)} Liter Wasser von 20 auf 100 °C zu erwärmen (ohne Verluste, vereinfacht).`
      : `${por}: Damit könntest du 70 kg rund ${thin(Math.round(liftM(k) / 10) * 10)} m hoch heben, wenn nichts verloren ginge. Deine Muskeln schaffen nur etwa ein Viertel davon, der Rest wird Wärme.`;
    F.anim = 0;
  };
  $$('#foodSel button').forEach(b => b.addEventListener('click', () => {
    F.food = b.dataset.f;
    $$('#foodSel button').forEach(x => x.classList.toggle('active', x === b));
    updFood();
  }));
  $('#portIn').addEventListener('input', e => { F.n = +e.target.value; updFood(); });
  $('#modeBtn').addEventListener('click', () => {
    F.mode = F.mode === 'water' ? 'lift' : 'water';
    $('#modeBtn').textContent = F.mode === 'water' ? 'Stattdessen 70 kg heben' : 'Stattdessen Wasser erwärmen';
    updFood();
  });
  updFood();

  const drawFoodIcon = (ctx, kind, x, y, s) => {
    ctx.save(); ctx.translate(x, y);
    if (kind === 'apfel') {
      ctx.beginPath(); ctx.arc(-s * .2, s * .05, s * .38, 0, TAU); ctx.arc(s * .2, s * .05, s * .38, 0, TAU);
      ctx.fillStyle = '#c8333a'; ctx.fill();
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = Math.max(2, s * .07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -s * .3); ctx.quadraticCurveTo(s * .04, -s * .5, s * .1, -s * .58); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * .22, -s * .45, s * .16, s * .07, -.5, 0, TAU); ctx.fillStyle = '#4f9a3c'; ctx.fill();
    } else if (kind === 'brot') {
      ctx.beginPath(); ctx.moveTo(-s * .45, s * .45); ctx.lineTo(-s * .45, -s * .1);
      ctx.bezierCurveTo(-s * .55, -s * .55, s * .55, -s * .55, s * .45, -s * .1); ctx.lineTo(s * .45, s * .45); ctx.closePath();
      ctx.fillStyle = '#a8662e'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * .36, s * .37); ctx.lineTo(-s * .36, -s * .07);
      ctx.bezierCurveTo(-s * .44, -s * .44, s * .44, -s * .44, s * .36, -s * .07); ctx.lineTo(s * .36, s * .37); ctx.closePath();
      ctx.fillStyle = '#f0d9a8'; ctx.fill();
    } else if (kind === 'schoko') {
      roundRect(ctx, -s * .4, -s * .5, s * .8, s, 4); ctx.fillStyle = '#5a3420'; ctx.fill();
      ctx.strokeStyle = '#3d2214'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * .4 + s * .8 * i / 3, -s * .5); ctx.lineTo(-s * .4 + s * .8 * i / 3, s * .5); ctx.stroke(); }
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * .4, -s * .5 + s * i / 4); ctx.lineTo(s * .4, -s * .5 + s * i / 4); ctx.stroke(); }
    } else {
      const pts = [[-.22, -.12], [.18, -.2], [0, .18], [-.3, .25], [.3, .18]];
      for (const [px, py] of pts) {
        ctx.beginPath(); ctx.ellipse(px * s, py * s, s * .17, s * .13, px * 3, 0, TAU);
        ctx.fillStyle = '#b07a45'; ctx.fill(); ctx.strokeStyle = '#7a4f28'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    ctx.restore();
  };

  const LANDMARKS = [[57, 'Kirchturm'], [330, 'Eiffelturm'], [2502, 'Säntis'], [4478, 'Matterhorn'], [8849, 'Everest']];

  const drawFood = dt => {
    const { ctx, w, h } = fit(foodCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    F.anim = reduced ? 1 : Math.min(1, F.anim + dt / 2.2);
    const e = 1 - Math.pow(1 - F.anim, 3);
    const k = kcalNow();

    // Essen links
    const lx = narrow ? w * .17 : w * .16, ly = h * .38, s = narrow ? 46 : 70, off = narrow ? 4 : 7;
    const n = F.n;
    for (let i = n - 1; i >= 0; i--) drawFoodIcon(ctx, F.food, lx + (i - (n - 1) / 2) * off, ly - i * off * .85, s);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    ctx.fillText(`${thin(k)} kcal`, lx, ly + s * .8 + 10);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(`≈ ${thin(Math.round(k * KJ / 5) * 5)} kJ`, lx, ly + s * .8 + 27);
    ctx.fillText(n > 1 ? `${n} × ${narrow && F.food === 'schoko' ? 'Schoggi' : FOODS[F.food].name}` : FOODS[F.food].name, lx, ly - s * .7 - 14 - (n - 1) * off);

    // Pfeil
    const ax0 = lx + s * .62, ax1 = narrow ? w * .36 : w * .33;
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax0, ly); ctx.lineTo(ax1, ly); ctx.lineTo(ax1 - 7, ly - 6); ctx.moveTo(ax1, ly); ctx.lineTo(ax1 - 7, ly + 6); ctx.stroke();

    const X0 = ax1 + (narrow ? 10 : 22), X1 = w - 12, Y0 = 34, Y1 = h - 34;
    if (F.mode === 'water') {
      const L = k / 80, cnt = Math.ceil(L - 1e-9);
      const AW = X1 - X0, AH = Y1 - Y0;
      // so viele Spalten, dass die Flaschen möglichst gross werden
      let cols = 1, best = 0;
      for (let c = 1; c <= cnt; c++) {
        const r = Math.ceil(cnt / c), size = Math.min(AW / c * .62, AH / r * .82 / 1.9);
        if (size > best + .01) { best = size; cols = c; }
      }
      const rows = Math.ceil(cnt / cols);
      const bw = Math.min(best, 40), bh = bw * 1.9;
      const cw = AW / cols, ch = Math.min(AH / rows, bh / .82 * 1.15);
      const temp = 20 + 80 * e;
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
      ctx.fillText(narrow ? `${fmt(L, 1)} l Wasser` : `${fmt(L, 1)} Liter Wasser erwärmen`, X0, 20);
      ctx.textAlign = 'right'; ctx.fillStyle = rgbMix(e); ctx.fillText(`${fmt(temp, 0)} °C`, X1, 20);
      for (let i = 0; i < cnt; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const cx = X0 + cw * (c + .5), by = Y0 + ch * (r + .5) + bh / 2;
        const part = Math.min(1, L - i);
        const bx = cx - bw / 2, top = by - bh;
        // Flasche
        roundRect(ctx, bx, top + bh * .18, bw, bh * .82, Math.min(6, bw * .2)); ctx.fillStyle = C.sunk; ctx.fill();
        const fh = bh * .78 * part;
        ctx.save(); roundRect(ctx, bx, top + bh * .18, bw, bh * .82, Math.min(6, bw * .2)); ctx.clip();
        ctx.fillStyle = rgbMix(e, .85); ctx.fillRect(bx, by - fh, bw, fh); ctx.restore();
        roundRect(ctx, bx, top + bh * .18, bw, bh * .82, Math.min(6, bw * .2)); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = C.muted; ctx.fillRect(cx - bw * .18, top + bh * .06, bw * .36, bh * .12);
        // Dampf
        if (e > .85 && part > .5 && !reduced) {
          ctx.strokeStyle = C.muted; ctx.globalAlpha = (e - .85) / .15 * .6; ctx.lineWidth = 1.2;
          const t = performance.now() / 600 + i;
          for (let j = -1; j <= 1; j += 2) {
            ctx.beginPath();
            for (let q = 0; q <= 8; q++) { const yy = top + bh * .04 - q * 2; const xx = cx + j * bw * .14 + Math.sin(t + q * .6) * 2; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      ctx.fillText(narrow ? 'je Flasche 1 l, 80 kcal' : 'jede Flasche: 1 Liter, braucht 80 kcal für 20 → 100 °C', (X0 + X1) / 2, h - 12);
    } else {
      const H = liftM(k) * e, Hfin = liftM(k);
      let max = 100;
      for (const m of [100, 200, 500, 1000, 2000, 5000, 10000, 20000]) { max = m; if (m >= Hfin * 1.12) break; }
      const gx = narrow ? X0 + 4 : X0 + 30, gy = Y1, top = Y0 + 4;
      const Yh = m => gy - m / max * (gy - top);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
      for (const [m, name] of LANDMARKS) {
        if (m > max) continue;
        if (m < max * .06) continue;
        const y = Yh(m);
        ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(X1, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.muted; ctx.textAlign = 'right';
        ctx.fillText(`${name} ${thin(m)} m`, X1, y - 4);
      }
      // Boden und Seil
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx - 4, gy); ctx.lineTo(X1, gy); ctx.stroke();
      const wx = gx + 26, wy = Yh(H);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(wx, top - 6); ctx.lineTo(wx, wy - 22); ctx.stroke();
      // Höhenbalken
      ctx.fillStyle = C.sunk; ctx.fillRect(gx, wy, 8, gy - wy);
      ctx.fillStyle = C.glow; ctx.fillRect(gx, wy, 8, gy - wy);
      // Gewicht
      roundRect(ctx, wx - 22, wy - 22, 44, 30, 5); ctx.fillStyle = C.fg; ctx.fill();
      ctx.fillStyle = C.surface; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('70 kg', wx, wy - 3);
      ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.font = `500 12px ${MONO}`;
      const lab = `${thin(Math.round(H / 10) * 10)} m`;
      ctx.fillText(lab, wx + 28, Math.max(top + 10, wy - 4));
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
      ctx.fillText(narrow ? '70 kg heben' : '70 kg in die Höhe heben', X0, 20);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'ohne Verluste' : 'theoretisch, ohne jeden Verlust', (X0 + X1) / 2, h - 12);
    }
  };

  /* ---------- Teil 2: Verbrennen ohne Flamme ---------- */
  const powerCv = $('#powerCv');
  const ACTS = [
    ['Schlafen', 75], ['Sitzen', 100], ['Gehen', 280], ['Velofahren', 450], ['Joggen', 700], ['Schnell rennen', 1000],
  ];
  const ACTMSG = [
    'Schlafen: Auch jetzt arbeiten Herz, Gehirn und Atmung. Rund 75 Watt, alles wird zu Wärme.',
    'Ruhig sitzen: rund 100 Watt, fast alles wird zu Wärme.',
    'Gehen: fast dreimal so viel wie im Sitzen. Deine Muskeln brauchen jetzt mehr Energie.',
    'Velofahren: Nur etwa ein Viertel der zusätzlichen Energie treibt die Pedale an. Der Rest wird Wärme. Darum schwitzt du.',
    'Joggen: so viel wie fast zwölf alte Glühbirnen. Die viele Wärme muss weg, darum schwitzt du.',
    'Schnell rennen: rund 1\'000 Watt. Das hältst du nur kurz durch (vereinfachte Werte für 70 kg).',
  ];
  const PW = { act: 1, shown: 100, t: 0 };
  const updPower = () => {
    const [name, W] = ACTS[PW.act];
    $('#actIn').value = PW.act; $('#actOut').textContent = name;
    $('#aW').textContent = `${thin(W)} W`;
    $('#aKcal').textContent = `${thin(Math.round(W * 3.6 / KJ))} kcal`;
    $('#aBulb').textContent = fmt(W / 60, 1);
    $('#powerStatus').textContent = ACTMSG[PW.act];
  };
  $('#actIn').addEventListener('input', e => { PW.act = +e.target.value; updPower(); });
  $('#aSleep').addEventListener('click', () => { PW.act = 0; updPower(); });
  $('#aBike').addEventListener('click', () => { PW.act = 3; updPower(); });
  $('#aRun').addEventListener('click', () => { PW.act = 4; updPower(); });
  updPower();

  const drawPower = dt => {
    const { ctx, w, h } = fit(powerCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const target = ACTS[PW.act][1];
    PW.shown = reduced ? target : lerp(PW.shown, target, 1 - Math.exp(-dt * 5));
    PW.t += dt;
    const P = PW.shown;

    // Figur mit Wärmewellen
    const fx = narrow ? w * .16 : w * .15, fy = h * .42, fs = narrow ? 70 : 90;
    const heat = clamp(P / 1000, .05, 1);
    const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, fs * (.8 + heat * .6));
    g.addColorStop(0, `rgba(225,120,40,${.18 + .3 * heat})`); g.addColorStop(1, 'rgba(225,120,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, fs * (.8 + heat * .6), 0, TAU); ctx.fill();
    ctx.strokeStyle = C.fg; ctx.fillStyle = C.fg; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(fx, fy - fs * .42, fs * .13, 0, TAU); ctx.fill();
    const sw = reduced ? 0 : Math.sin(PW.t * (2 + P / 150)) * clamp((P - 120) / 600, 0, 1) * .6;
    ctx.beginPath();
    ctx.moveTo(fx, fy - fs * .27); ctx.lineTo(fx, fy + fs * .12);
    ctx.moveTo(fx, fy - fs * .18); ctx.lineTo(fx - fs * .22 * Math.cos(sw), fy + fs * .02 + fs * .1 * Math.sin(sw));
    ctx.moveTo(fx, fy - fs * .18); ctx.lineTo(fx + fs * .22 * Math.cos(sw), fy + fs * .02 - fs * .1 * Math.sin(sw));
    ctx.moveTo(fx, fy + fs * .12); ctx.lineTo(fx - fs * .14 - fs * .1 * sw, fy + fs * .45);
    ctx.moveTo(fx, fy + fs * .12); ctx.lineTo(fx + fs * .14 + fs * .1 * sw, fy + fs * .45);
    ctx.stroke();
    // Wellen
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
    const waves = 2 + Math.round(heat * 4);
    for (let i = 0; i < waves; i++) {
      const ph = reduced ? i / waves : (PW.t * (.25 + heat * .6) + i / waves) % 1;
      const r = fs * (.55 + ph * .55);
      ctx.globalAlpha = (1 - ph) * .8;
      ctx.beginPath(); ctx.arc(fx, fy, r, -Math.PI * .85, -Math.PI * .15); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    ctx.fillText(`${thin(Math.round(P))} W`, fx, h * .42 + fs * .7);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText('37 °C', fx, h * .42 + fs * .7 + 17);

    // Balken
    const bx0 = narrow ? w * .36 : w * .34, bx1 = w - 14;
    const MAXW = 1100;
    const BX = v => bx0 + v / MAXW * (bx1 - bx0);
    const bars = [
      [narrow ? 'Glühbirne' : 'alte Glühbirne', 60, C.glow],
      [narrow ? 'LED' : 'LED-Lampe, gleich hell', 8, C.fiber],
      [narrow ? 'Mensch' : `Mensch: ${ACTS[PW.act][0]}`, P, C.copper],
    ];
    const by0 = 34, bstep = narrow ? 52 : 56;
    ctx.font = `11px ${MONO}`;
    bars.forEach(([name, v, col], i) => {
      const y = by0 + i * bstep;
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.fillText(name, bx0, y);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText(`${thin(Math.round(v))} W`, bx1, y);
      ctx.fillStyle = C.sunk; roundRect(ctx, bx0, y + 7, bx1 - bx0, 16, 5); ctx.fill();
      const bwid = Math.max(4, BX(v) - bx0); ctx.fillStyle = col; roundRect(ctx, bx0, y + 7, bwid, 16, Math.min(5, bwid / 2)); ctx.fill();
    });
    // Skala
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    const sy = by0 + 3 * bstep - 14;
    for (const v of [0, 500, 1000]) {
      ctx.beginPath(); ctx.moveTo(BX(v), sy - 6); ctx.lineTo(BX(v), sy); ctx.stroke();
      ctx.fillText(`${thin(v)} W`, clamp(BX(v), bx0 + 14, bx1 - 22), sy + 12);
    }

    // Wohin die Energie geht
    const extra = Math.max(0, P - 100);
    const work = extra * .22;                    // vereinfacht: rund ein Viertel des Mehrverbrauchs wird Bewegung
    const heatW = P - work;
    const yy = h - 54, x0 = 14, x1 = w - 14;
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
    ctx.fillText(narrow ? 'Wohin geht die Energie?' : 'Wohin geht die Energie? (vereinfacht)', x0, yy - 8);
    const hw = (x1 - x0) * heatW / P;
    ctx.fillStyle = C.copper; roundRect(ctx, x0, yy, Math.max(4, hw - 2), 18, 5); ctx.fill();
    if (work > 1) { ctx.fillStyle = C.accent; roundRect(ctx, x0 + hw, yy, x1 - x0 - hw, 18, 5); ctx.fill(); }
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(`Wärme ${thin(Math.round(heatW))} W`, x0, yy + 34);
    ctx.textAlign = 'right';
    ctx.fillText(work > 1 ? `Bewegung ${thin(Math.round(work))} W` : 'Bewegung ≈ 0 W', x1, yy + 34);
  };

  /* ---------- Teil 3: Wohin geht das Fett? ---------- */
  const fatCv = $('#fatCv');
  // pro kg Fett (Meerman & Brown 2014, gerundet): 2,9 kg O₂ rein, 2,8 kg CO₂ und 1,1 kg Wasser raus; 84 % der Fett-Atome gehen ins CO₂
  const FA = { kg: 1, prog: 0, run: false, oxy: false, parts: [], spawn: 0 };
  const CO2_PER_BREATH = 0.033;          // Gramm CO₂ pro ruhigem Atemzug, rund
  const updFat = () => {
    const kg = FA.kg;
    $('#kgOut').textContent = `${fmt(kg, 1)} kg`;
    if (FA.oxy) {
      $('#fCo2').textContent = `${fmt(kg * 2.8, 1)} kg CO₂`; $('#fCo2f').textContent = 'samt eingeatmetem O';
      $('#fH2o').textContent = `${fmt(kg * 1.1, 1)} kg`; $('#fH2of').textContent = `dafür ${fmt(kg * 2.9, 1)} kg O₂ eingeatmet`;
    } else {
      $('#fCo2').textContent = `${fmt(kg * .84, 2)} kg`; $('#fCo2f').textContent = 'Fett-Atome im CO₂';
      $('#fH2o').textContent = `${fmt(kg * .16, 2)} kg`; $('#fH2of').textContent = 'Fett-Atome im Wasser';
    }
    const br = kg * 2800 / CO2_PER_BREATH;
    $('#fBreath').textContent = thin(Math.round(br / 1000) * 1000);
    $('#fBreathf').textContent = `rund ${fmt(br / 12 / 60 / 24, 0)} Tage bei 12 pro min, vereinfacht`;
  };
  $('#kgIn').addEventListener('input', e => {
    FA.kg = +e.target.value / 2; FA.prog = 0; FA.run = false; FA.parts = [];
    $('#burnBtn').textContent = 'Fett abbauen'; updFat();
    $('#fatStatus').textContent = `${fmt(FA.kg, 1)} kg Fett. Drück auf «Fett abbauen».`;
  });
  $('#burnBtn').addEventListener('click', () => {
    if (FA.prog >= 1) { FA.prog = 0; FA.parts = []; }
    FA.run = !FA.run;
    if (reduced && FA.run) { FA.prog = 1; FA.run = false; }
    $('#burnBtn').textContent = FA.run ? 'Anhalten' : FA.prog >= 1 ? 'Nochmals' : 'Fett abbauen';
    $('#fatStatus').textContent = 'Die meisten Teilchen verlassen dich über die Lunge. Nur wenige gehen als Wasser.';
  });
  $('#oxyBtn').addEventListener('click', () => {
    FA.oxy = !FA.oxy;
    $('#oxyBtn').textContent = FA.oxy ? 'Nur Fett-Atome zählen' : 'Sauerstoff mitzählen';
    $('#fatStatus').textContent = FA.oxy
      ? 'Für den Abbau atmest du zusätzlich Sauerstoff ein (blau). Er steckt danach mit im CO₂ und im Wasser. Darum wiegt das CO₂ mehr als das Fett selbst.'
      : 'Nur die Atome aus dem Fett: rund 84 % gehen ins CO₂, rund 16 % ins Wasser.';
    updFat();
  });
  updFat();

  const drawFat = dt => {
    const { ctx, w, h } = fit(fatCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (FA.run) {
      FA.prog = Math.min(1, FA.prog + dt / 7);
      if (FA.prog >= 1) { FA.run = false; $('#burnBtn').textContent = 'Nochmals'; }
    }
    const p = FA.prog;

    // Positionen
    const bx = narrow ? w * .2 : w * .2, byc = h * .52;
    const mouth = { x: w * (narrow ? .78 : .76), y: 64 };
    const drain = { x: w * (narrow ? .78 : .76), y: h - 62 };
    const oxySrc = { x: w * (narrow ? .2 : .2), y: 22 };

    // Fettblock
    const size0 = Math.min(narrow ? 110 : 140, h * .42) * Math.cbrt(FA.kg / 10 * .7 + .3);
    const size = size0 * Math.cbrt(Math.max(0.0001, 1 - p));
    if (size > 2) {
      roundRect(ctx, bx - size / 2, byc - size / 2, size, size, Math.min(14, size * .2));
      ctx.fillStyle = FAT; ctx.fill(); ctx.strokeStyle = FATDARK; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = `500 12px ${MONO}`;
    ctx.fillText(`Fett ${fmt(FA.kg * (1 - p), 1)} kg`, bx, byc + size0 / 2 + 22);

    // Ziele
    const cloudR = 18 + 26 * Math.sqrt(p * .84);
    ctx.fillStyle = C.sunk; ctx.beginPath();
    for (const [dx, dy, r] of [[-.6, .1, .7], [0, -.2, 1], [.6, .1, .75], [0, .3, .8]]) {
      ctx.moveTo(mouth.x + dx * cloudR + r * cloudR, mouth.y + dy * cloudR);
      ctx.arc(mouth.x + dx * cloudR, mouth.y + dy * cloudR, r * cloudR, 0, TAU);
    }
    ctx.fill('nonzero');
    ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
    ctx.fillText('CO₂ ausatmen', mouth.x, mouth.y + 4);
    const poolW = 22 + 40 * Math.sqrt(p * .16), poolH = 5 + 9 * Math.sqrt(p * .16);
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .55;
    ctx.beginPath(); ctx.ellipse(drain.x, drain.y + 16, poolW, poolH, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.fillText('Wasser', drain.x, drain.y - 6);
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted;
    const mCo2 = FA.oxy ? 2.8 : .84, mH2o = FA.oxy ? 1.1 : .16;
    ctx.fillText(`${fmt(FA.kg * mCo2 * p, FA.oxy ? 1 : 2)} kg`, mouth.x, mouth.y + 18 + cloudR * .6 + 10);
    ctx.fillText(`${fmt(FA.kg * mH2o * p, FA.oxy ? 1 : 2)} kg`, drain.x, drain.y + 16 + poolH + 16);
    if (FA.oxy) {
      ctx.fillStyle = '#3b6fd8'; ctx.font = `500 11px ${MONO}`;
      ctx.textAlign = narrow ? 'left' : 'center';
      ctx.fillText(`O₂ einatmen ${fmt(FA.kg * 2.9 * p, 1)} kg`, narrow ? 8 : oxySrc.x, oxySrc.y);
      ctx.textAlign = 'center';
    }

    // Wege
    const path = (a, b, t, bend) => {
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + bend;
      const u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y };
    };
    const src = { x: bx + size0 * .3, y: byc };
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    for (const [dst, bend] of [[mouth, 30], [drain, -30]]) {
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const q = path(src, dst, i / 24, bend); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Teilchen
    if (!reduced && FA.run) {
      FA.spawn += dt * 22;
      while (FA.spawn > 1) {
        FA.spawn -= 1;
        const kind = Math.random() < .84 ? 'c' : 'w';
        FA.parts.push({ kind, t: 0, j: (Math.random() - .5) * 18 });
        if (FA.oxy && Math.random() < .7) FA.parts.push({ kind: 'o', t: 0, j: (Math.random() - .5) * 30 });
      }
    }
    if (!reduced) {
      FA.parts = FA.parts.filter(q => (q.t += dt * (q.kind === 'o' ? .9 : .55)) < 1);
      for (const q of FA.parts) {
        let pt, col, r = 3.2;
        if (q.kind === 'o') { pt = { x: lerp(oxySrc.x + q.j, bx, q.t), y: lerp(oxySrc.y + 10, byc - size / 2, q.t) }; col = '#3b6fd8'; }
        else if (q.kind === 'c') { pt = path(src, mouth, q.t, 30); pt.y += q.j * Math.sin(q.t * Math.PI); col = C.muted; }
        else { pt = path(src, drain, q.t, -30); pt.y += q.j * Math.sin(q.t * Math.PI); col = C.fiber; }
        ctx.globalAlpha = Math.min(1, Math.sin(q.t * Math.PI) * 2);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Anteile
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    const mid1 = path(src, mouth, .5, 30), mid2 = path(src, drain, .5, -30);
    ctx.fillText(FA.oxy ? (narrow ? '2,8 kg je kg' : '2,8 kg pro kg Fett') : '84 %', mid1.x - (narrow ? 6 : 16), mid1.y - 24);
    ctx.fillText(FA.oxy ? (narrow ? '1,1 kg je kg' : '1,1 kg pro kg Fett') : '16 %', mid2.x - (narrow ? 6 : 16), mid2.y + 30);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('kalorien', 4, {
    foodLock: () => { $('#portIn').disabled = false; $('#modeBtn').disabled = false; $$('#foodSel button').forEach(b => b.disabled = false); },
    powerLock: () => { ['#actIn', '#aSleep', '#aBike', '#aRun'].forEach(s => $(s).disabled = false); },
    fatLock: () => { ['#kgIn', '#burnBtn', '#oxyBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawFood(dt); drawPower(dt); drawFat(dt); });
})();
