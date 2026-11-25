const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:\\Documents\\world-clock\\test\\e2e\\shots';
const PAGE = 'file:///D:/Documents/world-clock/build/worldclock.html';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=2',
           '--font-render-hinting=none', '--disable-lcd-text'],
    defaultViewport: { width: 400, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(PAGE, { waitUntil: 'load' });
  await page.evaluateOnNewDocument?.(() => {});
  await wait(800);

  const log = [];
  const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n + '.png') }); };

  /* 1 首屏 */
  await shot('01-home');
  const home = await page.evaluate(() => ({
    cards: document.querySelectorAll('.tcard').length,
    baseCity: document.getElementById('baseCity').textContent,
    baseTime: document.getElementById('baseTime').textContent,
    baseSub: document.getElementById('baseSub').textContent,
    firstRow: document.querySelector('.tcard') ? {
      tz: document.querySelector('.tcard').dataset.tz,
      time: document.querySelector('.tcard .rtime').textContent,
      date: document.querySelector('.tcard .rdate').textContent,
      sub: document.querySelector('.tcard .sub').textContent
    } : null
  }));
  log.push({ step: 'home', ...home });

  /* 2 指定时间：2026-06-15 09:30 上海 = 伦敦 02:30 */
  await page.click('#modeWall');
  await wait(300);
  await page.evaluate(() => {
    document.getElementById('inDate').value = '2026-06-15';
    const t = document.getElementById('inTime');
    t.value = '09:30';
    t.dispatchEvent(new Event('change'));
  });
  await wait(400);
  await shot('02-wall-time');
  const wall = await page.evaluate(() => ({
    base: document.getElementById('baseTime').textContent,
    ref: document.getElementById('refChip').textContent,
    rows: [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz + ' | ' + c.querySelector('.rtime').textContent + ' | ' + c.querySelector('.rdate').textContent)
  }));
  log.push({ step: 'wall 2026-06-15 09:30', ...wall });

  /* 3 城市选择器 */
  await page.click('#btnAdd');
  await wait(400);
  await page.type('#pickerSearch', 'par');
  await wait(400);
  await shot('03-picker');
  const pickerCount = await page.evaluate(() => document.querySelectorAll('.pitem').length);
  log.push({ step: 'picker search par', results: pickerCount });

  await page.evaluate(() => { const e = document.querySelector('[data-pick="Europe/Paris"]'); if (e) e.click(); });
  await wait(500);
  await shot('04-paris-added');

  /* 4 详情 */
  await page.evaluate(() => document.querySelector('.tcard').click());
  await wait(500);
  await shot('05-detail');
  log.push({
    step: 'detail',
    title: await page.evaluate(() => document.getElementById('detailTitle').textContent),
    rows: await page.evaluate(() => [...document.querySelectorAll('.detail-row')].map(r => r.textContent.trim())),
    strip: await page.evaluate(() => document.querySelectorAll('.ystrip-item').length)
  });
  await page.evaluate(() => document.querySelector('[data-close="detail"]').click());
  await wait(300);

  /* 5 设置 + 亮色 + 12h + 秒 */
  await page.evaluate(() => { document.getElementById('btnSettings').click(); });
  await wait(400);
  await shot('06-settings');
  await page.evaluate(() => document.getElementById('btnFmt').click());
  await page.evaluate(() => document.getElementById('btnSec').click());
  await page.evaluate(() => document.querySelector('[data-close="set"]').click());
  await page.evaluate(() => document.body.classList.add('light'));
  await wait(500);
  await shot('07-light-12h-sec');
  log.push({ step: '12h+sec', base: await page.evaluate(() => document.getElementById('baseTime').textContent) });

  /* 6 英文界面 */
  await page.evaluate(() => {
    document.body.classList.remove('light');
    document.getElementById('btnFmt').click();
    document.getElementById('btnLang').click();
  });
  await wait(500);
  await shot('08-english');
  log.push({
    step: 'en',
    labels: await page.evaluate(() => [
      document.getElementById('appTitle').textContent,
      document.getElementById('targetsTitle').textContent,
      document.getElementById('addLabel').textContent,
      document.getElementById('modeWall').textContent
    ])
  });

  /* 7 边界：30 分钟 / 12:45 / 半小时时区 / 跨日 / 夏令时 */
  const asserts = await page.evaluate(() => {
    const E = window.WCEngine;
    const o = {};
    o.zones = E.listTimeZones().length;
    o.nyJul = E.offsetMinutes('America/New_York', new Date('2026-07-10T12:00:00Z'));
    o.nyJan = E.offsetMinutes('America/New_York', new Date('2026-01-10T12:00:00Z'));
    o.ktm = E.offsetMinutes('Asia/Kathmandu');
    o.chatham = E.offsetMinutes('Pacific/Chatham', new Date('2026-06-10T00:00:00Z'));
    o.lordHowe = E.offsetMinutes('Australia/Lord_Howe', new Date('2026-01-10T00:00:00Z'));
    const a = E.compute({ baseTz: 'Asia/Shanghai', targets: ['Europe/London'], mode: 'wall', wall: { y: 2026, mo: 6, d: 15, h: 9, mi: 30 } });
    o.sh0930_london = a.rows[0].time;
    const b = E.compute({ baseTz: 'Asia/Shanghai', targets: ['America/New_York'], mode: 'wall', wall: { y: 2026, mo: 6, d: 15, h: 9, mi: 30 } });
    o.sh0930_ny = b.rows[0].time + ' ' + b.rows[0].dayDiffLabel;
    const c = E.compute({ baseTz: 'Asia/Shanghai', targets: ['Pacific/Auckland'], mode: 'wall', wall: { y: 2026, mo: 6, d: 15, h: 23, mi: 30 } });
    o.sh2330_akl = c.rows[0].time + ' ' + c.rows[0].date + ' ' + c.rows[0].dayDiffLabel;
    const d = E.compute({ baseTz: 'Asia/Shanghai', targets: ['America/Los_Angeles'], mode: 'wall', wall: { y: 2026, mo: 3, d: 8, h: 15, mi: 0 } });
    o.dstEdge_la = d.rows[0].time + ' ' + d.rows[0].offsetText;
    return o;
  });
  log.push({ step: 'asserts', ...asserts });

  /* 8 持久化：localStorage 是否记住巴黎 */
  const stored = await page.evaluate(() => localStorage.getItem('worldclock.v1'));
  log.push({ step: 'storage', stored });

  /* 9 清空 + 空状态 */
  await page.evaluate(() => {
    document.getElementById('btnLang').click();
    document.getElementById('btnSettings').click();
  });
  await wait(300);
  await page.evaluate(() => { document.getElementById('btnClear').click(); document.querySelector('[data-close="set"]').click(); });
  await wait(400);
  await shot('09-empty');

  console.log(JSON.stringify({ errors, log }, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
