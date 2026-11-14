/* mindblow – Lektion Knochen & Muskeln */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const MONO = 'Geist Mono, monospace';

  // Knochen als Linie mit Rand zeichnen
  const bone = (ctx, x1, y1, x2, y2, wd) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.muted; ctx.lineWidth = wd + 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = C.surface; ctx.lineWidth = wd;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  // Pfeil von (x1,y1) nach (x2,y2)
  const arrow = (ctx, x1, y1, x2, y2, col, lw = 3) => {
    const a = Math.atan2(y2 - y1, x2 - x1), hl = 9;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * .6, y2 - Math.sin(a) * hl * .6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - .45) * hl, y2 - Math.sin(a - .45) * hl);
    ctx.lineTo(x2 - Math.cos(a + .45) * hl, y2 - Math.sin(a + .45) * hl);
    ctx.closePath(); ctx.fill();
  };
  // Muskelbauch: Linse von O nach T, nach aussen (Normale n) gewölbt, Dicke t; danach Sehne bis I
  const muscle = (ctx, O, I, n, t, active) => {
    const T = { x: O.x + (I.x - O.x) * .78, y: O.y + (I.y - O.y) * .78 };
    const M = { x: (O.x + T.x) / 2, y: (O.y + T.y) / 2 };
    ctx.beginPath(); ctx.moveTo(O.x, O.y);
    ctx.quadraticCurveTo(M.x + n.x * t * 2, M.y + n.y * t * 2, T.x, T.y);
    ctx.quadraticCurveTo(M.x - n.x * t * .25, M.y - n.y * t * .25, O.x, O.y);
    ctx.closePath();
    ctx.globalAlpha = .3 + .65 * active; ctx.fillStyle = C.bad; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = C.bad; ctx.lineWidth = 1.2; ctx.stroke();
    // Sehne
    ctx.strokeStyle = C.fg; ctx.globalAlpha = .55; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(I.x, I.y); ctx.stroke();
    ctx.globalAlpha = 1;
    return { M, T };
  };
  const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };

  /* ---------- Teil 1: Bizeps und Trizeps ---------- */
  const armCv = $('#armCv');
  const ARM = { target: 120, ang: 120, dir: 0, hold: 0, bi: 0, tri: 0 };
  const setArm = (v, fromUser) => {
    const prev = ARM.target;
    ARM.target = clamp(v, 40, 180);
    $('#angIn').value = ARM.target; $('#angOut').textContent = `${Math.round(ARM.target)}°`;
    if (ARM.target !== prev) { ARM.dir = Math.sign(ARM.target - prev); ARM.hold = .9; }
    if (reduced) ARM.ang = ARM.target;
  };
  $('#angIn').addEventListener('input', e => setArm(+e.target.value, true));
  $('#armFlex').addEventListener('click', () => setArm(40));
  $('#armExt').addEventListener('click', () => setArm(180));

  let armTxt = '';
  const updArmReadout = () => {
    const d = ARM.dir;
    const bi = d < 0 ? 'zieht' : d > 0 ? 'gibt nach' : 'hält';
    const tri = d > 0 ? 'zieht' : d < 0 ? 'gibt nach' : 'hält';
    $('#armAng').textContent = `${Math.round(ARM.ang)}°`;
    const key = bi + tri;
    if (key !== armTxt) {
      armTxt = key;
      $('#armBi').textContent = bi; $('#armTri').textContent = tri;
      $('#armStatus').textContent = d < 0 ? 'Beugen: Der Bizeps verkürzt sich und zieht den Unterarm hoch. Der Trizeps wird gedehnt.'
        : d > 0 ? 'Strecken: Jetzt zieht der Trizeps am Ellbogenhöcker. Der Bizeps gibt nach.'
        : 'Halten: Beide Muskeln haben eine leichte Grundspannung und halten den Arm ruhig.';
    }
  };

  const drawArm = dt => {
    // Bewegung zum Zielwinkel, höchstens 140° pro Sekunde
    const diff = ARM.target - ARM.ang;
    if (!reduced) ARM.ang += Math.sign(diff) * Math.min(Math.abs(diff), 140 * dt);
    const moving = Math.abs(ARM.target - ARM.ang) > .3;
    if (!moving) { ARM.hold -= dt; if (ARM.hold <= 0) ARM.dir = 0; }
    else ARM.dir = Math.sign(ARM.target - ARM.ang);
    const k = Math.min(1, dt * 8);
    ARM.bi += ((ARM.dir < 0 ? 1 : .12) - ARM.bi) * (reduced ? 1 : k);
    ARM.tri += ((ARM.dir > 0 ? 1 : .12) - ARM.tri) * (reduced ? 1 : k);
    updArmReadout();

    const { ctx, w, h } = fit(armCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const Lu = Math.min((w - 56) * .52, 210), Lf = Math.min(Lu * .92, h * .55);
    const S = { x: 28, y: h * .68 }, E = { x: S.x + Lu, y: S.y };
    const phi = (180 - ARM.ang) * DEG;
    const f = { x: Math.cos(phi), y: -Math.sin(phi) };      // Richtung Unterarm
    const post = { x: Math.sin(phi), y: Math.cos(phi) };    // Rückseite des Unterarms
    const W = { x: E.x + f.x * Lf, y: E.y + f.y * Lf };

    // Schulter (vereinfacht)
    ctx.beginPath(); ctx.arc(S.x, S.y, 15, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

    // Muskeln (hinter den Knochen beginnen)
    const Ob = { x: S.x + 16, y: S.y - 9 }, Ib = { x: E.x + f.x * Lf * .14 - post.x * 4, y: E.y + f.y * Lf * .14 - post.y * 4 };
    const Ot = { x: S.x + 16, y: S.y + 9 }, Ol = { x: E.x - f.x * 9 + post.x * 8, y: E.y - f.y * 9 + post.y * 8 };
    const relLen = (O, I, L0) => Math.hypot(I.x - O.x, I.y - O.y) / L0;
    const lb = relLen(Ob, Ib, Lu * 1.05), lt = relLen(Ot, Ol, Lu * .98);
    const ub = unit(Ib.x - Ob.x, Ib.y - Ob.y), ut = unit(Ol.x - Ot.x, Ol.y - Ot.y);
    let nb = { x: ub.y, y: -ub.x }; if (nb.y > 0) nb = { x: -nb.x, y: -nb.y };
    let nt = { x: -ut.y, y: ut.x }; if (nt.y < 0) nt = { x: -nt.x, y: -nt.y };
    const tb = clamp(11 / Math.sqrt(lb), 8, 22) * (1 + .15 * ARM.bi);
    const tt = clamp(11 / Math.sqrt(lt), 8, 20) * (1 + .15 * ARM.tri);

    bone(ctx, S.x, S.y, E.x, E.y, 12);                      // Oberarmknochen
    bone(ctx, E.x - f.x * 10 + post.x * 7, E.y - f.y * 10 + post.y * 7, W.x, W.y, 10);   // Elle mit Ellbogenhöcker
    // Hand
    ctx.beginPath(); ctx.ellipse(W.x + f.x * 14, W.y + f.y * 14, 15, 10, Math.atan2(f.y, f.x), 0, TAU);
    ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();

    const mb = muscle(ctx, Ob, Ib, nb, tb, ARM.bi);
    const mt = muscle(ctx, Ot, Ol, nt, tt, ARM.tri);

    // Gelenk
    ctx.beginPath(); ctx.arc(E.x, E.y, 8, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();

    // Zug-Pfeile am aktiven Muskel
    const pull = (m, O, I, a) => {
      if (a < .5) return;
      const u = unit(O.x - I.x, O.y - I.y), px = (m.T.x + I.x) / 2, py = (m.T.y + I.y) / 2;
      arrow(ctx, px - u.x * 8, py - u.y * 8, px + u.x * 14, py + u.y * 14, C.bad, 2.5);
    };
    pull(mb, Ob, Ib, ARM.bi); pull(mt, Ot, Ol, ARM.tri);

    // Beschriftung
    ctx.font = `${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillStyle = C.fg;
    ctx.fillText('Bizeps', mb.M.x + nb.x * (tb + 14), mb.M.y + nb.y * (tb + 14));
    ctx.fillText('Trizeps', mt.M.x + nt.x * (tt + 16), mt.M.y + nt.y * (tt + 16) + 4);
    ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Ellbogen' : 'Ellbogengelenk', E.x, E.y + 30 + (ARM.ang > 150 ? 6 : 0));
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Schulter' : 'Schulter (vereinfacht)', 8, S.y + 34);
    const uf = { x: E.x + f.x * Lf * .62 - post.x * 18, y: E.y + f.y * Lf * .62 - post.y * 18 };
    ctx.textAlign = 'center';
    if (ARM.ang > 70) ctx.fillText('Unterarm', uf.x, uf.y);
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'Seitenansicht, vereinfacht' : 'Seitenansicht, vereinfacht · aktiver Muskel kräftig gefärbt', 12, 18, w - 24);
  };

  /* ---------- Teil 2: Der Unterarm als Hebel ---------- */
  const levCv = $('#levCv');
  const HAND = 35, G = 9.81;
  const LEV = { kg: 5, ins: 4.5, move: false, t: 0 };
  const updLev = () => {
    const F = LEV.kg * HAND / LEV.ins;
    $('#kgOut').textContent = `${fmt(LEV.kg, 1)} kg`;
    $('#insOut').textContent = `${fmt(LEV.ins, 1)} cm`;
    $('#levKg').textContent = `≈ ${fmt(F, 0)} kg`;
    $('#levN').textContent = `${fmt(F * G, 0)} N`;
    $('#levRatio').textContent = `${fmt(HAND / LEV.ins, 1)} cm`;
  };
  $('#kgIn').addEventListener('input', e => { LEV.kg = +e.target.value; updLev(); });
  $('#insIn').addEventListener('input', e => {
    LEV.ins = +e.target.value; updLev();
    $('#levStatus').textContent = LEV.ins > 7
      ? 'Weiter vorne braucht der Muskel weniger Kraft. Dafür bewegt sich die Hand pro Zentimeter Muskelweg weniger weit. Kraft gegen Weg.'
      : 'Nah am Gelenk: viel Kraft nötig, aber die Hand bewegt sich weit und schnell.';
  });
  $('#levMove').addEventListener('click', () => {
    LEV.move = !LEV.move; LEV.t = 0;
    $('#levMove').textContent = LEV.move ? 'Bewegung stoppen' : 'Bewegung zeigen';
  });
  updLev();

  const drawLev = dt => {
    const { ctx, w, h } = fit(levCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const E = { x: narrow ? 30 : 46, y: h * .6 };
    const s = (w - E.x - 44) / HAND;                       // Pixel pro Zentimeter
    let rot = 0;
    if (LEV.move) {
      LEV.t += dt;
      rot = reduced ? 22 * DEG : (1 - Math.cos(LEV.t * 2)) / 2 * 22 * DEG;
    }
    const f = { x: Math.cos(rot), y: -Math.sin(rot) };
    const P = (cm) => ({ x: E.x + f.x * cm * s, y: E.y + f.y * cm * s });
    const I = P(LEV.ins), Hd = P(HAND);
    const shY = 22;
    const F = LEV.kg * HAND / LEV.ins;

    // Bahnen der Punkte, wenn sich der Arm bewegt
    if (LEV.move) {
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      for (const [r, col] of [[LEV.ins, C.bad], [HAND, C.accent]]) {
        ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(E.x, E.y, r * s, -22 * DEG, 0); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // Oberarm senkrecht
    bone(ctx, E.x, shY, E.x, E.y, 12);
    // Unterarm
    bone(ctx, E.x, E.y, Hd.x, Hd.y, 10);
    // Bizeps vom Ansatz zur Schulter (Zug vereinfacht senkrecht)
    const Ob = { x: E.x + 7, y: shY + 8 };
    const ub = unit(I.x - Ob.x, I.y - Ob.y);
    muscle(ctx, Ob, I, { x: ub.y, y: -ub.x }, 9, 1);
    // Gelenk
    ctx.beginPath(); ctx.arc(E.x, E.y, 8, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    // Gewicht in der Hand
    if (LEV.kg > 0) {
      const bw = 12 + LEV.kg * 2.2, bh = 10 + LEV.kg * 1.2;
      roundRect(ctx, Hd.x - bw / 2, Hd.y + 6, bw, bh, 4); ctx.fillStyle = C.fg; ctx.globalAlpha = .75; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Hd.x, Hd.y); ctx.lineTo(Hd.x, Hd.y + 6); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(Hd.x, Hd.y, 7, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.font = `${narrow ? 11 : 12}px ${MONO}`;
    if (!LEV.move) {
      // Kraftpfeile im selben Massstab
      const k = Math.min(3, (E.y - shY - 30) / Math.max(F, 1));
      if (LEV.kg > 0) {
        const bh = 10 + LEV.kg * 1.2, y0 = Hd.y + 10 + bh;
        arrow(ctx, Hd.x - 22, Hd.y + 6, Hd.x - 22, Hd.y + 6 + Math.max(10, LEV.kg * k), C.accent);
        ctx.fillStyle = C.accent; ctx.textAlign = 'right';
        ctx.fillText(`${fmt(LEV.kg, 1)} kg`, Hd.x - 30, Hd.y + 18);
        void y0;
      }
      if (F > 0) {
        const x = I.x + 16;
        arrow(ctx, x, E.y - 6, x, E.y - 6 - Math.max(10, F * k), C.bad);
        ctx.fillStyle = C.bad; ctx.textAlign = 'left';
        ctx.fillText(narrow ? `≈ ${fmt(F, 0)} kg` : `Muskel ≈ ${fmt(F, 0)} kg`, x + 8, E.y - 6 - Math.max(10, F * k) + 12);
      }
    } else {
      ctx.textAlign = 'left'; ctx.fillStyle = C.bad;
      ctx.fillText(narrow ? 'Ansatz: kurzer Weg' : 'Ansatz: kurzer Weg', I.x + 12, I.y + 26);
      ctx.fillStyle = C.accent; ctx.textAlign = 'right';
      ctx.fillText(narrow ? `Hand: ${fmt(HAND / LEV.ins, 1)}× so weit` : `Hand: ${fmt(HAND / LEV.ins, 1)}× so weit und schnell`, w - 10, E.y + 30);
    }
    // Massstab unter dem Arm
    const ry = E.y + (LEV.move ? 54 : 46) + (LEV.kg > 0 && !LEV.move ? 14 : 0);
    const ryy = Math.min(ry, h - 22);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(E.x, ryy); ctx.lineTo(E.x + HAND * s, ryy); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.textAlign = 'center';
    for (const [cm, lab] of [[0, '0'], [LEV.ins, `${fmt(LEV.ins, 1)}`], [HAND, '35 cm']]) {
      const x = E.x + cm * s;
      ctx.beginPath(); ctx.moveTo(x, ryy - 4); ctx.lineTo(x, ryy + 4); ctx.strokeStyle = C.muted; ctx.stroke();
      if (cm === 0) continue;
      ctx.fillText(lab, cm === HAND ? Math.min(x, w - 24) : x, ryy + 16);
    }
    ctx.textAlign = 'left';
    ctx.fillText('Drehpunkt', Math.max(4, E.x - 26), ryy + 16);
    ctx.fillText(narrow ? 'Unterarm als Hebel, vereinfacht' : 'Unterarm als Hebel · Gewicht des Unterarms weggelassen', 12, h - 6 > ryy + 30 ? h - 6 : 14, w - 24);
  };

  /* ---------- Teil 3: Rohr gegen vollen Stab ---------- */
  const boneCv = $('#boneCv');
  // Modell: gerader Stab aus Knochenmaterial, 40 cm, an beiden Enden aufgelegt, Last in der Mitte
  const E_MOD = 17e9, LEN = 0.4, R0 = 0.01, SIG_MAX = 180e6;
  const I0 = Math.PI * R0 ** 4 / 4;
  const BN = { kg: 60, dia: 3, shown: 60 };
  const calc = () => {
    const F = BN.kg * G, R = BN.dia / 200, ri2 = R * R - R0 * R0;
    const It = I0 * (R * R + ri2) / (R0 * R0);
    const M = F * LEN / 4;
    return {
      dS: F * LEN ** 3 / (48 * E_MOD * I0) * 1000, dT: F * LEN ** 3 / (48 * E_MOD * It) * 1000,
      sS: M * R0 / I0, sT: M * R / It, ratio: It / I0, ri: Math.sqrt(Math.max(0, ri2)), R,
    };
  };
  const updBone = () => {
    const c = calc();
    $('#loadOut').textContent = `${fmt(BN.kg, 0)} kg`;
    $('#diaOut').textContent = `${fmt(BN.dia, 1)} cm`;
    $('#bSolid').textContent = c.sS > SIG_MAX ? 'gebrochen' : `${fmt(c.dS, 1)} mm`;
    $('#bTube').textContent = c.sT > SIG_MAX ? 'gebrochen' : `${fmt(c.dT, 1)} mm`;
    $('#bRatio').textContent = `${fmt(c.ratio, 1)}×`;
    const wall = (c.R - c.ri) * 1000;
    let st;
    if (c.sS > SIG_MAX) st = 'Der volle Stab ist gebrochen. Das gleich schwere Rohr hält. Im Modell bricht Knochenmaterial bei etwa 180 Megapascal, vereinfacht.';
    else if (BN.dia >= 3.6) st = `Wand nur noch ${fmt(wall, 1)} mm dick. Sehr dünne Röhren knicken seitlich ein. Darum sind Knochen nicht beliebig dünnwandig.`;
    else if (BN.dia <= 2.05) st = 'Gleicher Durchmesser, kein Loch: Beide Stäbe sind gleich. Mach das Rohr dicker.';
    else st = 'Beide Stäbe bestehen aus gleich viel Knochenmaterial. Das Rohr hat das Material nur weiter aussen.';
    $('#boneStatus').textContent = st;
  };
  $('#loadIn').addEventListener('input', e => { BN.kg = +e.target.value; updBone(); });
  $('#diaIn').addEventListener('input', e => { BN.dia = +e.target.value; updBone(); });
  $('#boneReset').addEventListener('click', () => { BN.kg = 0; $('#loadIn').value = 0; updBone(); });
  updBone();

  const drawBone = dt => {
    BN.shown = reduced ? BN.kg : BN.shown + (BN.kg - BN.shown) * Math.min(1, dt * 10);
    const c = calc(), sc = BN.kg > 0 ? BN.shown / BN.kg : 0;
    const { ctx, w, h } = fit(boneCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const rowH = (h - 24) / 2, icon = narrow ? 44 : 60;
    const x0 = 16 + icon + 16, x1 = w - 18, span = x1 - x0;
    const pxPerMm = 2.2, pxPerCm = narrow ? 5 : 6;
    const rows = [
      { name: narrow ? 'Voller Stab' : 'Voller Stab · Ø 2,0 cm', R: R0, ri: 0, d: c.dS, sig: c.sS },
      { name: narrow ? `Rohr · Ø ${fmt(BN.dia, 1)} cm` : `Rohr · Ø ${fmt(BN.dia, 1)} cm · gleich schwer`, R: c.R, ri: c.ri, d: c.dT, sig: c.sT },
    ];
    rows.forEach((r, i) => {
      const top = 12 + i * rowH, cy = top + rowH * .5;
      const thick = r.R * 200 * pxPerCm;               // Durchmesser in Pixel
      const broken = r.sig > SIG_MAX;
      const fr = r.sig / SIG_MAX;
      const col = broken ? C.bad : fr < .5 ? C.good : fr < .85 ? C.glow : C.bad;
      // Querschnitt
      const icx = 16 + icon / 2, icy = cy, scale = icon / 2 / (0.02 + .001);
      ctx.beginPath(); ctx.arc(icx, icy, r.R * scale, 0, TAU); ctx.fillStyle = C.muted; ctx.fill();
      if (r.ri > 0) { ctx.beginPath(); ctx.arc(icx, icy, r.ri * scale, 0, TAU); ctx.fillStyle = C.surface; ctx.fill(); }
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('Querschnitt', icx, Math.min(top + rowH - 4, icy + icon / 2 + 14));
      // Name
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `${narrow ? 11 : 12}px ${MONO}`;
      ctx.fillText(r.name, x0, top + 12);
      // Auflager
      const by = cy;
      for (const x of [x0 + 6, x1 - 6]) {
        ctx.beginPath(); ctx.moveTo(x, by + thick / 2 + 1); ctx.lineTo(x - 7, by + thick / 2 + 13); ctx.lineTo(x + 7, by + thick / 2 + 13); ctx.closePath();
        ctx.fillStyle = C.muted; ctx.fill();
      }
      // Biegelinie bei Last in der Mitte: y = d · (3u − 4u³), u = x/L für die linke Hälfte
      const dpx = broken ? 0 : Math.min(r.d * pxPerMm * sc, rowH * .3);
      const yAt = u => { const v = u <= .5 ? u : 1 - u; return dpx * (3 * v - 4 * v ** 3); };
      const N = 40;
      const drawBeam = (ua, ub, off) => {
        ctx.beginPath();
        for (let k = 0; k <= N; k++) { const u = ua + (ub - ua) * k / N; const p = off(u); ctx.lineTo(x0 + u * span + p.dx, by + yAt(u) - thick / 2 + p.dy); }
        for (let k = N; k >= 0; k--) { const u = ua + (ub - ua) * k / N; const p = off(u); ctx.lineTo(x0 + u * span + p.dx, by + yAt(u) + thick / 2 + p.dy); }
        ctx.closePath();
        ctx.globalAlpha = .85; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
        if (r.ri > 0) {   // Andeutung des Hohlraums
          const ih = r.ri * 200 * pxPerCm;
          ctx.beginPath();
          for (let k = 0; k <= N; k++) { const u = ua + (ub - ua) * k / N; const p = off(u); ctx.lineTo(x0 + u * span + p.dx, by + yAt(u) - ih / 2 + p.dy); }
          for (let k = N; k >= 0; k--) { const u = ua + (ub - ua) * k / N; const p = off(u); ctx.lineTo(x0 + u * span + p.dx, by + yAt(u) + ih / 2 + p.dy); }
          ctx.closePath(); ctx.fillStyle = C.surface; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
        }
      };
      if (!broken) drawBeam(0, 1, () => ({ dx: 0, dy: 0 }));
      else {
        // zwei Hälften, in der Mitte abgeknickt
        const drop = rowH * .18;
        drawBeam(0, .49, u => ({ dx: 0, dy: drop * (u / .49) }));
        drawBeam(.51, 1, u => ({ dx: 0, dy: drop * ((1 - u) / .49) }));
        ctx.fillStyle = C.bad; ctx.font = `bold ${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'center';
        ctx.fillText('gebrochen', x0 + span / 2, by + drop + thick / 2 + 22);
      }
      // Last
      if (BN.kg > 0) {
        const lx = x0 + span / 2, ly = by + (broken ? rowH * .18 : dpx) - thick / 2 - 2;
        arrow(ctx, lx, ly - 30, lx, ly, C.fg, 2.5);
        ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
        ctx.fillText(`${fmt(BN.kg, 0)} kg`, lx + 8, ly - 20);
      }
      if (!broken && BN.kg > 0) {
        ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.textAlign = 'right';
        ctx.fillText(`${fmt(r.d, 1)} mm`, x1, top + 12);
      }
    });
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Biegung überhöht · Modell' : 'Biegung überhöht gezeichnet · Modell: Stab aus Knochenmaterial, 40 cm', 12, h - 6, w - 24);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('bewegung', 4, {
    armLock: () => { ['#angIn', '#armFlex', '#armExt'].forEach(s => $(s).disabled = false); },
    levLock: () => { ['#kgIn', '#insIn', '#levMove'].forEach(s => $(s).disabled = false); },
    boneLock: () => { ['#loadIn', '#diaIn', '#boneReset'].forEach(s => $(s).disabled = false); },
  });
  void $$;

  loop(dt => { drawArm(dt); drawLev(dt); drawBone(dt); });
})();
