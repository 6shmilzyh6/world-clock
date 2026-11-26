const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const SITE = 'D:/Documents/world-clock/docs';

const CASES = [
  { tz: 'America/New_York', label: 'US/New York' },
  { tz: 'Europe/London',    label: 'GB/London' },
  { tz: 'Europe/Berlin',    label: 'DE/Berlin' },
  { tz: 'Asia/Tokyo',       label: 'JP/Tokyo' },
  { tz: 'Australia/Sydney', label: 'AU/Sydney' },
  { tz: 'Asia/Kolkata',     label: 'IN/Kolkata' }
];

(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars','--lang=en-US'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true } });
  const out = [];
  for (const c of CASES) {
    const p = await b.newPage();
    await p.emulateTimezone(c.tz);
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///' + SITE + '/app-en/index.html', { waitUntil: 'load' });
    await p.evaluate(() => { try { localStorage.clear(); } catch(e){} });
    await p.reload({ waitUntil: 'load' });
    await wait(700);
    const s = await p.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('worldclock.v1') || '{}');
      return { lang: st.lang, h24: st.h24, base: document.getElementById('baseCity').textContent,
               baseTime: document.getElementById('baseTime').textContent,
               rows: [...document.querySelectorAll('.tcard')].map(x => x.querySelector('.city').textContent) };
    });
    out.push({ case: c.label, errs, ...s });
    await p.close();
  }
  await b.close();
  console.log(JSON.stringify(out, null, 2));
})();
