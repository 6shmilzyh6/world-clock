const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--hide-scrollbars','--lang=en-US'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true } });
  const out = [];
  // 每个站点用独立 context（独立 localStorage），模拟两个不同用户
  for (const [url, tz, label] of [
    ['https://6shmilzyh6.github.io/world-clock/app/', 'America/Chicago', 'live app (cn build) @ Chicago'],
    ['https://6shmilzyh6.github.io/world-clock/app-en/', 'America/Chicago', 'live app-en (intl build) @ Chicago'],
    ['https://6shmilzyh6.github.io/world-clock/app-en/', 'Asia/Tokyo', 'live app-en @ Tokyo'],
    ['https://6shmilzyh6.github.io/world-clock/app-en/', 'Europe/London', 'live app-en @ London']
  ]) {
    const ctx = await b.createBrowserContext();
    const p = await ctx.newPage();
    await p.emulateTimezone(tz);
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url, { waitUntil:'networkidle2' });
    await wait(1300);
    const s = await p.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('worldclock.v1')||'{}');
      return { lang: st.lang, h24: st.h24, base: document.getElementById('baseCity').textContent,
               time: document.getElementById('baseTime').textContent,
               rows: [...document.querySelectorAll('.tcard')].map(x=>x.querySelector('.city').textContent) };
    });
    out.push({ label, errs, ...s });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
