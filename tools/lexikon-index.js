// Schreibt lexikon.json (Suchindex für den Lexikon-Verbund) aus js/themen.js.
// Nach jeder Änderung an js/themen.js ausführen: node tools/lexikon-index.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'js/themen.js'), 'utf8'), ctx);
const { BEREICHE, THEMEN } = ctx.window.MB_THEMEN;
const plain = s => s.replace(/<[^>]+>/g, '');
const bName = Object.fromEntries(BEREICHE.map(b => [b.id, b]));
const items = [];
for (const t of THEMEN) {
  if (t.soon) continue;
  const b = bName[t.b], g = b.gebiete.find(x => x.id === t.g);
  items.push({ t: plain(t.title), u: `/${t.slug}.html`, d: t.teaser, k: [t.short, t.tags].join(' '), p: `${b.name} · ${g.name}` });
}
for (const b of BEREICHE) {
  items.push({ t: b.name, u: `/themen.html?b=${b.id}`, d: b.intro, k: b.gebiete.map(g => g.name).join(' '), p: 'Bereich' });
  for (const g of b.gebiete) items.push({ t: g.name, u: `/themen.html?b=${b.id}&g=${g.id}`, d: `Themen im Bereich ${b.name}`, k: '', p: `Gebiet · ${b.name}` });
}
fs.writeFileSync(path.join(root, 'lexikon.json'), JSON.stringify({ site: 'mindblow', items }, null, 0) + '\n');
console.log(`lexikon.json: ${items.length} Einträge`);
