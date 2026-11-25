const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:\\Documents\\world-clock\\test\\e2e\\shots-apk';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  // 模拟 Android WebView 的 file:///android_asset/index.html
  await p.goto('file:///D:/Documents/world-clock/build/apktest/apk-index.html', { waitUntil: 'load' });
  await wait(1000);
  await p.screenshot({ path: path.join(OUT, 'apk-01.png') });
  const s1 = await p.evaluate(() => ({
    cards: document.querySelectorAll('.tcard').length,
    base: document.getElementById('baseTime').textContent,
    city: document.getElementById('baseCity').textContent,
    zones: window.WCEngine.listTimeZones().length
  }));
  // 切指定时间
  await p.click('#modeWall'); await wait(300);
  await p.evaluate(() => { const d=document.getElementById('inDate'); const t=document.getElementById('inTime'); d.value='2026-12-31'; t.value='23:45'; t.dispatchEvent(new Event('change')); });
  await wait(400);
  await p.screenshot({ path: path.join(OUT, 'apk-02-wall.png') });
  const s2 = await p.evaluate(() => [...document.querySelectorAll('.tcard')].map(c => c.querySelector('.rtime').textContent + ' ' + c.querySelector('.rdate').textContent));
  // 加城市 + 详情
  await p.evaluate(() => document.getElementById('btnAdd').click()); await wait(300);
  await p.type('#pickerSearch', '悉尼'); await wait(300);
  const found = await p.evaluate(() => [...document.querySelectorAll('.pitem')].map(x => x.dataset.pick));
  await p.screenshot({ path: path.join(OUT, 'apk-03-picker.png') });
  await b.close();
  console.log(JSON.stringify({ errs, s1, s2, found }, null, 2));
})();
