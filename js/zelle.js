/* mindblow – Lektion Zellen */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Blut, Bakterien, Organellen
  const RBC = '#c8283c', PLT = '#e58a96', BACT = '#5f9f4a';
  const COL = { kern: '#7b5cc4', mito: '#e07a2e', er: '#3f87c4', golgi: '#d2a21a', ribo: '#5a4a8a', chloro: '#3f9b4a', vak: '#7cc0e0', wand: '#9a7a45' };

  // 30 Bio., 86 Mrd. ...
  const big = n => {
    const u = n >= 1e12 ? [1e12, 'Bio.'] : n >= 1e9 ? [1e9, 'Mrd.'] : n >= 1e6 ? [1e6, 'Mio.'] : [1, ''];
    const v = n / u[0];
    return (v < 10 && Math.abs(v - Math.round(v)) > .05 ? fmt(v, 1) : fmt(Math.round(v), 0)) + (u[1] ? ' ' + u[1] : '');
  };
  const sig2 = v => { const p = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
  const YEAR = 365.25 * 86400;
  const dur = s => {
    if (s < 1) return 'unter 1 s';
    if (s < 60) return `${fmt(s, 0)} s`;
    if (s < 3600) return `${fmt(s / 60, 0)} min`;
    if (s < 86400) return `${fmt(s / 3600, s < 36000 ? 1 : 0)} Std.`;
    if (s < YEAR) return `${fmt(s / 86400, 0)} Tage`;
    const y = s / YEAR;
    if (y < 10) return `${fmt(y, 1)} Jahre`;
    if (y < 1e6) return `${fmt(sig2(y), 0)} Jahre`;
    return `${fmt(y / 1e6, 1)} Mio. Jahre`;
  };

  /* ---------- Teil 1: Zellen zählen ---------- */
  const countCv = $('#countCv');
  // Schätzung nach Sender, Fuchs und Milo (2016), Mann mit 70 kg, gerundet
  const GROUPS = {
    all: { n: 3.0e13, name: 'alle Zellen', share: '100 %', sf: 'deiner eigenen Zellen',
      msg: 'Alle deine Zellen: rund 30 Billionen. Die Blutplättchen sind eigentlich Zellbruchstücke, werden hier aber mitgezählt.' },
    rbc: { n: 2.5e13, name: 'rote Blutk.', share: '84 %', sf: 'deiner eigenen Zellen',
      msg: 'Rote Blutkörperchen: rund 25 Billionen. Sie sind winzig, darum wiegen sie zusammen nur einen kleinen Teil deines Körpers.' },
    neuro: { n: 8.6e10, name: 'Nervenzellen', share: '0,3 %', sf: 'deiner eigenen Zellen',
      msg: 'Nervenzellen im Gehirn: rund 86 Milliarden. Viele, aber nur ein winziger Teil all deiner Zellen.' },
    bact: { n: 3.8e13, name: 'Bakterien', share: 'etwa 1 : 1', sf: 'Bakterien zu eigenen Zellen',
      msg: 'Bakterien: grob 40 Billionen, vor allem im Dickdarm. Zusammen wiegen sie nur rund 0,2 Kilogramm. Eine grobe Schätzung.' },
  };
  const TYPES = [
    { name: 'Rote Blutkörperchen', p: 84, col: () => RBC },
    { name: 'Blutplättchen', p: 5, col: () => PLT },
    { name: 'Knochenmark, Abwehr', p: 4, col: () => C.fiber },
    { name: 'Gefässwände', p: 2, col: () => C.copper },
    { name: 'alle anderen', p: 5, col: () => C.muted },
  ];
  const MARKS = [
    [60, '1 min', '1 min'], [86400, '1 Tag', '1 Tag'], [YEAR, '1 Jahr', '1 Jahr'], [80 * YEAR, 'Menschenleben', 'Leben'],
    [4500 * YEAR, 'Pyramiden', 'Pyramiden'], [3e5 * YEAR, 'Homo sapiens', 'H. sapiens'], [6.6e7 * YEAR, 'Dinos †', 'Dinos †'],
  ];
  const P1 = { g: 'all', k: 0, count: 0, mx: null, on: false };
  const rate = () => Math.pow(10, P1.k);
  const rateTxt = k => ['1', '10', '100', "1'000", "10'000", "100'000", '1 Mio.', '10 Mio.', '100 Mio.', '1 Mrd.'][k] + '/s';
  const updCount = () => {
    const g = GROUPS[P1.g];
    $('#rateIn').value = P1.k; $('#rateOut').textContent = rateTxt(P1.k);
    $('#cN').textContent = big(g.n);
    $('#cT').textContent = dur(g.n / rate());
    $('#cR').textContent = g.share; $('#cRf').textContent = g.sf;
  };
  $$('#countSel button').forEach(b => b.addEventListener('click', () => {
    P1.g = b.dataset.g; P1.count = 0;
    $$('#countSel button').forEach(x => x.classList.toggle('active', x === b));
    $('#countStatus').textContent = GROUPS[P1.g].msg;
    updCount();
  }));
  $('#rateIn').addEventListener('input', e => {
    P1.k = +e.target.value; P1.count = 0; updCount();
    const t = GROUPS[P1.g].n / rate();
    $('#countStatus').textContent = P1.k === 9
      ? `Eine Milliarde pro Sekunde, schneller als jeder Computer zählt. Und trotzdem dauert es noch ${dur(t)}.`
      : `Bei ${rateTxt(P1.k).replace('/s', '')} pro Sekunde dauert es ${dur(t)}.`;
  });
  updCount();

  const drawCount = dt => {
    const { ctx, w, h } = fit(countCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440, pad = 14;
    const g = P1.g, bact = g === 'bact';
    if (P1.on) P1.count = Math.min(GROUPS[g].n, P1.count + rate() * dt);

    // Titel
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(bact ? '1 Feld = 1 % deiner eigenen Zellen' : (narrow ? '1 Feld = 1 % deiner Zellen' : 'Jedes Feld = 1 % deiner Zellen'), pad, 22);

    // Felder
    const s = clamp(w * (narrow ? .5 : .42) / 10, 12, 20), gap = 2;
    const x0 = pad, y0 = 34;
    const cells = [];
    if (bact) for (let i = 0; i < 127; i++) cells.push(BACT);
    else TYPES.forEach((t, ti) => { for (let i = 0; i < t.p; i++) cells.push(ti); });
    cells.forEach((c, i) => {
      const x = x0 + (i % 10) * s, y = y0 + Math.floor(i / 10) * s;
      let col, a = 1;
      if (bact) col = c;
      else {
        col = TYPES[c].col();
        if (g === 'rbc' && c !== 0) a = .18;
        if (g === 'neuro') a = .18;
      }
      ctx.globalAlpha = a; ctx.fillStyle = col;
      roundRect(ctx, x, y, s - gap, s - gap, 2.5); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Nervenzellen: 0,3 % von einem Feld
    if (g === 'neuro') {
      const i = 95, x = x0 + (i % 10) * s, y = y0 + Math.floor(i / 10) * s;
      ctx.fillStyle = C.glow; ctx.fillRect(x, y, (s - gap) * .29, s - gap);
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.strokeRect(x - 1.5, y - 1.5, s - gap + 3, s - gap + 3);
    }
    const rows = Math.ceil(cells.length / 10);
    const wb = y0 + rows * s;

    // Legende
    const lx = x0 + 10 * s + (narrow ? 12 : 22);
    ctx.textAlign = 'left';
    if (bact) {
      ctx.fillStyle = BACT; roundRect(ctx, lx, y0, 10, 10, 2); ctx.fill();
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.fillText('Bakterien', lx + 16, y0 + 9);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      const lines = narrow ? ['rund 127 Felder', 'grob gleich viele', 'wie deine Zellen', '', 'zusammen nur', 'rund 0,2 kg'] : ['rund 127 Felder', 'grob gleich viele wie', 'deine eigenen Zellen', '', 'wiegen zusammen nur', 'rund 0,2 kg'];
      lines.forEach((l, i) => ctx.fillText(l, lx + 16, y0 + 26 + i * 15));
    } else {
      TYPES.forEach((t, i) => {
        const y = y0 + i * (narrow ? 32 : 34);
        const dim = (g === 'rbc' && i !== 0) || g === 'neuro';
        ctx.globalAlpha = dim ? .4 : 1;
        ctx.fillStyle = t.col(); roundRect(ctx, lx, y, 10, 10, 2); ctx.fill();
        ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`;
        const nm = narrow && t.name.length > 16 ? t.name.replace('Rote Blutkörperchen', 'Rote Blutkörp.').replace('Knochenmark, Abwehr', 'Knochenm., Abwehr') : t.name;
        ctx.fillText(nm, lx + 16, y + 9);
        ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
        ctx.fillText(`${t.p} %`, lx + 16, y + 23);
      });
      ctx.globalAlpha = 1;
      if (g === 'neuro') {
        const y = y0 + 5 * (narrow ? 32 : 34) + 4;
        ctx.fillStyle = C.glow; roundRect(ctx, lx, y, 10, 10, 2); ctx.fill();
        ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.fillText(narrow ? 'Nervenz. Gehirn' : 'Nervenzellen Gehirn', lx + 16, y + 9);
        ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.fillText(narrow ? '0,3 %' : '0,3 %: ein Drittel Feld', lx + 16, y + 23);
      }
    }

    // Zähler
    const n = GROUPS[g].n;
    const cy = Math.max(wb + 22, h - 118);
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    const cnt = P1.count < 1e6 ? fmt(Math.floor(P1.count), 0) : big(P1.count);
    ctx.fillText(`Gezählt: ${cnt}`, pad, cy);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    const left = n - P1.count;
    ctx.fillText(P1.count >= n ? 'Fertig gezählt!' : `${narrow ? 'Noch' : 'Es fehlen noch'} ${big(left)} ${GROUPS[g].name}`, pad, cy + 18);

    // Zeitachse (logarithmisch)
    const ax0 = pad + 4, ax1 = w - pad - 4, ay = h - 40, L1 = 16;
    const AX = sec => ax0 + clamp(Math.log10(Math.max(1, sec)) / L1, 0, 1) * (ax1 - ax0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    ctx.font = `10px ${MONO}`;
    MARKS.forEach(([sec, long, short], i) => {
      const x = AX(sec), lbl = narrow ? short : long;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, ay - 4); ctx.lineTo(x, ay + 4); ctx.stroke();
      const tw = ctx.measureText(lbl).width;
      ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
      ctx.fillText(lbl, clamp(x - tw / 2, 2, w - tw - 2), i % 2 ? ay + 18 : ay - 10);
    });
    // aktuelle Zähldauer
    const target = AX(n / rate());
    if (P1.mx === null || reduced) P1.mx = target;
    else P1.mx += (target - P1.mx) * Math.min(1, dt * 6);
    ctx.fillStyle = C.glow;
    ctx.beginPath(); ctx.arc(P1.mx, ay, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    const lbl = `Du: ${dur(n / rate())}`;
    ctx.font = `500 12px ${MONO}`;
    const tw = ctx.measureText(lbl).width;
    ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(lbl, clamp(P1.mx - tw / 2, 6, w - tw - 8), ay - 28);
  };

  /* ---------- Teil 2: Die Zelle als Stadt ---------- */
  const cellCv = $('#cellCv');
  const ORG = {
    kern: { name: 'Zellkern', city: 'Rathaus', where: 'Tier + Pflanze',
      txt: 'Zellkern: Hier liegt die DNA, der Bauplan der Zelle. Von hier gehen Anweisungen hinaus, welche Eiweisse gebaut werden. Wie ein Rathaus mit dem Archiv aller Pläne.' },
    mito: { name: 'Mitochondrien', city: 'Kraftwerke', where: 'Tier + Pflanze',
      txt: 'Mitochondrien: Sie verbrennen Zucker mit Sauerstoff, ganz ohne Flamme, und laden damit kleine Energieträger auf (ATP). Damit läuft fast alles in der Zelle. Muskelzellen haben besonders viele.' },
    ribo: { name: 'Ribosomen', city: 'Fabriken', where: 'Tier + Pflanze',
      txt: 'Ribosomen: winzige Fabriken. Sie setzen nach der Anleitung aus dem Kern Eiweisse zusammen, Baustein für Baustein. Eine Zelle hat Hunderttausende bis Millionen davon. Hier stark vergrössert und nur wenige gezeichnet.' },
    er: { name: 'Retikulum (ER)', city: 'Fliessband', where: 'Tier + Pflanze',
      txt: 'Endoplasmatisches Retikulum: ein Netz aus gefalteten Häuten rund um den Kern. Viele Ribosomen sitzen darauf. Hier werden Eiweisse fertig gebaut und weitergereicht, wie auf einem Fliessband.' },
    golgi: { name: 'Golgi-Apparat', city: 'Post', where: 'Tier + Pflanze',
      txt: 'Golgi-Apparat: Hier werden Eiweisse sortiert, verpackt und in kleine Bläschen gesteckt. Dann gehen sie dorthin, wo sie gebraucht werden, in der Zelle oder nach draussen. Wie eine Poststelle.' },
    membran: { name: 'Zellmembran', city: 'Stadtmauer', where: 'Tier + Pflanze',
      txt: 'Zellmembran: eine hauchdünne Haut aus Fett-Molekülen. Sie hält alles zusammen. Eingebaute Eiweisse bilden Tore und Pumpen und entscheiden, was hinein und hinaus darf.' },
    plasma: { name: 'Zellplasma', city: 'Stadtgebiet', where: 'Tier + Pflanze',
      txt: 'Zellplasma: eine dickflüssige, wässrige Masse, in der alle Organellen liegen. Ein Gerüst aus feinen Fasern gibt Halt und dient als Schienennetz für Transporte.' },
    wand: { name: 'Zellwand', city: 'Fester Zaun', where: 'Pflanze',
      txt: 'Zellwand: eine feste Hülle aus Zellulose ausserhalb der Membran. Sie gibt der Pflanze Halt. Holz und Papier bestehen zu einem grossen Teil daraus. Tierzellen haben keine Zellwand.' },
    chloro: { name: 'Chloroplasten', city: 'Solar-Zuckerfabrik', where: 'Pflanze',
      txt: 'Chloroplasten: grün vom Chlorophyll. Sie fangen Licht ein und bauen damit aus Wasser und CO₂ Zucker. Mehr dazu im Thema Fotosynthese.' },
    vak: { name: 'Vakuole', city: 'Wasserturm', where: 'v. a. Pflanze',
      txt: 'Vakuole: ein grosser Speicher voller Zellsaft. Er drückt von innen gegen die Wand und hält die Pflanze prall. Fehlt Wasser, schrumpft er und die Pflanze welkt. Tierzellen haben höchstens kleine Bläschen.' },
  };
  const CELL = { kind: 'tier', sel: 'kern', city: false, t: 0, hits: [], on: false };
  // feste Zufallspunkte für Ribosomen
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const RIBO = Array.from({ length: 70 }, () => [rnd() * 2 - 1, rnd() * 2 - 1]);
  const LAYOUT = {
    tier: {
      kern: [-.18, -.04, .30], golgi: [.42, -.34],
      mito: [[.48, .30, .5], [-.58, .42, -.4], [.08, .56, .15], [-.52, -.48, .7], [.70, -.02, 1.45]],
      chloro: [], vak: null,
    },
    pflanze: {
      kern: [-.62, -.42, .19], golgi: [-.62, .48],
      mito: [[-.88, .02, 1.5], [.80, -.60, .1], [-.30, .64, .0]],
      chloro: [[-.06, -.68, 0], [.32, -.64, .1], [.86, -.18, 1.5], [.86, .32, 1.6], [.42, .64, -.1]],
      vak: [.16, .0, .52, .46],
    },
  };
  const selectOrg = id => {
    CELL.sel = id;
    const o = ORG[id];
    $('#oName').textContent = o.name; $('#oCity').textContent = o.city; $('#oWhere').textContent = o.where;
    $('#cellStatus').textContent = o.txt;
  };
  $$('#cellSel button').forEach(b => b.addEventListener('click', () => {
    CELL.kind = b.dataset.k;
    $$('#cellSel button').forEach(x => x.classList.toggle('active', x === b));
    if (CELL.kind === 'tier' && ['wand', 'chloro', 'vak'].includes(CELL.sel)) selectOrg('kern');
    else if (CELL.kind === 'pflanze') {
      $('#cellStatus').textContent = 'Pflanzenzelle: Neu dabei sind Zellwand, Chloroplasten und eine grosse Vakuole. Alles andere hat auch deine Zelle. Tippe sie an.';
    } else selectOrg(CELL.sel);
  }));
  $('#cityBtn').addEventListener('click', () => {
    CELL.city = !CELL.city;
    $('#cityBtn').textContent = CELL.city ? 'Fachbegriffe zeigen' : 'Als Stadt zeigen';
  });
  cellCv.addEventListener('click', e => {
    if (!CELL.on) return;
    const r = cellCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (const [id, test] of CELL.hits) if (test(x, y)) { selectOrg(id); return; }
  });
  cellCv.addEventListener('pointermove', e => {
    if (!CELL.on) return;
    const r = cellCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    cellCv.style.cursor = CELL.hits.some(([, t]) => t(x, y)) ? 'pointer' : 'default';
  });
  selectOrg('kern');

  const drawCell = dt => {
    const { ctx, w, h } = fit(cellCv);
    ctx.clearRect(0, 0, w, h);
    if (!reduced) CELL.t += dt;
    const narrow = w < 440;
    const plant = CELL.kind === 'pflanze', L = LAYOUT[CELL.kind];
    const cx = w / 2, cy = h / 2 + 10;
    const R = Math.min(w * (plant ? .44 : .45), h * (narrow ? .42 : plant ? .52 : .42));
    const sy = narrow ? 1.05 : plant ? .8 : .82;
    const X = u => cx + u * R, Y = v => cy + v * R * sy;
    const sel = id => CELL.sel === id;
    const hits = [];
    const wob = reduced ? 0 : CELL.t;

    // Umriss
    const outline = (inset = 0) => {
      ctx.beginPath();
      if (plant) { roundRect(ctx, X(-1) + inset, Y(-1) + inset, 2 * R - 2 * inset, (Y(1) - Y(-1)) - 2 * inset, 16); return; }
      for (let i = 0; i <= 80; i++) {
        const a = i / 80 * TAU;
        const k = 1 + .04 * Math.sin(3 * a + .5 + wob * .6) + .025 * Math.sin(5 * a + wob * .4);
        const x = cx + Math.cos(a) * R * k - inset * Math.cos(a), y = cy + Math.sin(a) * R * sy * k - inset * Math.sin(a);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    const inside = (x, y, inset = 0) => { outline(inset); return ctx.isPointInPath(x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1)); };

    // Zellwand
    if (plant) {
      ctx.lineJoin = 'round';
      roundRect(ctx, X(-1) - 6, Y(-1) - 6, 2 * R + 12, Y(1) - Y(-1) + 12, 20);
      ctx.fillStyle = COL.wand; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
      if (sel('wand')) { ctx.strokeStyle = C.glow; ctx.lineWidth = 4; ctx.stroke(); }
    }
    // Plasma
    outline(); ctx.fillStyle = C.surface; ctx.fill(); ctx.fillStyle = C.sunk; ctx.fill();
    if (sel('plasma')) { ctx.fillStyle = C.glow; ctx.globalAlpha = .14; ctx.fill(); ctx.globalAlpha = 1; }
    // Membran
    outline(); ctx.strokeStyle = sel('membran') ? C.glow : C.fg; ctx.lineWidth = sel('membran') ? 4 : 2; ctx.stroke();
    // Tore in der Membran
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + .3;
      let px, py;
      if (plant) {
        const t = i / 10;
        const per = 2 * (2 * R) + 2 * (Y(1) - Y(-1));
        let d = t * per;
        const ww = 2 * R, hh = Y(1) - Y(-1);
        if (d < ww) { px = X(-1) + d; py = Y(-1); } else if ((d -= ww) < hh) { px = X(1); py = Y(-1) + d; }
        else if ((d -= hh) < ww) { px = X(1) - d; py = Y(1); } else { d -= ww; px = X(-1); py = Y(1) - d; }
      } else {
        const k = 1 + .04 * Math.sin(3 * a + .5 + wob * .6) + .025 * Math.sin(5 * a + wob * .4);
        px = cx + Math.cos(a) * R * k; py = cy + Math.sin(a) * R * sy * k;
      }
      ctx.fillStyle = C.surface; ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
    }

    // Vakuole
    if (L.vak) {
      const [u, v, rx, ry] = L.vak;
      ctx.beginPath(); ctx.ellipse(X(u), Y(v), rx * R, ry * R, 0, 0, TAU);
      ctx.fillStyle = COL.vak; ctx.globalAlpha = .45; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = sel('vak') ? C.glow : COL.vak; ctx.lineWidth = sel('vak') ? 4 : 2; ctx.stroke();
      hits.push(['vak', (x, y) => ((x - X(u)) / (rx * R)) ** 2 + ((y - Y(v)) / (ry * R)) ** 2 <= 1]);
    }

    // Kern und ER
    const [ku, kv, kr] = L.kern, kx = X(ku), ky = Y(kv), krp = kr * R;
    ctx.strokeStyle = sel('er') ? C.glow : COL.er; ctx.lineWidth = sel('er') ? 4 : 2.5; ctx.lineCap = 'round';
    const erR = [1.3, 1.55, 1.8].map(f => f * krp);
    const a0 = plant ? -1.1 : -1.2, a1 = plant ? 1.1 : 1.3;
    erR.forEach((rr, j) => {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = a0 + (a1 - a0) * i / 40, r2 = rr + 2.5 * Math.sin(i * 1.3 + j);
        const x = kx + Math.cos(a) * r2, y = ky + Math.sin(a) * r2;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    hits.push(['er', (x, y) => {
      const d = Math.hypot(x - kx, y - ky), a = Math.atan2(y - ky, x - kx);
      return d > krp * 1.15 && d < krp * 1.95 && a > a0 && a < a1;
    }]);
    ctx.beginPath(); ctx.arc(kx, ky, krp, 0, TAU);
    ctx.fillStyle = COL.kern; ctx.globalAlpha = .35; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = sel('kern') ? C.glow : COL.kern; ctx.lineWidth = sel('kern') ? 4 : 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(kx + krp * .2, ky - krp * .15, krp * .3, 0, TAU); ctx.fillStyle = COL.kern; ctx.fill();
    // DNA-Fäden im Kern
    ctx.strokeStyle = COL.kern; ctx.lineWidth = 1; ctx.globalAlpha = .7;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = kx - krp * .7 + krp * 1.4 * i / 20, y = ky + krp * (.35 - j * .3) + krp * .12 * Math.sin(i * 1.7 + j * 2);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    hits.push(['kern', (x, y) => Math.hypot(x - kx, y - ky) <= krp * 1.05]);

    // Golgi
    const [gu, gv] = L.golgi, gx = X(gu), gy = Y(gv), gs = R * (plant ? .14 : .16);
    ctx.strokeStyle = sel('golgi') ? C.glow : COL.golgi; ctx.lineWidth = sel('golgi') ? 5 : 3.5;
    for (let j = 0; j < 4; j++) {
      const ww = gs * (1 - j * .12);
      ctx.beginPath(); ctx.arc(gx, gy + gs * 1.2 + j * 6, gs * 1.2, -Math.PI / 2 - ww / gs * .55, -Math.PI / 2 + ww / gs * .55); ctx.stroke();
    }
    ctx.fillStyle = COL.golgi;
    for (const [dx, dy] of [[1.15, .15], [-1.1, .3], [.9, .7]]) { ctx.beginPath(); ctx.arc(gx + dx * gs, gy + dy * gs, 3, 0, TAU); ctx.fill(); }
    hits.push(['golgi', (x, y) => Math.abs(x - gx) < gs * 1.3 && y > gy - gs * .3 && y < gy + gs * .95]);

    // Mitochondrien
    const mL = R * (plant ? .17 : .19), mW = mL * .45;
    L.mito.forEach(([u, v, a]) => {
      const x = X(u), y = Y(v);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, mL, mW, 0, 0, TAU);
      ctx.fillStyle = COL.mito; ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = sel('mito') ? C.glow : COL.mito; ctx.lineWidth = sel('mito') ? 4 : 2.2; ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = COL.mito; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const xx = -mL * .75 + mL * 1.5 * i / 8; ctx.lineTo(xx, (i % 2 ? 1 : -1) * mW * .55); }
      ctx.stroke(); ctx.restore();
      hits.push(['mito', (px, py) => {
        const dx = px - x, dy = py - y, c = Math.cos(-a), s = Math.sin(-a);
        const rx = dx * c - dy * s, ry = dx * s + dy * c;
        return (rx / (mL + 4)) ** 2 + (ry / (mW + 5)) ** 2 <= 1;
      }]);
    });

    // Chloroplasten
    const cL = R * .16, cW = cL * .5;
    L.chloro.forEach(([u, v, a]) => {
      const x = X(u), y = Y(v);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, cL, cW, 0, 0, TAU);
      ctx.fillStyle = COL.chloro; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = sel('chloro') ? C.glow : COL.chloro; ctx.lineWidth = sel('chloro') ? 4 : 2; ctx.stroke();
      ctx.fillStyle = '#1f6b2a';
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * cL * .32 - 3, -cW * .45, 6, cW * .9);
      ctx.restore();
      hits.push(['chloro', (px, py) => {
        const dx = px - x, dy = py - y, c = Math.cos(-a), s = Math.sin(-a);
        const rx = dx * c - dy * s, ry = dx * s + dy * c;
        return (rx / (cL + 4)) ** 2 + (ry / (cW + 5)) ** 2 <= 1;
      }]);
    });

    // Ribosomen: auf dem ER und verstreut
    const ribos = [];
    erR.forEach((rr, j) => { for (let i = 0; i < 7; i++) { const a = a0 + (a1 - a0) * (i + .5) / 7; ribos.push([kx + Math.cos(a) * (rr + 4), ky + Math.sin(a) * (rr + 4)]); } });
    RIBO.forEach(([u, v]) => {
      const x = X(u * .9), y = Y(v * .85);
      if (!inside(x, y, 10)) return;
      if (Math.hypot(x - kx, y - ky) < krp * 2.1) return;
      if (L.vak) { const [vu, vv, rx, ry] = L.vak; if (((x - X(vu)) / (rx * R + 6)) ** 2 + ((y - Y(vv)) / (ry * R + 6)) ** 2 <= 1) return; }
      if (Math.hypot(x - gx, y - (gy + gs * .3)) < gs * 1.4) return;
      if (L.mito.some(([mu, mv]) => Math.hypot(x - X(mu), y - Y(mv)) < mL + 4)) return;
      if (L.chloro.some(([mu, mv]) => Math.hypot(x - X(mu), y - Y(mv)) < cL + 4)) return;
      ribos.push([x, y]);
    });
    ctx.fillStyle = sel('ribo') ? C.glow : COL.ribo;
    ribos.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, sel('ribo') ? 3 : 2.2, 0, TAU); ctx.fill(); });
    hits.unshift(['ribo', (x, y) => ribos.some(([rx, ry]) => Math.hypot(x - rx, y - ry) < 6)]);

    // Membran, Wand, Plasma (zuletzt geprüft)
    hits.push(['membran', (x, y) => inside(x, y, -6) && !inside(x, y, 7)]);
    if (plant) hits.push(['wand', (x, y) => x > X(-1) - 14 && x < X(1) + 14 && y > Y(-1) - 14 && y < Y(1) + 14 && !inside(x, y, -6)]);
    hits.push(['plasma', (x, y) => inside(x, y, 7)]);
    CELL.hits = hits;

    // Beschriftung
    const tag = (txt, x, y, strong) => {
      ctx.font = `${strong ? 500 : 400} ${narrow ? 10 : 11}px ${MONO}`;
      const tw = ctx.measureText(txt).width, px = clamp(x - tw / 2 - 5, 2, w - tw - 12);
      roundRect(ctx, px, y - 11, tw + 10, 16, 8);
      ctx.fillStyle = C.surface; ctx.globalAlpha = .88; ctx.fill(); ctx.globalAlpha = 1;
      if (strong) { ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(txt, px + 5, y + 1);
    };
    const spots = {
      kern: [kx, ky + 4], er: [kx + erR[2] * Math.cos(.2) + 8, ky + erR[2] * Math.sin(.2) - 2],
      golgi: [gx, gy - gs * .3 - 6], mito: plant ? [X(L.mito[2][0]), Y(L.mito[2][1]) - mW - 8] : [X(L.mito[0][0]), Y(L.mito[0][1]) + mW + 14],
      ribo: plant ? [X(.75), Y(.82)] : [X(-.15), Y(.74)], membran: plant ? [X(-.2), Y(-1) + 10] : [cx, Y(-1) - 4],
      plasma: plant ? [X(-.62), Y(.05)] : [X(-.2), Y(.38)],
      wand: [X(.55), Y(-1) - 8], chloro: plant ? [X(L.chloro[1][0]), Y(L.chloro[1][1]) + cW + 15] : [0, 0],
      vak: L.vak ? [X(L.vak[0]), Y(L.vak[1])] : [0, 0],
    };
    const ids = Object.keys(ORG).filter(id => plant || !['wand', 'chloro', 'vak'].includes(id));
    if (CELL.city) ids.forEach(id => { if (id !== CELL.sel) tag(ORG[id].city, ...spots[id], false); });
    const so = ORG[CELL.sel];
    tag(CELL.city ? so.city : so.name, ...spots[CELL.sel], true);

    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(plant ? 'Pflanzenzelle, schematisch' : 'Tierzelle, schematisch', 12, 16);
    ctx.textAlign = 'right';
    ctx.fillText(plant ? 'rund 10 bis 100 µm' : 'rund 10 bis 30 µm', w - 12, 16);
  };

  /* ---------- Teil 3: Würfel ---------- */
  const cubeCv = $('#cubeCv');
  const CU = { a: 2, split: false, show: 2 };
  const updCube = () => {
    const a = CU.a;
    $('#aIn').value = a; $('#aOut').textContent = String(a);
    const S = CU.split ? 12 * a * a : 6 * a * a, V = a * a * a;
    $('#uS').textContent = fmt(S, 0); $('#uV').textContent = fmt(V, 0);
    $('#uR').textContent = fmt(S / V, 1);
    $('#uSf').textContent = CU.split ? '8 × 6 × (Kante/2)²' : '6 × Kante²';
    $('#uVf').textContent = CU.split ? 'gleich viel wie vorher' : 'Kante³';
    $('#uRf').textContent = CU.split ? '12 ÷ Kante' : '6 ÷ Kante';
    const ok = S >= V;
    $('#cubeStatus').textContent = CU.split
      ? `Geteilt: gleich viel Inhalt, aber doppelt so viel Oberfläche. ${ok ? 'Alle Zellen sind versorgt.' : 'Immer noch zu wenig. Teile noch einmal (Kante kleiner).'}`
      : a <= 3 ? 'Klein: viel Oberfläche für wenig Inhalt. Mehr als genug Nachschub.'
      : ok ? 'Es reicht noch knapp. Mach den Würfel noch grösser.'
      : 'Zu gross: Der Bedarf im Inneren wächst schneller als die Oberfläche. Die Zelle wird nicht mehr satt. Teil sie!';
  };
  $('#aIn').addEventListener('input', e => { CU.a = +e.target.value; updCube(); });
  $('#splitBtn').addEventListener('click', () => {
    CU.split = !CU.split;
    $('#splitBtn').textContent = CU.split ? 'Wieder eine Zelle' : 'In 8 Zellen teilen';
    updCube();
  });
  updCube();

  const drawCube = dt => {
    const { ctx, w, h } = fit(cubeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    CU.show = reduced ? CU.a : CU.show + (CU.a - CU.show) * Math.min(1, dt * 8);
    const a = CU.show;
    // Würfel links
    const left = w * (narrow ? .54 : .52);
    const u = Math.min(left * .9 / (10 * 1.732), (h - 90) / 20);
    const c30 = Math.cos(Math.PI / 6), s30 = .5;
    const ox = left / 2, oy = h - 60;
    const P = (i, j, k, bx, by) => [bx + (i - j) * c30 * u, by + (i + j) * s30 * u - k * u];
    const cube = (x0, y0, z0, e, bx, by) => {
      const p = (i, j, k) => P(x0 + i, y0 + j, z0 + k, bx, by);
      const face = (pts, alpha) => {
        ctx.beginPath(); pts.forEach((q, n) => n ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.closePath();
        ctx.fillStyle = C.surface; ctx.fill();
        ctx.fillStyle = C.accent; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2; ctx.stroke();
      };
      // oben, links (j=e), rechts (i=e)
      face([p(0, 0, e), p(e, 0, e), p(e, e, e), p(0, e, e)], .85);
      face([p(0, e, 0), p(e, e, 0), p(e, e, e), p(0, e, e)], .55);
      face([p(e, 0, 0), p(e, e, 0), p(e, e, e), p(e, 0, e)], .35);
      // Rasterlinien auf den Flächen, eine Einheit
      if (u * 1 >= 6 && e >= 1.5) {
        ctx.strokeStyle = C.fg; ctx.globalAlpha = .18; ctx.lineWidth = 1;
        for (let t = 1; t < e - .01; t++) {
          ctx.beginPath();
          ctx.moveTo(...p(t, 0, e)); ctx.lineTo(...p(t, e, e)); ctx.moveTo(...p(0, t, e)); ctx.lineTo(...p(e, t, e));
          ctx.moveTo(...p(t, e, 0)); ctx.lineTo(...p(t, e, e)); ctx.moveTo(...p(0, e, t)); ctx.lineTo(...p(e, e, t));
          ctx.moveTo(...p(e, t, 0)); ctx.lineTo(...p(e, t, e)); ctx.moveTo(...p(e, 0, t)); ctx.lineTo(...p(e, e, t));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };
    // Basis so, dass der Würfel unten in der Mitte steht
    const bx = ox, by = oy - a * u;   // die vordere untere Ecke liegt immer auf derselben Höhe
    if (CU.split) {
      const e = a / 2, gp = Math.max(.2, a * .04);
      const order = [];
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) order.push([i, j, k]);
      order.sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2]));
      order.forEach(([i, j, k]) => cube(i * (e + gp) - gp / 2, j * (e + gp) - gp / 2, k * (e + gp), e, bx, by));
    } else cube(0, 0, 0, a, bx, by);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(CU.split ? `8 Würfel, Kante ${fmt(CU.a / 2, 1)}` : `Kante ${CU.a}`, ox, h - 16);

    // Balken rechts
    const A = CU.a, S = CU.split ? 12 * A * A : 6 * A * A, V = A * A * A;
    const rx0 = left + (narrow ? 4 : 20), rx1 = w - 14, bw = Math.min(46, (rx1 - rx0) * .26);
    const top = 72, bot = h - 74, mx = Math.max(S, V);
    const bars = [[S, narrow ? 'Nachschub' : 'Nachschub', 'Oberfläche', C.good], [V, 'Bedarf', 'Volumen', C.bad]];
    const span = rx1 - rx0;
    bars.forEach(([val, l1, l2, col], i) => {
      const x = rx0 + span * (i ? .76 : .26) - bw / 2;
      const hh = (bot - top) * val / mx;
      ctx.fillStyle = C.sunk; ctx.fillRect(x, top, bw, bot - top);
      ctx.fillStyle = col; ctx.fillRect(x, bot - hh, bw, hh);
      ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
      ctx.fillText(fmt(val, 0), x + bw / 2, bot - hh - 6 < top + 2 ? top - 6 : bot - hh - 6);
      ctx.font = `10px ${MONO}`; ctx.fillText(l1, x + bw / 2, bot + 16);
      ctx.fillStyle = C.muted; ctx.fillText(l2, x + bw / 2, bot + 29);
    });
    const sup = Math.min(1, S / V);
    ctx.textAlign = 'center'; ctx.font = `500 ${narrow ? 14 : 16}px ${MONO}`;
    ctx.fillStyle = sup >= 1 ? C.good : C.bad;
    ctx.fillText(`versorgt: ${fmt(sup * 100, 0)} %`, rx0 + span / 2, 26);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'Modell, vereinfacht' : 'Modell: 1 Fläche liefert für 1 Volumen', rx0 + span / 2, 44);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('zelle', 4, {
    countLock: () => { P1.on = true; $('#rateIn').disabled = false; $$('#countSel button').forEach(b => b.disabled = false); },
    cellLock: () => { CELL.on = true; $('#cityBtn').disabled = false; $$('#cellSel button').forEach(b => b.disabled = false); },
    cubeLock: () => { ['#aIn', '#splitBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawCount(dt); drawCell(dt); drawCube(dt); });
})();
