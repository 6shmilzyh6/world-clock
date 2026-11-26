/* =========================================================
 * 时间换算引擎 world-clock / engine.js
 * 纯函数，无 DOM 依赖，可被浏览器、Android WebView、Node 复用
 * 时区数据来自运行时 Intl（IANA tzdb），不依赖网络
 * ========================================================= */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WCEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- 时区目录：常用城市（可在 App 内用“全部时区”补充） ---------- */
  var CITY_TABLE = [
    // 中国
    { id: 'Asia/Shanghai', name: '北京', cn: '中国', en: 'China', flag: '🇨🇳' },
    { id: 'Asia/Chongqing', name: '重庆', cn: '中国', en: 'China', flag: '🇨🇳', alias: 'Asia/Shanghai' },
    { id: 'Asia/Urumqi', name: '乌鲁木齐', cn: '中国', en: 'China', flag: '🇨🇳' },
    { id: 'Asia/Hong_Kong', name: '香港', cn: '中国', en: 'Hong Kong', flag: '🇭🇰' },
    { id: 'Asia/Macau', name: '澳门', cn: '中国', en: 'Macau', flag: '🇲🇴' },
    { id: 'Asia/Taipei', name: '台北', cn: '中国', en: 'Taiwan', flag: '🇹🇼' },
    // 亚洲
    { id: 'Asia/Tokyo', name: '东京', cn: '日本', en: 'Japan', flag: '🇯🇵' },
    { id: 'Asia/Seoul', name: '首尔', cn: '韩国', en: 'Korea', flag: '🇰🇷' },
    { id: 'Asia/Pyongyang', name: '平壤', cn: '朝鲜', en: 'DPRK', flag: '🇰🇵' },
    { id: 'Asia/Singapore', name: '新加坡', cn: '新加坡', en: 'Singapore', flag: '🇸🇬' },
    { id: 'Asia/Kuala_Lumpur', name: '吉隆坡', cn: '马来西亚', en: 'Malaysia', flag: '🇲🇾' },
    { id: 'Asia/Bangkok', name: '曼谷', cn: '泰国', en: 'Thailand', flag: '🇹🇭' },
    { id: 'Asia/Ho_Chi_Minh', name: '胡志明市', cn: '越南', en: 'Vietnam', flag: '🇻🇳' },
    { id: 'Asia/Manila', name: '马尼拉', cn: '菲律宾', en: 'Philippines', flag: '🇵🇭' },
    { id: 'Asia/Jakarta', name: '雅加达', cn: '印尼', en: 'Indonesia', flag: '🇮🇩' },
    { id: 'Asia/Yangon', name: '仰光', cn: '缅甸', en: 'Myanmar', flag: '🇲🇲' },
    { id: 'Asia/Phnom_Penh', name: '金边', cn: '柬埔寨', en: 'Cambodia', flag: '🇰🇭' },
    { id: 'Asia/Vientiane', name: '万象', cn: '老挝', en: 'Laos', flag: '🇱🇦' },
    { id: 'Asia/Dhaka', name: '达卡', cn: '孟加拉国', en: 'Bangladesh', flag: '🇧🇩' },
    { id: 'Asia/Kolkata', name: '新德里', cn: '印度', en: 'India', flag: '🇮🇳' },
    { id: 'Asia/Karachi', name: '卡拉奇', cn: '巴基斯坦', en: 'Pakistan', flag: '🇵🇰' },
    { id: 'Asia/Kathmandu', name: '加德满都', cn: '尼泊尔', en: 'Nepal', flag: '🇳🇵' },
    { id: 'Asia/Colombo', name: '科伦坡', cn: '斯里兰卡', en: 'Sri Lanka', flag: '🇱🇰' },
    { id: 'Asia/Kabul', name: '喀布尔', cn: '阿富汗', en: 'Afghanistan', flag: '🇦🇫' },
    { id: 'Asia/Tashkent', name: '塔什干', cn: '乌兹别克斯坦', en: 'Uzbekistan', flag: '🇺🇿' },
    { id: 'Asia/Almaty', name: '阿拉木图', cn: '哈萨克斯坦', en: 'Kazakhstan', flag: '🇰🇿' },
    { id: 'Asia/Tehran', name: '德黑兰', cn: '伊朗', en: 'Iran', flag: '🇮🇷' },
    { id: 'Asia/Baghdad', name: '巴格达', cn: '伊拉克', en: 'Iraq', flag: '🇮🇶' },
    { id: 'Asia/Riyadh', name: '利雅得', cn: '沙特', en: 'Saudi Arabia', flag: '🇸🇦' },
    { id: 'Asia/Dubai', name: '迪拜', cn: '阿联酋', en: 'UAE', flag: '🇦🇪' },
    { id: 'Asia/Jerusalem', name: '耶路撒冷', cn: '以色列', en: 'Israel', flag: '🇮🇱' },
    { id: 'Asia/Beirut', name: '贝鲁特', cn: '黎巴嫩', en: 'Lebanon', flag: '🇱🇧' },
    { id: 'Asia/Baku', name: '巴库', cn: '阿塞拜疆', en: 'Azerbaijan', flag: '🇦🇿' },
    // 欧洲
    { id: 'Europe/Moscow', name: '莫斯科', cn: '俄罗斯', en: 'Russia', flag: '🇷🇺' },
    { id: 'Europe/Kyiv', name: '基辅', cn: '乌克兰', en: 'Ukraine', flag: '🇺🇦' },
    { id: 'Europe/Istanbul', name: '伊斯坦布尔', cn: '土耳其', en: 'Turkey', flag: '🇹🇷' },
    { id: 'Europe/Athens', name: '雅典', cn: '希腊', en: 'Greece', flag: '🇬🇷' },
    { id: 'Europe/Helsinki', name: '赫尔辛基', cn: '芬兰', en: 'Finland', flag: '🇫🇮' },
    { id: 'Europe/Bucharest', name: '布加勒斯特', cn: '罗马尼亚', en: 'Romania', flag: '🇷🇴' },
    { id: 'Europe/Warsaw', name: '华沙', cn: '波兰', en: 'Poland', flag: '🇵🇱' },
    { id: 'Europe/Berlin', name: '柏林', cn: '德国', en: 'Germany', flag: '🇩🇪' },
    { id: 'Europe/Vienna', name: '维也纳', cn: '奥地利', en: 'Austria', flag: '🇦🇹' },
    { id: 'Europe/Rome', name: '罗马', cn: '意大利', en: 'Italy', flag: '🇮🇹' },
    { id: 'Europe/Zurich', name: '苏黎世', cn: '瑞士', en: 'Switzerland', flag: '🇨🇭' },
    { id: 'Europe/Paris', name: '巴黎', cn: '法国', en: 'France', flag: '🇫🇷' },
    { id: 'Europe/Brussels', name: '布鲁塞尔', cn: '比利时', en: 'Belgium', flag: '🇧🇪' },
    { id: 'Europe/Amsterdam', name: '阿姆斯特丹', cn: '荷兰', en: 'Netherlands', flag: '🇳🇱' },
    { id: 'Europe/Madrid', name: '马德里', cn: '西班牙', en: 'Spain', flag: '🇪🇸' },
    { id: 'Europe/Lisbon', name: '里斯本', cn: '葡萄牙', en: 'Portugal', flag: '🇵🇹' },
    { id: 'Europe/London', name: '伦敦', cn: '英国', en: 'UK', flag: '🇬🇧' },
    { id: 'Europe/Dublin', name: '都柏林', cn: '爱尔兰', en: 'Ireland', flag: '🇮🇪' },
    { id: 'Europe/Stockholm', name: '斯德哥尔摩', cn: '瑞典', en: 'Sweden', flag: '🇸🇪' },
    { id: 'Europe/Oslo', name: '奥斯陆', cn: '挪威', en: 'Norway', flag: '🇳🇴' },
    { id: 'Europe/Copenhagen', name: '哥本哈根', cn: '丹麦', en: 'Denmark', flag: '🇩🇰' },
    { id: 'Europe/Prague', name: '布拉格', cn: '捷克', en: 'Czechia', flag: '🇨🇿' },
    { id: 'Europe/Budapest', name: '布达佩斯', cn: '匈牙利', en: 'Hungary', flag: '🇭🇺' },
    { id: 'Atlantic/Reykjavik', name: '雷克雅未克', cn: '冰岛', en: 'Iceland', flag: '🇮🇸' },
    // 非洲
    { id: 'Africa/Cairo', name: '开罗', cn: '埃及', en: 'Egypt', flag: '🇪🇬' },
    { id: 'Africa/Johannesburg', name: '约翰内斯堡', cn: '南非', en: 'South Africa', flag: '🇿🇦' },
    { id: 'Africa/Lagos', name: '拉各斯', cn: '尼日利亚', en: 'Nigeria', flag: '🇳🇬' },
    { id: 'Africa/Nairobi', name: '内罗毕', cn: '肯尼亚', en: 'Kenya', flag: '🇰🇪' },
    { id: 'Africa/Casablanca', name: '卡萨布兰卡', cn: '摩洛哥', en: 'Morocco', flag: '🇲🇦' },
    { id: 'Africa/Addis_Ababa', name: '亚的斯亚贝巴', cn: '埃塞俄比亚', en: 'Ethiopia', flag: '🇪🇹' },
    // 美洲
    { id: 'America/New_York', name: '纽约', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'America/Chicago', name: '芝加哥', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'America/Denver', name: '丹佛', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'America/Phoenix', name: '凤凰城', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'America/Los_Angeles', name: '洛杉矶', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'America/Anchorage', name: '安克雷奇', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'Pacific/Honolulu', name: '檀香山', cn: '美国', en: 'USA', flag: '🇺🇸' },
    { id: 'America/Toronto', name: '多伦多', cn: '加拿大', en: 'Canada', flag: '🇨🇦' },
    { id: 'America/Vancouver', name: '温哥华', cn: '加拿大', en: 'Canada', flag: '🇨🇦' },
    { id: 'America/Mexico_City', name: '墨西哥城', cn: '墨西哥', en: 'Mexico', flag: '🇲🇽' },
    { id: 'America/Havana', name: '哈瓦那', cn: '古巴', en: 'Cuba', flag: '🇨🇺' },
    { id: 'America/Bogota', name: '波哥大', cn: '哥伦比亚', en: 'Colombia', flag: '🇨🇴' },
    { id: 'America/Lima', name: '利马', cn: '秘鲁', en: 'Peru', flag: '🇵🇪' },
    { id: 'America/Santiago', name: '圣地亚哥', cn: '智利', en: 'Chile', flag: '🇨🇱' },
    { id: 'America/Sao_Paulo', name: '圣保罗', cn: '巴西', en: 'Brazil', flag: '🇧🇷' },
    { id: 'America/Buenos_Aires', name: '布宜诺斯艾利斯', cn: '阿根廷', en: 'Argentina', flag: '🇦🇷' },
    { id: 'America/Caracas', name: '加拉加斯', cn: '委内瑞拉', en: 'Venezuela', flag: '🇻🇪' },
    // 大洋洲
    { id: 'Australia/Perth', name: '珀斯', cn: '澳大利亚', en: 'Australia', flag: '🇦🇺' },
    { id: 'Australia/Adelaide', name: '阿德莱德', cn: '澳大利亚', en: 'Australia', flag: '🇦🇺' },
    { id: 'Australia/Brisbane', name: '布里斯班', cn: '澳大利亚', en: 'Australia', flag: '🇦🇺' },
    { id: 'Australia/Sydney', name: '悉尼', cn: '澳大利亚', en: 'Australia', flag: '🇦🇺' },
    { id: 'Australia/Melbourne', name: '墨尔本', cn: '澳大利亚', en: 'Australia', flag: '🇦🇺' },
    { id: 'Pacific/Auckland', name: '奥克兰', cn: '新西兰', en: 'New Zealand', flag: '🇳🇿' },
    { id: 'Pacific/Fiji', name: '苏瓦', cn: '斐济', en: 'Fiji', flag: '🇫🇯' },
    // 特殊时区
    { id: 'UTC', name: 'UTC', cn: '协调世界时', en: 'Universal Time', flag: '🌐' }
  ];

  /* ---------- 英文城市名（用于英文搜索/英文界面） ---------- */
  var pad2 = function (n) { return n < 10 ? '0' + n : '' + n; };
  var EN_CITY = {
    'Asia/Shanghai': 'Shanghai Beijing', 'Asia/Chongqing': 'Chongqing', 'Asia/Urumqi': 'Urumqi',
    'Asia/Hong_Kong': 'Hong Kong', 'Asia/Macau': 'Macau Macao', 'Asia/Taipei': 'Taipei',
    'Asia/Tokyo': 'Tokyo', 'Asia/Seoul': 'Seoul', 'Asia/Pyongyang': 'Pyongyang',
    'Asia/Singapore': 'Singapore', 'Asia/Kuala_Lumpur': 'Kuala Lumpur', 'Asia/Bangkok': 'Bangkok',
    'Asia/Ho_Chi_Minh': 'Ho Chi Minh Saigon', 'Asia/Manila': 'Manila', 'Asia/Jakarta': 'Jakarta',
    'Asia/Yangon': 'Yangon Rangoon', 'Asia/Phnom_Penh': 'Phnom Penh', 'Asia/Vientiane': 'Vientiane',
    'Asia/Dhaka': 'Dhaka', 'Asia/Kolkata': 'Kolkata New Delhi Mumbai', 'Asia/Karachi': 'Karachi',
    'Asia/Kathmandu': 'Kathmandu', 'Asia/Colombo': 'Colombo', 'Asia/Kabul': 'Kabul',
    'Asia/Tashkent': 'Tashkent', 'Asia/Almaty': 'Almaty', 'Asia/Tehran': 'Tehran',
    'Asia/Baghdad': 'Baghdad', 'Asia/Riyadh': 'Riyadh', 'Asia/Dubai': 'Dubai', 'Asia/Jerusalem': 'Jerusalem',
    'Asia/Beirut': 'Beirut', 'Asia/Baku': 'Baku',
    'Europe/Moscow': 'Moscow', 'Europe/Kyiv': 'Kyiv Kiev', 'Europe/Istanbul': 'Istanbul',
    'Europe/Athens': 'Athens', 'Europe/Helsinki': 'Helsinki', 'Europe/Bucharest': 'Bucharest',
    'Europe/Warsaw': 'Warsaw', 'Europe/Berlin': 'Berlin', 'Europe/Vienna': 'Vienna',
    'Europe/Rome': 'Rome', 'Europe/Zurich': 'Zurich', 'Europe/Paris': 'Paris',
    'Europe/Brussels': 'Brussels', 'Europe/Amsterdam': 'Amsterdam', 'Europe/Madrid': 'Madrid',
    'Europe/Lisbon': 'Lisbon', 'Europe/London': 'London', 'Europe/Dublin': 'Dublin',
    'Europe/Stockholm': 'Stockholm', 'Europe/Oslo': 'Oslo', 'Europe/Copenhagen': 'Copenhagen',
    'Europe/Prague': 'Prague', 'Europe/Budapest': 'Budapest', 'Atlantic/Reykjavik': 'Reykjavik',
    'Africa/Cairo': 'Cairo', 'Africa/Johannesburg': 'Johannesburg Cape Town', 'Africa/Lagos': 'Lagos',
    'Africa/Nairobi': 'Nairobi', 'Africa/Casablanca': 'Casablanca', 'Africa/Addis_Ababa': 'Addis Ababa',
    'America/New_York': 'New York NYC Washington Boston', 'America/Chicago': 'Chicago Dallas Houston',
    'America/Denver': 'Denver', 'America/Phoenix': 'Phoenix', 'America/Los_Angeles': 'Los Angeles LA San Francisco Seattle',
    'America/Anchorage': 'Anchorage', 'Pacific/Honolulu': 'Honolulu Hawaii',
    'America/Toronto': 'Toronto', 'America/Vancouver': 'Vancouver', 'America/Mexico_City': 'Mexico City',
    'America/Havana': 'Havana', 'America/Bogota': 'Bogota', 'America/Lima': 'Lima',
    'America/Santiago': 'Santiago', 'America/Sao_Paulo': 'Sao Paulo', 'America/Buenos_Aires': 'Buenos Aires',
    'America/Caracas': 'Caracas',
    'Australia/Perth': 'Perth', 'Australia/Adelaide': 'Adelaide', 'Australia/Brisbane': 'Brisbane',
    'Australia/Sydney': 'Sydney', 'Australia/Melbourne': 'Melbourne',
    'Pacific/Auckland': 'Auckland', 'Pacific/Fiji': 'Suva Fiji', 'UTC': 'UTC GMT'
  };


  /* ---------- 英文短名（界面展示用） ---------- */
  var EN_NAME = {
    'Asia/Shanghai': 'Beijing', 'Asia/Chongqing': 'Chongqing', 'Asia/Urumqi': 'Urumqi',
    'Asia/Hong_Kong': 'Hong Kong', 'Asia/Macau': 'Macau', 'Asia/Taipei': 'Taipei',
    'Asia/Tokyo': 'Tokyo', 'Asia/Seoul': 'Seoul', 'Asia/Pyongyang': 'Pyongyang',
    'Asia/Singapore': 'Singapore', 'Asia/Kuala_Lumpur': 'Kuala Lumpur', 'Asia/Bangkok': 'Bangkok',
    'Asia/Ho_Chi_Minh': 'Ho Chi Minh City', 'Asia/Manila': 'Manila', 'Asia/Jakarta': 'Jakarta',
    'Asia/Yangon': 'Yangon', 'Asia/Phnom_Penh': 'Phnom Penh', 'Asia/Vientiane': 'Vientiane',
    'Asia/Dhaka': 'Dhaka', 'Asia/Kolkata': 'New Delhi', 'Asia/Karachi': 'Karachi',
    'Asia/Kathmandu': 'Kathmandu', 'Asia/Colombo': 'Colombo', 'Asia/Kabul': 'Kabul',
    'Asia/Tashkent': 'Tashkent', 'Asia/Almaty': 'Almaty', 'Asia/Tehran': 'Tehran',
    'Asia/Baghdad': 'Baghdad', 'Asia/Riyadh': 'Riyadh', 'Asia/Dubai': 'Dubai',
    'Asia/Jerusalem': 'Jerusalem', 'Asia/Beirut': 'Beirut', 'Asia/Baku': 'Baku',
    'Europe/Moscow': 'Moscow', 'Europe/Kyiv': 'Kyiv', 'Europe/Istanbul': 'Istanbul',
    'Europe/Athens': 'Athens', 'Europe/Helsinki': 'Helsinki', 'Europe/Bucharest': 'Bucharest',
    'Europe/Warsaw': 'Warsaw', 'Europe/Berlin': 'Berlin', 'Europe/Vienna': 'Vienna',
    'Europe/Rome': 'Rome', 'Europe/Zurich': 'Zurich', 'Europe/Paris': 'Paris',
    'Europe/Brussels': 'Brussels', 'Europe/Amsterdam': 'Amsterdam', 'Europe/Madrid': 'Madrid',
    'Europe/Lisbon': 'Lisbon', 'Europe/London': 'London', 'Europe/Dublin': 'Dublin',
    'Europe/Stockholm': 'Stockholm', 'Europe/Oslo': 'Oslo', 'Europe/Copenhagen': 'Copenhagen',
    'Europe/Prague': 'Prague', 'Europe/Budapest': 'Budapest', 'Atlantic/Reykjavik': 'Reykjavik',
    'Africa/Cairo': 'Cairo', 'Africa/Johannesburg': 'Johannesburg', 'Africa/Lagos': 'Lagos',
    'Africa/Nairobi': 'Nairobi', 'Africa/Casablanca': 'Casablanca', 'Africa/Addis_Ababa': 'Addis Ababa',
    'America/New_York': 'New York', 'America/Chicago': 'Chicago', 'America/Denver': 'Denver',
    'America/Phoenix': 'Phoenix', 'America/Los_Angeles': 'Los Angeles', 'America/Anchorage': 'Anchorage',
    'Pacific/Honolulu': 'Honolulu', 'America/Toronto': 'Toronto', 'America/Vancouver': 'Vancouver',
    'America/Mexico_City': 'Mexico City', 'America/Havana': 'Havana', 'America/Bogota': 'Bogota',
    'America/Lima': 'Lima', 'America/Santiago': 'Santiago', 'America/Sao_Paulo': 'Sao Paulo',
    'America/Buenos_Aires': 'Buenos Aires', 'America/Caracas': 'Caracas',
    'Australia/Perth': 'Perth', 'Australia/Adelaide': 'Adelaide', 'Australia/Brisbane': 'Brisbane',
    'Australia/Sydney': 'Sydney', 'Australia/Melbourne': 'Melbourne',
    'Pacific/Auckland': 'Auckland', 'Pacific/Fiji': 'Suva', 'UTC': 'UTC'
  };

  /* ---------- 旧时区别名 → 现用名 ----------
     Android WebView / 部分系统时区库会返回 Asia/Calcutta、Asia/Saigon、Europe/Kiev
     这类老名字，统一折算成 CITY_TABLE 里的现用名，否则查不到城市、国旗、国家 */
  var TZ_ALIAS = {
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Saigon': 'Asia/Ho_Chi_Minh',
    'Asia/Katmandu': 'Asia/Kathmandu',
    'Asia/Rangoon': 'Asia/Yangon',
    'Asia/Dacca': 'Asia/Dhaka',
    'Asia/Chungking': 'Asia/Chongqing',
    'Asia/Macao': 'Asia/Macau',
    'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
    'Europe/Kiev': 'Europe/Kyiv',
    'US/Eastern': 'America/New_York',
    'US/Central': 'America/Chicago',
    'US/Mountain': 'America/Denver',
    'US/Pacific': 'America/Los_Angeles',
    'US/Alaska': 'America/Anchorage',
    'US/Hawaii': 'Pacific/Honolulu',
    'Canada/Atlantic': 'America/Halifax',
    'Canada/Eastern': 'America/Toronto',
    'Canada/Central': 'America/Winnipeg',
    'Canada/Mountain': 'America/Edmonton',
    'Canada/Pacific': 'America/Vancouver',
    'Mexico/General': 'America/Mexico_City',
    'Brazil/East': 'America/Sao_Paulo',
    'Brazil/West': 'America/Manaus',
    'Brazil/Acre': 'America/Rio_Branco',
    'Chile/Continental': 'America/Santiago',
    'Cuba': 'America/Havana',
    'Egypt': 'Africa/Cairo',
    'Israel': 'Asia/Jerusalem',
    'Iran': 'Asia/Tehran',
    'Iraq': 'Asia/Baghdad',
    'Turkey': 'Europe/Istanbul',
    'Poland': 'Europe/Warsaw',
    'Portugal': 'Europe/Lisbon',
    'Iceland': 'Atlantic/Reykjavik',
    'GB': 'Europe/London',
    'GB-Eire': 'Europe/London',
    'Eire': 'Europe/Dublin',
    'NZ': 'Pacific/Auckland',
    'Japan': 'Asia/Tokyo',
    'Singapore': 'Asia/Singapore',
    'Hongkong': 'Asia/Hong_Kong',
    'PRC': 'Asia/Shanghai',
    'ROC': 'Asia/Taipei',
    'ROK': 'Asia/Seoul',
    'W-SU': 'Europe/Moscow',
    'Australia/ACT': 'Australia/Sydney',
    'Australia/NSW': 'Australia/Sydney',
    'Australia/Victoria': 'Australia/Melbourne',
    'Australia/Queensland': 'Australia/Brisbane',
    'Australia/West': 'Australia/Perth',
    'Australia/South': 'Australia/Adelaide'
  };

  function canonTz(tz) {
    if (!tz) return tz;
    return TZ_ALIAS[tz] || tz;
  }

  /* ---------- 时区有效性（Android WebView / 老浏览器时区库可能缺项） ---------- */
  var tzValidCache = {};
  function isValidTz(tz) {
    if (!tz) return false;
    if (tzValidCache[tz] !== undefined) return tzValidCache[tz];
    var ok = false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
      ok = true;
    } catch (e) { ok = false; }
    tzValidCache[tz] = ok;
    return ok;
  }

  /* ---------- formatToParts 兼容层 ----------
     formatToParts 是 Chrome 57 / Safari 11 才有的。Android 5–6 的原生 WebView、
     老 UC/QQ 浏览器内核没有它，而整个引擎靠它取时区字段。
     这里用 format() 的 en-US 固定输出反向解析，保证老设备也能算。 */
  var HAS_PARTS = (function () {
    try {
      return typeof Intl.DateTimeFormat.prototype.formatToParts === 'function' &&
             typeof new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).formatToParts === 'function';
    } catch (e) { return false; }
  })();

  /* en-US + hour12:false 的 format() 输出形如 "11/25/2026, 22:31:07" */
  var RE_US = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;

  function partsOf(dtf, date) {
    if (HAS_PARTS) {
      var p = {};
      dtf.formatToParts(date).forEach(function (x) { if (x.type !== 'literal') p[x.type] = x.value; });
      return p;
    }
    var s = dtf.format(date).replace(/\u202f|\u00a0/g, ' ');
    var m = RE_US.exec(s);
    if (!m) return {};
    var h = parseInt(m[4], 10);
    var ap = (m[7] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return {
      month: m[1], day: m[2], year: m[3],
      hour: String(h), minute: m[5], second: m[6] || '00'
    };
  }

  /* ---------- 时区偏移（分钟，东正西负） ---------- */
  function offsetMinutes(tz, date) {
    date = date || new Date();
    if (!isValidTz(tz)) return 0;
    try {
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      var p = partsOf(dtf, date);
      if (!p.year) return 0;
      var asUTC = Date.UTC(
        parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10),
        parseInt(p.hour === '24' ? '00' : p.hour, 10), parseInt(p.minute, 10), parseInt(p.second, 10)
      );
      return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
    } catch (e) {
      return 0;
    }
  }

  /* ---------- 取某时区的日期各部分 ---------- */
  function partsIn(tz, date) {
    date = date || new Date();
    if (!isValidTz(tz)) tz = 'UTC';
    /* 注意：不能带 weekday —— 降级路径用 format() 正则解析，带上星期会破坏格式 */
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var p = partsOf(dtf, date);
    var hour = parseInt(p.hour, 10); if (hour === 24) hour = 0;
    return {
      tz: tz,
      year: parseInt(p.year, 10), month: parseInt(p.month, 10), day: parseInt(p.day, 10),
      hour: hour, minute: parseInt(p.minute, 10), second: parseInt(p.second, 10),
      weekday: weekdayOf(tz, date)
    };
  }

  /* 星期：老内核没有 formatToParts 时靠偏移反推 */
  function weekdayOf(tz, date) {
    var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (HAS_PARTS) {
      try {
        var wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
        if (names.indexOf(wd) >= 0) return wd;
      } catch (e) {}
    }
    var localMs = date.getTime() + offsetMinutes(tz, date) * 60000;
    return names[new Date(localMs).getUTCDay()];
  }

  /* ---------- 偏移格式化：+08:00 / -03:30 / UTC ---------- */
  function formatOffset(mins, withPrefix) {
    if (mins === 0) return withPrefix === false ? '0' : 'UTC';
    var sign = mins > 0 ? '+' : '-';
    var a = Math.abs(mins);
    var s = sign + pad2(Math.floor(a / 60)) + ':' + pad2(a % 60);
    return withPrefix === false ? s : 'UTC' + s;
  }

  function offsetLabelCN(mins) {
    var sign = mins >= 0 ? '东' : '西';
    var a = Math.abs(mins);
    var h = Math.floor(a / 60), m = a % 60;
    return sign + (h ? h + '时' : '') + (m ? m + '分' : '') + (h || m ? '' : '零');
  }

  /* ---------- 夏令时判定 ---------- */
  function isDST(tz, date) {
    date = date || new Date();
    if (tz === 'UTC') return false;
    var y = date.getUTCFullYear();
    var jan = offsetMinutes(tz, new Date(Date.UTC(y, 0, 1, 12)));
    var jul = offsetMinutes(tz, new Date(Date.UTC(y, 6, 1, 12)));
    var std = Math.min(jan, jul);
    return offsetMinutes(tz, date) > std;
  }

  /* ---------- 把“某时区的墙上时间”换算成真实时刻 ---------- */
  function wallTimeToDate(tz, y, mo, d, h, mi) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    var off1 = offsetMinutes(tz, new Date(guess));
    var t1 = guess - off1 * 60000;
    var off2 = offsetMinutes(tz, new Date(t1));
    var t2 = guess - off2 * 60000;
    return new Date(t2);
  }

  /* ---------- 格式化 ---------- */
  function fmtHM(p) { return pad2(p.hour) + ':' + pad2(p.minute); }
  function fmtHMS(p) { return fmtHM(p) + ':' + pad2(p.second); }
  function fmtDate(p) { return p.year + '-' + pad2(p.month) + '-' + pad2(p.day); }
  function fmtDateCN(p) { return (p.month) + '月' + p.day + '日'; }
  function fmtDateEN(p) {
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return M[p.month - 1] + ' ' + p.day;
  }
  var WK = { Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' };
  function fmtWeekCN(p) { return WK[p.weekday] || p.weekday; }

  /* ---------- 两个时区的“天差” ---------- */
  function dayDiff(base, other) {
    var a = Date.UTC(base.year, base.month - 1, base.day);
    var b = Date.UTC(other.year, other.month - 1, other.day);
    return Math.round((b - a) / 86400000);
  }
  function dayDiffLabel(n) {
    if (n === 0) return '同一天';
    return n > 0 ? '明天' : '昨天';
  }

  /* ---------- 日内时段描述 ---------- */
  function phaseOfHour(h) {
    if (h >= 0 && h < 6) return { key: 'night', cn: '凌晨', icon: '🌙' };
    if (h < 9) return { key: 'morning', cn: '早上', icon: '🌅' };
    if (h < 12) return { key: 'forenoon', cn: '上午', icon: '☀️' };
    if (h < 14) return { key: 'noon', cn: '中午', icon: '🍚' };
    if (h < 18) return { key: 'afternoon', cn: '下午', icon: '🌤️' };
    if (h < 22) return { key: 'evening', cn: '晚上', icon: '🌆' };
    return { key: 'night', cn: '深夜', icon: '🌙' };
  }

  /* ---------- 是否适合打扰（联系建议） ---------- */
  function contactAdvice(h) {
    if (h >= 8 && h < 22) return { ok: true, cn: '适合联系', key: 'ok' };
    if (h >= 22 || h < 7) return { ok: false, cn: '对方可能已休息', key: 'sleep' };
    return { ok: null, cn: '比较早，慎重联系', key: 'warn' };
  }

  /* ---------- 核心换算 ---------- */
  /**
   * @param {Object} opt
   *   baseTz   基准时区（用户所在地）
   *   targets  目标时区数组
   *   mode     'now' | 'wall' | 'instant'
   *   wall     {y,mo,d,h,mi} 当 mode==='wall' 时使用（以 baseTz 的墙上时间为准）
   *   instant  Date 当 mode==='instant'
   */
  function compute(opt) {
    var baseTz = opt.baseTz || 'Asia/Shanghai';
    var targets = opt.targets || [];
    var instant;
    if (opt.mode === 'wall' && opt.wall) {
      var w = opt.wall;
      instant = wallTimeToDate(baseTz, w.y, w.mo, w.d, w.h, w.mi);
    } else if (opt.mode === 'instant' && opt.instant) {
      instant = new Date(opt.instant);
    } else {
      instant = new Date();
    }

    var baseP = partsIn(baseTz, instant);
    var baseOff = offsetMinutes(baseTz, instant);
    var rows = targets.map(function (tz) {
      var p = partsIn(tz, instant);
      var off = offsetMinutes(tz, instant);
      return {
        tz: tz,
        parts: p,
        offset: off,
        offsetText: formatOffset(off),
        diffFromBase: off - baseOff,
        dayDiff: dayDiff(baseP, p),
        dayDiffLabel: dayDiffLabel(dayDiff(baseP, p)),
        dst: isDST(tz, instant),
        phase: phaseOfHour(p.hour),
        advice: contactAdvice(p.hour),
        time: fmtHM(p),
        seconds: fmtHMS(p),
        date: fmtDate(p),
        dateCN: fmtDateCN(p),
        dateEN: fmtDateEN(p),
        week: fmtWeekCN(p),
        weekEN: p.weekday
      };
    });

    return {
      instant: instant,
      baseTz: baseTz,
      base: {
        tz: baseTz,
        parts: baseP,
        offset: baseOff,
        offsetText: formatOffset(baseOff),
        dst: isDST(baseTz, instant),
        phase: phaseOfHour(baseP.hour),
        time: fmtHM(baseP),
        seconds: fmtHMS(baseP),
        date: fmtDate(baseP),
        dateCN: fmtDateCN(baseP),
        dateEN: fmtDateEN(baseP),
        week: fmtWeekCN(baseP),
        weekEN: baseP.weekday
      },
      rows: rows
    };
  }

  /* ---------- 常用时区查询 ---------- */
  function listTimeZones() {
    var all = [];
    try {
      if (typeof Intl.supportedValuesOf === 'function') all = Intl.supportedValuesOf('timeZone');
    } catch (e) { all = []; }
    if (!all.length) {
      all = CITY_TABLE.map(function (c) { return c.id; });
    }
    return all;
  }

  function cityInfo(tz) {
    tz = canonTz(tz);
    for (var i = 0; i < CITY_TABLE.length; i++) {
      if (CITY_TABLE[i].id === tz) {
        var hit = CITY_TABLE[i];
        return {
          id: hit.id, name: hit.name, cn: hit.cn, en: hit.en, flag: hit.flag,
          enName: EN_NAME[tz] || hit.name
        };
      }
    }
    var city = (tz || '').split('/').pop().replace(/_/g, ' ');
    return { id: tz, name: city, cn: '', en: '', flag: '🌍', enName: EN_NAME[tz] || city };
  }

  function cityLabel(tz) {
    var c = cityInfo(tz);
    return c.cn ? c.cn + ' · ' + c.name : c.name;
  }
  function cityLabelEn(tz) {
    var c = cityInfo(tz);
    if (tz === 'UTC') return 'UTC';
    return c.enName || c.name;
  }

  /* ---------- 搜索时区 ---------- */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[\s_\-\/·.]+/g, '');
  }
  function searchZones(q, limit) {
    limit = limit || 30;
    q = (q || '').trim();
    var pool = CITY_TABLE.slice();
    listTimeZones().forEach(function (tz) {
      if (!isValidTz(tz)) return;
      if (!pool.some(function (c) { return c.id === tz; })) {
        var city = tz.split('/').pop().replace(/_/g, ' ');
        pool.push({ id: tz, name: city, cn: '', en: tz, flag: '🌍' });
      }
    });
    if (!q) return pool.slice(0, limit);
    var nq = norm(q);
    var hit = pool.filter(function (c) {
      var hay = norm(c.id + ' ' + c.name + ' ' + (c.cn || '') + ' ' + (c.en || '') + ' ' + (EN_CITY[c.id] || ''));
      return hay.indexOf(nq) >= 0;
    });
    return hit.slice(0, limit);
  }

  /* ---------- 时区“城市时间”排序稳定性：按偏移 ---------- */
  function sortByOffset(rows) {
    return rows.slice().sort(function (a, b) { return b.offset - a.offset; });
  }

  /* ---------- 预设组合 ---------- */
  var PRESETS = {
    'us': { name: '美国主要城市', tz: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] },
    'eu': { name: '欧洲主要城市', tz: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow'] },
    'asia': { name: '亚洲主要城市', tz: ['Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Dubai'] },
    'game': { name: '游戏服务器', tz: ['America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'Asia/Shanghai'] },
    'world': { name: '环球一圈', tz: ['Pacific/Auckland', 'Asia/Shanghai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'] }
  };

  return {
    CITY_TABLE: CITY_TABLE,
    PRESETS: PRESETS,
    offsetMinutes: offsetMinutes,
    partsIn: partsIn,
    formatOffset: formatOffset,
    offsetLabelCN: offsetLabelCN,
    isDST: isDST,
    wallTimeToDate: wallTimeToDate,
    fmtHM: fmtHM,
    fmtHMS: fmtHMS,
    fmtDate: fmtDate,
    fmtDateCN: fmtDateCN,
    fmtDateEN: fmtDateEN,
    fmtWeekCN: fmtWeekCN,
    dayDiff: dayDiff,
    dayDiffLabel: dayDiffLabel,
    phaseOfHour: phaseOfHour,
    contactAdvice: contactAdvice,
    compute: compute,
    listTimeZones: listTimeZones,
    cityInfo: cityInfo,
    cityLabel: cityLabel,
    canonTz: canonTz,
    TZ_ALIAS: TZ_ALIAS,
    cityLabelEn: cityLabelEn,
    searchZones: searchZones,
    sortByOffset: sortByOffset,
    pad2: pad2
  };
});
