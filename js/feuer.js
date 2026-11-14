/* mindblow – Lektion Feuer */
(() => {
  const { $, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  // bewusst feste Farben: Wachs, Holz, Docht und die Flamme selbst
  const WAX = '#f1e8d6', WAX_EDGE = '#d9cdb4', POOL = '#e9c96a', WICK = '#3a2a1e', WOOD = '#8a5a32', WOOD_END = '#c89a62';

  // Text im Readout nur ändern, wenn er sich ändert
  const shown = {};
  const setTxt = (id, s) => { if (shown[id] !== s) { shown[id] = s; $('#' + id).textContent = s; } };

  // Pseudo-Rauschen für ruhiges Flackern
  const wob = (t, s) => Math.sin(t * 7.1 + s) * .55 + Math.sin(t * 12.7 + s * 2.3) * .3 + Math.sin(t * 3.3 + s * .7) * .15;

  /* Form einer Flamme: Spitze oben, runder Fuss. H = Höhe, W = halbe Breite, y = Fuss */
  const flamePath = (ctx, x, y, H, W, sway = 0) => {
    const cy = y - W * .9, top = Math.min(y - H, cy - W), tx = x + sway, d = cy - top;
    ctx.beginPath();
    ctx.moveTo(tx, top);
    ctx.bezierCurveTo(tx + W * .22, top + d * .35, x + W, cy - d * .45, x + W, cy);
    ctx.arc(x, cy, W, 0, Math.PI);
    ctx.bezierCurveTo(x - W, cy - d * .45, tx - W * .22, top + d * .35, tx, top);
    ctx.closePath();
  };
  // Flamme mit Schein, blauem Fuss, leuchtender Zone und dunklem Kern
  const drawFlame = (ctx, x, y, H, W, o = {}) => {
    const { yellow = 1, sway = 0, a = 1, core = false } = o;
    if (a <= .01 || H < 2 || W < .5) return;
    ctx.save();
    ctx.globalAlpha = a;
    const gy = y - H * .45, R = Math.max(H, W * 2.4) * 1.1;
    const g = ctx.createRadialGradient(x, gy, 0, x, gy, R);
    g.addColorStop(0, yellow > .3 ? `rgba(255,170,60,${.1 + .22 * yellow})` : 'rgba(90,130,255,.16)');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - R, gy - R, R * 2, R * 2);
    // äusserer, fast unsichtbarer Saum
    flamePath(ctx, x, y + W * .12, H * 1.06 + 3, W * 1.2 + 1.5, sway * 1.05);
    ctx.fillStyle = 'rgba(120,150,255,.2)'; ctx.fill();
    // blauer Körper
    flamePath(ctx, x, y, H, W, sway);
    ctx.fillStyle = `rgba(60,100,255,${.45 + .25 * (1 - yellow)})`; ctx.fill();
    // leuchtende Zone: glühender Russ
    if (yellow > .02) {
      const ly = y - H * .12, LH = H * .88, LW = W * .86;
      const lg = ctx.createRadialGradient(x, ly - LH * .32, 0, x, ly - LH * .32, LH * .75);
      lg.addColorStop(0, `rgba(255,252,225,${yellow})`);
      lg.addColorStop(.45, `rgba(255,215,90,${yellow})`);
      lg.addColorStop(1, `rgba(255,135,30,${yellow * .85})`);
      if (!reduced) { ctx.shadowColor = 'rgba(255,160,40,.8)'; ctx.shadowBlur = 16 * yellow; }
      flamePath(ctx, x, ly, LH, LW, sway);
      ctx.fillStyle = lg; ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (core) {
      ctx.beginPath(); ctx.ellipse(x, y - H * .2, W * .38, H * .15, 0, 0, TAU);
      ctx.fillStyle = 'rgba(70,55,110,.5)'; ctx.fill();
    }
    ctx.restore();
  };
  const drawMatch = (ctx, mx, my, t, burning) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(mx + 4, my + 2); ctx.lineTo(mx + 70, my + 30); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(mx + 2, my + 1, 5, 4, .4, 0, TAU); ctx.fillStyle = '#7a2a1e'; ctx.fill();
    ctx.restore();
    if (burning) drawFlame(ctx, mx, my + 2, 22 + wob(t, 3) * 2, 6, { sway: reduced ? 0 : wob(t, 1) * 2 });
  };

  /* ---------- Teil 1: Die Kerze ---------- */
  const candleCv = $('#candleCv');
  const K = { on: true, lit: 1, smoke: 0, ember: 0, zones: true, mh: 3, t: 0, match: null, front: null, parts: [], flow: 0 };

  const updCandle = () => {
    $('#mHOut').textContent = `${fmt(K.mh, K.mh % 1 ? 1 : 0)} cm`;
    setTxt('cMatch', `${fmt(K.mh, K.mh % 1 ? 1 : 0)} cm`);
    $('#blowBtn').textContent = K.on ? 'Ausblasen' : 'Am Docht anzünden';
  };
  $('#mHIn').addEventListener('input', e => { K.mh = +e.target.value; updCandle(); });
  $('#blowBtn').addEventListener('click', () => {
    K.match = null; K.front = null;
    if (K.on) {
      K.on = false; K.smoke = 1; K.ember = 1.6;
      $('#candleStatus').textContent = 'Aus! Der weisse Rauch ist Wachsdampf, der zu feinen Tröpfchen abkühlt. Halte schnell das Streichholz hinein.';
    } else {
      K.on = true; K.smoke = 0;
      $('#candleStatus').textContent = 'Die Hitze des Streichholzes verdampft Wachs am Docht. Das Gas fängt Feuer.';
    }
    updCandle();
  });
  $('#smokeBtn').addEventListener('click', () => {
    if (K.on) { $('#candleStatus').textContent = 'Die Kerze brennt ja noch. Blas sie zuerst aus.'; return; }
    if (K.match) return;
    K.match = { t: 0, ok: null, h: K.mh };
  });
  $('#zoneBtn').addEventListener('click', () => {
    K.zones = !K.zones;
    $('#zoneBtn').textContent = K.zones ? 'Zonen ausblenden' : 'Zonen zeigen';
  });
  updCandle();

  const drawCandle = dt => {
    const { ctx, w, h } = fit(candleCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    K.t += dt;
    const t = reduced ? 0 : K.t;
    const cx = w * (narrow ? .3 : .32), cw = Math.min(w * (narrow ? .22 : .18), 84);
    const yT = h * .74, yW = yT - 22, pxcm = (yW - 34) / 8.5;

    // Zustand
    if (K.on) K.lit = Math.min(1, K.lit + dt * 1.5); else K.lit = Math.max(0, K.lit - dt * 6);
    if (!K.on) K.smoke = Math.max(0, K.smoke - dt / 10);
    K.ember = Math.max(0, K.ember - dt);

    // Kerze
    const x0 = cx - cw / 2, x1 = cx + cw / 2;
    ctx.fillStyle = WAX; ctx.strokeStyle = WAX_EDGE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, h + 2); ctx.lineTo(x0, yT + 4); ctx.quadraticCurveTo(x0, yT - 2, x0 + 6, yT - 2);
    ctx.lineTo(x1 - 6, yT - 2); ctx.quadraticCurveTo(x1, yT - 2, x1, yT + 4); ctx.lineTo(x1, h + 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Querschnitt: Docht reicht bis tief in die Kerze
    ctx.strokeStyle = 'rgba(58,42,30,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, yT + 6); ctx.lineTo(cx, h); ctx.stroke();
    // Wachssee
    const pw = cw * .4 * (.4 + .6 * K.lit);
    ctx.beginPath(); ctx.moveTo(cx - pw, yT - 2); ctx.quadraticCurveTo(cx, yT + 16, cx + pw, yT - 2); ctx.closePath();
    ctx.fillStyle = POOL; ctx.globalAlpha = .55 + .35 * K.lit; ctx.fill(); ctx.globalAlpha = 1;
    // Docht
    ctx.strokeStyle = WICK; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, yT + 6); ctx.quadraticCurveTo(cx, yW + 6, cx + 2, yW); ctx.stroke();
    if (K.ember > 0 || K.lit > 0) {
      ctx.beginPath(); ctx.arc(cx + 2, yW, 2.5, 0, TAU);
      ctx.fillStyle = `rgba(255,120,40,${Math.max(K.lit, K.ember / 1.6)})`; ctx.fill();
    }

    // Flamme
    const H = 3 * pxcm * K.lit * (1 + (reduced ? 0 : wob(t, 0) * .04)), W = .5 * pxcm * (.5 + .5 * K.lit);
    const yF = yW + 7;
    drawFlame(ctx, cx, yF, H, W, { sway: reduced ? 0 : wob(t, 2) * W * .18, core: true, a: Math.min(1, K.lit * 1.4) });

    // Wachs auf dem Weg: Wachssee → Docht → Dampf
    if (K.on && K.lit > .6) {
      if (!reduced) K.flow = (K.flow + dt * .22) % 1;
      const N = 8;
      for (let i = 0; i < N; i++) {
        const q = (i / N + K.flow) % 1, side = i % 2 ? 1 : -1;
        let x, y, gas = false;
        if (q < .3) { const k = q / .3; x = cx + side * pw * .8 * (1 - k); y = yT + 2 + 4 * Math.sin(k * Math.PI); }
        else if (q < .65) { const k = (q - .3) / .35; x = cx + 1.5 * k; y = lerp(yT + 4, yW, k); }
        else { const k = (q - .65) / .35; x = cx + 2 + side * W * .25 * k; y = yW - k * H * .3; gas = true; }
        ctx.beginPath(); ctx.arc(x, y, gas ? 2.6 : 2.2, 0, TAU);
        if (gas) { ctx.strokeStyle = `rgba(255,255,255,${.9 * (1 - (q - .65) / .35 * .6)})`; ctx.lineWidth = 1.4; ctx.stroke(); }
        else { ctx.fillStyle = '#b07a12'; ctx.fill(); }
      }
    }

    // Rauch
    if (!K.on && K.smoke > .02) {
      if (!reduced) {
        const n = dt * 45 * K.smoke, cnt = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
        for (let i = 0; i < cnt; i++)
          K.parts.push({ x: cx + 2 + (Math.random() - .5) * 2, y: yW - 2, age: 0, life: 2.6 + Math.random(), ph: Math.random() * TAU, s: K.smoke });
      }
    }
    if (!reduced) {
      for (const p of K.parts) { p.age += dt; p.y -= dt * (48 + 20 * p.age); p.x += Math.sin(p.age * 2.4 + p.ph) * dt * 10 * p.age; }
      K.parts = K.parts.filter(p => p.age < p.life && p.y > -10);
      for (const p of K.parts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + p.age * 4, 0, TAU);
        ctx.fillStyle = C.muted; ctx.globalAlpha = .28 * p.s * (1 - p.age / p.life); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (!K.on && K.smoke > .02) {
      ctx.strokeStyle = C.muted; ctx.globalAlpha = .5 * K.smoke; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + 2, yW);
      for (let y = yW; y > 20; y -= 6) ctx.lineTo(cx + 2 + Math.sin((yW - y) / 18) * (yW - y) * .06, y);
      ctx.stroke(); ctx.globalAlpha = 1;
    }

    // Streichholz und Flammenfront
    const mhPx = K.mh * pxcm;
    if (!K.match && !K.on) {
      // Höhe des Streichholzes als Markierung
      ctx.setLineDash([3, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 30, yW - mhPx); ctx.lineTo(cx + 30, yW - mhPx); ctx.stroke(); ctx.setLineDash([]);
    }
    if (K.match) {
      const M = K.match, my = yW - M.h * pxcm;
      M.t += dt;
      const inK = clamp(M.t / .6, 0, 1), mx = cx + 2 + lerp(70, 6, inK * inK * (3 - 2 * inK));
      if (M.ok === null && M.t >= .6) {
        M.ok = K.smoke > M.h / 12;
        if (M.ok) { K.front = { y: my, t: 0 }; $('#candleStatus').textContent = 'Die Flamme springt durch den Rauch nach unten bis zum Docht. Der Rauch ist brennbares Wachsgas.'; }
        else $('#candleStatus').textContent = K.smoke < .05
          ? 'Zu spät: Der Rauch ist weg. Zünde die Kerze direkt am Docht an und versuch es nochmals.'
          : 'Kein Erfolg: So hoch oben ist zu wenig Wachsdampf im Rauch. Halte das Streichholz tiefer oder sei schneller.';
      }
      drawMatch(ctx, mx, my, t, true);
      if (M.t > (M.ok ? 1.4 : 1.8)) K.match = null;
    }
    if (K.front) {
      const F = K.front; F.t += dt;
      const k = clamp(F.t / .35, 0, 1), fy = lerp(F.y, yW, k);
      drawFlame(ctx, cx + 2, fy + 6, 16, 5, { yellow: .6 });
      if (k >= 1) { K.front = null; K.on = true; K.lit = .35; K.smoke = 0; updCandle(); }
    }

    // Zonen beschriften
    if (K.zones) {
      const lx = narrow ? x1 + 16 : w * .58;
      ctx.font = `${narrow ? 10 : 11}px ${MONO}`; ctx.textAlign = 'left';
      const L = [];
      if (K.lit > .7) {
        L.push([cx + W * 1.15, yF - H * .7, 'äusserer Saum: am heissesten', 'Saum: am heissesten', yF - H * .95]);
        L.push([cx + W * .45, yF - H * .55, 'gelb: glühender Russ', 'gelb: Russ glüht', yF - H * .68]);
        L.push([cx + W * .2, yF - H * .2, 'dunkler Kern: Wachsdampf', 'Kern: Wachsdampf', yF - H * .4]);
        L.push([cx + W * .75, yF - W * .3, 'blau: viel Sauerstoff', 'blau: viel O₂', yF - H * .12]);
      } else if (!K.on && K.smoke > .1) {
        L.push([cx + 6, yW - pxcm * 2.5, 'Rauch: Wachsdampf, brennbar', 'Rauch: Wachsdampf', yW - pxcm * 3]);
      }
      L.push([cx + 2, yW + 12, 'Docht saugt Wachs hoch', 'Docht: Pumpe', yW + 10]);
      L.push([cx + pw * .5, yT + 2, 'flüssiges Wachs', 'flüssiges Wachs', yT + 22]);
      L.push([cx + cw * .3, yT + 60, 'festes Wachs', 'festes Wachs', yT + 50]);
      let prev = -1e9;
      for (const [ax, ay, txt, txtN, ly0] of L) {
        const ly = Math.max(ly0, prev + 17); prev = ly;
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx - 5, ly - 4); ctx.stroke();
        ctx.beginPath(); ctx.arc(ax, ay, 2, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();
        ctx.fillStyle = C.fg; ctx.fillText(narrow ? txtN : txt, lx, ly);
      }
    }
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('Querschnitt, vereinfacht', 12, 18);

    // Readout
    setTxt('cState', K.on ? 'brennt' : K.smoke > .05 ? 'aus, raucht' : 'aus');
    setTxt('cState2', K.on ? 'Wachsdampf verbrennt' : K.smoke > .05 ? 'Rauch ist Wachsdampf' : 'kein Dampf mehr');
    setTxt('cSmoke', `${fmt(K.smoke * 100, 0)} %`);
  };

  /* ---------- Teil 2: Das Feuerdreieck ---------- */
  const triCv = $('#triCv');
  const F = { fuel: 70, oxy: 21, heat: 80, I: 1, lidOn: false, lid: 0, anim: {}, drops: [], steam: [], wasOn: true, cause: null, t: 0 };
  const SLIDE = { fuel: ['#fFuel', '#fFuelOut'], oxy: ['#fOxy', '#fOxyOut'], heat: ['#fHeat', '#fHeatOut'] };
  const NAMES = { fuel: 'Brennstoff', oxy: 'Sauerstoff', heat: 'Hitze' };
  const levels = () => ({ fuel: clamp(F.fuel / 70, 0, 1), oxy: clamp((F.oxy - 15) / 6, 0, 1), heat: clamp((F.heat - 25) / 55, 0, 1) });
  const updTri = () => {
    for (const k in SLIDE) {
      $(SLIDE[k][0]).value = F[k];
      $(SLIDE[k][1]).textContent = `${fmt(F[k], k === 'oxy' && F[k] % 1 ? 1 : 0)} %`;
    }
    setTxt('tOxy', `${fmt(F.oxy, F.oxy % 1 ? 1 : 0)} %`);
  };
  for (const k in SLIDE) $(SLIDE[k][0]).addEventListener('input', e => {
    F[k] = +e.target.value; delete F.anim[k]; F.cause = null;
    if (k === 'oxy' && F.lidOn) { F.lidOn = false; $('#triStatus').textContent = 'Deckel weg: Frische Luft kommt wieder ans Feuer.'; }
    updTri();
  });
  const animTo = (k, v, rate) => { F.anim[k] = { v, rate }; };
  $('#lidBtn').addEventListener('click', () => {
    F.lidOn = true; F.cause = 'oxy';
    $('#triStatus').textContent = 'Deckel drauf: Das Feuer verbraucht den Sauerstoff darunter, und neuer kommt nicht nach. So löschst du auch einen Fettbrand in der Pfanne.';
  });
  $('#waterBtn').addEventListener('click', () => {
    F.cause = 'heat'; F.lidOn = false; animTo('heat', 4, 55);
    for (let i = 0; i < 26; i++) F.drops.push({ x: Math.random(), y: -Math.random() * .5, v: .9 + Math.random() * .4 });
    $('#triStatus').textContent = 'Wasser kühlt: Es verdampft und nimmt dabei viel Wärme mit. Bei Holz wirkt das gut. Bei brennendem Öl nie!';
  });
  $('#woodBtn').addEventListener('click', () => {
    F.cause = 'fuel'; animTo('fuel', 0, 60);
    $('#triStatus').textContent = 'Ohne Brennstoff ist Schluss. So kämpft man auch gegen Waldbrände: Eine Schneise ohne Bäume hält das Feuer auf.';
  });
  $('#relightBtn').addEventListener('click', () => {
    F.lidOn = false; F.cause = null; F.drops = [];
    animTo('fuel', 70, 120); animTo('oxy', 21, 30); animTo('heat', 80, 120);
    $('#triStatus').textContent = 'Neues Holz, frische Luft und ein Streichholz: Alle drei Seiten sind wieder da.';
  });
  updTri();

  const drawTri = dt => {
    const { ctx, w, h } = fit(triCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    F.t += dt;
    const t = reduced ? 0 : F.t;

    // Werte bewegen
    let changed = false;
    for (const k in F.anim) {
      const A = F.anim[k], d = A.v - F[k], step = A.rate * dt;
      if (Math.abs(d) <= step) { F[k] = A.v; delete F.anim[k]; } else F[k] += Math.sign(d) * step;
      changed = true;
    }
    if (F.lidOn) {
      F.lid = Math.min(1, F.lid + dt * 2.5);
      if (F.lid >= 1 && F.oxy > 0) { F.oxy = Math.max(0, F.oxy - dt * (1 + 3 * F.I) * 1.3); changed = true; }
    } else F.lid = Math.max(0, F.lid - dt * 2.5);
    if (changed) updTri();

    const L = levels();
    const lowest = Object.keys(L).reduce((m, k) => L[k] < L[m] ? k : m, 'fuel');
    const burn = F.fuel > 3 && L.oxy > 0 && L.heat > 0;
    const target = burn ? Math.min(L.fuel, L.oxy, L.heat) : 0;
    F.I += (target - F.I) * Math.min(1, dt * 3);
    if (!burn && F.I < .03) F.I = 0;
    if (F.wasOn && F.I === 0) {
      const why = F.cause || lowest;
      $('#triStatus').textContent = `Das Feuer ist aus. Es fehlt: ${NAMES[why]}. ` + { oxy: 'Ohne Sauerstoff kann der Brennstoff nicht reagieren.', heat: 'Zu kalt: Das Holz gibt keine brennbaren Gase mehr ab.', fuel: 'Nichts mehr da, was brennen kann.' }[why];
    }
    F.wasOn = F.I > 0;
    setTxt('tFire', F.I > .75 ? 'brennt stark' : F.I > .35 ? 'brennt' : F.I > 0 ? 'flackert schwach' : 'aus');
    setTxt('tMiss', F.I === 0 ? NAMES[F.cause || lowest] : L[lowest] >= .99 ? 'nichts' : NAMES[lowest] + ' knapp');

    // Feuerschale
    const fw = w * (narrow ? .56 : .55), fx = fw * .5, fy = h * .8;
    const bw = Math.min(fw * .78, 230), bh = 30;
    ctx.beginPath(); ctx.moveTo(fx - bw / 2, fy); ctx.quadraticCurveTo(fx, fy + bh * 2, fx + bw / 2, fy); ctx.closePath();
    ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - bw * .2, fy + bh * .95); ctx.lineTo(fx - bw * .28, h - 10); ctx.moveTo(fx + bw * .2, fy + bh * .95); ctx.lineTo(fx + bw * .28, h - 10); ctx.stroke();
    // Holzscheite
    const a = clamp(F.fuel / 100, 0, 1);
    if (F.fuel > 1) {
      ctx.globalAlpha = clamp(F.fuel / 15, 0, 1);
      const len = bw * (.35 + .45 * a), th = 9 + 7 * a;
      for (const [ang, dx] of [[-.22, -.08], [.22, .08], [0, 0]]) {
        ctx.save(); ctx.translate(fx + dx * bw, fy - th * .3); ctx.rotate(ang);
        roundRect(ctx, -len / 2, -th / 2, len, th, th / 2); ctx.fillStyle = WOOD; ctx.fill();
        ctx.beginPath(); ctx.ellipse(len / 2 - th * .25, 0, th * .25, th / 2, 0, 0, TAU); ctx.fillStyle = WOOD_END; ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // Glut
    if (F.I > 0) for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(fx + (i - 3) * bw * .06, fy - 2 + (i % 2) * 3, 2.2, 0, TAU);
      ctx.fillStyle = `rgba(255,${120 + (i * 37) % 80},40,${F.I * (.6 + .4 * Math.sin(t * 5 + i))})`; ctx.fill();
    }
    // Flammen
    const fh = F.I * (70 + 50 * a) * (narrow ? .85 : 1);
    [[-.2, .72, 1], [0, 1, 2], [.2, .8, 3]].forEach(([dx, s, seed]) => {
      const H = fh * s * (1 + (reduced ? 0 : wob(t, seed) * .1));
      drawFlame(ctx, fx + dx * bw * .55, fy - 10, H, Math.max(4, H * .26), { sway: reduced ? 0 : wob(t, seed + 5) * H * .08, a: Math.min(1, F.I * 2) });
    });
    // Wassertropfen und Dampf
    if (F.drops.length) {
      for (const d of F.drops) d.y += dt * d.v * 1.4;
      F.drops = F.drops.filter(d => {
        if (d.y > 1) { if (F.I > .05 && F.steam.length < 40) F.steam.push({ x: fx + (d.x - .5) * bw * .7, y: fy - 16, age: 0 }); return false; }
        return true;
      });
      ctx.fillStyle = '#4a90e2';
      for (const d of F.drops) if (d.y > 0) {
        const x = fx + (d.x - .5) * bw * .7, y = 16 + d.y * (fy - 30);
        ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.quadraticCurveTo(x + 4, y + 1, x, y + 3); ctx.quadraticCurveTo(x - 4, y + 1, x, y - 6); ctx.fill();
      }
    }
    for (const s of F.steam) { s.age += dt; s.y -= dt * 40; }
    F.steam = F.steam.filter(s => s.age < 1.6);
    for (const s of F.steam) {
      ctx.beginPath(); ctx.arc(s.x, s.y, 4 + s.age * 10, 0, TAU);
      ctx.fillStyle = C.muted; ctx.globalAlpha = .3 * (1 - s.age / 1.6); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Deckel
    if (F.lid > 0) {
      const off = (1 - F.lid) * -h * .6, r = bw * .52;
      ctx.save(); ctx.translate(0, off);
      ctx.beginPath(); ctx.moveTo(fx - r, fy); ctx.bezierCurveTo(fx - r, fy - r * 1.25, fx + r, fy - r * 1.25, fx + r, fy); ctx.closePath();
      ctx.fillStyle = 'rgba(150,165,185,.28)'; ctx.fill(); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke();
      roundRect(ctx, fx - 14, fy - r * .94 - 8, 28, 9, 4); ctx.fillStyle = C.fg; ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Modell' : 'vereinfachtes Modell', 12, 18);

    // Feuerdreieck
    const s = Math.min(w - fw - (narrow ? 30 : 60), 200);
    const tx = fw + (w - fw) / 2, ty = h * .48;
    const P = { top: [tx, ty - s * .577], bl: [tx - s / 2, ty + s * .289], br: [tx + s / 2, ty + s * .289] };
    const sides = [['heat', P.bl, P.top], ['oxy', P.top, P.br], ['fuel', P.bl, P.br]];
    ctx.lineCap = 'round';
    for (const [k, p, q] of sides) {
      const lv = L[k];
      ctx.strokeStyle = C.line; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke();
      ctx.setLineDash(lv > 0 ? [] : [4, 7]);
      ctx.strokeStyle = lv > 0 ? C.accent : C.bad; ctx.lineWidth = lv > 0 ? 3 + 6 * lv : 3;
      ctx.globalAlpha = lv > 0 ? .35 + .65 * lv : 1;
      ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // Beschriftung entlang der Seite, aussen
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      let nx = mx - tx, ny = my - ty; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      ctx.save(); ctx.translate(mx + nx * 16, my + ny * 16);
      let ang = Math.atan2(q[1] - p[1], q[0] - p[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      ctx.rotate(ang);
      ctx.font = `500 ${narrow ? 10 : 11}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = lv > 0 ? C.fg : C.bad; ctx.fillText(NAMES[k], 0, 0);
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';
    // Flamme im Dreieck
    drawFlame(ctx, tx, ty + s * .16, s * .38 * F.I, s * .1 * Math.max(.3, F.I), { sway: reduced ? 0 : wob(t, 9) * 2, a: Math.min(1, F.I * 2) });
    if (F.I === 0) { ctx.fillStyle = C.bad; ctx.font = `500 12px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('aus', tx, ty + s * .08); }
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('Feuerdreieck', tx, Math.max(14, P.top[1] - 22));
  };

  /* ---------- Teil 3: Schwerkraft und Flammenform ---------- */
  const gravCv = $('#gravCv');
  const G = { g: 1, gs: 1, soot: false, t: 0, up: [], air: [] };
  const gWhere = g => g < .03 ? 'schwerelos' : Math.abs(g - .17) < .02 ? 'wie auf dem Mond' : Math.abs(g - 1) < .02 ? 'wie auf der Erde' : g > 1 ? 'stärker als auf der Erde' : 'schwächer als auf der Erde';
  const updGrav = () => {
    $('#gIn').value = Math.round(G.g * 100);
    $('#gOut').textContent = `${fmt(G.g, 2)} g`;
    setTxt('gVal', `${fmt(G.g, 2)} g`);
    setTxt('gWhere', gWhere(G.g));
    const e = Math.sqrt(G.g);
    setTxt('gShape', e < .2 ? 'Kugel' : e < .75 ? 'rundlich' : G.g > 1.4 ? 'lang, flackert' : 'Tropfen');
    const y = flameYellow(e);
    setTxt('gColor', y < .2 ? 'blau, schwach' : y < .7 ? 'gelb und blau' : 'gelb, unten blau');
  };
  const flameYellow = e => clamp((e - .12) / .55, 0, 1) * .95 + .03;
  const gMsg = () => G.g < .03
    ? 'Schwerelos: kein Auftrieb, kein Nachströmen. Die Flamme wird zur blauen Kugel und brennt nur schwach.'
    : G.g < .5 ? 'Wenig Schwerkraft: Die heissen Gase steigen langsamer, die Flamme wird breiter und ruhiger (vereinfacht).'
    : G.g <= 1.2 ? 'Auf der Erde: Heisse Gase steigen auf, frische Luft strömt von unten nach. Die Flamme wird lang gezogen.'
    : 'Mehr Schwerkraft: stärkerer Auftrieb, die Flamme wird länger, schmaler und flackert mehr (vereinfacht).';
  $('#gIn').addEventListener('input', e => { G.g = +e.target.value / 100; updGrav(); $('#gravStatus').textContent = gMsg(); });
  const gSet = (g, msg) => () => { G.g = g; updGrav(); $('#gravStatus').textContent = msg || gMsg(); };
  $('#gEarth').addEventListener('click', gSet(1));
  $('#gMoon').addEventListener('click', gSet(.17, 'Auf dem Mond, etwa ein Sechstel der Erd-Schwerkraft (mit Luft in einer Station gedacht): Die Flamme wird breiter, ruhiger und etwas blauer (vereinfacht).'));
  $('#gSpace').addEventListener('click', gSet(0));
  $('#sootBtn').addEventListener('click', () => {
    G.soot = !G.soot;
    $('#sootBtn').textContent = G.soot ? 'Russ ausblenden' : 'Russ zeigen';
    if (G.soot) $('#gravStatus').textContent = 'Die Punkte sind Russteilchen. Sie glühen gelb und verbrennen weiter oben. Ohne Schwerkraft entsteht bei der Kerze kaum Russ.';
  });
  updGrav();

  const drawGrav = dt => {
    const { ctx, w, h } = fit(gravCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    G.t += dt;
    const t = reduced ? 0 : G.t;
    G.gs += (G.g - G.gs) * (reduced ? 1 : Math.min(1, dt * 3));
    const e = Math.sqrt(Math.max(0, G.gs)), e1 = Math.min(e, 1), ex = Math.max(0, e - 1);
    const cx = w * .5, yT = h * .8, yW = yT - 20, pxcm = Math.min((yW - 40) / 5, 46);
    const cw = Math.min(w * .14, 64);

    // Kerze
    ctx.fillStyle = WAX; ctx.strokeStyle = WAX_EDGE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(cx - cw / 2, yT, cw, h - yT + 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = WICK; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, yT); ctx.lineTo(cx + 1, yW); ctx.stroke();

    // Flammenform
    const W = (lerp(.62, .5, e1) - ex * .1) * pxcm;
    const H = (lerp(1.25, 3, e1) + ex * 2.4) * pxcm;
    const yF = yW + 6 + W * .9 * (1 - e1);
    const yellow = flameYellow(e);
    const amp = reduced ? 0 : e * (1 + ex * 2);
    drawFlame(ctx, cx, yF, H * (1 + wob(t, 1) * .04 * amp), W, { yellow, sway: wob(t, 4) * W * .2 * amp, a: .55 + .45 * e1, core: true });

    // Russteilchen
    if (G.soot && yellow > .1) {
      const n = Math.round(34 * yellow);
      for (let i = 0; i < n; i++) {
        const sd = (i * 0.6180339) % 1, u = ((sd + t * (.25 + .35 * e)) % 1);
        const x = cx + (sd - .5) * W * 1.3 * Math.sin(Math.PI * clamp(u * 1.3, 0, 1));
        const y = yF - H * .15 - u * H * .7;
        const b = Math.sin(Math.PI * u);
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU);
        ctx.fillStyle = `rgba(${200 + 55 * b},${90 + 140 * b},${30 + 120 * b * b},${.9 * b + .1})`; ctx.fill();
        if (u < .25) { ctx.fillStyle = 'rgba(30,20,20,.7)'; ctx.fill(); }
      }
      ctx.font = `10px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      ctx.fillText(narrow ? 'Russ glüht' : 'Russ glüht, rund 1\'000 °C und mehr', cx + W + 14, yF - H * .5);
    }

    // Strömung: heisse Gase hoch, frische Luft von unten
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    if (e > .05) {
      const sp = 60 * e;
      ctx.strokeStyle = C.copper; ctx.fillStyle = C.copper; ctx.lineWidth = 1.5;
      ctx.globalAlpha = clamp(e * 1.4, 0, 1);
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * W * 1.1;
        const base = yF - H - 10, span = Math.max(30, base - 30);
        const u = reduced ? (i + .5) / 3 : ((t * sp / span) + i / 3) % 1;
        const y = base - u * span;
        ctx.beginPath(); ctx.moveTo(cx + dx, y + 14); ctx.lineTo(cx + dx, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + dx - 4, y + 5); ctx.lineTo(cx + dx, y - 1); ctx.lineTo(cx + dx + 4, y + 5); ctx.stroke();
      }
      ctx.fillText(narrow ? 'heisses Gas steigt' : 'heisse Gase steigen auf', cx, 18);
      ctx.strokeStyle = C.accent; ctx.fillStyle = C.accent;
      for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
        const u = reduced ? .5 : ((t * sp / 90) + i / 2) % 1;
        const x0 = cx + side * (W + 90), x1 = cx + side * (W + 8);
        const x = lerp(x0, x1, u), y = lerp(yT + 6, yF - W * .6, u * u);
        ctx.globalAlpha = clamp(e * 1.4, 0, 1) * Math.sin(Math.PI * u);
        ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = clamp(e * 1.4, 0, 1);
      ctx.textAlign = 'left'; ctx.fillText(narrow ? 'Luft' : 'frische Luft', 10, yT - 4);
      ctx.textAlign = 'right'; ctx.fillText(narrow ? 'Luft' : 'frische Luft', w - 10, yT - 4);
      ctx.globalAlpha = 1;
    }
    if (e < .35) {
      // Sauerstoff kommt nur langsam von allen Seiten
      const cyS = yF - W * .9, R0 = W * 3.2;
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 1 - e / .35;
      for (let i = 0; i < 12; i++) {
        const ang = i / 12 * TAU + .2, u = reduced ? .5 : ((t * .18) + (i % 3) / 3) % 1;
        const r = lerp(R0, W * 1.3, u);
        ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cyS + Math.sin(ang) * r, 2.5, 0, TAU); ctx.fill();
      }
      ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
      ctx.fillText(narrow ? 'O₂ kommt von allen Seiten' : 'kein Oben: Sauerstoff kriecht von allen Seiten heran', cx, 18);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`${fmt(G.gs, 2)} g`, 12, h - 12);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('feuer', 4, {
    candleLock: () => { ['#mHIn', '#blowBtn', '#smokeBtn', '#zoneBtn'].forEach(s => $(s).disabled = false); },
    triLock: () => { ['#fFuel', '#fOxy', '#fHeat', '#lidBtn', '#waterBtn', '#woodBtn', '#relightBtn'].forEach(s => $(s).disabled = false); },
    gravLock: () => { ['#gIn', '#gEarth', '#gMoon', '#gSpace', '#sootBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawCandle(dt); drawTri(dt); drawGrav(dt); });
})();
