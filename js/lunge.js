/* mindblow – Lektion Lunge & Atmung */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Lungengewebe und Blut sehen hell und dunkel gleich aus
  const LUNG = 'rgba(232,128,146,0.82)', LUNG_EDGE = 'rgba(160,60,80,0.9)';
  const blood = s => { // s = Sättigung 0..1: dunkles zu hellem Rot
    const t = clamp((s - .5) / .5, 0, 1);
    return `rgb(${Math.round(lerp(120, 214, t))},${Math.round(lerp(22, 38, t))},${Math.round(lerp(48, 44, t))})`;
  };

  /* ---------- Teil 1: Glocke, Ballons, Zwerchfell ---------- */
  const breathCv = $('#breathCv');
  const FRC = 2.5;        // Luft, die nach ruhigem Ausatmen in der Lunge bleibt (l, vereinfacht)
  const IC = 3.0;         // so viel kann man maximal zusätzlich einatmen (l, vereinfacht)
  const RES = 2.0;        // Atemwegswiderstand, hPa pro (l/s), vereinfacht
  const TAU_FILL = 0.12;  // wie schnell die Luft dem Brustraum folgt (s)
  const BR = { auto: !reduced, rate: 14, tidal: .5, dia: 0, phase: 0, vThorax: FRC, vLung: FRC, flow: 0, trace: [], tt: 0, enabled: false, dots: [] };

  const updBreathUI = () => {
    $('#rateOut').textContent = `${BR.rate}/min`;
    $('#tidalOut').textContent = `${fmt(BR.tidal, 1)} l`;
    $('#autoBtn').textContent = BR.auto ? 'Anhalten' : 'Automatisch atmen';
    $('#brMin').textContent = BR.auto ? `${fmt(BR.rate * BR.tidal, 1)} l/min` : 'Pause';
  };
  const breathMsg = () => {
    const mv = BR.rate * BR.tidal;
    let m;
    if (mv <= 9 && BR.rate <= 18 && BR.tidal <= .8) m = `Ruhe: etwa 12 bis 16 Atemzüge pro Minute mit je rund 0,5 l. Das sind ${fmt(mv, 1)} Liter Luft pro Minute.`;
    else if (mv < 40) m = `${fmt(mv, 0)} Liter pro Minute: So atmest du beim Treppensteigen oder Joggen.`;
    else m = `${fmt(mv, 0)} Liter pro Minute: Das schaffen nur gut Trainierte bei harter Anstrengung. Spitzensportler kommen auf über 150.`;
    $('#breathStatus').textContent = m;
  };
  $('#diaIn').addEventListener('input', e => {
    BR.dia = +e.target.value / 100;
    $('#diaOut').textContent = `${e.target.value} %`;
    if (BR.auto) { BR.auto = false; updBreathUI(); }
    $('#breathStatus').textContent = BR.dia > .02
      ? 'Das Zwerchfell senkt sich, der Brustraum wird grösser. Der Druck in der Lunge fällt kurz unter den Aussendruck, und Luft strömt nach.'
      : 'Entspannt: Das Zwerchfell wölbt sich nach oben, die elastische Lunge zieht sich zusammen. Luft strömt hinaus.';
  });
  $('#rateIn').addEventListener('input', e => { BR.rate = +e.target.value; updBreathUI(); breathMsg(); });
  $('#tidalIn').addEventListener('input', e => { BR.tidal = +e.target.value; updBreathUI(); breathMsg(); });
  $('#autoBtn').addEventListener('click', () => { BR.auto = !BR.auto; if (BR.auto) BR.phase = 0; updBreathUI(); if (BR.auto) breathMsg(); });
  const preset = (rate, tidal) => {
    BR.rate = rate; BR.tidal = tidal; $('#rateIn').value = rate; $('#tidalIn').value = tidal;
    if (!BR.auto) { BR.auto = true; BR.phase = 0; }
    updBreathUI(); breathMsg();
  };
  $('#restBtn').addEventListener('click', () => preset(14, .5));
  $('#sportBtn').addEventListener('click', () => preset(35, 2.5));
  updBreathUI();

  const stepBreath = dt => {
    if (!BR.enabled) return;
    if (BR.auto) {
      BR.phase = (BR.phase + dt * BR.rate / 60) % 1;
      const p = BR.phase;   // Einatmen ca. 40 %, Ausatmen ca. 60 % der Zeit
      const x = p < .4 ? (1 - Math.cos(Math.PI * p / .4)) / 2 : (1 + Math.cos(Math.PI * (p - .4) / .6)) / 2;
      BR.vThorax = FRC + BR.tidal * x;
      BR.dia = clamp(BR.tidal * x / IC, 0, 1);
      const pc = Math.round(BR.dia * 100);
      $('#diaIn').value = pc; $('#diaOut').textContent = `${pc} %`;
    } else {
      BR.vThorax = FRC + BR.dia * IC;
    }
    // Die Luft folgt dem Brustraum mit kleiner Verzögerung; solange sie fliesst, gibt es einen Druckunterschied
    const flow = (BR.vThorax - BR.vLung) / TAU_FILL;
    BR.vLung += flow * Math.min(dt, TAU_FILL);
    BR.flow = lerp(BR.flow, flow, Math.min(1, dt * 20));
    BR.tt += dt;
    if (BR.tt > .05) {
      BR.tt = 0; BR.trace.push(BR.vLung); if (BR.trace.length > 240) BR.trace.shift();
      $('#brVol').textContent = `${fmt(BR.vLung, 1)} l`;
      const pr = -RES * BR.flow;
      $('#brPres').textContent = `${pr > 0.05 ? '+' : ''}${fmt(Math.abs(pr) < .05 ? 0 : pr, 1)} hPa`;
    }
    // Luftteilchen in der Luftröhre
    if (!reduced) {
      if (Math.abs(BR.flow) > .05 && Math.random() < Math.min(1, Math.abs(BR.flow) * dt * 14)) BR.dots.push({ y: BR.flow > 0 ? 0 : 1, x: Math.random() - .5 });
      BR.dots.forEach(d => { d.y += BR.flow * dt * .9; });
      BR.dots = BR.dots.filter(d => d.y >= -0.05 && d.y <= 1.05);
    }
  };

  const drawBreath = () => {
    const { ctx, w, h } = fit(breathCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const traceH = 74, mh = h - traceH - 8;
    const cx = w / 2;
    // Glasglocke (Brustkorb)
    const jw = Math.min(w - 40, 300), jy = 46, jh = mh - 42 - jy, jx = cx - jw / 2;
    const domeLift = (1 - BR.dia) * 26;   // entspannt: Zwerchfell wölbt sich nach oben
    const bottom = jy + jh;
    ctx.save();
    roundRect(ctx, jx, jy, jw, jh, 28); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.muted; ctx.stroke();
    ctx.restore();
    // Luftröhre
    const tw = 12, topY = 14, forkY = jy + 40;
    ctx.fillStyle = C.surface; ctx.fillRect(cx - tw / 2, jy - 2, tw, 6);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - tw / 2, topY); ctx.lineTo(cx - tw / 2, forkY); ctx.moveTo(cx + tw / 2, topY); ctx.lineTo(cx + tw / 2, forkY); ctx.stroke();
    // Ballons (Lungenflügel)
    const vRel = clamp((BR.vLung - FRC + .4) / (IC + .4), 0, 1.1);
    const r = lerp(jw * .11, jw * .2, vRel);
    const by = forkY + 18 + r * .9;
    const bx = [cx - jw * .22, cx + jw * .22];
    ctx.lineWidth = 2; ctx.strokeStyle = C.fg;
    bx.forEach(x => { ctx.beginPath(); ctx.moveTo(cx, forkY); ctx.quadraticCurveTo(x * .5 + cx * .5, forkY + 4, x, by - r * .95); ctx.stroke(); });
    bx.forEach(x => {
      ctx.beginPath(); ctx.ellipse(x, by, r * .85, r, 0, 0, TAU);
      ctx.fillStyle = LUNG; ctx.fill(); ctx.strokeStyle = LUNG_EDGE; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // Zwerchfell als Gummihaut
    const dy = bottom - domeLift + BR.dia * 30;
    ctx.beginPath(); ctx.moveTo(jx + 4, bottom); ctx.quadraticCurveTo(cx, dy - domeLift, jx + jw - 4, bottom);
    ctx.strokeStyle = C.copper; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
    // Griff zum Ziehen, hängt am tiefsten Punkt der Gummihaut
    const apexY = (bottom + dy - domeLift) / 2, gy = Math.max(bottom, apexY) + 6;
    ctx.strokeStyle = C.copper; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, apexY); ctx.lineTo(cx, gy + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, gy + 16, 4, 0, TAU); ctx.fillStyle = C.copper; ctx.fill();
    // Luftteilchen
    ctx.fillStyle = C.fiber;
    BR.dots.forEach(d => { ctx.beginPath(); ctx.arc(cx + d.x * (tw - 5), lerp(topY, forkY, d.y), 2.2, 0, TAU); ctx.fill(); });
    // Beschriftungen
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Luftröhre' : 'Luftröhre (offen nach aussen)', cx + tw / 2 + 8, jy - 8);
    ctx.textAlign = 'center';
    ctx.fillText('Lunge', bx[0], by + r + 14);
    ctx.fillText('Lunge', bx[1], by + r + 14);
    ctx.fillStyle = C.copper; ctx.textAlign = 'left';
    ctx.fillText('Zwerchfell', jx + 12, bottom - 10);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText('Brustraum', jx + jw - 14, jy + 20);
    // Strömung und Druck
    const pr = -RES * BR.flow;
    let label = 'Druck gleich: keine Strömung';
    if (pr < -.05) label = narrow ? 'Unterdruck: Luft strömt ein' : 'Unterdruck in der Lunge: Luft strömt ein';
    else if (pr > .05) label = narrow ? 'Überdruck: Luft strömt aus' : 'Überdruck in der Lunge: Luft strömt aus';
    // Verlauf
    const ty = h - traceH + 8, th = traceH - 16, tx = 12, twid = w - 24;
    ctx.fillStyle = C.sunk; roundRect(ctx, tx, ty, twid, th, 8); ctx.fill();
    const yOf = v => ty + th - 4 - (v - FRC + .3) / (IC + .6) * (th - 8);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tx, yOf(FRC)); ctx.lineTo(tx + twid, yOf(FRC)); ctx.stroke(); ctx.setLineDash([]);
    if (BR.trace.length > 1) {
      ctx.beginPath();
      BR.trace.forEach((v, i) => { const x = tx + twid - (BR.trace.length - 1 - i) / 239 * twid; i ? ctx.lineTo(x, yOf(v)) : ctx.moveTo(x, yOf(v)); });
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Volumen, 12 s' : 'Luft in der Lunge, letzte 12 Sekunden', tx + 8, ty + 13);
    ctx.font = `11px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillStyle = pr < -.05 ? C.fiber : pr > .05 ? C.copper : C.muted;
    ctx.fillText(label, tx + twid - 8, ty + 13);
  };

  /* ---------- Teil 2: Bronchialbaum ---------- */
  const treeCv = $('#treeCv');
  // typische Werte nach dem Lungenmodell von Weibel (vereinfacht, symmetrisch)
  const DIAM = [18, 12.2, 8.3, 5.6, 4.5, 3.5, 2.8, 2.3, 1.86, 1.54, 1.3, 1.09, .95, .82, .74, .66, .6, .54, .5, .47, .45, .43, .41, .41]; // mm
  const LEN = [120, 47.6, 19, 7.6, 12.7, 10.7, 9, 7.6, 6.4, 5.4, 4.6, 3.9, 3.3, 2.7, 2.3, 2, 1.65, 1.41, 1.17, .99, .83, .7, .59, .5]; // mm
  const ALV_PER = { 17: 5, 18: 8, 19: 12, 20: 20, 21: 20, 22: 20, 23: 17 }; // Bläschen pro Röhrchen
  const ALV_AREA = .27e-6; // m² pro Bläschen, so gewählt, dass total rund 80 m² herauskommen
  const AREA = [], ALVS = [];
  { let a = 0, n = 0;
    for (let g = 0; g <= 23; g++) {
      const cnt = 2 ** g;
      a += Math.PI * DIAM[g] * LEN[g] * 1e-6 * cnt;
      if (ALV_PER[g]) { n += ALV_PER[g] * cnt; a += ALV_PER[g] * cnt * ALV_AREA; }
      AREA.push(a); ALVS.push(n);
    } }
  const TR = { gen: 0, shown: 0 };
  // fester Zufall, damit der Baum immer gleich aussieht
  const jit = (g, i) => { const s = Math.sin(g * 127.1 + i * 311.7) * 43758.5453; return s - Math.floor(s) - .5; };
  const bigNum = n => n >= 1e6 ? `${fmt(n / 1e6, 1)} Mio.` : fmt(n, 0);
  const updTree = () => {
    const g = TR.gen;
    $('#genIn').value = g; $('#genOut').textContent = g;
    $('#trCount').textContent = bigNum(2 ** g);
    $('#trDiam').textContent = DIAM[g] >= 1 ? `${fmt(DIAM[g], DIAM[g] >= 10 ? 0 : 1)} mm` : `${fmt(DIAM[g], 2)} mm`;
    const a = AREA[g];
    $('#trArea').textContent = `${fmt(a, a < 10 ? 1 : 0)} m²`;
    let m;
    if (g === 0) m = 'Stufe 0 ist die Luftröhre. Schieb den Regler nach rechts.';
    else if (g === 1) m = 'Stufe 1: die zwei Hauptbronchien, einer für jeden Lungenflügel.';
    else if (g < 17) m = `Bis hier nur Leitungen: Sie wärmen, befeuchten und reinigen die Luft. Ins Blut kommt hier noch nichts. Fläche: kaum ${fmt(a, 1)} m².`;
    else if (g < 23) m = `Ab Stufe 17 sitzen Lungenbläschen an den Wänden. Bisher rund ${bigNum(ALVS[g])} Bläschen, die Fläche wächst rasant.`;
    else m = `Stufe 23: rund ${bigNum(2 ** g)} Endästchen und etwa ${fmt(ALVS[g] / 1e6, 0)} Mio. Bläschen mit rund ${fmt(a, 0)} m². Echte Lungen haben 300 bis 500 Mio. Bläschen und 70 bis 100 m².`;
    $('#treeStatus').textContent = m;
  };
  $('#genIn').addEventListener('input', e => { TR.gen = +e.target.value; if (reduced) TR.shown = TR.gen; updTree(); });
  $('#treeGrow').addEventListener('click', () => { TR.gen = 23; if (reduced) TR.shown = 23; updTree(); });
  $('#treeReset').addEventListener('click', () => { TR.gen = 0; TR.shown = 0; updTree(); });
  updTree();

  const drawTree = dt => {
    TR.shown = reduced ? TR.gen : TR.shown + (TR.gen - TR.shown) * Math.min(1, dt * 4);
    const { ctx, w, h } = fit(treeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const maxDraw = narrow ? 9 : 11;      // mehr Stufen kann man nicht mehr sehen
    const depth = Math.min(TR.shown, maxDraw);
    const full = Math.floor(depth), part = depth - full;
    const top = 30, x0 = w / 2;
    const L0 = (h - top - 40) * .28;
    ctx.lineCap = 'round';
    const tips = [];
    const branch = (x, y, ang, len, g, idx) => {
      const grow = g < full ? 1 : g === full ? part : 0;
      if (grow <= 0) { if (g > 0) tips.push([x, y, ang]); return; }
      const ex = x + Math.sin(ang) * len * grow, ey = y + Math.cos(ang) * len * grow;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
      ctx.lineWidth = Math.max(.6, 11 * Math.pow(.72, g));
      ctx.strokeStyle = g < 4 ? C.fg : C.muted; ctx.stroke();
      if (grow < 1) { tips.push([ex, ey, ang]); return; }
      const spread = (g === 0 ? .62 : .5 - g * .012) + jit(g, idx) * .12;
      const next = len * (g === 0 ? .62 : .72 + jit(idx, g) * .06);
      branch(ex, ey, ang - spread, next, g + 1, idx * 2);
      branch(ex, ey, ang + spread, next, g + 1, idx * 2 + 1);
    };
    // Stufe 0 senkrecht nach unten
    branch(x0, top, 0, L0, 0, 0);
    // Lungenbläschen als kleine Trauben an den Spitzen, sobald die echte Stufe 17 erreicht ist
    if (TR.shown > 16.5 && depth >= maxDraw - .01) {
      const t = clamp((TR.shown - 16.5) / 6.5, 0, 1);
      const per = Math.round(1 + t * 5), rr = narrow ? 1.6 : 2;
      ctx.fillStyle = LUNG;
      tips.forEach(([x, y, ang], i) => {
        for (let k = 0; k < per; k++) {
          const a = ang + jit(i, k) * 2.4, d = 3 + Math.abs(jit(k, i)) * 7 * t;
          ctx.beginPath(); ctx.arc(x + Math.sin(a) * d, y + Math.cos(a) * d, rr, 0, TAU); ctx.fill();
        }
      });
    }
    // Beschriftung
    const g = TR.gen;
    const label = narrow ? `Stufe ${g} · ${bigNum(2 ** g)} Röhrchen` : `Stufe ${g} · ${bigNum(2 ** g)} Röhrchen · symmetrisch vereinfacht`;
    ctx.font = `11px ${MONO}`;
    const tw = Math.min(ctx.measureText(label).width, w - 40);
    roundRect(ctx, 12, h - 36, tw + 20, 24, 12); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(label, 22, h - 20, w - 40);
    if (TR.shown > maxDraw + .5) {
      ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      ctx.fillText(narrow ? `ab Stufe ${maxDraw}: zu fein` : `ab Stufe ${maxDraw} zu fein zum Zeichnen`, w - 12, 20);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText('Luftröhre', x0 + 10, top + 10);
  };

  /* ---------- Teil 3: Gasaustausch ---------- */
  const gasCv = $('#gasCv');
  const GS = { alt: 0, pb: 1013, pao2: 99, sat: .977, enabled: false, o2: [], co2: [], rbc: [] };
  // Luftdruck mit der Höhe, vereinfachte barometrische Formel
  const physio = alt => {
    const pb = 1013.25 * Math.exp(-alt / 8000);      // hPa
    const pbm = pb * .750062;                          // mmHg
    const t = clamp((760 - pbm) / (760 - 253), 0, 1);
    const paco2 = 40 - 32.5 * t * t;                   // in der Höhe atmet man stärker, CO₂ sinkt
    const pao2 = Math.max(5, .2095 * (pbm - 47) - paco2 / .8); // Alveolargasgleichung, mmHg
    const sat = 1 / (1 + 23400 / (pao2 ** 3 + 150 * pao2));   // Severinghaus-Kurve
    return { pb, pao2, sat };
  };
  const updGas = () => {
    const p = physio(GS.alt);
    Object.assign(GS, p);
    $('#altIn').value = GS.alt; $('#altOut').textContent = `${fmt(GS.alt, 0)} m`;
    $('#gsPres').textContent = `${fmt(p.pb, 0)} hPa`;
    $('#gsPO2').textContent = `${fmt(p.pao2 * 1.33322, 0)} hPa`;
    $('#gsSat').textContent = `${fmt(p.sat * 100, 0)} %`;
    $$('#altPresets button').forEach(b => b.classList.toggle('active', +b.dataset.alt === GS.alt));
    let m;
    if (GS.alt < 1500) m = 'Viel Sauerstoff in den Bläschen, wenig im ankommenden Blut: Er diffundiert schnell hinüber. Das Blut verlässt die Lunge fast voll beladen.';
    else if (GS.alt < 5000) m = 'Der Anteil bleibt 20,9 %, aber jeder Atemzug enthält weniger Teilchen. Das Gefälle zum Blut ist kleiner, die Sättigung sinkt. Darum bist du auf dem Jungfraujoch schneller ausser Atem.';
    else m = 'Auf dem Everest ist der Luftdruck nur etwa ein Drittel. Das Gefälle ist so klein, dass das Blut nicht mehr voll wird. 1978 kamen Reinhold Messner und Peter Habeler trotzdem ohne Sauerstoffflasche hinauf.';
    $('#gasStatus').textContent = m;
  };
  $('#altIn').addEventListener('input', e => { GS.alt = +e.target.value; updGas(); });
  $$('#altPresets button').forEach(b => b.addEventListener('click', () => { GS.alt = +b.dataset.alt; updGas(); }));
  updGas();

  const VEN = .75; // Sättigung des Blutes, das zur Lunge kommt (in Ruhe, vereinfacht)
  let gasGeo = null;
  const gasLayout = (w, h) => {
    const wallY = Math.round(h * .5), wallT = 6;
    return { w, h, airTop: 30, wallY, wallT, capTop: wallY + wallT, capBot: h - 34 };
  };
  const seedGas = G => {
    GS.o2 = []; GS.co2 = []; GS.rbc = [];
    const nRbc = Math.max(4, Math.round(G.w / 70));
    for (let i = 0; i < nRbc; i++) GS.rbc.push({ x: i / nRbc * (G.w + 60) - 30, y: lerp(G.capTop + 18, G.capBot - 18, Math.random()), load: [] });
    for (let i = 0; i < 12; i++) GS.co2.push({ x: Math.random() * G.w, y: lerp(G.capTop + 6, G.capBot - 6, Math.random()), where: 'blood' });
  };
  const stepGas = dt => {
    if (!gasGeo) return;
    const G = gasGeo, sp = reduced ? .3 : 1;
    const flowV = 34 * sp;                               // Blutfluss nach rechts, px/s
    const D = 70 * sp;                                   // Zitterbewegung
    // Sauerstoff in der Luft: Anzahl entspricht dem O₂-Druck im Bläschen
    const target = Math.round(G.w / 360 * 34 * GS.pao2 / 99);
    const inAir = GS.o2.filter(p => p.where === 'air').length;
    if (inAir < target && Math.random() < dt * 30) GS.o2.push({ x: Math.random() * G.w, y: lerp(G.airTop + 4, G.wallY - 4, Math.random()), where: 'air' });
    if (inAir > target + 2) { const i = GS.o2.findIndex(p => p.where === 'air'); if (i >= 0) GS.o2.splice(i, 1); }
    const jiggle = p => { p.x += (Math.random() - .5) * D * dt * 2; p.y += (Math.random() - .5) * D * dt * 2; };
    GS.o2.forEach(p => {
      if (p.where === 'air') {
        jiggle(p);
        p.x = clamp(p.x, 4, G.w - 4);
        if (p.y < G.airTop) p.y = G.airTop + 2;
        if (p.y > G.wallY - 2) {
          // durch die Wand: Wahrscheinlichkeit wächst mit dem Gefälle (vereinfacht)
          if (Math.random() < .35) { p.where = 'blood'; p.y = G.capTop + 3; } else p.y = G.wallY - 3;
        }
      } else if (p.where === 'blood') {
        jiggle(p); p.x += flowV * dt;
        if (p.y < G.capTop + 2) p.y = G.capTop + 2;
        if (p.y > G.capBot - 2) p.y = G.capBot - 2;
        // freies O₂ wird von einem nahen roten Blutkörperchen gebunden
        for (const c of GS.rbc) {
          const cap = 4;
          if (c.load.length < cap && Math.hypot(c.x - p.x, c.y - p.y) < 22) { p.where = 'bound'; c.load.push(Math.random() * TAU); break; }
        }
        if (p.x > G.w + 10) p.where = 'gone';
      }
    });
    GS.o2 = GS.o2.filter(p => p.where === 'air' || p.where === 'blood');
    // rote Blutkörperchen
    GS.rbc.forEach(c => {
      c.x += flowV * dt;
      // Sättigung nimmt entlang der Kapillare zu, bis zum Wert, den der O₂-Druck erlaubt
      const f = clamp(c.x / (G.w * .45), 0, 1);
      c.sat = lerp(VEN, GS.sat, 1 - Math.pow(1 - f, 2));
      if (c.x > G.w + 30) { c.x -= G.w + 60; c.y = lerp(G.capTop + 18, G.capBot - 18, Math.random()); c.load = []; }
    });
    // CO₂: kommt mit dem Blut, wandert in die Luft und wird ausgeatmet
    if (GS.co2.filter(p => p.where === 'blood').length < Math.round(G.w / 360 * 14) && Math.random() < dt * 8)
      GS.co2.push({ x: -4, y: lerp(G.capTop + 6, G.capBot - 6, Math.random()), where: 'blood' });
    GS.co2.forEach(p => {
      jiggle(p);
      if (p.where === 'blood') {
        p.x += flowV * dt;
        p.y = clamp(p.y, G.capTop + 2, G.capBot - 2);
        if (p.y < G.capTop + 6 && Math.random() < .6) { p.where = 'air'; p.y = G.wallY - 3; }
        if (p.x > G.w + 10) p.where = 'gone';
      } else if (p.where === 'air') {
        p.y -= 12 * sp * dt;                           // Ausatmen trägt es weg
        p.x = clamp(p.x, 4, G.w - 4);
        if (p.y > G.wallY - 2) p.y = G.wallY - 3;
        if (p.y < G.airTop) p.where = 'gone';
      }
    });
    GS.co2 = GS.co2.filter(p => p.where !== 'gone');
  };

  const drawGas = () => {
    const { ctx, w, h } = fit(gasCv);
    if (!gasGeo || gasGeo.w !== w || gasGeo.h !== h) { gasGeo = gasLayout(w, h); seedGas(gasGeo); }
    const G = gasGeo, narrow = w < 440;
    ctx.clearRect(0, 0, w, h);
    // Luft im Bläschen
    ctx.fillStyle = C.sunk; ctx.fillRect(0, G.airTop, w, G.wallY - G.airTop);
    // Blut in der Kapillare (bewusst festes, blasses Rot)
    ctx.fillStyle = 'rgba(200,60,70,0.14)'; ctx.fillRect(0, G.capTop, w, G.capBot - G.capTop);
    // Wand
    ctx.fillStyle = 'rgba(232,128,146,0.75)'; ctx.fillRect(0, G.wallY, w, G.wallT);
    // rote Blutkörperchen
    GS.rbc.forEach(c => {
      const rx = narrow ? 15 : 18, ry = rx * .55;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU);
      ctx.fillStyle = blood(c.sat ?? VEN); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * .5, ry * .45, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.fillStyle = C.fiber;
      c.load.forEach(a => { ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * rx * .6, c.y + Math.sin(a) * ry * .6, 2.4, 0, TAU); ctx.fill(); });
    });
    // Teilchen
    ctx.fillStyle = C.fiber;
    GS.o2.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill(); });
    ctx.fillStyle = C.muted;
    GS.co2.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill(); });
    // Beschriftungen
    ctx.font = `11px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText(narrow ? 'Luft im Lungenbläschen' : 'Luft im Lungenbläschen · Anteil O₂ immer 20,9 %', 12, 19);
    ctx.fillText(narrow ? 'Blut, fliesst nach rechts →' : 'Blut in der Kapillare, fliesst nach rechts →', 12, h - 12);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Wand ≈ 1/1000 mm' : 'Wand ≈ 1/1000 mm, stark vergrössert', w - 12, G.wallY - 8);
    // Legende oben rechts
    if (!narrow) {
      ctx.textAlign = 'right';
      ctx.fillStyle = C.fiber; ctx.fillText('● O₂', w - 62, 19);
      ctx.fillStyle = C.muted; ctx.fillText('● CO₂', w - 12, 19);
    }
    // Sättigung hinten
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg;
    ctx.fillText(`${fmt(GS.sat * 100, 0)} % beladen`, w - 12, h - 12);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('lunge', 4, {
    breathLock: () => {
      ['#diaIn', '#rateIn', '#tidalIn', '#autoBtn', '#restBtn', '#sportBtn'].forEach(s => $(s).disabled = false);
      BR.enabled = true; updBreathUI();
    },
    treeLock: () => { ['#genIn', '#treeGrow', '#treeReset'].forEach(s => $(s).disabled = false); },
    gasLock: () => { $('#altIn').disabled = false; $$('#altPresets button').forEach(b => b.disabled = false); GS.enabled = true; },
  });

  loop(dt => {
    stepBreath(dt); drawBreath();
    drawTree(dt);
    if (GS.enabled) stepGas(dt);
    drawGas();
  });
})();
