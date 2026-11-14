/* mindblow – Lektion Bienen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Biene, Sonne, Wachs, Honig, Pflanzen
  const BEE = '#e0a526', STRIPE = '#2e2414', SUN = '#f2b632', WAX = '#d9a441', HONEY = '#e8a317';
  const PETAL = '#f4c6d4', PETAL2 = '#c86fa0', LEAF = '#5b9a45', TRUNK = '#7a5434', APPLE = '#c8323c';
  const WILD = '#3a2f24';

  // Kompass: Azimut im Uhrzeigersinn ab Norden → Bildschirmvektor
  const vec = a => [Math.sin(a * RAD), -Math.cos(a * RAD)];
  const norm180 = a => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
  const SHORT = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const LONG = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  const sector = a => Math.round((((a % 360) + 360) % 360) / 45) % 8;
  const hhmm = t => `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.round((t % 1) * 60)).padStart(2, '0')}`;

  // Eine Biene zeichnen: Kopf zeigt in Richtung (hx, hy)
  const drawBee = (ctx, x, y, hx, hy, s = 1, body = BEE, buzz = 0) => {
    const ang = Math.atan2(hy, hx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    // Flügel
    ctx.fillStyle = 'rgba(230,240,255,.65)'; ctx.strokeStyle = 'rgba(120,130,150,.6)'; ctx.lineWidth = .8;
    const wing = buzz ? .5 + .5 * Math.sin(buzz) : .7;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(-1, side * (5 + 2 * wing), 6, 3.2, side * .5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    // Hinterleib und Brust
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(-5, 0, 7.5, 4.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = STRIPE;
    for (const sx of [-8, -4.5]) { ctx.fillRect(sx, -4.2, 1.8, 8.4); }
    ctx.beginPath(); ctx.ellipse(3, 0, 3.6, 3.4, 0, 0, TAU); ctx.fillStyle = '#5a4020'; ctx.fill();
    ctx.beginPath(); ctx.arc(7.4, 0, 2.6, 0, TAU); ctx.fillStyle = STRIPE; ctx.fill();
    ctx.restore();
  };

  /* ---------- Teil 1: Schwänzeltanz ---------- */
  const danceCv = $('#danceCv');
  const D = { dir: 225, dist: 1500, time: 11, unlocked: false, drag: false, sunRun: false, t: 0, side: 1, phase: 0, waggle: 0, hit: null };
  const sunAz = t => 180 + (t - 13.5) * 16; // vereinfachter Sommertag in der Schweiz: Süden um etwa 13:30
  const danceAngle = () => norm180(D.dir - sunAz(D.time));
  const angleText = th => {
    const a = Math.round(Math.abs(th));
    if (a <= 2) return 'genau nach oben';
    if (a >= 178) return 'genau nach unten';
    return `${a}° ${th > 0 ? 'rechts' : 'links'} von oben`;
  };
  const updDance = () => {
    $('#dirIn').value = D.dir; $('#distIn').value = D.dist; $('#timeIn').value = D.time;
    $('#dirOut').textContent = `${SHORT[sector(D.dir)]} ${D.dir}°`;
    $('#distOut').textContent = D.dist < 1000 ? `${D.dist} m` : `${fmt(D.dist / 1000, D.dist % 100 ? 2 : 1)} km`;
    $('#timeOut').textContent = hhmm(D.time);
    $('#dAngle').textContent = angleText(danceAngle());
    $('#dDur').textContent = `${fmt(D.dist / 1000, 1)} s`;
    $('#dSun').textContent = LONG[sector(sunAz(D.time))];
  };
  const danceMsg = () => {
    const th = danceAngle();
    const a = Math.abs(Math.round(th));
    if (a <= 2) return 'Die Wiese liegt genau in Richtung Sonne. Darum läuft die Biene auf der Wabe genau nach oben.';
    if (a >= 178) return 'Die Wiese liegt genau von der Sonne weg. Die Biene läuft auf der Wabe nach unten.';
    return `Die Wiese liegt ${a}° ${th > 0 ? 'rechts' : 'links'} der Sonne. Genau diesen Winkel tanzt die Biene, gemessen von der Senkrechten.`;
  };
  $('#dirIn').addEventListener('input', e => { D.dir = +e.target.value; updDance(); $('#danceStatus').textContent = danceMsg(); });
  $('#distIn').addEventListener('input', e => {
    D.dist = +e.target.value; updDance();
    $('#danceStatus').textContent = `Je weiter weg, desto länger der Schwänzellauf: hier etwa ${fmt(D.dist / 1000, 1)} Sekunden (vereinfacht).`;
  });
  $('#timeIn').addEventListener('input', e => {
    D.time = +e.target.value; D.sunRun = false; $('#sunBtn').textContent = 'Sonne wandern lassen'; updDance();
    $('#danceStatus').textContent = 'Die Wiese bleibt, wo sie ist. Aber die Sonne wandert, darum ändert sich der getanzte Winkel.';
  });
  $('#sunBtn').addEventListener('click', () => {
    D.sunRun = !D.sunRun;
    $('#sunBtn').textContent = D.sunRun ? 'Sonne anhalten' : 'Sonne wandern lassen';
    if (D.sunRun) $('#danceStatus').textContent = 'Im Zeitraffer: Die Sonne wandert, und der Tanz dreht sich mit. Echte Bienen gleichen das laufend aus.';
  });
  $('#toSunBtn').addEventListener('click', () => {
    D.dir = Math.round(((sunAz(D.time) % 360) + 360) % 360); updDance(); $('#danceStatus').textContent = danceMsg();
  });
  updDance();

  // Wiese in der Draufsicht verschieben
  const setFromPointer = e => {
    if (!D.hit) return false;
    const r = danceCv.getBoundingClientRect();
    const x = e.clientX - r.left - D.hit.cx, y = e.clientY - r.top - D.hit.cy;
    const d = Math.hypot(x, y);
    if (d > D.hit.R * 1.15 && !D.drag) return false;
    D.dir = Math.round(((Math.atan2(x, -y) / RAD) + 360) % 360);
    D.dist = clamp(Math.round(d / D.hit.R * 4000 / 50) * 50, 200, 4000);
    updDance(); $('#danceStatus').textContent = danceMsg();
    return true;
  };
  danceCv.addEventListener('pointerdown', e => {
    if (!D.unlocked) return;
    if (setFromPointer(e)) { D.drag = true; danceCv.setPointerCapture(e.pointerId); }
  });
  danceCv.addEventListener('pointermove', e => { if (D.drag) setFromPointer(e); });
  const endDrag = () => { D.drag = false; };
  danceCv.addEventListener('pointerup', endDrag); danceCv.addEventListener('pointercancel', endDrag);

  const drawFlowers = (ctx, x, y, s) => {
    const pts = [[0, 0], [-9, 5], [8, 6], [-4, -8], [9, -6]];
    for (const [i, [dx, dy]] of pts.entries()) {
      const fx = x + dx * s, fy = y + dy * s, r = 3.4 * s;
      ctx.fillStyle = i % 2 ? PETAL2 : PETAL;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(fx + Math.cos(k * TAU / 5) * r, fy + Math.sin(k * TAU / 5) * r, r * .8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = SUN; ctx.beginPath(); ctx.arc(fx, fy, r * .55, 0, TAU); ctx.fill();
    }
  };
  const drawSun = (ctx, x, y, r) => {
    ctx.strokeStyle = SUN; ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
      const a = k * TAU / 8;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); ctx.lineTo(x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8); ctx.stroke();
    }
    ctx.fillStyle = SUN; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };
  const drawHive = (ctx, x, y, s = 1) => {
    ctx.fillStyle = WAX;
    for (let i = 0; i < 4; i++) { roundRect(ctx, x - (11 - i * 1.5) * s, y + (6 - i * 5) * s, (22 - i * 3) * s, 5 * s, 2.5 * s); ctx.fill(); }
    ctx.fillStyle = STRIPE; ctx.beginPath(); ctx.arc(x, y + 9 * s, 2 * s, 0, TAU); ctx.fill();
  };
  // Pfeil mit Winkelbogen zwischen zwei Richtungen
  const angleArc = (ctx, cx, cy, r, a0, a1, col) => {
    // a0, a1: Azimut in Grad (Bildschirm: 0 = oben)
    const s0 = (a0 - 90) * RAD, s1 = (a1 - 90) * RAD;
    let d = norm180(a1 - a0) * RAD;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, s0, s0 + d, d < 0); ctx.stroke();
    return { mid: s0 + d / 2 };
  };

  const drawDance = dt => {
    const narrow = (danceCv.clientWidth || 600) < 560;
    const wantH = narrow ? '640px' : '440px';
    if (danceCv.style.height !== wantH) danceCv.style.height = wantH;
    const { ctx, w, h } = fit(danceCv);
    ctx.clearRect(0, 0, w, h);
    if (D.sunRun && !reduced) {
      D.time += dt * .5; if (D.time > 18) D.time = 8;
      D.time = Math.round(D.time * 100) / 100; updDance();
    }
    const th = danceAngle(), sAz = sunAz(D.time);

    // Felder
    const P1 = narrow ? { x: 0, y: 0, w, h: h / 2 } : { x: 0, y: 0, w: w / 2, h };
    const P2 = narrow ? { x: 0, y: h / 2, w, h: h / 2 } : { x: w / 2, y: 0, w: w / 2, h };
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath();
    if (narrow) { ctx.moveTo(14, h / 2); ctx.lineTo(w - 14, h / 2); } else { ctx.moveTo(w / 2, 14); ctx.lineTo(w / 2, h - 14); }
    ctx.stroke();

    /* Draufsicht */
    const cx = P1.x + P1.w / 2, cy = P1.y + P1.h / 2 + 10;
    const R = Math.min(P1.w, P1.h) / 2 - 40;
    D.hit = { cx, cy, R };
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('DRAUFSICHT', P1.x + 16, P1.y + 22);
    ctx.fillStyle = C.sunk; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.line; ctx.setLineDash([2, 4]);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath(); ctx.arc(cx, cy, R * k / 4, 0, TAU); ctx.stroke();
      if (k % 2 === 0) ctx.fillText(`${k} km`, cx + 3, cy + R * k / 4 - 3);
    }
    ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
    ctx.fillText('N', cx, cy - R - 6);
    // Sonne
    const [sx, sy] = vec(sAz);
    ctx.strokeStyle = SUN; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * (R + 14), cy + sy * (R + 14)); ctx.stroke(); ctx.setLineDash([]);
    drawSun(ctx, cx + sx * (R + 18), cy + sy * (R + 18), 7);
    // Wiese
    const fr = D.dist / 4000 * R, [fx, fy] = vec(D.dir);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + fx * fr, cy + fy * fr); ctx.stroke();
    // Winkel Sonne → Wiese
    const ar = Math.min(34, Math.max(18, fr * .5));
    const { mid } = angleArc(ctx, cx, cy, ar, sAz, D.dir, C.fg);
    if (Math.abs(th) > 12) {
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
      ctx.fillText(`${Math.abs(Math.round(th))}°`, cx + Math.cos(mid) * (ar + 15), cy + Math.sin(mid) * (ar + 15) + 4);
    }
    drawFlowers(ctx, cx + fx * fr, cy + fy * fr, narrow ? .9 : 1);
    drawHive(ctx, cx, cy - 4, .8);
    if (D.unlocked && !D.drag) {
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
      ctx.fillText('Wiese ziehen', P1.x + P1.w - 14, P1.y + 22);
    }

    /* Wabe */
    ctx.save();
    ctx.beginPath(); ctx.rect(P2.x, P2.y, P2.w, P2.h); ctx.clip();
    const s = 13, hw = Math.sqrt(3) * s;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let row = -1, y = P2.y; y < P2.y + P2.h + s; row++, y += 1.5 * s) {
      for (let x = P2.x + (row % 2 ? hw / 2 : 0); x < P2.x + P2.w + hw; x += hw) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = TAU * k / 6 + Math.PI / 6; k ? ctx.lineTo(x + s * Math.cos(a), y + s * Math.sin(a)) : ctx.moveTo(x + s * Math.cos(a), y + s * Math.sin(a)); }
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'left';
    const tagW = ctx.measureText('WABE, SENKRECHT').width + 12;
    ctx.fillStyle = C.surface; ctx.fillRect(P2.x + 10, P2.y + 10, tagW, 18);
    ctx.fillStyle = C.muted; ctx.fillText('WABE, SENKRECHT', P2.x + 16, P2.y + 22);

    const dx = P2.x + P2.w / 2, dy = P2.y + P2.h / 2 + 12;
    const L = clamp(30 + D.dist / 4000 * (Math.min(P2.w, P2.h) * .42 - 30), 30, Math.min(P2.w, P2.h) * .42);
    const [ux, uy] = vec(th);
    const A = [dx - ux * L / 2, dy - uy * L / 2], B = [dx + ux * L / 2, dy + uy * L / 2];
    // Senkrechte «oben»
    ctx.strokeStyle = SUN; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, dy - L / 2 - 46); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = SUN; ctx.beginPath(); ctx.moveTo(dx, dy - L / 2 - 56); ctx.lineTo(dx - 5, dy - L / 2 - 46); ctx.lineTo(dx + 5, dy - L / 2 - 46); ctx.fill();
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
    const upLbl = narrow ? 'oben = Sonne' : 'oben = Richtung Sonne';
    const upW = ctx.measureText(upLbl).width + 10;
    ctx.fillStyle = C.surface; ctx.fillRect(dx - upW / 2, dy - L / 2 - 75, upW, 16);
    ctx.fillStyle = C.fg; ctx.fillText(upLbl, dx, dy - L / 2 - 63);
    // Weg der Tänzerin
    const rr = L / 2, phB = Math.atan2(uy, ux);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(dx, dy, rr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(B[0] + ux * 8, B[1] + uy * 8); ctx.lineTo(B[0] - uy * 5, B[1] + ux * 5); ctx.lineTo(B[0] + uy * 5, B[1] - ux * 5); ctx.fillStyle = C.accent; ctx.fill();
    // Winkel auf der Wabe
    const ar2 = Math.min(26, L * .45);
    const r2 = angleArc(ctx, dx, dy, ar2, 0, th, C.fg);
    if (Math.abs(th) > 12) {
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
      ctx.fillText(`${Math.abs(Math.round(th))}°`, dx + Math.cos(r2.mid) * (ar2 + 14), dy + Math.sin(r2.mid) * (ar2 + 14) + 4);
    }

    // Tänzerin bewegen
    const Tw = Math.max(.35, D.dist / 1000), Tr = 1.1;
    let bx, by, hx, hy, buzz = 0, wag = false;
    if (reduced) {
      bx = dx; by = dy; hx = ux; hy = uy;
    } else {
      D.t += dt;
      if (D.phase === 0 && D.t >= Tw) { D.phase = 1; D.t = 0; }
      else if (D.phase === 1 && D.t >= Tr) { D.phase = 0; D.t = 0; D.side *= -1; }
      if (D.phase === 0) {
        const k = D.t / Tw;
        const off = Math.sin(D.t * TAU * 7) * 4;
        bx = A[0] + (B[0] - A[0]) * k - uy * off; by = A[1] + (B[1] - A[1]) * k + ux * off;
        hx = ux + Math.cos(D.t * TAU * 7) * .25 * -uy; hy = uy + Math.cos(D.t * TAU * 7) * .25 * ux;
        buzz = D.t * 60; wag = true;
      } else {
        const k = (1 - Math.cos(Math.PI * D.t / Tr)) / 2;
        const ph = phB + D.side * Math.PI * k;
        bx = dx + Math.cos(ph) * rr; by = dy + Math.sin(ph) * rr;
        hx = -Math.sin(ph) * D.side; hy = Math.cos(ph) * D.side;
      }
    }
    // Zuschauerinnen
    for (const [k, side] of [[0, 1], [0, -1], [.3, 1], [.3, -1]]) {
      const px = dx - ux * L * (k + .75) + -uy * side * 16, py = dy - uy * L * (k + .75) + ux * side * 16;
      drawBee(ctx, px, py, ux, uy, .85);
    }
    drawBee(ctx, bx, by, hx, hy, 1.15, BEE, buzz);
    if (wag) {
      // Vibrationsstriche hinter dem Hinterleib
      const back = Math.atan2(-hy, -hx);
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
      for (const rad of [15, 20]) { ctx.beginPath(); ctx.arc(bx, by, rad, back - .45, back + .45); ctx.stroke(); }
    }
    // Stoppuhr
    ctx.textAlign = 'center'; ctx.font = `500 12px ${MONO}`; ctx.fillStyle = C.fg;
    const tLbl = reduced ? `Schwänzellauf ${fmt(D.dist / 1000, 1)} s`
      : wag ? `Schwänzeln: ${fmt(Math.min(D.t, D.dist / 1000), 1)} s` : `Rückweg ${D.side > 0 ? 'rechts' : 'links'} herum`;
    ctx.fillText(tLbl, dx, P2.y + P2.h - 16);
  };

  /* ---------- Teil 2: Sechsecke ---------- */
  const hexCv = $('#hexCv');
  const SH = {
    circle: { name: 'Kreis', per: 2 * Math.sqrt(Math.PI), shared: false, gap: 1 - Math.PI / (2 * Math.sqrt(3)) },
    tri: { name: 'Dreieck', per: 3 * Math.sqrt(4 / Math.sqrt(3)), shared: true, gap: 0 },
    square: { name: 'Quadrat', per: 4, shared: true, gap: 0 },
    hex: { name: 'Sechseck', per: Math.sqrt(8 * Math.sqrt(3)), shared: true, gap: 0 },
  };
  const waxOf = k => SH[k].per / (SH[k].shared ? 2 : 1);
  const H = { shape: 'hex', fill: 0, filling: false };
  const hexMsg = {
    circle: 'Ein Kreis hat den kürzesten Umfang. Aber die Zellen teilen sich keine Wand, und dazwischen bleiben Lücken.',
    tri: 'Dreiecke passen lückenlos, brauchen aber am meisten Wand pro Zelle.',
    square: 'Quadrate passen lückenlos. Pro Zelle brauchen sie etwas mehr Wand als Sechsecke.',
    hex: 'Sechsecke passen lückenlos und brauchen von allen lückenlosen Formen am wenigsten Wand.',
  };
  const updHex = () => {
    const k = H.shape;
    $$('#shapeSel button').forEach(b => b.classList.toggle('active', b.dataset.s === k));
    $('#hWax').textContent = `${fmt(waxOf(k) / waxOf('hex') * 100, 0)} %`;
    $('#hGap').textContent = SH[k].gap ? `${fmt(SH[k].gap * 100, 1)} %` : 'keine';
    $('#hPer').textContent = `${fmt(SH[k].per / SH.circle.per * 100, 0)} %`;
  };
  $$('#shapeSel button').forEach(b => b.addEventListener('click', () => {
    H.shape = b.dataset.s; H.fill = 0; H.filling = false; updHex(); $('#hexStatus').textContent = hexMsg[H.shape];
  }));
  $('#honeyBtn').addEventListener('click', () => {
    H.filling = true; H.fill = reduced ? 1 : 0;
    $('#hexStatus').textContent = SH[H.shape].gap ? 'Die Zellen füllen sich. In die Lücken dazwischen passt kein Honig.' : 'Die Zellen füllen sich, und kein Platz geht verloren.';
  });
  updHex();

  const cells = (k, w, h, A) => {
    const out = [];
    if (k === 'hex') {
      const s = Math.sqrt(2 * A / (3 * Math.sqrt(3))), dx = 1.5 * s, dy = Math.sqrt(3) * s;
      for (let i = -1; i * dx < w + s; i++) for (let j = -1; j * dy < h + dy; j++) {
        const x = i * dx, y = j * dy + (i % 2 ? dy / 2 : 0);
        out.push({ x, y, pts: [...Array(6)].map((_, q) => [x + s * Math.cos(q * TAU / 6), y + s * Math.sin(q * TAU / 6)]) });
      }
    } else if (k === 'square') {
      const a = Math.sqrt(A);
      for (let x = -a / 2; x < w + a; x += a) for (let y = -a / 2; y < h + a; y += a)
        out.push({ x: x + a / 2, y: y + a / 2, pts: [[x, y], [x + a, y], [x + a, y + a], [x, y + a]] });
    } else if (k === 'tri') {
      const a = Math.sqrt(4 * A / Math.sqrt(3)), th = Math.sqrt(3) / 2 * a;
      for (let r = -1; r * th < h + th; r++) for (let i = -2; i * a / 2 < w + a; i++) {
        const x = i * a / 2, y = r * th;
        const up = ((i + r) % 2 + 2) % 2 === 0;
        const pts = up ? [[x, y + th], [x + a / 2, y], [x + a, y + th]] : [[x, y], [x + a, y], [x + a / 2, y + th]];
        out.push({ x: x + a / 2, y: y + th * (up ? 2 / 3 : 1 / 3), pts });
      }
    } else {
      const r = Math.sqrt(A / Math.PI), dy = Math.sqrt(3) * r;
      for (let j = -1; j * dy < h + dy; j++) for (let x = (j % 2 ? r : 0); x < w + 2 * r; x += 2 * r)
        out.push({ x, y: j * dy, r });
    }
    return out;
  };
  const cellPath = (ctx, c) => {
    ctx.beginPath();
    if (c.r) { ctx.arc(c.x, c.y, c.r, 0, TAU); return; }
    c.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  };

  const drawHex = dt => {
    const { ctx, w, h } = fit(hexCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    if (H.filling && !reduced) H.fill = Math.min(1, H.fill + dt * .5);
    const A = narrow ? 1300 : 1750;
    const k = H.shape, list = cells(k, w, h, A);
    // Lücken
    if (k === 'circle') {
      ctx.fillStyle = C.bad; ctx.globalAlpha = .28; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    }
    const cx0 = w / 2, cy0 = h / 2;
    let best = null, bd = Infinity;
    for (const c of list) {
      const d = Math.hypot(c.x - cx0, c.y - cy0);
      if (d < bd) { bd = d; best = c; }
      cellPath(ctx, c);
      ctx.fillStyle = C.surface; ctx.fill();
      if (H.fill > 0) {
        const delay = ((c.x * 7 + c.y * 13) % 97) / 97 * .5;
        const f = clamp((H.fill - delay) / .5, 0, 1);
        if (f > 0) {
          ctx.save(); cellPath(ctx, c); ctx.clip();
          ctx.fillStyle = HONEY; ctx.globalAlpha = .75;
          const top = c.y + (c.r || Math.sqrt(A)) * (1 - 2 * f);
          ctx.fillRect(c.x - 60, top, 120, 120);
          ctx.restore();
        }
      }
      cellPath(ctx, c); ctx.strokeStyle = WAX; ctx.lineWidth = k === 'circle' ? 3 : 2.5; ctx.stroke();
    }
    if (best) { cellPath(ctx, best); ctx.strokeStyle = C.accent; ctx.lineWidth = 3.5; ctx.stroke(); }
    // Beschriftung
    const lbl = narrow ? `${SH[k].name}: gleiche Fläche` : `${SH[k].name} · jede Zelle hat gleich viel Fläche`;
    ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'left';
    const tw = ctx.measureText(lbl).width;
    ctx.fillStyle = C.surface; roundRect(ctx, 10, 10, tw + 16, 24, 8); ctx.fill();
    ctx.fillStyle = C.fg; ctx.fillText(lbl, 18, 26);
    if (k === 'circle') {
      const l2 = narrow ? 'rot = Lücken' : 'rot = Lücken, ungenutzter Platz';
      const t2 = ctx.measureText(l2).width;
      ctx.fillStyle = C.surface; roundRect(ctx, 10, 38, t2 + 16, 24, 8); ctx.fill();
      ctx.fillStyle = C.bad; ctx.fillText(l2, 18, 54);
    }
  };

  /* ---------- Teil 3: Obstgarten ---------- */
  const orchCv = $('#orchCv');
  const SEASON = 10, HARVEST = 3, NFLOW = 60, BASE = .05, K = .1, NWILD = 10;
  const O = { nh: 12, cold: false, wild: false, t: 0, flowers: [], bees: [], layout: null, unlocked: false };
  // Blüten pro Baum, feste Lage auf der Krone (Einheitskreis)
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const SPOTS = [];
  for (let t = 0; t < 6; t++) for (let i = 0; i < 10; i++) {
    const a = rnd() * TAU, r = Math.sqrt(.12 + rnd() * .78);
    SPOTS.push({ tree: t, u: Math.cos(a) * r, v: Math.sin(a) * r * .85, hash: rnd() });
  }
  const effH = () => O.cold ? .25 : 1, effW = () => O.cold ? .8 : 1;
  const visitsPer = () => K * (O.nh * effH() + (O.wild ? NWILD * effW() : 0));
  const pModel = () => 1 - (1 - BASE) * Math.exp(-visitsPer());
  const newSeason = () => {
    O.t = 0;
    O.flowers = SPOTS.map(s => ({ ...s, pol: reduced ? s.hash < pModel() : s.hash < BASE, glow: 0 }));
  };
  const updOrch = () => {
    $('#beeIn').value = O.nh; $('#beeOut').textContent = String(O.nh);
    $('#oPct').textContent = `${fmt(pModel() * 100, 0)} %`;
    $('#oVis').textContent = fmt(visitsPer(), 1);
    $('#coldBtn').textContent = O.cold ? 'Warmes Wetter' : 'Kühles Wetter';
    $('#wildBtn').textContent = O.wild ? 'Ohne Wildbienen' : 'Wildbienen dazu';
    if (reduced) newSeason();
  };
  const orchMsg = () => {
    const p = pModel();
    if (O.nh === 0 && !O.wild) return 'Ohne Bestäuber werden nur ganz wenige Blüten zufällig bestäubt. Fast keine Äpfel.';
    if (O.cold && !O.wild) return 'Bei kühlem Wetter fliegen nur wenige Honigbienen aus. Viele Blüten bleiben unbestäubt.';
    if (O.cold && O.wild) return 'Die Wildbienen fliegen auch bei kühlem Wetter. Sie retten einen Teil der Ernte.';
    if (p > .9) return 'Fast jede Blüte bekommt Besuch. Mehr Bienen bringen jetzt kaum noch mehr Äpfel.';
    return 'Jede Biene besucht zufällige Blüten. Manche bekommen mehrmals Besuch, andere gar keinen.';
  };
  $('#beeIn').addEventListener('input', e => { O.nh = +e.target.value; updOrch(); $('#orchStatus').textContent = orchMsg(); });
  $('#coldBtn').addEventListener('click', () => { O.cold = !O.cold; updOrch(); $('#orchStatus').textContent = orchMsg(); });
  $('#wildBtn').addEventListener('click', () => { O.wild = !O.wild; updOrch(); $('#orchStatus').textContent = orchMsg(); });
  newSeason(); updOrch();

  const flowerPos = (f, L) => {
    const tr = L.trees[f.tree];
    return [tr.x + f.u * tr.r, tr.y + f.v * tr.r];
  };
  const syncBees = L => {
    const nh = Math.round(O.nh * effH()), nw = O.wild ? Math.round(NWILD * effW()) : 0;
    // vorhandene Bienen behalten, fehlende am Stock starten
    const keepH = O.bees.filter(b => b.kind === 'h').slice(0, nh), keepW = O.bees.filter(b => b.kind === 'w').slice(0, nw);
    const bees = [...keepH, ...keepW];
    while (bees.filter(b => b.kind === 'h').length < nh) bees.push({ kind: 'h', x: L.hive[0], y: L.hive[1], from: [...L.hive], to: null, k: Math.random(), wob: Math.random() * TAU });
    while (bees.filter(b => b.kind === 'w').length < nw) bees.push({ kind: 'w', x: L.hive[0] + 40, y: L.hive[1] - 20, from: [L.hive[0] + 40, L.hive[1] - 20], to: null, k: Math.random(), wob: Math.random() * TAU });
    O.bees = bees;
  };

  const drawOrch = dt => {
    const { ctx, w, h } = fit(orchCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    // Anordnung: 3 × 2 Bäume, Stock unten links
    const top = 46, bottom = h - 30;
    const cols = 3, rows = 2;
    const cw = (w - 40) / cols, rh = (bottom - top) / rows;
    const r = Math.min(cw * .42, rh * .36);
    const trees = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
      trees.push({ x: 20 + cw * (i + .5) + (j ? cw * .12 : -cw * .06), y: top + rh * (j + .42), r });
    const L = { trees, hive: [w - 26, h - 26] };
    // Zeit
    const active = O.unlocked && !reduced;
    if (active) {
      O.t += dt;
      if (O.t > SEASON + HARVEST) newSeason();
    }
    const harvest = reduced || O.t > SEASON;
    // Boden
    ctx.fillStyle = C.sunk; ctx.fillRect(0, h - 22, w, 22);
    // Bäume
    for (const tr of trees) {
      ctx.fillStyle = TRUNK; ctx.fillRect(tr.x - 4, tr.y + tr.r * .5, 8, tr.r * .9);
      ctx.fillStyle = LEAF; ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(tr.x, tr.y, tr.r * 1.08, tr.r * .95, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Blüten
    const fs = narrow ? 3.4 : 4.2;
    for (const f of O.flowers) {
      const [x, y] = flowerPos(f, L);
      if (harvest) {
        if (f.pol) {
          ctx.fillStyle = APPLE; ctx.beginPath(); ctx.arc(x, y, fs * 1.25, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - fs * .4, y - fs * .4, fs * .35, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = C.muted; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(x, y, fs * .55, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        }
        continue;
      }
      ctx.fillStyle = PETAL;
      for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.arc(x + Math.cos(q * TAU / 5) * fs * .8, y + Math.sin(q * TAU / 5) * fs * .8, fs * .65, 0, TAU); ctx.fill(); }
      ctx.fillStyle = f.pol ? SUN : '#fff8e8'; ctx.beginPath(); ctx.arc(x, y, fs * .5, 0, TAU); ctx.fill();
      if (f.pol) { ctx.strokeStyle = SUN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, fs * 1.75, 0, TAU); ctx.stroke(); }
      if (f.glow > 0) { f.glow -= dt; ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, fs * 2 + 6 * (1 - f.glow), 0, TAU); ctx.stroke(); }
    }
    // Stock
    drawHive(ctx, L.hive[0], L.hive[1] - 6, 1);
    // Bienen
    if (active && !harvest) {
      syncBees(L);
      const flight = SEASON / (K * NFLOW); // Sekunden pro Blütenbesuch, damit Besuche = Modell
      for (const b of O.bees) {
        if (!b.to) { b.target = Math.floor(Math.random() * NFLOW); b.to = flowerPos(O.flowers[b.target], L); b.k = b.k % 1; }
        b.k += dt / flight;
        if (b.k >= 1) {
          const f = O.flowers[b.target];
          if (!f.pol) { f.pol = true; f.glow = .6; }
          b.from = b.to; b.to = null; b.k = 0;
          continue;
        }
        const e = b.k, wob = Math.sin(e * Math.PI) * 18;
        const fx = b.from[0] + (b.to[0] - b.from[0]) * e, fy = b.from[1] + (b.to[1] - b.from[1]) * e;
        const vx = b.to[0] - b.from[0], vy = b.to[1] - b.from[1], vl = Math.hypot(vx, vy) || 1;
        b.x = fx - vy / vl * wob * Math.sin(b.wob); b.y = fy + vx / vl * wob * Math.sin(b.wob);
        drawBee(ctx, b.x, b.y, vx, vy, narrow ? .55 : .65, b.kind === 'w' ? WILD : BEE, O.t * 50);
      }
    }
    // Anzeige oben
    const n = O.flowers.filter(f => f.pol).length;
    $('#oApp').textContent = harvest ? String(n) : `(${n})`;
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    const lbl = harvest ? (narrow ? 'ERNTE' : 'ERNTE: rot = Apfel, grau = abgefallen') : (narrow ? 'BLÜTEZEIT' : 'BLÜTEZEIT: gelber Ring = bestäubt');
    ctx.fillText(lbl, 16, 22);
    const bw = narrow ? 80 : 140, bx = w - bw - 16;
    ctx.fillStyle = C.sunk; roundRect(ctx, bx, 14, bw, 8, 4); ctx.fill();
    ctx.fillStyle = harvest ? APPLE : C.accent;
    roundRect(ctx, bx, 14, bw * (reduced ? 1 : clamp(O.t / SEASON, 0, 1)), 8, 4); ctx.fill();
    if (O.cold) { ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('kühl', bx - 8, 22); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('bienen', 4, {
    danceLock: () => { D.unlocked = true; ['#dirIn', '#distIn', '#timeIn', '#sunBtn', '#toSunBtn'].forEach(s => $(s).disabled = false); danceCv.style.cursor = 'pointer'; },
    hexLock: () => { $$('#shapeSel button').forEach(b => b.disabled = false); $('#honeyBtn').disabled = false; },
    orchLock: () => { O.unlocked = true; ['#beeIn', '#coldBtn', '#wildBtn'].forEach(s => $(s).disabled = false); newSeason(); },
  });

  loop(dt => { drawDance(dt); drawHex(dt); drawOrch(dt); });
})();
