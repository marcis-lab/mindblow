/* mindblow – Lektion Auge */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  /* Vereinfachtes Modellauge: Hornhaut und Linse sind eine dünne Linse, 17 mm vor der Netzhaut.
     Entspannt bricht sie mit 58,8 dpt. Die Brille sitzt 12 mm davor. Gerechnet wird achsennah (paraxial). */
  const P0 = 1000 / 17, PUP = 2, VTX = 12, LMAX = 18.5;

  // Vergenz am Auge in dpt: wie stark das Licht auseinanderläuft (negativ) oder zusammenläuft (positiv)
  const vergence = (g, glass) => {
    let V = isFinite(g) ? -1 / g : 0;
    if (glass) { V += glass; V = V / (1 - VTX / 1000 * V); }
    return V;
  };
  const needAcc = (g, glass, L) => 1000 / L - P0 - vergence(g, glass);
  const imgDist = (g, glass, A) => { const Pt = P0 + A + vergence(g, glass); return Pt > .01 ? 1000 / Pt : Infinity; };
  const spotOf = (g, glass, A, L) => 2 * PUP * Math.abs(1 - L / imgDist(g, glass, A)); // Unschärfekreis in mm
  const distTxt = g => g < 1 ? `${fmt(g * 100, 0)} cm` : `${fmt(g, g < 10 ? 1 : 0)} m`;
  const dptTxt = p => Math.abs(p) < .05 ? 'keine' : `${p > 0 ? '+' : '−'}${fmt(Math.abs(p), 2)} dpt`;

  // Text mit vorgetäuschter Unschärfe: viele leicht versetzte, blasse Kopien
  const blurText = (ctx, txt, x, y, r) => {
    if (r < .4) { ctx.fillText(txt, x, y); return; }
    ctx.globalAlpha = .13;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      ctx.fillText(txt, x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.fillText(txt, x + Math.cos(a + .26) * r * .5, y + Math.sin(a + .26) * r * .5);
    }
    ctx.globalAlpha = 1;
  };

  /* Ein Auge im Querschnitt mit Strahlengang. o = { g, glass, A, L } */
  const drawEye = (ctx, w, h, o) => {
    const small = w < 420;
    const ay = h * .53;
    const s = Math.min(w * (small ? .6 : .52) / (LMAX + 7), (h - 56) / 26);
    const ex = w - (LMAX + 2.5) * s - 6;            // Linse
    const front = ex - 4.5 * s, back = ex + o.L * s;
    const cx = (front + back) / 2, rx = (back - front) / 2, ry = 12 * s;
    const x1 = o.glass ? ex - VTX * s : ex;          // erstes Glas, auf das das Licht trifft
    const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - ay) / ry) ** 2 < 1;

    // Augapfel, Hornhaut, Iris
    ctx.beginPath(); ctx.ellipse(cx, ay, rx, ry, 0, 0, TAU);
    ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(front + .6 * s, ay, 2.2 * s, 6.2 * s, 0, Math.PI / 2, Math.PI * 1.5);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex - .6 * s, ay - (PUP + .4) * s); ctx.lineTo(ex - .6 * s, ay - 6 * s);
    ctx.moveTo(ex - .6 * s, ay + (PUP + .4) * s); ctx.lineTo(ex - .6 * s, ay + 6 * s); ctx.stroke();
    // Netzhaut und Sehnerv
    ctx.beginPath(); ctx.ellipse(cx, ay, rx - 1, ry - 1, 0, -1.25, 1.25);
    ctx.strokeStyle = C.copper; ctx.lineWidth = 3; ctx.stroke();
    const na = .42, nx = cx + rx * Math.cos(na), ny = ay + ry * Math.sin(na);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx - 2, ny - 7); ctx.lineTo(w - 2, ny - 4); ctx.moveTo(nx - 4, ny + 7); ctx.lineTo(w - 2, ny + 10); ctx.stroke();
    // Linse: wird mit der Akkommodation dicker
    const lt = (1.1 + o.A * .16) * s;
    ctx.beginPath(); ctx.ellipse(ex, ay, lt, 4.6 * s, 0, 0, TAU);
    ctx.fillStyle = C.accent; ctx.globalAlpha = .22; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.stroke();
    // Brillenglas
    if (o.glass) {
      const gh = 7 * s, k = Math.abs(o.glass) * .2 * s;
      const tc = o.glass > 0 ? .5 * s + k : .5 * s, te = o.glass > 0 ? .5 * s : .5 * s + k;
      ctx.beginPath();
      ctx.moveTo(x1 - te / 2, ay - gh); ctx.lineTo(x1 + te / 2, ay - gh);
      ctx.quadraticCurveTo(x1 + tc - te / 2, ay, x1 + te / 2, ay + gh);
      ctx.lineTo(x1 - te / 2, ay + gh);
      ctx.quadraticCurveTo(x1 - tc + te / 2, ay, x1 - te / 2, ay - gh);
      ctx.closePath();
      ctx.fillStyle = C.fiber; ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Gegenstand
    const ho = small ? 26 : 34;
    let xo = 0, ang;
    if (isFinite(o.g)) {
      const dmin = Math.min(60, x1 - 14);
      const frac = clamp(Math.log(o.g / .1) / Math.log(200), 0, 1);
      xo = x1 - dmin - frac * Math.max(0, x1 - dmin - 14);
      ang = ho / (x1 - xo);
      ctx.strokeStyle = C.copper; ctx.fillStyle = C.copper; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(xo, ay); ctx.lineTo(xo, ay - ho + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xo, ay - ho); ctx.lineTo(xo - 6, ay - ho + 9); ctx.lineTo(xo + 6, ay - ho + 9); ctx.closePath(); ctx.fill();
    } else ang = .09;

    // Achse
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(6, ay); ctx.lineTo(back, ay); ctx.stroke(); ctx.setLineDash([]);

    // Strahlen: achsennah durchgerechnet, in Millimetern
    const gmm = isFinite(o.g) ? o.g * 1000 : Infinity;
    const hits = [];
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
    for (const k of [-1, -.5, 0, .5, 1]) {
      let y = k * PUP * (o.glass ? 1.15 : 1);
      let u = (isFinite(gmm) ? y / gmm : 0) + ang;
      ctx.beginPath();
      if (isFinite(o.g)) ctx.moveTo(xo, ay - ho); else ctx.moveTo(8, ay + y * s - (x1 - 8) * ang);
      ctx.lineTo(x1, ay + y * s);
      if (o.glass) { u -= y * o.glass / 1000; y += u * VTX; ctx.lineTo(ex, ay + y * s); }
      u -= y * (P0 + o.A) / 1000;
      // bis zur gekrümmten Netzhaut verfolgen
      const ax0 = ex, ay0 = ay + y * s, bx = ex + o.L * 1.6 * s, by = ay + (y + u * o.L * 1.6) * s;
      let lo = 0, hi = 1;
      if (inside(bx, by)) hi = 1; else for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; inside(ax0 + (bx - ax0) * m, ay0 + (by - ay0) * m) ? lo = m : hi = m; }
      const hx = ax0 + (bx - ax0) * hi, hy = ay0 + (by - ay0) * hi;
      ctx.lineTo(hx, hy); ctx.globalAlpha = .85; ctx.stroke(); ctx.globalAlpha = 1;
      hits.push(Math.atan2((hy - ay) / ry, (hx - cx) / rx));
    }
    // Bild auf der Netzhaut: steht kopf
    const th0 = Math.min(...hits), th1 = Math.max(...hits), thc = hits[2];
    const spot = spotOf(o.g, o.glass, o.A, o.L);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.copper; ctx.lineWidth = 7; ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.ellipse(cx, ay, rx - 1, ry - 1, 0, th0, th1 + .001); ctx.stroke();
    ctx.globalAlpha = spot < .05 ? 1 : .45; ctx.lineWidth = 3.5; ctx.strokeStyle = C.fg;
    ctx.beginPath(); ctx.ellipse(cx, ay, rx - 5, ry - 5, 0, 0, thc + .001); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + (rx - 5) * Math.cos(thc), ay + (ry - 5) * Math.sin(thc), 4, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.globalAlpha = 1;

    // Beschriftungen
    ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText('Linse', ex, ay - 4.6 * s - 8);
    ctx.fillText('Netzhaut', Math.min(back - 10, w - 34), ay - ry - 6);
    if (o.glass) ctx.fillText('Brille', x1, ay - 7 * s - 8);
    ctx.textAlign = 'left';
    if (isFinite(o.g)) ctx.fillText(distTxt(o.g), Math.max(4, xo - 18), ay + 18);
    else ctx.fillText(small ? 'aus der Ferne' : 'Licht aus der Ferne', 8, ay + 28);
    // Was du siehst
    const bw = small ? 84 : 104, bh = small ? 36 : 42;
    roundRect(ctx, 8, 8, bw, bh, 8); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = `600 ${small ? 17 : 21}px Outfit, sans-serif`;
    blurText(ctx, 'Hallo', 8 + bw / 2, 8 + bh / 2 + (small ? 6 : 7), clamp(spot * 11, 0, 10));
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('so siehst du es', 8, bh + 22);
    return spot;
  };

  /* ---------- Teil 1: Akkommodation ---------- */
  const lensCv = $('#lensCv');
  const AMAX1 = 10; // junges Auge: rund 10 dpt Spielraum, Nahpunkt etwa 10 cm
  const E = { g: 20, A: 0, auto: false };
  const gOf = v => .1 * Math.pow(200, v / 100);
  const updLens = () => {
    const sp = spotOf(E.g, 0, E.A, 17);
    $('#distOut').textContent = distTxt(E.g); $('#eDist').textContent = distTxt(E.g);
    $('#accIn').value = E.A; $('#accOut').textContent = `${fmt(E.A, 1)} dpt`;
    $('#ePow').textContent = `${fmt(P0 + E.A, 1)} dpt`;
    $('#eSharp').textContent = sp < .04 ? 'scharf' : sp < .12 ? 'etwas unscharf' : 'unscharf';
  };
  const lensMsg = () => {
    const need = needAcc(E.g, 0, 17), sp = spotOf(E.g, 0, E.A, 17);
    let t;
    if (sp < .04) t = E.A < .3 ? 'Scharf. Für die Ferne bleibt die Linse entspannt und flach.' : `Scharf. Die Linse ist um ${fmt(E.A, 1)} dpt stärker gewölbt als entspannt.`;
    else if (need > AMAX1 && E.A >= AMAX1 - .05) t = 'Zu nah. Selbst die rundeste Linse schafft das nicht. Näher als etwa 10 cm sieht auch ein junges Auge nicht scharf.';
    else if (E.A > need) t = 'Zu stark gewölbt: Die Strahlen treffen sich vor der Netzhaut und laufen wieder auseinander.';
    else t = 'Zu flach: Die Strahlen würden sich erst hinter der Netzhaut treffen. Wölbe die Linse.';
    $('#lensStatus').textContent = t;
  };
  $('#distIn').addEventListener('input', e => { E.g = gOf(+e.target.value); E.auto = false; updLens(); lensMsg(); });
  $('#accIn').addEventListener('input', e => { E.A = +e.target.value; E.auto = false; updLens(); lensMsg(); });
  $('#focusBtn').addEventListener('click', () => {
    E.auto = true;
    if (reduced) { E.A = clamp(needAcc(E.g, 0, 17), 0, AMAX1); E.auto = false; updLens(); lensMsg(); }
  });
  updLens();

  const drawLens = dt => {
    if (E.auto) {
      const tgt = clamp(needAcc(E.g, 0, 17), 0, AMAX1);
      E.A += (tgt - E.A) * Math.min(1, dt * 4);
      if (Math.abs(tgt - E.A) < .02) { E.A = tgt; E.auto = false; lensMsg(); }
      updLens();
    }
    const { ctx, w, h } = fit(lensCv);
    ctx.clearRect(0, 0, w, h);
    drawEye(ctx, w, h, { g: E.g, glass: 0, A: E.A, L: 17 });
  };

  /* ---------- Teil 2: Kurz- und weitsichtig, Brille ---------- */
  const glassCv = $('#glassCv');
  const AMAX2 = 4; // erwachsenes Auge: rund 4 dpt Spielraum (vereinfacht)
  const G2 = { L: 17, far: true, glass: 0, A: 0 };
  const gNow = () => G2.far ? Infinity : .3;
  const accFor = g => clamp(needAcc(g, G2.glass, G2.L), 0, AMAX2);
  const sharpTxt = g => { const sp = spotOf(g, G2.glass, accFor(g), G2.L); return sp < .04 ? 'scharf' : sp < .12 ? 'etwas unscharf' : 'unscharf'; };
  const updGlass = () => {
    $('#glassOut').textContent = dptTxt(G2.glass);
    $('#gLen').textContent = `${G2.L} mm`;
    const D = 1000 / G2.L - P0, Pg = D / (1 + VTX / 1000 * D);
    $('#gNeed').textContent = dptTxt(Pg);
    $('#gRes').textContent = `${sharpTxt(Infinity)} · ${sharpTxt(.3)}`;
    const g = gNow(), A = accFor(g), sp = spotOf(g, G2.glass, A, G2.L), b = imgDist(g, G2.glass, A);
    const kind = G2.L > 17 ? 'kurz' : G2.L < 17 ? 'weit' : 'normal';
    let t;
    if (sp < .04) {
      t = 'Scharf: Der Treffpunkt liegt auf der Netzhaut.';
      if (A > 2.5) t += ' Die Linse muss sich dafür aber stark wölben. Das ermüdet auf Dauer.';
      else if (G2.glass && kind !== 'normal') t += ' Die Brille gleicht die falsche Augenlänge aus.';
    } else if (b < G2.L) {
      t = 'Der Treffpunkt liegt vor der Netzhaut, selbst mit flacher Linse. ';
      t += G2.glass < 0 ? 'Das Minus-Glas ist noch zu schwach.' : G2.glass > 0 ? 'Das Plus-Glas ist zu stark.' : 'Typisch kurzsichtig. Probier ein Minus-Glas.';
    } else {
      t = 'Der Treffpunkt liegt hinter der Netzhaut, obwohl die Linse schon voll gewölbt ist. ';
      t += G2.glass > 0 ? 'Das Plus-Glas ist noch zu schwach.' : G2.glass < 0 ? 'Das Minus-Glas macht es schlimmer.' : 'Probier ein Plus-Glas.';
    }
    $('#glassStatus').textContent = t;
  };
  $$('#eyeBtns button').forEach(b => b.addEventListener('click', () => {
    G2.L = +b.dataset.l; $$('#eyeBtns button').forEach(x => x.classList.toggle('active', x === b)); updGlass();
  }));
  $$('#objBtns button').forEach(b => b.addEventListener('click', () => {
    G2.far = b.dataset.g === 'far'; $$('#objBtns button').forEach(x => x.classList.toggle('active', x === b)); updGlass();
  }));
  $('#glassIn').addEventListener('input', e => { G2.glass = +e.target.value; updGlass(); });
  updGlass();

  const drawGlass = dt => {
    const tgt = accFor(gNow());
    G2.A = reduced ? tgt : G2.A + (tgt - G2.A) * Math.min(1, dt * 5);
    const { ctx, w, h } = fit(glassCv);
    ctx.clearRect(0, 0, w, h);
    drawEye(ctx, w, h, { g: gNow(), glass: G2.glass, A: G2.A, L: G2.L });
  };

  /* ---------- Teil 3: Blinder Fleck ---------- */
  const spotCv = $('#spotCv');
  const S = { m: 'dot', sep: 80 };
  const SPOT_DEG = 15.5;
  const sepPx = w => (w - 64) * S.sep / 100;
  const updSpot = () => {
    const w = spotCv.getBoundingClientRect().width || 340;
    const cm = sepPx(w) * 2.54 / 96; // CSS-Pixel; auf Handys nur ungefähr
    $('#sepOut').textContent = `${S.sep} %`;
    $('#sSep').textContent = `${fmt(cm, 1)} cm`;
    $('#sDist').textContent = `${fmt(cm / Math.tan(SPOT_DEG * Math.PI / 180), 0)} cm`;
    const msg = {
      dot: 'Linkes Auge zu. Schau mit dem rechten Auge nur auf das Kreuz. Geh langsam näher an den Bildschirm oder weiter weg, bis der Punkt verschwindet.',
      line: 'Gleich wie beim Punkt. Wenn die Lücke im blinden Fleck liegt, siehst du eine durchgehende Linie. Dein Gehirn zieht sie einfach weiter.',
      stripes: 'Gleich wie beim Punkt. Liegt das leere Loch im blinden Fleck, siehst du nur Streifen. Das Gehirn malt das Muster hinein.',
      top: 'Das Licht vom Punkt fällt genau dort auf die Netzhaut, wo der Sehnerv das Auge verlässt. Dort gibt es keine Sinneszellen.',
    };
    $('#spotStatus').textContent = msg[S.m];
  };
  $$('#spotBtns button').forEach(b => b.addEventListener('click', () => {
    S.m = b.dataset.m; $$('#spotBtns button').forEach(x => x.classList.toggle('active', x === b)); updSpot();
  }));
  $('#sepIn').addEventListener('input', e => { S.sep = +e.target.value; updSpot(); });
  addEventListener('resize', updSpot);
  updSpot();

  const drawTop = (ctx, w, h) => {
    const small = w < 420;
    const r = Math.min(54, h * .2), ex = w * .5, ey = h - r - 16, top = 30;
    const lens = { x: ex, y: ey - r };
    const dx = Math.tan(SPOT_DEG * Math.PI / 180) * (lens.y - top);
    const cross = { x: ex, y: top }, dot = { x: ex + dx, y: top };
    // Auge
    ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, r - 2, .15 * Math.PI, .85 * Math.PI); ctx.strokeStyle = C.copper; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(lens.x, lens.y + 6, 9, 4, 0, 0, TAU); ctx.fillStyle = C.accent; ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1;
    // Strahl zum Kreuz → Sehgrube
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cross.x, cross.y + 10); ctx.lineTo(ex, ey + r); ctx.stroke();
    // Strahl zum Punkt → blinder Fleck
    let ux = lens.x - dot.x, uy = lens.y - dot.y; const n = Math.hypot(ux, uy); ux /= n; uy /= n;
    const t = -2 * ((lens.x - ex) * ux + (lens.y - ey) * uy);
    const hx = lens.x + ux * t, hy = lens.y + uy * t;
    ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.moveTo(dot.x, dot.y); ctx.lineTo(hx, hy); ctx.stroke();
    // Sehnerv
    const nx = (hx - ex) / r, ny = (hy - ey) / r;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.globalAlpha = .6;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + nx * 34, hy + ny * 34); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, TAU); ctx.fillStyle = C.bad; ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey + r, 4, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    // Kreuz und Punkt
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cross.x - 7, cross.y); ctx.lineTo(cross.x + 7, cross.y); ctx.moveTo(cross.x, cross.y - 7); ctx.lineTo(cross.x, cross.y + 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(dot.x, dot.y, 6, 0, TAU); ctx.fillStyle = C.bad; ctx.fill();
    // Texte
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(small ? 'Sehnerv' : 'Sehnerv: blinder Fleck', hx - 22, hy + 22);
    ctx.textAlign = 'left';
    ctx.fillText(small ? 'schärfste Stelle' : 'Stelle des schärfsten Sehens', ex + 10, ey + r + 12);
    ctx.fillText('← Nase', 8, ey);
    ctx.textAlign = 'right'; ctx.fillText(small ? 'rechtes Auge' : 'rechtes Auge, von oben', w - 8, ey - r);
    ctx.textAlign = 'left'; ctx.fillText(`${fmt(SPOT_DEG, 1)}°`, ex + dx * .45 + 6, top + (lens.y - top) * .55);
  };

  const drawSpot = () => {
    const { ctx, w, h } = fit(spotCv);
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 4, 4, w - 8, h - 8, 14); ctx.fillStyle = C.surface; ctx.fill();
    if (S.m === 'top') { drawTop(ctx, w, h); return; }
    const sep = sepPx(w), cy = h * .5, xc = (w - sep) / 2, xd = xc + sep;
    if (S.m === 'stripes') {
      ctx.save(); ctx.beginPath(); ctx.rect(xd - 60, cy - 62, 120, 124); ctx.clip();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
      for (let x = xd - 60; x <= xd + 60; x += 8) { ctx.beginPath(); ctx.moveTo(x, cy - 62); ctx.lineTo(x, cy + 62); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(xd, cy, 15, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
    } else if (S.m === 'line') {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 5; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(xc + 26, cy); ctx.lineTo(xd - 16, cy); ctx.moveTo(xd + 16, cy); ctx.lineTo(w - 10, cy); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(xd, cy, 11, 0, TAU); ctx.fillStyle = C.bad; ctx.fill();
    }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xc - 10, cy); ctx.lineTo(xc + 10, cy); ctx.moveTo(xc, cy - 10); ctx.lineTo(xc, cy + 10); ctx.stroke();
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('linkes Auge zu · rechtes Auge aufs Kreuz', w / 2, 26);
    ctx.fillText('näher ran oder weiter weg', w / 2, h - 18);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('auge', 4, {
    lensLock: () => { $('#distIn').disabled = false; $('#accIn').disabled = false; $('#focusBtn').disabled = false; },
    glassLock: () => { $$('#eyeBtns button, #objBtns button').forEach(b => b.disabled = false); $('#glassIn').disabled = false; },
    spotLock: () => { $$('#spotBtns button').forEach(b => b.disabled = false); $('#sepIn').disabled = false; },
  });

  loop(dt => { drawLens(dt); drawGlass(dt); drawSpot(); });
})();
