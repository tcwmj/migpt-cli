# 待办任务清单

> 已完成变更记录见 [CHANGELOG.md](../CHANGELOG.md)（`docs/` 为本地开发资料，不入库）｜ 待办 **7** 条（🟡 2 + ⬜ 5）｜ 复核 2026-10-08 ｜ 优先级 `P0` > `P1` > `P2`
> 落地顺序：`G1`（待远程凭据）/ `G2`（手动设置）→ 剩余 P2 项按需推进；已完成批次（1 安全收尾、2 一致性、3 性能、4 可维护性、5–6 工程化/仓库规范、7 数据架构 `A9–A14`、8 发布镜像 `G8–G13`、9 协作规范 `G7/A8`、10 前端设计系统 `U1–U4`、11 后端风格与复用 `B1`–`B4`、12 HTTP 压缩与缓存 `A18`、13 环境变量校验 `A16`、14 架构决策记录 `A1`、15 遗留清理 `M6`、16 存储评估 `A20`、17 依赖对齐 `A4`、18 供应链安全 `A19`）见 CHANGELOG

| 编号 | 类别 | P | 待办 · 位置 | 状态 | 说明 |
|---|---|---|---|---|---|
| M5 | 可维护性 | P2 | 前端无路由/无深链 · `gui/src/constants.ts` | ⬜ | 手写 `view` 状态刷新即丢；建议 hash 路由 |
| A2 | 架构 | P2 | 目录/包名语义化 · `apps/`、`packages/` | ⬜ | 建议 `apps/web` + `apps/api`；先评估改名影响面 |
| A15 | 架构 | P2 | API 版本化 + OpenAPI · `server/src/routes` | ⬜ | `/api/v1` + OpenAPI + RFC7807 错误格式 |
| A17 | 架构 | P2 | 前端状态管理规范化 · `gui/src` | ⬜ | React Query + Zustand + ErrorBoundary |
| G1 | 治理 | P1 | develop 设置上游跟踪 · git | 🟡 | `git push -u origin develop`；**受阻**：远程（ghproxy 镜像）无有效凭据 + 沙箱禁写 `~/.gitconfig`，需先配置凭据 |
| G2 | 治理 | P1 | 分支保护与流程固化 · GitHub 设置 | 🟡 | `main` 禁直推、要求 PR + CI 通过；本机无 `gh`，需在 GitHub 网页 Settings → Branches 手动配置 |
| G3 | 治理 | P2 | main 与 upstream 同步策略 · git | ⬜ | 定期 `git fetch upstream && rebase` |

## 已归档（结论性条目，无独立落地项）

- **A20 存储引擎评估**：维持 JSON 文件存储。运行时数据 < 2 KB，单用户低频写，JSON + zod 已覆盖全部痛点。**复评触发**：记录量级上万、需跨实体事务/复杂查询/全文检索、或多用户并发写。详见 `docs/adr/002-json-file-storage.md`
- **A4 消除 `packages/server/node_modules`**：`nanoid` 版本冲突已通过 npm 嵌套 `node_modules` 自动隔离（server 用 v5 ESM，postcss 用 v3 CJS），无实际冲突。`packages/server/node_modules` 仅含 `typescript` 局部覆盖（devDependency 版本对齐），不影响运行时