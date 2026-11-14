/* mindblow – Lektion Wasser im Baum */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const hhmm = t => { const m = Math.round(((t % 24) + 24) % 24 * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

  /* ---------- Teil 1: Saftstrom im Baum ---------- */
  const flowCv = $('#flowCv');
  const F = { sun: 70, hum: 50, on: false };
  const TREE_H = 30;     // Meter
  const L_MAX = 50;      // Liter pro Stunde bei voller Sonne und trockener Luft (grosser Laubbaum, vereinfacht)
  const V_MAX = 6;       // Meter pro Stunde Saftstrom (zerstreutporiges Laubholz, grob)
  const fRate = () => (F.sun / 100) * clamp((100 - F.hum) / 80, 0, 1);
  // Teilchen auf Wegen: Wurzel → Stamm → Ast → Blatt
  const parts = Array.from({ length: 70 }, () => ({ s: Math.random(), br: Math.floor(Math.random() * 5), rt: Math.floor(Math.random() * 4) }));
  const vapor = [];

  const updFlow = () => {
    const r = fRate();
    $('#sunOut').textContent = `${F.sun} %`;
    $('#humOut').textContent = `${F.hum} %`;
    if (!F.on) return;
    const v = V_MAX * r;
    $('#fL').textContent = `${fmt(L_MAX * r, 0)} l`;
    $('#fV').textContent = v > 0.05 ? `${fmt(v, 1)} m/h` : 'steht';
    $('#fT').textContent = v > 0.05 ? (TREE_H / v < 48 ? `${fmt(TREE_H / v, 0)} h` : 'Tage') : '–';
    $('#flowStatus').textContent =
      F.sun < 10 ? 'Nacht oder tiefer Schatten: Es verdunstet kaum etwas, also zieht auch nichts. Der Wasserfaden steht still.'
      : F.hum >= 95 ? 'Die Luft ist mit Wasserdampf gesättigt. Die Blätter können kaum verdunsten, der Strom stockt.'
      : r > .6 ? 'Heiss und trocken: Die Blätter verdunsten viel, der Faden wird kräftig nach oben gezogen.'
      : 'Etwas Sonne, etwas Feuchte: Der Strom fliesst gemächlich.';
  };
  $('#sunIn').addEventListener('input', e => { F.sun = +e.target.value; updFlow(); });
  $('#humIn').addEventListener('input', e => { F.hum = +e.target.value; updFlow(); });
  updFlow();

  const drawFlow = (dt, now) => {
    const { ctx, w, h } = fit(flowCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const r = fRate();
    const cx = w * (small ? .56 : .52), gY = h - 62, crownY = h * .32;
    const trunkW = small ? 22 : 28;
    // Sonne
    const sx = small ? 36 : 54, sy = 40, sR = 14 + 8 * F.sun / 100;
    ctx.globalAlpha = .25 + .75 * F.sun / 100;
    ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(sx, sy, sR, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU + (reduced ? 0 : now / 4000);
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * (sR + 5), sy + Math.sin(a) * (sR + 5)); ctx.lineTo(sx + Math.cos(a) * (sR + 11), sy + Math.sin(a) * (sR + 11)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Boden
    ctx.fillStyle = C.sunk; ctx.fillRect(0, gY, w, h - gY);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(w, gY); ctx.stroke();
    // Wurzeln
    const roots = [-1, -.45, .45, 1].map(k => ({ x: cx + k * (small ? 70 : 100), y: gY + 44 - Math.abs(k) * 8 }));
    ctx.strokeStyle = C.copper; ctx.lineWidth = 3;
    for (const p of roots) { ctx.beginPath(); ctx.moveTo(cx, gY); ctx.quadraticCurveTo(cx + (p.x - cx) * .3, p.y - 4, p.x, p.y); ctx.stroke(); }
    // Äste und Blätter (Ziele)
    const tips = [-1, -.5, 0, .5, 1].map((k, i) => ({ x: cx + k * (small ? 80 : 120), y: crownY - 40 + Math.abs(k) * 34 + (i === 2 ? -28 : 0) }));
    ctx.strokeStyle = C.copper; ctx.lineWidth = 6;
    for (const t of tips) { ctx.beginPath(); ctx.moveTo(cx, crownY + 40); ctx.quadraticCurveTo(cx + (t.x - cx) * .2, t.y + 20, t.x, t.y); ctx.stroke(); }
    // Krone
    ctx.fillStyle = C.good; ctx.globalAlpha = .22;
    for (const t of tips) { ctx.beginPath(); ctx.ellipse(t.x, t.y, small ? 38 : 50, small ? 30 : 36, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // Stamm mit Holzgefäss
    roundRect(ctx, cx - trunkW / 2, crownY + 30, trunkW, gY - crownY - 30, 6);
    ctx.fillStyle = C.copper; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.surface; ctx.fillRect(cx - 4, crownY + 34, 8, gY - crownY - 34);
    // Teilchen bewegen
    const speed = r * .22; // Anteil des Weges pro Sekunde (Zeitraffer)
    const pos = p => {
      const s = p.s, rt = roots[p.rt], tp = tips[p.br];
      if (s < .15) { const u = s / .15; return [rt.x + (cx - rt.x) * u, rt.y + (gY - rt.y) * u]; }
      if (s < .75) { const u = (s - .15) / .6; return [cx, gY - (gY - crownY - 40) * u]; }
      const u = (s - .75) / .25; return [cx + (tp.x - cx) * u, crownY + 40 + (tp.y - crownY - 40) * u];
    };
    ctx.fillStyle = C.fiber;
    for (const p of parts) {
      if (F.on && !reduced) {
        p.s += speed * dt;
        if (p.s >= 1) {
          const [x, y] = pos({ ...p, s: 1 });
          if (vapor.length < 120) vapor.push({ x, y, vx: (Math.random() - .5) * 20, vy: -14 - Math.random() * 12, life: 1 });
          p.s -= 1; p.br = Math.floor(Math.random() * 5); p.rt = Math.floor(Math.random() * 4);
        }
      }
      const [x, y] = pos(p);
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
    }
    // Wasserdampf
    ctx.fillStyle = C.fiber;
    for (let i = vapor.length - 1; i >= 0; i--) {
      const v = vapor[i];
      v.x += v.vx * dt; v.y += v.vy * dt; v.life -= dt * .5;
      if (v.life <= 0) { vapor.splice(i, 1); continue; }
      ctx.globalAlpha = v.life * .6; ctx.beginPath(); ctx.arc(v.x, v.y, 1.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Zugpfeile entlang des Stamms
    if (r > .02) {
      ctx.strokeStyle = C.accent; ctx.fillStyle = C.accent; ctx.lineWidth = 2;
      const ax = cx + trunkW / 2 + 14, len = 14 + 30 * r;
      for (const fy of [.3, .65]) {
        const y = crownY + 40 + (gY - crownY - 40) * fy;
        ctx.beginPath(); ctx.moveTo(ax, y + len / 2); ctx.lineTo(ax, y - len / 2 + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, y - len / 2); ctx.lineTo(ax - 5, y - len / 2 + 8); ctx.lineTo(ax + 5, y - len / 2 + 8); ctx.closePath(); ctx.fill();
      }
      ctx.font = MONO; ctx.textAlign = 'left';
      ctx.fillText('Zug', ax + 8, crownY + 40 + (gY - crownY - 40) * .3 + 4);
    }
    // Beschriftung
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(small ? 'Wurzeln' : 'Wurzeln nehmen Wasser auf', 10, h - 10);
    ctx.textAlign = 'right';
    ctx.fillText(small ? 'Blätter verdunsten' : 'Blätter verdunsten Wasser', w - 10, 18);
    ctx.fillText(`Luftfeuchte ${F.hum} %`, w - 10, 34);
    ctx.textAlign = 'left'; ctx.fillStyle = C.fiber;
    ctx.fillText(small ? 'Xylem' : 'Xylem (Holzgefässe)', cx - trunkW / 2 - (small ? 50 : 132), gY - 30);
  };

  /* ---------- Teil 2: Saugpumpe gegen Baum ---------- */
  const pumpCv = $('#pumpCv');
  const H_ATM = 10.3; // Meter Wassersäule, die 1 bar Luftdruck trägt
  const P = { mode: 'pump', h: 20, bubble: false, lv: [0, 0, 0], on: false };
  const target = i => {
    if (P.mode === 'pump') return Math.min(P.h, H_ATM);
    if (P.bubble && i === 1) return 0;
    return P.h;
  };
  const updPump = () => {
    $('#hOut').textContent = `${P.h} m`;
    $('#bubbleBtn').disabled = !P.on || P.mode !== 'tree';
    $('#bubbleBtn').textContent = P.bubble ? 'Röhrchen neu füllen' : 'Luftblase einschleusen';
    if (!P.on) return;
    const top = 1.013 - .0981 * P.h;
    if (P.mode === 'pump') {
      const col = Math.min(P.h, H_ATM);
      $('#pCol').textContent = `${fmt(col, 1)} m`;
      $('#pTop').textContent = `${fmt(Math.max(0, top), 2)} bar`;
      const ok = P.h <= H_ATM;
      $('#pRes').textContent = ok ? 'ja' : 'nein, abgerissen';
      $('#pumpStatus').textContent = ok
        ? 'Die Luft drückt unten auf das Wasser und schiebt es in das Rohr. Das reicht noch.'
        : `Bei 10,3 m ist Schluss. Darüber ist im Rohr fast Vakuum. Die Pumpe kann nichts mehr wegnehmen, und mehr als 1 bar Luftdruck gibt es nicht.`;
      $('#pumpStatus').classList.toggle('warn', !ok);
    } else {
      $('#pCol').textContent = `${fmt(P.h, 0)} m`;
      $('#pTop').textContent = `${fmt(top, 1)} bar`;
      $('#pRes').textContent = P.bubble ? '2 von 3' : 'ja';
      $('#pumpStatus').classList.remove('warn');
      $('#pumpStatus').textContent = P.bubble
        ? 'Die Luftblase zerreisst den Faden im mittleren Röhrchen. Es fällt aus. Die Nachbarn arbeiten weiter, und ein Baum hat Millionen davon.'
        : top < 0
          ? `Oben herrscht ${fmt(top, 1)} bar: echter Zug, wie an einem Seil. In den dünnen, luftfreien Röhrchen reisst der Wasserfaden nicht. In echt kommt noch Reibung dazu, in hohen Bäumen sind es oft −15 bar und mehr.`
          : 'Bei dieser Höhe reicht sogar noch der Luftdruck. Geh mal über 10 m.';
    }
  };
  $$('#modeBtns button').forEach(b => b.addEventListener('click', () => {
    P.mode = b.dataset.mode; P.bubble = false;
    $$('#modeBtns button').forEach(x => x.classList.toggle('active', x === b));
    P.lv = [0, 0, 0];
    updPump();
  }));
  $('#hIn').addEventListener('input', e => { P.h = +e.target.value; updPump(); });
  $('#bubbleBtn').addEventListener('click', () => { P.bubble = !P.bubble; if (!P.bubble) P.lv[1] = 0; updPump(); });
  updPump();

  const drawPump = dt => {
    // Füllstände nachziehen
    for (let i = 0; i < 3; i++) {
      const t = target(i);
      if (reduced) P.lv[i] = t;
      else P.lv[i] += clamp(t - P.lv[i], -60 * dt, 30 * dt);
    }
    const { ctx, w, h } = fit(pumpCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const MAXH = 110, top = 30, base = h - 46, sc = (base - top) / MAXH;
    const Y = m => base - m * sc;
    const sx = small ? 40 : 52;
    // Skala
    ctx.font = MONO; ctx.textAlign = 'right'; ctx.lineWidth = 1;
    for (let m = 0; m <= MAXH; m += 10) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(sx - (m % 20 ? 4 : 8), Y(m)); ctx.lineTo(sx, Y(m)); ctx.stroke();
      if (m % 20 === 0) { ctx.fillStyle = C.muted; ctx.fillText(`${m} m`, sx - 10, Y(m) + 4); }
    }
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx, base); ctx.stroke();
    // 10,3-m-Grenze
    ctx.strokeStyle = C.bad; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx, Y(H_ATM)); ctx.lineTo(w - 8, Y(H_ATM)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.bad; ctx.textAlign = 'right';
    ctx.fillText(small ? '10,3 m' : '10,3 m: Grenze fürs Saugen', w - 10, Y(H_ATM) - 6);
    // Becken
    const cx = sx + (w - sx) / 2;
    const bw = small ? 120 : 170;
    roundRect(ctx, cx - bw / 2, base, bw, 30, 6);
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText(P.mode === 'pump' ? 'Wasserbecken' : 'Boden mit Wasser', cx, base + 44);
    if (P.mode === 'pump') {
      const pw = 18, px = cx - pw / 2, pTop = Y(P.h);
      // Rohr
      ctx.fillStyle = C.sunk; ctx.fillRect(px, pTop, pw, base + 18 - pTop);
      // Wasser
      const lv = P.lv[0];
      ctx.fillStyle = C.fiber; ctx.globalAlpha = .75; ctx.fillRect(px, Y(lv), pw, base + 18 - Y(lv)); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, pTop); ctx.lineTo(px, base + 18); ctx.moveTo(px + pw, pTop); ctx.lineTo(px + pw, base + 18); ctx.stroke();
      // Vakuum
      if (P.h > H_ATM + .5 && P.on) {
        ctx.fillStyle = C.bad; ctx.textAlign = 'left';
        ctx.fillText('fast Vakuum', px + pw + 8, (Y(lv) + pTop) / 2 + 4);
      }
      // Pumpe
      roundRect(ctx, cx - 26, pTop - 22, 52, 22, 5);
      ctx.fillStyle = C.accent; ctx.fill();
      ctx.fillStyle = C.surface; ctx.textAlign = 'center'; ctx.fillText('Pumpe', cx, pTop - 7);
      // Luftdruck-Pfeile auf das Becken
      ctx.strokeStyle = C.muted; ctx.fillStyle = C.muted; ctx.lineWidth = 1.5;
      for (const dx of [-bw / 2 + 18, bw / 2 - 18]) {
        const x = cx + dx;
        ctx.beginPath(); ctx.moveTo(x, base - 34); ctx.lineTo(x, base - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, base - 2); ctx.lineTo(x - 4, base - 9); ctx.lineTo(x + 4, base - 9); ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.fillText(small ? 'Luft' : 'Luftdruck 1 bar', cx + bw / 2 - 12, base - 40);
    } else {
      // drei Holzgefässe
      const gap = small ? 16 : 22, vw = 7;
      for (let i = 0; i < 3; i++) {
        const x = cx + (i - 1) * gap - vw / 2, tY = Y(P.h);
        ctx.fillStyle = C.sunk; ctx.fillRect(x, tY, vw, base + 18 - tY);
        const lv = P.lv[i];
        ctx.fillStyle = C.fiber; ctx.globalAlpha = .8; ctx.fillRect(x, Y(lv), vw, base + 18 - Y(lv)); ctx.globalAlpha = 1;
        ctx.strokeStyle = C.copper; ctx.lineWidth = 1;
        ctx.strokeRect(x, tY, vw, base + 18 - tY);
        if (P.bubble && i === 1) {
          ctx.fillStyle = C.surface; ctx.strokeStyle = C.fg;
          const by = Y(Math.max(lv, P.h * .55));
          ctx.beginPath(); ctx.arc(x + vw / 2, by, 5, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      // Blatt oben
      const tY = Y(P.h);
      ctx.fillStyle = C.good; ctx.globalAlpha = .45;
      ctx.beginPath(); ctx.ellipse(cx, tY - 12, 40, 12, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      // Zugpfeile
      if (P.on && P.h > H_ATM) {
        ctx.strokeStyle = C.accent; ctx.fillStyle = C.accent; ctx.lineWidth = 2;
        const ax = cx + gap * 1.5 + 14;
        for (const f of [.35, .7]) {
          const y = Y(P.h * f);
          ctx.beginPath(); ctx.moveTo(ax, y + 14); ctx.lineTo(ax, y - 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax, y - 14); ctx.lineTo(ax - 5, y - 6); ctx.lineTo(ax + 5, y - 6); ctx.closePath(); ctx.fill();
        }
        ctx.textAlign = 'left'; ctx.fillText('Zug', ax + 8, Y(P.h * .35) + 4);
      }
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(small ? 'Holzgefässe (dicker gezeichnet)' : 'drei Holzgefässe, in echt dünner als ein Haar', cx, top - 12);
    }
  };

  /* ---------- Teil 3: Spaltöffnungen über den Tag ---------- */
  const leafCv = $('#leafCv');
  const D = { t: 13, soil: 80, playing: false, on: false };
  const light = t => (t > 6 && t < 20) ? Math.sin(Math.PI * (t - 6) / 14) : 0;
  const soilF = () => clamp((D.soil - 15) / 45, 0, 1);
  const openAt = t => clamp(light(t) * 2.5, 0, 1) * soilF();
  const LEAF_MAX = 50; // Liter pro Stunde bei voller Mittagssonne, offen (grosse Buche, vereinfacht)
  const rateAt = t => LEAF_MAX * light(t) * openAt(t);
  const integ = t1 => { let s = 0; const n = 192, hh = t1 / n; for (let i = 0; i < n; i++) s += rateAt((i + .5) * hh) * hh; return s; };
  const gas = Array.from({ length: 40 }, (_, i) => ({ k: i % 3, u: Math.random(), w: i % 2, j: Math.random() - .5 }));

  const updLeaf = () => {
    $('#dayIn').value = D.t;
    $('#dayOut').textContent = hhmm(D.t);
    $('#soilOut').textContent = `${D.soil} %`;
    if (!D.on) return;
    const o = openAt(D.t);
    $('#sOpen').textContent = `${fmt(o * 100, 0)} %`;
    $('#sNow').textContent = `${fmt(rateAt(D.t), 0)} l`;
    $('#sDay').textContent = `${fmt(integ(D.t), 0)} l`;
    $('#sTot').textContent = `${fmt(integ(24), 0)} l`;
    $('#leafStatus').textContent =
      light(D.t) === 0 ? 'Nacht: kein Licht, keine Fotosynthese. Die Spaltöffnungen sind zu, so spart der Baum Wasser.'
      : soilF() === 0 ? 'Der Boden ist ausgetrocknet. Der Baum schliesst alle Spaltöffnungen. Er verliert kaum Wasser, kann aber auch kein Kohlendioxid aufnehmen. Er hungert.'
      : soilF() < 1 ? 'Wenig Wasser im Boden: Der Baum öffnet nur halb. Er spart Wasser, betreibt dafür aber weniger Fotosynthese.'
      : o < 1 ? 'Morgen- oder Abendlicht: Die Spaltöffnungen gehen langsam auf oder zu.'
      : 'Volle Sonne, genug Wasser: Spaltöffnungen weit offen. Kohlendioxid strömt herein, Wasserdampf hinaus.';
  };
  $('#dayIn').addEventListener('input', e => { D.t = +e.target.value; D.playing = false; $('#dayBtn').textContent = 'Tag abspielen'; updLeaf(); });
  $('#soilIn').addEventListener('input', e => { D.soil = +e.target.value; updLeaf(); });
  $('#dayBtn').addEventListener('click', () => {
    if (reduced) { D.t = 24; updLeaf(); return; }
    if (D.playing) { D.playing = false; $('#dayBtn').textContent = 'Tag abspielen'; return; }
    if (D.t >= 24) D.t = 0;
    D.playing = true; $('#dayBtn').textContent = 'Pause';
  });
  updLeaf();

  const drawLeaf = (dt, now) => {
    if (D.playing) {
      D.t = Math.min(24, D.t + dt * 2); // 2 Stunden pro Sekunde
      if (D.t >= 24) { D.playing = false; $('#dayBtn').textContent = 'Nochmal'; }
      updLeaf();
    }
    const { ctx, w, h } = fit(leafCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const topH = Math.round(h * .5);
    // Blattoberfläche
    roundRect(ctx, 10, 10, w - 20, topH - 20, 14);
    ctx.fillStyle = C.good; ctx.globalAlpha = .14; ctx.fill(); ctx.globalAlpha = 1;
    const o = openAt(D.t);
    const n = small ? 2 : 3;
    const sw = small ? 34 : 40, sh = small ? 52 : 60;
    const cy = 10 + (topH - 20) / 2 + 6;
    const xs = Array.from({ length: n }, (_, i) => 10 + (w - 20) * (i + .5) / n);
    const tt = reduced ? 0 : now / 1000;
    xs.forEach((x, si) => {
      const gapW = 2 + o * (small ? 9 : 11);
      // Pore
      ctx.fillStyle = C.fg; ctx.globalAlpha = .75;
      ctx.beginPath(); ctx.ellipse(x, cy, gapW, sh * .36, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      // Schliesszellen
      ctx.fillStyle = C.good; ctx.strokeStyle = C.good; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.globalAlpha = .6;
        ctx.beginPath(); ctx.ellipse(x + s * (gapW + sw * .32), cy, sw * .34, sh / 2, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Gase
      if (light(D.t) > 0 && o > .02) {
        gas.forEach((g, gi) => {
          if (gi % n !== si) return;
          const u = (g.u + tt * (.25 + .35 * o)) % 1;
          if (g.w) { // Wasserdampf hinaus (nach oben)
            ctx.fillStyle = C.fiber; ctx.globalAlpha = o * (1 - u);
            ctx.beginPath(); ctx.arc(x + g.j * 24 * u, cy - u * (sh * .9), 2.6, 0, TAU); ctx.fill();
          } else { // CO2 herein (von oben zur Pore)
            ctx.fillStyle = C.copper; ctx.globalAlpha = o * u;
            ctx.beginPath(); ctx.arc(x + (g.j * 40 + 14) * (1 - u), cy - (1 - u) * sh * .9 - 4, 2.6, 0, TAU); ctx.fill();
          }
        });
        ctx.globalAlpha = 1;
      }
    });
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = C.fiber; ctx.fillText(small ? '● Wasser' : '● Wasserdampf hinaus', 20, 28);
    ctx.fillStyle = C.copper; ctx.fillText(small ? '● CO₂' : '● Kohlendioxid herein', small ? 96 : 190, 28);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(small ? 'stark vergrössert' : 'Spaltöffnungen, stark vergrössert', w - 20, topH - 18);

    // Tageskurve
    const gx = small ? 40 : 50, gy = topH + 16, gw = w - gx - 14, gh = h - gy - 30;
    const yMax = 50;
    const X = t => gx + gw * t / 24, Y = v => gy + gh - gh * clamp(v / yMax, 0, 1.05);
    ctx.lineWidth = 1;
    for (let v = 0; v <= yMax; v += 25) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(v), gx - 6, Y(v) + 4);
    }
    ctx.textAlign = 'left'; ctx.fillText('l/h', 4, gy + 4);
    ctx.textAlign = 'center';
    for (let t = 0; t <= 24; t += 6) ctx.fillText(`${t} h`, X(t), gy + gh + 15);
    // Fläche bis jetzt
    ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    for (let t = 0; t <= D.t + 1e-9; t += .1) ctx.lineTo(X(t), Y(rateAt(t)));
    ctx.lineTo(X(D.t), Y(rateAt(D.t))); ctx.lineTo(X(D.t), Y(0)); ctx.closePath();
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1;
    // ganze Kurve
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2; ctx.beginPath();
    for (let t = 0; t <= 24; t += .1) { const y = Y(rateAt(t)); t ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
    ctx.stroke();
    // Marker
    ctx.strokeStyle = C.fg; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(D.t), gy); ctx.lineTo(X(D.t), gy + gh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.fiber; ctx.beginPath(); ctx.arc(X(D.t), Y(rateAt(D.t)), 4, 0, TAU); ctx.fill();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('baumwasser', 4, {
    flowLock: () => { F.on = true; $('#sunIn').disabled = false; $('#humIn').disabled = false; updFlow(); },
    pumpLock: () => { P.on = true; $$('#modeBtns button').forEach(b => b.disabled = false); $('#hIn').disabled = false; updPump(); },
    leafLock: () => { D.on = true; $('#dayIn').disabled = false; $('#soilIn').disabled = false; $('#dayBtn').disabled = false; updLeaf(); },
  });

  loop((dt, now) => { drawFlow(dt, now); drawPump(dt); drawLeaf(dt, now); });
})();
