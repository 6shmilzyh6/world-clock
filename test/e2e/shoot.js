const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:\\Documents\\world-clock\\screenshots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const PAGE = 'file:///D:/Documents/world-clock/dist/web/index.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await page.goto(PAGE, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await wait(1000);

  const shot = async (n) => page.screenshot({ path: path.join(OUT, n + '.png') });

  // 1 首页（预置 6 城）
  await page.evaluate(() => {
    localStorage.setItem('worldclock.v1', JSON.stringify({
      baseTz: 'Asia/Shanghai', refTz: 'Asia/Shanghai',
      targets: ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'],
      mode: 'now', lang: 'zh', h24: true, sec: false, advice: true, theme: 'dark'
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await wait(900);
  await shot('01-home');

  // 2 指定时间
  await page.click('#modeWall');
  await wait(350);
  await page.evaluate(() => {
    const d = document.getElementById('inDate'); const t = document.getElementById('inTime');
    d.value = '2026-06-15'; t.value = '09:30'; t.dispatchEvent(new Event('change'));
  });
  await wait(500);
  await shot('02-schedule');

  // 3 城市选择器
  await page.click('#btnAdd');
  await wait(400);
  await shot('03-picker');
  await page.evaluate(() => document.querySelector('[data-close="picker"]').click());
  await wait(300);

  // 4 城市详情
  await page.evaluate(() => document.querySelectorAll('.tcard')[2].click());
  await wait(500);
  await shot('04-detail');
  await page.evaluate(() => document.querySelector('[data-close="detail"]').click());
  await wait(300);

  // 5 设置
  await page.evaluate(() => document.getElementById('btnSettings').click());
  await wait(400);
  await shot('05-settings');
  await page.evaluate(() => document.querySelector('[data-close="set"]').click());
  await wait(300);

  // 6 浅色 + 12 小时
  await page.evaluate(() => {
    localStorage.setItem('worldclock.v1', JSON.stringify({
      baseTz: 'Asia/Shanghai', refTz: 'Asia/Shanghai',
      targets: ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'],
      mode: 'now', lang: 'zh', h24: false, sec: true, advice: true, theme: 'light'
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await wait(900);
  await shot('06-light-12h');

  // 7 英文
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('worldclock.v1'));
    s.lang = 'en'; s.theme = 'dark'; s.h24 = true; s.sec = false;
    localStorage.setItem('worldclock.v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await wait(900);
  await shot('07-english');

  console.log(JSON.stringify({ errs, shots: fs.readdirSync(OUT) }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
