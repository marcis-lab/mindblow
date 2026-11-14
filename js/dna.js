/* mindblow – Lektion DNA */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben für die vier Basen (gut lesbar mit weisser Schrift, hell und dunkel)
  const BASE = { A: '#2f7fd0', T: '#d98a1f', G: '#2e9a5a', C: '#c8475a' };
  const PAIR = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const BASES = ['A', 'T', 'G', 'C'];
  const HISTONE = '#8a6fbf';

  const tile = (ctx, x, y, w, h, b, alpha = 1, flash = 0) => {
    ctx.globalAlpha = alpha;
    roundRect(ctx, x, y, w, h, Math.min(8, w * .22));
    ctx.fillStyle = BASE[b]; ctx.fill();
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${.55 * flash})`; ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(Math.min(18, w * .55))}px ${MONO}`;
    ctx.fillText(b, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  };

  /* ---------- Teil 1: Der genetische Code ---------- */
  // Standard-Code, Reihenfolge der Basen T, C, A, G (so liest man ihn in jeder Codon-Tabelle)
  const AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  const IDX = { T: 0, C: 1, A: 2, G: 3 };
  const NAME = {
    F: ['Phe', 'Phenylalanin'], L: ['Leu', 'Leucin'], S: ['Ser', 'Serin'], Y: ['Tyr', 'Tyrosin'], C: ['Cys', 'Cystein'],
    W: ['Trp', 'Tryptophan'], P: ['Pro', 'Prolin'], H: ['His', 'Histidin'], Q: ['Gln', 'Glutamin'], R: ['Arg', 'Arginin'],
    I: ['Ile', 'Isoleucin'], M: ['Met', 'Methionin'], T: ['Thr', 'Threonin'], N: ['Asn', 'Asparagin'], K: ['Lys', 'Lysin'],
    V: ['Val', 'Valin'], A: ['Ala', 'Alanin'], D: ['Asp', 'Asparaginsäure'], E: ['Glu', 'Glutaminsäure'], G: ['Gly', 'Glycin'],
    '*': ['Stopp', 'Stopp'],
  };
  const AACOL = {};
  'FLSYCWPHQRIMTNKVADEG'.split('').forEach((a, i) => { AACOL[a] = `hsl(${(i * 137) % 360} 45% 55%)`; });
  const codonAA = c => AA[IDX[c[0]] * 16 + IDX[c[1]] * 4 + IDX[c[2]]];
  const ORIG = 'ATGCATGAGTTCTGGTAA';
  const translate = s => {
    const out = [];
    if (s.slice(0, 3) !== 'ATG') return { aa: out, stop: -1, noStart: true };
    for (let i = 0; i + 3 <= s.length; i += 3) {
      const a = codonAA(s.slice(i, i + 3));
      if (a === '*') return { aa: out, stop: i / 3 };
      out.push(a);
    }
    return { aa: out, stop: -1 };
  };
  const ORIG_T = translate(ORIG);
  const T1 = { seq: ORIG, shifted: false, flash: new Array(18).fill(0), rects: [], on: false };
  const NEXT = { A: 'T', T: 'G', G: 'C', C: 'A' };

  const updCode = msg => {
    const t = translate(T1.seq), o = ORIG_T.aa;
    $('#cLen').textContent = `${t.aa.length}${t.stop < 0 && !t.noStart ? '+' : ''} Bausteine`;
    let same = 0;
    for (let i = 0; i < o.length; i++) if (t.aa[i] === o[i]) same++;
    $('#cSame').textContent = `${same} von ${o.length}`;
    let eff;
    if (T1.seq === ORIG) eff = 'keine';
    else if (t.noStart) eff = 'Start fehlt';
    else if (T1.shifted) eff = 'Raster verschoben';
    else if (t.stop >= 0 && t.aa.length < o.length) eff = 'Stopp zu früh';
    else if (t.stop < 0) eff = 'Stopp fehlt';
    else if (same === o.length) eff = 'stumm';
    else eff = `${o.length - same} anders`;
    $('#cEffect').textContent = eff;
    const exp = {
      'keine': 'Das ist die Originalfolge: Start (ATG), vier Bausteine, dann Stopp.',
      'Start fehlt': 'Ohne Startsignal ATG fängt die Zelle hier gar nicht an zu lesen (vereinfacht). Es entsteht kein Eiweiss.',
      'Raster verschoben': 'Ein Buchstabe mehr verschiebt alle folgenden Dreiergruppen. Ab da liest die Zelle lauter andere Wörter. Meist ein schwerer Fehler.',
      'Stopp zu früh': 'Die Mutation hat ein Stopp-Codon erzeugt. Die Kette bricht ab, das Eiweiss bleibt unfertig.',
      'Stopp fehlt': 'Das Stopp ist weg. Die Zelle würde einfach weiterlesen, über das Ende des Gens hinaus.',
      'stumm': 'Ein Buchstabe ist anders, aber die Dreiergruppe bedeutet noch dieselbe Aminosäure. Eine stumme Mutation: Das Eiweiss bleibt gleich.',
    };
    $('#codeStatus').textContent = msg || exp[eff] || 'Eine Aminosäure ist anders. Das kann harmlos sein oder das Eiweiss stark verändern, je nachdem, wo sie sitzt.';
  };
  const setBase = (i, b) => { T1.seq = T1.seq.slice(0, i) + b + T1.seq.slice(i + 1); T1.flash[i] = 1; };
  const codeCv = $('#codeCv');
  codeCv.addEventListener('pointerdown', e => {
    if (!T1.on) return;
    const r = codeCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = T1.rects.findIndex(([rx, ry, rw, rh]) => x >= rx - 2 && x <= rx + rw + 2 && y >= ry - 4 && y <= ry + rh + 4);
    if (hit < 0) return;
    setBase(hit, NEXT[T1.seq[hit]]); updCode();
  });
  $('#mutBtn').addEventListener('click', () => {
    const i = 3 + Math.floor(Math.random() * 15);
    const opts = BASES.filter(b => b !== T1.seq[i]);
    setBase(i, opts[Math.floor(Math.random() * 3)]); updCode();
  });
  $('#insBtn').addEventListener('click', () => {
    const i = 4 + Math.floor(Math.random() * 10), b = BASES[Math.floor(Math.random() * 4)];
    T1.seq = (T1.seq.slice(0, i) + b + T1.seq.slice(i)).slice(0, 18);
    T1.shifted = true; T1.flash.fill(0); T1.flash[i] = 1;
    updCode();
    $('#codeStatus').textContent = `Ein ${b} wurde an Stelle ${i + 1} eingefügt. Alle Dreiergruppen dahinter rutschen um eins weiter, und die Zelle liest lauter andere Wörter (der letzte Buchstabe fällt hier aus dem Bild).`;
  });
  $('#origBtn').addEventListener('click', () => { T1.seq = ORIG; T1.shifted = false; T1.flash.fill(.6); updCode(); });
  updCode('Tippe auf einen Buchstaben: A wird zu T, T zu G, G zu C, C zu A.');

  const drawCode = dt => {
    const { ctx, w, h } = fit(codeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const t = translate(T1.seq);
    const pad = 14, cgap = narrow ? 12 : 18, gap = 3;
    const tw = Math.min(46, (w - 2 * pad - 2 * cgap - 6 * gap) / 9), th = Math.min(46, tw * 1.25);
    const rowW = 9 * tw + 6 * gap + 2 * cgap, x0 = (w - rowW) / 2;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'DNA, gelesen in Dreiergruppen' : 'DNA-Folge, gelesen in Dreiergruppen (Codons)', x0, 24);
    T1.rects = [];
    for (let k = 0; k < 6; k++) {
      const row = Math.floor(k / 3), col = k % 3;
      const cx = x0 + col * (3 * tw + 2 * gap + cgap), cy = 40 + row * (th + 74);
      const dead = (t.noStart) || (t.stop >= 0 && k > t.stop);
      for (let j = 0; j < 3; j++) {
        const i = k * 3 + j, bx = cx + j * (tw + gap);
        T1.rects[i] = [bx, cy, tw, th];
        if (!reduced) T1.flash[i] = Math.max(0, T1.flash[i] - dt * 1.5); else T1.flash[i] = 0;
        tile(ctx, bx, cy, tw, th, T1.seq[i], dead ? .35 : 1, T1.flash[i]);
      }
      // Aminosäure unter dem Codon
      const a = codonAA(T1.seq.slice(k * 3, k * 3 + 3));
      const cw = 3 * tw + 2 * gap, py = cy + th + 8, ph = 26;
      const changed = !t.noStart && k < ORIG_T.aa.length + 1 && a !== codonAA(ORIG.slice(k * 3, k * 3 + 3));
      ctx.globalAlpha = dead ? .35 : 1;
      roundRect(ctx, cx, py, cw, ph, 13);
      ctx.fillStyle = a === '*' ? C.bad : C.sunk; ctx.fill();
      if (changed && !dead) { ctx.strokeStyle = C.glow; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = a === '*' ? '#fff' : C.fg; ctx.textAlign = 'center';
      ctx.font = `500 ${narrow ? 12 : 13}px ${MONO}`;
      ctx.fillText(NAME[a][0], cx + cw / 2, py + 17);
      if (!narrow || w > 380) {
        ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
        const nm = k === 0 && a === 'M' && !t.noStart ? 'Start' : NAME[a][1];
        ctx.fillText(nm.length > 12 && narrow ? NAME[a][0] : nm, cx + cw / 2, py + ph + 13);
      }
      ctx.globalAlpha = 1;
    }
    // Die entstandene Eiweiss-Kette
    const yC = h - 44;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(t.noStart ? 'Kein Start: kein Eiweiss' : t.stop < 0 ? 'Eiweiss-Kette (läuft weiter …)' : 'Eiweiss-Kette', x0, yC - 22);
    const n = t.aa.length, r = Math.min(16, narrow ? 15 : 18);
    const step = Math.min(r * 2.6, (rowW - 2 * r) / Math.max(1, n));
    ctx.strokeStyle = C.line; ctx.lineWidth = 3;
    if (n > 1) { ctx.beginPath(); ctx.moveTo(x0 + r, yC); ctx.lineTo(x0 + r + (n - 1) * step, yC); ctx.stroke(); }
    for (let i = 0; i < n; i++) {
      const ax = x0 + r + i * step, a = t.aa[i];
      ctx.beginPath(); ctx.arc(ax, yC, r, 0, TAU); ctx.fillStyle = AACOL[a]; ctx.fill();
      if (a !== ORIG_T.aa[i]) { ctx.strokeStyle = C.bad; ctx.lineWidth = 2.5; ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `600 ${r < 16 ? 9 : 10}px ${MONO}`;
      ctx.fillText(NAME[a][0], ax, yC + 3.5);
    }
    if (n === 0) { ctx.strokeStyle = C.line; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yC); ctx.lineTo(x0 + rowW, yC); ctx.stroke(); ctx.setLineDash([]); }
  };

  /* ---------- Teil 2: Länge und Verpackung ---------- */
  const packCv = $('#packCv');
  const STAGES = [
    ['2 nm', 'nackter Doppelstrang', 'Stufe 1: der nackte Doppelstrang. So dünn, dass ihn kein Lichtmikroskop zeigt.'],
    ['rund 11 nm', 'Perlenkette (Nukleosomen)', 'Stufe 2: Die DNA wickelt sich knapp zweimal um je eine Spule aus Histonen. Das sieht aus wie eine Perlenkette.'],
    ['rund 30 nm', 'dichte Faser (vereinfacht)', 'Stufe 3: Die Perlen rücken eng zusammen. Wie regelmässig diese Faser in der Zelle wirklich ist, erforschen Fachleute noch.'],
    ['rund 300 nm', 'Schleifen', 'Stufe 4: Die Faser legt sich in Schleifen, die an einem Gerüst hängen. Abschnitte, die gerade gelesen werden, sind lockerer.'],
    ['rund 1\'400 nm', 'Chromosom vor der Teilung', 'Stufe 5: Nur vor einer Zellteilung wird alles so dicht gepackt. Jetzt sieht man das Chromosom im Mikroskop: zwei gleiche Hälften, eben frisch kopiert.'],
  ];
  const SCALES = [
    { d: 0.2e-3, name: 'Nähfaden', cmp: 'etwa Luftlinie Basel bis Lugano', sh: 'wie Basel bis Lugano' },
    { d: 2e-3, name: 'Spaghetti', cmp: 'etwa so weit wie Zürich bis Moskau', sh: 'wie Zürich bis Moskau' },
    { d: 2e-2, name: 'Gartenschlauch', cmp: 'halb um die ganze Erde', sh: 'halb um die Erde' },
  ];
  const P2 = { stage: 0, fade: 1, sc: 0, time: 0 };
  const lenStr = m => m >= 1000 ? `${fmt(m / 1000, 0)} km` : m >= 1 ? `${fmt(m, 0)} m` : `${fmt(m * 100, 0)} cm`;
  const updPack = () => {
    const s = STAGES[P2.stage], sc = SCALES[P2.sc], f = sc.d / 2e-9;
    $('#packIn').value = P2.stage; $('#packOut').textContent = `Stufe ${P2.stage + 1}`;
    $('#pThick').textContent = s[0]; $('#pStage').textContent = s[1];
    $('#pLen').textContent = lenStr(2 * f); $('#pCore').textContent = lenStr(6e-6 * f);
    $$('#scaleSel button').forEach(b => b.classList.toggle('active', +b.dataset.s === P2.sc));
  };
  $('#packIn').addEventListener('input', e => { P2.stage = +e.target.value; P2.fade = reduced ? 1 : 0; updPack(); $('#packStatus').textContent = STAGES[P2.stage][2]; });
  $$('#scaleSel button').forEach(b => b.addEventListener('click', () => {
    P2.sc = +b.dataset.s; updPack();
    const sc = SCALES[P2.sc], f = sc.d / 2e-9;
    $('#packStatus').textContent = `So dick wie ein ${sc.name} (${sc.d >= 1e-2 ? fmt(sc.d * 100, 0) + ' cm' : fmt(sc.d * 1000, 1) + ' mm'}): Die DNA wäre ${lenStr(2 * f)} lang, ${sc.cmp}. Und der Zellkern hätte nur ${lenStr(6e-6 * f)} Durchmesser.`;
  }));
  updPack();

  const helix = (ctx, x0, x1, y, amp, per, ph, thin) => {
    for (let x = x0; x <= x1; x += per / 5) {
      const a = Math.sin((x - x0) / per * TAU + ph), b = Math.sin((x - x0) / per * TAU + ph + Math.PI);
      const i = Math.floor((x - x0) / (per / 5));
      ctx.strokeStyle = BASE[BASES[i % 4]]; ctx.lineWidth = thin ? 1.5 : 2.5;
      ctx.beginPath(); ctx.moveTo(x, y + a * amp); ctx.lineTo(x, y + b * amp); ctx.stroke();
    }
    for (const off of [0, Math.PI]) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = thin ? 1.5 : 2.5; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin((x - x0) / per * TAU + ph + off) * amp; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
    }
  };
  const bead = (ctx, x, y, r) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = HISTONE; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = Math.max(1, r * .22);
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.12, r * .55, -.5, 0, TAU); ctx.stroke();
  };
  const fiber = (ctx, pts, r) => {
    // dichte Faser: Perlen eng entlang eines Pfads
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay);
      for (let s = acc; s < L; s += r * 1.1) { const k = s / L; bead(ctx, lerp(ax, bx, k), lerp(ay, by, k), r); }
      acc = (acc - L) % (r * 1.1); if (acc < 0) acc += r * 1.1;
    }
  };
  const drawPack = dt => {
    const { ctx, w, h } = fit(packCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    if (!reduced) { P2.time += dt; P2.fade = Math.min(1, P2.fade + dt * 2.5); }
    const ph = reduced ? 0 : P2.time * 1.2;
    const top = 30, H = 210, cy = top + H / 2, mx = 24;
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`${STAGES[P2.stage][1]} · ${STAGES[P2.stage][0]}`, 14, 22);
    ctx.globalAlpha = P2.fade;
    const s = P2.stage;
    if (s === 0) {
      helix(ctx, mx, w - mx, cy, 34, Math.min(170, w * .42), ph, false);
    } else if (s === 1) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = mx; x <= w - mx; x += 2) { const yy = cy + Math.sin(x / 38 + ph * .5) * 18; x === mx ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
      const n = Math.max(4, Math.floor((w - 2 * mx) / 62));
      for (let i = 0; i < n; i++) {
        const x = mx + 30 + i * (w - 2 * mx - 60) / (n - 1);
        bead(ctx, x, cy + Math.sin(x / 38 + ph * .5) * 18, 16);
      }
    } else if (s === 2) {
      const pts = [];
      for (let x = mx; x <= w - mx; x += 8) pts.push([x, cy + Math.sin(x / 60 + ph * .3) * 26]);
      for (const off of [-11, 11]) fiber(ctx, pts.map(([x, y]) => [x, y + off]), 9);
    } else if (s === 3) {
      const n = narrow ? 6 : 9;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, cy); ctx.lineTo(w - mx, cy); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const x = mx + 20 + i * (w - 2 * mx - 40) / (n - 1), up = i % 2 ? -1 : 1, L = 70 + 14 * Math.sin(i * 1.7 + ph * .4);
        const pts = [];
        for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI; pts.push([x + Math.sin(a * 2) * 14 * up, cy + up * Math.sin(a) * L]); }
        fiber(ctx, pts, 4.5);
      }
    } else {
      // Chromosom: zwei Schwesterchromatiden, in der Mitte (Zentromer) verbunden
      const ch = Math.min(H * .76, 165), cw = ch * .18;
      for (const sg of [-1, 1]) {
        const P = [];
        for (let k = 0; k <= 60; k++) {
          const t = k / 60, y = cy - ch / 2 + t * ch;
          const r = cw * .5 * (1 - .45 * Math.exp(-Math.pow((t - .5) * 6, 2)));
          P.push([w / 2 + sg * (r * .85 + Math.abs(t - .5) * cw * .9), y, r]);
        }
        ctx.fillStyle = HISTONE;
        for (const [x, y, r] of P) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        // aufgewickelte Faser andeuten
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let k = 0; k <= 400; k++) {
          const t = k / 400, j = t * 60, a = Math.floor(j), b = Math.min(60, a + 1), f = j - a;
          const x = lerp(P[a][0], P[b][0], f), y = lerp(P[a][1], P[b][1], f), r = lerp(P[a][2], P[b][2], f);
          const xx = x + Math.sin(t * 90 + ph * .3) * r * .8;
          k ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y);
        }
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(w / 2, cy, 5, 0, TAU); ctx.fillStyle = C.glow; ctx.fill();
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w / 2 + 8, cy); ctx.lineTo(w / 2 + cw * 1.3, cy); ctx.stroke();
      ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      ctx.fillText('Zentromer', w / 2 + cw * 1.3 + 4, cy + 3);
      ctx.textAlign = 'right';
      ctx.fillText(narrow ? 'Hälfte 1' : 'Chromatid 1', w / 2 - cw * 1.5, cy - ch * .35);
      ctx.textAlign = 'left';
      ctx.fillText(narrow ? 'Hälfte 2' : 'Chromatid 2', w / 2 + cw * 1.5, cy - ch * .35);
    }
    ctx.globalAlpha = 1;

    // Massstab-Vergleich: Zellkern im gleichen Massstab neben einem Menschen (1,7 m)
    const sc = SCALES[P2.sc], f = sc.d / 2e-9, core = 6e-6 * f, len = 2 * f;
    const y0 = top + H + 16, y1 = h - 14, sh = y1 - y0;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, y0 - 6); ctx.lineTo(w - 14, y0 - 6); ctx.stroke();
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? `Massstab: DNA dick wie ${sc.name}` : `Im Massstab: DNA so dick wie ein ${sc.name}`, 14, y0 + 10);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 12 : 13}px ${MONO}`;
    ctx.fillText(`Faden ${lenStr(len)} lang`, 14, y0 + 32);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? sc.sh : sc.cmp, 14, y0 + 50);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 12 : 13}px ${MONO}`;
    ctx.fillText(`Kern ${lenStr(core)} gross`, 14, y0 + 72);
    // Bild: Kern-Kugel und Mensch
    const maxH = sh - 22, unit = maxH / Math.max(core, 1.7), base = y1 - 2;
    const px = w - (narrow ? 34 : 50), kr = core * unit / 2, kx = px - 16 - kr - (narrow ? 0 : 10);
    ctx.beginPath(); ctx.arc(kx, base - kr, Math.max(1.5, kr), 0, TAU);
    ctx.fillStyle = 'rgba(138,111,191,.25)'; ctx.fill(); ctx.strokeStyle = HISTONE; ctx.lineWidth = 2; ctx.stroke();
    const ph2 = 1.7 * unit;
    ctx.strokeStyle = C.fg; ctx.lineWidth = Math.max(1, ph2 * .06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(px, base - ph2 * .9, ph2 * .09, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, base - ph2 * .8); ctx.lineTo(px, base - ph2 * .4);
    ctx.moveTo(px, base - ph2 * .4); ctx.lineTo(px - ph2 * .12, base); ctx.moveTo(px, base - ph2 * .4); ctx.lineTo(px + ph2 * .12, base);
    ctx.moveTo(px - ph2 * .16, base - ph2 * .65); ctx.lineTo(px + ph2 * .16, base - ph2 * .65); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    if (ph2 > 30) ctx.fillText('1,7 m', px, base - ph2 - 4);
    else ctx.fillText('Mensch', px, base - ph2 - 4);
  };

  /* ---------- Teil 3: Reissverschluss und Kopie ---------- */
  const zipCv = $('#zipCv');
  const N = 10;
  const Z = { tpl: '', fill: [], open: 0, err: 0, errFlash: 0, auto: false, autoT: 0, on: false, pop: [] };
  const newSeq = () => {
    Z.tpl = Array.from({ length: N }, () => BASES[Math.floor(Math.random() * 4)]).join('');
    Z.fill = new Array(N).fill(''); Z.pop = new Array(N).fill(0); Z.err = 0; Z.auto = false;
  };
  newSeq();
  const openCount = () => Math.floor(Z.open * N + 1e-6);
  const nextSlot = () => { const oc = openCount(); for (let i = 0; i < oc; i++) if (!Z.fill[i]) return i; return -1; };
  const doneCount = () => Z.fill.filter(Boolean).length;
  const updZip = msg => {
    $('#zipIn').value = Math.round(Z.open * 100); $('#zipOut').textContent = `${Math.round(Z.open * 100)} %`;
    $('#zDone').textContent = `${doneCount()} von ${N}`; $('#zErr').textContent = String(Z.err);
    if (msg) { $('#zipStatus').textContent = msg; return; }
    const d = doneCount(), ns = nextSlot();
    $('#zipStatus').textContent = d === N
      ? 'Fertig. Der neue Strang passt genau. Gleichzeitig wird auch der alte untere Strang ergänzt: Aus einer DNA werden zwei gleiche.'
      : Z.open === 0 ? 'Öffne zuerst den Reissverschluss.'
      : ns < 0 ? 'Öffne den Reissverschluss weiter, um mehr Buchstaben freizulegen.'
      : `Welcher Partner passt zum ${Z.tpl[ns]} an Stelle ${ns + 1}?`;
  };
  $('#zipIn').addEventListener('input', e => { Z.open = +e.target.value / 100; updZip(); });
  $$('#baseSel button').forEach(b => b.addEventListener('click', () => {
    const i = nextSlot();
    if (i < 0) { updZip(); return; }
    const want = PAIR[Z.tpl[i]];
    if (b.dataset.b === want) { Z.fill[i] = want; Z.pop[i] = 1; updZip(); }
    else { Z.err++; Z.errFlash = 1; updZip(`${b.dataset.b} passt nicht zu ${Z.tpl[i]}. Denk an die Regel: A mit T, G mit C.`); }
  }));
  $('#autoBtn').addEventListener('click', () => {
    Z.auto = true; Z.autoT = 0;
    if (reduced) { Z.open = 1; for (let i = 0; i < N; i++) Z.fill[i] = PAIR[Z.tpl[i]]; Z.auto = false; }
    updZip('Ein Enzym (die DNA-Polymerase) läuft den offenen Strang entlang und hängt zu jedem Buchstaben den passenden Partner an.');
  });
  $('#newBtn').addEventListener('click', () => { newSeq(); Z.open = 0; updZip(); });
  updZip();

  const drawZip = dt => {
    const { ctx, w, h } = fit(zipCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    if (Z.auto) {
      Z.autoT += dt;
      if (Z.open < 1) Z.open = Math.min(1, Z.open + dt * .5);
      if (Z.autoT > .3) { const i = nextSlot(); if (i >= 0) { Z.fill[i] = PAIR[Z.tpl[i]]; Z.pop[i] = 1; Z.autoT = 0; } }
      if (doneCount() === N) Z.auto = false;
      updZip(Z.auto ? $('#zipStatus').textContent : undefined);
    }
    const pad = 14, gap = narrow ? 4 : 6;
    const tw = Math.min(44, (w - 2 * pad - (N - 1) * gap) / N), th = Math.min(40, tw * 1.15);
    const x0 = (w - (N * tw + (N - 1) * gap)) / 2;
    const yT = 46, yClosed = yT + th + 4, yNew = yT + th + 30, yOld = h - th - 30;
    ctx.font = `11px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Vorlage (alter Strang)' : 'Vorlage: der alte obere Strang', x0, yT - 22);
    // Rückgrat oben
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 - 4, yT - 6); ctx.lineTo(x0 + N * tw + (N - 1) * gap + 4, yT - 6); ctx.stroke();
    const ns = nextSlot();
    if (!reduced) { Z.errFlash = Math.max(0, Z.errFlash - dt * 2); }
    const oc = Z.open * N;
    for (let i = 0; i < N; i++) {
      const x = x0 + i * (tw + gap), k = clamp(oc - i, 0, 1), e = k * k * (3 - 2 * k);
      tile(ctx, x, yT, tw, th, Z.tpl[i]);
      // alter Partnerstrang wandert nach unten
      const yo = lerp(yClosed, yOld, e);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - gap / 2, yo + th + 5); ctx.lineTo(x + tw + gap / 2, yo + th + 5); ctx.stroke();
      tile(ctx, x, yo, tw, th, PAIR[Z.tpl[i]], lerp(1, .45, e));
      // neuer Strang
      if (k > 0) {
        ctx.globalAlpha = e;
        if (Z.fill[i]) {
          if (!reduced) Z.pop[i] = Math.max(0, Z.pop[i] - dt * 2.5); else Z.pop[i] = 0;
          const s = 1 + .18 * Z.pop[i];
          tile(ctx, x + tw / 2 - tw * s / 2, yNew + th / 2 - th * s / 2, tw * s, th * s, Z.fill[i], e);
          ctx.globalAlpha = e;
          ctx.strokeStyle = C.good; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + tw / 2, yT + th + 2); ctx.lineTo(x + tw / 2, yNew - 2); ctx.stroke();
        } else {
          roundRect(ctx, x, yNew, tw, th, Math.min(8, tw * .22));
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = i === ns ? (Z.errFlash > 0 ? C.bad : C.glow) : C.line; ctx.lineWidth = i === ns ? 2.5 : 1.5; ctx.stroke();
          ctx.setLineDash([]);
          if (i === ns) { ctx.fillStyle = C.glow; ctx.textAlign = 'center'; ctx.font = `600 14px ${MONO}`; ctx.fillText('?', x + tw / 2, yNew + th / 2 + 5); }
        }
        ctx.globalAlpha = 1;
      } else {
        // geschlossen: Wasserstoffbrücken andeuten
        ctx.strokeStyle = C.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + tw / 2, yT + th); ctx.lineTo(x + tw / 2, yo); ctx.stroke();
      }
    }
    if (Z.open > 0) {
      ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      ctx.fillText(narrow ? 'neuer Strang' : 'neuer Strang: hier ergänzen', x0, yNew + th + 16);
      ctx.fillText(narrow ? 'alter Partnerstrang' : 'alter Partnerstrang (wird auch kopiert)', x0, yOld + th + 22);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('dna', 4, {
    codeLock: () => { T1.on = true; ['#mutBtn', '#insBtn', '#origBtn'].forEach(s => $(s).disabled = false); codeCv.style.cursor = 'pointer'; },
    packLock: () => { $('#packIn').disabled = false; $$('#scaleSel button').forEach(b => b.disabled = false); },
    zipLock: () => { Z.on = true; ['#zipIn', '#autoBtn', '#newBtn'].forEach(s => $(s).disabled = false); $$('#baseSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawCode(dt); drawPack(dt); drawZip(dt); });
})();
