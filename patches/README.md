# 补丁说明

## mi-gpt-token-usage.js

**功能**：在 mi-gpt 的 OpenAI API 响应后输出 token 用量信息

**应用时机**：每次 `npm install` 后自动应用（通过 `postinstall` 脚本）

**修改内容**：
- 在 `Answer:` 日志后添加 token 用量输出
- 输出格式：
  - `✅ Prompt tokens: <数量>`
  - `✅ Completion tokens: <数量>`
  - `✅ Total tokens: <数量>`

**技术细节**：
- 修改 `node_modules/mi-gpt/dist/index.js` 中的 `chat` 方法
- 使用 `chatCompletion.usage` 获取 token 用量信息
- 兼容 OpenAI API 标准响应格式

## 应用方式

```bash
# 自动应用（推荐）
npm install

# 手动应用
node patches/mi-gpt-token-usage.js
```

## 注意事项

1. 补丁修改的是 `node_modules` 中的文件，下次 `npm install` 会被覆盖
2. 通过 `postinstall` 脚本自动重新应用补丁
3. 如果 mi-gpt 版本更新，可能需要更新补丁文件
