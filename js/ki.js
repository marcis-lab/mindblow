/* mindblow – Lektion KI */
(() => {
  const { $, $$, C, fit, reduced, fmt, lesson, loop } = MB;

  /* ---------- Teil 1: Nächstes Wort vorhersagen ---------- */
  // Ein winziges «Sprachmodell»: Wahrscheinlichkeiten für das nächste Wort, abhängig vom letzten Wort.
  const NOUN_END = { 'und': .32, '.': .68 };
  const MODEL = {
    'ihre':          { 'Berge': .38, 'Schokolade': .27, 'Uhren': .14, 'Banken': .09, 'Käse': .08, 'Pünktlichkeit': .04 },
    'Berge':         { 'und': .48, '.': .34, 'im': .18 },
    'Schokolade':    { 'und': .5, '.': .35, 'aus': .15 },
    'Uhren':         { 'und': .45, '.': .4, 'aus': .15 },
    'Banken':        { '.': .45, 'und': .4, 'in': .15 },
    'Käse':          { 'und': .5, '.': .4, 'mit': .1 },
    'Pünktlichkeit': { '.': .65, 'und': .35 },
    'und':           { 'ihre': .3, 'die': .25, 'den': .2, 'viele': .15, 'Kühe': .1 },
    'die':           { 'Seen': .35, 'Alpen': .3, 'Schokolade': .2, 'Berge': .15 },
    'den':           { 'Käse': .45, 'Rhein': .3, 'Zürichsee': .25 },
    'viele':         { 'Seen': .4, 'Berge': .35, 'Kühe': .25 },
    'im':            { 'Winter': .55, 'Sommer': .45 },
    'aus':           { 'Zürich': .45, 'Genf': .3, 'Basel': .25 },
    'in':            { 'Zürich': .55, 'Genf': .3, 'Basel': .15 },
    'mit':           { 'Löchern': .75, 'Brot': .25 },
  };
  const START = 'Die Schweiz ist bekannt für ihre';
  let words = [], temp = 0.7, writing = false, unlockedWords = false;

  const dist = () => {
    const last = words.length ? words[words.length - 1] : 'ihre';
    if (last === '.') return [];
    if (words.length >= 16) return [['.', 1]];
    const base = MODEL[last] || NOUN_END;
    const ent = Object.entries(base).map(([w, p]) => [w, Math.pow(p, 1 / temp)]);
    const s = ent.reduce((a, [, p]) => a + p, 0);
    return ent.map(([w, p]) => [w, p / s]).sort((a, b) => b[1] - a[1]);
  };
  const renderSentence = () => {
    const parts = words.map(w => w === '.' ? '<span class="gen">.</span>' : ` <span class="gen">${w}</span>`).join('');
    $('#sentence').innerHTML = START + parts + (words[words.length - 1] === '.' ? '' : '<span class="caret"></span>');
  };
  const renderProbs = () => {
    const d = dist();
    const box = $('#probs');
    if (!d.length) { box.innerHTML = '<p class="status">Satz fertig. Fang neu an oder ändere die Temperatur.</p>'; return; }
    box.innerHTML = d.map(([w, p], i) => `
      <button data-w="${w}" class="${i === 0 ? 'top' : ''}" ${unlockedWords && !writing ? '' : 'disabled'}>
        <span class="w">${w === '.' ? '. (Satzende)' : w}</span>
        <span class="b"><i style="width:${(p * 100).toFixed(1)}%"></i></span>
        <span class="p">${Math.round(p * 100)} %</span>
      </button>`).join('');
    $$('button', box).forEach(b => b.addEventListener('click', () => { words.push(b.dataset.w); update1(); }));
  };
  const update1 = () => { renderSentence(); renderProbs(); };
  const sample = () => {
    const d = dist(); let r = Math.random(), acc = 0;
    for (const [w, p] of d) { acc += p; if (r <= acc) return w; }
    return d[d.length - 1][0];
  };
  $('#tempIn').addEventListener('input', e => { temp = +e.target.value; $('#tempOut').textContent = fmt(temp, 2); renderProbs(); });
  $('#restartBtn').addEventListener('click', () => { words = []; update1(); });
  $('#autoBtn').addEventListener('click', () => {
    if (writing) return;
    if (words[words.length - 1] === '.') words = [];
    writing = true; $('#autoBtn').disabled = true; $('#restartBtn').disabled = true; update1();
    const tick = () => {
      if (!dist().length) { writing = false; $('#autoBtn').disabled = false; $('#restartBtn').disabled = false; renderProbs(); return; }
      words.push(sample()); update1();
      setTimeout(tick, reduced ? 80 : 520);
    };
    setTimeout(tick, reduced ? 80 : 400);
  });
  update1();

  /* ---------- Teil 2: Eine Maschine lernt ---------- */
  const learnCv = $('#learnCv');
  const makeData = () => {
    const pts = [];
    for (let i = 0; i < 9; i++) pts.push({ x: .12 + Math.random() * .32, y: .55 + Math.random() * .35, c: 0 }); // Äpfel: kurz, rund
    for (let i = 0; i < 9; i++) pts.push({ x: .55 + Math.random() * .35, y: .1 + Math.random() * .35, c: 1 }); // Bananen: lang, wenig rund
    return pts;
  };
  const rnd = () => (Math.random() - .5) * 4;
  const L = { pts: makeData(), w1: rnd(), w2: rnd(), b: rnd(), steps: 0, queue: 0, addClass: 0, unlocked: false };
  const sig = z => 1 / (1 + Math.exp(-z));
  const prob = (x, y) => sig(L.w1 * x + L.w2 * y + L.b);
  const learnStep = () => {
    let g1 = 0, g2 = 0, gb = 0;
    for (const p of L.pts) { const e = prob(p.x, p.y) - p.c; g1 += e * p.x; g2 += e * p.y; gb += e; }
    const n = L.pts.length, lr = 2.2;
    L.w1 -= lr * g1 / n; L.w2 -= lr * g2 / n; L.b -= lr * gb / n; L.steps++;
  };
  const errors = () => L.pts.filter(p => (prob(p.x, p.y) > .5 ? 1 : 0) !== p.c).length;
  const updReadout = () => {
    $('#lErr').textContent = `${errors()} von ${L.pts.length}`;
    $('#lSteps').textContent = L.steps;
    $('#lW').textContent = [L.w1, L.w2, L.b].map(v => fmt(v, 2)).join(' · ');
  };
  updReadout();
  $('#stepBtn').addEventListener('click', () => { learnStep(); updReadout(); });
  $('#trainBtn').addEventListener('click', () => { L.queue += 50; });
  $('#resetLearn').addEventListener('click', () => { L.w1 = rnd(); L.w2 = rnd(); L.b = rnd(); L.steps = 0; L.queue = 0; updReadout(); });
  const pickClass = c => { L.addClass = c; $('#addApple').classList.toggle('active', c === 0); $('#addBanana').classList.toggle('active', c === 1); };
  $('#addApple').addEventListener('click', () => pickClass(0));
  $('#addBanana').addEventListener('click', () => pickClass(1));

  const plot = { l: 44, r: 16, t: 16, b: 36 };
  learnCv.addEventListener('click', e => {
    if (!L.unlocked) return;
    const r = learnCv.getBoundingClientRect();
    const x = (e.clientX - r.left - plot.l) / (r.width - plot.l - plot.r), y = 1 - (e.clientY - r.top - plot.t) / (r.height - plot.t - plot.b);
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    L.pts.push({ x, y, c: L.addClass }); updReadout();
  });

  const drawLearn = () => {
    if (L.queue > 0) { learnStep(); L.queue--; updReadout(); }
    const { ctx, w, h } = fit(learnCv);
    ctx.clearRect(0, 0, w, h);
    const pw = w - plot.l - plot.r, ph = h - plot.t - plot.b;
    const X = x => plot.l + x * pw, Y = y => plot.t + (1 - y) * ph;
    // Einschätzung der KI als Fläche
    const nx = 36, ny = 22;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const p = prob((i + .5) / nx, (j + .5) / ny);
      ctx.fillStyle = p > .5 ? C.glow : C.bad;
      ctx.globalAlpha = Math.abs(p - .5) * .32;
      ctx.fillRect(X(i / nx), Y((j + 1) / ny), pw / nx + .5, ph / ny + .5);
    }
    ctx.globalAlpha = 1;
    // Achsen
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(plot.l, plot.t, pw, ph);
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('Länge →', plot.l + pw / 2, h - 10);
    ctx.save(); ctx.translate(14, plot.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Rundheit →', 0, 0); ctx.restore();
    // Trennlinie: w1·x + w2·y + b = 0
    ctx.beginPath(); let pen = false;
    for (let k = 0; k <= 200; k++) {
      const x = k / 200;
      if (Math.abs(L.w2) < 1e-4) break;
      const y = -(L.w1 * x + L.b) / L.w2;
      if (y >= 0 && y <= 1) { pen ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); pen = true; } else pen = false;
    }
    if (Math.abs(L.w2) < 1e-4 && Math.abs(L.w1) > 1e-4) { const x = -L.b / L.w1; if (x >= 0 && x <= 1) { ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(1)); } }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    // Früchte
    for (const p of L.pts) {
      const wrong = (prob(p.x, p.y) > .5 ? 1 : 0) !== p.c;
      ctx.beginPath();
      if (p.c === 0) ctx.arc(X(p.x), Y(p.y), 6.5, 0, Math.PI * 2);
      else ctx.ellipse(X(p.x), Y(p.y), 10, 4.5, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = p.c === 0 ? C.bad : C.glow; ctx.fill();
      if (wrong) { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 13, 0, Math.PI * 2); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText('Kreis um eine Frucht = falsch eingeordnet', plot.l + 8, plot.t + 16);
  };

  /* ---------- Teil 3: Echt oder erfunden ---------- */
  const CLAIMS = [
    { t: 'Die Schweiz hat vier Landessprachen: Deutsch, Französisch, Italienisch und Rätoromanisch.', real: true, why: 'Stimmt.' },
    { t: 'Der Gotthard-Basistunnel ist mit rund 57 Kilometern der längste Eisenbahntunnel der Welt.', real: true, why: 'Stimmt, er wurde 2016 eröffnet.' },
    { t: 'Albert Einstein bekam den Nobelpreis für seine Relativitätstheorie.', real: false, why: 'Klingt richtig, ist aber falsch. Er bekam ihn für die Erklärung des photoelektrischen Effekts.' },
    { t: 'Die Zürcher Erfinderin Lena Brunner entwickelte 1987 den ersten Touchscreen.', real: false, why: 'Komplett erfunden. Diese Person gibt es nicht, und den ersten Touchscreen gab es schon in den 1960er-Jahren.' },
  ];
  let claimDone = 0, claimRight = 0;
  $('#claims').innerHTML = CLAIMS.map((c, i) => `
    <li data-i="${i}">
      <span class="c">${c.t}</span>
      <div class="row"><button data-a="1" disabled>Echt</button><button data-a="0" disabled>Erfunden</button></div>
      <span class="why" hidden></span>
    </li>`).join('');
  $$('#claims li').forEach(li => {
    const c = CLAIMS[+li.dataset.i];
    $$('button', li).forEach(b => b.addEventListener('click', () => {
      const ans = b.dataset.a === '1', ok = ans === c.real;
      $$('button', li).forEach(x => x.disabled = true); b.classList.add('pick');
      const why = $('.why', li); why.hidden = false;
      why.innerHTML = `<b class="${ok ? 'ok' : 'no'}">${ok ? 'Richtig erkannt.' : 'Reingefallen.'}</b> ${c.why}`;
      claimDone++; if (ok) claimRight++;
      if (claimDone === CLAIMS.length) $('#claimStatus').textContent = `${claimRight} von ${CLAIMS.length} richtig. Alle vier Sätze klingen gleich sicher. Genau das ist das Problem.`;
      else $('#claimStatus').textContent = `${claimDone} von ${CLAIMS.length} beantwortet.`;
    }));
  });

  /* ---------- Lektion verdrahten ---------- */
  lesson('ki', 4, {
    wordLock: () => { unlockedWords = true; $('#tempIn').disabled = false; $('#autoBtn').disabled = false; $('#restartBtn').disabled = false; renderProbs(); },
    learnLock: () => { L.unlocked = true; ['#stepBtn', '#trainBtn', '#resetLearn', '#addApple', '#addBanana'].forEach(s => $(s).disabled = false); learnCv.style.cursor = 'crosshair'; },
    claimLock: () => { $$('#claims button').forEach(b => b.disabled = false); $('#claimStatus').textContent = 'Entscheide bei jedem Satz.'; },
  });

  loop(() => drawLearn());
})();
