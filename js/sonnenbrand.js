/* mindblow – Lektion Sonnenbrand */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const UV_COL = '#9B6BFF';

  // Farbe einer Wellenlänge (sichtbar), UV als Violett
  const wlColor = wl => {
    if (wl < 400) return UV_COL;
    let r = 0, g = 0, b = 0;
    if (wl < 440) { r = (440 - wl) / 60; b = 1; }
    else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl < 510) { g = 1; b = (510 - wl) / 20; }
    else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl < 645) { r = 1; g = (645 - wl) / 65; }
    else r = 1;
    const f = v => Math.round(255 * Math.pow(v, .8));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };
  const band = wl => wl < 315 ? 'UVB' : wl < 400 ? 'UVA' : wl < 450 ? 'Violett' : wl < 495 ? 'Blau' : wl < 570 ? 'Grün' : wl < 590 ? 'Gelb' : wl < 620 ? 'Orange' : 'Rot';
  // Sonnenbrand-Wirkungsspektrum (CIE, Erythem), relativ zu 1
  const erythema = wl => wl <= 298 ? 1 : wl <= 328 ? Math.pow(10, .094 * (298 - wl)) : wl <= 400 ? Math.pow(10, .015 * (140 - wl)) : 0;
  // Fensterglas, vereinfacht: unter 295 nm nichts, ab 335 nm rund 90 Prozent
  const glassT = wl => { const s = clamp((wl - 295) / 40, 0, 1); return .9 * s * s * (3 - 2 * s); };

  /* ---------- Teil 1: Photonen, Glas und DNA ---------- */
  const photonCv = $('#photonCv');
  const P = { wl: 300, int: 3, glass: false, acc: 0, list: [], hits: 0, flashes: [], on: false };
  const updPhoton = () => {
    $('#wlOut').textContent = `${P.wl} nm`;
    $('#intOut').textContent = String(P.int);
    $('#pE').textContent = `${fmt(1240 / P.wl, 2)} eV`;
    $('#pT').textContent = P.glass ? `${fmt(glassT(P.wl) * 100, 0)} %` : '100 %';
    $('#pHits').textContent = String(P.hits);
  };
  const resetHits = () => { P.hits = 0; P.list = []; P.flashes = []; updPhoton(); };
  const photonMsg = () => {
    const b = band(P.wl), e = erythema(P.wl);
    let m = `${b}, ${fmt(1240 / P.wl, 2)} eV pro Photon. `;
    if (e > .2) m += 'Viele Photonen treffen die DNA.';
    else if (e > .002) m += 'Nur ab und zu ein Treffer.';
    else if (P.wl < 400) m += 'Kaum Treffer an der DNA, aber UVA dringt tief in die Haut.';
    else m += 'Kein einziger Treffer, egal wie hell. Nur Wärme.';
    if (P.glass && P.wl < 315) m += ' Das Glas schluckt fast alles.';
    $('#photonStatus').textContent = m;
  };
  $('#wlIn').addEventListener('input', e => { P.wl = +e.target.value; resetHits(); photonMsg(); });
  $('#intIn').addEventListener('input', e => { P.int = +e.target.value; resetHits(); photonMsg(); });
  $$('#glassBtns button').forEach(b => b.addEventListener('click', () => {
    P.glass = b.dataset.glass === '1';
    $$('#glassBtns button').forEach(x => x.classList.toggle('active', x === b));
    resetHits(); photonMsg();
  }));
  updPhoton();

  const drawHelix = (ctx, x, y1, y2, amp, col) => {
    ctx.lineWidth = 2; ctx.strokeStyle = col;
    for (const ph of [0, Math.PI]) {
      ctx.beginPath();
      for (let y = y1; y <= y2; y += 2) {
        const xx = x + amp * Math.sin((y - y1) / 9 + ph);
        y === y1 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1; ctx.globalAlpha = .5;
    for (let y = y1 + 4; y < y2; y += 7) {
      const s = Math.sin((y - y1) / 9);
      ctx.beginPath(); ctx.moveTo(x - amp * s, y); ctx.lineTo(x + amp * s, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const drawPhoton = (dt, now) => {
    const { ctx, w, h } = fit(photonCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    // Spektrum oben
    const sx0 = 14, sx1 = w - 14, sy = 12, sh = small ? 16 : 18;
    const X = wl => sx0 + (sx1 - sx0) * (wl - 280) / (700 - 280);
    for (let wl = 280; wl < 700; wl += 2) {
      ctx.fillStyle = wl < 400 ? UV_COL : wlColor(wl);
      ctx.globalAlpha = wl < 400 ? .25 + .35 * (wl < 315 ? 1 : .5) : .85;
      ctx.fillRect(X(wl), sy, X(wl + 2) - X(wl) + .5, sh);
    }
    ctx.globalAlpha = 1;
    ctx.font = MONO; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText('UVB', (X(280) + X(315)) / 2, sy + sh + 13);
    ctx.fillText('UVA', (X(315) + X(400)) / 2, sy + sh + 13);
    ctx.fillText(small ? 'sichtbar' : 'sichtbares Licht', (X(400) + X(700)) / 2, sy + sh + 13);
    const mx = X(P.wl);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, sy - 4); ctx.lineTo(mx, sy + sh + 4); ctx.stroke();

    // Szene
    const top = sy + sh + 26, bot = h - 14, mid = (top + bot) / 2;
    const sunX = small ? 30 : 46, sunR = small ? 18 : 24;
    const skinX = w - (small ? 70 : 100), glassX = (sunX + skinX) / 2;
    // Sonne
    ctx.fillStyle = C.glow; ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(sunX, mid, sunR * 1.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(sunX, mid, sunR, 0, TAU); ctx.fill();
    // Glas
    if (P.glass) {
      ctx.fillStyle = C.fiber; ctx.globalAlpha = .18; ctx.fillRect(glassX - 5, top + 6, 10, bot - top - 12);
      ctx.globalAlpha = 1; ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.5; ctx.strokeRect(glassX - 5, top + 6, 10, bot - top - 12);
      ctx.fillStyle = C.fiber; ctx.textAlign = 'center'; ctx.fillText('Glas', glassX, bot);
    }
    // Haut
    const sw = w - skinX - 8;
    roundRect(ctx, skinX, top + 4, sw, bot - top - 8, 10);
    ctx.fillStyle = C.copper; ctx.globalAlpha = .18; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1.5; ctx.stroke();
    const dnaX = skinX + sw * .55;
    drawHelix(ctx, dnaX, top + 22, bot - 22, Math.min(9, sw * .14), C.accent);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Haut', skinX + sw / 2, top + 16);
    ctx.fillText('DNA', dnaX, bot - 8);

    // Photonen erzeugen und bewegen (nur wenn freigeschaltet)
    if (P.on) {
      P.acc += dt * P.int * 4;
      while (P.acc >= 1) {
        P.acc -= 1;
        P.list.push({ x: sunX + sunR, y: mid + (Math.random() - .5) * (bot - top - 40), ph: Math.random() * TAU, st: 0, a: 1,
          pass: !P.glass || Math.random() < glassT(P.wl), hit: Math.random() < erythema(P.wl) * .9 });
      }
    }
    const col = wlColor(P.wl), speed = Math.max(160, w * .45);
    const amp = 3, k = TAU / (8 + (P.wl - 280) / 420 * 22); // kurze Wellenlänge, enge Welle (nur Symbol)
    for (const p of P.list) {
      if (p.st === 0) {
        p.x += speed * dt;
        if (P.glass && !p.pass && p.x >= glassX - 4) { p.st = 1; p.x = glassX - 4; }
        if (p.x >= dnaX) {
          p.x = dnaX;
          if (p.hit) { p.st = 2; P.hits++; P.flashes.push({ x: dnaX, y: p.y, t: 0 }); updPhoton(); }
          else p.st = 1;
        }
      } else p.a -= dt * 2.5;
      ctx.globalAlpha = clamp(p.a, 0, 1);
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let j = 0; j <= 14; j++) {
        const xx = p.x - 14 + j, yy = p.y + amp * Math.sin(k * xx + p.ph);
        j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    P.list = P.list.filter(p => p.a > 0);
    // Treffer-Blitze
    for (const f of P.flashes) {
      f.t += dt;
      const r = 4 + f.t * 30;
      ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.globalAlpha = clamp(1 - f.t * 1.4, 0, 1);
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f.x - 5, f.y - 5); ctx.lineTo(f.x + 5, f.y + 5); ctx.moveTo(f.x + 5, f.y - 5); ctx.lineTo(f.x - 5, f.y + 5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    P.flashes = P.flashes.filter(f => f.t < .8);
    if (!P.on) {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText('Wellenlänge wählen, dann schauen', glassX, mid);
    }
  };

  /* ---------- Teil 2: Hauttyp und Sonnencreme ---------- */
  const skinCv = $('#skinCv');
  const MED = [200, 250, 300, 450, 600, 1000];          // minimale Sonnenbranddosis in J/m² (wirksam), Richtwerte
  const SKIN = ['#F4DCC9', '#E9C3A2', '#D3A27A', '#AD7850', '#7B5136', '#4A2F21'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const SPFS = [1, 6, 15, 30, 50];
  const UVI2 = 8, E2 = UVI2 * .025;                     // 1 UV-Index = 0,025 W/m² wirksame Strahlung
  const S = { type: 2, spf: 1, amt: 1, t: 0, running: false, rays: [] };
  const spfEff = () => Math.pow(S.spf, S.amt);          // halbe Menge: etwa die Wurzel des Faktors (vereinfacht)
  const burnSec = () => MED[S.type - 1] * spfEff() / E2;
  const dose = () => S.t * E2 / spfEff() / MED[S.type - 1];
  const dur = s => s >= 3600 ? `${fmt(s / 3600, 1)} h` : `${fmt(s / 60, 0)} min`;
  const updSkin = () => {
    $('#typeOut').textContent = ROMAN[S.type - 1];
    $('#spfOut').textContent = S.spf === 1 ? 'keiner' : `LSF ${S.spf}`;
    $('#sBurn').textContent = burnSec() > 12 * 3600 ? 'über 12 h' : dur(burnSec());
    $('#sThru').textContent = `${fmt(100 / spfEff(), spfEff() > 20 ? 1 : 0)} %`;
    $('#sTime').textContent = dur(S.t);
  };
  const skinReset = () => { S.t = 0; S.running = false; $('#sunBtn').textContent = 'Ab in die Sonne'; updSkin(); };
  $('#typeIn').addEventListener('input', e => {
    S.type = +e.target.value; skinReset();
    $('#skinStatus').textContent = S.type <= 2 ? 'Helle Haut: wenig Melanin, schnell verbrannt.' : S.type <= 4 ? 'Mittlere Haut: mehr Melanin.' : 'Dunkle Haut: viel Melanin, aber auch sie kann verbrennen.';
  });
  $('#spfIn').addEventListener('input', e => {
    S.spf = SPFS[+e.target.value]; skinReset();
    $('#skinStatus').textContent = S.spf === 1 ? 'Ohne Sonnencreme.' : `LSF ${S.spf}: Nur ein ${S.spf}tel kommt durch, wenn du dick genug cremst.`;
  });
  $$('#amountBtns button').forEach(b => b.addEventListener('click', () => {
    S.amt = +b.dataset.amt;
    $$('#amountBtns button').forEach(x => x.classList.toggle('active', x === b));
    skinReset();
    $('#skinStatus').textContent = S.amt < 1 && S.spf > 1
      ? `Halbe Menge: Aus LSF ${S.spf} wird ungefähr LSF ${fmt(spfEff(), 0)}.`
      : 'Dicke Schicht, 2 mg pro cm². So wird der LSF im Labor gemessen.';
  }));
  $('#sunBtn').addEventListener('click', () => {
    if (S.running) { S.running = false; $('#sunBtn').textContent = 'Weiter sonnen'; return; }
    if (dose() >= 2 || S.t >= 12 * 3600) S.t = 0;
    S.running = true; $('#sunBtn').textContent = 'In den Schatten';
    $('#skinStatus').textContent = 'Zeitraffer: Eine Sekunde sind drei Minuten.';
  });
  updSkin();

  const mix = (a, b, t) => {
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
  };
  const melDots = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random() }));

  const drawSkin = dt => {
    if (S.running) {
      S.t += dt * 180;
      if (dose() >= 1 && dose() - dt * 180 * E2 / spfEff() / MED[S.type - 1] < 1)
        $('#skinStatus').textContent = `Nach ${dur(S.t)}: Sonnenbranddosis erreicht. Rot wird die Haut erst einige Stunden später.`;
      if (dose() >= 2 || S.t >= 12 * 3600) { S.running = false; $('#sunBtn').textContent = 'Nochmal'; }
      updSkin();
    }
    const { ctx, w, h } = fit(skinCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const barW = small ? 50 : 70, gx = 12, gw = w - barW - 36;
    const skinTop = h * .52, skinBot = h - 18;
    // Sonne und Strahlen
    ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(gx + 26, 28, 16, 0, TAU); ctx.fill();
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`UV-Index ${UVI2}`, gx + 50, 32);
    const creamH = S.spf > 1 ? (small ? 10 : 12) * S.amt : 0;
    const passFrac = 1 / spfEff();
    const n = small ? 9 : 14, tt = reduced ? 0 : performance.now() / 1000;
    for (let i = 0; i < n; i++) {
      const x = gx + 24 + (gw - 40) * (i + .5) / n;
      const ph = ((tt * .9 + i * .37) % 1);
      const y0 = 54, yEnd = skinTop - creamH;
      ctx.strokeStyle = UV_COL; ctx.lineWidth = 2; ctx.globalAlpha = .7;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -ph * 12;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, yEnd); ctx.stroke();
      // durch die Creme: nur ein Teil der Strahlen
      const through = (i * 0.618) % 1 < passFrac || S.spf === 1;
      if (through) { ctx.beginPath(); ctx.moveTo(x, yEnd); ctx.lineTo(x, skinTop + (skinBot - skinTop) * .45); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // Creme
    if (creamH) {
      ctx.fillStyle = C.surface; ctx.fillRect(gx, skinTop - creamH, gw, creamH);
      ctx.strokeStyle = C.line; ctx.strokeRect(gx, skinTop - creamH, gw, creamH);
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(`Creme LSF ${S.spf}`, gx + gw - 6, skinTop - creamH - 5);
    }
    // Haut mit Rötung
    const d = dose();
    const red = clamp((d - .4) / 1.2, 0, 1) * (S.type >= 5 ? .35 : .75);
    roundRect(ctx, gx, skinTop, gw, skinBot - skinTop, 8);
    ctx.fillStyle = mix(SKIN[S.type - 1], '#D8443A', red); ctx.fill();
    // Melanin-Körnchen
    const nm = Math.round([10, 18, 32, 55, 85, 120][S.type - 1]);
    ctx.fillStyle = '#3B2414'; ctx.globalAlpha = .55;
    for (let i = 0; i < nm; i++) {
      const m = melDots[i];
      ctx.beginPath(); ctx.arc(gx + 6 + m.x * (gw - 12), skinTop + 6 + m.y * (skinBot - skinTop) * .35, 1.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = S.type >= 4 ? '#F1E6DA' : '#3B2414'; ctx.textAlign = 'left';
    ctx.fillText(small ? `Typ ${ROMAN[S.type - 1]}` : `Hauttyp ${ROMAN[S.type - 1]} · Punkte = Melanin`, gx + 8, skinBot - 8);
    // Dosisbalken
    const bx = w - barW - 12, by = 20, bh = h - 50, bw = small ? 18 : 22;
    roundRect(ctx, bx, by, bw, bh, 6); ctx.fillStyle = C.sunk; ctx.fill();
    const fill = clamp(d / 2, 0, 1);
    roundRect(ctx, bx, by + bh * (1 - fill), bw, bh * fill, 6);
    ctx.fillStyle = d >= 1 ? C.bad : C.glow; ctx.fill();
    const y1 = by + bh / 2;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx - 4, y1); ctx.lineTo(bx + bw + 4, y1); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText('rot', bx + bw + 6, y1 + 4);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Dosis', bx + bw / 2, h - 12);
    ctx.fillText(`${fmt(d * 100, 0)} %`, bx + bw / 2, by - 6 < 10 ? 12 : by - 6);
  };

  /* ---------- Teil 3: UV-Index ---------- */
  const uviCv = $('#uviCv');
  const U = { elev: 60, alt: 400, alb: .02 };
  const GROUND = { '0.02': 'Wiese', '0.1': 'Wasser', '0.15': 'Sand', '0.8': 'Neuschnee' };
  // Klarer Himmel (Näherung nach Madronich): UVI ≈ 12,5 · sin(h)^2,42; +10 % pro 1'000 m; Hälfte der Bodenreflexion trifft dich
  const uvi = () => 12.5 * Math.pow(Math.sin(U.elev * Math.PI / 180), 2.42) * (1 + .1 * U.alt / 1000) * (1 + .5 * U.alb);
  const cat = v => v < 3 ? ['niedrig', C.good] : v < 6 ? ['mässig', C.glow] : v < 8 ? ['hoch', C.copper] : v < 11 ? ['sehr hoch', C.bad] : ['extrem', UV_COL];
  const updUvi = () => {
    const v = uvi();
    $('#elevOut').textContent = `${U.elev}°`;
    $('#altOut').textContent = `${fmt(U.alt, 0)} m`;
    $('#uUvi').textContent = fmt(v, 1);
    $('#uCat').textContent = cat(v)[0];
    const s = 250 / (v * .025);
    $('#uBurn').textContent = dur(s);
    $('#uRefl').textContent = `${fmt(U.alb * 100, 0)} %`;
  };
  $('#elevIn').addEventListener('input', e => {
    U.elev = +e.target.value; updUvi();
    $('#uviStatus').textContent = U.elev < 30 ? 'Tiefe Sonne: Das Licht durchquert viel mehr Luft, das UV wird stark geschwächt.' : U.elev > 62 ? 'So hoch steht die Sonne in der Schweiz nur um Mittag im Sommer.' : 'Je höher die Sonne, desto kürzer der Weg durch die Luft.';
  });
  $('#altIn').addEventListener('input', e => { U.alt = +e.target.value; updUvi(); $('#uviStatus').textContent = 'Je höher du stehst, desto weniger Luft liegt über dir.'; });
  $$('#groundBtns button').forEach(b => b.addEventListener('click', () => {
    U.alb = +b.dataset.alb;
    $$('#groundBtns button').forEach(x => x.classList.toggle('active', x === b));
    updUvi();
    $('#uviStatus').textContent = U.alb > .5 ? 'Neuschnee wirft bis 80 % zurück. Die Hälfte davon trifft dich, vereinfacht gerechnet.' : `${GROUND[b.dataset.alb]} wirft nur wenig UV zurück.`;
  }));
  updUvi();

  const drawUvi = () => {
    const { ctx, w, h } = fit(uviCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const scaleH = 34, gy = h - scaleH - 30; // Boden-Grundlinie
    const groundCol = U.alb > .5 ? C.surface : U.alb > .12 ? C.glow : U.alb > .05 ? C.fiber : C.good;
    // Lufthülle: Bänder, die mit der Höhe dünner werden
    const atmTop = 14, atmH = gy - atmTop;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = C.fiber; ctx.globalAlpha = .05 + i * .025;
      ctx.fillRect(0, atmTop + atmH * i / 6, w, atmH / 6 + 1);
    }
    ctx.globalAlpha = 1;
    // Berg mit Person auf Gipfel
    const peakH = (U.alt / 4500) * atmH * .55, px = w * (small ? .62 : .6), py = gy - peakH;
    ctx.beginPath(); ctx.moveTo(px - w * .35, gy); ctx.lineTo(px, py); ctx.lineTo(px + w * .35, gy); ctx.closePath();
    ctx.fillStyle = C.muted; ctx.globalAlpha = .35; ctx.fill(); ctx.globalAlpha = 1;
    // Boden rund um die Person
    const sl = peakH / (w * .35), L = 46;
    ctx.strokeStyle = groundCol; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - L, py + L * sl); ctx.lineTo(px, py); ctx.lineTo(px + L, py + L * sl); ctx.stroke();
    ctx.fillStyle = groundCol; ctx.globalAlpha = .8; ctx.fillRect(0, gy, w, 5); ctx.globalAlpha = 1;
    if (U.alb > .5) { ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - L, py + L * sl - 3); ctx.lineTo(px, py - 3); ctx.lineTo(px + L, py + L * sl - 3); ctx.stroke(); }
    // Person
    ctx.strokeStyle = C.fg; ctx.fillStyle = C.fg; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(px, py - 26, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, py - 21); ctx.lineTo(px, py - 9); ctx.moveTo(px, py - 9); ctx.lineTo(px - 4, py - 1); ctx.moveTo(px, py - 9); ctx.lineTo(px + 4, py - 1);
    ctx.moveTo(px, py - 18); ctx.lineTo(px - 6, py - 12); ctx.moveTo(px, py - 18); ctx.lineTo(px + 6, py - 12); ctx.stroke();
    // Sonne auf Bogen
    const a = U.elev * Math.PI / 180, R = Math.min(px - 20, gy - 30) * .95;
    const sx = px - Math.cos(a) * R, sy = Math.max(atmTop + 12, gy - Math.sin(a) * R);
    ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(sx, sy, 13, 0, TAU); ctx.fill();
    // Strahl von der Sonne zur Person, Dicke nach Stärke
    const v = uvi();
    ctx.strokeStyle = UV_COL; ctx.lineWidth = 1 + v * .5; ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px - 2, py - 24); ctx.stroke();
    // reflektierte Strahlen vom Boden
    if (U.alb > .05) {
      ctx.lineWidth = 1 + v * .5 * U.alb; ctx.setLineDash([4, 4]);
      for (const dx of [-26, 26]) { ctx.beginPath(); ctx.moveTo(px + dx, py + Math.abs(dx) * sl); ctx.lineTo(px + dx * .2, py - 14); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`${fmt(U.alt, 0)} m ü. M.`, px + 12, py - 20);
    const path = 1 / Math.sin(a);
    ctx.fillText(small ? `Luftweg ×${fmt(path, 1)}` : `Weg durch die Luft ×${fmt(path, 1)}`, 12, 22);
    // UV-Index-Skala
    const x0 = 12, x1 = w - 12, sY = h - scaleH;
    const segs = [[0, 3, C.good], [3, 6, C.glow], [6, 8, C.copper], [8, 11, C.bad], [11, 14, UV_COL]];
    const SX = u => x0 + (x1 - x0) * u / 14;
    for (const [u0, u1, c] of segs) { ctx.fillStyle = c; ctx.globalAlpha = .75; ctx.fillRect(SX(u0), sY, SX(u1) - SX(u0) - 1, 10); }
    ctx.globalAlpha = 1; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const u of [0, 3, 6, 8, 11, 14]) ctx.fillText(String(u), SX(u), sY + 24);
    const mx = SX(clamp(v, 0, 14));
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.moveTo(mx, sY - 1); ctx.lineTo(mx - 6, sY - 10); ctx.lineTo(mx + 6, sY - 10); ctx.closePath(); ctx.fill();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('sonnenbrand', 4, {
    photonLock: () => { $('#wlIn').disabled = false; $('#intIn').disabled = false; $$('#glassBtns button').forEach(b => b.disabled = false); P.on = true; photonMsg(); },
    skinLock: () => { $('#typeIn').disabled = false; $('#spfIn').disabled = false; $$('#amountBtns button').forEach(b => b.disabled = false); $('#sunBtn').disabled = false; },
    uviLock: () => { $('#elevIn').disabled = false; $('#altIn').disabled = false; $$('#groundBtns button').forEach(b => b.disabled = false); },
  });

  loop((dt, now) => { drawPhoton(dt, now); drawSkin(dt); drawUvi(); });
})();
