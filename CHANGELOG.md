### 🆕 New Features
  * 增加了`启用绕过 SSL 证书固定校验`设置项以应对 iOS/tvOS 18.4及以上版本的新要求
    * 不再需要 MitM `play.itunes.apple.com` 和 `play-edge.itunes.apple.com`
    * 由于采用了新的修改方式，移除了`[主机名] HTTP实时流(HLS)地址`设置项
    * 由于采用了新的修改方式，移除了`[主机名] FairPlay流(FPS)地址`设置项
    * `Shadowrocket` 与 `Quantumult X` 不支持此功能，如遇到问题，请在 `BoxJs` 中关闭此功能