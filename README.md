#  iRingo: 📺 TV

全面自定义「TV app」功能。使用说明见 [ iRingo 文档](https://NSRingo.github.io/guide/apple-tv)。

## 开发与构建

使用 Node.js 22.18 或更新版本；CI 固定使用已验证的 Node.js 26。

```sh
npm ci
node node_modules/puppeteer/install.mjs
npm run dev
```

`npm run dev` 在本地同时生成 dev 脚本和模块。CI 分别使用 `build:dev`、`build:dev-args`，两个 job 固定检出同一触发提交；手动运行 Dev 时选择 dev 分支。正式版构建及验证：

```sh
npm run build
npm run build:args
npm run dts
npm test
npx tsc --noEmit
npm run verify:artifacts -- release
```

Egern 转换通过 Puppeteer 运行，需要已安装的 Chrome。GitHub Actions 使用共享 setup-node action 安装 Node 和依赖。Build、Dev 各自并行运行脚本构建和模块生成，全部成功后汇总为 artifact；只有正式模块生成 job 安装 Chrome、调整 AppArmor。测试、类型与云端入口构建检查在脚本 job 执行。

| 命令 | 用途 |
| --- | --- |
| `build:dev` / `build` | 可读 dev bundle / 压缩正式 bundle |
| `build:dev-args` | dev 模块及完整 dev BoxJs 设置 |
| `build:release-args` | 精简参数的正式模块 |
| `build:full-args` | 完整 BoxJs 设置 |
| `build:args:rewrite` | 云端 Rewrite 模块 |
| `build:args` | 顺序构建正式模块、完整 BoxJs 设置、Rewrite 模块 |
| `dts` | 从 full 参数配置生成 Settings 类型 |

## 入口、参数与产物

代理入口为 `src/request.js`、`src/response.js` 及其 `.dev.js` 版本。业务逻辑分别位于 `src/process/Request.mjs`、`Response.mjs` 及对应 dev 文件，保留两套既有行为。

参数由 `arguments-builder.full.config.ts` 统一定义：release 提供 ThirdParty、isWorkaroundSSLPinning、Locale、LumenKey、Storage、LogLevel；full/dev 额外提供 Brands 和 CountryCode 的全部现有字段。默认值来自数据库，View 是按优先顺序排列的地区列表。BoxJs 设置继续使用 `@iRingo.TV.Settings`，生成到 `template/boxjs.settings.json`；dev 设置生成到 `dist/iRingo.TV.dev.boxjs.json`。

`Brands` 替代已废除的 `Tabs`，只接受 `F1`、`MLS`、`MLB`、`Lumen`，所有入口默认全部启用。品牌数组只控制补入，不删除原站已有导航或卡片，也不决定排序；旧 `Tabs` 设置不再生效。Apple TV（Originals）的导航、品牌元数据和卡片完全沿用原站，不参与品牌选择或补入。`Brands=[]` 或 BoxJs 全不选会关闭全部补入。`WatchNow`、`Sports`、`Store`、`Movies`、`TV`、`ChannelsAndApps`、`Library`、`Search` 等普通导航保持服务器提供的内容与相对顺序，不再按设置筛选、补建、补写 id 或切换版本模板。`CountryCode` 的地区选择继续独立生效。

例如 `Brands=F1,MLB` 只补入 F1 与 MLB；MLB 沿用 Friday Night Baseball 的 Room 入口。F1 的原生导航类型为 `Grevy`、品牌 ID 为 `tvs.sbd.241000`，与其他体育内容共用 `CountryCode.Sports`。

Watch Now 的官方体育行包含 F1、MLS 和 Friday Night Baseball（MLB）。已有行原位补齐；缺行时在“热门电影”前创建，没有该定位行的分页保持原样。Brands 的 F1、MLS、MLB 分别控制三项补入，原站已有卡片保留；F1/MLB 使用 Sports 地区，MLS 沿用 Originals。

F1、MLS 的导航模板直接采用原站 configurations 的完整 tab 对象，包含官方标题、目标地址、背景色、通用链接和四组侧栏 SVG；服务器已有的 tab 整体保留。提取样本与原始响应哈希记录在 `tests/fixtures/us-tabs.json`。

地区设置只切换内容地区。`Locale` 默认 `AUTO`，原样保留 App 提供的语言参数和请求头，不添加、截断或按地区覆盖语言代码；手动选择语言时，仅覆盖 UTS 接口的 `locale` 参数。

补入内容的入口名称、“频道和 App”分组名及体育 Brick 标题由 `InjectBrand.#Localize` 集中映射。响应入口依次取显式 `Locale`、URL `locale`、`X-Apple-I-Locale`、`Accept-Language` 的首选语言，将确定后的 `locale` 放入 `brandContext` 直接传给构造器；class 只使用该结果，不解析请求头或重新判断设置。缺少语言或没有对应译文时使用英文原文。F1 的简体名称为“一级方程式锦标赛”，繁体为“一級方程式賽車”，粤语繁体为“一級方程式”；同时提供官方日文、韩文名称，MLS、Lumen 保留原名。日区体育 Brick 的 MLB Room 卡片 `title` 为“Apple TV フライデーナイト ベースボール”。新增体育行标题按英文原文译写：简繁中文为“探索 F1、MLS 和 MLB”，日文为“F1、MLS、MLBをチェック”，并覆盖粤语繁体和韩文。新增导航、品牌、卡片及搜索 BR 的分组名共用该表；服务器已有的导航、品牌、卡片和本地化行标题仍保留；体育行的已知英文标题使用模板译文，其他说明文字不参与映射。官方配置、搜索及体育 shelf 响应的文字投影见 `tests/fixtures/brand-localization.json`；体育行标题的译文不作为官方抓包文案，也不代表真机显示验证。

F1、MLS、MLB、Lumen 的身份和素材保存在 `InjectBrand.#Config` 的 brands、bricks 数组。`database.TV.Configs.Brand` 将品牌名称映射为 ID；`setENV` 合并配置后一次性将 `Settings.Brands` 转为 ID 数组。构造器从 `brandContext` 接收 `{ settings, locale? }`，按转换后的 `settings.Brands` 裁剪品牌配置并本地化补入文字，以原站 Apple TV、F1、MLS 的固定顺序定位导航和卡片；各方法按需使用同一 `{ pfm, region, locale, settings }` 上下文。正式与 dev 入口共用品牌选择与 Lumen 注入；Lumen 资源修复入口只处理数组中已启用的 Lumen，不补入其他品牌。

第三方子导航使用 `type=Brand`，`brandType` 统一取自 `InjectBrand.#Config`；`isApSubscription`、`isFirstParty` 可在配置中独立指定 true/false，各自省略时由内部 Build 方法按 `Channel=true / App=false` 派生。Lumen 配置为 `Channel`，两项默认均为 true；所有注入入口和 Lumen 资源脚本共用该品牌定义。子项自身提供 `isPinned`、`canBeHiddenFromNavigation` 和 `images.defaultImage`。固定状态优先保留已有子项值，缺少时采用 Brand 状态；侧栏图复用品牌 appIcon。原始 Brand 不手填 `channelType`，该值由客户端按品牌标志派生，页面的 `canvasType=Channel` 保留。

| 频道 | 导航 | 首页已有结构 | 搜索落地页 |
| --- | --- | --- | --- |
| F1 / MLS | Grevy / MLS 根 tab | channelLockup / brandLockup、uts.col.tv-plus-sports-nav-brick | 官方 Browse 网格 |
| MLB | 无一级导航 | uts.col.tv-plus-sports-nav-brick 中的 Room 卡片 | 不补入 |
| Lumen | ChannelsAndApps 子项 | channelLockup / brandLockup、uts.shlfsect.moretv | Browse 网格；缺少时创建第三方网格 |

`InjectBrand` 自行决定品牌注入位置：已有苹果导航整体保留，缺少 F1、MLS 时按 Apple TV → F1 → MLS 顺序，以已有品牌、主页和资料库定位补入，不重排原导航。iPhone 不补入缺少的 F1、MLS 一级导航，但保留服务器已有入口，且不影响首页和搜索卡片。缺少苹果导航容器时不创建；Lumen 则在已有 `ChannelsAndApps` 中补入子项，缺少分组时在 Library 前创建，没有 Library 时追加。

首页频道卡片只补入已有行，体育行沿用“热门电影”定位点；Lumen 可补入已有 moretv 分组。搜索落地页覆盖 `/uts/v3/search/landing`、`/uts/v3/canvases/Roots/tahoma_searchlanding`，使用搜索专用素材，按 Lumen → 原站已有 Apple TV → F1 → MLS 的相对顺序补入，保留其他卡片和分页；仅 Lumen 可在缺少 Browse 网格时创建第三方网格。卡片直接使用原站或配置 URL，脚本不补写或覆盖 `ctx_proot`。已有苹果卡片及品牌对象保持原样，缺少品牌元数据时不虚构订阅、安装或同意状态。官网行注入仍停用。原站样本与回放不代表真机 UI 或播放验证。

所有参数入口均提供可选的 `LumenKey`，填写 Lumen 官方模块中 `X-Lumen-Key` 的值，例如在 script argument 中添加 `&LumenKey=你的值`。只有 `Brands` 包含 Lumen 且密钥非空时，`InjectSearch` 才查询 Lumen 并合并频道入口和影视结果；留空或只填空白时跳过搜索注入。该设置遵循下表的 BoxJs / Storage 合并顺序，不写入品牌或响应正文。

Storage 控制设置来源，优先级从高到低：

| Storage | 优先级 |
| --- | --- |
| `PersistentStore`（默认） | BoxJs → 模块参数 → 数据库默认值 |
| `Argument` | 模块参数 → BoxJs → 数据库默认值 |
| `database` | 仅数据库默认值 |

正式产物保留 `request.bundle.js`、`response.bundle.js` 和 `iRingo.TV` 前缀，支持 Surge、Loon `.plugin`、Quantumult X、Stash、Shadowrocket、Egern。正式发布时由标签填写 package 版本，分支构建用于验证。dev 使用 `.dev` 文件名，通过 dev 推送工作流发布两个脚本和四个平台模块到 [TV Gist](https://gist.github.com/VirgilClyne/fa7b08c6994b555b82b6d22df89f8a31)。

Rewrite 提供 Surge、Loon `.lpx`、Shadowrocket、Stash 和 Egern 版本。生成文件位于 `dist`，供直接引用的副本位于 `modules`。更新 Rewrite 模板后运行 `build:args:rewrite`，同步这五个副本。

## Pages、Workers 与 Vercel

云端名称对应 Apple 上游 `uts-api.itunes.apple.com`：

| 用途 | 配置目标 |
| --- | --- |
| Pages 项目 / Worker 名称 | `uts-api-itunes` |
| Pages 正式版 | `uts-api-itunes.pages.dev` |
| Pages dev 预览版 | `dev.uts-api-itunes.pages.dev` |
| Worker 自定义域名 | `uts-api-itunes.nanocat.cloud` |

这些是仓库的部署目标；加入配置和构建成功不代表服务已上线。Pages 使用 `wrangler.jsonc`，Workers 使用 `wrangler.workers.jsonc`。两者复用 Hono 和正式处理函数，无需 MapKit 的 KV 绑定。

- `/` 返回健康检查 `OK`。
- `/uts/v1/*`、`/uts/v2/*`、`/uts/v3/*` 转发到 UTS。
- `/v1/*`、`/v2/*`、`/v3/*` 转发到 UMC。
- 也支持 `/uts-api.itunes.apple.com/…` 和 `/umc-tempo-api.apple.com/…` 前缀。

运行参数可通过 `$argument` 请求头或 URL 查询参数传入；请求头优先。首字母大写的配置查询参数会在转发前移除，原有 `sf`、`pfm` 等 Apple 参数保留。参数和可变配置按请求隔离，媒体域名继续使用现有重写规则。

```sh
npm run dev:pages
npm run dev:workers
npm run dev:vercel
```

只构建、不部署的检查：

```sh
npx wrangler pages functions build functions --outdir .wrangler/pages-build
npx wrangler deploy --dry-run --outdir .wrangler/worker-build --config wrangler.workers.jsonc
```

`deploy:pages`、`deploy:workers`、`deploy:vercel` 会执行实际部署。GitHub Actions 只构建产物和发布 Gist，不执行 Cloudflare 部署；云端沿用 Cloudflare 端已有的 Git 自动部署配置，dev 推送可能触发对应的自动构建。

## 回归基线

`tests/fixtures/runtime-baseline.json` 保存原提交 `084eff9` 配合 util 1.8.9、URL 1.2.4 的 52 个行为结果。请求与播放处理继续对照历史基线；导航回放改为验证 `Brands=[]` 时完整保留上游输入。品牌测试验证 iPhone 不补入 F1、MLS，其他平台按位置补入，以及未选品牌的已有导航对象仍完整保留。`apple-search-landing.json`、`us-tabs.json`、`us-f1-home.json` 保存裁剪后的原站结构，验证频道位置、搜索专用素材、已有对象/状态保留、分页和重复注入；另覆盖 Storage、云端路由、请求体和交错请求参数隔离。
