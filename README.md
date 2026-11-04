#  iRingo: 📺 TV

全面自定义「TV app」功能。安装与使用说明见 [ iRingo 文档](https://NSRingo.github.io/guide/apple-tv)。

支持 Surge、Loon、Quantumult X、Stash、Shadowrocket 和 Egern。

## 常用设置

可通过模块参数或 BoxJs 修改设置，具体可用选项以所用版本的设置界面为准。

| 参数 | 用途 |
| --- | --- |
| `ThirdParty` | 启用受支持的第三方 App 关联功能。 |
| `isWorkaroundSSLPinning` | 配合 DualSubs 使用双语字幕。 |
| `Brands` | 选择 F1、MLS、MLB、Lumen、Netflix，默认全部启用。 |
| `CountryCode` | 为不同内容选择国家或地区；`AUTO` 保持当前地区。 |
| `CountryCode.Netflix` | Netflix 内容地区，默认 `US`，可选择其他地区或 `AUTO`。 |
| `Locale` | 内容语言，默认 `AUTO`，跟随 App 语言。 |
| `LumenKey` | Lumen 提供的密钥；留空时不启用 Lumen 影视搜索。 |
| `Storage` | 选择设置来源，默认 `PersistentStore`。 |
| `LogLevel` | 调整日志输出等级。 |

`Brands` 控制额外的品牌入口和卡片，取消选择会停止添加对应品牌，原有内容仍保留。`Brands=[]` 或在 BoxJs 中全部取消选择，可关闭全部额外品牌。旧 `Tabs` 设置已停用，请使用 `Brands`。

Netflix 入口面向 iPhone、iPad 和 Apple TV。地区和语言可以分别设置。

例如，只启用 F1 和 MLB，并选择简体中文：

```text
Brands=F1,MLB&Locale=zh-Hans
```

## 设置来源

同一设置存在多个值时，按下表从左到右取值：

| `Storage` | 优先级 |
| --- | --- |
| `PersistentStore`（默认） | BoxJs → 模块参数 → 默认设置 |
| `Argument` | 模块参数 → BoxJs → 默认设置 |
| `database` | 仅使用默认设置 |
