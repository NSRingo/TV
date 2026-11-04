### 🛠 Development
  * 对齐 WeatherKit / MapKit dev 的 Rollup 构建、代理入口与处理函数分离。
  * 拆分 full / release / dev / rewrite 参数和模板，完整参数开放 Tabs、CountryCode，增加 Storage 来源选择。
  * 升级 util 至 2.7.5，并更新构建依赖与锁文件。
  * 增加 tvkit 对应的 Pages / Workers / Vercel 入口与配置，隔离每次请求的参数和配置。
  * 对齐共享构建工作流及正式、dev、Rewrite 产物，增加回归测试和产物检查。

### 🆕 New Features
  * 增加了`启用绕过 SSL 证书固定校验`设置项以应对 iOS/tvOS 18.4及以上版本的新要求
    * 不再需要 MitM `play.itunes.apple.com` 和 `play-edge.itunes.apple.com`
    * 由于采用了新的修改方式，移除了`[主机名] HTTP实时流(HLS)地址`设置项
    * 由于采用了新的修改方式，移除了`[主机名] FairPlay流(FPS)地址`设置项
    * `Shadowrocket` 与 `Quantumult X` 不支持此功能，如遇到问题，请在 `BoxJs` 中关闭此功能
