const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'D:/Documents/world-clock/screenshots';
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--hide-scrollbars'],
    defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 2 } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url() + ' ' + (r.failure()||{}).errorText));
  await p.goto('http://127.0.0.1:8795/index.html', { waitUntil:'networkidle2' });
  await wait(800);
  await p.screenshot({ path: path.join(OUT, 'site-landing.png'), fullPage: true });
  const imgs = await p.evaluate(() => [...document.images].map(i => i.src.split('/').pop() + ':' + i.naturalWidth));
  const links = await p.evaluate(() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href')));
  console.log(JSON.stringify({ errs, imgs, links }, null, 2));
  await b.close();
})();
