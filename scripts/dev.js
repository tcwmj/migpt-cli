#!/usr/bin/env node
// MiGPT local dev hot-start (cross-platform)
// Frontend: webpack --watch (background, browser F5)
// Backend : tsc -w (background) + node --watch (foreground, real-time logs)
// Usage   : npm run dev  |  node scripts/dev.js
// Stop    : Ctrl+C (graceful, auto-cleans background processes)

const { spawn, execSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const nodeExe = process.execPath // 当前 node 路径

// ── 停掉上一轮残留的 migpt 进程 ──
function killOld() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -match 'migpt' -and $_.CommandLine -match '36597' } | ForEach-Object { $_.ProcessId }"`,
        { encoding: 'utf8', timeout: 8000, windowsHide: true },
      )
      for (const pid of out.trim().split('\n').filter(Boolean)) {
        const id = Number(pid.trim())
        if (id && !isNaN(id)) {
          try {
            process.kill(id, 'SIGTERM')
          } catch {}
          console.log(`  stopped old PID ${id}`)
        }
      }
    } else {
      const out = execSync("pgrep -f 'migpt.*36597' || true", {
        encoding: 'utf8',
        timeout: 3000,
      })
      for (const pid of out.trim().split('\n').filter(Boolean)) {
        try {
          process.kill(Number(pid), 'SIGTERM')
        } catch {}
        console.log(`  stopped old PID ${pid}`)
      }
    }
  } catch {}
}

// ── 启动后台进程 ──
function bgStart(label, cmd, args, cwd) {
  const child = spawn(nodeExe, [cmd, ...args], {
    cwd,
    stdio: 'ignore',
    detached: false,
  })
  child.on('error', (err) =>
    console.error(`  [bg] ${label} error:`, err.message),
  )
  console.log(`  [bg] ${label}  (PID ${child.pid})`)
  return child
}

// ── main ──
killOld()

console.log()
console.log('== MiGPT dev hot-start ==')
console.log()

const bg = []

// 1. frontend webpack watch
bg.push(
  bgStart(
    'frontend watch',
    path.join(root, 'node_modules/webpack/bin/webpack.js'),
    ['--watch', '--env', 'mode=development'],
    path.join(root, 'packages/gui'),
  ),
)

// 2. backend tsc -w
bg.push(
  bgStart(
    'tsc watch',
    path.join(root, 'node_modules/typescript/bin/tsc'),
    ['-d', '-w'],
    path.join(root, 'packages/server'),
  ),
)

console.log()
console.log('  backend server starting on http://127.0.0.1:36597 ...')
console.log('  Ctrl+C to stop')
console.log()

// 3. backend server (前台，实时日志)
const server = spawn(
  nodeExe,
  [
    '--watch-path',
    path.join(root, 'packages/server/dist'),
    path.join(root, 'apps/server/dist/index.js'),
    '--port',
    '36597',
  ],
  { cwd: root, stdio: 'inherit' },
)

// ── 优雅退出：Ctrl+C 清理后台 ──
function cleanup() {
  console.log()
  console.log('  shutting down...')
  server.kill('SIGTERM')
  for (const child of bg) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(0), 500)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

server.on('exit', (code) => {
  console.log(`  server exited (code ${code})`)
  cleanup()
})
