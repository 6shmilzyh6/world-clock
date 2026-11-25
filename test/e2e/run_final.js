const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:\\Documents\\world-clock\\test\\e2e\\shots-final';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const PAGE = 'file:///D:/Documents/world-clock/build/worldclock.html';

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
  await wait(900);

  const R = {};
  const shot = async n => page.screenshot({ path: path.join(OUT, n + '.png') });

  /* A 换我的位置：改到纽约 */
  await page.click('#btnPickBase');
  await wait(350);
  await page.type('#pickerSearch', 'new york');
  await wait(350);
  await page.evaluate(() => { const e = document.querySelector('[data-pick="America/New_York"]'); e && e.click(); });
  await wait(600);
  await shot('A-base-ny');
  R.baseAfterSwitch = await page.evaluate(() => ({
    label: document.getElementById('baseLabel').textContent,
    city: document.getElementById('baseCity').textContent,
    sub: document.getElementById('baseSub').textContent,
    rows: [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz + ' ' + c.querySelector('.sub').textContent)
  }));

  /* B 恢复上海，进指定时间模式，改基准为伦敦 */
  await page.click('#btnPickBase'); await wait(300);
  await page.type('#pickerSearch', 'shanghai'); await wait(300);
  await page.evaluate(() => { const e = document.querySelector('[data-pick="Asia/Shanghai"]'); e && e.click(); });
  await wait(400);

  await page.click('#modeWall'); await wait(300);
  await page.evaluate(() => { const d = document.getElementById('inDate'); const t = document.getElementById('inTime'); d.value = '2026-08-20'; t.value = '14:00'; t.dispatchEvent(new Event('change')); });
  await wait(300);
  await page.click('#btnPickRef'); await wait(350);
  await page.type('#pickerSearch', 'london'); await wait(350);
  await page.evaluate(() => { const e = document.querySelector('[data-pick="Europe/London"]'); e && e.click(); });
  await wait(600);
  await shot('B-ref-london');
  R.refLondon = await page.evaluate(() => ({
    chip: document.getElementById('refChip').textContent,
    baseLabel: document.getElementById('baseLabel').textContent,
    base: document.getElementById('baseTime').textContent,
    rows: [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz + ' ' + c.querySelector('.rtime').textContent)
  }));

  /* C 12 小时制 */
  await page.evaluate(() => { document.getElementById('btnSettings').click(); });
  await wait(300);
  await page.evaluate(() => { document.getElementById('btnFmt').click(); document.getElementById('btnSec').click(); document.querySelector('[data-close="set"]').click(); });
  await wait(500);
  await shot('C-12h');
  R.h12 = await page.evaluate(() => ({
    base: document.getElementById('baseTime').textContent,
    rows: [...document.querySelectorAll('.tcard .rtime')].map(x => x.textContent)
  }));

  /* D 预设套用 */
  await page.evaluate(() => { document.getElementById('btnSettings').click(); });
  await wait(300);
  await page.evaluate(() => { document.querySelector('[data-preset="world"]').click(); document.querySelector('[data-close="set"]').click(); });
  await wait(500);
  await shot('D-preset-world');
  R.preset = await page.evaluate(() => [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz));

  /* E 长按删除（用触摸模拟 swipe 状态后点删除） */
  await page.evaluate(() => {
    const c = document.querySelector('.tcard');
    c.classList.add('swiped');
  });
  await wait(300);
  await shot('E-swipe');
  await page.evaluate(() => document.querySelector('.tcard .del').click());
  await wait(400);
  R.afterDelete = await page.evaluate(() => [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz));

  /* F 桌面宽屏 */
  await page.setViewport({ width: 1024, height: 800, deviceScaleFactor: 1 });
  await wait(500);
  await shot('F-desktop');

  /* G 极窄屏 320 */
  await page.setViewport({ width: 320, height: 640, deviceScaleFactor: 2, isMobile: true });
  await wait(500);
  await shot('G-narrow');

  console.log(JSON.stringify({ errs, R }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
