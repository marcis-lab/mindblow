/* mindblow – Lektion Verdauung */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mixHex = (a, b, k) => { const p = hex(a), q = hex(b); return `rgb(${p.map((v, i) => Math.round(lerp(v, q[i], k))).join(',')})`; };
  // bewusst feste Farben: Gewebe, Essen, Blut
  const TIS = '#d98b7f', TIS_D = '#b9655b', TIS_L = '#eab3a2', FOOD = '#a8743a', CHYME = '#cfa64e', STOOL = '#7a5634';
  const BLOOD = '#b3263a', WATER = '#4f95d8', BILE = '#6aa84f';

  /* ---------- Hilfen für Wege (Polylinien in Einheiten 0..1) ---------- */
  const poly = pts => {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], (pts[i][1] - pts[i - 1][1]) * 1.3));
    return { pts, L, len: L[L.length - 1] };
  };
  const along = (pl, f) => {
    const d = clamp(f, 0, 1) * pl.len;
    let i = 1;
    while (i < pl.pts.length - 1 && pl.L[i] < d) i++;
    const a = pl.pts[i - 1], b = pl.pts[i], seg = pl.L[i] - pl.L[i - 1] || 1, k = clamp((d - pl.L[i - 1]) / seg, 0, 1);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  };

  /* ---------- Teil 1: Der Weg durch den Körper ---------- */
  const pathCv = $('#pathCv');
  const snake = [[.555, .35], [.50, .37], [.47, .41], [.50, .47], [.62, .52]];
  for (let r = 0; r < 5; r++) {
    const y = .52 + r * .06, fromX = r % 2 ? .38 : .62, toX = r % 2 ? .62 : .38;
    if (r) snake.push([fromX, y]);
    snake.push([toX, y]);
  }
  snake.push([.33, .79], [.28, .80]);
  const ST = [
    { id: 'mund', name: 'Mund', label: 'Mund', w: 0, pl: poly([[.5, .02], [.5, .07]]),
      range: '10 bis 30 s', txt: 'Mund: Die Zähne zerkleinern den Bissen, Speichel macht ihn gleitfähig. Die Amylase im Speichel beginnt schon, Stärke zu zerschneiden.' },
    { id: 'roehre', name: 'Speiseröhre', label: 'Speiseröhre', w: 7, pl: poly([[.5, .07], [.5, .20], [.57, .23]]),
      range: '5 bis 10 s', txt: 'Speiseröhre: Eine Muskelwelle schiebt den Bissen in wenigen Sekunden nach unten. Ein Muskelring am Magen lässt ihn hinein.' },
    { id: 'magen', name: 'Magen', label: 'Magen', w: 0, pl: poly([[.57, .23], [.66, .215], [.725, .26], [.70, .32], [.62, .345], [.555, .35]]),
      range: '2 bis 4 h', txt: 'Magen: Säure und kräftige Muskeln kneten das Essen zu Brei. Der Pförtner, ein Muskelring am Ausgang, gibt den Brei nur portionsweise weiter.' },
    { id: 'duenn', name: 'Dünndarm', label: 'Dünndarm', w: 9, pl: poly(snake),
      range: '3 bis 6 h', txt: 'Dünndarm: Hier wird das meiste zerlegt. Die Bausteine gehen durch die Darmwand ins Blut (rote Punkte).' },
    { id: 'dick', name: 'Dickdarm', label: 'Dickdarm', w: 15, pl: poly([[.28, .80], [.24, .79], [.235, .46], [.27, .43], [.73, .43], [.775, .46], [.78, .80], [.74, .87], [.60, .86], [.53, .885], [.50, .94]]),
      range: '12 h bis 2 Tage', txt: 'Dickdarm: Bakterien verarbeiten, was übrig ist. Die Wand holt Wasser zurück (blaue Punkte), der Rest wird fester.' },
    { id: 'ende', name: 'Ausgang', label: 'Ausgang', w: 9, pl: poly([[.50, .94], [.50, 1.0]]),
      range: 'ganze Reise: meist 1 bis 3 Tage', txt: 'Ausgang: Was der Körper nicht brauchen kann, verlässt ihn. Wie lange das dauert, ist von Mensch zu Mensch sehr verschieden.' },
  ];
  // Reglerposition → Zeit (Sekunden). Nicht gleichmässig: vorne Sekunden, hinten Stunden.
  const SL = [0, 100, 180, 400, 620, 950, 1000];
  const TT = { lean: [0, 30, 40, 3 * 3600, 8 * 3600, 40 * 3600, 42 * 3600], fat: [0, 30, 40, 5 * 3600, 10 * 3600, 42 * 3600, 44 * 3600] };
  const D = { v: 0, play: false, fat: false, last: -1, parts: [], spawn: 0, wob: 0 };
  const stationOf = v => { let i = 0; while (i < ST.length - 1 && v >= SL[i + 1]) i++; return [i, (v - SL[i]) / (SL[i + 1] - SL[i])]; };
  const fmtT = s => {
    if (s < 60) return `${Math.round(s)} s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    if (s < 86400) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 600) * 10; return m >= 60 ? `${h + 1} h` : m ? `${h} h ${m} min` : `${h} h`; }
    const d = Math.floor(s / 86400), h = Math.round((s % 86400) / 3600);
    return `${d} Tag${d > 1 ? 'e' : ''}${h ? ` ${h} h` : ''}`;
  };
  const updPath = () => {
    const [i, f] = stationOf(D.v), tt = TT[D.fat ? 'fat' : 'lean'];
    const t = lerp(tt[i], tt[i + 1], f);
    $('#timeIn').value = Math.round(D.v);
    $('#timeOut').textContent = fmtT(t);
    $('#dTime').textContent = fmtT(t);
    $('#dStation').textContent = ST[i].name;
    $('#dRange').textContent = i === 2 && D.fat ? 'länger, oft über 4 h' : ST[i].range;
    if (i !== D.last) { D.last = i; $('#pathStatus').textContent = ST[i].txt; }
  };
  $('#timeIn').addEventListener('input', e => { D.v = +e.target.value; D.play = false; $('#travelBtn').textContent = 'Reise abspielen'; updPath(); });
  $('#travelBtn').addEventListener('click', () => {
    if (!D.play && D.v >= 1000) D.v = 0;
    D.play = !D.play; $('#travelBtn').textContent = D.play ? 'Anhalten' : 'Reise abspielen';
    if (reduced && D.play) { D.v = Math.min(1000, Math.floor(D.v / 100) * 100 + 100); D.play = false; $('#travelBtn').textContent = 'Weiter'; updPath(); }
  });
  $('#fatBtn').addEventListener('click', () => {
    D.fat = !D.fat;
    $('#fatBtn').textContent = D.fat ? 'Leichte Mahlzeit' : 'Fettige Mahlzeit';
    D.last = -1; updPath();
    $('#pathStatus').textContent = D.fat
      ? 'Fettiges Essen bleibt länger im Magen. Darum fühlst du dich nach Pommes länger satt als nach einem Apfel (vereinfacht).'
      : 'Leichte Mahlzeit: Der Magen gibt den Brei schneller an den Dünndarm weiter.';
  });
  updPath();

  const drawPath = dt => {
    const { ctx, w, h } = fit(pathCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (D.play) {
      D.v = Math.min(1000, D.v + dt * 62);
      if (D.v >= 1000) { D.play = false; $('#travelBtn').textContent = 'Nochmals'; }
      updPath();
    }
    const oy = 8, H = h - 16, W = Math.min(w - 24, H * 1.05), ox = (w - W) / 2;
    const X = u => ox + u * W, Y = v => oy + v * H;
    const s = clamp(W / 420, .75, 1.25);
    const [cur, prog] = stationOf(D.v);
    const stroke = (st, col, width) => {
      const p = st.pl.pts;
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); p.forEach(([u, v], i) => i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v))); ctx.stroke();
    };
    const stomach = () => {
      ctx.beginPath();
      ctx.moveTo(X(.545), Y(.215));
      ctx.bezierCurveTo(X(.57), Y(.15), X(.70), Y(.14), X(.755), Y(.22));
      ctx.bezierCurveTo(X(.80), Y(.30), X(.74), Y(.385), X(.64), Y(.378));
      ctx.bezierCurveTo(X(.60), Y(.374), X(.57), Y(.37), X(.54), Y(.366));
      ctx.lineTo(X(.54), Y(.334));
      ctx.bezierCurveTo(X(.60), Y(.335), X(.655), Y(.32), X(.66), Y(.28));
      ctx.bezierCurveTo(X(.665), Y(.245), X(.61), Y(.238), X(.575), Y(.247));
      ctx.closePath();
    };
    // Leuchten um die aktuelle Station
    ctx.globalAlpha = .45;
    if (cur === 2) { stomach(); ctx.strokeStyle = C.glow; ctx.lineWidth = 10; ctx.stroke(); }
    else if (cur === 0) { ctx.beginPath(); ctx.ellipse(X(.5), Y(.035), W * .06 + 5, H * .022 + 5, 0, 0, TAU); ctx.fillStyle = C.glow; ctx.fill(); }
    else stroke(ST[cur], C.glow, ST[cur].w * s + 10);
    ctx.globalAlpha = 1;
    // Organe: zuerst Dünndarm, dann Dickdarm darüber
    stroke(ST[3], TIS_D, ST[3].w * s + 3); stroke(ST[3], TIS_L, ST[3].w * s);
    stroke(ST[4], TIS_D, ST[4].w * s + 3); stroke(ST[4], TIS, ST[4].w * s);
    // Taschen des Dickdarms andeuten
    ctx.strokeStyle = TIS_D; ctx.lineWidth = 1;
    const dp = ST[4].pl;
    for (let k = .03; k < .97; k += .035) {
      const [u1, v1] = along(dp, k), [u2, v2] = along(dp, k + .005);
      const nx = -(Y(v2) - Y(v1)), ny = X(u2) - X(u1), nl = Math.hypot(nx, ny) || 1, hw = ST[4].w * s / 2;
      ctx.beginPath(); ctx.moveTo(X(u1) + nx / nl * hw, Y(v1) + ny / nl * hw); ctx.lineTo(X(u1) - nx / nl * hw, Y(v1) - ny / nl * hw); ctx.stroke();
    }
    stroke(ST[5], TIS_D, ST[5].w * s + 3); stroke(ST[5], TIS, ST[5].w * s);
    stroke(ST[1], TIS_D, ST[1].w * s + 3); stroke(ST[1], TIS, ST[1].w * s);
    stomach(); ctx.fillStyle = TIS; ctx.fill(); ctx.strokeStyle = TIS_D; ctx.lineWidth = 2; ctx.stroke();
    // Magenfalten
    ctx.strokeStyle = TIS_D; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.moveTo(X(.62 + k * .03), Y(.20 + k * .01));
      ctx.quadraticCurveTo(X(.70 + k * .01), Y(.27), X(.64 - k * .02), Y(.355 - k * .005)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Mund
    ctx.beginPath(); ctx.ellipse(X(.5), Y(.035), W * .06, H * .022, 0, 0, TAU); ctx.fillStyle = TIS; ctx.fill();
    ctx.strokeStyle = TIS_D; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(.5) - W * .045, Y(.035)); ctx.quadraticCurveTo(X(.5), Y(.035) + H * .012, X(.5) + W * .045, Y(.035)); ctx.stroke();

    // Beschriftungen
    const fs = narrow ? 10 : 11;
    const lab = (i, text, u, v, align, lu, lv) => {
      const on = i === cur;
      ctx.font = `${on ? 600 : 400} ${fs}px ${MONO}`; ctx.textAlign = align;
      ctx.fillStyle = on ? C.fg : C.muted;
      ctx.fillText(text, X(u), Y(v));
      if (lu != null) {
        ctx.strokeStyle = on ? C.fg : C.line; ctx.lineWidth = 1;
        const tw = ctx.measureText(text).width, sx = align === 'right' ? X(u) + 4 : X(u) + tw + 4;
        ctx.beginPath(); ctx.moveTo(sx, Y(v) - fs * .35); ctx.lineTo(X(lu), Y(lv)); ctx.stroke();
      }
    };
    lab(0, 'Mund', .58, .045, 'left');
    lab(1, 'Speiseröhre', .53, .13, 'left');
    lab(2, 'Magen', .80, .26, 'left');
    lab(3, 'Dünndarm', narrow ? .20 : .19, .66, 'right', .37, .64);
    lab(4, 'Dickdarm', .81, .62, 'left');
    lab(5, 'Ausgang', .54, .975, 'left');
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Schema, Blick von vorne', 12, Y(.30));
    if (!narrow) ctx.fillText('vereinfacht', 12, Y(.30) + 14);

    // Der Bissen
    let [bu, bv] = along(ST[cur].pl, prog);
    const r0 = 7 * s;
    let col = FOOD, r = r0, alpha = 1;
    if (cur === 1) r = r0 * .9;
    else if (cur === 2) { col = mixHex(FOOD, CHYME, clamp(prog * 2, 0, 1)); r = r0 * 1.1; }
    else if (cur === 3) { col = CHYME; r = r0 * lerp(1, .6, prog); }
    else if (cur === 4) { col = mixHex(CHYME, STOOL, prog); r = r0 * lerp(.6, .75, prog); }
    else if (cur === 5) { col = STOOL; r = r0 * .75; alpha = 1 - prog; }
    let bx = X(bu), by = Y(bv);
    if (!reduced && cur === 2) { D.wob += dt * 5; bx += Math.sin(D.wob) * 2; by += Math.cos(D.wob * 1.3) * 2; }
    // Teilchen: Nährstoffe ins Blut, Wasser zurück in den Körper
    if (!reduced) {
      D.spawn += dt;
      if ((cur === 3 || cur === 4) && prog > .02 && prog < .98 && D.spawn > (cur === 3 ? .08 : .14)) {
        D.spawn = 0;
        const a = Math.random() * TAU;
        D.parts.push({ x: bx, y: by, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, life: 1, col: cur === 3 ? BLOOD : WATER });
      }
      D.parts = D.parts.filter(p => (p.life -= dt * 1.2) > 0);
      for (const p of D.parts) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = p.life; ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, r + 4, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  };

  /* ---------- Teil 2: Zoom in die Dünndarmwand ---------- */
  const zoomCv = $('#zoomCv');
  const ZS = [
    { name: 'Glattes Rohr', area: .4, cmp: 'ein Schulpult', view: 'Ausschnitt rund 8 cm',
      txt: 'Stell dir vor, die Wand wäre innen ganz glatt. Dann hätte der ganze Dünndarm nur etwa so viel Fläche wie ein Schulpult.' },
    { name: 'Ringfalten', area: 1, cmp: 'ein Badetuch', view: 'Ausschnitt rund 8 cm',
      txt: 'Ringfalten: Die Wand liegt in Falten, die bis etwa 1 cm in den Darm ragen. Sie bremsen den Brei auch etwas, damit mehr Zeit zum Aufnehmen bleibt.' },
    { name: 'Zotten', area: 6, cmp: 'ein grosser Teppich', view: 'Ausschnitt rund 3 mm',
      txt: 'Zotten: Die Falten sind mit winzigen Fingern bedeckt, etwa 0,5 bis 1 mm lang. In jeder Zotte liegen feine Blutgefässe, die die Bausteine abtransportieren.' },
    { name: 'Mikrovilli', area: 30, cmp: 'ein halbes Klassenzimmer', view: 'Ausschnitt rund 30 µm',
      txt: 'Mikrovilli: Jede Zelle auf einer Zotte trägt einen Rasen aus feinsten Härchen, etwa 1 Tausendstel Millimeter lang. Erst damit kommt die Wand auf rund 30 m².' },
  ];
  const Z = { target: 0, cur: 0, t: 0 };
  const areaAt = z => { const i = Math.min(2, Math.floor(z)), f = z - i; return ZS[i].area * Math.pow(ZS[i + 1].area / ZS[i].area, f); };
  const updZoom = () => {
    const z = Z.target, n = Math.round(z), a = areaAt(z);
    $('#zoomIn').value = Math.round(z * 100);
    $('#zoomOut').textContent = `Stufe ${n + 1}`;
    $('#zArea').textContent = `${fmt(a, a < 2 ? 1 : 0)} m²`;
    $('#zFactor').textContent = `×${fmt(a / ZS[0].area, 0)}`;
    $('#zCmp').textContent = ZS[n].cmp;
    $('#zoomStatus').textContent = ZS[n].txt;
    $$('#zoomSel button').forEach(b => b.classList.toggle('active', +b.dataset.z === n));
  };
  $('#zoomIn').addEventListener('input', e => { Z.target = +e.target.value / 100; updZoom(); });
  $$('#zoomSel button').forEach(b => b.addEventListener('click', () => { Z.target = +b.dataset.z; updZoom(); }));
  updZoom();

  // Eine Zoomstufe in ein Rechteck zeichnen
  const drawStage = (ctx, i, x, y, w, h, t) => {
    if (i <= 1) {
      const wt = h * .17;
      ctx.fillStyle = C.sunk; ctx.fillRect(x, y + wt, w, h - 2 * wt);
      for (const top of [true, false]) {
        const y0 = top ? y : y + h - wt;
        ctx.fillStyle = TIS_D; ctx.fillRect(x, y0, w, wt);
        ctx.fillStyle = TIS; ctx.fillRect(x, top ? y0 + wt * .35 : y0, w, wt * .65);
        if (i === 1) {
          const n = 12, fw = w / n, fh = h * .2;
          ctx.fillStyle = TIS_L; ctx.strokeStyle = TIS_D; ctx.lineWidth = 1.5;
          for (let k = 0; k < n; k++) {
            const fx = x + (k + (top ? .5 : 0)) * fw, base = top ? y0 + wt : y0, dir = top ? 1 : -1;
            ctx.beginPath(); ctx.moveTo(fx - fw * .35, base);
            ctx.bezierCurveTo(fx - fw * .35, base + dir * fh, fx + fw * .35, base + dir * fh, fx + fw * .35, base);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        } else {
          ctx.strokeStyle = TIS_D; ctx.lineWidth = 1.5;
          const yl = top ? y0 + wt : y0;
          ctx.beginPath(); ctx.moveTo(x, yl); ctx.lineTo(x + w, yl); ctx.stroke();
        }
      }
      // Brei fliesst durch
      ctx.fillStyle = CHYME;
      for (let k = 0; k < 7; k++) {
        const px = x + ((k / 7 + t * .05) % 1) * w, py = y + h / 2 + Math.sin(k * 2.3) * h * .1;
        ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (i === 2) {
      const bh = h * .2, by = y + h - bh;
      ctx.fillStyle = C.sunk; ctx.fillRect(x, y, w, h - bh);
      ctx.fillStyle = TIS_D; ctx.fillRect(x, by, w, bh);
      const n = Math.max(7, Math.round(w / 34)), sp = w / n, vw = sp * .62, vh = h * .62;
      for (let k = 0; k < n; k++) {
        const sway = reduced ? 0 : Math.sin(t * 1.4 + k * .9) * 3;
        const vx = x + (k + .5) * sp - vw / 2, top = by - vh + (k % 3) * 6;
        ctx.beginPath();
        ctx.moveTo(vx, by + 2);
        ctx.lineTo(vx + sway * .3, top + vw / 2);
        ctx.arc(vx + vw / 2 + sway, top + vw / 2, vw / 2, Math.PI, 0);
        ctx.lineTo(vx + vw, by + 2); ctx.closePath();
        ctx.fillStyle = TIS_L; ctx.fill(); ctx.strokeStyle = TIS_D; ctx.lineWidth = 1.2; ctx.stroke();
        // Blutgefäss als Schlaufe
        ctx.strokeStyle = BLOOD; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(vx + vw * .3, by); ctx.lineTo(vx + vw * .3 + sway * .5, top + vw * .6);
        ctx.quadraticCurveTo(vx + vw / 2 + sway, top + vw * .15, vx + vw * .7 + sway * .5, top + vw * .6);
        ctx.lineTo(vx + vw * .7, by); ctx.stroke();
      }
      // Bausteine zwischen den Zotten
      ctx.fillStyle = CHYME;
      for (let k = 0; k < 10; k++) {
        const px = x + ((k * .137 + t * .02) % 1) * w, py = y + 14 + ((k * .31) % 1) * (h - bh - vh - 10);
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = C.sunk; ctx.fillRect(x, y, w, h);
      const n = narrowZ ? 4 : 5, cw = w / n, ch = h * .55, cy = y + h - ch, mh = h * .13;
      for (let k = 0; k < n; k++) {
        const cx = x + k * cw;
        roundRect(ctx, cx + 2, cy, cw - 4, ch + 10, 8); ctx.fillStyle = TIS_L; ctx.fill(); ctx.strokeStyle = TIS_D; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + cw / 2, cy + ch * .62, cw * .16, ch * .14, 0, 0, TAU); ctx.fillStyle = TIS_D; ctx.fill();
        ctx.strokeStyle = TIS_D; ctx.lineWidth = 1.6;
        for (let mx = cx + 7; mx < cx + cw - 5; mx += 5) {
          const sw = reduced ? 0 : Math.sin(t * 2 + mx * .2) * 1.2;
          ctx.beginPath(); ctx.moveTo(mx, cy + 1); ctx.lineTo(mx + sw, cy - mh); ctx.stroke();
        }
      }
      // einzelne Bausteine an den Mikrovilli
      ctx.fillStyle = CHYME;
      for (let k = 0; k < 8; k++) {
        const px = x + ((k * .173 + t * .015) % 1) * w, py = y + 12 + ((k * .41) % 1) * (h - ch - mh - 24);
        ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
      }
    }
  };
  let narrowZ = false;

  const drawZoom = dt => {
    const { ctx, w, h } = fit(zoomCv);
    ctx.clearRect(0, 0, w, h);
    narrowZ = w < 440;
    Z.t += reduced ? 0 : dt;
    Z.cur = reduced ? Z.target : Z.cur + (Z.target - Z.cur) * Math.min(1, dt * 4);
    if (Math.abs(Z.cur - Z.target) < .002) Z.cur = Z.target;
    const mx = 12, my = 26, mw = w - 24, mh = h - 130;
    const i = Math.min(3, Math.floor(Z.cur)), f = Z.cur - i;
    ctx.save();
    roundRect(ctx, mx, my, mw, mh, 12); ctx.clip();
    ctx.fillStyle = C.sunk; ctx.fillRect(mx, my, mw, mh);
    const cx = mx + mw / 2, cy = my + mh / 2;
    const layer = (k, sc, a) => {
      if (a <= .001) return;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      drawStage(ctx, k, mx, my, mw, mh, Z.t);
      ctx.restore();
    };
    layer(i, 1 + f * 3, i < 3 ? 1 - f : 1);
    if (i < 3 && f > 0) layer(i + 1, .4 + .6 * f, f);
    // Zoom-Rahmen: hier geht es hinein
    const near = Math.round(Z.cur);
    if (near < 3 && Math.abs(Z.cur - near) < .05) {
      const bw = mw * .16, bh = mh * .22, bx = cx - bw / 2;
      const byy = near === 0 ? my + mh * .17 - bh / 2 : near === 1 ? my + mh * .2 : my + mh * .5 - bh;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, byy, bw, bh); ctx.setLineDash([]);
    }
    ctx.restore();
    // Beschriftungen
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(ZS[near].view, mx, 16);
    ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
    ctx.fillText(ZS[near].name, mx + mw, 16);
    if (Math.abs(Z.cur - near) < .05) {
      ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
      const tag = (txt, x, y) => {
        const tw = ctx.measureText(txt).width;
        roundRect(ctx, x - 5, y - 12, tw + 10, 17, 6); ctx.fillStyle = C.surface; ctx.fill();
        ctx.fillStyle = C.fg; ctx.fillText(txt, x, y);
      };
      if (near === 0) { tag('Darmwand', mx + 10, my + mh * .1); tag('Innenraum mit Brei', mx + 10, my + mh * .55); }
      if (near === 1) { tag('Ringfalte', mx + 10, my + mh * .5); }
      if (near === 2) { tag('Zotte', mx + 10, my + 20); tag(narrowZ ? 'Blutgefäss' : 'rot: Blutgefäss', mx + mw - (narrowZ ? 90 : 128), my + 20); }
      if (near === 3) { tag('Mikrovilli', mx + 10, my + 20); tag('Darmzelle', mx + 10, my + mh - 12); }
    }
    // Flächen-Quadrate
    const sy = h - 22, maxS = Math.min(78, h - mh - my - 46);
    const sides = ZS.map(z => Math.max(3, Math.sqrt(z.area / 30) * maxS));
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    const gap = narrowZ ? 14 : 30, labs = ZS.map(z => `${fmt(z.area, z.area < 1 ? 1 : 0)} m²`);
    const slots = sides.map((sd, k) => Math.max(sd, ctx.measureText(labs[k]).width));
    const total = slots.reduce((a, b) => a + b, 0) + gap * 3;
    let sx = w / 2 - total / 2;
    ZS.forEach((z, k) => {
      const sd = sides[k], on = k === near;
      sx += (slots[k] - sd) / 2;
      ctx.fillStyle = on ? C.accent : C.sunk; ctx.fillRect(sx, sy - sd, sd, sd);
      ctx.strokeStyle = on ? C.fg : C.muted; ctx.lineWidth = 1; ctx.strokeRect(sx + .5, sy - sd + .5, sd - 1, sd - 1);
      ctx.fillStyle = on ? C.fg : C.muted;
      ctx.fillText(labs[k], sx + sd / 2, sy + 14);
      sx += sd + (slots[k] - sd) / 2 + gap;
    });
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText('Fläche im Vergleich', 12, sy - maxS - 6 > my + mh + 8 ? sy - maxS - 6 : my + mh + 16);
  };

  /* ---------- Teil 3: Enzyme zerlegen ---------- */
  const enzCv = $('#enzCv');
  const ALL11 = [...Array(11).keys()];
  const FOODS = {
    brot: {
      stoff: ['Stärke', 'Kette aus Traubenzucker'],
      cuts: [[2, 5, 8], [2, 5, 8], ALL11],
      enz: [['Amylase', 'aus dem Speichel'], ['keine', 'Säure stoppt die Amylase'], ['Amylase und Co.', 'Bauchspeicheldrüse, Darmwand']],
      res: [['kürzere Stücke', 'und etwas Malzzucker'], ['Stücke bleiben', 'warten auf den Dünndarm'], ['Traubenzucker', 'geht ins Blut']],
      txt: [
        'Mund: Die Amylase im Speichel schneidet Stärke in kürzere Stücke. Darum wird Brot beim langen Kauen süsslich.',
        'Magen: Die Säure bremst die Speichel-Amylase. Die Stärke-Stücke werden hier kaum weiter zerlegt (vereinfacht).',
        'Dünndarm: Amylase aus der Bauchspeicheldrüse und Enzyme an der Darmwand zerlegen alles in einzelne Traubenzucker. Die gehen ins Blut.',
      ],
    },
    kaese: {
      stoff: ['Eiweiss', 'Kette aus Aminosäuren'],
      cuts: [[], [3, 7], ALL11],
      enz: [['keine', 'nur die Zähne arbeiten'], ['Pepsin', 'braucht die Magensäure'], ['Trypsin und Co.', 'Bauchspeicheldrüse, Darmwand']],
      res: [['ganze Kette', 'Eiweiss noch ganz'], ['grosse Stücke', 'sogenannte Peptide'], ['Aminosäuren', 'gehen ins Blut (vereinfacht)']],
      txt: [
        'Mund: Für Eiweiss gibt es im Speichel keine Schere. Die Zähne machen den Käse nur kleiner.',
        'Magen: Pepsin schneidet die Eiweiss-Kette in grosse Stücke. Es arbeitet nur in der starken Säure.',
        'Dünndarm: Weitere Scheren aus Bauchspeicheldrüse und Darmwand zerlegen die Stücke in Aminosäuren und sehr kurze Stücke. Die gehen ins Blut.',
      ],
    },
    butter: {
      stoff: ['Fett', 'Glycerin mit 3 Fettsäuren'],
      cuts: [[], ['0-0'], ['0-0', '0-2', '1-0', '1-2']],
      enz: [['kaum', 'Fett bleibt ein Tropfen'], ['Magen-Lipase', 'schafft nur wenig'], ['Galle + Lipase', 'Leber, Bauchspeicheldrüse']],
      res: [['ganzer Tropfen', 'noch nicht zerlegt'], ['fast alles ganz', 'ein kleiner Teil zerlegt'], ['Fettsäuren', 'über die Lymphe ins Blut']],
      txt: [
        'Mund: Fett löst sich nicht in Wasser. Es bleibt ein Tropfen, an den die Scheren kaum herankommen.',
        'Magen: Eine Fett-Schere, die Lipase, schneidet hier nur einen kleinen Teil ab.',
        'Dünndarm: Die Galle zerteilt den Fett-Tropfen in winzige Tröpfchen (grün). Jetzt kommt die Lipase überall heran und schneidet je zwei Fettsäuren ab.',
      ],
    },
  };
  const STN = ['Mund', 'Magen', 'Dünndarm'];
  const E = { food: 'brot', st: 0, from: new Set(), fresh: [], t: 1, a: 0, ph: 0 };
  const setE = (food, st, replay) => {
    const F = FOODS[food], T = F.cuts[st];
    let from;
    if (replay || food !== E.food) from = new Set(st > 0 ? F.cuts[st - 1] : []);
    else if (st > E.st) from = new Set(F.cuts[E.st]);
    else from = new Set(T);
    from = new Set([...from].filter(b => T.includes(b)));
    E.food = food; E.st = st; E.from = from;
    E.fresh = T.filter(b => !from.has(b));
    E.t = reduced ? 1 : 0; E.a = reduced ? 1 : 0;
    $('#stIn').value = st; $('#stOut').textContent = STN[st];
    $('#eStoff').textContent = F.stoff[0]; $('#eStoff2').textContent = F.stoff[1];
    $('#eEnz').textContent = F.enz[st][0]; $('#eEnz2').textContent = F.enz[st][1];
    $('#eRes').textContent = F.res[st][0]; $('#eRes2').textContent = F.res[st][1];
    $('#enzStatus').textContent = F.txt[st];
    $('#nextSt').textContent = st < 2 ? 'Nächste Station' : 'Zurück zum Mund';
    $$('#foodSel button').forEach(b => b.classList.toggle('active', b.dataset.f === food));
  };
  $$('#foodSel button').forEach(b => b.addEventListener('click', () => setE(b.dataset.f, 0, true)));
  $('#stIn').addEventListener('input', e => setE(E.food, +e.target.value));
  $('#nextSt').addEventListener('click', () => setE(E.food, E.st < 2 ? E.st + 1 : 0));
  $('#againSt').addEventListener('click', () => setE(E.food, E.st, true));
  setE('brot', 0, true); E.t = 1;

  const cpOf = b => {
    if (E.from.has(b)) return 1;
    const k = E.fresh.indexOf(b);
    return k < 0 ? 0 : clamp(E.t * E.fresh.length - k, 0, 1);
  };
  const scissors = (ctx, x, y, s, open) => {
    const a = .12 + .45 * open;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * Math.sin(a) * s, y + Math.cos(a) * s); ctx.stroke();
      const hx = x - d * Math.sin(a) * s * .55, hy = y - Math.cos(a) * s * .55;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx - d * 2, hy - 4, 4.5, 0, TAU); ctx.stroke();
    }
  };
  const hexagon = (ctx, x, y, r) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; k ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    ctx.closePath();
  };
  const AMINO = ['#5aa0e0', '#e07a5a', '#7ac17a', '#c08ad8'];

  const drawEnz = dt => {
    const { ctx, w, h } = fit(enzCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const F = FOODS[E.food], n = E.fresh.length;
    if (!reduced) {
      E.t = Math.min(1, E.t + dt / Math.max(1.2, n * .32));
      if (E.t >= 1 && E.st === 2) E.a = Math.min(1, E.a + dt / 1.6);
      E.ph += dt;
    }
    // Stationen oben
    ctx.font = `${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'center';
    STN.forEach((nm, k) => {
      const x = w * (k + .5) / 3, on = k === E.st;
      ctx.font = `${on ? 600 : 400} ${narrow ? 11 : 12}px ${MONO}`;
      if (on) { const tw = ctx.measureText(nm).width; roundRect(ctx, x - tw / 2 - 9, 6, tw + 18, 22, 11); ctx.fillStyle = C.accent; ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillStyle = on ? C.fg : C.muted; ctx.fillText(nm, x, 21);
      if (k < 2) { ctx.fillStyle = C.muted; ctx.font = `12px ${MONO}`; ctx.fillText('→', w * (k + 1) / 3, 21); }
    });
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    const title = { brot: narrow ? 'Stärke: Zuckerkette' : 'Brot · Stärke: eine Kette aus Traubenzucker',
      kaese: narrow ? 'Eiweiss: Aminosäurekette' : 'Käse · Eiweiss: eine Kette aus Aminosäuren',
      butter: narrow ? 'Fett: Glycerin + 3 Fettsäuren' : 'Butter · Fett: Glycerin mit drei Fettsäuren' }[E.food];
    ctx.fillText(title, w / 2, 48);

    // Darmwand (nur im Dünndarm)
    const bandY = h - 62, bandH = 28;
    if (E.st === 2) {
      ctx.fillStyle = TIS_L; ctx.fillRect(12, bandY, w - 24, bandH);
      ctx.strokeStyle = TIS_D; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(12, bandY); ctx.lineTo(w - 12, bandY); ctx.stroke();
      ctx.fillStyle = BLOOD; ctx.fillRect(12, bandY + bandH, w - 24, 6);
      ctx.font = `10px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
      ctx.fillText('Darmwand', 12, h - 12);
      ctx.textAlign = 'right';
      ctx.fillText(E.food === 'butter' ? (narrow ? '→ Lymphe → Blut' : '→ über die Lymphe ins Blut') : '→ ins Blut', w - 12, h - 12);
    } else {
      ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
      ctx.fillText(E.st === 0 ? 'Speichel' : 'Magensaft: Säure', w / 2, h - 16);
    }

    const cy = h * .46;
    let scis = null;
    if (E.food !== 'butter') {
      const N = 12, avail = w - 40, sp = Math.min(32, avail / (N + 11 * .55)), gap = sp * .55, r = sp * .4;
      const cps = [...Array(N - 1)].map((_, b) => cpOf(b));
      const pos = [];
      let off = 0;
      const total = (N - 1) * sp + cps.reduce((a, b) => a + b, 0) * gap;
      const x0 = w / 2 - total / 2;
      for (let k = 0; k < N; k++) {
        if (k) off += cps[k - 1] * gap;
        let x = x0 + k * sp + off, y = cy + Math.sin(k * .8 + E.ph * .8) * sp * .25;
        if (E.st === 2) {
          const lag = clamp(E.a * 1.6 - (k % 4) * .2, 0, 1);
          y = lerp(y, bandY + 9 + (k % 3) * 5, lag);
        }
        pos.push([x, y]);
      }
      // Bindungen
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
      for (let b = 0; b < N - 1; b++) {
        if (cps[b] >= 1) continue;
        ctx.globalAlpha = 1 - cps[b];
        ctx.beginPath(); ctx.moveTo(pos[b][0], pos[b][1]); ctx.lineTo(pos[b + 1][0], pos[b + 1][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      pos.forEach(([x, y], k) => {
        if (E.food === 'brot') { hexagon(ctx, x, y, r); ctx.fillStyle = '#d9a441'; ctx.fill(); ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 1.2; ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(x, y, r * .95, 0, TAU); ctx.fillStyle = AMINO[(k * 7 + (k >> 1)) % 4]; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
      });
      if (E.t < 1 && n) {
        const k = Math.min(n - 1, Math.floor(E.t * n)), b = E.fresh[k];
        const x = (pos[b][0] + pos[b + 1][0]) / 2, y = (pos[b][1] + pos[b + 1][1]) / 2;
        scis = [x, y - r - 4, 1 - (E.t * n - k)];
      }
    } else {
      // Fett: zwei Moleküle, je Glycerin mit drei Fettsäure-Schwänzen
      const L = Math.min(84, w * .17), sp = narrow ? 13 : 15, gap = narrow ? 15 : 20;
      const centers = [w / 2 - (narrow ? w * .22 : w * .18), w / 2 + (narrow ? w * .22 : w * .18)];
      // Tropfen bzw. Tröpfchen mit Galle
      const split = E.st === 2 ? (reduced ? 1 : Math.min(1, E.t * 2)) : 0;
      if (1 - split > .01) {
        ctx.globalAlpha = (1 - split) * (1 - E.a);
        ctx.beginPath(); ctx.ellipse(w / 2, cy, w * .4, sp * 3.3, 0, 0, TAU);
        ctx.fillStyle = 'rgba(240,200,80,.28)'; ctx.fill(); ctx.strokeStyle = '#d6aa2c'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (split > 0) {
        ctx.globalAlpha = split * (1 - E.a);
        centers.forEach(mx => {
          ctx.beginPath(); ctx.ellipse(mx, cy, L * .85, sp * 2.6, 0, 0, TAU);
          ctx.fillStyle = 'rgba(240,200,80,.22)'; ctx.fill(); ctx.strokeStyle = '#d6aa2c'; ctx.lineWidth = 1.2; ctx.stroke();
        });
        ctx.fillStyle = BILE;
        for (let k = 0; k < 18; k++) {
          const a = k / 18 * TAU + E.ph * .3, rx = w * .42, ry = sp * 4.2;
          ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.5, 0, TAU); ctx.fill();
        }
        ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = BILE;
        ctx.fillText('Galle', w / 2, cy - sp * 4.2 - 8);
        ctx.globalAlpha = 1;
      }
      centers.forEach((mx, m) => {
        const gx = mx - L / 2;
        const down = (y, k) => E.st === 2 ? lerp(y, bandY + 6 + k * 8, clamp(E.a * 1.5 - k * .15, 0, 1)) : y;
        for (let k = 0; k < 3; k++) {
          const b = `${m}-${k}`, cp = cpOf(b);
          const y0 = cy + (k - 1) * sp;
          const dx = cp * gap * (E.st === 2 ? 1.6 : 1), dy = cp * (k - 1) * 5;
          const ty = down(y0 + dy, k);
          // Schwanz als Zickzack
          ctx.strokeStyle = '#e0b030'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
          ctx.beginPath();
          const sx = gx + 7 + dx;
          for (let j = 0; j <= 7; j++) { const x = sx + j * (L - 8) / 7, y = ty + (j % 2 ? -3 : 3); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
          if (cp < 1) { ctx.globalAlpha = 1 - cp; ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, down(y0, 1)); ctx.lineTo(sx, ty); ctx.stroke(); ctx.globalAlpha = 1; }
          if (cp > 0 && cp < 1 && !scis) scis = [gx + 5 + dx / 2, y0 - 6, 1 - cp];
        }
        // Glycerin
        for (let k = 0; k < 3; k++) {
          const y = down(cy + (k - 1) * sp, 1);
          ctx.beginPath(); ctx.arc(gx, y, 5, 0, TAU); ctx.fillStyle = '#9a7ad0'; ctx.fill();
        }
        ctx.strokeStyle = '#9a7ad0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(gx, down(cy - sp, 1)); ctx.lineTo(gx, down(cy + sp, 1)); ctx.stroke();
      });
      if (!scis && E.t < 1 && n) {
        const b = E.fresh[Math.min(n - 1, Math.floor(E.t * n))], [m, k] = b.split('-').map(Number);
        scis = [centers[m] - L / 2 + 5, cy + (k - 1) * sp - 6, 1];
      }
      if (!narrow && E.st < 2) {
        ctx.font = `10px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
        ctx.fillText('violett: Glycerin · gelb: Fettsäuren', 14, cy + sp * 3.3 + 22);
      }
    }
    if (scis && !reduced) scissors(ctx, scis[0], scis[1] - 10, 14, scis[2]);
    if (!E.fresh.length && ['keine', 'kaum'].includes(F.enz[E.st][0])) {
      ctx.font = `11px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
      ctx.fillText(F.enz[E.st][0] === 'kaum' ? 'hier schneidet kaum eine Schere' : 'hier schneidet keine Schere', w / 2, 70);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('verdauung', 4, {
    pathLock: () => { ['#timeIn', '#travelBtn', '#fatBtn'].forEach(s => $(s).disabled = false); },
    zoomLock: () => { $('#zoomIn').disabled = false; $$('#zoomSel button').forEach(b => b.disabled = false); },
    enzLock: () => { ['#stIn', '#nextSt', '#againSt'].forEach(s => $(s).disabled = false); $$('#foodSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawPath(dt); drawZoom(dt); drawEnz(dt); });
})();
