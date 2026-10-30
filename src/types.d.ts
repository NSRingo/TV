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
     * 启用的标签与栏目
     *
     * 选择标签与栏目，多个值以逗号分隔；实际入口仍由平台、版本和地区决定。
     *
     * @remarks
     *
     * Possible values:
     * - `'WatchNow'` - 主页（立即观看）
     * - `'Originals'` - Apple TV+（原创内容）
     * - `'MLS'` - MLS
     * - `'Sports'` - 体育节目
     * - `'Kids'` - 儿童
     * - `'Store'` - 商店
     * - `'Movies'` - 电影
     * - `'TV'` - 电视节目
     * - `'ChannelsAndApps'` - 频道与 App
     * - `'Library'` - 资料库
     * - `'Search'` - 搜索
     *
     * @defaultValue ["WatchNow","Originals","MLS","Sports","Kids","Store","Movies","TV","ChannelsAndApps","Library","Search"]
     */
    Tabs?: ('WatchNow' | 'Originals' | 'MLS' | 'Sports' | 'Kids' | 'Store' | 'Movies' | 'TV' | 'ChannelsAndApps' | 'Library' | 'Search')[];
    CountryCode?: {
    /**
         * [配置文件] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Configs?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [用户设置] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Settings?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [内容详情地区优先级] 国家或地区代码
         *
         * 按优先顺序填写地区代码，以逗号分隔，默认 SG,TW。
         *
         * @defaultValue ["SG","TW"]
         */
        View?: any[];
    /**
         * [主页] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        WatchNow?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [频道与 App] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Channels?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [Apple TV+] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Originals?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [体育节目] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "US"
         */
        Sports?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [儿童] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "US"
         */
        Kids?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [商店] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Store?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [电影] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Movies?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [电视节目] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        TV?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [人物] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "SG"
         */
        Persons?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [搜索] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Search?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
    /**
         * [其他] 国家或地区代码
         *
         * 选择此分类请求使用的国家或地区；AUTO 保留原值。
         *
         * @remarks
         *
         * Possible values:
         * - `'AUTO'` - 自动（保留原请求地区）
         * - `'CN'` - 中国大陆
         * - `'HK'` - 中国香港
         * - `'TW'` - 中国台湾
         * - `'SG'` - 新加坡
         * - `'US'` - 美国
         * - `'JP'` - 日本
         * - `'AU'` - 澳大利亚
         * - `'GB'` - 英国
         * - `'KR'` - 韩国
         * - `'CA'` - 加拿大
         * - `'IE'` - 爱尔兰
         *
         * @defaultValue "AUTO"
         */
        Others?: 'AUTO' | 'CN' | 'HK' | 'TW' | 'SG' | 'US' | 'JP' | 'AU' | 'GB' | 'KR' | 'CA' | 'IE';
};
    /**
     * [储存] 配置类型
     *
     * 默认使用 PersistentStore，配置优先级为 database -> $argument -> PersistentStore (BoxJS)；选择 Argument 时为 database -> PersistentStore (BoxJS) -> $argument。
     *
     * @remarks
     *
     * Possible values:
     * - `'Argument'` - 优先使用 $argument，其次使用 PersistentStore (BoxJs)，最后使用 database.mjs 的默认配置
     * - `'PersistentStore'` - 优先使用 PersistentStore (BoxJS)，其次使用 $argument，最后使用 database.mjs 的默认配置
     * - `'database'` - 只使用脚本内置默认配置
     *
     * @defaultValue "PersistentStore"
     */
    Storage?: 'Argument' | 'PersistentStore' | 'database';
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
