/* mindblow – Lektion Geld */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  const chf = n => 'CHF ' + fmt(n, 0);
  const niceStep = (range, count) => {
    const raw = range / count, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  };
  const MONO = '11px Geist Mono, monospace';

  /* ---------- Teil 1: Bilanz einer Bank ---------- */
  // Vereinfacht: eine einzige Bank. Aktiven = Kredite + Reserven, Passiven = Kundenguthaben + Eigenkapital.
  const B0 = { K: 300000, R: 100000, D: 350000, E: 50000, B: 50000 };
  const LOAN = 100000, CASH = 10000, MAX_K = 1100000;
  const bank = { ...B0 };
  const shown = { ...B0, scale: 500000 };
  const pulse = { t: 0, kind: '' };
  const bankCv = $('#bankCv');

  const bankReadout = () => {
    $('#bM').textContent = chf(bank.D + bank.B);
    $('#bD').textContent = chf(bank.D);
    $('#bB').textContent = chf(bank.B);
  };
  const bankSay = t => { $('#bankStatus').textContent = t; };
  const flash = kind => { pulse.t = 1; pulse.kind = kind; };

  $('#loanBtn').addEventListener('click', () => {
    if (bank.K + LOAN > MAX_K) { bankSay('Für dieses Modell ist hier Schluss. Zahl zuerst einen Kredit zurück.'); return; }
    bank.K += LOAN; bank.D += LOAN; flash('loan');
    bankSay('Die Bank verbucht CHF 100\'000 Kredit und schreibt der Familie gleichzeitig CHF 100\'000 gut. Niemand sonst hat dafür weniger. Die Geldmenge ist gewachsen.');
    bankReadout();
  });
  $('#repayBtn').addEventListener('click', () => {
    if (bank.K < LOAN || bank.D < LOAN) { bankSay('Es gibt keinen Kredit mehr, den man zurückzahlen könnte.'); return; }
    bank.K -= LOAN; bank.D -= LOAN; flash('repay');
    bankSay('Kredit und Guthaben werden beide um CHF 100\'000 gelöscht. Die Geldmenge ist geschrumpft.');
    bankReadout();
  });
  $('#cashBtn').addEventListener('click', () => {
    if (bank.R < CASH || bank.D < CASH) { bankSay('Die Reserven der Bank sind aufgebraucht. In Wirklichkeit würde sie bei der Nationalbank neues Bargeld beziehen.'); return; }
    bank.D -= CASH; bank.R -= CASH; bank.B += CASH; flash('cash');
    bankSay('Die Geldmenge bleibt gleich: CHF 10\'000 wandern vom Konto ins Portemonnaie. Die Bank zahlt sie aus ihren Reserven aus.');
    bankReadout();
  });
  $('#bankReset').addEventListener('click', () => {
    Object.assign(bank, B0); pulse.t = 0;
    bankSay('Neu gestartet. Vereinfachtes Modell einer einzigen Bank.');
    bankReadout();
  });
  bankReadout();

  const drawBank = dt => {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    const target = { ...bank, scale: Math.max(bank.K + bank.R, bank.D + bank.E, bank.D + bank.B) * 1.08 };
    for (const key in target) shown[key] += (target[key] - shown[key]) * k;
    if (!reduced && pulse.t > 0) pulse.t = Math.max(0, pulse.t - dt / 1.6);

    const { ctx, w, h } = fit(bankCv);
    ctx.clearRect(0, 0, w, h);
    const top = 70, bottom = 34, ph = h - top - bottom, base = h - bottom;
    const colW = Math.max(52, Math.min(100, (w - 56) / 4));
    const xA = 16, xP = xA + colW + 6, xG = w - 16 - colW;
    const H = v => v / shown.scale * ph;

    // Grosse Zahl oben
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = MONO;
    ctx.fillText('GELDMENGE IM UMLAUF', 16, 22);
    ctx.fillStyle = C.fg; ctx.font = '26px Fraunces, Georgia, serif';
    ctx.fillText(chf(Math.round((shown.D + shown.B) / 1000) * 1000), 16, 52);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = MONO;
    ctx.fillText('vereinfacht', w - 16, 22);

    const seg = (x, y0, val, color, names) => {
      const hh = H(val), y = y0 - hh;
      if (hh > 0.5) {
        ctx.globalAlpha = .3; ctx.fillStyle = color; ctx.fillRect(x, y, colW, hh);
        ctx.globalAlpha = 1; ctx.fillRect(x, y, 3, hh);
        ctx.strokeStyle = C.surface; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + .5); ctx.lineTo(x + colW, y + .5); ctx.stroke();
        ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.font = '10.5px Geist Mono, monospace';
        const name = ctx.measureText(names[0]).width <= colW - 12 ? names[0] : names[1];
        if (hh >= 32) { ctx.fillText(name, x + 8, y + 15); ctx.fillStyle = C.muted; ctx.fillText(fmt(Math.round(val / 1000) * 1000, 0), x + 8, y + 28); }
        else if (hh >= 15) ctx.fillText(name, x + 8, y + hh / 2 + 4);
      }
      return y;
    };

    // Bank: Aktiven und Passiven
    const yK = seg(xA, base, shown.K, C.accent, ['Kredite', 'Kred.']);
    seg(xA, yK, shown.R, C.fiber, ['Reserven', 'Res.']);
    const yD = seg(xP, base, shown.D, C.glow, ['Guthaben', 'Guth.']);
    seg(xP, yD, shown.E, C.muted, ['Eigenkapital', 'EK']);
    // Geldmenge im Umlauf
    const yG = seg(xG, base, shown.D, C.glow, ['Guthaben', 'Guth.']);
    seg(xG, yG, shown.B, C.copper, ['Bargeld', 'Bar']);

    // Gestrichelte Verbindung: dieselben Guthaben zählen zur Geldmenge
    ctx.strokeStyle = C.glow; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xP + colW + 4, yD + .5); ctx.lineTo(xG - 4, yD + .5); ctx.stroke(); ctx.setLineDash([]);
    if (xG - (xP + colW) > 70) {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = MONO;
      ctx.fillText('= dasselbe', (xP + colW + xG) / 2, yD - 8);
      ctx.fillText('Guthaben', (xP + colW + xG) / 2, yD + 16);
    }

    // Hervorhebung der letzten Buchung
    if (pulse.t > 0) {
      ctx.globalAlpha = reduced ? 1 : Math.min(1, pulse.t * 1.5);
      ctx.lineWidth = 2;
      if (pulse.kind === 'loan') {
        ctx.strokeStyle = C.fg;
        ctx.strokeRect(xA + 1, yK + 1, colW - 2, H(LOAN) - 2);
        ctx.strokeRect(xP + 1, yD + 1, colW - 2, H(LOAN) - 2);
        ctx.strokeRect(xG + 1, yG + 1, colW - 2, H(LOAN) - 2);
        ctx.fillStyle = C.fg; ctx.font = '12px Geist Mono, monospace'; ctx.textAlign = 'left';
        ctx.fillText('+ neu', xG + 4, yG - 6 - H(shown.B));
      } else if (pulse.kind === 'repay') {
        ctx.strokeStyle = C.bad; ctx.setLineDash([4, 4]);
        ctx.strokeRect(xA + 1, yK - H(shown.R) - H(LOAN), colW - 2, H(LOAN));
        ctx.strokeRect(xG + 1, yG - H(shown.B) - H(LOAN), colW - 2, H(LOAN));
        ctx.setLineDash([]);
        ctx.fillStyle = C.bad; ctx.font = '12px Geist Mono, monospace'; ctx.textAlign = 'left';
        ctx.fillText('− gelöscht', xG - 2, yG - H(shown.B) - H(LOAN) - 6);
      } else if (pulse.kind === 'cash') {
        ctx.strokeStyle = C.copper;
        ctx.strokeRect(xG + 1, yG - H(shown.B) + 1, colW - 2, Math.max(1, H(CASH) - 2));
      }
      ctx.globalAlpha = 1;
    }

    // Beschriftung unten
    ctx.fillStyle = C.muted; ctx.font = MONO; ctx.textAlign = 'center';
    ctx.fillText('Aktiven', xA + colW / 2, base + 16);
    ctx.fillText('Passiven', xP + colW / 2, base + 16);
    ctx.fillText('Geldmenge', xG + colW / 2, base + 16);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, base + .5); ctx.lineTo(w - 10, base + .5); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = '600 11px Geist Mono, monospace';
    ctx.fillText('BANK', (xA + xP + colW) / 2, base + 29);
    ctx.fillText('IM UMLAUF', xG + colW / 2, base + 29);
  };

  /* ---------- Teil 2: Geldmenge über die Zeit ---------- */
  const OTHER = 200000;
  const F = { n: 2, t: 0, hist: [], auto: null };
  const fM = () => OTHER + F.n * LOAN;
  F.hist.push({ t: 0, M: fM(), ev: '' });
  const flowCv = $('#flowCv');
  const flowBtns = ['#fLoan', '#fRepay', '#fAuto'];
  const flowReadout = () => {
    $('#fM').textContent = chf(fM());
    $('#fN').textContent = F.n;
    $('#fT').textContent = F.t;
  };
  const month = ev => {
    if (ev === '+') F.n++;
    if (ev === '-') F.n--;
    F.t++; F.hist.push({ t: F.t, M: fM(), ev });
    if (F.hist.length > 61) F.hist.shift();
    flowReadout();
  };
  $('#fLoan').addEventListener('click', () => {
    if (F.n >= 20) { $('#flowStatus').textContent = 'Mehr Kredite will in diesem Modell gerade niemand.'; return; }
    month('+'); $('#flowStatus').textContent = 'Neuer Kredit: Die Geldmenge steigt um CHF 100\'000.';
  });
  $('#fRepay').addEventListener('click', () => {
    if (F.n <= 0) { $('#flowStatus').textContent = 'Alle Kredite sind zurückbezahlt.'; return; }
    month('-'); $('#flowStatus').textContent = 'Rückzahlung: Guthaben und Kredit sind gelöscht. Die Geldmenge sinkt um CHF 100\'000.';
  });
  $('#fAuto').addEventListener('click', () => {
    if (F.auto) return;
    flowBtns.forEach(s => $(s).disabled = true);
    let i = 0;
    const step = () => {
      i++;
      if (i <= 12) { month(Math.random() < .75 && F.n < 20 ? '+' : ''); $('#flowStatus').textContent = `Monat ${i} von 24: Boom. Viele wollen bauen und investieren und nehmen Kredite auf.`; }
      else { month(Math.random() < .75 && F.n > 0 ? '-' : ''); $('#flowStatus').textContent = `Monat ${i} von 24: Abschwung. Es wird mehr zurückbezahlt als neu geliehen.`; }
      if (i >= 24) {
        clearInterval(F.auto); F.auto = null;
        flowBtns.forEach(s => $(s).disabled = false);
        $('#flowStatus').textContent = 'Die Geldmenge ist im Boom gewachsen und im Abschwung wieder geschrumpft. Ganz ohne Notenpresse.';
      }
    };
    if (reduced) { while (i < 24) step(); }
    else F.auto = setInterval(step, 280);
  });
  flowReadout();

  const drawFlow = () => {
    const { ctx, w, h } = fit(flowCv);
    ctx.clearRect(0, 0, w, h);
    const p = { l: 62, r: 16, t: 30, b: 38 };
    const pw = w - p.l - p.r, ph = h - p.t - p.b;
    const x0 = F.hist[0].t, x1 = Math.max(x0 + 24, F.t);
    const maxM = Math.max(...F.hist.map(d => d.M), 600000);
    const yStep = niceStep(maxM, 4), yMax = Math.ceil(maxM / yStep) * yStep;
    const X = t => p.l + (t - x0) / (x1 - x0) * pw, Y = v => p.t + (1 - v / yMax) * ph;

    ctx.font = MONO; ctx.lineWidth = 1;
    // Gitter und Achsen
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (let v = 0; v <= yMax + 1; v += yStep) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(p.l, Y(v) + .5); ctx.lineTo(w - p.r, Y(v) + .5); ctx.stroke();
      ctx.fillText(fmt(v, 0), p.l - 8, Y(v) + 4);
    }
    const xStep = niceStep(x1 - x0, w < 420 ? 4 : 6);
    ctx.textAlign = 'center';
    for (let t = Math.ceil(x0 / xStep) * xStep; t <= x1; t += xStep) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(t) + .5, p.t + ph); ctx.lineTo(X(t) + .5, p.t + ph + 5); ctx.stroke();
      ctx.fillText(fmt(t, 0), X(t), p.t + ph + 18);
    }
    ctx.fillText('Monat', p.l + pw / 2, h - 6);
    ctx.textAlign = 'left'; ctx.fillText('Geldmenge in CHF', p.l, 16);

    // Fläche und Treppenlinie
    ctx.beginPath(); ctx.moveTo(X(F.hist[0].t), Y(0));
    F.hist.forEach((d, i) => { if (i) ctx.lineTo(X(d.t), Y(F.hist[i - 1].M)); ctx.lineTo(X(d.t), Y(d.M)); });
    ctx.lineTo(X(F.t), Y(0)); ctx.closePath();
    ctx.globalAlpha = .16; ctx.fillStyle = C.glow; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath();
    F.hist.forEach((d, i) => { if (!i) ctx.moveTo(X(d.t), Y(d.M)); else { ctx.lineTo(X(d.t), Y(F.hist[i - 1].M)); ctx.lineTo(X(d.t), Y(d.M)); } });
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    // Ereignisse
    for (const d of F.hist) {
      if (!d.ev) continue;
      ctx.beginPath(); ctx.arc(X(d.t), Y(d.M), 4, 0, Math.PI * 2);
      ctx.fillStyle = d.ev === '+' ? C.good : C.bad; ctx.fill();
    }
    // Legende
    ctx.textAlign = 'right'; ctx.font = MONO;
    const lx = w - p.r;
    ctx.fillStyle = C.bad; ctx.fillText('● Rückzahlung', lx, 16);
    const wr = ctx.measureText('● Rückzahlung').width;
    if (w > 380) { ctx.fillStyle = C.good; ctx.fillText('● Kredit', lx - wr - 12, 16); }
  };

  /* ---------- Teil 3: Tauschen ohne und mit Geld ---------- */
  let goods = 6;
  const tradeCv = $('#tradeCv');
  const tradeReadout = () => {
    const barter = goods * (goods - 1) / 2;
    $('#goodsOut').textContent = goods;
    $('#tBarter').textContent = fmt(barter, 0);
    $('#tMoney').textContent = fmt(goods, 0);
    $('#tFactor').textContent = `${fmt((goods - 1) / 2, 1)} : 1`;
    $('#tradeStatus').textContent = goods >= 20
      ? `${fmt(goods, 0)} Güter: ${fmt(barter, 0)} Tauschkurse statt ${fmt(goods, 0)} Preise. Ein Supermarkt hat über 10'000 Artikel. Ohne Geld wären das fast 50 Millionen Tauschkurse.`
      : goods <= 3
        ? 'Bei wenigen Gütern ist Tauschen noch einfach. Zieh den Regler nach rechts.'
        : 'Links ist jede Linie ein Tauschkurs, zum Beispiel «wie viele Eier für ein Brot». Rechts ist jede Linie ein Preis in Franken.';
  };
  $('#goodsIn').addEventListener('input', e => { goods = +e.target.value; tradeReadout(); });
  tradeReadout();

  const drawTrade = now => {
    const { ctx, w, h } = fit(tradeCv);
    ctx.clearRect(0, 0, w, h);
    const half = w / 2, cy = h / 2 + 4;
    const R = Math.max(30, Math.min(half - 26, h - 90) / 2);
    const spin = reduced ? 0 : now / 60000;
    const pts = cx => Array.from({ length: goods }, (_, i) => {
      const a = -Math.PI / 2 + i / goods * Math.PI * 2 + spin;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    });
    const nodeR = goods > 30 ? 3 : goods > 12 ? 4 : 6;

    // Ohne Geld: alle Paare
    const L = pts(half / 2);
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1;
    ctx.globalAlpha = Math.max(.12, Math.min(.85, 5 / goods));
    ctx.beginPath();
    for (let i = 0; i < goods; i++) for (let j = i + 1; j < goods; j++) { ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[j][0], L[j][1]); }
    ctx.stroke(); ctx.globalAlpha = 1;
    // Mit Geld: Stern
    const cxR = half + half / 2, Rr = pts(cxR);
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.2; ctx.globalAlpha = .8;
    ctx.beginPath();
    for (const [x, y] of Rr) { ctx.moveTo(cxR, cy); ctx.lineTo(x, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    for (const [x, y] of [...L, ...Rr]) { ctx.beginPath(); ctx.arc(x, y, nodeR, 0, Math.PI * 2); ctx.fillStyle = C.fg; ctx.fill(); }
    ctx.beginPath(); ctx.arc(cxR, cy, 16, 0, Math.PI * 2); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = '600 10px Geist Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('CHF', cxR, cy + 3.5);

    // Trennlinie und Titel
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(half + .5, 16); ctx.lineTo(half + .5, h - 16); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = '600 11px Geist Mono, monospace';
    ctx.fillText('OHNE GELD', half / 2, 22); ctx.fillText('MIT GELD', cxR, 22);
    ctx.fillStyle = C.muted; ctx.font = MONO;
    const nb = goods * (goods - 1) / 2;
    ctx.fillText(`${fmt(nb, 0)} Tauschkurs${nb === 1 ? '' : 'e'}`, half / 2, h - 14);
    ctx.fillText(`${fmt(goods, 0)} Preise`, cxR, h - 14);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('geld', 4, {
    bankLock: () => { ['#loanBtn', '#repayBtn', '#cashBtn', '#bankReset'].forEach(s => $(s).disabled = false); },
    flowLock: () => { flowBtns.forEach(s => $(s).disabled = false); },
    tradeLock: () => { $('#goodsIn').disabled = false; },
  });

  loop((dt, now) => { drawBank(dt); drawFlow(); drawTrade(now); });
})();
