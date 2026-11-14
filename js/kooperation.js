/* mindblow – Lektion Zusammenarbeit (Gefangenendilemma) */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  // Punkte: [ich, du] für meinen Zug + deinen Zug
  const PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };
  const pay = (a, b) => PAY[a + b];
  const flip = x => x === 'C' ? 'D' : 'C';

  /* Strategien: bekommen die eigenen und die gegnerischen Züge */
  const last = o => o[o.length - 1];
  const STRATS = {
    tft: { name: 'Wie du mir', play: (m, o) => o.length ? last(o) : 'C', info: '«Wie du mir»: kooperiert zuerst, dann macht sie, was du zuletzt getan hast.' },
    allc: { name: 'Immer nett', play: () => 'C', info: '«Immer nett»: kooperiert immer, egal was passiert.' },
    alld: { name: 'Immer fies', play: () => 'D', info: '«Immer fies»: betrügt immer.' },
    grim: { name: 'Nachtragend', play: (m, o) => o.includes('D') ? 'D' : 'C', info: '«Nachtragend»: kooperiert, bis du einmal betrügst. Danach betrügt sie für immer.' },
    rand: { name: 'Zufall', play: () => Math.random() < .5 ? 'C' : 'D', info: '«Zufall»: wirft jedes Mal eine Münze.' },
    stft: { name: 'Misstrauisch', play: (m, o) => o.length ? last(o) : 'D', info: '«Misstrauisch»: wie «Wie du mir», beginnt aber mit Betrug.' },
    joss: { name: 'Hinterlistig', play: (m, o) => { const a = o.length ? last(o) : 'C'; return a === 'C' && Math.random() < .1 ? 'D' : a; }, info: '«Hinterlistig»: wie «Wie du mir», betrügt aber ab und zu heimlich.' },
    gtft: { name: 'Grosszügig', play: (m, o) => { const a = o.length ? last(o) : 'C'; return a === 'D' && Math.random() < 1 / 3 ? 'C' : a; }, info: '«Grosszügig»: wie «Wie du mir», verzeiht aber jeden dritten Betrug.' },
  };
  const ORDER = ['tft', 'allc', 'alld', 'grim', 'rand', 'stft', 'joss', 'gtft'];
  const colOf = s => ({ tft: C.accent, allc: C.good, alld: C.bad, grim: C.copper, rand: C.muted, stft: C.fiber, joss: C.glow, gtft: C.fg })[s];
  const MOVE = { C: 'kooperiert', D: 'betrügt' };

  /* ---------- Teil 1: einmalige Spiele gegen Fremde ---------- */
  const oneCv = $('#oneCv');
  const O = { p: .5, games: [], pts: 0, alt: 0, last: null };
  const updOne = () => {
    const n = O.games.length;
    $('#oPts').textContent = fmt(O.pts, 0);
    $('#oGames').textContent = n === 1 ? '1 Spiel' : `${n} Spiele`;
    $('#oAvg').textContent = n ? fmt(O.pts / n, 2) : '–';
    $('#oAlt').textContent = n ? fmt(O.alt, 0) : '–';
  };
  const playOne = me => {
    const her = Math.random() < O.p ? 'C' : 'D';
    const [a, b] = pay(me, her), [alt] = pay(flip(me), her);
    O.pts += a; O.alt += alt; O.games.push([me, her]); if (O.games.length > 400) O.games.shift();
    O.last = [me, her];
    $('#oneStatus').textContent = `Sie ${MOVE[her]}. Du bekommst ${a}, sie ${b}. Hättest du ${me === 'C' ? 'betrogen' : 'kooperiert'}: ${alt}.`;
    if (O.games.length >= 8) {
      const better = O.alt > O.pts;
      if (O.games.every(g => g[0] === 'C') && better) $('#oneStatus').textContent += ' Mit Betrügen hättest du jedes Mal mehr bekommen.';
      if (O.games.every(g => g[0] === 'D') && !better) $('#oneStatus').textContent += ' Kooperieren hätte dir in keinem einzigen Spiel mehr gebracht.';
    }
    updOne();
  };
  $('#pIn').addEventListener('input', e => { O.p = +e.target.value / 100; $('#pOut').textContent = `${e.target.value} %`; });
  $('#oneC').addEventListener('click', () => playOne('C'));
  $('#oneD').addEventListener('click', () => playOne('D'));
  $('#oneNew').addEventListener('click', () => { Object.assign(O, { games: [], pts: 0, alt: 0, last: null }); updOne(); $('#oneStatus').textContent = 'Neu gestartet.'; });
  updOne();

  const drawOne = () => {
    const { ctx, w, h } = fit(oneCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const lw = small ? 74 : 104, mw = Math.min(w - lw - 16, 380), cw = mw / 2, ch = small ? 74 : 82;
    const mx = lw + (w - lw - 16 - mw) / 2, my = 44;
    ctx.font = MONO;
    // Kopf
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText(small ? 'Sie kooperiert' : 'Sie kooperiert', mx + cw / 2, my - 12);
    ctx.fillText(small ? 'Sie betrügt' : 'Sie betrügt', mx + cw * 1.5, my - 12);
    ctx.textAlign = 'right';
    ctx.fillText(small ? 'Du koop.' : 'Du kooperierst', mx - 10, my + ch / 2 + 4);
    ctx.fillText(small ? 'Du betr.' : 'Du betrügst', mx - 10, my + ch * 1.5 + 4);
    // Zellen
    const cells = [['C', 'C'], ['C', 'D'], ['D', 'C'], ['D', 'D']];
    for (const [me, her] of cells) {
      const x = mx + (her === 'C' ? 0 : cw), y = my + (me === 'C' ? 0 : ch);
      const hit = O.last && O.last[0] === me && O.last[1] === her;
      roundRect(ctx, x + 3, y + 3, cw - 6, ch - 6, 10);
      ctx.fillStyle = hit ? C.glow : C.sunk; ctx.globalAlpha = hit ? .28 : 1; ctx.fill(); ctx.globalAlpha = 1;
      if (hit) { ctx.strokeStyle = C.glow; ctx.lineWidth = 2; ctx.stroke(); }
      const [a, b] = pay(me, her);
      ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${small ? 22 : 26}px Geist Mono, monospace`;
      ctx.fillText(String(a), x + cw / 2, y + ch / 2 + 2);
      ctx.font = MONO; ctx.fillStyle = C.muted;
      ctx.fillText(`du · sie ${b}`, x + cw / 2, y + ch / 2 + 20);
    }
    // Pfeile: in jeder Spalte ist Betrügen besser
    ctx.strokeStyle = C.bad; ctx.fillStyle = C.bad; ctx.lineWidth = 2;
    for (const k of [0, 1]) {
      const x = mx + cw * k + cw - 14, y1 = my + ch * .5 - 12, y2 = my + ch * 1.5 - 18;
      ctx.beginPath(); ctx.moveTo(x, y1 + 26); ctx.lineTo(x, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y2 + 6); ctx.lineTo(x - 5, y2 - 2); ctx.lineTo(x + 5, y2 - 2); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'right'; ctx.fillText(k ? '+1' : '+2', x - 6, (y1 + y2) / 2 + 16);
    }
    // Verlauf
    const hy = my + ch * 2 + 26, n = Math.min(O.games.length, small ? 16 : 24), r = small ? 6 : 7, gap = r * 2 + 4;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText('Du', 10, hy + 4); ctx.fillText('Sie', 10, hy + gap + 4);
    const g0 = O.games.slice(-n);
    g0.forEach(([me, her], i) => {
      const x = 44 + i * gap;
      ctx.beginPath(); ctx.arc(x, hy, r, 0, TAU); ctx.fillStyle = me === 'C' ? C.good : C.bad; ctx.fill();
      ctx.beginPath(); ctx.arc(x, hy + gap, r, 0, TAU); ctx.fillStyle = her === 'C' ? C.good : C.bad; ctx.fill();
    });
    if (!g0.length) { ctx.fillText('Noch keine Spiele', 44, hy + 4); }
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(small ? 'grün koop. · rot betr.' : 'grün: kooperiert · rot: betrügt', w - 10, h - 10);
  };

  /* ---------- Teil 2: 10 Runden gegen dasselbe Gegenüber ---------- */
  const repCv = $('#repCv');
  const ROUNDS = 10, SECRET = ['tft', 'grim', 'alld', 'allc', 'rand'];
  const R = { opp: 'tft', real: 'tft', me: [], her: [], done: false };
  const runFixed = (s, policy) => { const m = [], o = []; let p = 0; for (let i = 0; i < ROUNDS; i++) { const a = policy(i), b = STRATS[s].play(o, m); m.push(a); o.push(b); p += pay(a, b)[0]; } return p; };
  const totals = () => { let a = 0, b = 0; R.me.forEach((x, i) => { const p = pay(x, R.her[i]); a += p[0]; b += p[1]; }); return [a, b]; };
  const updRep = () => {
    const [a, b] = totals();
    $('#rRound').textContent = R.done ? 'fertig' : `${R.me.length + 1} von ${ROUNDS}`;
    $('#rMe').textContent = String(a); $('#rOpp').textContent = String(b);
    $('#repC').disabled = $('#repD').disabled = R.done || $('#repNew').disabled;
  };
  const newRep = () => {
    R.real = R.opp === 'secret' ? SECRET[Math.floor(Math.random() * SECRET.length)] : R.opp;
    R.me = []; R.her = []; R.done = false;
    $('#repStatus').textContent = R.opp === 'secret' ? 'Runde 1. Wer ist dein Gegenüber? Finde es heraus.' : `Runde 1. ${STRATS[R.real].info}`;
    updRep();
  };
  const playRep = a => {
    if (R.done) return;
    const b = STRATS[R.real].play(R.her, R.me);
    R.me.push(a); R.her.push(b);
    const [p] = pay(a, b), k = R.me.length;
    if (k >= ROUNDS) {
      R.done = true;
      const [me, opp] = totals();
      const allC = runFixed(R.real, () => 'C'), allD = runFixed(R.real, () => 'D');
      const who = R.opp === 'secret' ? `Dein Gegenüber war «${STRATS[R.real].name}». ` : '';
      $('#repStatus').textContent = `${who}Du hast ${me} Punkte, das Gegenüber ${opp}. Zum Vergleich: Immer kooperieren hätte ${allC} gebracht, immer betrügen ${allD}${R.real === 'rand' ? ' (bei Zufall jedes Mal anders)' : ''}.`;
    } else {
      $('#repStatus').textContent = `Runde ${k}: Du ${a === 'C' ? 'kooperierst' : 'betrügst'}, das Gegenüber ${MOVE[b]}. +${p} für dich. Runde ${k + 1}?`;
    }
    updRep();
  };
  $$('#oppBtns button').forEach(b => b.addEventListener('click', () => {
    R.opp = b.dataset.opp; $$('#oppBtns button').forEach(x => x.classList.toggle('active', x === b)); newRep();
  }));
  $('#repC').addEventListener('click', () => playRep('C'));
  $('#repD').addEventListener('click', () => playRep('D'));
  $('#repNew').addEventListener('click', newRep);
  newRep();

  const drawRep = () => {
    const { ctx, w, h } = fit(repCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const lx = small ? 58 : 110, rr = Math.min(small ? 11 : 15, (w - lx - 20) / ROUNDS / 2 - 2), step = (w - lx - 20) / ROUNDS;
    const y1 = 70, y2 = 70 + (small ? 52 : 62);
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText('Du', 12, y1 + 4);
    const oppName = R.opp === 'secret' && !R.done ? 'Geheim' : STRATS[R.real].name;
    ctx.fillText(small ? 'Gegen.' : 'Gegenüber', 12, y2 + 4);
    ctx.fillStyle = C.muted; ctx.fillText(`Gegenüber: ${oppName}`, 12, 16);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let i = 0; i < ROUNDS; i++) {
      const x = lx + step * i + step / 2;
      ctx.fillStyle = C.muted; ctx.fillText(String(i + 1), x, 34);
      for (const [arr, y] of [[R.me, y1], [R.her, y2]]) {
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU);
        if (i < arr.length) { ctx.fillStyle = arr[i] === 'C' ? C.good : C.bad; ctx.fill(); }
        else { ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      if (i < R.me.length) {
        const [a, b] = pay(R.me[i], R.her[i]);
        ctx.fillStyle = C.fg; ctx.fillText(String(a), x, (y1 + y2) / 2 + 4);
        ctx.fillStyle = C.muted; ctx.fillText(String(b), x, y2 + rr + 16);
      }
      if (i === R.me.length && !R.done) { ctx.strokeStyle = C.accent; ctx.lineWidth = 2; roundRect(ctx, x - rr - 4, y1 - rr - 4, rr * 2 + 8, y2 - y1 + rr * 2 + 8, 10); ctx.stroke(); }
    }
    // Summenbalken
    const [a, b] = totals(), by = h - 70, bw = w - lx - 20, sc = bw * .7 / 50;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('Summe', 12, by + 10);
    ctx.fillStyle = C.accent; ctx.fillRect(lx, by, Math.max(2, a * sc), 12);
    ctx.fillStyle = C.copper; ctx.fillRect(lx, by + 22, Math.max(2, b * sc), 12);
    ctx.fillStyle = C.fg; ctx.fillText(`du ${a}`, lx + a * sc + 6, by + 10);
    ctx.fillText(`${small ? 'gegen.' : 'Gegenüber'} ${b}`, lx + b * sc + 6, by + 32);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('30 = immer beide kooperieren', w - 10, h - 10);
  };

  /* ---------- Teil 3: Turnier und Evolution ---------- */
  const tourCv = $('#tourCv');
  const T = { on: new Set(['tft', 'allc', 'alld', 'grim', 'rand', 'stft']), rounds: 200, noise: 0, mode: null, res: null, anim: 0, evo: null, gen: 0, acc: 0 };
  const match = (a, b, n, e) => {
    const ha = [], hb = []; let sa = 0, sb = 0;
    for (let r = 0; r < n; r++) {
      let x = STRATS[a].play(ha, hb), y = STRATS[b].play(hb, ha);
      if (e && Math.random() < e) x = flip(x);
      if (e && Math.random() < e) y = flip(y);
      ha.push(x); hb.push(y); const p = pay(x, y); sa += p[0]; sb += p[1];
    }
    return [sa / n, sb / n];
  };
  // mittlere Punkte pro Runde für jede Paarung (mit sich selbst), mehrfach gespielt wegen Zufall
  const payoffMatrix = list => {
    const n = list.length, A = list.map(() => new Array(n).fill(0)), reps = 12;
    for (let k = 0; k < reps; k++) for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const [x, y] = match(list[i], list[j], T.rounds, T.noise);
      if (i === j) A[i][i] += (x + y) / 2 / reps; else { A[i][j] += x / reps; A[j][i] += y / reps; }
    }
    return A;
  };
  const listOn = () => ORDER.filter(s => T.on.has(s));
  const updTourText = () => {
    $('#roundsOut').textContent = String(T.rounds);
    $('#noiseOut').textContent = `${fmt(T.noise * 100, 0)} %`;
  };
  $$('#stratBtns button').forEach(b => b.addEventListener('click', () => {
    const s = b.dataset.s;
    if (T.on.has(s)) { if (T.on.size <= 2) { $('#tourStatus').textContent = 'Es braucht mindestens zwei Strategien.'; return; } T.on.delete(s); }
    else T.on.add(s);
    b.classList.toggle('active', T.on.has(s));
    $('#tourStatus').textContent = `${STRATS[s].info} ${T.on.has(s) ? 'Ist jetzt dabei.' : 'Ist jetzt draussen.'}`;
  }));
  $('#roundsIn').addEventListener('input', e => { T.rounds = +e.target.value; updTourText(); });
  $('#noiseIn').addEventListener('input', e => { T.noise = +e.target.value / 100; updTourText(); });
  updTourText();
  $('#tourBtn').addEventListener('click', () => {
    const list = listOn(), A = payoffMatrix(list);
    const sc = list.map((s, i) => ({ s, v: A[i].reduce((a, b) => a + b, 0) / list.length })).sort((a, b) => b.v - a.v);
    T.res = sc; T.mode = 'tour'; T.anim = reduced ? 1 : 0;
    const win = sc[0], alld = sc.find(x => x.s === 'alld');
    $('#tWin').textContent = STRATS[win.s].name; $('#tWhat').textContent = 'im Turnier';
    $('#tPts').textContent = fmt(win.v, 2);
    $('#tAlld').textContent = alld ? fmt(alld.v, 2) : 'nicht dabei';
    let t = `Jede gegen jede, auch gegen sich selbst, je ${T.rounds} ${T.rounds === 1 ? 'Runde' : 'Runden'}. Sieger: «${STRATS[win.s].name}».`;
    if (T.rounds <= 3) t += ' Bei so wenigen Runden lohnt sich Rache kaum, Betrug zahlt sich aus.';
    else if (T.noise > 0) t += ' Mit Versehen geraten strenge Strategien in endlose Racheketten. Versöhnliche leiden weniger.';
    else if (win.s === 'tft') t += ' Sie gewinnt kein einziges Duell, sammelt aber gegen alle viele Punkte.';
    else t += ' Wer gewinnt, hängt vom Feld ab. Nimm Strategien heraus oder dazu.';
    $('#tourStatus').textContent = t;
  });
  $('#evoBtn').addEventListener('click', () => {
    const list = listOn(), A = payoffMatrix(list);
    T.evo = { list, A, hist: [list.map(() => 1 / list.length)] };
    const G = 60;
    for (let g = 0; g < G; g++) {
      const x = T.evo.hist[g], f = list.map((_, i) => A[i].reduce((s, a, j) => s + a * x[j], 0)), fb = f.reduce((s, v, i) => s + v * x[i], 0);
      T.evo.hist.push(x.map((v, i) => v * f[i] / fb));
    }
    T.mode = 'evo'; T.gen = reduced ? G : 0; T.acc = 0;
    const end = T.evo.hist[G], wi = end.indexOf(Math.max(...end));
    $('#tWin').textContent = STRATS[list[wi]].name; $('#tWhat').textContent = `${fmt(end[wi] * 100, 0)} % nach ${G} Generationen`;
    const ad = list.indexOf('alld');
    $('#tPts').textContent = fmt(list.map((_, i) => A[wi][i] * end[i]).reduce((a, b) => a + b, 0), 2);
    $('#tAlld').textContent = ad >= 0 ? `${fmt(end[ad] * 100, 0)} % übrig` : 'nicht dabei';
    $('#tourStatus').textContent = 'Evolution: Wer viele Punkte macht, hat in der nächsten Generation mehr Nachkommen. Am Anfang sind alle gleich häufig.'
      + (ad >= 0 && end[ad] < .02 && T.rounds > 3 ? ' «Immer fies» stirbt aus: Gegen Strategien, die sich wehren, holt sie kaum Punkte. Und wer sich gegenseitig vertraut, macht viele.' : '');
  });

  const drawTour = dt => {
    const { ctx, w, h } = fit(tourCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    ctx.font = MONO;
    if (!T.mode) {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText('Wähle Strategien und starte ein Turnier', w / 2, h / 2 - 8);
      ctx.fillText('oder die Evolution', w / 2, h / 2 + 10);
      return;
    }
    if (T.mode === 'tour') {
      T.anim = Math.min(1, T.anim + dt * 1.2);
      const e = 1 - (1 - T.anim) ** 3, list = T.res, lw = small ? 96 : 120;
      const top = 30, rowH = Math.min(36, (h - top - 30) / list.length), bw = w - lw - 60;
      const vmax = Math.max(3.2, ...list.map(x => x.v));
      ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('Punkte pro Runde, im Schnitt gegen alle', 12, 16);
      // Hilfslinien
      for (let v = 1; v <= Math.floor(vmax); v++) {
        const x = lw + bw * v / vmax;
        ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, top + rowH * list.length); ctx.stroke();
        ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(String(v), x, top + rowH * list.length + 14);
      }
      list.forEach((r, i) => {
        const y = top + i * rowH;
        ctx.fillStyle = C.fg; ctx.textAlign = 'right'; ctx.fillText(STRATS[r.s].name, lw - 8, y + rowH / 2 + 4);
        ctx.fillStyle = colOf(r.s); roundRect(ctx, lw, y + rowH * .18, Math.max(3, bw * r.v / vmax * e), rowH * .64, 4); ctx.fill();
        ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(fmt(r.v * e, 2), lw + bw * r.v / vmax * e + 6, y + rowH / 2 + 4);
      });
      return;
    }
    // Evolution
    const E = T.evo, G = E.hist.length - 1;
    if (T.gen < G) { T.acc += dt; while (T.acc > .06 && T.gen < G) { T.acc -= .06; T.gen++; } }
    const gx = 34, gy = 26, gw = w - gx - (small ? 12 : 120), gh = h - gy - 36;
    const X = g => gx + gw * g / G;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('Anteil an der Bevölkerung', 12, 14);
    for (let i = E.list.length - 1; i >= 0; i--) {
      ctx.beginPath();
      for (let g = 0; g <= T.gen; g++) { const s = E.hist[g].slice(0, i + 1).reduce((a, b) => a + b, 0); const y = gy + gh - gh * s; g ? ctx.lineTo(X(g), y) : ctx.moveTo(X(g), y); }
      ctx.lineTo(X(T.gen), gy + gh); ctx.lineTo(X(0), gy + gh); ctx.closePath();
      ctx.fillStyle = colOf(E.list[i]); ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1;
    }
    // Trennlinien hell nachziehen
    ctx.strokeStyle = C.surface; ctx.lineWidth = 1;
    for (let i = 0; i < E.list.length - 1; i++) {
      ctx.beginPath();
      for (let g = 0; g <= T.gen; g++) { const s = E.hist[g].slice(0, i + 1).reduce((a, b) => a + b, 0); const y = gy + gh - gh * s; g ? ctx.lineTo(X(g), y) : ctx.moveTo(X(g), y); }
      ctx.stroke();
    }
    ctx.strokeStyle = C.line; ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let g = 0; g <= G; g += 20) ctx.fillText(String(g), X(g), gy + gh + 14);
    ctx.textAlign = 'right'; ctx.fillText('Generation', gx + gw, gy + gh + 28);
    ctx.fillText('100 %', gx - 4, gy + 8); ctx.fillText('0', gx - 4, gy + gh);
    // Beschriftung der Flächen
    const cur = E.hist[T.gen];
    let acc = 0;
    E.list.forEach((s, i) => {
      const share = cur[i], mid = acc + share / 2; acc += share;
      if (share < .06) return;
      const y = gy + gh - gh * mid + 4;
      if (small) { ctx.fillStyle = C.bg; ctx.textAlign = 'right'; ctx.fillText(`${STRATS[s].name} ${fmt(share * 100, 0)} %`, X(T.gen) - 6, y); }
      else { ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(`${STRATS[s].name} ${fmt(share * 100, 0)} %`, X(T.gen) + 8, y); }
    });
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('kooperation', 4, {
    oneLock: () => { ['#pIn', '#oneC', '#oneD', '#oneNew'].forEach(id => { $(id).disabled = false; }); },
    repLock: () => { $$('#oppBtns button').forEach(b => b.disabled = false); $('#repNew').disabled = false; updRep(); },
    tourLock: () => { $$('#stratBtns button').forEach(b => b.disabled = false); ['#roundsIn', '#noiseIn', '#tourBtn', '#evoBtn'].forEach(id => { $(id).disabled = false; }); },
  });

  loop(dt => { drawOne(); drawRep(); drawTour(dt); });
})();
