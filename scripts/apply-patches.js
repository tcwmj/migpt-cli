#!/usr/bin/env node
/**
 * 自动应用 patches 目录下的补丁
 * 在 postinstall 阶段调用，确保每次 npm install 后补丁都会被应用
 *
 * 支持两种补丁格式：
 * 1. 标准 git diff 格式
 * 2. 自定义替换格式（用于 node_modules 修改）
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const patchesDir = path.join(__dirname, '..', 'patches');

if (!fs.existsSync(patchesDir)) {
  console.log('📁 patches 目录不存在，跳过补丁应用');
  process.exit(0);
}

const patchFiles = fs.readdirSync(patchesDir).filter(f => f.endsWith('.patch') || f.endsWith('.js'));

if (patchFiles.length === 0) {
  console.log('📁 没有找到补丁文件');
  process.exit(0);
}

console.log(`🔧 找到 ${patchFiles.length} 个补丁文件，开始应用...`);

for (const patchFile of patchFiles) {
  const patchPath = path.join(patchesDir, patchFile);
  console.log(`  📝 应用补丁: ${patchFile}`);

  // 如果是 .js 文件，直接执行
  if (patchFile.endsWith('.js')) {
    try {
      require(patchPath);
      console.log(`  ✅ 补丁 ${patchFile} 执行成功`);
    } catch (error) {
      console.log(`  ❌ 补丁 ${patchFile} 执行失败: ${error.message}`);
    }
    continue;
  }

  // 如果是 .patch 文件，尝试应用
  try {
    // 使用 git apply 应用补丁
    execSync(`git apply --check "${patchPath}"`, { stdio: 'pipe' });
    execSync(`git apply "${patchPath}"`, { stdio: 'pipe' });
    console.log(`  ✅ 补丁 ${patchFile} 应用成功`);
  } catch (error) {
    // 如果 git apply 失败，尝试手动应用
    console.log(`  ⚠️  git apply 失败，尝试手动应用...`);

    try {
      // 读取补丁文件并手动应用
      const patchContent = fs.readFileSync(patchPath, 'utf-8');
      const lines = patchContent.split('\n');

      // 解析补丁文件
      let targetFile = null;
      let hunks = [];
      let currentHunk = null;

      for (const line of lines) {
        if (line.startsWith('--- a/')) {
          targetFile = line.replace('--- a/', '');
        } else if (line.startsWith('+++ b/')) {
          // 继续
        } else if (line.startsWith('@@')) {
          if (currentHunk) hunks.push(currentHunk);
          currentHunk = { header: line, lines: [] };
        } else if (currentHunk) {
          currentHunk.lines.push(line);
        }
      }
      if (currentHunk) hunks.push(currentHunk);

      if (targetFile && hunks.length > 0) {
        const fullPath = path.join(__dirname, '..', targetFile);
        if (fs.existsSync(fullPath)) {
          let content = fs.readFileSync(fullPath, 'utf-8');

          // 应用每个 hunk
          for (const hunk of hunks) {
            const oldLines = hunk.lines
              .filter(l => l.startsWith('-'))
              .map(l => l.substring(1));
            const newLines = hunk.lines
              .filter(l => l.startsWith('+'))
              .map(l => l.substring(1));

            // 简单的替换逻辑
            const oldContent = oldLines.join('\n');
            const newContent = newLines.join('\n');

            if (content.includes(oldContent)) {
              content = content.replace(oldContent, newContent);
              fs.writeFileSync(fullPath, content, 'utf-8');
              console.log(`  ✅ 手动应用补丁成功: ${targetFile}`);
            } else {
              console.log(`  ⚠️  未找到目标内容，可能已经应用过`);
            }
          }
        } else {
          console.log(`  ❌ 目标文件不存在: ${targetFile}`);
        }
      }
    } catch (manualError) {
      console.log(`  ❌ 手动应用补丁失败: ${manualError.message}`);
    }
  }
}

console.log('✅ 所有补丁应用完成');