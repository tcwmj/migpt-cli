# 贡献指南

感谢你有兴趣为「MiGPT 控制面板（多设备版）」做出贡献。

> 本仓库 fork 自 [lmk123/migpt-cli](https://github.com/lmk123/migpt-cli)。若你的改动属于上游通用能力，也欢迎同步给上游。

## 开发环境

- Node.js：见根 `.nvmrc`（当前 `24.21.0`，Node 24 LTS）
- 包管理：npm（workspaces），请使用仓库根目录安装，勿在子包内单独 `npm install`

```bash
npm install          # 安装全部 workspace 依赖
npm run build    # 构建全部 workspace（契约 → server → gui）
npm test             # 运行单元测试
npm run lint         # ESLint 检查
npm run format:check # Prettier 检查
npm run typecheck    # TypeScript 类型检查
```

本地开发调试可用 `npm run dev`（`scripts/dev.js`，后端 + 前端 watch 热更新）。

## 分支与提交

采用精简 GitFlow：

| 分支        | 用途                                                               |
| ----------- | ------------------------------------------------------------------ |
| `main`      | 仅接受发布合并，禁止直接推送；每次发布打 tag                       |
| `develop`   | 日常集成分支，功能合并到此                                         |
| `feature/*` | 功能开发分支，从 `develop` 切出，完成后 PR 回 `develop`            |
| `release/*` | 发布准备分支，验证通过后合并到 `main` 并打 tag                     |
| `hotfix/*`  | 线上紧急修复，从 `main` 切出，修复后同时合并回 `main` 与 `develop` |

提交流程：`feature/* → develop → release/* → main`

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
<type>(<scope>): <subject>

类型：feat | fix | perf | refactor | docs | test | chore | build | ci
范围示例：server | gui | contracts | cli | engineering
```

示例：`fix(server): 恢复 TLS 证书校验`

## 代码约定

- 语言：TypeScript，前后端共用 `@migptgui/contracts` 中的类型与常量，**不要在两处各写一份**
- 相对导入需带 `.js` 后缀（NodeNext 约定）
- 格式化由 Prettier 统一处理，行尾使用 LF（见根 `.gitattributes`），请勿手动改动行尾
- 提交前会由 husky + lint-staged 自动执行 eslint --fix 与 prettier --write
- 缓存与临时产物统一写入根 `.cache/`，不要新增散落在仓库各处的缓存目录

## 提交 PR

1. 确认 `npm test`、`npm run lint`、`npm run typecheck` 全部通过
2. 填写 PR 模板，说明改动动机、方案与验证方式
3. 涉及界面改动的，请附截图
4. 涉及数据文件结构变更的，请说明是否需要迁移

## 安全相关

发现安全漏洞请勿公开提交 Issue，请按 [安全策略](./.github/SECURITY.md) 私下联系维护者。
