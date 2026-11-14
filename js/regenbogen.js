/* mindblow – Lektion Regenbogen */
(() => {
  const { $, $$, C, fit, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MONO = 'Geist Mono, monospace';

  // bewusst feste Farben: Spektralfarben, Regenhimmel, Wiese
  const BANDS = [
    { nm: 700, c: '#e8352b' }, { nm: 620, c: '#f28a1e' }, { nm: 580, c: '#f2cf2a' }, { nm: 530, c: '#3fb950' },
    { nm: 475, c: '#2f80e0' }, { nm: 445, c: '#4a4fd8' }, { nm: 410, c: '#8a3fd1' },
  ];
  const RED = BANDS[0].c, VIOLET = BANDS[6].c;
  const SKY_TOP = '#4f5d70', SKY_LOW = '#8794a5', GRASS_TOP = '#5b7347', GRASS_LOW = '#3c5030';

  // Brechzahl von Wasser je nach Wellenlänge (vereinfachte Näherung)
  const nOf = nm => 1.3242 + 3090 / (nm * nm);
  // Winkel zum Gegenpunkt der Sonne für Eintrittshöhe b (0 bis 1) und k Spiegelungen im Tropfen
  const angleOf = (n, b, k) => {
    const i = Math.asin(b), r = Math.asin(b / n);
    return (k === 1 ? 4 * r - 2 * i : Math.PI + 2 * i - 6 * r) / RAD;
  };
  // Bündelungswinkel: grösster Winkel bei einer Spiegelung, kleinster bei zwei
  const bowOf = (n, k) => {
    let best = k === 1 ? -1e9 : 1e9;
    for (let s = 1; s < 4000; s++) {
      const a = angleOf(n, s / 4000, k);
      best = k === 1 ? Math.max(best, a) : Math.min(best, a);
    }
    return best;
  };
  BANDS.forEach(B => { B.n = nOf(B.nm); B.p = bowOf(B.n, 1); B.s = bowOf(B.n, 2); });

  /* ---------- Gemeinsam: Blick auf den Himmel ---------- */
  // Vereinfachte flache Abbildung: Winkel am Himmel als Abstand in Pixeln.
  const drawFront = (ctx, x0, y0, w, ph, sunH, o) => {
    const hy = y0 + ph * o.horizon;
    const s = Math.min((w - 16) / (2 * o.maxR), (hy - y0 - 20) / (o.maxR - o.fitH));
    const cx = x0 + w / 2, cy = hy + sunH * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, ph); ctx.clip();
    let g = ctx.createLinearGradient(0, y0, 0, hy);
    g.addColorStop(0, SKY_TOP); g.addColorStop(1, SKY_LOW);
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, hy - y0);
    // heller Himmel innerhalb des Hauptbogens, dunkles Band dazwischen
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, hy - y0); ctx.clip();
    ctx.beginPath(); ctx.arc(cx, cy, BANDS[6].p * s, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fill();
    if (o.band) {
      ctx.beginPath(); ctx.arc(cx, cy, BANDS[6].s * s, 0, TAU); ctx.arc(cx, cy, BANDS[0].p * s, 0, TAU, true);
      ctx.fillStyle = 'rgba(15,20,30,.28)'; ctx.fill('evenodd');
    }
    const lw = Math.max(2.2, s * .5);
    ctx.lineWidth = lw;
    if (o.main) for (const B of BANDS) {
      ctx.strokeStyle = B.c; ctx.globalAlpha = .78;
      ctx.beginPath(); ctx.arc(cx, cy, B.p * s, 0, TAU); ctx.stroke();
    }
    if (o.sec) for (const B of BANDS) {
      ctx.strokeStyle = B.c; ctx.globalAlpha = .42;
      ctx.beginPath(); ctx.arc(cx, cy, B.s * s, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Wiese
    g = ctx.createLinearGradient(0, hy, 0, y0 + ph);
    g.addColorStop(0, GRASS_TOP); g.addColorStop(1, GRASS_LOW);
    ctx.fillStyle = g; ctx.fillRect(x0, hy, w, y0 + ph - hy);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, hy); ctx.lineTo(x0 + w, hy); ctx.stroke();
    // Gegenpunkt und Radius
    ctx.font = `10px ${MONO}`; ctx.fillStyle = 'rgba(255,255,255,.85)';
    if (o.radius && (o.main || o.sec)) {
      const a = -Math.PI / 2 + .62, R = (o.main ? 42 : 51) * s;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      ctx.setLineDash([]);
      const lx = cx + Math.cos(a) * R * .62 + 6, ly = cy + Math.sin(a) * R * .62;
      if (ly > y0 + 12 && ly < y0 + ph - 4) { ctx.textAlign = 'left'; ctx.fillText(o.main ? '42°' : '51°', lx, ly); }
    }
    if (cy < y0 + ph - 4) {
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'center';
      if (cy < y0 + ph - 14) ctx.fillText(o.narrow ? 'Gegenpunkt' : 'Gegenpunkt der Sonne', cx, cy + 14);
    }
    if (o.note) {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `500 ${o.narrow ? 11 : 12}px ${MONO}`;
      ctx.fillText(o.note, cx, y0 + (hy - y0) * .5);
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`;
    ctx.fillText(o.title, x0 + 10, y0 + 16);
    ctx.restore();
    return { s, hy };
  };

  const person = (ctx, x, gy, col, size = 1) => {
    const hgt = 22 * size;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, gy - hgt, 3.6 * size, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, gy - hgt + 4); ctx.lineTo(x, gy - 8 * size);
    ctx.moveTo(x, gy - 8 * size); ctx.lineTo(x - 4 * size, gy); ctx.moveTo(x, gy - 8 * size); ctx.lineTo(x + 4 * size, gy);
    ctx.moveTo(x - 5 * size, gy - hgt + 10 * size); ctx.lineTo(x + 5 * size, gy - hgt + 10 * size);
    ctx.stroke();
    return gy - hgt;   // Augenhöhe
  };

  let rainT = 0;
  const rain = (ctx, x0, x1, y0, y1) => {
    ctx.save();
    ctx.strokeStyle = C.fiber; ctx.globalAlpha = .45; ctx.lineWidth = 1;
    ctx.beginPath();
    const span = y1 - y0;
    for (let x = x0 + 4, k = 0; x < x1; x += 9, k++) {
      for (let j = 0; j < 4; j++) {
        const y = y0 + ((k * 37 + j * span / 4 + rainT * 160) % span);
        ctx.moveTo(x, y); ctx.lineTo(x - 1.5, y + 7);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- Teil 1: Sonne im Rücken ---------- */
  const skyCv = $('#skyCv');
  const S = { h: 20, walk: 0, walking: false, back: false };
  const BOW = 42;
  const updSky = () => {
    $('#sunIn').value = S.h; $('#sunOut').textContent = `${S.h}°`;
    $('#sAnti').textContent = S.h ? `${S.h}° tief` : 'am Horizont';
    const top = BOW - S.h;
    $('#sTop').textContent = top > 0 ? `${top}°` : 'kein Bogen';
    const frac = S.h >= BOW ? 0 : Math.acos(Math.tan(S.h * RAD) / Math.tan(BOW * RAD)) / Math.PI;
    $('#sFrac').textContent = `${fmt(frac * 100, 0)} %`;
  };
  const skyMsg = () => {
    const st = $('#skyStatus');
    st.classList.remove('warn');
    if (S.h >= BOW) { st.textContent = `Die Sonne steht ${S.h}° hoch. Der ganze Kreis liegt unter dem Horizont: kein Regenbogen.`; st.classList.add('warn'); }
    else if (S.h <= 3) st.textContent = 'Die Sonne geht gerade unter. Der Gegenpunkt liegt am Horizont: Du siehst einen ganzen Halbkreis.';
    else st.textContent = `Die Sonne steht ${S.h}° hoch, der Gegenpunkt liegt ${S.h}° unter dem Horizont. Der Bogen reicht noch ${BOW - S.h}° hoch.`;
  };
  $('#sunIn').addEventListener('input', e => { S.h = +e.target.value; updSky(); skyMsg(); });
  const sunPreset = (h, msg) => () => { S.h = h; updSky(); skyMsg(); if (msg) $('#skyStatus').textContent = msg; };
  $('#sEve').addEventListener('click', sunPreset(4, 'Abend: Die Sonne steht tief, der Bogen ist fast ein Halbkreis und steht hoch am Himmel.'));
  $('#sMorn').addEventListener('click', sunPreset(28));
  $('#sNoon').addEventListener('click', sunPreset(60, 'Mittag im Sommer: Die Sonne steht rund 60° hoch. Der Kreis liegt ganz unter dem Horizont. Vom Boden aus siehst du keinen Regenbogen.'));
  $('#walkBtn').addEventListener('click', () => {
    if (S.walk > 0 && !S.walking) { S.walk = 0; S.back = false; $('#walkBtn').textContent = 'Zum Regenbogen laufen'; $('#skyStatus').textContent = 'Zurück am Start.'; return; }
    S.walking = true; $('#walkBtn').disabled = true;
    $('#skyStatus').textContent = 'Du läufst los. Schau oben auf den Bogen.';
  });
  updSky();

  const drawSky = dt => {
    const { ctx, w, h } = fit(skyCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const ph = Math.round(h * .48);
    drawFront(ctx, 0, 0, w, ph, S.h, {
      horizon: .82, maxR: 44, fitH: 0, main: S.h < BOW, sec: false, band: false, radius: true, narrow,
      title: 'So siehst du ihn', note: S.h >= BOW ? (narrow ? 'Kein Bogen über dem Horizont' : 'Kein Bogen: Er liegt ganz unter dem Horizont') : '',
    });

    // Seitenansicht
    const y0 = ph, gy = h - 26;
    const rx0 = w * .62, rx1 = w;
    const startX = w * (narrow ? .17 : .2), endX = rx0 + (rx1 - rx0) * .2;
    if (S.walking) {
      S.walk += dt * (reduced ? 1e5 : (endX - startX) / 2.5);
      if (startX + S.walk >= endX) {
        S.walk = endX - startX; S.walking = false;
        $('#walkBtn').disabled = false; $('#walkBtn').textContent = 'Zurück an den Start';
        $('#skyStatus').textContent = 'Du stehst jetzt mitten im Regen. Der Bogen ist oben genau gleich hoch und gleich gross wie vorher: Andere Tropfen weiter vorne leuchten jetzt für dich.';
      }
    }
    const ox = startX + S.walk;
    ctx.fillStyle = C.sunk; ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    // Regenwolke und Regen
    ctx.fillStyle = C.sunk;
    ctx.beginPath(); ctx.ellipse((rx0 + rx1) / 2, y0 + 22, (rx1 - rx0) * .6, 16, 0, 0, TAU); ctx.fill();
    rain(ctx, rx0, rx1, y0 + 32, gy);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText('Regen', w - 8, gy + 15);
    ctx.textAlign = 'left'; ctx.fillText('Von der Seite', 10, y0 + 16);

    const eyeY = person(ctx, ox, gy, C.fg);
    const hr = S.h * RAD;

    // Linie Sonne, Kopf, Gegenpunkt
    ctx.strokeStyle = C.muted; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    const tg = (gy - eyeY) / Math.max(.02, Math.tan(hr));
    ctx.beginPath(); ctx.moveTo(ox, eyeY); ctx.lineTo(ox + Math.min(tg, w), eyeY + Math.min(tg, w) * Math.tan(hr)); ctx.stroke();
    ctx.setLineDash([]);

    const e = (BOW - S.h) * RAD;
    if (S.h < BOW) {
      // Blick zum Bogen
      let dx = Math.max(rx0 + 16, ox + 46) - ox;
      const maxDx = (eyeY - (y0 + 40)) / Math.tan(e);
      dx = Math.min(dx, maxDx);
      const dX = ox + dx, dY = eyeY - dx * Math.tan(e);
      // Sonne hinter dir, auf dem Strahl zum Tropfen (eigentlich unendlich weit weg)
      const Ls = Math.min((dX - 16) / Math.max(.05, Math.cos(hr)), (dY - (y0 + 30)) / Math.max(.05, Math.sin(hr)));
      const sx = dX - Math.cos(hr) * Ls, sy = dY - Math.sin(hr) * Ls;
      // Sonnenstrahlen, parallel
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1.2; ctx.globalAlpha = .35;
      for (const off of [-26, 26]) {
        ctx.beginPath(); ctx.moveTo(dX - Math.cos(hr) * 600, dY - Math.sin(hr) * 600 + off); ctx.lineTo(dX, dY + off); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(dX, dY); ctx.stroke();
      ctx.save(); ctx.shadowColor = C.glow; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(sx, sy, 8, 0, TAU); ctx.fillStyle = C.glow; ctx.fill(); ctx.restore();
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`;
      ctx.fillText('Sonne', clamp(sx + 12, 4, w - 50), sy + 4);
      ctx.strokeStyle = RED; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dX, dY); ctx.lineTo(ox, eyeY); ctx.stroke();
      ctx.globalAlpha = .3; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(dX, dY); ctx.lineTo(dX + 500 * Math.cos(e), dY - 500 * Math.sin(e)); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // Winkel am Tropfen
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dX, dY, 20, Math.PI - e, Math.PI + hr); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'right';
      const mid = Math.PI + (hr - e) / 2;
      ctx.fillText('42°', dX + Math.cos(mid) * 30, dY + Math.sin(mid) * 30 + 4);
      ctx.beginPath(); ctx.arc(dX, dY, 4.5, 0, TAU); ctx.fillStyle = '#7fb4e6'; ctx.fill();
      ctx.strokeStyle = C.fg; ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
      if (!narrow || dY > y0 + 50) ctx.fillText('Tropfen', Math.min(dX + 8, w - 52), dY - 8);
    } else {
      const Ls = Math.min((ox - 16) / Math.cos(hr), (eyeY - (y0 + 30)) / Math.sin(hr));
      const sx = ox - Math.cos(hr) * Ls, sy = eyeY - Math.sin(hr) * Ls;
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ox, eyeY); ctx.stroke();
      ctx.save(); ctx.shadowColor = C.glow; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(sx, sy, 8, 0, TAU); ctx.fillStyle = C.glow; ctx.fill(); ctx.restore();
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`;
      ctx.fillText('Sonne', sx + 12, sy + 4);
    }
  };

  /* ---------- Teil 2: Im Tropfen ---------- */
  const dropCv = $('#dropCv');
  const T = { b: .86, col: 'r', many: false, k: 1, t: 0 };
  const COLS = { r: [BANDS[0]], g: [BANDS[3]], v: [BANDS[6]], w: BANDS };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const refract = (d, N, eta) => {   // N zeigt gegen d
    const ci = -dot(N, d), k = 1 - eta * eta * (1 - ci * ci);
    if (k < 0) return null;
    const f = eta * ci - Math.sqrt(k);
    return [eta * d[0] + f * N[0], eta * d[1] + f * N[1]];
  };
  // Strahlengang durch einen kugelrunden Tropfen (Mitte cx, cy, Radius R)
  const trace = (cx, cy, R, b, n, k) => {
    const y = cy + (k === 1 ? -b : b) * R;
    const p1 = [cx - Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)), y];
    const pts = [[-20, y], p1];
    let o = [(p1[0] - cx) / R, (p1[1] - cy) / R];
    let t = refract([1, 0], o, 1 / n), p = p1;
    for (let j = 0; j <= k; j++) {
      const s = -2 * ((p[0] - cx) * t[0] + (p[1] - cy) * t[1]);
      const q = [p[0] + s * t[0], p[1] + s * t[1]];
      pts.push(q); p = q;
      o = [(q[0] - cx) / R, (q[1] - cy) / R];
      if (j < k) { const dd = 2 * dot(t, o); t = [t[0] - dd * o[0], t[1] - dd * o[1]]; }
    }
    const e = refract(t, [-o[0], -o[1]], n) || t;
    return { pts, e, ang: Math.acos(clamp(-e[0], -1, 1)) / RAD };
  };
  const updDrop = () => {
    $('#bIn').value = Math.round(T.b * 100);
    $('#bOut').textContent = `${Math.round(T.b * 100)} %`;
    $('#dB').textContent = `${Math.round(T.b * 100)} %`;
    const set = COLS[T.col];
    const f = B => fmt(angleOf(B.n, Math.max(.001, T.b), T.k), 1) + '°';
    const m = B => fmt(T.k === 1 ? B.p : B.s, 1) + '°';
    if (set.length === 1) {
      $('#dAng').textContent = f(set[0]); $('#dMax').textContent = m(set[0]);
      $('#dAng').style.fontSize = $('#dMax').style.fontSize = '';
    } else {
      $('#dAng').textContent = `${f(BANDS[0])} / ${f(BANDS[6])}`;
      $('#dMax').textContent = `${m(BANDS[0])} / ${m(BANDS[6])}`;
      $('#dAng').style.fontSize = $('#dMax').style.fontSize = '15px';
    }
    $('#dMaxF').textContent = T.col === 'w' ? (T.k === 1 ? 'grösster Winkel, Rot / Violett' : 'kleinster Winkel, Rot / Violett') : (T.k === 1 ? 'grösster Winkel' : 'kleinster Winkel');
  };
  const dropMsg = () => {
    const st = $('#dropStatus');
    const B = COLS[T.col][0], a = angleOf(B.n, Math.max(.001, T.b), T.k), lim = T.k === 1 ? B.p : B.s;
    if (T.k === 2) st.textContent = 'Zwei Spiegelungen: Das Licht kommt bei rund 51° gebündelt zurück, und Rot liegt jetzt innen. Das ist der Nebenregenbogen.';
    else if (T.many) st.textContent = 'Viele Strahlen: Nahe beim grössten Winkel liegen die austretenden Strahlen dicht beieinander. Dort leuchtet es hell.';
    else if (Math.abs(a - lim) < .6) st.textContent = 'Genau hier: Der Winkel ist fast am grössten. Kleine Änderungen der Eintrittshöhe ändern ihn kaum, darum bündeln sich hier viele Strahlen.';
    else if (T.b < .5) st.textContent = 'Nahe der Mitte kommt das Licht fast gerade zurück. Diese Strahlen verteilen sich breit und leuchten schwach.';
    else st.textContent = 'Verschiebe den Eintrittspunkt und beobachte den Winkel.';
  };
  $('#bIn').addEventListener('input', e => { T.b = +e.target.value / 100; updDrop(); dropMsg(); });
  $$('#colSel button').forEach(b => b.addEventListener('click', () => {
    T.col = b.dataset.c; $$('#colSel button').forEach(x => x.classList.toggle('active', x === b)); updDrop(); dropMsg();
    if (T.col === 'w') $('#dropStatus').textContent = 'Weisses Licht: Alle Farben laufen fast gleich, fächern aber beim Austritt leicht auf.';
  }));
  $('#manyBtn').addEventListener('click', () => {
    T.many = !T.many; $('#manyBtn').textContent = T.many ? 'Ein Strahl' : 'Viele Strahlen'; dropMsg();
  });
  $('#twoBtn').addEventListener('click', () => {
    T.k = T.k === 1 ? 2 : 1;
    $('#twoBtn').textContent = T.k === 1 ? 'Zweimal spiegeln' : 'Einmal spiegeln';
    T.b = T.k === 1 ? .86 : .95;
    updDrop(); dropMsg();
  });
  updDrop();

  const drawDrop = dt => {
    const { ctx, w, h } = fit(dropCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const cx = w * (narrow ? .6 : .58), cy = h * .46, R = Math.min(w * .3, h * .34);
    if (!reduced) T.t = (T.t + dt / 2.6) % 1;
    // Tropfen
    const g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
    g.addColorStop(0, 'rgba(160,205,245,.30)'); g.addColorStop(1, 'rgba(70,140,210,.16)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(narrow ? 'Tropfen (vergrössert)' : 'Regentropfen, stark vergrössert', cx, cy - R - 10);
    // Mittellinie
    ctx.strokeStyle = C.line; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - R - 20, cy); ctx.lineTo(cx + R + 10, cy); ctx.stroke(); ctx.setLineDash([]);

    const set = COLS[T.col];
    const far = (p, d, L = 2000) => [p[0] + d[0] * L, p[1] + d[1] * L];
    if (T.many) {
      const fan = T.col === 'w' ? [BANDS[0], BANDS[6]] : set;
      ctx.lineWidth = 1;
      for (const B of fan) {
        ctx.strokeStyle = B.c; ctx.globalAlpha = .28;
        ctx.beginPath();
        for (let b = .04; b < 1; b += .03) {
          const r = trace(cx, cy, R, b, B.n, T.k);
          const ex = r.pts[r.pts.length - 1], fe = far(ex, r.e);
          ctx.moveTo(ex[0], ex[1]); ctx.lineTo(fe[0], fe[1]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // ausgewählter Strahl
    const main = set.map(B => ({ B, r: trace(cx, cy, R, Math.max(.001, T.b), B.n, T.k) }));
    const ref = main[0].r;
    ctx.strokeStyle = T.col === 'w' ? C.fg : set[0].c; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, ref.pts[0][1]); ctx.lineTo(ref.pts[1][0], ref.pts[1][1]); ctx.stroke();
    for (const { B, r } of main) {
      ctx.strokeStyle = B.c; ctx.lineWidth = set.length > 1 ? 1.4 : 2.2;
      ctx.beginPath(); ctx.moveTo(r.pts[1][0], r.pts[1][1]);
      for (let i = 2; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
      const ex = r.pts[r.pts.length - 1], fe = far(ex, r.e);
      ctx.lineTo(fe[0], fe[1]); ctx.stroke();
    }
    // Lichtpunkt, der durch den Tropfen läuft
    if (!reduced) {
      for (const { B, r } of main) {
        const path = [[0, r.pts[0][1]], ...r.pts.slice(1)];
        const ex = r.pts[r.pts.length - 1]; path.push(far(ex, r.e, Math.max(w, h)));
        const lens = []; let tot = 0;
        for (let i = 1; i < path.length; i++) { const L = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); lens.push(L); tot += L; }
        let d = T.t * tot, i = 0;
        while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
        const k = lens[i] ? d / lens[i] : 0;
        const px = path[i][0] + (path[i + 1][0] - path[i][0]) * k, py = path[i][1] + (path[i + 1][1] - path[i][1]) * k;
        ctx.save(); ctx.shadowColor = B.c; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fillStyle = B.c; ctx.fill(); ctx.restore();
      }
    }
    // Spiegelungspunkte markieren
    ctx.fillStyle = C.fg;
    for (let i = 2; i < ref.pts.length - 1; i++) { ctx.beginPath(); ctx.arc(ref.pts[i][0], ref.pts[i][1], 3, 0, TAU); ctx.fill(); }
    // Winkel beim Austritt gegen die Richtung zur Sonne
    const ex = ref.pts[ref.pts.length - 1], ang = Math.atan2(ref.e[1], ref.e[0]);
    ctx.strokeStyle = C.muted; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex[0], ex[1]); ctx.lineTo(ex[0] - Math.min(80, ex[0] - 6), ex[1]); ctx.stroke(); ctx.setLineDash([]);
    const ar = Math.min(52, ex[0] - 10);
    if (ar > 16) {
      ctx.strokeStyle = C.fg;
      const a0 = Math.PI, a1 = ang < 0 ? ang + TAU : ang;
      ctx.beginPath(); ctx.arc(ex[0], ex[1], ar, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
      const am = (a0 + a1) / 2;
      ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(`${fmt(ref.ang, 1)}°`, ex[0] + Math.cos(am) * (ar + 16), ex[1] + Math.sin(am) * (ar + 16) + 4);
    }
    // Beschriftungen
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    const iy = ref.pts[0][1];
    ctx.fillText(narrow ? 'Sonnenlicht →' : 'Sonnenlicht von hinter dir →', 8, iy + (T.k === 1 ? -8 : 16));
    ctx.textAlign = 'left';
    ctx.fillText(T.k === 1 ? '↙ zu dir' : '↖ zu dir', 8, T.k === 1 ? h - 12 : 18);
    ctx.textAlign = 'right';
    ctx.fillText(T.k === 1 ? '1 Spiegelung' : '2 Spiegelungen', w - 10, 18);
  };

  /* ---------- Teil 3: Jeder sieht seinen eigenen ---------- */
  const twinCv = $('#twinCv');
  const W = { mode: 'main', d: 25 };
  const SUN3 = 10, RAIN = 200;
  const updTwin = () => {
    $('#friendIn').value = W.d; $('#friendOut').textContent = `${W.d} m`;
    const a = W.mode === 'sec' ? 51 : 42, e = (a - SUN3) * RAD;
    $('#tYou').textContent = `${fmt(RAIN * Math.tan(e), 0)} m`;
    $('#tFriend').textContent = `${fmt((RAIN + W.d) * Math.tan(e), 0)} m`;
    $('#tAng').textContent = W.mode === 'main' ? '42°' : W.mode === 'sec' ? '51°' : '42° / 51°';
  };
  const twinMsg = () => {
    $('#twinStatus').textContent = {
      main: 'Hauptbogen: rund 42° um den Gegenpunkt, Rot aussen, Violett innen. Eine Spiegelung im Tropfen.',
      sec: 'Nebenbogen: rund 51°, blasser und mit umgekehrten Farben: Rot innen. Zwei Spiegelungen im Tropfen.',
      both: 'Dazwischen ist der Himmel dunkler: Alexanders Band. Innerhalb des Hauptbogens ist er heller.',
    }[W.mode];
  };
  $$('#bowSel button').forEach(b => b.addEventListener('click', () => {
    W.mode = b.dataset.m; $$('#bowSel button').forEach(x => x.classList.toggle('active', x === b)); updTwin(); twinMsg();
  }));
  $('#friendIn').addEventListener('input', e => {
    W.d = +e.target.value; updTwin();
    const a = W.mode === 'sec' ? 51 : 42, dh = W.d * Math.tan((a - SUN3) * RAD);
    $('#twinStatus').textContent = W.d === 0
      ? 'Ihr steht am selben Ort. Trotzdem sieht jedes deiner Augen Licht aus etwas anderen Tropfen.'
      : `Sie steht ${W.d} m hinter dir. Ihr Blick trifft Tropfen, die rund ${fmt(dh, 0)} m höher liegen als deine.`;
  });
  updTwin();

  const drawTwin = () => {
    const { ctx, w, h } = fit(twinCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 420;
    const ph = Math.round(h * .5);
    drawFront(ctx, 0, 0, w, ph, SUN3, {
      horizon: .88, maxR: 55, fitH: SUN3, main: W.mode !== 'sec', sec: W.mode !== 'main', band: true, radius: false, narrow,
      title: `Sonne ${SUN3}° hoch, hinter dir`,
    });
    if (W.mode === 'both') {
      // Beschriftung des dunklen Bands
      const hy = ph * .88, s = Math.min((w - 16) / 110, (hy - 20) / 45);
      const r = (42.5 + 50.2) / 2 * s, cx = w / 2, cy = hy + SUN3 * s;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText(narrow ? 'dunkles Band' : 'Alexanders Band', cx, cy - r + 4);
    }

    // Seitenansicht: zwei Personen, parallele Blicklinien
    const y0 = ph, gy = h - 26;
    const angs = W.mode === 'main' ? [42] : W.mode === 'sec' ? [51] : [42, 51];
    const maxE = Math.max(...angs) - SUN3;
    const k = Math.min((w - 40) / (RAIN + 60 + 60), (gy - y0 - 46) / ((RAIN + 60) * Math.tan(maxE * RAD)));
    const X = m => w - 20 - (RAIN + 60 - m) * k;   // m: Meter, du stehst bei 0
    ctx.fillStyle = C.sunk; ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    rain(ctx, X(RAIN - 30), X(RAIN + 60), y0 + 26, gy);
    ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('Von der Seite (nicht massstäblich)', 10, y0 + 16);
    const you = X(0), fr = X(-W.d);
    const eyeF = person(ctx, fr, gy, C.copper, .8);
    const eyeY = person(ctx, you, gy, C.accent, .8);
    ctx.textAlign = 'center'; ctx.font = `10px ${MONO}`;
    ctx.fillStyle = C.accent; ctx.fillText('du', you, gy + 14);
    ctx.fillStyle = C.copper; ctx.fillText(narrow ? 'sie' : 'Freundin', fr - (Math.abs(you - fr) < 30 ? 22 : 0), gy + 14);
    const xr = X(RAIN);
    for (const a of angs) {
      const e = (a - SUN3) * RAD;
      for (const [x, ey, col] of [[fr, eyeF, C.copper], [you, eyeY, C.accent]]) {
        const yy = ey - (xr - x) * Math.tan(e);
        ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, ey); ctx.lineTo(xr, yy); ctx.stroke();
        ctx.beginPath(); ctx.arc(xr, yy, 4.5, 0, TAU); ctx.fillStyle = col; ctx.fill();
      }
      ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      const yy = eyeY - (xr - you) * Math.tan(e);
      ctx.fillText(`${a}°`, xr + 8, yy + 4);
    }
    // Sonnenlicht von hinten
    ctx.strokeStyle = C.glow; ctx.globalAlpha = .4; ctx.lineWidth = 1.2;
    const sr = SUN3 * RAD;
    for (let i = 0; i < 3; i++) {
      const yy = y0 + 34 + i * 16;
      ctx.beginPath(); ctx.moveTo(4, yy); ctx.lineTo(4 + 60 * Math.cos(sr), yy + 60 * Math.sin(sr)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.glow; ctx.textAlign = 'left'; ctx.fillText('Sonne', 6, y0 + 94);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('regenbogen', 4, {
    skyLock: () => { ['#sunIn', '#sEve', '#sMorn', '#sNoon', '#walkBtn'].forEach(s => $(s).disabled = false); },
    dropLock: () => { ['#bIn', '#manyBtn', '#twoBtn'].forEach(s => $(s).disabled = false); $$('#colSel button').forEach(b => b.disabled = false); },
    twinLock: () => { $('#friendIn').disabled = false; $$('#bowSel button').forEach(b => b.disabled = false); },
  });

  loop(dt => {
    if (!reduced) rainT += dt;
    drawSky(dt); drawDrop(dt); drawTwin();
  });
})();
