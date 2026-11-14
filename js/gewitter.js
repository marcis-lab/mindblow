/* mindblow – Lektion Gewitter */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Gewitterhimmel, Blitz, Ladungen
  const SKY0 = '#20252f', SKY1 = '#3b4353', GROUND = '#2b3527', CLOUD = '#4e5565', CLOUD2 = '#646c7d';
  const BOLT = '#fff8dc', BOLTGLOW = '#bcd2ff', TXT = '#e8ebf1', TXT2 = 'rgba(232,235,241,.62)';
  const PLUS = '#e0463c', MINUS = '#3f78e6';
  const SOUND = 343;               // m/s bei rund 20 °C

  // Zickzack-Linie für einen Blitz von (x0,y0) nach (x1,y1)
  const zigzag = (x0, y0, x1, y1, n, jit) => {
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) { const k = i / n; pts.push([lerp(x0, x1, k) + rnd(-jit, jit), lerp(y0, y1, k) + rnd(-jit, jit) * .3]); }
    pts.push([x1, y1]);
    return pts;
  };
  const strokeBolt = (ctx, pts, width, alpha) => {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = BOLTGLOW; ctx.lineWidth = width * 3.2; ctx.globalAlpha = alpha * .35; ctx.stroke();
    ctx.strokeStyle = BOLT; ctx.lineWidth = width; ctx.globalAlpha = alpha; ctx.stroke();
    ctx.restore();
  };
  const cloudBlob = (ctx, x, y, s, col) => {
    ctx.fillStyle = col;
    for (const [dx, dy, r] of [[-1.1, .2, .55], [-.5, -.2, .7], [.2, -.35, .8], [.9, -.05, .65], [1.4, .25, .45], [0, .25, .7]]) {
      ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill();
    }
  };
  const person = (ctx, x, gy, s, col) => {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.6, s * .09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, gy - s * .88, s * .12, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, gy - s * .75); ctx.lineTo(x, gy - s * .38);
    ctx.moveTo(x, gy - s * .38); ctx.lineTo(x - s * .14, gy); ctx.moveTo(x, gy - s * .38); ctx.lineTo(x + s * .14, gy);
    ctx.moveTo(x - s * .2, gy - s * .55); ctx.lineTo(x, gy - s * .68); ctx.lineTo(x + s * .2, gy - s * .55);
    ctx.stroke();
  };
  const skyBg = (ctx, w, h, gy, flash) => {
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, SKY0); g.addColorStop(1, SKY1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, gy);
    ctx.fillStyle = GROUND; ctx.fillRect(0, gy, w, h - gy);
    if (flash > 0) { ctx.fillStyle = `rgba(220,230,255,${.28 * flash})`; ctx.fillRect(0, 0, w, h); }
  };

  /* ---------- Teil 1: Wie weit ist das Gewitter? ---------- */
  const distCv = $('#distCv');
  const D = { km: 3, phase: 'idle', t: 0, flash: 0, bolt: null, boltW: 0 };
  const thunderT = () => D.km * 1000 / SOUND;
  const updDist = () => {
    $('#dIn').value = Math.round(D.km * 10);
    $('#dOut').textContent = `${fmt(D.km, 1)} km`;
    $('#dLight').textContent = `${fmt(D.km * 1000 / 3e8 * 1e6, 1)} µs`;
    if (D.phase === 'idle') { $('#dSec').textContent = '–'; $('#dKm').textContent = '–'; }
    else {
      $('#dSec').textContent = `${fmt(D.t, 1)} s`;
      $('#dKm').textContent = D.phase === 'done' ? `${fmt(D.t / 3, 1)} km` : '…';
    }
  };
  const finishDist = () => {
    D.phase = 'done'; D.t = thunderT();
    const T = D.t;
    $('#distStatus').textContent = `Donner nach ${fmt(T, 1)} s. Durch 3 geteilt: ${fmt(T / 3, 1)} km, tatsächlich ${fmt(D.km, 1)} km. Durch 5 ergäbe ${fmt(T / 5, 1)}: das wären Meilen, nicht Kilometer.`;
  };
  const fireDist = () => {
    D.phase = 'run'; D.t = 0; D.flash = 1; D.bolt = null;
    $('#distStatus').textContent = 'Blitz! Jetzt zählen: einundzwanzig, zweiundzwanzig …';
    if (reduced) finishDist();
    updDist();
  };
  $('#dIn').addEventListener('input', e => {
    D.km = +e.target.value / 10; D.phase = 'idle'; D.flash = 0;
    $('#distStatus').textContent = 'Drück auf «Blitz!» und zähl mit, bis der Donner bei der Person ankommt.';
    updDist();
  });
  $('#flashBtn').addEventListener('click', fireDist);
  $('#randBtn').addEventListener('click', () => { D.km = Math.round(rnd(8, 95)) / 10; fireDist(); });
  updDist();

  const drawDist = dt => {
    const { ctx, w, h } = fit(distCv);
    const narrow = w < 440;
    const gy = h - 62, xL = narrow ? 30 : 46, xR = w - (narrow ? 22 : 34);
    const pxKm = (xR - xL) / 10, xs = xL + D.km * pxKm;
    if (D.phase === 'run') {
      D.t += dt;
      if (D.t >= thunderT()) finishDist();
      updDist();
    }
    if (!reduced && D.flash > 0) D.flash = Math.max(0, D.flash - dt * 2.4);
    skyBg(ctx, w, h, gy, D.flash);

    // Lineal
    ctx.strokeStyle = TXT2; ctx.lineWidth = 1; ctx.fillStyle = TXT2; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    for (let k = 0; k <= 10; k++) {
      const x = xL + k * pxKm;
      ctx.beginPath(); ctx.moveTo(x, gy + 4); ctx.lineTo(x, gy + (k % 5 ? 9 : 13)); ctx.stroke();
      if (!narrow || k % 2 === 0) ctx.fillText(k === 0 ? '0' : `${k}`, x, gy + 25);
    }
    ctx.textAlign = 'right'; ctx.fillText('km', xR, gy + 40);

    // Gewitterwolke über dem Einschlagsort
    const cy = 46, cs = narrow ? 20 : 26;
    cloudBlob(ctx, clamp(xs, cs * 1.6, w - cs * 1.9), cy, cs, D.flash > .3 ? CLOUD2 : CLOUD);

    // Blitz
    const showBolt = D.phase !== 'idle' && (reduced || D.flash > 0);
    if (showBolt) {
      if (!D.bolt || D.boltW !== w) { D.bolt = zigzag(xs + rnd(-8, 8), cy + 18, xs, gy, 9, narrow ? 9 : 13); D.boltW = w; }
      strokeBolt(ctx, D.bolt, 2.4, reduced ? .9 : Math.min(1, D.flash * 1.6));
    }
    ctx.fillStyle = TXT2; ctx.fillRect(xs - 1, gy - 3, 2, 3);

    // Schallwelle
    if (D.phase !== 'idle') {
      const r = D.t * SOUND / 1000 * pxKm;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ri = r - i * 7;
        if (ri <= 0) continue;
        const a = D.phase === 'done' ? .25 : .75 - i * .17;
        ctx.strokeStyle = `rgba(243,181,80,${a})`;
        ctx.beginPath(); ctx.arc(xs, gy, ri, Math.PI, TAU); ctx.stroke();
      }
    }

    // Person
    person(ctx, xL - 6, gy, narrow ? 34 : 40, TXT);

    // Zähler
    ctx.textAlign = 'left';
    if (D.phase === 'idle') {
      ctx.fillStyle = TXT2; ctx.font = `11px ${MONO}`;
      ctx.fillText(narrow ? `Blitz in ${fmt(D.km, 1)} km` : `Der nächste Blitz schlägt ${fmt(D.km, 1)} km entfernt ein`, xL - 14, gy - 58);
    } else {
      const done = D.phase === 'done';
      ctx.fillStyle = done ? '#f3b550' : TXT; ctx.font = `600 ${narrow ? 22 : 28}px ${MONO}`;
      ctx.fillText(`${fmt(D.t, 1)} s`, xL - 14, narrow ? 34 : 40);
      ctx.font = `11px ${MONO}`; ctx.fillStyle = TXT2;
      ctx.fillText(done ? (narrow ? `÷ 3 ≈ ${fmt(D.t / 3, 1)} km` : `Donner! ÷ 3 ≈ ${fmt(D.t / 3, 1)} km`) : 'zählen …', xL - 14, narrow ? 52 : 60);
      if (done) {
        ctx.fillStyle = '#f3b550'; ctx.font = `600 ${narrow ? 14 : 16}px ${MONO}`;
        ctx.fillText('BUMM', xL + 12, gy - 40);
      }
      // Licht: sofort da
      if (!done && D.t < .6) {
        ctx.fillStyle = TXT; ctx.font = `11px ${MONO}`;
        ctx.textAlign = xs > w * .55 ? 'right' : 'left';
        ctx.fillText('Licht: sofort da', xs > w * .55 ? xs - 12 : xs + 12, gy - 12);
      }
    }
  };

  /* ---------- Teil 2: Die Wolke lädt sich auf ---------- */
  const cloudCv = $('#cloudCv');
  const W = { up: .6, show: true, P: [], V: 0, flash: 0, bolt: null, n: 0, times: [], spark: [] };
  const THR = 1;                       // Spannung, bei der die Luft durchschlägt (vereinfacht, relativ)
  const spawn = (p, mid) => {
    p.x = rnd(.2, .8); p.y = mid ? rnd(.45, .8) : rnd(.08, .92); p.q = 0;
    if (reduced) { p.y = p.ice ? rnd(.08, .4) : rnd(.6, .9); p.q = p.ice ? 1 : -1; }
    return p;
  };
  for (let i = 0; i < 90; i++) W.P.push(spawn({ ice: i % 2 === 0, ph: rnd(0, TAU) }, false));
  const coreOf = x => Math.exp(-Math.pow((x - .5) / .22, 2));
  const discharge = () => {
    W.n++; W.flash = 1; W.times.push(performance.now());
    for (const p of W.P) if (Math.random() < .8) p.q = 0;
    W.toGround = W.n % 3 === 0;
    W.bolt = null;
    $('#cN').textContent = String(W.n);
    $('#cloudStatus').textContent = W.toGround
      ? 'Blitz zum Boden! Er gleicht die negative Ladung unten in der Wolke mit dem Boden aus.'
      : 'Blitz in der Wolke: Er verbindet oben (+) und unten (−). Die meisten Blitze bleiben in der Wolke.';
  };
  const stepCloud = dt => {
    const up = W.up;
    for (const p of W.P) {
      const wind = up * coreOf(p.x) * .34;
      const fall = p.ice ? .03 : .2;
      let vx = Math.sin(p.ph + performance.now() / 900) * .02;
      if (p.y < .25) vx += Math.sign(p.x - .5) * .07;
      else if (p.y > .7) vx -= Math.sign(p.x - .5) * .05;
      p.x = clamp(p.x + vx * dt, .03, .97);
      p.y += (fall - wind) * dt;
      if (p.y < .04) p.y = .04;
      if (p.y > .97 || Math.random() < dt * .04) spawn(p, true);
    }
    // Stösse zwischen Kristallen und Graupel
    if (up > .08) {
      for (const a of W.P) {
        if (!a.ice) continue;
        for (const b of W.P) {
          if (b.ice) continue;
          const dx = a.x - b.x, dy = (a.y - b.y) * 1.3;
          if (dx * dx + dy * dy < .0016 && Math.random() < up * 6 * dt) {
            a.q = 1; b.q = -1;
            if (W.spark.length < 20) W.spark.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: .3 });
          }
        }
      }
    }
    // Ladungstrennung wächst mit der Zahl der Stösse, also stark mit dem Aufwind. Etwas Ladung geht immer verloren.
    W.V = Math.max(0, W.V + dt * (.3 * up * up - .04 * W.V));
    if (W.V >= THR) { W.V = 0; discharge(); }
  };
  $('#upIn').addEventListener('input', e => {
    W.up = +e.target.value / 100;
    $('#upOut').textContent = `${e.target.value} %`;
    $('#cloudStatus').textContent = W.up < .1 ? 'Kein Aufwind: Die Teilchen sinken, kaum Stösse, kaum Ladungstrennung. Kein Gewitter.'
      : W.up < .35 ? 'Schwacher Aufwind: Es gibt Stösse, aber die Ladungen trennen sich langsam. Vielleicht reicht es nie für einen Blitz.'
      : 'Starker Aufwind: viele Stösse, schnelle Trennung. Gewitter mit kräftigen Aufwinden blitzen oft.';
  });
  $('#chargeBtn').addEventListener('click', () => {
    W.show = !W.show;
    $('#chargeBtn').textContent = W.show ? 'Ladungen ausblenden' : 'Ladungen zeigen';
  });

  const drawCloud = dt => {
    const { ctx, w, h } = fit(cloudCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (!reduced) stepCloud(dt);
    else W.V = clamp(W.up / .6, 0, 1) * THR * .9;
    const meterW = narrow ? 34 : 54;
    const bx0 = narrow ? 14 : 30, bx1 = w - meterW - (narrow ? 14 : 24), by0 = 34, by1 = h * .66, gy = h - 34;
    const X = u => lerp(bx0, bx1, u), Y = v => lerp(by0, by1, v);

    // Boden
    ctx.fillStyle = C.sunk; ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();

    // Wolke mit Amboss
    const g = ctx.createLinearGradient(0, by0, 0, by1);
    g.addColorStop(0, '#c7ccd6'); g.addColorStop(1, '#6f7787');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(-.02), Y(.06));
    ctx.quadraticCurveTo(X(.5), Y(-.1), X(1.02), Y(.06));
    ctx.quadraticCurveTo(X(.95), Y(.2), X(.74), Y(.24));
    ctx.bezierCurveTo(X(.8), Y(.55), X(.95), Y(.85), X(.86), Y(1));
    ctx.quadraticCurveTo(X(.5), Y(1.08), X(.14), Y(1));
    ctx.bezierCurveTo(X(.05), Y(.85), X(.2), Y(.55), X(.26), Y(.24));
    ctx.quadraticCurveTo(X(.05), Y(.2), X(-.02), Y(.06));
    ctx.closePath(); ctx.fill();
    if (W.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${.35 * W.flash})`; ctx.fill(); }

    // Aufwind-Pfeile
    if (W.up > .05) {
      ctx.strokeStyle = `rgba(255,255,255,${.25 + .45 * W.up})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const off = reduced ? 0 : (performance.now() / 1000 * W.up * .25) % .25;
      for (const ux of [.42, .5, .58]) {
        for (let k = 0; k < 4; k++) {
          const v = .95 - ((k * .25 + off) % 1) * .75, len = .07 * (.5 + W.up);
          ctx.beginPath(); ctx.moveTo(X(ux), Y(v)); ctx.lineTo(X(ux), Y(v - len));
          ctx.moveTo(X(ux) - 4, Y(v - len) + 5); ctx.lineTo(X(ux), Y(v - len)); ctx.lineTo(X(ux) + 4, Y(v - len) + 5); ctx.stroke();
        }
      }
    }

    // Funken bei Stössen
    for (const s of W.spark) { s.t -= dt; ctx.fillStyle = `rgba(255,236,160,${clamp(s.t / .3, 0, 1)})`; ctx.beginPath(); ctx.arc(X(s.x), Y(s.y), 3, 0, TAU); ctx.fill(); }
    W.spark = W.spark.filter(s => s.t > 0);

    // Teilchen
    for (const p of W.P) {
      const x = X(p.x), y = Y(p.y);
      if (p.ice) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; ctx.moveTo(x - 3.5 * Math.cos(an), y - 3.5 * Math.sin(an)); ctx.lineTo(x + 3.5 * Math.cos(an), y + 3.5 * Math.sin(an)); }
        ctx.stroke();
      } else {
        ctx.fillStyle = '#3d4350'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      }
      if (W.show && p.q) {
        ctx.strokeStyle = p.q > 0 ? PLUS : MINUS; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.stroke();
      }
    }

    // Grosse Ladungszeichen
    const lvl = clamp(W.V / THR, 0, 1);
    if (W.show && lvl > .05) {
      ctx.font = `700 ${narrow ? 16 : 20}px ${MONO}`; ctx.textAlign = 'center';
      const n = Math.round(lvl * 6);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = PLUS; ctx.fillText('+', X(.2 + .6 * (i + .5) / 6), Y(.13));
        ctx.fillStyle = MINUS; ctx.fillText('−', X(.25 + .5 * (i + .5) / 6), Y(.9));
      }
      // Boden wird unter der Wolke positiv
      ctx.font = `600 13px ${MONO}`; ctx.fillStyle = PLUS;
      for (let i = 0; i < Math.round(lvl * 5); i++) ctx.fillText('+', X(.3 + .4 * (i + .5) / 5), gy + 18);
    }

    // Blitz
    if (W.flash > 0) {
      if (!W.bolt) {
        W.bolt = W.toGround ? zigzag(X(rnd(.35, .65)), Y(.9), X(rnd(.3, .7)), gy, 10, narrow ? 10 : 16)
          : zigzag(X(rnd(.35, .5)), Y(.85), X(rnd(.5, .65)), Y(.15), 9, narrow ? 12 : 20);
      }
      strokeBolt(ctx, W.bolt, 2.2, Math.min(1, W.flash * 1.5));
      W.flash = Math.max(0, W.flash - dt * 2.2);
    }

    // Beschriftung
    ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'oben: ca. −40 °C' : 'oben: ca. −40 °C, leichte Kristalle', bx0, by0 - 14);
    ctx.fillText(narrow ? 'Graupel sammelt sich unten' : 'unten: schwerer Graupel', bx0, by1 + 24);
    ctx.fillText('Boden', bx0, h - 8);

    // Spannungsanzeige
    const mx = w - meterW + (narrow ? 4 : 14), mw = narrow ? 14 : 18, my0 = by0, my1 = gy - 20;
    roundRect(ctx, mx, my0, mw, my1 - my0, 6); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
    const fh = (my1 - my0) * lvl;
    roundRect(ctx, mx, my1 - fh, mw, Math.max(fh, .01), 6); ctx.fillStyle = lvl > .85 ? C.bad : C.glow; ctx.fill();
    ctx.save(); ctx.translate(mx + mw / 2, my1 + 14); ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'U' : 'Spannung', 0, 0); ctx.restore();
    ctx.strokeStyle = C.bad; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mx - 3, my0 + 1); ctx.lineTo(mx + mw + 3, my0 + 1); ctx.stroke(); ctx.setLineDash([]);

    $('#cV').textContent = `${fmt(lvl * 100, 0)} %`;
    const now = performance.now();
    W.times = W.times.filter(t => now - t < 60000);
    const span = W.times.length ? Math.max(10, (now - W.times[0]) / 1000) : 0;
    $('#cRate').textContent = reduced ? 'Animation aus' : W.times.length >= 2 ? `pro Minute: rund ${fmt(W.times.length / span * 60, 0)}` : 'pro Minute: –';
  };

  /* ---------- Teil 3: Wo schlägt er ein? ---------- */
  const strikeCv = $('#strikeCv');
  const S = { pos: 'feld', rod: true, phase: 'idle', t: 0, path: [], branches: [], hit: null, flash: 0, startX: null, cnt: { tree: 0, house: 0, car: 0, ground: 0, person: 0 }, acc: 0 };
  let G = null;                        // Geometrie, wird pro Frame berechnet

  const geom = (w, h) => {
    const narrow = w < 440;
    const gy = h - 44, cy = 52, span = gy - cy;
    const tree = { x: w * .16, top: gy - span * .44, r: Math.min(w * .085, 46) };
    const hw = Math.min(w * .2, 120), hx = w * .45;
    const house = { x: hx, w: hw, wall: gy - span * .16, peak: gy - span * .27, rodTop: gy - span * .34 };
    const cw = Math.min(w * .17, 90);
    const car = { x: w * .72, w: cw, top: gy - span * .1, mid: gy - span * .055 };
    const ps = narrow ? 26 : 32;
    const px = S.pos === 'feld' ? w * .91 : S.pos === 'baum' ? tree.x + tree.r * .55 : S.pos === 'auto' ? car.x - cw * .12 : hx - hw * .18;
    const targets = [
      { id: 'tree', x: tree.x, y: tree.top },
      S.rod ? { id: 'rod', x: hx, y: house.rodTop } : { id: 'roof', x: hx, y: house.peak },
      { id: 'car', x: car.x, y: car.top },
    ];
    if (S.pos === 'feld' || S.pos === 'baum') targets.push({ id: 'person', x: px, y: gy - ps });
    return { narrow, gy, cy, span, tree, house, car, ps, px, targets, R: span * .17, step: span * .05 };
  };

  const startBolt = x => {
    const g = G;
    S.phase = 'leader'; S.t = 0; S.acc = 0; S.hit = null; S.flash = 0; S.branches = [];
    S.path = [[x ?? rnd(.06, .94) * strikeCv.getBoundingClientRect().width, g.cy + 10]];
    if (reduced) { while (S.phase === 'leader') leaderStep(); S.phase = 'stroke'; S.flash = 1; }
  };
  const leaderStep = () => {
    const g = G, [x, y] = S.path[S.path.length - 1];
    const ang = rnd(-.55, .55);
    const nx = clamp(x + Math.sin(ang) * g.step, 4, strikeCv.getBoundingClientRect().width - 4), ny = y + Math.cos(ang) * g.step;
    S.path.push([nx, ny]);
    if (Math.random() < .22) {
      const b = [[nx, ny]]; let bx = nx, by = ny; const dir = Math.random() < .5 ? -1 : 1;
      for (let i = 0; i < 2 + Math.floor(rnd(0, 4)); i++) { bx += dir * rnd(.2, .8) * g.step; by += rnd(.5, .9) * g.step; if (by > g.gy - 6) break; b.push([bx, by]); }
      S.branches.push(b);
    }
    // Wer ist nah genug für eine Fangentladung?
    let best = null, bd = Infinity;
    for (const t of g.targets) { const d = Math.hypot(t.x - nx, t.y - ny); if (d < g.R && d < bd) { bd = d; best = t; } }
    if (!best && g.gy - ny < g.R * .5) best = { id: 'ground', x: nx + rnd(-6, 6), y: g.gy };
    if (best) { S.hit = best; S.path.push([best.x, best.y]); S.phase = 'streamer'; S.t = 0; registerHit(); }
  };
  const HITNAME = { tree: 'Baum', rod: 'Blitzableiter', roof: 'Dach', car: 'Auto', person: 'Person', ground: 'Boden' };
  const registerHit = () => {
    const g = G, id = S.hit.id;
    const key = id === 'rod' || id === 'roof' ? 'house' : id;
    S.cnt[key]++;
    $('#sHit').textContent = HITNAME[id];
    let p = 'sicher', msg = '', warn = false;
    const near = id === 'ground' && Math.abs(S.hit.x - g.px) < g.span * .25;
    if (S.pos === 'feld') {
      if (id === 'person') { p = 'getroffen!'; warn = true; msg = 'Volltreffer: Auf freiem Feld bist du oft der höchste Punkt weit und breit. Lebensgefahr.'; }
      else if (near) { p = 'in Gefahr'; warn = true; msg = 'Einschlag ganz in der Nähe: Der Strom breitet sich im Boden aus und kann auch so gefährlich werden.'; }
      else { p = 'Glück gehabt'; msg = 'Diesmal nicht getroffen. Trotzdem: Auf freiem Feld bist du ungeschützt. Such ein Gebäude oder ein Auto.'; }
    } else if (S.pos === 'baum') {
      if (id === 'tree' || id === 'person') { p = 'in Gefahr'; warn = true; msg = 'Der Blitz trifft den Baum. Der Strom kann vom Stamm auf dich überspringen. Darum nie unter einzelnen Bäumen Schutz suchen.'; }
      else { p = 'Glück gehabt'; msg = 'Diesmal nicht. Aber der einzelne, hohe Baum ist das häufigste Ziel in der Landschaft.'; }
    } else if (S.pos === 'auto') {
      msg = id === 'car' ? 'Einschlag ins Auto. Der Strom fliesst aussen über das Blech und springt zum Boden. Innen bist du sicher.'
        : 'Im Auto mit Metalldach bist du gut geschützt. Fenster zu, Metallteile nicht anfassen.';
    } else {
      msg = id === 'rod' ? 'Der Blitzableiter fängt den Blitz und leitet den Strom an der Hauswand entlang in die Erde. Drinnen bist du sicher.'
        : id === 'roof' ? 'Ohne Blitzableiter trifft der Blitz das Dach. Drinnen bist du meist sicher, aber das Haus kann Feuer fangen.'
        : 'Im Gebäude bist du gut geschützt.';
    }
    $('#sPerson').textContent = p;
    $('#strikeStatus').textContent = msg;
    $('#strikeStatus').classList.toggle('warn', warn);
    const c = S.cnt;
    $('#sCount').textContent = `${c.tree} · ${c.house} · ${c.car} · ${c.ground + c.person}`;
  };

  $$('#posSel button').forEach(b => b.addEventListener('click', () => {
    S.pos = b.dataset.p; S.phase = 'idle'; S.path = []; S.branches = [];
    $$('#posSel button').forEach(x => x.classList.toggle('active', x === b));
    $('#sPerson').textContent = '–'; $('#strikeStatus').classList.remove('warn');
    $('#strikeStatus').textContent = {
      feld: 'Auf freiem Feld bist du selbst ein hoher Punkt. Kein Schutz weit und breit.',
      baum: 'Unter dem einzelnen Baum: Viele suchen hier Schutz vor dem Regen. Eine gefährliche Idee?',
      auto: 'Im Auto mit Metallkarosserie. Tipp aufs Bild über dem Auto, um dort einen Blitz zu starten.',
      haus: 'Im Haus. Schalte den Blitzableiter ein und aus.',
    }[S.pos];
  }));
  $('#boltBtn').addEventListener('click', () => startBolt());
  $('#rodBtn').addEventListener('click', () => {
    S.rod = !S.rod; S.phase = 'idle'; S.path = []; S.branches = [];
    $('#rodBtn').textContent = S.rod ? 'Blitzableiter entfernen' : 'Blitzableiter anbringen';
  });
  strikeCv.addEventListener('click', e => {
    if (!$('#strikeLock').hidden || !G) return;
    const r = strikeCv.getBoundingClientRect();
    startBolt(e.clientX - r.left);
  });

  // Weg des Stroms vom Einschlag zum Boden
  const currentPath = () => {
    const g = G, id = S.hit.id;
    if (id === 'tree') return [[g.tree.x, g.tree.top], [g.tree.x, g.gy]];
    if (id === 'rod') { const rx = g.house.x + g.house.w / 2 + 3; return [[g.house.x, g.house.rodTop], [g.house.x, g.house.peak], [rx, g.house.wall], [rx, g.gy]]; }
    if (id === 'roof') return [[g.house.x, g.house.peak], [g.house.x + g.house.w / 2, g.house.wall]];
    if (id === 'car') { const c = g.car; return [[c.x, c.top], [c.x + c.w * .28, c.top], [c.x + c.w * .45, c.mid], [c.x + c.w / 2, g.gy - 8], [c.x + c.w / 2, g.gy]]; }
    if (id === 'person') return [[g.px, g.gy - g.ps], [g.px, g.gy]];
    return [[S.hit.x, g.gy], [S.hit.x, g.gy]];
  };
  const along = (pts, k) => {
    let L = 0; const seg = [];
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); L += l; }
    let d = k * L;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const q = seg[i] ? d / seg[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q)]; } d -= seg[i]; }
    return pts[0];
  };

  const drawStrike = dt => {
    const { ctx, w, h } = fit(strikeCv);
    G = geom(w, h);
    const g = G, narrow = g.narrow;
    // Ablauf
    if (!reduced) {
      if (S.phase === 'leader') { S.acc += dt; while (S.acc > .03 && S.phase === 'leader') { S.acc -= .03; leaderStep(); } }
      else if (S.phase === 'streamer') { S.t += dt; if (S.t > .12) { S.phase = 'stroke'; S.t = 0; S.flash = 1; } }
      else if (S.phase === 'stroke') { S.t += dt; S.flash = Math.max(0, 1 - S.t * 1.1); if (S.t > 2.2) S.phase = 'after'; }
    }
    skyBg(ctx, w, h, g.gy, S.phase === 'stroke' && !reduced ? S.flash : 0);
    // Wolkendecke
    for (let i = 0; i < 7; i++) cloudBlob(ctx, w * (i + .3) / 6.5, g.cy - 22, narrow ? 22 : 30, CLOUD);

    // Baum
    const t = g.tree;
    ctx.fillStyle = '#4a3626'; ctx.fillRect(t.x - 4, t.top + t.r * 1.2, 8, g.gy - t.top - t.r * 1.2);
    ctx.fillStyle = '#2f5a35';
    ctx.beginPath(); ctx.ellipse(t.x, t.top + t.r * 1.05, t.r * .85, t.r * 1.05, 0, 0, TAU); ctx.fill();
    // Haus
    const hs = g.house, hx0 = hs.x - hs.w / 2;
    ctx.fillStyle = '#8c8577'; ctx.fillRect(hx0, hs.wall, hs.w, g.gy - hs.wall);
    ctx.fillStyle = '#6a3b2c';
    ctx.beginPath(); ctx.moveTo(hx0 - 6, hs.wall); ctx.lineTo(hs.x, hs.peak); ctx.lineTo(hx0 + hs.w + 6, hs.wall); ctx.closePath(); ctx.fill();
    const win = Math.min(hs.w * .26, 26);
    ctx.fillStyle = '#e8c86a'; ctx.fillRect(hs.x - hs.w * .3, hs.wall + 10, win, win * .8);
    ctx.fillStyle = '#3a3128'; ctx.fillRect(hs.x + hs.w * .12, g.gy - win * 1.4, win * .75, win * 1.4);
    if (S.rod) {
      const rx = hs.x + hs.w / 2 + 3;
      ctx.strokeStyle = '#c9a36a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hs.x, hs.rodTop); ctx.lineTo(hs.x, hs.peak); ctx.lineTo(rx, hs.wall); ctx.lineTo(rx, g.gy + 6); ctx.stroke();
    }
    // Auto
    const c = g.car, cx0 = c.x - c.w / 2;
    ctx.fillStyle = '#9aa3b2';
    roundRect(ctx, cx0, c.mid, c.w, g.gy - 9 - c.mid, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx0 + c.w * .18, c.mid); ctx.lineTo(cx0 + c.w * .3, c.top); ctx.lineTo(cx0 + c.w * .74, c.top); ctx.lineTo(cx0 + c.w * .86, c.mid); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b3240';
    ctx.beginPath(); ctx.moveTo(cx0 + c.w * .25, c.mid - 1); ctx.lineTo(cx0 + c.w * .33, c.top + 3); ctx.lineTo(cx0 + c.w * .71, c.top + 3); ctx.lineTo(cx0 + c.w * .79, c.mid - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#15181d';
    for (const k of [.24, .76]) { ctx.beginPath(); ctx.arc(cx0 + c.w * k, g.gy - 8, Math.min(9, c.w * .1), 0, TAU); ctx.fill(); }
    // Person
    if (S.pos === 'feld' || S.pos === 'baum') person(ctx, g.px, g.gy, g.ps, TXT);
    else if (S.pos === 'auto') { ctx.fillStyle = TXT; ctx.beginPath(); ctx.arc(g.px, c.top + (c.mid - c.top) * .5, 3.5, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = '#3a3128'; ctx.beginPath(); ctx.arc(hs.x - hs.w * .3 + win * .5, hs.wall + 10 + win * .35, Math.min(5, win * .2), 0, TAU); ctx.fill(); }

    // Beschriftung
    ctx.font = `10px ${MONO}`; ctx.fillStyle = TXT2; ctx.textAlign = 'center';
    ctx.fillText('Baum', t.x, g.gy + 16);
    ctx.fillText(narrow ? 'Haus' : S.rod ? 'Haus mit Blitzableiter' : 'Haus ohne Blitzableiter', hs.x, g.gy + 16);
    ctx.fillText('Auto', c.x, g.gy + 16);
    if (S.pos === 'feld') ctx.fillText('Person', g.px, g.gy + 16);
    ctx.textAlign = 'right'; ctx.fillText(narrow ? 'nicht massstäblich' : 'vereinfacht, nicht massstäblich', w - 8, h - 8);

    // Leitblitz und Äste
    if (S.path.length > 1) {
      const lead = S.phase === 'leader' || S.phase === 'streamer';
      const alpha = lead ? .55 : S.phase === 'stroke' ? Math.max(.35, S.flash) : .18;
      for (const b of S.branches) strokeBolt(ctx, b, 1, alpha * .6);
      const main = S.phase === 'streamer' ? S.path.slice(0, -1) : S.path;
      strokeBolt(ctx, main, lead ? 1.4 : 3, alpha);
      // Fangentladung von unten
      if (S.phase === 'streamer' && S.hit) {
        const [ex, ey] = S.path[S.path.length - 2], k = clamp(S.t / .12, 0, 1);
        strokeBolt(ctx, [[S.hit.x, S.hit.y], [lerp(S.hit.x, ex, k), lerp(S.hit.y, ey, k)]], 1.4, .7);
      }
    }
    // Strom fliesst zum Boden
    if (S.hit && (S.phase === 'stroke' || S.phase === 'after')) {
      const cp = currentPath();
      const on = S.phase === 'stroke' ? 1 : .35;
      ctx.fillStyle = `rgba(255,214,90,${on})`;
      for (let i = 0; i < 6; i++) {
        const k = reduced ? i / 5 : (i / 6 + S.t * 1.5) % 1;
        const [x, y] = along(cp, k);
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
      }
      if (S.hit.id === 'roof') { ctx.fillStyle = `rgba(255,120,40,${.5 * on + .2})`; ctx.beginPath(); ctx.arc(hs.x, hs.peak + 4, 7, 0, TAU); ctx.fill(); }
      if (S.pos === 'baum' && S.hit.id === 'tree' && S.phase === 'stroke') strokeBolt(ctx, zigzag(t.x + 4, g.gy - g.ps * .7, g.px - 3, g.gy - g.ps * .6, 3, 3), 1.2, S.flash);
      if (S.hit.id === 'ground' || S.hit.id === 'tree' || S.hit.id === 'rod' || S.hit.id === 'car') {
        const gx = S.hit.id === 'ground' ? S.hit.x : cp[cp.length - 1][0];
        ctx.strokeStyle = `rgba(255,214,90,${.5 * on})`; ctx.lineWidth = 1.5;
        for (let i = 1; i <= 3; i++) { const rr = (reduced ? i / 3 : ((S.t * .8 + i / 3) % 1)) * g.span * .3; ctx.beginPath(); ctx.ellipse(gx, g.gy + 2, rr, rr * .18, 0, 0, Math.PI); ctx.stroke(); }
      }
    }
    if (S.phase === 'idle') {
      ctx.fillStyle = TXT2; ctx.font = `11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'Tipp aufs Bild: Blitz' : 'Tipp aufs Bild, um dort einen Blitz zu starten', w / 2, g.cy + 34);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('gewitter', 4, {
    distLock: () => { ['#dIn', '#flashBtn', '#randBtn'].forEach(s => $(s).disabled = false); },
    cloudLock: () => { ['#upIn', '#chargeBtn'].forEach(s => $(s).disabled = false); },
    strikeLock: () => { ['#boltBtn', '#rodBtn'].forEach(s => $(s).disabled = false); $$('#posSel button').forEach(b => b.disabled = false); strikeCv.style.cursor = 'pointer'; },
  });

  loop(dt => { drawDist(dt); drawCloud(dt); drawStrike(dt); });
})();
