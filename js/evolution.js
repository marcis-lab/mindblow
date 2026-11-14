/* mindblow – Lektion Evolution */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const N = 60;                      // Falter pro Generation
  const LIGHT = [226, 222, 208], DARK = [38, 37, 34];   // Farbskala für Falter und Rinde
  const mixc = (t, k = 0) => LIGHT.map((v, i) => clamp(Math.round(v + (DARK[i] - v) * t + k), 0, 255));
  const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`;
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
  const avg = pop => pop.reduce((a, m) => a + m.c, 0) / pop.length;
  const sd = pop => { const m = avg(pop); return Math.sqrt(pop.reduce((a, x) => a + (x.c - m) ** 2, 0) / pop.length); };
  const place = m => { m.x = .05 + Math.random() * .9; m.y = .08 + Math.random() * .84; m.a = (Math.random() - .5) * .9; return m; };

  /* ---------- Simulation: Vögel fressen auffällige Falter, Überlebende vermehren sich ---------- */
  const makeSim = ({ start, spread, bark, mut }) => {
    const S = { bark, mut, gen: 0, pop: [], ghosts: [], hist: [], eaten: null, running: false };
    S.reset = () => {
      S.gen = 0; S.eaten = null; S.ghosts = [];
      S.pop = Array.from({ length: N }, () => place({ c: clamp(start + gauss() * spread, 0, 1) }));
      S.hist = [avg(S.pop)];
    };
    S.step = () => {
      const vis = m => Math.abs(m.c - S.bark);              // Kontrast zur Rinde
      const meanVis = S.pop.reduce((a, m) => a + vis(m), 0) / N;
      // Je auffälliger die Falter, desto mehr finden die Vögel (vereinfacht)
      const kills = Math.round(N * (.25 + .45 * clamp(meanVis / .6, 0, 1)));
      let alive = S.pop.slice();
      const eaten = [];
      while (eaten.length < kills) {
        // Ein Vogel entdeckt zwei Falter und erwischt meistens den auffälligeren
        const i = Math.floor(Math.random() * alive.length);
        let j = Math.floor(Math.random() * (alive.length - 1)); if (j >= i) j++;
        const a = alive[i], b = alive[j];
        let pick;
        if (Math.abs(vis(a) - vis(b)) < 1e-6) pick = Math.random() < .5 ? i : j;
        else pick = (vis(a) > vis(b)) === (Math.random() < .85) ? i : j;
        eaten.push(alive[pick]); alive.splice(pick, 1);
      }
      S.ghosts = reduced ? [] : eaten.map(m => ({ ...m, t: 1 }));
      // Überlebende bekommen Nachwuchs, mit kleinen zufälligen Abweichungen
      S.pop = Array.from({ length: N }, () => {
        const p = alive[Math.floor(Math.random() * alive.length)];
        return place({ c: clamp(p.c + gauss() * S.mut, 0, 1) });
      });
      S.gen++; S.eaten = eaten.length; S.hist.push(avg(S.pop));
      if (S.hist.length > 201) S.hist.shift();
    };
    S.reset();
    return S;
  };

  // Rindenstruktur pro Canvas einmal würfeln
  const makeBark = () => Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), w: .03 + Math.random() * .1, h: 1.5 + Math.random() * 2.5, k: (Math.random() - .5) * 40 }));

  const drawMoth = (ctx, x, y, a, s, col) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = rgb(col);
    ctx.beginPath(); ctx.ellipse(-s * .55, 0, s * .72, s * .46, -.35, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * .55, 0, s * .72, s * .46, .35, 0, TAU); ctx.fill();
    ctx.fillStyle = rgb(col.map(v => Math.round(v * .7)));
    ctx.beginPath(); ctx.ellipse(0, s * .05, s * .14, s * .5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  const drawField = (ctx, S, tex, x, y, w, h, dt) => {
    ctx.save(); roundRect(ctx, x, y, w, h, 14); ctx.clip();
    ctx.fillStyle = rgb(mixc(S.bark)); ctx.fillRect(x, y, w, h);
    for (const t of tex) { ctx.fillStyle = rgb(mixc(S.bark, t.k)); ctx.fillRect(x + t.x * w, y + t.y * h, t.w * w, t.h); }
    const s = clamp(w / 52, 6, 9);
    for (const m of S.pop) drawMoth(ctx, x + m.x * w, y + m.y * h, m.a, s, mixc(m.c));
    // gefressene Falter blenden aus
    for (const g of S.ghosts) {
      g.t -= dt * 1.2; if (g.t <= 0) continue;
      ctx.globalAlpha = g.t;
      drawMoth(ctx, x + g.x * w, y + g.y * h, g.a, s, mixc(g.c));
      const gx = x + g.x * w, gy = y + g.y * h;
      ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx - 5, gy - 5); ctx.lineTo(gx + 5, gy + 5); ctx.moveTo(gx + 5, gy - 5); ctx.lineTo(gx - 5, gy + 5); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    S.ghosts = S.ghosts.filter(g => g.t > 0);
    ctx.restore();
  };

  // Balkendiagramm: wie viele Falter haben welche Farbe
  const drawHist = (ctx, S, x, y, w, h) => {
    const bins = 12, counts = new Array(bins).fill(0);
    for (const m of S.pop) counts[Math.min(bins - 1, Math.floor(m.c * bins))]++;
    const top = y + 18, base = y + h - 18, bw = w / bins, maxC = Math.max(N / 3, ...counts);
    ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Anzahl Falter pro Farbe', x, y + 10);
    for (let i = 0; i < bins; i++) {
      const bh = (base - top) * counts[i] / maxC;
      if (bh <= 0) continue;
      roundRect(ctx, x + i * bw + 2, base - bh, bw - 4, bh, Math.min(4, bh / 2));
      ctx.fillStyle = rgb(mixc((i + .5) / bins)); ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x, base + .5); ctx.lineTo(x + w, base + .5); ctx.stroke();
    // Markierung: Farbe der Rinde
    const bx = x + S.bark * w;
    ctx.fillStyle = C.glow; ctx.beginPath(); ctx.moveTo(bx, base + 2); ctx.lineTo(bx - 5, base + 9); ctx.lineTo(bx + 5, base + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('hell', x, y + h - 2);
    ctx.textAlign = 'right'; ctx.fillText('dunkel', x + w, y + h - 2);
    ctx.textAlign = 'center'; ctx.fillStyle = C.glow; ctx.fillText('Rinde', clamp(bx, x + 54, x + w - 76), y + h - 2);
  };

  // Liniendiagramm: Durchschnittsfarbe über die Generationen
  const drawChart = (ctx, S, x, y, w, h) => {
    const l = x + 46, r = x + w, t = y + 14, b = y + h - 22, pw = r - l, ph = b - t;
    const n = Math.max(10, S.hist.length - 1);
    const X = i => l + i / n * pw, Y = v => b - v * ph;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(l + .5, t + .5, pw - 1, ph);
    ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right'; ctx.fillText('dunkel', l - 6, t + 9); ctx.fillText('hell', l - 6, b);
    ctx.textAlign = 'left'; ctx.fillText('0', l, y + h - 4);
    ctx.textAlign = 'right'; ctx.fillText(`Generation ${n}`, r, y + h - 4);
    // Rinde als gestrichelte Linie
    ctx.strokeStyle = C.glow; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(l, Y(S.bark)); ctx.lineTo(r, Y(S.bark)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.glow; ctx.textAlign = 'right'; ctx.fillText('Rinde', r - 6, Y(S.bark) + (S.bark > .5 ? 14 : -6));
    // Durchschnitt der Falter
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath();
    S.hist.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
    ctx.stroke();
    S.hist.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Y(v), 3, 0, TAU); ctx.fillStyle = rgb(mixc(v)); ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.stroke(); });
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('Durchschnittsfarbe', l + 8, t + 14);
  };

  // Mehrere Generationen nacheinander abspielen
  const runGens = (S, n, onTick, btns, done) => {
    if (S.running) return;
    S.running = true; btns.forEach(b => b.disabled = true);
    let k = 0;
    const tick = () => {
      S.step(); onTick(); k++;
      if (k < n) setTimeout(tick, reduced ? 120 : 380);
      else { S.running = false; btns.forEach(b => b.disabled = false); done?.(); }
    };
    tick();
  };
  const pct = v => `${fmt(v * 100, 0)} %`;

  /* ---------- Teil 1: Eine Generation nach der anderen ---------- */
  const cv1 = $('#simCv1'), tex1 = makeBark();
  const S1 = makeSim({ start: .15, spread: .07, bark: .15, mut: .05 });
  const upd1 = () => {
    $('#s1Gen').textContent = S1.gen;
    $('#s1Avg').textContent = pct(avg(S1.pop));
    $('#s1Eaten').textContent = S1.eaten === null ? '–' : `${S1.eaten} von ${N}`;
  };
  $('#barkIn1').addEventListener('input', e => { S1.bark = +e.target.value / 100; $('#barkOut1').textContent = `${e.target.value} %`; });
  $('#genBtn1').addEventListener('click', () => {
    S1.step(); upd1();
    const d = avg(S1.pop) - S1.hist[S1.hist.length - 2];
    $('#s1Status').textContent = Math.abs(d) < .01
      ? 'Kaum Veränderung. Die Falter passen gerade gut zur Rinde, oder die Vögel finden alle gleich leicht.'
      : `Die neue Generation ist im Schnitt ${d > 0 ? 'dunkler' : 'heller'}. Die Überlebenden haben ihre Farbe vererbt.`;
  });
  $('#resetSim1').addEventListener('click', () => { S1.reset(); upd1(); $('#s1Status').textContent = 'Neue helle Population. Wie viele Generationen braucht sie für russige Rinde?'; });
  upd1();

  /* ---------- Teil 2: Zehn Generationen und eine Kurve ---------- */
  const cv2 = $('#simCv2'), tex2 = makeBark();
  const S2 = makeSim({ start: .15, spread: .07, bark: .8, mut: .05 });
  const upd2 = () => { $('#s2Gen').textContent = S2.gen; $('#s2Avg').textContent = pct(avg(S2.pop)); };
  $('#barkIn2').addEventListener('input', e => { S2.bark = +e.target.value / 100; $('#barkOut2').textContent = `${e.target.value} %`; });
  $('#runBtn2').addEventListener('click', () => runGens(S2, 10, upd2, [$('#runBtn2'), $('#resetSim2')], () => {
    $('#s2Status').textContent = `Nach ${S2.gen} Generationen: Durchschnitt ${pct(avg(S2.pop))}. Kein einziger Falter hat dafür seine Farbe gewechselt.`;
  }));
  $('#resetSim2').addEventListener('click', () => { S2.reset(); upd2(); $('#s2Status').textContent = 'Zurück auf Anfang. Probier auch, die Rinde danach wieder sauber zu machen.'; });
  upd2();

  /* ---------- Teil 3: Ohne Mutation keine Anpassung ---------- */
  const cv3 = $('#simCv3'), tex3 = makeBark();
  const S3 = makeSim({ start: .2, spread: 0, bark: .85, mut: 0 });
  const upd3 = () => { $('#s3Gen').textContent = S3.gen; $('#s3Avg').textContent = pct(avg(S3.pop)); $('#s3Var').textContent = pct(sd(S3.pop)); };
  $('#mutIn').addEventListener('input', e => {
    const v = +e.target.value; S3.mut = v / 100;
    $('#mutOut').textContent = v === 0 ? 'aus' : `±${v} %`;
  });
  $('#runBtn3').addEventListener('click', () => runGens(S3, 10, upd3, [$('#runBtn3'), $('#resetSim3')], () => {
    $('#s3Status').textContent = sd(S3.pop) < .005
      ? 'Nichts passiert. Alle Falter sind gleich, die Vögel haben keine Wahl. Ohne Unterschiede gibt es nichts auszuwählen.'
      : 'Mutationen erzeugen zufällig hellere und dunklere Falter. Die Vögel lassen die dunkleren öfter übrig.';
  }));
  $('#resetSim3').addEventListener('click', () => { S3.reset(); upd3(); $('#s3Status').textContent = 'Wieder alle gleich hell. Die Rinde ist russig.'; });
  upd3();

  /* ---------- Lektion verdrahten ---------- */
  lesson('evolution', 4, {
    simLock1: () => { ['#barkIn1', '#genBtn1', '#resetSim1'].forEach(s => $(s).disabled = false); },
    simLock2: () => { ['#barkIn2', '#runBtn2', '#resetSim2'].forEach(s => $(s).disabled = false); },
    simLock3: () => { ['#mutIn', '#runBtn3', '#resetSim3'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => {
    { const { ctx, w, h } = fit(cv1); ctx.clearRect(0, 0, w, h);
      drawField(ctx, S1, tex1, 12, 12, w - 24, h - 128, dt); drawHist(ctx, S1, 12, h - 104, w - 24, 96); }
    { const { ctx, w, h } = fit(cv2); ctx.clearRect(0, 0, w, h);
      drawField(ctx, S2, tex2, 12, 12, w - 24, 150, dt); drawChart(ctx, S2, 12, 176, w - 24, h - 186); }
    { const { ctx, w, h } = fit(cv3); ctx.clearRect(0, 0, w, h);
      drawField(ctx, S3, tex3, 12, 12, w - 24, h - 128, dt); drawHist(ctx, S3, 12, h - 104, w - 24, 96); }
  });
})();
