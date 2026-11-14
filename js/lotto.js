/* mindblow – Lektion Wahrscheinlichkeit: Casino und Lotto */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const chf = n => 'CHF ' + fmt(Math.round(n), 0);
  const pct = (v, d = 1) => `${fmt(v * 100, d)} %`;

  /* ---------- Teil 1: Münzwurf ---------- */
  const coinCv = $('#coinCv');
  const MAX_FLIPS = 50000;
  const F = {
    n: 0, heads: 0, run: 0, side: -1, longest: 0,
    share: new Float32Array(MAX_FLIPS),      // Anteil Kopf nach jedem Wurf
    last: [],                                // letzte Würfe für die Münzreihe
    pending: 0, rate: 0, popT: 0,
    afterTotal: 0, afterSwitch: 0,           // was kam nach einer Serie von 4 oder mehr?
  };
  const flipOnce = () => {
    if (F.n >= MAX_FLIPS) return;
    const s = Math.random() < .5 ? 1 : 0;   // 1 = Kopf, 0 = Zahl
    if (F.run >= 4) { F.afterTotal++; if (s !== F.side) F.afterSwitch++; }
    if (s === F.side) F.run++; else { F.side = s; F.run = 1; }
    F.longest = Math.max(F.longest, F.run);
    F.heads += s;
    F.share[F.n] = F.heads / (F.n + 1);
    F.n++;
    F.last.push(s); if (F.last.length > 60) F.last.shift();
  };
  const coinReadout = () => {
    $('#cN').textContent = fmt(F.n, 0);
    $('#cK').textContent = F.n ? pct(F.heads / F.n) : '–';
    $('#cS').textContent = F.n ? `${F.longest}×` : '–';
    let msg;
    if (F.n >= MAX_FLIPS) msg = `Genug geworfen: ${fmt(MAX_FLIPS, 0)} Würfe. Drück auf «Neu», um von vorne zu beginnen.`;
    else if (F.afterTotal >= 5) msg = `Nach einer Serie von 4 oder mehr gleichen Würfen kam die andere Seite in ${fmt(F.afterSwitch, 0)} von ${fmt(F.afterTotal, 0)} Fällen (${pct(F.afterSwitch / F.afterTotal, 0)}). Also etwa halb-halb: Nichts ist fällig.`;
    else if (F.n >= 100) msg = 'Der Anteil Kopf pendelt sich bei 50 % ein. Das ist das Gesetz der grossen Zahl.';
    else if (F.n > 0) msg = 'Am Anfang springt der Anteil wild herum. Wirf mehr.';
    else msg = 'Wirf die Münze. Was kommt nach einer langen Serie?';
    $('#coinStatus').textContent = msg;
  };
  const queue = k => {
    if (reduced || k === 1) { for (let i = 0; i < k; i++) flipOnce(); F.popT = performance.now(); coinReadout(); return; }
    F.pending += k; F.rate = Math.max(F.rate, F.pending / (k >= 1000 ? 1.4 : .6));
  };
  $('#flip1').addEventListener('click', () => queue(1));
  $('#flip10').addEventListener('click', () => queue(10));
  $('#flip1000').addEventListener('click', () => queue(1000));
  $('#flipReset').addEventListener('click', () => {
    Object.assign(F, { n: 0, heads: 0, run: 0, side: -1, longest: 0, last: [], pending: 0, rate: 0, afterTotal: 0, afterSwitch: 0 });
    coinReadout();
  });
  coinReadout();

  const drawCoins = (dt, now) => {
    if (F.pending > 0) {
      const k = Math.min(F.pending, Math.max(1, Math.round(F.rate * dt)));
      for (let i = 0; i < k; i++) flipOnce();
      F.pending -= k; F.popT = now;
      if (F.pending <= 0) { F.pending = 0; F.rate = 0; }
      coinReadout();
    }
    const { ctx, w, h } = fit(coinCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;

    // Münzreihe: die letzten Würfe
    const r = 11, step = 26, rowY = 30;
    const fitN = Math.max(1, Math.floor((w - 24) / step));
    const shown = F.last.slice(-fitN);
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    if (!shown.length) ctx.fillText('Hier erscheinen deine Würfe. K = Kopf, Z = Zahl', 12, rowY + 4);
    // aktuelle Serie markieren
    const runShown = Math.min(F.run, shown.length);
    const x0 = 12 + r;
    if (runShown >= 2) {
      const xa = x0 + (shown.length - runShown) * step - r - 3, xb = x0 + (shown.length - 1) * step + r + 3;
      roundRect(ctx, xa, rowY - r - 4, xb - xa, r * 2 + 8, r + 4); ctx.fillStyle = C.sunk; ctx.fill();
    }
    shown.forEach((s, i) => {
      const x = x0 + i * step;
      let sc = 1;
      if (i === shown.length - 1 && !reduced) sc = 1 + .35 * Math.max(0, 1 - (now - F.popT) / 250);
      ctx.beginPath(); ctx.arc(x, rowY, r * sc, 0, TAU);
      ctx.fillStyle = s ? C.glow : C.fiber; ctx.fill();
      ctx.fillStyle = '#121310'; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(s ? 'K' : 'Z', x, rowY + 4);
    });
    if (F.run >= 2) {
      ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'left';
      ctx.fillText(`Aktuelle Serie: ${F.run}× ${F.side ? 'Kopf' : 'Zahl'}`, 12, rowY + r + 20);
    }

    // Diagramm: Anteil Kopf über die Anzahl Würfe (logarithmische x-Achse)
    const p = { l: 44, r: 14, t: 84, b: 34 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph;
    const nMax = Math.max(10, Math.pow(10, Math.ceil(Math.log10(Math.max(1, F.n)))));
    const lx = Math.log10(nMax);
    const X = n => p.l + Math.log10(n) / lx * pw;
    const Y = v => p.t + (1 - v) * ph;

    // Band: hier landen etwa 95 % aller Versuche (± 1/√n)
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const n = Math.pow(nMax, i / 60); ctx.lineTo(X(n), Y(clamp(.5 + 1 / Math.sqrt(n), 0, 1))); }
    for (let i = 60; i >= 0; i--) { const n = Math.pow(nMax, i / 60); ctx.lineTo(X(n), Y(clamp(.5 - 1 / Math.sqrt(n), 0, 1))); }
    ctx.closePath(); ctx.fillStyle = C.sunk; ctx.fill();

    ctx.lineWidth = 1; ctx.font = MONO; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (const v of [0, .25, .5, .75, 1]) {
      ctx.strokeStyle = C.line; ctx.setLineDash(v === .5 ? [4, 4] : []);
      if (v === .5) ctx.strokeStyle = C.muted;
      ctx.beginPath(); ctx.moveTo(p.l, Y(v) + .5); ctx.lineTo(w - p.r, Y(v) + .5); ctx.stroke();
      ctx.fillText(`${v * 100} %`, p.l - 6, Y(v) + 4);
    }
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    for (let e = 0; e <= lx; e++) {
      const n = Math.pow(10, e);
      const tw = ctx.measureText(fmt(n, 0)).width;
      ctx.fillText(fmt(n, 0), Math.min(X(n), w - p.r - tw / 2), base + 16);
    }
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Anteil Kopf' : 'Anteil Kopf nach n Würfen (grau: normaler Bereich)', p.l, p.t - 8);
    ctx.textAlign = 'center';
    ctx.fillText('Anzahl Würfe', p.l + pw / 2, h - 3);

    // Kurve
    if (F.n > 0) {
      ctx.beginPath();
      ctx.moveTo(X(1), Y(F.share[0]));
      let prev = 0;
      for (let px = 0; px <= pw; px++) {
        const n = Math.min(F.n, Math.round(Math.pow(10, px / pw * lx)));
        if (n <= prev) continue;
        ctx.lineTo(X(n), Y(F.share[n - 1])); prev = n;
        if (n >= F.n) break;
      }
      ctx.strokeStyle = C.copper; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      const lx1 = X(F.n), ly1 = Y(F.share[F.n - 1]);
      ctx.beginPath(); ctx.arc(lx1, ly1, 4, 0, TAU); ctx.fillStyle = C.copper; ctx.fill();
    }
  };

  /* ---------- Teil 2: Roulette, viele Spieler ---------- */
  const rouCv = $('#rouCv');
  const PLAYERS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const ROUNDS = [10, 50, 100, 200, 500, 1000, 5000];
  const P_RED = 18 / 37;
  const R = { players: 100, rounds: 200, net: new Int32Array(1000), done: 0, running: false, rate: 0 };
  const rouReadout = () => {
    $('#plOut').textContent = fmt(R.players, 0);
    $('#rdOut').textContent = fmt(R.rounds, 0);
    if (!R.done) { ['#rW', '#rC', '#rP'].forEach(s => $(s).textContent = '–'); return; }
    let win = 0, sum = 0;
    for (let i = 0; i < R.players; i++) { if (R.net[i] > 0) win++; sum += R.net[i]; }
    $('#rW').textContent = R.players === 1 ? (win ? 'Ja' : 'Nein') : pct(win / R.players, 0);
    $('#rC').textContent = chf(-sum);
    $('#rP').textContent = pct(-sum / (R.players * R.done), 2);
    if (!R.running && R.done === R.rounds) {
      const msg = R.players === 1
        ? `Eine Person allein kann Glück haben. ${win ? 'Diesmal im Plus.' : 'Diesmal im Minus.'} Nimm mehr Spieler, dann siehst du die Regel.`
        : `${fmt(win, 0)} von ${fmt(R.players, 0)} Spielern sind im Plus. Das Casino hat trotzdem ${chf(-sum)} verdient.${R.rounds < 5000 ? ' Probier mehr Runden: Dann gibt es immer weniger Gewinner.' : ' Je länger alle spielen, desto sicherer gewinnt das Casino.'}`;
      $('#rouStatus').textContent = msg;
    }
  };
  const resetRou = () => { R.net.fill(0); R.done = 0; R.running = false; rouReadout(); $('#rouStatus').textContent = 'Jede Person setzt pro Runde 1 Franken auf Rot. Drück auf «Spielen lassen».'; };
  const playRound = () => {
    for (let i = 0; i < R.players; i++) R.net[i] += Math.random() < P_RED ? 1 : -1;
    R.done++;
  };
  const startRou = () => {
    R.net.fill(0); R.done = 0; R.running = true;
    R.rate = R.rounds / 2.2;
    $('#rouStatus').textContent = 'Die Kugel rollt …';
    if (reduced) { while (R.done < R.rounds) playRound(); R.running = false; }
    rouReadout();
  };
  $('#plIn').addEventListener('input', e => { R.players = PLAYERS[+e.target.value]; resetRou(); });
  $('#rdIn').addEventListener('input', e => { R.rounds = ROUNDS[+e.target.value]; resetRou(); });
  $('#rouPlay').addEventListener('click', startRou);
  rouReadout();

  const drawRou = dt => {
    if (R.running) {
      const k = Math.min(R.rounds - R.done, Math.max(1, Math.round(R.rate * dt)));
      for (let i = 0; i < k; i++) playRound();
      if (R.done >= R.rounds) R.running = false;
      rouReadout();
    }
    const { ctx, w, h } = fit(rouCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const p = { l: 14, r: 14, t: 40, b: 46 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph;
    const n = R.rounds, mean = -n / 37, sd = Math.sqrt(n);
    const lo = mean - 4.2 * sd, hi = mean + 4.2 * sd;
    const nb = narrow ? 22 : 40;
    const bw = 2 * Math.max(1, Math.ceil((hi - lo) / nb / 2));   // Kontostand ändert sich in 2er-Schritten
    const k0 = Math.floor(lo / bw), k1 = Math.ceil(hi / bw);
    const bins = new Array(k1 - k0 + 1).fill(0);
    if (R.done) for (let i = 0; i < R.players; i++) {
      const k = clamp(Math.ceil(R.net[i] / bw), k0, k1);     // Fach k: (k−1)·bw < Ergebnis ≤ k·bw
      bins[k - k0]++;
    }
    const maxC = Math.max(1, ...bins);
    const X = v => p.l + (v - lo) / (hi - lo) * pw;

    // Säulen
    for (let k = k0; k <= k1; k++) {
      const c = bins[k - k0]; if (!c) continue;
      const xa = X((k - 1) * bw), xb = X(k * bw);
      const bh = c / maxC * (ph - 10);
      ctx.fillStyle = k >= 1 ? C.good : C.bad;
      ctx.fillRect(xa + .5, base - bh, Math.max(1, xb - xa - 1), bh);
    }
    // Achse
    ctx.strokeStyle = C.fg; ctx.globalAlpha = .5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.l, base + .5); ctx.lineTo(w - p.r, base + .5); ctx.stroke(); ctx.globalAlpha = 1;
    // Nulllinie (Start) und Erwartungswert
    ctx.font = MONO; ctx.textAlign = 'center';
    ctx.strokeStyle = C.fg; ctx.beginPath(); ctx.moveTo(X(0) + .5, p.t - 6); ctx.lineTo(X(0) + .5, base + 4); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.fillText('0', X(0), base + 16);
    if (R.done) {
      const m = -R.done / 37;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(m) + .5, p.t - 6); ctx.lineTo(X(m) + .5, base); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
    // Skala
    ctx.fillStyle = C.muted;
    const tick = [5, 10, 20, 50, 100, 200, 500].find(t => (hi - lo) / t <= (narrow ? 5 : 8));
    for (let v = Math.ceil(lo / tick) * tick; v <= hi; v += tick) if (v !== 0) {
      ctx.fillText((v > 0 ? '+' : '') + fmt(v, 0), X(v), base + 16);
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(v) + .5, base); ctx.lineTo(X(v) + .5, base + 4); ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Ergebnis in Fr.' : 'Ergebnis pro Person in Franken', p.l, h - 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.bad; ctx.fillText(narrow ? '■ Minus' : '■ im Minus', w - p.r - (narrow ? 58 : 76), h - 8);
    ctx.fillStyle = C.good; ctx.fillText(narrow ? '■ Plus' : '■ im Plus', w - p.r, h - 8);
    // Titel
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = '600 11px Geist Mono, monospace';
    ctx.fillText(`Runde ${fmt(R.done, 0)} von ${fmt(R.rounds, 0)} · ${fmt(R.players, 0)} Spieler`, p.l, 16);
    ctx.font = MONO; ctx.fillStyle = C.fg;
    if (R.done) ctx.fillText(narrow ? '--- Erwartung' : `--- Erwartung: ${fmt(-R.done / 37, 1)} Fr. pro Person`, p.l, 31);
    else { ctx.fillStyle = C.muted; ctx.fillText('Noch nicht gespielt', p.l, 31); }
  };

  /* ---------- Teil 3: Lotto ein Leben lang ---------- */
  const lotCv = $('#lotCv');
  const COMBOS = 31474716, P_JACK = 1 / COMBOS, PRICE = 2.5, SWISS = 9e6;
  const CELLS = 100, PER_CELL = COMBOS / (CELLS * CELLS);
  const L = { perWeek: 2, years: 50, swiss: false, shown: 0 };
  const tipps = () => L.swiss ? SWISS : L.perWeek * 52 * L.years;
  const chance = N => -Math.expm1(N * Math.log1p(-P_JACK));
  const pctSmart = c => {
    const v = c * 100;
    const d = v < .001 ? 5 : v < .01 ? 4 : v < .1 ? 3 : v < 1 ? 2 : 1;
    return `${fmt(v, d)} %`;
  };
  const sig3 = v => { const e = Math.pow(10, Math.floor(Math.log10(v)) - 2); return Math.round(v / e) * e; };
  const lotReadout = () => {
    $('#tpOut').textContent = L.perWeek; $('#yrOut').textContent = L.years;
    const N = tipps();
    $('#lN').textContent = fmt(N, 0);
    $('#lC').textContent = pctSmart(chance(N));
    $('#lK').textContent = chf(N * PRICE);
    $('#lotSwiss').textContent = L.swiss ? 'Zurück zu deinen Tipps' : 'Die ganze Schweiz spielt einmal';
    if (L.swiss) {
      $('#lotStatus').textContent = `9 Millionen Menschen, jede Person spielt einen zufälligen Tipp: Mit ${pctSmart(chance(N))} Wahrscheinlichkeit gewinnt überhaupt jemand. Einsatz: ${chf(N * PRICE)}.`;
    } else {
      const yrs50 = Math.LN2 / (-Math.log1p(-P_JACK)) / (L.perWeek * 52);
      $('#lotStatus').textContent = `Für eine 50-%-Chance auf den Jackpot müsstest du so etwa ${fmt(sig3(yrs50), 0)} Jahre lang spielen.`;
    }
  };
  const setLot = () => { L.swiss = false; lotReadout(); };
  $('#tpIn').addEventListener('input', e => { L.perWeek = +e.target.value; setLot(); });
  $('#yrIn').addEventListener('input', e => { L.years = +e.target.value; setLot(); });
  $('#lotSwiss').addEventListener('click', () => { L.swiss = !L.swiss; lotReadout(); });
  lotReadout();

  const drawLot = (dt, now) => {
    const target = tipps() / PER_CELL;
    L.shown = reduced ? target : L.shown + (target - L.shown) * Math.min(1, dt * 6);
    const { ctx, w, h } = fit(lotCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const textH = 62;
    const cs = Math.max(1.5, Math.min((w - 48) / CELLS, (h - textH - 30) / CELLS));
    const G = cs * CELLS, gx = Math.round((w - G) / 2), gy = 22;
    // ganzes Feld: alle Möglichkeiten
    ctx.fillStyle = C.sunk; ctx.fillRect(gx, gy, G, G);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const o = Math.round(i * G / 10) + .5;
      ctx.moveTo(gx + o, gy); ctx.lineTo(gx + o, gy + G);
      ctx.moveTo(gx, gy + o); ctx.lineTo(gx + G, gy + o);
    }
    ctx.stroke();
    // deine Tipps: Felder füllen, Zeile für Zeile
    const full = Math.floor(L.shown), part = L.shown - full;
    ctx.fillStyle = C.glow;
    const rowsFull = Math.floor(full / CELLS);
    if (rowsFull) ctx.fillRect(gx, gy, G, rowsFull * cs);
    const rest = full - rowsFull * CELLS;
    if (rest) ctx.fillRect(gx, gy + rowsFull * cs, rest * cs, cs);
    if (part > 0 && full < CELLS * CELLS) {
      ctx.globalAlpha = part; ctx.fillRect(gx + rest * cs, gy + rowsFull * cs, cs, cs); ctx.globalAlpha = 1;
    }
    // Lupe: kleine Mengen sonst unsichtbar
    if (L.shown < 100) {
      const pulse = reduced ? 0 : Math.sin(now / 400) * 2;
      const cx = gx + Math.max(cs, L.shown * cs) / 2, cy = gy + cs / 2;
      const rr = 16 + pulse + L.shown * cs / 2;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.strokeStyle = C.copper; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + rr * .72, cy + rr * .72); ctx.lineTo(cx + rr * .72 + 18, cy + rr * .72 + 18); ctx.stroke();
      ctx.font = '600 11px Geist Mono, monospace'; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      const lbl = 'deine Tipps';
      ctx.fillText(lbl, cx + rr * .72 + 22, cy + rr * .72 + 26);
    }
    // Legende
    const ty = gy + G + 22;
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.fg;
    ctx.fillText(narrow ? 'Ganzes Quadrat: 31\'474\'716 Tipps' : 'Ganzes Quadrat: alle 31\'474\'716 möglichen Tipps', gx, ty);
    ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? `1 Feld = ${fmt(PER_CELL, 0)} Tipps` : `Jedes der 10'000 Felder = ${fmt(PER_CELL, 0)} Tipps`, gx, ty + 16);
    ctx.fillStyle = C.glow; ctx.fillRect(gx, ty + 24, 10, 10);
    ctx.fillStyle = C.fg;
    ctx.fillText(`${L.swiss ? 'die ganze Schweiz' : 'du'}: ${fmt(L.shown / (CELLS * CELLS) * 100, L.shown < 100 ? 3 : 1)} % gefüllt`, gx + 16, ty + 33);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('lotto', 4, {
    coinLock: () => { ['#flip1', '#flip10', '#flip1000', '#flipReset'].forEach(s => $(s).disabled = false); },
    rouLock: () => { ['#plIn', '#rdIn', '#rouPlay'].forEach(s => $(s).disabled = false); startRou(); },
    lotLock: () => { ['#tpIn', '#yrIn', '#lotSwiss'].forEach(s => $(s).disabled = false); },
  });

  loop((dt, now) => { drawCoins(dt, now); drawRou(dt); drawLot(dt, now); });
})();
