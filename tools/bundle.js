// 把 app/ 下的 HTML/CSS/JS 内联成单文件，UTF-8 无 BOM
// 用法: node tools/bundle.js [cn|intl]
//   国内版（默认 cn）：默认中文、24 小时制、初始城市 纽约/伦敦/东京
//   国际版（intl）：默认英文、按设备时区生成初始城市、按国家惯例选 12/24 小时制
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'build');

const region = process.argv[2] === 'intl' ? 'intl' : 'cn';

const read = (p) => fs.readFileSync(p, 'utf8');

let html = read(path.join(APP, 'index.html'));
const css = read(path.join(APP, 'style.css'));
const engine = read(path.join(APP, 'engine.js'));
const appjs = read(path.join(APP, 'app.js'));

const regionTag = `<script>window.WC_BUILD_REGION=${JSON.stringify(region)};</script>`;

html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="engine.js"></script>', () => `${regionTag}\n<script>\n${engine}\n</script>`);
html = html.replace('<script src="app.js"></script>', () => `<script>\n${appjs}\n</script>`);

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const file = region === 'intl' ? 'worldclock-intl.html' : 'worldclock.html';
fs.writeFileSync(path.join(OUT, file), html, 'utf8');

const size = (fs.statSync(path.join(OUT, file)).size / 1024).toFixed(1);
console.log(`build/${file}  ${size} KB  (region=${region})`);
