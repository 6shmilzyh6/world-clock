const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file:///D:/Documents/world-clock/build/chk-WorldClock-Intl-v1.0.0/assets/index.html', { waitUntil: 'load' });
  await wait(1000);
  await p.screenshot({ path: 'D:/Documents/world-clock/test/e2e/shots-final/intl-01.png' });
  const s = await p.evaluate(() => ({
    title: document.getElementById('appTitle').textContent,
    targets: document.getElementById('targetsTitle').textContent,
    base: document.getElementById('baseCity').textContent,
    sub: document.getElementById('baseSub').textContent,
    rows: [...document.querySelectorAll('.tcard')].map(c => c.querySelector('.city').textContent + ' | ' + c.querySelector('.rdate').textContent + ' | ' + c.querySelector('.rtime').textContent)
  }));
  await b.close();
  console.log(JSON.stringify({ errs, s }, null, 2));
})();
