const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  // 线上真实站点
  await p.goto('https://6shmilzyh6.github.io/world-clock/app/', { waitUntil: 'networkidle2' });
  await wait(1500);
  const live = await p.evaluate(() => ({
    title: document.getElementById('appTitle') ? document.getElementById('appTitle').textContent : 'NONE',
    cards: document.querySelectorAll('.tcard').length,
    base: document.getElementById('baseTime') ? document.getElementById('baseTime').textContent : 'NONE',
    city: document.getElementById('baseCity') ? document.getElementById('baseCity').textContent : 'NONE',
    zones: window.WCEngine ? window.WCEngine.listTimeZones().length : 0
  }));
  await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/live-app.png' });

  // 交互：切指定时间
  await p.click('#modeWall'); await wait(400);
  await p.evaluate(() => { const d=document.getElementById('inDate'); const t=document.getElementById('inTime');
    d.value='2026-06-15'; t.value='09:30'; t.dispatchEvent(new Event('change')); });
  await wait(500);
  const wall = await p.evaluate(() => ({
    base: document.getElementById('baseTime').textContent,
    rows: [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz + ' ' + c.querySelector('.rtime').textContent)
  }));
  await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/live-schedule.png' });

  // SW 注册 + 断网
  const sw = await p.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no';
    const r = await navigator.serviceWorker.getRegistrations();
    return r.length + ' reg';
  });
  await wait(1200);
  await p.setOfflineMode(true);
  await p.reload({ waitUntil: 'domcontentloaded' }).catch(()=>{});
  await wait(1500);
  const off = await p.evaluate(() => document.querySelectorAll('.tcard').length + ' cards');
  await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/live-offline.png' });

  console.log(JSON.stringify({ errs, live, wall, sw, off }, null, 2));
  await b.close();
})();
