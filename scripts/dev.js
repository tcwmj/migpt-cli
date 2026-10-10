#!/usr/bin/env node
// MiGPT local dev hot-start (cross-platform)
// Frontend: webpack --watch (background, browser F5)
// Backend : tsc -w (background) + node --watch (foreground, real-time logs)
// Usage   : npm run dev  |  node scripts/dev.js
// Stop    : Ctrl+C (graceful, auto-cleans background processes)

const { spawn, execSync } = require('node:child_process')
const fs = require('node:fs')
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

// 3. backend server（前台，实时日志）
// 注意：不用 node --watch-path——tsc -w 重编译是逐文件写入（非原子），
// watch 会在 index.js 已更新、store.js 等尚未写完的窗口期重启，
// 导致 ERR_MODULE_NOT_FOUND（找不到 dist/store.js）。
// 改为监听 dist 并防抖：静默 600ms（写完）才重启，且重启前先优雅停掉旧进程。
const serverDist = path.join(root, 'packages/server/dist')
let server = null
let restartTimer = null
let stopping = false
// 连续崩溃计数：防止真实 bug 导致无限重启循环（10 秒内崩 3 次即放弃）
let crashCount = 0
let crashWindowTimer = null

function startServer() {
  // 经 dev-server.mjs 包装加载：dev 重启旧进程时其 stdout/stderr 管道可能已关闭，
  // 日志写入会抛 write-after-end 并触发 uncaughtException；
  // 不捕获会让「重启」被 exit 处理器误判成「崩溃」，连带关闭整个 dev 进程。
  const child = spawn(
    nodeExe,
    [path.join(__dirname, 'dev-server.mjs'), '--port', '36597'],
    { cwd: root, stdio: 'inherit' },
  )
  server = child
  child.on('exit', (code) => {
    // 仅处理「当前实例」的意外退出（主动重启时旧实例已被换下，忽略）
    if (server !== child) return
    console.log(`  server exited (code ${code})`)
    if (stopping) return
    // 意外崩溃：自动拉起（连续崩溃超限则关闭整个 dev）
    crashCount += 1
    if (!crashWindowTimer) {
      crashWindowTimer = setTimeout(() => {
        crashCount = 0
        crashWindowTimer = null
      }, 10000)
    }
    if (crashCount >= 3) {
      console.error('  server 连续崩溃 3 次，停止 dev（请检查上方报错）')
      cleanup()
      return
    }
    console.log('  restarting…')
    startServer()
  })
}

function restartServer() {
  clearTimeout(restartTimer)
  restartTimer = null
  const old = server
  server = null
  console.log('  backend changed, restarting…')
  if (!old || old.exitCode !== null) return startServer()
  // 旧进程优雅退出后再启动；退出回调与超时兜底可能都触发，用标志保证只启动一次
  let booted = false
  const boot = () => {
    if (booted) return
    booted = true
    startServer()
  }
  old.once('exit', boot)
  old.kill('SIGTERM')
  setTimeout(() => {
    if (old.exitCode === null) old.kill('SIGKILL')
    boot()
  }, 3000)
}

try {
  fs.watch(serverDist, { recursive: false }, () => {
    if (stopping) return
    // 防抖：tsc 会连续写多个文件，静默一段时间后再重启
    clearTimeout(restartTimer)
    restartTimer = setTimeout(restartServer, 600)
  })
} catch (e) {
  console.error('  [watch] dist 监听失败，需手动重启后端：', e.message)
}
startServer()

// ── 优雅退出：Ctrl+C 清理后台 ──
function cleanup() {
  console.log()
  console.log('  shutting down...')
  stopping = true
  clearTimeout(restartTimer)
  if (server && !server.killed) server.kill('SIGTERM')
  for (const child of bg) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(0), 500)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
