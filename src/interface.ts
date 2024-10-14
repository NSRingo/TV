export interface Settings {
    /**
     * 总功能开关
     *
     * 是否启用此APP修改
     *
     * @defaultValue true
     */
    Switch?: boolean;
    /**
     * 启用第三方App与TV app关联功能
     *
     * 是否将桌面版/macOS版/app版等平台的TV app转换至iPad版，以启用第三方App与TV app关联功能(如: Disney+,Prime Video等)。
     *
     * @defaultValue false
     */
    ThirdParty?: boolean;
    /**
     * HTTP实时流(HLS)地址
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
     * FairPlay流(FPS)地址
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
}
