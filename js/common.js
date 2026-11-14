/* mindblow – gemeinsame Werkzeuge für alle Seiten */
window.MB = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Schweizer Schreibweise wie in den Texten: 1'234,5
  const fmt = (n, d = 1) => n.toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d })
    .replace(/\./g, ',').replace(/[’’]/g, "'");

  /* Farben aus den CSS-Tokens, damit Canvas-Zeichnungen hell und dunkel passen */
  const C = {};
  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    for (const k of ['fg', 'muted', 'line', 'accent', 'glow', 'copper', 'fiber', 'surface', 'sunk', 'bg', 'bad', 'good'])
      C[k] = cs.getPropertyValue('--' + k).trim();
  };
  readColors();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);

  const fit = cv => {
    const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx, w: r.width, h: r.height };
  };
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  /* Fortschritt pro Lektion, nur im eigenen Browser */
  const load = key => {
    try { const s = JSON.parse(localStorage.getItem('mindblow-' + key) || '{}') || {}; s.solved = s.solved || {}; return s; }
    catch (e) { return { solved: {} }; }
  };
  const store = (key, s) => { try { localStorage.setItem('mindblow-' + key, JSON.stringify(s)); } catch (e) {} };
  const progressOf = key => Object.keys(load(key).solved).length;

  /* Eine Lektion verdrahten: Denkfragen, Fortschritt, Selber-denken-Box, Zurücksetzen */
  const lesson = (key, total, unlockers = {}) => {
    const saved = load(key);
    const save = () => store(key, saved);
    const update = () => {
      const n = Object.keys(saved.solved).length;
      $('#progBar').style.width = (n / total * 100) + '%';
      $('#progText').textContent = `${n} von ${total} Denkaufgaben gelöst`;
      $$('.step[data-q]').forEach(s => s.classList.toggle('solved', !!saved.solved[s.dataset.q]));
    };
    const answer = (quiz, v, silent) => {
      const correct = quiz.dataset.correct;
      $$('.opts button', quiz).forEach(b => {
        b.disabled = true;
        if (b.dataset.v === correct) b.classList.add('right');
        else if (b.dataset.v === v) b.classList.add('wrong');
        else b.classList.add('dim');
      });
      const verdict = $('.verdict', quiz);
      if (v === correct) { verdict.textContent = 'Richtig gedacht.'; verdict.className = 'verdict ok'; }
      else { verdict.textContent = 'Nicht ganz. Die meisten tippen so, und genau das macht es spannend:'; verdict.className = 'verdict no'; }
      $('.reveal', quiz).hidden = false;
      const lock = quiz.dataset.unlock;
      if (lock) { const el = document.getElementById(lock); if (el) el.hidden = true; unlockers[lock]?.(); }
      if (!silent) { saved.solved[quiz.dataset.q] = v; save(); update(); }
    };
    $$('.quiz').forEach(quiz => {
      $$('.opts button', quiz).forEach(b => b.addEventListener('click', () => answer(quiz, b.dataset.v)));
      const prev = saved.solved[quiz.dataset.q];
      if (prev) answer(quiz, prev, true);
    });

    // Zum Nachdenken: Frage lesen, dann Antwort aufdecken
    const ansBtn = $('#ansBtn'), ansBox = $('#answer');
    if (ansBtn && ansBox) {
      const aKey = ansBtn.dataset.q || 'q4';
      const show = silent => {
        ansBox.hidden = false; ansBtn.hidden = true;
        if (!silent) { saved.solved[aKey] = 'x'; save(); update(); }
      };
      ansBtn.addEventListener('click', () => show());
      if (saved.solved[aKey]) show(true);
    }

    $('#resetBtn')?.addEventListener('click', () => { store(key, { solved: {} }); location.reload(); });
    update();
    return { saved, save };
  };

  /* Eine Animationsschleife für alles, was sich bewegt */
  const loop = fn => {
    let last = performance.now();
    const frame = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; fn(dt, now); requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  };

  /* ---------- Themen: Bereich → Gebiet → Thema (Daten in js/themen.js) ---------- */
  const DATA = window.MB_THEMEN || { BEREICHE: [], THEMEN: [] };
  const BEREICHE = DATA.BEREICHE;
  const bById = {}, gById = {};
  BEREICHE.forEach((b, bi) => { b.i = bi; bById[b.id] = b; b.gebiete.forEach((g, gi) => { g.i = gi; g.b = b; gById[b.id + '/' + g.id] = g; }); });
  const ALL = DATA.THEMEN.map((t, i) => ({ ...t, i, bereich: bById[t.b], gebiet: gById[t.b + '/' + t.g] })).filter(t => t.bereich && t.gebiet);
  // Lernreihenfolge: Bereich, dann Gebiet, dann Reihenfolge in der Datei
  ALL.sort((a, b) => a.bereich.i - b.bereich.i || a.gebiet.i - b.gebiet.i || a.i - b.i);
  const TOPICS = ALL.filter(t => !t.soon);
  TOPICS.forEach((t, i) => { t.nr = String(i + 1).padStart(2, '0'); });
  const bySlug = Object.fromEntries(ALL.map(t => [t.slug, t]));
  const topicsIn = (b, g) => ALL.filter(t => t.b === b && (!g || t.g === g));
  const liveIn = (b, g) => topicsIn(b, g).filter(t => !t.soon);
  const plain = s => String(s).replace(/<[^>]+>/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const urlB = b => `themen.html?b=${b}`;
  const urlG = (b, g) => `themen.html?b=${b}&g=${g}`;
  const urlT = t => `${t.slug}.html`;
  const CATS = BEREICHE; // alter Name, für ältere Seiten

  /* ---------- Suche ---------- */
  // Kleinbuchstaben, Umlaute vereinheitlichen: «Kühlschrank», «kuehlschrank» und «kuhlschrank» treffen sich.
  const norm = s => plain(s).toLowerCase().replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/([aou])e/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim();
  const index = ALL.map(t => ({ t, f: [
    [norm(t.title + ' ' + t.short), 10],
    [norm(t.tags || ''), 6],
    [norm(t.gebiet.name + ' ' + t.bereich.name), 4],
    [norm(t.teaser), 2],
  ] }));
  const search = (q, limit = 50) => {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return [];
    const hits = [];
    for (const { t, f } of index) {
      let score = 0, ok = true;
      for (const w of words) {
        let best = 0;
        for (const [txt, wt] of f) {
          const at = txt.indexOf(w);
          if (at < 0) continue;
          const start = at === 0 || txt[at - 1] === ' ';
          best = Math.max(best, wt * (start ? 1 : .5));
        }
        if (!best) { ok = false; break; }
        score += best;
      }
      if (ok) hits.push({ t, score: score - (t.soon ? 3 : 0) });
    }
    return hits.sort((a, b) => b.score - a.score || a.t.i - b.t.i).slice(0, limit).map(h => h.t);
  };
  const stateOf = t => {
    if (t.soon) return { cls: 'soon', chip: 'Bald', txt: 'In Arbeit' };
    const n = progressOf(t.slug);
    return n >= 4 ? { cls: 'done', chip: 'Erledigt', txt: 'Abgeschlossen' }
      : n > 0 ? { cls: 'started', chip: 'Angefangen', txt: `${n} von 4 gelöst` }
      : { cls: 'fresh', chip: 'Offen', txt: '4 Aufgaben · 15 Min.' };
  };
  // Eine Themenkarte (Startseite, Übersichten)
  const card = (t, opt = {}) => {
    const s = stateOf(t);
    const path = opt.path === false ? '' : `<span class="crumbs">${esc(t.bereich.name)} · ${esc(t.gebiet.name)}</span>`;
    const inner = `${path}<span class="chip">${s.chip}</span><h3>${t.title}</h3><p>${t.teaser}</p>
      <div class="meta"><span>${s.txt}</span>${t.soon ? '' : '<span class="go">Starten</span>'}</div>`;
    return t.soon ? `<div class="topic soon-t" aria-disabled="true">${inner}</div>`
      : `<a class="topic ${s.cls}" href="${urlT(t)}" data-tilt>${inner}</a>`;
  };

  /* ---------- Kopfzeile: Themen-Menü und Suche ---------- */
  const here = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const params = new URLSearchParams(location.search);
  const curT = bySlug[here];
  const curB = curT ? curT.b : (here === 'themen' ? params.get('b') : null);
  const nav = $('header.top nav');
  let openSearch = () => {};
  if (nav) {
    nav.className = 'mainnav'; nav.setAttribute('aria-label', 'Themen');
    nav.innerHTML = `
      <span data-lexikon></span>
      <button class="navcat" type="button" id="megaBtn" aria-expanded="false" aria-controls="mega">Themen <span class="caret"></span></button>
      <button class="navcat searchbtn" type="button" id="searchBtn" aria-label="Suchen"><svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg><span class="sb-l">Thema oder Begriff suchen</span><kbd>/</kbd></button>
      <div class="mega" id="mega" hidden>
        <div class="mega-grid">
          ${BEREICHE.map(b => `<div class="mega-col${b.id === curB ? ' current' : ''}">
            <a class="mega-b" href="${urlB(b.id)}">${esc(b.name)} <span class="cnt">${liveIn(b.id).length}</span></a>
            ${b.gebiete.map(g => {
              const n = liveIn(b.id, g.id).length;
              return `<a class="mega-g${n ? '' : ' empty'}${curT && curT.g === g.id && curT.b === b.id ? ' current' : ''}" href="${urlG(b.id, g.id)}">${esc(g.name)}<span class="cnt">${n || 'bald'}</span></a>`;
            }).join('')}
          </div>`).join('')}
        </div>
        <div class="mega-foot"><a href="themen.html">Alle ${TOPICS.length} Themen von A bis Z →</a></div>
      </div>`;
    const mb = $('#megaBtn'), mega = $('#mega');
    const setMega = open => { mega.hidden = !open; mb.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); };
    mb.addEventListener('click', e => { e.stopPropagation(); setMega(mega.hidden); });
    document.addEventListener('click', e => { if (!nav.contains(e.target)) setMega(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMega(false); });

    // Suchfenster
    const dlg = document.createElement('div');
    dlg.className = 'search-dlg'; dlg.hidden = true;
    dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Themen durchsuchen');
    dlg.innerHTML = `<div class="search-box">
        <div class="search-in"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg>
          <input type="search" id="sQ" placeholder="Was willst du verstehen? z. B. Herz, Blitz, Geld" autocomplete="off" spellcheck="false" aria-controls="sRes">
          <button type="button" class="s-close" aria-label="Schliessen">Esc</button></div>
        <div class="s-res" id="sRes" role="listbox"></div>
      </div>`;
    document.body.append(dlg);
    const q = $('#sQ', dlg), res = $('#sRes', dlg);
    let sel = 0, hits = [];
    const sugg = ['Herz', 'Geld', 'Licht', 'Weltall', 'Gehirn', 'Strom'];
    const render = () => {
      const v = q.value.trim();
      if (!v) {
        res.innerHTML = `<p class="s-empty">Probier: ${sugg.map(s => `<button type="button" class="s-sug">${s}</button>`).join(' ')}</p>`;
        $$('.s-sug', res).forEach(b => b.addEventListener('click', () => { q.value = b.textContent; render(); q.focus(); }));
        hits = []; return;
      }
      hits = search(v, 12);
      if (!hits.length) { res.innerHTML = `<p class="s-empty">Nichts gefunden zu «${esc(v)}». Dieses Thema gibt es noch nicht.</p>`; return; }
      sel = Math.min(sel, hits.length - 1);
      res.innerHTML = hits.map((t, i) => `<a class="s-hit${t.soon ? ' soon' : ''}${i === sel ? ' sel' : ''}" role="option" aria-selected="${i === sel}" ${t.soon ? '' : `href="${urlT(t)}"`} data-i="${i}">
          <span class="s-path">${esc(t.bereich.name)} · ${esc(t.gebiet.name)}</span>
          <span class="s-t">${plain(t.title)}${t.soon ? ' <span class="s-soon">bald</span>' : ''}</span>
          <span class="s-d">${t.teaser}</span></a>`).join('')
        + `<a class="s-all" href="themen.html?q=${encodeURIComponent(v)}">Alle Treffer zeigen →</a>`;
    };
    const mark = () => $$('.s-hit', res).forEach((a, i) => { a.classList.toggle('sel', i === sel); a.setAttribute('aria-selected', String(i === sel)); if (i === sel) a.scrollIntoView({ block: 'nearest' }); });
    q.addEventListener('input', () => { sel = 0; render(); });
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, hits.length - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const t = hits[sel];
        if (t && !t.soon) location.href = urlT(t);
        else if (q.value.trim()) location.href = `themen.html?q=${encodeURIComponent(q.value.trim())}`;
      }
    });
    const close = () => { dlg.hidden = true; document.documentElement.classList.remove('s-open'); };
    openSearch = (text = '') => {
      setMega(false); dlg.hidden = false; document.documentElement.classList.add('s-open');
      q.value = text; sel = 0; render(); q.focus();
    };
    $('.s-close', dlg).addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    $('#searchBtn').addEventListener('click', () => openSearch());
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (e.key === 'Escape' && !dlg.hidden) close();
      else if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch(); }
    });
  }

  /* ---------- Lexikon-Verbund (mindblow, timewarp, Periodensystem) ---------- */
  {
    const lx = document.createElement('script');
    lx.src = 'lexikon/lexikon.js'; lx.defer = true; lx.dataset.site = 'mindblow';
    document.head.append(lx);
  }

  /* ---------- Lektionsseiten: Pfad, Zurück und Weiter automatisch ---------- */
  if (curT && !curT.soon) {
    const eb = $('.lesson-head > .eyebrow');
    if (eb) {
      eb.classList.add('crumbpath');
      eb.innerHTML = `<a href="${urlB(curT.b)}">${esc(curT.bereich.name)}</a><span aria-hidden="true">/</span><a href="${urlG(curT.b, curT.g)}">${esc(curT.gebiet.name)}</a>`;
    }
    const back = $('.lesson-head .back');
    if (back) { back.href = urlG(curT.b, curT.g); back.textContent = `← ${curT.gebiet.name}`; }
    const next = TOPICS[TOPICS.indexOf(curT) + 1];
    const btn = $('.wrapup .row a.btn');
    if (btn) {
      if (next) { btn.href = urlT(next); btn.textContent = `Weiter: ${plain(next.title)} →`; }
      else { btn.href = 'index.html'; btn.textContent = 'Zu allen Themen'; }
    }
  }

  /* ---------- Atmosphäre & Mikro-Interaktionen ---------- */
  const ambient = document.createElement('div');
  ambient.className = 'ambient'; ambient.setAttribute('aria-hidden', 'true');
  ambient.innerHTML = '<i></i><i></i><i></i>';
  const grain = document.createElement('div');
  grain.className = 'grain'; grain.setAttribute('aria-hidden', 'true');
  document.body.prepend(ambient); document.body.append(grain);

  const finePointer = matchMedia('(pointer: fine)').matches;
  const GLASS = '.glass, .quiz, .controls, .think, .analogy > div, .learned li, .topic, .top nav, .navmenu';

  if (finePointer) {
    // Lichtfleck folgt der Maus auf Glasflächen
    document.addEventListener('pointermove', e => {
      const el = e.target.closest?.(GLASS);
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    if (!reduced) {
      // Cursor-Ring mit leichtem Nachziehen
      const ring = document.createElement('div'); ring.className = 'cursor'; document.body.append(ring);
      let tx = -100, ty = -100, x = -100, y = -100;
      document.addEventListener('pointermove', e => {
        tx = e.clientX; ty = e.clientY; ring.classList.add('on');
        ring.classList.toggle('hover', !!e.target.closest?.('a, button:not(:disabled), input, textarea, [role=button], #netCv'));
      }, { passive: true });
      document.addEventListener('pointerleave', () => ring.classList.remove('on'));
      const follow = () => { x += (tx - x) * .2; y += (ty - y) * .2; ring.style.transform = `translate(${x}px, ${y}px)`; requestAnimationFrame(follow); };
      follow();

      // Magnetische Buttons
      $$('.btn, .brand').forEach(b => {
        b.addEventListener('pointermove', e => {
          if (b.disabled) return;
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .28}px)`;
        });
        b.addEventListener('pointerleave', () => { b.style.transform = ''; });
      });

      // Leichtes Kippen der Themenkarten
      // (per Delegation, damit auch später erzeugte Karten mitmachen)
      let tilted = null;
      document.addEventListener('pointermove', e => {
        const c = e.target.closest?.('[data-tilt]');
        if (tilted && tilted !== c) { tilted.style.setProperty('--ry', '0deg'); tilted.style.setProperty('--rx', '0deg'); }
        tilted = c;
        if (!c) return;
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        c.style.setProperty('--ry', (px * 4).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 4).toFixed(2) + 'deg');
      }, { passive: true });
    }
  }

  return { $, $$, reduced, fmt, C, fit, roundRect, lesson, loop, progressOf, CATS, TOPICS, BEREICHE, ALL, bySlug, topicsIn, liveIn, search, stateOf, card, plain, esc, urlB, urlG, urlT, params, openSearch: t => openSearch(t) };
})();
