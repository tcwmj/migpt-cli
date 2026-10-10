给自己的另一个项目打个广告：划词翻译，一站式划词 / 截图 / 网页全文 / 音视频 AI 翻译扩展，[点击查看简介](https://hcfy.ai/docs/guides/summary)

---

# MiGPT 控制面板（多设备版）

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/tcwmj/migpt-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/tcwmj/migpt-cli/actions/workflows/ci.yml)
[![Release image](https://github.com/tcwmj/migpt-cli/actions/workflows/release.yml/badge.svg)](https://github.com/tcwmj/migpt-cli/actions/workflows/release.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-2496ED?logo=docker&logoColor=white)](https://github.com/tcwmj/migpt-cli/pkgs/container/migpt-cli)
[![Fork of lmk123/migpt-cli](https://img.shields.io/badge/fork-lmk123%2Fmigpt--cli-informational.svg)](https://github.com/lmk123/migpt-cli)

> **Fork 声明**：本仓库 fork 自 [lmk123/migpt-cli](https://github.com/lmk123/migpt-cli)（上游未声明许可证），在保留上游「MiGPT GUI」全部能力的基础上，重构为**多设备、多账号**的公共服务形态，并采用 **MIT 许可证**（见 [LICENSE](./LICENSE)）对外发布。来源与致谢详见 [NOTICE](./NOTICE)。

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
npm run build        # 构建全部 workspace（契约 → server → gui）
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
├── docs/          # 本地开发资料（不入库，见下方「文档策略」）
├── scripts/       # 开发脚本（dev.ps1 三 watch 热启动等）
├── docker/        # Docker 打包相关
└── .github/       # Issue/PR 模板、SECURITY.md、CI workflow
```

> 约定：`apps/*` 为可部署入口，`packages/*` 为可复用实现；node_modules 统一 hoist 到根目录。

### 文档策略

- **随仓库入库（公开）**：`README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`NOTICE`、`LICENSE` 及 `.github/` 模板。
- **本地资料（不入库）**：`docs/` 整体由 `.gitignore` 排除，含内部待办清单、产品信息架构与本地设计文档、设计原型等，仅在本机留存。新增需要对外公开的文档请放仓库根目录或 `.github/`；确需公开 `docs/` 内某文档时，先移出 `docs/` 再入库。

## 前后端共享契约（#5）

`packages/contracts`（`@migptgui/contracts`）是前后端**类型单一事实源**：

- 后端 `packages/server/src/types.ts` 与前端 `packages/gui/src/apis.ts` 均从 `@migptgui/contracts` 导入并 re-export
- 契约包「零手动构建」：typecheck / dev / 测试直接解析到 `packages/contracts/src`（tsconfig `paths` + Jest `moduleNameMapper`），改完即生效、无需先 build；仅 emit 构建回落 `dist`（由 nx `^build` 保证构建顺序）
- 前端 webpack 构建走 babel，不检查类型；提交前请运行 `npm run typecheck` 覆盖两端
- 契约字段有运行期清单 `ENTITY_FIELDS` 与编译期守卫，`store/contracts.test.ts` 校验存储 schema / 路由写白名单与契约严格一致，防止接口与实现漂移

## 数据管理模型（#6）

- **内置数据**（内置型号 19 款、默认语音）与用户数据统一存储在用户数据目录（`~/.migptgui`）
- 内置数据**可修改、禁止删除**，支持在详情页点击「重置」恢复为系统内置默认值
- 启动时仅**补充缺失**的内置项，绝不覆盖用户已修改的数据
- 所有 JSON 持久化采用**原子写**（临时文件 + rename），避免异常断电损坏

## 工程规范

| 设施                        | 说明                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run lint` / `lint:fix` | ESLint（packages + apps）                                                                 |
| `npm run typecheck`         | 两端 + 契约类型检查                                                                       |
| `npm run build`             | nx 增量构建全部 workspace                                                                 |
| husky + lint-staged         | 提交前自动 lint / prettier 修复暂存文件                                                   |
| GitHub Actions CI           | lint + format + test + build + Docker 多架构（amd64/arm64）构建与 Trivy 漏洞门禁          |
| GitHub Actions Release      | tag（`migptgui@X.Y.Z`）触发：多架构推送 Docker Hub + GHCR、SBOM + provenance、cosign 签名 |

## 发布镜像（G8–G13）

### 拉取与运行

```bash
# Docker Hub（<user> 为维护者账号）
docker pull <user>/migpt-cli:latest
# GitHub Container Registry
docker pull ghcr.io/<owner>/migpt-cli:latest

docker run -d --name migpt-cli --restart unless-stopped \
  -p 36597:36597 \
  -v /volume1/docker/migpt-data:/home/node/.migptgui \
  -e AUTH_PASSWORD=你的自定义密码 \
  -e PORT=36597 \
  <user>/migpt-cli:latest
```

### 运行参数

| 项       | 说明                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| 端口     | `PORT`（默认 `36597`）；容器内监听该端口，`-p` 映射到宿主                                                                  |
| 数据卷   | `/home/node/.migptgui`：账号 / 角色 / 思考服务 / 语音服务 / 型号 / 会话群 / 设备 / 备份 / 日志；**升级务必复用同一卷**     |
| 认证     | `AUTH_PASSWORD`（缺省 `admin/123456`，启动打印安全告警）；建议公网部署时套 HTTPS 反向代理，会话 Cookie 将自动启用 `secure` |
| 备份     | `BACKUP_INTERVAL_MS` / `BACKUP_KEEP` 启用定时备份与滚动保留（默认关闭）；备份落数据卷 `backups/`                           |
| 健康检查 | 内置 `HEALTHCHECK` 命中 `/ping`（无需认证），容器编排可据此探活                                                            |

### 发布流程（维护者）

1. 在 GitHub 仓库配置 Secrets：`DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN`
2. `npm run release`（nx release）统一 `@migptgui/*` 与 `migpt-server` 版本并打 tag（`migptgui@X.Y.Z`）
3. 推送该 tag 触发 `release.yml`：多架构构建（`linux/amd64,linux/arm64`）→ 推送 Docker Hub + GHCR → 生成 SBOM 与 provenance → cosign 无密钥签名 → Trivy 扫描（可修复的 HIGH/CRITICAL 阻断）
4. 镜像 Tag 规划：`X.Y.Z`、`vX.Y.Z`（语义化）、`latest`、`sha-<commit>`（精确追溯）
5. 日常分支（`develop` / PR）由 `ci.yml` 构建并执行 Trivy 扫描门禁；仅 `main` 推送

### 升级与回滚

- **升级**：拉取新 tag 镜像并复用原数据卷即可；启动时自动执行数据迁移（`dataVersion` 递增）与内置数据补充，内置定义以代码为准自动修正
- **回滚**：切回上一语义化 tag 镜像；若已发生不可逆迁移，先从数据卷 `backups/`（或 `GET /api/backup/export` 导出）恢复
- **校验来源**：`cosign verify ghcr.io/<owner>/migpt-cli:X.Y.Z --certificate-identity-regexp 'https://github.com/<owner>/migpt-cli/.*' --certificate-oidc-issuer https://token.actions.githubusercontent.com`

### 镜像元数据

两个 Dockerfile 均内置 OCI 标签：`version` / `revision` / `created` / `vendor` / `documentation` / `source` / `licenses`；`version` / `revision` / `created` 由 CI 经 `--build-arg` 注入，可 `docker inspect` 追溯构建来源。

## 许可证

[MIT](./LICENSE) © 2026 tcwmj。上游 [lmk123/migpt-cli](https://github.com/lmk123/migpt-cli) 未声明许可证，fork 已注明来源；本项目新增代码以 MIT 发布，使用请遵循各自条款。
