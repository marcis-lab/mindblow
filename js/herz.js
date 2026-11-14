/* mindblow – Lektion Herz */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const rgb = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const mixC = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Blut und Herzmuskel
  const BLOOD = '#a3162b', HEART = '#c8283c', MUSCLE = '#b5524a', TISSUE = '#f4e6d0';

  // Glatte, monotone Kurve durch Stützpunkte (Fritsch-Carlson)
  const mono = pts => {
    const n = pts.length, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return x => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  };

  const heartPath = (ctx, x, y, s) => {
    const t = y - s * .48;
    ctx.beginPath();
    ctx.moveTo(x, t + s * .25);
    ctx.bezierCurveTo(x, t, x - s * .5, t, x - s * .5, t + s * .3);
    ctx.bezierCurveTo(x - s * .5, t + s * .6, x, t + s * .75, x, t + s * .95);
    ctx.bezierCurveTo(x, t + s * .75, x + s * .5, t + s * .6, x + s * .5, t + s * .3);
    ctx.bezierCurveTo(x + s * .5, t, x, t, x, t + s * .25);
    ctx.closePath();
  };

  /* ---------- Teil 1: Pulsrechner ---------- */
  const pumpCv = $('#pumpCv');
  const P = { hr: 70, sv: 70, beat: 0, fill: 0, time: 0, flash: 0, lastFull: 0 };
  const ejectOf = f => f < .35 ? (1 - Math.cos(Math.PI * f / .35)) / 2 : 1;   // Anteil des Schlagvolumens, der schon draussen ist
  const updPump = () => {
    $('#hrIn').value = P.hr; $('#svIn').value = P.sv;
    $('#hrOut').textContent = `${P.hr} / min`;
    $('#svOut').textContent = `${P.sv} ml`;
    const lmin = P.hr * P.sv / 1000;
    $('#pLmin').textContent = `${fmt(lmin, 1)} l`;
    $('#pLday').textContent = `${fmt(lmin * 60 * 24, 0)} l`;
    $('#pLife').textContent = `${fmt(P.hr * 60 * 24 * 365.25 * 80 / 1e9, 1)} Mrd.`;
  };
  const tubs = () => `So würde dein Herz pro Tag rund ${fmt(P.hr * P.sv * 1.44 / 150, 0)} Badewannen füllen (à 150 Liter).`;
  $('#hrIn').addEventListener('input', e => { P.hr = +e.target.value; updPump(); $('#pumpStatus').textContent = tubs(); });
  $('#svIn').addEventListener('input', e => { P.sv = +e.target.value; updPump(); $('#pumpStatus').textContent = tubs(); });
  const preset = (hr, sv, msg) => () => { P.hr = hr; P.sv = sv; updPump(); $('#pumpStatus').textContent = msg; };
  $('#pRest').addEventListener('click', preset(70, 70, 'Ruhe: knapp 5 Liter pro Minute. Etwa dein ganzes Blut, einmal pro Minute.'));
  $('#pWalk').addEventListener('click', preset(110, 85, 'Treppe steigen: Das Herz schlägt schneller und pumpt pro Schlag etwas mehr. Fast doppelt so viel wie in Ruhe.'));
  $('#pSport').addEventListener('click', preset(170, 110, 'Sport: fast viermal so viel wie in Ruhe. Deine Muskeln brauchen jetzt viel mehr Sauerstoff (vereinfachte Werte, je nach Training).'));
  updPump();

  const drawPump = dt => {
    const { ctx, w, h } = fit(pumpCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    let squeeze = 0;
    if (!reduced) {
      if (P.flash > 0) {
        P.flash -= dt;
        if (P.flash <= 0) { P.fill = 0; P.time = 0; }
      } else {
        const prev = Math.floor(P.beat) + ejectOf(P.beat % 1);
        P.beat += dt * P.hr / 60;
        const cur = Math.floor(P.beat) + ejectOf(P.beat % 1);
        P.fill += P.sv * (cur - prev); P.time += dt;
        if (P.fill >= 5000) { P.fill = 5000; P.flash = 1.4; P.lastFull = P.time; }
      }
      const f = P.beat % 1;
      squeeze = f < .35 ? Math.sin(Math.PI * f / .35) : 0;
    }
    const fill = reduced ? Math.min(5000, P.hr * P.sv) : P.fill;

    // Herz
    const hx = w * (narrow ? .26 : .28), hy = h * .44;
    const hs = Math.min(w * (narrow ? .36 : .3), h * .5) * (1 - .1 * squeeze);
    ctx.save();
    if (!reduced && squeeze > 0) { ctx.shadowColor = HEART; ctx.shadowBlur = 24 * squeeze; }
    heartPath(ctx, hx, hy, hs); ctx.fillStyle = HEART; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(hx - hs * .24, hy - hs * .26, hs * .09, hs * .06, -.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 13 : 15}px ${MONO}`;
    ctx.fillText(`${P.hr} Schläge / min`, hx, h - 44);
    ctx.fillStyle = C.muted; ctx.font = `11px ${MONO}`;
    ctx.fillText(`${P.sv} ml pro Schlag`, hx, h - 26);

    // Messbecher
    const jx0 = w * (narrow ? .58 : .6), jx1 = w * (narrow ? .86 : .82), jy0 = 44, jy1 = h - 56;
    const jh = jy1 - jy0;
    const lvl = fill / 5000;
    ctx.fillStyle = C.sunk; ctx.fillRect(jx0, jy0, jx1 - jx0, jh);
    ctx.fillStyle = BLOOD; ctx.fillRect(jx0, jy1 - jh * lvl, jx1 - jx0, jh * lvl);
    if (!reduced && P.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${.25 * Math.min(1, P.flash)})`; ctx.fillRect(jx0, jy0, jx1 - jx0, jh); }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(jx0, jy0 - 6); ctx.lineTo(jx0, jy1); ctx.lineTo(jx1, jy1); ctx.lineTo(jx1, jy0 - 6); ctx.stroke();
    ctx.lineWidth = 1; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    for (let l = 1; l <= 5; l++) {
      const y = jy1 - jh * l / 5;
      ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(jx0, y); ctx.lineTo(jx0 + 10, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(`${l} l`, jx0 - 5, y + 3);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 12px ${MONO}`;
    const jc = (jx0 + jx1) / 2;
    ctx.fillText(narrow ? '5 l ≈ dein Blut' : '5 l ≈ dein ganzes Blut', jc, 24);
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.muted;
    const full = 5000 / (P.hr * P.sv / 60);
    if (reduced) ctx.fillText(`${fmt(fill / 1000, 1)} l pro Minute`, jc, h - 32);
    else if (P.flash > 0) { ctx.fillStyle = C.fg; ctx.fillText(`Voll nach ${fmt(P.lastFull, 0)} s`, jc, h - 32); }
    else ctx.fillText(`${fmt(fill / 1000, 1)} l in ${fmt(P.time, 0)} s`, jc, h - 32);
    ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? `voll in ${fmt(full, 0)} s` : `5 Liter in ${fmt(full, 0)} Sekunden`, jc, h - 14);
  };

  /* ---------- Teil 2: Doppelter Kreislauf ---------- */
  const circCv = $('#circCv');
  const CIRC = { sel: 'both', real: false, speed: 1, pos: 0, beat: 0, last: '' };
  // Stützpunkte in Einheiten (0..1), Blick von vorne: die rechte Herzhälfte ist links im Bild
  const NODES = [];
  const add = (x, y, o, seg) => NODES.push({ x, y, o, seg });
  add(.14, .88, 0, 'vc'); add(.14, .43, 0, 'vc');
  add(.30, .43, 0, 'ra'); add(.36, .45, 0, 'ra');
  add(.36, .60, 0, 'rv'); add(.40, .66, 0, 'rv'); add(.46, .60, 0, 'rv');
  add(.46, .50, 0, 'pa'); add(.46, .30, 0, 'pa'); add(.30, .30, 0, 'pa'); add(.30, .20, 0, 'pa');
  add(.30, .13, 0, 'lu');
  for (let i = 1; i < 12; i++) add(.30 + .40 * i / 12, .13 + .03 * Math.sin(i * Math.PI / 1.5), clamp((i - 1) / 9, 0, 1), 'lu');
  add(.70, .13, 1, 'pv'); add(.70, .33, 1, 'pv'); add(.64, .40, 1, 'la');
  add(.64, .45, 1, 'la'); add(.64, .60, 1, 'lv'); add(.60, .66, 1, 'lv'); add(.54, .60, 1, 'lv');
  add(.54, .50, 1, 'ao'); add(.54, .26, 1, 'ao'); add(.86, .26, 1, 'ao'); add(.86, .80, 1, 'ao');
  add(.86, .88, 1, 'kp');
  for (let i = 1; i < 14; i++) add(.86 - .68 * i / 14, .88 + .025 * Math.sin(i * Math.PI / 1.5), clamp(1 - (i - 1) / 10, 0, 1), 'kp');
  const ROOMS = {
    ra: [.28, .36, .16, .14], la: [.56, .36, .16, .14],
    rv: [.28, .52, .20, .20], lv: [.52, .52, .20, .20],
  };
  const PLACE = { vc: 'Hohlvene', ra: 'rechter Vorhof', rv: 'rechte Kammer', pa: 'Lungenarterie', lu: 'Lunge', pv: 'Lungenvene', la: 'linker Vorhof', lv: 'linke Kammer', ao: 'Aorta', kp: 'Körper' };
  const LOOP = { pa: 'lung', lu: 'lung', pv: 'lung', ao: 'body', kp: 'body', vc: 'body' };
  const LOOPNAME = { lung: 'Lungenkreislauf', body: 'Körperkreislauf', ra: 'Herz, rechts', rv: 'Herz, rechts', la: 'Herz, links', lv: 'Herz, links' };
  // Länge der Strecke vorberechnen (in Einheiten, Seitenverhältnis wird beim Zeichnen ausgeglichen)
  const SEGLEN = [];
  let TOTAL = 0;
  NODES.forEach((n, i) => { const m = NODES[(i + 1) % NODES.length]; const l = Math.hypot(m.x - n.x, (m.y - n.y) * 1.2); SEGLEN.push(l); TOTAL += l; });
  const at = s => {
    let d = ((s % 1) + 1) % 1 * TOTAL, i = 0;
    while (d > SEGLEN[i]) { d -= SEGLEN[i]; i++; }
    const a = NODES[i], b = NODES[(i + 1) % NODES.length], k = d / SEGLEN[i];
    const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k), o = lerp(a.o, b.o, k);
    let room = null;
    for (const r in ROOMS) { const [rx, ry, rw, rh] = ROOMS[r]; if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) room = r; }
    return { x, y, o, seg: room || a.seg, loop: room ? null : LOOP[a.seg] };
  };
  const SCHEMA = [[59, 111, 216], [210, 58, 58]], REAL = [[110, 16, 32], [226, 46, 56]];
  const bloodCol = (o, a = 1) => { const p = CIRC.real ? REAL : SCHEMA; return rgb(mixC(p[0], p[1], o), a); };

  $$('#circSel button').forEach(b => b.addEventListener('click', () => {
    CIRC.sel = b.dataset.c;
    $$('#circSel button').forEach(x => x.classList.toggle('active', x === b));
    $('#circStatus').textContent = {
      both: 'Zwei Kreisläufe hintereinander. Jeder Tropfen geht abwechselnd durch die Lunge und durch den Körper.',
      lung: 'Lungenkreislauf: rechte Kammer, Lungenarterie, Lunge, Lungenvene, linker Vorhof. Ein kurzer Weg.',
      body: 'Körperkreislauf: linke Kammer, Aorta, der ganze Körper, Hohlvenen, rechter Vorhof. Ein sehr langer Weg.',
    }[CIRC.sel];
  }));
  $('#spdIn').addEventListener('input', e => { CIRC.speed = Math.pow(2, (+e.target.value - 40) / 25); $('#spdOut').textContent = '×' + fmt(CIRC.speed, 1); });
  $('#realBtn').addEventListener('click', () => {
    CIRC.real = !CIRC.real;
    $('#realBtn').textContent = CIRC.real ? 'Schema-Farben zeigen' : 'Echte Farben zeigen';
    $('#circStatus').textContent = CIRC.real
      ? 'Echte Farben: Blut ist überall rot. Mit Sauerstoff hellrot, ohne Sauerstoff dunkelrot.'
      : 'Schema-Farben: Blau heisst hier nur «wenig Sauerstoff». In echt ist dieses Blut dunkelrot.';
  });

  const drawCirc = dt => {
    const { ctx, w, h } = fit(circCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const ox = 12, oy = 10, W = w - 24, H = h - 20;
    const X = u => ox + u * W, Y = v => oy + v * H;
    const vw = clamp(Math.min(W, H) * .02, 4, 8);
    const dimOf = loopId => CIRC.sel === 'both' || !loopId || loopId === CIRC.sel ? 1 : .18;

    // Lunge und Körper
    ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center';
    roundRect(ctx, X(.22), Y(.04), X(.78) - X(.22), Y(.22) - Y(.04), 14); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.globalAlpha = dimOf('lung'); ctx.fillStyle = C.fg; ctx.fillText('Lunge', X(.5), Y(.075) + 4); ctx.globalAlpha = 1;
    roundRect(ctx, X(.08), Y(.80), X(.92) - X(.08), Y(.97) - Y(.80), 14); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.globalAlpha = dimOf('body'); ctx.fillStyle = C.fg; ctx.fillText(narrow ? 'Körper' : 'Körper: Muskeln, Organe, Gehirn', X(.5), Y(.945)); ctx.globalAlpha = 1;
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText('Blick von vorne', ox + 2, oy + 10);

    // Gefässe
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < NODES.length; i++) {
      const a = NODES[i], b = NODES[(i + 1) % NODES.length];
      const room = ['ra', 'rv', 'la', 'lv'].includes(a.seg);
      if (room) continue;
      ctx.globalAlpha = dimOf(LOOP[a.seg]);
      ctx.strokeStyle = bloodCol((a.o + b.o) / 2, .45); ctx.lineWidth = vw;
      ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke();
    }
    // Aortenbogen liegt über der Lungenvene
    ctx.globalAlpha = dimOf('body');
    ctx.strokeStyle = C.surface; ctx.lineWidth = vw + 4;
    ctx.beginPath(); ctx.moveTo(X(.67), Y(.26)); ctx.lineTo(X(.73), Y(.26)); ctx.stroke();
    ctx.strokeStyle = bloodCol(1, .45); ctx.lineWidth = vw;
    ctx.beginPath(); ctx.moveTo(X(.66), Y(.26)); ctx.lineTo(X(.74), Y(.26)); ctx.stroke();
    ctx.globalAlpha = 1;

    // Herzräume
    for (const r in ROOMS) {
      const [rx, ry, rw, rh] = ROOMS[r];
      roundRect(ctx, X(rx), Y(ry), rw * W, rh * H, 10);
      ctx.fillStyle = C.surface; ctx.fill();
      ctx.strokeStyle = MUSCLE; ctx.lineWidth = r === 'lv' ? 7 : r === 'rv' ? 3 : 2; ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(r[1] === 'a' ? 'Vorhof' : 'Kammer', X(rx + rw / 2), Y(ry + rh) - 7);
    }
    // Klappen
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const valve = (x, y, half) => {
      ctx.beginPath(); ctx.moveTo(X(x - half), Y(y)); ctx.lineTo(X(x) - 2, Y(y) + 4);
      ctx.moveTo(X(x + half), Y(y)); ctx.lineTo(X(x) + 2, Y(y) + 4); ctx.stroke();
    };
    valve(.36, .51, .03); valve(.64, .51, .03); valve(.46, .515, .015); valve(.54, .515, .015);
    // Beschriftung
    ctx.font = `11px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'rechts' : 'rechte Hälfte', X(.38), Y(.765));
    ctx.fillText(narrow ? 'links' : 'linke Hälfte', X(.62), Y(.765));
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.globalAlpha = dimOf('body');
    ctx.textAlign = 'right'; ctx.fillText('Aorta', X(.86) - vw, Y(.42));
    ctx.textAlign = 'left'; ctx.fillText('Hohlvene', X(.14) + vw, Y(.66));
    ctx.globalAlpha = dimOf('lung');
    if (!narrow) {
      ctx.textAlign = 'left'; ctx.fillText('Lungenarterie', X(.30) + vw, Y(.30) - vw);
      ctx.fillText('Lungenvene', X(.70) + vw, Y(.36));
    }
    ctx.globalAlpha = 1;

    // Bluttropfen
    if (!reduced) {
      CIRC.beat += dt * 1.2 * CIRC.speed;
      const push = .45 + 1.1 * Math.max(0, Math.sin(TAU * CIRC.beat));
      CIRC.pos += dt * CIRC.speed * push / 10;
    }
    const N = 56, r0 = clamp(vw * .7, 3, 5);
    for (let i = N - 1; i >= 0; i--) {
      const p = at(CIRC.pos + i / N);
      const inRoom = !p.loop;
      ctx.globalAlpha = inRoom ? 1 : dimOf(p.loop);
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), i === 0 ? r0 * 1.5 : r0, 0, TAU);
      ctx.fillStyle = bloodCol(p.o); ctx.fill();
      if (i === 0) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r0 * 1.5 + 4, 0, TAU); ctx.stroke();
        const key = p.seg + (p.o > .6 ? 'h' : p.o < .4 ? 'l' : 'm');
        if (key !== CIRC.last) {
          CIRC.last = key;
          $('#cPlace').textContent = PLACE[p.seg];
          $('#cOxy').textContent = p.seg === 'lu' && p.o > .05 && p.o < .95 ? 'nimmt O₂ auf'
            : p.seg === 'kp' && p.o > .05 && p.o < .95 ? 'gibt O₂ ab'
            : p.o > .5 ? 'viel · hellrot' : 'wenig · dunkelrot';
          $('#cLoop').textContent = LOOPNAME[p.loop || p.seg];
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- Teil 3: Ein Herzschlag in Zeitlupe ---------- */
  const valveCv = $('#valveCv');
  const T = 0.8;                         // ein Herzschlag in Ruhe, in Sekunden
  const V = { t: 0, play: false, leak: false, flow: 0 };
  const LV = mono([[0, 10], [.05, 80], [.12, 117], [.18, 121], [.26, 108], [.30, 96], [.36, 10], [.40, 4], [.55, 5], [.70, 7], [.76, 11], [.80, 10]]);
  const AO = mono([[0, 82], [.05, 80], [.12, 115], [.18, 119], [.26, 106], [.30, 97], [.315, 92], [.335, 96], [.45, 92], [.65, 86], [.80, 82]]);
  const LA = mono([[0, 11], [.03, 13], [.08, 6], [.30, 11], [.37, 13], [.45, 7], [.60, 6], [.70, 7], [.75, 12], [.80, 11]]);
  const LV2 = mono([[0, 12], [.05, 72], [.12, 106], [.18, 110], [.26, 98], [.30, 88], [.36, 12], [.40, 6], [.55, 8], [.70, 10], [.76, 13], [.80, 12]]);
  const AO2 = mono([[0, 78], [.07, 76], [.13, 104], [.18, 108], [.26, 97], [.30, 87], [.315, 83], [.335, 86], [.45, 84], [.65, 80], [.80, 78]]);
  const LA2 = mono([[0, 14], [.03, 16], [.10, 26], [.24, 38], [.32, 37], [.40, 20], [.50, 13], [.70, 12], [.75, 15], [.80, 14]]);
  const VOL = mono([[0, 120], [.05, 120], [.15, 78], [.30, 50], [.38, 50], [.48, 92], [.70, 110], [.80, 120]]);
  const mitralOpen = t => t < .38 ? 0 : t < .41 ? (t - .38) / .03 : t < .785 ? 1 : (T - t) / .015;
  const aorticOpen = t => t < .05 ? 0 : t < .07 ? (t - .05) / .02 : t < .29 ? 1 : t < .30 ? (.30 - t) / .01 : 0;
  const phaseOf = t => t < .05 ? ['Systole', 'Anspannung, alle Klappen zu'] : t < .30 ? ['Systole', 'Austreibung in die Aorta']
    : t < .38 ? ['Diastole', 'Entspannung, alle Klappen zu'] : t < .70 ? ['Diastole', 'Füllung aus dem Vorhof'] : ['Diastole', 'Vorhof drückt nach'];
  const updValve = () => {
    const t = V.t;
    $('#tIn').value = Math.round(t * 1000);
    $('#tOut').textContent = `${fmt(t, 2)} s`;
    const [a, b] = phaseOf(t);
    $('#vPhase').textContent = a; $('#vPhase2').textContent = b;
    $('#vPress').textContent = `${fmt((V.leak ? LV2 : LV)(t), 0)} mmHg`;
    $('#vVol').textContent = `${fmt(VOL(t), 0)} ml`;
  };
  $('#tIn').addEventListener('input', e => {
    V.t = +e.target.value / 1000; V.play = false; $('#playBtn').textContent = 'Zeitlupe abspielen'; updValve();
  });
  $('#playBtn').addEventListener('click', () => {
    V.play = !V.play; $('#playBtn').textContent = V.play ? 'Anhalten' : 'Zeitlupe abspielen';
  });
  $('#leakBtn').addEventListener('click', () => {
    V.leak = !V.leak;
    $('#leakBtn').textContent = V.leak ? 'Klappe reparieren' : 'Klappe undicht';
    $('#valveStatus').textContent = V.leak
      ? 'Die Segelklappe schliesst nicht ganz. In der Systole spritzt ein Teil des Bluts zurück in den Vorhof, und der Druck dort steigt stark. Mit dem Stethoskop hört man dabei ein Rauschen, ein sogenanntes Herzgeräusch.'
      : 'Klappe dicht: Das Blut fliesst nur vorwärts, vom Vorhof in die Kammer und von dort in die Aorta.';
    updValve();
  });
  updValve();

  const drawValve = dt => {
    if (V.play) { V.t = (V.t + dt * T / 6) % T; updValve(); }
    if (!reduced) V.flow = (V.flow + dt * .9) % 1;
    const t = V.t, { ctx, w, h } = fit(valveCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const H1 = h * .5;

    // --- Herzschema: linker Vorhof, linke Kammer, Aorta ---
    const cx = w * (narrow ? .46 : .44), lw = Math.min(w * (narrow ? .5 : .4), 200);
    const yv0 = H1 * .5;
    const k = (VOL(t) - 50) / 70;
    const lh = H1 * (.34 + .12 * k), bulge = lw * (.03 + .1 * k);
    const mx = cx - lw * .22, ow = lw * .36, ax = cx + lw * .25, aw = lw * .22;
    const laX0 = cx - lw * .49, laX1 = cx + lw * .05, laY0 = yv0 - H1 * .34;
    // Aorta
    ctx.fillStyle = BLOOD; ctx.fillRect(ax - aw / 2, 6, aw, yv0 - 6);
    ctx.strokeStyle = MUSCLE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax - aw / 2, 6); ctx.lineTo(ax - aw / 2, yv0); ctx.moveTo(ax + aw / 2, 6); ctx.lineTo(ax + aw / 2, yv0); ctx.stroke();
    // Vorhof
    roundRect(ctx, laX0, laY0, laX1 - laX0, yv0 - laY0, 12);
    ctx.fillStyle = BLOOD; ctx.fill(); ctx.strokeStyle = MUSCLE; ctx.lineWidth = 3; ctx.stroke();
    // Kammer
    ctx.beginPath();
    ctx.moveTo(cx - lw / 2, yv0);
    ctx.bezierCurveTo(cx - lw / 2 - bulge, yv0 + lh * .55, cx - lw * .22, yv0 + lh, cx, yv0 + lh);
    ctx.bezierCurveTo(cx + lw * .22, yv0 + lh, cx + lw / 2 + bulge, yv0 + lh * .55, cx + lw / 2, yv0);
    ctx.closePath();
    ctx.fillStyle = BLOOD; ctx.fill(); ctx.strokeStyle = MUSCLE; ctx.lineWidth = 8; ctx.stroke();
    // Öffnungen freilegen
    ctx.fillStyle = BLOOD;
    ctx.fillRect(mx - ow / 2, yv0 - 6, ow, 12);
    ctx.fillRect(ax - aw / 2 + 1, yv0 - 6, aw - 2, 12);

    // Fliessendes Blut als Punkte
    const dots = (x0, y0, x1, y1, col, n = 5) => {
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const q = (i / n + V.flow) % 1;
        ctx.globalAlpha = Math.sin(q * Math.PI);
        ctx.beginPath(); ctx.arc(lerp(x0, x1, q), lerp(y0, y1, q), 3, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const mo = mitralOpen(t), ao = aorticOpen(t);
    if (mo > .3) dots(mx, laY0 + 14, mx, yv0 + lh * .55, 'rgba(255,225,225,.95)');
    if (ao > .3) dots(cx + lw * .1, yv0 + lh * .6, ax, 14, 'rgba(255,225,225,.95)');
    const back = V.leak && t > .04 && t < .31;
    if (back) dots(mx, yv0 + lh * .5, mx, laY0 + 10, '#ffd34d', 6);

    // Klappen-Segel
    const leaf = (hx, hy, len, ang, dir, side) => {
      ctx.beginPath(); ctx.moveTo(hx, hy);
      ctx.lineTo(hx + side * len * Math.cos(ang), hy + dir * len * Math.sin(ang)); ctx.stroke();
    };
    ctx.strokeStyle = TISSUE; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    const mAng = Math.max(V.leak ? .38 : 0, mo * 1.3), aAng = ao * 1.3;
    leaf(mx - ow / 2, yv0, ow / 2 - 1, mAng, 1, 1); leaf(mx + ow / 2, yv0, ow / 2 - 1, mAng, 1, -1);
    leaf(ax - aw / 2 + 1, yv0, aw / 2 - 2, aAng, -1, 1); leaf(ax + aw / 2 - 1, yv0, aw / 2 - 2, aAng, -1, -1);

    // Beschriftung
    ctx.fillStyle = '#ffffff'; ctx.font = `11px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Vorhof' : 'linker Vorhof', (laX0 + laX1) / 2, laY0 + 17);
    ctx.fillText(narrow ? 'Kammer' : 'linke Kammer', cx, yv0 + lh * .78);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText('Aorta', ax + aw / 2 + 6, 18);
    ctx.fillText(narrow ? 'zum Körper' : '↑ zum Körper', ax + aw / 2 + 6, 31);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'von Lunge' : 'von der Lunge →', laX0 - 6, laY0 + 17);
    ctx.fillText(narrow ? 'Segel-' : 'Segelklappe', laX0 - 6, yv0 + 4);
    if (narrow) ctx.fillText('klappe', laX0 - 6, yv0 + 16);
    ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Taschen-' : 'Taschenklappe', cx + lw / 2 + 8, yv0 + 4);
    if (narrow) ctx.fillText('klappe', cx + lw / 2 + 8, yv0 + 16);
    if (back) { ctx.fillStyle = '#ffd34d'; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('Rückfluss!', (laX0 + laX1) / 2, laY0 + 31); }

    // Lub und Dub
    const near = (a, b) => { const d = Math.abs(a - b); return Math.min(d, T - d); };
    const lub = 1 - near(t, 0) / .03, dub = 1 - near(t, .30) / .03;
    ctx.font = `600 ${narrow ? 18 : 22}px ${MONO}`; ctx.textAlign = 'center';
    if (lub > 0) { ctx.globalAlpha = lub; ctx.fillStyle = C.glow; ctx.fillText('LUB', cx, yv0 + lh * .45); }
    if (dub > 0) { ctx.globalAlpha = dub; ctx.fillStyle = C.glow; ctx.fillText('DUB', ax, 46); }
    ctx.globalAlpha = 1;

    // --- Druckkurven ---
    const gx0 = 38, gx1 = w - 12, gy0 = H1 + 30, gy1 = h - 26;
    const GX = s => gx0 + s / T * (gx1 - gx0), GY = p => gy1 - p / 140 * (gy1 - gy0);
    ctx.fillStyle = C.sunk; ctx.fillRect(GX(0), gy0, GX(.30) - GX(0), gy1 - gy0);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('Systole', (GX(0) + GX(.30)) / 2, gy0 + 12);
    ctx.fillText('Diastole', (GX(.30) + GX(T)) / 2, gy0 + 12);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (const p of [0, 40, 80, 120]) {
      ctx.beginPath(); ctx.moveTo(gx0, GY(p)); ctx.lineTo(gx1, GY(p)); ctx.stroke();
      ctx.fillText(String(p), gx0 - 5, GY(p) + 3);
    }
    ctx.textAlign = 'left'; ctx.fillText('Druck in mmHg', gx0, gy0 - 8);
    const curves = [[V.leak ? AO2 : AO, C.copper, 'Aorta'], [V.leak ? LA2 : LA, C.fiber, 'Vorhof'], [V.leak ? LV2 : LV, C.accent, 'Kammer']];
    // Legende
    ctx.textAlign = 'right'; let lx = gx1;
    for (const [, col, name] of curves) {
      ctx.fillStyle = col; ctx.fillText(name, lx, gy0 - 8);
      lx -= ctx.measureText(name).width + 12;
    }
    ctx.lineWidth = 2;
    for (const [f, col] of curves) {
      ctx.strokeStyle = col; ctx.beginPath();
      for (let i = 0; i <= 160; i++) { const s = T * i / 160; i ? ctx.lineTo(GX(s), GY(f(s))) : ctx.moveTo(GX(s), GY(f(s))); }
      ctx.stroke();
    }
    // Herztöne an der Zeitachse
    ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = `500 10px ${MONO}`;
    ctx.fillText('Lub', GX(0) + 8, gy1 + 14); ctx.fillText('Dub', GX(.30), gy1 + 14);
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.font = `10px ${MONO}`;
    ctx.fillText('0,8 s', gx1, gy1 + 14);
    // Zeitpunkt
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(GX(t), gy0); ctx.lineTo(GX(t), gy1); ctx.stroke();
    for (const [f, col] of curves) { ctx.beginPath(); ctx.arc(GX(t), GY(f(t)), 4, 0, TAU); ctx.fillStyle = col; ctx.fill(); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('herz', 4, {
    pumpLock: () => { ['#hrIn', '#svIn', '#pRest', '#pWalk', '#pSport'].forEach(s => $(s).disabled = false); },
    circLock: () => { $('#spdIn').disabled = false; $('#realBtn').disabled = false; $$('#circSel button').forEach(b => b.disabled = false); },
    valveLock: () => { ['#tIn', '#playBtn', '#leakBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawPump(dt); drawCirc(dt); drawValve(dt); });
})();
