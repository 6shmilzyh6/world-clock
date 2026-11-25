const puppeteer = require('puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--allow-file-access-from-files'],
    defaultViewport:{width:400,height:860,deviceScaleFactor:2,isMobile:true,hasTouch:true}});
  const p = await b.newPage();
  const errs=[];
  p.on('pageerror', e=>errs.push('PAGEERROR: '+e.message));
  p.on('console', m=>{ if(m.type()==='error') errs.push('CONSOLE: '+m.text()); });
  await p.goto('file:///D:/Documents/world-clock/build/worldclock.html',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  const info = await p.evaluate(()=>({
    hasEngine: typeof window.WCEngine,
    bodyLen: document.body.innerHTML.length,
    cards: document.querySelectorAll('.tcard').length,
    baseTime: document.getElementById('baseTime') ? document.getElementById('baseTime').textContent : 'NOEL',
    baseCity: document.getElementById('baseCity') ? document.getElementById('baseCity').textContent : 'NOEL',
    listHTML: (document.getElementById('targetList')||{}).innerHTML ? document.getElementById('targetList').innerHTML.slice(0,300) : 'EMPTY',
    title: document.title
  }));
  console.log(JSON.stringify({errs, info}, null, 2));
  await b.close();
})();
