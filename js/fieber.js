/* mindblow – Lektion Fieber */
(() => {
  const { $, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: kalt und heiss
  const COLD = '#3b7bd8', HOT = '#d8452f', BANANA = '#e9c13b', BANANA_EDGE = '#a5811a';
  const deg = v => `${fmt(v, 1)} °C`;

  /* ---------- Teil 1: Thermostat ---------- */
  const thermoCv = $('#thermoCv');
  const TH = { set: 37, ist: 37, hist: [], acc: 0, t: 0, feel: '', on: false };
  for (let i = 0; i < 240; i++) TH.hist.push([37, 37]);
  const feelOf = () => {
    const d = TH.set - TH.ist;
    if (d > .25) return ['cold', 'frieren', 'zittern, Gänsehaut, blass'];
    if (d < -.25) return ['hot', 'heiss', 'schwitzen, rote Haut'];
    return ['ok', 'angenehm', 'nichts zu tun'];
  };
  const setSoll = (v, msg) => {
    TH.set = clamp(Math.round(v * 10) / 10, 36.5, 40.5);
    $('#setIn').value = Math.round(TH.set * 10);
    $('#setOut').textContent = deg(TH.set);
    $('#tSet').textContent = deg(TH.set);
    if (msg) $('#thermoStatus').textContent = msg;
  };
  $('#setIn').addEventListener('input', e => setSoll(+e.target.value / 10,
    'Der Sollwert ist verstellt. Schau, wie der Körper nachzieht und wie es sich unterwegs anfühlt.'));
  $('#infOn').addEventListener('click', () => setSoll(39.5,
    'Botenstoffe der Abwehr erreichen das Gehirn. Sollwert 39,5 °C. Dein Körper ist jetzt «zu kalt»: Schüttelfrost.'));
  $('#infOff').addEventListener('click', () => setSoll(37,
    'Die Infektion ist besiegt, der Sollwert fällt auf 37 °C. Jetzt bist du «zu heiss»: Du schwitzt das Fieber aus.'));

  const drawThermo = dt => {
    const { ctx, w, h } = fit(thermoCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    // Simulation: die Körpertemperatur folgt dem Sollwert mit Verzögerung
    if (TH.on) {
      const d = TH.set - TH.ist;
      const rate = clamp(d * .28, -.09, .11);   // Aufheizen per Zittern geht etwas schneller als Kühlen
      TH.ist += rate * dt;
      TH.acc += dt; TH.t += dt;
      while (TH.acc >= .1) { TH.acc -= .1; TH.hist.push([TH.set, TH.ist]); TH.hist.shift(); }
    }
    const [fk, fName, fDo] = feelOf();
    const key = fk + fmt(TH.ist, 1);
    if (key !== TH.feel) {
      TH.feel = key;
      $('#tIst').textContent = deg(TH.ist);
      $('#tFeel').textContent = fName;
      $('#tDo').textContent = fDo;
    }

    // Diagramm links
    const figW = narrow ? 92 : 140;
    const gx0 = 44, gx1 = w - figW - 10, gy0 = 30, gy1 = h - 30;
    const T0 = 36, T1 = 41;
    const GY = v => gy1 - (v - T0) / (T1 - T0) * (gy1 - gy0);
    const n = TH.hist.length, GX = i => gx0 + i / (n - 1) * (gx1 - gx0);
    // Fieberbereich
    ctx.fillStyle = C.sunk; ctx.fillRect(gx0, GY(41), gx1 - gx0, GY(38) - GY(41));
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'Fieber' : 'Fieberbereich', gx1 - 6, GY(41) + 13);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let v = 36; v <= 41; v++) {
      ctx.beginPath(); ctx.moveTo(gx0, GY(v)); ctx.lineTo(gx1, GY(v)); ctx.stroke();
      ctx.fillText(`${v}°`, gx0 - 6, GY(v) + 3);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? '°C, letzte 2 Std.' : 'Temperatur in °C, letzte 2 Stunden', gx0, gy0 - 12);
    ctx.textAlign = 'right'; ctx.fillText('jetzt', gx1, gy1 + 16);
    // Lücke zwischen Soll und Ist einfärben
    for (let i = 1; i < n; i++) {
      const [s, t] = TH.hist[i];
      if (Math.abs(s - t) < .05) continue;
      ctx.fillStyle = s > t ? 'rgba(59,123,216,.22)' : 'rgba(216,69,47,.22)';
      const y0 = GY(Math.max(s, t)), y1 = GY(Math.min(s, t));
      ctx.fillRect(GX(i - 1), y0, GX(i) - GX(i - 1) + .5, y1 - y0);
    }
    // Sollwert gestrichelt
    ctx.setLineDash([6, 5]); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); TH.hist.forEach(([s], i) => i ? ctx.lineTo(GX(i), GY(s)) : ctx.moveTo(GX(i), GY(s))); ctx.stroke();
    ctx.setLineDash([]);
    // Ist-Temperatur
    ctx.strokeStyle = C.glow; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); TH.hist.forEach(([, t], i) => i ? ctx.lineTo(GX(i), GY(t)) : ctx.moveTo(GX(i), GY(t))); ctx.stroke();
    ctx.beginPath(); ctx.arc(gx1, GY(TH.ist), 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    // Legende
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    const ly = gy1 + 16;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(gx0, ly - 3); ctx.lineTo(gx0 + 16, ly - 3); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.fillText('Soll', gx0 + 20, ly);
    ctx.strokeStyle = C.glow; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx0 + 56, ly - 3); ctx.lineTo(gx0 + 72, ly - 3); ctx.stroke();
    ctx.fillText('Körper', gx0 + 76, ly);

    // Figur rechts
    const fx = w - figW / 2 - 4, fy = h * .46;
    const s = narrow ? .8 : 1;
    const col = fk === 'cold' ? COLD : fk === 'hot' ? HOT : C.muted;
    const jit = fk === 'cold' && !reduced ? Math.sin(performance.now() / 22) * 2.2 : 0;
    ctx.save(); ctx.translate(fx + jit, fy);
    if (fk === 'hot' && !reduced) { ctx.shadowColor = HOT; ctx.shadowBlur = 22; }
    ctx.fillStyle = C.surface; ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -50 * s, 23 * s, 0, TAU); ctx.fill(); ctx.stroke();
    roundRect(ctx, -22 * s, -22 * s, 44 * s, 64 * s, 16 * s); ctx.fill(); ctx.stroke();
    ctx.restore();
    // Thermostat im Kopf
    ctx.fillStyle = col; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(fmt(TH.set, 1) + '°', fx + jit, fy - 46 * s);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'Soll' : 'Soll im Gehirn', fx, fy - 80 * s);
    if (fk === 'cold') {
      ctx.strokeStyle = COLD; ctx.lineWidth = 2;
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
        const x = fx + sd * (34 + k * 7) * s, y = fy + (-14 + k * 14) * s;
        ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + sd * 3, y - 2); ctx.lineTo(x, y + 2); ctx.lineTo(x + sd * 3, y + 6); ctx.stroke();
      }
    } else if (fk === 'hot') {
      ctx.fillStyle = COLD;
      const tt = reduced ? 0 : performance.now() / 900;
      for (let k = 0; k < 5; k++) {
        const ph = (tt + k * .23) % 1;
        const x = fx + (-26 + k * 13) * s, y = fy - 40 * s + ph * 80 * s;
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.quadraticCurveTo(x + 4, y + 1, x, y + 3); ctx.quadraticCurveTo(x - 4, y + 1, x, y - 6); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col; ctx.font = `500 ${narrow ? 12 : 13}px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(fk === 'cold' ? 'friert' : fk === 'hot' ? 'schwitzt' : 'angenehm', fx, fy + 66 * s);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    ctx.fillText(deg(TH.ist), fx, fy + 66 * s + 20);
  };

  /* ---------- Teil 2: Rennen Keime gegen Abwehr (Modell) ---------- */
  const raceCv = $('#raceCv');
  // Vereinfachtes Modell, 37 °C = 1. Zeigt nur die Richtung.
  const bugOf = T => clamp(1 - .12 * (T - 37), .45, 1.12);
  const defOf = T => T <= 39.5 ? 1 + .1 * (T - 37) : 1.25 - .32 * (T - 39.5) * (T - 39.5);
  const R = { T: 37, last: '', anim: 0 };
  const updRace = msg => {
    $('#tempIn').value = Math.round(R.T * 10);
    $('#tempOut').textContent = deg(R.T);
    const b = bugOf(R.T), d = defOf(R.T), q = d / b;
    $('#rBug').textContent = `${fmt(b * 100, 0)} %`;
    $('#rDef').textContent = `${fmt(d * 100, 0)} %`;
    $('#rWin').textContent = q > 1.08 ? 'Abwehr' : q < .92 ? 'Keime' : 'ausgeglichen';
    let st = msg;
    if (!st) st = R.T > 40.2 ? 'Sehr hohes Fieber belastet auch den eigenen Körper. Hier kippt der Vorteil wieder (vereinfacht).'
      : R.T >= 38 ? 'Fieberbereich: Die Keime werden gebremst, die Abwehr legt zu (Modell).'
      : R.T < 36.8 ? 'Etwas kühler als normal: Hier wären die Keime eher im Vorteil (Modell).'
      : 'Normaltemperatur: Die Keime fühlen sich hier wohl.';
    $('#raceStatus').textContent = st;
  };
  $('#tempIn').addEventListener('input', e => { R.T = +e.target.value / 10; updRace(); });
  $('#t37').addEventListener('click', () => { R.T = 37; updRace(); });
  $('#t39').addEventListener('click', () => { R.T = 39; updRace(); });
  $('#t41').addEventListener('click', () => { R.T = 41; updRace(); });
  updRace('Vereinfachtes Modell: 37 °C = 100 %. Es zeigt die Richtung, keine echten Messwerte.');

  const drawRace = dt => {
    const { ctx, w, h } = fit(raceCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (!reduced) R.anim += dt;
    const gx0 = 44, gx1 = w - 14, gy0 = 96, gy1 = h - 34;
    const X = T => gx0 + (T - 36) / 5 * (gx1 - gx0);
    const Y = v => gy1 - (v - .4) / (1.4 - .4) * (gy1 - gy0);
    // Zonen
    ctx.fillStyle = C.sunk;
    ctx.fillRect(X(38), gy0, X(40) - X(38), gy1 - gy0);
    ctx.fillStyle = 'rgba(216,69,47,.12)';
    ctx.fillRect(X(40), gy0, X(41) - X(40), gy1 - gy0);
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText('Fieber', (X(38) + X(40)) / 2, gy0 + 12);
    ctx.fillText(narrow ? 'riskant' : 'belastend', (X(40) + X(41)) / 2, gy0 + 12);
    // Gitter
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (const v of [.5, 1, 1.25]) {
      ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke();
      ctx.fillText(`${fmt(v * 100, 0)}%`, gx0 - 5, Y(v) + 3);
    }
    ctx.textAlign = 'center';
    for (let T = 36; T <= 41; T++) ctx.fillText(narrow ? `${T}°` : `${T} °C`, X(T), gy1 + 15);
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Modell, 37 °C = 100 %' : 'Modell, keine Messwerte · 37 °C = 100 %', gx0, gy1 + 29);
    // Kurven
    const curve = (f, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const T = 36 + i / 20; i ? ctx.lineTo(X(T), Y(f(T))) : ctx.moveTo(X(T), Y(f(T))); }
      ctx.stroke();
    };
    curve(bugOf, C.bad); curve(defOf, C.fiber);
    // Beschriftung an den Kurven
    ctx.font = `500 11px ${MONO}`;
    ctx.fillStyle = C.bad; ctx.textAlign = 'left'; ctx.fillText('Keime', X(36) + 4, Y(bugOf(36)) - 8);
    ctx.fillStyle = C.fiber; ctx.fillText('Abwehr', X(36) + 4, Y(defOf(36)) + 16);
    // Markierung
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(R.T), gy0); ctx.lineTo(X(R.T), gy1); ctx.stroke();
    for (const [f, col] of [[bugOf, C.bad], [defOf, C.fiber]]) {
      ctx.beginPath(); ctx.arc(X(R.T), Y(f(R.T)), 5, 0, TAU); ctx.fillStyle = col; ctx.fill();
    }

    // Tauziehen oben
    const b = bugOf(R.T), d = defOf(R.T);
    const share = d / (d + b);              // 0,5 = ausgeglichen
    const tx0 = 20, tx1 = w - 20, ty = 46, mid = (tx0 + tx1) / 2;
    const knot = mid + (share - .5) * (tx1 - tx0) * 1.6;
    ctx.font = `500 11px ${MONO}`;
    ctx.fillStyle = C.bad; ctx.textAlign = 'left'; ctx.fillText('Keime', tx0, 22);
    ctx.fillStyle = C.fiber; ctx.textAlign = 'right'; ctx.fillText('Abwehr', tx1, 22);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'Wer zieht stärker?' : 'Wer zieht stärker? (Modell)', mid, 22);
    const wob = reduced ? 0 : Math.sin(R.anim * 6) * 1.5;
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.moveTo(tx0 + 14, ty); ctx.lineTo(knot + wob, ty); ctx.stroke();
    ctx.strokeStyle = C.fiber; ctx.beginPath(); ctx.moveTo(knot + wob, ty); ctx.lineTo(tx1 - 14, ty); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mid, ty - 14); ctx.lineTo(mid, ty + 14); ctx.stroke();
    ctx.beginPath(); ctx.arc(knot + wob, ty, 8, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    // Ziehende Gruppen
    const team = (x, col, nn, dir) => {
      ctx.fillStyle = col;
      for (let i = 0; i < nn; i++) { ctx.beginPath(); ctx.arc(x + dir * i * 9, ty + (i % 2 ? 4 : -4), 4.5, 0, TAU); ctx.fill(); }
    };
    team(tx0 + 8, C.bad, Math.round(3 * b), 1);
    team(tx1 - 8, C.fiber, Math.round(3 * d), -1);
  };

  /* ---------- Teil 3: Energiebedarf ---------- */
  const energyCv = $('#energyCv');
  const E = { T: 39, base: 1600, shown: 0 };
  const extraOf = () => E.base * .1 * Math.max(0, E.T - 37);
  const updEnergy = () => {
    $('#feverIn').value = Math.round(E.T * 10); $('#baseIn').value = E.base;
    $('#feverOut').textContent = deg(E.T);
    $('#baseOut').textContent = `${fmt(E.base, 0)} kcal`;
    const ex = extraOf(), p = 10 * (E.T - 37);
    $('#eExtraP').textContent = `+${fmt(p, 0)} %`;
    $('#eExtra').textContent = `${fmt(Math.round(ex / 10) * 10, 0)} kcal`;
    const nb = Math.round(ex / 100);
    $('#eBan').textContent = nb === 1 ? '1 Banane' : `${nb} Bananen`;
    $('#energyStatus').textContent = E.T >= 40
      ? 'Sehr hohes Fieber kostet viel. Dazu kommt das Zittern beim Aufheizen. Kein Wunder, dass man nur noch liegen will.'
      : E.T >= 38 ? `Bei ${deg(E.T)} braucht dein Körper rund ${fmt(p, 0)} Prozent mehr, nur fürs Daliegen (vereinfacht).`
      : 'Bei normaler Temperatur gibt es keinen Mehrbedarf.';
  };
  $('#feverIn').addEventListener('input', e => { E.T = +e.target.value / 10; updEnergy(); });
  $('#baseIn').addEventListener('input', e => { E.base = +e.target.value; updEnergy(); });
  updEnergy();
  $('#energyStatus').textContent = 'Vereinfacht: rund 10 Prozent mehr pro Grad über 37 °C, nur in Ruhe gerechnet.';

  const banana = (ctx, x, y, s) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.5);
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, s * 1.1, s, 0);
    ctx.quadraticCurveTo(0, s * .45, -s, 0);
    ctx.fillStyle = BANANA; ctx.fill();
    ctx.strokeStyle = BANANA_EDGE; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };

  const drawEnergy = dt => {
    const { ctx, w, h } = fit(energyCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const ex = extraOf();
    E.shown = reduced ? ex : E.shown + (ex - E.shown) * Math.min(1, dt * 6);
    const maxK = 2200 * 1.4;
    const by1 = h - 44, by0 = 34;
    const BH = k => k / maxK * (by1 - by0);
    const bw = narrow ? 56 : 74;
    const b1x = narrow ? 40 : 56, b2x = b1x + bw + (narrow ? 26 : 40);
    // Achse
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    for (const k of [1000, 2000, 3000]) {
      ctx.beginPath(); ctx.moveTo(b1x - 6, by1 - BH(k)); ctx.lineTo(b2x + bw + 6, by1 - BH(k)); ctx.stroke();
      ctx.fillText(narrow ? `${k / 1000}k` : fmt(k, 0), b1x - 9, by1 - BH(k) + 3);
    }
    ctx.textAlign = 'left'; ctx.fillText('kcal pro Tag', 6, 18);
    // Balken
    roundRect(ctx, b1x, by1 - BH(E.base), bw, BH(E.base), 8); ctx.fillStyle = C.accent; ctx.fill();
    roundRect(ctx, b2x, by1 - BH(E.base), bw, BH(E.base), 8); ctx.fill();
    if (E.shown > 2) {
      const pulse = reduced ? 1 : .8 + .2 * Math.sin(performance.now() / 300);
      ctx.globalAlpha = pulse;
      roundRect(ctx, b2x, by1 - BH(E.base) - BH(E.shown) - 2, bw, BH(E.shown), 8); ctx.fillStyle = C.glow; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(`+${fmt(Math.round(E.shown / 10) * 10, 0)}`, b2x + bw / 2, by1 - BH(E.base) - BH(E.shown) - 8);
    }
    ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('37 °C', b1x + bw / 2, by1 + 16);
    ctx.fillText(narrow ? fmt(E.T, 1) + '°' : deg(E.T), b2x + bw / 2, by1 + 16);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText('normal', b1x + bw / 2, by1 + 30);
    ctx.fillText('Fieber', b2x + bw / 2, by1 + 30);

    // Bananen für den Mehrbedarf
    const ax0 = b2x + bw + (narrow ? 18 : 34), ax1 = w - 12;
    const nb = Math.round(ex / 100);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Mehrbedarf' : 'Mehrbedarf in Bananen', ax0, 18);
    ctx.fillText(narrow ? '1 ≈ 100 kcal' : '1 Banane ≈ 100 kcal', ax0, 31);
    const cell = narrow ? 26 : 34, cols = Math.max(1, Math.floor((ax1 - ax0) / cell));
    for (let i = 0; i < nb; i++) {
      const cx = ax0 + (i % cols) * cell + cell / 2, cy = 58 + Math.floor(i / cols) * cell;
      banana(ctx, cx, cy, cell * .38);
    }
    if (!nb) { ctx.fillStyle = C.muted; ctx.fillText('keine', ax0, 60); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('fieber', 4, {
    thermoLock: () => { ['#setIn', '#infOn', '#infOff'].forEach(s => $(s).disabled = false); TH.on = true; },
    raceLock: () => { ['#tempIn', '#t37', '#t39', '#t41'].forEach(s => $(s).disabled = false); },
    energyLock: () => { ['#feverIn', '#baseIn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawThermo(dt); drawRace(dt); drawEnergy(dt); });
})();
