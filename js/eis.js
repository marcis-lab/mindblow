/* mindblow – Lektion Eis */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const deg = n => `${n < 0 ? '−' : ''}${fmt(Math.abs(n), 0)} °C`;

  // Dichte von flüssigem Wasser in g/cm³ (Näherungsformel, gut von 0 bis 40 °C)
  const rhoW = T => 1 - (T + 288.9414) / (508929.2 * (T + 68.12963)) * (T - 3.9863) * (T - 3.9863);
  const rhoIce = T => 0.9167 - 0.00013 * T; // Eis wird bei tieferer Temperatur minim dichter

  /* ---------- Teil 1: Moleküle und Dichte ---------- */
  const molCv = $('#molCv');
  const M = { T: 20, m: 1, zoom: false, on: false, key: '', ice: [], edges: [], liq: [], d0: 20 };

  const build = (pw, ph, a) => {
    const key = `${Math.round(pw)}x${Math.round(ph)}`;
    if (M.key === key) return;
    M.key = key;
    // Bienenwaben-Gitter: Ecken von spitzen Sechsecken
    const pts = new Map(), hx = a * Math.sqrt(3), m = a * .6;
    for (let j = -1; j * 1.5 * a < ph + a; j++) for (let i = -1; i * hx < pw + hx; i++) {
      const cx = i * hx + (j & 1 ? hx / 2 : 0), cy = j * 1.5 * a;
      for (let k = 0; k < 6; k++) {
        const ang = Math.PI / 6 + k * Math.PI / 3, x = cx + a * Math.cos(ang), y = cy + a * Math.sin(ang);
        if (x < m || y < m || x > pw - m || y > ph - m) continue;
        pts.set(`${Math.round(x * 2)},${Math.round(y * 2)}`, { x, y });
      }
    }
    M.ice = [...pts.values()];
    M.edges = [];
    const nb = M.ice.map(() => []);
    for (let i = 0; i < M.ice.length; i++) for (let j = i + 1; j < M.ice.length; j++) {
      const d = Math.hypot(M.ice[i].x - M.ice[j].x, M.ice[i].y - M.ice[j].y);
      if (Math.abs(d - a) < a * .1) { M.edges.push([i, j]); nb[i].push(j); nb[j].push(i); }
    }
    // Wasserstoffe zeigen entlang von zwei der Bindungen
    M.ice.forEach((p, i) => {
      const dirs = nb[i].map(j => Math.atan2(M.ice[j].y - p.y, M.ice[j].x - p.x));
      while (dirs.length < 2) dirs.push((dirs[0] ?? 0) + 1.9);
      p.h1 = dirs[0]; p.h2 = dirs[1];
    });
    // Flüssigkeit: rund 9 % mehr Moleküle in derselben Fläche
    const N = Math.round(M.ice.length * 1.09);
    M.d0 = Math.sqrt(pw * ph / N) * .92;
    M.liq = Array.from({ length: N }, () => ({ x: m + Math.random() * (pw - 2 * m), y: m + Math.random() * (ph - 2 * m), vx: 0, vy: 0, r: Math.random() * TAU, vr: 0 }));
    for (let it = 0; it < 40; it++) relax(pw, ph, m, 1);
  };
  const relax = (pw, ph, m, k) => {
    const L = M.liq, d0 = M.d0;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const dx = L[j].x - L[i].x, dy = L[j].y - L[i].y, d = Math.hypot(dx, dy) || .01;
      if (d < d0) { const f = (d0 - d) / d * .5 * k; L[i].x -= dx * f; L[i].y -= dy * f; L[j].x += dx * f; L[j].y += dy * f; }
    }
    for (const p of L) { p.x = clamp(p.x, m, pw - m); p.y = clamp(p.y, m, ph - m); }
  };

  const updMol = () => {
    $('#tempOut').textContent = deg(M.T);
    $('#zoomBtn').textContent = M.zoom ? 'Lupe aus' : 'Lupe: 0 bis 12 °C';
    if (!M.on) return;
    const ice = M.T < 0;
    const rho = ice ? rhoIce(M.T) : rhoW(M.T);
    $('#mState').textContent = ice ? 'Eis' : M.T === 0 ? 'Schmelzpunkt' : 'flüssig';
    $('#mRho').textContent = fmt(rho, ice ? 3 : 4);
    $('#mVol').textContent = `${fmt(1 / rho, 3)} l`;
    $('#molStatus').textContent = ice
      ? 'Eis: Jedes Molekül hält vier Nachbarn auf festem Abstand. Die Sechsecke lassen viel Platz frei.'
      : M.T === 0 ? 'Bei 0 °C schmilzt das Gitter. Die Moleküle rücken zusammen, das Wasser wird schlagartig rund 9 % dichter.'
      : M.T <= 4 ? 'Zwischen 0 und 4 °C bilden sich noch kurzlebige, eisartige Grüppchen. Darum ist Wasser bei 4 °C am dichtesten.'
      : 'Flüssig: Die Brücken reissen ständig und bilden sich neu. Die Moleküle drängen sich dichter als im Eis.';
  };
  $('#tempIn').addEventListener('input', e => { M.T = +e.target.value; updMol(); });
  $('#zoomBtn').addEventListener('click', () => { M.zoom = !M.zoom; updMol(); });
  updMol();

  const drawH2O = (ctx, x, y, a1, a2, s) => {
    ctx.fillStyle = C.muted;
    for (const a of [a1, a2]) { ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * .62, y + Math.sin(a) * s * .62, s * .32, 0, TAU); ctx.fill(); }
    ctx.fillStyle = C.fiber; ctx.beginPath(); ctx.arc(x, y, s * .5, 0, TAU); ctx.fill();
  };

  const drawMol = (dt, now) => {
    const { ctx, w, h } = fit(molCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 520;
    const px = 10, py = 10;
    const pw = small ? w - 20 : Math.min(h - 20, w * .48), ph = small ? Math.round(h * .5) : h - 20;
    const a = small ? 15 : 18;
    build(pw, ph, a);
    M.m += clamp((M.T < 0 ? 0 : 1) - M.m, -dt * 2.5, dt * 2.5);
    if (reduced) M.m = M.T < 0 ? 0 : 1;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 12); ctx.fillStyle = C.sunk; ctx.fill(); ctx.clip();
    ctx.translate(px, py);
    const tt = reduced ? 0 : now / 1000;
    const s = a * .5;
    // Eis
    if (M.m < .99) {
      ctx.globalAlpha = 1 - M.m;
      const amp = reduced ? 0 : .3 + (M.T + 20) / 20 * .5;
      const jit = i => [Math.sin(tt * 9 + i * 1.7) * amp, Math.cos(tt * 8 + i * 2.3) * amp];
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]);
      ctx.beginPath();
      for (const [i, j] of M.edges) { const [ax, ay] = jit(i), [bx, by] = jit(j); ctx.moveTo(M.ice[i].x + ax, M.ice[i].y + ay); ctx.lineTo(M.ice[j].x + bx, M.ice[j].y + by); }
      ctx.stroke(); ctx.setLineDash([]);
      M.ice.forEach((p, i) => { const [jx, jy] = jit(i); drawH2O(ctx, p.x + jx, p.y + jy, p.h1, p.h2, s); });
    }
    // Flüssigkeit
    if (M.m > .01) {
      ctx.globalAlpha = M.m;
      const m = a * .6;
      if (!reduced) {
        const heat = 30 + (M.T + 20) * 1.2;
        for (const p of M.liq) {
          p.vx += (Math.random() - .5) * heat * dt * 25; p.vy += (Math.random() - .5) * heat * dt * 25;
          p.vx *= .9; p.vy *= .9; p.x += p.vx * dt; p.y += p.vy * dt;
          p.vr += (Math.random() - .5) * dt * 30; p.vr *= .9; p.r += p.vr * dt;
        }
        relax(pw, ph, m, .5);
      }
      // kurzlebige Brücken
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.globalAlpha = M.m * .6;
      ctx.beginPath();
      const L = M.liq;
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const d = Math.hypot(L[j].x - L[i].x, L[j].y - L[i].y);
        if (d < M.d0 * 1.08 && ((i * 7 + j * 13 + Math.floor(tt * 2)) % 3 === 0)) { ctx.moveTo(L[i].x, L[i].y); ctx.lineTo(L[j].x, L[j].y); }
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = M.m;
      for (const p of L) drawH2O(ctx, p.x, p.y, p.r, p.r + 1.82, s);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    const n = M.T < 0 ? M.ice.length : M.liq.length;
    roundRect(ctx, px + 8, py + 8, small ? 120 : 150, 20, 6); ctx.fillStyle = C.surface; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.fillText(`${n} Moleküle${small ? '' : ' im Feld'}`, px + 14, py + 22);

    // Diagramm
    const gx = small ? 50 : px + pw + 58, gy = small ? py + ph + 18 : 24;
    const gw = w - gx - 14, gh = small ? h - gy - 30 : h - gy - 40;
    const xr = M.zoom ? [-1, 13] : [-20, 40], yr = M.zoom ? [.99935, 1.00005] : [.90, 1.01];
    const X = t => gx + gw * (t - xr[0]) / (xr[1] - xr[0]);
    const Y = r => gy + gh - gh * (r - yr[0]) / (yr[1] - yr[0]);
    ctx.lineWidth = 1; ctx.font = MONO;
    const yt = M.zoom ? [.9994, .9996, .9998, 1.0] : [.92, .94, .96, .98, 1.0];
    for (const r of yt) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(gx, Y(r)); ctx.lineTo(gx + gw, Y(r)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(fmt(r, M.zoom ? 4 : 2), gx - 5, Y(r) + 4);
    }
    ctx.textAlign = 'center';
    const xt = M.zoom ? [0, 4, 8, 12] : [-20, 0, 20, 40];
    for (const t of xt) ctx.fillText(`${t}`, X(t), gy + gh + 14);
    ctx.textAlign = 'right'; ctx.fillText('°C', gx + gw, gy + gh + 28);
    ctx.textAlign = 'left'; ctx.fillText('g/cm³', gx - (small ? 44 : 50), gy - 8);
    // Kurven
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy - 2, gw, gh + 4); ctx.clip();
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let t = 0; t <= xr[1]; t += .1) { t ? ctx.lineTo(X(t), Y(rhoW(t))) : ctx.moveTo(X(t), Y(rhoW(t))); }
    ctx.stroke();
    if (!M.zoom) {
      ctx.strokeStyle = C.accent; ctx.beginPath(); ctx.moveTo(X(-20), Y(rhoIce(-20))); ctx.lineTo(X(0), Y(rhoIce(0))); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(0), Y(rhoIce(0))); ctx.lineTo(X(0), Y(rhoW(0))); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.font = MONO; ctx.textAlign = 'left';
    if (!M.zoom) {
      ctx.fillStyle = C.accent; ctx.fillText('Eis', X(-18), Y(rhoIce(-18)) + 16);
      ctx.fillStyle = C.fiber; ctx.fillText('Wasser', X(14), Y(rhoW(14)) + 16);
      ctx.fillStyle = C.muted; ctx.fillText(small ? '+9 % Volumen' : 'Sprung: +9 % Volumen', X(1.5), Y(.955));
    } else {
      ctx.strokeStyle = C.glow; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(3.98), gy); ctx.lineTo(X(3.98), gy + gh); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.glow; ctx.fillText(small ? 'dichtest: 4 °C' : 'am dichtesten: 4 °C', X(3.98) + 5, gy + 12);
    }
    // Marker
    const inX = M.T >= xr[0] && M.T <= xr[1];
    if (inX) {
      const r = M.T < 0 ? rhoIce(M.T) : rhoW(M.T);
      const y = clamp(Y(r), gy, gy + gh);
      ctx.beginPath(); ctx.arc(X(M.T), y, 5, 0, TAU); ctx.fillStyle = C.copper; ctx.fill();
    }
  };

  /* ---------- Teil 2: Schwimmen ---------- */
  const floatCv = $('#floatCv');
  const B = { ro: .917, rl: 1.025, y: null, v: 0, on: false, obj: 'Eis', liq: 'Meerwasser' };
  const updFloat = () => {
    if (!B.on) return;
    const f = B.ro / B.rl, sink = f > 1;
    $('#fUnder').textContent = sink ? '100 %' : `${fmt(f * 100, 0)} %`;
    $('#fAbove').textContent = sink ? '0 %' : `${fmt((1 - f) * 100, 0)} %`;
    $('#fRho').textContent = `${fmt(B.ro, B.ro < 1 ? 3 : 1)} · ${fmt(B.rl, 3)}`;
    let msg = sink
      ? `${B.obj} ist dichter als ${B.liq} und sinkt auf den Grund.`
      : `${B.obj} in ${B.liq}: ${fmt(f * 100, 0)} % liegen unter der Oberfläche.`;
    if (B.obj === 'Eis' && B.liq === 'Alkohol') msg = 'Eis in reinem Alkohol: Eis ist dichter und sinkt. Dasselbe Eis, das im Wasser schwimmt.';
    else if (B.obj === 'Eis' && B.liq === 'Meerwasser') msg = 'Eis im Meer: knapp 90 % unter Wasser. Ein echter Eisberg.';
    else if (B.obj === 'Eis') msg = 'Eis in Süsswasser: fast 92 % unter Wasser. Das Salz im Meer trägt etwas besser.';
    $('#floatStatus').textContent = msg;
  };
  const drop = () => { B.y = null; B.v = 0; updFloat(); };
  $$('#objBtns button').forEach(b => b.addEventListener('click', () => {
    B.ro = +b.dataset.rho; B.obj = b.textContent;
    $$('#objBtns button').forEach(x => x.classList.toggle('active', x === b)); drop();
  }));
  $$('#liqBtns button').forEach(b => b.addEventListener('click', () => {
    B.rl = +b.dataset.rho; B.liq = b.textContent;
    $$('#liqBtns button').forEach(x => x.classList.toggle('active', x === b)); drop();
  }));
  $('#dropIn').addEventListener('click', drop);

  const drawFloat = dt => {
    const { ctx, w, h } = fit(floatCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const surf = Math.round(h * .38), bottom = h - 16, tx = 10, tw = w - 20;
    const bw = Math.min(small ? 110 : 160, w * .36), H = small ? 80 : 96;
    const bx = tx + tw * .42 - bw / 2;
    const eqS = Math.min(1, B.ro / B.rl) * H;
    const sink = B.ro > B.rl;
    const yEq = sink ? bottom - H : surf - H + eqS;
    if (B.y === null) B.y = B.on ? surf - H - 50 : yEq;
    if (reduced || !B.on) { B.y = yEq; B.v = 0; }
    else {
      const n = 8, hh = dt / n;
      for (let i = 0; i < n; i++) {
        const s = clamp(B.y + H - surf, 0, H);
        const a = 900 * (1 - B.rl * s / (B.ro * H)) - (s > 0 ? 3.5 : .2) * B.v;
        B.v += a * hh; B.y += B.v * hh;
        if (B.y + H > bottom) { B.y = bottom - H; B.v = 0; }
      }
    }
    // Becken
    roundRect(ctx, tx, 10, tw, bottom - 10 + 6, 12); ctx.fillStyle = C.sunk; ctx.fill();
    // Klotz
    const col = B.ro < .3 ? C.copper : B.ro < .6 ? C.glow : B.ro < 1 ? C.accent : C.muted;
    roundRect(ctx, bx, B.y, bw, H, B.ro < 1 && B.ro > .9 ? 4 : 8);
    ctx.fillStyle = col; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    // Flüssigkeit darüber
    const lc = B.rl < .9 ? C.glow : C.fiber;
    ctx.fillStyle = lc; ctx.globalAlpha = B.rl > 1.01 ? .32 : B.rl < .9 ? .16 : .26;
    ctx.fillRect(tx, surf, tw, bottom + 6 - surf); ctx.globalAlpha = 1;
    ctx.strokeStyle = lc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, surf); ctx.lineTo(tx + tw, surf); ctx.stroke();
    // Klammern mit Anteilen
    if (B.on) {
      const xr = bx + bw + 12;
      const top = B.y, mid = clamp(surf, B.y, B.y + H), bot = B.y + H;
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2; ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
      const brace = (y1, y2, label) => {
        if (y2 - y1 < 2) return;
        ctx.beginPath(); ctx.moveTo(xr - 4, y1 + 1); ctx.lineTo(xr, y1 + 1); ctx.lineTo(xr, y2 - 1); ctx.lineTo(xr - 4, y2 - 1); ctx.stroke();
        ctx.fillText(label, xr + 8, (y1 + y2) / 2 + 4);
      };
      const f = (mid - top) / H;
      brace(top, mid, `${fmt(f * 100, 0)} %${small ? '' : ' heraus'}`);
      brace(mid, bot, `${fmt((1 - f) * 100, 0)} %${small ? '' : ' unter Wasser'}`);
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(B.liq, tx + 10, surf + 18);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText(B.obj, bx + bw / 2, B.y + H / 2 + 4);
  };

  /* ---------- Teil 3: See im Winter ---------- */
  const lakeCv = $('#lakeCv');
  const N = 20, K_AIR = .35, SPEED = 4; // Schichten à 1 m, Wärmeaustausch pro Tag, Tage pro Sekunde
  const L = { mode: 'real', air: -8, T: [], ice: 0, bIce: 0, day: 0, running: false, on: false, fishX: .5, fishV: .04, msg: '' };
  const autumn = () => { L.T = Array.from({ length: N }, (_, i) => 5 + 9 * Math.exp(-i / 5)); L.ice = 0; L.bIce = 0; L.day = 0; };
  autumn();
  const rhoL = T => L.mode === 'real' ? rhoW(T) : 1 - .0002 * T;
  const nWater = () => N - Math.min(N, Math.floor(L.bIce));

  const stepLake = dd => {
    const T = L.T, air = L.air, nW = nWater();
    if (nW <= 0) return;
    if (L.mode === 'real') {
      if (L.ice > 0) {
        T[0] += (0 - T[0]) * Math.min(1, 3 * dd);
        L.ice += air < 0 ? 3.6 * (-air) / Math.max(L.ice, 2) * dd : -1.5 * air * dd;
        if (L.ice <= 0) L.ice = 0;
      } else {
        T[0] += (air - T[0]) * K_AIR * dd;
        if (T[0] < 0) { T[0] = 0; if (air < 0) L.ice = .5; }
      }
    } else {
      T[0] += (air - T[0]) * K_AIR * dd;
      if (T[0] < 0) { T[0] = 0; if (air < 0) L.bIce = Math.min(N, L.bIce + .02 * (-air) * dd); }
      if (air > 0 && L.bIce > 0) L.bIce = Math.max(0, L.bIce - .002 * air * dd);
    }
    // Wärmeleitung
    for (let i = 0; i < nW - 1; i++) { const f = .04 * dd * (T[i + 1] - T[i]); T[i] += f; T[i + 1] -= f; }
    // Konvektion: dichteres Wasser oben sinkt ab
    for (let pass = 0; pass < N; pass++) {
      let ch = false;
      for (let i = 0; i < nW - 1; i++) if (rhoL(T[i]) > rhoL(T[i + 1]) + 1e-7) { const m = (T[i] + T[i + 1]) / 2; T[i] = T[i + 1] = m; ch = true; }
      if (!ch) break;
    }
    for (let i = nW; i < N; i++) T[i] = 0;
    for (let i = 0; i < N; i++) T[i] = Math.max(0, T[i]);
    L.day += dd;
  };

  const lakeMsg = () => {
    const T0 = L.T[0], nW = nWater();
    if (L.mode === 'real') {
      if (L.ice > 0) return L.air < 0 ? 'Eisdecke! Sie schwimmt und isoliert. Darunter 0 °C, am Grund bleibt es bei etwa 4 °C. Der Fisch überwintert.' : 'Tauwetter: Die Eisdecke schmilzt von oben.';
      if (T0 > 4.05 && L.air < T0) return 'Das Wasser oben kühlt ab, wird dichter und sinkt. Der ganze See wird durchmischt.';
      if (T0 <= 4.05 && L.air < 0) return 'Unter 4 °C wird Wasser wieder leichter. Es bleibt oben liegen, die Durchmischung hört auf. Nur die Oberfläche kühlt weiter.';
      return 'Die Luft wärmt die Oberfläche. Warmes Wasser ist leichter und bleibt oben.';
    }
    if (nW <= 0) return 'Der See ist bis oben durchgefroren. Der Fisch hat keine Chance.';
    if (L.bIce > 0) return L.air < 0 ? 'Das Eis ist dichter als das Wasser und sinkt auf den Grund. Der See friert von unten zu.' : 'Tauwetter: Nur das Wasser oben wärmt sich. Das Eis am Grund schmilzt kaum.';
    if (L.air < 0) return 'Wie bei den meisten Stoffen: Kälteres Wasser ist immer dichter. Es sinkt ab, bis der ganze See 0 °C kalt ist.';
    return 'Die Luft wärmt die Oberfläche.';
  };
  const updLake = () => {
    $('#airOut').textContent = deg(L.air);
    $('#lakeBtn').textContent = L.running ? 'Pause' : L.day > 0 ? 'Weiter' : 'Winter starten';
    if (!L.on) return;
    const nW = nWater();
    $('#lTop').textContent = nW > 0 ? `${fmt(L.T[0], 1)} °C` : 'gefroren';
    $('#lBot').textContent = L.bIce >= 1 ? 'gefroren' : `${fmt(L.T[N - 1], 1)} °C`;
    if (L.mode === 'real') { $('#lIce').textContent = L.ice > 0 ? `${fmt(L.ice, 0)} cm` : 'keins'; $('#lIceWhere').textContent = 'Dicke, oben schwimmend'; }
    else { $('#lIce').textContent = L.bIce > 0 ? `${fmt(L.bIce, 1)} m` : 'keins'; $('#lIceWhere').textContent = 'Dicke, am Grund'; }
    const m = lakeMsg();
    if (m !== L.msg) { L.msg = m; $('#lakeStatus').textContent = m; }
  };
  $$('#lakeModeBtns button').forEach(b => b.addEventListener('click', () => {
    L.mode = b.dataset.mode; autumn(); L.msg = '';
    $$('#lakeModeBtns button').forEach(x => x.classList.toggle('active', x === b));
    updLake();
  }));
  $('#airIn').addEventListener('input', e => { L.air = +e.target.value; updLake(); });
  $('#lakeBtn').addEventListener('click', () => {
    if (reduced) { for (let i = 0; i < 120 * 8; i++) stepLake(.125); updLake(); return; }
    L.running = !L.running; updLake();
  });
  $('#lakeReset').addEventListener('click', () => { autumn(); L.running = false; L.msg = ''; updLake(); });
  updLake();

  const drawLake = dt => {
    if (L.running) {
      let left = dt * SPEED;
      while (left > 1e-6) { const d = Math.min(.125, left); stepLake(d); left -= d; }
      updLake();
    }
    const { ctx, w, h } = fit(lakeCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const lx = small ? 40 : 52, lw = w - lx - 10, top = 52, bot = h - 14, lh = (bot - top) / N;
    // Luft
    ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText(`Luft ${deg(L.air)}`, lx, 18);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(`Tag ${Math.floor(L.day)}`, w - 10, 18);
    // Schichten
    const nW = nWater();
    for (let i = 0; i < N; i++) {
      const y = top + i * lh;
      if (i >= nW) continue;
      const t = clamp(L.T[i] / 14, 0, 1);
      ctx.fillStyle = C.fiber; ctx.globalAlpha = .12 + .45 * (1 - t); ctx.fillRect(lx, y, lw, lh + .5);
      ctx.fillStyle = C.copper; ctx.globalAlpha = .55 * t; ctx.fillRect(lx, y, lw, lh + .5);
    }
    ctx.globalAlpha = 1;
    // Eis am Grund (gesunken)
    if (L.bIce > 0) {
      const ih = L.bIce * lh, y = bot - ih;
      ctx.fillStyle = C.surface; ctx.fillRect(lx, y, lw, ih);
      ctx.strokeStyle = C.fiber; ctx.lineWidth = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(lx, y, lw, ih); ctx.clip();
      for (let x = lx - ih; x < lx + lw; x += 10) { ctx.beginPath(); ctx.moveTo(x, bot); ctx.lineTo(x + ih, y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeRect(lx, y, lw, ih);
    }
    // Eisdecke oben (dicker gezeichnet)
    if (L.ice > 0) {
      const ih = clamp(L.ice * .35, 3, 26);
      ctx.fillStyle = C.surface; ctx.fillRect(lx, top - ih * .1, lw, ih);
      ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.5; ctx.strokeRect(lx, top - ih * .1, lw, ih);
      ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      ctx.fillText(small ? 'Eis (dicker gezeichnet)' : 'Eisdecke, dicker gezeichnet', lx + 8, top + ih + 14);
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(lx, top, lw, bot - top);
    // Tiefenskala
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    for (let m = 0; m <= N; m += 5) ctx.fillText(`${m} m`, lx - 6, top + m * lh + 4);
    // Temperaturprofil
    const TX = T => lx + lw * .1 + lw * .8 * clamp(T / 16, 0, 1);
    ctx.strokeStyle = C.glow; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(TX(4), top); ctx.lineTo(TX(4), bot); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.glow; ctx.textAlign = 'center'; ctx.fillText('4 °C', TX(4), 36);
    ctx.fillStyle = C.muted; ctx.fillText('0', TX(0), 36); ctx.fillText('16 °C', TX(16), 36);
    if (nW > 0) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < nW; i++) { const x = TX(L.T[i]), y = top + (i + .5) * lh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    // Fisch
    const alive = L.mode === 'real' || nW > 0;
    if (alive && L.running && !reduced) {
      L.fishX += L.fishV * dt;
      if (L.fishX > .85 || L.fishX < .15) L.fishV *= -1;
    }
    const fy = alive ? top + (Math.max(1, nW) - .5) * lh : bot - lh * .5, fx = lx + lw * L.fishX, dir = L.fishV > 0 ? 1 : -1;
    ctx.fillStyle = alive ? C.glow : C.muted;
    ctx.beginPath(); ctx.ellipse(fx, fy, 11, 5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx - dir * 9, fy); ctx.lineTo(fx - dir * 17, fy - 5); ctx.lineTo(fx - dir * 17, fy + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(fx + dir * 6, fy - 1, 1.3, 0, TAU); ctx.fill();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('eis', 4, {
    molLock: () => { M.on = true; $('#tempIn').disabled = false; $('#zoomBtn').disabled = false; updMol(); },
    floatLock: () => { B.on = true; $$('#objBtns button, #liqBtns button').forEach(b => b.disabled = false); $('#dropIn').disabled = false; drop(); },
    lakeLock: () => { L.on = true; $$('#lakeModeBtns button').forEach(b => b.disabled = false); $('#airIn').disabled = false; $('#lakeBtn').disabled = false; $('#lakeReset').disabled = false; updLake(); },
  });

  loop((dt, now) => { drawMol(dt, now); drawFloat(dt); drawLake(dt); });
})();
