首个版本。

**下载**

| 版本 | 文件 |
|---|---|
| 安卓 · 中文 | `WorldClock-zh-v1.0.0.apk` |
| 安卓 · 国际（英文默认） | `WorldClock-Intl-v1.0.0.apk` |
| 单文件 HTML | `WorldClock-single.html` |

在线试用 / iPhone 安装：https://6shmilzyh6.github.io/world-clock/

**功能**

- 位置自己设定：可改「我的位置」，指定时间模式下还能单独换基准城市
- 实时模式 + 指定时间换算，跨日自动标「昨天 / 明天」
- 418 个 IANA 时区，含半小时、45 分钟偏移（加德满都 +5:45、查塔姆 +12:45）
- 夏令时按当天真实规则计算，切换日 23/25 小时边界正确
- 联系建议、城市详情、逐时对照表
- 中英双语、24/12 小时制、深/浅主题、显示秒、城市预设
- 纯离线，无联网、无账号、无广告

**校验**

- Android 5.0（API 21）～ 15+，v1/v2/v3 签名全部通过 `apksigner verify`
- 两个 APK 包名不同（`com.yg.worldclock` / `com.yg.worldclock.intl`），可同时安装
- APK 未上架任何商店，安装时需允许「未知来源应用」

**哈希**

见 `SHA256SUMS.txt`。
