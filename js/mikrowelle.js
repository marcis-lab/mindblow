/* mindblow – Lektion Mikrowelle */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const deg = n => `${n < 0 ? '−' : ''}${fmt(Math.abs(n), 0)} °C`;
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  /* ---------- Teil 1: Dipole im Wechselfeld ---------- */
  const fieldCv = $('#fieldCv');
  // abs: wie gut der Stoff die Mikrowellen schluckt, relativ zu Wasser (grob vereinfacht).
  // Reines Eis schluckt noch viel weniger; gefrorenes Essen hat aber immer etwas flüssiges Wasser.
  const SUB = {
    water: { name: 'Wasser', c: 4186, abs: 1, T0: 20 },
    oil: { name: 'Öl', c: 1970, abs: .15, T0: 20 },
    ice: { name: 'Eis', c: 2100, abs: .06, T0: -18 },
  };
  const MASS = .1, EFF = .7, TIME_X = 6, LATENT = 334000;
  const W = { sub: 'water', P: 800, T: 20, melt: 0, t: 0, run: false, on: false, ph: 0, rate: 0, msg: '' };
  const mols = Array.from({ length: 24 }, () => ({ a: Math.random() * TAU, n: Math.random() * TAU }));
  const resetW = () => { W.T = SUB[W.sub].T0; W.melt = 0; W.t = 0; W.rate = 0; W.run = false; mols.forEach(m => { m.a = Math.random() * TAU; }); updW(); };

  const absNow = () => {
    if (W.sub !== 'ice') return SUB[W.sub].abs;
    if (W.T < 0) return SUB.ice.abs;
    return W.melt < 1 ? SUB.ice.abs + (1 - SUB.ice.abs) * W.melt : 1;
  };
  const stepW = h => {
    const Q = W.P * EFF * absNow();
    const T0 = W.T;
    if (W.sub === 'ice' && W.T >= 0 && W.melt < 1) {
      W.T = 0; W.melt = Math.min(1, W.melt + Q * h / (MASS * LATENT));
    } else {
      const c = W.sub === 'ice' ? (W.T < 0 ? SUB.ice.c : 4186) : SUB[W.sub].c;
      W.T = Math.min(100, W.T + Q * h / (MASS * c));
      if (W.sub === 'ice' && T0 < 0 && W.T > 0) W.T = 0;
    }
    if (W.sub === 'oil') W.T = Math.min(180, W.T); // Öl kocht nicht bei 100 °C
    W.rate = (W.T - T0) / h * 60;
    W.t += h;
  };
  const updW = () => {
    $('#powOut').textContent = `${W.P} W`;
    $('#mwBtn').textContent = W.run ? 'Ausschalten' : 'Einschalten';
    if (!W.on) return;
    const melting = W.sub === 'ice' && W.T === 0 && W.melt < 1 && W.t > 0;
    $('#mwT').textContent = melting ? `0 °C, ${fmt(W.melt * 100, 0)} % flüssig` : deg(W.T);
    $('#mwT').style.fontSize = melting ? '14px' : '';
    $('#mwRate').textContent = !W.run ? '–' : W.T >= 100 && W.sub !== 'oil' ? 'kocht' : melting ? 'schmilzt' : `+${fmt(W.rate, 0)}`;
    $('#mwTime').textContent = W.t > 0 ? mmss(W.t) : '–';
    let m;
    if (W.sub === 'water') m = W.T >= 100 ? 'Das Wasser kocht. Ab jetzt geht die Energie ins Verdampfen.' : 'Wasser: Die geknickten Moleküle drehen kräftig mit. Es wird schnell heiss.';
    else if (W.sub === 'oil') m = 'Öl: Seine Moleküle sind lange Ketten mit kaum Plus und Minus. Das Feld kann sie schlecht drehen, Öl wird viel langsamer warm.';
    else if (W.T < 0) m = 'Eis: Die Moleküle sitzen fest im Gitter und können kaum mitdrehen. Es wird nur langsam wärmer. Zeitraffer läuft.';
    else if (W.melt < 1) m = 'Die ersten Tropfen sind flüssig. Flüssiges Wasser schluckt die Wellen viel besser, also schmilzt es immer schneller. So entstehen beim Auftauen heisse Stellen neben Eisklumpen.';
    else m = 'Alles geschmolzen. Jetzt verhält es sich wie normales Wasser und wird schnell heiss.';
    if (m !== W.msg) { W.msg = m; $('#fieldStatus').textContent = m; }
  };
  $$('#subBtns button').forEach(b => b.addEventListener('click', () => {
    W.sub = b.dataset.sub;
    $$('#subBtns button').forEach(x => x.classList.toggle('active', x === b));
    resetW();
  }));
  $('#powIn').addEventListener('input', e => { W.P = +e.target.value; updW(); });
  $('#mwBtn').addEventListener('click', () => { W.run = !W.run; updW(); });
  $('#mwReset').addEventListener('click', resetW);
  updW();

  const drawWater = (ctx, x, y, a, s, col) => {
    // a: Richtung des Plus-Endes (zwischen den Wasserstoffen)
    ctx.fillStyle = C.muted;
    for (const d of [-.91, .91]) { ctx.beginPath(); ctx.arc(x + Math.cos(a + d) * s * 1.1, y + Math.sin(a + d) * s * 1.1, s * .55, 0, TAU); ctx.fill(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, s * .85, 0, TAU); ctx.fill();
  };

  const drawField = (dt, now) => {
    if (W.run && W.on) {
      let left = dt * TIME_X;
      while (left > 1e-6) { const hh = Math.min(.05, left); stepW(hh); left -= hh; }
      updW();
    }
    const { ctx, w, h } = fit(fieldCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    if (W.run && !reduced) W.ph += dt * .7;
    const E = W.run ? (reduced ? 1 : Math.sin(W.ph * TAU)) : 0;
    const bx = 10, bw = w - (small ? 76 : 110), py1 = 34, py2 = h - 34;
    // Platten
    ctx.fillStyle = C.sunk; ctx.fillRect(bx, py1, bw, py2 - py1);
    for (const [y, sign] of [[py1, E >= 0 ? '+' : '−'], [py2, E >= 0 ? '−' : '+']]) {
      const yy = y === py1 ? y - 12 : y;
      ctx.fillStyle = W.run ? (sign === '+' ? C.bad : C.accent) : C.line; ctx.globalAlpha = W.run ? .25 + .6 * Math.abs(E) : 1;
      ctx.fillRect(bx, yy, bw, 12); ctx.globalAlpha = 1;
      if (W.run && Math.abs(E) > .1) {
        ctx.fillStyle = C.fg; ctx.font = '600 12px Outfit, sans-serif'; ctx.textAlign = 'center';
        for (let k = 0; k < 5; k++) ctx.fillText(sign, bx + bw * (k + .5) / 5, yy + 10);
      }
    }
    // Feldpfeile
    if (W.run && Math.abs(E) > .15) {
      ctx.strokeStyle = C.glow; ctx.fillStyle = C.glow; ctx.lineWidth = 1.5; ctx.globalAlpha = Math.abs(E) * .6;
      const dir = E > 0 ? 1 : -1;
      for (const fx of [bx + 14, bx + bw - 14]) {
        const y1 = (py1 + py2) / 2 - dir * 40, y2 = (py1 + py2) / 2 + dir * 40;
        ctx.beginPath(); ctx.moveTo(fx, y1); ctx.lineTo(fx, y2 - dir * 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx, y2); ctx.lineTo(fx - 5, y2 - dir * 8); ctx.lineTo(fx + 5, y2 - dir * 8); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Moleküle
    const cols = small ? 4 : 6, rows = 3, s = small ? 7 : 8;
    const gx0 = bx + 34, gw = bw - 68, gy0 = py1 + 30, gh = py2 - py1 - 60;
    const melted = W.sub === 'ice' ? (W.T < 0 ? 0 : W.melt) : 1;
    const heat = .15 + clamp((W.T + 20) / 120, 0, 1) * .5;
    const tt = reduced ? 0 : now / 1000;
    for (let i = 0; i < cols * rows; i++) {
      const m = mols[i], cx = cols > 1 ? gx0 + gw * (i % cols) / (cols - 1) : gx0, cy = gy0 + gh * Math.floor(i / cols) / (rows - 1);
      if (W.sub === 'oil') {
        // Fettsäure-Kette, dreht kaum
        const a = (W.run ? E * .15 : 0) + Math.sin(tt * 3 + m.n) * .06 + m.n * .05;
        ctx.strokeStyle = C.glow; ctx.lineWidth = 2; ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const u = (k - 2.5) * s * 1.1, v = (k % 2 ? 1 : -1) * s * .4;
          const x = cx + u * Math.cos(a) - v * Math.sin(a), y = cy + u * Math.sin(a) + v * Math.cos(a);
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        continue;
      }
      const frozen = W.sub === 'ice' && (i / (cols * rows)) >= melted;
      if (frozen) {
        // im Gitter: feste Richtung, nur ein Zittern
        const a = (i % 2 ? -1 : 1) * Math.PI / 2 + (i % 3 - 1) * .5 + E * .08 + (reduced ? 0 : Math.sin(tt * 7 + m.n) * .05);
        if (i % cols < cols - 1) {
          ctx.strokeStyle = C.glow; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx + s, cy); ctx.lineTo(cx + gw / (cols - 1) - s, cy); ctx.stroke(); ctx.setLineDash([]);
        }
        drawWater(ctx, cx, cy, a, s, C.accent);
        continue;
      }
      if (!reduced) {
        if (W.run) {
          const target = E >= 0 ? Math.PI / 2 : -Math.PI / 2;
          m.a += angDiff(target, m.a) * Math.min(1, dt * 7 * Math.abs(E));
        }
        m.a += (Math.random() - .5) * heat * dt * (W.run ? 20 : 6);
      } else if (W.run) m.a = Math.PI / 2;
      const amp = reduced ? 0 : heat * 4 * (W.run ? 1 : .3);
      const jx = (Math.random() - .5) * amp, jy = (Math.random() - .5) * amp;
      drawWater(ctx, cx + jx, cy + jy, m.a, s, C.fiber);
    }
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(W.run ? (small ? 'Zeitlupe' : 'Zeitlupe: in echt 2,45 Milliarden Mal pro Sekunde') : 'Feld aus: Moleküle zeigen wild durcheinander', bx, 14);
    if (W.sub !== 'oil') {
      ctx.fillStyle = C.fiber; ctx.fillText('● O (−)', bx, h - 6);
      ctx.fillStyle = C.muted; ctx.fillText('● H (+)', bx + 66, h - 6);
    }
    // Thermometer
    const tx = w - (small ? 38 : 56), t0 = 30, t1 = h - 46;
    roundRect(ctx, tx - 7, t0, 14, t1 - t0, 7); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const TY = T => t1 - (t1 - t0) * clamp((T + 20) / 140, 0, 1);
    ctx.fillStyle = W.T > 60 ? C.bad : W.T > 0 ? C.copper : C.accent;
    roundRect(ctx, tx - 4, TY(W.T), 8, t1 - TY(W.T), 4); ctx.fill();
    ctx.beginPath(); ctx.arc(tx, t1 + 8, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    for (const T of [0, 50, 100]) ctx.fillText(String(T), tx - 11, TY(T) + 4);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.fillText(deg(W.T), tx, 18);
  };

  /* ---------- Teil 2: Braten im Querschnitt ---------- */
  const roastCv = $('#roastCv');
  const NS = 30, DELTA = .012, RHO_C = 1050 * 3500, K = .45, T_START = 5; // Schalen, Eindringtiefe der Leistung (m), Fleisch
  const R = { dia: 12, P: 800, T: [], heat: false, started: false, t: 0, on: false, msg: '' };
  const resetR = () => { R.T = Array(NS).fill(T_START); R.heat = false; R.started = false; R.t = 0; updR(); };
  const geom = () => {
    const rad = R.dia / 200, dr = rad / NS, V = [], A = [], wq = [];
    for (let i = 0; i < NS; i++) {
      V.push(4 / 3 * Math.PI * (Math.pow((i + 1) * dr, 3) - Math.pow(i * dr, 3)));
      A.push(4 * Math.PI * Math.pow(i * dr, 2)); // Fläche zur inneren Nachbarschale
      wq.push(V[i] * Math.exp(-(rad - (i + .5) * dr) / DELTA));
    }
    const sw = wq.reduce((a, b) => a + b, 0);
    return { rad, dr, V, A, q: wq.map(x => x / sw) };
  };
  const stepR = simDt => {
    const g = geom(), alpha = K / RHO_C;
    const hMax = .25 * g.dr * g.dr / (6 * alpha);
    const n = Math.max(1, Math.min(5000, Math.ceil(simDt / hMax))), hh = simDt / n;
    const P = R.heat ? R.P * EFF : 0, T = R.T, dT = new Array(NS);
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < NS; i++) {
        let q = P * g.q[i];
        if (i > 0) q += K * g.A[i] * (T[i - 1] - T[i]) / g.dr;
        if (i < NS - 1) q += K * g.A[i + 1] * (T[i + 1] - T[i]) / g.dr;
        dT[i] = q * hh / (RHO_C * g.V[i]);
      }
      for (let i = 0; i < NS; i++) T[i] = Math.min(100, T[i] + dT[i]);
    }
    R.t += simDt;
  };
  const edgeT = () => {
    const g = geom(); let s = 0, v = 0;
    for (let i = 0; i < NS; i++) if ((i + .5) * g.dr > g.rad - .01) { s += R.T[i] * g.V[i]; v += g.V[i]; }
    return v ? s / v : R.T[NS - 1];
  };
  const updR = () => {
    $('#diaOut').textContent = `${R.dia} cm`;
    $('#pow2Out').textContent = `${R.P} W`;
    $('#heatBtn').textContent = R.heat ? 'Pause, ruhen lassen' : R.started ? 'Weiter erhitzen' : 'Erhitzen';
    if (!R.on) return;
    const e = edgeT(), c = R.T[0];
    $('#rEdge').textContent = deg(e);
    $('#rCore').textContent = deg(c);
    $('#rTime').textContent = R.started ? mmss(R.t) : '–';
    let m;
    if (!R.started) m = `Eine Kugel aus Fleisch, ${R.dia} cm dick, frisch aus dem Kühlschrank. Zeitraffer: 10 Sekunden pro Sekunde.`;
    else if (R.dia <= 4) m = 'Ein dünnes Stück: Die Wellen erreichen fast alles direkt. Rand und Kern werden ähnlich schnell warm.';
    else if (R.heat && e > 95) m = `Der Rand kocht schon, der Kern hat erst ${fmt(c, 0)} °C. Mach eine Pause und lass die Wärme nach innen wandern.`;
    else if (R.heat) m = 'Die Mikrowellen heizen die äusseren Zentimeter. Der Kern bleibt fast kalt.';
    else m = 'Ruhen lassen: Ohne Mikrowellen wandert die Wärme langsam vom Rand nach innen.';
    if (m !== R.msg) { R.msg = m; $('#roastStatus').textContent = m; }
  };
  $('#diaIn').addEventListener('input', e => { R.dia = +e.target.value; resetR(); });
  $('#pow2In').addEventListener('input', e => { R.P = +e.target.value; updR(); });
  $('#heatBtn').addEventListener('click', () => {
    R.heat = !R.heat; R.started = true;
    if (reduced && R.heat) { stepR(120); R.heat = false; }
    updR();
  });
  $('#roastReset').addEventListener('click', resetR);
  resetR();

  const tempFill = (ctx, T) => {
    const t = clamp((T - T_START) / (100 - T_START), 0, 1);
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .55 * (1 - t) + .08; ctx.fill();
    ctx.fillStyle = C.copper; ctx.globalAlpha = .75 * Math.min(1, t * 1.6); ctx.fill();
    ctx.fillStyle = C.bad; ctx.globalAlpha = .8 * clamp((T - 65) / 35, 0, 1); ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawRoast = dt => {
    if (R.started && R.on && R.t < 3600) { stepR(dt * 10); updR(); }
    const { ctx, w, h } = fit(roastCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const maxR = Math.min(h / 2 - 34, w * (small ? .2 : .22));
    const cx = 14 + maxR, cy = h / 2 - 6;
    const rp = maxR * R.dia / 20;
    // Scheiben von aussen nach innen
    for (let i = NS - 1; i >= 0; i--) {
      ctx.beginPath(); ctx.arc(cx, cy, rp * (i + 1) / NS + .4, 0, TAU);
      tempFill(ctx, R.T[i]);
    }
    ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    // Eindringtiefe
    if (R.dia / 2 > 1.6) {
      const ri = rp * (1 - 1.2 / (R.dia / 2));
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.fg; ctx.globalAlpha = .6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, ri, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText(`${R.dia} cm`, cx, cy + maxR + 20);
    if (!small && R.dia / 2 > 1.6) ctx.fillText('gestrichelt: 1,2 cm tief', cx, cy - maxR - 12);
    // Wellen-Pfeile, wenn an
    if (R.heat) {
      ctx.strokeStyle = C.glow; ctx.lineWidth = 2;
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const x1 = cx + Math.cos(a) * (rp + 18), y1 = cy + Math.sin(a) * (rp + 18);
        ctx.beginPath();
        for (let k = 0; k <= 12; k++) {
          const u = k / 12, rr = rp + 18 - u * 12, side = Math.sin(u * TAU * 1.5) * 3;
          const x = cx + Math.cos(a) * rr - Math.sin(a) * side, y = cy + Math.sin(a) * rr + Math.cos(a) * side;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x1, y1);
        }
        ctx.stroke();
      }
    }
    // Profil
    const gx = cx + maxR + (small ? 40 : 56), gy = 18, gw = w - gx - 12, gh = h - gy - 40;
    const X = u => gx + gw * (u + 1) / 2, Y = T => gy + gh - gh * clamp(T, 0, 100) / 100;
    ctx.lineWidth = 1;
    for (const T of [0, 25, 50, 75, 100]) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, Y(T)); ctx.lineTo(gx + gw, Y(T)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(T), gx - 5, Y(T) + 4);
    }
    ctx.textAlign = 'left'; ctx.fillText('°C', gx - (small ? 30 : 36), gy - 4);
    ctx.textAlign = 'center';
    ctx.fillText('Rand', X(-1) + 12, gy + gh + 15); ctx.fillText('Kern', X(0), gy + gh + 15); ctx.fillText('Rand', X(1) - 12, gy + gh + 15);
    ctx.strokeStyle = C.copper; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let k = -NS; k < NS; k++) {
      const i = k < 0 ? -k - 1 : k, u = (k + .5) / NS;
      k === -NS ? ctx.moveTo(X(u), Y(R.T[i])) : ctx.lineTo(X(u), Y(R.T[i]));
    }
    ctx.stroke();
  };

  /* ---------- Teil 3: Schokolade und stehende Wellen ---------- */
  const chocoCv = $('#chocoCv');
  const D_HALF = 6.12; // halbe Wellenlänge in cm (Lichtgeschwindigkeit / 2,45 GHz / 2)
  const CW = 26, CH = 16, CELL = .5;
  const NX = CW / CELL, NY = CH / CELL;
  const S = { turn: false, run: false, t: 0, ang: 0, E: new Float32Array(NX * NY), on: false, map: false, msg: '' };
  const field = (x, y) => {
    const sx = Math.pow(Math.sin(Math.PI * (x + 1.3) / D_HALF), 2), sy = Math.pow(Math.sin(Math.PI * (y - .7) / D_HALF), 2);
    return .85 * sx * sy + .15 * sx;
  };
  const meltFrac = () => { let n = 0; for (const e of S.E) if (e >= 1) n++; return n / S.E.length; };
  const resetS = () => { S.E.fill(0); S.t = 0; S.ang = 0; S.run = false; updS(); };
  const stepS = hh => {
    if (S.turn) S.ang += hh * TAU / 12;
    const c = Math.cos(S.ang), s = Math.sin(S.ang);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const u = -CW / 2 + (i + .5) * CELL, v = -CH / 2 + (j + .5) * CELL;
      S.E[j * NX + i] += field(u * c - v * s, u * s + v * c) * hh / 5;
    }
    S.t += hh;
  };
  const updS = () => {
    $('#choBtn').textContent = S.run ? 'Ausschalten' : S.t > 0 ? 'Weiter' : 'Einschalten';
    $('#mapBtn').textContent = S.map ? 'Wellenmuster ausblenden' : 'Wellenmuster zeigen';
    if (!S.on) return;
    const mf = meltFrac();
    $('#cTime').textContent = S.t > 0 ? `${fmt(S.t, 0)} s` : '–';
    $('#cMelt').textContent = S.t > 0 ? `${fmt(mf * 100, 0)} %` : '–';
    const canMeasure = !S.turn && mf > .02 && mf < .7;
    $('#cLight').textContent = canMeasure ? `${fmt(2 * D_HALF / 100 * 2.45e9 / 1000, 0)} km/s` : '–';
    let m;
    if (S.t === 0) m = 'Eine flache Schokoladentafel, 26 cm breit. Kurz einschalten genügt.';
    else if (S.turn) m = 'Mit Drehteller: Jede Stelle wandert durch heisse und kalte Zonen. Es schmilzt gleichmässiger, aber in Ringen. Die Mitte bleibt oft kühl, weil sie sich kaum bewegt.';
    else if (mf < .02) m = 'Noch nichts zu sehen. Die Wärme sammelt sich an den heissen Stellen.';
    else if (mf < .7) m = 'Ohne Drehteller: Flecken im Abstand von rund 6 cm. Das ist eine halbe Wellenlänge. Daraus folgt die Lichtgeschwindigkeit.';
    else m = 'Fast alles geschmolzen. Für die Messung lieber früher ausschalten.';
    if (m !== S.msg) { S.msg = m; $('#chocoStatus').textContent = m; }
  };
  $$('#turnBtns button').forEach(b => b.addEventListener('click', () => {
    S.turn = b.dataset.turn === '1';
    $$('#turnBtns button').forEach(x => x.classList.toggle('active', x === b));
    resetS();
  }));
  $('#choBtn').addEventListener('click', () => {
    if (reduced) { for (let k = 0; k < 120; k++) stepS(.1); updS(); return; }
    S.run = !S.run; updS();
  });
  $('#choReset').addEventListener('click', resetS);
  $('#mapBtn').addEventListener('click', () => { S.map = !S.map; updS(); });
  updS();

  const drawChoco = dt => {
    if (S.run) {
      let left = dt; while (left > 1e-6) { const hh = Math.min(.05, left); stepS(hh); left -= hh; }
      updS();
    }
    const { ctx, w, h } = fit(chocoCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const side = Math.min(w - 20, h - 30), pc = side / 30; // Pixel pro cm, Garraum 30 × 30 cm
    const cx = w / 2, cy = 10 + side / 2;
    // Garraum
    roundRect(ctx, cx - side / 2, cy - side / 2, side, side, 10);
    ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.stroke();
    // Wellenmuster (fest im Garraum)
    if (S.map) {
      const st = small ? 1 : .75;
      for (let y = -15; y < 15; y += st) for (let x = -15; x < 15; x += st) {
        ctx.fillStyle = C.glow; ctx.globalAlpha = field(x + st / 2, y + st / 2) * .45;
        ctx.fillRect(cx + x * pc, cy + y * pc, st * pc + .5, st * pc + .5);
      }
      ctx.globalAlpha = 1;
    }
    // Teller
    ctx.beginPath(); ctx.arc(cx, cy, 14 * pc, 0, TAU); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    // Schokolade (dreht mit dem Teller)
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.ang);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const e = S.E[j * NX + i], melted = e >= 1;
      ctx.fillStyle = C.copper; ctx.globalAlpha = melted ? .95 : .3 + .15 * Math.min(1, e);
      ctx.fillRect((-CW / 2 + i * CELL) * pc, (-CH / 2 + j * CELL) * pc, CELL * pc + .4, CELL * pc + .4);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1; ctx.strokeRect(-CW / 2 * pc, -CH / 2 * pc, CW * pc, CH * pc);
    ctx.restore();
    // Messlatte
    const mf = meltFrac();
    if (!S.turn && mf > .02 && mf < .7) {
      const x1 = D_HALF / 2 - 1.3 - D_HALF, x2 = D_HALF / 2 - 1.3, y = D_HALF / 2 + .7;
      const X1 = cx + x1 * pc, X2 = cx + x2 * pc, Yp = cy + y * pc;
      ctx.strokeStyle = C.fg; ctx.fillStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X1, Yp - 6); ctx.lineTo(X1, Yp + 6); ctx.moveTo(X2, Yp - 6); ctx.lineTo(X2, Yp + 6); ctx.moveTo(X1, Yp); ctx.lineTo(X2, Yp); ctx.stroke();
      roundRect(ctx, (X1 + X2) / 2 - 26, Yp + 8, 52, 18, 5); ctx.fillStyle = C.surface; ctx.fill();
      ctx.fillStyle = C.fg; ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillText(`${fmt(D_HALF, 1)} cm`, (X1 + X2) / 2, Yp + 21);
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(small ? 'Garraum 30 cm' : 'Garraum 30 × 30 cm, von oben', cx - side / 2, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(S.turn ? 'Teller dreht' : 'Teller steht', cx + side / 2, h - 4);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('mikrowelle', 4, {
    fieldLock: () => { W.on = true; $$('#subBtns button').forEach(b => b.disabled = false); $('#powIn').disabled = false; $('#mwBtn').disabled = false; $('#mwReset').disabled = false; W.msg = ''; updW(); },
    roastLock: () => { R.on = true; $('#diaIn').disabled = false; $('#pow2In').disabled = false; $('#heatBtn').disabled = false; $('#roastReset').disabled = false; R.msg = ''; updR(); },
    chocoLock: () => { S.on = true; $$('#turnBtns button').forEach(b => b.disabled = false); $('#choBtn').disabled = false; $('#choReset').disabled = false; $('#mapBtn').disabled = false; S.msg = ''; updS(); },
  });

  loop((dt, now) => { drawField(dt, now); drawRoast(dt); drawChoco(dt); });
})();
