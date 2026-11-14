/* mindblow – Lektion Gezeiten */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const FONT = '11px Geist Mono, monospace';
  const MOON_FILL = '#c9c8c0', MOON_DARK = '#3a3a3e';   // Mond bewusst in festen Farben
  const SYN = 29.53;                     // Tage von Neumond zu Neumond
  const SUN = .46;                       // Gezeitenwirkung der Sonne im Vergleich zum Mond

  // Kleine Zeichenhelfer
  const arrow = (ctx, x, y, dx, dy, col, lw = 2) => {
    const L = Math.hypot(dx, dy);
    if (L < .5) return;
    const ux = dx / L, uy = dy / L, hs = Math.min(7, L * .45);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx - ux * hs * .6, y + dy - uy * hs * .6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - ux * hs - uy * hs * .55, y + dy - uy * hs + ux * hs * .55);
    ctx.lineTo(x + dx - ux * hs + uy * hs * .55, y + dy - uy * hs - ux * hs * .55);
    ctx.closePath(); ctx.fill();
  };
  // Erde mit Wasserhülle; r(φ) liefert den Wasserradius, φ mathematisch (gegen den Uhrzeigersinn, y nach oben)
  const drawEarth = (ctx, cx, cy, R, rOf) => {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const p = i / 120 * TAU, r = rOf(p), x = cx + r * Math.cos(p), y = cy - r * Math.sin(p);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = C.fiber; ctx.globalAlpha = .45; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
  };
  const drawMoon = (ctx, x, y, r, litAngle) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = litAngle == null ? MOON_FILL : MOON_DARK; ctx.fill();
    if (litAngle != null) {
      // beleuchtete Hälfte zeigt zur Sonne
      ctx.beginPath(); ctx.arc(x, y, r, -litAngle - Math.PI / 2, -litAngle + Math.PI / 2); ctx.closePath();
      ctx.fillStyle = MOON_FILL; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
  };
  const hhmm = h => { const m = Math.round(((h % 24) + 24) % 24 * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const durTxt = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };

  /* ---------- Teil 1: Zwei Fluten am Tag ---------- */
  const dayCv = $('#dayCv');
  const W_EARTH = TAU / 24;               // Erddrehung pro Stunde (gegenüber der Sonne)
  const W_MOON = TAU / (SYN * 24);        // Mond wandert pro Stunde weiter
  const W_REL = W_EARTH - W_MOON;         // ergibt 24 h 50 min pro Runde
  const D = { t: 12, m0: 40 * Math.PI / 180, play: false, acc: 0, lastKind: '' };
  const portAng = t => Math.PI + W_EARTH * (t - 12);   // um 12 Uhr zeigt der Hafen zur Sonne (links)
  const moonAng = t => D.m0 + W_MOON * t;
  const level = t => Math.cos(2 * (portAng(t) - moonAng(t)));
  // Zeit bis zum nächsten Hochwasser: relativer Winkel muss ein Vielfaches von π sein
  const nextHigh = t => {
    const psi = ((portAng(t) - moonAng(t)) % Math.PI + Math.PI) % Math.PI;
    const dt = (Math.PI - psi) / W_REL;
    return dt > Math.PI / W_REL - 1e-6 ? 0 : dt;
  };
  const highsBetween = (a, b) => { const out = []; let t = a + nextHigh(a); while (t < b) { out.push(t); t += Math.PI / W_REL; } return out; };
  const dayLabel = t => `Tag ${Math.floor(t / 24) + 1}, ${hhmm(t)}`;

  const updDay = () => {
    const t = D.t;
    $('#timeIn').value = t; $('#timeOut').textContent = dayLabel(t);
    $('#moonIn').value = Math.round(D.m0 * 180 / Math.PI); $('#moonOut').textContent = Math.round(D.m0 * 180 / Math.PI) + '°';
    const lv = level(t);
    $('#dLevel').textContent = (lv >= 0 ? '+' : '−') + fmt(Math.abs(lv), 2) + ' m';
    const nh = nextHigh(t);
    $('#dNext').textContent = nh < 1 / 60 ? 'jetzt' : durTxt(nh);
    const d0 = Math.floor(t / 24) * 24;
    $('#dTimes').textContent = highsBetween(d0, d0 + 24).map(hhmm).join(' und ');
    const kind = lv > .97 ? 'hoch' : lv < -.97 ? 'tief' : 'mitte';
    if (kind !== D.lastKind) {
      D.lastKind = kind;
      $('#dayStatus').textContent = kind === 'hoch' ? 'Flut: Der Hafen liegt gerade unter einem Flutberg. Steht der Mond über ihm oder auf der Gegenseite?'
        : kind === 'tief' ? 'Ebbe: Der Hafen steht quer zur Richtung zum Mond, zwischen den Flutbergen.'
        : 'Vergleiche die Uhrzeiten der Fluten an Tag 1 und Tag 2. Sie rutschen jeden Tag rund 50 Minuten später.';
    }
  };
  const playBtn1 = $('#dayPlay');
  const stop1 = () => { D.play = false; playBtn1.textContent = 'Zwei Tage abspielen'; };
  playBtn1.addEventListener('click', () => {
    if (D.play) return stop1();
    if (D.t >= 47.9) D.t = 0;
    D.play = true; D.acc = 0; playBtn1.textContent = 'Anhalten';
  });
  $('#timeIn').addEventListener('input', e => { stop1(); D.t = +e.target.value; updDay(); });
  $('#moonIn').addEventListener('input', e => { D.m0 = +e.target.value * Math.PI / 180; updDay(); });
  $('#dayNext').addEventListener('click', () => {
    stop1();
    let nh = nextHigh(D.t); if (nh < 1 / 60) nh = Math.PI / W_REL;
    if (D.t + nh > 48) { D.t = nextHigh(0); $('#dayStatus').textContent = 'Zurück zum Anfang: erste Flut an Tag 1.'; D.lastKind = 'x'; }
    else D.t += nh;
    updDay();
  });
  updDay();

  const drawDay = dt => {
    if (D.play) {
      if (reduced) { D.acc += dt; if (D.acc >= .4) { D.acc = 0; D.t = Math.min(48, D.t + 1); updDay(); } }
      else { D.t = Math.min(48, D.t + dt * 4); updDay(); }
      if (D.t >= 48) stop1();
    }
    const narrow = dayCv.clientWidth < 560;
    const want = narrow ? '480px' : '340px';
    if (dayCv.style.height !== want) dayCv.style.height = want;
    const { ctx, w, h } = fit(dayCv);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT; ctx.textBaseline = 'alphabetic';
    const aw = narrow ? w : w * .46, ah = narrow ? h * .56 : h;
    const cx = aw / 2, cy = ah / 2 + 8;
    const R = Math.min(aw, ah) * .2, Dm = Math.min(aw / 2 - 22, ah / 2 - 16, R * 2.15);
    const t = D.t, pa = portAng(t), ma = moonAng(t);
    // Sonnenlicht von links
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('← Sonne', 12, 20);
    ctx.fillText(narrow ? 'von oben' : 'Blick von oben', 12, 35);
    ctx.fillText('nicht massstabgetreu', 12, ah - 6);
    // Mondbahn
    ctx.beginPath(); ctx.arc(cx, cy, Dm, 0, TAU); ctx.strokeStyle = C.line; ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    drawEarth(ctx, cx, cy, R * .86, p => R * (1.02 + .13 * Math.cos(2 * (p - ma))));
    // Nachtseite rechts
    ctx.beginPath(); ctx.arc(cx, cy, R * .86, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    // Hafen
    const pr = R * (1.02 + .13 * Math.cos(2 * (pa - ma)));
    const px = cx + pr * Math.cos(pa), py = cy - pr * Math.sin(pa);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + R * .86 * Math.cos(pa), cy - R * .86 * Math.sin(pa)); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill(); ctx.strokeStyle = C.fg; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = Math.cos(pa) < 0 ? 'right' : 'left';
    ctx.fillText('Hafen', px + Math.cos(pa) * 10 + (Math.cos(pa) < 0 ? -2 : 2), py - Math.sin(pa) * 10 + 4);
    // Mond
    const mx = cx + Dm * Math.cos(ma), my = cy - Dm * Math.sin(ma);
    drawMoon(ctx, mx, my, Math.max(7, R * .22), Math.PI);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Mond', mx, my + (Math.sin(ma) > 0 ? -R * .22 - 7 : R * .22 + 15));

    // Kurve des Wasserstands über 48 h
    const gx = narrow ? 44 : aw + 34, gy = narrow ? ah + 30 : 44, gw = narrow ? w - 62 : w - aw - 54, gh = narrow ? h - ah - 64 : h - 92;
    const X = s => gx + s / 48 * gw, Y = v => gy + gh / 2 - v * gh * .42;
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Wasserstand im Hafen', gx - (narrow ? 32 : 0), gy - 16);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, Y(0)); ctx.lineTo(gx + gw, Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText('+1 m', gx - 5, Y(1) + 4); ctx.fillText('0', gx - 5, Y(0) + 4); ctx.fillText('−1 m', gx - 5, Y(-1) + 4);
    ctx.textAlign = 'center';
    for (let s = 0; s <= 48; s += narrow ? 12 : 6) {
      ctx.beginPath(); ctx.moveTo(X(s), gy + gh); ctx.lineTo(X(s), gy + gh + 4); ctx.stroke();
      ctx.fillText(String(s), X(s), gy + gh + 16);
    }
    ctx.fillText(narrow ? 'Stunden' : 'Stunden seit Tag 1, 00:00', gx + gw / 2, gy + gh + 30);
    // Tagesgrenze
    ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(X(24), gy); ctx.lineTo(X(24), gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const s = i / 5, x = X(s), y = Y(level(s)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2; ctx.stroke();
    // Hochwasser markieren, Abstand der ersten beiden anschreiben
    const hs = highsBetween(0, 48);
    hs.forEach(s => { ctx.beginPath(); ctx.arc(X(s), Y(1), 3, 0, TAU); ctx.fillStyle = C.fiber; ctx.fill(); });
    if (hs.length >= 2) {
      const y = gy - 2, x1 = X(hs[0]), x2 = X(hs[1]);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y + 5); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y + 5); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.textAlign = 'center';
      if (x2 - x1 > 70) ctx.fillText('12 h 25 min', (x1 + x2) / 2, y - 4);
    }
    // aktueller Zeitpunkt
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(t), gy); ctx.lineTo(X(t), gy + gh); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(t), Y(level(t)), 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.stroke();
  };

  /* ---------- Teil 2: Gezeitenkraft als Unterschied ---------- */
  const pullCv = $('#pullCv');
  const P = { mode: 'pull', d: 60 };
  const EX = 10;                          // Übertreibung der Unterschiede im Modus «Anziehung»
  const T60 = (60 / 59) ** 2 - 1;         // Gezeitenbeschleunigung vorne bei heutigem Abstand
  // Anziehung des Mondes am Punkt (x, y) in Erdradien, Mond bei (d, 0); Erdmitte = 1
  const pullAt = (x, y, d) => { const vx = d - x, vy = -y, L = Math.hypot(vx, vy); return [vx * d * d / L ** 3, vy * d * d / L ** 3]; };
  const updPull = () => {
    const d = P.d;
    $('#distIn').value = d; $('#distOut').textContent = d + ' R';
    $('#pNear').textContent = fmt((d / (d - 1)) ** 2 * 100, 1) + ' %';
    $('#pFar').textContent = fmt((d / (d + 1)) ** 2 * 100, 1) + ' %';
    const f = (60 / d) ** 3;
    $('#pTide').textContent = '×' + fmt(f, f < 1 ? 2 : 1);
  };
  $$('#pullModes button').forEach(b => b.addEventListener('click', () => {
    P.mode = b.dataset.mode;
    $$('#pullModes button').forEach(x => x.classList.toggle('active', x === b));
    $('#pullStatus').textContent = P.mode === 'pull'
      ? 'Alle Pfeile zeigen zum Mond. Vorne sind sie etwas länger, hinten etwas kürzer als in der Mitte.'
      : 'Jetzt ist der Zug der Mitte abgezogen. Übrig bleibt eine Dehnung: vorne zum Mond hin, hinten vom Mond weg.';
  }));
  $('#distIn').addEventListener('input', e => {
    P.d = +e.target.value; updPull();
    $('#pullStatus').textContent = P.d < 60
      ? 'Näher am Mond: Der Unterschied zwischen vorne und hinten wächst stark. So war es vor Milliarden Jahren.'
      : P.d > 60 ? 'Weiter weg: Die Gezeitenkraft nimmt mit der dritten Potenz des Abstands ab.' : 'Heute: Der Mond ist rund 60 Erdradien entfernt, etwa 384\'000 km.';
  });
  updPull();

  const drawPull = () => {
    const { ctx, w, h } = fit(pullCv);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT; ctx.textBaseline = 'alphabetic';
    const narrow = w < 480;
    const cx = w * (narrow ? .4 : .38), cy = h / 2 + 6, R = Math.min(h * .27, w * .2);
    const d = P.d, f = (60 / d) ** 3, e = Math.min(.15, .06 * f);
    // Mond rechts, nicht massstabgetreu
    const mx = w - 26, mr = 13;
    drawMoon(ctx, mx, cy, mr);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('Mond', mx - 4, cy + mr + 16);
    ctx.textAlign = 'right'; ctx.fillText(narrow ? `${d} R →` : `${d} Erdradien entfernt →`, w - 12, cy - mr - 10);
    drawEarth(ctx, cx, cy, R * .86, p => R * (1.02 + e * Math.cos(2 * p)));
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('fern', cx - R * 1.25 - 14, cy + 4);
    ctx.fillText('nah', cx + R * 1.25 + 12, cy - 12);
    // Pfeile an 12 Punkten und in der Mitte
    const pts = [[0, 0]];
    for (let i = 0; i < 12; i++) pts.push([Math.cos(i / 12 * TAU) * .82, Math.sin(i / 12 * TAU) * .82]);
    for (const [x, y] of pts) {
      const [ax, ay] = pullAt(x, y, d), sx = cx + x * R, sy = cy - y * R;
      const center = x === 0 && y === 0;
      if (P.mode === 'pull') {
        const L = R * .5, vx = 1 + EX * (ax - 1), vy = EX * ay;
        arrow(ctx, sx, sy, vx * L, -vy * L, center ? C.fg : C.glow, center ? 2.5 : 2);
      } else {
        const L = R * .42 / T60;
        let vx = (ax - 1) * L, vy = (ay) * L;
        const m = Math.hypot(vx, vy), cap = R * .85;
        if (m > cap) { vx *= cap / m; vy *= cap / m; }
        if (center) { ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, TAU); ctx.fillStyle = C.fg; ctx.fill(); }
        else arrow(ctx, sx, sy, vx, -vy, C.copper, 2);
      }
    }
    // Legende oben links
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    if (P.mode === 'pull') {
      ctx.fillText(narrow ? 'Zug des Mondes' : 'Anziehung des Mondes an jedem Ort', 12, 20);
      ctx.fillText(narrow ? 'Unterschiede 10× grösser' : 'Unterschiede 10-fach übertrieben', 12, 35);
    } else {
      ctx.fillText(narrow ? 'Zug minus Zug der Mitte' : 'Anziehung minus Anziehung der Erdmitte', 12, 20);
      ctx.fillText(narrow ? 'Pfeile vergrössert' : 'Pfeile stark vergrössert', 12, 35);
    }
    ctx.fillText(narrow ? 'Wasser übertrieben' : 'Flutberge stark übertrieben', 12, h - 12);
  };

  /* ---------- Teil 3: Springtide und Nipptide ---------- */
  const monthCv = $('#monthCv');
  const M = { day: 4, sun: true, play: false, left: 0, acc: 0 };
  const sunK = () => M.sun ? SUN : 0;
  const rangeAt = day => { const s = sunK(), a = 2 * TAU * day / SYN; return Math.sqrt(1 + s * s + 2 * s * Math.cos(a)); };
  const phaseName = day => {
    const q = SYN / 8, k = Math.round(day / q) % 8;
    return ['Neumond', 'zunehmende Sichel', 'zunehmender Halbmond', 'zunehmender Mond', 'Vollmond', 'abnehmender Mond', 'abnehmender Halbmond', 'abnehmende Sichel'][k];
  };
  const updMonth = () => {
    $('#phaseIn').value = M.day; $('#phaseOut').textContent = 'Tag ' + fmt(M.day, 1);
    $('#mPhase').textContent = phaseName(M.day);
    const H = rangeAt(M.day);
    $('#mRange').textContent = fmt(H * 100, 0) + ' %';
    $('#mKind').textContent = !M.sun ? 'nur Mond' : H > 1.38 ? 'Springtide' : H < .62 ? 'Nipptide' : 'dazwischen';
  };
  const playBtn3 = $('#monthPlay');
  const stop3 = () => { M.play = false; playBtn3.textContent = 'Einen Monat abspielen'; };
  playBtn3.addEventListener('click', () => {
    if (M.play) return stop3();
    M.play = true; M.left = SYN; M.acc = 0; playBtn3.textContent = 'Anhalten';
  });
  $('#phaseIn').addEventListener('input', e => {
    stop3(); M.day = +e.target.value; updMonth();
    const H = rangeAt(M.day);
    if (M.sun) $('#monthStatus').textContent = H > 1.38 ? 'Sonne, Erde und Mond in einer Linie: Die Flutberge addieren sich.'
      : H < .62 ? 'Sonne und Mond im rechten Winkel: Die Sonne füllt die Ebbe des Mondes auf.'
      : 'Die beiden Flutberge liegen schräg zueinander.';
  });
  $('#sunBtn').addEventListener('click', () => {
    M.sun = !M.sun;
    $('#sunBtn').textContent = M.sun ? 'Sonne ausschalten' : 'Sonne einschalten';
    $('#monthStatus').textContent = M.sun ? 'Mit Sonne: Der Tidenhub schwankt zwischen 54 % und 146 %.' : 'Ohne Sonne wären alle Fluten gleich hoch, egal bei welcher Mondphase.';
    updMonth();
  });
  updMonth();

  const drawMonth = dt => {
    if (M.play) {
      let step;
      if (reduced) { M.acc += dt; if (M.acc < .4) step = 0; else { M.acc = 0; step = 1; } }
      else step = dt * 3;
      if (step) { M.left -= step; M.day = (M.day + step) % SYN; if (M.day > 29.5) M.day = 0; updMonth(); }
      if (M.left <= 0) stop3();
    }
    const narrow = monthCv.clientWidth < 560;
    const want = narrow ? '480px' : '340px';
    if (monthCv.style.height !== want) monthCv.style.height = want;
    const { ctx, w, h } = fit(monthCv);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT; ctx.textBaseline = 'alphabetic';
    const aw = narrow ? w : w * .46, ah = narrow ? h * .56 : h;
    const cx = aw / 2 + 14, cy = ah / 2 + 8;
    const R = Math.min(aw, ah) * .19, Dm = Math.min(aw / 2 - 26, ah / 2 - 16, R * 2.2);
    const ma = Math.PI + TAU * M.day / SYN, s = sunK();
    // Sonne am linken Rand
    if (M.sun) {
      const g = ctx.createRadialGradient(0, cy, 4, 0, cy, 46);
      g.addColorStop(0, C.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, cy, 46, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, cy, 16, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(M.sun ? 'Sonne, weit weg' : 'Sonne aus', 12, 20);
    ctx.textAlign = 'right'; ctx.fillText(narrow ? 'von oben' : 'Blick von oben', aw - 12, 20);
    // Achsen der beiden Flutberge
    ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(ma) * Dm, cy + Math.sin(ma) * Dm); ctx.lineTo(cx + Math.cos(ma) * Dm, cy - Math.sin(ma) * Dm); ctx.stroke();
    if (M.sun) { ctx.strokeStyle = C.glow; ctx.beginPath(); ctx.moveTo(cx - R * 1.6, cy); ctx.lineTo(cx + R * 1.6, cy); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx, cy, Dm, 0, TAU); ctx.strokeStyle = C.line; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]);
    drawEarth(ctx, cx, cy, R * .86, p => R * (1.06 + .085 * (Math.cos(2 * (p - ma)) + s * Math.cos(2 * (p - Math.PI)))));
    // Nachtseite rechts
    ctx.beginPath(); ctx.arc(cx, cy, R * .86, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    const mx = cx + Dm * Math.cos(ma), my = cy - Dm * Math.sin(ma);
    drawMoon(ctx, mx, my, Math.max(7, R * .24), Math.PI);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Mond', mx, my + (Math.sin(ma) > 0 ? -R * .24 - 7 : R * .24 + 15));

    // Tidenhub über einen Mondmonat
    const gx = narrow ? 44 : aw + 40, gy = narrow ? ah + 30 : 44, gw = narrow ? w - 62 : w - aw - 58, gh = narrow ? h - ah - 66 : h - 96;
    const X = d => gx + d / SYN * gw, Y = v => gy + gh - v / 1.6 * gh;
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Tidenhub über einen Monat', gx - (narrow ? 32 : 0), gy - 16);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gx, Y(1)); ctx.lineTo(gx + gw, Y(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'right';
    ctx.fillText('100 %', gx - 5, Y(1) + 4); ctx.fillText('0', gx - 5, Y(0) + 4); ctx.fillText('150 %', gx - 5, Y(1.5) + 4);
    ctx.textAlign = 'right'; ctx.fillText('Mond allein', gx + gw, Y(1) - 6);
    // Phasen auf der Achse
    const PH = gw < 420 ? [['Neu', 0], ['Halb', SYN / 4], ['Voll', SYN / 2], ['Halb', SYN * .75]] : [['Neumond', 0], ['Halbmond', SYN / 4], ['Vollmond', SYN / 2], ['Halbmond', SYN * .75]];
    ctx.textAlign = 'center';
    PH.forEach(([n, d]) => {
      ctx.beginPath(); ctx.moveTo(X(d), gy + gh); ctx.lineTo(X(d), gy + gh + 4); ctx.stroke();
      ctx.textAlign = d === 0 ? 'left' : 'center'; ctx.fillText(n, X(d), gy + gh + 16);
    });
    ctx.textAlign = 'center'; ctx.fillText(narrow ? 'Tage' : 'Tage im Mondmonat', gx + gw / 2, gy + gh + 30);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const d = i / 200 * SYN, x = X(d), y = Y(rangeAt(d)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(M.day), gy); ctx.lineTo(X(M.day), gy + gh); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(M.day), Y(rangeAt(M.day)), 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.stroke();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('gezeiten', 4, {
    dayLock: () => { ['#timeIn', '#moonIn', '#dayPlay', '#dayNext'].forEach(s => $(s).disabled = false); },
    pullLock: () => { $('#distIn').disabled = false; $$('#pullModes button').forEach(b => b.disabled = false); },
    monthLock: () => { ['#phaseIn', '#monthPlay', '#sunBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawDay(dt); drawPull(); drawMonth(dt); });
})();
