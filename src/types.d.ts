export interface Settings {
    /**
     * 启用第三方 App 与 TV app 关联功能
     *
     * 是否将桌面版/macOS版/app版等平台的 TV app 转换至 iPad 版，以启用第三方 App 与 TV app 关联功能(如: Disney+, Prime Video 等)。
     *
     * @defaultValue false
     */
    ThirdParty?: boolean;
    /**
     * [主机名] HTTP实时流(HLS)地址
     *
     * 因为FPS服务域名禁止MitM，修改此地址可以分离HLS与FPS的域名，从而恢复对DualSubs的双语字幕支持。
     *
     * @remarks
     *
     * Possible values:
     * - `''` - OFF(不修改)
     * - `'play.itunes.apple.com'` - play.itunes.apple.com (不推荐，与播放服务域名重叠)
     * - `'play-edge.itunes.apple.com'` - play-edge.itunes.apple.com (默认)
     *
     * @defaultValue "play-edge.itunes.apple.com"
     */
    HLSUrl?: '' | 'play.itunes.apple.com' | 'play-edge.itunes.apple.com';
    /**
     * [主机名] FairPlay流(FPS)地址
     *
     * 因为FPS服务域名禁止MitM，修改此地址可以分离HLS与FPS的域名，从而恢复对DualSubs的双语字幕支持。
     *
     * @remarks
     *
     * Possible values:
     * - `''` - OFF(不修改)
     * - `'play.itunes.apple.com'` - play.itunes.apple.com (默认)
     * - `'play-edge.itunes.apple.com'` - play-edge.itunes.apple.com (不推荐，与播放服务域名重叠)
     *
     * @defaultValue "play.itunes.apple.com"
     */
    FPSUrl?: '' | 'play.itunes.apple.com' | 'play-edge.itunes.apple.com';
    /**
     * [调试] 日志等级
     *
     * 选择脚本日志的输出等级，低于所选等级的日志将全部输出。
     *
     * @remarks
     *
     * Possible values:
     * - `'OFF'` - 关闭
     * - `'ERROR'` - ❌ 错误
     * - `'WARN'` - ⚠️ 警告
     * - `'INFO'` - ℹ️ 信息
     * - `'DEBUG'` - 🅱️ 调试
     * - `'ALL'` - 全部
     *
     * @defaultValue "WARN"
     */
    LogLevel?: 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'ALL';
}
