/* mindblow – Lektion Mondphasen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const MONO = 'Geist Mono, monospace';
  const MONTH = 29.53;                       // von Neumond zu Neumond, in Tagen
  // bewusst feste Farben: Mondlicht, Nachthimmel, Sonne, Erde, Blutmond
  const LIT = '#efe8d4', DARK = '#262b38', SHINE = '#3a4254', SKY = '#0c1322', SUN = '#ffc845';
  const EARTH = '#4f8ad9', EARTH_N = '#1f3556', BLOOD = '#9a3a22';

  const elong = day => ((day / MONTH) * TAU) % TAU;          // Winkel Sonne–Mond, 0 = Neumond
  const elongDeg = day => elong(day) / DEG;
  const litFrac = day => (1 - Math.cos(elong(day))) / 2;
  const phaseName = day => {
    const d = elongDeg(day);
    if (d < 12 || d > 348) return 'Neumond';
    if (d < 78) return 'zunehmende Sichel';
    if (d < 102) return 'Halbmond, zunehmend';
    if (d < 168) return 'zunehmender Mond';
    if (d < 192) return 'Vollmond';
    if (d < 258) return 'abnehmender Mond';
    if (d < 282) return 'Halbmond, abnehmend';
    return 'abnehmende Sichel';
  };
  const shapeName = day => {
    const d = elongDeg(day);
    if (d < 12 || d > 348) return 'Neumond';
    if (d < 78 || d > 282) return 'Sichel';
    if (d < 102 || d > 258) return 'Halbmond';
    if (d < 168 || d > 192) return 'mehr als halb';
    return 'Vollmond';
  };

  // Mondscheibe, wie man sie von der Erde sieht. flip = um 180° gedreht (Südhalbkugel)
  const drawPhase = (ctx, cx, cy, r, day, flip = false) => {
    const e = elong(day), c = Math.cos(e), s = Math.sign(Math.sin(e)) || 1;
    const k = (1 - c) / 2;
    ctx.save(); ctx.translate(cx, cy); if (flip) ctx.rotate(Math.PI);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = k > .02 && k < .35 ? SHINE : DARK; ctx.fill();   // schmale Sichel: aschgraues Mondlicht
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
    if (k > .002) {
      const N = 64;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const t = -Math.PI / 2 + Math.PI * i / N; ctx.lineTo(s * r * Math.cos(t), r * Math.sin(t)); }
      for (let i = N; i >= 0; i--) { const t = -Math.PI / 2 + Math.PI * i / N; ctx.lineTo(s * c * r * Math.cos(t), r * Math.sin(t)); }
      ctx.closePath();
      ctx.save(); ctx.shadowColor = 'rgba(255,240,200,.5)'; ctx.shadowBlur = r * .25;
      ctx.fillStyle = LIT; ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };
  // Mond oder Erde von oben/von der Seite: die zur Sonne (links) zeigende Hälfte ist hell
  const halfBall = (ctx, x, y, r, lit, dark) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = dark; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fillStyle = lit; ctx.fill();
  };
  const STARS = Array.from({ length: 40 }, (_, i) => [((i * 73) % 97) / 97, ((i * 41 + 13) % 89) / 89, .3 + ((i * 29) % 7) / 10]);
  const sky = (ctx, x, y, w, h, rad = 12) => {
    roundRect(ctx, x, y, w, h, rad); ctx.fillStyle = SKY; ctx.fill();
    ctx.save(); roundRect(ctx, x, y, w, h, rad); ctx.clip();
    for (const [u, v, a] of STARS) { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.fillRect(x + u * w, y + v * h, 1.4, 1.4); }
    ctx.restore(); ctx.globalAlpha = 1;
  };

  /* ---------- Teil 1: Draufsicht und Blick von der Erde ---------- */
  const orbCv = $('#orbCv');
  const O = { day: 4, play: false };
  const updOrbit = () => {
    $('#dayIn').value = O.day;
    $('#dayOut').textContent = 'Tag ' + fmt(O.day, 1);
    $('#oPhase').textContent = phaseName(O.day);
    $('#oLit').textContent = fmt(litFrac(O.day) * 100, 0) + ' %';
  };
  const orbMsg = () => {
    const d = elongDeg(O.day);
    $('#orbStatus').textContent =
      d < 12 || d > 348 ? 'Neumond: Die helle Hälfte zeigt ganz von dir weg. Und der Erdschatten liegt auf der anderen Seite.'
      : d > 168 && d < 192 ? 'Vollmond: Du schaust genau auf die helle Hälfte. Der Mond steht neben dem Erdschatten, nicht darin.'
      : (d > 78 && d < 102) || (d > 258 && d < 282) ? 'Halbmond: Von der hellen Hälfte siehst du genau die Hälfte. Also ein Viertel der ganzen Kugel.'
      : 'Der Bogen zeigt, was du siehst. Nur der Teil, der auch hell ist, leuchtet am Himmel.';
  };
  $('#dayIn').addEventListener('input', e => { O.day = +e.target.value; O.play = false; $('#orbPlay').textContent = 'Einen Monat abspielen'; updOrbit(); orbMsg(); });
  $('#orbPlay').addEventListener('click', () => { O.play = !O.play; $('#orbPlay').textContent = O.play ? 'Anhalten' : 'Einen Monat abspielen'; });
  $('#orbHalf').addEventListener('click', () => { O.day = MONTH / 4; O.play = false; $('#orbPlay').textContent = 'Einen Monat abspielen'; updOrbit(); orbMsg(); });
  $('#orbFull').addEventListener('click', () => { O.day = MONTH / 2; O.play = false; $('#orbPlay').textContent = 'Einen Monat abspielen'; updOrbit(); orbMsg(); });
  updOrbit();

  const drawOrbit = dt => {
    if (O.play) { O.day = (O.day + dt * 2.6) % 29.5; updOrbit(); }
    const { ctx, w, h } = fit(orbCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560;
    const A = narrow ? { x: 0, y: 0, w, h: h * .62 } : { x: 0, y: 0, w: w * .6, h };
    const B = narrow ? { x: 12, y: h * .62 + 2, w: w - 24, h: h * .38 - 14 } : { x: w * .6 + 4, y: 16, w: w * .4 - 20, h: h - 32 };

    // Sonnenlicht von links
    const g = ctx.createLinearGradient(A.x, 0, A.x + 60, 0);
    g.addColorStop(0, 'rgba(255,200,69,.55)'); g.addColorStop(1, 'rgba(255,200,69,0)');
    ctx.fillStyle = g; ctx.fillRect(A.x, A.y, 60, A.h);
    ctx.strokeStyle = 'rgba(225,160,40,.18)'; ctx.lineWidth = 1;
    for (let y = A.y + 34; y < A.y + A.h - 10; y += 26) { ctx.beginPath(); ctx.moveTo(A.x + 20, y); ctx.lineTo(A.x + A.w - 10, y); ctx.stroke(); }
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.glow;
    ctx.fillText('Sonnenlicht →', A.x + 10, A.y + 18);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'von oben' : 'Blick von oben', A.x + A.w - 10, A.y + 18);

    const ex = A.x + A.w * .54, ey = A.y + A.h / 2 + 6;
    const R = Math.min(A.w * .34, A.h * .36);
    const re = clamp(R * .17, 12, 22), rm = clamp(R * .1, 7, 13);
    // Erdschatten
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(ex, ey - re, A.x + A.w - ex, re * 2);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.font = `10px ${MONO}`;
    ctx.fillText('Erdschatten', A.x + A.w - 6, ey + re + 12);
    // Bahn
    ctx.setLineDash([3, 5]); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ex, ey, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const pos = e => [ex - R * Math.cos(e), ey + R * Math.sin(e)];
    // Phasen als blasse Geister
    ctx.globalAlpha = .3;
    for (let i = 0; i < 8; i++) { const [x, y] = pos(i * TAU / 8); halfBall(ctx, x, y, rm * .7, LIT, DARK); }
    ctx.globalAlpha = 1;
    // Laufrichtung
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    const [ax, ay] = pos(TAU * .125 + .2);
    ctx.fillText('↺', ax, ay);
    // Erde
    halfBall(ctx, ex, ey, re, EARTH, EARTH_N);
    ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('Erde', ex, ey - re - 6);
    // Mond
    const e = elong(O.day), [mx, my] = pos(e);
    ctx.setLineDash([2, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.shadowColor = 'rgba(255,230,160,.6)'; ctx.shadowBlur = 10;
    halfBall(ctx, mx, my, rm, LIT, DARK); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, my, rm, 0, TAU); ctx.stroke();
    // Bogen: die Hälfte, die zur Erde schaut
    const toE = Math.atan2(ey - my, ex - mx);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(mx, my, rm + 5, toE - Math.PI / 2, toE + Math.PI / 2); ctx.stroke();
    // Legende
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    const ly = A.y + A.h - 12;
    ctx.beginPath(); ctx.arc(A.x + 18, ly + 6, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.fillText(narrow ? 'zeigt zur Erde' : 'diese Hälfte zeigt zur Erde', A.x + 30, ly);

    // Ansicht von der Erde
    sky(ctx, B.x, B.y, B.w, B.h);
    const rv = Math.min(B.w * (narrow ? .26 : .32), B.h * (narrow ? .36 : .28));
    const vx = narrow ? B.x + B.w * .7 : B.x + B.w / 2, vy = B.y + B.h / 2 + (narrow ? 0 : 4);
    drawPhase(ctx, vx, vy, rv, O.day);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `10px ${MONO}`;
    ctx.textAlign = narrow ? 'left' : 'center';
    const tx = narrow ? B.x + 14 : B.x + B.w / 2;
    ctx.fillText('Von der Erde aus', tx, B.y + 20);
    ctx.fillStyle = '#ffffff'; ctx.font = `500 12px ${MONO}`;
    if (narrow) {
      const [a, b] = phaseName(O.day).split(', ');
      ctx.fillText(a, tx, B.y + B.h / 2 + 2); if (b) ctx.fillText(b, tx, B.y + B.h / 2 + 18);
    } else ctx.fillText(phaseName(O.day), tx, B.y + B.h - 18);
  };

  /* ---------- Teil 2: Zunehmend oder abnehmend? ---------- */
  const guessCv = $('#guessCv');
  const G = { day: 20.5, guessed: false, verdict: null, tries: 0, right: 0 };
  const riseH = day => (6 + day / MONTH * 24) % 24;                    // vereinfacht: Tagundnachtgleiche
  const hhmm = hh => { const m = Math.round(hh * 6) * 10 % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const whenSeen = day => {
    const d = elongDeg(day);
    if (d < 20 || d > 340) return 'gar nicht';
    if (d < 70) return 'kurz am Abend';
    if (d < 120) return 'am Abend';
    if (d < 165) return 'abends bis spät';
    if (d < 195) return 'die ganze Nacht';
    if (d < 240) return 'spätabends bis früh';
    if (d < 290) return 'nach Mitternacht';
    return 'kurz am Morgen';
  };
  const waxing = day => { const d = elongDeg(day); return d >= 12 && d <= 168 ? 1 : d >= 192 && d <= 348 ? -1 : 0; };
  const updGuess = () => {
    $('#gIn').value = G.day;
    $('#gOut').textContent = shapeName(G.day);
    $('#gShape').textContent = shapeName(G.day);
    $('#gRise').textContent = G.guessed ? hhmm(riseH(G.day)) + ' Uhr' : '?';
    $('#gWhen').textContent = G.guessed ? whenSeen(G.day) : '?';
    $('#gScore').textContent = G.tries ? `${G.right} von ${G.tries} richtig geraten` : 'noch nicht geraten';
  };
  const randomMoon = () => {
    let d;
    do { d = Math.random() < .5 ? 2.2 + Math.random() * 10.6 : 16.8 + Math.random() * 10.6; } while (Math.abs(d - G.day) < 3);
    G.day = Math.round(d * 10) / 10; G.guessed = false; G.verdict = null;
    $('#guessStatus').textContent = 'Schau dir die Rundung an. Zunehmend oder abnehmend?';
    updGuess();
  };
  const guess = dir => {
    if (G.guessed) return;
    const truth = waxing(G.day);
    G.guessed = true;
    if (!truth) {
      G.verdict = 'none';
      $('#guessStatus').textContent = elongDeg(G.day) > 90 && elongDeg(G.day) < 270
        ? 'Genau Vollmond: Er hört gerade auf zuzunehmen und fängt an abzunehmen. Er steht die ganze Nacht am Himmel.'
        : 'Neumond: Er steht mit der Sonne am Taghimmel und zeigt uns seine dunkle Seite. Du siehst ihn gar nicht.';
    } else {
      G.tries++;
      const ok = dir === truth; if (ok) G.right++;
      G.verdict = ok ? 'ok' : 'no';
      const why = truth > 0 ? 'Rundung rechts, also zunehmend. Er geht am Tag auf und steht am Abend am Himmel.'
        : 'Rundung links, also abnehmend. Er geht erst in der Nacht auf und steht am Morgen noch am Himmel.';
      $('#guessStatus').textContent = (ok ? 'Richtig! ' : 'Leider nicht. ') + why;
    }
    updGuess();
  };
  $('#zuBtn').addEventListener('click', () => guess(1));
  $('#abBtn').addEventListener('click', () => guess(-1));
  $('#nextBtn').addEventListener('click', randomMoon);
  $('#gIn').addEventListener('input', e => {
    G.day = +e.target.value; G.guessed = false; G.verdict = null;
    $('#guessStatus').textContent = 'Du hast eine Phase gewählt. Rate jetzt: zunehmend oder abnehmend?';
    updGuess();
  });
  updGuess();

  const drawGuess = () => {
    const { ctx, w, h } = fit(guessCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const P = { x: 12, y: 12, w: w - 24, h: h * .52 };
    sky(ctx, P.x, P.y, P.w, P.h);
    const r = Math.min(P.h * .34, 70);
    drawPhase(ctx, P.x + P.w / 2, P.y + P.h / 2 + 6, r, G.day);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Blick nach Süden' : 'Blick nach Süden, aus der Schweiz', P.x + 12, P.y + 18);
    if (G.guessed && G.verdict !== 'none') {
      const t = waxing(G.day);
      ctx.fillStyle = '#ffffff'; ctx.font = `500 12px ${MONO}`; ctx.textAlign = t > 0 ? 'left' : 'right';
      const lx = t > 0 ? P.x + P.w / 2 + r + 14 : P.x + P.w / 2 - r - 14;
      if (narrow) {
        ctx.fillText(t > 0 ? 'zu-' : 'ab-', lx, P.y + P.h / 2 + 2); ctx.fillText('nehmend', lx, P.y + P.h / 2 + 18);
      } else ctx.fillText(t > 0 ? 'zunehmend' : 'abnehmend', lx, P.y + P.h / 2 + 10);
    }

    // Zeitachse von Mittag bis Mittag
    const x0 = 22, x1 = w - 22, ty = P.y + P.h + 48, bh = 18;
    const X = hrs => x0 + ((hrs - 12 + 24) % 24) / 24 * (x1 - x0);
    ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Mond über dem Horizont' : 'Wann steht dieser Mond über dem Horizont?', x0, ty - 22);
    // Nacht
    ctx.fillStyle = 'rgba(12,19,34,.85)'; roundRect(ctx, X(18), ty - 6, X(6) - X(18), bh + 12, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,69,.22)';
    roundRect(ctx, x0, ty - 6, X(18) - x0, bh + 12, 6); ctx.fill();
    roundRect(ctx, X(6), ty - 6, x1 - X(6), bh + 12, 6); ctx.fill();
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillStyle = C.muted; ctx.fillText('Tag', (x0 + X(18)) / 2, ty + bh + 22); ctx.fillText('Tag', (X(6) + x1) / 2, ty + bh + 22);
    ctx.fillText(narrow ? 'Nacht' : 'Nacht (vereinfacht)', (X(18) + X(6)) / 2, ty + bh + 22);
    // Stunden
    ctx.fillStyle = C.muted;
    for (const hr of [12, 18, 0, 6]) {
      ctx.fillText(String(hr).padStart(2, '0'), X(hr) + (hr === 12 ? 8 : 0), ty + bh + 40);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(hr), ty + bh + 6); ctx.lineTo(X(hr), ty + bh + 28); ctx.stroke();
    }
    ctx.fillText('12', x1 - 8, ty + bh + 40);
    if (!G.guessed) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
      roundRect(ctx, x0 + 4, ty, x1 - x0 - 8, bh, 9); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'Erst raten' : 'Erst raten, dann siehst du es', (x0 + x1) / 2, ty + bh / 2 + 4);
      return;
    }
    // Mond über dem Horizont: rund 12 Stunden ab Aufgang
    const rise = riseH(G.day), set = (rise + 12) % 24;
    const a = X(rise), b = X(set);
    ctx.fillStyle = C.glow;
    const seg = (p, q) => { if (q - p > 1) { roundRect(ctx, p, ty, q - p, bh, 9); ctx.fill(); } };
    if (b > a) seg(a, b); else { seg(x0, b); seg(a, x1); }
    ctx.fillStyle = C.fg; ctx.font = `10px ${MONO}`;
    const lab = (x, txt) => { ctx.textAlign = x < x0 + 40 ? 'left' : x > x1 - 40 ? 'right' : 'center'; ctx.fillText(txt, x, ty - 8); };
    if (G.verdict !== 'none' || elongDeg(G.day) > 90) {
      lab(a, (narrow ? '↑ ' : 'Aufgang ') + hhmm(rise));
      if (Math.abs(b - a) > (narrow ? 90 : 130)) lab(b, (narrow ? '↓ ' : 'Untergang ') + hhmm(set));
    } else lab(a, 'Aufgang ' + hhmm(rise));
  };

  /* ---------- Teil 3: Mondfinsternis in der Seitenansicht ---------- */
  const eclCv = $('#eclCv');
  const INC = 5.1, STEP = 30.67, U0 = -160;      // Bahnneigung, Verschiebung des Knotens pro Vollmond (Grad)
  const UMBRA = .69, PEN = 1.25, MOONR = .26;     // Winkelradien in Grad, gerundet
  const E = { n: 1, play: false, acc: 0 };
  const betaFull = n => INC * Math.sin((U0 + n * STEP) * DEG);
  const betaNew = n => -INC * Math.sin((U0 + n * STEP - 15.3) * DEG);
  const kind = b => { const a = Math.abs(b); return a < UMBRA - MOONR ? 'total' : a < UMBRA + MOONR ? 'partial' : a < PEN + MOONR ? 'pen' : 'none'; };
  const KIND = { total: 'totale Finsternis', partial: 'teilweise Finsternis', pen: 'nur Halbschatten', none: 'keine Finsternis' };
  const updEcl = () => {
    $('#nIn').value = E.n; $('#nOut').textContent = `${E.n} von 37`;
    const b = betaFull(E.n), k = kind(b);
    $('#eOff').textContent = Math.abs(b) < .05 ? 'genau in der Mitte' : `${fmt(Math.abs(b), 1)}° ${b > 0 ? 'darüber' : 'darunter'}`;
    $('#eRes').textContent = KIND[k];
    $('#eNew').textContent = Math.abs(betaNew(E.n)) < 1.4 ? 'Sonnenfinsternis' : 'keine Finsternis';
    $('#eclStatus').textContent = {
      total: 'Volltreffer: Der Mond liegt ganz im Kernschatten der Erde und leuchtet kupferrot.',
      partial: 'Der Mond streift den Kernschatten. Ein Teil von ihm wird dunkel.',
      pen: 'Der Mond streift nur den Halbschatten. Er wird etwas matter, viele merken es gar nicht.',
      none: 'Der Mond zieht am Erdschatten vorbei. Ein ganz normaler Vollmond.',
    }[k];
  };
  const setN = n => { E.n = clamp(n, 1, 37); updEcl(); };
  $('#nIn').addEventListener('input', e => { E.play = false; $('#eclPlay').textContent = 'Drei Jahre abspielen'; setN(+e.target.value); });
  $('#eclPlay').addEventListener('click', () => {
    E.play = !E.play; E.acc = 0;
    if (E.play && E.n >= 37) setN(1);
    $('#eclPlay').textContent = E.play ? 'Anhalten' : 'Drei Jahre abspielen';
  });
  $('#eclNext').addEventListener('click', () => {
    E.play = false; $('#eclPlay').textContent = 'Drei Jahre abspielen';
    for (let i = 1; i <= 37; i++) { const n = (E.n - 1 + i) % 37 + 1; if (kind(betaFull(n)) === 'total' || kind(betaFull(n)) === 'partial') { setN(n); return; } }
  });
  updEcl();

  const drawEcl = dt => {
    if (E.play) {
      E.acc += dt;
      if (E.acc > 1) { E.acc = 0; if (E.n >= 37) { E.play = false; $('#eclPlay').textContent = 'Drei Jahre abspielen'; } else setN(E.n + 1); }
    }
    const { ctx, w, h } = fit(eclCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 480;
    const cy = h / 2 + 14, s = (h / 2 - 40) / 5.4;          // Pixel pro Grad, senkrecht stark vergrössert
    const xN = w * (narrow ? .25 : .27), xE = w * .48, xF = w * (narrow ? .7 : .76);
    const re = narrow ? 15 : 20, rm = MOONR * s;
    const bF = betaFull(E.n), bN = betaNew(E.n);
    const yF = cy - bF * s, yN = cy - bN * s;

    // Sonne links
    const g = ctx.createRadialGradient(-30, cy, 10, -30, cy, 90);
    g.addColorStop(0, 'rgba(255,200,69,.95)'); g.addColorStop(.45, 'rgba(255,200,69,.45)'); g.addColorStop(1, 'rgba(255,200,69,0)');
    ctx.fillStyle = g; ctx.fillRect(0, cy - 90, 70, 180);
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.glow; ctx.textAlign = 'left';
    ctx.fillText('Sonne', 8, cy - 70);
    // Ebene der Erdbahn
    ctx.setLineDash([4, 5]); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, cy); ctx.lineTo(w - 8, cy); ctx.stroke(); ctx.setLineDash([]);
    // Schatten der Erde (Halbschatten und Kernschatten)
    const xEnd = w - 4, kx = (xEnd - xE) / (xF - xE);
    const cone = (rEnd, fill, stroke) => {
      const r2 = re + (rEnd - re) * kx;
      ctx.beginPath(); ctx.moveTo(xE, cy - re); ctx.lineTo(xEnd, cy - r2); ctx.lineTo(xEnd, cy + r2); ctx.lineTo(xE, cy + re); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.setLineDash([3, 4]); ctx.beginPath();
      ctx.moveTo(xE, cy - re); ctx.lineTo(xEnd, cy - r2); ctx.moveTo(xE, cy + re); ctx.lineTo(xEnd, cy + r2); ctx.stroke(); ctx.setLineDash([]);
    };
    cone(PEN * s, 'rgba(0,0,0,.08)', C.line);
    cone(UMBRA * s, 'rgba(60,10,10,.22)', C.muted);
    // Mondbahn
    const dx = xF - xN, dy = yF - yN;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xN - dx * .12, yN - dy * .12); ctx.lineTo(xF + dx * .12, yF + dy * .12); ctx.stroke();
    // Erde
    halfBall(ctx, xE, cy, re, EARTH, EARTH_N);
    // Neumond
    halfBall(ctx, xN, yN, Math.max(rm, 5), LIT, DARK);
    const solar = Math.abs(bN) < 1.4;
    // Vollmond mit Schatten
    ctx.save(); ctx.beginPath(); ctx.arc(xF, yF, rm, 0, TAU); ctx.clip();
    ctx.fillStyle = LIT; ctx.fillRect(xF - rm, yF - rm, rm * 2, rm * 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(xF - rm, cy - PEN * s, rm * 2, PEN * s * 2);
    ctx.fillStyle = BLOOD; ctx.fillRect(xF - rm, cy - UMBRA * s, rm * 2, UMBRA * s * 2);
    ctx.restore();
    // Beschriftung
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText('Erde', xE, cy + re + 14);
    const below = (x, y, txt, up) => ctx.fillText(txt, x, up ? y - 12 : y + 18);
    below(xN, yN, 'Neumond', yN > cy);
    below(xF, yF, 'Vollmond', yF > cy);
    if (solar) { ctx.fillStyle = C.glow; ctx.font = `500 10px ${MONO}`; below(xN, yN, narrow ? 'Sonnenfinst.' : 'Sonnenfinsternis', yN <= cy); }
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Erdbahn-Ebene' : 'Ebene der Erdbahn', 44, cy + 14);
    ctx.fillText(narrow ? 'Winkel übertrieben' : 'Blick von der Seite · Winkel stark übertrieben', 8, h - 10);
    ctx.textAlign = 'right';
    ctx.fillText('Erdschatten', w - 8, cy + Math.max(PEN * s, re) + 16);

    // Inset: der Vollmond von der Erde aus
    const iw = narrow ? 74 : 96, ix = w - iw - 10, iy = 10;
    sky(ctx, ix, iy, iw, iw, 10);
    const ir = iw * .24, icx = ix + iw / 2, icy = iy + iw / 2 + 6;
    ctx.save(); ctx.beginPath(); ctx.arc(icx, icy, ir, 0, TAU); ctx.clip();
    ctx.fillStyle = LIT; ctx.fillRect(icx - ir, icy - ir, ir * 2, ir * 2);
    const sc = ir / MOONR, oy = icy + bF * sc;             // Schattenmitte liegt um β unter dem Mond
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(icx, oy, PEN * sc, 0, TAU); ctx.fill();
    ctx.fillStyle = BLOOD; ctx.beginPath(); ctx.arc(icx, oy, UMBRA * sc, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(icx, icy, ir, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `9px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('von der Erde', icx, iy + 13);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('mondphasen', 4, {
    orbLock: () => { ['#dayIn', '#orbPlay', '#orbHalf', '#orbFull'].forEach(s => $(s).disabled = false); },
    guessLock: () => { ['#zuBtn', '#abBtn', '#nextBtn', '#gIn'].forEach(s => $(s).disabled = false); },
    eclLock: () => { ['#nIn', '#eclPlay', '#eclNext'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawOrbit(dt); drawGuess(); drawEcl(dt); });
})();
