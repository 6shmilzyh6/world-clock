const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  // 在页面脚本执行前删掉 formatToParts / NodeList.forEach / closest，模拟 Android 5/6 内核
  await p.evaluateOnNewDocument(() => {
    delete Intl.DateTimeFormat.prototype.formatToParts;
    delete NodeList.prototype.forEach;
    delete Element.prototype.closest;
  });

  await p.goto('file:///D:/Documents/world-clock/build/worldclock-intl.html', { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch(e){} });
  await p.reload({ waitUntil: 'load' });
  await wait(900);

  const s1 = await p.evaluate(() => ({
    hasParts: typeof Intl.DateTimeFormat.prototype.formatToParts,
    cards: document.querySelectorAll('.tcard').length,
    base: document.getElementById('baseCity').textContent,
    baseTime: document.getElementById('baseTime').textContent,
    rows: [...Array.prototype.slice.call(document.querySelectorAll('.tcard'))].map(x => x.querySelector('.city').textContent + ' ' + x.querySelector('.rtime').textContent)
  }));
  await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/legacy-webview.png' });

  // 交互：切指定时间（验证 closest 补丁生效）
  await p.click('#modeWall'); await wait(400);
  await p.evaluate(() => { const d=document.getElementById('inDate'); const t=document.getElementById('inTime');
    d.value='2026-06-15'; t.value='09:30'; t.dispatchEvent(new Event('change')); });
  await wait(500);
  const s2 = await p.evaluate(() => [...Array.prototype.slice.call(document.querySelectorAll('.tcard'))].map(x => x.dataset.tz + ' ' + x.querySelector('.rtime').textContent + ' ' + x.querySelector('.rdate').textContent));

  // 点详情（依赖 closest）
  await p.evaluate(() => document.querySelector('.tcard').click());
  await wait(500);
  const detail = await p.evaluate(() => document.getElementById('detailTitle').textContent);

  console.log(JSON.stringify({ errs, s1, s2, detail }, null, 2));
  await b.close();
})();
