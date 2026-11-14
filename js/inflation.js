/* mindblow – Lektion Inflation */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const fr = (n, d = 2) => `${fmt(n, d)} Fr.`;
  const ease = (cur, target, dt, k = 7) => reduced ? target : cur + (target - cur) * (1 - Math.exp(-dt * k));
  // Literale Farben für Gegenstände (Kokosnuss, Brot, Geldschein)
  const NUT = '#7a4a26', NUT_HI = '#a8703f', CRUST = '#c98a43', CRUST_DK = '#9a5f26', NOTE = '#5f9e6e';

  // Grösste Zelle, mit der n Elemente in ein Feld w × h passen
  const cellFor = (n, w, h) => {
    for (let s = 26; s > 3; s -= .5) {
      const cols = Math.floor(w / s);
      if (cols > 0 && Math.ceil(n / cols) * s <= h) return { s, cols };
    }
    return { s: 3, cols: Math.max(1, Math.floor(w / 3)) };
  };

  /* ---------- Teil 1: Inselmarkt ---------- */
  const islCv = $('#islCv');
  const I = { money: 200, crop: 100, shownMoney: 200, shownCrop: 100, shownPrice: 2 };
  const price = () => I.money / I.crop;
  const islUpd = msg => {
    $('#moneyIn').value = I.money; $('#cropIn').value = I.crop;
    $('#moneyOut').textContent = `${fmt(I.money, 0)} Fr.`;
    $('#cropOut').textContent = `${I.crop} Nüsse`;
    $('#iMoney').textContent = `${fmt(I.money, 0)} Fr.`;
    $('#iCrop').textContent = fmt(I.crop, 0);
    $('#iPrice').textContent = fr(price());
    const f = price() / 2;
    $('#islStatus').textContent = msg || (Math.abs(f - 1) < .005
      ? 'Wie am Anfang: 2 Fr. pro Nuss. Vereinfacht: Alles Geld wird jede Woche genau einmal für Kokosnüsse ausgegeben.'
      : `Eine Nuss kostet jetzt ${fmt(f, 2)}-mal so viel wie am Anfang. Vereinfacht: Alles Geld wird jede Woche einmal ausgegeben.`);
  };
  $('#moneyIn').addEventListener('input', e => { I.money = +e.target.value; islUpd(); });
  $('#cropIn').addEventListener('input', e => { I.crop = +e.target.value; islUpd(); });
  $('#dblMoney').addEventListener('click', () => {
    if (I.money * 2 > 1000) { islUpd('Mehr Geld passt nicht auf diese kleine Insel. Setz zurück oder probier die Ernte.'); return; }
    I.money *= 2;
    islUpd(`Doppelt so viel Geld, gleich viele Nüsse: Der Preis verdoppelt sich auf ${fr(price())}. Niemand kann mehr Nüsse essen als vorher.`);
  });
  $('#badCrop').addEventListener('click', () => {
    I.crop = Math.max(20, Math.round(I.crop / 2 / 10) * 10);
    islUpd(`Ein Sturm, nur halb so viele Nüsse: Gleich viel Geld jagt weniger Waren. Der Preis steigt auf ${fr(price())}, auch ohne neues Geld.`);
  });
  $('#islReset').addEventListener('click', () => { I.money = 200; I.crop = 100; islUpd(); });
  islUpd('Vereinfacht: Alles Geld wird jede Woche genau einmal für Kokosnüsse ausgegeben.');

  const drawIsland = dt => {
    I.shownMoney = ease(I.shownMoney, I.money, dt);
    I.shownCrop = ease(I.shownCrop, I.crop, dt);
    I.shownPrice = ease(I.shownPrice, price(), dt);
    const { ctx, w, h } = fit(islCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const pad = 12, gap = 12, top = 30, boxH = h - top - 96;
    const bw = (w - pad * 2 - gap) / 2;
    const boxes = [
      { x: pad, label: narrow ? 'Waren' : 'Waren: Kokosnüsse', n: Math.round(I.shownCrop) },
      { x: pad + bw + gap, label: narrow ? 'Geld (je 10 Fr.)' : 'Geld: Scheine zu 10 Fr.', n: Math.round(I.shownMoney / 10) },
    ];
    ctx.font = MONO; ctx.textAlign = 'left';
    boxes.forEach((b, k) => {
      roundRect(ctx, b.x, top, bw, boxH, 14); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.fillStyle = C.muted; ctx.fillText(b.label, b.x + 2, top - 10);
      const inner = 10, aw = bw - inner * 2, ah = boxH - inner * 2;
      // Platz für das Maximum, damit sich die Grösse beim Schieben nicht ändert
      const { s, cols } = cellFor(k === 0 ? 200 : 100, aw, ah);
      for (let i = 0; i < b.n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const x = b.x + inner + c * s, y = top + boxH - inner - (r + 1) * s;   // von unten aufstapeln
        if (k === 0) {
          ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * .4, 0, TAU); ctx.fillStyle = NUT; ctx.fill();
          ctx.beginPath(); ctx.arc(x + s * .42, y + s * .42, s * .12, 0, TAU); ctx.fillStyle = NUT_HI; ctx.fill();
        } else {
          const nw = s * .86, nh = s * .56;
          roundRect(ctx, x + (s - nw) / 2, y + (s - nh) / 2, nw, nh, Math.min(2, nh * .2)); ctx.fillStyle = NOTE; ctx.fill();
          if (s > 9) { ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, nh * .22, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }
        }
      }
    });
    // Preisschild
    const ty = top + boxH + 16, th = 64;
    roundRect(ctx, pad, ty, w - pad * 2, th, 14); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const f = I.shownPrice / 2;
    ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Preis pro Nuss' : 'Preis pro Nuss = Geld ÷ Nüsse (vereinfacht)', pad + 14, ty + 22);
    ctx.fillStyle = f > 1.005 ? C.bad : f < .995 ? C.good : C.fg;
    ctx.font = '600 24px Geist Mono, monospace';
    ctx.fillText(fr(I.shownPrice), pad + 14, ty + 50);
    // Balken: Preis im Vergleich zum Start
    const bx = narrow ? pad + 150 : pad + 230, bwid = w - pad - 14 - bx;
    if (bwid > 40) {
      const maxF = 10, sx = v => bx + Math.min(1, v / maxF) * bwid;
      roundRect(ctx, bx, ty + 38, bwid, 10, 5); ctx.fillStyle = C.sunk; ctx.fill();
      roundRect(ctx, bx, ty + 38, Math.max(10, sx(f) - bx), 10, 5); ctx.fillStyle = f > 1.005 ? C.bad : C.glow; ctx.fill();
      ctx.fillStyle = C.fg; ctx.fillRect(sx(1) - 1, ty + 33, 2, 20);
      ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'right';
      ctx.fillText(`×${fmt(f, 2)} ${narrow ? '' : 'vom Start'}`.trim(), w - pad - 14, ty + 26);
    }
  };

  /* ---------- Teil 2: Kaufkraft ---------- */
  const powCv = $('#powCv');
  const P = { inf: 2, yrs: 35, shownInf: 2 };
  const real = (t, i = P.inf) => 100 / Math.pow(1 + i / 100, t);
  const half = i => Math.log(2) / Math.log(1 + i / 100);
  const powUpd = () => {
    $('#infIn').value = P.inf; $('#yrsIn').value = P.yrs;
    $('#infOut').textContent = `${fmt(P.inf, 1)} %`;
    $('#yrsOut').textContent = P.yrs;
    const r = real(P.yrs);
    $('#pReal').textContent = fr(r);
    $('#pPrice').textContent = fr(100 * Math.pow(1 + P.inf / 100, P.yrs));
    if (P.inf === 0) {
      $('#pHalf').textContent = 'nie'; $('#pRule').textContent = 'ohne Teuerung';
      $('#powStatus').textContent = 'Ohne Teuerung bleibt die Kaufkraft gleich. Vereinfacht: Das ist in der Wirklichkeit selten.';
    } else {
      const hl = half(P.inf);
      $('#pHalf').textContent = `${fmt(hl, 1)} Jahren`;
      $('#pRule').textContent = `Faustregel: 70 ÷ ${fmt(P.inf, 1)} = ${fmt(70 / P.inf, 1)}`;
      $('#powStatus').textContent = `Nach ${P.yrs} Jahren kaufen 100 Fr. so viel wie heute ${fr(r)}. Verloren: ${fmt(100 - r, 0)} % der Kaufkraft. Vereinfacht: jedes Jahr gleich viel Teuerung.`;
    }
  };
  $('#infIn').addEventListener('input', e => { P.inf = +e.target.value; powUpd(); });
  $('#yrsIn').addEventListener('input', e => { P.yrs = +e.target.value; powUpd(); });
  $('#powEx').addEventListener('click', () => { P.inf = 2; P.yrs = 35; powUpd(); });
  $('#powZero').addEventListener('click', () => { P.inf = 0; powUpd(); });
  powUpd();

  const drawPow = dt => {
    P.shownInf = ease(P.shownInf, P.inf, dt);
    const { ctx, w, h } = fit(powCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const p = { l: 44, r: 16, t: 34, b: 38 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph, N = 50;
    const X = t => p.l + t / N * pw, Y = v => p.t + (1 - v / 110) * ph;
    // Gitter
    ctx.font = MONO; ctx.lineWidth = 1; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (let v = 0; v <= 100; v += 25) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(p.l, Y(v) + .5); ctx.lineTo(w - p.r, Y(v) + .5); ctx.stroke();
      ctx.fillText(fmt(v, 0), p.l - 8, Y(v) + 4);
    }
    ctx.textAlign = 'center';
    for (let t = 0; t <= N; t += narrow ? 10 : 5) ctx.fillText(t, X(t), base + 18);
    ctx.fillText('Jahre', p.l + pw / 2, h - 6);
    ctx.textAlign = 'left'; ctx.fillText(narrow ? 'Kaufkraft in Fr.' : 'Was 100 Fr. kaufen können, in Fr. von heute', 8, 16);
    // verlorene Kaufkraft
    const cur = t => real(t, P.shownInf);
    ctx.beginPath(); ctx.moveTo(X(0), Y(100));
    for (let t = 0; t <= N; t += .5) ctx.lineTo(X(t), Y(cur(t)));
    ctx.lineTo(X(N), Y(100)); ctx.closePath();
    ctx.globalAlpha = .14; ctx.fillStyle = C.bad; ctx.fill(); ctx.globalAlpha = 1;
    // Nennwert
    ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(0), Y(100)); ctx.lineTo(X(N), Y(100)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'auf der Note: 100' : 'Auf der Note steht immer 100', w - p.r, Y(100) - 6);
    // Halbierung
    if (P.shownInf > .05) {
      const hl = half(P.shownInf);
      if (hl <= N) {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = C.copper; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(0), Y(50)); ctx.lineTo(X(hl), Y(50)); ctx.lineTo(X(hl), base); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.copper; ctx.textAlign = 'left';
        const lbl = `halb nach ${fmt(hl, 1)} J.`;
        const lw = ctx.measureText(lbl).width;
        ctx.fillText(lbl, Math.min(X(hl) + 6, w - p.r - lw), Y(50) - 6);
      }
    }
    // Kurve
    ctx.beginPath();
    for (let t = 0; t <= N; t += .5) t ? ctx.lineTo(X(t), Y(cur(t))) : ctx.moveTo(X(t), Y(cur(t)));
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2.5; ctx.stroke();
    // gewähltes Jahr
    const v = cur(P.yrs), px = X(P.yrs), py = Y(v);
    ctx.strokeStyle = C.fg; ctx.globalAlpha = .35; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + .5, p.t); ctx.lineTo(px + .5, base); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.surface; ctx.stroke();
    ctx.font = '600 12px Geist Mono, monospace'; ctx.fillStyle = C.fg;
    const lbl = fr(v), lw = ctx.measureText(lbl).width;
    const lx = px + 10 + lw > w - p.r ? px - 10 - lw : px + 10;
    ctx.textAlign = 'left'; ctx.fillText(lbl, lx, Math.min(base - 8, py + 18));
    // x-Achse
    ctx.strokeStyle = C.fg; ctx.globalAlpha = .5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.l, base + .5); ctx.lineTo(w - p.r, base + .5); ctx.stroke(); ctx.globalAlpha = 1;
  };

  /* ---------- Teil 3: Der Brotpreis in vier Welten ---------- */
  const brdCv = $('#brdCv');
  const START = 4;
  const SCEN = {
    defl: { f: .98, unit: 'Jahre', step: 1, rate: '−2 % pro Jahr', rateF: 'Beispiel',
      msg: 'Deflation: Das Brot wird jedes Jahr billiger. Klingt gut, aber wer ein Velo oder ein Auto kaufen will, wartet lieber. Firmen verkaufen weniger und sparen bei Löhnen. Beispielzahlen, vereinfacht.' },
    stab: { f: 1.01, unit: 'Jahre', step: 1, rate: '+1 % pro Jahr', rateF: 'Beispiel, SNB-Ziel: unter 2 %',
      msg: 'Preisstabilität: Das Brot wird langsam etwas teurer, so langsam, dass man gut planen kann. Löhne steigen meist ähnlich mit. Beispielzahlen, vereinfacht.' },
    high: { f: 1.10, unit: 'Jahre', step: 1, rate: '+10 % pro Jahr', rateF: 'Beispiel',
      msg: 'Hohe Inflation: Nach 10 Jahren kostet das Brot mehr als das Doppelte. Ersparnisse verlieren schnell an Wert, und Löhne hinken oft hinterher. Beispielzahlen, vereinfacht.' },
    hyper: { f: Math.pow(2, 3 / 3.7), unit: 'Tage', step: 3, rate: '×2 alle 3,7 Tage', rateF: 'Deutschland Okt. 1923, geschätzt',
      msg: 'Hyperinflation: In Deutschland verdoppelten sich die Preise im Herbst 1923 zeitweise alle paar Tage (Schätzung, gerundet). Löhne wurden täglich ausbezahlt und sofort ausgegeben. In Simbabwe war es 2008 noch schlimmer.' },
  };
  const B = { s: 'stab', t: 10, shown: START * Math.pow(1.01, 10) };
  const bPrice = (t = B.t, s = B.s) => START * Math.pow(SCEN[s].f, t);
  const big = n => n >= 1e4 ? fmt(n, 0) : fmt(n, 2);
  const brdUpd = () => {
    const S = SCEN[B.s], p = bPrice();
    $('#timeIn').value = B.t;
    $('#timeOut').textContent = `${B.t * S.step} ${S.unit}`;
    $('#bPrice').textContent = `${big(p)} Fr.`;
    const n = Math.floor(100 / p + 1e-9);
    $('#bCount').textContent = n >= 1 ? fmt(n, 0) : 'keines';
    $('#bRate').textContent = S.rate; $('#bRateF').textContent = S.rateF;
    $('#brdStatus').textContent = S.msg;
  };
  $$('#scen button').forEach(b => b.addEventListener('click', () => {
    B.s = b.dataset.s;
    $$('#scen button').forEach(x => x.classList.toggle('active', x === b));
    brdUpd();
  }));
  $('#timeIn').addEventListener('input', e => { B.t = +e.target.value; brdUpd(); });
  brdUpd();

  const drawLoaf = (ctx, x, y, s) => {   // x,y = Mitte, s = Breite
    ctx.beginPath(); ctx.ellipse(x, y, s / 2, s * .3, 0, Math.PI, 0); ctx.lineTo(x + s / 2, y + s * .08);
    ctx.quadraticCurveTo(x, y + s * .16, x - s / 2, y + s * .08); ctx.closePath();
    ctx.fillStyle = CRUST; ctx.fill();
    if (s > 20) {
      ctx.strokeStyle = CRUST_DK; ctx.lineWidth = Math.max(1, s * .03); ctx.lineCap = 'round';
      for (const k of [-.22, 0, .22]) { ctx.beginPath(); ctx.moveTo(x + k * s - s * .06, y - s * .2); ctx.lineTo(x + k * s + s * .06, y - s * .06); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
  };

  const drawBread = dt => {
    const target = bPrice();
    B.shown = reduced ? target : Math.exp(ease(Math.log(B.shown), Math.log(target), dt, 6));
    const S = SCEN[B.s];
    const { ctx, w, h } = fit(brdCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const pad = 12, bandH = 116;
    // oben: Brot mit Preisschild und Einkauf für 100 Fr.
    roundRect(ctx, pad, pad, w - pad * 2, bandH, 14); ctx.fillStyle = C.sunk; ctx.fill();
    const ls = narrow ? 74 : 96;
    drawLoaf(ctx, pad + 16 + ls / 2, pad + bandH / 2 + 10, ls);
    const tx = pad + 32 + ls;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = MONO;
    ctx.fillText(B.t ? `Brot nach ${B.t * S.step} ${S.unit}n` : 'Brot heute', tx, pad + 24);
    const pr = B.shown;
    ctx.fillStyle = pr > START * 1.005 ? C.bad : pr < START * .995 ? C.good : C.fg;
    ctx.font = `600 ${narrow ? 20 : 26}px Geist Mono, monospace`;
    ctx.fillText(`${big(pr)} Fr.`, tx, pad + (narrow ? 50 : 56), w - tx - pad - 8);
    // kleine Brote: was 100 Fr. kaufen
    const n = Math.min(25, Math.floor(100 / pr + 1e-9));
    ctx.fillStyle = C.muted; ctx.font = MONO;
    ctx.fillText(n >= 1 ? (narrow ? `100 Fr. = ${Math.floor(100 / pr + 1e-9)} Brote` : `Für 100 Fr. bekommst du ${Math.floor(100 / pr + 1e-9)} Brote`) : 'Für 100 Fr. nicht mal ein Brot', tx, pad + (narrow ? 72 : 78));
    const is = 13, perRow = Math.max(1, Math.floor((w - tx - pad - 8) / is));
    for (let i = 0; i < n; i++) {
      const c = i % perRow, r = Math.floor(i / perRow);
      if (r > 1) break;
      drawLoaf(ctx, tx + c * is + is / 2, pad + (narrow ? 88 : 94) + r * 12, is - 2);
    }
    // unten: Verlauf
    const p = { l: 52, r: 16, t: pad + bandH + 30, b: 30 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b, base = p.t + ph;
    const vals = Array.from({ length: 11 }, (_, t) => bPrice(t));
    const top = Math.max(...vals), raw = top / 3, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const tick = [1, 2, 2.5, 5, 10].map(m => m * mag).find(v => v >= raw);
    const vMax = Math.max(Math.ceil(top / tick) * tick, top * 1.08);
    const X = t => p.l + t / 10 * pw, Y = v => p.t + (1 - v / vMax) * ph;
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`Brotpreis in Fr. · ${narrow ? S.rate : S.rate + ' (' + S.rateF + ')'}`, 8, p.t - 14, w - 16);
    ctx.textAlign = 'right'; ctx.lineWidth = 1;
    for (let v = 0; v <= vMax + 1e-9; v += tick) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(p.l, Y(v) + .5); ctx.lineTo(w - p.r, Y(v) + .5); ctx.stroke();
      ctx.fillText(fmt(v, Number.isInteger(v) ? 0 : 1), p.l - 8, Y(v) + 4);
    }
    ctx.textAlign = 'center';
    for (let t = 0; t <= 10; t += narrow ? 5 : 2) ctx.fillText(t * S.step, X(t), base + 16);
    ctx.textAlign = 'right'; ctx.fillText(S.unit, w - p.r, base + 28);
    // Startpreis
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(p.l, Y(START)); ctx.lineTo(w - p.r, Y(START)); ctx.stroke(); ctx.setLineDash([]);
    // Kurve bis zur gewählten Zeit kräftig, danach blass
    const curve = (t0, t1) => { ctx.beginPath(); for (let t = t0; t <= t1 + 1e-9; t += .1) t === t0 ? ctx.moveTo(X(t), Y(bPrice(t))) : ctx.lineTo(X(t), Y(bPrice(t))); ctx.stroke(); };
    ctx.lineWidth = 2; ctx.strokeStyle = C.line; curve(0, 10);
    ctx.lineWidth = 2.5; ctx.strokeStyle = B.s === 'defl' ? C.fiber : B.s === 'stab' ? C.glow : C.bad; if (B.t > 0) curve(0, B.t);
    ctx.beginPath(); ctx.arc(X(B.t), Y(bPrice()), 5, 0, TAU); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('inflation', 4, {
    islLock: () => { ['#moneyIn', '#cropIn', '#dblMoney', '#badCrop', '#islReset'].forEach(s => $(s).disabled = false); },
    powLock: () => { ['#infIn', '#yrsIn', '#powEx', '#powZero'].forEach(s => $(s).disabled = false); },
    brdLock: () => { $('#timeIn').disabled = false; $$('#scen button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawIsland(dt); drawPow(dt); drawBread(dt); });
})();
