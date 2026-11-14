/* mindblow – Lektion Jahreszeiten */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  /* ---------- Astronomie (vereinfacht, genau auf etwa ein Grad) ---------- */
  const D2R = Math.PI / 180, TILT = 23.44, AU = 149.6;
  const LAT_ZH = 47.37, LAT_SY = -33.87;
  const FONT = '11px Geist Mono, monospace';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Sonnenstand nach dem Jahreslauf: ekliptische Länge der Sonne und Abstand in AE
  const solar = n => {
    const D = n - 1, g = (357.529 + .98560028 * D) * D2R;
    const lam = (280.459 + .98564736 * D + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * D2R;
    return { lam, r: 1.00014 - .01671 * Math.cos(g) - .00014 * Math.cos(2 * g) };
  };
  const decl = (n, tilt = TILT) => Math.asin(Math.sin(tilt * D2R) * Math.sin(solar(n).lam)) / D2R;
  // Tageslänge in Stunden: cos ω = −tan φ · tan δ (ohne Lichtbrechung)
  const dayLen = (lat, dec) => {
    const c = -Math.tan(lat * D2R) * Math.tan(dec * D2R);
    return c <= -1 ? 24 : c >= 1 ? 0 : 2 * Math.acos(c) / D2R / 15;
  };
  const noonH = (lat, dec) => 90 - Math.abs(lat - dec);
  const dateOf = (n, short) => new Date(2025, 0, Math.round(n)).toLocaleDateString('de-CH', { day: 'numeric', month: short ? 'short' : 'long' });
  const seasonN = n => n < 79 || n >= 355 ? 'Winter' : n < 172 ? 'Frühling' : n < 266 ? 'Sommer' : 'Herbst';
  const OPP = { Winter: 'Sommer', Sommer: 'Winter', Frühling: 'Herbst', Herbst: 'Frühling' };
  const seasonS = n => OPP[seasonN(n)];
  const fmtH = x => { const t = Math.round(x * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, '0')} min`; };
  const wrapDay = n => ((n - 1) % 365 + 365) % 365 + 1;

  // Ein Jahr abspielen: bewegt einen Tag-Schieber durch 365 Tage
  const player = (btn, get, set) => {
    const P = { on: false, left: 0, acc: 0 };
    const label = () => { btn.textContent = P.on ? 'Anhalten' : 'Ein Jahr abspielen'; };
    btn.addEventListener('click', () => { P.on = !P.on; P.left = 365; P.acc = 0; label(); });
    P.stop = () => { if (P.on) { P.on = false; label(); } };
    P.tick = dt => {
      if (!P.on) return;
      let step;
      if (reduced) { P.acc += dt; if (P.acc < .4) return; P.acc = 0; step = 7; }
      else step = dt * 46;
      P.left -= step;
      set(wrapDay(get() + step));
      if (P.left <= 0) P.stop();
    };
    return P;
  };

  /* ---------- Teil 1: Erdbahn von oben ---------- */
  const orbitCv = $('#orbitCv');
  const O = { n: 172 };
  const updOrbit = () => {
    const n = Math.round(O.n), { r } = solar(n);
    $('#dayIn').value = n; $('#dayOut').textContent = dateOf(n);
    $('#oDate').textContent = dateOf(n);
    $('#oDist').textContent = fmt(r * AU, 1);
    $('#oSeason').textContent = seasonN(n);
    const d = decl(n);
    let s;
    if (n <= 8) s = 'Erdnähe: Die Sonne ist jetzt am nächsten. Trotzdem ist bei uns Winter.';
    else if (n >= 180 && n <= 190) s = 'Erdferne: Die Sonne ist jetzt am weitesten weg. Trotzdem ist bei uns Sommer.';
    else if (Math.abs(d) < 2) s = 'Tagundnachtgleiche: Die Achse ist weder zur Sonne hin noch von ihr weg geneigt.';
    else s = d > 0 ? 'Der Nordpol ist zur Sonne geneigt: Die Nordhalbkugel bekommt mehr Licht.' : 'Der Nordpol ist von der Sonne weg geneigt: Die Nordhalbkugel bekommt weniger Licht.';
    $('#orbitStatus').textContent = s;
  };
  const play1 = player($('#playBtn'), () => O.n, v => { O.n = v; updOrbit(); });
  $('#dayIn').addEventListener('input', e => { play1.stop(); O.n = +e.target.value; updOrbit(); });
  $('#periBtn').addEventListener('click', () => { play1.stop(); O.n = 3; updOrbit(); });
  updOrbit();

  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const MSTART = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const earthAt = n => { const { lam, r } = solar(n); const L = lam + Math.PI; return { x: r * Math.cos(L), y: -r * Math.sin(L), r }; };

  const drawOrbit = dt => {
    play1.tick(dt);
    const narrow = orbitCv.clientWidth < 520;
    const want = narrow ? '470px' : '340px';
    if (orbitCv.style.height !== want) orbitCv.style.height = want;
    const { ctx, w, h } = fit(orbitCv);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;
    const ow = narrow ? w : w * .63, oh = narrow ? h * .66 : h;
    const cx = ow / 2, cy = oh / 2 + (narrow ? 8 : 4);
    const S = Math.min(ow, oh) * .34;
    const n = Math.round(O.n);

    // Bahn, massstabgetreu (fast ein Kreis)
    ctx.beginPath();
    for (let d = 1; d <= 366; d += 2) { const p = earthAt(d); d === 1 ? ctx.moveTo(cx + p.x * S, cy + p.y * S) : ctx.lineTo(cx + p.x * S, cy + p.y * S); }
    ctx.closePath(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]);
    // Monate
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    MSTART.forEach((d, i) => {
      const p = earthAt(d + 14), k = 1 + 22 / (S * p.r);
      ctx.fillText(MONTHS[i], cx + p.x * S * k, cy + p.y * S * k);
    });
    ctx.textBaseline = 'alphabetic';
    // Sonne
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    g.addColorStop(0, C.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fillStyle = C.glow; ctx.fill();

    // Erde
    const p = earthAt(n), ex = cx + p.x * S, ey = cy + p.y * S;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    const ang = Math.atan2(ey - cy, ex - cx), er = 10;
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fillStyle = C.fiber; ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, er, ang - Math.PI / 2, ang + Math.PI / 2); ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    // Nordpol: zeigt immer in dieselbe Richtung (hier nach oben)
    const ny = ey - er * Math.sin(TILT * D2R) * 1.6;
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(ex, ny, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillText('N', ex + 5, ny - 3);
    // Abstand
    const mx = (cx + ex) / 2, my = (cy + ey) / 2, side = Math.abs(ex - cx) > Math.abs(ey - cy);
    ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText(fmt(p.r * AU, 1) + ' Mio. km', mx + (side ? 0 : 52), my + (side ? -8 : 4));
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Blick von oben', 12, 20);
    ctx.fillText('Bahnform massstabgetreu', 12, 35);

    // Seitenansicht: Neigung zur Sonne hin oder weg
    const ix = narrow ? 12 : ow + 4, iy = narrow ? oh + 6 : 14, iw = narrow ? w - 24 : w - ow - 16, ih = narrow ? h - oh - 16 : h - 28;
    roundRect(ctx, ix, iy, iw, ih, 16); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Von der Seite', ix + 12, iy + 20);
    const R = Math.min(iw * .26, ih * .27), ecx = ix + iw * .58, ecy = iy + ih * .5;
    // Sonnenstrahlen von links
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) {
      const yy = ecy + k * R * .42, x2 = ecx - Math.sqrt(Math.max(0, R * R - (k * R * .42) ** 2)) - 3;
      ctx.beginPath(); ctx.moveTo(ix + 10, yy); ctx.lineTo(x2, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, yy); ctx.lineTo(x2 - 5, yy - 3); ctx.lineTo(x2 - 5, yy + 3); ctx.closePath(); ctx.fillStyle = C.glow; ctx.fill();
    }
    ctx.fillStyle = C.muted; ctx.fillText('Sonne →', ix + 12, iy + ih - 12);
    ctx.beginPath(); ctx.arc(ecx, ecy, R, 0, Math.PI * 2); ctx.fillStyle = C.fiber; ctx.fill();
    ctx.beginPath(); ctx.arc(ecx, ecy, R, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
    const d = decl(n) * D2R;
    const ax = [-Math.sin(d), -Math.cos(d)], eq = [-Math.cos(d), Math.sin(d)];
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ecx - ax[0] * R * 1.35, ecy - ax[1] * R * 1.35); ctx.lineTo(ecx + ax[0] * R * 1.35, ecy + ax[1] * R * 1.35); ctx.stroke();
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(ecx - eq[0] * R, ecy - eq[1] * R); ctx.lineTo(ecx + eq[0] * R, ecy + eq[1] * R); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText('N', ecx + ax[0] * R * 1.6, ecy + ax[1] * R * 1.6 + 4);
    // Zürich auf der Tagseite, am Mittag
    const phi = LAT_ZH * D2R, zx = ecx + R * (Math.cos(phi) * eq[0] + Math.sin(phi) * ax[0]), zy = ecy + R * (Math.cos(phi) * eq[1] + Math.sin(phi) * ax[1]);
    ctx.beginPath(); ctx.arc(zx, zy, 3.5, 0, Math.PI * 2); ctx.fillStyle = C.glow; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.fillText('Zürich', zx - 7, zy - 6);
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg;
    ctx.fillText(`Norden: ${seasonN(n)}`, ix + iw - 12, iy + ih - 12);
  };

  /* ---------- Teil 2: Mittagssonne über Zürich ---------- */
  const noonCv = $('#noonCv');
  const N2 = { n: 172 };
  const updNoon = () => {
    const n = Math.round(N2.n), d = decl(n), hN = noonH(LAT_ZH, d);
    $('#day2In').value = n; $('#day2Out').textContent = dateOf(n);
    $('#nHeight').textContent = fmt(hN, 1) + '°';
    $('#nDay').textContent = fmtH(dayLen(LAT_ZH, d));
    $('#nLight').textContent = fmt(Math.sin(hN * D2R) * 100, 0) + ' %';
    $('#noonStatus').textContent = `${dateOf(n)}: Dasselbe Lichtbündel verteilt sich auf die ${fmt(1 / Math.sin(hN * D2R), 1)}-fache Fläche.`;
  };
  const play2 = player($('#play2Btn'), () => N2.n, v => { N2.n = v; updNoon(); });
  $('#day2In').addEventListener('input', e => { play2.stop(); N2.n = +e.target.value; updNoon(); });
  $('#junBtn').addEventListener('click', () => { play2.stop(); N2.n = 172; updNoon(); });
  $('#decBtn').addEventListener('click', () => { play2.stop(); N2.n = 355; updNoon(); });
  updNoon();

  const drawNoon = dt => {
    play2.tick(dt);
    const { ctx, w, h } = fit(noonCv);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;
    const n = Math.round(N2.n), hN = noonH(LAT_ZH, decl(n)), a = hN * D2R;
    const gy = Math.round(h * .78), ox = w * .55;
    const rr = Math.min(gy - 30, ox - 24, w - ox - 24);
    // Boden
    ctx.fillStyle = C.sunk; ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy + .5); ctx.lineTo(w, gy + .5); ctx.stroke();
    // Himmelsbogen
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(ox, gy, rr, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    // Höchst- und Tiefststand als Ringe
    for (const [hh, t] of [[noonH(LAT_ZH, TILT), 'Juni'], [noonH(LAT_ZH, -TILT), 'Dez.']]) {
      const x = ox - rr * Math.cos(hh * D2R), y = gy - rr * Math.sin(hh * D2R);
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(t, x - 12, y + 4);
    }
    // Lichtbündel konstanter Breite trifft schräg auf den Boden
    const W = Math.min(54, w * .13), half = (W / 2) / Math.max(Math.sin(a), .05);
    const ux = -Math.cos(a), uy = -Math.sin(a), L = rr * .92;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, gy); ctx.clip();
    ctx.beginPath();
    ctx.moveTo(ox - half, gy); ctx.lineTo(ox + half, gy);
    ctx.lineTo(ox + half + ux * L, gy + uy * L); ctx.lineTo(ox - half + ux * L, gy + uy * L); ctx.closePath();
    ctx.fillStyle = C.glow; ctx.globalAlpha = .2; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.2;
    for (let k = 0; k <= 4; k++) {
      const bx = ox - half + k / 4 * 2 * half;
      ctx.beginPath(); ctx.moveTo(bx, gy); ctx.lineTo(bx + ux * L, gy + uy * L); ctx.stroke();
    }
    ctx.restore();
    // beleuchtete Fläche
    ctx.strokeStyle = C.glow; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(Math.max(4, ox - half), gy + 4); ctx.lineTo(Math.min(w - 4, ox + half), gy + 4); ctx.stroke(); ctx.lineCap = 'butt';
    // Sonne
    const sx = ox - rr * Math.cos(a), sy = gy - rr * Math.sin(a);
    ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fillStyle = C.glow; ctx.fill();
    // Winkel
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox, gy, 30, Math.PI, Math.PI + a); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = 'right';
    ctx.fillText(fmt(hN, 1) + '°', ox - 34 * Math.cos(a / 2) - 4, gy - 34 * Math.sin(a / 2) - 2);
    // Beobachter
    ctx.beginPath(); ctx.arc(ox, gy - 13, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox, gy - 10); ctx.lineTo(ox, gy); ctx.stroke();
    // Beschriftung
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Süden', 10, gy - 8);
    ctx.textAlign = 'right'; ctx.fillText('Norden', w - 10, gy - 8);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText(`beleuchtete Fläche: ${fmt(1 / Math.sin(a), 1)}×`, clamp(ox, 90, w - 90), gy + 26);
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Zürich am Mittag · vereinfacht', 12, 20);
  };

  /* ---------- Teil 3: Zürich und Sydney ---------- */
  const dayCv = $('#dayCv');
  const D3 = { n: 172, tilt: 23.4 };
  const updDay = () => {
    const n = Math.round(D3.n), t = D3.tilt, d = decl(n, t);
    $('#tiltIn').value = t; $('#tiltOut').textContent = fmt(t, 1) + '°';
    $('#day3In').value = n; $('#day3Out').textContent = dateOf(n);
    $('#dZh').textContent = fmtH(dayLen(LAT_ZH, d));
    $('#dSy').textContent = fmtH(dayLen(LAT_SY, d));
    $('#dZhS').textContent = t < .5 ? '47,4° N' : '47,4° N · ' + seasonN(n);
    $('#dSyS').textContent = t < .5 ? '33,9° S' : '33,9° S · ' + seasonS(n);
    let mx = 0, mn = 24;
    for (let k = 1; k <= 365; k += 2) { const v = dayLen(LAT_ZH, decl(k, t)); mx = Math.max(mx, v); mn = Math.min(mn, v); }
    $('#dDiff').textContent = fmtH(mx - mn);
    let s;
    if (t < .5) s = 'Ohne Neigung: überall und das ganze Jahr 12 Stunden Tag. Es gäbe keine Jahreszeiten.';
    else if (t > 34) s = 'Starke Neigung: noch extremere Jahreszeiten. Ab 42,6° gäbe es in Zürich Wintertage ganz ohne Sonne.';
    else s = `${dateOf(n)}: In Zürich ist ${seasonN(n)}, in Sydney ${seasonS(n)}.`;
    $('#dayStatus').textContent = s;
  };
  $('#tiltIn').addEventListener('input', e => { D3.tilt = +e.target.value; updDay(); });
  $('#day3In').addEventListener('input', e => { D3.n = +e.target.value; updDay(); });
  $('#realTilt').addEventListener('click', () => { D3.tilt = 23.4; updDay(); });
  $('#zeroTilt').addEventListener('click', () => { D3.tilt = 0; updDay(); });
  updDay();

  const drawDay = () => {
    const { ctx, w, h } = fit(dayCv);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;
    const pl = 40, pr = 14, pt = 34, pb = 28, pw = w - pl - pr, ph = h - pt - pb;
    const X = n => pl + (n - 1) / 364 * pw, Y = v => pt + (1 - v / 24) * ph;
    // Raster
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    for (const v of [0, 6, 12, 18, 24]) {
      ctx.setLineDash(v === 12 ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(pl, Y(v) + .5); ctx.lineTo(w - pr, Y(v) + .5); ctx.stroke();
      ctx.fillText(v + ' h', pl - 6, Y(v) + 4);
    }
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    const ML = w < 420 ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] : MONTHS;
    MSTART.forEach((d, i) => ctx.fillText(ML[i], X(d + 14), h - 9));
    // Kurven
    const curve = (lat, c) => {
      ctx.beginPath();
      for (let k = 1; k <= 365; k += 2) { const x = X(k), y = Y(dayLen(lat, decl(k, D3.tilt))); k === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.stroke();
    };
    curve(LAT_ZH, C.glow); curve(LAT_SY, C.fiber);
    // Gewählter Tag
    const n = Math.round(D3.n), d = decl(n, D3.tilt);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(X(n), pt); ctx.lineTo(X(n), pt + ph); ctx.stroke(); ctx.setLineDash([]);
    for (const [lat, c] of [[LAT_ZH, C.glow], [LAT_SY, C.fiber]]) {
      ctx.beginPath(); ctx.arc(X(n), Y(dayLen(lat, d)), 5, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = C.surface; ctx.lineWidth = 2; ctx.stroke();
    }
    // Legende
    ctx.textAlign = 'left'; let lx = pl;
    for (const [c, t] of [[C.glow, 'Zürich 47,4° N'], [C.fiber, 'Sydney 33,9° S']]) {
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, 15); ctx.lineTo(lx + 16, 15); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(t, lx + 21, 19); lx += ctx.measureText(t).width + 40;
    }
    if (w >= 460) { ctx.textAlign = 'right'; ctx.fillText('Tageslänge', w - pr, 19); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('jahreszeiten', 4, {
    orbitLock: () => { ['#dayIn', '#playBtn', '#periBtn'].forEach(s => $(s).disabled = false); },
    noonLock: () => { ['#day2In', '#junBtn', '#decBtn', '#play2Btn'].forEach(s => $(s).disabled = false); },
    dayLock: () => { $$('#tiltIn, #day3In, #realTilt, #zeroTilt').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawOrbit(dt); drawNoon(dt); drawDay(); });
})();
