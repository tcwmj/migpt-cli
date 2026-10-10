# 修改清单

## 1. 设备服务启动问题修复

### 问题
设备服务启动后立即显示"未启动"

### 根本原因
1. 子进程启动失败但错误未被捕获
2. mi-service-lite 需要 password 字段，但用户只有 passToken

### 解决方案
1. 改进子进程错误处理 (`packages/controller/src/child_process.ts`)
2. 支持 passToken 直接登录 (`packages/server/src/routes/devices.ts`, `packages/server/src/services.ts`)
3. 记录子进程退出信息 (`packages/controller/src/index.ts`)

## 2. Token 用量统计修复

### 问题
1. 思考服务未能正常统计到 Token 用量
2. 使用统计未能正常统计到 Token 用量和对话次数

### 根本原因
mi-gpt 不输出 token 用量信息

### 解决方案
1. 创建补丁脚本 `patches/mi-gpt-token-usage.js`
2. 在 `package.json` 中添加 `postinstall` 脚本（已禁用）
3. 手动应用补丁到 `node_modules/mi-gpt/dist/index.js`

## 3. 日志解析修复

### 问题
对话记录分类没有正确识别

### 根本原因
日志解析正则表达式与实际日志格式不匹配

### 解决方案
更新 `packages/server/src/logger.ts` 中的正则表达式：
- `LOG_USER_RE`: 匹配 `Speaker 🔥` 格式
- `LOG_AI_RE`: 匹配 `Speaker 🔊` 和 `Open AI ✅ Answer:` 格式
- `INPUT_TOKEN_RE`: 匹配 `Prompt tokens:` 格式
- `OUTPUT_TOKEN_RE`: 匹配 `Completion tokens:` 格式

## 4. 对话记录设备名称显示修复

### 问题
对话记录列表中，日期右侧显示"全部设备"，而不是实际的设备名称

### 根本原因
当选择"全部设备"时，所有日志都显示"全部设备"，而不是实际的设备名称

### 解决方案
修改 `packages/gui/src/views/LogsView.tsx`，让每条日志显示它所属的设备名称

## 修改的文件

1. `packages/controller/src/child_process.ts` - 子进程错误处理
2. `packages/controller/src/index.ts` - 子进程退出信息记录
3. `packages/server/src/routes/devices.ts` - passToken 登录支持
4. `packages/server/src/services.ts` - 配置编译逻辑
5. `packages/server/src/logger.ts` - 日志解析正则表达式
6. `packages/gui/src/views/LogsView.tsx` - 对话记录设备名称显示
7. `package.json` - 添加 postinstall 脚本（已禁用）
8. `patches/mi-gpt-token-usage.js` - mi-gpt 补丁脚本
9. `patches/mi-gpt-token-usage.patch` - 原始补丁文件
10. `patches/README.md` - 补丁说明文档
11. `scripts/apply-patches.js` - postinstall 脚本
12. `scripts/diagnose-device.ts` - 设备诊断工具
13. `scripts/test-passtoken.js` - passToken 测试工具
