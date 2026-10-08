// ── 对话日志聚合 + 系统日志查看/下载/清空 ────────────────────────
import fs from 'node:fs/promises'
import { systemLogFile } from '../paths.js'
import { logRows, sysLogBuf, clearSysLog } from '../logger.js'
import { listDeviceMetas } from '../store.js'
import type { RouteContext } from './shared.js'

export function registerLogRoutes({ app }: RouteContext): void {
  // ── 全局对话日志（聚合所有设备，供「对话记录」页）────────────────
  // 结构化在 appendLog 写入期完成，此处仅做别名映射与排序，不再逐行正则解析。
  app.get('/api/logs', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const rows: {
      deviceId: string
      deviceAlias: string
      time: string
      kind: 'user' | 'ai' | 'system'
      text: string
    }[] = []
    // 一次性取全部设备别名，避免在循环内逐台读 meta.json
    const aliasById = new Map(
      (await listDeviceMetas()).map((m) => [m.id, m.alias]),
    )
    for (const [deviceId, list] of logRows) {
      const deviceAlias = aliasById.get(deviceId) || deviceId
      for (const r of list.slice(-limit)) {
        rows.push({ deviceId, deviceAlias, ...r })
      }
    }
    rows.sort((a, b) => (a.time < b.time ? 1 : -1))
    res.json({ total: rows.length, logs: rows.slice(0, limit) })
  })

  // ── 系统日志（实时查看 + 下载历史）───────────────────────────
  app.get('/api/system/logs', async (req, res) => {
    const lines = Math.min(Number(req.query.lines) || 300, 2000)
    let arr = sysLogBuf.slice(-lines)
    if (arr.length < lines) {
      try {
        const all = (await fs.readFile(systemLogFile, 'utf8'))
          .split('\n')
          .filter(Boolean)
        arr = all.slice(-lines)
      } catch {
        /* 日志文件尚未生成 */
      }
    }
    let size = 0
    try {
      size = (await fs.stat(systemLogFile)).size
    } catch {
      /* 忽略 */
    }
    res.json({ lines: arr, file: systemLogFile, size })
  })

  app.get('/api/system/logs/download', async (_req, res) => {
    try {
      const text = await fs.readFile(systemLogFile, 'utf8')
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="migpt-system.log"',
      )
      res.send(text)
    } catch {
      res.status(404).json({ error: '系统日志文件不存在' })
    }
  })

  app.post('/api/system/logs/clear', async (_req, res) => {
    try {
      await clearSysLog()
      res.json({ success: true })
    } catch (err) {
      res.json({ success: false, error: String(err) })
    }
  })
}
