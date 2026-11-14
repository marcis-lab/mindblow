/* mindblow – Lektion Magnete */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const MONO = '11px Geist Mono, monospace';

  /* Gemeinsames Modell: Jeder Magnet als Paar von «Polladungen» (+ am Nordpol, − am Südpol).
     Das ist eine Vereinfachung, ergibt aussen aber die richtige Feldform eines Stabmagneten. */
  const field = (poles, x, y) => {
    let bx = 0, by = 0;
    for (const p of poles) {
      const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy + 30, r3 = r2 * Math.sqrt(r2);
      bx += p.q * dx / r3; by += p.q * dy / r3;
    }
    return [bx, by];
  };
  const drawNeedles = (ctx, poles, w, h, gap, skip, alphaRef) => {
    for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) {
      if (skip(x, y)) continue;
      const [bx, by] = field(poles, x, y), m = Math.hypot(bx, by);
      if (m < 1e-9) continue;
      const ux = bx / m, uy = by / m, l = gap * .34;
      const a = clamp(.25 + .25 * Math.log10(m / alphaRef + 1e-9) + .5, .15, 1);
      ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * l, y + uy * l); ctx.stroke();
      ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * l, y - uy * l); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const drawLines = (ctx, poles, w, h, seeds, col) => {
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.globalAlpha = .55;
    for (const p of poles) {
      if (p.q <= 0) continue;
      for (let k = 0; k < seeds; k++) {
        const a = (k + .5) / seeds * TAU;
        let x = p.x + Math.cos(a) * 7, y = p.y + Math.sin(a) * 7;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let i = 0; i < 420; i++) {
          const [bx, by] = field(poles, x, y), m = Math.hypot(bx, by);
          if (m < 1e-12) break;
          x += bx / m * 4; y += by / m * 4;
          ctx.lineTo(x, y);
          if (x < -40 || y < -40 || x > w + 40 || y > h + 40) break;
          if (poles.some(s => s.q < 0 && Math.hypot(s.x - x, s.y - y) < 6)) break;
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };
  // Stabmagnet zeichnen: Nordpol rot, Südpol grün
  const drawBar = (ctx, x, y, len, hh, dir) => {
    const left = x - len / 2;
    roundRect(ctx, left, y - hh / 2, len, hh, 5); ctx.save(); ctx.clip();
    ctx.fillStyle = dir > 0 ? C.accent : C.bad; ctx.fillRect(left, y - hh / 2, len / 2, hh);
    ctx.fillStyle = dir > 0 ? C.bad : C.accent; ctx.fillRect(x, y - hh / 2, len / 2, hh);
    ctx.restore();
    ctx.fillStyle = C.bg; ctx.font = '600 13px Outfit, sans-serif'; ctx.textAlign = 'center';
    if (len > 40) {
      ctx.fillText(dir > 0 ? 'S' : 'N', left + 11, y + 5);
      ctx.fillText(dir > 0 ? 'N' : 'S', left + len - 11, y + 5);
    }
  };

  /* ---------- Teil 1: Feld, Feldlinien, Elektromagnet ---------- */
  const fieldCv = $('#fieldCv');
  const F = { on: false, src: 'bar', str: .7, lines: true, two: false, mags: [], probe: null, drag: null, init: false };
  const magLen = w => Math.min(130, w * .3);
  const poles1 = (m, len) => {
    const d = len / 2 - 8;
    return [{ x: m.x + m.dir * d, y: m.y, q: m.q * 2000 }, { x: m.x - m.dir * d, y: m.y, q: -m.q * 2000 }];
  };
  const updField = () => {
    $('#strOut').textContent = `${Math.round(F.str * 100)} %`;
    $('#strLbl').textContent = F.src === 'coil' ? 'Strom' : 'Stärke';
    $('#flipBtn').textContent = F.src === 'coil' ? 'Strom umpolen' : 'Umdrehen';
    $('#twoBtn').textContent = F.two ? 'Nur ein Magnet' : 'Zweiter Magnet';
    $('#linesBtn').textContent = F.lines ? 'Feldlinien aus' : 'Feldlinien an';
  };
  $$('#srcBtns button').forEach(b => b.addEventListener('click', () => {
    F.src = b.dataset.src;
    $$('#srcBtns button').forEach(x => x.classList.toggle('active', x === b));
    updField();
    $('#fieldStatus').textContent = F.src === 'coil'
      ? 'Ein Draht als Spule gewickelt. Fliesst Strom, entsteht ein Feld wie beim Stabmagneten. Stell den Strom auf 0.'
      : 'Ein Dauermagnet: Sein Feld ist immer da.';
  }));
  $('#strIn').addEventListener('input', e => {
    F.str = +e.target.value / 100; updField();
    if (F.src === 'coil') $('#fieldStatus').textContent = F.str === 0 ? 'Strom aus: Das Feld ist weg. So funktioniert ein Kran für Schrott.' : 'Mehr Strom, stärkeres Feld.';
  });
  $('#flipBtn').addEventListener('click', () => {
    if (F.mags[0]) F.mags[0].dir *= -1;
    $('#fieldStatus').textContent = F.src === 'coil' ? 'Strom andersherum: Nord und Süd tauschen die Plätze.' : 'Umgedreht: Die Nadeln drehen sich mit.';
  });
  $('#twoBtn').addEventListener('click', () => {
    F.two = !F.two; updField();
    $('#fieldStatus').textContent = F.two ? 'Schieb die Magnete gegeneinander. Probier beide Richtungen mit «Umdrehen».' : 'Zieh den Magneten herum.';
  });
  $('#linesBtn').addEventListener('click', () => { F.lines = !F.lines; updField(); });
  updField();

  const cvPos = (cv, e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const hitMag = (x, y) => {
    const len = magLen(fieldCv.getBoundingClientRect().width);
    const list = F.two ? F.mags : F.mags.slice(0, 1);
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (Math.abs(x - m.x) < len / 2 + 6 && Math.abs(y - m.y) < 22) return m;
    }
    return null;
  };
  fieldCv.addEventListener('pointerdown', e => {
    if (!F.on) return;
    const [x, y] = cvPos(fieldCv, e), m = hitMag(x, y);
    F.probe = [x, y];
    if (m) { F.drag = { m, dx: x - m.x, dy: y - m.y }; fieldCv.setPointerCapture(e.pointerId); }
  });
  fieldCv.addEventListener('pointermove', e => {
    if (!F.on) return;
    const [x, y] = cvPos(fieldCv, e);
    F.probe = [x, y];
    if (F.drag) {
      const r = fieldCv.getBoundingClientRect();
      F.drag.m.x = clamp(x - F.drag.dx, 20, r.width - 20);
      F.drag.m.y = clamp(y - F.drag.dy, 20, r.height - 20);
    }
  });
  const endDrag = () => { F.drag = null; };
  fieldCv.addEventListener('pointerup', endDrag);
  fieldCv.addEventListener('pointercancel', endDrag);

  const drawCoil = (ctx, x, y, len, hh, dir, I) => {
    const left = x - len / 2;
    ctx.fillStyle = C.sunk; roundRect(ctx, left, y - hh / 2 + 4, len, hh - 8, 4); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    const n = Math.max(6, Math.round(len / 9));
    ctx.strokeStyle = C.copper; ctx.lineWidth = 2.2;
    for (let i = 0; i < n; i++) {
      const xx = left + 4 + (len - 8) * (i + .5) / n;
      ctx.beginPath(); ctx.moveTo(xx - 3, y - hh / 2); ctx.lineTo(xx + 3, y + hh / 2); ctx.stroke();
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    if (I <= 0) ctx.fillText('Strom aus', x, y - hh / 2 - 6);
    else {
      ctx.fillStyle = C.bad; ctx.fillText('N', x + dir * (len / 2 + 10), y + 4);
      ctx.fillStyle = C.accent; ctx.fillText('S', x - dir * (len / 2 + 10), y + 4);
    }
  };

  const drawField = () => {
    const { ctx, w, h } = fit(fieldCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420, len = magLen(w), hh = small ? 22 : 26;
    if (!F.init && w > 10) {
      F.mags = [{ x: w * .38, y: h * .5, dir: 1, q: 1 }, { x: w * .78, y: h * .5, dir: 1, q: 1 }];
      F.init = true;
    }
    if (!F.init) return;
    F.mags.forEach(m => { m.x = clamp(m.x, 20, w - 20); m.y = clamp(m.y, 20, h - 20); });
    F.mags[0].q = F.str;
    F.mags[1].q = .7;
    const mags = F.two ? F.mags : F.mags.slice(0, 1);
    const poles = mags.flatMap(m => poles1(m, len));
    const inside = (x, y) => mags.some(m => Math.abs(x - m.x) < len / 2 + 4 && Math.abs(y - m.y) < hh / 2 + 6);
    const ref = 2000 * .7 / Math.pow(100, 2);
    if (F.lines && poles.some(p => p.q > 0)) drawLines(ctx, poles, w, h, small ? 10 : 14, C.fiber);
    drawNeedles(ctx, poles, w, h, small ? 26 : 30, inside, ref);
    mags.forEach((m, i) => {
      if (i === 0 && F.src === 'coil') drawCoil(ctx, m.x, m.y, len, hh, m.dir, F.str);
      else drawBar(ctx, m.x, m.y, len, hh, m.dir);
    });
    // Messpunkt
    const mmPerPx = 80 / len; // ein Stabmagnet ist etwa 8 cm lang
    if (F.on && F.probe) {
      const [px, py] = F.probe;
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.stroke();
      const [bx, by] = field(poles, px, py), B = Math.hypot(bx, by);
      const B0 = 2000 / Math.pow(10 / mmPerPx, 2); // 1 cm vor einem Pol bei voller Stärke
      const rel = B / B0 * 100;
      $('#fB').textContent = rel > 999 ? 'über 999 %' : `${fmt(rel, rel < 10 ? 1 : 0)} %`;
      const dmin = Math.min(...poles.map(p => Math.hypot(p.x - px, p.y - py)));
      $('#fD').textContent = `${fmt(dmin * mmPerPx / 10, 1)} cm`;
    }
    // Kraft zwischen zwei Magneten
    if (F.two) {
      const [a, b] = F.mags;
      const pa = poles1(a, len), pb = poles1(b, len);
      let fx = 0, fy = 0;
      for (const p of pb) { const [bx, by] = field(pa, p.x, p.y); fx += p.q * bx; fy += p.q * by; }
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const fr = (fx * dx + fy * dy) / d, fm = Math.hypot(fx, fy);
      $('#fF').textContent = fm < 1e-6 ? 'keine Kraft' : Math.abs(fr) < .35 * fm ? 'drehen sich' : fr < 0 ? 'ziehen sich an' : 'stossen sich ab';
    } else $('#fF').textContent = '–';
    if (F.on && !F.probe) {
      ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(small ? 'Tippen zum Messen, ziehen zum Schieben' : 'Zeig irgendwohin zum Messen. Zieh einen Magneten, um ihn zu schieben.', w / 2, h - 12);
    }
  };

  /* ---------- Teil 2: Magnetbereiche ---------- */
  const domCv = $('#domCv');
  const D = { on: false, mat: 'soft', near: 0, list: [] };
  const COLS = 8, ROWS = 4;
  const newPiece = () => {
    D.list = Array.from({ length: COLS * ROWS }, (_, i) => {
      const a0 = (Math.random() * 4 | 0) * Math.PI / 2 + (Math.random() - .5) * .5; // Eisen hat bevorzugte Richtungen
      return { a0, cur: a0, th: .08 + Math.random() * .8, al: false, keep: i % 9 === 0 };
    });
  };
  newPiece();
  const H = () => Math.pow(D.near / 100, 1.6);
  const magnetization = () => D.mat === 'alu' ? 0 : D.list.reduce((s, d) => s + Math.cos(d.cur), 0) / D.list.length;
  const updDom = () => {
    $('#nearOut').textContent = D.near < 5 ? 'weit weg' : D.near > 92 ? 'berührt' : `${fmt(D.near, 0)} %`;
    const al = D.mat === 'alu' ? 0 : D.list.filter(d => d.al).length;
    $('#dAl').textContent = D.mat === 'alu' ? 'keine' : `${al} von ${D.list.length}`;
    const M = Math.max(0, magnetization());
    $('#dM').textContent = `${fmt(M * 100, 0)} %`;
    $('#dClips').textContent = D.mat === 'alu' ? '0' : String(Math.floor(M * 12 * (.4 + .6 * Math.max(H(), D.mat === 'steel' ? .5 : 0))));
  };
  const domMsg = () => {
    const M = magnetization();
    let m;
    if (D.mat === 'alu') m = 'Aluminium hat keine Magnetbereiche. Es reagiert so schwach, dass nichts passiert.';
    else if (D.near < 5) m = D.mat === 'steel' && M > .3 ? 'Magnet weg, aber der Stahl bleibt magnetisch. Er ist jetzt selbst ein Dauermagnet.'
      : D.list.some(d => d.al) ? 'Magnet weg: Fast alle Bereiche kippen zurück. Ein kleiner Rest bleibt ausgerichtet.'
      : 'Die Bereiche zeigen kreuz und quer. Zusammen heben sie sich auf.';
    else if (H() < .25) m = 'Das Feld ist schwach. Erst wenige Bereiche drehen sich.';
    else m = 'Viele Bereiche zeigen jetzt in Feldrichtung. Das Metall ist selbst ein Magnet und wird angezogen.';
    $('#domStatus').textContent = m;
  };
  $$('#matBtns button').forEach(b => b.addEventListener('click', () => {
    D.mat = b.dataset.mat;
    $$('#matBtns button').forEach(x => x.classList.toggle('active', x === b));
    newPiece(); if (D.mat === 'steel') D.list.forEach(d => { d.th = .35 + Math.random() * .65; });
    updDom(); domMsg();
  }));
  $('#nearIn').addEventListener('input', e => { D.near = +e.target.value; updDom(); domMsg(); });
  $('#awayBtn').addEventListener('click', () => { D.near = 0; $('#nearIn').value = 0; updDom(); domMsg(); });
  $('#shuffleBtn').addEventListener('click', () => {
    newPiece(); if (D.mat === 'steel') D.list.forEach(d => { d.th = .35 + Math.random() * .65; });
    updDom(); domMsg();
  });
  updDom();

  const drawDom = dt => {
    const hv = H();
    let changed = false;
    for (const d of D.list) {
      const was = d.al;
      if (hv > d.th) d.al = true;
      else if (D.mat === 'soft' && !d.keep) d.al = false;
      if (was !== d.al) changed = true;
      // nicht ausgerichtete Bereiche kippen leicht Richtung Feld
      let tgt = d.al ? 0 : Math.atan2(Math.sin(d.a0), Math.cos(d.a0)) * (1 - .45 * hv);
      let diff = Math.atan2(Math.sin(tgt - d.cur), Math.cos(tgt - d.cur));
      d.cur += reduced ? diff : diff * Math.min(1, dt * 8);
    }
    if (changed) { updDom(); domMsg(); } else updDom();

    const { ctx, w, h } = fit(domCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const mw = small ? w * .56 : Math.min(w * .52, 340), mh = Math.min(h - 70, mw * .5);
    const mx = w - mw - (small ? 12 : 30), my = (h - mh) / 2;
    const mLen = small ? 64 : 90, mHH = small ? 22 : 26;
    const magX = (mx - mLen / 2 - 10) - (1 - D.near / 100) * (mx - mLen / 2 - 10 - (-mLen / 2 + 30));
    // Feldpfeile zwischen Magnet und Metall
    if (hv > .01) {
      ctx.strokeStyle = C.fiber; ctx.globalAlpha = .25 + .5 * hv; ctx.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) {
        const y = my + mh / 2 + k * mh * .22;
        ctx.beginPath(); ctx.moveTo(magX + mLen / 2, my + mh / 2 + k * 4); ctx.quadraticCurveTo((magX + mx) / 2, y, mx + mw, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Magnet: Nordpol zum Metall
    drawBar(ctx, magX, my + mh / 2, mLen, mHH, 1);
    // Metall
    roundRect(ctx, mx, my, mw, mh, 10);
    ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    if (D.mat === 'alu') {
      ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText('Aluminium:', mx + mw / 2, my + mh / 2 - 4);
      ctx.fillText('keine Magnetbereiche', mx + mw / 2, my + mh / 2 + 12);
    } else {
      const cw = mw / COLS, ch = mh / ROWS;
      D.list.forEach((d, i) => {
        const cx = mx + cw * (i % COLS + .5), cy = my + ch * ((i / COLS | 0) + .5);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(mx + cw * (i % COLS), my + ch * (i / COLS | 0), cw, ch);
        const l = Math.min(cw, ch) * .36, ux = Math.cos(d.cur), uy = Math.sin(d.cur);
        const col = d.al ? C.bad : C.muted;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - ux * l, cy - uy * l); ctx.lineTo(cx + ux * l * .6, cy + uy * l * .6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + ux * l, cy + uy * l);
        ctx.lineTo(cx + ux * l * .45 - uy * l * .4, cy + uy * l * .45 + ux * l * .4);
        ctx.lineTo(cx + ux * l * .45 + uy * l * .4, cy + uy * l * .45 - ux * l * .4); ctx.closePath(); ctx.fill();
      });
      const M = magnetization();
      if (M > .3) {
        ctx.font = '600 13px Outfit, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = C.accent; ctx.fillText('S', mx - (small ? 0 : 0) + 10, my - 6);
        ctx.fillStyle = C.bad; ctx.fillText('N', mx + mw - 10, my - 6);
      }
      // Anziehungskraft
      const Fm = hv * Math.max(0, M);
      if (Fm > .02) {
        const ax = mx + mw / 2, ay = my + mh + 18, L = 12 + Fm * mw * .45;
        ctx.strokeStyle = C.copper; ctx.fillStyle = C.copper; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - L + 8, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax - L, ay); ctx.lineTo(ax - L + 10, ay - 6); ctx.lineTo(ax - L + 10, ay + 6); ctx.closePath(); ctx.fill();
        ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillText('Anziehung', ax + 6, ay + 4);
      }
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(small ? 'stark vergrössert' : 'Magnetbereiche, stark vergrössert', mx, 16);
  };

  /* ---------- Teil 3: Magnet zerbrechen ---------- */
  const breakCv = $('#breakCv');
  const B = { n: 1, gap: 16, inner: true, on: false, anim: 1 };
  const updBreak = () => {
    $('#piecesOut').textContent = String(B.n);
    $('#gapOut').textContent = `${B.gap} mm`;
    $('#bN').textContent = String(B.n); $('#bNo').textContent = String(B.n); $('#bSo').textContent = String(B.n);
    $('#breakStatus').textContent = B.n === 1 ? 'Ein ganzer Stabmagnet.'
      : `${B.n} Stücke, also ${B.n} Nordpole und ${B.n} Südpole. An jeder Bruchstelle stehen sich Nord und Süd gegenüber, darum ziehen sich die Stücke wieder an.`;
  };
  $('#piecesIn').addEventListener('input', e => { B.n = +e.target.value; B.anim = 0; updBreak(); });
  $('#gapIn').addEventListener('input', e => { B.gap = +e.target.value; updBreak(); });
  $$('#innerBtns button').forEach(b => b.addEventListener('click', () => {
    B.inner = b.dataset.in === '1';
    $$('#innerBtns button').forEach(x => x.classList.toggle('active', x === b));
  }));
  updBreak();

  const drawBreak = dt => {
    B.anim = reduced ? 1 : Math.min(1, B.anim + dt * 2.5);
    const { ctx, w, h } = fit(breakCv);
    ctx.clearRect(0, 0, w, h);
    const small = w < 420;
    const L = Math.min(w * .62, 340), hh = small ? 30 : 36, cy = h / 2;
    const mmPerPx = 120 / L;
    const gapPx = B.gap / mmPerPx * (B.n > 1 ? B.anim : 1);
    const pw = L / B.n, total = L + gapPx * (B.n - 1);
    const x0 = (w - total) / 2;
    const pieces = Array.from({ length: B.n }, (_, i) => ({ x: x0 + i * (pw + gapPx) + pw / 2 }));
    const poles = pieces.flatMap(p => [{ x: p.x + pw / 2 - 4, y: cy, q: 1500 }, { x: p.x - pw / 2 + 4, y: cy, q: -1500 }]);
    const inside = (x, y) => Math.abs(y - cy) < hh / 2 + 8 && x > x0 - 6 && x < x0 + total + 6;
    drawLines(ctx, poles, w, h, small ? 8 : 10, C.fiber);
    drawNeedles(ctx, poles, w, h, small ? 26 : 30, inside, 1500 / 10000);
    for (const p of pieces) {
      const left = p.x - pw / 2;
      roundRect(ctx, left, cy - hh / 2, pw, hh, 4); ctx.save(); ctx.clip();
      ctx.fillStyle = C.accent; ctx.fillRect(left, cy - hh / 2, pw / 2, hh);
      ctx.fillStyle = C.bad; ctx.fillRect(p.x, cy - hh / 2, pw / 2, hh);
      if (B.inner) {
        // Elementarmagnete: alle zeigen von Süd nach Nord
        const nx = Math.max(2, Math.round(pw / 14)), ny = 2;
        ctx.strokeStyle = C.bg; ctx.fillStyle = C.bg; ctx.lineWidth = 1.5; ctx.globalAlpha = .8;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const ax = left + pw * (i + .5) / nx, ay = cy - hh / 2 + hh * (j + .5) / ny, l = Math.min(5, pw / nx * .35);
          ctx.beginPath(); ctx.moveTo(ax - l, ay); ctx.lineTo(ax + l - 2, ay); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax + l + 1, ay); ctx.lineTo(ax + l - 3, ay - 3); ctx.lineTo(ax + l - 3, ay + 3); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.font = '600 12px Outfit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = C.accent; ctx.fillText('S', left + Math.min(10, pw / 4), cy - hh / 2 - 6);
      ctx.fillStyle = C.bad; ctx.fillText('N', left + pw - Math.min(10, pw / 4), cy - hh / 2 - 6);
    }
    ctx.font = MONO; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText(B.inner ? (small ? 'Pfeile: Elementarmagnete' : 'Weisse Pfeile: die ausgerichteten Magnetbereiche') : 'Rot = Nordpol, grün = Südpol', 12, h - 12);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('magnet', 4, {
    fieldLock: () => {
      F.on = true;
      $$('#srcBtns button').forEach(b => b.disabled = false);
      ['#strIn', '#flipBtn', '#twoBtn', '#linesBtn'].forEach(s => $(s).disabled = false);
    },
    domLock: () => {
      D.on = true;
      $$('#matBtns button').forEach(b => b.disabled = false);
      ['#nearIn', '#awayBtn', '#shuffleBtn'].forEach(s => $(s).disabled = false);
    },
    breakLock: () => {
      B.on = true;
      ['#piecesIn', '#gapIn'].forEach(s => $(s).disabled = false);
      $$('#innerBtns button').forEach(b => b.disabled = false);
    },
  });

  loop(dt => { drawField(); drawDom(dt); drawBreak(dt); });
})();
