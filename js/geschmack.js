/* mindblow – Lektion Geschmack */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Zunge, Geschmäcke, Sensoren
  const TONGUE = '#e48b93', TONGUE_D = '#c86a74', OLF = '#e2b93b', HOT = '#e0453a', COLD = '#3f9be0';
  const TASTES = [
    { n: 'süss', c: '#e8559a' },
    { n: 'sauer', c: '#b8b020' },
    { n: 'salzig', c: '#4f97e0' },
    { n: 'bitter', c: '#8d5bd6' },
    { n: 'umami', c: '#e0823a' },
  ];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  let time = 0;

  /* ---------- Teil 1: Zunge und Geschmacksknospen ---------- */
  const tongueCv = $('#tongueCv');
  const FOODS = {
    honig: { n: 'Honig', p: [1, .1, 0, 0, 0], msg: 'Honig: süss. Für den Körper heisst das: Hier gibt es Energie.' },
    zitrone: { n: 'Zitrone', p: [.15, 1, 0, .2, 0], msg: 'Zitrone: vor allem sauer. Sauer meldet Säure, etwa in unreifen oder verdorbenen Früchten.' },
    brezel: { n: 'Salzbrezel', p: [.1, 0, 1, 0, .12], msg: 'Salzbrezel: salzig. Salz liefert Natrium, das deine Nerven und Muskeln brauchen.' },
    kaffee: { n: 'Kaffee', p: [0, .3, 0, 1, 0], msg: 'Schwarzer Kaffee: bitter und etwas sauer. Bitter kann vor Giften warnen. Mehr dazu in Teil 4.' },
    parmesan: { n: 'Parmesan', p: [.05, .1, .7, .15, 1], msg: 'Parmesan: umami und salzig. Umami kommt vor allem von Glutamat, einem Baustein von Eiweiss.' },
    tomate: { n: 'Tomate', p: [.4, .5, .15, 0, .55], msg: 'Reife Tomate: eine Mischung aus umami, süss und sauer.' },
  };
  const T1 = { food: 'honig', conc: .6, map: false };
  // Form der Zunge: v = 0 hinten, v = 1 Spitze; Rückgabe: halbe Breite (0..1)
  const halfW = v => v < .62 ? 1 - .12 * v : (1 - .12 * .62) * Math.sqrt(Math.max(0, 1 - ((v - .62) / .38) ** 2));
  const BUDS = [];
  while (BUDS.length < 150) {
    const v = .05 + rnd() * .92, u = (rnd() * 2 - 1);
    if (Math.abs(u) > .9 * halfW(v) - .03) continue;
    BUDS.push({ u, v, thr: TASTES.map(() => .06 + rnd() * .85), ph: rnd() * TAU });
  }
  const activeOf = b => { const f = FOODS[T1.food].p; return TASTES.map((_, i) => T1.conc * f[i] > b.thr[i]); };
  const updTongue = () => {
    const f = FOODS[T1.food].p;
    $('#concOut').textContent = `${Math.round(T1.conc * 100)} %`;
    const order = f.map((x, i) => [x, i]).filter(x => x[0] > .3).sort((a, b) => b[0] - a[0]);
    $('#tStrong').textContent = order.slice(0, 2).map(x => TASTES[x[1]].n).join(', ');
    let n = 0, front = 0;
    BUDS.forEach(b => { if (activeOf(b).some(Boolean)) { n++; if (b.v > .5) front++; } });
    $('#tBuds').textContent = `${n} von ${BUDS.length}`;
    $('#tWhere').textContent = n ? `${Math.round(front / n * 100)} / ${100 - Math.round(front / n * 100)} %` : '–';
  };
  $$('#foodSel button').forEach(b => b.addEventListener('click', () => {
    T1.food = b.dataset.f;
    $$('#foodSel button').forEach(x => x.classList.toggle('active', x === b));
    $('#tongueStatus').textContent = FOODS[T1.food].msg + ' Die Knospen leuchten überall auf der Zunge.';
    updTongue();
  }));
  $('#concIn').addEventListener('input', e => {
    T1.conc = +e.target.value / 100; updTongue();
    $('#tongueStatus').textContent = T1.conc < .25
      ? 'Wenig davon: Nur die empfindlichsten Knospen reagieren. Und die liegen verstreut über die ganze Zunge.'
      : 'Je mehr davon im Mund ist, desto mehr Knospen melden sich. Vorne und hinten etwa gleich.';
  });
  $('#mapBtn').addEventListener('click', () => {
    T1.map = !T1.map;
    $('#mapBtn').textContent = T1.map ? 'Zungenkarte ausblenden' : 'Alte Zungenkarte zeigen';
    $('#tongueStatus').textContent = T1.map
      ? 'So stand es früher in Schulbüchern. Vergleiche mit den leuchtenden Knospen: Sie halten sich nicht an die Zonen.'
      : FOODS[T1.food].msg;
  });
  updTongue();

  const drawTongue = () => {
    const { ctx, w, h } = fit(tongueCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const tw = w * (narrow ? .56 : .58);
    const cx = tw * .52, top = 30, TH = h - 54, HW = Math.min(tw * .44, TH * .36);
    const P = (u, v) => [cx + u * HW * halfW(v), top + v * TH];
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(...P(-1, 0));
      ctx.quadraticCurveTo(cx, top - 16, ...P(1, 0));
      for (let i = 1; i <= 60; i++) ctx.lineTo(...P(1, i / 60));
      for (let i = 60; i >= 0; i--) ctx.lineTo(...P(-1, i / 60));
      ctx.closePath();
    };
    path(); ctx.fillStyle = TONGUE; ctx.fill();
    // Mittelfurche
    ctx.strokeStyle = TONGUE_D; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, top + TH * .12); ctx.quadraticCurveTo(cx + 3, top + TH * .5, cx, top + TH * .8); ctx.stroke();
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('hinten (Rachen)', cx, 13);
    ctx.fillText('Spitze', cx, h - 8);

    // Alte Zungenkarte
    if (T1.map) {
      ctx.save(); path(); ctx.clip();
      const X0 = cx - HW, X1 = cx + HW, Y = v => top + v * TH, sideW = HW * .55;
      const zone = (x, y0, y1, ww, c) => { ctx.fillStyle = c; ctx.globalAlpha = .45; ctx.fillRect(x, Y(y0), ww, Y(y1) - Y(y0)); };
      zone(X0, -.1, .27, 2 * HW, TASTES[3].c);
      zone(X0, .27, .55, sideW, TASTES[1].c); zone(X1 - sideW, .27, .55, sideW, TASTES[1].c);
      zone(X0, .55, .8, sideW, TASTES[2].c); zone(X1 - sideW, .55, .8, sideW, TASTES[2].c);
      zone(X0, .8, 1.01, 2 * HW, TASTES[0].c);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // Knospen
    const r = narrow ? 2.6 : 3.2;
    let act = TASTES.map(() => 0);
    BUDS.forEach(b => {
      const [x, y] = P(b.u, b.v);
      const a = activeOf(b), on = a.map((q, i) => q ? i : -1).filter(i => i >= 0);
      if (!on.length) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = TONGUE_D; ctx.fill();
        return;
      }
      on.forEach(i => act[i]++);
      const pulse = reduced ? 1 : .85 + .15 * Math.sin(time * 4 + b.ph);
      const R = r * 1.55 * pulse;
      ctx.save(); ctx.shadowColor = TASTES[on[0]].c; ctx.shadowBlur = 8;
      on.forEach((i, k) => {
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.arc(x, y, R, -Math.PI / 2 + TAU * k / on.length, -Math.PI / 2 + TAU * (k + 1) / on.length);
        ctx.closePath(); ctx.fillStyle = TASTES[i].c; ctx.fill();
      });
      ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.stroke();
    });

    if (T1.map) {
      ctx.save(); ctx.translate(cx, top + TH * .45); ctx.rotate(-.35);
      ctx.font = `700 ${narrow ? 22 : 30}px ${MONO}`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = C.surface; ctx.strokeText('FALSCH', 0, 0);
      ctx.fillStyle = C.bad; ctx.fillText('FALSCH', 0, 0);
      ctx.restore();
      ctx.font = `10px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
      const lab = (t, v) => { const [, y] = P(0, v); ctx.fillText(t, cx, y); };
      lab('bitter', .14); lab('süss', .9);
      ctx.textAlign = 'left';
      ctx.fillText('sauer', P(-1, .42)[0] + 3, P(0, .42)[1] + (narrow ? 22 : 0));
      ctx.fillText('salzig', P(-1, .68)[0] + 4, P(0, .68)[1]);
    }

    // Vergrösserte Knospe
    const ix = tw + (w - tw) / 2, R = Math.min((w - tw) * .34, h * .17), iy = 46 + R;
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText(narrow ? '1 Knospe' : 'Eine Knospe, gross', ix, 20);
    ctx.beginPath(); ctx.ellipse(ix, iy, R * .82, R, 0, 0, TAU); ctx.fillStyle = TONGUE; ctx.fill();
    ctx.strokeStyle = TONGUE_D; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(ix, iy - R + 2, 4, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
    TASTES.forEach((t, i) => {
      const ang = -.7 + 1.4 * i / 4, on = act[i] > 0;
      ctx.save(); ctx.translate(ix, iy + R * .55); ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(0, -R * .7, R * .14, R * .62, 0, 0, TAU);
      ctx.globalAlpha = on ? 1 : .35;
      if (on && !reduced) { ctx.shadowColor = t.c; ctx.shadowBlur = 10 + 4 * Math.sin(time * 5 + i); }
      ctx.fillStyle = t.c; ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    // Legende
    ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
    const lx = ix - (narrow ? 34 : 42);
    TASTES.forEach((t, i) => {
      const y = iy + R + 30 + i * 19, on = act[i] > 0;
      ctx.beginPath(); ctx.arc(lx, y - 4, 5, 0, TAU); ctx.fillStyle = t.c; ctx.globalAlpha = on ? 1 : .35; ctx.fill();
      ctx.fillStyle = on ? C.fg : C.muted; ctx.globalAlpha = 1;
      ctx.fillText(t.n, lx + 11, y);
    });
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    const ly = iy + R + 30 + 5 * 19 + 6;
    if (ly + 24 < h) {
      ctx.fillText('Zellen für', ix, ly); ctx.fillText('alle fünf', ix, ly + 13);
    }
  };

  /* ---------- Teil 2: Riechen von hinten ---------- */
  const noseCv = $('#noseCv');
  const AROMA = {
    erdbeere: { n: 'Erdbeere', tongue: 'süss, leicht sauer', ts: .45, smell: 'Erdbeere, fruchtig', blind: 'etwas Süss-Saures', c: '#e0364a' },
    vanille: { n: 'Vanille', tongue: 'süss', ts: .4, smell: 'Vanille', blind: 'einfach süss', c: '#f0dca0' },
    zimt: { n: 'Zimt', tongue: 'kaum etwas', ts: .08, smell: 'Zimt, würzig', blind: 'Staub? Fast nichts', c: '#a0623a' },
    apfel: { n: 'Apfel', tongue: 'süss, sauer', ts: .4, smell: 'Apfel, frisch', blind: 'knackig, süss. Zwiebel?', c: '#8cc04a' },
    zwiebel: { n: 'Zwiebel', tongue: 'leicht süss', ts: .3, smell: 'Zwiebel, stechend', blind: 'knackig, süss. Apfel?', c: '#e6dccb' },
  };
  const N2 = { food: 'erdbeere', nose: 1, mode: 'open', chew: 0 };
  const PARTS = Array.from({ length: 36 }, (_, i) => ({ s: i / 36, pass: rnd() < 1, jit: rnd() - .5, sp: .8 + rnd() * .4 }));
  const knowOf = () => {
    const a = AROMA[N2.food];
    if (N2.nose > .6) return a.n;
    if (N2.nose > .3) return `vielleicht ${a.n}?`;
    return a.blind;
  };
  const updNose = () => {
    const a = AROMA[N2.food];
    $('#noseIn').value = Math.round(N2.nose * 100);
    $('#noseOut').textContent = `${Math.round(N2.nose * 100)} %`;
    $('#nTongue').textContent = a.tongue;
    $('#nNose').textContent = N2.nose > .6 ? a.smell : N2.nose > .3 ? 'schwach' : 'fast nichts';
    $('#nKnow').textContent = knowOf();
  };
  const noseMsg = () => {
    const a = AROMA[N2.food];
    if (N2.mode === 'cold') return `Schnupfen: Die Schleimhaut ist geschwollen. Die Zunge meldet weiter «${a.tongue}», aber das Aroma fehlt.`;
    if (N2.nose <= .3) return `Nase zu: Keine Luft strömt hinten hoch zu den Riechzellen. Übrig bleibt: «${a.blind}».`;
    if (N2.nose <= .6) return 'Nur wenig Luft kommt durch. Du ahnst es, bist aber unsicher.';
    return `Nase frei: Die Duftstoffe erreichen die Riechzellen. Du erkennst: ${a.n}.`;
  };
  $$('#aromaSel button').forEach(b => b.addEventListener('click', () => {
    N2.food = b.dataset.f;
    $$('#aromaSel button').forEach(x => x.classList.toggle('active', x === b));
    updNose(); $('#noseStatus').textContent = noseMsg();
  }));
  $('#noseIn').addEventListener('input', e => {
    N2.nose = +e.target.value / 100; N2.mode = N2.nose < .5 ? 'pinch' : 'open';
    updNose(); $('#noseStatus').textContent = noseMsg();
  });
  const setNose = (v, m) => () => { N2.nose = v; N2.mode = m; updNose(); $('#noseStatus').textContent = noseMsg(); };
  $('#nOpen').addEventListener('click', setNose(1, 'open'));
  $('#nPinch').addEventListener('click', setNose(0, 'pinch'));
  $('#nCold').addEventListener('click', setNose(.12, 'cold'));
  updNose();

  // Weg der Duftstoffe: Essen → hinten im Mund → Rachen hoch → Riechzellen
  const PATH = [[.34, .66], [.6, .64], [.79, .58], [.8, .4], [.79, .24], [.62, .2], [.47, .13]];
  const PLEN = []; let PTOT = 0;
  for (let i = 0; i < PATH.length - 1; i++) { const l = Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]); PLEN.push(l); PTOT += l; }
  const along = s => {
    let d = clamp(s, 0, 1) * PTOT, i = 0;
    while (i < PLEN.length - 1 && d > PLEN[i]) { d -= PLEN[i]; i++; }
    const k = clamp(d / PLEN[i], 0, 1);
    return [lerp(PATH[i][0], PATH[i + 1][0], k), lerp(PATH[i][1], PATH[i + 1][1], k)];
  };
  const S_BLOCK = .5;
  let olfGlow = 0;

  const drawNose = dt => {
    const { ctx, w, h } = fit(noseCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const a = AROMA[N2.food];
    const ox = 8, W = w - 16, oy = 8, H = h * .68;
    const X = u => ox + u * W, Y = v => oy + v * H;
    if (!reduced) N2.chew += dt * 2.4;
    const chew = reduced ? 0 : Math.max(0, Math.sin(N2.chew * Math.PI));

    // Hohlräume
    ctx.fillStyle = C.sunk;
    roundRect(ctx, X(.12), Y(.08), X(.74) - X(.12), Y(.34) - Y(.08), 16); ctx.fill();
    ctx.fillRect(X(.04), Y(.22), X(.14) - X(.04), Y(.32) - Y(.22));
    roundRect(ctx, X(.12), Y(.5), X(.74) - X(.12), Y(.8) - Y(.5), 16); ctx.fill();
    ctx.fillRect(X(.04), Y(.58), X(.14) - X(.04), Y(.7) - Y(.58));
    roundRect(ctx, X(.72), Y(.14), X(.87) - X(.72), Y(1) - Y(.14), 14); ctx.fill();
    ctx.fillRect(X(.7), Y(.16), X(.74) - X(.7), Y(.32) - Y(.16));
    ctx.fillRect(X(.7), Y(.52), X(.74) - X(.7), Y(.78) - Y(.52));
    // Gaumen
    ctx.fillStyle = C.line; roundRect(ctx, X(.12), Y(.38), X(.72) - X(.12), Y(.46) - Y(.38), 6); ctx.fill();
    // Zunge
    ctx.beginPath(); ctx.moveTo(X(.16), Y(.8));
    ctx.quadraticCurveTo(X(.2), Y(.66 - .02 * chew), X(.42), Y(.67 - .02 * chew));
    ctx.quadraticCurveTo(X(.66), Y(.66), X(.7), Y(.8)); ctx.closePath();
    const tGlow = a.ts;
    ctx.save(); if (!reduced) { ctx.shadowColor = TASTES[0].c; ctx.shadowBlur = 14 * tGlow; }
    ctx.fillStyle = TONGUE; ctx.fill(); ctx.restore();
    // Essen
    ctx.beginPath(); ctx.ellipse(X(.34), Y(.6), 12 + 3 * chew, 9 - 2 * chew, 0, 0, TAU);
    ctx.fillStyle = a.c; ctx.fill(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.stroke();
    // Riechzellen
    olfGlow = lerp(olfGlow, N2.nose, reduced ? 1 : Math.min(1, dt * 3));
    ctx.save(); if (!reduced) { ctx.shadowColor = OLF; ctx.shadowBlur = 18 * olfGlow; }
    ctx.fillStyle = OLF; ctx.globalAlpha = .35 + .65 * olfGlow;
    roundRect(ctx, X(.34), Y(.08), X(.6) - X(.34), Math.max(6, Y(.13) - Y(.08)), 4); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
    // Schnupfen: geschwollene Schleimhaut
    if (N2.mode === 'cold') {
      ctx.fillStyle = '#d98a8a';
      for (const [u, v, rx, ry] of [[.2, .31, .07, .05], [.36, .32, .08, .05], [.52, .31, .08, .05], [.66, .3, .06, .05], [.28, .1, .06, .03], [.66, .11, .06, .04], [.79, .28, .05, .06]]) {
        ctx.beginPath(); ctx.ellipse(X(u), Y(v), rx * W * .6, ry * H, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,220,150,.8)';
      ctx.beginPath(); ctx.ellipse(X(.79), Y(.38), W * .03, H * .05, 0, 0, TAU); ctx.fill();
    }
    // Nase zuhalten
    if (N2.mode === 'pinch' && N2.nose < .5) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(.075), Y(.19)); ctx.lineTo(X(.075), Y(.35)); ctx.moveTo(X(.105), Y(.19)); ctx.lineTo(X(.105), Y(.35)); ctx.stroke();
    }

    // Duftstoffe
    ctx.fillStyle = a.c === '#e6dccb' || a.c === '#f0dca0' ? C.copper : a.c;
    PARTS.forEach(p => {
      if (!reduced) {
        p.s += dt * .22 * p.sp;
        if (p.s > (p.pass ? 1 : S_BLOCK + .12)) { p.s = 0; p.pass = rnd() < N2.nose; }
      }
      if (reduced) p.pass = (p.jit + .5) < N2.nose;
      let s = p.s, alpha = .9;
      if (!p.pass && s > S_BLOCK) { alpha = .9 * (1 - (s - S_BLOCK) / .12); s = S_BLOCK; }
      if (s > .9) alpha *= (1 - s) / .1;
      if (reduced && !p.pass && p.s > S_BLOCK) alpha = 0;
      const [u, v] = along(s);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.beginPath(); ctx.arc(X(u + p.jit * .03), Y(v + p.jit * .02), 3.2, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Beschriftung
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Nase', X(.3), Y(.23));
    ctx.fillText('Mund', X(.52), Y(.57));
    ctx.fillText('Gaumen', X(.42), Y(.43) + 3);
    ctx.save(); ctx.translate(X(.85), Y(.72)); ctx.rotate(-Math.PI / 2); ctx.fillText('Rachen', 0, 0); ctx.restore();
    ctx.fillStyle = C.fg; ctx.font = `500 10px ${MONO}`;
    ctx.fillText(narrow ? 'Riechzellen' : 'Riechzellen → Gehirn', X(.47), Y(.08) - 2 > 10 ? Y(.08) - 2 : 10);
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    if (!narrow) { ctx.fillText('vorne', X(.0) + 2, Y(.48)); ctx.fillText('hinten', X(.88), Y(.1)); }

    // Balken: Zunge und Nase
    const bx = narrow ? 58 : 70, bw = w - bx - 14, by = oy + H + 18;
    ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
    const bar = (y, lbl, val, col) => {
      ctx.fillStyle = C.fg; ctx.fillText(lbl, 10, y + 9);
      ctx.fillStyle = C.sunk; roundRect(ctx, bx, y, bw, 12, 6); ctx.fill();
      if (val > .01) { ctx.fillStyle = col; roundRect(ctx, bx, y, Math.max(12, bw * val), 12, 6); ctx.fill(); }
    };
    bar(by, 'Zunge', a.ts, TASTES[0].c);
    bar(by + 24, 'Nase', olfGlow * .95, OLF);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText('Signal ans Gehirn (vereinfacht)', bx, by + 52);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 12 : 13}px ${MONO}`;
    ctx.fillText(`Gehirn: «${knowOf()}»`, 10, Math.min(h - 10, by + 76));
  };

  /* ---------- Teil 3: Scharf und kühl ---------- */
  const chiliCv = $('#chiliCv');
  const CHILIS = [['Gemüsepaprika', 'Paprika', 0], ['Jalapeño', 'Jalapeño', 5000], ['Cayenne', 'Cayenne', 40000], ['Habanero', 'Habanero', 200000], ['Carolina Reaper', 'Reaper', 1600000]];
  const LOGMAX = 6.3;
  const MOL_H = Array.from({ length: 26 }, () => [rnd(), rnd()]), MOL_C = Array.from({ length: 16 }, () => [rnd(), rnd()]);
  const H3 = { s: 59, mint: false, wash: 1, washT: 1, shown: 0, cold: 0, pulses: [] };
  const shuOf = s => s <= 0 ? 0 : Math.pow(10, LOGMAX * s / 100);
  const round2 = v => { if (v < 10) return Math.round(v); const p = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
  const level = () => { const v = shuOf(H3.s); return v < 1 ? 0 : clamp(Math.log10(v) / LOGMAX, 0, 1); };
  const feelOf = x => x < .3 ? 'kaum etwas' : x < .5 ? 'leicht warm' : x < .68 ? 'scharf, heiss' : x < .85 ? 'brennt stark' : 'Schmerz, Tränen';
  const heatSig = () => { const l = level(); return clamp((l - .2) / .8, 0, 1) * H3.wash; };
  const updChili = () => {
    const v = round2(shuOf(H3.s));
    $('#shuIn').value = H3.s;
    $('#shuOut').textContent = fmt(v, 0);
    $('#sShu').textContent = v >= 1e6 ? `${fmt(v / 1e6, 1)} Mio.` : fmt(v, 0);
    let best = CHILIS[0], bd = 1e9;
    const lv = Math.log10(v + 1);
    CHILIS.forEach(c => { const d = Math.abs(Math.log10(c[2] + 1) - lv); if (d < bd) { bd = d; best = c; } });
    $('#sEx').textContent = best[0];
    const hs = heatSig();
    let txt = hs < .02 ? 'kaum etwas' : feelOf(.2 + hs * .8);
    if (H3.mint) txt = hs < .15 ? 'kühl, frisch' : txt + ' und kühl';
    $('#sFeel').textContent = txt;
  };
  $('#shuIn').addEventListener('input', e => {
    H3.s = +e.target.value; H3.wash = H3.washT = 1; updChili();
    const v = shuOf(H3.s);
    $('#chiliStatus').textContent = v < 50
      ? 'Kein Capsaicin, kein Brennen. Gemüsepaprika ist mild, obwohl sie zur gleichen Pflanzenfamilie gehört.'
      : v > 500000
        ? 'Extrem scharf: Die Sensoren melden «Verbrennung!». Der Mund ist aber nur 37 °C warm. Vorsicht, solche Chilis können Bauchkrämpfe machen.'
        : 'Je mehr Capsaicin, desto mehr Wärmesensoren gehen auf. Die echte Temperatur im Mund bleibt 37 °C.';
  });
  $('#mintBtn').addEventListener('click', () => {
    H3.mint = !H3.mint;
    $('#mintBtn').textContent = H3.mint ? 'Minze weg' : 'Minze dazu';
    $('#chiliStatus').textContent = H3.mint
      ? 'Menthol öffnet die Kältesensoren. Du fühlst Kühle, obwohl es im Mund nicht kälter wird.'
      : 'Ohne Minze bleiben die Kältesensoren zu.';
    updChili();
  });
  $('#milkBtn').addEventListener('click', () => {
    H3.washT = Math.max(.1, H3.washT * .35);
    $('#chiliStatus').textContent = 'Milch hilft: Capsaicin löst sich gut in Fett, und ein Eiweiss der Milch (Kasein) bindet es zusätzlich. Es wird aus dem Mund gespült (vereinfacht).';
  });
  $('#waterBtn').addEventListener('click', () => {
    H3.washT = Math.max(.1, H3.washT * .92);
    $('#chiliStatus').textContent = 'Wasser hilft kaum. Capsaicin löst sich schlecht in Wasser und bleibt an den Nerven. Es kühlt nur kurz.';
  });
  updChili();

  const drawChili = dt => {
    const { ctx, w, h } = fit(chiliCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    // Spülen langsam angleichen
    const prevWash = H3.wash;
    H3.wash = reduced ? H3.washT : lerp(H3.wash, H3.washT, Math.min(1, dt * 2));
    if (Math.abs(prevWash - H3.wash) > .002) updChili();
    H3.cold = lerp(H3.cold, H3.mint ? 1 : 0, reduced ? 1 : Math.min(1, dt * 3));
    const hs = heatSig(), cs = H3.cold;

    // --- Scoville-Skala ---
    const sx0 = 18, sx1 = w - 18, sy = 62;
    const SX = v => sx0 + (v < 1 ? 0 : clamp(Math.log10(v) / LOGMAX, 0, 1)) * (sx1 - sx0);
    const grd = ctx.createLinearGradient(sx0, 0, sx1, 0);
    grd.addColorStop(0, '#7fbf4a'); grd.addColorStop(.5, '#e8b23a'); grd.addColorStop(.8, '#e0603a'); grd.addColorStop(1, '#b0202a');
    ctx.fillStyle = grd; roundRect(ctx, sx0, sy - 5, sx1 - sx0, 10, 5); ctx.fill();
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Scoville (jeder Strich: ×100)', (sx0 + sx1) / 2, 14);
    for (const v of [1, 100, 1e4, 1e6]) {
      const x = SX(v); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, sy + 6); ctx.lineTo(x, sy + 10); ctx.stroke();
    }
    CHILIS.forEach((c, i) => {
      const x = SX(c[2]), up = i % 2 === 0;
      ctx.beginPath(); ctx.arc(x, sy, 5, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = `10px ${MONO}`;
      ctx.textAlign = i === 0 ? 'left' : i === CHILIS.length - 1 ? 'right' : 'center';
      const tx = i === 0 ? x - 4 : i === CHILIS.length - 1 ? x + 4 : x;
      ctx.fillText(narrow ? c[1] : c[0], tx, up ? sy - 14 : sy + 24);
      if (!narrow) { ctx.fillStyle = C.muted; ctx.fillText(c[2] ? (c[2] >= 1e6 ? `${fmt(c[2] / 1e6, 1)} Mio.` : fmt(c[2], 0)) : '0', tx, up ? sy - 26 : sy + 36); }
    });
    // aktuelle Chili
    const cur = shuOf(H3.s), cx = SX(cur);
    ctx.beginPath(); ctx.moveTo(cx, sy + 8); ctx.lineTo(cx - 6, sy + 18); ctx.lineTo(cx + 6, sy + 18); ctx.closePath();
    ctx.fillStyle = C.accent; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, sy, 7, 0, TAU); ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.stroke();

    // --- Nervenende mit Sensoren ---
    const my = 222, mx0 = 16, mx1 = w - 16;
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Mundraum', mx0, 124);
    ctx.fillText('Nervenende', mx0 + 4, my + 44);
    ctx.fillStyle = C.sunk; ctx.fillRect(mx0, my + 8, mx1 - mx0, 40);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx0, my); ctx.lineTo(mx1, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx0, my + 8); ctx.lineTo(mx1, my + 8); ctx.stroke();
    // Moleküle im Mund
    const nCap = Math.round(hs * 26), nMen = Math.round(cs * 16);
    const mol = (arr, col, n) => {
      for (let i = 0; i < n; i++) {
        const [fx, fy] = arr[i], x = mx0 + 10 + fx * (mx1 - mx0 - 20);
        const y = 136 + fy * 64 + (reduced ? 0 : 4 * Math.sin(time * 1.5 + i * 1.7));
        ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fillStyle = col; ctx.fill();
      }
    };
    mol(MOL_H, HOT, nCap); mol(MOL_C, COLD, nMen);
    // Kanäle
    const nCh = narrow ? 6 : 8, gap = (mx1 - mx0) / nCh;
    for (let i = 0; i < nCh; i++) {
      const isHot = i % 2 === 0, x = mx0 + gap * (i + .5);
      const open = isHot ? hs : cs;
      const col = isHot ? HOT : COLD, half = 4 + 5 * open;
      ctx.fillStyle = col; ctx.globalAlpha = .5 + .5 * Math.min(1, open * 2);
      roundRect(ctx, x - half - 6, my - 10, 6, 28, 3); ctx.fill();
      roundRect(ctx, x + half, my - 10, 6, 28, 3); ctx.fill();
      ctx.globalAlpha = 1;
      if (open > .15) {
        for (let k = 0; k < 3; k++) {
          const q = reduced ? k / 3 : (time * (.8 + open) + k / 3 + i * .17) % 1;
          ctx.globalAlpha = Math.sin(q * Math.PI) * Math.min(1, open * 1.5);
          ctx.beginPath(); ctx.arc(x, my - 14 + q * 40, 2.4, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillStyle = HOT; ctx.fillText(narrow ? '■ TRPV1: Hitze' : '■ TRPV1: Hitze und Schmerz', mx0, my + 66);
    ctx.fillStyle = COLD; ctx.textAlign = 'right'; ctx.fillText(narrow ? '■ TRPM8: Kälte' : '■ TRPM8: Kälte', mx1, my + 66);
    // Nervensignale
    const rate = hs * 6 + cs * 3;
    if (!reduced && rate > .2 && Math.random() < rate * dt) H3.pulses.push(0);
    H3.pulses = H3.pulses.map(p => p + dt * .7).filter(p => p < 1);
    ctx.fillStyle = C.glow;
    for (const p of H3.pulses) { ctx.beginPath(); ctx.arc(lerp(mx0 + 6, mx1 - 6, p), my + 28, 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText('ans Gehirn →', mx1 - 4, my + 44);

    // --- Echte Temperatur vs. Meldung ---
    const tx0 = narrow ? 82 : 140, tx1 = w - 18, ty = my + 98;
    ctx.font = `11px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText(narrow ? 'Echt' : 'Echte Temperatur', 16, ty + 9);
    ctx.fillText(narrow ? 'Gemeldet' : 'Nerven melden', 16, ty + 45);
    const g2 = ctx.createLinearGradient(tx0, 0, tx1, 0);
    g2.addColorStop(0, COLD); g2.addColorStop(.5, C.sunk); g2.addColorStop(1, HOT);
    for (const y of [ty, ty + 36]) { ctx.fillStyle = g2; ctx.globalAlpha = .55; roundRect(ctx, tx0, y, tx1 - tx0, 12, 6); ctx.fill(); }
    ctx.globalAlpha = 1;
    const mark = (pos, y, col, lab) => {
      const x = lerp(tx0, tx1, clamp(pos, 0, 1));
      ctx.beginPath(); ctx.arc(x, y + 6, 8, 0, TAU); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = C.surface; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = `500 10px ${MONO}`; ctx.textAlign = pos > .75 ? 'right' : pos < .25 ? 'left' : 'center';
      ctx.fillText(lab, pos > .75 ? x + 8 : pos < .25 ? x - 8 : x, y + 28);
    };
    mark(.5, ty, C.fg, '37 °C');
    const rep = .5 + .5 * hs - .4 * cs;
    const repLab = hs < .05 && cs < .1 ? 'normal' : rep < .38 ? 'kühl' : rep > .85 ? 'Hitze, Schmerz!' : rep > .6 ? 'heiss' : cs > .5 ? 'heiss und kühl' : 'warm';
    mark(rep, ty + 36, rep > .55 ? HOT : rep < .45 ? COLD : C.fg, repLab);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('kalt', tx0, ty - 6); ctx.textAlign = 'right'; ctx.fillText('heiss', tx1, ty - 6);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('geschmack', 4, {
    tongueLock: () => { $('#concIn').disabled = false; $('#mapBtn').disabled = false; $$('#foodSel button').forEach(b => b.disabled = false); },
    noseLock: () => { ['#noseIn', '#nOpen', '#nPinch', '#nCold'].forEach(s => $(s).disabled = false); $$('#aromaSel button').forEach(b => b.disabled = false); },
    chiliLock: () => { ['#shuIn', '#mintBtn', '#milkBtn', '#waterBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { if (!reduced) time += dt; drawTongue(); drawNose(dt); drawChili(dt); });
})();
