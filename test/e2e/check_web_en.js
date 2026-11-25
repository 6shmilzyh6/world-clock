const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--hide-scrollbars'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://127.0.0.1:8791/index.html', { waitUntil: 'networkidle2' });
  await wait(1200);
  const s = await p.evaluate(() => ({
    title: document.getElementById('appTitle').textContent,
    base: document.getElementById('baseCity').textContent,
    addLabel: document.getElementById('addLabel').textContent,
    lang: JSON.parse(localStorage.getItem('worldclock.v1') || '{}').lang
  }));
  await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/08-web-en.png' });
  // offline check
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: 'domcontentloaded' }).catch(()=>{});
  await wait(1200);
  const off = await p.evaluate(() => document.querySelectorAll('.tcard').length + ' cards');
  console.log(JSON.stringify({ errs, s, off }, null, 2));
  await b.close();
})();
