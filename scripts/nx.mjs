// 统一 nx 的缓存与内部数据目录到根 .cache/nx（跨平台，供 npm scripts 调用）。
// nx.json 的 cacheDirectory 只能重定向任务缓存，.nx/workspace-data 需靠环境变量，
// 这里集中注入，避免根目录再冒出 .nx/。
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache', 'nx')

const child = spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'nx', 'bin', 'nx.js'), ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NX_CACHE_DIRECTORY: cacheDir,
      NX_WORKSPACE_DATA_DIRECTORY: cacheDir,
    },
  },
)

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
