/* mindblow – Lektion Flugzeug */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Physik (vereinfacht) ---------- */
  const RHO = 1.225, AREA = 16.2, MASS = 1100, WEIGHT = MASS * 9.81 / 1000; // kN
  const STALL = 15, SLOPE = 0.085;
  // Auftriebsbeiwert: gewölbter Flügel, Nullauftrieb bei -3° (im Rückenflug bei +3°)
  const cl = (a, inv = false) => {
    const a0 = inv ? 3 : -3, max = SLOPE * (STALL - a0);
    if (a <= STALL) return SLOPE * (a - a0);
    // Strömungsabriss: Auftrieb bricht ein
    const t = clamp(a - STALL, 0, 1);
    return max * (1 - .42 * t) - .02 * Math.max(0, a - STALL - 1);
  };
  const liftKN = (kmh, c) => { const v = kmh / 3.6; return .5 * RHO * v * v * AREA * c / 1000; };
  const downwash = c => 4.9 * c; // Grad, grob für ein Kleinflugzeug

  /* ---------- Flügelgeometrie ---------- */
  const wingGeo = (aDeg, inv) => {
    const a = aDeg * Math.PI / 180, m = .04, p = .4, t = .12, N = 46;
    const up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const x = (1 - Math.cos(Math.PI * i / N)) / 2;
      const yt = 5 * t * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1015 * x ** 4);
      const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x);
      up.push([x, yc + yt]); lo.push([x, yc - yt]);
    }
    const tf = ([x, y]) => {
      const yy = inv ? -y : y, xx = x - .5;
      return [xx * Math.cos(a) + yy * Math.sin(a), -xx * Math.sin(a) + yy * Math.cos(a)];
    };
    const poly = [...up.map(tf), ...lo.reverse().map(tf)];
    let xmin = Infinity, xmax = -Infinity, yLE = 0, yTE = 0;
    for (const [x, y] of poly) { if (x < xmin) { xmin = x; yLE = y; } if (x > xmax) { xmax = x; yTE = y; } }
    const S = 90, Yu = [], Yl = [];
    for (let k = 0; k <= S; k++) {
      const x = xmin + (xmax - xmin) * k / S;
      let hi = -Infinity, lo2 = Infinity;
      for (let j = 0; j < poly.length; j++) {
        const [x1, y1] = poly[j], [x2, y2] = poly[(j + 1) % poly.length];
        if ((x1 - x) * (x2 - x) <= 0 && x1 !== x2) {
          const y = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
          if (y > hi) hi = y; if (y < lo2) lo2 = y;
        }
      }
      if (hi === -Infinity) { hi = k ? Yu[k - 1] : yLE; lo2 = k ? Yl[k - 1] : yLE; }
      Yu.push(hi); Yl.push(lo2);
    }
    return { poly, xmin, xmax, yLE, yTE, Yu, Yl, S };
  };

  /* ---------- Strömungsbild (für Teil 1 und 3) ---------- */
  const makeFlow = (cv, getState) => {
    const parts = [];
    for (let i = 0; i < 170; i++) parts.push({ x: Math.random() * 5 - 2, v: Math.random() * 2 - 1, ph: Math.random() * TAU, n: i });
    let key = '', geo = null;

    const draw = (dt, now, unlocked) => {
      const st = getState();
      const k2 = st.a + '|' + st.inv;
      if (k2 !== key) { key = k2; geo = wingGeo(st.a, st.inv); }
      const c = cl(st.a, st.inv), stalled = st.a > STALL;
      const { ctx, w, h } = fit(cv);
      ctx.clearRect(0, 0, w, h);
      const small = w < 480;
      const s = Math.min(w / (small ? 3 : 3.4), h / 2.1);
      const cx = w / 2 - .3 * s, cy = h / 2 + 6;
      const X = x => cx + x * s, Y = y => cy - y * s;
      const xL = -cx / s - .15, xR = (w - cx) / s + .15, half = h / (2 * s) + .25;
      const slope = .26 * (stalled ? c * .5 : c);
      const t = reduced ? 0 : now / 1000;
      const amp = .16 + .015 * (st.a - STALL);

      const surf = (x, upper) => {
        const f = clamp((x - geo.xmin) / (geo.xmax - geo.xmin), 0, 1) * geo.S, i = Math.floor(f), r = f - i;
        const A = upper ? geo.Yu : geo.Yl;
        return i >= geo.S ? A[geo.S] : A[i] * (1 - r) + A[i + 1] * r;
      };
      const base = (x, upper) => {
        if (x < geo.xmin) return geo.yLE * Math.exp(2 * (x - geo.xmin));
        if (x > geo.xmax) return Math.max(-.85, geo.yTE - slope * (x - geo.xmax));
        return surf(x, upper);
      };
      const yAt = (x, y0, ph) => {
        const upper = y0 > 0, infl = Math.exp(-Math.abs(y0) / 1.1);
        let y = y0 + base(x, upper) * infl;
        if (stalled && upper && x > geo.xmin + .25) {
          const f = Math.min(1, (x - geo.xmin - .25) / .6) * Math.exp(-y0 / .5);
          y += amp * f * (.5 + .5 * Math.sin(t * 7 + ph + x * 5)) + amp * .6 * f * (.5 + .5 * Math.sin(t * 13 + ph * 2 - x * 3));
        }
        return y;
      };
      const speed = (x, y0) => {
        const infl = Math.exp(-Math.abs(y0) / .9), bell = Math.exp(-(((x + .1) / .55) ** 2));
        let u = 1 + (y0 > 0 ? .4 : -.16) * c * infl * bell;
        if (stalled && y0 > 0 && x > geo.xmin + .25) u *= 1 - .55 * Math.exp(-y0 / .5) * Math.min(1, (x - geo.xmin - .25) / .6);
        return clamp(u, .3, 2);
      };

      // Druckzonen
      if (Math.abs(c) > .05) {
        const a = clamp(Math.abs(c) / 1.6, 0, 1) * .22;
        const lowUp = c > 0;
        const gUp = ctx.createRadialGradient(X(0), Y(.25), 0, X(0), Y(.25), s * .7);
        gUp.addColorStop(0, lowUp ? C.fiber : C.copper); gUp.addColorStop(1, 'transparent');
        ctx.globalAlpha = a; ctx.fillStyle = gUp; ctx.fillRect(0, 0, w, h);
        const gLo = ctx.createRadialGradient(X(0), Y(-.25), 0, X(0), Y(-.25), s * .7);
        gLo.addColorStop(0, lowUp ? C.copper : C.fiber); gLo.addColorStop(1, 'transparent');
        ctx.fillStyle = gLo; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // Stromlinien
      const lines = [.05, .16, .3, .48, .7, .95, 1.25, 1.6, 2];
      ctx.lineWidth = 1; ctx.strokeStyle = C.line;
      for (const l of lines) for (const sg of [1, -1]) {
        const y0 = l * sg; if (Math.abs(y0) > half) continue;
        ctx.beginPath();
        for (let x = xL; x <= xR; x += .04) { const px = X(x), py = Y(yAt(x, y0, 1.3 * l)); x === xL ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
        ctx.globalAlpha = reduced ? 1 : .8; ctx.stroke(); ctx.globalAlpha = 1;
      }

      // Luftteilchen
      if (!reduced) {
        const U = .85, count = small ? 110 : 170;
        ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
        ctx.globalAlpha = unlocked ? .9 : .4;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const p = parts[i];
          const y0 = p.v * half;
          if (Math.abs(y0) < .035) p.v = .035 / half * (p.v < 0 ? -1 : 1);
          p.x += U * speed(p.x, y0) * dt;
          if (p.x > xR) { p.x = xL + Math.random() * .2; p.v = Math.random() * 2 - 1; }
          if (p.x < xL) p.x = xL;
          const x1 = p.x - .07 * speed(p.x, y0);
          ctx.moveTo(X(x1), Y(yAt(x1, y0, p.ph)));
          ctx.lineTo(X(p.x), Y(yAt(p.x, y0, p.ph)));
        }
        ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      }

      // Flügel
      ctx.beginPath();
      geo.poly.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)));
      ctx.closePath(); ctx.fillStyle = C.fg; ctx.fill();

      // Auftriebspfeil
      const len = clamp(c, -1.2, 1.8) * .5 * s;
      if (Math.abs(len) > 4) {
        const ax = X(.02), ay = Y(0);
        ctx.strokeStyle = c > 0 ? C.good : C.bad; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - len); ctx.stroke();
        const d = Math.sign(len);
        ctx.beginPath(); ctx.moveTo(ax, ay - len - 8 * d); ctx.lineTo(ax - 7, ay - len + 4 * d); ctx.lineTo(ax + 7, ay - len + 4 * d); ctx.closePath(); ctx.fill();
        ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'left';
        ctx.fillText('Auftrieb', ax + 10, ay - len + (d > 0 ? 4 : 0));
      }

      // Beschriftungen
      ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      ctx.fillText('Fahrtwind →', 10, 18);
      if (st.inv !== undefined) {
        ctx.textAlign = 'right'; ctx.fillStyle = C.fg;
        ctx.fillText(st.inv ? 'Rückenflug: Wölbung nach unten' : 'Normalflug', w - 10, 18);
      }
      if (Math.abs(c) > .15 && !small) {
        ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
        ctx.fillText(c > 0 ? 'tiefer Druck' : 'hoher Druck', X(-.5), Y(.55));
        ctx.fillText(c > 0 ? 'hoher Druck' : 'tiefer Druck', X(-.5), Y(-.6));
      }
      if (Math.abs(c) > .2 && unlocked) {
        const lx = Math.min(geo.xmax + 1, xR - .6), ly = base(lx, false) * Math.exp(-.05 / .9) - .05;
        ctx.textAlign = 'center'; ctx.fillStyle = C.fiber; ctx.font = '600 11px Geist Mono, monospace';
        ctx.fillText(c > 0 ? 'Luft nach unten ↘' : 'Luft nach oben ↗', X(lx), Y(ly) + (c > 0 ? 34 : -26));
      }
      if (stalled) {
        ctx.fillStyle = C.bad; ctx.font = '600 13px Geist Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText('Strömungsabriss', w / 2, h - 14);
      }
    };
    return { draw };
  };

  /* ---------- Teil 1: Anstellwinkel ---------- */
  const F1 = { a: 5, unlocked: false };
  const flow1 = makeFlow($('#flowCv'), () => ({ a: F1.a, inv: undefined }));
  const upd1 = () => {
    const c = cl(F1.a), stalled = F1.a > STALL;
    $('#aoaOut').textContent = `${fmt(F1.a, 1)}°`;
    $('#fLift').textContent = `${fmt(liftKN(150, c), 1)} kN`;
    const dw = downwash(stalled ? c * .5 : c);
    $('#fDown').textContent = dw >= 0 ? `≈ ${fmt(dw, 1)}°` : `≈ ${fmt(-dw, 1)}° nach oben`;
    $('#fState').textContent = stalled ? 'abgerissen' : 'liegt an';
    if (!F1.unlocked) return;
    $('#flowStatus').textContent = stalled
      ? 'Strömungsabriss: Die Luft löst sich oben vom Flügel und wirbelt. Der Auftrieb bricht ein.'
      : c <= 0 ? 'Kaum Auftrieb: Die Luft wird nicht mehr nach unten gelenkt.'
      : 'Mehr Winkel lenkt mehr Luft nach unten und gibt mehr Auftrieb, bis rund 15°. Vereinfachtes Modell.';
  };
  const setA1 = v => { F1.a = v; $('#aoaIn').value = v; upd1(); };
  $('#aoaIn').addEventListener('input', e => { F1.a = +e.target.value; upd1(); });
  $('#cruiseBtn').addEventListener('click', () => setA1(4));
  $('#stallBtn').addEventListener('click', () => setA1(18));
  upd1();

  /* ---------- Teil 2: Tempo und Auftrieb ---------- */
  const liftCv = $('#liftCv');
  const F2 = { v: 80, a: 5, unlocked: false };
  const upd2 = () => {
    const c = cl(F2.a), L = liftKN(F2.v, c), L2 = liftKN(F2.v * 2, c);
    $('#spdOut').textContent = `${F2.v} km/h`;
    $('#aoa2Out').textContent = `${fmt(F2.a, 1)}°`;
    $('#lLift').textContent = `${fmt(L, 1)} kN`;
    $('#lDouble').textContent = `${fmt(L2, 1)} kN`;
    $('#dblBtn').disabled = !F2.unlocked || F2.v === 0 || F2.v * 2 > 300;
    $('#halfBtn').disabled = !F2.unlocked || F2.v < 10;
    if (!F2.unlocked) return;
    const vMin = c > 0 ? Math.sqrt(2 * WEIGHT * 1000 / (RHO * AREA * c)) * 3.6 : Infinity;
    const need = isFinite(vMin) ? ` Bei ${fmt(F2.a, 1)}° hebt es ab rund ${fmt(Math.round(vMin / 5) * 5, 0)} km/h ab.` : '';
    $('#liftStatus').textContent = F2.v === 0 ? 'Es steht still. Ohne Fahrtwind kein Auftrieb.'
      : L >= WEIGHT ? `Es hebt ab: Der Auftrieb ist grösser als das Gewicht.${need}`
      : `Es rollt noch, es fehlen ${fmt(WEIGHT - L, 1)} kN.${need}`;
  };
  $('#spdIn').addEventListener('input', e => { F2.v = +e.target.value; upd2(); });
  $('#aoa2In').addEventListener('input', e => { F2.a = +e.target.value; upd2(); });
  const setV = v => { F2.v = clamp(Math.round(v / 5) * 5, 0, 300); $('#spdIn').value = F2.v; upd2(); };
  $('#dblBtn').addEventListener('click', () => setV(F2.v * 2));
  $('#halfBtn').addEventListener('click', () => setV(F2.v / 2));
  upd2();

  let shownV = F2.v, planeH = 0;
  const drawLift = (dt) => {
    shownV += (F2.v - shownV) * (reduced ? 1 : Math.min(1, dt * 7));
    const { ctx, w, h } = fit(liftCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 480;
    const P = { l: 46, r: 14, t: 18, b: 34 }, pw = w - P.l - P.r, ph = h - P.t - P.b, YMAX = 40;
    const X = v => P.l + v / 300 * pw, Y = L => P.t + (1 - Math.min(L, YMAX) / YMAX) * ph;
    const c = cl(F2.a);
    // Bereich "fliegt"
    ctx.fillStyle = C.good; ctx.globalAlpha = .07; ctx.fillRect(P.l, P.t, pw, Y(WEIGHT) - P.t); ctx.globalAlpha = 1;
    // Raster
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right';
    for (let L = 0; L <= YMAX; L += 10) { ctx.beginPath(); ctx.moveTo(P.l, Y(L)); ctx.lineTo(P.l + pw, Y(L)); ctx.stroke(); ctx.fillText(`${L}`, P.l - 6, Y(L) + 4); }
    ctx.textAlign = 'center';
    for (let v = 0; v <= 300; v += small ? 100 : 50) ctx.fillText(`${v}`, X(v), h - P.b + 16);
    ctx.fillText('Tempo in km/h', P.l + pw / 2, h - 4);
    ctx.save(); ctx.translate(12, P.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Auftrieb in kN', 0, 0); ctx.restore();
    // Gewicht
    ctx.setLineDash([6, 5]); ctx.strokeStyle = C.copper; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.l, Y(WEIGHT)); ctx.lineTo(P.l + pw, Y(WEIGHT)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.copper; ctx.textAlign = 'right'; ctx.fillText(`Gewicht ${fmt(WEIGHT, 1)} kN`, P.l + pw - 4, Y(WEIGHT) + 15);
    ctx.fillStyle = C.good; ctx.textAlign = 'left'; ctx.fillText('hebt ab', P.l + 6, Y(WEIGHT) - 8);
    // Kurve
    ctx.save(); ctx.beginPath(); ctx.rect(P.l, P.t - 2, pw, ph + 4); ctx.clip();
    ctx.beginPath();
    for (let v = 0; v <= 300; v += 3) { const px = X(v), py = Y(liftKN(v, c)); v ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 2.5; ctx.globalAlpha = F2.unlocked ? 1 : .4; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.restore();
    // Punkte
    const L = liftKN(shownV, c), px = X(shownV), py = Y(L);
    if (F2.unlocked && F2.v > 0 && F2.v * 2 <= 300) {
      const L2 = liftKN(shownV * 2, c), qx = X(shownV * 2), qy = Y(L2);
      ctx.setLineDash([3, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, py); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(qx, qy, 6, 0, TAU); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = qx > w - 80 ? 'right' : 'left';
      const lbl = L2 > YMAX ? '×4 (über 40)' : '×4';
      ctx.fillText(`2× Tempo → ${lbl}`, qx + (qx > w - 80 ? -10 : 10), Math.max(P.t + 12, qy - 8));
    }
    ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.fillStyle = L >= WEIGHT ? C.good : C.fiber; ctx.fill();
    // kleines Flugzeug oben links
    const fly = L >= WEIGHT && F2.v > 0;
    planeH += ((fly ? 1 : 0) - planeH) * (reduced ? 1 : Math.min(1, dt * 3));
    const bx = P.l + 18, by = P.t + 46 - planeH * 18;
    ctx.fillStyle = C.fg; ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.l + 6, P.t + 58); ctx.lineTo(P.l + 70, P.t + 58); ctx.strokeStyle = C.muted; ctx.stroke();
    ctx.save(); ctx.translate(bx + 20, by); ctx.rotate(-planeH * .15);
    roundRect(ctx, -20, -4, 40, 8, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, -3); ctx.lineTo(-24, -13); ctx.lineTo(-14, -3); ctx.fill();
    ctx.fillRect(-4, -2, 14, 3);
    ctx.restore();
  };

  /* ---------- Teil 3: Rückenflug ---------- */
  const F3 = { a: 0, inv: true, unlocked: false };
  const flow3 = makeFlow($('#invCv'), () => ({ a: F3.a, inv: F3.inv }));
  const upd3 = () => {
    const c = cl(F3.a, F3.inv), L = liftKN(220, c), stalled = F3.a > STALL;
    $('#aoa3Out').textContent = `${fmt(F3.a, 1)}°`;
    $('#iLift').textContent = `${fmt(L, 1)} kN`;
    let state;
    if (stalled) state = 'Strömungsabriss';
    else if (L <= 0) state = 'wird nach unten gedrückt';
    else if (L < WEIGHT * .92) state = 'sinkt';
    else if (L <= WEIGHT * 1.08) state = 'hält die Höhe';
    else state = 'steigt';
    $('#iState').textContent = state;
    $('#flipBtn').textContent = F3.inv ? 'Normal fliegen' : 'Auf den Rücken drehen';
    if (!F3.unlocked) return;
    $('#invStatus').textContent = stalled ? 'Zu steil: Auch kopfüber reisst die Strömung ab.'
      : F3.inv
        ? (L >= WEIGHT * .92 ? 'Geschafft: Kopfüber lenkt der Flügel genug Luft nach unten.' : 'Kopfüber arbeitet die Wölbung gegen dich. Heb die Nase mehr an.')
        : 'Im Normalflug reicht schon ein kleiner Winkel. Vergleiche mit dem Rückenflug.';
  };
  $('#aoa3In').addEventListener('input', e => { F3.a = +e.target.value; upd3(); });
  $('#flipBtn').addEventListener('click', () => { F3.inv = !F3.inv; upd3(); });
  upd3();
  $('#lWeight').textContent = `${fmt(WEIGHT, 1)} kN`;
  $('#iNeed').textContent = `${fmt(WEIGHT, 1)} kN`;

  /* ---------- Lektion verdrahten ---------- */
  lesson('flugzeug', 4, {
    flowLock: () => { F1.unlocked = true; ['#aoaIn', '#cruiseBtn', '#stallBtn'].forEach(s => $(s).disabled = false); upd1(); },
    liftLock: () => { F2.unlocked = true; ['#spdIn', '#aoa2In'].forEach(s => $(s).disabled = false); upd2(); },
    invLock: () => { F3.unlocked = true; ['#aoa3In', '#flipBtn'].forEach(s => $(s).disabled = false); upd3(); },
  });

  loop((dt, now) => {
    flow1.draw(dt, now, F1.unlocked);
    drawLift(dt);
    flow3.draw(dt, now, F3.unlocked);
  });
})();
