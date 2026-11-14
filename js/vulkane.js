/* mindblow – Lektion Vulkane */
(() => {
  const { $, C, fit, roundRect, reduced, fmt, lesson, loop } = MB;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const MONO = 'Geist Mono, monospace';
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // bewusst feste Farben: Meer, Land, Gestein, Lava, Asche
  const SEA = 'rgba(52, 110, 200, .22)', SEA2 = 'rgba(52, 110, 200, .34)';
  const LAND = '#8f9b5e', LAND_EDGE = '#6c7744';
  const ROCK = '#6f6158', ROCK2 = '#5a4d45';
  const LAVA = '#ff6a1f', LAVA_HOT = '#ffc24a', LAVA_DARK = '#b8410f';
  const ASH = '128, 122, 116';
  const MANTLE = 'rgba(200, 110, 60, .20)';

  /* ---------- Teil 1: Der Atlantik öffnet sich ---------- */
  const plateCv = $('#plateCv');
  // Stark vereinfachte Umrisse in Längen- und Breitengraden
  const SHAPES = {
    na: [[-165, 64], [-150, 70], [-125, 71], [-100, 70], [-85, 69], [-80, 63], [-90, 58], [-80, 52], [-72, 58], [-62, 57], [-56, 52], [-60, 47], [-66, 44], [-71, 41], [-76, 37], [-81, 31], [-80, 26], [-82, 25], [-84, 30], [-90, 29], [-97, 27], [-98, 21], [-94, 18], [-88, 21], [-87, 16], [-83, 11], [-79, 8], [-84, 9], [-92, 14], [-100, 17], [-106, 22], [-112, 30], [-117, 33], [-124, 40], [-125, 49], [-133, 56], [-145, 60], [-158, 58], [-165, 61]],
    gl: [[-54, 61], [-44, 60], [-36, 65], [-22, 70], [-20, 77], [-28, 82], [-50, 82], [-65, 79], [-58, 74], [-54, 68]],
    sa: [[-79, 8], [-75, 11], [-70, 12], [-62, 10], [-55, 6], [-50, 2], [-44, -2], [-35, -6], [-36, -12], [-39, -17], [-41, -23], [-48, -27], [-53, -34], [-58, -38], [-62, -40], [-65, -45], [-67, -50], [-69, -55], [-73, -52], [-74, -45], [-73, -36], [-71, -28], [-70, -18], [-76, -14], [-81, -6], [-80, 0], [-78, 4]],
    eu: [[-9, 37], [-9, 43], [-2, 43.5], [-4, 48], [-1, 49.5], [3, 51], [8, 54], [8, 57], [11, 58], [5, 59], [6, 62], [12, 66], [18, 70], [26, 71], [33, 70], [42, 67], [50, 68], [60, 70], [60, 42], [48, 42], [40, 41], [29, 41], [26, 38], [23, 37], [21, 39], [19, 41], [16, 40], [16, 38], [13, 41], [10, 44], [6, 43], [3, 43], [0, 39], [-2, 37], [-6, 36]],
    uk: [[-5, 50], [1, 51], [2, 53], [-1, 55], [-2, 57.5], [-5, 58.5], [-6, 56], [-4, 54], [-5, 52]],
    af: [[-17, 15], [-17, 21], [-13, 27], [-10, 30], [-6, 35], [3, 37], [10, 37], [11, 34], [20, 31], [30, 31], [33, 29], [37, 22], [43, 12], [51, 12], [48, 5], [41, -2], [40, -10], [41, -15], [35, -24], [32, -29], [27, -34], [20, -35], [18, -31], [15, -26], [12, -17], [13, -9], [9, -1], [9, 4], [5, 5], [-4, 5], [-8, 4], [-13, 8], [-16, 11]],
  };
  const NAMES = { na: ['Nordamerika', 'N-Amerika'], sa: ['Südamerika', 'S-Amerika'], eu: ['Europa', 'Europa'], af: ['Afrika', 'Afrika'] };
  const LABEL_AT = { na: [-100, 45], sa: [-58, -12], eu: [30, 55], af: [20, 8] };
  // Verschiebung (in Grad) vor 200 Mio. Jahren, als Pangäa noch zusammenhing (vereinfacht)
  const OFF = { na: [34, -4], gl: [17, -3], eu: [-10, 0], uk: [-10, 0], af: [-10, 0], sa: [24, 5] };
  const RIDGE = [[-3, 76], [-12, 71], [-18, 65], [-28, 58], [-32, 50], [-36, 42], [-40, 33], [-44, 24], [-44, 15], [-36, 8], [-24, 2], [-14, -3], [-13, -12], [-14, -22], [-14, -32], [-15, -42], [-10, -52]];
  const PL = { age: 0, play: false };
  const offsetOf = (k, age) => {
    // Nordatlantik öffnet sich ab 200 Mio. Jahren, der Südatlantik erst ab rund 130 Mio. Jahren (vereinfacht)
    const gN = clamp(age / 200, 0, 1), gS = clamp(age / 130, 0, 1);
    if (k === 'sa') return [OFF.af[0] * gN + (OFF.sa[0] - OFF.af[0]) * gS, OFF.af[1] * gN + (OFF.sa[1] - OFF.af[1]) * gS];
    return [OFF[k][0] * gN, OFF[k][1] * gN];
  };
  const lifeOf = a => a < .5 ? 'Menschen' : a < 65.5 ? 'Säugetiere, Vögel' : a < 66.5 ? 'Dinos sterben aus' : 'Dinosaurier';
  const updPlate = () => {
    const a = PL.age;
    $('#ageIn').value = Math.round(-a);
    const txt = a < .5 ? 'heute' : `vor ${fmt(a, 0)} Mio. J.`;
    $('#ageOut').textContent = txt; $('#plAge').textContent = txt;
    $('#plDist').textContent = `${fmt(Math.round(5400 * (1 - a / 200) / 10) * 10, 0)} km`;
    $('#plLife').textContent = lifeOf(a);
  };
  const plMsg = () => {
    const a = PL.age;
    $('#plateStatus').textContent = a > 195 ? 'Pangäa: Alle Kontinente hängen zusammen. Einen Atlantik gibt es noch nicht (stark vereinfacht).'
      : a > 130 ? 'Zwischen Nordamerika und Afrika reisst die Erde auf. Südamerika hängt noch an Afrika.'
      : a > 60 ? 'Jetzt öffnet sich auch der Südatlantik. In der Mitte entsteht laufend neuer Meeresboden.'
      : a > 15 ? 'Der Atlantik wird breiter und breiter. Die rote Linie ist der Mittelatlantische Rücken: Dort wächst der Meeresboden.'
      : 'Heute: Der Atlantik wächst immer noch, um rund 2 bis 3 cm pro Jahr. Auf dem Rücken liegt Island.';
  };
  $('#ageIn').addEventListener('input', e => { PL.age = -e.target.value; PL.play = false; $('#plPlay').textContent = 'Abspielen'; updPlate(); plMsg(); });
  $('#plPlay').addEventListener('click', () => {
    PL.play = !PL.play;
    if (PL.play && PL.age < 1) PL.age = 200;
    $('#plPlay').textContent = PL.play ? 'Anhalten' : 'Abspielen';
    if (reduced && PL.play) { PL.age = 0; PL.play = false; $('#plPlay').textContent = 'Abspielen'; }
    updPlate(); plMsg();
  });
  $('#plPang').addEventListener('click', () => { PL.age = 200; PL.play = false; $('#plPlay').textContent = 'Abspielen'; updPlate(); plMsg(); });
  $('#plNow').addEventListener('click', () => { PL.age = 0; PL.play = false; $('#plPlay').textContent = 'Abspielen'; updPlate(); plMsg(); });
  updPlate();

  const drawPlate = dt => {
    if (PL.play) {
      PL.age -= dt * 20;
      if (PL.age <= 0) { PL.age = 0; PL.play = false; $('#plPlay').textContent = 'Abspielen'; }
      updPlate(); plMsg();
    }
    const { ctx, w, h } = fit(plateCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const L0 = -128, L1 = 62, B0 = 80, B1 = -58;
    const top = 30, bot = 8;
    const sc = Math.min((w - 16) / (L1 - L0), (h - top - bot) / (B0 - B1));
    const ox = (w - sc * (L1 - L0)) / 2, oy = top + (h - top - bot - sc * (B0 - B1)) / 2;
    const X = lon => ox + (lon - L0) * sc, Y = lat => oy + (B0 - lat) * sc;
    const a = PL.age;

    // Meer
    roundRect(ctx, X(L0), Y(B0), (L1 - L0) * sc, (B0 - B1) * sc, 10); ctx.fillStyle = SEA; ctx.fill();
    ctx.save(); roundRect(ctx, X(L0), Y(B0), (L1 - L0) * sc, (B0 - B1) * sc, 10); ctx.clip();

    // Mittelatlantischer Rücken: liegt in der Mitte zwischen den Kontinenten
    const midOff = lat => {
      const n = (offsetOf('na', a)[0] + offsetOf('eu', a)[0]) / 2, s = (offsetOf('sa', a)[0] + offsetOf('af', a)[0]) / 2;
      const k = clamp((lat - 0) / 12, 0, 1);
      return lerp(s, n, k);
    };
    const openN = a < 199, openS = a < 129;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.setLineDash([5, 3]);
    ctx.beginPath(); let pen = false;
    for (const [lon, lat] of RIDGE) {
      const show = lat > 8 ? openN : openS;
      if (!show) { pen = false; continue; }
      const x = X(lon + midOff(lat)), y = Y(lat);
      pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
    }
    ctx.stroke(); ctx.setLineDash([]);

    // Kontinente
    for (const k of ['na', 'gl', 'sa', 'eu', 'uk', 'af']) {
      const [dx, dy] = offsetOf(k, a);
      ctx.beginPath();
      SHAPES[k].forEach(([lon, lat], i) => { const x = X(lon + dx), y = Y(lat + dy); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fillStyle = LAND; ctx.fill(); ctx.strokeStyle = LAND_EDGE; ctx.lineWidth = 1; ctx.stroke();
    }
    // Island entsteht auf dem Rücken (jünger als rund 16 Mio. Jahre)
    if (a < 16) {
      const r = sc * 2.6 * (1 - a / 16);
      ctx.beginPath(); ctx.ellipse(X(-18 + midOff(65)), Y(65), r * 1.4, r * .8, 0, 0, TAU);
      ctx.fillStyle = LAND; ctx.fill(); ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5; ctx.stroke();
      if (a < 4) {
        ctx.fillStyle = C.fg; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'left';
        ctx.fillText('Island', X(-18 + midOff(65)) + r * 1.4 + 4, Y(65) + 4);
      }
    }
    // Schweiz
    const [ex, ey] = offsetOf('eu', a);
    const sx = X(8 + ex), sy = Y(47 + ey);
    ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, TAU); ctx.fillStyle = C.bad; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('CH', sx + 5, sy - 3);

    // Namen
    ctx.textAlign = 'center'; ctx.font = `500 ${narrow ? 10 : 12}px ${MONO}`; ctx.fillStyle = '#ffffff';
    for (const k in LABEL_AT) {
      const [dx, dy] = offsetOf(k, a), [lon, lat] = LABEL_AT[k];
      ctx.fillText(NAMES[k][narrow ? 1 : 0], X(lon + dx), Y(lat + dy));
    }
    if (a < 120) {
      ctx.globalAlpha = clamp((120 - a) / 40, 0, 1);
      ctx.fillStyle = C.fg; ctx.font = `${narrow ? 10 : 12}px ${MONO}`;
      ctx.fillText('Atlantik', X(-42 + midOff(30)), Y(30) + (narrow ? 2 : 0));
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Kopfzeile
    ctx.font = `500 ${narrow ? 11 : 12}px ${MONO}`; ctx.fillStyle = C.fg; ctx.textAlign = 'left';
    ctx.fillText(a < .5 ? 'heute' : `vor ${fmt(a, 0)} Mio. Jahren`, 10, 19);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'stark vereinfacht' : 'Karte stark vereinfacht', w - 10, 19);
    // Legende Rücken
    if (openN) {
      const lx = narrow ? w - 10 : w - 180;
      if (!narrow) {
        ctx.textAlign = 'left'; ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(lx, h - 14); ctx.lineTo(lx + 18, h - 14); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.fg; ctx.fillText('neuer Meeresboden', lx + 24, h - 10);
      }
    }
  };

  /* ---------- Teil 2: Hotspot und Inselkette ---------- */
  const hotCv = $('#hotCv');
  const VIEW = 2000;            // sichtbare Breite in km
  const SEA_KM = 5;             // Meerestiefe in km (vereinfacht)
  const HS = { v: 8, t: 0, len: 0, count: 0, run: true, vol: [], flow: 0 };
  const hsReset = () => { HS.t = 0; HS.len = 0; HS.count = 1; HS.vol = [{ x: 0, H: .3, t0: 0 }]; updHot(); };
  const updHot = () => {
    $('#spdIn').value = HS.v; $('#spdOut').textContent = `${HS.v} cm / Jahr`;
    $('#hsTime').textContent = `${fmt(HS.t, 1)} Mio. J.`;
    $('#hsLen').textContent = `${fmt(Math.round(HS.len / 10) * 10, 0)} km`;
    $('#hsCount').textContent = String(HS.count);
    $('#hsCount2').textContent = `davon über Wasser: ${HS.vol.filter(v => v.H > SEA_KM).length}`;
  };
  const hsStep = dm => {                    // dm: vergangene Millionen Jahre
    const km = HS.v * 10 * dm;              // 1 cm pro Jahr = 10 km pro Mio. Jahre
    HS.t += dm; HS.len += km;
    for (const v of HS.vol) {
      v.x -= km;
      const near = Math.exp(-(v.x * v.x) / (2 * 45 * 45));
      if (near > .05) v.H += 16 * near * Math.max(0, 1 - v.H / 10.5) * dm;
      else v.H = Math.max(0, v.H - .26 * dm);
    }
    const last = HS.vol[HS.vol.length - 1];
    if (!last || last.x < -100) { HS.vol.push({ x: 0, H: .1, t0: HS.t }); HS.count++; }
    HS.vol = HS.vol.filter(v => v.x > -VIEW * 1.1);
  };
  $('#spdIn').addEventListener('input', e => {
    HS.v = +e.target.value; updHot();
    $('#hotStatus').textContent = HS.v <= 5
      ? 'Langsame Platte: Jeder Vulkan bleibt lange über dem Hotspot und wird riesig.'
      : HS.v >= 11 ? 'Schnelle Platte: Die Vulkane gleiten rasch weiter und bleiben klein. Manche schaffen es kaum über das Meer.'
      : 'Die Pazifische Platte bei Hawaii wandert rund 7 bis 10 cm pro Jahr nach Nordwesten.';
  });
  $('#hsPlay').addEventListener('click', () => { HS.run = !HS.run; $('#hsPlay').textContent = HS.run ? 'Pause' : 'Weiter'; });
  $('#hsReset').addEventListener('click', () => { hsReset(); HS.run = true; $('#hsPlay').textContent = 'Pause'; });
  hsReset();
  if (reduced) { for (let i = 0; i < 120; i++) hsStep(.1); updHot(); }

  let hotUnlocked = false, hsAcc = 0;
  const drawHot = dt => {
    if (hotUnlocked && HS.run && !reduced) {
      hsAcc += dt;
      if (hsAcc > .1) { updHot(); hsAcc = 0; }
      const n = 4; for (let i = 0; i < n; i++) hsStep(dt * 2 / n);   // 1 s ≈ 2 Mio. Jahre
      HS.flow = (HS.flow + dt * .6) % 1;
    }
    const { ctx, w, h } = fit(hotCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const hx = w * .76;
    const kmX = w / VIEW;
    const ySea = h * .36, yFloor = h * .56, pxKm = (yFloor - ySea) / SEA_KM;
    const yPlate = h * .70;
    // Himmel bleibt Hintergrund. Meer
    ctx.fillStyle = SEA; ctx.fillRect(0, ySea, w, yFloor - ySea);
    ctx.strokeStyle = SEA2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ySea); ctx.lineTo(w, ySea); ctx.stroke();
    // Erdmantel
    ctx.fillStyle = MANTLE; ctx.fillRect(0, yPlate, w, h - yPlate);
    // Platte (Ozeankruste und fester oberer Mantel) mit wandernden Streifen
    ctx.fillStyle = ROCK2; ctx.fillRect(0, yFloor, w, yPlate - yFloor);
    ctx.save(); ctx.beginPath(); ctx.rect(0, yFloor, w, yPlate - yFloor); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 6;
    const sh = (HS.len * kmX) % 40;
    for (let x = -sh + 40; x < w + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, yFloor); ctx.lineTo(x - 18, yPlate); ctx.stroke(); }
    ctx.restore();

    // Mantelplume
    const g = ctx.createLinearGradient(0, h, 0, yPlate);
    g.addColorStop(0, 'rgba(255,106,31,.25)'); g.addColorStop(1, 'rgba(255,170,60,.85)');
    ctx.fillStyle = g; ctx.beginPath();
    const wob = reduced ? 0 : Math.sin(HS.flow * TAU) * 3;
    ctx.moveTo(hx - 16, h); ctx.bezierCurveTo(hx - 14 + wob, h * .86, hx - 30, yPlate + 14, hx - 46, yPlate);
    ctx.lineTo(hx + 46, yPlate); ctx.bezierCurveTo(hx + 30, yPlate + 14, hx + 14 - wob, h * .86, hx + 16, h);
    ctx.closePath(); ctx.fill();
    // aufsteigende Wärme
    ctx.fillStyle = 'rgba(255,220,140,.9)';
    for (let i = 0; i < 6; i++) {
      const q = (i / 6 + HS.flow) % 1;
      ctx.globalAlpha = Math.sin(q * Math.PI);
      ctx.beginPath(); ctx.arc(hx + Math.sin(i * 2.3) * 7, lerp(h - 4, yPlate + 4, q), 2.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Vulkane (älteste zuerst)
    const peakY = v => yFloor - v.H * pxKm;
    for (const v of HS.vol) {
      if (v.H < .05) continue;
      const cx = hx + v.x * kmX, hw = (40 + 10 * v.H) * kmX + 6, py = peakY(v);
      if (cx + hw < 0) continue;
      ctx.beginPath(); ctx.moveTo(cx - hw, yFloor);
      ctx.bezierCurveTo(cx - hw * .45, yFloor, cx - hw * .3, py, cx, py);
      ctx.bezierCurveTo(cx + hw * .3, py, cx + hw * .45, yFloor, cx + hw, yFloor);
      ctx.closePath();
      ctx.fillStyle = ROCK; ctx.fill(); ctx.strokeStyle = ROCK2; ctx.lineWidth = 1; ctx.stroke();
      // grüne Insel über Wasser
      if (v.H > SEA_KM && v.x < -60) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, ySea); ctx.clip();
        ctx.beginPath(); ctx.moveTo(cx - hw, yFloor);
        ctx.bezierCurveTo(cx - hw * .45, yFloor, cx - hw * .3, py, cx, py);
        ctx.bezierCurveTo(cx + hw * .3, py, cx + hw * .45, yFloor, cx + hw, yFloor);
        ctx.fillStyle = LAND; ctx.globalAlpha = clamp((Math.abs(v.x) - 60) / 80, 0, 1); ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    // Aktiver Vulkan: Schlot und Glut
    const act = HS.vol[HS.vol.length - 1];
    if (act) {
      const cx = hx + act.x * kmX, py = peakY(act);
      ctx.strokeStyle = LAVA; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx, yPlate); ctx.quadraticCurveTo(lerp(hx, cx, .5), yFloor, cx, py + 3); ctx.stroke();
      const pulse = reduced ? .7 : .6 + .4 * Math.sin(HS.flow * TAU * 3);
      ctx.beginPath(); ctx.arc(cx, py, 4 + 3 * pulse, 0, TAU);
      ctx.fillStyle = `rgba(255,150,40,${.5 + .4 * pulse})`; ctx.fill();
    }
    // Alter der Vulkane
    ctx.font = `10px ${MONO}`; ctx.textAlign = 'center';
    let lastX = Infinity;
    for (let i = HS.vol.length - 1; i >= 0; i--) {
      const v = HS.vol[i], cx = hx + v.x * kmX;
      const isAct = v === act;
      if ((!isAct && v.H < .8) || cx < 14 || lastX - cx < (narrow ? 46 : 54)) continue;
      const age = HS.t - v.t0;
      const txt = isAct ? 'aktiv' : `${fmt(age, age < 10 ? 1 : 0)} Mio.`;
      ctx.fillStyle = isAct ? C.bad : C.fg;
      ctx.fillText(txt, cx, Math.min(peakY(v), ySea) - 8);
      lastX = cx;
    }

    // Beschriftung
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`;
    ctx.fillText(narrow ? 'Meer' : 'Meer, rund 5 km tief', 8, ySea + 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(narrow ? '← Platte' : '← Ozeanplatte wandert nach Nordwesten', 8, yFloor + (yPlate - yFloor) / 2 + 4);
    ctx.fillStyle = C.fg;
    ctx.fillText(narrow ? 'Erdmantel' : 'Erdmantel (fest, aber zähfliessend)', 8, h - 12);
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `500 11px ${MONO}`;
    ctx.fillText('Hotspot', hx, h - 12);
    ctx.textAlign = 'left'; ctx.font = `10px ${MONO}`; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? '← älter' : '← älter', 8, 16);
    ctx.textAlign = 'right';
    ctx.fillText(narrow ? 'nicht massstäblich' : 'Höhen überzeichnet, vereinfacht', w - 8, 16);
  };

  /* ---------- Teil 3: Ausbruchsart ---------- */
  const eruptCv = $('#eruptCv');
  const ER = { gas: .2, vis: .1, t: 0 };
  const explo = () => ER.gas * (.15 + .85 * ER.vis);
  const colKm = () => { const e = explo(); return e < .2 ? 0 : 35 * Math.pow((e - .2) / .8, 1.8); };
  const typeOf = () => {
    const e = explo();
    if (e < .2) return ER.gas < .45
      ? ['ruhig', 'Lavaströme', 'Kīlauea', 'Das Gas entweicht leicht aus der dünnflüssigen Lava. Sie fliesst ruhig den Hang hinunter. Man kann oft aus sicherer Distanz zuschauen.']
      : ['Lavafontänen', 'sprudelnde Lava', 'Island 2021', 'Viel Gas, aber dünnflüssig: Die Blasen platzen an der Oberfläche und schleudern Lava als Fontäne hoch. Danach fliesst sie ab.'];
    if (e < .45) return ['Strombolianisch', 'glühende Lavafetzen', 'Stromboli', 'Grosse Gasblasen platzen im Krater immer wieder und werfen glühende Lavafetzen in die Luft.'];
    if (e < .7) return ['explosiv', 'Asche und Brocken', 'Ätna, Vulcano', 'Das zähe Magma hält das Gas fest. Der Druck baut sich auf, bis es knallt. Asche und Gesteinsbrocken fliegen.'];
    return ['sehr explosiv', 'Aschesäule, Glutwolken', 'Vesuv 79', 'Das Magma zerreisst in winzige Fetzen. Eine Aschesäule schiesst kilometerhoch, und heisse Glutwolken rasen die Hänge hinunter.'];
  };
  const updErupt = () => {
    $('#gasIn').value = Math.round(ER.gas * 100); $('#visIn').value = Math.round(ER.vis * 100);
    $('#gasOut').textContent = ER.gas < .3 ? 'wenig' : ER.gas < .65 ? 'mittel' : 'viel';
    $('#visOut').textContent = ER.vis < .3 ? 'dünnflüssig' : ER.vis < .65 ? 'mittel' : 'sehr zäh';
    const [a, b, c, msg] = typeOf();
    $('#exType').textContent = a; $('#exType2').textContent = b; $('#exLike').textContent = c;
    const k = colKm();
    $('#exCol').textContent = k < .5 ? '0 km' : `rund ${fmt(k < 3 ? k : Math.round(k), k < 3 ? 1 : 0)} km`;
    $('#eruptStatus').textContent = msg;
  };
  $('#gasIn').addEventListener('input', e => { ER.gas = e.target.value / 100; updErupt(); });
  $('#visIn').addEventListener('input', e => { ER.vis = e.target.value / 100; updErupt(); });
  const exPreset = (g, v) => () => { ER.gas = g; ER.vis = v; updErupt(); };
  $('#exHaw').addEventListener('click', exPreset(.2, .1));
  $('#exStr').addEventListener('click', exPreset(.55, .45));
  $('#exVes').addEventListener('click', exPreset(.92, .9));
  updErupt();

  const drawErupt = dt => {
    if (!reduced) ER.t += dt;
    const T = reduced ? 1.3 : ER.t;
    const { ctx, w, h } = fit(eruptCv);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 460;
    const e = explo(), gas = ER.gas, vis = ER.vis;
    const cx = w * .56, yG = h * .74, yP = h * .47;
    const bw = Math.min(w * .42, 260), cw = 16;
    const yCh = h * .9;

    // Untergrund und Magmakammer
    ctx.fillStyle = 'rgba(111, 97, 88, .28)'; ctx.fillRect(0, yG, w, h - yG);
    const mag = `rgb(${Math.round(lerp(255, 184, vis))}, ${Math.round(lerp(106, 65, vis))}, ${Math.round(lerp(31, 15, vis))})`;
    ctx.fillStyle = mag;
    ctx.beginPath(); ctx.ellipse(cx, yCh, Math.min(w * .22, 120), h * .06, 0, 0, TAU); ctx.fill();
    ctx.fillRect(cx - 5, yP, 10, yCh - yP);
    // Vulkankegel
    ctx.beginPath(); ctx.moveTo(cx - bw, yG);
    ctx.quadraticCurveTo(cx - bw * .35, yG - (yG - yP) * .35, cx - cw, yP);
    ctx.lineTo(cx - 6, yP + 7); ctx.lineTo(cx + 6, yP + 7); ctx.lineTo(cx + cw, yP);
    ctx.quadraticCurveTo(cx + bw * .35, yG - (yG - yP) * .35, cx + bw, yG);
    ctx.closePath(); ctx.fillStyle = ROCK; ctx.fill();
    ctx.fillStyle = mag; ctx.fillRect(cx - 4, yP + 4, 8, yG - yP);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, yG); ctx.lineTo(w, yG); ctx.stroke();

    // Gasblasen im Schlot: im zähen Magma steigen sie kaum
    const nb = Math.round(4 + gas * 22), spd = .55 * (1 - .9 * vis) + .03;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < nb; i++) {
      const q = (hash(i) + T * spd * (.7 + .6 * hash(i + 50))) % 1;
      const inCh = hash(i + 9) < .55;
      let x, y;
      if (inCh) { x = cx + (hash(i + 3) - .5) * Math.min(w * .36, 200); y = yCh + (hash(i + 4) - .5) * h * .08 - q * h * .02; }
      else { x = cx + (hash(i + 3) - .5) * 5; y = lerp(yCh, yP + 6, q); }
      ctx.beginPath(); ctx.arc(x, y, 1.2 + 2.3 * hash(i + 7) * (.5 + vis), 0, TAU); ctx.fill();
    }

    // Punkt auf der Flanke (gleiche Kurve wie der Kegel), s = 0 am Krater, 1 am Fuss, darüber hinaus flach
    const flank = (side, s) => {
      if (s > 1) return [cx + side * (bw + (s - 1) * bw), yG];
      const x0 = cx + side * cw, x1 = cx + side * bw * .35, x2 = cx + side * bw;
      const y0 = yP, y1 = yG - (yG - yP) * .35, y2 = yG, u = 1 - s;
      return [u * u * x0 + 2 * u * s * x1 + s * s * x2, u * u * y0 + 2 * u * s * y1 + s * s * y2];
    };
    // Lavaströme: dünnflüssig = lang und schmal, zäh = kurz und dick
    const flowAmt = clamp(1 - e / .45, 0, 1);
    if (flowAmt > 0) {
      const len = (.35 + .65 * (1 - vis)) * flowAmt;
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 30; i++) {
          const [fx, fy] = flank(side, i / 30 * len * 1.25);
          pts.push([fx + Math.sin(i * .9 + side) * 1.5, fy - 3 - 2 * vis]);
        }
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = LAVA_DARK; ctx.lineWidth = 7 + 6 * vis;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        ctx.strokeStyle = LAVA; ctx.lineWidth = 3 + 4 * vis;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        // fliessende Glut
        ctx.fillStyle = LAVA_HOT;
        for (let j = 0; j < 4; j++) {
          const q = (j / 4 + T * .25 * (1 - .7 * vis)) % 1, p = pts[Math.floor(q * (pts.length - 1))];
          ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, TAU); ctx.fill();
        }
      }
      ctx.beginPath(); ctx.arc(cx, yP + 2, 9, 0, TAU); ctx.fillStyle = 'rgba(255,170,60,.55)'; ctx.fill();
    }

    // Lavafontäne
    if (e < .2 && gas > .3) {
      const H = (gas - .3) * h * .22;
      ctx.fillStyle = LAVA_HOT;
      for (let i = 0; i < 40; i++) {
        const q = (hash(i) + T * 1.1) % 1;
        const vx = (hash(i + 20) - .5) * 30;
        const y = yP - (4 * H * q * (1 - q));
        ctx.globalAlpha = 1 - q * .5;
        ctx.beginPath(); ctx.arc(cx + vx * q * 2, y, 2.2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Aschesäule
    const km = colKm();
    const yTop = 14, colPx = km / 35 * (yP - yTop);
    if (km > .3) {
      const N = 70;
      for (let i = 0; i < N; i++) {
        const q = (hash(i) + T * (.12 + .1 * e)) % 1;
        const rise = Math.min(q / .75, 1);
        let x = cx + (hash(i + 5) - .5) * (8 + rise * colPx * .22);
        let y = yP - rise * colPx;
        if (q > .75) { const s = (q - .75) / .25; x += (hash(i + 8) - .5) * s * colPx * 1.4; y -= s * 6; }
        const r = 5 + rise * (6 + colPx * .05) + (q > .75 ? 6 : 0);
        ctx.fillStyle = `rgba(${ASH}, ${.55 * (1 - Math.max(0, q - .85) / .15)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    // Glutwolken an den Hängen
    if (e > .7) {
      for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
        const q = (hash(i + side * 30 + 40) + T * .22) % 1;
        const [fx, fy0] = flank(side, q * 1.15);
        const fy = fy0 - 6 - 5 * q;
        ctx.fillStyle = `rgba(${ASH}, ${.6 * (1 - q)})`;
        ctx.beginPath(); ctx.arc(fx, fy, 6 + 10 * q, 0, TAU); ctx.fill();
      }
    }
    // Glühende Brocken
    if (e >= .2) {
      const nB = Math.round(6 + 14 * e), Hb = h * (.12 + .3 * e), period = e < .45 ? 2.2 : 1.4;
      const burst = (T / period) % 1;
      ctx.fillStyle = LAVA_HOT;
      for (let i = 0; i < nB; i++) {
        const q = e < .45 ? burst : (hash(i) + T / period) % 1;
        if (e < .45 && q > .85) continue;
        const vx = (hash(i + 70) - .5) * 2 * (40 + 90 * e);
        const peak = Hb * (.5 + .5 * hash(i + 80));
        const x = cx + vx * q * 1.6, y = yP - 4 * peak * q * (1 - q) + q * q * 30;
        if (y > yG) continue;
        ctx.globalAlpha = 1 - q * .4;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Höhenskala für die Aschesäule
    ctx.strokeStyle = C.muted; ctx.fillStyle = C.muted; ctx.font = `10px ${MONO}`; ctx.textAlign = 'left'; ctx.lineWidth = 1;
    if (km > 1) {
      for (const k of [10, 20, 30]) {
        const y = yP - k / 35 * (yP - yTop);
        ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(18, y); ctx.stroke();
        ctx.fillText(`${k} km`, 22, y + 3);
      }
      ctx.fillText(narrow ? 'Höhe' : 'Höhe über Krater', 8, yP + 4);
    }
    // Beschriftung unten
    ctx.textAlign = 'left'; ctx.fillStyle = C.fg;
    ctx.fillText('Magmakammer', 8, h - 10);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
    ctx.fillText(narrow ? 'vereinfacht' : 'vereinfacht, nicht massstäblich', w - 8, h - 10);
  };

  /* ---------- Lektion verdrahten ---------- */
  lesson('vulkane', 4, {
    plateLock: () => { ['#ageIn', '#plPlay', '#plPang', '#plNow'].forEach(s => $(s).disabled = false); },
    hotLock: () => { ['#spdIn', '#hsPlay', '#hsReset'].forEach(s => $(s).disabled = false); hotUnlocked = true; },
    eruptLock: () => { ['#gasIn', '#visIn', '#exHaw', '#exStr', '#exVes'].forEach(s => $(s).disabled = false); },
  });

  loop(dt => { dt = Math.max(0, dt); drawPlate(dt); drawHot(dt); drawErupt(dt); });
})();
