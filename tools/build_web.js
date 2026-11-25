// 生成网页版 + GitHub Pages 站点
//   docs/app/      中文 PWA
//   docs/app-en/   英文 PWA
//   docs/index.html 落地页（下载按钮 + 入口）
// 用法: node tools/build_web.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const DOCS = path.join(ROOT, 'docs');

const REPO = '6shmilzyh6/world-clock';
const SITE = `https://${REPO.split('/')[0]}.github.io/${REPO.split('/')[1]}`;
const REL = `https://github.com/${REPO}/releases/latest/download`;

const APK_ZH = 'WorldClock-zh-v1.0.0.apk';
const APK_EN = 'WorldClock-Intl-v1.0.0.apk';

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function mk(p) { fs.mkdirSync(p, { recursive: true }); }

/* ---------- 1. 两套 PWA ---------- */
function buildWeb(opts) {
  const DIST = path.join(DOCS, opts.dir);
  rmrf(DIST);
  mk(DIST);
  mk(path.join(DIST, 'icons'));

  for (const f of ['engine.js', 'style.css']) {
    fs.copyFileSync(path.join(APP, f), path.join(DIST, f));
  }

  let appjs = fs.readFileSync(path.join(APP, 'app.js'), 'utf8');
  appjs = appjs.replace("mode: 'now', lang: 'zh'", `mode: 'now', lang: '${opts.lang}'`);
  fs.writeFileSync(path.join(DIST, 'app.js'), appjs, 'utf8');

  let html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  html = html.replace('<title>世界时钟 · World Clock</title>', `<title>${opts.title}</title>`);
  html = html.replace(
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n' +
    '<link rel="manifest" href="manifest.webmanifest">\n' +
    `<meta name="description" content="${opts.desc}">`
  );
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

  const manifest = {
    name: opts.title,
    short_name: opts.shortName,
    description: opts.desc,
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    lang: opts.lang === 'en' ? 'en' : 'zh-CN',
    categories: ['utilities', 'productivity'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

  const sw = `/* World Clock Service Worker —— 首次访问后完全离线可用 */
const CACHE = 'worldclock-${opts.cache}';
const ASSETS = [
  './', './index.html', './style.css', './engine.js', './app.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
`;
  fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf8');

  let page = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  page = page.replace('</body>', `<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
</script>
</body>`);
  fs.writeFileSync(path.join(DIST, 'index.html'), page, 'utf8');

  const ICON = path.join(ROOT, 'android', 'icon');
  for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-512-maskable.png']) {
    const src = path.join(ICON, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, 'icons', f));
  }
  console.log(`docs/${opts.dir} ✓  默认语言 ${opts.lang}`);
}

rmrf(path.join(DOCS, 'web'));
rmrf(path.join(DOCS, 'web-en'));

buildWeb({
  dir: 'app', lang: 'zh', cache: 'zh-v1',
  title: '世界时钟 · World Clock', shortName: '世界时钟',
  desc: '按你设定的位置换算世界各地时间，自动处理夏令时，纯离线运行。'
});
buildWeb({
  dir: 'app-en', lang: 'en', cache: 'en-v1',
  title: 'World Clock · 世界时钟', shortName: 'World Clock',
  desc: 'Convert times across the world from your own location. DST handled automatically, works fully offline.'
});

/* ---------- 2. 站点图片 ---------- */
mk(path.join(DOCS, 'img'));
const SHOTS = path.join(ROOT, 'screenshots');
const want = {
  '01-home.png': 'shot-home.png',
  '02-schedule.png': 'shot-schedule.png',
  '04-detail.png': 'shot-detail.png',
  '07-english.png': 'shot-en.png'
};
for (const [src, dst] of Object.entries(want)) {
  const p = path.join(SHOTS, src);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DOCS, 'img', dst));
}
fs.copyFileSync(path.join(ROOT, 'android', 'icon', 'icon-192.png'), path.join(DOCS, 'img', 'favicon.png'));
fs.copyFileSync(path.join(ROOT, 'android', 'icon', 'icon-512.png'), path.join(DOCS, 'img', 'icon-512.png'));

/* ---------- 3. 落地页 ---------- */
const index = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>世界时钟 · World Clock — 下载</title>
<meta name="description" content="按你设定的位置换算世界各地时间，自动处理夏令时。安卓 APK、iPhone 网页版，全部离线可用。">
<link rel="icon" href="img/favicon.png">
<link rel="apple-touch-icon" href="img/icon-512.png">
<meta property="og:title" content="世界时钟 · World Clock">
<meta property="og:description" content="按你设定的位置换算世界各地时间，自动处理夏令时。纯离线，无需账号。">
<meta property="og:image" content="${SITE}/img/icon-512.png">
<style>
:root{--bg:#0f1115;--card:#1b2029;--line:#2b323f;--txt:#e8edf6;--txt2:#9aa6ba;--txt3:#6d7889;--accent:#4f8cff;--ok:#3ecf8e}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:-apple-system,"HarmonyOS Sans SC","PingFang SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.65}
a{color:var(--accent);text-decoration:none}
.wrap{max-width:960px;margin:0 auto;padding:0 22px 80px}
header{padding:64px 0 40px;text-align:center}
.hero-icon{width:88px;height:88px;border-radius:20px;box-shadow:0 12px 40px rgba(79,140,255,.28)}
h1{font-size:34px;margin:22px 0 8px;letter-spacing:.5px}
h1 small{display:block;font-size:15px;color:var(--txt3);font-weight:400;letter-spacing:2px;margin-top:6px}
.lead{color:var(--txt2);font-size:15.5px;max-width:600px;margin:14px auto 0}
.badges{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.badge{font-size:12px;color:var(--txt2);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
.dl{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:44px 0 10px}
@media(max-width:640px){.dl{grid-template-columns:1fr}}
.dlcard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.dlcard h3{margin:0 0 4px;font-size:16px}
.dlcard p{margin:0 0 14px;color:var(--txt3);font-size:12.5px}
.btn{display:block;text-align:center;padding:12px;border-radius:11px;font-size:14px;font-weight:600;
  background:var(--accent);color:#fff;margin-bottom:8px;transition:.15s}
.btn:hover{filter:brightness(1.12)}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--txt2);font-weight:500;margin-bottom:0}
.btn.ghost:hover{border-color:var(--accent);color:var(--accent)}
.note{font-size:11.5px;color:var(--txt3);margin-top:10px;line-height:1.75}
h2{font-size:19px;margin:56px 0 18px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.shots{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px}
.shots img{height:430px;border-radius:14px;border:1px solid var(--line);flex:0 0 auto}
.feat{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:640px){.feat{grid-template-columns:1fr}}
.feat div{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px;font-size:13.5px}
.feat b{display:block;margin-bottom:3px;font-size:14px}
.feat span{color:var(--txt3);font-size:12.5px}
pre{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow-x:auto;font-size:12.5px;color:var(--txt2)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
footer{text-align:center;color:var(--txt3);font-size:12px;padding-top:56px;line-height:2}
</style>
</head>
<body>
<div class="wrap">
<header>
  <img class="hero-icon" src="img/icon-512.png" alt="世界时钟">
  <h1>世界时钟<small>WORLD CLOCK</small></h1>
  <p class="lead">按你设定的位置换算世界各地时间。想看的城市由你自己定，夏令时自动处理，418 个时区，全程离线。</p>
  <div class="badges">
    <span class="badge">Android 5.0+</span>
    <span class="badge">iPhone / iPad</span>
    <span class="badge">纯离线</span>
    <span class="badge">无广告 · 无账号</span>
  </div>
</header>

<div class="dl">
  <div class="dlcard">
    <h3>🇨🇳 安卓 · 中文版</h3>
    <p>APK · 205 KB · 包名 com.yg.worldclock</p>
    <a class="btn" href="${REL}/${APK_ZH}">下载 APK</a>
    <a class="btn ghost" href="app/">网页版打开</a>
    <div class="note">手机浏览器直接点上面的链接下载，安装时允许"未知来源应用"即可。</div>
  </div>
  <div class="dlcard">
    <h3>🌍 Android / iOS · English</h3>
    <p>APK + PWA · default UI in English</p>
    <a class="btn" href="${REL}/${APK_EN}">Download APK</a>
    <a class="btn ghost" href="app-en/">Open web app</a>
    <div class="note">International build has a different package name, so both can be installed side by side.</div>
  </div>
</div>

<h2>截图</h2>
<div class="shots">
  <img src="img/shot-home.png" alt="实时模式">
  <img src="img/shot-schedule.png" alt="指定时间换算">
  <img src="img/shot-detail.png" alt="城市详情">
  <img src="img/shot-en.png" alt="English UI">
</div>

<h2>功能</h2>
<div class="feat">
  <div><b>位置由你设定</b><span>点"切换"改我的位置；指定时间模式下还能单独换基准城市</span></div>
  <div><b>实时模式</b><span>一屏看遍所有对照城市当前几点，标注快慢几小时</span></div>
  <div><b>指定时间换算</b><span>输入任意日期时间，立刻算出各城市当地时间，跨日标昨天/明天</span></div>
  <div><b>418 个时区</b><span>含半小时、45 分钟偏移：加德满都 +5:45、查塔姆 +12:45</span></div>
  <div><b>夏令时自动</b><span>按当天真实 DST 规则算，切换日 23/25 小时的边界也正确</span></div>
  <div><b>联系建议</b><span>按对方当地时间提示"适合联系 / 对方可能已休息"</span></div>
  <div><b>城市详情</b><span>UTC 偏移、DST 状态、与我的时差、当天逐时对照表</span></div>
  <div><b>中英双语</b><span>24/12 小时制、深/浅主题、显示秒、城市预设一键套用</span></div>
</div>

<h2>iPhone / iPad 安装</h2>
<p style="color:var(--txt2);font-size:14px">Safari 打开 <a href="app/">网页版</a> → 点分享按钮 → <b>添加到主屏幕</b>。之后从桌面图标启动，全屏无地址栏，断网也能用。</p>

<h2>直接访问</h2>
<pre><code>网页版（中文）  ${SITE}/app/
网页版（英文）  ${SITE}/app-en/
安卓 APK        ${REL}/${APK_ZH}
                ${REL}/${APK_EN}
源码仓库        https://github.com/${REPO}</code></pre>

<footer>
  用原生 WebView + IANA 时区库实现 · 所有换算在本机完成，不联网、不收集任何信息<br>
  <a href="https://github.com/${REPO}">GitHub</a> · <a href="https://github.com/${REPO}/releases">Releases</a>
</footer>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(DOCS, 'index.html'), index, 'utf8');
console.log('docs/index.html ✓  落地页');
