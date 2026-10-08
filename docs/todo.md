# 待办任务清单

> 已完成变更记录见 [CHANGELOG.md](../CHANGELOG.md)（`docs/` 为本地开发资料，不入库）｜ 待办 **11** 条（⬜ 11）｜ 复核 2026-10-08 ｜ 优先级 `P0` > `P1` > `P2`
> 落地顺序：~~9 协作规范 `G7,A8`（✅ 见 CHANGELOG）~~ → `G1`（待远程凭据）/ `G2`（手动设置）→ ~~10 前端设计系统 `U4`（`U1`–`U4` ✅ 见 CHANGELOG）~~ → ~~11 后端风格与复用 `B1`–`B4` ✅ 见 CHANGELOG~~（`A20` 为存储评估结论，无独立落地项）；已完成批次（1 安全收尾、2 一致性、3 性能、4 可维护性、5–6 工程化/仓库规范、7 数据架构 `A9–A14`、8 发布镜像 `G8–G13`、9 协作规范 `G7/A8`、10 前端设计系统 `U1–U4`、11 后端风格与复用 `B1`–`B4`、12 HTTP 压缩与缓存 `A18`、13 环境变量校验 `A16`、14 架构决策记录 `A1`）见 CHANGELOG

| 编号 | 类别 | P | 待办 · 位置 | 状态 | 说明 |
|---|---|---|---|---|---|
| M5 | 可维护性 | P2 | 前端无路由/无深链 · `gui/src/constants.ts` | ⬜ | 手写 `view` 状态刷新即丢；建议 hash 路由 |
| M6 | 可维护性 | P2 | 遗留/未使用物 · 多处 | 🟡 | `controller.getStatus` 单例、`options-with-preview` 待清；`lodash` 非仅 `trimEnd` |
| A2 | 架构 | P2 | 目录/包名语义化 · `apps/`、`packages/` | ⬜ | 建议 `apps/web` + `apps/api`；先评估改名影响面 |
| A4 | 架构 | P2 | 消除 `packages/server/node_modules` · 依赖版本 | ⬜ | `nanoid` 版本冲突；对齐后提升到根 |
| A15 | 架构 | P2 | API 版本化 + OpenAPI · `server/src/routes` | ⬜ | `/api/v1` + OpenAPI + RFC7807 错误格式 |
| A17 | 架构 | P2 | 前端状态管理规范化 · `gui/src` | ⬜ | React Query + Zustand + ErrorBoundary |
| A19 | 架构 | P2 | 供应链安全 · `.github` | ⬜ | Dependabot/Renovate + `npm audit` + SBOM |
| G1 | 治理 | P1 | develop 设置上游跟踪 · git | ⬜ | `git push -u origin develop`；**受阻**：远程（ghproxy 镜像）无有效凭据 + 沙箱禁写 `~/.gitconfig`，需先配置凭据 |
| G2 | 治理 | P1 | 分支保护与流程固化 · GitHub 设置 | ⬜ | `main` 禁直推、要求 PR + CI 通过；本机无 `gh`，需在 GitHub 网页 Settings → Branches 手动配置 |
| G3 | 治理 | P2 | main 与 upstream 同步策略 · git | ⬜ | 定期 `git fetch upstream && rebase` |
| A20 | 架构 | P2 | 存储引擎评估：暂不引入 SQLite · `server/src/store/*` | ⬜ | 结论：维持 JSON。运行时数据合计约 21 KB（含 7.4 KB 内置型号种子），真实用户数据 < 2 KB；单用户本地面板、低频写、全量读，现有 `readJson` 缓存 + 原子写 + 写队列已够用。换 SQLite 需引原生依赖（跨平台/多架构镜像复杂化）、schema/迁移/备份，且数据目录由可读 JSON 变二进制，损害自助排查与备份。真实痛点在 schema 校验（A13）与迁移（A10），zod + JSON 即可覆盖。**复评触发**：记录量级上万、需跨实体事务/复杂查询/全文检索、或多用户并发写 |