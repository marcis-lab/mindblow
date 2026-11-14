/* mindblow – Lektion Internet */
(() => {
  const { $, $$, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const SLOW = 10; // Animation 10x langsamer als echt

  /* ---------- Teil 1: Seekabel vs Satellit ---------- */
  const pingCv = $('#pingCv');
  const ping = { runs: [] }; // {kind, t0, dur}
  const RTT = { fiber: 70, sat: 480 }; // Millisekunden, hin und zurück

  const polyLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const pointOn = (pts, f) => {
    let d = f * polyLen(pts);
    for (let i = 1; i < pts.length; i++) {
      const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= s) { const k = s ? d / s : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
      d -= s;
    }
    return pts[pts.length - 1];
  };
  const startPing = kind => {
    ping.runs = ping.runs.filter(r => r.kind !== kind);
    ping.runs.push({ kind, t0: performance.now(), dur: RTT[kind] * SLOW });
    $(kind === 'fiber' ? '#tFiber' : '#tSat').textContent = '0 ms';
  };
  $('#pingFiber').addEventListener('click', () => startPing('fiber'));
  $('#pingSat').addEventListener('click', () => startPing('sat'));
  $('#pingBoth').addEventListener('click', () => { startPing('fiber'); startPing('sat'); });

  const drawPing = now => {
    const { ctx, w, h } = fit(pingCv);
    ctx.clearRect(0, 0, w, h);
    const ground = h * 0.66, E = w * 1.6, ecx = w / 2, ecy = ground + E;
    const surf = x => ecy - Math.sqrt(E * E - (x - ecx) ** 2);
    // Erde
    ctx.beginPath(); ctx.arc(ecx, ecy, E, 0, Math.PI * 2); ctx.fillStyle = C.sunk; ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    // Ozean
    const oA = w * 0.24, oB = w * 0.78;
    ctx.beginPath();
    for (let x = oA; x <= oB; x += 4) { const y = surf(x); x === oA ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    for (let x = oB; x >= oA; x -= 4) ctx.lineTo(x, surf(x) + 34);
    ctx.closePath(); ctx.fillStyle = C.fiber; ctx.globalAlpha = .18; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText('Atlantik', w / 2, surf(w / 2) + 20);
    // Kabelweg
    const zx = w * 0.09, nx = w * 0.91;
    const cable = [];
    for (let x = zx; x <= nx; x += 6) {
      let depth = 0;
      if (x > oA - 10 && x < oB + 10) depth = 30 * Math.min(1, (x - (oA - 10)) / 30, ((oB + 10) - x) / 30);
      cable.push([x, surf(x) + 2 + depth]);
    }
    ctx.beginPath(); cable.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = C.fiber; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = C.fiber; ctx.textAlign = 'left'; ctx.fillText('Seekabel (Glasfaser)', w * 0.3, surf(w * 0.3) + 50);
    // Satellit
    const sat = [w / 2, h * 0.12];
    const zP = [zx, surf(zx) - 6], nP = [nx, surf(nx) - 6];
    const satPath = [zP, sat, nP];
    ctx.setLineDash([4, 6]); ctx.strokeStyle = C.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(...zP); ctx.lineTo(...sat); ctx.lineTo(...nP); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.glow; ctx.fillRect(sat[0] - 7, sat[1] - 7, 14, 14);
    ctx.fillRect(sat[0] - 26, sat[1] - 3, 16, 6); ctx.fillRect(sat[0] + 10, sat[1] - 3, 16, 6);
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    ctx.fillText("Satellit · 35'786 km hoch", sat[0], sat[1] - 16);
    ctx.fillText('(nicht massstabsgetreu, in echt viel höher)', sat[0], sat[1] + 24);
    // Städte
    for (const [p, name] of [[zP, 'Zürich'], [nP, 'New York']]) {
      ctx.beginPath(); ctx.arc(p[0], p[1] + 4, 6, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
      ctx.fillStyle = C.fg; ctx.font = '600 12px Geist Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(name, p[0] + (name === 'Zürich' ? 14 : -14), p[1] - 12);
    }
    ctx.font = '11px Geist Mono, monospace';
    // Pakete
    for (const r of ping.runs) {
      const el = now - r.t0, f = Math.min(1, el / r.dur);
      const path = r.kind === 'fiber' ? cable : satPath;
      const pos = f < 0.5 ? pointOn(path, f * 2) : pointOn(path, 2 - f * 2);
      ctx.beginPath(); ctx.arc(pos[0], pos[1], 6, 0, Math.PI * 2);
      ctx.fillStyle = r.kind === 'fiber' ? C.fiber : C.glow; ctx.fill();
      ctx.strokeStyle = C.surface; ctx.lineWidth = 2; ctx.stroke();
      const ms = Math.round(Math.min(el, r.dur) / SLOW);
      $(r.kind === 'fiber' ? '#tFiber' : '#tSat').textContent = (f >= 1 ? '≈ ' : '') + ms + ' ms';
    }
    ping.runs = ping.runs.filter(r => now - r.t0 < r.dur + 600);
  };

  /* ---------- Teil 2: Päckchen im Netz ---------- */
  const netCv = $('#netCv');
  const N = [
    { x: .05, y: .5, label: 'Du', end: true }, { x: .95, y: .5, label: 'Ziel', end: true },
    { x: .24, y: .18 }, { x: .24, y: .82 }, { x: .45, y: .5 }, { x: .55, y: .14 }, { x: .55, y: .86 }, { x: .76, y: .3 }, { x: .76, y: .7 },
  ];
  const E = [[0, 2], [0, 3], [2, 4], [3, 4], [2, 5], [3, 6], [4, 5], [4, 6], [5, 7], [6, 8], [4, 7], [4, 8], [7, 8], [7, 1], [8, 1]].map(([a, b]) => ({ a, b, cut: false }));
  const MSG = 'MINDBLOW';
  const net = { packets: [], arrived: [], unlocked: false, launched: 0 };
  let geo = { pad: 30, w: 0, h: 0 };
  const P = i => [geo.pad + N[i].x * (geo.w - geo.pad * 2), geo.pad + 10 + N[i].y * (geo.h - geo.pad * 2 - 20)];

  const slots = $('#slots');
  MSG.split('').forEach((c, i) => { const s = document.createElement('div'); s.className = 'slot'; s.innerHTML = `<small>${i + 1}</small><span></span>`; slots.appendChild(s); });

  const route = () => {
    const dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false);
    dist[0] = 0;
    for (;;) {
      let u = -1; for (let i = 0; i < N.length; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true; if (u === 1) break;
      for (const e of E) {
        if (e.cut) continue;
        const v = e.a === u ? e.b : e.b === u ? e.a : -1; if (v < 0) continue;
        const wgt = Math.hypot(N[u].x - N[v].x, N[u].y - N[v].y) * (0.5 + Math.random() * 1.4);
        if (dist[u] + wgt < dist[v]) { dist[v] = dist[u] + wgt; prev[v] = u; }
      }
    }
    if (dist[1] === Infinity) return null;
    const path = []; for (let v = 1; v >= 0; v = prev[v]) path.unshift(v);
    return path;
  };

  const send = () => {
    net.packets = []; net.arrived = []; net.launched = 0;
    $$('.slot', slots).forEach(s => { s.classList.remove('filled'); s.querySelector('span').textContent = ''; });
    $('#arrival').textContent = 'Unterwegs …';
    $('#netStatus').textContent = 'Jeder Router entscheidet selbst, wohin er das Päckchen weiterschickt.';
    MSG.split('').forEach((ch, i) => {
      net.packets.push({ i, ch, path: null, seg: 0, t: 0, wait: i * 0.15, speed: 170 + Math.random() * 170, state: 'waiting' });
    });
  };
  $('#netSend').addEventListener('click', send);
  $('#netHeal').addEventListener('click', () => { E.forEach(e => e.cut = false); $('#netStatus').textContent = 'Alle Leitungen sind wieder intakt.'; });

  netCv.addEventListener('click', ev => {
    if (!net.unlocked) return;
    const r = netCv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    let best = null, bd = 14;
    for (const e of E) {
      const [ax, ay] = P(e.a), [bx, by] = P(e.b);
      const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
      if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      best.cut = !best.cut;
      const n = E.filter(e => e.cut).length;
      $('#netStatus').textContent = best.cut ? `Leitung gekappt (${n} defekt). Sende nochmals und schau, was passiert.` : 'Leitung repariert.';
    }
  });

  const finishCheck = () => {
    const total = net.packets.length;
    const lost = net.packets.filter(p => p.state === 'lost').length;
    const arrived = net.arrived.length;
    if (arrived + lost < total) return;
    const ordered = net.arrived.every((v, k) => k === 0 || v > net.arrived[k - 1]);
    const st = $('#netStatus');
    if (lost === total) st.textContent = 'Kein einziger Weg mehr frei. Das Ziel ist vom Netz abgeschnitten. Repariere eine Leitung.';
    else if (lost) st.textContent = `${lost} Päckchen fanden keinen Weg. Im echten Internet merkt das Ziel, dass Nummern fehlen, und bittet um eine neue Kopie.`;
    else if (!ordered) st.textContent = 'Die Päckchen kamen durcheinander an, und trotzdem stimmt die Nachricht. Die Nummern machen es möglich.';
    else st.textContent = 'Diesmal kamen alle der Reihe nach an. Sende nochmals oder kappe Leitungen.';
  };

  const stepNet = dt => {
    for (const p of net.packets) {
      if (p.state === 'waiting') {
        p.wait -= dt;
        if (p.wait <= 0) {
          p.path = route();
          if (!p.path) { p.state = 'lost'; finishCheck(); }
          else p.state = 'moving';
        }
      } else if (p.state === 'hop') {
        p.wait -= dt; if (p.wait <= 0) p.state = 'moving';
      } else if (p.state === 'moving') {
        const [ax, ay] = P(p.path[p.seg]), [bx, by] = P(p.path[p.seg + 1]);
        const L = Math.hypot(bx - ax, by - ay) || 1;
        p.t += (p.speed * (reduced ? 3 : 1)) * dt / L;
        if (p.t >= 1) {
          p.t = 0; p.seg++;
          if (p.seg >= p.path.length - 1) {
            p.state = 'done'; net.arrived.push(p.i);
            const s = slots.children[p.i]; s.classList.add('filled'); s.querySelector('span').textContent = p.ch;
            $('#arrival').textContent = 'Ankunftsreihenfolge: ' + net.arrived.map(n => n + 1).join(' · ');
            finishCheck();
          } else { p.state = 'hop'; p.wait = Math.random() * 0.25; p.speed = 170 + Math.random() * 170; }
        }
      }
    }
  };

  const drawNet = dt => {
    const { ctx, w, h } = fit(netCv);
    geo.w = w; geo.h = h; geo.pad = w < 420 ? 22 : 34;
    ctx.clearRect(0, 0, w, h);
    stepNet(dt);
    // Leitungen
    for (const e of E) {
      const [ax, ay] = P(e.a), [bx, by] = P(e.b);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      if (e.cut) { ctx.setLineDash([5, 6]); ctx.strokeStyle = C.bad; ctx.lineWidth = 2; }
      else { ctx.setLineDash([]); ctx.strokeStyle = C.line; ctx.lineWidth = 4; }
      ctx.stroke(); ctx.setLineDash([]);
      if (e.cut) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        ctx.strokeStyle = C.bad; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(mx - 6, my - 6); ctx.lineTo(mx + 6, my + 6); ctx.moveTo(mx + 6, my - 6); ctx.lineTo(mx - 6, my + 6); ctx.stroke();
      }
    }
    // Knoten
    N.forEach((n, i) => {
      const [x, y] = P(i);
      ctx.beginPath(); ctx.arc(x, y, n.end ? 15 : 10, 0, Math.PI * 2);
      ctx.fillStyle = n.end ? C.accent : C.surface; ctx.fill();
      ctx.strokeStyle = n.end ? C.accent : C.fg; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(n.label || 'Router', x, y + (n.end ? 32 : 26));
    });
    // Päckchen
    for (const p of net.packets) {
      if (p.state !== 'moving' && p.state !== 'hop') continue;
      const [ax, ay] = P(p.path[p.seg]), [bx, by] = P(p.path[Math.min(p.seg + 1, p.path.length - 1)]);
      const x = ax + (bx - ax) * p.t, y = ay + (by - ay) * p.t;
      ctx.fillStyle = C.glow; roundRect(ctx, x - 10, y - 10, 20, 20, 5); ctx.fill();
      ctx.fillStyle = '#14163A'; ctx.font = '600 11px Geist Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.i + 1), x, y + 1); ctx.textBaseline = 'alphabetic';
    }
  };

  /* ---------- Teil 3: DNS ---------- */
  const DB = {
    'srf.ch': { tld: '.ch', reg: 'der Stiftung SWITCH in Zürich', ip: '203.0.113.42' },
    'wikipedia.org': { tld: '.org', reg: 'der Public Interest Registry in den USA', ip: '198.51.100.7' },
    'sbb.ch': { tld: '.ch', reg: 'der Stiftung SWITCH in Zürich', ip: '203.0.113.88' },
  };
  const cache = new Set();
  let busy = false;
  const domainBtns = $$('#domains button');
  const runDns = d => {
    if (busy) return; busy = true;
    domainBtns.forEach(b => { b.disabled = true; b.classList.toggle('active', b.dataset.d === d); });
    const info = DB[d], list = $('#dnsSteps');
    let steps;
    if (cache.has(d)) {
      steps = [
        ['Du', `Wo finde ich ${d}?`, ''],
        ['Resolver', `Kenne ich schon: <span class="ip">${info.ip}</span>`, '≈ 1 ms'],
        ['Du', `Verbinde mit <span class="ip">${info.ip}</span> ✓`, ''],
      ];
    } else {
      steps = [
        ['Du', `Wo finde ich ${d}?`, ''],
        ['Resolver', 'Steht nicht in meinem Speicher. Ich frage nach.', '2 ms'],
        ['Root', `Für ${info.tld} frag den zuständigen Server.`, '18 ms'],
        [info.tld, `Betrieben von ${info.reg}. Frag den Server von ${d}.`, '12 ms'],
        [d, `Meine Nummer ist <span class="ip">${info.ip}</span>.`, '15 ms'],
        ['Du', `Verbinde mit <span class="ip">${info.ip}</span> ✓`, ''],
      ];
    }
    list.innerHTML = steps.map(([who, what, ms]) => `<li><span class="who">${who}</span><span class="what">${what}</span><span class="ms">${ms}</span></li>`).join('');
    const lis = [...list.children];
    $('#dnsStatus').textContent = cache.has(d) ? 'Zweite Anfrage: Der Resolver hat sich die Antwort gemerkt.' : 'Die Anfrage wandert von Server zu Server …';
    lis.forEach((li, k) => setTimeout(() => {
      li.classList.add('on');
      if (k === lis.length - 1) {
        if (cache.has(d)) { $('#dSecond').textContent = '≈ 1 ms'; $('#dnsStatus').textContent = 'Fast 50-mal schneller, weil sich der Resolver die Nummer gemerkt hat. Das nennt man Cache.'; }
        else { $('#dFirst').textContent = '≈ 47 ms'; $('#dnsStatus').textContent = 'Geschafft. Tippe dieselbe Adresse nochmals an.'; cache.add(d); }
        busy = false; domainBtns.forEach(b => b.disabled = false);
      }
    }, reduced ? 0 : k * 650));
  };
  domainBtns.forEach(b => b.addEventListener('click', () => runDns(b.dataset.d)));

  /* ---------- Lektion verdrahten ---------- */
  lesson('internet', 4, {
    pingLock: () => { ['#pingFiber', '#pingSat', '#pingBoth'].forEach(s => $(s).disabled = false); },
    netLock: () => { net.unlocked = true; $('#netSend').disabled = false; $('#netHeal').disabled = false; netCv.style.cursor = 'pointer'; },
    dnsLock: () => { domainBtns.forEach(b => b.disabled = false); $('#dnsStatus').textContent = 'Wähle eine Adresse.'; },
  });

  loop((dt, now) => { drawPing(now); drawNet(dt); });
})();
