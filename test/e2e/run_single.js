const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file:///D:/Documents/world-clock/dist/WorldClock-single.html', { waitUntil: 'load' });
  await wait(900);
  const s = await p.evaluate(() => ({
    cards: document.querySelectorAll('.tcard').length,
    base: document.getElementById('baseTime').textContent,
    zones: window.WCEngine.listTimeZones().length
  }));
  console.log(JSON.stringify({ errs, s }));
  await b.close();
})();
