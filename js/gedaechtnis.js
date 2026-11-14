/* mindblow – Lektion Gedächtnis */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pct = x => `${fmt(Math.round(x * 100), 0)} %`;

  /* ---------- Teil 1: Falsche Erinnerung (Wortliste) ---------- */
  const STUDY = ['Bett', 'ruhen', 'müde', 'Traum', 'Kissen', 'gähnen', 'Nacht', 'Decke', 'dösen', 'schnarchen', 'Nickerchen', 'wach'];
  const TEST = [
    { w: 'Bett', was: true }, { w: 'Auto', was: false }, { w: 'Traum', was: true }, { w: 'Schlaf', was: false, lure: true },
    { w: 'Apfel', was: false }, { w: 'Nacht', was: true }, { w: 'Stuhl', was: false }, { w: 'Kissen', was: true },
  ];
  const D = { speed: 1.2, run: 0, answers: {} };
  const show = $('#drmShow');
  $('#drmSpeed').addEventListener('input', e => { D.speed = +e.target.value; $('#drmSpeedOut').textContent = `${fmt(D.speed, 1)} s`; });

  const evaluate = () => {
    let hits = 0, falseAlarm = 0;
    $$('#drmList li').forEach(li => {
      const t = TEST[+li.dataset.i], said = D.answers[li.dataset.i], ok = said === t.was;
      if (ok) hits++;
      if (!t.was && said) falseAlarm++;
      const res = $('.res', li); res.hidden = false;
      if (t.lure) {
        li.classList.add('lure');
        res.innerHTML = said
          ? '<b class="no">Nie gezeigt.</b> Trotzdem hast du es «gesehen». Dein Gehirn hat es ergänzt, weil alle Wörter zu Schlaf passen.'
          : '<b class="ok">Gut aufgepasst.</b> «Schlaf» war nie dabei, obwohl alle Wörter dazu passen.';
      } else res.innerHTML = `<b class="${ok ? 'ok' : 'no'}">${ok ? 'Richtig.' : 'Falsch.'}</b> ${t.was ? 'War in der Liste.' : 'War nicht in der Liste.'}`;
    });
    const lureSaid = D.answers[TEST.findIndex(t => t.lure)];
    $('#drmHits').textContent = `${hits} von ${TEST.length}`;
    $('#drmFalse').textContent = falseAlarm;
    $('#drmLure').textContent = lureSaid ? '«Schlaf»: reingefallen' : '«Schlaf»: erkannt';
    $('#drmStatus').textContent = lureSaid
      ? 'Typisch: In Experimenten mit solchen Listen halten oft mehr als die Hälfte der Leute das Lockwort für gesehen, und viele sind sich dabei ganz sicher.'
      : 'Stark! In Experimenten mit solchen Listen halten oft mehr als die Hälfte der Leute das Lockwort für gesehen. Probier es an jemand anderem aus.';
    $('#drmStart').disabled = false; $('#drmStart').textContent = 'Nochmals'; $('#drmSpeed').disabled = false;
    show.innerHTML = '<span>Auswertung</span><small>Das Lockwort ist markiert. Es kam in der Liste nie vor.</small>';
  };

  const renderTest = () => {
    D.answers = {};
    const list = $('#drmList');
    list.innerHTML = TEST.map((t, i) => `
      <li data-i="${i}">
        <span class="w">${t.w}</span>
        <div class="row"><button data-a="1">war dabei</button><button data-a="0">nicht dabei</button></div>
        <span class="res" hidden></span>
      </li>`).join('');
    list.hidden = false;
    $$('li', list).forEach(li => $$('button', li).forEach(b => b.addEventListener('click', () => {
      D.answers[li.dataset.i] = b.dataset.a === '1';
      $$('button', li).forEach(x => { x.disabled = true; x.classList.toggle('pick', x === b); });
      const n = Object.keys(D.answers).length;
      if (n === TEST.length) evaluate();
      else $('#drmStatus').textContent = `${n} von ${TEST.length} beantwortet.`;
    })));
  };

  const runDrm = async () => {
    const run = ++D.run;
    $('#drmStart').disabled = true; $('#drmSpeed').disabled = true; $('#drmList').hidden = true;
    ['#drmHits', '#drmFalse', '#drmLure'].forEach(s => $(s).textContent = '–');
    $('#drmStatus').textContent = 'Lies jedes Wort aufmerksam.';
    show.innerHTML = '<span>Bereit?</span>'; await wait(900);
    for (let i = 0; i < STUDY.length; i++) {
      if (run !== D.run) return;
      show.innerHTML = `<span>${STUDY[i]}</span><span class="tick">${i + 1} / ${STUDY.length}</span>`;
      await wait(D.speed * 1000);
    }
    $('#drmStatus').textContent = 'Kurze Pause, damit die Wörter nicht mehr frisch im Ohr sind.';
    for (let s = 8; s > 0; s--) {
      if (run !== D.run) return;
      show.innerHTML = `<span class="num">${s}</span><small>Zähle laut in Dreierschritten rückwärts: 100, 97, 94 …</small>`;
      await wait(1000);
    }
    if (run !== D.run) return;
    show.innerHTML = '<span>Welche Wörter waren dabei?</span><small>Entscheide unten bei jedem Wort.</small>';
    $('#drmStatus').textContent = `0 von ${TEST.length} beantwortet.`;
    renderTest();
  };
  $('#drmStart').addEventListener('click', runDrm);

  /* ---------- Teil 2: Ziffernspanne ---------- */
  const sp = { speed: 1, len: 3, best: 0, fails: 0, seq: '', mode: 'idle', chunk: false, run: 0 };
  const spShow = $('#spanShow'), spIn = $('#spanIn');
  const AREA = ['044', '043', '031', '061', '071', '041', '052', '062', '081', '091', '021', '022', '026', '027', '032', '033', '056'];
  const randDigits = n => { let s = ''; while (s.length < n) { const d = String(Math.floor(Math.random() * 10)); if (d !== s[s.length - 1]) s += d; } return s; };
  const updSpan = () => {
    $('#spanLen').textContent = sp.chunk ? '10 (4 Gruppen)' : sp.mode === 'idle' ? '–' : sp.len;
    $('#spanBest').textContent = sp.best ? sp.best : '–';
    $('#spanFails').textContent = sp.mode === 'idle' && !sp.best ? '–' : sp.fails;
  };
  const setBusy = busy => {
    $('#spanStart').disabled = busy; $('#chunkBtn').disabled = busy; $('#spanSpeed').disabled = busy;
  };
  const askInput = () => {
    sp.mode = 'input';
    spShow.innerHTML = '<span class="num">?</span><small>Tippe die Ziffern in der richtigen Reihenfolge ein.</small>';
    spIn.value = ''; spIn.disabled = false; $('#spanCheck').disabled = false;
    spIn.focus({ preventScroll: true });
  };
  const present = async () => {
    const run = ++sp.run;
    sp.mode = 'show'; setBusy(true); spIn.disabled = true; $('#spanCheck').disabled = true; spIn.value = '';
    updSpan();
    spShow.innerHTML = '<span class="tick">Achtung …</span>'; await wait(700);
    if (sp.chunk) {
      const g = [sp.seq.slice(0, 3), sp.seq.slice(3, 6), sp.seq.slice(6, 8), sp.seq.slice(8, 10)];
      for (let i = 0; i < g.length; i++) {
        if (run !== sp.run) return;
        spShow.innerHTML = `<span class="num">${g.slice(0, i + 1).join(' ')}</span>`;
        await wait(sp.speed * 1600);
      }
    } else {
      for (const d of sp.seq) {
        if (run !== sp.run) return;
        spShow.innerHTML = `<span class="num">${d}</span>`;
        await wait(sp.speed * 800);
        if (run !== sp.run) return;
        spShow.innerHTML = '<span class="num">&nbsp;</span>';
        await wait(sp.speed * 200);
      }
    }
    if (run !== sp.run) return;
    askInput();
  };
  const trial = () => { sp.chunk = false; sp.seq = randDigits(sp.len); present(); };
  const check = () => {
    if (sp.mode !== 'input') return;
    const val = spIn.value.replace(/\D/g, '');
    if (!val) return;
    sp.mode = 'wait'; spIn.disabled = true; $('#spanCheck').disabled = true;
    const ok = val === sp.seq;
    const shown = sp.chunk ? `${sp.seq.slice(0, 3)} ${sp.seq.slice(3, 6)} ${sp.seq.slice(6, 8)} ${sp.seq.slice(8)}` : sp.seq.split('').join(' ');
    if (sp.chunk) {
      sp.chunk = false; sp.mode = 'idle'; setBusy(false);
      spShow.innerHTML = `<span class="num">${shown}</span><small>${ok ? 'Geschafft!' : 'Fast.'} Das waren 10 Ziffern, weit über der üblichen Spanne.</small>`;
      $('#spanStatus').textContent = `${ok ? 'Richtig!' : `Du hast ${val} getippt.`} Als Telefonnummer sind es nur 4 Brocken, und die Vorwahl kennst du vielleicht schon. Dieses Bündeln heisst «Chunking».`;
      updSpan(); return;
    }
    if (ok) {
      sp.best = Math.max(sp.best, sp.len); sp.len++; sp.fails = 0;
      spShow.innerHTML = `<span class="num">${shown}</span><small>Richtig!</small>`;
      $('#spanStatus').textContent = `Richtig. Jetzt mit ${sp.len} Ziffern.`;
      updSpan(); setTimeout(trial, 1100);
    } else {
      sp.fails++;
      spShow.innerHTML = `<span class="num">${shown}</span><small>Das wäre richtig gewesen.</small>`;
      if (sp.fails >= 2) {
        sp.mode = 'done'; setBusy(false); $('#spanStart').textContent = 'Nochmals testen';
        $('#spanStatus').textContent = sp.best
          ? `Deine Ziffernspanne: ${sp.best}. Die meisten Menschen schaffen etwa 5 bis 9. Jetzt probier den Telefonnummer-Trick.`
          : 'Schon 3 Ziffern waren knapp. Mit etwas mehr Zeit pro Ziffer klappt es besser. Probier es nochmals.';
        updSpan();
      } else {
        $('#spanStatus').textContent = 'Knapp daneben. Noch ein Versuch mit gleich vielen Ziffern.';
        updSpan(); setTimeout(trial, 1600);
      }
    }
  };
  $('#spanSpeed').addEventListener('input', e => { sp.speed = +e.target.value; $('#spanSpeedOut').textContent = `${fmt(sp.speed, 1)} s`; });
  $('#spanStart').addEventListener('click', () => {
    sp.len = 3; sp.best = 0; sp.fails = 0;
    $('#spanStatus').textContent = 'Merk dir die Ziffern in der richtigen Reihenfolge.';
    trial();
  });
  $('#chunkBtn').addEventListener('click', () => {
    sp.chunk = true; sp.seq = AREA[Math.floor(Math.random() * AREA.length)] + randDigits(7);
    $('#spanStatus').textContent = 'Jetzt 10 Ziffern, aber gruppiert wie eine Telefonnummer.';
    present();
  });
  $('#spanCheck').addEventListener('click', check);
  spIn.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });

  /* ---------- Teil 3: Vergessenskurve ---------- */
  // Vereinfachtes Modell: R = exp(-Δt / S). Jede Wiederholung setzt R auf 100 % und macht S grösser,
  // umso mehr, je mehr bis dahin schon vergessen war (darum wirkt Wiederholen mit Abstand stärker).
  const S0 = 2.5, DAYS = 30, STEPS = 300;
  const curveCv = $('#curveCv');
  const V = { revs: [], unlocked: false, pts: [], base: [], shown: [] };
  const sim = revs => {
    const r = [...revs].sort((a, b) => a - b), pts = [];
    let S = S0, last = 0, i = 0;
    for (let k = 0; k <= STEPS; k++) {
      const t = k / STEPS * DAYS;
      while (i < r.length && r[i] <= t + 1e-9) {
        const R = Math.exp(-(r[i] - last) / S);
        S *= 1.5 + 3 * (1 - R); last = r[i]; i++;
      }
      pts.push(Math.exp(-(t - last) / S));
    }
    return pts;
  };
  V.base = sim([]);
  const updCurve = () => {
    V.pts = sim(V.revs);
    if (!V.shown.length) V.shown = V.pts.slice();
    $('#revKeep').textContent = pct(V.pts[STEPS]);
    $('#revCount').textContent = V.revs.length;
    $('#revNone').textContent = `${pct(V.base[STEPS / DAYS])} → ${pct(V.base[STEPS])}`;
    const has = V.revs.includes(+$('#revDay').value);
    $('#revAdd').textContent = has ? 'Wiederholung entfernen' : 'Wiederholung setzen';
  };
  const toggleDay = d => {
    d = Math.max(1, Math.min(DAYS - 1, Math.round(d)));
    V.revs = V.revs.includes(d) ? V.revs.filter(x => x !== d) : [...V.revs, d].sort((a, b) => a - b);
    updCurve();
    $('#revStatus').textContent = V.revs.length
      ? `Wiederholt an Tag ${V.revs.join(', ')}. Nach 30 Tagen bleiben im Modell ${pct(V.pts[STEPS])}.`
      : 'Keine Wiederholungen gesetzt.';
  };
  const setPlan = (days, text) => { V.revs = days.slice(); updCurve(); $('#revStatus').textContent = `${text} Nach 30 Tagen bleiben im Modell ${pct(V.pts[STEPS])}.`; };
  $('#revDay').addEventListener('input', e => { $('#revDayOut').textContent = `Tag ${e.target.value}`; updCurve(); });
  $('#revAdd').addEventListener('click', () => toggleDay(+$('#revDay').value));
  $('#revSmart').addEventListener('click', () => setPlan([1, 3, 7, 14], 'Vier Wiederholungen mit wachsendem Abstand.'));
  $('#revCram').addEventListener('click', () => setPlan([1, 2, 3, 4], 'Vier Wiederholungen dicht hintereinander. Vergleiche mit «Mit Abstand».'));
  $('#revClear').addEventListener('click', () => { V.revs = []; updCurve(); $('#revStatus').textContent = 'Alle Wiederholungen gelöscht.'; });
  updCurve();

  const plot = { l: 44, r: 14, t: 18, b: 34 };
  curveCv.addEventListener('click', e => {
    if (!V.unlocked) return;
    const r = curveCv.getBoundingClientRect();
    const day = (e.clientX - r.left - plot.l) / (r.width - plot.l - plot.r) * DAYS;
    if (day < 0.5 || day > DAYS - 0.5) return;
    toggleDay(day);
  });

  const drawCurve = dt => {
    const k = reduced ? 1 : Math.min(1, dt * 9);
    for (let i = 0; i <= STEPS; i++) V.shown[i] += (V.pts[i] - V.shown[i]) * k;
    const { ctx, w, h } = fit(curveCv);
    ctx.clearRect(0, 0, w, h);
    const pw = w - plot.l - plot.r, ph = h - plot.t - plot.b;
    const X = t => plot.l + t / DAYS * pw, Y = r => plot.t + (1 - r) * ph;
    // Raster
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const r of [0, .5, 1]) {
      ctx.beginPath(); ctx.moveTo(plot.l, Y(r)); ctx.lineTo(plot.l + pw, Y(r)); ctx.stroke();
      ctx.fillText(`${r * 100} %`, plot.l - 6, Y(r));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const step = w < 420 ? 10 : 5;
    for (let d = 0; d <= DAYS; d += step) ctx.fillText(d, X(d), h - plot.b + 16);
    ctx.fillText('Tage nach dem Lernen', plot.l + pw / 2, h - 6);
    // Wiederholungen
    for (const d of V.revs) {
      ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(X(d), Y(0)); ctx.lineTo(X(d), Y(1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.glow; ctx.beginPath(); ctx.arc(X(d), Y(1), 4, 0, Math.PI * 2); ctx.fill();
    }
    // Ohne Wiederholen
    ctx.beginPath();
    V.base.forEach((r, i) => { const x = X(i / STEPS * DAYS), y = Y(r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    // Mit Wiederholungen
    if (V.revs.length) {
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      V.shown.forEach((r, i) => ctx.lineTo(X(i / STEPS * DAYS), Y(r)));
      ctx.lineTo(X(DAYS), Y(0)); ctx.closePath();
      ctx.fillStyle = C.copper; ctx.globalAlpha = .13; ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath();
      V.shown.forEach((r, i) => { const x = X(i / STEPS * DAYS), y = Y(r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = C.copper; ctx.lineWidth = 2.5; ctx.stroke();
      const end = V.shown[STEPS];
      ctx.fillStyle = C.copper; ctx.beginPath(); ctx.arc(X(DAYS), Y(end), 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'right'; ctx.font = '500 12px Geist Mono, monospace'; ctx.fillStyle = C.fg;
      ctx.fillText(pct(end), X(DAYS) - 8, Math.max(plot.t + 12, Y(end) - 8));
    }
    // Beschriftung
    ctx.textAlign = 'right'; ctx.font = '11px Geist Mono, monospace'; ctx.fillStyle = C.muted;
    ctx.fillText('gestrichelt: ohne Wiederholen', plot.l + pw, plot.t - 6);
    if (V.unlocked && !V.revs.length) {
      ctx.fillStyle = C.fg; ctx.textAlign = 'center';
      ctx.fillText('Tippe auf einen Tag, um zu wiederholen', plot.l + pw / 2 + 10, plot.t + ph * .3);
    }
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('gedaechtnis', 4, {
    drmLock: () => { $('#drmStart').disabled = false; $('#drmSpeed').disabled = false; },
    spanLock: () => { setBusy(false); },
    curveLock: () => {
      V.unlocked = true; curveCv.style.cursor = 'crosshair';
      ['#revDay', '#revAdd', '#revSmart', '#revCram', '#revClear'].forEach(s => $(s).disabled = false);
    },
  });

  loop(dt => drawCurve(dt));
})();
