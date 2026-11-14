/* mindblow – Lektion Nahrungsnetz */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben für die Landschaft
  const DEER = '#9a6236', WOLF = '#7b8088', WILLOW = '#5f9a3e', WILLOW2 = '#7cb354', WATER = '#4f8fc9', BEAVER = '#7a4a26';
  // feste Zufallszahlen, damit die Szene ruhig bleibt
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pct = v => `${fmt(v, v >= 10 ? 0 : v >= 1 ? 1 : 2)} %`;
  const setTxt = (sel, txt) => { const el = $(sel); if (el.textContent !== txt) el.textContent = txt; };

  /* ---------- Teil 1: Räuber und Beute ---------- */
  // Vereinfachtes Modell: Pflanzen (junger Wald, 0..1), Hirsche, Wölfe. Räuber-Beute mit Sättigung und Revieren, darum gedämpft.
  const YEARS = 50, STEP = 0.05, SAMPLE = 5;   // alle 0,25 Jahre ein Punkt
  const simulate = W0 => {
    let H = 1500, W = W0, V = 1;
    const out = [];
    for (let s = 0; s <= YEARS / STEP; s++) {
      if (s % SAMPLE === 0) out.push({ H, W, V });
      const f = 25 * H / (H + 1000);                     // Hirsche pro Wolf und Jahr
      const dV = 0.04 * (1 - V) - 0.03 * (H / 1000) ** 2 * V;
      const dH = H * (0.6 * V - 0.2) - 0.00002 * H * H - W * f;
      const dW = W * (0.05 * f - 0.2 - W / 50);
      V = clamp(V + dV * STEP, 0.03, 1); H = Math.max(5, H + dH * STEP); W = Math.max(0, W + dW * STEP);
    }
    return out;
  };
  const popCv = $('#popCv');
  const POP = { w0: 0, data: simulate(0), t: reduced ? YEARS : 0, max: 1500 };
  const popMsg = w0 => w0 === 0
    ? 'Ohne Wölfe: Die Hirsche verdoppeln sich fast. Dann ist der junge Wald weg, und die Zahl bricht ein.'
    : w0 < 6
      ? 'Wenige Wölfe: Zuerst wachsen die Hirsche trotzdem. Die Wölfe holen auf, und beide schaukeln sich hin und her.'
      : 'Viele Wölfe: Die Hirsche bleiben weniger, und der junge Wald kann nachwachsen. Nach einigen Schwankungen stellt sich ein Gleichgewicht ein.';
  const setW0 = w0 => {
    POP.w0 = w0; POP.data = simulate(w0); POP.t = reduced ? YEARS : 0; POP.max = 0;
    $('#wIn').value = w0;
    $('#wOut').textContent = w0 === 1 ? '1 Wolf' : `${w0} Wölfe`;
    $('#popStatus').textContent = popMsg(w0);
  };
  $('#wIn').addEventListener('input', e => setW0(+e.target.value));
  $('#w0Btn').addEventListener('click', () => setW0(0));
  $('#w10Btn').addEventListener('click', () => setW0(10));
  $('#replayBtn').addEventListener('click', () => setW0(POP.w0));

  const drawPop = dt => {
    const { ctx, w, h } = fit(popCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (!reduced && POP.t < YEARS) POP.t = Math.min(YEARS, POP.t + dt * 7);
    const D = POP.data, n = Math.round(POP.t / (STEP * SAMPLE));
    const gx0 = 46, gx1 = w - 36, gy0 = 34, gy1 = h - 70, sy0 = h - 46, sy1 = h - 30;
    const HMAX = 3500, WMAX = 40;
    const GX = yr => gx0 + yr / YEARS * (gx1 - gx0);
    const GH = v => gy1 - v / HMAX * (gy1 - gy0), GW = v => gy1 - v / WMAX * (gy1 - gy0);

    // Gitter und Achsen
    ctx.font = `10px ${MONO}`; ctx.lineWidth = 1; ctx.strokeStyle = C.line;
    for (const v of [0, 1000, 2000, 3000]) {
      ctx.beginPath(); ctx.moveTo(gx0, GH(v)); ctx.lineTo(gx1, GH(v)); ctx.stroke();
      ctx.fillStyle = C.copper; ctx.textAlign = 'right'; ctx.fillText(fmt(v, 0), gx0 - 5, GH(v) + 3);
    }
    ctx.fillStyle = C.accent; ctx.textAlign = 'left';
    for (const v of [0, 10, 20, 30, 40]) ctx.fillText(String(v), gx1 + 5, GW(v) + 3);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let yr = 0; yr <= YEARS; yr += 10) ctx.fillText(String(yr), GX(yr), gy1 + 14);
    ctx.textAlign = 'right'; ctx.fillText('Jahre', gx1, sy1 + 14);

    // Legende
    ctx.textAlign = 'left'; ctx.font = `500 11px ${MONO}`;
    let lx = gx0;
    for (const [col, name] of [[C.copper, 'Hirsche'], [C.accent, 'Wölfe'], [C.good, narrow ? 'Wald' : 'junger Wald']]) {
      ctx.fillStyle = col; ctx.fillRect(lx, 12, 10, 10);
      ctx.fillStyle = C.fg; ctx.fillText(name, lx + 15, 21);
      lx += ctx.measureText(name).width + 30;
    }

    // Streifen: wie viel junger Wald da ist
    ctx.fillStyle = C.sunk; ctx.fillRect(gx0, sy0, gx1 - gx0, sy1 - sy0);
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = clamp(D[i].V, 0, 1);
      ctx.fillStyle = C.good;
      ctx.fillRect(GX(i * STEP * SAMPLE), sy0, GX((i + 1) * STEP * SAMPLE) - GX(i * STEP * SAMPLE) + .6, sy1 - sy0);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText('Wald', gx0 - 5, sy1 - 4);

    // Kurven
    const curve = (get, col, Y, width) => {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= n && i < D.length; i++) { const x = GX(i * STEP * SAMPLE), y = Y(Math.min(get(D[i]), HMAX * 1.05)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    };
    ctx.save(); ctx.beginPath(); ctx.rect(gx0, gy0 - 8, gx1 - gx0, gy1 - gy0 + 8); ctx.clip();
    if (POP.w0 > 0) curve(d => d.W, C.accent, GW, 2);
    curve(d => d.H, C.copper, GH, 2.5);
    ctx.restore();

    // aktueller Punkt
    const cur = D[Math.min(n, D.length - 1)];
    const cx = GX(POP.t);
    ctx.strokeStyle = C.muted; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, gy0); ctx.lineTo(cx, sy1); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx, GH(cur.H), 4.5, 0, TAU); ctx.fillStyle = C.copper; ctx.fill();
    if (POP.w0 > 0) { ctx.beginPath(); ctx.arc(cx, GW(cur.W), 4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill(); }

    // Werte
    let mx = 0; for (let i = 0; i <= n && i < D.length; i++) mx = Math.max(mx, D[i].H);
    setTxt('#rMax', fmt(Math.round(mx / 10) * 10, 0));
    setTxt('#rNow', fmt(Math.round(cur.H / 10) * 10, 0));
    setTxt('#rYear', POP.w0 > 0 ? `Jahr ${Math.round(POP.t)} · ${Math.round(cur.W)} Wölfe` : `Jahr ${Math.round(POP.t)}`);
    setTxt('#rForest', `${fmt(cur.V * 100, 0)} %`);
  };

  /* ---------- Teil 2: Trophische Kaskade ---------- */
  const cascCv = $('#cascCv');
  const K = { wolves: false, y: 0, play: false, time: 0 };
  // Modell, vereinfacht: nur die Idee, keine echten Messwerte
  const deerOf = (wv, y) => wv ? 1 - .5 * (1 - Math.exp(-y / 7)) : 1;
  const riverOf = (wv, y) => wv ? .75 - .5 * (1 - Math.exp(-y / 5)) : .75;
  const willowOf = (wv, y) => wv ? .15 + .7 * smooth(3, 20, y) : .15;
  const beaverOf = (wv, y) => wv ? smooth(9, 18, y) : 0;
  seed = 11;
  const DEERS = Array.from({ length: 12 }, (_, i) => ({ r: rnd(), u: rnd(), v: rnd(), ph: rnd() * TAU, i }));
  const BUSHES = Array.from({ length: 14 }, (_, i) => ({ x: (i + .3 + rnd() * .4) / 14, top: i % 2 === 0, s: .7 + rnd() * .5 }));
  const TREES = Array.from({ length: 9 }, (_, i) => ({ x: (i + .2 + rnd() * .6) / 9, s: .7 + rnd() * .5, y: rnd() }));

  const cascMsg = () => {
    const { wolves, y } = K;
    if (!wolves) return y < 5 ? 'Ohne Wölfe stehen die Hirsche oft am Fluss und fressen die jungen Weiden ab.'
      : 'Ohne Wölfe bleibt es, wie es war: Die jungen Weiden werden immer wieder abgefressen. Biber finden kaum Futter.';
    if (y < 4) return 'Die Wölfe sind da. Die Hirsche werden vorsichtiger, aber die Weiden brauchen Zeit.';
    if (y < 12) return 'Weniger Hirsche, und sie halten sich seltener am offenen Ufer auf. Junge Weiden wachsen wieder höher.';
    return 'Dichte Weiden am Ufer, Biber bauen Dämme. Wie stark das wirklich an den Wölfen liegt, ist in der Forschung umstritten.';
  };
  const updCasc = () => {
    const { wolves, y } = K;
    $('#yIn').value = y; $('#yOut').textContent = String(1995 + y);
    const wl = willowOf(wolves, y), b = beaverOf(wolves, y);
    $('#cDeer').textContent = `${fmt(deerOf(wolves, y) * 100, 0)} %`;
    $('#cWillow').textContent = wl < .3 ? 'wenig' : wl < .6 ? 'mittel' : 'viel';
    $('#cBeaver').textContent = b < .05 ? 'keine' : b < .6 ? 'erste Familie' : 'mehrere Dämme';
    $('#cascStatus').textContent = cascMsg();
  };
  $$('#wolfSel button').forEach(btn => btn.addEventListener('click', () => {
    K.wolves = btn.dataset.w === '1';
    $$('#wolfSel button').forEach(x => x.classList.toggle('active', x === btn));
    updCasc();
  }));
  $('#yIn').addEventListener('input', e => { K.y = +e.target.value; K.play = false; $('#yPlay').textContent = 'Jahre abspielen'; updCasc(); });
  $('#yPlay').addEventListener('click', () => {
    K.play = !K.play;
    if (K.play && K.y >= 25) { K.y = 0; updCasc(); }
    $('#yPlay').textContent = K.play ? 'Anhalten' : 'Jahre abspielen';
  });
  updCasc();

  const drawDeer = (ctx, x, y, s, flip, head) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
    ctx.fillStyle = DEER; ctx.strokeStyle = DEER; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -10, 10, 5, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(-7, 0); ctx.moveTo(-4, -7); ctx.lineTo(-4, 0);
    ctx.moveTo(5, -7); ctx.lineTo(5, 0); ctx.moveTo(8, -7); ctx.lineTo(8, 0); ctx.stroke();
    // Hals und Kopf: unten beim Fressen, oben beim Sichern
    const hx = head ? 13 : 15, hy = head ? -22 : -3;
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(7, -12); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + 2, hy, 3.6, 2.4, head ? 0 : .7, 0, TAU); ctx.fill();
    if (head) {
      ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.moveTo(hx, hy - 2); ctx.lineTo(hx - 3, hy - 9); ctx.lineTo(hx - 6, hy - 11);
      ctx.moveTo(hx - 2, hy - 6); ctx.lineTo(hx + 1, hy - 10); ctx.stroke();
    }
    ctx.restore();
  };
  const drawWolf = (ctx, x, y, s, flip) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
    ctx.fillStyle = WOLF; ctx.strokeStyle = WOLF; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -8, 10, 4.5, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-8, 0); ctx.moveTo(-3, -5); ctx.lineTo(-3, 0);
    ctx.moveTo(5, -5); ctx.lineTo(6, 0); ctx.moveTo(8, -5); ctx.lineTo(8, 0); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -9); ctx.quadraticCurveTo(-15, -8, -16, -3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(16, -11); ctx.lineTo(18, -8); ctx.lineTo(11, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -12); ctx.lineTo(10, -17); ctx.lineTo(13, -12); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  const drawWillow = (ctx, x, y, hgt, s) => {
    // Busch aus Ruten: niedrig und zerzaust, wenn abgefressen
    ctx.lineCap = 'round';
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - .5) * 1.1;
      const l = hgt * (.75 + .25 * Math.cos(a * 2)) * s;
      ctx.strokeStyle = i % 2 ? WILLOW : WILLOW2; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(a) * l * .3, y - l * .6, x + Math.sin(a) * l * .6, y - l); ctx.stroke();
    }
    if (hgt > 18) {
      ctx.fillStyle = WILLOW2; ctx.globalAlpha = .55;
      ctx.beginPath(); ctx.ellipse(x, y - hgt * s * .75, hgt * s * .35, hgt * s * .3, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const drawCasc = dt => {
    if (K.play) {
      K.time += dt;
      if (K.time > .6) { K.time = 0; K.y = Math.min(25, K.y + 1); updCasc(); if (K.y >= 25) { K.play = false; $('#yPlay').textContent = 'Jahre abspielen'; } }
    }
    const { ctx, w, h } = fit(cascCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const t = reduced ? 0 : performance.now() / 1000;
    const { wolves, y } = K;
    const willow = willowOf(wolves, y), beaver = beaverOf(wolves, y), deerN = deerOf(wolves, y), atRiver = riverOf(wolves, y);
    const sc = clamp(w / 560, .75, 1.15);

    // Himmel und Hügel
    ctx.fillStyle = C.sunk; ctx.fillRect(0, 0, w, h);
    const slopeY = x => h * .42 + Math.sin(x / w * 5 + 1) * h * .03;
    ctx.fillStyle = '#6e8f52'; ctx.globalAlpha = .55;
    ctx.beginPath(); ctx.moveTo(0, h * .34);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * .3 + Math.sin(x / w * 3.3) * h * .06);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8aa65e';
    ctx.beginPath(); ctx.moveTo(0, slopeY(0));
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, slopeY(x));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

    // Pappeln am Hang: wachsen nur, wenn die Hirsche sie lassen
    for (const tr of TREES) {
      const x = tr.x * w, by = slopeY(x) + 10 + tr.y * 14;
      const th = (14 + 46 * smooth(.15, .85, willow)) * tr.s * sc;
      ctx.strokeStyle = '#d9d2c3'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by - th); ctx.stroke();
      ctx.fillStyle = '#c9b545'; ctx.globalAlpha = .35 + .5 * smooth(.2, .8, willow);
      ctx.beginPath(); ctx.ellipse(x, by - th * .85, th * .22 + 2, th * .35 + 2, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Fluss
    const rY = x => h * .72 + Math.sin(x / w * 4 + .5) * h * .025;
    const rw = h * (.07 + .02 * beaver);
    ctx.fillStyle = '#6c8a4a'; ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.moveTo(0, rY(0) - rw * .5 - 14);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, rY(x) - rw * .5 - 14);
    for (let x = w; x >= 0; x -= 8) ctx.lineTo(x, rY(x) + rw * .5 + 14);
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = WATER;
    ctx.beginPath(); ctx.moveTo(0, rY(0) - rw / 2);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, rY(x) - rw / 2);
    for (let x = w; x >= 0; x -= 8) ctx.lineTo(x, rY(x) + rw / 2);
    ctx.fill();
    // Wellen
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const x = ((i / 9 + t * .03) % 1) * w;
      ctx.beginPath(); ctx.moveTo(x, rY(x) + (i % 3 - 1) * rw * .25); ctx.lineTo(x + 14, rY(x + 14) + (i % 3 - 1) * rw * .25); ctx.stroke();
    }
    // Biberteich und Damm
    if (beaver > .02) {
      const dx = w * .64;
      ctx.globalAlpha = beaver;
      ctx.fillStyle = WATER;
      ctx.beginPath(); ctx.ellipse(dx - w * .1, rY(dx - w * .1), w * .13 * beaver + 8, rw * (.6 + .6 * beaver), 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = BEAVER; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx, rY(dx) - rw * .9); ctx.lineTo(dx + 3, rY(dx) + rw * .9); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(dx - 5, rY(dx) + i * rw * .25); ctx.lineTo(dx + 7, rY(dx) + i * rw * .25 + 3); ctx.stroke(); }
      // Biber
      ctx.fillStyle = BEAVER;
      const bx = dx - w * .14 + Math.sin(t * .6) * 12, by = rY(bx);
      ctx.beginPath(); ctx.ellipse(bx, by, 7, 3.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx - 9, by + .5, 4, 1.8, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Weiden an beiden Ufern
    for (const b of BUSHES) {
      const x = b.x * w;
      const yy = rY(x) + (b.top ? -rw / 2 - 2 : rw / 2 + 12);
      const hgt = (8 + 52 * willow) * sc;
      drawWillow(ctx, x, yy, hgt, b.s);
    }

    // Hirsche
    const nDeer = Math.round(DEERS.length * deerN);
    for (let i = 0; i < nDeer; i++) {
      const d = DEERS[i];
      const river = d.r < atRiver;
      const x = (.06 + d.u * .88) * w + (reduced ? 0 : Math.sin(t * .25 + d.ph) * 6);
      const yy = river ? rY(x) - rw / 2 - 4 - d.v * 10 : slopeY(x) + 6 + d.v * 30;
      const grazing = river ? Math.sin(t * .5 + d.ph) > -.3 : Math.sin(t * .4 + d.ph) > .2;
      drawDeer(ctx, x, yy, .9 * sc, d.ph > Math.PI, wolves && !grazing ? true : !grazing);
    }
    // Wölfe auf dem Hügel
    if (wolves) {
      const n = narrow ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const x = w * (.78 + i * .05) + (reduced ? 0 : Math.sin(t * .3 + i) * 4);
        drawWolf(ctx, x, h * .33 + i * 4 + Math.sin(x / w * 3.3) * h * .06 - 4, .9 * sc, i % 2 === 1);
      }
    }

    // Jahr und Hinweis
    ctx.font = `600 ${narrow ? 18 : 22}px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText(String(1995 + y), 12, 30);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(wolves ? (narrow ? 'mit Wölfen' : 'mit Wölfen') : (narrow ? 'ohne Wölfe' : 'ohne Wölfe'), 12, 46);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'Modell' : 'Modell, vereinfacht', w - 10, h - 10);
  };

  /* ---------- Teil 3: Energiepyramide ---------- */
  const pyrCv = $('#pyrCv');
  const PY = { eff: .1, n: 3, parts: [], acc: 0 };
  const NAMES = ['Gras', 'Hirsche', 'Wölfe', 'Jäger der Wölfe'];
  const updPyr = () => {
    const e = PY.eff;
    $('#effIn').value = Math.round(e * 100);
    $('#effOut').textContent = `${Math.round(e * 100)} %`;
    $('#eDeer').textContent = pct(e * 100);
    $('#eWolf').textContent = pct(e * e * 100);
    $('#eRatio').textContent = `${fmt(Math.round(1 / (e * e)), 0)} : 1`;
    $('#pyrStatus').textContent = PY.n === 4
      ? `Eine vierte Stufe bekäme nur noch ${pct(e ** 3 * 100)} der Energie. Viel zu wenig: Darum gibt es kein Tier, das sich von Wölfen ernährt.`
      : `Rund ${pct((1 - e) * 100)} gehen auf jeder Stufe verloren: als Körperwärme, Bewegung, Atmung und Kot.`;
  };
  $('#effIn').addEventListener('input', e => { PY.eff = +e.target.value / 100; updPyr(); });
  $$('#lvlSel button').forEach(btn => btn.addEventListener('click', () => {
    PY.n = +btn.dataset.n;
    $$('#lvlSel button').forEach(x => x.classList.toggle('active', x === btn));
    updPyr();
  }));
  updPyr();

  const drawPyr = dt => {
    const { ctx, w, h } = fit(pyrCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const n = PY.n, e = PY.eff;
    const top = 26, bot = h - 18, rowH = (bot - top) / n, barH = Math.min(30, rowH * .42);
    const cx = w / 2, maxW = w - 32;
    const rowY = i => bot - (i + 1) * rowH + rowH * .55;   // Oberkante des Balkens
    const cols = [C.good, C.copper, C.accent, C.fiber];

    // Balken
    for (let i = 0; i < n; i++) {
      const bw = Math.max(3, maxW * e ** i), y = rowY(i);
      roundRect(ctx, cx - bw / 2, y, bw, barH, Math.min(6, bw / 2));
      ctx.fillStyle = cols[i]; ctx.globalAlpha = i === 3 ? .7 : .85; ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      const name = i === 3 && narrow ? 'Jäger der Wölfe?' : i === 3 ? 'Jäger der Wölfe (gibt es nicht)' : NAMES[i];
      ctx.fillText(name, 16, y - 7);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
      ctx.fillText(pct(e ** i * 100), w - 16, y - 7);
    }
    // Pfeile «verloren»
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.bad; ctx.textAlign = 'left';
    for (let i = 0; i < n - 1; i++) {
      const y = rowY(i) - rowH * .3;
      const bw = Math.max(3, maxW * e ** (i + 1));
      const x = Math.max(cx + bw / 2 + 12, cx + 30);
      if (x + 90 < w) ctx.fillText(narrow ? `→ ${Math.round((1 - e) * 100)} % weg` : `→ ${Math.round((1 - e) * 100)} % als Wärme weg`, x, y + 12);
    }

    // Energiepäckchen
    if (!reduced) {
      PY.acc += dt * (narrow ? 40 : 60);
      while (PY.acc > 1) {
        PY.acc--;
        PY.parts.push({ x: cx + (Math.random() - .5) * maxW * .95, y: rowY(0) + barH / 2, lvl: 0, vx: 0, vy: -(55 + Math.random() * 25), life: 1, lost: false });
      }
      for (const p of PY.parts) {
        if (p.lost) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.2; continue; }
        p.y += p.vy * dt;
        // Richtung Mitte ziehen, damit die Punkte in die schmaleren Balken passen
        const target = Math.max(3, maxW * e ** (p.lvl + 1)) / 2;
        const off = p.x - cx;
        if (Math.abs(off) > target * .9) p.x -= off * dt * 1.6;
        if (p.lvl + 1 < n && p.y < rowY(p.lvl + 1) + barH / 2) {
          if (Math.random() < e) p.lvl++;
          else { p.lost = true; p.vx = (off >= 0 ? 1 : -1) * (40 + Math.random() * 40); p.vy = -10 - Math.random() * 20; }
        } else if (p.lvl === n - 1 && p.y < rowY(p.lvl) + barH / 2) { p.lost = true; p.vx = (Math.random() - .5) * 30; p.vy = -12; }
      }
      PY.parts = PY.parts.filter(p => p.life > 0 && p.y > 0 && p.x > -10 && p.x < w + 10);
    }
    for (const p of PY.parts) {
      ctx.globalAlpha = clamp(p.life, 0, 1) * (p.lost ? .6 : 1);
      ctx.fillStyle = p.lost ? C.bad : C.glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.lost ? 1.8 : 2.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Faustregel' : 'Faustregel, vereinfacht', 16, 14);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('nahrungsnetz', 4, {
    popLock: () => { ['#wIn', '#w0Btn', '#w10Btn', '#replayBtn'].forEach(s => $(s).disabled = false); setW0(POP.w0); },
    cascLock: () => { $('#yIn').disabled = false; $('#yPlay').disabled = false; $$('#wolfSel button').forEach(b => b.disabled = false); },
    pyrLock: () => { $('#effIn').disabled = false; $$('#lvlSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawPop(dt); drawCasc(dt); drawPyr(dt); });
})();
