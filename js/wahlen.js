/* mindblow – Lektion Abstimmen (Ist die Mehrheit immer fair?) */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const SANS = 'Outfit, sans-serif';
  // bewusst feste Farben für die drei Reiseziele und für Ja/Nein: in hell und dunkel gut lesbar
  const OPTS = ['berg', 'see', 'stadt'];
  const NAME = { berg: 'Berg', see: 'See', stadt: 'Stadt' };
  const COL = { berg: '#9a6ed6', see: '#2f8fd8', stadt: '#e0982a' };
  const INK = '#15130f';
  const JA = '#2f8fd8', NEIN = '#e0782f';
  const PERMS = [
    ['berg', 'see', 'stadt'], ['berg', 'stadt', 'see'], ['see', 'berg', 'stadt'],
    ['see', 'stadt', 'berg'], ['stadt', 'berg', 'see'], ['stadt', 'see', 'berg'],
  ];
  const ease = (cur, tgt, dt, k = 8) => reduced ? tgt : cur + (tgt - cur) * Math.min(1, dt * k);
  const kids = n => `${n} ${n === 1 ? 'Kind' : 'Kinder'}`;
  const listNames = ws => ws.map(o => NAME[o]).join(' / ');

  // Gewinner einer Punktetabelle (bei Gleichstand mehrere)
  const winners = score => {
    const max = Math.max(...OPTS.map(o => score[o]));
    if (max <= 0) return [];
    return OPTS.filter(o => score[o] === max);
  };
  // Wie viele bevorzugen a vor b?
  const prefer = (groups, a, b) => groups.reduce((s, g) => s + (g.r.indexOf(a) < g.r.indexOf(b) ? g.n : 0), 0);

  /* ---------- Teil 1: Drei Verfahren ---------- */
  const voteCv = $('#voteCv');
  const START1 = [{ n: 8, p: 0 }, { n: 7, p: 5 }, { n: 5, p: 3 }];
  const V = { g: START1.map(g => ({ ...g })), anim: {}, t: 0 };
  const groups1 = () => V.g.map(g => ({ n: g.n, r: PERMS[g.p] }));

  const count = () => {
    const G = groups1(), N = G.reduce((s, g) => s + g.n, 0);
    const first = { berg: 0, see: 0, stadt: 0 }, borda = { berg: 0, see: 0, stadt: 0 };
    for (const g of G) { first[g.r[0]] += g.n; borda[g.r[0]] += 2 * g.n; borda[g.r[1]] += g.n; }
    const plur = winners(first);
    // Stichwahl: absolutes Mehr in Runde 1, sonst die zwei Besten ins Finale
    const run = { round1: first, final: null, out: null, w: [], direct: false, tieSel: false };
    if (N > 0) {
      const top = OPTS.find(o => first[o] * 2 > N);
      if (top) { run.w = [top]; run.direct = true; }
      else {
        const sorted = [...OPTS].sort((a, b) => first[b] - first[a]);
        if (first[sorted[1]] === first[sorted[2]] && first[sorted[0]] !== first[sorted[1]]) run.tieSel = true;
        if (first[sorted[0]] === first[sorted[2]]) run.tieSel = true;
        const [a, b] = sorted; run.out = sorted[2];
        const va = prefer(G, a, b), vb = prefer(G, b, a);
        run.final = { [a]: va, [b]: vb };
        if (!run.tieSel) run.w = va > vb ? [a] : vb > va ? [b] : [a, b];
      }
    }
    return { N, first, borda, plur, run, bordaW: winners(borda) };
  };

  const updVote = () => {
    V.g.forEach((g, i) => { $(`#g${i + 1}In`).value = g.n; $(`#g${i + 1}Out`).textContent = g.n; });
    const r = count();
    const lab = ws => !ws.length ? '–' : ws.length > 1 ? 'Gleichstand' : NAME[ws[0]];
    $('#wPlur').textContent = lab(r.plur);
    $('#wRun').textContent = r.run.tieSel ? 'Gleichstand' : lab(r.run.w);
    $('#wBorda').textContent = lab(r.bordaW);
    let msg;
    if (!r.N) msg = 'Niemand stimmt ab. Stell mindestens eine Gruppe grösser als null.';
    else {
      const ws = [r.plur, r.run.tieSel ? [] : r.run.w, r.bordaW].map(w => w.length === 1 ? w[0] : null);
      const uniq = new Set(ws.filter(Boolean));
      if (ws.some(w => !w)) msg = 'Mindestens ein Verfahren endet unentschieden. Dann bräuchte es noch eine Regel für Gleichstand.';
      else if (uniq.size === 3) msg = 'Drei Zählweisen, drei verschiedene Sieger. Dieselben Ranglisten, aber kein eindeutiger Wille der Klasse.';
      else if (uniq.size === 2) msg = 'Zwei Verfahren sind sich einig, eines tanzt aus der Reihe.';
      else msg = `Alle drei Verfahren wählen ${NAME[ws[0]]}. Hier ist das Ergebnis klar, egal wie man zählt.`;
    }
    $('#voteStatus').textContent = msg;
  };
  for (let i = 0; i < 3; i++) $(`#g${i + 1}In`).addEventListener('input', e => { V.g[i].n = +e.target.value; updVote(); });
  $$('#permSel button').forEach(b => b.addEventListener('click', () => { const g = V.g[+b.dataset.g]; g.p = (g.p + 1) % PERMS.length; updVote(); }));
  $('#voteReset').addEventListener('click', () => { V.g = START1.map(g => ({ ...g })); updVote(); });
  updVote();

  const chip = (ctx, x, y, o, r = 5) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = COL[o]; ctx.fill(); };

  const panel = (ctx, dt, key, x, y, pw, ph, title, caption, rows, winSet, note) => {
    roundRect(ctx, x, y, pw, ph, 10); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${SANS}`;
    ctx.fillText(title, x + 10, y + 18);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(caption, x + 10, y + 33);
    const max = Math.max(1, ...rows.map(r => r.v ?? 0));
    const rh = (ph - 72) / 3;
    rows.forEach((r, i) => {
      const ry = y + 44 + i * rh + rh / 2;
      const win = winSet.includes(r.o);
      ctx.globalAlpha = r.dim ? .45 : 1;
      chip(ctx, x + 15, ry, r.o, 4);
      ctx.fillStyle = win ? C.fg : C.muted; ctx.font = `${win ? 500 : 400} 11px ${MONO}`; ctx.textAlign = 'left';
      ctx.fillText(NAME[r.o], x + 24, ry + 4);
      const bx = x + 64, bw = pw - 64 - 46, bh = Math.min(14, rh - 8);
      const k = key + r.o;
      V.anim[k] = ease(V.anim[k] ?? 0, (r.v ?? 0) / max, dt);
      ctx.fillStyle = C.line; ctx.fillRect(bx, ry - bh / 2, bw, bh);
      ctx.fillStyle = COL[r.o]; ctx.globalAlpha = r.dim ? .3 : win ? 1 : .55;
      ctx.fillRect(bx, ry - bh / 2, bw * V.anim[k], bh);
      ctx.globalAlpha = r.dim ? .45 : 1;
      ctx.fillStyle = win ? C.fg : C.muted; ctx.textAlign = 'right'; ctx.font = `${win ? 500 : 400} 11px ${MONO}`;
      ctx.fillText(r.txt ?? String(r.v), x + pw - 10, ry + 4);
      ctx.globalAlpha = 1;
    });
    // Sieger
    ctx.textAlign = 'left'; ctx.font = `500 12px ${MONO}`;
    const sy = y + ph - 14;
    if (note) { ctx.fillStyle = C.muted; ctx.fillText(note, x + 10, sy); return; }
    if (winSet.length === 1) {
      const pulse = reduced ? 0 : (Math.sin(V.t * 3) + 1) / 2;
      chip(ctx, x + 15, sy - 4, winSet[0], 5 + pulse * 1.5);
      ctx.fillStyle = C.fg; ctx.fillText(`Sieger: ${NAME[winSet[0]]}`, x + 26, sy);
    } else { ctx.fillStyle = C.muted; ctx.fillText(winSet.length ? 'Gleichstand' : 'keine Stimmen', x + 10, sy); }
  };

  const drawVote = dt => {
    V.t += dt;
    const cw0 = voteCv.clientWidth;
    const narrow = cw0 < 520;
    const H = narrow ? 610 : 340;
    if (voteCv.style.height !== H + 'px') voteCv.style.height = H + 'px';
    const { ctx, w, h } = fit(voteCv);
    ctx.clearRect(0, 0, w, h);
    const pad = 12, gap = narrow ? 8 : 10;
    const r = count();

    // Gruppenkarten
    const cw = (w - 2 * pad - 2 * gap) / 3;
    V.g.forEach((g, i) => {
      const x = pad + i * (cw + gap), y = 12;
      ctx.globalAlpha = g.n ? 1 : .4;
      roundRect(ctx, x, y, cw, 100, 10); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${SANS}`;
      ctx.fillText(`Gruppe ${i + 1}`, x + 10, y + 18);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      ctx.fillText(kids(g.n), x + 10, y + 32);
      PERMS[g.p].forEach((o, j) => {
        const ly = y + 52 + j * 16;
        chip(ctx, x + 15, ly - 4, o, 4.5);
        ctx.fillStyle = j === 0 ? C.fg : C.muted; ctx.font = `${j === 0 ? 500 : 400} 11px ${MONO}`;
        ctx.fillText(`${j + 1}. ${NAME[o]}`, x + 25, ly);
      });
      ctx.globalAlpha = 1;
    });

    // Ergebnisse
    const run = r.run;
    const runRows = run.final
      ? OPTS.map(o => o === run.out ? { o, v: 0, txt: 'raus', dim: true } : { o, v: run.final[o] })
      : OPTS.map(o => ({ o, v: run.round1[o] }));
    const runCap = run.direct ? (narrow ? 'Runde 1: über die Hälfte' : 'über die Hälfte in Runde 1') : (narrow ? 'Finale der zwei Besten' : 'Finale der zwei Besten');
    const P = [
      ['p', narrow ? 'Relative Mehrheit' : 'Relative Mehrheit', 'nur Platz 1 zählt', OPTS.map(o => ({ o, v: r.first[o] })), r.plur, null],
      ['r', 'Stichwahl', runCap, runRows, run.tieSel ? [] : run.w, run.tieSel ? 'Gleichstand um Platz 2' : null],
      ['b', narrow ? 'Punkte (Borda)' : 'Punkte (Borda)', narrow ? '2 / 1 / 0 Punkte' : 'Platz 1: 2, Platz 2: 1', OPTS.map(o => ({ o, v: r.borda[o] })), r.bordaW, null],
    ];
    const top = 124;
    if (narrow) {
      const ph = (h - top - 12 - 2 * gap) / 3;
      P.forEach((p, i) => panel(ctx, dt, p[0], pad, top + i * (ph + gap), w - 2 * pad, ph, p[1], p[2], p[3], p[4], p[5]));
    } else {
      const pw = (w - 2 * pad - 2 * gap) / 3, ph = h - top - 12;
      P.forEach((p, i) => panel(ctx, dt, p[0], pad + i * (pw + gap), top, pw, ph, p[1], p[2], p[3], p[4], p[5]));
    }
  };

  /* ---------- Teil 2: Condorcet-Paradox ---------- */
  const duelCv = $('#duelCv');
  const D = { n: [7, 7, 6], agenda: null, t: 0 };
  const DPERM = [PERMS[0], PERMS[3], PERMS[4]];   // Berg>See>Stadt, See>Stadt>Berg, Stadt>Berg>See
  const PAIRS = [['berg', 'see'], ['see', 'stadt'], ['stadt', 'berg']];
  const groups2 = () => D.n.map((n, i) => ({ n, r: DPERM[i] }));
  const duel = (a, b) => { const G = groups2(); return [prefer(G, a, b), prefer(G, b, a)]; };

  const updDuel = () => {
    D.n.forEach((n, i) => { $(`#h${i + 1}In`).value = n; $(`#h${i + 1}Out`).textContent = n; });
    ['#dBS', '#dST', '#dTB'].forEach((id, i) => { const [x, y] = duel(...PAIRS[i]); $(id).textContent = `${x} : ${y}`; });
    $$('#agendaSel button').forEach(b => b.classList.toggle('active', D.agenda === +b.dataset.a));
    if (D.agenda === null) {
      const cw = condorcet();
      $('#duelStatus').textContent = cw === 'cycle'
        ? 'Kreis: Jedes Ziel verliert ein Duell. Wähle ein erstes Duell, der Sieger trifft danach auf das dritte Ziel.'
        : cw ? `${NAME[cw]} gewinnt jedes Duell. Dann ist der Sieger klar, egal in welcher Reihenfolge.` : 'Mindestens ein Duell endet unentschieden.';
      return;
    }
    const [a, b] = PAIRS[D.agenda];
    const third = OPTS.find(o => o !== a && o !== b);
    const [va, vb] = duel(a, b);
    if (va === vb) { $('#duelStatus').textContent = `Zuerst ${NAME[a]} gegen ${NAME[b]}: Gleichstand ${va} : ${vb}. Hier bräuchte es eine Losregel.`; D.final = null; return; }
    const w1 = va > vb ? a : b;
    const [x, y] = duel(w1, third);
    if (x === y) { $('#duelStatus').textContent = `${NAME[w1]} gewinnt das erste Duell. Gegen ${NAME[third]} steht es dann ${x} : ${y}, unentschieden.`; D.final = null; return; }
    const w2 = x > y ? w1 : third;
    D.final = w2;
    const cw = condorcet();
    $('#duelStatus').textContent = `Zuerst ${NAME[a]} gegen ${NAME[b]}: ${NAME[w1]} gewinnt ${Math.max(va, vb)} : ${Math.min(va, vb)}. Dann ${NAME[w1]} gegen ${NAME[third]}: ${NAME[w2]} gewinnt ${Math.max(x, y)} : ${Math.min(x, y)}.`
      + (cw === 'cycle' ? ' Probier eine andere Reihenfolge: Wer die Reihenfolge festlegt, bestimmt den Sieger.' : '');
  };
  // Condorcet-Sieger, 'cycle' oder null (bei Gleichstand)
  const condorcet = () => {
    const beats = {}; let tie = false;
    for (const [a, b] of PAIRS) {
      const [x, y] = duel(a, b);
      if (x === y) tie = true; else if (x > y) beats[a] = (beats[a] || 0) + 1; else beats[b] = (beats[b] || 0) + 1;
    }
    const w = OPTS.find(o => beats[o] === 2);
    if (w) return w;
    return tie ? null : 'cycle';
  };
  for (let i = 0; i < 3; i++) $(`#h${i + 1}In`).addEventListener('input', e => { D.n[i] = +e.target.value; updDuel(); });
  $$('#agendaSel button').forEach(b => b.addEventListener('click', () => { const a = +b.dataset.a; D.agenda = D.agenda === a ? null : a; if (D.agenda === null) D.final = null; updDuel(); }));
  updDuel();

  const arrow = (ctx, x0, y0, x1, y1, col, head = 9) => {
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - .45), y1 - head * Math.sin(a - .45));
    ctx.lineTo(x1 - head * Math.cos(a + .45), y1 - head * Math.sin(a + .45));
    ctx.closePath(); ctx.fill();
  };

  const drawDuel = dt => {
    D.t += dt;
    const { ctx, w, h } = fit(duelCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    // Ranglisten oben
    ctx.textAlign = 'left'; ctx.font = `${narrow ? 10 : 11}px ${MONO}`;
    DPERM.forEach((p, i) => {
      const y = 22 + i * 17;
      ctx.fillStyle = C.muted;
      let x = 14;
      const head = narrow ? `G${i + 1} · ${D.n[i]}: ` : `Gruppe ${i + 1} · ${kids(D.n[i])}: `;
      ctx.fillText(head, x, y); x += ctx.measureText(head).width;
      p.forEach((o, j) => {
        ctx.fillStyle = COL[o]; ctx.fillText(NAME[o], x, y); x += ctx.measureText(NAME[o]).width;
        if (j < 2) { ctx.fillStyle = C.muted; ctx.fillText(' › ', x, y); x += ctx.measureText(' › ').width; }
      });
    });
    // Dreieck
    const top = 78, bot = h - 34;
    const R = narrow ? 26 : 32;
    const cx = w / 2, span = Math.min(w * (narrow ? .3 : .34), (bot - top) * .75);
    const POS = {
      berg: [cx, top + R + 6],
      see: [cx + span, bot - R],
      stadt: [cx - span, bot - R],
    };
    const gx = (POS.berg[0] + POS.see[0] + POS.stadt[0]) / 3, gy = (POS.berg[1] + POS.see[1] + POS.stadt[1]) / 3;
    const cw = condorcet();
    ctx.lineWidth = 2;
    PAIRS.forEach(([a, b], i) => {
      const [va, vb] = duel(a, b);
      let [p, q] = [POS[a], POS[b]];
      let win = a;
      if (vb > va) { [p, q] = [q, p]; win = b; }
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const x0 = p[0] + ux * (R + 6), y0 = p[1] + uy * (R + 6), x1 = q[0] - ux * (R + 6), y1 = q[1] - uy * (R + 6);
      const hl = D.agenda === i;
      if (va === vb) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = C.muted;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.lineWidth = hl ? 3 : 2;
        arrow(ctx, x0, y0, x1, y1, hl ? C.fg : COL[win]);
        ctx.lineWidth = 2;
        // wandernde Punkte zeigen die Richtung
        if (!reduced) {
          for (let k = 0; k < 3; k++) {
            const f = ((D.t * .35 + k / 3) % 1);
            ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 2.5, 0, TAU);
            ctx.fillStyle = COL[win]; ctx.fill();
          }
        }
      }
      // Beschriftung aussen an der Kante
      const mx = (POS[a][0] + POS[b][0]) / 2, my = (POS[a][1] + POS[b][1]) / 2;
      let ox = mx - gx, oy = my - gy; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
      const lx = mx + ox * (narrow ? 46 : 54), ly = my + oy * (narrow ? 18 : 24);
      ctx.textAlign = 'center'; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.fillStyle = C.fg;
      const big = Math.max(va, vb), small = Math.min(va, vb);
      ctx.fillText(va === vb ? `${va} : ${vb}` : `${big} : ${small}`, lx, ly);
      ctx.font = `${narrow ? 9 : 10}px ${MONO}`; ctx.fillStyle = C.muted;
      ctx.fillText(va === vb ? 'unentschieden' : `${NAME[win]} gewinnt`, lx, ly + 13);
    });
    // Knoten
    for (const o of OPTS) {
      const [x, y] = POS[o];
      const fin = D.final === o || (D.agenda === null && cw === o);
      if (fin) {
        const pulse = reduced ? .5 : (Math.sin(D.t * 3) + 1) / 2;
        ctx.beginPath(); ctx.arc(x, y, R + 5 + pulse * 3, 0, TAU);
        ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = COL[o]; ctx.fill();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.font = `600 ${narrow ? 12 : 14}px ${SANS}`;
      ctx.fillText(NAME[o], x, y + 5);
    }
    // Mitte
    ctx.textAlign = 'center'; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.fillStyle = C.fg;
    if (cw === 'cycle') {
      if (!reduced) {
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
        const a0 = -D.t * 1.2;
        ctx.beginPath(); ctx.arc(gx, gy - 6, 12, a0, a0 + 4.6); ctx.stroke();
        const ex = gx + 12 * Math.cos(a0), ey = gy - 6 + 12 * Math.sin(a0);
        ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, TAU); ctx.fillStyle = C.muted; ctx.fill();
        ctx.fillStyle = C.fg;
      }
      ctx.fillText('Kreis!', gx, gy + 24);
    } else if (cw) ctx.fillText(narrow ? `${NAME[cw]} gewinnt alle` : `${NAME[cw]} gewinnt alle Duelle`, gx, gy + 8);
    else ctx.fillText('Gleichstand', gx, gy + 8);
    if (D.final) {
      ctx.font = `500 12px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
      ctx.fillText(`Sieger dieser Reihenfolge: ${NAME[D.final]}`, w / 2, h - 10);
    }
  };

  /* ---------- Teil 3: Doppeltes Mehr ---------- */
  const cantCv = $('#cantCv');
  // fiktive Kantone: Grundstimmung in Prozent Ja
  const K = [
    { name: 'Seestadt', pop: 600000, ja: 60 }, { name: 'Bergli', pop: 80000, ja: 42 },
    { name: 'Waldegg', pop: 120000, ja: 46 }, { name: 'Hügelau', pop: 100000, ja: 47 },
    { name: 'Moosbach', pop: 100000, ja: 44 },
  ];
  const S = { mood: 0, r: K.map(() => 0) };
  const jaOf = k => clamp(k.ja + S.mood, 0, 100);
  const tally = () => {
    let ja = 0, all = 0, sj = 0, sn = 0;
    for (const k of K) { const j = jaOf(k); ja += k.pop * j / 100; all += k.pop; if (j > 50) sj++; else if (j < 50) sn++; }
    const pct = ja / all * 100;
    return { pct, sj, sn, volk: pct > 50, stand: sj >= 3 };
  };
  const updCant = () => {
    K.forEach((k, i) => { $(`#k${i}In`).value = k.pop; $(`#k${i}Out`).textContent = fmt(k.pop, 0); });
    $('#moodOut').textContent = S.mood === 0 ? '±0 Pkt.' : `${S.mood > 0 ? '+' : '−'}${Math.abs(S.mood)} Pkt.`;
    const t = tally();
    $('#kVolk').textContent = `${fmt(t.pct, 1)} % Ja`;
    $('#kStand').textContent = `${t.sj} : ${t.sn}`;
    $('#kRes').textContent = t.volk && t.stand ? 'Angenommen' : 'Abgelehnt';
    let msg;
    if (t.volk && !t.stand) msg = 'Das Volk sagt Ja, die Mehrheit der Kantone Nein. Die Vorlage ist abgelehnt.';
    else if (!t.volk && t.stand) msg = 'Die Mehrheit der Kantone sagt Ja, das Volk Nein. Auch so ist die Vorlage abgelehnt.';
    else if (t.volk) msg = 'Volk und Stände sagen beide Ja. Angenommen.';
    else msg = 'Volk und Stände sagen beide Nein. Abgelehnt.';
    $('#cantStatus').textContent = msg;
  };
  K.forEach((k, i) => $(`#k${i}In`).addEventListener('input', e => { k.pop = +e.target.value; updCant(); }));
  $('#moodIn').addEventListener('input', e => { S.mood = +e.target.value; updCant(); });
  updCant();

  const drawCant = dt => {
    const { ctx, w, h } = fit(cantCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const colW = w / 5;
    const maxR = Math.min(colW / 2 - 4, 54);
    const cy = 16 + maxR;
    const t = tally();
    K.forEach((k, i) => {
      const x = colW * (i + .5);
      const j = jaOf(k);
      const tr = Math.max(4, maxR * Math.sqrt(k.pop / 1000000));
      S.r[i] = ease(S.r[i] || tr, tr, dt);
      ctx.beginPath(); ctx.arc(x, cy, maxR, 0, TAU); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, cy, S.r[i], 0, TAU);
      ctx.fillStyle = j > 50 ? JA : j < 50 ? NEIN : C.muted; ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 10 : 12}px ${SANS}`;
      ctx.fillText(k.name, x, cy + maxR + 18);
      ctx.fillStyle = C.muted; ctx.font = `${narrow ? 9 : 10}px ${MONO}`;
      ctx.fillText(narrow ? `${fmt(k.pop / 1000, 0)}k` : fmt(k.pop, 0), x, cy + maxR + 32);
      ctx.fillStyle = j > 50 ? JA : j < 50 ? NEIN : C.muted; ctx.font = `500 ${narrow ? 10 : 11}px ${MONO}`;
      ctx.fillText(`${fmt(j, 0)} % Ja`, x, cy + maxR + 47);
    });
    // Volksmehr
    const px = 14, pw = w - 28;
    let y = cy + maxR + 74;
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${SANS}`;
    ctx.fillText('Volksmehr', px, y);
    ctx.textAlign = 'right'; ctx.font = `500 11px ${MONO}`; ctx.fillStyle = t.volk ? JA : NEIN;
    ctx.fillText(t.volk ? 'Ja' : 'Nein', px + pw, y);
    y += 10;
    S.v = ease(S.v ?? t.pct, t.pct, dt);
    ctx.fillStyle = NEIN; ctx.fillRect(px, y, pw, 18);
    ctx.fillStyle = JA; ctx.fillRect(px, y, pw * S.v / 100, 18);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + pw / 2, y - 4); ctx.lineTo(px + pw / 2, y + 22); ctx.stroke();
    ctx.font = `500 11px ${MONO}`; ctx.fillStyle = INK; ctx.textAlign = 'left';
    ctx.fillText(`Ja ${fmt(t.pct, 1)} %`, px + 6, y + 13);
    ctx.textAlign = 'right'; ctx.fillText(`Nein ${fmt(100 - t.pct, 1)} %`, px + pw - 6, y + 13);
    // Ständemehr
    y += 50;
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 13px ${SANS}`;
    ctx.fillText('Ständemehr', px, y);
    ctx.textAlign = 'right'; ctx.font = `500 11px ${MONO}`; ctx.fillStyle = t.stand ? JA : NEIN;
    ctx.fillText(t.stand ? 'Ja' : 'Nein', px + pw, y);
    y += 10;
    const sw = (pw - 4 * 6) / 5;
    K.forEach((k, i) => {
      const j = jaOf(k), x = px + i * (sw + 6);
      roundRect(ctx, x, y, sw, 22, 5); ctx.fillStyle = j > 50 ? JA : j < 50 ? NEIN : C.muted; ctx.fill();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.font = `500 ${narrow ? 9 : 11}px ${MONO}`;
      ctx.fillText(narrow ? k.name.slice(0, 4) + '.' : k.name, x + sw / 2, y + 15);
    });
    // Ergebnis
    y += 50;
    const ok = t.volk && t.stand;
    ctx.textAlign = 'center'; ctx.font = `600 ${narrow ? 14 : 16}px ${SANS}`; ctx.fillStyle = C.fg;
    ctx.fillText(ok ? 'Angenommen' : 'Abgelehnt', w / 2, y);
    ctx.font = `${narrow ? 10 : 11}px ${MONO}`; ctx.fillStyle = C.muted;
    const v = t.volk ? 'Ja' : 'Nein', s = t.stand ? 'Ja' : 'Nein';
    ctx.fillText(`Volk ${v} · Stände ${s}${t.volk !== t.stand ? ' · nicht einig' : ''}`, w / 2, y + 17);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('wahlen', 4, {
    voteLock: () => { ['#g1In', '#g2In', '#g3In', '#voteReset'].forEach(s => $(s).disabled = false); $$('#permSel button').forEach(b => b.disabled = false); },
    duelLock: () => { ['#h1In', '#h2In', '#h3In'].forEach(s => $(s).disabled = false); $$('#agendaSel button').forEach(b => b.disabled = false); },
    cantLock: () => { ['#k0In', '#k1In', '#k2In', '#k3In', '#k4In', '#moodIn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawVote(dt); drawDuel(dt); drawCant(dt); });
})();
