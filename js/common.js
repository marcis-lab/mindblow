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

    // Selber denken
    const txt = $('#thinkTxt');
    if (txt) {
      const tKey = txt.dataset.q;
      if (saved.draft) txt.value = saved.draft;
      const check = () => {
        const ok = txt.value.trim().split(/\s+/).filter(Boolean).length >= 4;
        if (!saved.solved[tKey]) $('#ansBtn').disabled = !ok;
        $('#thinkStatus').textContent = ok ? 'Bereit. Vergleiche jetzt mit der Auflösung.' : 'Schreib mindestens einen Satz, dann kannst du vergleichen.';
      };
      txt.addEventListener('input', () => { saved.draft = txt.value; save(); check(); });
      $('#hintBtn').addEventListener('click', () => { $('#hint').hidden = false; $('#hintBtn').disabled = true; });
      const show = silent => {
        $('#answer').hidden = false; $('#ansBtn').disabled = true;
        if (!silent) { saved.solved[tKey] = 'x'; save(); update(); }
      };
      $('#ansBtn').addEventListener('click', () => show());
      check();
      if (saved.solved[tKey]) show(true);
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

  /* ---------- Themen-Register: neue Themen nur hier eintragen ---------- */
  const CATS = [
    { id: 'technik', name: 'Technik' },
    { id: 'natur', name: 'Natur & Universum' },
    { id: 'leben', name: 'Körper & Leben' },
    { id: 'geld', name: 'Geld & Gesellschaft' },
  ];
  const TOPICS = [
    { slug: 'strom', cat: 'technik', short: 'Strom', title: 'Wie funktioniert <em>Strom?</em>', teaser: 'Warum geht das Licht sofort an, obwohl die Elektronen langsamer kriechen als eine Schnecke?' },
    { slug: 'internet', cat: 'technik', short: 'Internet', title: 'Wie funktioniert das <em>Internet?</em>', teaser: 'Wie kommt ein Foto in einer Zehntelsekunde nach New York? Nicht durch die Luft.' },
    { slug: 'ki', cat: 'technik', short: 'Künstliche Intelligenz', title: 'Was ist eigentlich <em>KI?</em>', teaser: 'Denkt ein Chatbot? Bau ein Mini-Sprachmodell und trainiere eine Maschine.' },
    { slug: 'gps', cat: 'technik', short: 'GPS', title: 'Woher weiss dein Handy, <em>wo du bist?</em>', teaser: 'Satelliten, sehr genaue Uhren und ein Trick mit Kreisen. Einstein hilft auch mit.' },
    { slug: 'flugzeug', cat: 'technik', short: 'Fliegen', title: 'Warum fliegt ein <em>Flugzeug?</em>', teaser: 'Hunderte Tonnen in der Luft. Die Erklärung aus vielen Schulbüchern stimmt leider nicht.' },
    { slug: 'verschluesselung', cat: 'technik', short: 'Verschlüsselung', title: 'Wie bleiben Geheimnisse <em>geheim?</em>', teaser: 'Du schickst deine Kartennummer durchs offene Internet. Warum kann sie trotzdem niemand lesen?' },
    { slug: 'kuehlschrank', cat: 'technik', short: 'Kühlschrank', title: 'Wie macht ein Kühlschrank <em>Kälte?</em>', teaser: 'Er macht gar keine Kälte. Er pumpt Wärme weg, und hinten wird es warm.' },
    { slug: 'himmel', cat: 'natur', short: 'Blauer Himmel', title: 'Warum ist der Himmel <em>blau?</em>', teaser: 'Und warum wird er am Abend orange? Die Antwort steckt im Licht selbst.' },
    { slug: 'jahreszeiten', cat: 'natur', short: 'Jahreszeiten', title: 'Warum gibt es <em>Jahreszeiten?</em>', teaser: 'Im Januar ist die Erde der Sonne am nächsten. Trotzdem ist bei uns Winter.' },
    { slug: 'universum', cat: 'natur', short: 'Universum', title: 'Wie gross ist das <em>Universum?</em>', teaser: 'Von der Ameise bis zur nächsten Galaxie: eine Reise durch dreissig Zehnerpotenzen.' },
    { slug: 'gezeiten', cat: 'natur', short: 'Ebbe & Flut', title: 'Warum gibt es <em>Ebbe und Flut?</em>', teaser: 'Der Mond zieht das Meer an. Aber warum gibt es dann zwei Fluten am Tag?' },
    { slug: 'treibhaus', cat: 'natur', short: 'Treibhauseffekt', title: 'Wie wärmt <em>CO₂</em> die Erde?', teaser: 'Ein Gas, das nur 0,04 Prozent der Luft ausmacht. Wie kann das den ganzen Planeten wärmen?' },
    { slug: 'fallen', cat: 'natur', short: 'Schwerkraft', title: 'Fällt Schweres <em>schneller?</em>', teaser: 'Eine Bowlingkugel und eine Feder fallen gleichzeitig. Man muss nur die Luft weglassen.' },
    { slug: 'gedaechtnis', cat: 'leben', short: 'Gedächtnis', title: 'Wie erinnert sich das <em>Gehirn?</em>', teaser: 'Dein Gedächtnis ist keine Festplatte. Es erfindet mit, und du merkst es nicht.' },
    { slug: 'farben', cat: 'leben', short: 'Farben', title: 'Gibt es Farben <em>wirklich?</em>', teaser: 'Dein Auge kennt nur drei Farben. Den ganzen Rest baut dein Gehirn.' },
    { slug: 'evolution', cat: 'leben', short: 'Evolution', title: 'Wie funktioniert <em>Evolution?</em>', teaser: 'Niemand plant, und trotzdem entstehen perfekte Tarnungen. Wie geht das?' },
    { slug: 'immunsystem', cat: 'leben', short: 'Immunsystem', title: 'Wie wehrt sich dein <em>Körper?</em>', teaser: 'In dir tobt jeden Tag ein Krieg gegen Eindringlinge. Und eine Impfung ist ein Übungsalarm.' },
    { slug: 'gehoer', cat: 'leben', short: 'Hören', title: 'Wie hörst du <em>Töne?</em>', teaser: 'Schall ist nur Luft, die hin und her schubst. Wie wird daraus Musik in deinem Kopf?' },
    { slug: 'geld', cat: 'geld', short: 'Geld', title: 'Woher kommt <em>Geld?</em>', teaser: 'Das meiste Geld wurde nie gedruckt. Es entsteht, wenn jemand einen Kredit aufnimmt.' },
    { slug: 'zinseszins', cat: 'geld', short: 'Zinseszins', title: 'Wie wächst <em>Geld?</em>', teaser: 'Ein Rappen, jeden Tag verdoppelt. Wie viel ist es nach einem Monat?' },
    { slug: 'inflation', cat: 'geld', short: 'Inflation', title: 'Warum wird alles <em>teurer?</em>', teaser: 'Ein Kaffee kostete früher einen Franken. Ist der Kaffee besser geworden oder das Geld schlechter?' },
    { slug: 'lotto', cat: 'geld', short: 'Wahrscheinlichkeit', title: 'Warum gewinnt das Casino <em>immer?</em>', teaser: 'Glück ist launisch, aber Zufall rechnet erstaunlich genau. Und das Casino kennt die Rechnung.' },
    { slug: 'stau', cat: 'geld', short: 'Stau', title: 'Woher kommt Stau <em>aus dem Nichts?</em>', teaser: 'Kein Unfall, keine Baustelle, und trotzdem stehst du. Schuld ist ein kurzes Bremsen, weit vorne.' },
  ];
  TOPICS.forEach((t, i) => { t.nr = String(i + 1).padStart(2, '0'); });

  /* Navigation mit Überbegriffen */
  const here = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const nav = $('header.top nav');
  if (nav) {
    nav.className = 'mainnav'; nav.setAttribute('aria-label', 'Themen');
    nav.innerHTML = `
      <button class="navtoggle" type="button" aria-expanded="false">Themen <span class="caret"></span></button>
      <div class="navgroups">
        ${CATS.map(c => {
          const list = TOPICS.filter(t => t.cat === c.id);
          const cur = list.some(t => t.slug === here);
          return `<div class="navgroup${cur ? ' current' : ''}">
            <button class="navcat" type="button" aria-expanded="false">${c.name} <span class="caret"></span></button>
            <div class="navmenu">
              ${list.map(t => `<a href="${t.slug}.html"${t.slug === here ? ' aria-current="page"' : ''}><span class="nr">${t.nr}</span>${t.short}</a>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    const groups = $$('.navgroup', nav);
    const closeAll = except => groups.forEach(g => { if (g !== except) { g.classList.remove('open'); $('.navcat', g).setAttribute('aria-expanded', 'false'); } });
    groups.forEach(g => {
      const b = $('.navcat', g);
      b.addEventListener('click', e => {
        e.stopPropagation();
        const open = !g.classList.contains('open');
        closeAll(g); g.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
      });
    });
    const tog = $('.navtoggle', nav);
    tog.addEventListener('click', e => {
      e.stopPropagation();
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open); tog.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => { if (!nav.contains(e.target)) { closeAll(); nav.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); nav.classList.remove('open'); } });
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

  return { $, $$, reduced, fmt, C, fit, roundRect, lesson, loop, progressOf, CATS, TOPICS };
})();
