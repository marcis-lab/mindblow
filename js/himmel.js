/* mindblow – Lektion Himmel */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  /* ---------- Werkzeuge für Licht und Farbe ---------- */
  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
  const rgb = ([r, g, b], a = 1) => `rgba(${Math.round(clamp(r, 0, 1) * 255)},${Math.round(clamp(g, 0, 1) * 255)},${Math.round(clamp(b, 0, 1) * 255)},${a})`;
  const FONT = '11px Geist Mono, monospace';

  // Wellenlänge in nm → Anzeigefarbe (bekannte Näherung, nur zum Einfärben)
  const waveRGB = l => {
    l = clamp(l, 380, 720);
    let r = 0, g = 0, b = 0;
    if (l < 440) { r = (440 - l) / 60; b = 1; }
    else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = (510 - l) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = (645 - l) / 65; }
    else r = 1;
    let f = 1;
    if (l < 420) f = .35 + .65 * (l - 380) / 40; else if (l > 700) f = .35 + .65 * (720 - l) / 20;
    return [r * f, g * f, b * f];
  };
  const lamName = l => l < 440 ? 'violett' : l < 495 ? 'blau' : l < 565 ? 'grün' : l < 590 ? 'gelb' : l < 625 ? 'orange' : 'rot';

  // Farbempfinden des Auges: CIE-1931-Kurven (analytische Näherung von Wyman, Sloan & Shirley)
  const lobe = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-.5 * t * t); };
  const cmf = l => [
    1.056 * lobe(l, 599.8, 37.9, 31.0) + .362 * lobe(l, 442.0, 16.0, 26.7) - .065 * lobe(l, 501.1, 20.4, 26.2),
    .821 * lobe(l, 568.8, 46.9, 40.5) + .286 * lobe(l, 530.9, 16.3, 31.1),
    1.217 * lobe(l, 437.0, 11.8, 36.0) + .681 * lobe(l, 459.0, 26.0, 13.8),
  ];
  const gam = c => c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055;
  // Spektrum (λ → Lichtmenge) → sRGB-Farbe, hellster Kanal auf 1
  const specRGB = S => {
    let X = 0, Y = 0, Z = 0;
    for (let l = 380; l <= 720; l += 5) { const p = S(l), [x, y, z] = cmf(l); X += p * x; Y += p * y; Z += p * z; }
    let r = 3.2406 * X - 1.5372 * Y - .4986 * Z, g = -.9689 * X + 1.8758 * Y + .0415 * Z, b = .0557 * X - .2040 * Y + 1.0570 * Z;
    const mn = Math.min(r, g, b); if (mn < 0) { r -= mn; g -= mn; b -= mn; }
    const mx = Math.max(r, g, b) || 1;
    return [gam(r / mx), gam(g / mx), gam(b / mx)];
  };
  const colorName = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < .13) return 'weiss';
    let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh = (hh * 60 + 360) % 360;
    const n = hh < 15 || hh >= 330 ? 'rot' : hh < 35 ? 'orange' : hh < 65 ? 'gelb' : hh < 160 ? 'grün' : hh < 190 ? 'türkis' : hh < 248 ? 'blau' : hh < 275 ? 'blauviolett' : 'violett';
    return (d < .45 ? 'hell' : '') + n;
  };

  /* ---------- Teil 1: Licht wird an Luft gestreut ---------- */
  const scatCv = $('#scatCv');
  const NB = 15; // Farbklassen à 20 nm von 400 bis 700 nm
  const S1 = { lam: 450, mono: false, ph: [], flashes: [], spawn: 0, hist: new Array(NB).fill(0), dirty: true, w: 400, sh: 200 };
  const air = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() }));
  const SPEED = 170;

  const resetPhotons = () => { S1.ph = []; S1.flashes = []; S1.hist.fill(0); S1.dirty = true; };
  const stepPhotons = dt => {
    const { w, sh } = S1, sunX = 26, sunY = sh * .36, groundY = sh - 20;
    S1.spawn += dt * 34;
    while (S1.spawn >= 1) {
      S1.spawn--;
      S1.ph.push({ x: sunX + 14, y: sunY + (Math.random() - .5) * 22, vx: SPEED, vy: 0, l: S1.mono ? S1.lam : 400 + Math.random() * 300, s: false });
    }
    const base = SPEED / (.85 * w); // Blau (450 nm) wird im Mittel nach 85 % der Breite gestreut
    for (const p of S1.ph) {
      if (!p.s && p.x > sunX + 20 && Math.random() < base * Math.pow(450 / p.l, 4) * dt) {
        const a = Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * SPEED; p.vy = Math.sin(a) * SPEED; p.s = true;
        S1.flashes.push({ x: p.x, y: p.y, l: p.l, t: 0 });
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y >= groundY && p.vy > 0) { S1.hist[clamp(Math.floor((p.l - 400) / 20), 0, NB - 1)] += 1; p.dead = true; }
      if (p.x < -10 || p.x > w + 10 || p.y < -10) p.dead = true;
    }
    S1.ph = S1.ph.filter(p => !p.dead);
    for (const f of S1.flashes) f.t += dt;
    S1.flashes = S1.flashes.filter(f => f.t < .5);
    const k = Math.exp(-dt / 5);
    for (let i = 0; i < NB; i++) S1.hist[i] *= k;
  };

  const updScat = () => {
    $('#lamOut').textContent = S1.lam + ' nm';
    $('#sColor').textContent = lamName(S1.lam);
    $('#sNm').textContent = S1.lam + ' nm';
    $('#sRel').textContent = fmt(Math.pow(650 / S1.lam, 4), 1) + '×';
    $('#modeBtn').textContent = S1.mono ? 'Wieder weisses Licht senden' : 'Nur diese Farbe senden';
    $('#scatStatus').textContent = S1.mono
      ? `Nur ${lamName(S1.lam)} (${S1.lam} nm): ${S1.lam < 500 ? 'Viele Teilchen werden abgelenkt.' : S1.lam > 600 ? 'Fast alle fliegen geradeaus weiter.' : 'Ein Teil wird abgelenkt.'}`
      : 'Weisses Licht: alle Farben gemischt. Achte darauf, welche Farben zur Seite fliegen.';
  };
  $('#lamIn').addEventListener('input', e => { S1.lam = +e.target.value; if (S1.mono) resetPhotons(); updScat(); });
  $('#modeBtn').addEventListener('click', () => { S1.mono = !S1.mono; resetPhotons(); updScat(); });
  updScat();

  const drawScat = dt => {
    const { ctx, w, h } = fit(scatCv);
    const sh = Math.round(h * .6);
    if (S1.w !== w || S1.sh !== sh) { S1.w = w; S1.sh = sh; }
    if (reduced) {
      // ruhiges Standbild: Simulation einmal vorrechnen, dann nichts mehr bewegen
      if (S1.dirty) { for (let i = 0; i < 240; i++) stepPhotons(1 / 40); S1.dirty = false; }
    } else stepPhotons(dt);
    ctx.clearRect(0, 0, w, h);
    const sunX = 26, sunY = sh * .36, groundY = sh - 20;

    // Luftmoleküle
    ctx.fillStyle = C.muted; ctx.globalAlpha = .3;
    for (const m of air) { ctx.beginPath(); ctx.arc(10 + m.x * (w - 20), 8 + m.y * (groundY - 16), 1.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // Sonnenstrahl
    ctx.fillStyle = C.glow; ctx.globalAlpha = .1; ctx.fillRect(sunX, sunY - 13, w - sunX, 26); ctx.globalAlpha = 1;
    // Sonne
    ctx.beginPath(); ctx.arc(sunX, sunY, 14, 0, Math.PI * 2); ctx.fillStyle = C.glow; ctx.fill();
    ctx.font = FONT; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('Sonne', 8, sunY + 32);
    ctx.textAlign = 'right'; ctx.fillText('geradeaus →', w - 8, sunY - 18);
    // Boden mit Beobachter
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
    ctx.fillStyle = C.sunk; ctx.fillRect(0, groundY, w, sh - groundY);
    const ox = w * .5;
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(ox, groundY - 11, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox, groundY - 8); ctx.lineTo(ox, groundY); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('du', ox + 7, groundY - 6);

    // Streublitze und Lichtteilchen (Farben physikalisch, darum rgb)
    for (const f of S1.flashes) {
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + f.t * 16, 0, Math.PI * 2);
      ctx.strokeStyle = rgb(waveRGB(f.l), .7 * (1 - f.t / .5)); ctx.lineWidth = 1.2; ctx.stroke();
    }
    for (const p of S1.ph) {
      const c = waveRGB(p.l);
      ctx.strokeStyle = rgb(c, .55); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / SPEED * 9, p.y - p.vy / SPEED * 9); ctx.stroke();
      ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2); ctx.fill();
    }

    // Farbfeld: was am Boden ankommt
    const sum = S1.hist.reduce((a, b) => a + b, 0);
    const sw = 70, shh = 40, sx = w - sw - 10, sy = 10;
    roundRect(ctx, sx, sy, sw, shh, 10);
    if (sum > .8) ctx.fillStyle = rgb(specRGB(l => S1.hist[clamp(Math.floor((l - 400) / 20), 0, NB - 1)] * (l >= 400 && l <= 700 ? 1 : 0)));
    else ctx.fillStyle = C.sunk;
    ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText('Himmel von unten', w - 10, sy + shh + 15);

    // Balken: Streustärke pro Farbe ∝ 1/λ⁴
    const top = sh + 30, bot = h - 24, pl = 12, pr = 12;
    const bw = (w - pl - pr) / NB;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(w < 420 ? 'Streustärke ∝ 1/λ⁴' : 'Wie stark jede Farbe gestreut wird (∝ 1/λ⁴)', pl, sh + 18);
    const sel = clamp(Math.floor((S1.lam - 400) / 20), 0, NB - 1);
    for (let i = 0; i < NB; i++) {
      const lc = 410 + i * 20, v = Math.pow(410 / lc, 4);
      const bh = (bot - top) * v, x = pl + i * bw;
      ctx.fillStyle = rgb(waveRGB(lc));
      roundRect(ctx, x + 2, bot - bh, bw - 4, bh, Math.min(4, bw / 4)); ctx.fill();
      if (i === sel) { ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke(); }
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pl, bot + .5); ctx.lineTo(w - pr, bot + .5); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('400 nm', pl, h - 8);
    ctx.textAlign = 'right'; ctx.fillText('700 nm', w - pr, h - 8);
  };

  /* ---------- Teil 2: Sonnenuntergang ---------- */
  const sunCv = $('#sunCv');
  const S2 = { h: 40, play: false, acc: 0 };
  // Luftmasse nach Kasten & Young (1989): wie viel Luft das Licht im Vergleich zum Zenit durchquert
  const airmass = e => 1 / (Math.sin(Math.max(e, 0) * D2R) + .50572 * Math.pow(Math.max(e, 0) + 6.07995, -1.6364));
  // optische Dicke: Rayleigh-Streuung der Luft plus etwas Dunst (vereinfacht)
  const tau = l => .0088 * Math.pow(l / 1000, -4.05) + .08 * Math.pow(l / 550, -1.3);
  const trans = (l, m) => Math.exp(-tau(l) * m);
  const sunColor = m => {
    const r = trans(620, m), g = trans(540, m), b = trans(460, m), mx = Math.max(r, g, b);
    return [gam(r / mx), gam(g / mx), gam(b / mx)];
  };
  // Himmelsfarbe nach Blickhöhe e, vereinfachtes Modell
  const skyAt = (e, hs, sc) => {
    const day = smooth(-7, 10, hs);
    const zen = mix([.05, .07, .17], [.24, .5, .88], day);
    const haze = mix(sc, [.85, .89, .94], smooth(4, 30, hs));
    const horiz = haze.map(v => v * (.18 + .82 * smooth(-7, 2, hs)));
    return mix(horiz, zen, Math.pow(clamp(e / 90, 0, 1), .45));
  };
  const ridge = Array.from({ length: 24 }, (_, i) => .25 + .75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .63)));

  const updSun = () => {
    const hs = S2.h, m = airmass(hs);
    $('#hOut').textContent = fmt(hs, 1) + '°';
    $('#hIn').value = hs;
    $('#rAir').textContent = fmt(m, m < 10 ? 1 : 0) + '×';
    $('#rSun').textContent = hs < 0 ? 'untergegangen' : colorName(sunColor(m));
    $('#rBlue').textContent = hs < 0 ? '–' : (trans(460, m) < .001 ? '< 0,1' : fmt(trans(460, m) * 100, trans(460, m) < .1 ? 1 : 0)) + ' %';
    let s;
    if (hs > 66.2) s = 'So hoch steht die Sonne in Zürich nie. Das gibt es nur näher am Äquator.';
    else if (hs >= 65.5) s = 'Mittag am 21. Juni in Zürich: Die Sonne steht 66° hoch, höher geht es bei uns nicht.';
    else if (hs < 0) s = 'Die Sonne ist untergegangen. Hoch oben wird die Luft noch beleuchtet, darum leuchtet der Himmel nach.';
    else if (m > 10) s = `Das Licht ist jetzt ${fmt(m, 0)}-mal so lange in der Luft unterwegs. Vom Blau kommt fast nichts mehr an.`;
    else s = 'Zieh die Sonne nach unten und beobachte ihre Farbe.';
    $('#sunStatus').textContent = s;
  };
  $('#hIn').addEventListener('input', e => { S2.h = +e.target.value; S2.play = false; updSun(); });
  $('#noonBtn').addEventListener('click', () => { S2.play = false; S2.h = 66; updSun(); });
  $('#setBtn').addEventListener('click', () => { if (S2.h < 4) S2.h = 30; S2.play = true; S2.acc = 0; updSun(); });
  updSun();

  const drawSun = dt => {
    if (S2.play) {
      if (reduced) { S2.acc += dt; if (S2.acc > .45) { S2.acc = 0; S2.h = Math.max(-2, S2.h - 4); updSun(); } }
      else { S2.h = Math.max(-2, S2.h - dt * (S2.h > 8 ? 6 : 2.5)); updSun(); }
      if (S2.h <= -2) S2.play = false;
    }
    const narrow = sunCv.clientWidth < 560;
    const want = narrow ? '460px' : '340px';
    if (sunCv.style.height !== want) sunCv.style.height = want;
    const { ctx, w, h } = fit(sunCv);
    ctx.clearRect(0, 0, w, h);
    const hs = S2.h, m = airmass(hs), sc = sunColor(m);

    // --- Himmelsansicht ---
    const vx = 0, vy = 0, vw = narrow ? w : Math.round(w * .56), vh = narrow ? Math.round(h * .56) : h;
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    const yH = vy + vh * .8, Y = e => yH - (e / 90) * (yH - vy - 8);
    const grad = ctx.createLinearGradient(0, yH, 0, vy);
    for (let e = 0; e <= 90; e += 10) grad.addColorStop(e / 90, rgb(skyAt(e, hs, sc)));
    ctx.fillStyle = grad; ctx.fillRect(vx, vy, vw, yH - vy);
    const sx = vx + vw * .5, sy = Y(hs);
    // Leuchten rund um die Sonne
    const lightUp = smooth(-6, 0, hs);
    const gr = ctx.createRadialGradient(sx, sy, 4, sx, sy, vw * (hs < 15 ? .6 : .35));
    gr.addColorStop(0, rgb(sc, .75 * lightUp)); gr.addColorStop(1, rgb(sc, 0));
    ctx.fillStyle = gr; ctx.fillRect(vx, vy, vw, yH - vy);
    // Sonnenscheibe
    if (hs > -1.5) { ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fillStyle = rgb(sc); ctx.fill(); }
    // Berge und Boden (Silhouette, darum feste dunkle Farben)
    const dim = .35 + .65 * smooth(-6, 10, hs);
    ctx.fillStyle = rgb([.32 * dim, .37 * dim, .46 * dim]);
    ctx.beginPath(); ctx.moveTo(vx, yH);
    ridge.forEach((r, i) => ctx.lineTo(vx + i / (ridge.length - 1) * vw, yH - r * vh * .07 - 2));
    ctx.lineTo(vx + vw, yH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb([.12 * dim + .03, .14 * dim + .03, .17 * dim + .04]); ctx.fillRect(vx, yH, vw, vy + vh - yH);
    ctx.font = FONT; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText('Blick zur Sonne · vereinfacht', vx + 12, vy + 20);
    ctx.textAlign = 'right'; ctx.fillText(fmt(hs, 1) + '°', vx + vw - 12, vy + vh - 12);
    ctx.restore();

    // --- Skizze: Erde, Lufthülle, Lichtweg ---
    const dx = narrow ? 0 : vw, dy = narrow ? vh : 0, dw = narrow ? w : w - vw, dh = narrow ? h - vh : h;
    ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip();
    const R = dw * 1.1, H = Math.min(dh * .3, dw * .18);
    const ox = dx + dw * .22, oy = dy + dh * (narrow ? .78 : .64), cx = ox, cy = oy + R;
    ctx.beginPath(); ctx.arc(cx, cy, R + H, 0, Math.PI * 2); ctx.fillStyle = C.fiber; ctx.globalAlpha = .14; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = C.surface; ctx.fill();
    ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const e = Math.max(hs, 0) * D2R, ddx = Math.cos(e), ddy = -Math.sin(e);
    const s = -R * Math.sin(e) + Math.sqrt(R * R * Math.sin(e) ** 2 + (R + H) ** 2 - R * R);
    const ex = ox + ddx * s, ey = oy + ddy * s;
    ctx.setLineDash([4, 5]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + ddx * dw, ey + ddy * dw); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.glow; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = FONT; ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText('du', ox - 8, oy + 18);
    ctx.fillText('Luftweg', (ox + ex) / 2 + 6 * Math.sin(e) + 4, (oy + ey) / 2 + 14 * Math.cos(e) + 4);
    ctx.fillStyle = C.muted;
    ctx.fillText('Lufthülle (stark verdickt)', dx + 12, dy + 20);
    ctx.fillText('Erde', ox - 8, oy + 36);
    ctx.restore();
    if (narrow) { ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(0, vh + .5); ctx.lineTo(w, vh + .5); ctx.stroke(); }
  };

  /* ---------- Teil 3: Warum nicht violett ---------- */
  const eyeCv = $('#eyeCv');
  const T = { sun: true, scat: true, eye: true };
  // Sonnenlicht am Boden, grob nach Messkurven (vereinfacht), Maximum = 1
  const SUN = [[380, .46], [400, .62], [420, .72], [440, .86], [460, .97], [480, 1], [500, 1], [520, .97], [540, .99], [560, .97], [580, .96], [600, .95], [620, .92], [640, .89], [660, .87], [680, .84], [700, .82], [720, .78]];
  const sunAt = l => {
    for (let i = 1; i < SUN.length; i++) if (l <= SUN[i][0]) { const [a, va] = SUN[i - 1], [b, vb] = SUN[i]; return va + (vb - va) * (l - a) / (b - a); }
    return SUN[SUN.length - 1][1];
  };
  const scatAt = l => Math.pow(380 / l, 4);
  const eyeAt = l => 1.019 * Math.exp(-285.4 * Math.pow(l / 1000 - .559, 2)); // Helligkeitsempfinden V(λ), Näherung
  const skyLight = l => (T.sun ? sunAt(l) : 1) * (T.scat ? scatAt(l) : 1);

  const E = {};
  const updEye = () => {
    let peak = 380, pv = -1, mn = Infinity, tot = 0, vio = 0;
    for (let l = 380; l <= 720; l += 2) {
      const v = skyLight(l);
      if (v > pv + 1e-9) { pv = v; peak = l; }
      mn = Math.min(mn, v); tot += v; if (l < 450) vio += v;
    }
    const flat = pv / mn < 1.05;
    E.peak = peak; E.flat = flat;
    if (T.eye) E.col = specRGB(skyLight);
    else if (flat) E.col = [.6, .6, .6];
    else { const c = waveRGB(peak), mx = Math.max(...c); E.col = c.map(v => v / mx); }
    $('#ePeak').textContent = flat ? 'überall gleich' : peak + ' nm';
    $('#ePeakF').textContent = [T.sun && 'Sonnenlicht', T.scat && 'Streuung'].filter(Boolean).join(' × ') || 'alle Farben gleich hell';
    $('#eViolet').textContent = fmt(vio / tot * 100, 0) + ' %';
    $('#eColor').textContent = T.eye ? colorName(E.col) : (flat ? 'keine Farbe' : lamName(peak));
    let s;
    if (T.sun && T.scat && T.eye) s = 'Alle Faktoren an: So sehen wir den Himmel.';
    else if (!T.eye && T.scat) s = `Ohne Auge zählt nur, wo am meisten Licht ist: bei ${peak} nm, also ${lamName(peak)}.`;
    else if (!T.scat && T.eye) s = 'Ohne Streuung bleibt das Sonnenlicht ein Gemisch aller Farben: fast weiss.';
    else if (!T.sun && T.eye) s = 'Mit gleich viel Licht in allen Farben wird der Himmel etwas violetter.';
    else s = 'Schalte die Faktoren wieder ein, um den echten Himmel zu sehen.';
    $('#eyeStatus').textContent = s;
  };
  const toggle = (id, k) => $(id).addEventListener('click', () => {
    T[k] = !T[k]; $(id).classList.toggle('active', T[k]); $(id).setAttribute('aria-pressed', T[k]); updEye();
  });
  toggle('#tSun', 'sun'); toggle('#tScat', 'scat'); toggle('#tEye', 'eye');
  updEye();

  const drawEye = () => {
    const { ctx, w, h } = fit(eyeCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const pl = 14, pr = 14, pt = narrow ? 62 : 46, pb = 42;
    const pw = w - pl - pr, ph = h - pt - pb;
    const X = l => pl + (l - 380) / 340 * pw, Yv = v => pt + (1 - v) * ph;
    ctx.font = FONT;

    // Legende
    const items = [];
    if (T.sun) items.push([C.glow, 'Sonnenlicht', false]);
    if (T.scat) items.push([C.fiber, 'Streuung', false]);
    if (T.eye) items.push([C.muted, 'Auge', true]);
    items.push([C.fg, 'Himmelslicht', false]);
    let lx = pl, ly = 18;
    ctx.textAlign = 'left';
    for (const [c, t, dash] of items) {
      const tw = ctx.measureText(t).width + 34;
      if (lx + tw > w - (narrow ? pr : 100)) { lx = pl; ly += 17; }
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash(dash ? [4, 3] : []);
      ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx + 16, ly - 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.fillText(t, lx + 21, ly); lx += tw;
    }

    // Spektrumstreifen
    for (let l = 380; l < 720; l += 2) { ctx.fillStyle = rgb(waveRGB(l + 1)); ctx.fillRect(X(l), pt + ph + 6, X(l + 2) - X(l) + .6, 8); }
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    for (const l of [400, 500, 600, 700]) ctx.fillText(l + ' nm', X(l), h - 10);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pl, pt + ph + .5); ctx.lineTo(w - pr, pt + ph + .5); ctx.stroke();

    const curve = (f, c, lw, dash) => {
      let mx = 0; for (let l = 380; l <= 720; l += 2) mx = Math.max(mx, f(l));
      ctx.beginPath();
      for (let l = 380; l <= 720; l += 2) { const x = X(l), y = Yv(f(l) / mx * .92); l === 380 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(dash ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
    };
    if (T.sun) curve(sunAt, C.glow, 1.8);
    if (T.scat) curve(scatAt, C.fiber, 1.8);
    if (T.eye) curve(eyeAt, C.muted, 1.6, true);
    // Himmelslicht als Fläche
    let mx = 0; for (let l = 380; l <= 720; l += 2) mx = Math.max(mx, skyLight(l));
    ctx.beginPath(); ctx.moveTo(X(380), Yv(0));
    for (let l = 380; l <= 720; l += 2) ctx.lineTo(X(l), Yv(skyLight(l) / mx * .92));
    ctx.lineTo(X(720), Yv(0)); ctx.closePath();
    ctx.fillStyle = C.fg; ctx.globalAlpha = .07; ctx.fill(); ctx.globalAlpha = 1;
    curve(skyLight, C.fg, 2.6);
    if (!E.flat) {
      ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(X(E.peak), Yv(.92), 4, 0, Math.PI * 2); ctx.fill();
    }

    // Farbfeld
    const sw = narrow ? 64 : 84, shh = narrow ? 34 : 46, sx = w - pr - sw, sy = narrow ? pt + 4 : 10;
    roundRect(ctx, sx, sy, sw, shh, 10); ctx.fillStyle = rgb(E.col); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(T.eye ? 'So sehen wir es' : 'stärkste Farbe', w - pr, sy + shh + 14);
    ctx.textAlign = 'left';
    ctx.fillText('vereinfacht', pl, pt + 12);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('himmel', 4, {
    scatLock: () => { $('#lamIn').disabled = false; $('#modeBtn').disabled = false; },
    sunLock: () => { ['#hIn', '#setBtn', '#noonBtn'].forEach(s => $(s).disabled = false); },
    eyeLock: () => { $$('#tSun, #tScat, #tEye').forEach(b => b.disabled = false); },
  });

  loop(dt => { drawScat(dt); drawSun(dt); drawEye(); });
})();
