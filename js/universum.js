/* mindblow – Lektion Universum */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  const LY = 9.4607e15;          // Lichtjahr in m
  const LIGHT = 299792458;       // m/s
  const SUN_D = 1.3927e9;        // Sonnendurchmesser in m
  const YEAR = 31557600;         // s

  /* ---------- Zahlen schön schreiben ---------- */
  const nice = x => fmt(x, x < 1 ? 2 : x < 10 ? 1 : 0);
  const BIG = [[1e24, 'Quadrillion', 'Quadrillionen'], [1e21, 'Trilliarde', 'Trilliarden'], [1e18, 'Trillion', 'Trillionen'],
    [1e15, 'Billiarde', 'Billiarden'], [1e12, 'Billion', 'Billionen'], [1e9, 'Milliarde', 'Milliarden'], [1e6, 'Million', 'Millionen']];
  const word = n => {
    for (const [u, one, many] of BIG) if (n >= u * 0.9995) {
      const v = n / u, t = v < 10 ? fmt(v, 1).replace(/[.,]0$/, '') : fmt(v, 0);
      return `${t} ${t === '1' ? one : many}`;
    }
    return fmt(n, 0);
  };
  const short = n => n >= 1e9 ? `${nice(n / 1e9)} Mrd` : n >= 1e6 ? `${nice(n / 1e6)} Mio` : fmt(n, 0);
  const fmtLen = m => {
    if (m < 1e-4) return `${nice(m * 1e6)} µm`;
    if (m < 0.01) return `${nice(m * 1000)} mm`;
    if (m < 1) return `${nice(m * 100)} cm`;
    if (m < 1000) return `${nice(m)} m`;
    if (m >= 0.05 * LY) {
      const ly = m / LY;
      return ly < 1e6 ? `${nice(ly)} Lj` : ly < 1e9 ? `${nice(ly / 1e6)} Mio Lj` : `${nice(ly / 1e9)} Mrd Lj`;
    }
    const km = m / 1000;
    if (km < 1e6) return `${nice(km)} km`;
    if (km < 1e9) return `${nice(km / 1e6)} Mio km`;
    if (km < 1e12) return `${nice(km / 1e9)} Mrd km`;
    return `${nice(km / 1e12)} Billionen km`;
  };
  const fmtTime = s => {
    if (s < 1e-6) return `${nice(s * 1e9)} ns`;
    if (s < 1e-3) return `${nice(s * 1e6)} µs`;
    if (s < 1) return `${nice(s * 1e3)} ms`;
    if (s < 60) return `${nice(s)} s`;
    if (s < 3600) { const t = Math.round(s), mi = Math.floor(t / 60), se = t % 60; return se ? `${mi} min ${se} s` : `${mi} min`; }
    if (s < 172800) return `${nice(s / 3600)} h`;
    if (s < YEAR) return `${nice(s / 86400)} Tage`;
    const y = s / YEAR;
    if (y < 2) return `${nice(y)} Jahr`;
    if (y < 1e6) return `${nice(y)} Jahre`;
    if (y < 1e9) return `${nice(y / 1e6)} Mio Jahre`;
    return `${nice(y / 1e9)} Mrd Jahre`;
  };
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(c => SUP[+c]).join('');
  const ease = (cur, target, dt, speed = 8) => reduced ? target : cur + (target - cur) * Math.min(1, dt * speed);

  /* ---------- Teil 1: Massstabsmodell ---------- */
  const scaleCv = $('#scaleCv');
  const ROWS1 = [
    { n: 'Sonne', sub: 'Durchmesser', m: SUN_D, c: 'glow' },
    { n: 'Erde', sub: 'Durchmesser', m: 1.2742e7, c: 'fiber' },
    { n: 'Erde', sub: 'Abstand zur Sonne', m: 1.496e11, c: 'fiber' },
    { n: 'Neptun', sub: 'Abstand zur Sonne', m: 4.495e12, c: 'accent' },
    { n: 'Proxima Centauri', sub: 'nächster Stern', m: 4.24 * LY, c: 'copper' },
    { n: 'Mitte der Milchstrasse', sub: 'rund 26’000 Lj', m: 26000 * LY, c: 'fg' },
  ];
  // Vergleichsgrössen, Orte als Luftlinie
  const REFS = [
    [7e-5, 'Haaresbreite'], [1e-3, 'Sandkorn'], [0.01, 'Murmel'], [0.08, 'Orange'], [0.22, 'Fussball'], [0.75, 'grosser Schritt'],
    [10, 'Einfamilienhaus'], [36, 'Zürcher Tram'], [100, 'Fussballfeld'], [19.5e3, 'Zürich–Winterthur'], [74e3, 'Zürich–Basel'],
    [224e3, 'Genf–Zürich'], [348e3, 'Schweiz von West nach Ost'], [776e3, 'Zürich–London'], [6.33e6, 'Zürich–New York'],
    [4.0075e7, 'einmal um die Erde'], [3.844e8, 'echte Distanz Erde–Mond'], [1.496e11, 'echte Distanz Erde–Sonne'],
    [1.43e12, 'echte Distanz Sonne–Saturn'], [4.495e12, 'echte Distanz Sonne–Neptun'],
  ];
  const compare = m => {
    if (m < REFS[0][0] * 0.8) return 'dünner als ein Haar';
    let ref = REFS[0];
    for (const r of REFS) if (r[0] <= m * 1.25) ref = r;
    const ratio = m / ref[0];
    if (ratio > 1000) return '';
    return ratio < 1.3 ? `≈ ${ref[1]}` : `≈ ${nice(ratio)} × ${ref[1]}`;
  };
  const S1 = { d: 0.22, shown: ROWS1.map(r => Math.log10(r.m * 0.22 / SUN_D)) };
  const LO1 = -6, HI1 = 14;

  const setSun = d => {
    S1.d = d;
    const f = d / SUN_D;
    $('#sunIn').value = Math.log10(d).toFixed(2);
    $('#sunOut').textContent = fmtLen(d);
    $$('.legend button[data-d]').forEach(b => b.classList.toggle('active', Math.abs(Math.log10(+b.dataset.d / d)) < 0.015));
    $('#sMass').textContent = `1 : ${short(1 / f)}`;
    $('#sLy').textContent = fmtLen(LY * f);
    const v = LIGHT * f;
    $('#sC').textContent = v < 0.01 ? `${nice(v * 1000)} mm/s` : v < 1 ? `${nice(v * 100)} cm/s` : v < 100 ? `${nice(v)} m/s` : `${nice(v * 3.6)} km/h`;
  };
  $('#sunIn').addEventListener('input', e => setSun(10 ** +e.target.value));
  $$('.legend button[data-d]').forEach(b => b.addEventListener('click', () => setSun(+b.dataset.d)));
  setSun(0.22);

  const drawScale = dt => {
    const { ctx, w, h } = fit(scaleCv);
    ctx.clearRect(0, 0, w, h);
    const f = S1.d / SUN_D, pad = 16, top = 10, rh = (h - top - 26) / ROWS1.length;
    const tw = w - pad * 2;
    const X = lg => pad + Math.max(0, Math.min(1, (lg - LO1) / (HI1 - LO1))) * tw;
    ROWS1.forEach((r, i) => {
      const target = Math.log10(r.m * f);
      S1.shown[i] = ease(S1.shown[i], target, dt);
      const y = top + i * rh, m = r.m * f;
      ctx.textBaseline = 'alphabetic';
      ctx.font = '500 12.5px Geist, sans-serif'; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      ctx.fillText(r.n, pad, y + 14);
      const nw = ctx.measureText(r.n).width;
      ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted;
      if (w > 420) ctx.fillText(r.sub, pad + nw + 8, y + 14);
      ctx.textAlign = 'right'; ctx.fillStyle = C.fg; ctx.font = '500 12px Geist Mono, monospace';
      ctx.fillText(fmtLen(m), w - pad, y + 14);
      // Spur
      ctx.fillStyle = C.sunk; roundRect(ctx, pad, y + 21, tw, 6, 3); ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (let k = LO1 + 1; k < HI1; k += 3) { ctx.beginPath(); ctx.moveTo(X(k), y + 19); ctx.lineTo(X(k), y + 29); ctx.stroke(); }
      const xe = X(S1.shown[i]);
      ctx.fillStyle = C[r.c]; roundRect(ctx, pad, y + 21, Math.max(6, xe - pad), 6, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(xe, y + 24, 5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace';
      const cmp = compare(m);
      ctx.fillText(cmp, pad, y + 41);
    });
    ctx.fillStyle = C.muted; ctx.font = '10.5px Geist Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText('Balken logarithmisch: jeder Strich = × 1000', pad, h - 9);
  };

  /* ---------- Teil 2: Zoom durchs Universum ---------- */
  const zoomCv = $('#zoomCv');
  // size = Durchmesser in m (bei Bahnen: 2 × Radius)
  const OBJ = [
    { n: 'Beobachtbares Universum', lab: '≈ 93 Mrd Lj', size: 93e9 * LY, c: 'copper', kind: 'body', note: 'Das beobachtbare Universum misst rund 93 Mrd Lichtjahre. Es ist erst 13,8 Mrd Jahre alt. Dass wir trotzdem so weit sehen, liegt daran, dass sich der Raum seither ausgedehnt hat. Was dahinter liegt, kann von uns aus niemand sehen.' },
    { n: 'Andromeda', lab: 'Abstand 2,5 Mio Lj', size: 2 * 2.5e6 * LY, c: 'muted', kind: 'orbit', note: 'Die Andromeda-Galaxie ist rund 2,5 Mio Lichtjahre entfernt. Sie ist die nächste grosse Galaxie und in dunklen Nächten mit blossem Auge als Nebelfleck zu sehen.' },
    { n: 'Milchstrasse', lab: '≈ 100’000 Lj', size: 1e5 * LY, c: 'glow', kind: 'body', note: 'Unsere Galaxie, die Milchstrasse, misst rund 100’000 Lichtjahre und enthält 100 bis 400 Mrd Sterne. Die Sonne ist einer davon.' },
    { n: 'Proxima Centauri', lab: 'Abstand 4,24 Lj', size: 2 * 4.24 * LY, c: 'muted', kind: 'orbit', note: 'Proxima Centauri ist der nächste Stern nach der Sonne: 4,24 Lichtjahre, also rund 40 Billionen km.' },
    { n: 'Lichtjahr', lab: 'Radius 1 Lj', size: 2 * LY, c: 'muted', kind: 'orbit', note: 'Ein Lichtjahr ist die Strecke, die Licht in einem Jahr schafft: 9,46 Billionen km. Bis hierhin ist im Umkreis der Sonne kein anderer Stern.' },
    { n: 'Neptunbahn', lab: 'Radius 4,5 Mrd km', size: 2 * 4.495e12, c: 'muted', kind: 'orbit', note: 'Neptun, der äusserste Planet, kreist rund 4,5 Mrd km von der Sonne entfernt. Sein Licht braucht gut 4 Stunden bis zu uns.' },
    { n: 'Erdbahn', lab: 'Radius 150 Mio km', size: 2 * 1.496e11, c: 'muted', kind: 'orbit', note: 'Die Erde kreist im Mittel 150 Mio km um die Sonne. Licht braucht für diese Strecke rund 8 Minuten und 20 Sekunden.' },
    { n: 'Sonne', lab: '1,39 Mio km', size: SUN_D, c: 'glow', kind: 'body', fill: .55, note: 'Die Sonne misst 1,39 Mio km. Die ganze Mondbahn hätte in ihr Platz.' },
    { n: 'Mondbahn', lab: 'Radius 384’400 km', size: 2 * 3.844e8, c: 'muted', kind: 'orbit', note: 'Der Mond ist im Mittel 384’400 km entfernt. Licht schafft das in gut 1 Sekunde.' },
    { n: 'Erde', lab: '12’742 km', size: 1.2742e7, c: 'fiber', kind: 'body', fill: .45, note: 'Die Erde misst 12’742 km. Licht könnte sie in einer Sekunde über siebenmal umrunden.' },
    { n: 'Schweiz', lab: '≈ 350 km breit', size: 3.48e5, c: 'bad', kind: 'body', note: 'Die Schweiz misst von West nach Ost rund 350 km. Licht braucht dafür gut eine Tausendstelsekunde.' },
    { n: 'Matterhorn', lab: '4478 m hoch', size: 4478, c: 'accent', kind: 'body', note: 'Das Matterhorn ist 4478 m hoch. Licht braucht für diese Höhe 15 Millionstelsekunden.' },
    { n: 'Mensch', lab: '1,7 m', size: 1.7, c: 'copper', kind: 'body', note: 'Ein Mensch, rund 1,7 m gross. Licht durchquert diese Strecke in knapp 6 Milliardstelsekunden.' },
    { n: 'Ameise', lab: '≈ 5 mm', size: 0.005, c: 'fg', kind: 'body', note: 'Eine Ameise, rund 5 mm lang. Von hier aus geht die Reise los.' },
  ];
  // Hintergrundsterne mit festem Muster
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const STARS = Array.from({ length: 90 }, () => ({ x: rand(), y: rand(), r: rand() < .15 ? 2 : 1 }));
  const Z = { v: -1.5, playing: false, acc: 0, near: null };
  const ZMIN = -2.5, ZMAX = 27;

  const updZoom = () => {
    const S = 10 ** Z.v;
    $('#zoomIn').value = Z.v.toFixed(2);
    $('#zoomOut').textContent = fmtLen(S);
    $('#zView').textContent = fmtLen(S);
    $('#zLight').textContent = fmtTime(S / LIGHT);
    // grösstes Objekt, das noch ganz ins Bild passt (OBJ ist absteigend sortiert)
    const best = OBJ.find(o => o.size <= S * 1.05) || OBJ[OBJ.length - 1];
    if (best !== Z.near) { Z.near = best; $('#zObj').textContent = best.n; $('#zoomStatus').textContent = best.note; }
  };
  const setPlaying = p => { Z.playing = p; $('#zoomPlay').textContent = p ? 'Anhalten' : (Z.v >= ZMAX - 0.01 ? 'Nochmals reisen' : 'Reise starten'); };
  $('#zoomIn').addEventListener('input', e => { Z.v = +e.target.value; setPlaying(false); updZoom(); });
  $('#zoomPlay').addEventListener('click', () => {
    if (Z.playing) { setPlaying(false); return; }
    if (Z.v >= ZMAX - 0.01) Z.v = -1.5;
    setPlaying(true); updZoom();
  });
  $('#zoomReset').addEventListener('click', () => { setPlaying(false); Z.v = -1.5; updZoom(); });
  updZoom();

  const drawZoom = dt => {
    if (Z.playing) {
      if (reduced) { Z.acc += dt; if (Z.acc > 0.8) { Z.acc = 0; Z.v = Math.min(ZMAX, Math.floor(Z.v + 1)); updZoom(); } }
      else { Z.v = Math.min(ZMAX, Z.v + dt * 1.1); updZoom(); }
      if (Z.v >= ZMAX) setPlaying(false);
    }
    const { ctx, w, h } = fit(zoomCv);
    ctx.clearRect(0, 0, w, h);
    const ref = Math.min(w, h) - 40, S = 10 ** Z.v, k = ref / S;
    const cx = w / 2, cy = h / 2 + 4;
    const starA = Math.max(0, Math.min(1, (Z.v - 13) / 3));
    if (starA > 0) {
      ctx.fillStyle = C.muted; ctx.globalAlpha = starA * .55;
      for (const s of STARS) ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (const o of OBJ) {
      const r = o.size / 2 * k;
      if (r < 0.8 || r > Math.hypot(w, h)) continue;
      const col = C[o.c];
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 1.2), 0, Math.PI * 2);
      if (o.kind === 'orbit') {
        ctx.setLineDash([4, 5]); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = col; ctx.globalAlpha = o.fill || .16; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      }
      const ly = cy - r - 7;
      if (r * 2 >= 16 && ly > 24) {
        ctx.font = '500 12px Geist, sans-serif'; ctx.fillStyle = C.fg;
        ctx.fillText(o.n, cx, ly - 13);
        ctx.font = '10.5px Geist Mono, monospace'; ctx.fillStyle = C.muted;
        ctx.fillText(o.lab, cx, ly);
      }
    }
    // Massstabsbalken
    const bl = ref / 4;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14, h - 16); ctx.lineTo(14 + bl, h - 16);
    ctx.moveTo(14, h - 20); ctx.lineTo(14, h - 12); ctx.moveTo(14 + bl, h - 20); ctx.lineTo(14 + bl, h - 12); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = '11px Geist Mono, monospace';
    ctx.fillText(fmtLen(S / 4), 20 + bl, h - 12);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(`10${Z.v < 0 ? '⁻' : ''}${sup(Math.abs(Math.round(Z.v)))} m`, w - 14, 20);
  };

  /* ---------- Teil 3: Zählen mit Zehnerpotenzen ---------- */
  const countCv = $('#countCv');
  const ROWS3 = [
    { n: 'Menschen in der Schweiz', lo: 9e6, hi: 9e6, t: 'rund 9 Mio', c: 'fiber' },
    { n: 'Menschen auf der Erde', lo: 8.2e9, hi: 8.2e9, t: 'rund 8 Mrd', c: 'fiber' },
    { n: 'Sterne in der Milchstrasse', lo: 1e11, hi: 4e11, t: '100 bis 400 Mrd', c: 'glow' },
    { n: 'Galaxien im beobachtbaren Universum', lo: 2e11, hi: 2e12, t: 'Hunderte Mrd bis 2 Billionen, Schätzung', c: 'accent' },
    { n: 'Sekunden seit dem Urknall', lo: 4.35e17, hi: 4.35e17, t: 'rund 435 Billiarden', c: 'muted' },
    { n: 'Sandkörner an allen Stränden', lo: 1e18, hi: 1e19, t: '10¹⁸ bis 10¹⁹, Schätzung', c: 'copper' },
    { n: 'Sterne im beobachtbaren Universum', lo: 1e22, hi: 1e24, t: '10²² bis 10²⁴, Schätzung', c: 'glow' },
  ];
  const K = { e: 0, shown: 0 };
  const AGE = 13.8e9 * YEAR;
  const updCount = () => {
    const e = Math.round(K.e * 10) / 10, n = 10 ** e;
    $('#powIn').value = e;
    const fl = Math.floor(e + 1e-9), mant = 10 ** (e - fl);
    $('#powOut').textContent = mant < 1.05 ? `10${sup(fl)}` : `${fmt(mant, 1)}·10${sup(fl)}`;
    $('#cWord').textContent = word(n);
    $('#cDigits').textContent = fmt(Math.floor(e + 1e-9) + 1, 0);
    $('#cTime').textContent = fmtTime(n);
    const next = ROWS3.find(r => r.hi > n * 1.0001);
    let msg;
    if (!next) msg = 'Du hast sogar die höchste Schätzung für alle Sterne im beobachtbaren Universum erreicht.';
    else {
      const f = next.lo / n;
      msg = f <= 1 ? `Du bist mitten in der Schätzung für «${next.n}».` : `Nächstes Ziel: ${next.n}. Dafür fehlt noch ein Faktor ${f < 10 ? nice(f) : word(f)}.`;
    }
    if (n > AGE) msg += ' Zum Zählen bräuchtest du länger, als das Universum alt ist.';
    $('#countStatus').textContent = msg;
  };
  const setE = e => { K.e = Math.max(0, Math.min(24, e)); updCount(); };
  $('#powIn').addEventListener('input', e => setE(+e.target.value));
  $('#timesBtn').addEventListener('click', () => setE(Math.floor(K.e + 1e-9) + 1));
  $('#powReset').addEventListener('click', () => setE(0));
  updCount();

  const drawCount = dt => {
    K.shown = ease(K.shown, K.e, dt, 10);
    const { ctx, w, h } = fit(countCv);
    ctx.clearRect(0, 0, w, h);
    const pad = 16, top = 12, axis = 30, rh = (h - top - axis) / ROWS3.length, tw = w - pad * 2;
    const X = lg => pad + Math.max(0, Math.min(1, lg / 24)) * tw;
    const n = 10 ** K.shown;
    ROWS3.forEach((r, i) => {
      const y = top + i * rh, reached = n >= r.hi * 0.9999;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '500 12.5px Geist, sans-serif'; ctx.fillStyle = reached ? C.fg : C.muted;
      ctx.fillText(r.n, pad, y + 13);
      ctx.fillStyle = C.sunk; roundRect(ctx, pad, y + 19, tw, 6, 3); ctx.fill();
      const x0 = X(Math.log10(r.lo)), x1 = Math.max(X(Math.log10(r.hi)), x0 + 8);
      ctx.fillStyle = C[r.c]; ctx.globalAlpha = reached ? 1 : .55;
      roundRect(ctx, x0 - 4, y + 18, x1 - x0 + 8, 8, 4); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = '10.5px Geist Mono, monospace'; ctx.fillStyle = C.muted;
      ctx.fillText(r.t, pad, y + 38);
    });
    // Achse
    const ay = h - axis + 6;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, ay); ctx.lineTo(w - pad, ay); ctx.stroke();
    ctx.font = '10.5px Geist Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    const stepT = w < 420 ? 6 : 3;
    for (let k = 0; k <= 24; k += stepT) {
      ctx.beginPath(); ctx.moveTo(X(k), ay - 3); ctx.lineTo(X(k), ay + 3); ctx.stroke();
      ctx.fillText(`10${sup(k)}`, Math.min(w - pad - 8, Math.max(pad + 8, X(k))), ay + 16);
    }
    // Deine Zahl
    const xm = X(K.shown);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xm, top); ctx.lineTo(xm, ay); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(xm, ay, 4, 0, Math.PI * 2); ctx.fill();
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('universum', 4, {
    scaleLock: () => { $('#sunIn').disabled = false; $$('.legend button[data-d]').forEach(b => b.disabled = false); },
    zoomLock: () => { ['#zoomIn', '#zoomPlay', '#zoomReset'].forEach(s => $(s).disabled = false); },
    countLock: () => { ['#powIn', '#timesBtn', '#powReset'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { drawScale(dt); drawZoom(dt); drawCount(dt); });
})();
