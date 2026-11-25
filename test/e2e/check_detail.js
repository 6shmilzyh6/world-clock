const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new',
    args: ['--allow-file-access-from-files'],
    defaultViewport: { width: 393, height: 851, deviceScaleFactor: 2, isMobile: true } });
  const p = await b.newPage();
  await p.goto('file:///D:/Documents/world-clock/dist/web/index.html', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.setItem('worldclock.v1', JSON.stringify({
    baseTz:'Asia/Shanghai', refTz:'Asia/Shanghai',
    targets:['America/Los_Angeles','America/New_York','Europe/London','Europe/Paris','Asia/Tokyo','Australia/Sydney'],
    mode:'now', lang:'zh', h24:true, sec:false, advice:true, theme:'dark' })));
  await p.reload({ waitUntil:'load' }); await wait(700);
  await p.click('#modeWall'); await wait(300);
  await p.evaluate(() => { const d=document.getElementById('inDate'); const t=document.getElementById('inTime');
    d.value='2026-06-15'; t.value='09:30'; t.dispatchEvent(new Event('change')); });
  await wait(400);
  const listBefore = await p.evaluate(() => [...document.querySelectorAll('.tcard')].map(c => c.dataset.tz + ' ' + c.querySelector('.rtime').textContent + ' ' + c.querySelector('.rdate').textContent));
  // 点击伦敦
  await p.evaluate(() => { document.querySelector('[data-tz="Europe/London"]').click(); });
  await wait(500);
  const detail = await p.evaluate(() => ({
    title: document.getElementById('detailTitle').textContent,
    rows: [...document.querySelectorAll('.detail-row')].map(r => r.textContent.trim()),
    inDate: document.getElementById('inDate').value,
    inTime: document.getElementById('inTime').value
  }));
  console.log(JSON.stringify({ listBefore, detail }, null, 2));
  await b.close();
})();
