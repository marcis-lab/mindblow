/* Lexikon-Verbund: verbindet mindblow, timewarp (Weltgeschichte), Periodensystem, Bibel verstehen, soundcheck (Musik) und wordtrip (Sprachen & Schriften).
   Einbinden auf jeder Seite (vor </body>):
     <script src="https://mindblow.thinklabs.workers.dev/lexikon/lexikon.js" data-site="weltgeschichte" defer></script>
   - data-site: welche Seite das ist (id aus SITES).
   - Gibt es auf der Seite ein Element mit [data-lexikon], erscheint der Knopf dort, sonst schwebt er unten rechts.
   - Jede Seite legt eine /lexikon.json ab: { "items": [ { "t": Titel, "u": "/pfad", "d": Kurztext, "k": "Suchwörter", "p": "Gruppe" } ] }
     und erlaubt in _headers für /lexikon.json «Access-Control-Allow-Origin: *». */
(() => {
  if (window.__lexikon) return; window.__lexikon = true;
  const me = document.currentScript;
  const SITES = [
    { id: 'mindblow', name: 'mindblow', desc: 'Wie die Welt funktioniert', url: 'https://mindblow.thinklabs.workers.dev', c: '#FF3D85' },
    { id: 'weltgeschichte', name: 'timewarp', desc: 'Menschen und Momente der Weltgeschichte', url: 'https://weltgeschichte.thinklabs.workers.dev', c: '#F07A2A' },
    { id: 'periodensystem', name: 'Periodensystem', desc: 'Alle Elemente zum Drehen und Ausprobieren', url: 'https://periodensystem.thinklabs.workers.dev', c: '#0E9EC4' },
    { id: 'bibel', name: 'Bibel verstehen', desc: 'Die ganze Bibel als geführter Weg', url: 'https://bibelerklaert.ch', c: '#A23FE6' },
    { id: 'musik-lexikon', name: 'soundcheck', desc: 'Musik und Instrumente', url: 'https://musik-lexikon.thinklabs.workers.dev', c: '#8B5CF6' },
    { id: 'sprachen-schriften', name: 'wordtrip', desc: 'Sprachen, Schriften und Zeichen', url: 'https://sprachen-schriften.thinklabs.workers.dev', c: '#E8336F' },
    { id: 'koerper-atlas', name: 'bodyscan', desc: 'Der Mensch von innen, in 3D', url: 'https://koerper-atlas.thinklabs.workers.dev', c: '#F59E0B' },
  ];
  const cur = (me && me.dataset.site) || (SITES.find(s => location.origin === s.url) || {}).id;
  // Seiten, die (noch) nicht zum Lexikon gehören, zeigen keinen Knopf
  if (!SITES.some(s => s.id === cur)) return;
  // Für lokale Tests: data-local="mindblow=http://localhost:8093,weltgeschichte=http://localhost:8201"
  if (me && me.dataset.local) me.dataset.local.split(',').forEach(p => { const [k, v] = p.split('='); const s = SITES.find(x => x.id === k); if (s) s.url = v; });

  const css = `
  .lx-btn{display:inline-flex;align-items:center;gap:8px;font:500 14px/1 'Outfit',system-ui,sans-serif;color:#0B0B0F;background:rgba(255,255,255,.82);border:1px solid rgba(11,11,15,.1);border-radius:14px;padding:10px 14px 10px 10px;cursor:pointer;box-shadow:0 10px 40px -12px rgba(30,30,60,.25),0 2px 6px rgba(30,30,60,.06);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%)}
  .lx-btn:hover{border-color:#5072FF}
  .lx-btn .lx-mk{width:20px;height:20px;border-radius:7px;background:linear-gradient(135deg,#FF3D85,#5072FF);display:grid;place-items:center}
  .lx-btn .lx-mk::after{content:"";width:6px;height:6px;border-radius:2px;background:#fff}
  .lx-float{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:2147483000}
  .lx-dlg{position:fixed;inset:0;z-index:2147483001;display:grid;justify-items:center;align-items:start;padding:max(8vh,16px) 16px 16px;background:rgba(246,246,249,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:'Outfit',system-ui,-apple-system,'Segoe UI',sans-serif;color:#0B0B0F}
  .lx-dlg[hidden]{display:none}
  .lx-box{width:min(760px,100%);max-height:min(84vh,820px);display:grid;grid-template-rows:auto auto minmax(0,1fr);grid-template-columns:minmax(0,1fr);background:#fff;border:1px solid rgba(11,11,15,.09);border-radius:24px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(20,20,50,.45)}
  .lx-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px 6px}
  .lx-head b{font-weight:300;font-size:20px}.lx-head b span{font-weight:600;background:linear-gradient(100deg,#FF3D85 10%,#5072FF 75%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .lx-x{border:1px solid rgba(11,11,15,.1);background:none;border-radius:9px;font:500 12px/1 inherit;padding:6px 9px;color:#6b6b78;cursor:pointer;font-family:inherit}
  .lx-sites{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:8px 18px 12px}
  .lx-site{display:grid;gap:3px;padding:12px;border-radius:16px;text-decoration:none;color:inherit;border:1px solid rgba(11,11,15,.08);background:#F6F6F9;min-width:0}
  .lx-site:hover{border-color:#5072FF}.lx-site.lx-cur{background:#0B0B0F;color:#fff;border-color:#0B0B0F}
  .lx-site i{width:10px;height:10px;border-radius:3px;display:block}
  .lx-site b{font-weight:600;font-size:15px;line-height:1.15}.lx-site small{font-size:12.5px;opacity:.65;line-height:1.3}
  .lx-in{display:flex;align-items:center;gap:10px;margin:0 18px 10px;padding:12px 14px;border:1px solid rgba(11,11,15,.1);border-radius:14px;color:#6b6b78}
  .lx-in:focus-within{border-color:#5072FF}
  .lx-in input{flex:1;min-width:0;border:0;outline:0;background:none;font:400 17px/1.3 inherit;font-family:inherit;color:#0B0B0F}
  .lx-res{overflow-y:auto;padding:0 10px 12px;overscroll-behavior:contain}
  .lx-grp{padding:10px 8px 4px;font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b78;font-weight:500;display:flex;align-items:center;gap:8px}
  .lx-grp i{width:9px;height:9px;border-radius:3px}
  .lx-hit{display:grid;gap:2px;padding:10px 12px;border-radius:14px;text-decoration:none;color:inherit;min-width:0;overflow-wrap:anywhere}
  .lx-hit:hover,.lx-hit.lx-sel{background:rgba(11,11,15,.05)}
  .lx-hit b{font-weight:600;font-size:16.5px;line-height:1.25}.lx-hit span{font-size:13.5px;color:#6b6b78;line-height:1.4}
  .lx-hit small{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b6b78}
  .lx-note{padding:12px;color:#6b6b78;font-size:14px}
  @media (prefers-color-scheme:dark){
    .lx-btn{color:#F2F2F7;background:rgba(26,26,40,.88);border-color:rgba(255,255,255,.1)}
    .lx-dlg{background:rgba(10,10,16,.6);color:#F2F2F7}.lx-box{background:#15151F;border-color:rgba(255,255,255,.09)}
    .lx-site{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.08)}.lx-site.lx-cur{background:#F2F2F7;color:#0B0B0F}
    .lx-in{border-color:rgba(255,255,255,.12)}.lx-in input{color:#F2F2F7}
    .lx-hit:hover,.lx-hit.lx-sel{background:rgba(255,255,255,.06)}.lx-x{border-color:rgba(255,255,255,.12)}
  }
  @media (max-width:640px){.lx-sites{grid-template-columns:repeat(2,minmax(0,1fr))}.lx-site small{display:none}.lx-dlg{padding-top:12px}.lx-box{max-height:calc(100vh - 24px)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => String(s ?? '').replace(/<[^>]+>/g, '').toLowerCase().replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/([aou])e/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim();

  /* Knopf */
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'lx-btn'; btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = '<span class="lx-mk" aria-hidden="true"></span>Lexikon';
  const slot = document.querySelector('[data-lexikon]');
  if (slot) slot.append(btn); else { btn.classList.add('lx-float'); document.body.append(btn); }

  /* Fenster */
  const dlg = document.createElement('div');
  dlg.className = 'lx-dlg'; dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Lexikon');
  dlg.innerHTML = `<div class="lx-box">
      <div><div class="lx-head"><b>Das <span>Lexikon</span></b><button type="button" class="lx-x" aria-label="Schliessen">Esc</button></div>
      <div class="lx-sites">${SITES.map(s => `<a class="lx-site${s.id === cur ? ' lx-cur' : ''}" href="${s.url}/"${s.id === cur ? ' aria-current="page"' : ''}><i style="background:${s.c}"></i><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></a>`).join('')}</div></div>
      <label class="lx-in"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/></svg><input type="search" placeholder="Alles durchsuchen: Herz, Cäsar, Eisen …" aria-label="Alle Seiten durchsuchen" autocomplete="off"></label>
      <div class="lx-res" role="listbox"></div>
    </div>`;
  document.body.append(dlg);
  const inp = dlg.querySelector('input'), res = dlg.querySelector('.lx-res');

  /* Daten: lexikon.json jeder Seite, 1 Stunde im Browser zwischengespeichert */
  let data = null;
  const loadAll = () => data || (data = Promise.all(SITES.map(async s => {
    const key = 'lexikon2:' + s.id + ':' + s.url;
    try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.at < 36e5) return { s, items: c.items }; } catch (e) {}
    try {
      const r = await fetch((s.id === cur ? '' : s.url) + '/lexikon.json', { mode: 'cors' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json(), items = (j.items || []).map(i => ({ ...i, n: norm([i.t, i.k, i.p, i.d].join(' ')), nt: norm(i.t), nk: norm(i.k) }));
      try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), items })); } catch (e) {}
      return { s, items };
    } catch (e) { return { s, items: [], err: true }; }
  })));

  let hits = [], sel = 0;
  const run = async () => {
    const q = norm(inp.value), words = q.split(' ').filter(Boolean);
    if (!words.length) { res.innerHTML = '<p class="lx-note">Ein Wort reicht. Gesucht wird in allen Seiten gleichzeitig.</p>'; hits = []; return; }
    const all = await loadAll();
    if (norm(inp.value) !== q) return;
    hits = []; let html = ''; const failed = [], groups = [];
    for (const { s, items, err } of all) {
      if (err) failed.push(s.name);
      const found = items.map(i => {
        let sc = 0;
        for (const w of words) {
          const at = i.n.indexOf(w); if (at < 0) return null;
          const start = at === 0 || i.n[at - 1] === ' ';
          sc += (i.nt.includes(w) ? 5 : i.nk.includes(w) ? 2 : 1) * (start ? 3 : 1);
        }
        return { i, sc };
      }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 6);
      if (found.length) groups.push({ s, found, best: found[0].sc });
    }
    // Die Seite mit dem besten Treffer zuerst
    groups.sort((a, b) => b.best - a.best);
    for (const { s, found } of groups) {
      html += `<div class="lx-grp"><i style="background:${s.c}"></i>${esc(s.name)}</div>`;
      for (const { i } of found) {
        const href = /^https?:/.test(i.u) ? i.u : s.url + i.u;
        html += `<a class="lx-hit${hits.length === sel ? ' lx-sel' : ''}" href="${esc(href)}" data-n="${hits.length}">${i.p ? `<small>${esc(i.p)}</small>` : ''}<b>${esc(i.t)}</b>${i.d ? `<span>${esc(i.d)}</span>` : ''}</a>`;
        hits.push(href);
      }
    }
    if (!hits.length) html = `<p class="lx-note">Nichts gefunden zu «${esc(inp.value.trim())}».</p>`;
    if (failed.length) html += `<p class="lx-note">Gerade nicht erreichbar: ${failed.map(esc).join(', ')}.</p>`;
    res.innerHTML = html;
  };
  const mark = () => res.querySelectorAll('.lx-hit').forEach((a, n) => { a.classList.toggle('lx-sel', n === sel); if (n === sel) a.scrollIntoView({ block: 'nearest' }); });
  inp.addEventListener('input', () => { sel = 0; run(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, hits.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
    else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); location.href = hits[sel]; }
  });
  const open = () => { dlg.hidden = false; document.documentElement.style.overflow = 'hidden'; inp.focus(); run(); loadAll(); };
  const close = () => { dlg.hidden = true; document.documentElement.style.overflow = ''; btn.focus(); };
  btn.addEventListener('click', open);
  dlg.querySelector('.lx-x').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) close(); });
  window.Lexikon = { open, sites: SITES };
})();
