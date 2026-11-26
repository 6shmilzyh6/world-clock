const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));

const CASES = [
  { tz: 'America/New_York', label: 'US / New York' },
  { tz: 'America/Los_Angeles', label: 'US / Los Angeles' },
  { tz: 'Europe/Berlin',    label: 'DE / Berlin' },
  { tz: 'Europe/London',    label: 'GB / London' },
  { tz: 'Asia/Tokyo',       label: 'JP / Tokyo' },
  { tz: 'Australia/Sydney', label: 'AU / Sydney' },
  { tz: 'Asia/Kolkata',     label: 'IN / Kolkata' },
  { tz: 'America/Sao_Paulo', label: 'BR / Sao Paulo' },
  { tz: 'Africa/Cairo',     label: 'EG / Cairo' }
];

(async () => {
  const b = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files','--hide-scrollbars','--lang=en-US'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true }
  });
  const out = [];
  for (const c of CASES) {
    const p = await b.newPage();
    await p.emulateTimezone(c.tz);
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///D:/Documents/world-clock/build/worldclock-intl.html', { waitUntil: 'load' });
    await p.evaluate(() => { try { localStorage.clear(); } catch(e){} });
    await p.reload({ waitUntil: 'load' });
    await wait(700);
    const s = await p.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('worldclock.v1') || '{}');
      return {
        deviceTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lang: st.lang, h24: st.h24, baseTz: st.baseTz,
        base: document.getElementById('baseCity').textContent,
        rows: [...document.querySelectorAll('.tcard')].map(x => x.querySelector('.city').textContent + ' ' + x.querySelector('.rtime').textContent)
      };
    });
    out.push({ case: c.label, errs, ...s });
    if (c.tz === 'America/New_York') await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/intl-us.png' });
    if (c.tz === 'Europe/Berlin') await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/intl-de.png' });
    if (c.tz === 'Asia/Tokyo') await p.screenshot({ path: 'D:/Documents/world-clock/screenshots/intl-jp.png' });
    await p.close();
  }
  await b.close();
  console.log(JSON.stringify(out, null, 2));
})();
