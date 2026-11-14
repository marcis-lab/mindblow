/* mindblow – Lektion Kühlschrank */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const mono = px => `${px}px Geist Mono, monospace`;
  const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  const hx = s => {
    s = (s || '').trim();
    if (s[0] !== '#') return [128, 128, 128];
    if (s.length === 4) s = '#' + [...s.slice(1)].map(c => c + c).join('');
    return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  };
  const mixC = (a, b, t) => { const A = hx(a), B = hx(b); t = clamp(t, 0, 1); return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  const deg = (t, d = 0) => `${fmt(t, d)} °C`;
  const expS = m => -Math.log(1 - Math.random()) * m;      // Energie nach Boltzmann (2D)
  const randn = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());

  /* ---------- Teil 1: Verdunsten ---------- */
  const evCv = $('#evapCv');
  const W1 = 600, D1 = 120, AIR = 200, N0 = 90;          // Simulationsbox in eigenen Einheiten
  const S0 = 70, E0 = S0 * S0, ESC = (1.4 * S0) ** 2;    // Tempo bei Hauttemperatur, Schwelle zum Losreissen
  const T_SKIN = 34, KSKIN = .1;
  const EV = { hum: 40, wind: 2, slow: reduced, run: false, liq: [], vap: [], escR: 0, retR: 0, mE: E0 };
  const mkLiq = (m, y) => {
    const v = Math.sqrt(expS(m)), a = Math.random() * TAU;
    return { x: Math.random() * W1, y: y ?? Math.random() * D1, vx: Math.cos(a) * v, vy: Math.sin(a) * v };
  };
  const spawnAmb = anywhere => {
    const a = Math.random() * TAU, v = S0 * .7;
    EV.vap.push({ x: anywhere ? Math.random() * W1 : -6, y: -15 - Math.random() * (AIR - 25), vx: Math.cos(a) * v, vy: Math.sin(a) * v, amb: true });
  };
  const ambTarget = () => Math.round(EV.hum / 100 * 34);
  const evReset = () => {
    EV.liq = Array.from({ length: N0 }, () => mkLiq(E0));
    EV.vap = []; EV.escR = EV.retR = 0; EV.mE = E0;
    for (let i = 0; i < ambTarget(); i++) spawnAmb(true);
  };
  evReset();
  const evTemp = () => T_SKIN + 30 * (EV.mE / E0 - 1);   // Modell: mittlere Bewegungsenergie als Temperatur

  const evStep = dt => {
    const L = EV.liq, wd = EV.wind * 28;
    let esc = 0, ret = 0;
    const sub = 3, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      let meanE = 0;
      for (const p of L) meanE += p.vx * p.vx + p.vy * p.vy;
      meanE /= L.length;
      // Die Haut liefert Wärme nach: alle Teilchen werden ein wenig schneller, wenn das Wasser kälter als die Haut ist
      const kh = Math.sqrt(Math.max(.5, 1 + KSKIN * h * (E0 / meanE - 1)));
      for (const p of L) { p.vx *= kh; p.vy *= kh; }
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        p.x += p.vx * h; p.y += p.vy * h;
        if (p.x < 0) { p.x = -p.x; p.vx = -p.vx; } else if (p.x > W1) { p.x = 2 * W1 - p.x; p.vx = -p.vx; }
        if (p.y > D1) { p.y = 2 * D1 - p.y; p.vy = -p.vy; }
        else if (p.y < 0) {
          if (p.vy * p.vy > ESC) {
            // schnell genug: fliegt als Dampf davon
            EV.vap.push({ x: p.x, y: -1, vx: p.vx * .5, vy: -(Math.sqrt(p.vy * p.vy - ESC) + 30), amb: false });
            L[i] = mkLiq(meanE, D1 - 2);        // Nachschub aus der Tiefe, gleich warm wie der Rest
            esc++;
          } else { p.y = -p.y; p.vy = -p.vy; }
        }
      }
      // Stösse: zufällige Paare teilen ihre Energie neu auf
      for (let k = 0, nk = Math.max(1, Math.round(L.length * h * 40)); k < nk; k++) {
        const a = L[(Math.random() * L.length) | 0], b = L[(Math.random() * L.length) | 0];
        if (a === b) continue;
        const ea = a.vx * a.vx + a.vy * a.vy, eb = b.vx * b.vx + b.vy * b.vy, u = Math.random();
        if (ea < 1 || eb < 1) continue;
        const ka = Math.sqrt(u * (ea + eb) / ea), kb = Math.sqrt((1 - u) * (ea + eb) / eb);
        a.vx *= ka; a.vy *= ka; b.vx *= kb; b.vy *= kb;
      }
      // Dampf in der Luft
      for (let i = EV.vap.length - 1; i >= 0; i--) {
        const v = EV.vap[i];
        v.vx += (wd - v.vx) * 1.5 * h + randn() * 95 * Math.sqrt(h);
        v.vy += (-6 - v.vy) * 1.5 * h + randn() * 95 * Math.sqrt(h);
        v.x += v.vx * h; v.y += v.vy * h;
        if (v.y >= 0) {
          // trifft die Oberfläche: wird wieder flüssig und bringt seine Energie mit
          const e = ESC + expS(E0 * 1.5), a = Math.random() * TAU;
          const nvx = Math.cos(a) * Math.sqrt(e) * .3;
          L.push({ x: clamp(v.x, 0, W1), y: 1, vx: nvx, vy: Math.sqrt(e - nvx * nvx) });
          if (L.length > N0) L.splice((Math.random() * (L.length - 1)) | 0, 1);
          EV.vap.splice(i, 1); ret++;
          continue;
        }
        if (v.amb) {
          if (v.x > W1 + 8) v.x -= W1 + 16; else if (v.x < -8) v.x += W1 + 16;
          if (v.y < -AIR) { v.y = -AIR; v.vy = Math.abs(v.vy); }
        } else if (v.x > W1 + 8 || v.x < -8 || v.y < -AIR) EV.vap.splice(i, 1);
      }
    }
    let amb = 0;
    for (const v of EV.vap) if (v.amb) amb++;
    for (let t = ambTarget(); amb < t; amb++) spawnAmb(EV.wind < 1);
    if (amb > ambTarget()) { const i = EV.vap.findIndex(v => v.amb); if (i >= 0) EV.vap.splice(i, 1); }
    let m = 0;
    for (const p of L) m += p.vx * p.vx + p.vy * p.vy;
    m /= L.length;
    EV.mE += (m - EV.mE) * Math.min(1, dt * 1.2);
    EV.escR += (esc - EV.escR * dt) / 3;
    EV.retR += (ret - EV.retR * dt) / 3;
  };

  let evTxt = 0;
  const updEv = () => {
    $('#evT').textContent = deg(evTemp(), 1);
    $('#evOut').textContent = `${fmt(Math.max(0, EV.escR), 1)} /s`;
    $('#evIn').textContent = `${fmt(Math.max(0, EV.retR), 1)} /s`;
  };
  $('#humIn').addEventListener('input', e => {
    EV.hum = +e.target.value; $('#humOut').textContent = `${EV.hum} %`;
    $('#evStatus').textContent = EV.hum >= 90
      ? 'Sehr feuchte Luft: Fast so viel Dampf fällt zurück, wie davonfliegt. Darum kühlt Schwitzen bei schwülem Wetter kaum.'
      : 'Trockene Luft: Wenig Dampf fällt zurück. Das Wasser kühlt stärker.';
  });
  $('#windIn').addEventListener('input', e => {
    EV.wind = +e.target.value; $('#windOut').textContent = `${EV.wind} m/s`;
    $('#evStatus').textContent = EV.wind === 0
      ? 'Kein Wind: Der eigene Dampf bleibt über dem Tropfen hängen, und ein Teil fällt zurück.'
      : 'Der Wind trägt den frischen Dampf weg, bevor er zurückfallen kann.';
  });
  $('#evSlow').addEventListener('click', () => {
    EV.slow = !EV.slow; $('#evSlow').textContent = EV.slow ? 'Normales Tempo' : 'Zeitlupe';
  });
  $('#evReset').addEventListener('click', () => { evReset(); updEv(); $('#evStatus').textContent = 'Neuer Tropfen, so warm wie die Haut: 34 °C.'; });

  const drawEv = dt => {
    if (EV.run) {
      evStep(dt * (EV.slow ? .3 : 1));
      evTxt += dt; if (evTxt > .25) { evTxt = 0; updEv(); }
    }
    const { ctx, w, h } = fit(evCv);
    const narrow = w < 420, pad = 12;
    ctx.clearRect(0, 0, w, h);
    const airTop = 34, surf = Math.round(h * .5), skin = h - 40;
    const sx = (w - pad * 2) / W1, sy = (skin - surf) / D1, sa = (surf - airTop) / AIR;
    // Luft
    ctx.fillStyle = C.sunk; ctx.fillRect(0, 0, w, surf);
    // Wasser
    ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = C.fiber; ctx.fillRect(0, surf, w, skin - surf); ctx.restore();
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, surf); ctx.lineTo(w, surf); ctx.stroke();
    // Haut (bewusst feste Hautfarbe)
    ctx.fillStyle = '#d9a07a'; ctx.fillRect(0, skin, w, h - skin);
    ctx.fillStyle = '#4a2a18'; ctx.font = mono(11); ctx.textAlign = 'left';
    ctx.fillText(`Haut · ${T_SKIN} °C`, pad, skin + 24);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'wärmt nach' : 'liefert Wärme nach', w - pad, skin + 24);
    // Wind-Pfeile
    if (EV.wind > 0) {
      const off = reduced ? 0 : (performance.now() / 1000 * EV.wind * 14) % 80;
      ctx.strokeStyle = C.muted; ctx.globalAlpha = .35; ctx.lineWidth = 1.2;
      for (let y = airTop + 22; y < surf - 10; y += 46) for (let x = -80 + off; x < w; x += 80) {
        const len = 8 + EV.wind * 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.lineTo(x + len - 4, y - 3); ctx.moveTo(x + len, y); ctx.lineTo(x + len - 4, y + 3); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Dampf
    ctx.lineWidth = 1.4;
    for (const v of EV.vap) {
      const x = pad + v.x * sx, y = surf + v.y * sa;
      if (y < airTop - 4) continue;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU);
      ctx.strokeStyle = v.amb ? C.muted : C.bad; ctx.stroke();
    }
    // Teilchen im Wasser
    for (const p of EV.liq) {
      const e = p.vx * p.vx + p.vy * p.vy;
      ctx.beginPath(); ctx.arc(pad + p.x * sx, surf + p.y * sy, 3.3, 0, TAU);
      ctx.fillStyle = e > ESC ? C.bad : e < E0 * .5 ? C.fiber : C.muted;
      ctx.fill();
    }
    // Beschriftung
    ctx.textAlign = 'left'; ctx.font = mono(11); ctx.fillStyle = C.fg;
    ctx.fillText(narrow ? `Luft · ${EV.hum} % · ${EV.wind} m/s` : `Luft · ${EV.hum} % feucht · Wind ${EV.wind} m/s`, pad, 21);
    ctx.textAlign = 'right';
    ctx.fillText(`Wasser ${deg(evTemp(), 1)}`, w - pad, 21);
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Schweiss' : 'Schweisstropfen', pad, surf + 16);
    if (EV.slow && EV.run) { ctx.textAlign = 'right'; ctx.fillText('Zeitlupe', w - pad, surf + 16); }
  };

  /* ---------- Teil 2: Siedepunkt und Druck ---------- */
  const boilCv = $('#boilCv');
  const PMIN = .05, PMAX = 10;
  // Dampfdruckkurven (Antoine-Gleichung). Wasser: Druck in mmHg, Isobutan: Druck in bar
  const bpWater = p => { const mm = p * 750.062; const [A, B, K] = mm < 760 ? [8.07131, 1730.63, 233.426] : [8.14019, 1810.94, 244.485]; return B / (A - Math.log10(mm)) - K; };
  const bpIso = p => 1132.108 / (4.3281 - Math.log10(p)) - .918 - 273.15;
  const SUB = {
    water: { name: 'Wasser', bp: bpWater, col: () => C.fiber, presets: [
      { p: .34, label: 'Everest', short: 'Everest', msg: 'Gipfel des Mount Everest: Wasser kocht schon bei rund 70 °C. Für Spaghetti ist das zu wenig.' },
      { p: 1.013, label: 'Meereshöhe', short: 'Meer', msg: 'Normaler Luftdruck am Meer: 100 °C. In Zürich auf gut 400 m sind es etwa 98,5 °C.' },
      { p: 2, label: 'Dampfkochtopf', short: 'Topf', msg: 'Im Dampfkochtopf: doppelter Druck, das Wasser kocht erst bei rund 120 °C.' },
    ] },
    iso: { name: 'Kältemittel', bp: bpIso, col: () => C.glow, presets: [
      { p: .6, label: 'Im Verdampfer', short: 'Verdampfer', msg: 'Im Verdampfer ist der Druck tief: Das Kältemittel kocht bei etwa minus 25 °C. Im Kühlschrank ist es also immer «zu warm» für es, und es nimmt Wärme auf.' },
      { p: 1.013, label: 'Normaler Druck', short: 'Luftdruck', msg: 'Beim normalen Luftdruck kocht Isobutan schon bei etwa minus 12 °C. In einer offenen Schale wäre es sofort weg.' },
      { p: 5.3, label: 'Im Kondensator', short: 'Kondensator', msg: 'Nach dem Kompressor ist der Druck hoch: Jetzt wird das Kältemittel schon bei etwa 40 °C flüssig. Das ist wärmer als die Küche, also gibt es Wärme ab.' },
    ] },
  };
  const BO = { sub: 'water', p: 1.013, pulse: 0 };
  const sliderToP = v => PMIN * Math.pow(PMAX / PMIN, v / 100);
  const pToSlider = p => Math.round(Math.log(p / PMIN) / Math.log(PMAX / PMIN) * 100);
  const fmtP = p => `${fmt(p, p < 1 ? 2 : p < 10 ? 2 : 1)} bar`;
  const updBoil = () => {
    const S = SUB[BO.sub], T = S.bp(BO.p);
    $('#pIn').value = pToSlider(BO.p);
    $('#pOut').textContent = fmtP(BO.p);
    $('#bP').textContent = fmtP(BO.p);
    $('#bT').textContent = deg(T, 0);
    $('#bRoom').textContent = T > 20 ? 'flüssig' : 'Gas';
    $$('#presets button').forEach((b, i) => { b.textContent = S.presets[i].label; });
  };
  $('#pIn').addEventListener('input', e => { BO.p = sliderToP(+e.target.value); updBoil(); });
  $$('#subst button').forEach(b => b.addEventListener('click', () => {
    BO.sub = b.dataset.s;
    $$('#subst button').forEach(x => x.classList.toggle('active', x === b));
    updBoil();
    $('#boilStatus').textContent = BO.sub === 'iso'
      ? 'Isobutan (R600a) steckt in den meisten Kühlschränken in Europa. Bei Zimmertemperatur und normalem Druck ist es ein Gas.'
      : 'Wasser: Unter der Kurve flüssig, darüber Dampf.';
  }));
  $$('#presets button').forEach((b, i) => b.addEventListener('click', () => {
    const pr = SUB[BO.sub].presets[i];
    BO.p = pr.p; updBoil(); $('#boilStatus').textContent = pr.msg;
  }));
  updBoil();

  const TMIN = -80, TMAX = 200;
  const drawBoil = dt => {
    BO.pulse += dt;
    const { ctx, w, h } = fit(boilCv);
    const narrow = w < 420;
    ctx.clearRect(0, 0, w, h);
    const L = 46, R = 14, T = 36, B = 34, pw = w - L - R, ph = h - T - B;
    const lp0 = Math.log10(PMIN), lp1 = Math.log10(PMAX);
    const X = p => L + (Math.log10(p) - lp0) / (lp1 - lp0) * pw;
    const Y = t => T + (TMAX - t) / (TMAX - TMIN) * ph;
    // Raster
    ctx.font = mono(10); ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let t = -50; t <= 200; t += 50) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(L, Y(t)); ctx.lineTo(L + pw, Y(t)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(`${t} °C`, L - 6, Y(t));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (const p of [.1, 1, 10]) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(X(p), T); ctx.lineTo(X(p), T + ph); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(`${fmt(p, p < 1 ? 1 : 0)} bar`, clamp(X(p), L + 22, L + pw - 22), T + ph + 16);
    }
    ctx.fillText('Druck →', L + pw / 2, T + ph + 30);
    // Zimmertemperatur
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(L, Y(20)); ctx.lineTo(L + pw, Y(20)); ctx.stroke(); ctx.restore();
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText('20 °C', L + pw - 4, Y(20) - 5);
    // Kurven
    for (const k of ['water', 'iso']) {
      const S = SUB[k], act = k === BO.sub;
      ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
      ctx.globalAlpha = act ? 1 : .28; ctx.strokeStyle = S.col(); ctx.lineWidth = act ? 3 : 2;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const p = PMIN * Math.pow(PMAX / PMIN, i / 120), x = X(p), y = Y(S.bp(p));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.restore();
      // Name an der Kurve
      const pl = k === 'water' ? .12 : 4, yl = Y(S.bp(pl));
      ctx.globalAlpha = act ? 1 : .45; ctx.fillStyle = S.col(); ctx.font = mono(11); ctx.textAlign = 'left';
      ctx.fillText(narrow && k === 'iso' ? 'Kältem.' : S.name, X(pl) + 6, yl + (k === 'water' ? -8 : 16));
      ctx.globalAlpha = 1;
    }
    // Zustände
    const S = SUB[BO.sub];
    ctx.fillStyle = C.muted; ctx.font = mono(11); ctx.textAlign = 'left';
    ctx.fillText('Gas', L + 8, T + 16);
    ctx.textAlign = 'right'; ctx.fillText('flüssig', L + pw - 8, T + ph - 10);
    // Voreinstellungen als Punkte
    for (const pr of S.presets) {
      const x = X(pr.p), y = Y(S.bp(pr.p));
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
      if (!narrow) { ctx.textAlign = 'right'; ctx.font = mono(10); ctx.fillText(pr.short, x - 7, y - 6); }
    }
    // aktueller Punkt
    const tb = S.bp(BO.p), mx = X(BO.p), my = Y(clamp(tb, TMIN, TMAX));
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = C.fg; ctx.globalAlpha = .6;
    ctx.beginPath(); ctx.moveTo(mx, T + ph); ctx.lineTo(mx, my); ctx.lineTo(L, my); ctx.stroke(); ctx.restore();
    if (!reduced) {
      // Dampfblasen steigen auf
      for (let i = 0; i < 3; i++) {
        const ph2 = (BO.pulse * .8 + i / 3) % 1;
        ctx.globalAlpha = 1 - ph2;
        ctx.beginPath(); ctx.arc(mx + Math.sin((ph2 + i) * 6) * 4, my - 8 - ph2 * 26, 2 + ph2 * 3, 0, TAU);
        ctx.strokeStyle = S.col(); ctx.lineWidth = 1.3; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(mx, my, 6.5, 0, TAU); ctx.fillStyle = S.col(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.surface; ctx.stroke();
    // Kopfzeile
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = mono(11);
    ctx.fillText(narrow ? `Siedepunkt: ${deg(tb, 0)}` : `${S.name} bei ${fmtP(BO.p)}: kocht bei ${deg(tb, 0)}`, 12, 20);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Skala log.' : 'Druckachse logarithmisch', w - 12, 20);
  };

  /* ---------- Teil 3: Der Kreislauf ---------- */
  const cycCv = $('#cycCv');
  const P_EL = 60, CAP = 20000, UA_CLOSED = 1.7, UA_OPEN = 40, T_EVAP = -25, SPEED = 60;
  const FC = { Tk: 25, Tin: 5, door: false, on: false, run: false, phase: 0, avg: 0, avgT: 0, txt: 0 };
  // Leistungszahl: vereinfacht 45 % des theoretischen Bestwerts (Carnot)
  const cop = () => { const tc = T_EVAP + 273.15, th = FC.Tk + 15 + 273.15; return .45 * tc / (th - tc); };
  const qCold = () => cop() * P_EL;
  const net = () => (FC.on ? qCold() + P_EL : 0) - (FC.door ? UA_OPEN : UA_CLOSED) * (FC.Tk - FC.Tin);
  const updCyc = () => {
    $('#fcIn').textContent = `${fmt(FC.on ? qCold() : 0, 0)} W`;
    $('#fcEl').textContent = `${FC.on ? P_EL : 0} W`;
    $('#fcOut').textContent = `${fmt(FC.on ? qCold() + P_EL : 0, 0)} W`;
  };
  const cycReset = () => { FC.Tin = 5; FC.on = false; FC.avg = 0; FC.avgT = 0; updCyc(); };
  $('#kitIn').addEventListener('input', e => { FC.Tk = +e.target.value; $('#kitOut').textContent = deg(FC.Tk); updCyc(); });
  $('#doorBtn').addEventListener('click', () => {
    FC.door = !FC.door; FC.avg = 0; FC.avgT = 0;
    $('#doorBtn').textContent = FC.door ? 'Tür schliessen' : 'Tür öffnen';
    $('#cycStatus').textContent = FC.door
      ? 'Tür offen: Der Kompressor läuft ohne Pause. Die Wärme, die er innen holt, kommt aus der Küche und geht hinten zurück in die Küche. Dazu kommen 60 W Strom.'
      : 'Tür zu: Der Innenraum kühlt ab, dann schaltet das Thermostat den Kompressor aus. Im Schnitt bekommt die Küche nur die Wärme aus dem Strom.';
  });
  $('#cycReset').addEventListener('click', () => { cycReset(); $('#cycStatus').textContent = 'Neu gestartet: innen 5 °C.'; });
  updCyc();

  const stepCyc = dt => {
    const sdt = dt * SPEED;
    if (FC.Tin > 6) FC.on = true; else if (FC.Tin < 4) FC.on = false;
    const ua = FC.door ? UA_OPEN : UA_CLOSED;
    FC.Tin += (ua * (FC.Tk - FC.Tin) - (FC.on ? qCold() : 0)) / CAP * sdt;
    FC.avgT += sdt;
    const wgt = Math.min(1, sdt / Math.min(FC.avgT, 3600));
    FC.avg += (net() - FC.avg) * wgt;
    if (FC.on) FC.phase = (FC.phase + dt * (reduced ? .025 : .07)) % 1;
    FC.txt += dt; if (FC.txt > .2) { FC.txt = 0; updCyc(); }
  };

  // Rohrverlauf mit Temperatur (0 kalt … 1 heiss) und Zustand (flüssig oder Gas)
  const buildPath = (x1, y0, y1, cx, ex, compY) => {
    const pts = [];
    const add = (x, y, t, liq) => pts.push({ x, y, t, liq });
    add(cx, compY - 16, 1, false);
    const top = y0 + 16, bot = y1 - 8, nZ = Math.max(4, Math.round((bot - top) / 18));
    for (let i = 0; i <= nZ; i++) {
      const f = i / nZ;
      add(cx + (i % 2 ? 11 : -11) * (i && i < nZ ? 1 : 0), bot - f * (bot - top), 1 - f * .45, f > .5);
    }
    add(cx, y0 - 14, .55, true);
    add((cx + ex) / 2 + 8, y0 - 14, .55, true);
    add((cx + ex) / 2 - 8, y0 - 14, .02, true);   // Drossel: Druck und Temperatur fallen
    add(ex, y0 - 14, 0, true);
    const eTop = y0 + 16, eBot = y0 + (y1 - y0) * .55, nE = Math.max(4, Math.round((eBot - eTop) / 16));
    for (let i = 0; i <= nE; i++) {
      const f = i / nE;
      add(ex + (i % 2 ? 11 : -11) * (i && i < nE ? 1 : 0), eTop + f * (eBot - eTop), .02, f < .6);
    }
    add(ex, compY, .12, false);
    add(cx - 16, compY, .2, false);
    add(cx, compY - 16, 1, false);
    let len = 0;
    pts.forEach((p, i) => { if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y); p.s = len; });
    return { pts, len };
  };
  const at = (path, s) => {
    const P = path.pts;
    for (let i = 1; i < P.length; i++) if (P[i].s >= s) {
      const a = P[i - 1], b = P[i], f = (s - a.s) / ((b.s - a.s) || 1);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, t: a.t + (b.t - a.t) * f, liq: f < .5 ? a.liq : b.liq };
    }
    return P[P.length - 1];
  };
  const heatArrow = (ctx, x, y, len, col, t) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const f = i / 12, xx = x + f * len, yy = y + Math.sin(f * 9 + t * 6) * 3; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + len, y); ctx.lineTo(x + len - 6, y - 5); ctx.moveTo(x + len, y); ctx.lineTo(x + len - 6, y + 5); ctx.stroke();
  };

  const drawCyc = (dt, now) => {
    if (FC.run) stepCyc(dt);
    const { ctx, w, h } = fit(cycCv);
    const narrow = w < 420;
    ctx.clearRect(0, 0, w, h);
    const x0 = narrow ? 40 : 60, x1 = Math.round(w * (narrow ? .55 : .56)), y0 = 58, y1 = h - 92;
    const cx = x1 + (narrow ? 32 : 44), ex = x1 - 28, compY = y1 + 30;
    const tt = reduced ? 0 : now / 1000;
    const cold = C.fiber, hot = C.bad;
    // Küche
    ctx.textAlign = 'right'; ctx.font = mono(11); ctx.fillStyle = C.fg;
    ctx.fillText(`Küche ${deg(FC.Tk)}`, w - 12, 20);
    // Innenraum
    ctx.save(); roundRect(ctx, x0, y0, x1 - x0, y1 - y0, 10);
    ctx.globalAlpha = .18; ctx.fillStyle = mixC(cold, hot, (FC.Tin - 2) / 25); ctx.fill(); ctx.restore();
    // Wände
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.stroke();
    // Tür
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    if (FC.door) ctx.lineTo(x0 - (narrow ? 26 : 44), y1 - 12); else ctx.lineTo(x0, y1);
    ctx.stroke(); ctx.lineCap = 'butt';
    if (FC.door && FC.run) {
      for (let i = 0; i < 3; i++) heatArrow(ctx, x0 - (narrow ? 4 : 14), y0 + (y1 - y0) * (.35 + i * .2), narrow ? 26 : 36, hot, tt + i);
    }
    // Rohr
    const path = buildPath(x1, y0, y1, cx, ex, compY);
    for (let i = 1; i < path.pts.length; i++) {
      const a = path.pts[i - 1], b = path.pts[i];
      ctx.strokeStyle = mixC(cold, hot, (a.t + b.t) / 2); ctx.globalAlpha = .55;
      ctx.lineWidth = a.liq && b.liq ? 6 : 3.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Kältemittel-Teilchen
    const ND = 46;
    for (let k = 0; k < ND; k++) {
      const q = at(path, ((FC.phase + k / ND) % 1) * path.len);
      ctx.beginPath(); ctx.arc(q.x, q.y, q.liq ? 3.2 : 2.2, 0, TAU);
      ctx.fillStyle = mixC(cold, hot, q.t); ctx.fill();
    }
    // Drossel
    const dx = (cx + ex) / 2;
    ctx.fillStyle = C.surface; ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(dx - 9, y0 - 22); ctx.lineTo(dx + 9, y0 - 6); ctx.lineTo(dx + 9, y0 - 22); ctx.lineTo(dx - 9, y0 - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = mono(10); ctx.textAlign = 'center';
    ctx.fillText('Drossel', dx, y0 - 30);
    // Kompressor
    ctx.beginPath(); ctx.arc(cx, compY, 16, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(cx, compY); if (FC.on) ctx.rotate(FC.phase * TAU * 6);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke(); ctx.restore();
    ctx.fillStyle = C.fg; ctx.font = mono(10); ctx.textAlign = 'center';
    ctx.fillText('Kompressor', clamp(cx, 40, w - 40), compY + 30);
    // Strom
    const bx = cx + 30, by = compY - 4;
    if (bx + 10 < w) {
      ctx.fillStyle = FC.on ? C.glow : C.line;
      ctx.beginPath(); ctx.moveTo(bx + 4, by - 12); ctx.lineTo(bx - 3, by + 1); ctx.lineTo(bx + 2, by + 1); ctx.lineTo(bx - 2, by + 12); ctx.lineTo(bx + 7, by - 3); ctx.lineTo(bx + 2, by - 3); ctx.closePath(); ctx.fill();
      if (!narrow) { ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText(`Strom ${FC.on ? P_EL : 0} W`, bx + 12, by + 4); }
    }
    // Wärmepfeile
    if (FC.on) {
      for (let i = 0; i < 3; i++) heatArrow(ctx, ex - (narrow ? 62 : 86), y0 + 26 + i * 26, narrow ? 34 : 54, C.copper, tt + i * .7);
      const ox = cx + 18, room = w - ox - 8;
      if (room > 24) for (let i = 0; i < 3; i++) heatArrow(ctx, ox, y0 + 30 + i * 34, Math.min(room, 46), hot, tt + i * .5);
    }
    // Beschriftung
    ctx.font = mono(10); ctx.textAlign = 'center';
    ctx.fillStyle = cold; ctx.fillText(narrow ? 'kalt' : 'Verdampfer', ex, y0 + (y1 - y0) * .55 + 18);
    ctx.fillStyle = hot;
    ctx.save(); ctx.translate(cx + (narrow ? 22 : 24), y1 - 16); ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'warm' : 'Kondensator', 0, 0); ctx.restore();
    ctx.fillStyle = C.fg; ctx.font = mono(narrow ? 12 : 13); ctx.textAlign = 'center';
    const ix = (x0 + ex - 20) / 2;
    ctx.fillText('Innen', ix, y1 - 40);
    ctx.fillText(deg(FC.Tin, 1), ix, y1 - 22);
    ctx.textAlign = 'left'; ctx.font = mono(11); ctx.fillStyle = C.fg;
    ctx.fillText(FC.on ? 'Kompressor läuft' : 'Kompressor steht', 12, 20);
    // Bilanz
    const n = net(), sgn = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v), 0);
    ctx.fillStyle = C.muted; ctx.font = mono(10.5); ctx.textAlign = 'left';
    const l1 = `Küche bekommt jetzt ${sgn(n)} W`, l2 = `im Schnitt ${FC.avgT > 600 ? sgn(FC.avg) + ' W' : '…'}`;
    if (narrow) { ctx.fillText(l1, 12, h - 24); ctx.fillText(l2, 12, h - 10); }
    else ctx.fillText(`${l1} · ${l2}`, 12, h - 12);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('kuehlschrank', 4, {
    evapLock: () => { ['#humIn', '#windIn', '#evSlow', '#evReset'].forEach(s => $(s).disabled = false); EV.run = true; if (EV.slow) $('#evSlow').textContent = 'Normales Tempo'; },
    boilLock: () => { $('#pIn').disabled = false; $$('#subst button, #presets button').forEach(b => b.disabled = false); },
    cycLock: () => { ['#kitIn', '#doorBtn', '#cycReset'].forEach(s => $(s).disabled = false); FC.run = true; },
  });

  loop((dt, now) => { drawEv(dt); drawBoil(dt); drawCyc(dt, now); });
})();
