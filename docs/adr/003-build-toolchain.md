# ADR-003: 构建工具链选型

## 状态

已采纳（2026-10）

## 背景

需要选择 monorepo 编排、后端编译、前端打包和代码质量工具。

## 决策

| 工具 | 用途 | 范围 |
|---|---|---|
| **Nx** (v19) | Monorepo 编排：任务调度、依赖图、构建缓存、版本管理与发布 | 根级别 |
| **TypeScript** (tsc) | 后端库与 CLI 的编译器（`tsc -d` 产出 `.js` + `.d.ts`） | packages/* + apps/* |
| **Webpack** (v5) | 前端打包器（babel-loader + sass-loader + MiniCssExtractPlugin） | packages/gui |
| **Jest** (v29) | 单元测试框架 | 根级别 |
| **ESLint** (v10) + **Prettier** | 代码质量检查与格式化 | 根级别 |
| **Husky** + **lint-staged** | Git hooks：commit 前自动 lint + format | 根级别 |

## 理由

1. **Nx**：成熟的 monorepo 方案，支持任务缓存（避免重复构建）、依赖图拓扑排序（保证构建顺序）、版本管理（`nx release` 支持 fixed/independent 版本组）
2. **tsc**：后端使用 NodeNext 模块系统，tsc 原生支持；`tsconfig.build.json` 清空 paths 的策略需要 tsc 的 paths 行为
3. **Webpack**：前端需要复杂的 loader 链（babel + sass + postcss + css extraction），Webpack 成熟稳定
4. **Jest**：生态成熟，ESM 支持通过 `moduleNameMapper` 映射契约到源码

## 构建流程

```
npm run build-all
  → scripts/nx.mjs (包装 nx，注入 NX_CACHE_DIRECTORY)
    → nx run-many --target=build
      → 按依赖图拓扑排序：contracts → controller/options → server/gui → apps/*
        → packages/* : tsc -p tsconfig.build.json -d
        → packages/gui : webpack --env mode=production
```

## 后果

- 正面：增量构建，只重新构建变更的包及其下游
- 正面：统一的代码质量门禁（ESLint + Prettier + Jest）
- 正面：版本发布自动化（`nx release`）
- 负面：Nx 有一定学习曲线
- 负面：Webpack 构建速度不如 Vite/esbuild（当前规模可接受）