// ── 对话日志聚合 + 系统日志查看/下载/清空 ────────────────────────
import fs from 'node:fs/promises'
import { systemLogFile } from '../paths.js'
import { logBuffers, sysLogBuf, clearSysLog } from '../logger.js'
import { listDeviceMetas } from '../store.js'
import type { RouteContext } from './shared.js'

// 日志行解析正则：模块级预编译，避免每次请求在循环内重复构造
const LOG_TS_RE = /^(\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2})/
const LOG_TS_STRIP_RE = /^\d{4}[/-]\d{2}[/-]\d{2} \d{2}:\d{2}:\d{2}\s*/
const LOG_USER_RE = /^\[用户\]|\[User\]|\[Q\]|^问[:：]|用户说/
const LOG_AI_RE = /^\[AI\]|\[Assistant\]|\[A\]|^答[:：]|AI 说/

export function registerLogRoutes({ app }: RouteContext): void {
  // ── 全局对话日志（聚合所有设备，供「对话记录」页）────────────────
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
    for (const [deviceId, buf] of logBuffers) {
      const deviceAlias = aliasById.get(deviceId) || deviceId
      let cur: {
        time: string
        kind: 'user' | 'ai' | 'system'
        text: string
      } | null = null
      for (const line of buf.slice(-limit)) {
        const m = line.match(LOG_TS_RE)
        const body = line.replace(LOG_TS_STRIP_RE, '')
        if (m) {
          if (cur) rows.push({ deviceId, deviceAlias, ...cur })
          let kind: 'user' | 'ai' | 'system' = 'system'
          if (LOG_USER_RE.test(body)) kind = 'user'
          else if (LOG_AI_RE.test(body)) kind = 'ai'
          cur = { time: m[1], kind, text: body }
        } else if (cur) {
          // 无时间戳的续行并入上一条日志（同一条多行日志不拆成多条）
          cur.text += '\n' + body
        }
      }
      if (cur) rows.push({ deviceId, deviceAlias, ...cur })
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
