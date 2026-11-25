const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:\\Documents\\world-clock\\test\\e2e\\shots-web';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--hide-scrollbars'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto('http://127.0.0.1:8788/index.html', { waitUntil: 'networkidle2' });
  await wait(1200);

  // SW 注册检查
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no-sw-api';
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length + ' registration(s)';
  });

  // manifest 可解析
  const mani = await page.evaluate(async () => {
    const r = await fetch('manifest.webmanifest');
    const j = await r.json();
    return { name: j.name, icons: j.icons.length, display: j.display };
  });

  await page.screenshot({ path: path.join(OUT, 'web-01-home.png') });

  // 断网后（SW 缓存）再开
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => errs.push('RELOAD-OFFLINE ' + e.message));
  await wait(1200);
  const offlineOK = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tcard').length,
    base: document.getElementById('baseTime') ? document.getElementById('baseTime').textContent : 'NONE'
  }));
  await page.screenshot({ path: path.join(OUT, 'web-02-offline.png') });

  console.log(JSON.stringify({ errs, sw, mani, offlineOK }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
