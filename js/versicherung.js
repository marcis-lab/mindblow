/* mindblow – Lektion Versicherung */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const fr = v => `${fmt(Math.round(v), 0)} Fr.`;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  // Anzahl Treffer bei n Versuchen mit Wahrscheinlichkeit p (gross: Normal-Näherung)
  const binom = (n, p) => {
    if (n <= 2000) { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; }
    return Math.max(0, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gauss()));
  };

  /* ---------- Teil 1: Die gemeinsame Kasse ---------- */
  const poolCv = $('#poolCv');
  const P_THEFT = .02, BIKE = 1000;
  const K = { n: 200, prem: 20, bal: 0, years: 0, hist: [0], lastIn: 0, lastOut: 0, hit: new Set(), flash: 0, queue: 0, acc: 0 };
  const updPool = () => {
    $('#nOut').textContent = String(K.n);
    $('#premOut').textContent = fr(K.prem);
    $('#pIn').textContent = K.years ? fr(K.lastIn) : '–';
    $('#pOut').textContent = K.years ? fr(K.lastOut) : '–';
    $('#pBal').textContent = fr(K.bal);
    $('#pYears').textContent = `nach ${K.years} ${K.years === 1 ? 'Jahr' : 'Jahren'}`;
  };
  const poolReset = () => { Object.assign(K, { bal: 0, years: 0, hist: [0], lastIn: 0, lastOut: 0, hit: new Set(), queue: 0 }); updPool(); };
  const oneYear = () => {
    K.hit = new Set();
    for (let i = 0; i < K.n; i++) if (Math.random() < P_THEFT) K.hit.add(i);
    K.lastIn = K.n * K.prem; K.lastOut = K.hit.size * BIKE;
    K.bal += K.lastIn - K.lastOut; K.years++; K.hist.push(K.bal); K.flash = 1;
    const ev = K.n * P_THEFT;
    $('#poolStatus').textContent = `Jahr ${K.years}: ${K.hit.size} ${K.hit.size === 1 ? 'Velo' : 'Velos'} gestohlen (erwartet ${fmt(ev, 0)}). `
      + (K.bal < 0 ? 'Die Kasse ist im Minus!' : K.prem < 20 ? 'Die Prämie liegt unter dem Erwartungswert von 20 Fr. Auf Dauer geht das schief.' : K.prem > 20 ? 'Die Prämie liegt über 20 Fr., die Kasse wächst im Schnitt.' : 'Prämie = Erwartungswert: Im Schnitt geht es genau auf.');
    updPool();
  };
  $('#nIn').addEventListener('input', e => { K.n = +e.target.value; poolReset(); $('#poolStatus').textContent = `${K.n} Mitglieder: Im Schnitt ${fmt(K.n * P_THEFT, 0)} Diebstähle pro Jahr.`; });
  $('#premIn').addEventListener('input', e => { K.prem = +e.target.value; updPool(); });
  $('#yearBtn').addEventListener('click', () => { K.queue = 0; oneYear(); });
  $('#tenBtn').addEventListener('click', () => { if (reduced) { for (let i = 0; i < 10; i++) oneYear(); } else { K.queue = 10; K.acc = 1; } });
  $('#poolReset').addEventListener('click', () => { poolReset(); $('#poolStatus').textContent = 'Eine neue, leere Kasse.'; });
  updPool();

  const drawPool = dt => {
    if (K.queue > 0) { K.acc += dt; if (K.acc >= .35) { K.acc = 0; K.queue--; oneYear(); } }
    K.flash = Math.max(0, K.flash - dt * .8);
    const { ctx, w, h } = fit(poolCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    // Mitglieder-Gitter
    const gw = small ? w - 24 : w * .5, gh = small ? h * .45 : h - 28;
    const cols = Math.ceil(Math.sqrt(K.n * gw / gh)), rows = Math.ceil(K.n / cols);
    const cell = Math.min(gw / cols, gh / rows), r = Math.max(1.6, cell * .32);
    const ox = 12, oy = 16;
    for (let i = 0; i < K.n; i++) {
      const x = ox + cell * (i % cols + .5), y = oy + cell * ((i / cols | 0) + .5);
      const hit = K.hit.has(i);
      ctx.fillStyle = hit ? C.bad : C.accent;
      ctx.globalAlpha = hit ? 1 : .55;
      ctx.beginPath(); ctx.arc(x, y, hit ? r * (1 + .8 * K.flash) : r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Rechts (oder unten): Balken und Kassenverlauf
    const px = small ? 12 : w * .5 + 30, py = small ? oy + gh + 18 : 16, pw = small ? w - 24 : w - px - 14, ph = small ? h - py - 10 : h - 28;
    const bw = small ? 34 : 40, maxV = Math.max(K.n * 60, K.lastOut, 1);
    const bh = small ? ph - 16 : ph * .45;
    const bar = (x, v, col, lbl) => {
      const hh = bh * clamp(v / maxV, 0, 1);
      ctx.fillStyle = C.sunk; ctx.fillRect(x, py, bw, bh);
      ctx.fillStyle = col; ctx.fillRect(x, py + bh - hh, bw, hh);
      ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillText(lbl, x + bw / 2, py + bh + 13);
    };
    bar(px, K.lastIn, C.good, small ? 'rein' : 'Prämien');
    bar(px + bw + 12, K.lastOut, C.bad, small ? 'raus' : 'Schäden');
    // Kassenverlauf
    const lx = small ? px + 2 * bw + 40 : px, ly = small ? py : py + bh + 30, lw = small ? pw - (2 * bw + 40) : pw, lh = small ? bh : ph - bh - 30;
    const mx = Math.max(1000, ...K.hist.map(Math.abs));
    const Y = v => ly + lh / 2 - (lh / 2 - 4) * v / mx, n = Math.max(10, K.hist.length - 1);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, Y(0)); ctx.lineTo(lx + lw, Y(0)); ctx.stroke();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath();
    K.hist.forEach((v, i) => { const x = lx + lw * i / n; i ? ctx.lineTo(x, Y(v)) : ctx.moveTo(x, Y(v)); });
    ctx.stroke();
    if (K.hist.length > 1) {
      const v = K.bal, x = lx + lw * (K.hist.length - 1) / n;
      ctx.fillStyle = v < 0 ? C.bad : C.good; ctx.beginPath(); ctx.arc(x, Y(v), 4, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.font = MONO;
    ctx.fillText('Kassenstand', lx, ly + 10);
    ctx.textAlign = 'right'; ctx.fillText('0', lx - 3, Y(0) + 4);
  };

  /* ---------- Teil 2: Gesetz der grossen Zahlen ---------- */
  const lawCv = $('#lawCv');
  const YEARS = 500, PREM2 = 25, BIN = 5, XMAX = 100;
  const G = { n: 100, data: [], target: YEARS };
  const sToN = s => Math.round(10 * Math.pow(10000, s / 100)); // 10 bis 100'000
  const updLaw = () => {
    $('#gOut').textContent = fmt(G.n, 0);
    $('#lSd').textContent = `± ${fmt(BIKE * Math.sqrt(P_THEFT * (1 - P_THEFT) / G.n), 1)} Fr.`;
    if (G.data.length) {
      $('#lMax').textContent = fr(Math.max(...G.data));
      const def = G.data.filter(v => v > PREM2).length / G.data.length * 100;
      $('#lDef').textContent = `${fmt(def, def < 1 && def > 0 ? 1 : 0)} %`;
    } else { $('#lMax').textContent = '–'; $('#lDef').textContent = '–'; }
  };
  const roll = () => { G.data = []; updLaw(); if (reduced) { while (G.data.length < YEARS) G.data.push(binom(G.n, P_THEFT) * BIKE / G.n); updLaw(); } };
  $('#gIn').addEventListener('input', e => {
    G.n = sToN(+e.target.value); roll();
    $('#lawStatus').textContent = G.n <= 20 ? 'Kleine Gruppe: Ein einziger Diebstahl kostet jeden gleich ein Vielfaches des Schnitts.'
      : G.n >= 10000 ? 'Grosse Gruppe: Fast jedes Jahr liegt der Schaden pro Kopf nahe bei 20 Fr.' : `${fmt(G.n, 0)} Mitglieder. Prämie: 25 Fr. pro Kopf.`;
  });
  $('#rollBtn').addEventListener('click', roll);
  updLaw();
  let lawOn = false;

  const drawLaw = () => {
    if (lawOn && G.data.length < YEARS) {
      const k = Math.max(4, Math.round(YEARS / 90));
      for (let i = 0; i < k && G.data.length < YEARS; i++) G.data.push(binom(G.n, P_THEFT) * BIKE / G.n);
      updLaw();
    }
    const { ctx, w, h } = fit(lawCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const gx = small ? 36 : 46, gy = 22, gw = w - gx - 14, gh = h - gy - 40;
    const nb = XMAX / BIN + 1; // letzter Balken: 100 Fr. und mehr
    const bins = new Array(nb).fill(0);
    for (const v of G.data) bins[Math.min(nb - 1, Math.floor(v / BIN + 1e-9))]++;
    const maxC = Math.max(10, ...bins);
    const bwid = gw / nb;
    ctx.font = MONO; ctx.lineWidth = 1;
    // Achsen
    for (let f = 0; f <= 1; f += .25) {
      const y = gy + gh - gh * f;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(Math.round(maxC * f)), gx - 6, y + 4);
    }
    ctx.textAlign = 'left'; ctx.fillText('Jahre', 6, 12);
    bins.forEach((c, i) => {
      const x = gx + i * bwid, bh = gh * c / maxC;
      ctx.fillStyle = i * BIN >= PREM2 ? C.bad : C.accent; ctx.globalAlpha = .8;
      ctx.fillRect(x + 1, gy + gh - bh, bwid - 2, bh);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let v = 0; v <= XMAX; v += small ? 25 : 20) ctx.fillText(v === XMAX ? `${v}+` : String(v), gx + (v / BIN) * bwid, gy + gh + 15);
    ctx.textAlign = 'right'; ctx.fillText('Schaden pro Kopf in Fr.', gx + gw, gy + gh + 31);
    // Erwartungswert und Prämie
    const xE = gx + (20 / BIN) * bwid, xP = gx + (PREM2 / BIN) * bwid;
    ctx.strokeStyle = C.fg; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xE, gy); ctx.lineTo(xE, gy + gh); ctx.stroke();
    ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.moveTo(xP, gy); ctx.lineTo(xP, gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.fillText(small ? 'Ø 20' : 'Schnitt 20', xE - 4, gy + 10);
    ctx.textAlign = 'left'; ctx.fillStyle = C.bad; ctx.fillText(small ? 'Prämie' : 'Prämie 25', xP + 4, gy + 10);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(`${G.data.length} von ${YEARS} Jahren`, gx + gw, gy - 8);
  };

  /* ---------- Teil 3: 1'000 Leben ---------- */
  const lifeCv = $('#lifeCv');
  const LIVES = 1000, SPAN = 40, RUIN = 50000;
  const RISK = { big: { p: .002, L: 300000 }, small: { p: .2, L: 500 } };
  const LOAD = 1.3, ADMIN = 50;
  const Lf = { big: false, small: false, F: 0, year: 0, running: false, fate: [] };
  const newFate = () => {
    Lf.fate = Array.from({ length: LIVES }, () => {
      const ev = [];
      for (let y = 0; y < SPAN; y++) {
        if (Math.random() < RISK.big.p) ev.push({ y, k: 'big' });
        if (Math.random() < RISK.small.p) ev.push({ y, k: 'small' });
      }
      return ev;
    });
  };
  newFate();
  const premium = () => {
    let s = 0;
    for (const k of ['big', 'small']) if (Lf[k]) {
      const pay = Math.max(0, RISK[k].L - Lf.F);
      if (pay > 0) s += RISK[k].p * (pay * LOAD + ADMIN);
    }
    return s;
  };
  const evalLife = (ev, upTo) => {
    let cost = premium() * upTo, ruined = false, hitNow = false;
    for (const e of ev) {
      if (e.y >= upTo) continue;
      const L = RISK[e.k].L, own = Lf[e.k] ? Math.min(L, Lf.F) : L;
      cost += own;
      if (own > RUIN) ruined = true;
      if (e.y === upTo - 1) hitNow = true;
    }
    return { cost, ruined, hitNow };
  };
  const summary = upTo => {
    let sum = 0, ruin = 0;
    for (const ev of Lf.fate) { const r = evalLife(ev, upTo); sum += r.cost; if (r.ruined) ruin++; }
    return { avg: sum / LIVES, ruin };
  };
  const updLife = () => {
    $('#fOut').textContent = fr(Lf.F);
    $('#rPrem').textContent = fr(premium());
    if (Lf.year > 0) {
      const s = summary(Lf.year);
      $('#rCost').textContent = fr(s.avg);
      $('#rRuin').textContent = `${s.ruin} von 1'000`;
    } else { $('#rCost').textContent = '–'; $('#rRuin').textContent = '–'; }
  };
  const lifeMsg = () => {
    if (Lf.year < SPAN) return;
    const s = summary(SPAN);
    const ev = SPAN * (RISK.big.p * RISK.big.L + RISK.small.p * RISK.small.L);
    let m = `Nach 40 Jahren: im Schnitt ${fr(s.avg)} pro Leben. Ohne jede Versicherung wären es im Schnitt ${fr(ev)}. `;
    m += s.ruin ? `Aber ${s.ruin} Leben sind ruiniert.` : 'Niemand ist ruiniert.';
    if (Lf.small && Lf.F < RISK.small.L) m += ' Das kleine Risiko zu versichern, kostet viel Prämie für wenig Nutzen.';
    $('#lifeStatus').textContent = m;
  };
  const toggle = (sel, key) => $$(sel + ' button').forEach(b => b.addEventListener('click', () => {
    Lf[key] = b.dataset.on === '1';
    $$(sel + ' button').forEach(x => x.classList.toggle('active', x === b));
    updLife(); lifeMsg();
  }));
  toggle('#bigBtns', 'big'); toggle('#smallBtns', 'small');
  $('#fIn').addEventListener('input', e => {
    Lf.F = +e.target.value; updLife(); lifeMsg();
    if (Lf.year < SPAN) $('#lifeStatus').textContent = Lf.F >= RISK.small.L ? 'Die Franchise ist höher als der kleine Schaden: Den zahlst du immer selbst, dafür sinkt die Prämie.' : 'Mit Franchise trägst du kleine Beträge selbst.';
  });
  $('#liveBtn').addEventListener('click', () => {
    if (Lf.running) return;
    Lf.year = 0; Lf.acc = 0; Lf.running = true;
    if (reduced) { Lf.year = SPAN; Lf.running = false; lifeMsg(); }
    $('#lifeStatus').textContent = reduced ? $('#lifeStatus').textContent : 'Die Jahre laufen. Rot heisst: ein unversicherter grosser Schaden.';
    updLife();
  });
  $('#fateBtn').addEventListener('click', () => { newFate(); Lf.year = 0; Lf.running = false; updLife(); $('#lifeStatus').textContent = 'Neue Schicksale ausgewürfelt. Drück «40 Jahre leben».'; });
  updLife();

  const drawLife = dt => {
    if (Lf.running) {
      Lf.acc = (Lf.acc || 0) + dt;
      if (Lf.acc >= .09) { Lf.acc = 0; Lf.year++; updLife(); if (Lf.year >= SPAN) { Lf.running = false; lifeMsg(); } }
    }
    const { ctx, w, h } = fit(lifeCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const cols = small ? 25 : 40, rows = LIVES / cols;
    const top = 26, cell = Math.min((w - 24) / cols, (h - top - 30) / rows), r = Math.max(1.5, cell * .36);
    const ox = (w - cell * cols) / 2;
    const avgPrem = premium() * SPAN;
    Lf.fate.forEach((ev, i) => {
      const x = ox + cell * (i % cols + .5), y = top + cell * ((i / cols | 0) + .5);
      const res = Lf.year > 0 ? evalLife(ev, Lf.year) : null;
      let col = C.line, a = 1;
      if (res) {
        if (res.ruined) col = C.bad;
        else { col = C.accent; a = clamp(.25 + (res.cost - avgPrem * Lf.year / SPAN) / 4000, .25, 1); }
      }
      ctx.fillStyle = col; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, res && res.hitNow ? r * 1.5 : r, 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.font = MONO; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(`Jahr ${Lf.year} von ${SPAN}`, ox, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(small ? '1 Punkt = 1 Leben' : '1 Punkt = 1 Leben · dunkler = mehr selbst bezahlt', w - ox, 16);
    const yb = top + cell * rows + 18;
    ctx.textAlign = 'left'; ctx.fillStyle = C.bad; ctx.fillText('● ruiniert', ox, yb);
    ctx.fillStyle = C.accent; ctx.fillText('● kommt durch', ox + (small ? 90 : 110), yb);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('versicherung', 4, {
    poolLock: () => { ['#nIn', '#premIn', '#yearBtn', '#tenBtn', '#poolReset'].forEach(s => $(s).disabled = false); },
    lawLock: () => { $('#gIn').disabled = false; $('#rollBtn').disabled = false; lawOn = true; },
    lifeLock: () => {
      $$('#bigBtns button, #smallBtns button').forEach(b => b.disabled = false);
      ['#fIn', '#liveBtn', '#fateBtn'].forEach(s => $(s).disabled = false);
    },
  });

  loop(dt => { drawPool(dt); drawLaw(); drawLife(dt); });
})();
