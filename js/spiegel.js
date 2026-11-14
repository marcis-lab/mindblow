/* mindblow – Lektion Spiegel */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const DEG = 180 / Math.PI;

  const DIRS = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  // Vektor in Bildschirmkoordinaten (y nach unten) als Himmelsrichtung, Norden ist oben
  const dirName = v => DIRS[((Math.round(Math.atan2(v.x, -v.y) * DEG / 45) % 8) + 8) % 8];
  const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

  const arrowLine = (ctx, x1, y1, x2, y2, col, lw = 2) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.beginPath(); ctx.moveTo(mx + 6 * Math.cos(a), my + 6 * Math.sin(a));
    ctx.lineTo(mx + 6 * Math.cos(a + 2.5), my + 6 * Math.sin(a + 2.5)); ctx.lineTo(mx + 6 * Math.cos(a - 2.5), my + 6 * Math.sin(a - 2.5)); ctx.closePath(); ctx.fill();
  };

  /* ---------- Teil 1: Blick von oben ---------- */
  const topCv = $('#topCv');
  const T1 = { mir: 'front', head: 0, g: 0, turning: false, shown: false };
  const vecs = () => {
    const a = T1.head / DEG;
    return { f: { x: Math.sin(a), y: -Math.cos(a) }, r: { x: Math.cos(a), y: Math.sin(a) } };
  };
  // Spiegelung: vor dir kehrt y um, neben dir kehrt x um
  const refl = v => T1.mir === 'front' ? { x: v.x, y: -v.y } : { x: -v.x, y: v.y };
  // Drehwinkel, mit dem du dich in die Blickrichtung des Bildes drehen müsstest
  const turnAngle = () => { const { f } = vecs(), g = refl(f); const a = Math.atan2(f.x * g.y - f.y * g.x, f.x * g.x + f.y * g.y); return Math.abs(Math.abs(a) - Math.PI) < 1e-6 ? Math.PI : a; };
  const updTop = () => {
    const { f, r } = vecs();
    $('#headOut').textContent = `${T1.head}°`;
    $('#rNose').textContent = `${dirName(f)} · ${dirName(refl(f))}`;
    $('#rHand').textContent = `${dirName(r)} · ${dirName(refl(r))}`;
    $('#rAxis').textContent = T1.mir === 'front' ? 'Nord ↔ Süd' : 'Ost ↔ West';
  };
  const topMsg = () => {
    const { f, r } = vecs();
    const ax = T1.mir === 'front' ? 'Nord-Süd' : 'Ost-West';
    const flipsHand = dirName(r) !== dirName(refl(r)), flipsNose = dirName(f) !== dirName(refl(f));
    return flipsNose && !flipsHand
      ? `Die Nase im Bild zeigt nach ${dirName(refl(f))}, die Hand bleibt im ${dirName(r)}. Nur die ${ax}-Richtung kehrt sich um.`
      : !flipsNose && flipsHand
        ? `Jetzt kehrt der Spiegel deine Hand um, nicht die Nase. Er kennt nur eine Richtung: ${ax}.`
        : `Schräg gedreht ändern sich Nase und Hand ein bisschen. Umgekehrt wird trotzdem nur der ${ax}-Anteil.`;
  };
  $$('#mirBtns button').forEach(b => b.addEventListener('click', () => {
    T1.mir = b.dataset.mir; T1.g = 0; T1.turning = false; T1.shown = false;
    $$('#mirBtns button').forEach(x => x.classList.toggle('active', x === b));
    $('#turnBtn').textContent = 'Dich hineindrehen';
    updTop(); $('#topStatus').textContent = topMsg();
  }));
  $('#headIn').addEventListener('input', e => {
    T1.head = +e.target.value; T1.g = 0; T1.turning = false; T1.shown = false; $('#turnBtn').textContent = 'Dich hineindrehen';
    updTop(); $('#topStatus').textContent = topMsg();
  });
  $('#turnBtn').addEventListener('click', () => {
    if (T1.shown || T1.g > 0) { T1.g = 0; T1.turning = false; T1.shown = false; $('#turnBtn').textContent = 'Dich hineindrehen'; $('#topStatus').textContent = topMsg(); return; }
    T1.turning = true; $('#turnBtn').textContent = 'Zurück';
    $('#topStatus').textContent = 'So stellt sich dein Kopf das Bild vor: Du gehst um den Spiegel herum und drehst dich so, dass du wie das Bild schaust.';
    if (reduced) T1.g = 1;
  });
  updTop();

  const drawPerson = (ctx, x, y, f, r, s, mode) => {
    ctx.save();
    ctx.globalAlpha = mode === 'image' ? .7 : 1;
    if (mode === 'ghost') ctx.setLineDash([4, 4]);
    // Schultern
    ctx.lineCap = 'round';
    ctx.strokeStyle = mode === 'ghost' ? C.muted : C.fg; ctx.lineWidth = mode === 'ghost' ? 2 : 11 * s;
    ctx.beginPath(); ctx.moveTo(x - r.x * 15 * s, y - r.y * 15 * s); ctx.lineTo(x + r.x * 15 * s, y + r.y * 15 * s); ctx.stroke();
    // Kopf und Nase
    ctx.beginPath(); ctx.arc(x, y, 9 * s, 0, TAU);
    if (mode === 'ghost') { ctx.stroke(); } else { ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.setLineDash([]);
    const nx = x + f.x * 9 * s, ny = y + f.y * 9 * s;
    ctx.beginPath(); ctx.moveTo(nx + r.x * 4 * s, ny + r.y * 4 * s); ctx.lineTo(x + f.x * 17 * s, y + f.y * 17 * s); ctx.lineTo(nx - r.x * 4 * s, ny - r.y * 4 * s); ctx.closePath();
    ctx.fillStyle = mode === 'ghost' ? C.muted : C.fg; ctx.fill();
    // Hände: kupfern ist die rechte
    const hand = (sg, col) => {
      ctx.beginPath(); ctx.arc(x + r.x * 21 * s * sg + f.x * 5 * s, y + r.y * 21 * s * sg + f.y * 5 * s, 5.5 * s, 0, TAU);
      ctx.fillStyle = col; ctx.fill();
    };
    hand(1, C.copper); hand(-1, mode === 'ghost' ? C.line : C.accent);
    ctx.restore();
  };

  const drawTop = dt => {
    if (T1.turning) { T1.g = Math.min(1, T1.g + dt / 2.2); if (T1.g >= 1) { T1.turning = false; finishTurn(); } }
    const { ctx, w, h } = fit(topCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420, s = small ? .9 : 1.1;
    const { f, r } = vecs();
    let px, py, ix, iy;
    ctx.font = MONO;
    if (T1.mir === 'front') {
      const m = h * .47; px = w / 2; py = h * .76; ix = px; iy = 2 * m - py;
      ctx.fillStyle = C.sunk; ctx.fillRect(0, 0, w, m);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, m); ctx.lineTo(w - 10, m); ctx.stroke();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (let x = 14; x < w - 10; x += 10) { ctx.beginPath(); ctx.moveTo(x, m - 3); ctx.lineTo(x + 6, m - 9); ctx.stroke(); }
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('Spiegel', 12, m + 16);
      ctx.fillText('Spiegelwelt', 12, 18);
    } else {
      const m = w * .58; px = w * .28; py = h * .55; ix = 2 * m - px; iy = py;
      ctx.fillStyle = C.sunk; ctx.fillRect(m, 0, w - m, h);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(m, 10); ctx.lineTo(m, h - 10); ctx.stroke();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (let y = 14; y < h - 10; y += 10) { ctx.beginPath(); ctx.moveTo(m + 3, y); ctx.lineTo(m + 9, y + 6); ctx.stroke(); }
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('Spiegel', m - 8, h - 12);
      ctx.textAlign = 'right'; ctx.fillText('Spiegelwelt', w - 10, 18);
    }
    // Kompass
    const cx = small ? 26 : 34, cy = h - (small ? 30 : 36), cr = small ? 13 : 16;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - cr - 4); ctx.fillText('S', cx, cy + cr + 11); ctx.fillText('W', cx - cr - 7, cy + 4); ctx.fillText('O', cx + cr + 7, cy + 4);
    ctx.beginPath(); ctx.moveTo(cx, cy - cr + 3); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy); ctx.closePath(); ctx.fillStyle = C.fg; ctx.fill();

    drawPerson(ctx, ix, iy, refl(f), refl(r), s, 'image');
    drawPerson(ctx, px, py, f, r, s, 'you');
    ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText('du', px, py + 36 * s);
    ctx.fillStyle = C.muted;
    ctx.fillText('Spiegelbild', ix, T1.mir === 'front' ? iy - 30 * s : iy + 36 * s);
    // Gedankenbild: du gehst ins Bild und drehst dich um
    if (T1.g > 0) {
      const e = T1.g < .5 ? 2 * T1.g * T1.g : 1 - Math.pow(-2 * T1.g + 2, 2) / 2;
      // Weg um den Spiegel herum: seitlich ausweichen
      const side = T1.mir === 'front' ? { x: w * .3, y: 0 } : { x: 0, y: -h * .32 };
      const bump = Math.sin(e * Math.PI);
      const gx = lerp(px, ix, e) + side.x * bump, gy = lerp(py, iy, e) + side.y * bump;
      const phi = turnAngle();
      drawPerson(ctx, gx, gy, rot(f, phi * e), rot(r, phi * e), s, 'ghost');
      if (T1.g >= 1) {
        ctx.fillStyle = C.muted; ctx.textAlign = 'center';
        ctx.fillText(small ? 'gedacht' : 'du, hineingedacht', gx, T1.mir === 'front' ? gy + 36 * s : gy - 30 * s);
      }
    }
  };
  const finishTurn = () => {
    const { r } = vecs();
    const rg = rot(r, turnAngle()), ri = refl(r);
    T1.shown = true;
    $('#topStatus').textContent = dirName(rg) === dirName(ri)
      ? 'Hier passt es sogar zusammen. Probier die Drehung 0°.'
      : `Stündest du so da wie das Bild, wäre deine kupferne Hand im ${dirName(rg)}. Im Bild ist sie im ${dirName(ri)}. Darum wirkt das Bild seitenverkehrt.`;
  };

  /* ---------- Teil 2: Strahlengang ---------- */
  const rayCv = $('#rayCv');
  const T2 = { d: 1, ye: .8, de: 2.2, fan: false };
  const angles = () => {
    const py = T2.ye * T2.d / (T2.de + T2.d); // Treffpunkt auf dem Spiegel (Kerze auf Höhe 0)
    return { py, ain: Math.atan2(Math.abs(py), T2.d) * DEG, aout: Math.atan2(Math.abs(T2.ye - py), T2.de) * DEG };
  };
  const updRay = () => {
    const { ain, aout } = angles();
    $('#candOut').textContent = `${fmt(T2.d, 1)} m`;
    $('#eyeOut').textContent = `${fmt(T2.ye, 2)} m`;
    $('#aIn').textContent = `${fmt(ain, 1)}°`;
    $('#aOut').textContent = `${fmt(aout, 1)}°`;
    $('#imgD').textContent = `${fmt(T2.d, 1)} m`;
  };
  $('#candIn').addEventListener('input', e => { T2.d = +e.target.value; updRay(); $('#rayStatus').textContent = `Die Kerze steht ${fmt(T2.d, 1)} m vor dem Spiegel, ihr Bild ${fmt(T2.d, 1)} m dahinter.`; });
  $('#eyeIn').addEventListener('input', e => { T2.ye = +e.target.value; updRay(); $('#rayStatus').textContent = 'Du stehst woanders, der Strahl trifft den Spiegel woanders. Das Bild bleibt am selben Ort.'; });
  $('#fanBtn').addEventListener('click', () => {
    T2.fan = !T2.fan; $('#fanBtn').textContent = T2.fan ? 'Weniger Strahlen' : 'Mehr Strahlen';
    $('#rayStatus').textContent = T2.fan ? 'Alle Strahlen, nach hinten verlängert, treffen sich in einem Punkt: dem Bild.' : 'Ein Strahl: der, der genau in dein Auge fällt.';
  });
  updRay();

  const drawCandle = (ctx, x, y, s, faded, now) => {
    ctx.globalAlpha = faded ? .45 : 1;
    ctx.fillStyle = C.fg; ctx.fillRect(x - 4 * s, y, 8 * s, 18 * s);
    const fl = reduced ? 0 : Math.sin(now / 120) * .8;
    ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 4 * s, 7 * s + fl, 0, 0, TAU); ctx.fillStyle = C.copper; ctx.fill();
    ctx.globalAlpha = 1;
  };
  const drawEye = (ctx, x, y, ang) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -11, 12, 0); ctx.quadraticCurveTo(0, 11, -12, 0); ctx.closePath();
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(3, 0, 4, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.restore();
  };

  const drawRay = (dt, now) => {
    const { ctx, w, h } = fit(rayCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const s = Math.min((w - 30) / 5.4, (h - 50) / 3);
    const mx = w / 2, my = h / 2 + 6;
    const X = x => mx + x * s, Y = y => my - y * s;
    // Spiegelwelt rechts
    ctx.fillStyle = C.sunk; ctx.fillRect(mx, 0, w - mx, h);
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(small ? 'hinter dem Spiegel' : 'hinter dem Spiegel: kein Licht', w - 10, 16);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, 14); ctx.lineTo(mx, h - 14); ctx.stroke();
    const { py, ain, aout } = angles();
    const cand = { x: -T2.d, y: 0 }, img = { x: T2.d, y: 0 }, eye = { x: -T2.de, y: T2.ye };
    // Strahlenfächer
    if (T2.fan) {
      ctx.globalAlpha = .55;
      for (let yy = -1.3; yy <= 1.31; yy += .26) {
        const hit = { x: 0, y: yy };
        // reflektierter Strahl läuft nach links bis zum Rand
        const dx = -(hit.x - cand.x), dy = hit.y - cand.y; // gespiegelte Richtung
        const tEnd = (-2.7 - hit.x) / dx;
        ctx.strokeStyle = C.glow; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(cand.x), Y(cand.y)); ctx.lineTo(X(0), Y(yy)); ctx.lineTo(X(hit.x + dx * tEnd), Y(hit.y + dy * tEnd)); ctx.stroke();
        ctx.setLineDash([3, 4]); ctx.strokeStyle = C.muted;
        ctx.beginPath(); ctx.moveTo(X(0), Y(yy)); ctx.lineTo(X(img.x), Y(img.y)); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    }
    // Lot
    ctx.strokeStyle = C.line; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(-1.1), Y(py)); ctx.lineTo(X(.5), Y(py)); ctx.stroke(); ctx.setLineDash([]);
    // Strahl ins Auge
    arrowLine(ctx, X(cand.x), Y(cand.y), X(0), Y(py), C.copper, 2.4);
    arrowLine(ctx, X(0), Y(py), X(eye.x), Y(eye.y), C.copper, 2.4);
    ctx.strokeStyle = C.muted; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(X(0), Y(py)); ctx.lineTo(X(img.x), Y(img.y)); ctx.stroke(); ctx.setLineDash([]);
    // Winkelbögen
    const R = Math.min(34, s * .5);
    // in Bildschirmwinkeln: Lot zeigt nach links (Winkel PI)
    const scr = (x, y) => Math.atan2(y - Y(py), x - X(0));
    const lot = Math.PI;
    ctx.lineWidth = 1.5;
    for (const [pt, col] of [[cand, C.copper], [eye, C.accent]]) {
      let a = scr(X(pt.x), Y(pt.y));
      if (a < 0) a += TAU;
      ctx.strokeStyle = col; ctx.beginPath();
      ctx.arc(X(0), Y(py), R, Math.min(a, lot), Math.max(a, lot)); ctx.stroke();
    }
    ctx.fillStyle = C.fg; ctx.textAlign = 'right';
    const labY = py >= 0 ? 1 : -1;
    ctx.fillText(`${fmt(ain, 0)}°`, X(0) - R - 4, Y(py) + (labY > 0 ? 14 : -6));
    ctx.fillText(`${fmt(aout, 0)}°`, X(0) - R - 4, Y(py) + (labY > 0 ? -6 : 14));
    // Gegenstände
    drawCandle(ctx, X(cand.x), Y(cand.y) - 6, 1, false, now);
    drawCandle(ctx, X(img.x), Y(img.y) - 6, 1, true, now);
    const lookAng = Math.atan2(Y(py) - Y(eye.y), X(0) - X(eye.x));
    drawEye(ctx, X(eye.x), Y(eye.y), lookAng);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Kerze', X(cand.x), Y(cand.y) + 30);
    ctx.fillText(small ? 'Bild' : 'Bild (virtuell)', X(img.x), Y(img.y) + 30);
    ctx.fillText('dein Auge', X(eye.x), Y(eye.y) + (T2.ye > -1 ? 24 : -16));
    // Abstände unten
    const by = h - 14;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(cand.x), by - 4); ctx.lineTo(X(cand.x), by + 4); ctx.moveTo(X(cand.x), by); ctx.lineTo(X(img.x), by); ctx.moveTo(X(img.x), by - 4); ctx.lineTo(X(img.x), by + 4); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText(`${fmt(T2.d, 1)} m`, (X(cand.x) + mx) / 2, by - 6); ctx.fillText(`${fmt(T2.d, 1)} m`, (X(img.x) + mx) / 2, by - 6);
  };

  /* ---------- Teil 3: Ganzkörperspiegel ---------- */
  const fullCv = $('#fullCv');
  const H = 1.7, EYE = 1.58;
  const T3 = { d: 1.2, len: .6, bot: .9 };
  const seen = () => {
    const lo = clamp(2 * T3.bot - EYE, 0, H), hi = clamp(2 * (T3.bot + T3.len) - EYE, 0, H);
    return hi > lo ? { lo, hi } : null;
  };
  const loName = y => y <= .01 ? 'den Füssen' : y < .55 ? 'den Knien' : y < .95 ? 'der Hüfte' : y < 1.35 ? 'der Brust' : 'dem Hals';
  const hiName = y => y >= H - .01 ? 'zum Scheitel' : y > 1.5 ? 'zu den Augen' : y > 1.35 ? 'zum Kinn' : y > .95 ? 'zur Brust' : y > .55 ? 'zur Hüfte' : 'zu den Knien';
  const updFull = () => {
    $('#distOut').textContent = `${fmt(T3.d, 1)} m`;
    $('#lenOut').textContent = `${Math.round(T3.len * 100)} cm`;
    $('#botOut').textContent = `${Math.round(T3.bot * 100)} cm`;
    const v = seen();
    $('#fSee').textContent = v ? `${Math.round((v.hi - v.lo) / H * 100)} %` : '0 %';
    $('#fRange').textContent = v ? `${Math.round(v.lo * 100)}–${Math.round(v.hi * 100)} cm` : '–';
    const full = v && v.lo <= .001 && v.hi >= H - .001;
    $('#fullStatus').textContent = !v ? 'Du siehst dich gar nicht. Schieb den Spiegel auf Augenhöhe.'
      : full ? `Du siehst dich ganz, mit einem Spiegel von ${Math.round(T3.len * 100)} cm. Ändere den Abstand: Es bleibt so.`
        : `Du siehst dich von ${loName(v.lo)} bis ${hiName(v.hi)}. Tritt zurück: Ändert sich etwas?`;
  };
  $('#distIn').addEventListener('input', e => { T3.d = +e.target.value; updFull(); });
  $('#lenIn').addEventListener('input', e => { T3.len = +e.target.value / 100; updFull(); });
  $('#botIn').addEventListener('input', e => { T3.bot = +e.target.value / 100; updFull(); });
  updFull();

  const stick = (ctx, x, fy, s, faceRight, alpha) => {
    // Seitenansicht, Höhen in Metern über Boden
    const Yp = m => fy - m * s;
    ctx.globalAlpha = alpha; ctx.strokeStyle = C.fg; ctx.fillStyle = C.fg; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2.5, s * .06);
    const dir = faceRight ? 1 : -1;
    ctx.beginPath(); ctx.arc(x, Yp(1.585), .115 * s, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dir * .1 * s, Yp(1.6)); ctx.lineTo(x + dir * .14 * s, Yp(1.56)); ctx.lineTo(x + dir * .1 * s, Yp(1.54)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, Yp(1.47)); ctx.lineTo(x, Yp(.9));
    ctx.moveTo(x, Yp(1.38)); ctx.lineTo(x + dir * .1 * s, Yp(1.1)); ctx.lineTo(x + dir * .06 * s, Yp(.85));
    ctx.moveTo(x, Yp(.9)); ctx.lineTo(x + dir * .04 * s, Yp(.48)); ctx.lineTo(x, Yp(0)); ctx.lineTo(x + dir * .12 * s, Yp(0));
    ctx.moveTo(x, Yp(.9)); ctx.lineTo(x - dir * .06 * s, Yp(.48)); ctx.lineTo(x - dir * .08 * s, Yp(0)); ctx.lineTo(x + dir * .05 * s, Yp(0));
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawFull = () => {
    const { ctx, w, h } = fit(fullCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const s = Math.min((w - 24) / 6.7, (h - 54) / 2);
    const wx = w / 2, fy = h - 30;
    const Yp = m => fy - m * s;
    const px = wx - T3.d * s, ix = wx + T3.d * s;
    // Boden und Spiegelwelt
    ctx.fillStyle = C.sunk; ctx.fillRect(wx, 0, w - wx, h);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(w, fy); ctx.stroke();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, 8); ctx.lineTo(wx, fy); ctx.stroke();
    // nötiger Bereich
    ctx.fillStyle = C.glow; ctx.globalAlpha = .3; ctx.fillRect(wx - 6, Yp((H + EYE) / 2), 12, (H / 2) * s); ctx.globalAlpha = 1;
    // Spiegel
    const mt = Math.min(T3.bot + T3.len, 2.05);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(wx, Yp(T3.bot)); ctx.lineTo(wx, Yp(mt)); ctx.stroke();
    // sichtbarer Teil am Körper
    const v = seen();
    if (v) {
      ctx.fillStyle = C.good; ctx.globalAlpha = .22;
      ctx.fillRect(px - .2 * s, Yp(v.hi), .4 * s, (v.hi - v.lo) * s);
      ctx.fillRect(ix - .2 * s, Yp(v.hi), .4 * s, (v.hi - v.lo) * s);
      ctx.globalAlpha = 1;
    }
    stick(ctx, px, fy, s, true, 1);
    stick(ctx, ix, fy, s, false, .45);
    // Strahlen vom Bild von Scheitel und Füssen zum Auge
    const eyeX = px + .06 * s, eyeY = Yp(EYE);
    const ray = (tgt, col) => {
      const hitY = (tgt + EYE) / 2;
      const onMirror = hitY >= T3.bot - 1e-9 && hitY <= T3.bot + T3.len + 1e-9;
      ctx.strokeStyle = onMirror ? col : C.muted; ctx.lineWidth = onMirror ? 2 : 1.2; ctx.globalAlpha = onMirror ? 1 : .6;
      // echter Weg: vom Körperpunkt zum Spiegel und zum Auge
      ctx.beginPath(); ctx.moveTo(px, Yp(tgt)); ctx.lineTo(wx, Yp(hitY)); ctx.lineTo(eyeX, eyeY); ctx.stroke();
      ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(wx, Yp(hitY)); ctx.lineTo(ix, Yp(tgt)); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(wx, Yp(hitY), 3, 0, TAU); ctx.fillStyle = onMirror ? col : C.muted; ctx.fill();
      ctx.globalAlpha = 1;
    };
    ray(H, C.copper); ray(0, C.copper);
    // Beschriftung
    ctx.font = MONO; ctx.textAlign = 'right'; ctx.fillStyle = C.glow;
    ctx.fillText(small ? 'nötig' : 'nötig: halbe Grösse', wx - 10, Yp((H + EYE) / 2) - 6);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('du', px, Yp(H) - 8); ctx.fillText('Bild', ix, Yp(H) - 8);
    ctx.textAlign = 'left'; ctx.fillStyle = C.accent; ctx.fillText('Spiegel', wx + 8, Yp(mt) - 6 < 14 ? 14 : Yp(mt) - 6);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, fy + 22); ctx.lineTo(wx, fy + 22); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(`${fmt(T3.d, 1)} m`, (px + wx) / 2, fy + 16);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('spiegel', 4, {
    topLock: () => { $$('#mirBtns button').forEach(b => b.disabled = false); $('#headIn').disabled = false; $('#turnBtn').disabled = false; },
    rayLock: () => { $('#candIn').disabled = false; $('#eyeIn').disabled = false; $('#fanBtn').disabled = false; },
    fullLock: () => { $('#distIn').disabled = false; $('#lenIn').disabled = false; $('#botIn').disabled = false; },
  });

  loop((dt, now) => { drawTop(dt); drawRay(dt, now); drawFull(); });
})();
