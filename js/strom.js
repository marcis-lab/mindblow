/* mindblow – Lektion Strom */
(() => {
  const { $, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  /* ---------- Teil 1: Draht ---------- */
  const wire = { on: false, onAt: 0, pulse: -1, els: [], tracked: null, lit: false };
  const wireCv = $('#wireCv');
  for (let i = 0; i < 70; i++) wire.els.push({ u: Math.random(), v: Math.random(), vx: 0, vy: 0 });
  wire.tracked = wire.els[20]; wire.tracked.u = 0.18; wire.tracked.v = 0.5;

  $('#wireBtn').addEventListener('click', () => {
    wire.on = !wire.on;
    if (wire.on) { wire.onAt = performance.now(); wire.pulse = 0; wire.lit = false; }
    else { wire.lit = false; wire.pulse = -1; $('#rSignal').textContent = '–'; }
    $('#wireBtn').textContent = wire.on ? 'Licht ausschalten' : 'Licht einschalten';
  });

  const drawWire = (dt, now) => {
    const { ctx, w, h } = fit(wireCv);
    ctx.clearRect(0, 0, w, h);
    const x0 = 64, x1 = w - 86, cy = h / 2 + 6, th = 76, len = x1 - x0;
    ctx.fillStyle = C.copper; ctx.globalAlpha = .16; roundRect(ctx, x0, cy - th / 2, len, th, 14); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = C.copper; ctx.lineWidth = 2; roundRect(ctx, x0, cy - th / 2, len, th, 14); ctx.stroke();
    // Schalter
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(16, cy); ctx.lineTo(30, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, cy);
    if (wire.on) ctx.lineTo(x0, cy); else ctx.lineTo(x0 - 6, cy - 20);
    ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText('Schalter', 10, cy + 30);
    ctx.fillText('Kupferdraht (stark vergrössert)', x0, cy - th / 2 - 12);
    // Schub-Welle
    if (wire.on && wire.pulse >= 0 && wire.pulse < 1) {
      wire.pulse += dt / (reduced ? 0.05 : 0.45);
      if (wire.pulse >= 1) { wire.pulse = 1; wire.lit = true; $('#rSignal').textContent = '≈ 1 µs'; }
    }
    if (wire.on && wire.pulse >= 0) {
      const px = x0 + len * Math.min(1, wire.pulse);
      const g = ctx.createLinearGradient(px - 80, 0, px, 0);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, C.glow);
      ctx.fillStyle = g; ctx.globalAlpha = wire.pulse < 1 ? .55 : .12;
      ctx.fillRect(Math.max(x0, px - 80), cy - th / 2 + 2, Math.min(80, px - x0), th - 4);
      ctx.globalAlpha = 1;
    }
    // Elektronen
    const drift = wire.on ? 7 : 0;
    for (const e of wire.els) {
      if (!reduced) { e.vx += (Math.random() - .5) * 0.9; e.vy += (Math.random() - .5) * 0.9; e.vx *= .9; e.vy *= .9; }
      e.u += e.vx * 0.0006 + drift * dt / len;
      e.v += e.vy * 0.004;
      if (e.v < 0.08) { e.v = 0.08; e.vy *= -1; } if (e.v > 0.92) { e.v = 0.92; e.vy *= -1; }
      if (e.u > 1) e.u -= 1; if (e.u < 0) e.u += 1;
      const ex = x0 + 8 + e.u * (len - 16), ey = cy - th / 2 + e.v * th, mine = e === wire.tracked;
      ctx.beginPath(); ctx.arc(ex, ey, mine ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = mine ? C.accent : C.copper; ctx.fill();
      if (mine) {
        ctx.beginPath(); ctx.arc(ex, ey, 11, 0, Math.PI * 2); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = C.accent; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText('dein Elektron', ex, cy + th / 2 + 22);
      }
    }
    // Lampe
    const lx = w - 44;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, cy); ctx.lineTo(lx - 20, cy); ctx.stroke();
    if (wire.lit) {
      const rg = ctx.createRadialGradient(lx, cy, 4, lx, cy, 70);
      rg.addColorStop(0, C.glow); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(lx, cy, 70, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(lx, cy, 19, 0, Math.PI * 2);
    ctx.fillStyle = wire.lit ? C.glow : C.surface; ctx.fill(); ctx.strokeStyle = C.fg; ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('Lampe', lx, cy + 40);
    $('#rDrift').textContent = wire.on ? fmt((now - wire.onAt) / 1000 * 0.1, 3) + ' mm' : '0,000 mm';
  };

  /* ---------- Teil 2: Stromkreis ---------- */
  const loopPath = $('#loop'), loopLen = loopPath.getTotalLength();
  const NS = 'http://www.w3.org/2000/svg', DOTS = 34, dots = [];
  for (let i = 0; i < DOTS; i++) {
    const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '3.4'); c.setAttribute('fill', 'var(--accent)');
    $('#dots').appendChild(c); dots.push(c);
  }
  const circ = { closed: true, offset: 0, I: 0 };
  const sup = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || c).join('');
  const updateCircuit = () => {
    const U = +$('#uIn').value, R = +$('#rIn').value;
    const I = circ.closed ? U / R : 0, P = U * I;
    circ.I = I;
    $('#uOut').textContent = fmt(U, 1) + ' V';
    $('#rOut').textContent = R + ' Ω';
    $('#rLabel').textContent = R + ' Ω';
    $('#iVal').textContent = fmt(I, 2) + ' A';
    $('#pVal').textContent = fmt(P, 1) + ' W';
    if (I === 0) $('#nVal').textContent = '0';
    else {
      const n = I / 1.602e-19, ex = Math.floor(Math.log10(n));
      $('#nVal').textContent = fmt(n / 10 ** ex, 1) + ' × 10' + sup(ex);
    }
    const b = Math.min(1, Math.sqrt(P / 40));
    $('#lampCore').setAttribute('opacity', b.toFixed(3));
    $('#lampGlow').setAttribute('opacity', (b * 0.9).toFixed(3));
    const st = $('#circStatus');
    st.className = 'status';
    if (!circ.closed) st.textContent = 'Kreis offen: Die Elektronen haben keinen Weg zurück zur Batterie, also fliesst nichts.';
    else if (P > 30) { st.textContent = 'Achtung: über 30 W. Eine echte kleine Lampe würde jetzt durchbrennen.'; st.className = 'status warn'; }
    else if (P === 0) st.textContent = 'Keine Spannung, kein Schub.';
    else st.textContent = 'Die Punkte zeigen, wie viel Strom fliesst. Sie sind stark verlangsamt.';
  };
  const setSwitch = () => {
    const lev = $('#lever');
    lev.setAttribute('x2', circ.closed ? '220' : '214'); lev.setAttribute('y2', circ.closed ? '210' : '186');
    $('#swLabel').textContent = circ.closed ? 'Schalter: zu (antippen)' : 'Schalter: offen (antippen)';
    updateCircuit();
  };
  const toggleSwitch = () => { if ($('#circLock').hidden) { circ.closed = !circ.closed; setSwitch(); } };
  $('#switch').addEventListener('click', toggleSwitch);
  $('#switch').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSwitch(); } });
  $('#uIn').addEventListener('input', updateCircuit);
  $('#rIn').addEventListener('input', updateCircuit);
  updateCircuit();
  const drawCircuit = dt => {
    const speed = Math.min(260, circ.I * 45);
    circ.offset = (circ.offset - speed * dt + loopLen) % loopLen; // Elektronen: von Minus durch den Kreis zu Plus
    for (let i = 0; i < DOTS; i++) {
      const p = loopPath.getPointAtLength((circ.offset + i * loopLen / DOTS) % loopLen);
      dots[i].setAttribute('cx', p.x.toFixed(1)); dots[i].setAttribute('cy', p.y.toFixed(1));
    }
  };

  /* ---------- Teil 3: Generator ---------- */
  const gen = { on: false, angle: 0, speed: 0.6, hist: [] };
  const genCv = $('#genCv');
  const updGen = () => {
    gen.speed = +$('#spIn').value;
    $('#spOut').textContent = fmt(gen.speed, 2) + ' U/s';
    $('#gV').textContent = Math.round(gen.speed / 3 * 100) + ' %';
    $('#gF').textContent = fmt(gen.speed * 2, 1) + ' /s';
  };
  $('#spIn').addEventListener('input', updGen); updGen();
  const drawGen = dt => {
    const { ctx, w, h } = fit(genCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const cx = narrow ? w / 2 : w * 0.24, cy = narrow ? h * 0.3 : h / 2, R = narrow ? 52 : Math.min(76, h * 0.3);
    if (gen.on) gen.angle += gen.speed * Math.PI * 2 * dt * (reduced ? 0.3 : 1);
    gen.hist.push(gen.on ? (gen.speed / 3) * Math.sin(gen.angle) : 0); if (gen.hist.length > 400) gen.hist.shift();
    ctx.strokeStyle = C.copper; ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      const sx = cx + side * (R + 16);
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(sx, cy + k * 9, 9, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(gen.angle);
    ctx.fillStyle = C.bad; roundRect(ctx, 0, -12, R - 4, 24, 5); ctx.fill();
    ctx.fillStyle = C.accent; roundRect(ctx, -(R - 4), -12, R - 4, 24, 5); ctx.fill();
    ctx.fillStyle = C.surface; ctx.font = '600 12px Geist Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', R * 0.55, 1); ctx.fillText('S', -R * 0.55, 1);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = C.fg; ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('Spule · Magnet · Spule', cx, cy + R + 30);
    const gx = narrow ? 16 : w * 0.5, gw = narrow ? w - 32 : w * 0.46, gy = narrow ? h * 0.62 : h * 0.15, gh = narrow ? h * 0.32 : h * 0.7;
    const mid = gy + gh / 2;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (const f of [0, 0.25, 0.75, 1]) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * f); ctx.lineTo(gx + gw, gy + gh * f); ctx.stroke(); }
    ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(gx, mid); ctx.lineTo(gx + gw, mid); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('+', gx - 12, gy + 8); ctx.fillText('−', gx - 12, gy + gh); ctx.fillText('Spannung', gx, gy - 6);
    ctx.textAlign = 'right'; ctx.fillText('Zeit →', gx + gw, gy + gh + 16);
    const n = gen.hist.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = gx + gw - (n - 1 - i) * (gw / 399), y = mid - gen.hist[i] * (gh / 2 - 4);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = C.glow; ctx.lineWidth = 2.5; ctx.stroke();
    if (n) { ctx.beginPath(); ctx.arc(gx + gw, mid - gen.hist[n - 1] * (gh / 2 - 4), 4.5, 0, Math.PI * 2); ctx.fillStyle = C.glow; ctx.fill(); }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('strom', 4, {
    wireLock: () => { $('#wireBtn').disabled = false; },
    circLock: () => { $('#uIn').disabled = false; $('#rIn').disabled = false; },
    genLock: () => { $('#spIn').disabled = false; gen.on = true; },
  });

  loop((dt, now) => { drawWire(dt, now); drawCircuit(dt); drawGen(dt); });
})();
