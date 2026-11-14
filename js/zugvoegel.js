/* mindblow – Lektion Zugvögel */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Wüstensand, Nachthimmel, Sterne
  const SAND = 'rgba(214,170,92,.42)', NIGHT0 = '#16224a', NIGHT1 = '#070c1f', STAR = '#f4f1e6', GOLD = '#ffd34d';
  const DIRS = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  const dirName = az => DIRS[Math.round((((az / RAD) % 360) + 360) % 360 / 45) % 8];

  // Kleine Schwalbe, Flugrichtung ang (0 = nach rechts)
  const bird = (ctx, x, y, s, ang, col, flap = 0) => {
    const wy = s * (1 - .35 * flap);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(s, 0); ctx.lineTo(.2 * s, -.16 * s); ctx.lineTo(-.45 * s, -wy); ctx.lineTo(-.1 * s, -.12 * s);
    ctx.lineTo(-s, -.42 * s); ctx.lineTo(-.6 * s, 0); ctx.lineTo(-s, .42 * s); ctx.lineTo(-.1 * s, .12 * s);
    ctx.lineTo(-.45 * s, wy); ctx.lineTo(.2 * s, .16 * s); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  };
  const arrow = (ctx, x0, y0, x1, y1, col, wdt = 2.5, head = 9) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wdt; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * .6, y1 - Math.sin(a) * head * .6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - .45), y1 - head * Math.sin(a - .45));
    ctx.lineTo(x1 - head * Math.cos(a + .45), y1 - head * Math.sin(a + .45)); ctx.closePath(); ctx.fill();
  };

  /* ---------- Teil 1: Die Reise der Rauchschwalbe ---------- */
  // Stark vereinfachte Umrisse, [Länge, Breite]
  const LAND = [
    // Afrika
    [[32.3, 31.3], [34.3, 31.3], [34.9, 29.5], [33.6, 27.9], [35.5, 24], [37.2, 21], [38.5, 18], [39.7, 15.5], [41.7, 13.3], [43.3, 11.6], [44.5, 10.4], [51.2, 11.8], [51, 10.4], [49.5, 6.5], [47.5, 4], [43, -.5], [40.5, -2.5], [39.2, -6.5], [39.5, -10], [40.5, -15], [37, -18.5], [35.3, -22], [35.5, -24], [32.8, -26], [32.4, -28.8], [30, -31.3], [27.5, -33.5], [25, -34], [22, -34.2], [20, -34.8], [18.4, -34.1], [17.8, -31.5], [16.5, -28.6], [15, -26.5], [14.5, -22.5], [11.8, -17.3], [13.5, -12], [12.2, -6], [9.3, -1], [9.6, 3], [8.5, 4.5], [6, 4.3], [3, 6.4], [-1, 5.1], [-4, 5.2], [-7.5, 4.4], [-10.5, 6.5], [-13.2, 8.6], [-15, 11], [-16.8, 12.5], [-17.4, 14.7], [-16.3, 19.5], [-17, 21], [-15, 24], [-13, 27.6], [-9.8, 29.6], [-9.6, 32.5], [-6.8, 34.2], [-5.9, 35.8], [-2, 35.1], [1, 36.4], [5, 36.8], [10, 37.3], [11, 36.8], [10.3, 34], [11.1, 33.2], [15.2, 32.3], [19, 30.3], [20.1, 32.2], [23, 32.6], [25, 31.6], [29, 30.9]],
    // Europa, Kleinasien, Arabien
    [[-5.6, 36], [-2.1, 36.7], [.2, 38.8], [-.3, 39.5], [.9, 41], [3.2, 41.9], [3.1, 43.1], [4.8, 43.4], [7.5, 43.8], [8.8, 44.4], [10.2, 43.9], [11, 42.4], [12.6, 41.4], [14.2, 40.8], [15.7, 40], [15.6, 38.2], [16.1, 38], [17.1, 39], [18.5, 40.1], [17, 40.9], [15.9, 41.6], [14, 42.7], [12.3, 44.5], [12.4, 45.4], [13.7, 45.6], [15.2, 44.3], [17.6, 43], [19.4, 41.8], [19.4, 40.3], [20.2, 39.4], [21.1, 38.3], [21.7, 36.8], [22.8, 36.5], [23.2, 38.1], [24, 38.2], [22.9, 40.5], [24.4, 40.9], [26, 40.8], [26.2, 39.5], [27.2, 37.3], [28.3, 36.7], [30.5, 36.4], [32.6, 36.1], [36.2, 36.6], [35.9, 35], [35, 33], [34.3, 31.3], [34.9, 29.5], [36.5, 26], [39, 21.5], [41, 17.5], [42.8, 14.5], [43.5, 12.7], [45, 12.9], [48, 14], [53, 16.5], [53, 63], [21.3, 63], [21.3, 62], [21.5, 60.8], [22.5, 60], [25, 60.3], [28, 60.5], [29.5, 60], [28, 59.5], [24, 59.4], [23.5, 58.8], [23.4, 58.3], [24.3, 57.9], [24.1, 57.1], [21.6, 57.5], [21, 56.8], [21.2, 55.2], [19.6, 54.4], [18.5, 54.8], [16.5, 54.5], [14.2, 53.9], [12, 54.2], [10.9, 53.9], [10, 54.7], [10.5, 57.7], [8.6, 57.1], [8.1, 56.6], [8.6, 55.3], [8.9, 53.9], [7, 53.5], [4.8, 52.9], [3.6, 51.4], [1.6, 50.9], [.2, 49.7], [-1.3, 49.7], [-1.9, 48.7], [-4.7, 48.4], [-2.2, 47.3], [-1.2, 45.5], [-1.6, 43.4], [-4.5, 43.4], [-8, 43.7], [-9.3, 43], [-8.8, 41], [-9.5, 38.7], [-8.9, 37], [-6.5, 37.2]],
    // Skandinavien
    [[5, 63], [5, 59], [6, 58.1], [8.5, 58.2], [10.6, 59], [11.2, 58.9], [12.5, 56.3], [12.8, 55.4], [14.3, 55.6], [16.4, 56.6], [16.5, 58.5], [18.5, 59.5], [17.3, 61], [17.5, 63]],
    // Grossbritannien, Irland, Inseln
    [[-5.7, 50.1], [1.4, 51.2], [1.7, 52.7], [.2, 53.5], [-1.6, 55.5], [-2, 57], [-1.8, 57.6], [-4, 57.7], [-3, 58.6], [-5, 58.6], [-6, 56.5], [-5, 55], [-3.2, 54.9], [-4.8, 54.8], [-3, 53.4], [-4.6, 52.8], [-4.1, 51.6]],
    [[-6, 52.2], [-6.2, 53.9], [-5.5, 55.2], [-8, 55.2], [-10, 54.2], [-9.5, 52], [-10, 51.6], [-8, 51.6]],
    [[12.4, 38], [15.6, 38.3], [15.1, 36.7]],
    [[8.4, 39], [9.6, 39.2], [9.8, 41], [9.4, 43], [8.6, 42.4], [8.6, 40.8]],
    [[49.3, -12], [50.5, -15.5], [47.2, -25], [45, -25.3], [43.6, -22], [44.4, -16], [47, -15]],
  ];
  const WATER = [
    [[27.7, 42.5], [28.6, 44.2], [29.7, 45.2], [30.8, 46.5], [33.5, 46], [32.6, 45.4], [33.6, 44.5], [35.5, 45.1], [36.6, 45.3], [37.8, 44.6], [39.7, 43.4], [41.6, 41.6], [38, 41], [35, 42], [33, 41.9], [31, 41.1], [29, 41.2]],
    [[47, 45.5], [47.5, 43], [48.6, 41.8], [49.3, 40.3], [49, 38.5], [49, 37.5], [50.5, 37], [53, 37], [53, 47], [50, 47.2], [48, 46.6]],
    [[48, 30], [50.2, 29.9], [51.5, 27.8], [53, 27], [53, 24.3], [51.5, 24.5], [51.2, 26], [50.5, 26.2], [50, 26.7], [49.5, 27.5], [48.5, 28.5]],
  ];
  // Eine mögliche Route, vereinfacht
  const ROUTE = [
    [8.2, 46.8, 'in der Schweiz'], [4.8, 44, 'in Frankreich'], [.5, 40.5, 'in Spanien'], [-5.6, 35.9, 'bei Gibraltar'],
    [-6, 31, 'in Marokko'], [-3, 23, 'über der Sahara'], [-1, 14, 'im Sahel'], [6, 7, 'in Westafrika'],
    [16, -1, 'in Zentralafrika'], [23, -13, 'im Süden Afrikas'], [26, -26, 'im Süden Afrikas'],
  ];
  const hav = (a, b) => {
    const dLat = (b[1] - a[1]) * RAD, dLon = (b[0] - a[0]) * RAD;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(s));
  };
  const CUM = [0];
  for (let i = 1; i < ROUTE.length; i++) CUM.push(CUM[i - 1] + hav(ROUTE[i - 1], ROUTE[i]));
  const RLEN = CUM[CUM.length - 1];
  const routeAt = p => {
    const d = clamp(p, 0, 1) * RLEN;
    let i = 0; while (i < ROUTE.length - 2 && d > CUM[i + 1]) i++;
    const k = (d - CUM[i]) / (CUM[i + 1] - CUM[i]);
    const a = ROUTE[i], b = ROUTE[i + 1];
    return { lon: a[0] + (b[0] - a[0]) * k, lat: a[1] + (b[1] - a[1]) * k, d, i, k, name: (k < .5 ? a : b)[2] };
  };
  // Jahreslauf in Monaten ab 1. Januar (vereinfacht)
  const HOME0 = 1.9, HOME1 = 3.4, AWAY0 = 8.6, AWAY1 = 10.6;
  const DAYS_HOME = 46, DAYS_AWAY = 61;
  const phaseAt = m => {
    if (m < HOME0) return { p: 1, ph: 'winter' };
    if (m < HOME1) return { p: 1 - (m - HOME0) / (HOME1 - HOME0), ph: 'home' };
    if (m < AWAY0) return { p: 0, ph: 'brut' };
    if (m < AWAY1) return { p: (m - AWAY0) / (AWAY1 - AWAY0), ph: 'away' };
    return { p: 1, ph: 'winter' };
  };
  const INSECTS = [.02, .03, .12, .35, .7, .9, 1, .95, .65, .3, .08, .02];
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const MONLONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const MAPST = {
    brut: 'Brutzeit in der Schweiz. Die Luft ist voller Insekten, genug für zwei Bruten pro Sommer.',
    away: 'Wegzug: Die Insekten werden knapp. Sie zieht tagsüber und jagt unterwegs im Flug. Über der Sahara findet sie kaum Futter: die härteste Etappe.',
    winter: 'Winter bei uns, Sommer im Süden Afrikas. Dort schwirren jetzt viele Insekten. Bei uns fast keine.',
    home: 'Heimzug: Er geht schneller als im Herbst. Wer früh ankommt, bekommt die besten Nistplätze.',
  };
  const DOING = { brut: 'brütet', away: 'zieht nach Süden', winter: 'überwintert', home: 'zieht nach Norden' };

  const mapCv = $('#mapCv');
  const M = { m: 6, play: false, ph: '', flap: 0 };
  const monLabel = m => { const i = Math.floor(m) % 12, f = m - Math.floor(m); return `${[1, 8, 16, 23][Math.round(f * 4) % 4]}. ${MON[i]}`; };
  const updMap = force => {
    const s = phaseAt(M.m), r = routeAt(s.p);
    $('#monOut').textContent = monLabel(Math.round(M.m * 4) / 4);
    $('#mWhere').textContent = s.ph === 'winter' ? 'im Süden Afrikas' : r.name;
    $('#mDoing').textContent = DOING[s.ph];
    $('#mDist').textContent = `${fmt(Math.round(r.d / 10) * 10, 0)} km`;
    $('#mDay').textContent = s.ph === 'away' ? `≈ ${fmt(Math.round(RLEN / DAYS_AWAY / 5) * 5, 0)} km`
      : s.ph === 'home' ? `≈ ${fmt(Math.round(RLEN / DAYS_HOME / 5) * 5, 0)} km` : '–';
    if (force || s.ph !== M.ph) { M.ph = s.ph; $('#mapStatus').textContent = MAPST[s.ph]; }
  };
  const setMon = m => { M.m = m; $('#monIn').value = Math.round(m * 4) / 4; updMap(); };
  $('#monIn').addEventListener('input', e => { M.play = false; $('#yearBtn').textContent = 'Ein Jahr abspielen'; setMon(+e.target.value); });
  $('#yearBtn').addEventListener('click', () => {
    M.play = !M.play; $('#yearBtn').textContent = M.play ? 'Anhalten' : 'Ein Jahr abspielen';
  });
  $('#autBtn').addEventListener('click', () => { M.play = false; $('#yearBtn').textContent = 'Ein Jahr abspielen'; setMon(9.5); });
  $('#sprBtn').addEventListener('click', () => { M.play = false; $('#yearBtn').textContent = 'Ein Jahr abspielen'; setMon(2.75); });
  updMap(true);

  const drawMap = dt => {
    if (M.play) { M.m = (M.m + dt * 1.1) % 12; $('#monIn').value = Math.round(M.m * 4) / 4; updMap(); }
    if (!reduced) M.flap += dt * 9;
    const { ctx, w, h } = fit(mapCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const stripH = 78, mapH = h - stripH - 8;
    const LON0 = -18, LON1 = 53, LAT0 = 62, LAT1 = -36, KX = Math.cos(25 * RAD);
    const sc = Math.min((w - 16) / ((LON1 - LON0) * KX), (mapH - 8) / (LAT0 - LAT1));
    const mw = (LON1 - LON0) * KX * sc, mh = (LAT0 - LAT1) * sc;
    const ox = (w - mw) / 2, oy = 8;
    const X = lon => ox + (lon - LON0) * KX * sc, Y = lat => oy + (LAT0 - lat) * sc;
    const poly = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.closePath(); };

    ctx.save();
    roundRect(ctx, ox, oy, mw, mh, 10); ctx.clip();
    ctx.fillStyle = C.bg; ctx.fillRect(ox, oy, mw, mh);
    // Land
    for (const p of LAND) { poly(p); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke(); }
    // Sahara
    ctx.save(); poly(LAND[0]); ctx.clip();
    ctx.fillStyle = SAND; ctx.fillRect(X(-18), Y(30), X(36) - X(-18), Y(17) - Y(30));
    ctx.restore();
    for (const p of WATER) { poly(p); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke(); }
    // Äquator
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(ox, Y(0)); ctx.lineTo(ox + mw, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Äquator', ox + 6, Y(0) - 5);
    ctx.textAlign = 'center';
    ctx.fillText('Sahara', X(12), Y(24));
    ctx.fillText(narrow ? 'Mittelmeer' : 'Mittelmeer', X(17), Y(35.2));
    ctx.textAlign = 'left';
    ctx.fillText('vereinfacht', ox + 6, oy + mh - 8);

    // Route
    const s = phaseAt(M.m), r = routeAt(s.p);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([4, 5]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ROUTE.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
    ctx.setLineDash([]);
    if (s.p > 0) {
      ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(X(ROUTE[0][0]), Y(ROUTE[0][1]));
      for (let i = 1; i <= r.i; i++) ctx.lineTo(X(ROUTE[i][0]), Y(ROUTE[i][1]));
      ctx.lineTo(X(r.lon), Y(r.lat)); ctx.stroke();
    }
    // Schweiz und Winterquartier
    const end = ROUTE[ROUTE.length - 1];
    ctx.fillStyle = C.copper;
    ctx.beginPath(); ctx.arc(X(ROUTE[0][0]), Y(ROUTE[0][1]), 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(X(end[0]), Y(end[1]), 4.5, 0, TAU); ctx.fill();
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText('Schweiz', X(ROUTE[0][0]) + 8, Y(ROUTE[0][1]) - 6);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'Winter' : 'Winterquartier', X(end[0]) - 8, Y(end[1]) + 4);

    // Schwalbe
    const dir = s.ph === 'home' ? -1 : 1;
    const a = ROUTE[r.i], b = ROUTE[r.i + 1];
    let ang = Math.atan2(Y(b[1]) - Y(a[1]), X(b[0]) - X(a[0]));
    if (dir < 0) ang += Math.PI;
    const moving = s.ph === 'home' || s.ph === 'away';
    if (!moving) ang = -Math.PI / 2;
    let bx = X(r.lon), by = Y(r.lat);
    if (!moving && !reduced) { bx += Math.cos(M.flap / 7) * 9; by += Math.sin(M.flap / 5) * 5 - 8; ang = Math.atan2(Math.cos(M.flap / 5) * 5 / 5, -Math.sin(M.flap / 7) * 9 / 7); }
    ctx.save(); ctx.shadowColor = C.glow; ctx.shadowBlur = 12;
    bird(ctx, bx, by, 9, ang, C.fg, moving && !reduced ? (Math.sin(M.flap) + 1) / 2 : 0);
    ctx.restore();
    // Distanz-Etikett
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(`Route: rund ${fmt(Math.round(RLEN / 1000) * 1000, 0)} km`, ox + 6, oy + 16);

    // Insektenstreifen
    const sy0 = h - stripH + 6, sy1 = h - 22, sx0 = 14, sx1 = w - 14, bw = (sx1 - sx0) / 12;
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Fluginsekten in der Schweiz' : 'Fliegende Insekten in der Schweiz (vereinfacht)', sx0, sy0 + 4);
    const by1 = sy1, bh = sy1 - sy0 - 14;
    for (let i = 0; i < 12; i++) {
      const v = INSECTS[i];
      ctx.fillStyle = Math.floor(M.m) === i ? C.accent : C.line;
      roundRect(ctx, sx0 + i * bw + 2, by1 - Math.max(2, bh * v), bw - 4, Math.max(2, bh * v), 2); ctx.fill();
      ctx.fillStyle = Math.floor(M.m) === i ? C.fg : C.muted; ctx.textAlign = 'center';
      ctx.fillText(narrow ? MON[i][0] : MON[i], sx0 + (i + .5) * bw, h - 8);
    }
    // Zeitraum, in dem die Schwalbe in der Schweiz ist
    ctx.strokeStyle = C.copper; ctx.lineWidth = 2;
    const mx = m => sx0 + m * bw;
    ctx.beginPath(); ctx.moveTo(mx(HOME1), by1 + 2); ctx.lineTo(mx(AWAY0), by1 + 2); ctx.stroke();
    ctx.fillStyle = C.copper; ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'Schwalbe da' : 'Schwalbe in der Schweiz', sx1, sy0 + 4);
    // Monatszeiger
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mx(M.m), sy0 + 10); ctx.lineTo(mx(M.m), by1 + 4); ctx.stroke();
  };

  /* ---------- Teil 2: Der Sternenkompass ---------- */
  const LAT = 47 * RAD, LST0 = 21;           // Schweiz, Herbstabend um 21 Uhr
  const vecOf = (raH, decD) => {
    const H = (LST0 - raH) * 15 * RAD, d = decD * RAD;
    return [Math.cos(LAT) * Math.sin(d) - Math.sin(LAT) * Math.cos(d) * Math.cos(H),   // Nord
      -Math.cos(d) * Math.sin(H),                                                      // Ost
      Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.cos(H)];        // oben
  };
  const rot = (v, k, th) => {
    const c = Math.cos(th), s = Math.sin(th), d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const cx = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return [v[0] * c + cx[0] * s + k[0] * d * (1 - c), v[1] * c + cx[1] * s + k[1] * d * (1 - c), v[2] * c + cx[2] * s + k[2] * d * (1 - c)];
  };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const STARS = [];
  for (let i = 0; i < 300; i++) {
    const dec = Math.asin(2 * rnd() - 1) / RAD, ra = rnd() * 24, mag = rnd();
    if (dec < -45) continue;
    STARS.push({ v: vecOf(ra, dec), r: .5 + 1.1 * mag * mag, a: .35 + .5 * mag });
  }
  const named = (ra, dec, r = 2) => { const s = { v: vecOf(ra, dec), r, a: 1 }; STARS.push(s); return s; };
  const POLARIS = named(2.53, 89.26, 2.4);
  const DIPPER = [[11.06, 61.75], [11.03, 56.38], [11.9, 53.69], [12.26, 57.03], [12.9, 55.96], [13.4, 54.93], [13.79, 49.31]].map(p => named(p[0], p[1], 2.1));
  const CASS = [[.15, 59.15], [.68, 56.54], [.95, 60.72], [1.43, 60.24], [1.91, 63.67]].map(p => named(p[0], p[1], 1.9));
  const VEGA = named(18.62, 38.78, 2.8);
  named(20.69, 45.28, 2.2); named(19.85, 8.87, 2.2); named(5.28, 46, 2.4); named(14.26, 19.18, 2.5);
  const PAXIS = [Math.cos(LAT), 0, Math.sin(LAT)];
  const len = v => Math.hypot(v[0], v[1], v[2]);
  const VAXIS = VEGA.v.map(x => x / len(VEGA.v));
  const skyCv = $('#skyCv');
  const S = { hr: 0, play: false, trails: false, plan: false, key: '' };
  const skyRot = () => S.hr * 15.04 * RAD;
  const updSky = () => {
    const th = skyRot() / RAD, found = th >= 10;
    $('#hourIn').value = S.hr;
    const t = (LST0 + S.hr) % 24, hh = Math.floor(t), mm = Math.floor((t - hh) * 60);
    $('#hourOut').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    $('#sRot').textContent = `${fmt(th, 0)}°`;
    const k = S.plan ? VAXIS : PAXIS;
    const az = Math.atan2(k[1], k[0]);
    $('#sPivot').textContent = found ? (S.plan ? 'Wega' : 'Polarstern') : 'noch unklar';
    $('#sDir').textContent = found ? dirName(az + Math.PI) : '–';
    const key = (found ? 'f' : 'n') + (S.plan ? 'p' : 'n');
    if (key !== S.key) {
      S.key = key;
      $('#skyStatus').textContent = !found
        ? 'Lass die Nacht laufen. Der Vogel beobachtet, welcher Punkt am Himmel stillsteht.'
        : S.plan
          ? 'Planetariums-Trick: Der Kunsthimmel dreht sich jetzt um die Wega. Der Vogel hält die Wega für Norden und zieht in die falsche Richtung. Genau so wie bei Emlens Indigofinken (dort war es Beteigeuze).'
          : 'Drehpunkt gefunden: Fast genau beim Polarstern. Dort ist Norden. Im Herbst fliegt der Vogel davon weg, also nach Süden.';
    }
  };
  $('#hourIn').addEventListener('input', e => { S.hr = +e.target.value; S.play = false; $('#nightBtn').textContent = 'Nacht abspielen'; updSky(); });
  $('#nightBtn').addEventListener('click', () => {
    if (!S.play && S.hr >= 7.99) S.hr = 0;
    S.play = !S.play; $('#nightBtn').textContent = S.play ? 'Anhalten' : 'Nacht abspielen';
  });
  $('#trailBtn').addEventListener('click', () => { S.trails = !S.trails; $('#trailBtn').textContent = S.trails ? 'Sternspuren aus' : 'Sternspuren an'; });
  $('#planBtn').addEventListener('click', () => {
    S.plan = !S.plan; $('#planBtn').textContent = S.plan ? 'Echter Himmel' : 'Planetariums-Trick'; updSky();
  });
  updSky();

  const drawSky = dt => {
    if (S.play) {
      S.hr = Math.min(8, S.hr + dt * .8);
      if (S.hr >= 8) { S.play = false; $('#nightBtn').textContent = 'Nacht abspielen'; }
      updSky();
    }
    const { ctx, w, h } = fit(skyCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const R = Math.min(w / 2 - 26, h / 2 - 24), cx = w / 2, cy = h / 2;
    const k = S.plan ? VAXIS : PAXIS, th = skyRot();
    const proj = v => {
      const alt = Math.asin(clamp(v[2], -1, 1)), az = Math.atan2(v[1], v[0]);
      const r = (1 - alt / (Math.PI / 2)) * R;
      return { x: cx - r * Math.sin(az), y: cy - r * Math.cos(az), up: v[2] > 0 };
    };
    // Himmel
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, NIGHT1); g.addColorStop(1, NIGHT0);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    // Spuren
    if (S.trails && th > .01) {
      ctx.strokeStyle = 'rgba(244,241,230,.32)'; ctx.lineWidth = 1;
      const n = Math.max(2, Math.ceil(th / (2.5 * RAD)));
      for (const st of STARS) {
        let prev = null;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const p = proj(rot(st.v, k, th * i / n));
          if (p.up && prev && prev.up) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
          prev = p;
        }
        ctx.stroke();
      }
    }
    // Sternbilder
    const P = arr => arr.map(s => proj(rot(s.v, k, th)));
    const lines = (pts, idx) => {
      ctx.beginPath();
      idx.forEach(([a, b]) => { if (pts[a].up && pts[b].up) { ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); } });
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1;
    const dp = P(DIPPER), cp = P(CASS);
    lines(dp, [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]);
    lines(cp, [[0, 1], [1, 2], [2, 3], [3, 4]]);
    // Sterne
    ctx.fillStyle = STAR;
    for (const st of STARS) {
      const p = proj(rot(st.v, k, th));
      if (!p.up) continue;
      ctx.globalAlpha = st.a; ctx.beginPath(); ctx.arc(p.x, p.y, st.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = `10px ${MONO}`; ctx.fillStyle = 'rgba(200,215,255,.8)'; ctx.textAlign = 'left';
    const tag = (p, txt, dy = 3) => {
      if (!p.up) return;
      const right = p.x > cx + R * .3;
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillText(txt, p.x + (right ? -15 : 15), p.y + dy);
    };
    tag(proj(rot(POLARIS.v, k, th)), 'Polarstern');
    tag(dp[6], narrow ? 'Gr. Wagen' : 'Grosser Wagen', 14);
    tag(proj(rot(VEGA.v, k, th)), 'Wega');
    ctx.restore();
    // Rand und Himmelsrichtungen
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = `500 12px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - R - 8); ctx.fillText('S', cx, cy + R + 17);
    ctx.fillText('O', cx - R - 12, cy + 4); ctx.fillText('W', cx + R + 12, cy + 4);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Blick nach oben' : 'Blick nach oben, darum', 8, 14);
    if (!narrow) ctx.fillText('liegt Osten links', 8, 27);

    // Drehpunkt und Vogel
    const found = th / RAD >= 10;
    const kp = proj(k);
    if (found) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(kp.x, kp.y, 10, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kp.x - 15, kp.y); ctx.lineTo(kp.x - 5, kp.y); ctx.moveTo(kp.x + 5, kp.y); ctx.lineTo(kp.x + 15, kp.y);
      ctx.moveTo(kp.x, kp.y - 15); ctx.lineTo(kp.x, kp.y - 5); ctx.moveTo(kp.x, kp.y + 5); ctx.lineTo(kp.x, kp.y + 15); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,211,77,.5)';
      ctx.beginPath(); ctx.moveTo(kp.x, kp.y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
    }
    const fa = found ? Math.atan2(cy - kp.y, cx - kp.x) : Math.PI / 2;
    if (found) arrow(ctx, cx + Math.cos(fa) * 14, cy + Math.sin(fa) * 14, cx + Math.cos(fa) * R * .55, cy + Math.sin(fa) * R * .55, GOLD, 2.5, 10);
    ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = found ? 10 : 0;
    bird(ctx, cx, cy, 11, fa, '#ffffff');
    ctx.restore();
  };

  /* ---------- Teil 3: Der Neigungskompass ---------- */
  const magCv = $('#magCv');
  const G = { lat: 47, flip: false, shownLat: 47 };
  const incOf = lat => Math.atan(2 * Math.tan(clamp(lat, -89.999, 89.999) * RAD)) / RAD;   // Stabmagnet, vereinfacht
  const latTxt = l => l === 0 ? '0°' : `${Math.abs(l)}° ${l > 0 ? 'N' : 'S'}`;
  const magMsg = l => Math.abs(l) <= 2
    ? 'Am Äquator liegen die Feldlinien waagrecht. Der Neigungskompass zeigt hier keine Richtung. Zum Glück gibt es noch Sonne und Sterne.'
    : l < 0
      ? 'Südhalbkugel: Hier zeigen die Feldlinien schräg nach oben, und polwärts ist jetzt Süden. Nach dem Äquator muss ein Vogel also umdenken, um weiter nach Süden zu fliegen.'
      : Math.abs(l) > 75
        ? 'Nahe am Pol stehen die Feldlinien fast senkrecht. Zum Vergleich: Der echte magnetische Pol liegt etwas neben dem geografischen.'
        : 'Je weiter nördlich, desto steiler tauchen die Feldlinien in den Boden. Der Vogel spürt so, wo es zum Pol geht.';
  const updMag = msg => {
    const l = G.lat, inc = incOf(l);
    $('#latIn').value = l; $('#latOut').textContent = latTxt(l);
    $('#gInc').textContent = `${fmt(Math.abs(inc), 0)}°`;
    const down = (inc > 0) !== G.flip;
    $('#gInc2').textContent = Math.abs(inc) < .5 ? 'waagrecht' : `Feldpfeil ${down ? 'nach unten' : 'nach oben'}`;
    $('#gPole').textContent = Math.abs(l) <= 2 ? 'unklar' : l > 0 ? 'Norden' : 'Süden';
    $('#gAut').textContent = Math.abs(l) <= 2 ? 'unklar' : l > 0 ? 'Süden' : 'Norden';
    $('#magStatus').textContent = msg || magMsg(l);
  };
  const setLat = (l, msg) => { G.lat = l; updMag(msg); };
  $('#latIn').addEventListener('input', e => setLat(+e.target.value));
  $('#gCH').addEventListener('click', () => setLat(47, 'Schweiz: Die Feldlinien tauchen steil in den Boden. Das vereinfachte Modell gibt 65°, gemessen sind es rund 63°.'));
  $('#gSah').addEventListener('click', () => setLat(20, 'Sahara: Die Neigung ist schon deutlich flacher. Der Vogel merkt, dass er sich dem Äquator nähert.'));
  $('#gEq').addEventListener('click', () => setLat(0));
  $('#gSA').addEventListener('click', () => setLat(-30));
  $('#flipBtn').addEventListener('click', () => {
    G.flip = !G.flip;
    $('#flipBtn').textContent = G.flip ? 'Zurück polen' : 'Feld umpolen';
    updMag(G.flip
      ? 'Umgepolt: Die Kompassnadel zeigt jetzt nach Süden. Der Vogel merkt davon nichts. Die Feldlinien sind genau gleich steil, also fliegt er weiter in die gleiche Richtung.'
      : 'Wieder normal: Die Kompassnadel zeigt nach Norden. Für den Vogel hat sich nichts geändert.');
  });
  updMag('Schweiz: Die Feldlinien tauchen steil in den Boden. Das vereinfachte Modell gibt 65°, gemessen sind es rund 63°.');

  const drawMag = dt => {
    G.shownLat += (G.lat - G.shownLat) * (reduced ? 1 : Math.min(1, dt * 8));
    const { ctx, w, h } = fit(magCv);
    ctx.clearRect(0, 0, w, h);
    const wide = w >= 520;
    const pw = wide ? w * .56 : w, ph = wide ? h : h * .56;
    const cx = pw * (wide ? .42 : .38), cy = ph / 2, Re = Math.min(pw * (wide ? .2 : .2), ph * .23);
    const sg = G.flip ? -1 : 1;
    // Feldlinien
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, pw, ph); ctx.clip();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.3; ctx.globalAlpha = .55;
    for (const L of [1.45, 2, 2.9, 4.4]) {
      const lm = Math.acos(Math.sqrt(1 / L));
      for (const side of [1, -1]) {
        ctx.beginPath();
        for (let i = 0; i <= 80; i++) {
          const la = -lm + 2 * lm * i / 80, r = L * Math.cos(la) ** 2;
          const x = cx + side * r * Math.cos(la) * Re, y = cy - r * Math.sin(la) * Re;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        // Pfeil am Äquator
        const ax = cx + side * L * Re, ay = cy;
        ctx.globalAlpha = .8; ctx.fillStyle = C.accent;
        ctx.beginPath(); ctx.moveTo(ax, ay - 6 * sg); ctx.lineTo(ax - 4, ay + 3 * sg); ctx.lineTo(ax + 4, ay + 3 * sg); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .55;
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Erde
    ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - Re, cy); ctx.lineTo(cx + Re, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Nordpol', cx, cy - Re - 6); ctx.fillText('Südpol', cx, cy + Re + 14);
    ctx.fillText('Äquator', cx - Re * .35, cy - 5);
    ctx.textAlign = 'left';
    ctx.fillText(wide ? 'Erdmagnetfeld, vereinfacht' : 'vereinfacht', 8, 14);
    // Vogel auf der Erde
    const la = G.shownLat * RAD;
    const px = cx + Re * Math.cos(la), py = cy - Re * Math.sin(la);
    const br = -2 * Math.sin(la) * sg, bl = Math.cos(la) * sg;
    const vx = br * Math.cos(la) + bl * -Math.sin(la), vy = br * -Math.sin(la) + bl * -Math.cos(la);
    const vl = Math.hypot(vx, vy) || 1;
    arrow(ctx, px + vx / vl * 9, py + vy / vl * 9, px + vx / vl * 40, py + vy / vl * 40, C.copper, 2.5, 8);
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();

    // Vergrösserung: was der Vogel spürt
    const ix0 = wide ? pw + 4 : 12, iy0 = wide ? 16 : ph + 4, iw = wide ? w - pw - 16 : w - 24, ih = wide ? h - 32 : h - ph - 16;
    roundRect(ctx, ix0, iy0, iw, ih, 12); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText('Was der Vogel spürt', ix0 + 12, iy0 + 20);
    const gx = ix0 + iw / 2, gy = iy0 + ih * (wide ? .5 : .56);
    // Boden
    ctx.fillStyle = C.line; ctx.fillRect(ix0 + 10, gy, iw - 20, 3);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.textAlign = 'left'; ctx.fillText('← Süden', ix0 + 12, gy + 18);
    ctx.textAlign = 'right'; ctx.fillText('Norden →', ix0 + iw - 12, gy + 18);
    // Feldlinie durch den Vogel
    const inc = Math.atan(2 * Math.tan(clamp(G.shownLat, -89.9, 89.9) * RAD));   // positiv: nach Norden abwärts
    const L2 = Math.min(iw * .42, ih * .42);
    const dx = Math.cos(inc), dy = Math.sin(inc);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx - dx * L2, gy - dy * L2); ctx.lineTo(gx + dx * L2, gy + dy * L2); ctx.stroke(); ctx.setLineDash([]);
    const fx = dx * sg, fy = dy * sg;
    arrow(ctx, gx - fx * L2 * .9, gy - fy * L2 * .9, gx + fx * L2 * .9, gy + fy * L2 * .9, C.copper, 3, 11);
    // Winkelbogen
    const deg = Math.abs(inc) / RAD;
    if (deg > 1.5) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath();
      const ra = Math.min(46, L2 * .6);
      if (inc > 0) ctx.arc(gx, gy, ra, 0, inc); else ctx.arc(gx, gy, ra, Math.PI + inc, Math.PI);
      ctx.stroke();
      const mid = inc > 0 ? inc / 2 : Math.PI + inc / 2;
      ctx.font = `500 13px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
      ctx.fillText(`${fmt(deg, 0)}°`, gx + Math.cos(mid) * (ra + 20), gy + Math.sin(mid) * (ra + 20) + 4);
      // polwärts
      ctx.font = `10px ${MONO}`; ctx.fillStyle = C.glow;
      ctx.textAlign = inc > 0 ? 'right' : 'left';
      ctx.fillText(inc > 0 ? 'polwärts →' : '← polwärts', inc > 0 ? ix0 + iw - 12 : ix0 + 12, gy - 9);
    } else {
      ctx.font = `10px ${MONO}`; ctx.fillStyle = C.bad; ctx.textAlign = 'center';
      ctx.fillText('waagrecht: keine Richtung', gx, gy + 32);
    }
    bird(ctx, gx, gy - 9, 9, inc > 0 || deg <= 1.5 ? 0 : Math.PI, C.fg);
    // Kompassnadel
    const nx = ix0 + iw - 30, ny = iy0 + 26, nl = 14, hor = Math.cos(la) * sg;
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText('Nadel', nx - nl - 6, ny + 3);
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    const tip = hor >= 0 ? 1 : -1;
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx - tip * nl, ny); ctx.stroke();
    ctx.strokeStyle = '#d23a3a'; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + tip * nl, ny); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('zugvoegel', 4, {
    mapLock: () => { ['#monIn', '#yearBtn', '#autBtn', '#sprBtn'].forEach(s => $(s).disabled = false); },
    skyLock: () => { ['#hourIn', '#nightBtn', '#trailBtn', '#planBtn'].forEach(s => $(s).disabled = false); },
    magLock: () => { ['#latIn', '#gCH', '#gSah', '#gEq', '#gSA', '#flipBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawMap(dt); drawSky(dt); drawMag(dt); });
})();
