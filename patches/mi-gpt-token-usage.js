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
if (content.includes('Prompt tokens:')) {
  console.log('  ⚠️  mi-gpt token 用量补丁已应用，跳过');
  process.exit(0);
}

// 要查找的代码模式（使用 Unicode 转义序列）
// 注意：需要匹配完整的代码块，避免匹配到错误的位置
const oldPattern = /const message = \(_b = \(_a = chatCompletion == null \? void 0 : chatCompletion\.choices\) == null \? void 0 : _a\[0\]\) == null \? void 0 : _b\.message;\s*if \(trace && this\.traceOutput\) \{\s*this\._logger\.log\(`\\u2705 Answer: \$\{.*?\}`\.trim\(\)\);\s*\}\s*return message;/;

// 新代码，添加 token 用量输出
const newCode = `const message = (_b = (_a = chatCompletion == null ? void 0 : chatCompletion.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message;
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

// 应用补丁
if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('  ✅ mi-gpt token 用量补丁应用成功');
} else {
  console.log('  ⚠️  未找到目标代码，可能 mi-gpt 版本不匹配');
  console.log('  💡 请手动检查 node_modules/mi-gpt/dist/index.js');
}