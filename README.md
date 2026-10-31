#  iRingo: 📺 TV

全面自定义「TV app」功能。使用说明见 [ iRingo 文档](https://NSRingo.github.io/guide/apple-tv)。

## 开发与构建

使用 Node.js 22.18 或更新版本；CI 固定使用已验证的 Node.js 26。

```sh
npm ci
node node_modules/puppeteer/install.mjs
npm run dev
```

`npm run dev` 同时生成 dev 脚本和模块。正式版构建及验证：

```sh
npm run build
npm run build:args
npm run dts
npm test
npx tsc --noEmit
npm run verify:artifacts -- release
```

Egern 转换通过 Puppeteer 运行，需要已安装的 Chrome。GitHub Actions 使用共享 Node Build action 安装依赖和浏览器，再检查测试、类型与产物。

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

参数由 `arguments-builder.full.config.ts` 统一定义：release 提供 ThirdParty、isWorkaroundSSLPinning、Storage、LogLevel；full/dev 额外提供 Tabs 和 CountryCode 的全部现有字段。默认值来自数据库，View 是按优先顺序排列的地区列表。BoxJs 设置继续使用 `@iRingo.TV.Settings`，生成到 `template/boxjs.settings.json`；dev 设置生成到 `dist/iRingo.TV.dev.boxjs.json`。

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

`deploy:pages`、`deploy:workers`、`deploy:vercel` 会执行实际部署。Workers 的两个 GitHub 工作流仅手动触发，使用 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；普通 dev 推送只发布 Gist。

## 回归基线

`tests/fixtures/runtime-baseline.json` 保存原提交 `084eff9` 配合 util 1.8.9、URL 1.2.4 的 52 个行为结果。测试分别回放正式版和 dev 的输入，再检查 Storage、云端路由、请求体和交错请求参数隔离。
