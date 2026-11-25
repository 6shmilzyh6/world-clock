/* ================= 世界时钟 · 交互层 ================= */
(function () {
  'use strict';
  var E = window.WCEngine;

  /* ---------------- 多语言 ---------------- */
  var I18N = {
    zh: {
      title: '世界时钟', myloc: '我的位置', switch: '切换', targets: '对照城市',
      now: '实时', wall: '指定时间', base: '基准', changeBase: '换基准城市',
      add: '添加城市', empty: '还没有对照城市\n点下面按钮添加，例如：纽约、伦敦、东京',
      search: '搜索城市 / 时区', close: '关闭', settings: '设置',
      autoLoc: '自动识别我的位置', detect: '识别', fmt24: '24 小时制', sec: '显示秒',
      advice: '显示联系建议', preset: '快速套用', clear: '清空所有对照城市', clr: '清空',
      theme: '深色主题', dark: '暗', light: '亮',
      sameDay: '同一天', tomorrow: '明天', yesterday: '昨天', daysAhead: '天后', daysBefore: '天前',
      okContact: '适合联系', sleep: '休息中', warnContact: '偏早',
      dst: '夏令时', std: '标准时', diff: '时差', sameAsBase: '与基准同步', hoursAhead: '小时', hoursBehind: '小时',
      detail: '城市详情', remove: '从对照列表移除', addTo: '加入对照', inBase: '已加入',
      monthOffset: '全年偏移变化', dayMap: '当天逐时对照', reset: '现在',
      about: '时区数据来自系统 IANA 时区库，自动处理夏令时（DST）。\n所有换算在本机完成，不联网、不收集任何信息。',
      copied: '已复制', tipPick: '这是基准城市', tipAdd: '选择要对照的城市',
      ph: '例如 New York / 纽约 / Europe', lang: '语言',
      refBase: '基准：我的位置', noResult: '没有匹配的城市'
    },
    en: {
      title: 'World Clock', myloc: 'My location', switch: 'Change', targets: 'Cities',
      now: 'Live', wall: 'Pick a time', base: 'Base', changeBase: 'Change base city',
      add: 'Add city', empty: 'No cities yet\nTap below to add, e.g. New York, London, Tokyo',
      search: 'Search city / timezone', close: 'Close', settings: 'Settings',
      autoLoc: 'Detect my location', detect: 'Detect', fmt24: '24-hour', sec: 'Show seconds',
      advice: 'Show contact advice', preset: 'Quick presets', clear: 'Clear all cities', clr: 'Clear',
      theme: 'Dark theme', dark: 'Dark', light: 'Light',
      sameDay: 'same day', tomorrow: 'tomorrow', yesterday: 'yesterday', daysAhead: ' days ahead', daysBefore: ' days behind',
      okContact: 'Good time to call', sleep: 'Likely asleep', warnContact: 'Quite early',
      dst: 'DST', std: 'Standard', diff: 'Difference', sameAsBase: 'Same as base', hoursAhead: 'h ahead', hoursBehind: 'h behind',
      detail: 'City detail', remove: 'Remove from list', addTo: 'Add to list', inBase: 'Added',
      monthOffset: 'Offset through the year', dayMap: 'Hour-by-hour today', reset: 'Now',
      about: 'Timezone data comes from the system IANA database with automatic DST handling.\nAll conversions run on-device. No network, no tracking.',
      copied: 'Copied', tipPick: 'This is the base city', tipAdd: 'Pick cities to compare',
      ph: 'e.g. New York / Tokyo / Europe', lang: 'Language',
      refBase: 'Base: my location', noResult: 'No matching city'
    }
  };

  /* ---------------- 状态 ---------------- */
  var KEY = 'worldclock.v1';
  var DEFAULTS = {
    baseTz: null, refTz: null, targets: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
    mode: 'now', lang: 'zh', h24: true, sec: false, advice: true, theme: 'dark'
  };
  var St = load();
  var T = I18N[St.lang] || I18N.zh;
  var tickTimer = null;
  var pickerMode = null;      // 'base' | 'ref' | 'add'
  var detailTz = null;
  var lastCompute = null;
  function load() {
    var s = {};
    try {
      var raw = readStore(KEY);
      if (raw) s = JSON.parse(raw) || {};
    } catch (e) { s = {}; }
    var out = Object.assign({}, DEFAULTS, s);
    if (!Array.isArray(out.targets)) out.targets = DEFAULTS.targets.slice();
    return out;
  }
  function save() {
    try { writeStore(KEY, JSON.stringify(St)); } catch (e) {}
  }
  /* Android 壳提供 SharedPreferences 桥时优先用它，file:// 下更可靠 */
  function readStore(k) {
    if (window.AndroidStore && typeof window.AndroidStore.getItem === 'function') {
      var v = window.AndroidStore.getItem(k);
      if (v) return v;
    }
    return localStorage.getItem(k);
  }
  function writeStore(k, v) {
    if (window.AndroidStore && typeof window.AndroidStore.setItem === 'function') {
      window.AndroidStore.setItem(k, v);
      return;
    }
    localStorage.setItem(k, v);
  }
  function t(k) { return (I18N[St.lang] && I18N[St.lang][k]) || I18N.zh[k] || k; }

  /* ---------------- 位置识别 ---------------- */
  function detectTz() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch (e) {}
    var off = -new Date().getTimezoneOffset();
    var map = { 480: 'Asia/Shanghai', 540: 'Asia/Tokyo', 420: 'Asia/Bangkok', 0: 'Europe/London', '60': 'Europe/Paris', '-300': 'America/New_York', '-480': 'America/Los_Angeles', 330: 'Asia/Kolkata', 600: 'Australia/Sydney' };
    return map[String(off)] || 'Asia/Shanghai';
  }
  if (!St.baseTz) { St.baseTz = detectTz(); save(); }
  if (!St.refTz) St.refTz = St.baseTz;

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    baseTime: $('baseTime'), baseCity: $('baseCity'), baseSub: $('baseSub'),
    baseLabel: $('baseLabel'), list: $('targetList'), count: $('targetCount'),
    wallPanel: $('wallPanel'), inDate: $('inDate'), inTime: $('inTime'),
    slider: $('timeSlider'), sliderVal: $('sliderVal'), refChip: $('refChip'),
    quickRow: $('quickRow'), pickerSheet: $('pickerSheet'), pickerList: $('pickerList'),
    pickerSearch: $('pickerSearch'), pickerHint: $('pickerHint'),
    detailSheet: $('detailSheet'), detailTitle: $('detailTitle'), detailList: $('detailList'),
    setSheet: $('setSheet'), presetRow: $('presetRow'), foot: $('foot')
  };

  /* ---------------- 渲染 ---------------- */
  function baseParts() {
    var p = E.partsIn(St.baseTz, new Date());
    return p;
  }

  function wallValue() {
    var d = el.inDate.value || E.fmtDate(baseParts());
    var hm = (el.inTime.value || '09:00').split(':');
    var dp = d.split('-');
    return {
      y: parseInt(dp[0], 10), mo: parseInt(dp[1], 10), d: parseInt(dp[2], 10),
      h: parseInt(hm[0], 10) || 0, mi: parseInt(hm[1], 10) || 0
    };
  }

  function computeNow() {
    var opt = { baseTz: St.baseTz, targets: St.targets, mode: St.mode };
    if (St.mode === 'wall') {
      opt.mode = 'wall';
      opt.baseTz = St.refTz || St.baseTz;
      opt.wall = wallValue();
    }
    lastCompute = E.compute(opt);
    return lastCompute;
  }

  function swText(v) {
    if (v) return '开';
    return '关';
  }

  function applyLang() {
    document.documentElement.lang = St.lang === 'en' ? 'en' : 'zh-CN';
    document.title = t('title');
    $('appTitle').textContent = t('title');
    el.baseLabel.textContent = t('myloc');
    $('btnPickBase').textContent = t('switch');
    $('btnSettings').title = t('settings');
    $('modeNow').textContent = t('now');
    $('modeWall').textContent = t('wall');
    $('targetsTitle').textContent = t('targets');
    $('addLabel').textContent = t('add');
    $('btnPickRef').textContent = t('changeBase');
    $('btnResetNow').textContent = t('reset');
    el.pickerSearch.placeholder = t('search');
    $('setTitle').textContent = t('settings');
    $('setAuto').textContent = t('autoLoc');
    $('btnAutoLoc').textContent = t('detect');
    $('setFmt').textContent = t('fmt24');
    $('setSec').textContent = t('sec');
    $('setTheme').textContent = t('theme');
    $('setAdvice').textContent = t('advice');
    $('setPreset').textContent = t('preset');
    $('setClear').textContent = t('clear');
    $('btnClear').textContent = t('clr');
    $('aboutBox').textContent = t('about');
    $('detailClose') && ($('detailClose').textContent = t('close'));
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
      if (b.tagName === 'BUTTON' && !b.id) b.textContent = t('close');
    });
    el.foot.textContent = 'IANA tzdb · ' + E.listTimeZones().length + ' zones · v1.0';
  }

  function fmtClock(p, withSec) {
    var h = p.hour, mi = p.minute, s = p.second, suffix = '';
    if (!St.h24) {
      suffix = h < 12 ? ' AM' : ' PM';
      var h12 = h % 12; if (h12 === 0) h12 = 12;
      return pad(h12) + ':' + pad(mi) + (withSec ? ':' + pad(s) : '') + suffix;
    }
    return pad(h) + ':' + pad(mi) + (withSec ? ':' + pad(s) : '');
  }

  /* 拆成 主时间 / 秒 / 上午下午 三段，避免 12 小时制拼接错位 */
  function clockParts(p) {
    var sec = St.sec ? pad(p.second) : null;
    if (!St.h24) {
      var h = p.hour % 12; if (h === 0) h = 12;
      return { main: pad(h) + ':' + pad(p.minute), sec: sec, suffix: p.hour < 12 ? ' AM' : ' PM' };
    }
    return { main: pad(p.hour) + ':' + pad(p.minute), sec: sec, suffix: '' };
  }
  function clockHTML(p, secClass) {
    var c = clockParts(p);
    return c.main +
      (c.sec ? '<span class="' + (secClass || 'sec') + '">:' + c.sec + '</span>' : '') +
      (c.suffix ? '<span class="' + (secClass || 'sec') + '">' + c.suffix + '</span>' : '');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function cityName(tz) {
    return St.lang === 'en' ? E.cityLabelEn(tz) : E.cityLabel(tz);
  }

  function renderBase() {
    var c = computeNow();
    var b = c.base;
    var effTz = c.baseTz;                     // 实时模式=我的位置；指定时间模式=基准城市
    el.baseTime.innerHTML = clockHTML(b.parts, 'sec');
    var info = E.cityInfo(effTz);
    el.baseCity.textContent = (info.flag ? info.flag + ' ' : '') + cityName(effTz);
    var bits = [b.week, b.date, b.offsetText];
    if (b.dst) bits.push(t('dst'));
    if (St.lang === 'en') bits = [b.weekEN, b.date, b.offsetText].concat(b.dst ? [t('dst')] : []);
    el.baseSub.textContent = bits.join(' · ');
    if (effTz !== St.baseTz) el.baseLabel.textContent = t('base') + ' · ' + cityName(effTz);
    else el.baseLabel.textContent = t('myloc');
  }

  function renderTargets() {
    var c = lastCompute;
    el.count.textContent = St.targets.length ? (St.targets.length + ' / 10') : '';
    if (!St.targets.length) {
      el.list.innerHTML = '<div class="empty">' + t('empty').replace(/\n/g, '<br>') + '</div>';
      return;
    }
    var html = '';
    c.rows.forEach(function (r) {
      var info = E.cityInfo(r.tz);
      var name = cityName(r.tz);
      var badges = '';
      if (r.dayDiff !== 0) badges += '<span class="daytag">' + (r.dayDiff > 0 ? t('tomorrow') : t('yesterday')) + '</span>';
      if (r.dst) badges += '<span class="badge dst">' + t('dst') + '</span>';
      if (St.advice) {
        var cls = r.advice.key === 'ok' ? '' : (r.advice.key === 'sleep' ? 'bad' : 'warn');
        var label = r.advice.key === 'ok' ? t('okContact') : (r.advice.key === 'sleep' ? t('sleep') : t('warnContact'));
        badges += '<span class="badge ' + cls + '">' + label + '</span>';
      }
      var diffTxt = diffLabel(r.diffFromBase);
      var secHtml = '';
      html += '' +
        '<div class="tcard" data-tz="' + r.tz + '">' +
          '<div class="flag">' + (info.flag || '🌍') + '</div>' +
          '<div class="left">' +
            '<div class="city">' + esc(name) + '</div>' +
            '<div class="sub"><span>' + diffTxt + '</span>' + (badges ? ' · ' + badges : '') + '</div>' +
          '</div>' +
          '<div class="right">' +
            '<div class="rtime">' + clockHTML(r.parts, 'sec') + '</div>' +
            '<div class="rdate">' + (St.lang === 'en' ? r.dateEN + ' ' + r.weekEN : r.dateCN + ' ' + r.week) + '</div>' +
          '</div>' +
          '<button class="del" data-del="' + r.tz + '">' + (St.lang === 'en' ? 'Del' : '删除') + '</button>' +
        '</div>';
    });
    el.list.innerHTML = html;
  }

  function diffLabel(mins) {
    if (mins === 0) return t('sameAsBase');
    var a = Math.abs(mins);
    if (St.lang === 'en') {
      var s = (Math.round((a / 60) * 10) / 10).toString();
      return (mins > 0 ? '+' + s + t('hoursAhead') : '-' + s + t('hoursBehind'));
    }
    var hh2 = Math.floor(a / 60), mm2 = a % 60;
    var body = hh2 ? hh2 + ' 小时' : '';
    if (mm2) body += (body ? ' ' : '') + mm2 + ' 分钟';
    return (mins > 0 ? '比基准快 ' : '比基准慢 ') + body;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render() {
    renderBase();
    renderTargets();
    renderWallUI();
  }

  function renderWallUI() {
    if (St.mode !== 'wall') { el.wallPanel.classList.add('hidden'); return; }
    el.wallPanel.classList.remove('hidden');
    var info = E.cityInfo(St.refTz);
    el.refChip.textContent = t('base') + '：' + (info.flag || '') + ' ' + E.cityLabel(St.refTz);
    var w = wallValue();
    var mins = w.h * 60 + w.mi;
    el.slider.value = String(mins);
    el.sliderVal.textContent = pad(w.h) + ':' + pad(w.mi) + '  (' + E.cityLabel(St.refTz) + ')';
  }

  function buildQuickRow() {
    if (el.quickRow.dataset.built) return;
    var presets = [
      { h: 9, label: '09:00' }, { h: 12, label: '12:00' }, { h: 18, label: '18:00' },
      { h: 20, label: '20:00' }, { h: 22, label: '22:00' }
    ];
    el.quickRow.innerHTML = presets.map(function (p) {
      return '<button class="quickbtn" data-h="' + p.h + '">' + p.label + '</button>';
    }).join('');
    el.quickRow.dataset.built = '1';
  }

  /* ---------------- 城市选择器 ---------------- */
  function openPicker(mode) {
    pickerMode = mode;
    el.pickerSearch.value = '';
    el.pickerHint.textContent = mode === 'base' || mode === 'ref' ? t('tipPick') : t('tipAdd');
    renderPicker('');
    el.pickerSheet.classList.remove('hidden');
    setTimeout(function () { el.pickerSearch.focus(); }, 120);
  }
  function closePicker() { el.pickerSheet.classList.add('hidden'); el.pickerSearch.blur(); }

  function renderPicker(q) {
    var list = E.searchZones(q, 60);
    var now = new Date();
    var html = list.map(function (c) {
      var off = E.offsetMinutes(c.id, now);
      var p = E.partsIn(c.id, now);
      var on = (pickerMode === 'add' && St.targets.indexOf(c.id) >= 0);
      var isBase = (c.id === St.baseTz);
      var name = St.lang === 'en'
        ? (c.id === 'UTC' ? 'UTC' : (E.cityInfo(c.id).enName || c.name))
        : (c.cn ? c.cn + ' · ' + c.name : c.name);
      var sub = c.id;
      if (St.lang === 'zh' && c.en) sub = c.en + ' · ' + c.id;
      return '<div class="pitem' + (on ? ' on' : '') + '" data-pick="' + c.id + '">' +
        '<div class="flag" style="font-size:19px">' + (c.flag || '🌍') + '</div>' +
        '<div>' +
          '<div class="pname">' + esc(name) + (isBase ? ' <span class="badge">★</span>' : '') + '</div>' +
          '<div class="psub">' + esc(sub) + '</div>' +
        '</div>' +
        '<div class="pright">' + pad(p.hour) + ':' + pad(p.minute) + '<br>' +
          '<span style="font-size:10px;color:var(--txt3)">' + E.formatOffset(off) + '</span></div>' +
      '</div>';
    }).join('');
    el.pickerList.innerHTML = html || '<div class="empty">' + t('noResult') + '</div>';
  }

  /* ---------------- 详情 ---------------- */
  function openDetail(tz) {
    detailTz = tz;
    el.detailSheet.classList.remove('hidden');
    renderDetail();
  }
  function renderDetail() {
    var tz = detailTz;
    if (!tz) return;
    var c = computeNow();
    var row = null;
    for (var i = 0; i < c.rows.length; i++) if (c.rows[i].tz === tz) row = c.rows[i];
    var now = new Date();
    if (!row) {
      var p = E.partsIn(tz, now), off = E.offsetMinutes(tz, now);
      row = {
        tz: tz, parts: p, offset: off, offsetText: E.formatOffset(off),
        dst: E.isDST(tz, now), week: E.fmtWeekCN(p), date: E.fmtDate(p)
      };
    }
    var info = E.cityInfo(tz);
    var title = cityName(tz);
    el.detailTitle.textContent = (info.flag || '🌍') + ' ' + title;

    var en = St.lang === 'en';
    var rows = [];
    rows.push([en ? 'Time now' : '当前时间', E.fmtHMS(row.parts)]);
    rows.push([en ? 'Date' : '日期', en ? (row.dateEN || row.date) + ' ' + (row.weekEN || '') : row.date + ' ' + row.week]);
    rows.push([en ? 'Time zone' : '时区', tz]);
    rows.push([en ? 'UTC offset' : 'UTC 偏移',
      en ? row.offsetText : row.offsetText + '（' + E.offsetLabelCN(row.offset) + '）']);
    rows.push([en ? 'Daylight saving' : '夏令时', row.dst ? (en ? 'Yes' : '是（DST）') : (en ? 'No' : '否')]);
    rows.push([en ? 'vs my time' : '与我的时差', diffLabel(row.offset - c.base.offset)]);

    var html = rows.map(function (r) {
      return '<div class="detail-row"><span class="k">' + r[0] + '</span><span class="v">' + esc(r[1]) + '</span></div>';
    }).join('');

    /* 逐时对照 */
    var baseHourNow = c.base.parts.hour;
    var map = [];
    for (var hh = 0; hh < 24; hh += 3) {
      var refWall = { y: c.base.parts.year, mo: c.base.parts.month, d: c.base.parts.day, h: hh, mi: 0 };
      var inst = E.wallTimeToDate(St.baseTz, refWall.y, refWall.mo, refWall.d, refWall.h, refWall.mi);
      var tp = E.partsIn(tz, inst);
      var dd = E.dayDiff(c.base.parts, tp);
      var tag = dd === 0 ? '' : (dd > 0 ? '<span class="daytag">+' + dd + '</span>' : '<span class="daytag">' + dd + '</span>');
      map.push('<div class="ystrip-item' + (Math.abs(hh - baseHourNow) < 3 ? ' now' : '') + '">' +
        pad(hh) + ':00<b>' + pad(tp.hour) + ':' + pad(tp.minute) + '</b>' + tag + '</div>');
    }
    html += '<div style="margin-top:14px;font-size:12px;color:var(--txt2)">' +
      (St.lang === 'en' ? 'My time → their time' : '我的时间 → 对方时间') + '</div>';
    html += '<div class="year-strip">' + map.join('') + '</div>';

    html += '<div class="detail-row" style="border:0;padding-top:14px">' +
      '<button class="quickbtn" data-addcur="' + tz + '" style="flex:1;padding:11px">' +
      (St.targets.indexOf(tz) >= 0 ? t('remove') : t('addTo')) + '</button></div>';

    el.detailList.innerHTML = html;
  }

  /* ---------------- 设置 ---------------- */
  function syncSettings() {
    $('btnFmt').textContent = St.h24 ? '24h' : '12h';
    $('btnFmt').classList.toggle('on', St.h24);
    $('btnSec').textContent = St.sec ? (St.lang === 'en' ? 'On' : '开') : (St.lang === 'en' ? 'Off' : '关');
    $('btnSec').classList.toggle('on', St.sec);
    $('btnAdvice').textContent = St.advice ? (St.lang === 'en' ? 'On' : '开') : (St.lang === 'en' ? 'Off' : '关');
    $('btnAdvice').classList.toggle('on', St.advice);
    $('btnTheme').textContent = St.theme === 'light' ? t('light') : t('dark');
    $('btnTheme').classList.toggle('on', St.theme !== 'light');
    document.body.classList.toggle('light', St.theme === 'light');
    if (!el.presetRow.dataset.built) {
      var ps = Object.keys(E.PRESETS).map(function (k) {
        return '<button class="quickbtn" data-preset="' + k + '">' + E.PRESETS[k].name + '</button>';
      }).join('');
      el.presetRow.innerHTML = ps;
      el.presetRow.dataset.built = '1';
    }
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    document.querySelectorAll('.modebtn').forEach(function (b) {
      b.addEventListener('click', function () {
        St.mode = b.dataset.mode; save();
        document.querySelectorAll('.modebtn').forEach(function (x) { x.classList.toggle('active', x === b); });
        if (St.mode === 'wall') {
          var now = new Date();
          var p = E.partsIn(St.refTz || St.baseTz, now);
          if (!el.inDate.value) el.inDate.value = E.fmtDate(p);
          if (!el.inTime.value) el.inTime.value = pad(p.hour) + ':' + pad(p.minute);
          buildQuickRow();
        }
        render();
      });
    });

    $('btnPickBase').addEventListener('click', function () {
      openPicker(St.mode === 'wall' ? 'ref' : 'base');
    });
    $('btnPickRef').addEventListener('click', function () { openPicker('ref'); });
    $('btnAdd').addEventListener('click', function () { openPicker('add'); });
    $('btnLang').addEventListener('click', function () {
      St.lang = St.lang === 'zh' ? 'en' : 'zh'; save();
      T = I18N[St.lang];
      applyLang(); syncSettings(); render();
    });
    $('btnSettings').addEventListener('click', function () {
      syncSettings();
      el.setSheet.classList.remove('hidden');
    });

    document.addEventListener('click', function (ev) {
      var close = ev.target.closest('[data-close]');
      if (close) {
        var which = close.dataset.close;
        if (which === 'picker') closePicker();
        if (which === 'detail') el.detailSheet.classList.add('hidden');
        if (which === 'set') el.setSheet.classList.add('hidden');
        return;
      }
      var pick = ev.target.closest('[data-pick]');
      if (pick) {
        var tz = pick.dataset.pick;
        if (pickerMode === 'base') { St.baseTz = tz; if (!St.refTz) St.refTz = tz; }
        else if (pickerMode === 'ref') { St.refTz = tz; }
        else { if (St.targets.indexOf(tz) < 0 && St.targets.length < 10) St.targets.push(tz); }
        save(); closePicker(); render();
        return;
      }
      var del = ev.target.closest('[data-del]');
      if (del) {
        var dtz = del.dataset.del;
        St.targets = St.targets.filter(function (x) { return x !== dtz; });
        save(); render(); return;
      }
      var addcur = ev.target.closest('[data-addcur]');
      if (addcur) {
        var atz = addcur.dataset.addcur;
        var idx = St.targets.indexOf(atz);
        if (idx >= 0) St.targets.splice(idx, 1);
        else if (St.targets.length < 10) St.targets.push(atz);
        save(); render(); renderDetail(); return;
      }
      var pre = ev.target.closest('[data-preset]');
      if (pre) {
        var pset = E.PRESETS[pre.dataset.preset];
        if (pset) {
          pset.tz.forEach(function (x) { if (St.targets.indexOf(x) < 0) St.targets.push(x); });
          St.targets = St.targets.slice(0, 10);
          save(); render();
        }
        return;
      }
      var hbtn = ev.target.closest('[data-h]');
      if (hbtn) {
        var h = parseInt(hbtn.dataset.h, 10);
        el.inTime.value = pad(h) + ':00';
        render(); return;
      }
      var card = ev.target.closest('.tcard');
      if (card && !ev.target.closest('.del')) {
        if (card.classList.contains('swiped')) { card.classList.remove('swiped'); return; }
        openDetail(card.dataset.tz);
      }
    });

    /* 长按显示删除 */
    var pressTimer = null;
    el.list.addEventListener('touchstart', function (ev) {
      var card = ev.target.closest('.tcard');
      if (!card) return;
      pressTimer = setTimeout(function () {
        document.querySelectorAll('.tcard.swiped').forEach(function (c) { c.classList.remove('swiped'); });
        card.classList.add('swiped');
      }, 450);
    }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(function (e) {
      el.list.addEventListener(e, function () { clearTimeout(pressTimer); }, { passive: true });
    });

    el.pickerSearch.addEventListener('input', function () { renderPicker(this.value); });

    el.inDate.addEventListener('change', render);
    el.inTime.addEventListener('change', render);
    el.slider.addEventListener('input', function () {
      var v = parseInt(this.value, 10);
      el.inTime.value = pad(Math.floor(v / 60)) + ':' + pad(v % 60);
      render();
    });
    $('btnResetNow').addEventListener('click', function () {
      var p = E.partsIn(St.refTz || St.baseTz, new Date());
      el.inDate.value = E.fmtDate(p);
      el.inTime.value = pad(p.hour) + ':' + pad(p.minute);
      render();
    });

    $('btnAutoLoc').addEventListener('click', function () {
      St.baseTz = detectTz(); St.refTz = St.baseTz; save(); render();
    });
    $('btnFmt').addEventListener('click', function () { St.h24 = !St.h24; save(); syncSettings(); render(); });
    $('btnSec').addEventListener('click', function () { St.sec = !St.sec; save(); syncSettings(); render(); });
    $('btnAdvice').addEventListener('click', function () { St.advice = !St.advice; save(); syncSettings(); render(); });
    $('btnTheme').addEventListener('click', function () {
      St.theme = St.theme === 'light' ? 'dark' : 'light';
      save(); syncSettings(); render();
    });
    $('btnClear').addEventListener('click', function () { St.targets = []; save(); render(); });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        closePicker();
        el.detailSheet.classList.add('hidden');
        el.setSheet.classList.add('hidden');
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  function tick() {
    render();
  }
  function boot() {
    applyLang();
    syncSettings();
    buildQuickRow();
    el.baseLabel.textContent = t('myloc');
    document.querySelectorAll('.modebtn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === St.mode);
    });
    if (St.mode === 'wall') {
      var p = E.partsIn(St.refTz || St.baseTz, new Date());
      el.inDate.value = E.fmtDate(p);
      el.inTime.value = pad(p.hour) + ':' + pad(p.minute);
    }
    bind();
    render();
    tickTimer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearInterval(tickTimer); tickTimer = null; }
      else if (!tickTimer) { tickTimer = setInterval(tick, 1000); render(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
