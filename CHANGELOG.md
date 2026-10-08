# 更新日志

本文件记录本项目的显著变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 版本说明：`@migptgui/*` 产品线（`contracts` / `controller` / `gui` / `options` / `options-with-preview` / `server`）
> 与发布包 `migpt-server` 已统一为 `2.0.0`；`migpt-cli` 独立按 `5.x` 演进；根包 `@mgc/root` 为私有占位（`0.0.0`）不参与发布。

## [2.0.0] - 2026-10-08

### Added

- 数据版本与迁移框架：`version.json` 记录 `dataVersion`，启动时 `runMigrations()` 按版本增量升级并逐条落盘进度，可安全重入、中断续跑；首个基线迁移 v1 收敛旧 `settings.json` → 多账号、设备会话群 → Room 实体
- 内置 / 用户数据分离：内置型号与内置语音的「定义」回归代码（`store/builtins.ts`，随版本升级自动修正），用户改动以补丁形式写入 `overrides.json`（`store/overrides.ts`）；「重置」只删补丁、代码默认即刻回归，不再波及其他数据；v2 迁移把既有可写文件中的内置项一次性剥离，仅保留用户自建项
- 数据 schema 校验（zod）：为全部落盘实体定义 schema（`store/schemas.ts`），写入经 `writeJsonChecked` 前置校验、不符即抛 `DataValidationError`（经统一错误中间件回 500），脏数据不落盘；读取经 `readJsonChecked` / `readJsonListChecked` 逐条校验，非法项告警并跳过、不拖垮整份列表；`createCrudRouter` 新增 `schema` 选项，各实体 CRUD 落盘统一把关
- 数据导出 / 导入 / 备份（`store/backup.ts` + `routes/backup.ts`）：`GET /api/backup/export` 全量导出为单个 JSON（默认脱敏，抹除账号密码 / `passToken` / `apiKey` / `ttsSecret` / TTS 令牌，保留 `hasXxx` 标记）；`POST /api/backup/import` 按 id 覆盖、补齐缺失（不删除本机多余项），脱敏包按 id 保留本机既有凭据，包非法回 400；`GET /api/backup/list` 列出备份、`POST /api/backup/run` 立即生成完整（未脱敏）备份；启动时按 `BACKUP_INTERVAL_MS` / `BACKUP_KEEP` 启用定时备份并滚动保留（默认关闭）

### Security

- 恢复 HTTPS 请求的 TLS 证书校验，移除全局 `rejectUnauthorized: false`，消除中间人风险
- 读接口对凭据脱敏：`passToken` / `miPassword` / `apiKey` / `ttsSecret` 不再回传明文，仅返回 `hasXxx` 标记
- 登录校验改用恒定时间比较（`timingSafeEqual`），并对连续失败做限流（20 次 / 10 分钟）
- TTS 试听接口由 URL query 改为 POST 请求体，避免密钥进入访问日志与浏览器历史
- 请求体大小限制为 1 MB，并补齐 `nosniff` / `X-Frame-Options` / `Referrer-Policy` 响应头
- 接入 `helmet` 统一安全响应头，并启用兼容型 CSP（`script-src 'self'`、`style-src 'self' 'unsafe-inline'` 等）；关闭 HSTS / COEP 以兼容本地 HTTP 访问
- 登录凭据改为 `httpOnly` + `SameSite=Strict` 会话 Cookie，前端不再把明文凭据写入 `localStorage`；新增 `/api/login`、`/api/logout`、`/api/session`，保留 Basic Auth 兼容
- 仍在使用默认口令 `admin/123456` 时，启动阶段打印醒目安全告警

### Performance

- 设备元数据改为并行读取（`Promise.all`），缩短启动与列表加载耗时
- 实体数据读取（账号 / 角色 / 思考服务 / 语音服务 / 型号 / 会话群 / 设备元数据）接入按 `mtime`+`size` 校验的读缓存，命中即免去重复读盘与 `JSON.parse`；写入仍走原子替换，缓存自动失效
- JSON 落盘改为原子写（随机临时文件名 + rename）并按文件串行化写队列，避免并发丢更新
- 系统日志改为合并缓冲 + 阈值/定时 flush + 按大小轮转，避免每行一次 `appendFile` 与无限增长
- 对话日志改为写入期结构化（`appendLog` 内解析时间/类型/正文），`/api/logs` 聚合不再逐行正则解析，降低请求期开销

### Fixed

- 默认端口由 `36592` 修正为 `36597`，与 README / Docker / 启动脚本一致
- `/api/test/audio` 对非法 `ttsConfig` 入参返回 400，不再抛出 500
- 修正 `@types/express` 与 `express@4` 的版本错配
- 修复 MiGPT 子进程 `destroy` 分支无法停止服务的缺陷（模块级实例从未被赋值）
- 设备配置读取区分「文件不存在」与「读取/解析失败」：前者静默（正常未落盘），后者告警，不再静默吞掉权限 / IO / 脏数据问题
- 前端 API 错误包装时保留原始错误（`cause`），便于定位根因
- 移除认证解析中的无用赋值（`decoded`）

### Changed

- 系统日志由全局劫持 `console.*` 改为结构化 logger（`pino`）：结构化记录经自定义 destination 转为人可读行写入 `system.log`（GUI「系统日志」页兼容），并镜像到 stdout；凭据字段（`apiKey` / `passToken` / `miPassword` / `ttsSecret` / `password` / `token`）自动脱敏；级别由 `LOG_LEVEL` 控制（debug 级请求日志默认不落盘）
- 新增请求 ID 贯穿：`requestId` 中间件为每个请求分配 `reqId` 并回写 `X-Request-Id` 响应头，响应结束按 debug 级记录耗时；新增统一错误处理中间件，未捕获异常记录带 `reqId` 的错误日志并返回含 `reqId` 的最小错误体
- 写接口改为白名单字段（`pick()` + `*_FIELDS`），不再直接展开 `req.body` 落盘
- 供应商 baseUrl 映射下沉到 `@migptgui/contracts` 单一事实源，前后端共用
- 缓存、覆盖率、日志、临时产物统一收纳到根 `.cache/`，新增 `npm run clean:cache`
- nx 调用统一经 `scripts/nx.mjs` 包装，避免根目录生成 `.nx/`
- 前端登录由 Basic Auth（凭据存 `localStorage`）改为服务端 Cookie 会话，刷新页面保持登录态
- 内置型号 / 语音服务的入口按钮「重置默认」更名为「重置」，与实际行为对齐
- 二次确认弹窗统一按钮语义：非危险操作使用标准「确认」按钮（`check` 图标），删除类操作沿用「删除」；不再为单个弹窗自定义按钮文案与图标
- 新增优雅退出：进程收到 `SIGTERM` / `SIGINT` 时先停止全部设备子进程，再关闭 HTTP 服务，避免 MiGPT 子进程成为孤儿进程继续占用账号与资源

### Refactor

- 后端 `server/src/index.ts` 由约 1360 行拆分为 `routes/*` 路由模块与 `tts` 助手
- 前端 `App.tsx` 由约 4650 行拆分为组件与视图模块
- TTS 流式转发逻辑抽取为共用函数，消除两处约 60 行重复
- 后端 6 个实体路由（账号 / 角色 / 会话群 / 思考服务 / 语音服务 / 型号）抽为 `createCrudRouter` 工厂：列表 / 创建 / 更新 / 删除四段式与参数校验、唯一名、404、内置保护集中实现，各实体只留构造 / 更新 / 脱敏钩子；删除引用校验改为注册表式（`deviceRefs` / `roleRefs` / `collectRefs`），新增引用关系只需登记规则
- 前端 `ModalShell.tsx` 由约 679 行拆分为 `components/modals/*`：账号 / 思考服务 / 语音服务 / 角色 / 密码 / 设备绑定 6 个表单子组件，字段初始化与提交构造 / 校验抽到 `types.ts` / `values.ts`，外壳只保留标题、图标与动作按钮
- 前端 `RolesView.tsx` 由约 635 行拆分为 `views/roles/*`：列表 `RoleList`、只读详情 `RoleDetail`、编辑表单 `RoleEditForm`；编辑表单中 10 处「关键词数组 ↔ 输入框」重复块收敛为 `KeywordField`
- 前端 `DevicesView.tsx` 由约 811 行拆分为 `views/devices/*`：列表 `DeviceList`、只读详情 `DeviceDetail`、编辑表单 `DeviceForm`、型号搜索选择 `ModelPicker`、账号拉取列表 `PullDeviceList`；详情与表单内重复的设备 / 型号查找收敛为单次求值，并清理文件尾遗留的重复注释
- 前端 `ServicesView.tsx` 由约 799 行拆分为 `views/services/*`：思考服务列表 / 详情 / 表单（`ThinkServiceList` / `ThinkServiceDetail` / `ThinkServiceForm`）与语音服务列表 / 详情 / 表单（`VoiceServiceList` / `VoiceServiceDetail` / `VoiceServiceForm`）；详情与表单内重复的服务查找收敛为单次求值，并清理文件尾遗留的注释
- 前端 `Wizard.tsx` 由约 818 行拆分为 `components/wizard/*`：三步各自成组件（`WizardAccountStep` / `WizardDeviceStep` / `WizardRoleStep`）并自带本步表单与拉取状态，草稿类型抽到 `types.ts`；外壳只保留步骤指示、底部导航与推进判定
- 后端 `server/src/store.ts` 由约 620 行拆分为 `store/*` 子模块：`json.ts`（读缓存 / 原子写 / 同步读原语）、`auth.ts`（凭据解析与恒定时间比较）、`builtins.ts`（内置型号 / 语音的代码定义）、`overrides.ts`（内置实体的用户覆盖：合并 / 落盘 / 重置 / 迁移分离）、`entities.ts`（settings / accounts / roles / services / models / rooms / devices 读取）、`demo.ts`（演示日志种子）、`migrations.ts`（数据版本与迁移框架）；`store.ts` 收敛为门面统一再导出，既有 `./store.js` 导入面不变
- 前端 `App.tsx` 由约 1626 行收敛为约 430 行：状态与业务逻辑抽到 `hooks/*`（`useAppData` / `useAccountsCrud` / `useServicesCrud` / `useModelsCrud` / `useDevicesCrud` / `useRolesRoomsCrud` / `useWizard` / `useToast` / `useConfirm`），UI 外壳抽到 `components/app/*`（`Sidebar` / `TopBar` / `ConfirmDialog` / `Toast` / `LoadingPanel`）与 `modal-submit.ts` / `errText.ts`；表单草稿类型统一复用 `views/drafts.ts` 单一事实源，`App` 只保留视图编排与顶栏/侧栏状态
- 前端设计令牌体系（U1）：`styles/theme.css` 补全间距（`--sp-*`）、字号（`--fs-*`）、字重（`--fw-*`）、行高（`--lh-*`）、动效时长与缓动（`--dur-*` / `--ease-standard`）、层级（`--z-*`）与阴影梯度（`--shadow-*`）令牌；24 个样式文件共 611 处硬编码值收敛到令牌 —— 字号 / 字重 / `z-index` / 过渡时长全量覆盖，间距与圆角按 ≤1px 偏差就近归一（半像素字号就近归一，偏差 ≤0.5px），超差值与尺寸类（`width` / `height`）保持原样；顺带修复 4 个未定义变量（`--amber` / `--amber-soft` / `--teal` 归入调色板别名，`--danger` 按 warn / err 语义归一为 `--warn-ink` / `--bad-ink`）
- 前端动效系统统一（U2）：新增 `styles/keyframes.css`，将原先散在 7 个文件的 10 处 `@keyframes`（`scrimIn` / `modalIn` / `fadeUp` / `liIn` / `cardIn` / `stepIn` / `pickIn` / `wzin` / `sk` / `devspin`）集中定义，`app.css` 统一引入；各视图仅保留 `animation` 引用，行为不变。残留硬编码时长收敛到令牌（`roles.css` `0.26s` → `--dur-250`、`shell.css` `transition-delay: 0.2s` → `--dur-200`），`theme.css` 补齐 `--dur-800` / `--dur-1200`；`motion.css` 新增 `prefers-reduced-motion: reduce` 降级，系统开启「减少动态效果」时关闭动画与过渡、`scroll-behavior` 回退为 `auto`
- 前端样式去重与分层（U3）：新增 `styles/base.css` 基础组件层，把跨视图重复的表单字段（`.form-card` / `.rform` / `.modal` 的 `.fld` 结构、label、控件外观、textarea、hint、必填 `.req` 星号）、徽标 `.tag`（含 `warn` / `bad` / `accent` / `neu` / `builtin` 变体）、筛选芯片 `.chip`（含 `on` 态）与开关 `.switch` 收敛为单一来源；`forms.css` / `lists.css` / `panels.css` / `roles.css` / `split.css` / `modal.css` 移除对应重复定义（纯搬运，声明与选择器优先级完全一致）。`app.css` 按 tokens → base → 组件/视图 分层并加注释，`base.css` 紧随 `theme.css` / `keyframes.css` 引入；组件与视图层沿用原始级联顺序，保证样式行为零变更。另将遗留的 `login-v5.css` 合并进 `login.css` 并删除（消除覆盖层），U3 收口

### Engineering

- `clean` / `typecheck` 脚本跨平台化，去除 POSIX 专有语法
- 清理未使用依赖；Jest 支持 ESM 风格 `.js` 相对导入；CI 接入 `npm test`
- 新增 `.gitattributes` 统一换行（`text=auto eol=lf`），修复跨平台协作与 lint-staged 部分暂存冲突
- 两个 Dockerfile 补充用途说明，Node 版本对齐 `.nvmrc`，构建期 `.cache` 不再进入运行镜像
- 移除仅服务 jest 的根 `babel.config.js`，配置内联进 `jest.config.js`
- ESLint 升级至 v10 并迁移到扁平配置（`eslint.config.js`），移除 `.eslintrc.json`
- 补充 `CONTRIBUTING.md`、`CHANGELOG.md`、`CODE_OF_CONDUCT.md`、`CODEOWNERS`、Dependabot 配置与 `package.json` 仓库元数据
- 全仓 Prettier 基线格式化，修复 29 个历史未格式化文件，恢复 CI `format:check` 绿色门禁
- `@migptgui/*` 产品线与 `migpt-server` 版本统一为 `2.0.0`，内部依赖范围同步为 `^2.0.0`；`migpt-cli` 保持 `5.0.0`
- 前端版本号改为构建期注入（webpack `DefinePlugin` 读取 `packages/gui/package.json`），消除 `App` / `LoginPage` / `ProfileView` 三处硬编码 `v1.12.0`
- Docker 镜像标签与 `migpt-server` 安装版本同步至 `2.0.0`
- 精简 tsconfig：移除未使用的 `experimentalDecorators` / `emitDecoratorMetadata`，`jsx` 由 `react-jsxdev` 改为 `react-jsx`，并删除 `gui` / `options` / `options-with-preview` 三处 `tsconfig.build.json` 中重复的 `jsx` 覆盖
- 修复 `typecheck` 脚本空转：此前无任何包定义 `typecheck` 目标，nx 以「0 项目」退出码 0 使 `||` 兜底永不触发，CI 类型检查实际从未运行；现为各包补 `typecheck: tsc --noEmit`，`nx.json` 声明 `typecheck.dependsOn: ["^build"]`，根脚本收敛为单一 nx 调用
- 生产构建的体积分析（`BundleAnalyzerPlugin`）改为按需开启：默认关闭不再拖慢构建，需要时设 `ANALYZE=1` 再构建，报告仍输出到根 `.cache/`
- `scripts/dev.ps1` 的仓库根路径改为由 `$PSScriptRoot` 推导，去除硬编码的绝对路径
- 补充核心模块单元测试（共 7 个测试文件 / 87 条用例）：`redact`（凭据脱敏）、`store/json`（原子写 / 读缓存 / 并发串行化）、`store/auth`（凭据解析优先级与恒定时间比较）、`store/entities`（唯一名校验 / 账号迁移 / 设备元数据 / 引用解析）、`routes/crud`（CRUD 工厂四段式与删除引用保护）、`routes/shared`（字段白名单 / 404 / 引用冲突 / 设备配置读取）
- 为数据与可观测层补充单元测试：迁移框架（`store/migrations`）、覆盖分离（`store/overrides`）、schema 校验（`store/schemas`）、契约一致性（`store/contracts`）、导出 / 导入 / 备份（`store/backup` + `routes/backup`）、结构化日志（`logger`）、请求 ID 与错误中间件（`middleware`）；测试总数由 87 增至 152
- Jest 增加 `packages/server` 测试项目并放行 `nanoid` 等 ESM 依赖转换；配置覆盖率阈值（statements 90 / branches 78 / functions 90 / lines 90）并忽略 `dist` 构建产物，防止覆盖率无声下滑
- Node 版本由已 EOL 的 `20.17.0` 升级到 `24.21.0`（Node 24 LTS）：`.nvmrc`、根 `engines`、两个 `Dockerfile` 基镜像与 `CONTRIBUTING.md` 同步更新；同时解决 `.nvmrc` 与 `lint-staged@17.6.0`（要求 Node ≥22.22.1）的引擎约束冲突
- `nx.json` 迁移到 nx 20+ 新格式：移除已废弃的 `tasksRunnerOptions`（`cacheableOperations`），改为在 `targetDefaults` 中按目标声明 `cache: true`（`build` / `typecheck` / `test` / `test:ci` / `lint`）；`affected.defaultBase` 上移为顶层 `defaultBase`（该旧写法将于 Nx 20 移除）
- 接入 `nx release` 版本自动化：`nx.json` 新增 `release.groups` —— `@migptgui/*` 与 `migpt-server` 归入 `fixed` 组（共用同一版本，tag 形如 `migptgui@2.1.0`），`migpt-cli` 归入 `independent` 组（tag 形如 `migpt-cli@5.1.0`）；版本号按 Conventional Commits 推导，且在尚无匹配 tag 时回退磁盘版本（`fallbackCurrentVersionResolver: disk`）；关闭自动 changelog 生成以保留人工维护的本文件。新增 `@nx/js`（`nx release` 版本化所需插件）与 `npm run release` / `npm run release:dry` 脚本；`--dry-run` 验证通过：`migptgui` 组 2.0.0 → 2.1.0、`migpt-cli` 5.0.0 → 5.1.0
- 契约包零手动构建（A9）：`tsconfig.base.json` 将 `@migptgui/contracts` 映射到源码，typecheck / dev / 测试无需先 build 出 `dist`；emit 构建（各 `tsconfig.build.json`）清空 `paths` 回落 `node_modules → dist`，避免契约源码并入本包 program 导致 `rootDir` 上移、产物目录嵌套（`dist/server/…`）；`server` / `gui` 声明契约依赖以纳入 nx 构建排序；Jest `moduleNameMapper` 同步映射契约到源码
- 契约一致性校验（A9）：`@migptgui/contracts` 新增运行期字段清单 `ENTITY_FIELDS` 与编译期严格一致性守卫（`ExactKeys`，清单漏键 / 多键即编译报错）；新增 `store/contracts.test.ts`，校验各实体 zod schema 字段、路由写字段白名单均与契约清单严格一致，防止接口与实现无声漂移
- 修复 `.husky/pre-commit` 在 husky v10 失效：移除 `#!/usr/bin/env sh` 与 `. "$(dirname -- "$0")/_/husky.sh"` 两行旧写法（v10 已废弃 `_/husky.sh`），改为直接调用 `node_modules/.bin/lint-staged`
- 发布镜像工作流（G8–G13）：新增 `.github/workflows/release.yml`，`migptgui@X.Y.Z` tag 触发 —— 多架构（`linux/amd64,linux/arm64`）构建并推送 Docker Hub 与 GHCR，镜像 tag 含 `X.Y.Z` / `vX.Y.Z`（语义化）/ `latest` / `sha-<commit>`；构建期生成 SBOM 与 provenance，推送后 cosign 无密钥（OIDC）签名；runner 不预装 Node，构建全部在容器内完成（`.dockerignore` 已排除 `node_modules`/`dist`）
- 镜像漏洞门禁（G12）：`ci.yml` docker job 与 `release.yml` 均接入 Trivy 扫描，命中可修复的 HIGH/CRITICAL 即阻断；`ci.yml` 先构建单架构镜像并载入本地再扫描，仅 `main` 推送多架构。鉴于 Trivy 供应链事件，固定安全版本 `trivy-action@0.35.0`
- 镜像元数据补全（G11）：两个 Dockerfile 补齐 OCI 标签 `version` / `revision` / `created` / `vendor` / `documentation`（`version` / `revision` / `created` 由 CI 经 `--build-arg` 注入，本地回落占位值）；`docker/Dockerfile` 的 npm 包版本改由 `VERSION` 构建参数驱动，与镜像 `version` 一致
- 镜像使用与升级文档（G13）：README「发布镜像」重写为拉取 / 运行参数（端口、数据卷、认证、备份、健康检查）/ 发布流程 / 升级回滚 / cosign 校验 / 镜像元数据；同步修正「契约需先 build」等过时说明
- README 徽章与上游归属（G7）：README 顶部补 License / CI / Release / Node / Docker / Fork 徽章；新增 `NOTICE` 记录上游来源（`lmk123/migpt-cli`）、本仓库许可说明、第三方依赖与商标声明；README Fork 声明链接至 NOTICE
- 文档入库策略（A8）：`docs/` 继续整体 `.gitignore`（含内部清单 `todo.md`、本地设计 `lerio-local-design.md`、产品信息架构 `migpt-product-design.md`、设计原型 `assets/`）；公开文档（`README` / `CHANGELOG` / `CONTRIBUTING` / `CODE_OF_CONDUCT` / `SECURITY` / `NOTICE` / `LICENSE`）随仓库入库，策略与目录职责在 README「文档策略」与 `docs/README.md` 说明；已完成任务项从 `todo.md` 移除、记录沉淀到本文件
