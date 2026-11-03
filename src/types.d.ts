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
     * 语言
     *
     * 选择 UTS 接口返回内容的语言。AUTO 保留 App 生成的语言参数和请求头，跟随 App 语言设置。
     *
     * @remarks
     *
     * Possible values:
     * - `'AUTO'` - 自动（跟随 App 语言）
     * - `'zh-Hans'` - 简体中文
     * - `'zh-Hant'` - 繁体中文
     * - `'yue-Hant'` - 粤语（繁体）
     * - `'en-US'` - 英语（美国）
     * - `'en-GB'` - 英语（英国）
     * - `'en-AU'` - 英语（澳大利亚）
     * - `'en-CA'` - 英语（加拿大）
     * - `'ja-JP'` - 日语
     * - `'ko-KR'` - 韩语
     *
     * @defaultValue "AUTO"
     */
    Locale?: 'AUTO' | 'zh-Hans' | 'zh-Hant' | 'yue-Hant' | 'en-US' | 'en-GB' | 'en-AU' | 'en-CA' | 'ja-JP' | 'ko-KR';
    /**
     * 启用的品牌
     *
     * 选择要注入的品牌，多个值以逗号分隔；自动选择注入位置，保留原站已有导航与卡片。
     *
     * @remarks
     *
     * Possible values:
     * - `'F1'` - F1（一级方程式赛车）
     * - `'MLS'` - MLS
     * - `'MLB'` - MLB（Friday Night Baseball）
     * - `'Lumen'` - Lumen
     *
     * @defaultValue ["F1","MLS","MLB","Lumen"]
     */
    Brands?: ('F1' | 'MLS' | 'MLB' | 'Lumen')[];
    /**
     * [Lumen] 搜索鉴权 X-Lumen-Key
     *
     * 可选，填写 Lumen 官方模块中 X-Lumen-Key 的值；留空时跳过搜索中的 Lumen 频道入口与影视结果。
     *
     * @defaultValue ""
     */
    LumenKey?: string;
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
