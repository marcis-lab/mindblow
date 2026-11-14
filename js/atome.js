/* mindblow – Lektion Atome */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Alufolie und Wasser
  const FOIL = '#b7bdc6', FOIL2 = '#8d949e', WATER = '#3d8fd6';

  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
  // 5,0 × 10²¹
  const sci = (n, d = 1) => {
    if (n <= 0) return '0';
    let e = Math.floor(Math.log10(n)), m = n / Math.pow(10, e);
    if (+m.toFixed(d) >= 10) { m /= 10; e += 1; }
    return `${fmt(m, d)} × 10${sup(e)}`;
  };
  const big = n => n < 1e6 ? fmt(Math.floor(n), 0) : sci(n, 1);
  // Länge in Metern lesbar machen
  const sig = v => { const r = +v.toPrecision(3); const d = r >= 100 || Number.isInteger(r) ? 0 : r >= 10 || Number.isInteger(r * 10) ? 1 : 2; return fmt(r, d); };
  const lenTxt = m => m >= 1e-2 ? `${sig(m * 100)} cm` : m >= 1e-3 ? `${sig(m * 1000)} mm`
    : m >= 1e-6 ? `${sig(m * 1e6)} µm` : m >= 1e-9 ? `${sig(m * 1e9)} nm` : m >= 1e-12 ? `${sig(m * 1e12)} pm` : `${sig(m * 1e15)} fm`;

  /* ---------- Teil 1: Halbieren ---------- */
  const cutCv = $('#cutCv');
  const L0 = 0.1, ATOM = 0.3e-9, MAXN = 28;
  const K = { n: 0, anim: 1, dir: 1 };
  const LIKE = [
    [4e-2, 'ein Finger'], [1e-2, 'ein Fingernagel'], [4e-3, 'ein Reiskorn'], [1e-3, 'ein Stecknadelkopf'],
    [2e-4, 'ein Sandkorn'], [4e-5, 'ein Haar (Dicke)'], [1e-5, 'eine Körperzelle'], [4e-6, 'ein rotes Blutkörperchen'],
    [3e-7, 'ein Bakterium'], [2e-8, 'ein Virus'], [4e-9, 'ein Eiweiss-Molekül'], [1e-9, 'ein DNA-Strang (Breite)'],
    [5e-10, 'ein kleines Molekül'], [0, 'ein Atom'],
  ];
  const likeOf = m => LIKE.find(([min]) => m >= min)[1];
  const MARKS = [
    { n: Math.log2(L0 / 7e-5), t: 'Haar', s: 'Haar' },
    { n: Math.log2(L0 / 2e-6), t: 'Bakterium', s: 'Bakterium' },
    { n: Math.log2(L0 / 1e-7), t: 'Virus', s: 'Virus' },
    { n: Math.log2(L0 / 1e-9), t: 'Molekül', s: 'Molekül' },
    { n: Math.log2(L0 / ATOM), t: 'Atom', s: 'Atom' },
  ];
  const updCut = () => {
    const len = L0 / Math.pow(2, K.n);
    $('#cN').textContent = K.n;
    $('#cLen').textContent = lenTxt(len);
    $('#cLike').textContent = likeOf(len);
    $('#cutBtn').disabled = cutLocked || K.n >= MAXN;
    const msg = K.n === 0 ? 'Ein Klick ist ein Schnitt. Die Skala unten zeigt, wo du gerade bist.'
      : K.n <= 7 ? 'Bis hier kommst du noch mit einer Schere. Danach wird es zu klein für deine Finger.'
      : K.n <= 14 ? 'Jetzt brauchst du ein Mikroskop, um das Stück überhaupt zu sehen.'
      : K.n <= 20 ? 'Kleiner als die Wellenlänge von Licht: Ein normales Mikroskop zeigt es nicht mehr scharf.'
      : K.n < 26 ? 'Nur noch wenige Atome breit. Hier hilft nur noch ein Elektronenmikroskop.'
      : K.n < MAXN ? 'Du siehst schon einzelne Atome. Noch ein bis zwei Schnitte.'
      : `Nach ${MAXN} Schnitten bleibt rund ein Atom übrig. Ein halbes Aluminium-Atom gibt es nicht: Teilst du es, ist es kein Aluminium mehr.`;
    $('#cutStatus').textContent = msg;
  };
  let cutLocked = true;
  $('#cutBtn').addEventListener('click', () => { if (K.n >= MAXN) return; K.n++; K.dir = 1; K.anim = reduced ? 1 : 0; updCut(); });
  $('#undoBtn').addEventListener('click', () => { if (K.n <= 0) return; K.n--; K.dir = -1; K.anim = 1; updCut(); });
  $('#cutReset').addEventListener('click', () => { K.n = 0; K.anim = 1; updCut(); });
  updCut();

  const drawCut = dt => {
    const { ctx, w, h } = fit(cutCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (K.anim < 1) K.anim = Math.min(1, K.anim + dt / 1.1);
    const a = K.anim;
    const len = L0 / Math.pow(2, K.n);
    // Phase 1: Schnitt und Auseinanderziehen, Phase 2: Zoom auf die linke Hälfte
    const p1 = ease(clamp(a / .4, 0, 1)), p2 = ease(clamp((a - .4) / .6, 0, 1));
    const cutting = K.dir === 1 && a < 1;
    const PW = w * (narrow ? .78 : .62), cx = w / 2;
    const top = 44, areaH = h * .5 - top;
    const sH = Math.min(46, areaH * .45), sy = top + areaH / 2 - sH / 2;
    let pw = PW, shownLen = len;
    if (cutting) { pw = PW * lerp(.5, 1, p2); shownLen = len; }
    const x0 = cx - PW / 2;

    // Zoom-Angabe
    ctx.textAlign = 'center'; ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted;
    const zoom = Math.pow(2, K.n);
    ctx.fillText(K.n === 0 ? 'Originalgrösse: 10 cm Alufolie' : `${narrow ? 'Zoom' : 'Vergrössert'} ×${zoom < 1e6 ? fmt(zoom, 0) : sci(zoom, 1)}`, cx, 20);

    // Stück zeichnen
    const atomsAcross = shownLen / ATOM;
    const drawPiece = (x, pwid, alpha) => {
      ctx.globalAlpha = alpha;
      const across = atomsAcross * pwid / PW * (cutting ? 1 : 1);
      if (atomsAcross <= 40) {
        const count = Math.max(1, Math.round(across));
        let d = pwid / count;
        const maxD = areaH * .9;
        if (d > maxD) d = maxD;
        const rows = Math.max(1, Math.min(Math.floor(sH * 1.6 / d), 6));
        const gy = top + areaH / 2 - rows * d / 2;
        const gx = x + (pwid - count * d) / 2;
        for (let r = 0; r < rows; r++) for (let i = 0; i < count; i++) {
          const ax = gx + d * (i + .5) + (r % 2 && count > 1 ? d * .25 : 0), ay = gy + d * (r + .5);
          if (ax > x + pwid + 1) continue;
          const g = ctx.createRadialGradient(ax - d * .15, ay - d * .15, d * .05, ax, ay, d * .5);
          g.addColorStop(0, '#e9edf2'); g.addColorStop(1, FOIL2);
          ctx.beginPath(); ctx.arc(ax, ay, d * .46, 0, TAU); ctx.fillStyle = g; ctx.fill();
        }
      } else {
        const g = ctx.createLinearGradient(0, sy, 0, sy + sH);
        g.addColorStop(0, '#dfe3e8'); g.addColorStop(.5, FOIL); g.addColorStop(1, FOIL2);
        ctx.fillStyle = g; ctx.fillRect(x, sy, pwid, sH);
        // Knitterfalten, die mit dem Zoom grösser werden
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) { const fx = x + pwid * i / 6; ctx.beginPath(); ctx.moveTo(fx, sy); ctx.lineTo(fx + 6, sy + sH); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    };
    if (cutting) {
      // rechte Hälfte fällt weg, linke wird herangezoomt
      const half = PW / 2;
      const gap = 10 * p1;
      drawPiece(x0 - gap * (1 - p2), pw, 1);
      if (p2 < 1) drawPiece(x0 + half + gap + p2 * PW * .5, half, (1 - p2) * .8);
      if (p1 < 1) {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, sy - 14); ctx.lineTo(cx, sy + sH + 14); ctx.stroke(); ctx.setLineDash([]);
      }
    } else drawPiece(x0, PW, 1);

    // Länge unter dem Stück
    ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
    const yl = top + areaH + 4;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yl - 10); ctx.lineTo(x0, yl - 4); ctx.lineTo(x0 + PW, yl - 4); ctx.lineTo(x0 + PW, yl - 10); ctx.stroke();
    ctx.fillText(lenTxt(len), cx, yl + 12);

    // Skala von 10 cm bis zum Atom, nach Anzahl Schnitten
    const rx0 = 22, rx1 = w - 22, ry = h - 56, NMAX = 30;
    const RX = n => rx0 + n / NMAX * (rx1 - rx0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.stroke();
    const shownN = K.dir === 1 && a < 1 ? K.n - 1 + p2 : K.n;
    ctx.strokeStyle = C.accent;
    ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(RX(shownN), ry); ctx.stroke();
    ctx.lineCap = 'butt';
    // Zehnerpotenzen
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const [m, t] of [[1e-1, '10 cm'], [1e-2, '1 cm'], [1e-3, '1 mm'], [1e-4, '0,1 mm'], [1e-5, '10 µm'], [1e-6, '1 µm'], [1e-7, '0,1 µm'], [1e-8, '10 nm'], [1e-9, '1 nm']]) {
      if (narrow && [1e-2, 1e-4, 1e-5, 1e-7, 1e-8].includes(m)) continue;
      const x = RX(Math.log2(L0 / m));
      ctx.fillRect(x - .5, ry + 5, 1, 5);
      ctx.fillText(t, clamp(x, rx0 + 14, rx1 - 14), ry + 22);
    }
    // Vergleiche
    ctx.font = `500 11px ${MONO}`;
    let k = 0;
    for (const mk of MARKS) {
      const lbl = narrow ? mk.s : mk.t;
      if (!lbl) continue;
      const x = RX(mk.n), up = k % 2 === 0; k++;
      const reached = K.n >= mk.n - .5;
      ctx.fillStyle = reached ? C.fg : C.muted;
      ctx.strokeStyle = reached ? C.fg : C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, ry - 5); ctx.lineTo(x, up ? ry - 16 : ry - 28); ctx.stroke();
      const tw = ctx.measureText(lbl).width;
      ctx.fillText(lbl, clamp(x, rx0 + tw / 2 - 16, rx1 - tw / 2 + 16), up ? ry - 20 : ry - 32);
    }
    // aktuelle Position
    const px = RX(shownN);
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(px, ry, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(px, ry, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('0 Schnitte', rx0 - 4, h - 12);
    ctx.textAlign = 'right'; ctx.fillText('30 Schnitte', rx1 + 4, h - 12);
  };

  /* ---------- Teil 2: Zoom zum Kern ---------- */
  const zoomCv = $('#zoomCv');
  const A0 = 5.29e-11;                 // Bohr-Radius
  const RN = 0.84e-15;                 // Radius des Protons
  const DA = 2 * A0;                   // Durchmesser des Wasserstoff-Atoms, vereinfacht
  const F0 = 3.2e-10, F1 = 5e-15, LZ = Math.log10(F0 / F1);
  const Z = { z: 0, play: false, target: 1, planet: false, phase: 0 };
  // Elektron als Momentaufnahmen: Orte nach der 1s-Verteilung (Abstand ~ r² e^(-2r/a0))
  const sample = () => {
    const r = -(A0 / 2) * Math.log(Math.random() * Math.random() * Math.random() + 1e-300);
    const u = Math.random() * 2 - 1, ph = Math.random() * TAU, s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(ph), r * s * Math.sin(ph)];
  };
  const PTS = Array.from({ length: 1400 }, sample);
  let resample = 0;
  const viewW = () => F0 * Math.pow(10, -Z.z * LZ);
  const updZoom = () => {
    $('#zIn').value = Math.round(Z.z * 1000);
    const mag = F0 / viewW();
    $('#zOut').textContent = mag < 1e4 ? `×${fmt(mag, 0)}` : `×${fmt(mag / 1000, 0)}k`;
    const { width: w, height: h } = zoomCv.getBoundingClientRect();
    const scale = Math.min(w || 1, h || 1) / viewW();
    $('#zW').textContent = lenTxt((w || 1) / scale);
    const share = 2 * RN * scale / (w || 1) * 100;
    $('#zK').textContent = share < .01 ? 'unsichtbar' : share < 1 ? `${fmt(share, 2)} %` : `${fmt(share, 0)} % der Breite`;
    const cm = DA * scale * 2.54 / 96;
    $('#zA').textContent = cm < 100 ? `${fmt(cm, 0)} cm` : cm < 1e5 ? `${fmt(cm / 100, 0)} m` : `${fmt(cm / 1e5, 1)} km`;
    const st = Z.planet ? 'Planetenmodell: So zeichnet man es oft, aber so ist es nicht. Das Elektron hat keine feste Bahn. Es ist eher eine Wolke von möglichen Orten.'
      : Z.z < .15 ? 'Ein Wasserstoff-Atom: ein Proton als Kern und ein Elektron. Jeder Punkt zeigt einen Ort, an dem man das Elektron antreffen könnte.'
      : Z.z < .7 ? 'Je näher du hinschaust, desto seltener ist hier ein Elektron. Der Kern ist immer noch viel zu klein zum Sehen.'
      : Z.z < .95 ? 'Fast nur Leere. Und der Kern ist erst jetzt als winziger Punkt zu erkennen.'
      : 'Endlich der Kern: ein einzelnes Proton. Das ganze Atom wäre jetzt kilometerbreit.';
    $('#zoomStatus').textContent = st;
  };
  $('#zIn').addEventListener('input', e => { Z.z = +e.target.value / 1000; Z.play = false; $('#zPlay').textContent = Z.z > .99 ? 'Zurück zum Atom' : 'Zum Kern fliegen'; updZoom(); });
  $('#zPlay').addEventListener('click', () => {
    Z.target = Z.z > .99 ? 0 : 1;
    if (reduced) { Z.z = Z.target; Z.play = false; }
    else Z.play = true;
    $('#zPlay').textContent = Z.target === 1 ? 'Zurück zum Atom' : 'Zum Kern fliegen';
    updZoom();
  });
  $('#planetBtn').addEventListener('click', () => {
    Z.planet = !Z.planet;
    $('#planetBtn').textContent = Z.planet ? 'Elektronenwolke zeigen' : 'Planetenmodell zeigen';
    updZoom();
  });
  addEventListener('resize', updZoom);

  const scaleBar = (ctx, w, h, scale) => {
    // runde Länge für den Massstab suchen
    const target = w * .25 / scale;
    const e = Math.floor(Math.log10(target));
    let m = 1; for (const c of [1, 2, 5]) if (c * Math.pow(10, e) <= target) m = c;
    const len = m * Math.pow(10, e), px = len * scale;
    const x0 = 14, y = h - 16;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y); ctx.lineTo(x0 + px, y); ctx.lineTo(x0 + px, y - 5); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(lenTxt(len), x0 + px + 8, y + 3);
  };

  const drawZoom = dt => {
    const { ctx, w, h } = fit(zoomCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    if (Z.play) {
      const step = dt / 6;
      Z.z += Z.target > Z.z ? step : -step * 2;
      if ((Z.target === 1 && Z.z >= 1) || (Z.target === 0 && Z.z <= 0)) { Z.z = Z.target; Z.play = false; }
      updZoom();
    }
    const vw = viewW(), scale = Math.min(w, h) / vw;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = C.sunk; ctx.fillRect(0, 0, w, h);

    // Elektronenwolke als Punkte
    if (!reduced) {
      resample += dt * 400;
      while (resample >= 1) { PTS[Math.floor(Math.random() * PTS.length)] = sample(); resample--; }
    }
    ctx.fillStyle = C.fiber;
    ctx.globalAlpha = Z.planet ? .25 : .75;
    let inView = 0;
    for (const [x, y] of PTS) {
      const px = cx + x * scale, py = cy + y * scale;
      if (px < -2 || px > w + 2 || py < -2 || py > h + 2) continue;
      inView++;
      ctx.fillRect(px - 1, py - 1, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;

    // Planetenmodell: so nicht
    if (Z.planet) {
      if (!reduced) Z.phase += dt * 1.4;
      const r = A0 * scale;
      ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const ex = cx + r * Math.cos(Z.phase), ey = cy + r * Math.sin(Z.phase);
      if (ex > -10 && ex < w + 10 && ey > -10 && ey < h + 10) {
        ctx.fillStyle = C.bad; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = C.bad; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'So nicht: keine feste Bahn' : 'So nicht: Elektronen haben keine feste Bahn', cx, 24);
    }

    // Kern
    const rn = RN * scale;
    if (rn >= 1.5) {
      const g = ctx.createRadialGradient(cx - rn * .3, cy - rn * .3, rn * .1, cx, cy, rn);
      g.addColorStop(0, '#ffd9a8'); g.addColorStop(1, C.copper);
      ctx.save(); if (!reduced) { ctx.shadowColor = C.copper; ctx.shadowBlur = 18; }
      ctx.beginPath(); ctx.arc(cx, cy, rn, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
      if (rn > 20) ctx.fillText(narrow ? 'Proton' : 'Proton: der ganze Kern', cx, cy + rn + 20);
    } else {
      // zu klein: nur markieren
      ctx.fillStyle = C.copper; ctx.beginPath(); ctx.arc(cx, cy, 1.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.copper; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx + 24, cy - 24); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
      const lbl = rn < .05 ? (narrow ? 'Kern: zu klein' : 'Kern: viel zu klein zum Sehen') : 'Kern: ein Pünktchen';
      ctx.fillText(lbl, Math.min(cx + 27, w - ctx.measureText(lbl).width - 6), cy - 27);
    }

    // Hinweise
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'vereinfacht' : 'Wasserstoff-Atom, vereinfacht', w - 12, h - 13);
    if (!Z.planet && Z.z > .3) {
      ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `11px ${MONO}`;
      ctx.fillText(inView === 0 ? 'kein Elektron im Bild' : `${inView} von ${PTS.length} Momentaufnahmen im Bild`, cx, 22);
    }
    scaleBar(ctx, w, h, scale);
  };

  /* ---------- Teil 3: Atome im Tropfen ---------- */
  const dropCv = $('#dropCv');
  const NA = 6.022e23, PEOPLE = 8e9, AGE = 13.8e9, YEAR = 3.156e7;
  const VMIN = 0.01, VMAX = 5;
  const D = { v: 0.05, rate: 1, all: false, counted: 0, on: false, wob: 0 };
  const atomsOf = v => v / 18 * NA * 3;
  const rateOf = () => D.rate * (D.all ? PEOPLE : 1);
  const timeTxt = s => {
    if (s < 60) return `${fmt(s, 0)} Sekunden`;
    if (s < 3600) return `${fmt(s / 60, 0)} Minuten`;
    if (s < 86400) return `${fmt(s / 3600, 1)} Stunden`;
    const y = s / YEAR;
    if (y < 1) return `${fmt(s / 86400, 0)} Tage`;
    if (y < 1e6) return `${fmt(y, 0)} Jahre`;
    if (y < 1e9) return `${fmt(y / 1e6, 0)} Mio. Jahre`;
    if (y < 1e12) return `${fmt(y / 1e9, 0)} Mrd. Jahre`;
    return `${fmt(y / 1e12, 0)} Bio. Jahre`;
  };
  const rateTxt = r => r < 1e4 ? `${fmt(r, 0)} / s` : `10${sup(Math.round(Math.log10(r)))}/s`;
  const updDrop = () => {
    const N = atomsOf(D.v);
    $('#vOut').textContent = `${fmt(D.v, D.v < .1 ? 2 : D.v < 1 ? 1 : 0)} ml`.replace(',0 ml', ' ml');
    $('#sOut').textContent = rateTxt(D.rate);
    $('#dN').textContent = sci(N, 1);
    const s = N / rateOf();
    $('#dT').textContent = timeTxt(s);
    const y = s / YEAR;
    $('#dU').textContent = y >= AGE * .1 ? `${y / AGE < 100 ? fmt(y / AGE, 1) : fmt(y / AGE, 0)} × Universum`
      : y >= 80 ? `${fmt(y / 80, 0)} Menschenleben` : 'kürzer als ein Leben';
    const who = D.all ? 'Alle 8 Milliarden Menschen zählen' : 'Du zählst';
    const speed = D.rate === 1 ? 'ein Atom pro Sekunde' : `${D.rate < 1e4 ? fmt(D.rate, 0) : '10' + sup(Math.log10(D.rate))} Atome pro Sekunde`;
    $('#dropStatus').textContent = `${who} ${speed}${D.all ? ', jede Person' : ''}. ${s > AGE * YEAR ? 'Länger, als es das Universum gibt.' : s > 80 * YEAR ? 'Länger als ein Menschenleben.' : 'Das wäre zu schaffen.'}`;
  };
  $('#vIn').addEventListener('input', e => {
    const k = +e.target.value / 1000;
    D.v = VMIN * Math.pow(VMAX / VMIN, k);
    D.v = D.v < .1 ? Math.round(D.v * 100) / 100 : D.v < 1 ? Math.round(D.v * 10) / 10 : Math.round(D.v);
    updDrop();
  });
  $('#sIn').addEventListener('input', e => { D.rate = Math.pow(10, +e.target.value); updDrop(); });
  $('#allBtn').addEventListener('click', () => {
    D.all = !D.all;
    $('#allBtn').textContent = D.all ? 'Nur du zählst' : 'Alle Menschen zählen mit';
    updDrop();
  });
  $('#dropReset').addEventListener('click', () => { D.counted = 0; });
  updDrop();

  const dropPath = (ctx, x, y, r) => {
    // Tropfen: Kreis unten, Spitze oben
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.1);
    ctx.bezierCurveTo(x + r * .35, y - r * 1.3, x + r, y - r * .7, x + r, y);
    ctx.arc(x, y, r, 0, Math.PI);
    ctx.bezierCurveTo(x - r, y - r * .7, x - r * .35, y - r * 1.3, x, y - r * 2.1);
    ctx.closePath();
  };

  const drawDrop = dt => {
    const { ctx, w, h } = fit(dropCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const N = atomsOf(D.v);
    if (D.on) { D.counted = Math.min(N, D.counted + rateOf() * dt); }
    if (!reduced) D.wob += dt;

    // Tropfen links
    const k = Math.log(D.v / VMIN) / Math.log(VMAX / VMIN);
    const r = lerp(narrow ? 14 : 18, narrow ? 34 : 46, k);
    const dx = narrow ? 52 : 80, dy = narrow ? 104 : 122;
    const g = ctx.createRadialGradient(dx - r * .35, dy - r * .4, r * .1, dx, dy, r * 1.3);
    g.addColorStop(0, '#bfe3ff'); g.addColorStop(1, WATER);
    ctx.save(); ctx.translate(dx, dy); ctx.scale(1 + .02 * Math.sin(D.wob * 3), 1 - .02 * Math.sin(D.wob * 3)); ctx.translate(-dx, -dy);
    dropPath(ctx, dx, dy, r); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText($('#vOut').textContent, dx, dy + r + 18);

    // Zähler rechts
    const tx = narrow ? 104 : 170;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText('schon gezählt', tx, 40);
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 22 : 30}px ${MONO}`;
    ctx.fillText(D.on ? big(D.counted) : '0', tx, narrow ? 68 : 74);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(`von ${sci(N, 1)} Atomen`, tx, narrow ? 90 : 98);
    const pct = D.counted / N * 100;
    const pTxt = pct <= 0 ? '0 %' : pct >= .01 ? `${fmt(pct, 2)} %` : `${sci(pct, 0)} %`;
    ctx.fillStyle = pct >= 100 ? C.good : C.fg; ctx.font = `500 12px ${MONO}`;
    ctx.fillText(pct >= 100 ? 'Fertig gezählt!' : `geschafft: ${pTxt}`, tx, narrow ? 112 : 124);

    // Log-Skala von 1 bis 10^22
    const bx0 = 18, bx1 = w - 18, by = h - 72, EMAX = 22;
    const BX = n => bx0 + clamp(Math.log10(Math.max(1, n)) / EMAX, 0, 1) * (bx1 - bx0);
    ctx.strokeStyle = C.line; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.stroke();
    if (D.counted >= 1) {
      ctx.strokeStyle = C.accent;
      ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(BX(D.counted), by); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (let e = 0; e <= EMAX; e += narrow ? 6 : 3) {
      const x = BX(Math.pow(10, e));
      ctx.fillRect(x - .5, by + 5, 1, 5);
      ctx.fillText(e === 0 ? '1' : `10${sup(e)}`, clamp(x, bx0 + 8, bx1 - 12), by + 22);
    }
    ctx.textAlign = 'left'; ctx.fillText(narrow ? 'Skala: jeder Strich ×10⁶' : 'Skala: jeder Strich ×1000', bx0 - 4, h - 12);
    // Marken
    const mark = (n, t, up, col) => {
      const x = BX(n);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, by - 5); ctx.lineTo(x, up ? by - 18 : by - 34); ctx.stroke();
      ctx.font = `500 11px ${MONO}`;
      const tw = ctx.measureText(t).width;
      ctx.textAlign = 'center';
      ctx.fillText(t, clamp(x, bx0 + tw / 2 - 10, bx1 - tw / 2 + 10), up ? by - 22 : by - 38);
    };
    mark(PEOPLE, narrow ? 'Menschen' : 'Menschen auf der Erde', true, C.muted);
    mark(AGE * YEAR, narrow ? 'Sek. seit Urknall' : 'Sekunden seit dem Urknall', false, C.muted);
    mark(N, narrow ? 'Tropfen' : 'Atome im Tropfen', true, WATER);
    if (D.counted >= 1) {
      const x = BX(D.counted);
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(x, by, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, by, 3, 0, TAU); ctx.fill();
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('atome', 4, {
    cutLock: () => { cutLocked = false; ['#undoBtn', '#cutReset'].forEach(s => $(s).disabled = false); updCut(); },
    zoomLock: () => { ['#zIn', '#zPlay', '#planetBtn'].forEach(s => $(s).disabled = false); },
    dropLock: () => { ['#vIn', '#sIn', '#allBtn', '#dropReset'].forEach(s => $(s).disabled = false); D.on = true; },
  });
  updZoom();

  loop(dt => { drawCut(dt); drawZoom(dt); drawDrop(dt); });
})();
