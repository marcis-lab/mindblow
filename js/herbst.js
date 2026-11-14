/* mindblow – Lektion Herbstlaub */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const TAU = Math.PI * 2;
  const rgb = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const mixC = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Blattfarbstoffe, Holz, Schnee
  const GREEN = [58, 128, 48], YELLOW = [236, 182, 36], ORANGE = [232, 128, 34], RED = [196, 34, 42], DEEP = [140, 22, 46], BROWN = [138, 96, 58];
  const BARK = '#6b4a33', SNOW = '#f4f7fb', WATER = '#4f9fd0';
  // fester Zufall, damit die Bäume bei jedem Laden gleich aussehen
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // Ein Blatt: Ansatz bei (x, y), zeigt in Richtung ang
  const leafPath = (ctx, x, y, len, wid, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    ctx.beginPath();
    ctx.moveTo(...P(0, 0));
    ctx.bezierCurveTo(...P(len * .15, wid * .55), ...P(len * .6, wid * .6), ...P(len, 0));
    ctx.bezierCurveTo(...P(len * .6, -wid * .6), ...P(len * .15, -wid * .55), ...P(0, 0));
    ctx.closePath();
  };

  /* ---------- Teil 1: Blatt im Herbst ---------- */
  const leafCv = $('#leafCv');
  const L = { w: 0, play: false, hide: false, flow: 0 };
  const DAY0 = new Date(2026, 8, 1);
  const MON = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const dateOf = w => { const d = new Date(DAY0.getTime() + Math.round(w * 7) * 864e5); return `${d.getDate()}. ${MON[d.getMonth()]}`; };
  // vereinfachter Verlauf in Wochen ab 1. September
  const chlOf = w => 1 - smooth((w - 3.5) / 6);              // Grün baut sich ab Ende September ab
  const carOf = w => 1 - .45 * smooth((w - 5) / 7);          // Gelb viel langsamer
  const FALL = 10.3;                                          // Blatt fällt (etwa Mitte November)
  const leafCol = (chl, car, hide, dead) => {
    let base = mixC(BROWN, YELLOW, clamp((car - .5) / .45, 0, 1));
    if (dead) base = mixC(base, BROWN, .55);
    return mixC(base, GREEN, hide ? 0 : clamp(chl * 1.6, 0, 1));
  };
  const updLeaf = () => {
    const w = L.w, chl = chlOf(w), car = carOf(w);
    $('#wkIn').value = w; $('#wkOut').textContent = dateOf(w);
    $('#lChl').textContent = `${fmt(chl * 100, 0)} %`;
    $('#lCar').textContent = `${fmt(car * 100, 0)} %`;
    $('#lN').textContent = `${fmt((1 - chl) * 50, 0)} %`;
  };
  const leafMsg = () => {
    const w = L.w;
    if (L.hide && w < 3.5) return 'Ohne das Grün sieht man es: Das Sommerblatt ist darunter gelb. Die Carotinoide waren die ganze Zeit da.';
    if (w < 3.5) return 'Sommer: viel Chlorophyll. Es überdeckt das Gelb vollständig.';
    if (w < 8) return 'Die Tage werden kürzer. Der Baum zerlegt das Chlorophyll und holt den Stickstoff in den Zweig zurück.';
    if (w < FALL) return 'Das Grün ist fast weg. Übrig bleiben die Carotinoide: Das Blatt leuchtet gelb.';
    return 'Das Blatt ist abgefallen. Gerbstoffe färben es mit der Zeit braun (vereinfachter Verlauf, je nach Baum und Jahr).';
  };
  $('#wkIn').addEventListener('input', e => {
    L.w = +e.target.value; L.play = false; $('#leafPlay').textContent = 'Herbst abspielen';
    updLeaf(); $('#leafStatus').textContent = leafMsg();
  });
  $('#leafPlay').addEventListener('click', () => {
    L.play = !L.play;
    if (L.play && L.w >= 12.9) L.w = 0;
    $('#leafPlay').textContent = L.play ? 'Anhalten' : 'Herbst abspielen';
  });
  $('#hideBtn').addEventListener('click', () => {
    L.hide = !L.hide;
    $('#hideBtn').textContent = L.hide ? 'Grün wieder zeigen' : 'Grün ausblenden';
    $('#leafStatus').textContent = leafMsg();
  });
  updLeaf();

  const drawLeaf = dt => {
    if (L.play) {
      L.w = Math.min(13, L.w + dt * 1.1); updLeaf(); $('#leafStatus').textContent = leafMsg();
      if (L.w >= 13) { L.play = false; $('#leafPlay').textContent = 'Herbst abspielen'; }
    }
    if (!reduced) L.flow = (L.flow + dt * .5) % 1;
    const { ctx, w, h } = fit(leafCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const chl = chlOf(L.w), car = carOf(L.w);
    const fallK = smooth((L.w - FALL) / 1.2);
    const lw = narrow ? w * .58 : w * .52;

    // Datum
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    ctx.fillText(dateOf(L.w), 14, 24);
    if (L.hide) { ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.fillText('Grün ausgeblendet', 14, 40); }

    // Zweig
    const zy = 62, zx0 = 8, zx1 = lw - 8;
    ctx.strokeStyle = BARK; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(zx0, zy + 6); ctx.quadraticCurveTo(lw * .5, zy - 4, zx1, zy + 2); ctx.stroke();
    // Ansatz des Blattstiels
    const sx = lw * .5, sy = zy;
    const len = Math.min(lw * .85, h - 112), wid = len * .62;
    const gy = h - 22;
    // Fallendes Blatt
    // vom Zweig auf den Boden: landet flach liegend
    const bx = lerp(sx, lw * .06, fallK) + Math.sin(fallK * Math.PI) * lw * .15;
    const by = lerp(sy + 4, gy - wid * .4, fallK);
    const ang = lerp(Math.PI / 2 - .12, -.06, fallK);
    const col = leafCol(chl, car, L.hide, fallK > .5);
    // Boden
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, gy); ctx.lineTo(lw - 8, gy); ctx.stroke();
    // Stiel
    const stem = 18;
    ctx.strokeStyle = rgb(mixC(col, BROWN, .3)); ctx.lineWidth = 3;
    const ex = bx + Math.cos(ang) * stem, ey = by + Math.sin(ang) * stem;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    if (fallK > 0 && fallK < 1 || L.w >= FALL) {
      // Blattnarbe am Zweig
      ctx.fillStyle = BROWN; ctx.beginPath(); ctx.arc(sx, sy + 3, 3, 0, TAU); ctx.fill();
    }
    // Blattfläche
    leafPath(ctx, ex, ey, len, wid, ang);
    ctx.fillStyle = rgb(col); ctx.fill();
    // Adern
    ctx.save(); leafPath(ctx, ex, ey, len, wid, ang); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5;
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (u, v) => [ex + u * c - v * s, ey + u * s + v * c];
    ctx.beginPath(); ctx.moveTo(...P(0, 0)); ctx.lineTo(...P(len * .95, 0)); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) {
      const u = len * i / 7.5;
      for (const sg of [1, -1]) { ctx.beginPath(); ctx.moveTo(...P(u, 0)); ctx.lineTo(...P(u + len * .16, sg * wid * .5)); ctx.stroke(); }
    }
    ctx.restore();
    // Stickstoff wandert in den Zweig zurück
    const draining = L.w > 3.5 && L.w < FALL;
    if (draining && !reduced) {
      ctx.fillStyle = C.glow;
      for (let i = 0; i < 6; i++) {
        const q = (i / 6 + L.flow) % 1;
        const u = len * .7 * (1 - q);
        const [px, py] = q < .85 ? P(u, 0) : [lerp(ex, bx, (q - .85) / .15), lerp(ey, by, (q - .85) / .15)];
        ctx.globalAlpha = Math.sin(q * Math.PI) * .9;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (draining) {
      ctx.fillStyle = C.fg; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
      ctx.fillText(narrow ? 'N → Zweig' : 'Stickstoff → Zweig', sx + 10, zy - 12);
    }

    // Balken
    const bx0 = lw + (narrow ? 4 : 20), bx1 = w - 14;
    const bars = [
      [chl, rgb(GREEN), narrow ? 'Grün' : 'Chlorophyll', narrow ? '' : '(grün)'],
      [car, rgb(ORANGE), narrow ? 'Gelb' : 'Carotinoide', narrow ? '' : '(gelb)'],
      [(1 - chl) * .5, C.glow, narrow ? 'N' : 'Stickstoff', 'zurück'],
    ];
    const by0 = 52, by1 = h - 52, bh = by1 - by0;
    const slot = (bx1 - bx0) / 3, bw = Math.min(30, slot * .55);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Menge' : 'Menge im Blatt', (bx0 + bx1) / 2, 30);
    bars.forEach(([v, cl, t1, t2], i) => {
      const x = bx0 + slot * (i + .5);
      ctx.fillStyle = C.sunk; ctx.fillRect(x - bw / 2, by0, bw, bh);
      ctx.fillStyle = cl; ctx.fillRect(x - bw / 2, by1 - bh * v, bw, bh * v);
      ctx.fillStyle = C.fg; ctx.font = `10px ${MONO}`;
      ctx.fillText(t1, x, by1 + 16); if (t2) ctx.fillText(t2, x, by1 + 29);
    });
    // Hinweis: Stickstoff-Balken zeigt den Anteil im Zweig
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by0); ctx.stroke();
  };

  /* ---------- Teil 2: Ahorn und Wetter ---------- */
  const mapleCv = $('#mapleCv');
  const M = { sun: 5, nt: 9, shown: 0, t: 0, fall: [] };
  // Blätter in der Krone: Lage (u, v) im Einheitskreis, Belichtung e (Sonne kommt von links oben)
  const CROWN = [];
  for (let i = 0; i < 170; i++) {
    const a = rnd() * TAU, r = Math.sqrt(rnd());
    const u = Math.cos(a) * r, v = Math.sin(a) * r;
    const e = clamp(.35 + .5 * r + .35 * (-u * .6 - v * .8) * r, 0, 1);
    CROWN.push({ u, v, e, j: rnd(), rot: rnd() * TAU, s: .8 + rnd() * .4 });
  }
  CROWN.sort((a, b) => a.e - b.e);    // Schattenblätter zuerst, Sonnenblätter obenauf
  const model = () => {
    const sugar = M.sun / 10;
    const cool = clamp((16 - M.nt) / 12, 0, 1);
    const frost = clamp((-1 - M.nt) / 4, 0, 1);
    const ant = sugar * cool * (1 - .75 * frost);
    return { sugar: clamp(sugar * (.55 + .45 * cool), 0, 1), cool, frost, ant };
  };
  const colorName = (ant, frost) => frost > .4 ? 'braun-orange' : ant > .62 ? 'leuchtend rot' : ant > .4 ? 'rot-orange' : ant > .2 ? 'orange' : 'gelb-orange';
  const updMaple = () => {
    const m = model();
    $('#sunIn').value = M.sun; $('#ntIn').value = M.nt;
    $('#sunOut').textContent = `${M.sun} h`;
    $('#ntOut').textContent = `${M.nt} °C`;
    $('#mSug').textContent = `${fmt(m.sugar * 100, 0)} %`;
    $('#mAnt').textContent = `${fmt(m.ant * 100, 0)} %`;
    $('#mCol').textContent = colorName(m.ant, m.frost);
    let msg;
    if (m.frost > .4) msg = 'Harter Frost schädigt die Blätter, bevor sie sich ganz verfärben. Sie werden eher braun und fallen früh.';
    else if (m.ant > .62) msg = 'Sonnige Tage, kühle Nächte: viel Zucker bleibt im Blatt. Daraus entstehen viele Anthocyane. Der Ahorn glüht.';
    else if (M.sun <= 3) msg = 'Wenig Sonne: Das Blatt macht wenig Zucker. Ohne Zucker kaum Rot, das Gelb der Carotinoide überwiegt.';
    else if (M.nt >= 12) msg = 'Milde Nächte: Der Zucker wird weiter abtransportiert und verbraucht. Es bleibt wenig für das Rot.';
    else msg = 'Mittleres Wetter, mittleres Rot. Probier mehr Sonne und kühlere Nächte.';
    $('#mapleStatus').textContent = msg + ' (vereinfachtes Modell)';
  };
  $('#sunIn').addEventListener('input', e => { M.sun = +e.target.value; updMaple(); });
  $('#ntIn').addEventListener('input', e => { M.nt = +e.target.value; updMaple(); });
  const wPreset = (s, t) => () => { M.sun = s; M.nt = t; updMaple(); };
  $('#wGold').addEventListener('click', wPreset(9, 3));
  $('#wGrey').addEventListener('click', wPreset(2, 12));
  $('#wFrost').addEventListener('click', wPreset(5, -5));
  updMaple();
  M.shown = model().ant;

  const drawMaple = dt => {
    const { ctx, w, h } = fit(mapleCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const m = model();
    // Farbe gleitet weich zum neuen Wert
    M.shown = reduced ? m.ant : M.shown + (m.ant - M.shown) * Math.min(1, dt * 3);
    M.frostShown = reduced ? m.frost : (M.frostShown ?? m.frost) + (m.frost - (M.frostShown ?? m.frost)) * Math.min(1, dt * 3);
    M.t += dt;

    // Himmel: Sonne links oben
    const sunA = M.sun / 10;
    const sx = narrow ? 36 : 54, sy = narrow ? 36 : 48;
    if (sunA > 0) {
      const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 70 + 50 * sunA);
      g.addColorStop(0, `rgba(255,200,60,${.55 * sunA})`); g.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.beginPath(); ctx.arc(sx, sy, narrow ? 14 : 18, 0, TAU);
    ctx.fillStyle = sunA > 0 ? `rgba(245,180,40,${.35 + .65 * sunA})` : C.line; ctx.fill();
    // Wolken bei wenig Sonne
    const cloud = 1 - sunA;
    if (cloud > .3) {
      ctx.fillStyle = C.sunk; ctx.globalAlpha = Math.min(1, cloud * 1.3);
      for (const [cx, cy, r] of [[sx + 6, sy + 8, 16], [sx + 26, sy + 2, 20], [sx + 46, sy + 10, 14]]) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(`${M.sun} h Sonne`, 12, sy + (narrow ? 34 : 42));

    // Thermometer rechts oben (Nacht)
    const tx = w - (narrow ? 26 : 40), ty0 = 22, ty1 = narrow ? 120 : 140;
    const tY = t => lerp(ty1, ty0, (t + 5) / 21);
    roundRect(ctx, tx - 5, ty0 - 6, 10, ty1 - ty0 + 10, 5); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const tcol = M.nt <= 0 ? '#4f9fd0' : M.nt < 8 ? '#6aa7c8' : '#d8743a';
    ctx.fillStyle = tcol; ctx.fillRect(tx - 2.5, tY(M.nt), 5, ty1 - tY(M.nt) + 2);
    ctx.beginPath(); ctx.arc(tx, ty1 + 8, 8, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.muted; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.font = `10px ${MONO}`;
    for (const t of [-5, 0, 8, 16]) {
      ctx.beginPath(); ctx.moveTo(tx - 9, tY(t)); ctx.lineTo(tx - 5, tY(t)); ctx.stroke();
      ctx.fillText(`${t}°`, tx - 11, tY(t) + 3);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText(`${M.nt} °C`, tx - (narrow ? 6 : 0), ty1 + 30);
    ctx.fillStyle = C.muted; ctx.fillText('Nacht', tx - (narrow ? 6 : 0), ty1 + 43);

    // Baum
    const gy = h - 26;
    const cx = w * (narrow ? .44 : .46), cy = h * .43;
    const R = Math.min(w * (narrow ? .3 : .26), h * .3);
    ctx.fillStyle = C.sunk; ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = BARK; ctx.lineCap = 'round';
    ctx.lineWidth = R * .16;
    ctx.beginPath(); ctx.moveTo(cx, gy + 2); ctx.lineTo(cx, cy + R * .2); ctx.stroke();
    ctx.lineWidth = R * .06;
    for (const [dx, dy] of [[-.55, -.35], [.5, -.45], [-.1, -.7], [.25, -.2]]) {
      ctx.beginPath(); ctx.moveTo(cx, cy + R * .35); ctx.lineTo(cx + dx * R, cy + dy * R); ctx.stroke();
    }
    // Blätter
    const ls = R * .17;
    const frostK = M.frostShown;
    for (const L2 of CROWN) {
      const x = cx + L2.u * R * 1.12, y = cy + L2.v * R * .9;
      const red = clamp(M.shown * (.25 + .9 * L2.e) + (L2.j - .5) * .12, 0, 1);
      let col = red < .5 ? mixC(YELLOW, ORANGE, red * 2) : mixC(ORANGE, red > .85 ? DEEP : RED, Math.min(1, (red - .5) * 2.2));
      if (frostK > 0) col = mixC(col, BROWN, frostK * (.5 + .4 * L2.j));
      const sway = reduced ? 0 : Math.sin(M.t * 1.3 + L2.j * 9) * .08;
      leafPath(ctx, x, y, ls * L2.s, ls * L2.s * .7, L2.rot + sway);
      ctx.fillStyle = rgb(col); ctx.fill();
    }
    // fallende Blätter
    if (!reduced) {
      const rate = .6 + 2.5 * frostK;
      if (M.fall.length < 10 && Math.random() < dt * rate) {
        const L2 = CROWN[Math.floor(Math.random() * CROWN.length)];
        M.fall.push({ x: cx + L2.u * R, y: cy + L2.v * R * .8, vy: 18 + Math.random() * 14, ph: Math.random() * TAU, rot: Math.random() * TAU, e: L2.e });
      }
      for (const f of M.fall) {
        f.y += f.vy * dt; f.ph += dt * 2; f.rot += dt;
        const x = f.x + Math.sin(f.ph) * 12;
        const red = clamp(M.shown * (.25 + .9 * f.e), 0, 1);
        let col = red < .5 ? mixC(YELLOW, ORANGE, red * 2) : mixC(ORANGE, RED, Math.min(1, (red - .5) * 2));
        if (frostK > 0) col = mixC(col, BROWN, frostK * .7);
        leafPath(ctx, x, f.y, ls, ls * .7, f.rot); ctx.fillStyle = rgb(col); ctx.fill();
      }
      M.fall = M.fall.filter(f => f.y < gy - 2);
    }
    // Beschriftung
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`;
    ctx.fillText(colorName(m.ant, m.frost), cx, gy + 17);
    if (!narrow) {
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('Sonnenseite röter, innen im Schatten gelber', cx, 20);
    }
  };

  /* ---------- Teil 3: Ein Jahr mit drei Bäumen ---------- */
  const yearCv = $('#yearCv');
  const Y = { m: 6.5, play: false, keep: false, t: 0, drops: [] };
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  // Monat als Zahl: 0 = Anfang Januar, 12 = Ende Dezember (vereinfacht, Mittelland)
  const leafAmt = m => m < 3.4 ? 0 : m < 4.4 ? smooth(m - 3.4) : m < 9.6 ? 1 : 1 - smooth((m - 9.6) / 1.4);
  const colorAmt = m => smooth((m - 8.8) / 1.2);
  const snowAmt = m => m < 1.6 ? 1 : m < 2.4 ? 1 - smooth((m - 1.6) / .8) : m > 11.2 ? smooth((m - 11.2) / .6) : 0;
  const frozen = m => m < 2.2 || m > 11.3;
  const yearMsgs = () => {
    const m = Y.m, keepWinter = Y.keep && snowAmt(m) > .3;
    if (keepWinter) return { st: 'Mit Blättern im Winter: Die breiten Blätter verdunsten weiter Wasser, aber der Boden ist gefroren. Die Buche verdurstet. Und der Schnee auf den Blättern bricht Äste.', warn: true };
    if (Y.keep && m >= 9.6 && m < 11.2) return { st: 'Die Buche behält ihre grünen Blätter. Noch geht es gut, aber der Winter kommt.', warn: false };
    if (m < 2.4) return { st: 'Winter: Der Boden ist gefroren. Buche und Lärche stehen kahl da und verlieren kaum Wasser. Die Fichte spart mit ihren Wachsnadeln.' };
    if (m < 4.4) return { st: 'Frühling: Der Boden taut auf. Aus den Knospen treiben neue Blätter und Nadeln. Den Stickstoff dafür hat der Baum im Herbst gespeichert.' };
    if (m < 8.8) return { st: 'Sommer: Alle drei Bäume machen Zucker und verdunsten viel Wasser. Der Boden liefert genug nach.' };
    if (m < 9.8) return { st: 'Herbst: Buche und Lärche bauen ihr Chlorophyll ab. Am Blattstiel wächst eine Trennschicht.' };
    if (m < 11.2) return { st: 'Die Blätter fallen. Wo sie abgebrochen sind, verschliesst Kork die Wunde. Auch die Lärche wirft ihre goldenen Nadeln ab.' };
    return { st: 'Der Winter beginnt. Ohne Blätter verdunstet die Buche kaum noch Wasser. Schnee fällt durch die kahlen Äste.' };
  };
  const updYear = () => {
    const m = Y.m;
    $('#moIn').value = m;
    $('#moOut').textContent = MONTHS[Math.floor(m) % 12];
    $('#yGround').textContent = frozen(m) ? 'gefroren' : 'Wasser flüssig';
    const la = leafAmt(m), ca = colorAmt(m);
    let b;
    if (Y.keep && (m >= 9.6 || m < 3.4)) b = snowAmt(m) > .3 ? 'verdurstet, Äste brechen' : 'grün, trotz Herbst';
    else if (la === 0) b = m < 6 ? 'kahl, Knospen warten' : 'kahl';
    else if (m < 4.4) b = 'Blätter treiben aus';
    else if (ca < .2) b = 'grüne Blätter';
    else if (la > .9) b = 'färbt sich';
    else b = 'wirft Blätter ab';
    $('#yBeech').textContent = b;
    $('#yLarch').textContent = la === 0 ? 'kahl' : m < 4.4 ? 'Nadeln treiben aus' : ca < .2 ? 'grüne Nadeln' : la > .9 ? 'goldgelb' : 'wirft Nadeln ab';
    const s = yearMsgs();
    $('#yearStatus').textContent = s.st;
    $('#yearStatus').classList.toggle('warn', !!s.warn);
  };
  $('#moIn').addEventListener('input', e => { Y.m = +e.target.value; Y.play = false; $('#yearPlay').textContent = 'Jahr abspielen'; updYear(); });
  $('#yearPlay').addEventListener('click', () => { Y.play = !Y.play; $('#yearPlay').textContent = Y.play ? 'Anhalten' : 'Jahr abspielen'; });
  $('#keepBtn').addEventListener('click', () => {
    Y.keep = !Y.keep;
    $('#keepBtn').textContent = Y.keep ? 'Zurück zur echten Buche' : 'Was wäre, wenn die Buche ihre Blätter behält?';
    if (Y.keep && Y.m > 3 && Y.m < 11) Y.m = 11.9;
    updYear();
  });
  updYear();
  // Kronen-Blätter für Buche und Lärche vorberechnen
  const BEECH = [], LARCH = [];
  for (let i = 0; i < 90; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()); BEECH.push({ u: Math.cos(a) * r, v: Math.sin(a) * r, j: rnd(), rot: rnd() * TAU }); }
  for (let i = 0; i < 70; i++) LARCH.push({ k: rnd(), side: rnd() < .5 ? -1 : 1, j: rnd() });

  const drawYear = dt => {
    if (Y.play) { Y.m = (Y.m + dt * .8) % 12; updYear(); }
    Y.t += dt;
    const { ctx, w, h } = fit(yearCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const m = Y.m, snow = snowAmt(m), la = leafAmt(m), ca = colorAmt(m);
    const gy = h - 40;

    // Boden
    ctx.fillStyle = frozen(m) ? 'rgba(120,170,215,.28)' : C.sunk;
    ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    if (frozen(m)) {
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
      ctx.fillText(narrow ? 'Boden gefroren' : 'Boden gefroren: Wurzeln finden kaum Wasser', w - 10, h - 10);
    }
    // Monat oben links
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(MONTHS[Math.floor(m) % 12], 12, 24);

    const xs = narrow ? [w * .2, w * .52, w * .82] : [w * .2, w * .5, w * .8];
    const S = Math.min(w * (narrow ? .145 : .12), (gy - 46) / 3.1);

    // --- Buche ---
    const bx = xs[0], top = gy - S * 2.9;
    const keepLeaves = Y.keep && (m >= 9.6 || m < 3.4);
    const bla = keepLeaves ? 1 : la, bca = keepLeaves ? 0 : ca;
    const broken = keepLeaves && snow > .5;
    ctx.strokeStyle = BARK; ctx.lineCap = 'round';
    ctx.lineWidth = S * .16; ctx.beginPath(); ctx.moveTo(bx, gy); ctx.lineTo(bx, top + S * 1.1); ctx.stroke();
    ctx.lineWidth = S * .06;
    const branches = [[-.8, -.5], [.75, -.6], [-.3, -1], [.35, -.95], [0, -1.15]];
    branches.forEach(([dx, dy], i) => {
      ctx.beginPath(); ctx.moveTo(bx, top + S * 1.5);
      if (broken && i === 1) { ctx.lineTo(bx + dx * S * .5, top + S * 1.5 + dy * S * .5); ctx.lineTo(bx + dx * S * .75, top + S * 1.5 + dy * S * .1); }
      else ctx.lineTo(bx + dx * S, top + S * 1.5 + dy * S);
      ctx.stroke();
    });
    // Blätter
    const leafC = mixC(mixC(GREEN, YELLOW, clamp(bca * 1.4, 0, 1)), BROWN, clamp((bca - .6) * 1.6, 0, 1));
    const nShow = Math.round(BEECH.length * bla);
    const ls = S * .26 * (m < 4.4 && !keepLeaves ? .5 + .5 * la : 1);
    for (let i = 0; i < nShow; i++) {
      const p = BEECH[i];
      if (broken && p.u > .3 && p.v < 0) continue;
      leafPath(ctx, bx + p.u * S * 1.05, top + S * .9 + p.v * S * .85, ls, ls * .6, p.rot);
      ctx.fillStyle = rgb(mixC(leafC, [30, 70, 30], p.j * .25)); ctx.fill();
    }
    // Schnee auf der Buche
    if (snow > 0) {
      ctx.fillStyle = SNOW; ctx.strokeStyle = 'rgba(0,0,0,.08)';
      if (keepLeaves) {
        ctx.beginPath(); ctx.ellipse(bx, top + S * .12, S * 1.05 * snow, S * .3 * snow, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
      } else {
        branches.forEach(([dx, dy]) => {
          ctx.beginPath(); ctx.ellipse(bx + dx * S * .9, top + S * 1.5 + dy * S * .9 - 2, S * .1 * snow, S * .04 * snow + 1, 0, 0, TAU); ctx.fill();
        });
      }
    }
    if (broken) {
      ctx.fillStyle = C.bad; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      if (!narrow) { ctx.textAlign = 'left'; ctx.fillText('Ast bricht!', bx + S * .55, top + S * 2.05); }
    }

    // --- Fichte ---
    const fx = xs[1], ftop = gy - S * 3;
    ctx.strokeStyle = BARK; ctx.lineWidth = S * .12;
    ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, gy - S * .4); ctx.stroke();
    const FIR = '#2f5e3a';
    for (let k = 0; k < 4; k++) {
      const y0 = ftop + k * S * .62, y1 = y0 + S * 1.05, half = S * (.28 + k * .2);
      ctx.beginPath(); ctx.moveTo(fx, y0); ctx.lineTo(fx - half, y1); ctx.lineTo(fx + half, y1); ctx.closePath();
      ctx.fillStyle = FIR; ctx.fill();
      if (snow > 0) {
        // Schnee rutscht an den Seiten ab: nur dünne Streifen
        ctx.fillStyle = SNOW; ctx.globalAlpha = snow;
        ctx.beginPath(); ctx.moveTo(fx, y0 + 2); ctx.lineTo(fx - half * .45, y0 + (y1 - y0) * .45); ctx.lineTo(fx - half * .35, y0 + (y1 - y0) * .5); ctx.lineTo(fx, y0 + 8);
        ctx.lineTo(fx + half * .35, y0 + (y1 - y0) * .5); ctx.lineTo(fx + half * .45, y0 + (y1 - y0) * .45); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // --- Lärche ---
    const lx = xs[2], ltop = gy - S * 3;
    ctx.strokeStyle = BARK; ctx.lineWidth = S * .1;
    ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx, ltop); ctx.stroke();
    ctx.lineWidth = S * .035;
    for (let k = 0; k < 7; k++) {
      const y = ltop + S * .35 + k * S * .35, half = S * (.2 + k * .1);
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx - half, y + S * .14); ctx.moveTo(lx, y); ctx.lineTo(lx + half, y + S * .14); ctx.stroke();
    }
    const larchC = mixC([110, 170, 70], [226, 178, 40], clamp(ca * 1.3, 0, 1));
    const nl = Math.round(LARCH.length * la);
    ctx.strokeStyle = rgb(larchC); ctx.lineWidth = 1.4;
    const nlen = S * .09 * (m < 4.4 ? .5 + .5 * la : 1);
    for (let i = 0; i < nl; i++) {
      const p = LARCH[i];
      const k = Math.floor(p.k * 7), y = ltop + S * .35 + k * S * .35, half = S * (.2 + k * .1);
      const q = .2 + .8 * p.j, px = lx + p.side * half * q, py = y + S * .14 * q;
      ctx.beginPath();
      for (let a = -2; a <= 2; a++) { const an = -Math.PI / 2 + a * .45; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(an) * nlen, py + Math.sin(an) * nlen); }
      ctx.stroke();
    }
    if (snow > 0) {
      ctx.fillStyle = SNOW; ctx.globalAlpha = snow;
      for (let k = 0; k < 7; k++) { const y = ltop + S * .35 + k * S * .35; ctx.beginPath(); ctx.arc(lx, y - 1, S * .05, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    // Laub am Boden
    const litter = m >= 9.6 ? smooth((m - 9.6) / 1.4) : m < 3 ? .8 : m < 5 ? .8 * (1 - smooth((m - 3) / 2)) : 0;
    if (litter > 0 && !(Y.keep && (m >= 9.6 || m < 3.4))) {
      for (let i = 0; i < 26 * litter; i++) {
        const p = BEECH[i];
        ctx.fillStyle = rgb(mixC(YELLOW, BROWN, .4 + p.j * .5));
        leafPath(ctx, bx - S * 1.2 + p.j * S * 2.4, gy + 3 + (p.u + 1) * 3, S * .18, S * .1, p.rot);
        ctx.fill();
      }
    }

    // Wasserdampf: verdunstet aus den Blättern
    const evapB = bla;
    const thirsty = keepLeaves && frozen(m);
    if (!reduced) {
      const sources = [[bx, top + S * .5, evapB], [fx, ftop + S * .4, .35], [lx, ltop + S * .3, la]];
      for (const [x, y, k] of sources) {
        if (k < .05) continue;
        const n = Math.round(4 * k);
        for (let i = 0; i < n; i++) {
          const q = (Y.t * .5 + i / n + x * .01) % 1;
          ctx.globalAlpha = Math.sin(q * Math.PI) * .7;
          ctx.fillStyle = x === bx && thirsty ? C.bad : WATER;
          ctx.beginPath(); ctx.arc(x + Math.sin(q * 6 + i) * S * .3, y - q * S * .7, 2.5, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    if (thirsty) {
      ctx.fillStyle = C.bad; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.textAlign = narrow ? 'center' : 'left'; ctx.fillText(narrow ? (broken ? 'Durst! Ast bricht!' : 'Durst!') : 'Wasser geht, nichts kommt nach', narrow ? bx : bx - S, top - S * .3);
    }

    // Schneeflocken
    if (snow > .2 && !reduced) {
      ctx.fillStyle = SNOW; ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = .5;
      for (let i = 0; i < 40; i++) {
        const x = (i * 97.3 + Math.sin(Y.t + i) * 10) % w;
        const y = ((i * 53.1 + Y.t * 30) % (gy - 30)) + 30;
        ctx.globalAlpha = snow;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Trennschicht-Lupe im Herbst (nur breit)
    if (!narrow && m > 8.8 && m < 11 && !Y.keep) {
      const ix = (xs[1] + xs[2]) / 2, iy = 14, ir = 30;
      ctx.save();
      ctx.beginPath(); ctx.arc(ix, iy + ir, ir, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.clip();
      ctx.strokeStyle = BARK; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(ix - ir, iy + ir + 18); ctx.lineTo(ix + ir, iy + ir + 8); ctx.stroke();
      const sep = smooth((m - 9) / 1.2);
      ctx.strokeStyle = rgb(mixC(GREEN, YELLOW, ca)); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(ix - 4, iy + ir + 10 + sep * 8); ctx.lineTo(ix + 12, iy + 6 + sep * 8); ctx.stroke();
      ctx.strokeStyle = C.copper; ctx.lineWidth = 2; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(ix - 10, iy + ir + 9); ctx.lineTo(ix + 4, iy + ir + 15); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('Trennschicht', ix, iy + ir * 2 + 14);
    }

    // Namen
    ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('Buche', bx, gy + 16); ctx.fillText('Fichte', fx, gy + 16); ctx.fillText('Lärche', lx, gy + 16);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('herbst', 4, {
    leafLock: () => { ['#wkIn', '#leafPlay', '#hideBtn'].forEach(s => $(s).disabled = false); },
    mapleLock: () => { ['#sunIn', '#ntIn', '#wGold', '#wGrey', '#wFrost'].forEach(s => $(s).disabled = false); },
    yearLock: () => { ['#moIn', '#yearPlay', '#keepBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawLeaf(dt); drawMaple(dt); drawYear(dt); });
})();
