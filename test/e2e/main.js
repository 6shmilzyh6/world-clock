const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = 'D:\\Documents\\world-clock\\test\\e2e\\shots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const PAGE = 'file:///D:/Documents/world-clock/build/worldclock.html';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

app.commandLine.appendSwitch('lang', 'zh-CN');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 420, height: 900,
    show: false,
    useContentSize: true,
    webPreferences: { offscreen: false, javascript: true, webSecurity: false }
  });
  await win.loadURL(PAGE);
  await wait(900);

  const log = [];
  const shots = [];

  async function shot(name) {
    const img = await win.webContents.capturePage();
    const p = path.join(OUT, name + '.png');
    fs.writeFileSync(p, img.toPNG());
    shots.push(p);
    return p;
  }

  async function js(code) {
    return await win.webContents.executeJavaScript(code, true);
  }

  // 1. 首屏
  await shot('01-home');

  // 基础断言
  const baseInfo = await js(`(() => {
    const c = window.WCEngine.compute({baseTz:'Asia/Shanghai',targets:['America/New_York','Europe/London','Asia/Tokyo'],mode:'now'});
    return {
      cards: document.querySelectorAll('.tcard').length,
      baseCity: document.getElementById('baseCity').textContent,
      baseTime: document.getElementById('baseTime').textContent,
      firstCardTime: document.querySelector('.tcard .rtime') ? document.querySelector('.tcard .rtime').textContent : null,
      hasEngine: typeof window.WCEngine === 'object'
    };
  })()`);
  log.push(['home', baseInfo]);

  // 2. 打开“指定时间”
  await js(`document.getElementById('modeWall').click()`);
  await wait(400);
  await js(`(() => {
    const el = document.getElementById('inDate');
    const t = document.getElementById('inTime');
    const d = new Date();
    el.value = '2026-06-15';
    t.value = '09:30';
    t.dispatchEvent(new Event('change'));
  })()`);
  await wait(500);
  await shot('02-wall');
  const wallInfo = await js(`(() => {
    const rows = [...document.querySelectorAll('.tcard')].map(c => ({
      tz: c.dataset.tz,
      t: c.querySelector('.rtime').textContent,
      d: c.querySelector('.rdate').textContent
    }));
    return { base: document.getElementById('baseTime').textContent, rows };
  })()`);
  log.push(['wall-2026-06-15-0930', wallInfo]);

  // 3. 添加城市面板
  await js(`document.getElementById('btnAdd').click()`);
  await wait(450);
  await js(`(() => { const s = document.getElementById('pickerSearch'); s.value = 'paris'; s.dispatchEvent(new Event('input')); })()`);
  await wait(350);
  await shot('03-picker');

  // 4. 选中巴黎
  await js(`(() => { const p = document.querySelector('[data-pick="Europe/Paris"]'); if (p) p.click(); })()`);
  await wait(600);
  await shot('04-added');

  // 5. 详情
  await js(`(() => { const c = document.querySelector('.tcard'); if (c) c.click(); })()`);
  await wait(500);
  await shot('05-detail');
  const detailTitle = await js(`document.getElementById('detailTitle').textContent`);
  log.push(['detail', detailTitle]);
  await js(`document.querySelector('[data-close="detail"]').click()`);
  await wait(300);

  // 6. 设置 / 亮色 + 12h
  await js(`document.body.classList.add('light')`);
  await js(`(() => { document.getElementById('btnSettings').click(); })()`);
  await wait(400);
  await shot('06-settings');
  await js(`document.getElementById('btnFmt').click()`);
  await js(`document.getElementById('btnSec').click()`);
  await js(`document.querySelector('[data-close="set"]').click()`);
  await wait(400);
  await shot('07-light-12h');
  const fmt = await js(`document.getElementById('baseTime').textContent`);
  log.push(['12h+sec', fmt]);

  // 7. 英文
  await js(`document.body.classList.remove('light'); document.getElementById('btnFmt').click(); document.getElementById('btnLang').click()`);
  await wait(500);
  await shot('08-english');
  log.push(['en', await js(`document.getElementById('targetsTitle').textContent + ' | ' + document.getElementById('addLabel').textContent`)]);

  // 8. 逻辑断言：夏令时 / 半小时时区 / 跨日
  const asserts = await js(`(() => {
    const E = window.WCEngine;
    const out = {};
    out.dstNYsummer = E.offsetMinutes('America/New_York', new Date('2026-07-10T12:00:00Z'));
    out.dstNYwinter = E.offsetMinutes('America/New_York', new Date('2026-01-10T12:00:00Z'));
    out.kathmandu = E.offsetMinutes('Asia/Kathmandu');
    out.chathamCurrent = E.offsetMinutes('Pacific/Chatham', new Date());
    const r = E.compute({baseTz:'Asia/Shanghai', targets:['Pacific/Auckland'], mode:'wall', wall:{y:2026,mo:6,d:15,h:23,mi:30}});
    out.crossDay = r.rows[0].date + ' ' + r.rows[0].dayDiffLabel;
    // 伦敦 2026-06-15 09:30 上海 -> 应 02:30 同日
    const r2 = E.compute({baseTz:'Asia/Shanghai', targets:['Europe/London'], mode:'wall', wall:{y:2026,mo:6,d:15,h:9,mi:30}});
    out.londonCheck = r2.rows[0].time;
    return out;
  })()`);
  log.push(['asserts', asserts]);

  console.log(JSON.stringify(log, null, 2));
  console.log('SHOTS:', shots.length);
  app.quit();
});
