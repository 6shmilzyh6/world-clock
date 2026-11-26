const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--hide-scrollbars'],
    defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 2 } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url().split('/').pop()));
  await p.goto('http://127.0.0.1:8797/index.html', { waitUntil:'networkidle2' });
  await wait(700);
  await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/site-landing.png', fullPage: true });
  const imgs = await p.evaluate(() => [...document.images].map(i => i.src.split('/').pop() + ':' + i.naturalWidth));
  console.log(JSON.stringify({ errs, imgs }, null, 2));
  await b.close();
})();
