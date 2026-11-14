/* mindblow – Lektion Zeitzonen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MONO = '11px Geist Mono, monospace';
  const mod = (a, n) => ((a % n) + n) % n;
  const hhmm = t => { const m = Math.round(mod(t, 24) * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag'];
  const DS = ['So', 'Mo', 'Di', 'Mi', 'Do'];
  const dayIdx = t => 2 + Math.floor(t / 24); // Weltzeit 0 bis 24 = Dienstag

  /* ---------- Teil 1: Erde von oben ---------- */
  const earthCv = $('#earthCv');
  const E = { mez: 12, spin: false, on: false, geo: null, drag: null };
  const CITIES = [
    { n: 'Zürich', s: 'Zürich', lon: 8.5, lat: 47.4, off: 1 },
    { n: 'Tokio', s: 'Tokio', lon: 139.7, lat: 35.7, off: 9 },
    { n: 'New York', s: 'N. Y.', lon: -74, lat: 40.7, off: -5 },
    { n: 'Los Angeles', s: 'L. A.', lon: -118.2, lat: 34.1, off: -8 },
    { n: 'Delhi', s: 'Delhi', lon: 77.2, lat: 28.6, off: 5.5 },
  ];
  const updEarth = () => {
    E.mez = mod(E.mez, 24);
    $('#utcIn').value = E.mez;
    $('#utcOut').textContent = hhmm(E.mez);
    if (!E.on) return;
    const utc = E.mez - 1;
    $('#tZh').textContent = hhmm(utc + 1);
    $('#tTk').textContent = hhmm(utc + 9);
    $('#tNy').textContent = hhmm(utc - 5);
    const dz = Math.floor((utc + 1) / 24), dt = Math.floor((utc + 9) / 24), dn = Math.floor((utc - 5) / 24);
    const parts = [];
    if (dt > dz) parts.push('In Tokio ist schon der nächste Tag.');
    if (dn < dz) parts.push('In New York ist noch der Vortag.');
    const zh = mod(utc + 1, 24);
    $('#earthStatus').textContent = (zh > 11.5 && zh < 12.5 ? 'In der Schweiz ist Mittag: Wir stehen der Sonne genau gegenüber. ' : zh < .5 || zh > 23.5 ? 'In der Schweiz ist Mitternacht. ' : '') + (parts.join(' ') || 'Alle drei Städte haben gerade denselben Kalendertag.');
  };
  $('#utcIn').addEventListener('input', e => { E.mez = +e.target.value; updEarth(); });
  $('#spinBtn').addEventListener('click', () => {
    if (reduced) { E.mez += 3; updEarth(); return; }
    E.spin = !E.spin; $('#spinBtn').textContent = E.spin ? 'Anhalten' : 'Erde drehen';
  });
  const angAt = ev => {
    const r = earthCv.getBoundingClientRect();
    return Math.atan2(ev.clientY - r.top - E.geo.cy, ev.clientX - r.left - E.geo.cx);
  };
  earthCv.addEventListener('pointerdown', ev => {
    if (!E.on || !E.geo) return;
    E.drag = angAt(ev); earthCv.setPointerCapture(ev.pointerId);
    E.spin = false; $('#spinBtn').textContent = 'Erde drehen';
  });
  earthCv.addEventListener('pointermove', ev => {
    if (E.drag === null) return;
    const a = angAt(ev);
    let d = a - E.drag; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
    E.drag = a; E.mez -= d / (Math.PI / 12); updEarth();
  });
  const endDrag = () => { E.drag = null; };
  earthCv.addEventListener('pointerup', endDrag);
  earthCv.addEventListener('pointercancel', endDrag);
  updEarth();

  const drawEarth = dt => {
    if (E.spin) { E.mez += dt * 2; updEarth(); }
    const { ctx, w, h } = fit(earthCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const cx = w / 2, cy = h / 2 + 16, R = Math.max(60, Math.min(w / 2 - (small ? 46 : 70), h / 2 - 46));
    E.geo = { cx, cy, R };
    const utc = E.mez - 1, lonSun = -15 * (utc - 12);
    const ang = lon => -Math.PI / 2 - (lon - lonSun) * RAD;
    // Sonnenstrahlen von oben
    ctx.strokeStyle = C.glow; ctx.fillStyle = C.glow; ctx.lineWidth = 1.5;
    for (const k of [-.7, -.35, 0, .35, .7]) {
      const x = cx + k * R;
      ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 27); ctx.lineTo(x - 4, 20); ctx.lineTo(x + 4, 20); ctx.closePath(); ctx.fill();
    }
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillText('Sonnenlicht', 8, 18);
    // Erde
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = C.fiber; ctx.globalAlpha = .18; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (const lat of [30, 60]) { ctx.beginPath(); ctx.arc(cx, cy, R * (90 - lat) / 90, 0, TAU); ctx.stroke(); }
    for (let lon = -180; lon < 180; lon += 15) {
      const a = ang(lon);
      ctx.strokeStyle = lon % 90 === 0 ? C.muted : C.line; ctx.lineWidth = lon % 90 === 0 ? 1.2 : 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.stroke();
    }
    // Nachtseite
    ctx.beginPath(); ctx.moveTo(cx + R, cy); ctx.arc(cx, cy, R, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = 'rgba(10, 14, 40, .34)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    // Längengrad-Marken
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const [lon, t] of [[0, '0°'], [180, '180°']]) {
      const a = ang(lon);
      ctx.fillText(t, cx + (R + 14) * Math.cos(a), cy + (R + 14) * Math.sin(a) + 4);
    }
    ctx.fillText('Nordpol', cx, cy - 6);
    // Mittag / Mitternacht
    ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText('Mittag', cx + 8, cy - R - 6);
    ctx.fillText('Mitternacht', cx + 8, cy + R + 16);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText('Tag', cx - R - 8, cy - 10); ctx.fillText('Nacht', cx - R - 8, cy + 18);
    // Drehrichtung
    ctx.strokeStyle = C.accent; ctx.fillStyle = C.accent; ctx.lineWidth = 2;
    const ar = R + 12, a0 = .45, a1 = -.15;
    ctx.beginPath(); ctx.arc(cx, cy, ar, a0, a1, true); ctx.stroke();
    const hx = cx + ar * Math.cos(a1), hy = cy + ar * Math.sin(a1), tx = Math.sin(a1), ty = -Math.cos(a1);
    ctx.beginPath(); ctx.moveTo(hx + tx * 8, hy + ty * 8); ctx.lineTo(hx - ty * 5, hy + tx * 5); ctx.lineTo(hx + ty * 5, hy - tx * 5); ctx.closePath(); ctx.fill();
    // Städte
    for (const c of CITIES) {
      const a = ang(c.lon), r = R * (90 - c.lat) / 90;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fillStyle = c.n === 'Zürich' ? C.copper : C.fg; ctx.fill();
      const out = Math.cos(a) >= 0 ? 1 : -1;
      ctx.textAlign = out > 0 ? 'left' : 'right';
      ctx.fillStyle = C.fg;
      ctx.fillText(`${small ? c.s : c.n} ${hhmm(utc + c.off)}`, x + out * 8, y + 4);
    }
  };

  /* ---------- Teil 2: Datumsgrenze ---------- */
  const lineCv = $('#lineCv');
  const L = { utc: 8, flight: false, flying: false, on: false, crossed: false };
  const LON0 = -37.5; // linker Rand des Bands (Zonengrenze)
  const TOK = 139.7, LAX = 241.8; // Längen im Band (L.A. = −118,2° + 360°)
  const PLACES = [
    { n: 'Zürich', lon: 8.5, lat: 47.4 }, { n: 'Delhi', lon: 77.2, lat: 28.6 }, { n: 'Tokio', lon: TOK, lat: 35.7 },
    { n: 'Auckland', lon: 174.8, lat: -36.8 }, { n: 'Honolulu', lon: 202.2, lat: 21.3 }, { n: 'L. A.', lon: LAX, lat: 34.1 }, { n: 'New York', lon: 286, lat: 40.7 },
  ];
  const planeLon = () => TOK + (LAX - TOK) * clamp((L.utc - 8) / 10, 0, 1);
  const zoneOf = lonBand => { const g = lonBand > 180 ? lonBand - 360 : lonBand; return Math.round(g / 15); };
  const updLine = () => {
    $('#utc2In').value = L.utc;
    $('#utc2Out').textContent = `${DS[dayIdx(L.utc)]} ${hhmm(L.utc)}`;
    if (!L.on) return;
    $('#pUtc').textContent = `${DS[dayIdx(L.utc)]} ${hhmm(L.utc)}`;
    if (!L.flight) { $('#pLocal').textContent = '–'; $('#pFlown').textContent = '–'; return; }
    const lon = planeLon(), loc = L.utc + zoneOf(lon);
    $('#pLocal').textContent = `${DS[dayIdx(loc)]} ${hhmm(loc)}`;
    const fl = clamp(L.utc - 8, 0, 10);
    $('#pFlown').textContent = `${fmt(fl, 1)} h`;
    let msg;
    if (L.utc < 8) msg = 'Noch am Boden in Tokio. Abflug ist am Dienstag um 17:00 Ortszeit.';
    else if (L.utc >= 18) msg = 'Gelandet in Los Angeles: Dienstag, 10:00 Uhr. Abgeflogen bist du am Dienstag um 17:00. Einen Teil des Dienstags erlebst du zweimal.';
    else if (lon > 180) msg = `Hinter der Datumsgrenze: Die Ortszeit ist um 24 Stunden zurückgesprungen. Unter dir ist es wieder ${DAYS[dayIdx(loc)]}.`;
    else msg = 'Unterwegs nach Osten: Jede Zone weiter östlich ist eine Stunde später. Die Ortszeit rast vorwärts, Richtung Mitternacht.';
    $('#lineStatus').textContent = msg;
  };
  $('#utc2In').addEventListener('input', e => { L.utc = +e.target.value; L.flying = false; updLine(); });
  $('#flyBtn').addEventListener('click', () => {
    L.flight = true; L.utc = reduced ? 18 : 8; L.flying = !reduced;
    $('#flyBtn').textContent = 'Nochmal fliegen';
    updLine();
  });
  updLine();

  const drawLine = dt => {
    if (L.flying) { L.utc = Math.min(18, L.utc + dt * 1.25); if (L.utc >= 18) L.flying = false; updLine(); }
    const { ctx, w, h } = fit(lineCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const x0 = 8, bw = w - 16, top = 44, bot = h - 44;
    const X = lonBand => x0 + bw * (lonBand - LON0) / 360;
    const Y = lat => top + 14 + (bot - top - 36) * (60 - lat) / 100;
    const cols = [];
    for (let k = -12; k <= 12; k++) {
      let a = 15 * k - 7.5, b = 15 * k + 7.5;
      a = Math.max(a, -180); b = Math.min(b, 180);
      if (b <= LON0) { a += 360; b += 360; }
      const loc = L.utc + k;
      cols.push({ k, a, b, day: dayIdx(loc), hour: Math.floor(mod(loc, 24)) });
    }
    cols.sort((p, q) => p.a - q.a);
    ctx.font = MONO;
    for (const c of cols) {
      const xa = X(c.a), xb = X(c.b);
      ctx.fillStyle = c.day > 2 ? C.glow : c.day < 2 ? C.muted : C.fiber;
      ctx.globalAlpha = c.day > 2 ? .26 : c.day < 2 ? .16 : .18;
      ctx.fillRect(xa, top, xb - xa - .5, bot - top);
      ctx.globalAlpha = 1;
      const wide = (xb - xa) > 14;
      if (wide && (!small || c.k % 2 === 0)) {
        ctx.fillStyle = C.muted; ctx.textAlign = 'center';
        ctx.fillText(String(c.hour), (xa + xb) / 2, top - 8);
      }
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText(small ? 'Uhr:' : 'Ortszeit (Stunde):', x0, 14);
    // Tagesbereiche beschriften und Mitternacht finden
    let start = 0;
    for (let i = 1; i <= cols.length; i++) {
      if (i === cols.length || cols[i].day !== cols[start].day) {
        const xa = X(cols[start].a), xb = X(cols[i - 1].b);
        if (xb - xa > 30) {
          ctx.fillStyle = C.fg; ctx.textAlign = 'center';
          ctx.fillText(xb - xa > 80 && !small ? DAYS[cols[start].day] : DS[cols[start].day], (xa + xb) / 2, bot - 8);
        }
        if (i < cols.length && Math.abs(cols[i].a - 180) > 1) {
          const xm = X(cols[i].a);
          ctx.strokeStyle = C.fg; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(xm, top); ctx.lineTo(xm, bot + 6); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = C.fg; ctx.textAlign = xm > w - 70 ? 'right' : 'left';
          ctx.fillText('Mitternacht', xm + (xm > w - 70 ? -4 : 4), bot + 20);
        }
        start = i;
      }
    }
    // Datumsgrenze
    const xd = X(180);
    ctx.strokeStyle = C.copper; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xd, top - 4); ctx.lineTo(xd, bot + 6); ctx.stroke();
    ctx.fillStyle = C.copper; ctx.textAlign = 'center';
    ctx.fillText('Datumsgrenze', clamp(xd, 50, w - 50), bot + 34);
    // Orte
    for (const p of PLACES) {
      const x = X(p.lon), y = Y(p.lat);
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
      if (!small || ['Zürich', 'Tokio', 'L. A.', 'Auckland'].includes(p.n)) {
        ctx.textAlign = p.n === 'Auckland' ? 'right' : 'left';
        ctx.fillText(p.n, x + (p.n === 'Auckland' ? -6 : 6), y - 6);
      }
    }
    // Flug
    if (L.flight) {
      ctx.strokeStyle = C.accent; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(TOK), Y(35.7)); ctx.lineTo(X(LAX), Y(34.1)); ctx.stroke(); ctx.setLineDash([]);
      const lon = planeLon(), px = X(lon), py = Y(35.7 + (34.1 - 35.7) * (lon - TOK) / (LAX - TOK)) - 14;
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.moveTo(px + 10, py); ctx.lineTo(px - 8, py - 7); ctx.lineTo(px - 4, py); ctx.lineTo(px - 8, py + 7); ctx.closePath(); ctx.fill();
      const loc = L.utc + zoneOf(lon);
      roundRect(ctx, px - 34, py - 30, 68, 18, 5); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.fillText(`${DS[dayIdx(loc)]} ${hhmm(loc)}`, px, py - 17);
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('Osten →', w - 8, 14);
  };

  /* ---------- Teil 3: Sonnenmittag ---------- */
  const noonCv = $('#noonCv');
  const N = { lon: 6.14, lat: 46.2, name: 'Genf', clock: 12, dst: false, on: false };
  const sunPos = clock => {
    const utc = clock - 1 - (N.dst ? 1 : 0);
    const H = 15 * (utc + N.lon / 15 - 12) * RAD, phi = N.lat * RAD, dec = (N.dst ? 23.44 : 0) * RAD;
    const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
    return { alt: alt / RAD, az: az / RAD };
  };
  const noonClock = () => 12 - N.lon / 15 + 1 + (N.dst ? 1 : 0);
  const updNoon = () => {
    $('#clockOut').textContent = hhmm(N.clock);
    $('#dstBtn').textContent = N.dst ? 'Sommerzeit: an' : 'Sommerzeit: aus';
    if (!N.on) return;
    const nc = noonClock(), diff = Math.round((nc - 12) * 60);
    $('#nNoon').textContent = hhmm(nc);
    $('#nDiff').textContent = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)} min`;
    const s = sunPos(N.clock);
    $('#nAlt').textContent = s.alt > 0 ? `${fmt(s.alt, 0)}°` : 'unter Horizont';
    const season = N.dst ? 'Im Juni, mit Sommerzeit' : 'Im März, ohne Sommerzeit';
    const extra = N.name === 'Vigo (E)' ? ' Spanien hat dieselbe Zone wie wir, liegt aber weit im Westen. Darum wird es dort so spät Mittag und abends so lange hell.'
      : N.name === 'Warschau' ? ' Warschau liegt östlich des 15. Längengrads, darum ist dort schon vor 12 Uhr Mittag.'
      : N.name === 'St. Gallen' ? ' Vergleiche mit Genf: 13 Minuten Unterschied in einem kleinen Land.'
      : '';
    $('#noonStatus').textContent = `${season}: In ${N.name.replace(' (E)', '')} steht die Sonne um ${hhmm(nc)} genau im Süden.${extra}`;
  };
  $$('#placeBtns button').forEach(b => b.addEventListener('click', () => {
    N.lon = +b.dataset.lon; N.lat = +b.dataset.lat; N.name = b.textContent;
    $$('#placeBtns button').forEach(x => x.classList.toggle('active', x === b));
    updNoon();
  }));
  $('#clockIn').addEventListener('input', e => { N.clock = +e.target.value; updNoon(); });
  $('#dstBtn').addEventListener('click', () => { N.dst = !N.dst; updNoon(); });
  updNoon();

  const drawNoon = () => {
    const { ctx, w, h } = fit(noonCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const hy = h - 78, cx = w / 2, half = w / 2 - 16, sky = hy - 26;
    const X = az => cx + half * clamp(az / 125, -1.05, 1.05);
    const Y = alt => hy - sky * alt / 70;
    // Himmel und Horizont
    ctx.fillStyle = C.glow; ctx.globalAlpha = .06; ctx.fillRect(8, 8, w - 16, hy - 8); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, hy); ctx.lineTo(w - 8, hy); ctx.stroke();
    ctx.font = MONO; ctx.fillStyle = C.muted;
    ctx.textAlign = 'left'; ctx.fillText('Osten', 10, hy + 15);
    ctx.textAlign = 'right'; ctx.fillText('Westen', w - 10, hy + 15);
    // Süden
    ctx.strokeStyle = C.line; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx, 12); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.fillText('Süden', cx, hy + 15);
    // Bahn der Sonne
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2; ctx.beginPath();
    let pen = false;
    for (let t = 0; t <= 24.001; t += .05) {
      const s = sunPos(t);
      if (s.alt < 0) { pen = false; continue; }
      pen ? ctx.lineTo(X(s.az), Y(s.alt)) : ctx.moveTo(X(s.az), Y(s.alt)); pen = true;
    }
    ctx.stroke();
    // Stundenmarken
    for (let t = 0; t < 24; t++) {
      const s = sunPos(t);
      if (s.alt < 2) continue;
      if (small && t % 2) continue;
      ctx.beginPath(); ctx.arc(X(s.az), Y(s.alt), 2.5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(String(t), X(s.az), Y(s.alt) + 16);
    }
    // Höchststand
    const nc = noonClock(), sn = sunPos(nc);
    ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText(`${small ? 'höchster' : 'höchster Stand'}: ${hhmm(nc)}`, cx, Math.max(14, Y(sn.alt) - 16));
    // Sonne jetzt
    const s = sunPos(N.clock);
    if (s.alt > -2) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hy); ctx.clip();
      ctx.beginPath(); ctx.arc(X(s.az), Y(s.alt), 11, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('Die Sonne ist untergegangen', cx, hy - 40);
    }
    // Längengrad-Leiste
    const by = h - 30, bx0 = 20, bx1 = w - 20;
    const LX = lon => bx0 + (bx1 - bx0) * (lon + 10) / 35;
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const lon of [-5, 0, 5, 10, 15, 20]) {
      ctx.beginPath(); ctx.moveTo(LX(lon), by - 4); ctx.lineTo(LX(lon), by + 4); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillText(`${lon}°`, LX(lon), by + 17);
    }
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(LX(15), by, 5, 0, TAU); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillText(small ? 'Zonenmitte' : '15° O: Mitte der Zone', LX(15), by - 9);
    ctx.fillStyle = C.copper; ctx.beginPath(); ctx.arc(LX(N.lon), by, 5, 0, TAU); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillText(N.name.replace(' (E)', ''), clamp(LX(N.lon), 36, w - 36), by - 24);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('zeitzonen', 4, {
    earthLock: () => { E.on = true; $('#utcIn').disabled = false; $('#spinBtn').disabled = false; updEarth(); },
    lineLock: () => { L.on = true; $('#utc2In').disabled = false; $('#flyBtn').disabled = false; updLine(); },
    noonLock: () => { N.on = true; $$('#placeBtns button').forEach(b => b.disabled = false); $('#clockIn').disabled = false; $('#dstBtn').disabled = false; updNoon(); },
  });

  loop(dt => { drawEarth(dt); drawLine(dt); drawNoon(); });
})();
