/* mindblow – Lektion Schlaf */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const mod = (v, m) => ((v % m) + m) % m;
  // Uhrzeit aus Minuten oder Stunden: 6:30
  const clockM = m => { const t = Math.round(mod(m, 1440)); return `${Math.floor(t / 60) % 24}:${String(t % 60).padStart(2, '0')}`; };
  const clockH = h => clockM(h * 60);
  const durTxt = m => { const h = Math.floor(m / 60), r = Math.round(m % 60); return r ? `${h} h ${r} min` : `${h} h`; };

  /* ---------- Teil 1: Hypnogramm einer Nacht ---------- */
  const hypCv = $('#hypCv');
  // Vereinfachte Nacht: 7 Zyklen à 90 min. Tiefschlaf nimmt ab, REM nimmt zu.
  const DEEP = [40, 30, 15, 5, 0, 0, 0], REM = [8, 15, 22, 28, 32, 35, 35];
  const NIGHT = [];
  {
    let t = 0;
    const push = (len, s) => {
      if (len <= 0) return;
      const last = NIGHT[NIGHT.length - 1];
      if (last && last.s === s) last.b += len; else NIGHT.push({ a: t, b: t + len, s });
      t += len;
    };
    for (let i = 0; i < DEEP.length; i++) {
      const light = 90 - DEEP[i] - REM[i];
      let la = light * .65;
      const lb = light - la;
      if (i >= 2) { push(2, 'W'); la -= 2; }   // kurze Wachmomente zwischen späten Zyklen
      push(la, 'L'); push(DEEP[i], 'D'); push(lb, 'L'); push(REM[i], 'R');
    }
  }
  const LEVEL = { W: 0, R: 1, L: 2, D: 3 };
  const ROWNAME = ['Wach', 'REM', 'Leicht', 'Tief'];
  const LONG = { W: 'kurz wach', R: 'REM-Schlaf', L: 'Leichtschlaf', D: 'Tiefschlaf' };
  const stageAt = m => (NIGHT.find(s => m >= s.a && m < s.b) || NIGHT[NIGHT.length - 1]).s;
  const colOf = s => ({ W: C.muted, R: C.glow, L: C.fiber, D: C.accent }[s]);
  const minutesOf = (s, from, to) => NIGHT.reduce((n, g) => g.s === s ? n + Math.max(0, Math.min(g.b, to) - Math.max(g.a, from)) : n, 0);

  const H = { dur: 450, wake: 390, anim: 0, hold: 0 };
  const hypMsg = {
    D: 'Aus dem Tiefschlaf gerissen: Du bist wahrscheinlich benommen, verwirrt und brauchst eine Weile, bis du klar denkst. Das heisst Schlaftrunkenheit.',
    L: 'Aus dem Leichtschlaf: Das Aufwachen fällt meist recht leicht.',
    R: 'Aus dem REM-Schlaf: Gut möglich, dass du dich an einen Traum erinnerst. Wach wirst du meist schnell.',
    W: 'Genau in einem kurzen Wachmoment zwischen zwei Zyklen: Aufstehen fällt leicht. In echt schwanken die Zyklen aber, auf die Minute planen kann man das nicht.',
  };
  const updHyp = () => {
    $('#durIn').value = H.dur; $('#wakeIn').value = H.wake;
    $('#durOut').textContent = durTxt(H.dur);
    $('#wakeOut').textContent = clockM(H.wake);
    const s = stageAt(H.dur - .01);
    $('#hStage').textContent = LONG[s];
    $('#hStage2').textContent = s === 'D' ? 'Schlaftrunkenheit droht' : 'Phase beim Wecker';
    const deep = minutesOf('D', 0, H.dur), deep1 = minutesOf('D', 0, H.dur / 2);
    $('#hDeep').textContent = `${fmt(deep, 0)} min`;
    $('#hDeep2').textContent = deep ? `davon ${fmt(deep1 / deep * 100, 0)} % in der 1. Hälfte` : 'keiner';
    $('#hRem').textContent = `${fmt(minutesOf('R', 0, H.dur), 0)} min`;
    $('#hypStatus').textContent = `Eingeschlafen um ${clockM(H.wake - H.dur)}. ${hypMsg[s]}`;
    H.anim = 0; H.hold = 0;
  };
  $('#durIn').addEventListener('input', e => { H.dur = +e.target.value; updHyp(); });
  $('#wakeIn').addEventListener('input', e => { H.wake = +e.target.value; updHyp(); });
  $('#hShort').addEventListener('click', () => { H.dur = 340; updHyp(); });
  $('#hLong').addEventListener('click', () => { H.dur = 540; updHyp(); });
  updHyp();
  $('#hypStatus').textContent = 'Der Punkt zeigt, in welcher Phase du gerade bist. Bei der roten Linie klingelt der Wecker.';

  const drawHyp = dt => {
    const { ctx, w, h } = fit(hypCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const x0 = narrow ? 46 : 56, x1 = w - 12, y0 = 34, y1 = h - 42;
    const MAX = 600;
    const X = m => x0 + m / MAX * (x1 - x0);
    const rowH = (y1 - y0) / 4, RY = l => y0 + rowH * (l + .5);

    // Zeilen
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    for (let l = 0; l < 4; l++) {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, RY(l)); ctx.lineTo(x1, RY(l)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(ROWNAME[l], x0 - 6, RY(l) + 3);
    }
    // Zyklen
    ctx.textAlign = 'center';
    for (let c = 0; c * 90 < MAX; c++) {
      if (c) { ctx.setLineDash([3, 4]); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(c * 90), y0 - 6); ctx.lineTo(X(c * 90), y1); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = C.muted;
      const lbl = narrow ? String(c + 1) : `Zyklus ${c + 1}`;
      ctx.fillText(lbl, Math.min(X((c * 90 + Math.min(MAX, c * 90 + 90)) / 2), x1 - ctx.measureText(lbl).width / 2), y0 - 12);
    }
    // Blöcke und Stufenlinie
    const bh = rowH * .5;
    for (const g of NIGHT) {
      if (g.a >= MAX) break;
      const a = g.a, b = Math.min(g.b, MAX), y = RY(LEVEL[g.s]) - bh / 2;
      ctx.fillStyle = colOf(g.s);
      if (a < H.dur) { ctx.globalAlpha = .9; ctx.fillRect(X(a), y, X(Math.min(b, H.dur)) - X(a), bh); }
      if (b > H.dur) { ctx.globalAlpha = .14; ctx.fillRect(X(Math.max(a, H.dur)), y, X(b) - X(Math.max(a, H.dur)), bh); }
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.fg; ctx.globalAlpha = .55;
    ctx.beginPath();
    NIGHT.forEach((g, i) => {
      if (g.a >= H.dur) return;
      const y = RY(LEVEL[g.s]);
      if (!i) ctx.moveTo(X(g.a), y); else ctx.lineTo(X(g.a), y);
      ctx.lineTo(X(Math.min(g.b, H.dur)), y);
    });
    ctx.stroke(); ctx.globalAlpha = 1;

    // Uhrzeiten
    const bed = H.wake - H.dur;
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    const first = mod(60 - mod(bed, 60), 60);
    for (let m = first; m <= MAX; m += 60) {
      const hr = Math.round(mod(bed + m, 1440) / 60) % 24;
      if (narrow && hr % 2) continue;
      if (Math.abs(X(m) - X(H.dur)) < 34 || X(m) - x0 < 50) continue;
      ctx.beginPath(); ctx.moveTo(X(m), y1); ctx.lineTo(X(m), y1 + 4); ctx.strokeStyle = C.line; ctx.stroke();
      ctx.fillText(`${hr}:00`, X(m), y1 + 16);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText(clockM(bed), x0, y1 + 16);
    ctx.fillStyle = C.muted; ctx.fillText(narrow ? 'ein' : 'eingeschlafen', x0, y1 + 30);

    // Wecker
    const wx = X(H.dur);
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx, y0 - 4); ctx.lineTo(wx, y1 + 4); ctx.stroke();
    ctx.fillStyle = C.bad; ctx.font = `500 10px ${MONO}`;
    ctx.textAlign = wx > x1 - 40 ? 'right' : wx < x0 + 40 ? 'left' : 'center';
    ctx.fillText(clockM(H.wake), wx, y1 + 16);
    ctx.fillText('Wecker', wx, y1 + 30);

    // Schläfer-Punkt
    if (!reduced) {
      if (H.hold > 0) { H.hold -= dt; if (H.hold <= 0) H.anim = 0; }
      else { H.anim += dt * H.dur / 7; if (H.anim >= H.dur) { H.anim = H.dur - .01; H.hold = 1.8; } }
    }
    const pm = reduced ? H.dur - .01 : H.anim;
    const ps = stageAt(pm), px = X(pm), py = RY(LEVEL[ps]);
    ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
    if (reduced || H.hold > 0) {
      const ring = reduced ? 0 : (1.8 - H.hold) * 18;
      ctx.beginPath(); ctx.arc(px, py, 12 + ring, 0, TAU);
      ctx.strokeStyle = C.bad; ctx.globalAlpha = reduced ? 1 : clamp(H.hold / 1.8, 0, 1); ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  /* ---------- Teil 2: Behalten mit und ohne Schlaf ---------- */
  const learnCv = $('#learnCv');
  const L = { learn: 20, sleep: 8, t: 0 };
  // Modell (vereinfacht): Vergessen bremst sich, je stabiler die Erinnerung ist.
  // Im Schlaf wird sie schneller stabil und es geht weniger verloren.
  const STEP = 1 / 12;
  const simLearn = (learn, sdur) => {
    let S = 4, I = 0;
    const out = [100];
    for (let i = 0; i < 24 * 12; i++) {
      const t = i * STEP, off = mod(learn + t - 23, 24), asleep = off < sdur;
      S += (asleep ? 6 : 3) * STEP;
      I += STEP / S * (asleep ? .2 : 1);
      out.push(100 * Math.exp(-I));
    }
    return out;
  };
  const NONE = simLearn(20, 0);
  let CUR = simLearn(L.learn, L.sleep);
  const updLearn = () => {
    $('#lrnIn').value = L.learn; $('#slpIn').value = L.sleep;
    $('#lrnOut').textContent = clockH(L.learn);
    $('#slpOut').textContent = `${fmt(L.sleep, L.sleep % 1 ? 1 : 0)} h`;
    CUR = simLearn(L.learn, L.sleep);
    const k = CUR[CUR.length - 1], n = NONE[NONE.length - 1];
    $('#lKeep').textContent = `${fmt(k, 0)} %`;
    $('#lNoSleep').textContent = `${fmt(n, 0)} %`;
    const d = Math.round(k) - Math.round(n);
    $('#lDiff').textContent = (d > 0 ? '+' : '') + fmt(d, 0);
    const gap = mod(23 - L.learn, 24);
    $('#learnStatus').textContent = L.sleep === 0
      ? 'Ohne Schlaf: Das Vergessen läuft ungebremst weiter. Modell, stark vereinfacht.'
      : gap <= 1.5
        ? 'Kurz nach dem Lernen schlafen: Bis zum Einschlafen geht wenig verloren, danach wird gefestigt. Modell, stark vereinfacht.'
        : gap >= 10
          ? 'Viele Stunden wach bis zum Schlaf: Schon vorher geht einiges verloren. Der Schlaf rettet, was noch da ist. Modell, stark vereinfacht.'
          : 'Modell, stark vereinfacht: Die Zahlen sind ausgedacht. Die Richtung stammt aus Studien.';
  };
  $('#lrnIn').addEventListener('input', e => { L.learn = +e.target.value; updLearn(); });
  $('#slpIn').addEventListener('input', e => { L.sleep = +e.target.value; updLearn(); });
  $('#lEve').addEventListener('click', () => { L.learn = 21; L.sleep = 8.5; updLearn(); });
  $('#lMorn').addEventListener('click', () => { L.learn = 8; L.sleep = 8; updLearn(); });
  $('#lNone').addEventListener('click', () => { L.sleep = 0; updLearn(); });
  updLearn();
  $('#learnStatus').textContent = 'Modell, stark vereinfacht: Die Zahlen sind ausgedacht. Die Richtung stammt aus Studien.';

  const drawLearn = dt => {
    const { ctx, w, h } = fit(learnCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const x0 = 40, x1 = w - (narrow ? 36 : 44), y0 = 40, y1 = h - 34;
    const X = t => x0 + t / 24 * (x1 - x0), Y = p => y1 - p / 100 * (y1 - y0);

    // Schlaf-Band
    const s0 = mod(23 - L.learn, 24), s1 = Math.min(24, s0 + L.sleep);
    if (L.sleep > 0 && s0 < 24) {
      ctx.fillStyle = C.sunk; ctx.fillRect(X(s0), y0 - 8, X(s1) - X(s0), y1 - y0 + 8);
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      const bw = X(s1) - X(s0);
      if (bw > 34) ctx.fillText('Schlaf', (X(s0) + X(s1)) / 2, y1 - 8);
      if (bw > 110 && !narrow) ctx.fillText('wird gefestigt', (X(s0) + X(s1)) / 2, y1 - 20);
      // Wiederholung im Schlaf, als kleine Funken angedeutet
      if (!reduced) {
        L.t += dt;
        ctx.fillStyle = C.glow;
        for (let i = 0; i < 9; i++) {
          const q = mod(L.t * .12 + i / 9, 1);
          const x = X(s0) + bw * mod(i * .618 + .1, 1);
          const y = y1 - 30 - q * (y1 - y0 - 50);
          ctx.globalAlpha = Math.sin(q * Math.PI) * .7;
          ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    // Raster
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'right'; ctx.lineWidth = 1;
    for (const p of [0, 25, 50, 75, 100]) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x0, Y(p)); ctx.lineTo(x1, Y(p)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(`${p}`, x0 - 6, Y(p) + 3);
    }
    ctx.textAlign = 'center';
    for (let t = 0; t <= 24; t += narrow ? 6 : 4) ctx.fillText(clockH(L.learn + t), X(t), y1 + 16);
    ctx.textAlign = 'left'; ctx.fillText('% behalten', x0 - 22, 14);
    ctx.textAlign = 'right'; ctx.fillText(narrow ? '+24 h' : 'Test nach 24 h', x1, y1 + 30);

    // Kurven
    const curve = (arr, col, lw, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash);
      ctx.beginPath();
      arr.forEach((v, i) => { const x = X(i * STEP), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(NONE, C.muted, 2, [5, 4]);
    curve(CUR, C.accent, 3, []);
    const kv = CUR[CUR.length - 1], nv = NONE[NONE.length - 1];
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'left';
    let ky = Y(kv) + 4, ny = Y(nv) + 4;
    if (Math.abs(ky - ny) < 13) { if (kv >= nv) { ky = Math.min(ky, ny - 13); } else { ny = Math.min(ny, ky - 13); } }
    ctx.fillStyle = C.accent; ctx.fillText(`${fmt(kv, 0)}%`, x1 + 5, ky);
    ctx.fillStyle = C.muted; ctx.fillText(`${fmt(nv, 0)}%`, x1 + 5, ny);
    // Legende
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    const lg = (txt, col, y, dash, lw) => {
      ctx.fillStyle = col; ctx.fillText(txt, x1, y);
      const tw = ctx.measureText(txt).width;
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1 - tw - 26, y - 3); ctx.lineTo(x1 - tw - 6, y - 3); ctx.stroke(); ctx.setLineDash([]);
    };
    lg('ohne Schlaf', C.muted, 14, [4, 3], 2);
    lg(narrow ? 'mit Schlaf' : 'mit deinem Schlaf', C.accent, 28, [], 3);
  };

  /* ---------- Teil 3: Schlafdruck und innere Uhr (Zwei-Prozess-Modell, vereinfacht) ---------- */
  const clockCv = $('#clockCv');
  const K = { up: 7, light: 0, teen: false, all: false, t: 0, data: null };
  const AMP = .3, TH = .6, T0 = 6, T1 = 36;
  const phiOf = () => 17 + (K.teen ? 2 : 0) + K.light * .25;   // Höhepunkt des Wachsignals
  const simClock = () => {
    const phi = phiOf(), up = K.up, dt = 1 / 12;
    const Cw = t => AMP * Math.cos(TAU * (t - phi) / 24);
    let S = .2, awake = true, lastWake = up - 72, nextWake = 0, onset = null;
    const pts = [];
    for (let i = 0; ; i++) {
      const t = up - 72 + i * dt;
      if (t > T1 + 1e-9) break;
      if (awake) {
        const stay = K.all && t > up;
        if (!stay && t - lastWake > 12 && S - Cw(t) >= TH) {
          awake = false; nextWake = up + 24 * Math.ceil((t - up) / 24 + 1e-9);
          if (t > up && onset === null) onset = t;
        }
      } else if (t >= nextWake - 1e-6) { awake = true; lastWake = t; }
      if (t >= T0 - 1e-9) pts.push({ t, S, c: Cw(t), m: S - Cw(t), sl: !awake });
      S = awake ? S + (1 - S) * (1 - Math.exp(-dt / 18.2)) : S * Math.exp(-dt / 4.2);
    }
    return { pts, onset, phi, wakeNext: onset === null ? null : up + 24 * Math.ceil((onset - up) / 24 + 1e-9) };
  };
  const updClock = () => {
    $('#upIn').value = K.up; $('#litIn').value = K.light;
    $('#upOut').textContent = clockH(K.up);
    $('#litOut').textContent = `${fmt(K.light, K.light % 1 ? 1 : 0)} h`;
    $('#teenBtn').textContent = K.teen ? 'Innere Uhr: Erwachsen' : 'Innere Uhr: Jugendlich';
    $('#allBtn').textContent = K.all ? 'Normal schlafen' : 'Nacht durchmachen';
    K.data = simClock();
    const d = K.data;
    $('#cMel').textContent = clockH(Math.round((d.phi + 4) * 12) / 12);
    if (K.all) {
      const night = d.pts.filter(p => p.t > K.up + 12);
      const top = night.reduce((a, p) => p.m > a.m ? p : a, night[0]);
      $('#cOnL').textContent = 'Müdeste Zeit';
      $('#cOn').textContent = clockH(Math.round(top.t * 12) / 12);
      $('#cOnF').textContent = 'Schlafdruck hoch, Uhr am Tiefpunkt';
      $('#cSleep').textContent = '0 h';
      $('#cSleepF').textContent = 'die ganze Nacht wach';
      $('#clockStatus').textContent = `Durchgemacht: Die Müdigkeit ist gegen ${clockH(Math.round(top.t))} am grössten. Danach sinkt sie etwas, obwohl der Schlafdruck weiter steigt. Schau, was die innere Uhr am Morgen tut.`;
      return;
    }
    $('#cOnL').textContent = 'Einschlafen leicht ab';
    $('#cOnF').textContent = 'Müdigkeit über der Linie';
    $('#cSleepF').textContent = 'wenn du dann einschläfst';
    if (d.onset === null) { $('#cOn').textContent = 'später'; $('#cSleep').textContent = '?'; return; }
    $('#cOn').textContent = clockH(Math.round(d.onset * 12) / 12);
    const sl = d.wakeNext - d.onset;
    $('#cSleep').textContent = `${fmt(sl, 1)} h`;
    $('#clockStatus').textContent = sl < 8
      ? `Nur rund ${fmt(sl, 1)} Stunden bis zum Wecker. Fachleute empfehlen Jugendlichen meist 8 bis 10 Stunden, Erwachsenen 7 bis 9. Stark vereinfachtes Modell.`
      : K.light > 0
        ? 'Abendlicht schiebt die innere Uhr hier etwas nach hinten: Melatonin und Müdigkeit kommen später. Stark vereinfachtes Modell.'
        : 'Stark vereinfachtes Modell. Echte Werte sind bei jedem Menschen anders.';
  };
  $('#upIn').addEventListener('input', e => { K.up = +e.target.value; updClock(); });
  $('#litIn').addEventListener('input', e => { K.light = +e.target.value; updClock(); });
  $('#teenBtn').addEventListener('click', () => { K.teen = !K.teen; updClock(); });
  $('#allBtn').addEventListener('click', () => { K.all = !K.all; updClock(); });
  updClock();
  $('#clockStatus').textContent = 'Stark vereinfachtes Modell. Echte Werte sind bei jedem Menschen anders.';

  const drawClock = dt => {
    const { ctx, w, h } = fit(clockCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const x0 = 14, x1 = w - 14, y0 = 58, y1 = h - 34;
    const X = t => x0 + (t - T0) / (T1 - T0) * (x1 - x0);
    const Y = v => y1 - (v + .05) / 1.2 * (y1 - y0);
    const { pts, phi } = K.data;

    // Schlaf-Zeiten
    ctx.fillStyle = C.sunk;
    let st = null;
    pts.forEach((p, i) => {
      if (p.sl && st === null) st = p.t;
      if ((!p.sl || i === pts.length - 1) && st !== null) {
        const a = X(st), b = X(p.t);
        ctx.fillRect(a, y0 - 6, b - a, y1 - y0 + 6);
        if (b - a > 40) { ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('Schlaf', (a + b) / 2, y1 - 8); ctx.fillStyle = C.sunk; }
        st = null;
      }
    });
    // Melatonin-Band
    ctx.font = `10px ${MONO}`;
    for (const k of [-1, 0]) {
      const a = Math.max(T0, phi + 4 + 24 * k), b = Math.min(T1, phi + 15 + 24 * k);
      if (b <= a) continue;
      ctx.fillStyle = C.glow; ctx.globalAlpha = .28;
      roundRect(ctx, X(a), 32, X(b) - X(a), 12, 6); ctx.fill();
      ctx.globalAlpha = 1;
      if (X(b) - X(a) > 70) { ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.fillText('Melatonin', (X(a) + X(b)) / 2, 41); }
    }
    // Schwelle
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, Y(TH)); ctx.lineTo(x1, Y(TH)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'leicht einschlafen' : 'ab hier fällt Einschlafen leicht', x0 + 2, Y(TH) - 5);

    // Innere Uhr als Fläche zwischen Schlafdruck und Müdigkeit
    ctx.fillStyle = C.fiber; ctx.globalAlpha = .22;
    ctx.beginPath();
    pts.forEach((p, i) => { i ? ctx.lineTo(X(p.t), Y(p.S)) : ctx.moveTo(X(p.t), Y(p.S)); });
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(X(pts[i].t), Y(pts[i].m));
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    const line = (key, col, lw) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      pts.forEach((p, i) => { i ? ctx.lineTo(X(p.t), Y(p[key])) : ctx.moveTo(X(p.t), Y(p[key])); });
      ctx.stroke();
    };
    line('S', C.copper, 1.5);
    line('m', C.accent, 3);

    // Zeitachse
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    for (let t = T0; t <= T1; t += narrow ? 6 : 3) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(t), y1); ctx.lineTo(X(t), y1 + 4); ctx.stroke();
      ctx.textAlign = t === T0 ? 'left' : t === T1 ? 'right' : 'center';
      ctx.fillText(`${mod(t, 24)}:00`, X(t), y1 + 16);
    }
    ctx.textAlign = 'center';
    ctx.fillText('heute', X(15), y1 + 30); ctx.fillText('morgen', X(30), y1 + 30);
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(24), y0 - 6); ctx.lineTo(X(24), y1); ctx.stroke();

    // Legende
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    const items = [[C.accent, 'Müdigkeit'], [C.copper, 'Schlafdruck'], [C.fiber, 'innere Uhr']];
    let lx = x0;
    for (const [col, name] of items) {
      ctx.fillStyle = col; ctx.fillRect(lx, 9, 10, 4);
      ctx.fillStyle = C.fg; ctx.fillText(name, lx + 14, 15);
      lx += ctx.measureText(name).width + 26;
    }

    // Wandernder Punkt auf der Müdigkeitskurve
    if (!reduced) {
      K.t = mod(K.t + dt / 12, 1);
      const p = pts[Math.floor(K.t * (pts.length - 1))];
      ctx.beginPath(); ctx.arc(X(p.t), Y(p.m), 5, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('schlaf', 4, {
    hypLock: () => { ['#durIn', '#wakeIn', '#hShort', '#hLong'].forEach(s => $(s).disabled = false); },
    learnLock: () => { ['#lrnIn', '#slpIn', '#lEve', '#lMorn', '#lNone'].forEach(s => $(s).disabled = false); },
    clockLock: () => { ['#upIn', '#litIn', '#teenBtn', '#allBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawHyp(dt); drawLearn(dt); drawClock(dt); });
})();
