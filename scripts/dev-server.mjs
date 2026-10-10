#!/usr/bin/env node
// ── dev 专用启动包装：在加载服务前挂上进程级容错 ──────────────────
// dev.js 以 stdio:'inherit' 拉起后端，重启旧进程时其 stdout/stderr 管道可能已关闭，
// pino 写日志会抛 write-after-end（ERR_STREAM_DESTROYED / EPIPE）并触发
// uncaughtException——不捕获的话「重启」会被 exit 处理器误判成「崩溃」，
// 连带关闭整个 dev 进程（shutting down）。此处仅吞掉管道类错误，其余照常抛出。
process.on('uncaughtException', (e) => {
  if (e && (e.code === 'ERR_STREAM_DESTROYED' || e.code === 'EPIPE')) return
  console.error(e)
})
process.on('unhandledRejection', (e) => console.error(e))

await import(new URL('../apps/server/dist/index.js', import.meta.url).href)
