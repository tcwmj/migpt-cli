给自己的另一个项目打个广告：划词翻译，一站式划词 / 截图 / 网页全文 / 音视频 AI 翻译扩展，[点击查看简介](https://hcfy.ai/docs/guides/summary)

---

# MiGPT 控制面板（多设备版）

> **Fork 声明**：本仓库 fork 自 [lmk123/migpt-cli](https://github.com/lmk123/migpt-cli)（上游未声明许可证），在保留上游「MiGPT GUI」全部能力的基础上，重构为**多设备、多账号**的公共服务形态，并采用 **MIT 许可证**（见 [LICENSE](./LICENSE)）对外发布。

「多个音箱，一个大脑」：用一个控制面板统一管理你的全部小爱音箱与 MiGPT 服务。

## 核心能力

- **多云端账号**：录入小米 ID 与 passToken，按账号拉取/管理其下的全部音箱设备
- **多设备服务**：每台音箱独立配置（账号、角色、会话群、型号），可查看服务运行状态并启停
- **对话角色**：人设（机器人 / 主人 / 会话群）、单次对话关键词、连续对话（唤醒 / 退出 / 自动退出 / 继续与停止检测）、提示语（进入 AI / 退出 AI / AI 思考中 / AI 回答完毕 / AI 出错），分组管理
- **思考服务 / 语音服务**：多供应商（豆包 / OpenAI / DeepSeek / 通义 / 月之暗面 / 智谱 / 零一 / 百川 等）与多 TTS 引擎（内置 / Edge / 火山 / OpenAI / 自定义），角色可引用
- **设备型号**：内置官方全量 19 款音箱型号（含真实设备图、指令参数、连续对话能力），支持自定义型号；内置项可改、禁删、可一键重置默认
- **会话群**：对话记忆上下文归属实体，多设备共用
- **对话记录 / 系统日志**：设备级对话日志聚合；系统实时日志查看、下载、清理
- **三步连接向导**：连接账号 → 选择设备 → 配置对话角色，快速完成接入
- **登录认证**：默认启用，支持面板修改密码、`AUTH_USER` / `AUTH_PASSWORD` 环境变量或 `--user/--pwd` 参数覆盖
- **安全**：内置 TTS 始终启用秘密路径；凭据（passToken 等）仅保存在本机用户数据目录，不入库、不入日志

## 快速开始

### 源码运行（开发）

```bash
npm install
npm run build-all        # 构建全部 workspace（契约 → server → gui）
npm run dev              # 见 scripts/dev.ps1：后端 + 前端 watch 热更新
```

面板默认地址：`http://127.0.0.1:36597`（默认账号 `admin` / 密码 `123456`，登录后请在「个人中心」修改）。

### Docker 运行

```bash
docker build -t migpt-cli:latest .
docker run -d --name migpt-cli --restart unless-stopped \
  -p 36597:36597 \
  -v /volume1/docker/migpt-data:/home/node/.migptgui \
  -e AUTH_PASSWORD=你的自定义密码 \
  -e PORT=36597 \
  migpt-cli:latest
```

- 容器以非 root 用户（`node`）运行，数据目录挂载至 `/home/node/.migptgui`
- 端口可通过 `PORT` 环境变量调整（默认 36597）
- 已内置健康检查（`/ping`）

## 目录结构

```
├── apps/          # 可执行入口（薄壳，依赖 packages 实现）
│   ├── cli/       # migpt-cli 命令行入口
│   └── server/    # migpt-server 服务入口（Docker ENTRYPOINT）
├── packages/      # 库与实现
│   ├── contracts/ # ★ 前后端共享契约（类型单一事实源）
│   ├── server/    # 后端 API 实现（@migptgui/server）
│   ├── gui/       # 前端控制面板（@migptgui/gui）
│   └── options/   # CLI 配置选项（上游遗留）
├── docs/          # 产品设计文档（本地开发资料，不入库）
├── scripts/       # 开发脚本（dev.ps1 三 watch 热启动等）
├── docker/        # Docker 打包相关
└── .github/       # Issue/PR 模板、SECURITY.md、CI workflow
```

> 约定：`apps/*` 为可部署入口，`packages/*` 为可复用实现；node_modules 统一 hoist 到根目录。

## 前后端共享契约（#5）

`packages/contracts`（`@migptgui/contracts`）是前后端**类型单一事实源**：

- 后端 `packages/server/src/types.ts` 与前端 `packages/gui/src/apis.ts` 均从 `@migptgui/contracts` 导入并 re-export
- 修改契约文件后，先重建 `packages/contracts`（产出 dist），两端类型检查与构建会同时感知变更
- 前端 webpack 构建走 babel，不检查类型；提交前请运行 `npm run typecheck` 覆盖两端

## 数据管理模型（#6）

- **内置数据**（内置型号 19 款、默认语音）与用户数据统一存储在用户数据目录（`~/.migptgui`）
- 内置数据**可修改、禁止删除**，支持在详情页点击「重置默认」恢复为系统内置默认值
- 启动时仅**补充缺失**的内置项，绝不覆盖用户已修改的数据
- 所有 JSON 持久化采用**原子写**（临时文件 + rename），避免异常断电损坏

## 工程规范

| 设施                        | 说明                                                           |
| --------------------------- | -------------------------------------------------------------- |
| `npm run lint` / `lint:fix` | ESLint（packages + apps）                                      |
| `npm run typecheck`         | 两端 + 契约类型检查                                            |
| `npm run build-all`         | nx 增量构建全部 workspace                                      |
| husky + lint-staged         | 提交前自动 lint / prettier 修复暂存文件                        |
| GitHub Actions CI           | lint + format + build + Docker 多架构（amd64/arm64）构建与推送 |

## 发布镜像（#10）

准备事项：

1. 在 GitHub 仓库配置 Secrets：`DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN`
2. 推送 `main` 分支即触发 CI 构建 `linux/amd64,linux/arm64` 多架构镜像并推送 Docker Hub
3. 镜像 Tag 规划：
   - `latest`：跟随 `main` 每次发布
   - `git-sha`：精确版本（可追溯）
   - 建议在 CI 中补充语义化版本 Tag（`v2.0.0` 等）以对接镜像市场版本管理
4. 面向镜像市场（如 NAS 应用中心 / 第三方镜像市场）发布时，需额外准备：
   - 应用描述、图标、截图、支持平台清单（x86_64 / arm64）
   - `docker-compose.yml` 模板（端口、数据卷、环境变量说明）
   - 升级策略说明（数据卷兼容、内置数据迁移）

## 许可证

[MIT](./LICENSE) © 2026 tcwmj。上游 [lmk123/migpt-cli](https://github.com/lmk123/migpt-cli) 未声明许可证，fork 已注明来源；本项目新增代码以 MIT 发布，使用请遵循各自条款。
