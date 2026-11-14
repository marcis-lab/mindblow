/* mindblow – Lektion Ameisen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  /* ---------- Doppelbrücke: gemeinsames Modell für Teil 1 und 2 ----------
     Jede Ameise wählt am Abzweig mit Wahrscheinlichkeit (K + Duft)² (Modell von Deneubourg),
     ein kleiner Teil wählt rein zufällig. Nach jedem ganzen Weg legt sie eine Einheit Duft. */
  const K = 20, EPS = 0.03, SPEED = 0.55; // SPEED: kurze Wege pro Sekunde
  const mkBridge = o => Object.assign({ ratio: 1.6, n: 60, rho: 0.1, blocked: false, tau: [0, 0], ants: [], spawn: 0, t: 0, trips: 0, tripLog: [], hist: [], histT: 0, running: false }, o);
  const pick = B => {
    if (Math.random() < EPS) return Math.random() < .5 ? 0 : 1;
    const a = (K + B.tau[0]) ** 2, b = (K + B.tau[1]) ** 2;
    return Math.random() < a / (a + b) ? 0 : 1;
  };
  const mkAnt = (k, d, p) => ({ k, d, p, v: SPEED * (0.85 + Math.random() * 0.3), off: Math.random() * 2 - 1, food: d < 0, turn: false });
  const lenOf = (B, k) => k === 0 ? 1 : B.ratio;
  const shareShort = B => B.ants.length ? B.ants.filter(a => a.k === 0).length / B.ants.length : 0;

  const stepBridge = (B, dt) => {
    if (!B.running) return;
    B.t += dt;
    B.spawn -= dt;
    if (B.ants.length < B.n && B.spawn <= 0) { B.ants.push(mkAnt(pick(B), 1, 0)); B.spawn = 0.12; }
    if (B.ants.length > B.n) B.ants.length = B.n;
    for (const a of B.ants) {
      const p0 = a.p;
      a.p += a.d * a.v * dt / lenOf(B, a.k);
      // Stein in der Mitte des kurzen Wegs: umkehren
      if (B.blocked && a.k === 0 && !a.turn && (p0 - .5) * (a.p - .5) <= 0) { a.d = -a.d; a.turn = true; a.p = p0; continue; }
      if (a.d > 0 && a.p >= 1) {
        if (!a.turn) B.tau[a.k] += 1;
        Object.assign(a, { k: pick(B), d: -1, p: 1, food: !a.turn || a.food, turn: false });
      } else if (a.d < 0 && a.p <= 0) {
        if (!a.turn) { B.tau[a.k] += 1; if (a.food) { B.trips++; B.tripLog.push(B.t); } }
        Object.assign(a, { k: pick(B), d: 1, p: 0, food: false, turn: false });
      }
    }
    const f = Math.exp(-B.rho * dt); B.tau[0] *= f; B.tau[1] *= f;
    while (B.tripLog.length && B.tripLog[0] < B.t - 20) B.tripLog.shift();
    B.histT += dt;
    if (B.histT >= .5) { B.histT = 0; B.hist.push(shareShort(B)); if (B.hist.length > 120) B.hist.shift(); }
  };

  /* Geometrie: kurzer Bogen oben, langer Bogen unten, Länge passend zum Verhältnis */
  const geoCache = new Map();
  const mkPath = (x0, x1, y, bulge) => {
    const pts = [], cum = [0], N = 64;
    for (let i = 0; i <= N; i++) { const s = i / N; pts.push([x0 + (x1 - x0) * s, y + bulge * Math.sqrt(Math.sin(Math.PI * s))]); }
    for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, L: cum[N] };
  };
  const geometry = (w, h, ratio) => {
    const key = `${w}|${h}|${ratio}`;
    if (geoCache.has(key)) return geoCache.get(key);
    const small = w < 420;
    const pad = small ? 38 : 64, x0 = pad, x1 = w - pad, D = x1 - x0;
    const y = Math.round(h * .34), b0 = Math.min(34, D * .1);
    const up = mkPath(x0, x1, y, -b0);
    const maxDep = h - y - 34;
    let lo = b0 * .5, hi = maxDep;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (mkPath(x0, x1, y, m).L < ratio * up.L) lo = m; else hi = m; }
    const g = { x0, x1, y, small, paths: [up, mkPath(x0, x1, y, lo)] };
    if (geoCache.size > 40) geoCache.clear();
    geoCache.set(key, g);
    return g;
  };
  const posAt = (path, p) => {
    const d = clamp(p, 0, 1) * path.L, c = path.cum;
    let i = 1; while (i < c.length - 1 && c[i] < d) i++;
    const a = path.pts[i - 1], b = path.pts[i], f = (d - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  const strokePath = (ctx, path) => { ctx.beginPath(); path.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); };

  const drawBridge = (cv, B, opt = {}) => {
    const { ctx, w, h } = fit(cv);
    ctx.clearRect(0, 0, w, h);
    const g = geometry(w, h, B.ratio);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Wege
    for (const p of g.paths) { ctx.strokeStyle = C.line; ctx.lineWidth = 14; ctx.globalAlpha = .7; strokePath(ctx, p); }
    ctx.globalAlpha = 1;
    // Duftspuren
    const tMax = Math.max(B.tau[0], B.tau[1], 30);
    g.paths.forEach((p, k) => {
      const rel = B.tau[k] / tMax;
      if (rel < .02) return;
      ctx.strokeStyle = C.glow; ctx.globalAlpha = .15 + .7 * rel; ctx.lineWidth = 2 + 8 * rel; strokePath(ctx, p);
    });
    ctx.globalAlpha = 1;
    // Stein
    if (B.blocked) {
      const [sx, sy] = posAt(g.paths[0], .5);
      ctx.fillStyle = C.muted; ctx.beginPath();
      ctx.moveTo(sx - 15, sy + 9); ctx.lineTo(sx - 12, sy - 6); ctx.lineTo(sx - 2, sy - 12); ctx.lineTo(sx + 11, sy - 8); ctx.lineTo(sx + 16, sy + 4); ctx.lineTo(sx + 8, sy + 11); ctx.closePath(); ctx.fill();
      ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.fillText('Stein', sx, sy - 18);
    }
    // Nest und Futter
    ctx.beginPath(); ctx.arc(g.x0, g.y, 15, 0, TAU); ctx.fillStyle = C.copper; ctx.fill();
    ctx.beginPath(); ctx.arc(g.x0, g.y, 5, 0, TAU); ctx.fillStyle = C.bg; ctx.fill();
    ctx.beginPath(); ctx.arc(g.x1, g.y, 13, 0, TAU); ctx.fillStyle = C.good; ctx.fill();
    // Ameisen
    const r = g.small ? 2.2 : 2.6;
    for (const a of B.ants) {
      const [x, y] = posAt(g.paths[a.k], a.p);
      const yy = y + a.off * 3;
      ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(x, yy, r, 0, TAU); ctx.fill();
      if (a.food) { ctx.fillStyle = C.good; ctx.beginPath(); ctx.arc(x - a.d * (r + 1.5), yy, r * .8, 0, TAU); ctx.fill(); }
    }
    // Beschriftungen
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Nest', g.x0, g.y + 30); ctx.fillText('Futter', g.x1, g.y + 28);
    const [ux, uy] = posAt(g.paths[0], g.small ? .3 : .5);
    if (!B.blocked || g.small) ctx.fillText('kurz', ux, uy - 14);
    const [lx, ly] = posAt(g.paths[1], .5);
    ctx.fillText(`${fmt(B.ratio, 1)} × so lang`, lx, ly + 22);
    // Legende oben links
    ctx.textAlign = 'left'; ctx.fillStyle = C.glow; ctx.fillRect(12, 14, 16, 4);
    ctx.fillStyle = C.muted; ctx.fillText('Duftspur', 34, 20);
    if (!B.running && !B.ants.length) { ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.fillText(opt.idle || 'Drück auf «Ameisen loslassen»', w / 2, h - 12); }
    // Verlauf: Anteil auf dem kurzen Weg
    if (opt.spark) {
      const bw = g.small ? 96 : 130, bh = 34, bx = w - bw - 12, by = 10;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; roundRect(ctx, bx, by, bw, bh, 6); ctx.stroke();
      ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(bx, by + bh / 2); ctx.lineTo(bx + bw, by + bh / 2); ctx.stroke(); ctx.setLineDash([]);
      if (B.hist.length > 1) {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.8; ctx.beginPath();
        B.hist.forEach((v, i) => { const x = bx + bw * i / 119, y = by + bh - 3 - (bh - 6) * v; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      }
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(g.small ? 'kurz, 60 s' : 'Anteil kurz, 60 s', bx + bw, by + bh + 13);
    }
  };
  const tauText = B => {
    const a = B.tau[0], b = B.tau[1];
    if (a + b < 1) return '–';
    return a >= b ? `${fmt(a / Math.max(b, .1), 1)} : 1` : `1 : ${fmt(b / Math.max(a, .1), 1)}`;
  };
  const tauTextCap = B => { const s = tauText(B); return s.length > 12 ? (B.tau[0] > B.tau[1] ? '> 99 : 1' : '1 : > 99') : s; };

  /* ---------- Teil 1 ---------- */
  const bridgeCv = $('#bridgeCv');
  const B1 = mkBridge({ ratio: 1.6, n: 60, rho: 0.1 });
  let b1Calm = 0, b1Said = '';
  const say1 = (key, txt) => { if (b1Said !== key) { b1Said = key; $('#bridgeStatus').textContent = txt; } };
  $('#ratioIn').addEventListener('input', e => {
    B1.ratio = +e.target.value;
    $('#ratioOut').textContent = B1.ratio === 1 ? 'gleich lang' : `${fmt(B1.ratio, 1)} × so lang`;
    b1Said = ''; b1Calm = 0;
  });
  $('#antsIn').addEventListener('input', e => { B1.n = Math.round(+e.target.value); $('#antsOut').textContent = String(B1.n); });
  $('#bridgeBtn').addEventListener('click', () => {
    Object.assign(B1, { tau: [0, 0], ants: [], spawn: 0, t: 0, trips: 0, tripLog: [], hist: [], histT: 0, running: true });
    $('#bridgeBtn').textContent = 'Neu starten'; b1Said = ''; b1Calm = 0;
    say1('start', 'Noch riecht kein Weg. Die ersten Ameisen wählen zufällig.');
  });
  const updB1 = dt => {
    if (!B1.running) return;
    const s = shareShort(B1);
    $('#bShare').textContent = `${fmt(s * 100, 0)} %`;
    $('#bTau').textContent = tauTextCap(B1);
    $('#bTrips').textContent = fmt(B1.trips, 0);
    if (B1.t < 8) return;
    if (B1.ratio === 1) {
      const m = Math.max(s, 1 - s);
      if (m > .85) say1('sym', 'Beide Wege sind gleich lang, und trotzdem nimmt die Strasse fast nur einen. Ein kleiner Zufall am Anfang wurde verstärkt.');
      else say1('symw', 'Beide Wege sind gleich lang. Schau, ob sich trotzdem einer durchsetzt.');
      return;
    }
    if (b1Said === 'win') return;
    if (s > .8) { b1Calm += dt; if (b1Calm > 2) say1('win', `Nach ${fmt(B1.t, 0)} s laufen fast alle über den kurzen Weg. Keine einzelne Ameise hat das entschieden.`); }
    else if (s < .2 && B1.t > 30) say1('lose', 'Diesmal hat der lange Weg gewonnen. Das passiert auch echten Ameisen ab und zu, wenn der Zufall am Anfang ungünstig spielt. Starte neu.');
    else { b1Calm = 0; say1('mid', 'Wer kurz läuft, kommt öfter vorbei und legt mehr Duft. Schau auf die Spuren.'); }
  };

  /* ---------- Teil 2 ---------- */
  const blockCv = $('#blockCv');
  const B2 = mkBridge({ ratio: 1.8, n: 60, rho: 0.05 });
  const startB2 = () => {
    const ants = [];
    for (let i = 0; i < B2.n; i++) { const a = mkAnt(0, i % 2 ? 1 : -1, Math.random()); a.food = a.d < 0; ants.push(a); }
    Object.assign(B2, { tau: [330, 4], ants, spawn: 0, t: 0, trips: 0, tripLog: [], hist: [], histT: 0, running: true, blocked: false });
    $('#stoneBtn').textContent = 'Stein hinlegen'; $('#stoneBtn').disabled = false;
    $('#blockStart').textContent = 'Neu starten';
    $('#blockStatus').textContent = 'Die Strasse läuft über den kurzen Weg. Leg jetzt den Stein hin.';
    b2T = 0; b2Said = '';
  };
  let b2T = 0, b2Said = '';
  const hl = rho => rho <= 0 ? 'nie' : `${fmt(Math.LN2 / rho, 0)} s`;
  $('#evapIn').addEventListener('input', e => { B2.rho = +e.target.value; $('#evapOut').textContent = hl(B2.rho); b2Said = ''; });
  $('#blockStart').addEventListener('click', startB2);
  $('#stoneBtn').addEventListener('click', () => {
    B2.blocked = !B2.blocked; b2T = 0; b2Said = '';
    $('#stoneBtn').textContent = B2.blocked ? 'Stein wegnehmen' : 'Stein hinlegen';
    $('#blockStatus').textContent = B2.blocked
      ? 'Der kurze Weg ist versperrt. Doch dort riecht es noch stark. Was tun die Ameisen?'
      : 'Der Stein ist weg. Findet die Strasse zurück auf den kurzen Weg?';
  });
  const updB2 = dt => {
    if (!B2.running) return;
    const rate = B2.tripLog.length * (60 / Math.min(20, Math.max(B2.t, 1)));
    $('#kRate').textContent = B2.t < 3 ? '…' : fmt(rate, 0);
    $('#kShare').textContent = `${fmt(shareShort(B2) * 100, 0)} %`;
    $('#kTau').textContent = tauTextCap(B2);
    if (!B2.blocked) return;
    b2T += dt;
    const s = shareShort(B2);
    const say = (k, t) => { if (b2Said !== k) { b2Said = k; $('#blockStatus').textContent = t; } };
    if (s < .2) say('ok', `Nach ${fmt(b2T, 0)} s hat sich die Strasse auf den langen Weg umgestellt. Die alte Spur ist verdunstet.`);
    else if (b2T > 25 && B2.rho === 0) say('stuck0', 'Ohne Verdunstung bleibt die alte Spur für immer. Die meisten laufen weiter in die Sackgasse und kehren um. Schieb die Verdunstung hoch.');
    else if (b2T > 25) say('stuck', 'Die Spur hält lange. Viele Ameisen laufen noch immer zum Stein und kehren um. Mehr Verdunstung hilft beim Vergessen.');
  };

  /* ---------- Teil 3: Ameisen-Algorithmus für die Rundreise ---------- */
  const tspCv = $('#tspCv');
  const KM = 20; // Kartenbreite in km
  const T3 = { cities: [], d: [], tau: [], best: null, bestLen: Infinity, greedy: 0, iter: 0, running: false, acc: 0, rho: 0.2, ant: null, said: '' };
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const bigCount = n => {
    if (n < 3) return '1';
    let lg = Math.log10(.5);
    for (let k = 2; k < n; k++) lg += Math.log10(k);
    if (lg < 6) return fmt(Math.round(10 ** lg), 0);
    const e = Math.floor(lg), m = 10 ** (lg - e);
    return `${fmt(m, 1)} · 10${String(e).split('').map(c => SUP[+c]).join('')}`;
  };
  const tourLen = t => { let s = 0; for (let i = 0; i < t.length; i++) s += T3.d[t[i]][t[(i + 1) % t.length]]; return s; };
  const resetAco = () => {
    const n = T3.cities.length;
    T3.d = T3.cities.map(a => T3.cities.map(b => Math.hypot(a.x - b.x, a.y - b.y) * KM));
    T3.tau = T3.cities.map(() => new Array(n).fill(1));
    T3.best = null; T3.bestLen = Infinity; T3.iter = 0; T3.ant = null; T3.said = '';
    // gierige Route ab Ort 0
    const seen = new Array(n).fill(false), t = [0]; seen[0] = true;
    for (let s = 1; s < n; s++) {
      const i = t[t.length - 1]; let bj = -1;
      for (let j = 0; j < n; j++) if (!seen[j] && (bj < 0 || T3.d[i][j] < T3.d[i][bj])) bj = j;
      t.push(bj); seen[bj] = true;
    }
    T3.greedy = n > 1 ? tourLen(t) : 0;
    updTsp();
  };
  const newCities = n => {
    T3.cities = Array.from({ length: n }, () => ({ x: .05 + .9 * Math.random(), y: .05 + .9 * Math.random() }));
    resetAco();
  };
  const antTour = () => {
    const n = T3.cities.length, seen = new Array(n).fill(false);
    const t = [Math.floor(Math.random() * n)]; seen[t[0]] = true;
    const wts = new Array(n);
    for (let s = 1; s < n; s++) {
      const i = t[t.length - 1]; let sum = 0;
      for (let j = 0; j < n; j++) { wts[j] = seen[j] ? 0 : T3.tau[i][j] * (1 / Math.max(T3.d[i][j], .01)) ** 3; sum += wts[j]; }
      let r = Math.random() * sum, j = 0;
      for (; j < n; j++) { if (seen[j]) continue; r -= wts[j]; if (r <= 0) break; }
      if (j >= n) j = seen.indexOf(false);
      t.push(j); seen[j] = true;
    }
    return t;
  };
  const iterate = () => {
    const n = T3.cities.length;
    if (n < 4) return;
    const m = Math.max(10, n), tours = [];
    for (let k = 0; k < m; k++) { const t = antTour(); tours.push([t, tourLen(t)]); }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) T3.tau[i][j] = Math.max(.02, T3.tau[i][j] * (1 - T3.rho));
    const Q = T3.greedy / 2;
    const dep = (t, amt) => { for (let i = 0; i < n; i++) { const a = t[i], b = t[(i + 1) % n]; T3.tau[a][b] += amt; T3.tau[b][a] += amt; } };
    for (const [t, L] of tours) { dep(t, Q / L); if (L < T3.bestLen) { T3.bestLen = L; T3.best = t; } }
    dep(T3.best, 2 * Q / T3.bestLen);
    T3.ant = tours[Math.floor(Math.random() * tours.length)][0];
    T3.iter++;
  };
  const updTsp = () => {
    $('#tCount').textContent = bigCount(T3.cities.length);
    $('#tBest').textContent = T3.best ? `${fmt(T3.bestLen, 1)} km` : '–';
    $('#tIter').textContent = String(T3.iter);
    $('#tGreedy').textContent = T3.cities.length > 2 ? `${fmt(T3.greedy, 1)} km` : '–';
  };
  const ITER_MAX = 250;
  $('#cityIn').addEventListener('input', e => { $('#cityOut').textContent = e.target.value; newCities(+e.target.value); $('#tspStatus').textContent = 'Neue Karte. Schick die Ameisen los.'; });
  $('#rhoIn').addEventListener('input', e => { T3.rho = +e.target.value; $('#rhoOut').textContent = `${fmt(T3.rho * 100, 0)} %`; });
  $('#tspBtn').addEventListener('click', () => {
    if (T3.cities.length < 4) { $('#tspStatus').textContent = 'Es braucht mindestens 4 Orte.'; return; }
    if (T3.iter >= ITER_MAX) resetAco();
    T3.running = !T3.running;
    $('#tspBtn').textContent = T3.running ? 'Pause' : 'Weiter';
    if (T3.running) $('#tspStatus').textContent = 'In jeder Runde läuft jede Ameise eine ganze Rundreise. Kurze Strecken bekommen mehr Duft.';
  });
  $('#tspNew').addEventListener('click', () => { newCities(+$('#cityIn').value); T3.running = false; $('#tspBtn').textContent = 'Ameisen losschicken'; $('#tspStatus').textContent = 'Neue Karte. Schick die Ameisen los.'; });
  const mapRect = (w, h) => { const s = Math.min(w - 24, h - 44); return { x: (w - s) / 2, y: 30, s }; };
  tspCv.addEventListener('click', e => {
    if ($('#cityIn').disabled) return;
    const r = tspCv.getBoundingClientRect(), m = mapRect(r.width, r.height);
    const x = (e.clientX - r.left - m.x) / m.s, y = (e.clientY - r.top - m.y) / m.s;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    if (T3.cities.length >= 30) { $('#tspStatus').textContent = 'Mehr als 30 Orte passen hier nicht.'; return; }
    T3.cities.push({ x, y }); resetAco();
    $('#cityIn').value = T3.cities.length; $('#cityOut').textContent = String(T3.cities.length);
    $('#tspStatus').textContent = `Ort hinzugefügt. Jetzt ${T3.cities.length} Orte. Die Duftspuren beginnen von vorn.`;
  });
  newCities(14);

  const drawTsp = dt => {
    if (T3.running) {
      T3.acc += dt;
      const every = reduced ? .03 : .12;
      while (T3.acc >= every && T3.iter < ITER_MAX) { T3.acc -= every; iterate(); }
      if (T3.iter >= ITER_MAX) {
        T3.running = false; $('#tspBtn').textContent = 'Nochmal von vorn';
      }
      updTsp();
      if (T3.best && T3.said !== String(T3.iter > 40)) {
        T3.said = String(T3.iter > 40);
        if (T3.iter > 40) {
          const d = (T3.greedy - T3.bestLen) / T3.greedy * 100;
          $('#tspStatus').textContent = d > .5
            ? `Die Ameisen sind ${fmt(d, 0)} % kürzer als die gierige Route. Ob es die allerbeste ist, weiss niemand sicher.`
            : 'Hier ist die gierige Route schon sehr gut. Probier mehr Orte.';
        }
      }
    }
    const { ctx, w, h } = fit(tspCv);
    ctx.clearRect(0, 0, w, h);
    const m = mapRect(w, h), P = c => [m.x + c.x * m.s, m.y + c.y * m.s];
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; roundRect(ctx, m.x - 6, m.y - 6, m.s + 12, m.s + 12, 10); ctx.stroke();
    const n = T3.cities.length;
    // Duft auf den Kanten
    let tMax = .1;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) tMax = Math.max(tMax, T3.tau[i][j]);
    if (T3.iter > 0) {
      ctx.strokeStyle = C.glow; ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const rel = T3.tau[i][j] / tMax; if (rel < .06) continue;
        const [ax, ay] = P(T3.cities[i]), [bx, by] = P(T3.cities[j]);
        ctx.globalAlpha = .1 + .55 * rel; ctx.lineWidth = 1 + 5 * rel;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // beste Route
    if (T3.best) {
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.beginPath();
      T3.best.forEach((c, i) => { const [x, y] = P(T3.cities[c]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.stroke();
    }
    // Orte
    T3.cities.forEach((c, i) => {
      const [x, y] = P(c);
      ctx.beginPath(); ctx.arc(x, y, i === 0 ? 6.5 : 4.5, 0, TAU);
      ctx.fillStyle = i === 0 ? C.copper : C.fg; ctx.fill();
    });
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`${n} Orte · ${KM} km × ${KM} km`, 12, 18);
    ctx.textAlign = 'right';
    if (T3.best) { ctx.fillStyle = C.accent; ctx.fillText(w < 420 ? `beste: ${fmt(T3.bestLen, 1)} km` : `beste Route: ${fmt(T3.bestLen, 1)} km`, w - 12, 18); }
    else { ctx.fillText(w < 420 ? 'gross: Depot' : 'grosser Punkt: Depot', w - 12, 18); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('ameisen', 4, {
    bridgeLock: () => { $('#ratioIn').disabled = false; $('#antsIn').disabled = false; $('#bridgeBtn').disabled = false; },
    blockLock: () => { $('#evapIn').disabled = false; $('#blockStart').disabled = false; },
    tspLock: () => { $('#cityIn').disabled = false; $('#rhoIn').disabled = false; $('#tspBtn').disabled = false; $('#tspNew').disabled = false; },
  });

  loop(dt => {
    stepBridge(B1, dt); updB1(dt);
    drawBridge(bridgeCv, B1, { spark: true });
    stepBridge(B2, dt); updB2(dt);
    drawBridge(blockCv, B2, { idle: 'Drück auf «Ameisen loslassen»' });
    drawTsp(dt);
  });
})();
