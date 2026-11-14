/* mindblow – Lektion Hebel */
(() => {
  const { $, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const nice = v => fmt(v, Math.abs(v - Math.round(v)) < 1e-6 ? 0 : 1);

  // Pfeil von (x0,y0) nach (x1,y1)
  const arrow = (ctx, x0, y0, x1, y1, col, lw = 3) => {
    const a = Math.atan2(y1 - y0, x1 - x0), hl = 9;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * .6, y1 - Math.sin(a) * hl * .6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hl * Math.cos(a - .45), y1 - hl * Math.sin(a - .45));
    ctx.lineTo(x1 - hl * Math.cos(a + .45), y1 - hl * Math.sin(a + .45));
    ctx.closePath(); ctx.fill();
  };

  // Sitzende Figur: Sitzpunkt (x,y), Grösse s in px (Kopf bis Sitz)
  const person = (ctx, x, y, s, col) => {
    ctx.fillStyle = col;
    roundRect(ctx, x - s * .2, y - s * .72, s * .4, s * .72, s * .14); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - s * .88, s * .16, 0, TAU); ctx.fill();
  };

  /* ---------- Teil 1: Wippe ---------- */
  const seeCv = $('#seeCv');
  const S = { kid: 2, ad: 1.5, mk: 25, ma: 75, ang: 0, vel: 0, state: '' };
  const BH = 2.2;                       // halbe Brettlänge in m
  const torque = () => [S.mk * S.kid, S.ma * S.ad];
  const stateOf = () => {
    const [l, r] = torque(), tol = .015 * Math.max(l, r);
    return l - r > tol ? 'kid' : r - l > tol ? 'ad' : 'bal';
  };
  const updSee = () => {
    $('#kidIn').value = S.kid; $('#adIn').value = S.ad;
    $('#kidOut').textContent = `${fmt(S.kid, 2)} m`;
    $('#adOut').textContent = `${fmt(S.ad, 2)} m`;
    const [l, r] = torque();
    $('#sL').textContent = fmt(l, 1); $('#sR').textContent = fmt(r, 1);
    $('#sLf').textContent = `${S.mk} kg × ${fmt(S.kid, 2)} m`;
    $('#sRf').textContent = `${S.ma} kg × ${fmt(S.ad, 2)} m`;
    const st = stateOf(), two = S.mk > 25;
    $('#sRes').textContent = st === 'bal' ? 'Gleichgewicht' : st === 'kid' ? (two ? 'Kinder sinken' : 'Kind sinkt') : 'Erwachsener sinkt';
    if (st !== S.state) {
      S.state = st;
      $('#seeStatus').textContent = st === 'bal'
        ? `Gleichgewicht: ${S.mk} kg × ${fmt(S.kid, 2)} m ist gleich viel wie ${S.ma} kg × ${fmt(S.ad, 2)} m.`
        : st === 'kid'
          ? `${two ? 'Die Kinder heben' : 'Das Kind hebt'} den Erwachsenen hoch, obwohl ${two ? 'sie zusammen leichter sind' : 'es dreimal leichter ist'}. Der grössere Abstand macht es aus.`
          : 'Der Erwachsene sinkt. Rück ihn näher zur Mitte oder das Kind weiter nach aussen.';
    }
  };
  $('#kidIn').addEventListener('input', e => { S.kid = +e.target.value; updSee(); });
  $('#adIn').addEventListener('input', e => { S.ad = +e.target.value; updSee(); });
  $('#kid2Btn').addEventListener('click', () => {
    S.mk = S.mk === 25 ? 50 : 25;
    $('#kid2Btn').textContent = S.mk === 50 ? 'Nur ein Kind' : 'Zweites Kind dazu';
    S.state = ''; updSee();
  });
  $('#balBtn').addEventListener('click', () => {
    let ad = S.mk * S.kid / S.ma;
    if (ad < .2) { ad = .2; S.kid = ad * S.ma / S.mk; }
    if (ad > 2) { ad = 2; S.kid = ad * S.ma / S.mk; }
    S.ad = ad; S.state = ''; updSee();
  });
  updSee();

  const drawSee = dt => {
    const { ctx, w, h } = fit(seeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const s = Math.min((w - 28) / (2 * BH), 120);
    const gy = h - 40, px = w / 2, ph = .5 * s, py = gy - ph;
    const maxA = Math.asin(ph / (BH * s));
    const [l, r] = torque();
    const target = -maxA * Math.tanh((l - r) / 6);
    if (reduced) S.ang = target;
    else { S.vel += ((target - S.ang) * 38 - S.vel * 8) * dt; S.ang += S.vel * dt; S.ang = clamp(S.ang, -maxA, maxA); }
    const ca = Math.cos(S.ang), sa = Math.sin(S.ang);
    const P = d => [px + d * s * ca, py + d * s * sa];   // Punkt auf dem Brett, d in m (links negativ)

    // Boden und Drehpunkt
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(w - 10, gy); ctx.stroke();
    ctx.fillStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ph * .6, gy); ctx.lineTo(px + ph * .6, gy); ctx.closePath(); ctx.fill();

    // Brett
    ctx.save(); ctx.translate(px, py); ctx.rotate(S.ang);
    roundRect(ctx, -BH * s, -7, 2 * BH * s, 9, 4); ctx.fillStyle = C.copper; ctx.fill();
    ctx.strokeStyle = C.surface; ctx.lineWidth = 1;
    for (let d = -2; d <= 2; d += .5) {
      if (!d) continue;
      ctx.beginPath(); ctx.moveTo(d * s, -7); ctx.lineTo(d * s, Math.abs(d % 1) < .01 ? 2 : -2); ctx.stroke();
    }
    // Abstände unter dem Brett
    const dim = (d, col, txt) => {
      const y = 16;
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(d * s, y); ctx.moveTo(d * s, y - 4); ctx.lineTo(d * s, y + 4); ctx.stroke();
      ctx.fillStyle = col; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      const tw = ctx.measureText(txt).width;
      if (Math.abs(d) * s > tw + 50) ctx.fillText(txt, d * s / 2, y + 14);
      else ctx.fillText(txt, d * s + Math.sign(d) * (tw / 2 + 8), y + 4);
    };
    dim(-S.kid, C.accent, `${fmt(S.kid, 2)} m`);
    dim(S.ad, C.copper, `${fmt(S.ad, 2)} m`);
    ctx.restore();
    ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fillStyle = C.fg; ctx.fill();

    // Personen bleiben aufrecht
    const ks = .62 * s, as = .95 * s;
    if (S.mk > 25) {
      for (const o of [-.14, .14]) { const [x, y] = P(-S.kid + o); person(ctx, x, y - 7, ks, C.accent); }
    } else { const [x, y] = P(-S.kid); person(ctx, x, y - 7, ks, C.accent); }
    const [ax, ay] = P(S.ad); person(ctx, ax, ay - 7, as, C.copper);
    ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'center';
    const [kx, ky] = P(-S.kid);
    ctx.fillStyle = C.accent; ctx.fillText(`${S.mk} kg`, kx, ky - 7 - ks * 1.12);
    ctx.fillStyle = C.copper; ctx.fillText('75 kg', ax, ay - 7 - as * 1.1);

    // Titel
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Brett ohne Gewicht' : 'vereinfacht: Gewicht des Bretts weggelassen', 12, 16);
    ctx.textAlign = 'center';
    ctx.fillText('Drehpunkt', px, gy + 16);
  };

  /* ---------- Teil 2: Brechstange unter dem Auto ---------- */
  const barCv = $('#barCv');
  const LOAD = 250, A = .2, HP = .35, SIN0 = .15, SIN1 = SIN0 - .05 / A;
  const B = { L: 2, push: 0, goal: null, msg: '' };
  const forceOf = () => LOAD * A / B.L;
  const updBar = () => {
    $('#lenIn').value = B.L; $('#pushIn').value = Math.round(B.push * 100);
    $('#lenOut').textContent = `${fmt(B.L, 1)} m`;
    $('#pushOut').textContent = `${Math.round(B.push * 100)} %`;
    const F = forceOf();
    $('#bF').textContent = `${fmt(F, F < 20 ? 1 : 0)} kg`;
    $('#bS').textContent = `${fmt(5 * B.L / A, 0)} cm`;
    $('#bW').textContent = '≈ 120 J';
    $('#liftBtn').textContent = B.goal === 1 || (B.goal === null && B.push > .5) ? 'Wieder absenken' : 'Auto anheben';
  };
  const barMsg = () => {
    const F = forceOf(), r = B.L / A;
    const how = F > 60 ? 'Viel zu schwer für eine Hand.' : F > 30 ? 'Mit beiden Armen und deinem Körpergewicht machbar.' : 'Das schaffst du mit einer Hand.';
    $('#barStatus').textContent = `Deine Seite ist ${fmt(r, r % 1 ? 1 : 0)}-mal so lang wie die unter dem Auto: ${fmt(r, r % 1 ? 1 : 0)}-mal weniger Kraft, ${fmt(r, r % 1 ? 1 : 0)}-mal mehr Weg. ${how}`;
  };
  $('#lenIn').addEventListener('input', e => { B.L = +e.target.value; updBar(); barMsg(); });
  $('#pushIn').addEventListener('input', e => { B.push = +e.target.value / 100; B.goal = null; updBar(); });
  $('#liftBtn').addEventListener('click', () => {
    B.goal = (B.goal === 1 || (B.goal === null && B.push > .5)) ? 0 : 1;
    if (reduced) { B.push = B.goal; B.goal = null; }
    updBar();
  });
  updBar();

  const drawBar = dt => {
    if (B.goal !== null) {
      const d = B.goal - B.push, st = dt * .6;
      if (Math.abs(d) <= st) { B.push = B.goal; B.goal = null; } else B.push += Math.sign(d) * st;
      updBar();
    }
    const { ctx, w, h } = fit(barCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const CAR = narrow ? .75 : 1.1;            // sichtbarer Teil des Autos links der Stange, in m
    const s = Math.min((w - 20) / (CAR + A + 3 + .35), (h - 60) / 1.5);
    const gy = h - 30, Y = m => gy - m * s;
    const px = 10 + (CAR + A) * s;
    const sin = lerp(SIN0, SIN1, B.push), cos = Math.sqrt(1 - sin * sin);
    const lx = px - A * cos * s, ly = Y(HP - A * sin);      // Ende unter dem Auto
    const hx = px + B.L * cos * s, hy = Y(HP + B.L * sin);  // Ende bei der Hand
    const lift = (HP - A * sin) - (HP - A * SIN0);           // in m
    const sill = HP - A * SIN0 + lift;

    // Boden
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();

    // Auto (Heck, von der Seite)
    const xr = lx + .18 * s, x0 = -20;
    const wx = xr - .62 * s, wr = .3 * s;
    ctx.fillStyle = C.fiber;
    roundRect(ctx, x0, Y(1.0 + lift), xr - x0, Y(sill) - Y(1.0 + lift), 10); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x0, Y(.95 + lift)); ctx.lineTo(xr - .3 * s, Y(.95 + lift)); ctx.lineTo(xr - .62 * s, Y(1.42 + lift)); ctx.lineTo(x0, Y(1.42 + lift));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.surface; ctx.globalAlpha = .55;
    ctx.beginPath();
    ctx.moveTo(x0, Y(1.0 + lift)); ctx.lineTo(xr - .4 * s, Y(1.0 + lift)); ctx.lineTo(xr - .66 * s, Y(1.36 + lift)); ctx.lineTo(x0, Y(1.36 + lift));
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // Radkasten und Rad: Das Rad hängt erst noch am Boden, dann hebt es ab (vereinfacht)
    const wy = Y(.3 + Math.max(0, lift - .03));
    ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(wx, Y(.3 + lift), wr * 1.18, 0, TAU); ctx.fill();
    ctx.fillStyle = '#23241f'; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9a9d94'; ctx.beginPath(); ctx.arc(wx, wy, wr * .45, 0, TAU); ctx.fill();
    ctx.fillStyle = C.fg; ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Ecke: rund 250 kg' : 'eine Ecke des Autos: rund 250 kg', 10, Y(1.42 + lift) - 10);

    // Klotz als Drehpunkt
    ctx.fillStyle = C.copper;
    ctx.beginPath(); ctx.moveTo(px, Y(HP)); ctx.lineTo(px - .16 * s, gy); ctx.lineTo(px + .16 * s, gy); ctx.closePath(); ctx.fill();

    // Wege: Schatten der Startlage
    const hx0 = px + B.L * Math.sqrt(1 - SIN0 * SIN0) * s, hy0 = Y(HP + B.L * SIN0);
    const hy1 = Y(HP + B.L * SIN1);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px - A * Math.sqrt(1 - SIN0 * SIN0) * s, Y(HP - A * SIN0)); ctx.lineTo(hx0, hy0); ctx.stroke();
    const tx = Math.min(w - 8, hx0 + 14);
    ctx.beginPath(); ctx.moveTo(tx, hy0); ctx.lineTo(tx, hy1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx - 4, hy0); ctx.lineTo(tx + 4, hy0); ctx.moveTo(tx - 4, hy1); ctx.lineTo(tx + 4, hy1); ctx.stroke();

    // Stange
    ctx.strokeStyle = C.fg; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, Y(HP), 3.5, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();

    // Kraft der Hand
    const F = forceOf(), al = clamp(14 + F * .55, 16, 70);
    arrow(ctx, hx, hy - al - 8, hx, hy - 6, C.glow, 3.5);
    ctx.fillStyle = C.fg; ctx.font = `600 ${narrow ? 12 : 13}px ${MONO}`;
    const ft = `${fmt(F, F < 20 ? 1 : 0)} kg`;
    if (hx - 8 - ctx.measureText(ft).width > xr + 6) { ctx.textAlign = 'right'; ctx.fillText(ft, hx - 8, hy - al / 2 - 2); }
    else { ctx.textAlign = 'left'; ctx.fillText(ft, hx + 10, hy - al - 2); }

    // Hub am Auto
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(`Auto: +${fmt(lift * 100, 1)} cm`, px + .2 * s, gy + 16);
    ctx.textAlign = 'center';
    ctx.fillText('20 cm', (lx + px) / 2, gy + 16);
    ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText(`Hand: ${fmt(5 * B.L / A, 0)} cm`, w - 8, gy + 16);
  };

  /* ---------- Teil 3: Flaschenzug ---------- */
  const pullCv = $('#pullCv');
  const MOTOR = 150;
  const Q = { n: 1, hq: 0, goal: null };
  const updPull = () => {
    $('#nIn').value = Q.n; $('#hIn').value = Math.round(Q.hq * 100);
    $('#nOut').textContent = String(Q.n);
    $('#hOut').textContent = `${Math.round(Q.hq * 100)} cm`;
    $('#pF').textContent = `${nice(MOTOR / Q.n)} kg`;
    $('#pS').textContent = `${fmt(Q.n * Q.hq, 1)} m`;
    $('#pM').textContent = `${Q.n} m Seil`;
    $('#pullBtn').textContent = Q.goal === 1 || (Q.goal === null && Q.hq > .5) ? 'Ablassen' : 'Hochziehen';
  };
  const pullMsg = () => {
    $('#pullStatus').textContent = Q.n === 1
      ? 'Eine einzige feste Rolle spart keine Kraft. Sie lenkt das Seil nur um, damit du nach unten ziehen kannst.'
      : `${Q.n} Seilstücke tragen den Motor, jedes ${nice(MOTOR / Q.n)} kg. Dafür ziehst du ${Q.n}-mal so viel Seil, wie der Motor steigt.`;
  };
  $('#nIn').addEventListener('input', e => { Q.n = +e.target.value; updPull(); pullMsg(); });
  $('#hIn').addEventListener('input', e => { Q.hq = +e.target.value / 100; Q.goal = null; updPull(); });
  $('#pullBtn').addEventListener('click', () => {
    Q.goal = (Q.goal === 1 || (Q.goal === null && Q.hq > .5)) ? 0 : 1;
    if (reduced) { Q.hq = Q.goal; Q.goal = null; }
    updPull();
  });
  updPull();

  const drawPull = dt => {
    if (Q.goal !== null) {
      const d = Q.goal - Q.hq, st = dt * .35;
      if (Math.abs(d) <= st) { Q.hq = Q.goal; Q.goal = null; } else Q.hq += Math.sign(d) * st;
      updPull();
    }
    const { ctx, w, h } = fit(pullCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const n = Q.n, dx = narrow ? 26 : 30, r = dx / 2;
    const x0 = narrow ? 54 : Math.max(70, w * .2);
    const xs = []; for (let i = 0; i <= n; i++) xs.push(x0 + i * dx);
    const beamY = 16, yT = 44, gy = h - 22;
    const yB0 = h * .62, hs = h * .3, yB = yB0 - Q.hq * hs;
    const yHand = h * .8, xh = xs[n] + 20;
    const top = i => (n - 1 - i) % 2 === 0;   // Verbindung i → i+1 läuft oben über eine Rolle
    const ROPE = C.glow;

    // Decke
    ctx.fillStyle = C.muted;
    ctx.fillRect(x0 - 26, beamY - 8, xs[n] - x0 + 52, 8);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let x = x0 - 22; x < xs[n] + 26; x += 8) { ctx.beginPath(); ctx.moveTo(x, beamY - 8); ctx.lineTo(x + 6, beamY - 14); ctx.stroke(); }

    // Untere Rollen und Ankerpunkte
    const botX = [];
    for (let i = 0; i < n; i++) if (!top(i)) botX.push((xs[i] + xs[i + 1]) / 2);
    const anchorTop = n > 1 && !top(0);
    if (!anchorTop) botX.push(x0);
    const bx0 = Math.min(...botX), bx1 = Math.max(...botX), xc = (bx0 + bx1) / 2;
    const loadW = Math.max(48, xs[n - 1] - x0 + 24), loadH = 46, loadY = yB + r + 12;

    // Geisterbild der Startlage
    const loadY0 = yB0 + r + 12;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    roundRect(ctx, xc - loadW / 2, loadY0, loadW, loadH, 8); ctx.stroke();
    ctx.setLineDash([]);

    // Seilstücke
    ctx.strokeStyle = ROPE; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(xs[i], i === 0 && anchorTop ? beamY : yT);
      ctx.lineTo(xs[i], yB); ctx.stroke();
    }
    // Rollen oben
    for (let i = 0; i < n; i++) if (top(i)) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, beamY); ctx.lineTo(cx, yT); ctx.stroke();
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(cx, yT, r - 1, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = ROPE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, yT, r, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(cx, yT, 2.5, 0, TAU); ctx.fill();
    }
    // Rollen unten mit Halterung
    ctx.strokeStyle = C.muted; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx0, yB); ctx.lineTo(bx1, yB); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xc, yB); ctx.lineTo(xc, loadY); ctx.stroke();
    for (let i = 0; i < n; i++) if (!top(i)) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(cx, yB, r - 1, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = ROPE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, yB, r, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(cx, yB, 2.5, 0, TAU); ctx.fill();
    }
    if (!anchorTop) { ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(x0, yB, 3.5, 0, TAU); ctx.fill(); }

    // Nummern der tragenden Stücke
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    const ny = (yT + yB) / 2;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(xs[i], ny, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = C.fg; ctx.fillText(String(i + 1), xs[i], ny + 3.5);
    }

    // Last: Motor
    roundRect(ctx, xc - loadW / 2, loadY, loadW, loadH, 8);
    ctx.fillStyle = C.fg; ctx.fill();
    ctx.fillStyle = C.surface; ctx.font = `500 11px ${MONO}`;
    ctx.fillText('Motor', xc, loadY + 19); ctx.fillText('150 kg', xc, loadY + 34);

    // Zugseil mit wandernden Markierungen
    const pulled = n * Q.hq * hs;
    ctx.strokeStyle = ROPE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xs[n], yT); ctx.lineTo(xh, yHand); ctx.lineTo(xh, gy - 4); ctx.stroke();
    ctx.setLineDash([3, 9]); ctx.lineDashOffset = -pulled; ctx.strokeStyle = C.fg; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xs[n], yT); ctx.lineTo(xh, yHand); ctx.lineTo(xh, gy - 4); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // Hand
    ctx.fillStyle = C.copper; roundRect(ctx, xh - 9, yHand - 12, 18, 24, 7); ctx.fill();
    const F = MOTOR / n;
    arrow(ctx, xh + 16, yHand - 10, xh + 16, yHand - 10 + clamp(12 + F * .4, 18, 70), C.copper, 3);
    ctx.fillStyle = C.fg; ctx.font = `600 12px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(`${nice(F)} kg`, xh + 24, yHand + 4);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText('du ziehst', xh + 24, yHand - 10);

    // Höhe der Last
    const hx = x0 - 32;
    if (Q.hq > .01) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx, loadY0); ctx.lineTo(hx, loadY);
      ctx.moveTo(hx - 4, loadY0); ctx.lineTo(hx + 4, loadY0); ctx.moveTo(hx - 4, loadY); ctx.lineTo(hx + 4, loadY); ctx.stroke();
    }
    ctx.save(); ctx.translate(hx - 7, (loadY0 + loadY) / 2 + (Q.hq > .01 ? 0 : 20)); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(`${fmt(Q.hq, 2)} m`, 0, 0); ctx.restore();

    // Seil-Messlatte rechts
    const mx = w - (narrow ? 22 : 34), my0 = 40, my1 = gy - 6;
    ctx.fillStyle = C.sunk; ctx.fillRect(mx - 6, my0, 12, my1 - my0);
    const fillH = (my1 - my0) * n * Q.hq / 6;
    ctx.fillStyle = ROPE; ctx.fillRect(mx - 6, my1 - fillH, 12, fillH);
    ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    for (let m = 0; m <= 6; m++) {
      const y = my1 - (my1 - my0) * m / 6;
      if (!narrow || m % 2 === 0) ctx.fillText(`${m} m`, mx - 10, y + 3);
    }
    ctx.fillText(narrow ? 'Seil' : 'Seil gezogen', w - 8, my0 - 10);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('hebel', 4, {
    seeLock: () => { ['#kidIn', '#adIn', '#kid2Btn', '#balBtn'].forEach(s => $(s).disabled = false); },
    barLock: () => { ['#lenIn', '#pushIn', '#liftBtn'].forEach(s => $(s).disabled = false); },
    pullLock: () => { ['#nIn', '#hIn', '#pullBtn'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawSee(dt); drawBar(dt); drawPull(dt); });
})();
