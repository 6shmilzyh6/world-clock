const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true } });
  const p = await b.newPage();
  await p.emulateTimezone('America/New_York');
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  // 中文版装在美国设备上：仍应中文 + 24h
  await p.goto('file:///D:/Documents/world-clock/build/worldclock.html', { waitUntil:'load' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil:'load' });
  await wait(700);
  const cn = await p.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('worldclock.v1')||'{}');
    return { lang: st.lang, h24: st.h24, base: document.getElementById('baseCity').textContent,
             title: document.getElementById('appTitle').textContent,
             rows: [...document.querySelectorAll('.tcard')].map(x=>x.querySelector('.city').textContent) };
  });

  // 切到英文后应保持英文（不被 region 覆盖）
  await p.evaluate(() => document.getElementById('btnLang').click());
  await wait(400);
  const after = await p.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('worldclock.v1')||'{}');
    return { lang: st.lang, title: document.getElementById('appTitle').textContent,
             rows: [...document.querySelectorAll('.tcard')].map(x=>x.querySelector('.city').textContent) };
  });
  await p.reload({ waitUntil:'load' });
  await wait(700);
  const persisted = await p.evaluate(() => document.getElementById('appTitle').textContent);

  console.log(JSON.stringify({ errs, cn, after, persisted }, null, 2));
  await b.close();
})();
