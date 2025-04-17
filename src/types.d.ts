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
     * 启用绕过 SSL 证书固定校验
     *
     * 是否绕过播放列表所使用域名的证书固定校验功能，从而恢复对DualSubs的双语字幕支持。
     *
     * @defaultValue true
     */
    isWorkaroundSSLPinning?: boolean;
    /**
     * [调试] 日志等级
     *
     * 选择脚本日志的输出等级，低于所选等级的日志将全部输出。
     *
     * @remarks
     *
     * Possible values:
     * - `'OFF'` - 🔴 关闭
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
