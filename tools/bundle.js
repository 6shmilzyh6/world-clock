// 把 app/ 下的 HTML/CSS/JS 内联成单文件，UTF-8 无 BOM
// 用法: node tools/bundle.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'build');

const read = (p) => fs.readFileSync(p, 'utf8');

let html = read(path.join(APP, 'index.html'));
const css = read(path.join(APP, 'style.css'));
const engine = read(path.join(APP, 'engine.js'));
const appjs = read(path.join(APP, 'app.js'));

html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="engine.js"></script>', () => `<script>\n${engine}\n</script>`);
html = html.replace('<script src="app.js"></script>', () => `<script>\n${appjs}\n</script>`);

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'worldclock.html'), html, 'utf8');

// 同时产出一份独立可打开的分文件版本（便于改）
const size = (fs.statSync(path.join(OUT, 'worldclock.html')).size / 1024).toFixed(1);
console.log(`build/worldclock.html  ${size} KB`);
