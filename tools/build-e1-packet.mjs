// Rebuild packets/E-1-electrical-packet.pdf from the app's own E-1 sheet, so the PDF always matches
// what the app shows. Page 1 is the "E-1 all" overview, then one page per circuit sheet (E-1.x),
// then the notes and schedules under the drawing.
//
//   cd 7824-Zero-Rd-App && node tools/build-e1-packet.mjs
//
// Needs Playwright (a global install is fine). Set CHROMIUM=/path/to/chromium to pick the browser.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

// Use a local Playwright if there is one, else the global install.
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(join(execSync('npm root -g').toString().trim(), 'x'))('playwright')); }

const root = resolve(new URL('..', import.meta.url).pathname);
const out = join(root, 'packets', 'E-1-electrical-packet.pdf');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf' };

const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(root, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
// Keep the service worker and Firebase out of the way: only the static sheet matters here.
await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, r => r.abort());
await page.goto(`http://127.0.0.1:${port}/index.html#e1`);
await page.waitForSelector('#sheet-e1:not([hidden]) #ckt-tabs');

const ver = await page.$eval('meta[name="app-version"]', m => m.content);
const keys = await page.$$eval('#ckt-tabs button[data-ckt]', bs => bs.map(b => b.dataset.ckt));
const sheets = [];
for (const k of keys) {
  await page.click(`#ckt-tabs button[data-ckt="${k}"]`);
  sheets.push(await page.evaluate(k => {
    const svg = document.querySelector('#sheet-e1 .paper svg').cloneNode(true);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    for (const el of svg.querySelectorAll('.picked, .hi')) el.classList.remove('picked', 'hi');
    const title = k === 'all' ? 'E-1 — All circuits (overview)' : document.getElementById('ckt-name').textContent;
    return { title, svg: svg.outerHTML };
  }, k));
}
await page.click('#ckt-tabs button[data-ckt="all"]');

// Notes and schedules under the drawing: every pane shown in full (the app shows one at a time),
// without the tab bars, search boxes, row filters or the live open-items list.
const below = await page.evaluate(() => {
  const b = document.querySelector('#sheet-e1 .below .panes').cloneNode(true);
  for (const pane of b.querySelectorAll('.pane')) if (pane.querySelector('.open')) pane.remove();
  for (const el of b.querySelectorAll('.panebar, .psearch, input, button')) el.remove();
  for (const el of b.querySelectorAll('[hidden]')) el.removeAttribute('hidden');
  for (const el of b.querySelectorAll('[style]')) el.style.removeProperty('display');
  for (const el of b.querySelectorAll('.picked, .hi')) el.classList.remove('picked', 'hi');
  return b.innerHTML;
});
const css = await page.$$eval('style', ss => ss.map(s => s.textContent).join('\n'));
const date = new Date().toISOString().slice(0, 10);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
@page { size: 11in 8.5in; margin: 0.35in; }
html, body { background: #fff !important; color: #222; margin: 0; }
.pg { break-after: page; height: 7.75in; display: flex; flex-direction: column; }
.pg h1 { font: 600 14px/1.3 'IBM Plex Sans', Helvetica, Arial, sans-serif; margin: 0 0 6px; }
.pg .dw { flex: 1; min-height: 0; display: flex; justify-content: center; }
.pg .dw svg { height: 100%; width: auto; max-width: 100%; }
/* same circuit filtering the app does on screen */
.dw svg .wire { display: none; }
.dw svg[data-ckt-mode] .wire.show { display: block; }
.dw svg[data-ckt-mode] .sym { display: none; }
.dw svg[data-ckt-mode] .sym.show { display: block; }
.tables { font-size: 9.5px; }
.tables .pane { display: block !important; break-before: page; }
.tables .pane:first-child { break-before: auto; }
.tables h2 { font-size: 16px; margin: 0 0 6px; }
.tables h3 { font-size: 14px; margin: 0 0 6px; }
.tables li, .tables p { font-size: 10.5px; max-width: none; }
.tables ol, .tables ul, .tables .tbl { max-width: none; }
.tables table { width: 100%; border-collapse: collapse; }
.tables th, .tables td { padding: 2px 5px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
.tables thead { display: table-header-group; }
.tables tr { break-inside: avoid; }
.tables .tbl { overflow: visible !important; max-height: none !important; }
</style></head><body>
${sheets.map(s => `<div class="pg"><h1>${s.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')} <span style="font-weight:400;color:#777">· 7824 Zero Road, second floor · rev ${ver} · ${date}</span></h1><div class="dw">${s.svg}</div></div>`).join('\n')}
<div class="tables">${below}</div>
</body></html>`;

const pr = await browser.newPage();
await pr.setContent(html, { waitUntil: 'load' });
await pr.pdf({ path: out, width: '11in', height: '8.5in', printBackground: true, margin: { top: '0.35in', bottom: '0.35in', left: '0.35in', right: '0.35in' } });
await browser.close(); server.close();
console.log(`wrote ${out}: ${sheets.length} drawing pages + schedules, rev ${ver}`);
