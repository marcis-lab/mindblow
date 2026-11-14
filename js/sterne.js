/* mindblow – Lektion Sterne */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';
  const SPACE = '#07080a', SPACE_TXT = '#c9cdc2'; // Weltraum ist in beiden Modi dunkel

  const arrowXY = (ctx, x1, y1, x2, y2, col, lw = 2.5) => {
    const len = Math.hypot(x2 - x1, y2 - y1); if (len < 3) return;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len, hd = Math.min(8, len * .6);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * hd * .8, y2 - uy * hd * .8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ux * hd - uy * 5, y2 - uy * hd + ux * 5); ctx.lineTo(x2 - ux * hd + uy * 5, y2 - uy * hd - ux * 5); ctx.closePath(); ctx.fill();
  };
  const bgStars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + .3, p: Math.random() * TAU }));
  const drawSpace = (ctx, x, y, w, h, now) => {
    ctx.save(); roundRect(ctx, x, y, w, h, 14); ctx.fillStyle = SPACE; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#ffffff';
    for (const s of bgStars) {
      ctx.globalAlpha = .25 + .3 * (reduced ? .5 : .5 + .5 * Math.sin(now / 900 + s.p));
      ctx.beginPath(); ctx.arc(x + s.x * w, y + s.y * h, s.r, 0, TAU); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };

  /* ---------- Teil 1: Schwerkraft gegen Druck ----------
     Stark vereinfacht: Schwerkraft ∝ 1/R², Druckkraft ∝ Heizung/R³. Gleichgewicht bei R = Heizung.
     Ohne Heizung bleibt nur ein kleiner Rest-Druck (wie beim Weissen Zwerg). */
  const balCv = $('#balCv');
  const DEG = .02;
  const B = { H: 1, x: 0, v: 0 };                    // x = ln(Radius)
  const q = () => (B.H + DEG) / (1 + DEG);
  const forces = () => { const R = Math.exp(B.x); return { R, Fg: 1 / (R * R), Fp: q() / (R * R * R) }; };
  let balMsg = '';
  const setBal = t => { if (t !== balMsg) { balMsg = t; $('#balStatus').textContent = t; } };
  const updBal = () => {
    const { R, Fg, Fp } = forces(), ratio = Fp / Fg;
    $('#heatOut').textContent = `${Math.round(B.H * 100)} %`;
    $('#bR').textContent = `${fmt(R, R < .1 ? 3 : 2)} ×`;
    $('#bRatio').textContent = fmt(ratio, 2);
    const st = Math.abs(ratio - 1) < .02 ? 'im Gleichgewicht' : ratio > 1 ? 'dehnt sich aus' : 'schrumpft';
    $('#bState').textContent = st;
    if (st !== 'im Gleichgewicht') return;
    if (B.H < .02) setBal('Ohne Fusion fehlt der Druck: Der Stern stürzt in sich zusammen. Von der Sonne bleibt so dereinst ein Weisser Zwerg, etwa so gross wie die Erde.');
    else if (B.H < .9) setBal('Weniger Heizung, weniger Druck: Die Schwerkraft gewinnt, bis der Stern so klein und dicht ist, dass der Druck wieder reicht.');
    else if (B.H > 1.1) setBal('Mehr Heizung, mehr Druck: Der Stern bläht sich auf, bis die Kräfte wieder gleich sind. Ähnlich werden alte Sterne zu Roten Riesen.');
    else setBal('Schwerkraft und Druck halten sich die Waage. So ist es bei der Sonne heute.');
  };
  $('#heatIn').addEventListener('input', e => { B.H = clamp(+e.target.value / 100, 0, 1.5); updBal(); });
  $('#squeezeBtn').addEventListener('click', () => {
    B.x -= .4; B.v = 0;
    setBal('Zusammengedrückt steigt der Druck schneller als die Schwerkraft. Der Stern federt zurück.');
    if (reduced) B.x = Math.log(q());
    updBal();
  });
  $('#heatReset').addEventListener('click', () => { B.H = 1; $('#heatIn').value = 100; updBal(); });

  const drawBal = (dt, now) => {
    // gedämpfte Feder in ln(R): zeigt das Zurückpendeln, die Kräfte selbst kommen aus den Formeln oben
    const xe = Math.log(q());
    if (reduced) { B.x = xe; B.v = 0; }
    else { B.v += (-28 * (B.x - xe) - 4.5 * B.v) * dt; B.x += B.v * dt; }
    updBal();
    const { ctx, w, h } = fit(balCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    drawSpace(ctx, 0, 0, w, h, now);
    const cx = w / 2, cy = h / 2 + 4, R1 = Math.min(w, h) * .2;
    const { R, Fg, Fp } = forces();
    const r = Math.max(3, R * R1);
    // Stern
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, '#fff7e0'); g.addColorStop(.35, '#ffd27a'); g.addColorStop(1, '#f08a2c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    // Kern mit Fusion
    if (B.H > .02 && r > 12) {
      const fl = reduced ? 1 : 1 + .08 * Math.sin(now / 120);
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = clamp(.25 + B.H * .4, 0, .85);
      ctx.beginPath(); ctx.arc(cx, cy, r * .22 * fl, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Pfeile: Länge nach Anteil der beiden Kräfte
    const tot = Fg + Fp, Lg = 56 * Fg / tot, Lp = 56 * Fp / tot;
    const rr = Math.max(r, 16), n = small ? 6 : 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + .2, ux = Math.cos(a), uy = Math.sin(a);
      const a2 = a + (small ? .2 : .14), vx = Math.cos(a2), vy = Math.sin(a2);
      arrowXY(ctx, cx + vx * (rr + Lg + 4), cy + vy * (rr + Lg + 4), cx + vx * (rr + 4), cy + vy * (rr + 4), '#7fd0ff');
      arrowXY(ctx, cx + ux * (rr - 2), cy + uy * (rr - 2), cx + ux * (rr + Lp), cy + uy * (rr + Lp), '#ff9a6a');
    }
    // Legende
    ctx.font = MONO; ctx.textAlign = 'left';
    ctx.fillStyle = '#7fd0ff'; ctx.fillText('→← Schwerkraft', 12, 20);
    ctx.fillStyle = '#ff9a6a'; ctx.fillText('←→ Druck', 12, 36);
    ctx.fillStyle = SPACE_TXT; ctx.textAlign = 'right';
    ctx.fillText(`Heizung ${Math.round(B.H * 100)} %`, w - 12, 20);
    // Grösse von heute als Ring
    ctx.strokeStyle = SPACE_TXT; ctx.globalAlpha = .35; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R1, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.fillStyle = SPACE_TXT; ctx.globalAlpha = .6;
    ctx.fillText('heutige Grösse', cx, cy + R1 + 14 > h - 6 ? h - 8 : cy + R1 + 14); ctx.globalAlpha = 1;
  };

  /* ---------- Teil 2: Fusion im Kern ----------
     Vereinfachte Proton-Proton-Kette: p + p → d, d + p → He-3, He-3 + He-3 → He-4 + 2 p.
     Die Chance pro Stoss steigt steil mit der Temperatur (Tunneleffekt), im Modell stark beschleunigt. */
  const fusCv = $('#fusCv');
  const KIND = { p: { n: [1, 0], r: 4.5, m: 1 }, d: { n: [1, 1], r: 6, m: 2 }, h3: { n: [2, 1], r: 7, m: 3 }, h4: { n: [2, 2], r: 8, m: 4 } };
  const PB = { pp: .05, dp: .7, h3h3: .45 };
  const F = { T: 15, parts: [], flashes: [], he: 0, w: 300, h: 300, cx: 150, cy: 150, R: 120 };
  const chance = T => Math.min(1, Math.exp(-18.9 * (Math.pow(T, -1 / 3) - Math.pow(15, -1 / 3))));
  const speed = k => 34 * Math.sqrt(F.T / 15) / Math.sqrt(KIND[k].m);
  const mk = (k, x, y) => { const a = Math.random() * TAU, s = speed(k) * (.6 + Math.random() * .8); return { k, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: Math.random() * TAU }; };
  const spawn = () => {
    F.parts = []; F.flashes = []; F.he = 0;
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * (F.R - 10);
      F.parts.push(mk('p', F.cx + Math.cos(a) * rr, F.cy + Math.sin(a) * rr));
    }
    updFus();
  };
  const updFus = () => {
    $('#tempOut').textContent = `${fmt(F.T, F.T % 1 ? 1 : 0)} Mio. K`;
    $('#fHe').textContent = String(F.he);
    $('#fDm').textContent = `${fmt(F.he * .0287, 3)} u`;
    $('#fE').textContent = `${fmt(F.he * 26.7, 1)} MeV`;
  };
  const fusMsg = () => {
    const t = F.T < 4 ? 'Zu kalt. Die Kerne stossen sich ab, weil alle positiv geladen sind. Fusion passiert praktisch nie.'
      : F.T < 10 ? 'Lauwarm für einen Stern. Ab und zu klappt eine Fusion, aber selten.'
        : F.T <= 17 ? 'Etwa so heiss wie der Sonnenkern. Die schnellen Kerne kommen sich nahe genug, um zu verschmelzen.'
          : 'Heisser als die Sonne, wie in schweren Sternen. Die Fusion läuft viel schneller.';
    $('#fusStatus').textContent = t;
  };
  $('#tempIn').addEventListener('input', e => {
    const old = F.T; F.T = clamp(+e.target.value, 1, 30);
    const f = Math.sqrt(F.T / old);
    F.parts.forEach(p => { p.vx *= f; p.vy *= f; });
    updFus(); fusMsg();
  });
  $('#mixBtn').addEventListener('click', () => { spawn(); $('#fusStatus').textContent = 'Frischer Wasserstoff im Kern.'; });

  const fuse = (a, b) => {
    const ks = [a.k, b.k].sort().join('+');
    const P = chance(F.T);
    let out = null, big = false;
    if (ks === 'p+p' && Math.random() < PB.pp * P) out = ['d'];
    else if (ks === 'd+p' && Math.random() < PB.dp * P) out = ['h3'];
    else if (ks === 'h3+h3' && Math.random() < PB.h3h3 * P) { out = ['h4', 'p', 'p']; big = true; }
    if (!out) return false;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    F.parts = F.parts.filter(p => p !== a && p !== b);
    out.forEach((k, i) => { const p = mk(k, x + (i ? (i === 1 ? 9 : -9) : 0), y); F.parts.push(p); });
    F.flashes.push({ x, y, t: 0, big });
    if (big) { F.he++; updFus(); }
    return true;
  };

  const simFus = dt => {
    const ps = F.parts;
    for (const p of ps) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * .8;
      const dx = p.x - F.cx, dy = p.y - F.cy, d = Math.hypot(dx, dy), lim = F.R - KIND[p.k].r;
      if (d > lim) {
        const nx = dx / d, ny = dy / d, vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
        p.x = F.cx + nx * lim; p.y = F.cy + ny * lim;
      }
    }
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = KIND[a.k].r + KIND[b.k].r;
      if (d >= rr || d === 0) continue;
      const nx = dx / d, ny = dy / d, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv >= 0) continue;
      if (fuse(a, b)) return; // Liste hat sich geändert, im nächsten Bild weiter
      // elastischer Stoss
      const ma = KIND[a.k].m, mb = KIND[b.k].m, jimp = -2 * rv / (1 / ma + 1 / mb);
      a.vx -= jimp * nx / ma; a.vy -= jimp * ny / ma; b.vx += jimp * nx / mb; b.vy += jimp * ny / mb;
    }
  };

  const drawNucleus = (ctx, p) => {
    const [np, nn] = KIND[p.k].n, tot = np + nn, rs = 3.6;
    // Protonen und Neutronen abwechselnd im Kreis
    const cols = [];
    for (let i = 0, a = np, b = nn; i < tot; i++) {
      if (a && (i % 2 === 0 || !b)) { cols.push(C.copper); a--; } else { cols.push(C.muted); b--; }
    }
    for (let i = 0; i < tot; i++) {
      const a = p.rot + i / tot * TAU, off = tot === 1 ? 0 : tot === 2 ? 2.6 : 3.4;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, rs, 0, TAU);
      ctx.fillStyle = cols[i]; ctx.fill();
    }
  };

  const drawFus = dt => {
    const { ctx, w, h } = fit(fusCv);
    const small = w < 520;
    const R = small ? Math.min(w / 2 - 14, 128) : Math.min(h / 2 - 18, 150);
    const cx = small ? w / 2 : R + 22, cy = small ? R + 14 : h / 2;
    if (F.w !== w || F.h !== h || !F.parts.length) {
      const sx = F.cx, sy = F.cy, sR = F.R;
      F.w = w; F.h = h; F.cx = cx; F.cy = cy; F.R = R;
      if (!F.parts.length && !F.init) { F.init = true; spawn(); }
      else F.parts.forEach(p => { p.x = cx + (p.x - sx) * R / sR; p.y = cy + (p.y - sy) * R / sR; });
    }
    if (F.on) simFus(reduced ? dt * .5 : dt);
    F.flashes.forEach(f => { f.t += dt; });
    F.flashes = F.flashes.filter(f => f.t < (f.big ? 1.2 : .6));
    ctx.clearRect(0, 0, w, h);
    // Kern
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.glow; ctx.globalAlpha = .25 + .5 * clamp(F.T / 30, 0, 1); ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
    for (const f of F.flashes) {
      const k = f.t / (f.big ? 1.2 : .6);
      ctx.beginPath(); ctx.arc(f.x, f.y, (f.big ? 34 : 16) * k + 4, 0, TAU);
      ctx.strokeStyle = C.glow; ctx.lineWidth = f.big ? 3 : 2; ctx.globalAlpha = 1 - k; ctx.stroke();
      if (f.big) { ctx.fillStyle = C.glow; ctx.font = '600 13px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('E = mc²', f.x, f.y - 22 - 10 * k); }
      ctx.globalAlpha = 1;
    }
    for (const p of F.parts) drawNucleus(ctx, p);
    // Legende und Massenbilanz
    ctx.font = MONO; ctx.textAlign = 'left';
    const lx = small ? 14 : cx + R + 26, ly = small ? cy + R + 26 : 34, lh = small ? 16 : 19;
    const items = [[C.copper, 'Proton (Wasserstoffkern)'], [C.muted, 'Neutron']];
    items.forEach(([c, t], i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx + 4, ly + i * lh - 4, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = C.muted; ctx.fillText(t, lx + 14, ly + i * lh);
    });
    const counts = { p: 0, d: 0, h3: 0, h4: 0 };
    F.parts.forEach(p => counts[p.k]++);
    const y2 = ly + 2 * lh + (small ? 4 : 14);
    if (small) {
      ctx.fillStyle = C.fg;
      ctx.fillText(`H ${counts.p} · ²H ${counts.d} · ³He ${counts.h3} · ⁴He ${counts.h4}`, lx, y2);
      ctx.fillStyle = C.muted;
      ctx.fillText('4 × H = 4,031 u → He = 4,003 u', lx, y2 + lh);
    } else {
      ctx.fillStyle = C.fg;
      ctx.fillText(`Wasserstoff  ${counts.p}`, lx, y2);
      ctx.fillText(`Deuterium    ${counts.d}`, lx, y2 + lh);
      ctx.fillText(`Helium-3     ${counts.h3}`, lx, y2 + 2 * lh);
      ctx.fillText(`Helium-4     ${counts.h4}`, lx, y2 + 3 * lh);
      const y3 = y2 + 4 * lh + 16;
      ctx.fillStyle = C.muted;
      ctx.fillText('4 × Wasserstoff  4,031 u', lx, y3);
      ctx.fillText('1 × Helium       4,003 u', lx, y3 + lh);
      ctx.fillStyle = C.glow;
      ctx.fillText('fehlt: 0,029 u = 0,7 %', lx, y3 + 2 * lh);
      ctx.fillText('→ wird zu Energie', lx, y3 + 3 * lh);
    }
  };

  /* ---------- Teil 3: Farbe, Grösse, Lebensdauer ----------
     Grobe Faustregeln für Hauptreihensterne (Masse in Sonnenmassen). */
  const colCv = $('#colCv');
  const lum = M => M < .43 ? .23 * Math.pow(M, 2.3) : M < 2 ? Math.pow(M, 4) : 1.4 * Math.pow(M, 3.5);
  const rad = M => M < 1 ? Math.pow(M, .8) : Math.pow(M, .57);
  const temp = M => 5772 * Math.pow(lum(M) / (rad(M) ** 2), .25);
  const life = M => M <= 10 ? 1e10 * Math.pow(M, -2.5) : 1e10 * Math.pow(10, -2.5) * Math.pow(M / 10, -1.4);
  const kRGB = T => {
    const t = T / 100; let r, g, b;
    if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
    else { r = 329.7 * Math.pow(t - 60, -.1332); g = 288.12 * Math.pow(t - 60, -.0755); b = 255; }
    return [r, g, b].map(v => Math.round(clamp(v, 0, 255)));
  };
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const S3 = { M: 1, Md: 1 };
  const mOf = v => .1 * Math.pow(300, v / 100);
  const vOf = M => 100 * Math.log(M / .1) / Math.log(300);
  const lifeTxt = y => y >= 1e9 ? `${fmt(y / 1e9, y >= 1e11 ? 0 : 1)} Mrd. J.` : `${fmt(y / 1e6, 0)} Mio. J.`;
  const updCol = () => {
    const M = S3.M, T = temp(M), L = lum(M), y = life(M);
    $('#massOut').textContent = `${fmt(M, M < 1 ? 2 : 1)} Sonnen`;
    $('#cT').textContent = `${fmt(Math.round(T / 100) * 100, 0)} K`;
    $('#cL').textContent = `${fmt(L, L < .01 ? 4 : L < 1 ? 2 : L < 100 ? 1 : 0)} ×`;
    $('#cLife').textContent = lifeTxt(y);
    const name = T < 3900 ? 'rot' : T < 5300 ? 'orange' : T < 6300 ? 'gelblich weiss' : T < 10000 ? 'weiss' : 'blauweiss';
    let t = `Farbe: ${name}. `;
    if (y > 1.38e10) t += 'Er lebt länger, als das Universum alt ist (13,8 Mrd. Jahre).';
    else if (M > 5) t += `Er ist ${fmt(L, 0)}-mal so hell wie die Sonne und verbraucht seinen Vorrat in einem kosmischen Augenblick.`;
    else if (Math.abs(M - 1) < .06) t = 'Die Sonne: mittelgross, mittelheiss, mittellang. Etwa die Hälfte ihres Lebens ist vorbei.';
    else t += M > 1 ? 'Schwerer als die Sonne: heisser, heller und kürzer lebend.' : 'Leichter als die Sonne: kühler, schwächer und sehr langlebig.';
    $('#colStatus').textContent = t;
  };
  $('#massIn').addEventListener('input', e => {
    S3.M = mOf(+e.target.value); $$('#starBtns button').forEach(x => x.classList.remove('active')); updCol();
  });
  $$('#starBtns button').forEach(b => b.addEventListener('click', () => {
    S3.M = +b.dataset.m; $('#massIn').value = vOf(S3.M);
    $$('#starBtns button').forEach(x => x.classList.toggle('active', x === b)); updCol();
  }));
  $('#massIn').value = vOf(1);
  updCol();

  const planck = (lam, T) => { const l = lam * 1e-9; return 1 / (l ** 5 * (Math.exp(1.4388e-2 / (l * T)) - 1)); };
  const SPEC = [[380, '#7a00d4'], [440, '#2a3cff'], [490, '#00b4ff'], [530, '#22d040'], [580, '#ffe000'], [620, '#ff7a00'], [700, '#e00000'], [750, '#900000']];

  const drawCol = (dt, now) => {
    S3.Md = reduced ? S3.M : S3.Md * Math.pow(S3.M / S3.Md, Math.min(1, dt * 6));
    const M = S3.Md, T = temp(M), L = lum(M), c = kRGB(T);
    const { ctx, w, h } = fit(colCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 520;
    // Weltraum mit Stern
    const pw = small ? w : w * .44, ph = small ? h * .5 : h;
    drawSpace(ctx, 0, 0, pw, ph, now);
    const sx = pw / 2, sy = ph / 2 + 4;
    const r = clamp(30 * Math.sqrt(rad(M)), 8, Math.min(pw, ph) * .3);
    const halo = r * (1.6 + .35 * clamp(Math.log10(L) + 3, 0, 9));
    ctx.save(); roundRect(ctx, 0, 0, pw, ph, 14); ctx.clip();
    const gh = ctx.createRadialGradient(sx, sy, r * .6, sx, sy, halo);
    gh.addColorStop(0, rgb(c, .55)); gh.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(sx, sy, halo, 0, TAU); ctx.fill();
    const gs = ctx.createRadialGradient(sx - r * .3, sy - r * .3, 0, sx, sy, r);
    gs.addColorStop(0, '#ffffff'); gs.addColorStop(.5, rgb(c)); gs.addColorStop(1, rgb(c.map(v => v * .85)));
    ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    // Sonne als Grössenvergleich
    const rS = 30;
    ctx.strokeStyle = SPACE_TXT; ctx.globalAlpha = .4; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, rS, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.font = MONO; ctx.fillStyle = SPACE_TXT; ctx.textAlign = 'left';
    ctx.fillText(`${fmt(Math.round(T / 100) * 100, 0)} K`, 12, 20);
    ctx.textAlign = 'right'; ctx.globalAlpha = .7;
    ctx.fillText('Kreis: Grösse der Sonne', pw - 12, ph - 12); ctx.globalAlpha = 1;

    // Spektrum
    const gx = small ? 38 : pw + 40, gy = small ? ph + 22 : 26, gw = w - gx - 12, gH = (small ? h - ph : h) - (small ? 22 : 26) - 34;
    const L0 = 100, L1 = 2000, X = l => gx + gw * (l - L0) / (L1 - L0);
    let pmax = 0; const pts = [];
    for (let l = L0; l <= L1; l += 10) { const v = planck(l, T); pts.push([l, v]); if (v > pmax) pmax = v; }
    const Y = v => gy + gH - gH * v / pmax;
    // sichtbarer Bereich
    const grd = ctx.createLinearGradient(X(380), 0, X(750), 0);
    SPEC.forEach(([l, col]) => grd.addColorStop((l - 380) / 370, col));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X(380), gy + gH);
    pts.filter(([l]) => l >= 380 && l <= 750).forEach(([l, v]) => ctx.lineTo(X(l), Y(v)));
    ctx.lineTo(X(750), gy + gH); ctx.closePath();
    ctx.fillStyle = grd; ctx.globalAlpha = .55; ctx.fill(); ctx.restore();
    ctx.fillStyle = grd; ctx.fillRect(X(380), gy + gH + 3, X(750) - X(380), 5);
    // Achsen
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gH); ctx.lineTo(gx + gw, gy + gH); ctx.stroke();
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const l of [500, 1000, 1500, 2000]) ctx.fillText(String(l), X(l), gy + gH + 20);
    ctx.textAlign = 'right'; ctx.fillText('Wellenlänge in nm', gx + gw, gy + gH + 33);
    ctx.save(); ctx.translate(gx - 10, gy + gH / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('Helligkeit', 0, 0); ctx.restore();
    // Kurve
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([l, v], i) => i ? ctx.lineTo(X(l), Y(v)) : ctx.moveTo(X(l), Y(v))); ctx.stroke();
    // Maximum (Wiensches Gesetz)
    const lp = 2.898e6 / T;
    if (lp >= L0 && lp <= L1) {
      ctx.strokeStyle = C.accent; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(X(lp), gy); ctx.lineTo(X(lp), gy + gH); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.accent; ctx.textAlign = X(lp) > gx + gw - 90 ? 'right' : 'left';
      ctx.fillText(`Maximum ${fmt(lp, 0)} nm`, X(lp) + (ctx.textAlign === 'left' ? 6 : -6), gy + 10);
    } else {
      ctx.fillStyle = C.accent; ctx.textAlign = 'left'; ctx.fillText(`Maximum ${fmt(lp, 0)} nm (UV)`, gx + 6, gy + 10);
    }
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText('sichtbar', (X(380) + X(750)) / 2, gy + gH - 6);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('sterne', 4, {
    balLock: () => { $('#heatIn').disabled = false; $('#squeezeBtn').disabled = false; $('#heatReset').disabled = false; },
    fusLock: () => { $('#tempIn').disabled = false; $('#mixBtn').disabled = false; F.on = true; },
    colLock: () => { $('#massIn').disabled = false; $$('#starBtns button').forEach(b => b.disabled = false); },
  });

  loop((dt, now) => { drawBal(dt, now); drawFus(dt); drawCol(dt, now); });
})();
