/* Lexikon-Design: kleine gemeinsame Verhalten für alle Lexika (gehört zu design/lexikon.css).
   - Lichtschein auf Glasflächen folgt der Maus (--mx / --my).
   Einbinden vor </body>:
     <script src="https://mindblow.thinklabs.workers.dev/design/lexikon-ui.js" defer></script> */
(() => {
  if (window.__lexikonUi) return; window.__lexikonUi = true;
  if (!matchMedia('(hover: hover)').matches) return;
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('.glass, .topic, .bcard');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
})();
