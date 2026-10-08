# ADR-001: 同仓分离 + 契约共享

## 状态

已采纳（2026-10）

## 背景

MiGPT 控制面板包含前端（React SPA）、后端（Express API）、进程控制器（MiGPT 子进程管理）和 CLI 工具。需要决定这些组件的仓库组织方式和共享类型/契约的机制。

## 决策

### 1. 同仓 Monorepo

所有包放在同一个仓库中，使用 npm workspaces 管理：

```
packages/
  contracts/   @migptgui/contracts   前后端共享契约（类型 + 字段清单）
  server/      @migptgui/server      Express API 服务层
  gui/         @migptgui/gui         React 前端 SPA
  options/     @migptgui/options     配置表单组件库
  controller/  @migptgui/controller  MiGPT 进程控制器
apps/
  server/      migpt-server          可执行服务端入口
  cli/         migpt-cli             独立 CLI 工具
```

### 2. 契约共享双重路径策略

`@migptgui/contracts` 是前后端共享的「实体类型单一事实源」，定义所有实体接口和运行期字段清单。

**开发期**：`tsconfig.base.json` 通过 `paths` 映射到源码，实现零手动构建——typecheck/dev 直接解析 `packages/contracts/src/index.ts`。

**构建期**：`tsconfig.build.json` 清空 `paths`，回落到 `node_modules → contracts/dist`（由 nx `^build` 保证已构建），避免契约源码并入本包 program 导致产物目录嵌套。

**运行期一致性**：编译期 `ExactKeys` 类型断言 + 测试层 `contracts.test.ts` 双重保障字段清单与接口定义严格一致。

### 3. 固定版本发布

`@migptgui/*` 包组使用 `"projectsRelationship": "fixed"`，即 contracts/server/gui/options/controller 共享同一版本号，一次 `nx release` 同时发布，避免版本漂移导致的运行时类型不匹配。

## 理由

1. **契约一致性**：同仓保证修改契约时前端和后端在同一个 PR 中同步变更，CI 构建立即验证两端编译通过
2. **原子发布**：固定版本组避免版本漂移
3. **开发效率**：零手动构建策略消除 contracts 的构建等待
4. **单一部署单元**：最终产物 `migpt-server` 是 server API + gui 静态文件的组合，同仓构建天然保证产物兼容

## 后果

- 正面：前后端类型始终同步，修改契约后 CI 立即报错
- 正面：新开发者 clone 后 `npm install` 即可开始开发，无需手动构建中间包
- 负面：仓库体积较大（含前端构建产物和图片资源）
- 负面：nx 依赖图解析有一定开销（通过缓存缓解）