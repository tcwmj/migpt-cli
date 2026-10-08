# 更新日志

本文件记录本项目的显著变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 版本说明：`@migptgui/*` 产品线（`contracts` / `controller` / `gui` / `options` / `options-with-preview` / `server`）
> 与发布包 `migpt-server` 已统一为 `2.0.0`；`migpt-cli` 独立按 `5.x` 演进；根包 `@mgc/root` 为私有占位（`0.0.0`）不参与发布。

## [2.0.0] - 2026-10-08

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

- 写接口改为白名单字段（`pick()` + `*_FIELDS`），不再直接展开 `req.body` 落盘
- 供应商 baseUrl 映射下沉到 `@migptgui/contracts` 单一事实源，前后端共用
- 缓存、覆盖率、日志、临时产物统一收纳到根 `.cache/`，新增 `npm run clean:cache`
- nx 调用统一经 `scripts/nx.mjs` 包装，避免根目录生成 `.nx/`
- 前端登录由 Basic Auth（凭据存 `localStorage`）改为服务端 Cookie 会话，刷新页面保持登录态
- 内置型号 / 语音服务的入口按钮「重置默认」更名为「重置」，与实际行为对齐
- 二次确认弹窗统一按钮语义：非危险操作使用标准「确认」按钮（`check` 图标），删除类操作沿用「删除」；不再为单个弹窗自定义按钮文案与图标

### Refactor

- 后端 `server/src/index.ts` 由约 1360 行拆分为 `routes/*` 路由模块与 `tts` 助手
- 前端 `App.tsx` 由约 4650 行拆分为组件与视图模块
- TTS 流式转发逻辑抽取为共用函数，消除两处约 60 行重复
- 后端 6 个实体路由（账号 / 角色 / 会话群 / 思考服务 / 语音服务 / 型号）抽为 `createCrudRouter` 工厂：列表 / 创建 / 更新 / 删除四段式与参数校验、唯一名、404、内置保护集中实现，各实体只留构造 / 更新 / 脱敏钩子；删除引用校验改为注册表式（`deviceRefs` / `roleRefs` / `collectRefs`），新增引用关系只需登记规则
- 前端 `ModalShell.tsx` 由约 679 行拆分为 `components/modals/*`：账号 / 思考服务 / 语音服务 / 角色 / 密码 / 设备绑定 6 个表单子组件，字段初始化与提交构造 / 校验抽到 `types.ts` / `values.ts`，外壳只保留标题、图标与动作按钮
- 前端 `RolesView.tsx` 由约 635 行拆分为 `views/roles/*`：列表 `RoleList`、只读详情 `RoleDetail`、编辑表单 `RoleEditForm`；编辑表单中 10 处「关键词数组 ↔ 输入框」重复块收敛为 `KeywordField`

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
