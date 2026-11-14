/* mindblow – Lektion Hören */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const SOUND = 343;                                   // m/s in Luft bei 20 °C
  const MONO = 'Geist Mono, monospace';

  // Log-Regler: 0…1000 ↔ 20 Hz…20'000 Hz
  const sl2f = v => 20 * Math.pow(1000, v / 1000);
  const f2sl = f => Math.round(Math.log(f / 20) / Math.log(1000) * 1000);
  const hz = f => `${fmt(f, 0)} Hz`;
  const hzShort = f => {
    if (f < 1000) return fmt(f, 0);
    const k = f / 1000, d = k >= 10 || Math.abs(k - Math.round(k)) < .05 ? 0 : 1;
    return `${fmt(k, d)}k`;
  };
  const lambda = f => {
    const m = SOUND / f;
    if (m >= 1) return `${fmt(m, 2)} m`;
    if (m >= .1) return `${fmt(m * 100, 0)} cm`;
    return `${fmt(m * 100, 1)} cm`;
  };
  // Greenwood-Formel (Mensch): Ort auf der Basilarmembran, 0 = Basis, 1 = Spitze
  const LEN = 35;                                      // mm, vereinfacht
  const posOf = f => 1 - Math.log10(f / 165.4 + .88) / 2.1;
  const fAt = d => 165.4 * (Math.pow(10, 2.1 * (1 - d)) - .88);

  /* ---------- Ton-Erzeuger (Web Audio, erst nach einem Klick) ---------- */
  const A = { ctx: null, master: null, voices: [], owner: null };
  const ensure = () => {
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      A.ctx = new AC();
      A.master = A.ctx.createGain(); A.master.gain.value = 0;
      A.master.connect(A.ctx.destination);
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  };
  const killVoices = t => { A.voices.forEach(v => { try { v.osc.stop(t); } catch (e) {} }); A.voices = []; };
  const play = (owner, freqs, vol) => {
    const ctx = ensure();
    if (!ctx) return false;
    const t = ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setValueAtTime(0, t);
    killVoices(t);
    freqs.forEach(f => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f; g.gain.value = 1 / freqs.length;
      osc.connect(g); g.connect(A.master); osc.start(t);
      A.voices.push({ osc, g });
    });
    A.master.gain.linearRampToValueAtTime(vol, t + .12);   // sanft einblenden
    A.owner = owner; audioUI();
    return true;
  };
  const retune = freqs => {
    if (!A.ctx || !A.owner) return;
    if (freqs.length !== A.voices.length) return;
    const t = A.ctx.currentTime;
    A.voices.forEach((v, i) => v.osc.frequency.setTargetAtTime(freqs[i], t, .015));
  };
  const setVol = vol => { if (A.ctx && A.owner) A.master.gain.setTargetAtTime(vol, A.ctx.currentTime, .03); };
  const stop = () => {
    if (A.ctx && A.owner) {
      const t = A.ctx.currentTime;
      A.master.gain.cancelScheduledValues(t);
      A.master.gain.setValueAtTime(A.master.gain.value, t);
      A.master.gain.linearRampToValueAtTime(0, t + .1);      // sanft ausblenden
      killVoices(t + .15);
    }
    A.owner = null; sweep.on = false; audioUI();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  const noAudio = el => { $(el).textContent = 'Dein Browser kann hier leider keine Töne erzeugen.'; };

  // Knöpfe und Anzeigen aller drei Teile nachführen
  const audioUI = () => {
    const w = A.owner === 'wave', t = A.owner === 'tone', c = A.owner === 'coch';
    $('#wavePlay').textContent = w ? 'Ton stoppen' : 'Ton hören';
    $('#tState').textContent = t ? (sweep.on ? 'Test läuft' : 'Läuft') : 'Aus';
    $('#cState').textContent = c ? 'Läuft' : 'Aus';
    if (!$('#tonePlay').dataset.locked) {
      $('#toneStop').disabled = !t;
      $('#tonePlay').disabled = t && !sweep.on;
      $('#toneSweep').disabled = sweep.on;
    }
    if (!$('#cochPlay').dataset.locked) { $('#cochStop').disabled = !c; $('#cochPlay').disabled = c; }
  };

  /* ---------- Teil 1: Druckwelle ---------- */
  const waveCv = $('#waveCv');
  const W = { f: 300, amp: .6, phase: 0, mark: .45, seed: [] };
  for (let i = 0; i < 400; i++) W.seed.push([Math.random() - .5, Math.random() - .5]);
  const waveVol = () => .12 * W.amp;
  const updWave = () => {
    $('#wfOut').textContent = hz(W.f);
    $('#waOut').textContent = `${fmt(W.amp * 100, 0)} %`;
    $('#wLam').textContent = lambda(W.f);
    $('#wTime').textContent = `${fmt(3 / SOUND * 1000, 1)} ms`;
    $('#wNet').textContent = '0 m';
  };
  $('#wfIn').addEventListener('input', e => { W.f = +e.target.value; updWave(); if (A.owner === 'wave') retune([W.f]); });
  $('#waIn').addEventListener('input', e => {
    W.amp = +e.target.value / 100; updWave();
    if (A.owner === 'wave') setVol(waveVol());
    $('#waveStatus').textContent = W.amp === 0
      ? 'Ohne Schwingung kein Schall: Die Teilchen bleiben in Ruhe.'
      : 'Lauter heisst: Die Teilchen pendeln weiter und der Druck schwankt stärker. Der Ton wird nicht schneller.';
  });
  $('#wavePlay').addEventListener('click', () => {
    if (A.owner === 'wave') { stop(); return; }
    if (!play('wave', [W.f], waveVol())) noAudio('#waveStatus');
    else $('#waveStatus').textContent = 'Echt schwingt dieser Ton viel schneller, als du es oben siehst. Kopfhörer: leise stellen.';
  });
  $('#wavePick').addEventListener('click', () => { W.mark = .2 + Math.random() * .6; });
  updWave();

  const drawWave = dt => {
    const { ctx, w, h } = fit(waveCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440;
    const xL = 54, xR = w - (narrow ? 44 : 60), top = 50, bot = 182;
    const lamPx = 330 * Math.pow(100 / W.f, .72);          // kürzere Wellen bei höherem Ton
    const vPx = reduced ? 30 : 110;                        // Wellentempo, stark verlangsamt
    const k = TAU / lamPx;
    W.phase = (W.phase + k * vPx * dt) % TAU;
    const Amax = Math.min(9, .8 * lamPx / TAU) * W.amp;
    const s = u => Amax * Math.sin(W.phase - k * u);       // Auslenkung am Ort u

    // Titel
    ctx.font = '11px ' + MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Luftteilchen, stark verlangsamt' : 'Luftteilchen zwischen Lautsprecher und Ohr, stark verlangsamt', 12, 18);

    // Lautsprecher
    const mx = xL - 8 + s(0);
    roundRect(ctx, 10, top + 18, 22, bot - top - 36, 5); ctx.fillStyle = C.fg; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(32, top + 30); ctx.lineTo(mx, top + 4); ctx.lineTo(mx, bot - 4); ctx.lineTo(32, bot - 30); ctx.closePath();
    ctx.fillStyle = C.line; ctx.fill();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx, top + 4); ctx.lineTo(mx, bot - 4); ctx.stroke();

    // Ohr (schematisch)
    const ex = w - (narrow ? 20 : 30), ey = (top + bot) / 2;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey - 6, 15, Math.PI * .85, Math.PI * 2.35); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex + 1, ey - 5, 6, Math.PI * .9, Math.PI * 2.1); ctx.stroke();

    // Teilchen
    const sp = 11, rows = 9, cols = Math.floor((xR - xL - 6) / sp);
    let markPos = null, markHome = 0;
    const markCol = Math.round(W.mark * (cols - 1)), markRow = Math.floor(rows / 2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const j = W.seed[(r * 37 + c) % W.seed.length];
      const u = 6 + c * sp + j[0] * 4, y = top + 8 + r * (bot - top - 16) / (rows - 1) + j[1] * 5;
      const x = xL + u + s(u);
      const isMark = r === markRow && c === markCol;
      if (isMark) { markPos = [x, y]; markHome = xL + u; continue; }
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fillStyle = C.fiber; ctx.fill();
    }
    if (markPos) {
      const [x, y] = markPos;
      ctx.strokeStyle = C.bad; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(markHome, top - 4); ctx.lineTo(markHome, bot + 4); ctx.stroke(); ctx.setLineDash([]);
      if (Amax > 1) {
        ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(markHome - Amax, bot + 8); ctx.lineTo(markHome + Amax, bot + 8); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fillStyle = C.bad; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Druckverlauf
    const py = 226, pA = 18 * W.amp;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xL, py); ctx.lineTo(xR, py); ctx.stroke();
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let x = xL; x <= xR; x += 2) {
      const yy = py - pA * Math.cos(W.phase - k * (x - xL));
      x === xL ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
    // Verdichtungen markieren: dort, wo der Druck am höchsten ist
    if (W.amp > 0) {
      for (let n = -1; n < 40; n++) {
        const u = (W.phase - TAU * n) / k;
        if (u < 0 || u > xR - xL) continue;
        const x = xL + u;
        ctx.beginPath(); ctx.moveTo(x, top - 12); ctx.lineTo(x - 5, top - 20); ctx.lineTo(x + 5, top - 20); ctx.closePath();
        ctx.fillStyle = C.glow; ctx.fill();
      }
    }
    ctx.fillStyle = C.muted; ctx.font = '11px ' + MONO; ctx.textAlign = 'left';
    ctx.fillText('Druck', 12, py + 4);
    ctx.fillText(narrow ? '▲ Verdichtung wandert →' : '▲ Verdichtung: Sie wandert nach rechts, die Teilchen nicht', xL, py + 40);
    ctx.fillStyle = C.bad;
    ctx.fillText(narrow ? '● pendelt am Platz' : '● markiertes Teilchen: pendelt nur um seinen Platz', xL, py + 58);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText('Ohr', w - 12, bot + 22);
  };

  /* ---------- Teil 2: Tonhöhe ---------- */
  const toneCv = $('#toneCv');
  const T = { f: 440, vol: .5, phase: 0 };
  const sweep = { on: false, t: 0, dur: 24, f0: 8000, f1: 20000 };
  const toneVol = () => .16 * T.vol;                   // 50 % ≈ 0,08
  const updTone = () => {
    $('#tfIn').value = f2sl(T.f);
    $('#tfOut').textContent = hz(T.f);
    $('#tvOut').textContent = `${fmt(T.vol * 100, 0)} %`;
    $('#tHz').textContent = hz(T.f);
    $('#tLam').textContent = lambda(T.f);
  };
  $('#tfIn').addEventListener('input', e => {
    sweep.on = false; T.f = sl2f(+e.target.value); updTone(); audioUI();
    if (A.owner === 'tone') retune([T.f]);
    if (T.f > 15000) $('#toneStatus').textContent = 'Hörst du noch etwas? Wenn nicht, kann es auch am Lautsprecher liegen.';
    else if (T.f < 60) $('#toneStatus').textContent = 'Sehr tiefe Töne spürst du fast eher, als dass du sie hörst. Kleine Lautsprecher schaffen sie kaum.';
    else if (T.f > 2000 && T.f < 5000) $('#toneStatus').textContent = 'In diesem Bereich ist dein Ohr am empfindlichsten. Der Ton wirkt lauter, obwohl er gleich stark ist.';
    else $('#toneStatus').textContent = 'Starte leise. Handy-Lautsprecher schaffen sehr tiefe und sehr hohe Töne oft nicht.';
  });
  $('#tvIn').addEventListener('input', e => { T.vol = +e.target.value / 100; updTone(); if (A.owner === 'tone') setVol(toneVol()); });
  $('#tonePlay').addEventListener('click', () => {
    sweep.on = false;
    if (!play('tone', [T.f], toneVol())) noAudio('#toneStatus');
  });
  $('#toneSweep').addEventListener('click', () => {
    sweep.on = true; sweep.t = 0; T.f = sweep.f0; updTone();
    if (!play('tone', [T.f], toneVol())) { sweep.on = false; noAudio('#toneStatus'); return; }
    audioUI();
    $('#toneStatus').textContent = 'Der Ton steigt langsam. Drück «Stopp», sobald du nichts mehr hörst.';
  });
  $('#toneStop').addEventListener('click', () => {
    const was = sweep.on;
    stop();
    if (was) $('#toneStatus').textContent = `Deine Grenze mit diesem Gerät: etwa ${hz(Math.round(T.f / 100) * 100)}. Der Lautsprecher kann auch die Grenze sein.`;
  });
  updTone();

  const AGES = [['Kind', 20000], ['um 25', 17000], ['um 50', 12000], ['um 70', 8000]];
  const drawTone = dt => {
    if (sweep.on) {
      sweep.t += dt;
      const p = clamp(sweep.t / sweep.dur, 0, 1);
      T.f = sweep.f0 * Math.pow(sweep.f1 / sweep.f0, p);
      updTone(); retune([T.f]);
      if (p >= 1) { stop(); $('#toneStatus').textContent = 'Bis 20\'000 Hz gehört? Dann hast du sehr junge Ohren (oder der Lautsprecher übertreibt).'; }
    }
    const { ctx, w, h } = fit(toneCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440, pad = 14;
    // Schwingung über 5 ms
    const WIN = .005, x0 = pad, x1 = w - pad, mid = 92, amp = 18 + 42 * T.vol;
    const per = T.f * WIN;
    if (A.owner === 'tone' && !reduced) T.phase = (T.phase + dt * 3) % TAU;
    ctx.font = '11px ' + MONO; ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(`5 ms · ${fmt(per, per < 10 ? 1 : 0)} Schwingungen`, x0, 22);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    if (per / (x1 - x0) < .1) {
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let x = x0; x <= x1; x += 1) {
        const y = mid - amp * Math.sin(TAU * per * (x - x0) / (x1 - x0) + T.phase);
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = C.accent; ctx.globalAlpha = .35; ctx.fillRect(x0, mid - amp, x1 - x0, amp * 2); ctx.globalAlpha = 1;
      ctx.fillStyle = C.fg; ctx.textAlign = 'center';
      ctx.fillText('zu dicht zum Zeichnen', (x0 + x1) / 2, mid + 4);
    }

    // Hörbereich, logarithmische Skala
    const ax0 = narrow ? 58 : 72, ax1 = w - pad - 6, fx = f => ax0 + (ax1 - ax0) * Math.log(f / 20) / Math.log(1000);
    const by = 190, bh = 13, gap = 7;
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'Hörgrenze oben, grob' : 'Obere Hörgrenze nach Alter, grobe Richtwerte', pad, by - 12);
    AGES.forEach(([lbl, fmax], i) => {
      const y = by + i * (bh + gap);
      roundRect(ctx, ax0, y, fx(fmax) - ax0, bh, 6);
      ctx.fillStyle = T.f <= fmax ? C.fiber : C.line; ctx.globalAlpha = T.f <= fmax ? .75 : 1; ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText(lbl, pad, y + 10);
    });
    const ay = by + AGES.length * (bh + gap) + 2;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    [20, 100, 1000, 10000].concat(narrow ? [] : [20000]).forEach(f => {
      ctx.beginPath(); ctx.moveTo(fx(f), ay); ctx.lineTo(fx(f), ay + 4); ctx.stroke();
      ctx.fillText(f === 20 ? '20 Hz' : hzShort(f), fx(f), ay + 16);
    });
    // aktueller Ton
    const cx = fx(T.f);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, by - 4); ctx.lineTo(cx, ay); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, by - 4, 4, 0, TAU); ctx.fillStyle = C.accent; ctx.fill();
  };

  /* ---------- Teil 3: Schnecke ---------- */
  const cochCv = $('#cochCv');
  const K = { f: 440, mode: 'one', t: 0 };
  const TONE_COL = () => [C.accent, C.glow, C.copper];
  const cochFreqs = () => {
    const f = K.f;
    if (K.mode === 'chord') return [f, f * Math.pow(2, 4 / 12), f * Math.pow(2, 7 / 12)].filter(x => x <= 20000);
    if (K.mode === 'far') return f * 8 <= 20000 ? [f, f * 8] : [Math.max(20, f / 8), f];
    return [f];
  };
  const updCoch = () => {
    $('#cfIn').value = f2sl(K.f);
    $('#cfOut').textContent = hz(K.f);
    const fs = cochFreqs();
    $('#cTones').textContent = fs.map(f => fmt(f, 0)).join(' · ') + ' Hz';
    $('#cPos').textContent = fs.map(f => fmt(posOf(f) * LEN, 1)).join(' · ') + ' mm';
  };
  const cochPlay = () => { if (!play('coch', cochFreqs(), .08)) noAudio('#cochStatus'); };
  $('#cfIn').addEventListener('input', e => {
    K.f = sl2f(+e.target.value); updCoch();
    if (A.owner === 'coch') { const fs = cochFreqs(); if (fs.length !== A.voices.length) cochPlay(); else retune(fs); }
    const d = posOf(K.f);
    $('#cochStatus').textContent = d < .3 ? 'Hoher Ton: Das Band schwingt vorne an der Basis, gleich nach dem Eingang.'
      : d > .7 ? 'Tiefer Ton: Die Welle läuft weit bis fast an die Spitze.'
      : 'Mittlerer Ton: Die stärkste Stelle liegt in der Mitte des Bandes.';
  });
  $$('#cochMode button').forEach(b => b.addEventListener('click', () => {
    K.mode = b.dataset.mode;
    $$('#cochMode button').forEach(x => x.classList.toggle('active', x === b));
    updCoch();
    if (A.owner === 'coch') cochPlay();
    $('#cochStatus').textContent = K.mode === 'one' ? 'Ein Ton, eine stärkste Stelle.'
      : K.mode === 'chord' ? 'Drei Töne, drei Gipfel. Dein Ohr hört den Akkord, kennt aber auch jeden einzelnen Ton.'
      : 'Zwei Töne weit auseinander: zwei Gipfel an ganz verschiedenen Orten.';
  }));
  $('#cochPlay').addEventListener('click', cochPlay);
  $('#cochStop').addEventListener('click', stop);
  updCoch();

  // Vereinfachte Wanderwelle: steigt zur Basis hin langsam an, fällt hinter dem Gipfel steil ab
  const env = (d, dp) => d <= dp ? Math.exp(-Math.pow((dp - d) / .14, 2)) : Math.exp(-Math.pow((d - dp) / .025, 2));
  const drawCoch = dt => {
    if (!reduced) K.t += dt;
    const { ctx, w, h } = fit(cochCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 440, x0 = narrow ? 18 : 30, x1 = w - (narrow ? 18 : 30), cy = 140;
    const X = d => x0 + d * (x1 - x0);
    const fs = cochFreqs(), cols = TONE_COL();

    ctx.font = '11px ' + MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(narrow ? 'Basilarmembran, abgerollt' : 'Basilarmembran in der Schnecke, abgerollt (vereinfacht)', x0, 22);
    ctx.fillText('Basis', x0, 46); ctx.textAlign = 'right'; ctx.fillText('Spitze', x1, 46);
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.fillText('hoch', x0, 62); ctx.textAlign = 'right'; ctx.fillText('tief', x1, 62);

    // Band: schmal an der Basis, breit an der Spitze
    const half = d => 4 + d * 14;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const d = i / 60; ctx.lineTo(X(d), cy - half(d)); }
    for (let i = 60; i >= 0; i--) { const d = i / 60; ctx.lineTo(X(d), cy + half(d)); }
    ctx.closePath(); ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

    // Einhüllende und Schwingung
    const Amax = 48 / Math.sqrt(fs.length);
    fs.forEach((f, i) => {
      const dp = posOf(f);
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const d = (x - x0) / (x1 - x0); ctx.lineTo(x, cy - Amax * env(d, dp)); }
      for (let x = x1; x >= x0; x -= 2) { const d = (x - x0) / (x1 - x0); ctx.lineTo(x, cy + Amax * env(d, dp)); }
      ctx.closePath(); ctx.fillStyle = cols[i]; ctx.globalAlpha = .14; ctx.fill(); ctx.globalAlpha = 1;
    });
    if (!reduced) {
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = x0; x <= x1; x += 1.5) {
        const d = (x - x0) / (x1 - x0);
        let y = 0;
        fs.forEach((f, i) => {
          const dp = posOf(f);
          y += Amax * env(d, dp) * Math.sin(TAU * 1.1 * K.t * (1 + i * .23) - (d / Math.max(dp, .02)) * 3 * Math.PI);
        });
        x === x0 ? ctx.moveTo(x, cy - y) : ctx.lineTo(x, cy - y);
      }
      ctx.stroke();
    }

    // Gipfel beschriften
    // Beschriftungen, die sich überlappen würden, in eigene Zeilen legen
    ctx.font = '600 11px ' + MONO;
    const rowEnd = [], rowOf = [];
    fs.map((f, i) => ({ i, x: X(posOf(f)), tw: ctx.measureText(narrow ? hzShort(f) : hz(f)).width }))
      .sort((a, b) => a.x - b.x)
      .forEach(o => {
        let r = 0;
        while (rowEnd[r] !== undefined && rowEnd[r] > o.x - o.tw / 2 - 6) r++;
        rowEnd[r] = o.x + o.tw / 2; rowOf[o.i] = r;
      });
    fs.forEach((f, i) => {
      const px = X(posOf(f)), ty = cy - Amax - 10 - rowOf[i] * 14;
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px, ty + 4); ctx.lineTo(px, cy + Amax + 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cols[i]; ctx.font = '600 11px ' + MONO; ctx.textAlign = px < x0 + 30 ? 'left' : px > x1 - 30 ? 'right' : 'center';
      ctx.fillText(narrow ? hzShort(f) : hz(f), px, ty);
    });

    // Skalen unten: Frequenz und Millimeter
    const ay = 232;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
    ctx.font = '11px ' + MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    const marks = narrow ? [16000, 4000, 1000, 250, 50] : [16000, 8000, 4000, 2000, 1000, 500, 250, 100, 50];
    marks.forEach(f => {
      const x = X(posOf(f));
      ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, ay + 4); ctx.stroke();
      ctx.fillText(hzShort(f), x, ay + 16);
    });
    ctx.textAlign = 'left'; ctx.fillText(narrow ? 'Hz, hier schwingt es am stärksten' : 'Hz: Diese Frequenz schwingt hier am stärksten', x0, ay + 34);
    const my = 284;
    ctx.beginPath(); ctx.moveTo(x0, my); ctx.lineTo(x1, my); ctx.stroke();
    for (let mm = 0; mm <= LEN; mm += 5) {
      const x = X(mm / LEN);
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, my + 4); ctx.stroke();
      if (!narrow || mm % 10 === 0) { ctx.textAlign = 'center'; ctx.fillText(mm === 0 ? '0' : String(mm), x, my + 16); }
    }
    ctx.textAlign = 'right'; ctx.fillText('mm', x1, my - 6);
  };

  /* ---------- Lektion verdrahten ---------- */
  ['#tonePlay', '#cochPlay'].forEach(s => { $(s).dataset.locked = '1'; });
  lesson('gehoer', 4, {
    waveLock: () => { ['#wfIn', '#waIn', '#wavePlay', '#wavePick'].forEach(s => $(s).disabled = false); },
    toneLock: () => {
      ['#tfIn', '#tvIn'].forEach(s => $(s).disabled = false);
      delete $('#tonePlay').dataset.locked; audioUI();
    },
    cochLock: () => {
      $('#cfIn').disabled = false; $$('#cochMode button').forEach(b => b.disabled = false);
      delete $('#cochPlay').dataset.locked; audioUI();
    },
  });

  loop(dt => { drawWave(dt); drawTone(dt); drawCoch(dt); });
})();
