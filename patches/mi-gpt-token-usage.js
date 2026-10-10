/**
 * mi-gpt token 用量输出补丁
 * 在 postinstall 阶段自动应用
 *
 * 功能：在 OpenAI API 响应后输出 token 用量信息
 */

const fs = require('node:fs');
const path = require('node:path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'mi-gpt', 'dist', 'index.js');

if (!fs.existsSync(targetFile)) {
  console.log('  ⚠️  mi-gpt 未安装，跳过补丁');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf-8');

// 检查是否已经应用过补丁
if (content.includes('stream_options: { include_usage: true }')) {
  console.log('  ⚠️  mi-gpt token 用量补丁已应用，跳过');
  process.exit(0);
}

// 补丁 1: 修改 chat 方法，添加 token 用量输出
const oldChatPattern = /const message = \(_b = \(_a = chatCompletion == null \? void 0 : chatCompletion\.choices\) == null \? void 0 : _a\[0\]\) == null \? void 0 : _b\.message;\s*if \(trace && this\.traceOutput\) \{\s*this\._logger\.log\(`\\u2705 Answer: \$\{.*?\}`\.trim\(\)\);\s*\}\s*return message;/;

const newChatCode = `const message = (_b = (_a = chatCompletion == null ? void 0 : chatCompletion.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message;
    if (trace && this.traceOutput) {
      this._logger.log(\`\\u2705 Answer: \${(message == null ? void 0 : message.content) ?? "None"}\`.trim());
      // 输出 token 用量信息
      if (chatCompletion?.usage) {
        const usage = chatCompletion.usage;
        this._logger.log(\`\\u2705 Prompt tokens: \${usage.prompt_tokens ?? 0}\`);
        this._logger.log(\`\\u2705 Completion tokens: \${usage.completion_tokens ?? 0}\`);
        this._logger.log(\`\\u2705 Total tokens: \${usage.total_tokens ?? 0}\`);
      }
    }
    return message;`;

// 补丁 2: 修改 chatStream 方法，添加 stream_options 和 token 用量输出
const oldStreamPattern = /const stream = await this\._client\.chat\.completions\.create\(\{\s*model,\s*tools,\s*stream: true,\s*messages:/;

const newStreamCode = `const stream = await this._client.chat.completions.create({
      model,
      tools,
      stream: true,
      stream_options: { include_usage: true },
      messages:`;

// 应用补丁 1
if (oldChatPattern.test(content)) {
  content = content.replace(oldChatPattern, newChatCode);
  console.log('  ✅ 补丁 1 应用成功: chat 方法');
} else {
  console.log('  ⚠️  补丁 1 未找到目标代码，可能已应用');
}

// 应用补丁 2
if (oldStreamPattern.test(content)) {
  content = content.replace(oldStreamPattern, newStreamCode);
  console.log('  ✅ 补丁 2 应用成功: chatStream 方法 stream_options');
} else {
  console.log('  ⚠️  补丁 2 未找到目标代码，可能已应用');
}

// 保存修改后的文件
fs.writeFileSync(targetFile, content, 'utf-8');
console.log('  ✅ 所有补丁应用完成');