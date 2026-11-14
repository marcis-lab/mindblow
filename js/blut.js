/* mindblow – Lektion Blut */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Blut, Plasma, Haut
  const BLOOD = '#a3162b', PACKED = '#760d1d', PLASMA = '#e6bf62', BUFFY = '#f2ede2';
  const RBC = '#c8283c', PLT = '#f4cfdb', PLT_EDGE = '#b9718a', FIBRIN = '#fff0b0';
  const SKIN = '#e6c3a0', SKIN_DEEP = '#d7a985', LUMEN = '#f1dca2';

  // kleiner Zufallsgenerator mit festem Startwert, damit das Bild immer gleich aussieht
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  const drawRbc = (ctx, x, y, r, a = 1) => {
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = RBC; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r * .45, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
    ctx.globalAlpha = 1;
  };

  /* ---------- Teil 1: Zentrifuge ---------- */
  const sepCv = $('#sepCv');
  const S = { t: 0, hct: 44, play: false, ang: 0, drift: 0 };
  const sepOf = t => 1 - Math.exp(-t / 2.2);          // wie weit getrennt (0..1), Zeit in Minuten
  const SDOTS = (() => { const r = rng(7); return Array.from({ length: 60 }, () => [r(), r()]); })();
  const updSep = () => {
    $('#sepIn').value = Math.round(S.t * 10);
    $('#sepOut').textContent = `${fmt(S.t, 1)} min`;
    $('#hctIn').value = S.hct; $('#hctOut').textContent = `${S.hct} %`;
    $('#sPlasma').textContent = `${100 - S.hct - 1} %`;
    $('#sRed').textContent = `${S.hct} %`;
  };
  const sepMsg = () => {
    const s = sepOf(S.t);
    if (s < .05) return 'Frisches Blut ist gut gemischt. Starte die Zentrifuge.';
    if (s < .9) return 'Die schweren roten Blutkörperchen sinken nach unten. Oben bleibt klares, gelbliches Plasma.';
    return `Fertig getrennt: rund ${100 - S.hct - 1} % Plasma, ${S.hct} % rote Blutkörperchen und dazwischen eine hauchdünne weisse Schicht.`;
  };
  $('#sepIn').addEventListener('input', e => {
    S.t = +e.target.value / 10; S.play = false; $('#spinBtn').textContent = 'Schleudern';
    updSep(); $('#sepStatus').textContent = sepMsg();
  });
  $('#hctIn').addEventListener('input', e => {
    S.hct = +e.target.value; updSep();
    $('#sepStatus').textContent = S.hct < 40
      ? 'Weniger rote Blutkörperchen: Die rote Schicht wird dünner, das Plasma mehr. Bei Frauen liegt der Anteil im Schnitt etwas tiefer als bei Männern.'
      : S.hct > 48
        ? 'Mehr rote Blutkörperchen: Wer lange in grosser Höhe lebt, bildet mit der Zeit mehr davon. Dort ist die Luft dünner (vereinfacht).'
        : 'Ein typischer Wert für Erwachsene: rund 40 bis 45 % rote Blutkörperchen.';
  });
  $('#spinBtn').addEventListener('click', () => {
    if (S.t >= 10) S.t = 0;
    S.play = !S.play; $('#spinBtn').textContent = S.play ? 'Anhalten' : 'Schleudern';
    if (S.play) $('#sepStatus').textContent = 'Die Zentrifuge dreht sich sehr schnell. Das drückt alles Schwere nach aussen, also zum Boden des Röhrchens.';
  });
  $('#shakeBtn').addEventListener('click', () => {
    S.t = 0; S.play = false; $('#spinBtn').textContent = 'Schleudern'; updSep(); $('#sepStatus').textContent = sepMsg();
  });
  updSep();

  const drawSep = dt => {
    if (S.play) {
      S.t = reduced ? 10 : Math.min(10, S.t + dt * 1.6);
      if (S.t >= 10) { S.play = false; $('#spinBtn').textContent = 'Schleudern'; $('#sepStatus').textContent = sepMsg(); }
      updSep();
    }
    if (S.play && !reduced) S.ang += dt * 16;
    if (!reduced) S.drift += dt;
    const { ctx, w, h } = fit(sepCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const s = sepOf(S.t), f = S.hct / 100, b = .014;

    // Zentrifuge von oben
    const rx = w * (narrow ? .19 : .22), ry = h * .44, R = Math.min(w * (narrow ? .15 : .14), 74);
    ctx.beginPath(); ctx.arc(rx, ry, R, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    if (S.play && !reduced) {
      ctx.beginPath(); ctx.arc(rx, ry, R * .62, 0, TAU);
      ctx.strokeStyle = 'rgba(163,22,43,.25)'; ctx.lineWidth = R * .5; ctx.stroke();
    }
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(S.ang + k * TAU / 4);
      roundRect(ctx, R * .28, -R * .1, R * .62, R * .2, R * .1);
      ctx.fillStyle = BLOOD; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(rx, ry, R * .12, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `500 12px ${MONO}`; ctx.fillStyle = C.fg;
    ctx.fillText('Zentrifuge', rx, ry + R + 24);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(S.play ? 'dreht sich' : 'steht still', rx, ry + R + 39);

    // Röhrchen
    const tx = w * (narrow ? .5 : .52), tw = narrow ? 40 : 52, ty0 = 30, ty1 = h - 34;
    const yl = ty0 + 20, L = ty1 - yl;
    const tube = () => {
      ctx.beginPath(); ctx.moveTo(tx - tw / 2, ty0); ctx.lineTo(tx - tw / 2, ty1 - tw / 2);
      ctx.arc(tx, ty1 - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tx + tw / 2, ty0);
    };
    const hp = L * (1 - f - b) * s, hr = L * f * s, hb = L * b * s;
    ctx.save(); tube(); ctx.closePath(); ctx.clip();
    ctx.fillStyle = BLOOD; ctx.fillRect(tx - tw, yl, tw * 2, L + 2);
    // Körnchen im noch gemischten Teil
    const m0 = yl + hp, m1 = ty1 - hr - hb;
    if (m1 - m0 > 3) {
      ctx.fillStyle = 'rgba(70,0,12,.45)';
      for (const [u, v] of SDOTS) {
        const y = m0 + ((v + S.drift * .04 * (1 + s * 3)) % 1) * (m1 - m0);
        ctx.beginPath(); ctx.arc(tx - tw / 2 + 4 + u * (tw - 8), y, 1.6, 0, TAU); ctx.fill();
      }
    }
    ctx.fillStyle = PLASMA; ctx.fillRect(tx - tw, yl, tw * 2, hp);
    ctx.fillStyle = PACKED; ctx.fillRect(tx - tw, ty1 - hr, tw * 2, hr + 2);
    ctx.fillStyle = BUFFY; ctx.fillRect(tx - tw, ty1 - hr - Math.max(hb, s > .3 ? 2 : 0), tw * 2, Math.max(hb, s > .3 ? 2 : 0));
    ctx.restore();
    tube(); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.muted; roundRect(ctx, tx - tw / 2 - 3, ty0 - 12, tw + 6, 14, 4); ctx.fill();
    // Skala
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    for (const p of [0, 50, 100]) {
      const y = ty1 - L * p / 100;
      ctx.beginPath(); ctx.moveTo(tx - tw / 2 - 6, y); ctx.lineTo(tx - tw / 2, y); ctx.stroke();
      if (!narrow) ctx.fillText(`${p} %`, tx - tw / 2 - 9, y + 3);
    }

    // Beschriftung rechts
    const lx = tx + tw / 2 + 12;
    ctx.textAlign = 'left';
    const label = (y, lines, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx + tw / 2 + 2, y); ctx.lineTo(lx - 3, y); ctx.stroke();
      const top = y - (lines.length - 1) * 13 / 2 + 4;
      lines.forEach((t, i) => {
        ctx.fillStyle = i === lines.length - 1 ? C.muted : C.fg;
        ctx.font = i === lines.length - 1 ? `11px ${MONO}` : `500 12px ${MONO}`;
        ctx.fillText(t, lx + 2, top + i * 13);
      });
      ctx.globalAlpha = 1;
    };
    const a = clamp((s - .45) * 2.5, 0, 1);
    if (a < 1) label(yl + L * .45, ['Vollblut', 'gut gemischt'], 1 - a);
    if (a > 0) {
      label(yl + hp / 2, ['Plasma', `rund ${100 - S.hct - 1} %`], a);
      label(ty1 - hr - hb / 2 - 6, narrow ? ['Weisse +', 'Plättchen', 'unter 1 %'] : ['Weisse Blutk. +', 'Blutplättchen', 'unter 1 %'], a);
      label(ty1 - hr / 2 + 8, narrow ? ['Rote Blut-', 'körperchen', `rund ${S.hct} %`] : ['Rote', 'Blutkörperchen', `rund ${S.hct} %`], a);
    }
  };

  /* ---------- Teil 2: Rote Blutkörperchen im Akkord ---------- */
  const rbcCv = $('#rbcCv');
  const RATE = 2.4e6, ALL = 25e12;
  const SPANS = [[1, '1 Sekunde', 'einer Sekunde'], [60, '1 Minute', 'einer Minute'], [3600, '1 Stunde', 'einer Stunde'], [86400, '1 Tag', 'einem Tag'], [604800, '1 Woche', 'einer Woche'], [2592000, '30 Tage', '30 Tagen'], [10368000, '120 Tage', '120 Tagen']];
  const SPANMSG = [
    'Eine Sekunde: rund 2,4 Millionen neue. Ungefähr gleich viele alte baut dein Körper in derselben Zeit ab.',
    'Eine Minute: rund 140 Millionen. In dieser Zeit fliesst dein Blut etwa einmal durch den ganzen Kreislauf.',
    'Eine Stunde: rund 9 Milliarden. Das sind mehr, als Menschen auf der Erde leben.',
    'Ein Tag: rund 200 Milliarden. Knapp 1 % deiner roten Blutkörperchen ist neu.',
    'Eine Woche: rund 1,5 Billionen. Etwa jedes sechzehnte rote Blutkörperchen ist neu.',
    '30 Tage: Rund ein Viertel deiner roten Blutkörperchen ist schon ersetzt.',
    '120 Tage: So lange lebt ein rotes Blutkörperchen. In dieser Zeit ist praktisch jedes einmal ersetzt (Grössenordnungen, vereinfacht).',
  ];
  const R2 = { span: 3, live: 0, on: false, flow: 0, spawn: 0, cells: [] };
  const big = n => n < 1e6 ? fmt(n, 0)
    : n < 1e9 ? `${fmt(n / 1e6, n < 1e7 ? 1 : 0)} Mio.`
    : n < 1e12 ? `${fmt(n / 1e9, n < 1e10 ? 1 : 0)} Mrd.`
    : `${fmt(n / 1e12, n < 1e13 ? 1 : 0)} Bio.`;
  const pct = x => x >= 99 ? 'rund 100 %' : x >= 10 ? `${fmt(x, 0)} %` : x >= 1 ? `${fmt(x, 1)} %` : x >= .01 ? `${fmt(x, 2)} %` : 'fast 0 %';
  const updRbc = () => {
    const [sec, name] = SPANS[R2.span];
    $('#spanIn').value = R2.span; $('#spanOut').textContent = name;
    $('#rNew').textContent = big(RATE * sec);
    $('#rShare').textContent = pct(RATE * sec / ALL * 100);
    const laps = sec / 60;
    $('#rLaps').textContent = laps < 1 ? fmt(laps, 2) : fmt(laps, 0);
  };
  $('#spanIn').addEventListener('input', e => { R2.span = +e.target.value; updRbc(); $('#rbcStatus').textContent = SPANMSG[R2.span]; });
  $('#liveBtn').addEventListener('click', () => { R2.live = 0; $('#rbcStatus').textContent = 'Zähler auf null. Schau, wie schnell er wieder steigt.'; });
  updRbc();

  const drawRbcCv = dt => {
    if (R2.on) R2.live += dt;
    const { ctx, w, h } = fit(rbcCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;

    // Knochenmark und Milz
    const bw = narrow ? 70 : 112, by0 = 14, bh = h * .3;
    const box = (x, title, sub) => {
      roundRect(ctx, x, by0, bw, bh, 12); ctx.fillStyle = C.sunk; ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`;
      title.forEach((t, i) => ctx.fillText(t, x + bw / 2, by0 + bh / 2 - (title.length - 1) * 7 + i * 14));
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
      ctx.fillText(sub, x + bw / 2, by0 + bh + 15);
    };
    box(10, narrow ? ['Knochen-', 'mark'] : ['Knochenmark'], '+ neue');
    box(w - 10 - bw, narrow ? ['Milz,', 'Leber'] : ['Milz', 'und Leber'], narrow ? '− alte' : '− alte, ~120 Tage');

    // Strom der Zellen
    const x0 = 10 + bw, x1 = w - 10 - bw, yc = by0 + bh / 2;
    const pathY = (q, ph) => yc + Math.sin(q * TAU * 1.2 + ph) * bh * .22;
    if (!reduced) {
      R2.spawn -= dt;
      if (R2.spawn <= 0) { R2.spawn = .28; R2.cells.push({ q: 0, ph: Math.random() * TAU }); }
      R2.cells.forEach(c => { c.q += dt / 5; });
      R2.cells = R2.cells.filter(c => c.q < 1.08);
    } else if (!R2.cells.length) {
      for (let i = 0; i < 18; i++) R2.cells.push({ q: i / 18, ph: i });
    }
    const r = narrow ? 5 : 6;
    for (const c of R2.cells) {
      const q = Math.min(c.q, 1);
      const a = c.q < .05 ? c.q / .05 : c.q > 1 ? Math.max(0, 1 - (c.q - 1) / .08) : 1;
      drawRbc(ctx, lerp(x0 - 6, x1 + 6, q), pathY(q, c.ph), r * (c.q < .05 ? .4 + 12 * c.q : 1), a);
    }

    // Live-Zähler
    const ly = h * .56;
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `600 ${narrow ? 22 : 28}px ${MONO}`;
    ctx.fillText('+ ' + fmt(Math.floor(R2.live * RATE), 0), w / 2, ly);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(narrow ? 'neue, seit du hier bist' : 'neue rote Blutkörperchen, seit du hier bist', w / 2, ly + 20);

    // Balken: Anteil am ganzen Bestand
    const [sec, , inName] = SPANS[R2.span];
    const share = Math.min(1, RATE * sec / ALL);
    const gx0 = 16, gx1 = w - 16, gy = h * .8, gh = 16;
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
    ctx.fillText(`In ${inName}:`, gx0, gy - 10);
    ctx.textAlign = 'right'; ctx.fillText(`${big(RATE * sec)} neu`, gx1, gy - 10);
    roundRect(ctx, gx0, gy, gx1 - gx0, gh, 8); ctx.fillStyle = C.sunk; ctx.fill();
    roundRect(ctx, gx0, gy, Math.max(4, (gx1 - gx0) * share), gh, 8); ctx.fillStyle = RBC; ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'Anteil an allen ~25 Bio.' : 'Anteil an allen rund 25 Billionen roten Blutkörperchen', gx0, gy + gh + 15);
    ctx.textAlign = 'right'; ctx.fillText(pct(share * 100), gx1, gy + gh + 15);
  };

  /* ---------- Teil 3: Gerinnung ---------- */
  const clotCv = $('#clotCv');
  const K = { t: 0, low: false, play: false, flow: 0 };
  const TMAX = 360;                                   // Modellzeit in Sekunden
  const plugOf = t => 1 - Math.exp(-t / (K.low ? 150 : 40));
  const fibOf = t => { const t0 = K.low ? 90 : 30, d = K.low ? 300 : 150; const x = clamp((t - t0) / d, 0, 1); return x * x * (3 - 2 * x); };
  const openOf = t => (1 - .7 * plugOf(t)) * (1 - fibOf(t));
  const lostOf = t => { let s = 0; const n = 40; for (let i = 0; i < n; i++) s += openOf(t * (i + .5) / n); return s * t / n; };
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} min`;
  const updClot = () => {
    const t = K.t, op = openOf(t), fb = fibOf(t);
    $('#ctIn').value = Math.round(t); $('#ctOut').textContent = mmss(t);
    $('#kPhase').textContent = t < 4 ? 'frischer Schnitt' : fb < .04 ? 'Plättchen-Pfropf' : op > .03 ? 'Fibrin-Netz wächst' : 'verschlossen';
    $('#kBleed').textContent = op > .5 ? 'stark' : op > .15 ? 'schwächer' : op > .03 ? 'nur noch wenig' : 'gestoppt';
    $('#kFib').textContent = `${fmt(fb * 100, 0)} %`;
  };
  const clotMsg = () => {
    const t = K.t, op = openOf(t), fb = fibOf(t);
    if (t < 4) return 'Das Gefäss ist offen, Blut tritt aus. Blutplättchen, die vorbeischwimmen, bleiben am rauen Rand hängen.';
    if (fb < .04) return 'Immer mehr Blutplättchen haften aneinander. Der Pfropf wächst vom Rand her nach innen, hält aber noch nicht fest.';
    if (op > .03) return 'Jetzt entstehen Fibrin-Fäden. Sie spannen ein Netz über den Pfropf und fangen rote Blutkörperchen ein.';
    return K.low
      ? 'Auch mit sehr wenigen Blutplättchen schliesst sich die Wunde hier, aber es dauert viel länger und es geht mehr Blut verloren (vereinfachtes Modell).'
      : `Nach rund ${Math.max(1, Math.round(firstStop() / 60))} Minuten steht die Blutung. Aus dem Gerinnsel wird später eine Kruste (vereinfachtes Modell).`;
  };
  const firstStop = () => { for (let t = 0; t <= TMAX; t += 2) if (openOf(t) <= .03) return t; return TMAX; };
  const setT = t => { K.t = clamp(t, 0, TMAX); updClot(); $('#clotStatus').textContent = clotMsg(); };
  $('#ctIn').addEventListener('input', e => { K.play = false; $('#clotPlay').textContent = 'Abspielen'; setT(+e.target.value); });
  $('#clotPlay').addEventListener('click', () => {
    if (K.t >= TMAX) K.t = 0;
    K.play = !K.play; $('#clotPlay').textContent = K.play ? 'Anhalten' : 'Abspielen';
  });
  $('#clotReset').addEventListener('click', () => { K.play = false; $('#clotPlay').textContent = 'Abspielen'; setT(0); });
  $$('#pltSel button').forEach(b => b.addEventListener('click', () => {
    K.low = b.dataset.p === 'low';
    $$('#pltSel button').forEach(x => x.classList.toggle('active', x === b));
    setT(K.t);
    if (K.t < 4) $('#clotStatus').textContent = K.low
      ? 'Sehr wenige Blutplättchen: Der Pfropf wächst langsamer, und die Blutung dauert länger. Spiel ab und vergleiche.'
      : 'Normal viele Blutplättchen. Spiel ab und schau, wie schnell sich die Lücke füllt.';
  }));
  updClot();

  // feste Bausteine: Plätze für Plättchen, Fibrin-Fäden, eingefangene rote Blutkörperchen, Zellen im Gefäss
  const CR = rng(42);
  const FIB = Array.from({ length: 46 }, () => [CR(), CR(), CR(), CR()]);
  const TRAP = Array.from({ length: 22 }, () => [CR(), CR()]);
  const FLOW = Array.from({ length: 46 }, (_, i) => ({ u: CR(), v: CR(), p: i % 5 === 0 }));
  const SLOTKEY = Array.from({ length: 400 }, () => CR());

  const star = (ctx, x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10, rr = i % 2 ? r * .55 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = PLT; ctx.fill(); ctx.strokeStyle = PLT_EDGE; ctx.lineWidth = 1; ctx.stroke();
  };

  const drawClot = dt => {
    if (K.play) {
      K.t = Math.min(TMAX, K.t + dt * 30);
      if (K.t >= TMAX) { K.play = false; $('#clotPlay').textContent = 'Abspielen'; }
      updClot(); $('#clotStatus').textContent = clotMsg();
    }
    if (!reduced) K.flow += dt;
    const { ctx, w, h } = fit(clotCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const t = K.t, plug = plugOf(t), fib = fibOf(t), op = openOf(t);

    // Schichten
    const yS = h * .2, yW = h * .44, wall = 9, yL0 = yW + wall, yL1 = h * .82, yB = h - 22;
    const gw = clamp(w * .15, 46, 84), gx = w / 2, gl = gx - gw / 2, gr = gx + gw / 2;
    ctx.fillStyle = SKIN; ctx.fillRect(0, yS, w, yW - yS);
    ctx.fillStyle = SKIN_DEEP; ctx.fillRect(0, yW, w, wall); ctx.fillRect(0, yL1, w, wall);
    ctx.fillStyle = SKIN; ctx.fillRect(0, yL1 + wall, w, yB - yL1 - wall);
    ctx.fillStyle = LUMEN; ctx.fillRect(0, yL0, w, yL1 - yL0);

    // Zellen im Gefäss
    for (const c of FLOW) {
      const x = ((c.u + K.flow * (c.p ? .05 : .06)) % 1) * (w + 20) - 10;
      const y = yL0 + 8 + c.v * (yL1 - yL0 - 16);
      if (c.p) { ctx.beginPath(); ctx.ellipse(x, y, 4, 2.4, 0, 0, TAU); ctx.fillStyle = PLT; ctx.fill(); ctx.strokeStyle = PLT_EDGE; ctx.lineWidth = 1; ctx.stroke(); }
      else drawRbc(ctx, x, y, 5.5);
    }

    // Schnitt
    ctx.fillStyle = C.bg; ctx.fillRect(gl, yS - 1, gw, yL0 - yS + 1);
    ctx.fillStyle = `rgba(163,22,43,${.25 + .55 * op})`; ctx.fillRect(gl, yS - 1, gw, yL0 - yS + 1);

    // Plättchen-Pfropf: wächst vom Rand und vom Gefäss her nach innen
    const ps = 8, cols = Math.max(2, Math.floor(gw / ps)), rows = Math.floor((yL0 + 4 - yS) / ps);
    const cw = gw / cols, slots = [];
    for (let rI = 0; rI < rows; rI++) for (let cI = 0; cI < cols; cI++) {
      const edge = Math.min(cI, cols - 1 - cI);
      slots.push({ x: gl + (cI + .5) * cw, y: yL0 + 2 - (rI + .5) * ps, k: edge * 1.1 + rI * .55 + SLOTKEY[(rI * cols + cI) % 400] * 1.6 });
    }
    slots.sort((a, b) => a.k - b.k);
    const n = Math.round(plug * slots.length);
    // eingefangene rote Blutkörperchen
    const nt = Math.round(fib * TRAP.length);
    for (let i = 0; i < n; i++) star(ctx, slots[i].x, slots[i].y, ps * .55);
    for (let i = 0; i < nt; i++) drawRbc(ctx, gl + 5 + TRAP[i][0] * (gw - 10), yS + 6 + TRAP[i][1] * (yL0 - yS - 6), 4.5);
    // Fibrin-Netz
    const nf = Math.round(fib * FIB.length);
    ctx.strokeStyle = FIBRIN; ctx.lineWidth = 1.3; ctx.globalAlpha = .95;
    for (let i = 0; i < nf; i++) {
      const [a, b2, c, d] = FIB[i];
      ctx.beginPath();
      ctx.moveTo(gl - 4 + a * (gw + 8), yS + 2 + b2 * (yL0 - yS));
      ctx.lineTo(gl - 4 + c * (gw + 8), yS + 2 + d * (yL0 - yS));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // austretendes Blut
    const lost = lostOf(t) / 60;                        // grob: wie viel schon ausgetreten ist
    const pw = Math.min(w * .42, gw * .6 + lost * gw * .9);
    ctx.beginPath(); ctx.ellipse(gx, yS, pw, 5 + Math.min(5, lost * 4), 0, Math.PI, 0);
    ctx.fillStyle = op > .03 ? BLOOD : PACKED; ctx.fill();
    if (op > .03 && !reduced) {
      const nd = Math.round(10 * op);
      ctx.fillStyle = BLOOD;
      for (let i = 0; i < nd; i++) {
        const q = (i / nd + K.flow * .7) % 1;
        const side = i % 2 ? 1 : -1;
        const x = q < .6 ? gx + side * gw * .18 : gx + side * (gw * .18 + (q - .6) / .4 * pw * .8);
        const y = q < .6 ? lerp(yL0, yS, q / .6) : yS - 4 - Math.sin((q - .6) / .4 * Math.PI) * 6;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      }
    }

    // Beschriftung
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = '#5b3420';
    ctx.fillText('Haut', 10, yS + 16);
    const vt = narrow ? 'Blutgefäss' : 'Blutgefäss, Blut fliesst →';
    roundRect(ctx, 5, yL0 + 4, ctx.measureText(vt).width + 10, 17, 6); ctx.fillStyle = 'rgba(241,220,162,.9)'; ctx.fill();
    ctx.fillStyle = '#6b2a1c'; ctx.fillText(vt, 10, yL0 + 16);
    ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = `500 11px ${MONO}`;
    ctx.fillText(op > .03 ? 'Schnitt' : 'verschlossen', gx, yS - 18);
    // Legende
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    const ly = h - 7;
    let lx = 10;
    const item = (draw, txt) => { draw(lx + 5, ly - 4); ctx.fillStyle = C.muted; ctx.fillText(txt, lx + 14, ly); lx += 14 + ctx.measureText(txt).width + (narrow ? 10 : 18); };
    item((x, y) => star(ctx, x, y, 5), narrow ? 'Plättchen' : 'Blutplättchen');
    item((x, y) => {
      roundRect(ctx, x - 6, y - 5, 12, 10, 3); ctx.fillStyle = BLOOD; ctx.fill();
      ctx.strokeStyle = FIBRIN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x + 5, y - 3); ctx.moveTo(x - 5, y - 3); ctx.lineTo(x + 5, y + 3); ctx.stroke();
    }, 'Fibrin');
    item((x, y) => drawRbc(ctx, x, y, 4.5), narrow ? 'Rote Blutk.' : 'rote Blutkörperchen');
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('blut', 4, {
    sepLock: () => { ['#sepIn', '#hctIn', '#spinBtn', '#shakeBtn'].forEach(s => $(s).disabled = false); },
    rbcLock: () => { ['#spanIn', '#liveBtn'].forEach(s => $(s).disabled = false); R2.on = true; },
    clotLock: () => { ['#ctIn', '#clotPlay', '#clotReset'].forEach(s => $(s).disabled = false); $$('#pltSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawSep(dt); drawRbcCv(dt); drawClot(dt); });
})();
