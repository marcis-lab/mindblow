/* mindblow – Lektion Wolken */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  const drawCloud = (ctx, cx, cy, wd, col, alpha = 1) => {
    // Quellwolke: flache Unterseite, bauschige Oberseite
    const puffs = [[-.38, .0, .22], [-.18, -.18, .3], [.08, -.26, .34], [.3, -.12, .26], [.42, .02, .18], [0, .02, .3]];
    ctx.fillStyle = col; ctx.globalAlpha = alpha;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - wd, cy - wd * 2, wd * 2, wd * 2); ctx.clip();
    for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(cx + dx * wd, cy + dy * wd, r * wd, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  /* ---------- Teil 1: Gewicht einer Wolke ---------- */
  const massCv = $('#massCv');
  const M = { s: 1, lwc: .5 };
  const tonnes = () => M.s ** 3 * M.lwc * 1000; // 1 km³ = 10⁹ m³, g → t
  const updMass = () => {
    const V = M.s ** 3, W = tonnes(), E = W / 6;
    $('#sizeOut').textContent = `${fmt(M.s, 1)} km`;
    $('#lwcOut').textContent = `${fmt(M.lwc, 1)} g`;
    $('#mV').textContent = `${fmt(V, V < 1 ? 2 : V < 10 ? 1 : 0)} km³`;
    $('#mW').textContent = `${fmt(W, 0)} t`;
    $('#mE').textContent = fmt(E, E < 10 ? 1 : 0);
  };
  const massMsg = () => {
    const air = M.s ** 3 * 1.2e6;
    $('#massStatus').textContent = `Die Luft im selben Würfel wiegt rund ${fmt(air, 0)} t, das Wasser nur ${fmt(tonnes(), 0)} t.`;
  };
  const setMass = (s, l) => {
    M.s = s; M.lwc = l; $('#sizeIn').value = s; $('#lwcIn').value = l; updMass(); massMsg();
  };
  $('#sizeIn').addEventListener('input', e => { M.s = +e.target.value; updMass(); massMsg(); $$('#cloudBtns button').forEach(x => x.classList.remove('active')); });
  $('#lwcIn').addEventListener('input', e => { M.lwc = +e.target.value; updMass(); massMsg(); $$('#cloudBtns button').forEach(x => x.classList.remove('active')); });
  $$('#cloudBtns button').forEach(b => b.addEventListener('click', () => {
    setMass(+b.dataset.s, +b.dataset.l);
    $$('#cloudBtns button').forEach(x => x.classList.toggle('active', x === b));
  }));
  updMass();

  const drawElephant = (ctx, x, y, s, col) => {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x, y, 6 * s, 4 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6 * s, y - 2 * s, 3 * s, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(x + 8.5 * s, y - 1 * s); ctx.quadraticCurveTo(x + 10 * s, y + 3 * s, x + 9 * s, y + 5 * s); ctx.stroke();
    for (const dx of [-4, -1.5, 2, 4]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y + 2 * s); ctx.lineTo(x + dx * s, y + 6 * s); ctx.stroke(); }
  };

  const drawMass = () => {
    const { ctx, w, h } = fit(massCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const groundY = h * .56;
    const pxKm = (w * .8) / 5;
    // Boden und Massstab
    ctx.fillStyle = C.good; ctx.globalAlpha = .25; ctx.fillRect(0, groundY, w, 4); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14, groundY + 16); ctx.lineTo(14 + pxKm, groundY + 16); ctx.moveTo(14, groundY + 12); ctx.lineTo(14, groundY + 20); ctx.moveTo(14 + pxKm, groundY + 12); ctx.lineTo(14 + pxKm, groundY + 20); ctx.stroke();
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('1 km', 14 + pxKm / 2, groundY + 32);
    // Wolke (Breite massstäblich, Höhe über Boden etwa 1,5 km, aber nur angedeutet)
    const cw = M.s * pxKm / 2;
    const base = groundY - Math.min(groundY - 30, 1.2 * pxKm * .5 + 20);
    const shade = clamp(M.lwc / 3, 0, 1);
    drawCloud(ctx, w / 2, base, Math.max(10, cw), C.muted, .25 + .45 * shade);
    // Elefanten
    const E = tonnes() / 6;
    let unit = 1; while (E / unit > (small ? 40 : 60)) unit *= 10;
    const n = Math.round(E / unit);
    const cols = small ? 10 : 15, s = small ? 1 : 1.15, gx = small ? 26 : 34, gy = small ? 15 : 17;
    const x0 = (w - (Math.min(n, cols) - 1) * gx) / 2, y0 = groundY + 52;
    for (let i = 0; i < n; i++) {
      const y = y0 + Math.floor(i / cols) * gy;
      if (y > h - 10) break;
      drawElephant(ctx, x0 + (i % cols) * gx, y, s, C.copper);
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(unit === 1 ? '1 Symbol = 1 Elefant (6 t)' : `1 Symbol = ${fmt(unit, 0)} Elefanten`, 12, 18);
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(tonnes(), 0)} t Wasser`, w - 12, 18);
  };

  /* ---------- Teil 2: Fallgeschwindigkeit und Aufwind ---------- */
  const dropCv = $('#dropCv');
  // Messwerte für Regentropfen (Gunn & Kinzer 1949), Durchmesser in mm → m/s; darunter Stokes: v ~ D²
  const TAB = [[.1, .27], [.2, .72], [.3, 1.17], [.4, 1.62], [.5, 2.06], [.6, 2.47], [.8, 3.27], [1, 4.03], [1.4, 5.17], [1.8, 6.09], [2.2, 6.9], [2.6, 7.57], [3, 8.06], [3.6, 8.72], [4.2, 9.09], [5, 9.17]];
  const vFall = D => {
    if (D <= .1) return .27 * (D / .1) ** 2;
    for (let i = 1; i < TAB.length; i++) if (D <= TAB[i][0]) {
      const [d0, v0] = TAB[i - 1], [d1, v1] = TAB[i];
      return v0 + (v1 - v0) * (D - d0) / (d1 - d0);
    }
    return TAB[TAB.length - 1][1];
  };
  const sToD = s => .002 * Math.pow(2500, s / 100);
  const dToS = d => Math.log(d / .002) / Math.log(2500) * 100;
  const R = { D: .02, up: .3, parts: [], on: false };
  const speedTxt = v => v < .01 ? `${fmt(v * 1000, 1)} mm/s` : v < 1 ? `${fmt(v * 100, 1)} cm/s` : `${fmt(v, 1)} m/s`;
  const timeTxt = s => s < 60 ? `${fmt(s, 0)} s` : s < 3600 ? `${fmt(s / 60, 0)} min` : s < 86400 * 2 ? `${fmt(s / 3600, 1)} h` : `${fmt(s / 86400, 0)} Tage`;
  const dTxt = D => D < .1 ? `${fmt(D, 3)} mm` : `${fmt(D, D < 1 ? 2 : 1)} mm`;
  const updDrop = () => {
    const v = vFall(R.D), net = R.up - v;
    $('#dOut').textContent = dTxt(R.D);
    $('#upOut').textContent = `${fmt(R.up, 2)} m/s`;
    $('#rV').textContent = speedTxt(v);
    $('#rNet').textContent = Math.abs(net) < .002 ? 'schwebt' : net > 0 ? `steigt ${speedTxt(net)}` : `sinkt ${speedTxt(-net)}`;
    $('#rT').textContent = timeTxt(1000 / v);
  };
  const dropMsg = () => {
    const v = vFall(R.D), net = R.up - v;
    let m = R.D < .06 ? 'Wolkentröpfchen. ' : R.D < .5 ? 'Nieseltropfen. ' : 'Regentropfen. ';
    m += net > .002 ? 'Der Aufwind ist stärker: Die Tropfen werden nach oben getragen.' : net < -.002 ? 'Die Tropfen fallen schneller, als die Luft steigt.' : 'Aufwind und Fallen gleichen sich aus: Die Tropfen schweben.';
    $('#dropStatus').textContent = m;
  };
  $('#dIn').addEventListener('input', e => {
    R.D = sToD(+e.target.value); updDrop(); dropMsg();
    $$('#dropBtns button').forEach(x => x.classList.remove('active'));
  });
  $('#upIn').addEventListener('input', e => { R.up = +e.target.value; updDrop(); dropMsg(); });
  $$('#dropBtns button').forEach(b => b.addEventListener('click', () => {
    R.D = +b.dataset.d; $('#dIn').value = dToS(R.D);
    $$('#dropBtns button').forEach(x => x.classList.toggle('active', x === b));
    updDrop(); dropMsg();
  }));
  $('#dIn').value = dToS(R.D);
  updDrop();
  R.parts = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random() }));
  const streaks = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random() }));

  const drawDrop = dt => {
    const { ctx, w, h } = fit(dropCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const sx = small ? 46 : 60, sw = w * (small ? .5 : .5), top = 16, bot = h - 16, sh = bot - top;
    const pxm = sh / 10; // Schacht 10 m hoch
    roundRect(ctx, sx, top, sw, sh, 12); ctx.fillStyle = C.sunk; ctx.fill();
    // Massstab
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let m = 0; m <= 10; m += 2) {
      const y = bot - m * pxm;
      ctx.beginPath(); ctx.moveTo(sx - 8, y); ctx.lineTo(sx - 2, y); ctx.stroke();
      ctx.fillText(`${m} m`, sx - 11, y + 4);
    }
    ctx.save(); roundRect(ctx, sx, top, sw, sh, 12); ctx.clip();
    // Aufwind-Striche
    if (R.up > 0) {
      ctx.strokeStyle = C.fiber; ctx.globalAlpha = .35; ctx.lineWidth = 1.5;
      for (const s of streaks) {
        if (R.on) s.y -= R.up * dt / 10;
        s.y = ((s.y % 1) + 1) % 1;
        const x = sx + s.x * sw, y = top + s.y * sh, l = 6 + R.up * 5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + l); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Tropfen
    const v = vFall(R.D), net = v - R.up; // positiv = nach unten
    const rr = clamp(1.6 + Math.log10(R.D / .002) * 1.6, 1.6, 7);
    ctx.fillStyle = C.accent;
    for (const p of R.parts) {
      if (R.on) p.y += net * dt / 10;
      p.y = ((p.y % 1) + 1) % 1;
      const x = sx + 8 + p.x * (sw - 16), y = top + p.y * sh;
      ctx.beginPath();
      if (R.D > .8) { ctx.moveTo(x, y - rr * 1.3); ctx.quadraticCurveTo(x + rr, y, x, y + rr); ctx.quadraticCurveTo(x - rr, y, x, y - rr * 1.3); }
      else ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // Pfeile rechts: Fallen und Aufwind (Länge ~ Wurzel des Tempos)
    const ax = sx + sw + (small ? 30 : 50), cy = top + sh / 2, Lm = Math.min(sh / 2 - 20, 120);
    const len = u => Lm * Math.sqrt(clamp(u / 9.2, 0, 1));
    const arr = (x, y1, y2, col) => {
      if (Math.abs(y2 - y1) < 1) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y1, 2, 0, TAU); ctx.fill(); return; }
      const d = Math.sign(y2 - y1), hd = Math.min(8, Math.abs(y2 - y1));
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2 - d * hd * .8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 6, y2 - d * hd); ctx.lineTo(x + 6, y2 - d * hd); ctx.closePath(); ctx.fill();
    };
    arr(ax, cy + 4, cy + 4 + len(v), C.copper);
    arr(ax + (small ? 26 : 40), cy - 4, cy - 4 - len(R.up), C.fiber);
    ctx.font = MONO; ctx.textAlign = 'center';
    ctx.fillStyle = C.copper; ctx.fillText('fallen', ax, Math.min(h - 6, cy + 18 + len(v)));
    ctx.fillStyle = C.fiber; ctx.fillText(small ? 'Wind' : 'Aufwind', ax + (small ? 26 : 40), Math.max(12, cy - 12 - len(R.up)));
    if (!R.on) { ctx.fillStyle = C.muted; ctx.fillText('wartet', sx + sw / 2, top + sh / 2); }
  };

  /* ---------- Teil 3: Aufsteigen, Abkühlen, Kondensieren ---------- */
  const liftCv = $('#liftCv');
  const L = { T: 24, RH: 55, z: 0, running: false, done: false, cloudTop: 0 };
  const DRY = 9.8, MOIST = 6, DEW = 1.8; // K pro km, vereinfacht
  const dew = () => { const a = 17.62, b = 243.12, g = Math.log(L.RH / 100) + a * L.T / (b + L.T); return b * g / (a - g); };
  const baseM = () => 125 * (L.T - dew());
  const tAt = z => { const b = baseM(); return z <= b ? L.T - DRY * z / 1000 : L.T - DRY * b / 1000 - MOIST * (z - b) / 1000; };
  const tdAt = z => { const b = baseM(); return z <= b ? dew() - DEW * z / 1000 : tAt(z); };
  const zMax = () => clamp(Math.ceil((baseM() + 1500) / 1000) * 1000, 2000, 5000);
  const updLift = () => {
    $('#tOut').textContent = `${L.T} °C`;
    $('#rhOut').textContent = `${L.RH} %`;
    $('#lTd').textContent = `${fmt(dew(), 1)} °C`;
    $('#lBase').textContent = `${fmt(Math.round(baseM() / 10) * 10, 0)} m`;
    $('#lNow').textContent = `${fmt(L.z, 0)} m · ${fmt(tAt(L.z), 1)} °C`;
  };
  const resetLift = () => { L.z = 0; L.running = false; L.done = false; L.cloudTop = 0; $('#liftBtn').textContent = 'Luft aufsteigen lassen'; updLift(); };
  $('#tIn').addEventListener('input', e => { L.T = +e.target.value; resetLift(); $('#liftStatus').textContent = `Taupunkt ${fmt(dew(), 1)} °C. Die Wolke beginnt auf etwa ${fmt(Math.round(baseM() / 10) * 10, 0)} m.`; });
  $('#rhIn').addEventListener('input', e => {
    L.RH = +e.target.value; resetLift();
    $('#liftStatus').textContent = L.RH > 90 ? 'Sehr feuchte Luft: Die Wolke beginnt fast am Boden. So entsteht Nebel.' : L.RH < 40 ? 'Trockene Luft: Sie muss weit steigen, bis sie den Taupunkt erreicht.' : `Taupunkt ${fmt(dew(), 1)} °C.`;
  });
  $('#liftBtn').addEventListener('click', () => {
    if (L.running) return;
    resetLift(); L.running = true;
    if (reduced) { L.z = zMax() - 300; L.cloudTop = L.z; L.running = false; L.done = true; updLift(); }
    $('#liftStatus').textContent = 'Die Luft steigt und dehnt sich aus. Dabei kühlt sie ab, rund 1 °C pro 100 m.';
  });
  updLift();

  const drawLift = dt => {
    if (L.running) {
      const b = baseM(), was = L.z;
      L.z += dt * 320;
      if (was < b && L.z >= b) $('#liftStatus').textContent = `Auf ${fmt(Math.round(b / 10) * 10, 0)} m ist der Taupunkt erreicht. Der Dampf kondensiert: Die Wolke beginnt.`;
      if (L.z >= zMax() - 300) {
        L.z = zMax() - 300; L.running = false; L.done = true; $('#liftBtn').textContent = 'Nochmal';
        $('#liftStatus').textContent = 'Über der Basis kühlt die Luft langsamer ab, weil das Kondensieren Wärme freisetzt (vereinfacht 0,6 °C pro 100 m).';
      }
      if (L.z > b) L.cloudTop = L.z;
      updLift();
    }
    const { ctx, w, h } = fit(liftCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const top = 18, bot = h - 30, zm = zMax();
    const Y = z => bot - (bot - top) * z / zm;
    const lw = Math.round(w * (small ? .44 : .42));
    // linke Szene
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    const ax = small ? 40 : 50;
    for (let z = 0; z <= zm; z += 1000) {
      const y = Y(z);
      ctx.beginPath(); ctx.moveTo(ax - 6, y); ctx.lineTo(lw, y); ctx.stroke();
      ctx.fillText(small ? `${z / 1000} km` : `${fmt(z, 0)} m`, ax - 9, y + 4);
    }
    ctx.fillStyle = C.good; ctx.globalAlpha = .3; ctx.fillRect(ax, bot, lw - ax, 5); ctx.globalAlpha = 1;
    const b = baseM(), cx = (ax + lw) / 2;
    // Wolkenbasis gestrichelt
    ctx.strokeStyle = C.fiber; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ax, Y(b)); ctx.lineTo(lw, Y(b)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.fiber; ctx.textAlign = 'left'; ctx.fillText(small ? 'Basis' : 'Wolkenbasis', ax + 4, Y(b) + 14);
    // Wolke wächst von der Basis nach oben
    if (L.cloudTop > b) {
      const hpx = Y(b) - Y(L.cloudTop), cwid = Math.min((lw - ax) * .48, 30 + hpx * .5);
      ctx.save(); ctx.beginPath(); ctx.rect(ax, Y(L.cloudTop) - 40, lw - ax, Y(b) - Y(L.cloudTop) + 40); ctx.clip();
      ctx.fillStyle = C.muted; ctx.globalAlpha = .38;
      ctx.fillRect(cx - cwid, Y(L.cloudTop) + 8, cwid * 2, hpx - 8);
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(cx + (k - 2) * cwid * .42, Y(L.cloudTop) + 10 + (k % 2) * 6, cwid * .32, 0, TAU); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // Luftpaket
    {
      const py = Y(L.z), pr = 11 + 5 * L.z / zm; // dehnt sich beim Steigen aus
      ctx.strokeStyle = L.z >= b ? C.fiber : C.copper; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, py - pr, pr, 0, TAU); ctx.stroke();
      if (L.z >= b) { ctx.fillStyle = C.fiber; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(cx + Math.cos(k) * pr * .5, py - pr + Math.sin(k * 2) * pr * .5, 1.8, 0, TAU); ctx.fill(); } }
      ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      ctx.fillText(`${fmt(tAt(L.z), 1)} °C`, cx + pr + 6, py - pr + 4);
    }
    // Diagramm rechts: Temperatur und Taupunkt gegen Höhe
    const gx = lw + (small ? 30 : 46), gw = w - gx - 12;
    const tMin = Math.floor((tAt(zm) - 4) / 5) * 5, tMaxV = Math.ceil((L.T + 2) / 5) * 5;
    const X = t => gx + gw * (t - tMin) / (tMaxV - tMin);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    const step = (tMaxV - tMin) > 30 ? 10 : 5;
    for (let t = tMin; t <= tMaxV; t += step) {
      ctx.beginPath(); ctx.moveTo(X(t), top); ctx.lineTo(X(t), bot); ctx.stroke();
      ctx.fillText(`${t}°`, X(t), bot + 14);
    }
    const curve = (fn, col, z1) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let z = 0; z <= z1; z += zm / 80) z ? ctx.lineTo(X(fn(z)), Y(z)) : ctx.moveTo(X(fn(z)), Y(z));
      ctx.stroke();
    };
    curve(tdAt, C.fiber, zm); curve(tAt, C.copper, zm);
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(X(tAt(L.z)), Y(L.z), 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(X(tAt(b)), Y(b), 3, 0, TAU); ctx.fillStyle = C.fiber; ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = C.copper; ctx.fillText(small ? 'Temp.' : 'Temperatur', gx + 2, top + 10);
    ctx.fillStyle = C.fiber; ctx.fillText('Taupunkt', gx + 2, top + 24);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('°C', w - 12, h - 2);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('wolken', 4, {
    massLock: () => { ['#sizeIn', '#lwcIn'].forEach(s => $(s).disabled = false); $$('#cloudBtns button').forEach(b => b.disabled = false); massMsg(); },
    dropLock: () => { R.on = true; ['#dIn', '#upIn'].forEach(s => $(s).disabled = false); $$('#dropBtns button').forEach(b => b.disabled = false); dropMsg(); },
    liftLock: () => { $('#tIn').disabled = false; $('#rhIn').disabled = false; $('#liftBtn').disabled = false; },
  });

  loop(dt => { drawMass(); drawDrop(dt); drawLift(dt); });
})();
