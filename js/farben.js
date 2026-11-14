/* mindblow – Lektion Farben */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  // Bildschirmwert (0–255) in lineare Lichtstärke (0–1)
  const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };

  // Ungefährer Farbname aus Rot, Grün, Blau
  const colorName = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 28) return 'Schwarz';
    const s = (mx - mn) / mx;
    if (s < .14) return mx > 225 ? 'Weiss' : 'Grau';
    let hue;
    if (mx === r) hue = ((g - b) / (mx - mn) + 6) % 6;
    else if (mx === g) hue = (b - r) / (mx - mn) + 2;
    else hue = (r - g) / (mx - mn) + 4;
    hue *= 60;
    if (hue >= 15 && hue < 45 && mx < 170) return 'Braun';
    if (s < .35 && mx > 200) return 'Pastell';
    if (hue < 15 || hue >= 340) return mx > 200 && s < .55 ? 'Rosa' : 'Rot';
    if (hue < 45) return 'Orange';
    if (hue < 70) return 'Gelb';
    if (hue < 160) return 'Grün';
    if (hue < 200) return 'Cyan';
    if (hue < 255) return 'Blau';
    if (hue < 290) return 'Violett';
    return 'Magenta';
  };

  /* ---------- Teil 1: Drei Lampen mischen ---------- */
  const mixCv = $('#mixCv');
  const mix = { r: 255, g: 255, b: 255 };
  // Vereinfachtes Zapfenmodell: lineares sRGB → XYZ → LMS (Hunt-Pointer-Estevez), Weiss = 100 %
  const cones = (r, g, b) => {
    const R = lin(r), G = lin(g), B = lin(b);
    return [
      .314 * R + .640 * G + .047 * B,
      .155 * R + .758 * G + .087 * B,
      .018 * R + .109 * G + .873 * B,
    ];
  };
  const updMix = () => {
    ['r', 'g', 'b'].forEach(k => { $(`#${k}In`).value = mix[k]; $(`#${k}Out`).textContent = mix[k]; });
    $('#mixHex').textContent = hex(mix.r, mix.g, mix.b);
    const [L, M, S] = cones(mix.r, mix.g, mix.b);
    $('#mixCones').textContent = `L ${fmt(L * 100, 0)} · M ${fmt(M * 100, 0)} · S ${fmt(S * 100, 0)}`;
    $('#mixName').textContent = colorName(mix.r, mix.g, mix.b);
  };
  ['r', 'g', 'b'].forEach(k => $(`#${k}In`).addEventListener('input', e => { mix[k] = +e.target.value; updMix(); }));
  $('#mixWhite').addEventListener('click', () => { mix.r = mix.g = mix.b = 255; updMix(); $('#mixStatus').textContent = 'Alle drei voll: Die Mitte ist weiss. Weiss ist keine eigene Farbe, sondern alles zusammen.'; });
  $('#mixRandom').addEventListener('click', () => {
    mix.r = Math.round(Math.random() * 255); mix.g = Math.round(Math.random() * 255); mix.b = Math.round(Math.random() * 255);
    updMix(); $('#mixStatus').textContent = 'Kannst du diese Farbe auch selbst wieder mischen?';
  });
  updMix();

  const drawMix = () => {
    const { ctx, w, h } = fit(mixCv);
    ctx.clearRect(0, 0, w, h);
    const pad = 12, top = 12, bh = h - 82;
    // dunkler Raum
    roundRect(ctx, pad, top, w - pad * 2, bh, 16); ctx.fillStyle = '#09090a'; ctx.fill();
    ctx.save(); roundRect(ctx, pad, top, w - pad * 2, bh, 16); ctx.clip();
    const cx = w / 2, cy = top + bh / 2 + bh * .04;
    const R = Math.min((w - pad * 2) * .23, bh * .3), d = R * .62;
    const spots = [
      [cx, cy - d, rgb(mix.r, 0, 0)],
      [cx - d * .87, cy + d * .5, rgb(0, mix.g, 0)],
      [cx + d * .87, cy + d * .5, rgb(0, 0, mix.b)],
    ];
    ctx.globalCompositeOperation = 'lighter';   // Licht wird addiert
    for (const [x, y, c] of spots) { ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // Ergebnis-Feld
    const sy = top + bh + 14, ss = 44;
    roundRect(ctx, pad, sy, ss, ss, 10); ctx.fillStyle = rgb(mix.r, mix.g, mix.b); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg; ctx.font = '13px Geist Mono, monospace';
    ctx.fillText(`Mitte: ${hex(mix.r, mix.g, mix.b)} · ${colorName(mix.r, mix.g, mix.b)}`, pad + ss + 12, sy + 18);
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace';
    ctx.fillText(w < 420 ? 'Licht addiert sich' : 'Rot + Grün + Blau: Licht addiert sich', pad + ss + 12, sy + 36);
  };

  /* ---------- Teil 2: In den Bildschirm zoomen ---------- */
  const pixCv = $('#pixCv');
  const IMG_W = 96, IMG_H = 60, SUN_X = 48, SUN_Y = 30, SUN_R = 18;
  const SUNS = { gelb: [255, 255, 0], orange: [255, 140, 0], weiss: [255, 255, 255], cyan: [0, 255, 255] };
  const SKY = [30, 70, 170];
  let sun = SUNS.gelb, zoomTarget = 1, zoom = 1;
  const pixelAt = (i, j) => { const dx = i + .5 - SUN_X, dy = j + .5 - SUN_Y; return dx * dx + dy * dy < SUN_R * SUN_R ? sun : SKY; };
  const updPix = () => {
    $('#pxR').textContent = `${fmt(sun[0] / 2.55, 0)} %`;
    $('#pxG').textContent = `${fmt(sun[1] / 2.55, 0)} %`;
    $('#pxB').textContent = `${fmt(sun[2] / 2.55, 0)} %`;
  };
  $('#zoomIn').addEventListener('input', e => {
    zoomTarget = Math.pow(60, +e.target.value / 100);
    if (reduced) zoom = zoomTarget;
    $('#zoomOut').textContent = '×' + fmt(zoomTarget, zoomTarget < 10 ? 1 : 0);
    if (+e.target.value > 85) {
      const lit = ['Rot', 'Grün', 'Blau'].filter((_, i) => sun[i] > 0);
      $('#pixStatus').textContent = `Ganz nah: Es leuchten nur ${lit.join(' und ')}. Eine eigene Lampe für diese Farbe gibt es nicht.`;
    }
  });
  $$('#pixColors button').forEach(b => b.addEventListener('click', () => {
    sun = SUNS[b.dataset.col];
    $$('#pixColors button').forEach(x => x.classList.toggle('active', x === b));
    updPix();
  }));
  updPix();

  const drawPix = dt => {
    if (!reduced) zoom = Math.exp(Math.log(zoom) + (Math.log(zoomTarget) - Math.log(zoom)) * Math.min(1, dt * 8));
    const { ctx, w, h } = fit(pixCv);
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, w, h);
    const p0 = Math.max(w / IMG_W, h / IMG_H), p = p0 * zoom;
    const ox = w / 2 - SUN_X * p, oy = h / 2 - SUN_Y * p;
    const i0 = clamp(Math.floor(-ox / p), 0, IMG_W), i1 = clamp(Math.ceil((w - ox) / p), 0, IMG_W);
    const j0 = clamp(Math.floor(-oy / p), 0, IMG_H), j1 = clamp(Math.ceil((h - oy) / p), 0, IMG_H);
    const s = clamp((p - 6) / 16, 0, 1);       // ab welcher Grösse die Subpixel sichtbar werden
    const gap = p * .07, sw = (p - gap * 4) / 3;
    for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
      const [r, g, b] = pixelAt(i, j), x = ox + i * p, y = oy + j * p;
      if (s < 1) { ctx.globalAlpha = 1 - s; ctx.fillStyle = rgb(r, g, b); ctx.fillRect(x, y, p + .5, p + .5); }
      if (s > 0) {
        ctx.globalAlpha = s;
        const sub = [rgb(Math.max(r, 26), 0, 0), rgb(0, Math.max(g, 26), 0), rgb(0, 0, Math.max(b, 30))];
        for (let k = 0; k < 3; k++) {
          if (p > 40) { roundRect(ctx, x + gap + k * (sw + gap), y + gap, sw, p - gap * 2, Math.min(6, sw * .2)); ctx.fillStyle = sub[k]; ctx.fill(); }
          else { ctx.fillStyle = sub[k]; ctx.fillRect(x + gap + k * (sw + gap), y + gap, sw, p - gap * 2); }
        }
      }
    }
    ctx.globalAlpha = 1;
    // Beschriftung
    const label = `Zoom ×${fmt(zoom, zoom < 10 ? 1 : 0)} · Subpixel vereinfacht als Streifen`;
    ctx.font = '11px Geist Mono, monospace';
    const tw = Math.min(ctx.measureText(label).width, w - 40);
    roundRect(ctx, 12, 12, tw + 20, 26, 13); ctx.fillStyle = C.surface; ctx.fill();
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(label, 22, 29, w - 40);
  };

  /* ---------- Teil 3: Nachbild ---------- */
  const afterCv = $('#afterCv');
  const AF = { phase: 'idle', t0: 0, dur: 20, after: 15 };
  const phaseName = { idle: 'Bereit', stare: 'Starren', after: 'Auf Weiss schauen' };
  const setPhase = (ph, now) => {
    AF.phase = ph; AF.t0 = now;
    $('#afPhase').textContent = phaseName[ph];
    $('#afterStart').disabled = ph !== 'idle';
    $('#afterStop').disabled = ph === 'idle';
    $('#durIn').disabled = ph !== 'idle';
    if (ph === 'idle') $('#afTime').textContent = '–';
    if (ph === 'stare') $('#afterStatus').textContent = 'Schau nur auf den grauen Punkt. Nicht blinzeln, wenn es geht.';
    if (ph === 'after') $('#afterStatus').textContent = 'Jetzt: Blick auf dem Punkt lassen. Siehst du eine rötliche Fahne mit hellem Kreuz?';
  };
  $('#durIn').addEventListener('input', e => { AF.dur = +e.target.value; $('#durOut').textContent = `${AF.dur} s`; });
  $('#afterStart').addEventListener('click', () => setPhase('stare', performance.now()));
  $('#afterStop').addEventListener('click', () => { setPhase('idle', performance.now()); $('#afterStatus').textContent = 'Abgebrochen. Starte neu, wenn du bereit bist.'; });

  const drawAfter = now => {
    const el = (now - AF.t0) / 1000;
    if (AF.phase === 'stare') {
      $('#afTime').textContent = fmt(Math.max(0, Math.ceil(AF.dur - el)), 0);
      if (el >= AF.dur) setPhase('after', now);
    } else if (AF.phase === 'after') {
      $('#afTime').textContent = fmt(Math.max(0, Math.ceil(AF.after - el)), 0);
      if (el >= AF.after) { setPhase('idle', now); $('#afterStatus').textContent = 'Das Nachbild verblasst nach einigen Sekunden, weil sich die Zapfen erholen. Nochmal?'; }
    }
    const { ctx, w, h } = fit(afterCv);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    if (AF.phase !== 'after') {
      // Schweizer Fahne in Gegenfarben: Cyan statt Rot, Schwarz statt Weiss
      const S = Math.min(w, h) * .66, u = S / 32, x0 = cx - S / 2, y0 = cy - S / 2;
      ctx.fillStyle = 'rgb(0,255,255)'; ctx.fillRect(x0, y0, S, S);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x0 + 6 * u, y0 + 13 * u, 20 * u, 6 * u);
      ctx.fillRect(x0 + 13 * u, y0 + 6 * u, 6 * u, 20 * u);
    }
    // Fixierpunkt
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fillStyle = '#8a8a8a'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    if (AF.phase === 'stare' && !reduced) {
      // ruhiger Fortschrittsbalken am unteren Rand
      ctx.fillStyle = '#d6d6d6'; ctx.fillRect(0, h - 3, w * clamp(el / AF.dur, 0, 1), 3);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('farben', 4, {
    mixLock: () => { ['#rIn', '#gIn', '#bIn', '#mixWhite', '#mixRandom'].forEach(s => $(s).disabled = false); },
    pixLock: () => { $('#zoomIn').disabled = false; $$('#pixColors button').forEach(b => b.disabled = false); },
    afterLock: () => { $('#durIn').disabled = false; $('#afterStart').disabled = false; },
  });

  loop((dt, now) => { drawMix(); drawPix(dt); drawAfter(now); });
})();
