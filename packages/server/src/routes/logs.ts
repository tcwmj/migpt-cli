// ── 对话日志聚合 + 系统日志查看/下载/清空 ────────────────────────
import { logRows, sysLogBuf, clearSysLog } from '../logger.js'
import {
  listDeviceMetas,
  getSystemLogTail,
  getSystemLogSize,
  getSystemLogFull,
  getSystemLogDates,
  getActiveSystemLogFile,
  todayLogDate,
  LOG_DATE_RE,
} from '../store.js'
import { API_PREFIX, ok, fail, type RouteContext } from './shared.js'

/** 解析 query 中的日期参数（yyyyMMdd）；未提供返回 undefined，非法返回 null */
function parseLogDate(v: unknown): string | undefined | null {
  if (v === undefined) return undefined
  const s = String(v)
  return LOG_DATE_RE.test(s) ? s : null
}

export function registerLogRoutes({ app }: RouteContext): void {
  // ── 全局对话日志（聚合所有设备，供「对话记录」页）────────────────
  // 结构化在 appendLog 写入期完成，此处仅做别名映射与排序，不再逐行正则解析。
  app.get(`${API_PREFIX}/logs`, async (req, res) => {
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

  // ── 系统日志（实时查看 + 按日期查看/下载 + 有日志日期列表）──────
  // date=yyyyMMdd，缺省为当天；当天优先用内存环形缓冲（实时），历史日期直读文件。
  app.get(`${API_PREFIX}/system/logs`, async (req, res) => {
    const date = parseLogDate(req.query.date)
    if (date === null) {
      fail(res, 400, '日期参数格式应为 yyyyMMdd')
      return
    }
    const lines = Math.min(Number(req.query.lines) || 300, 2000)
    let arr: string[] = []
    if (!date || date === todayLogDate()) {
      arr = sysLogBuf.slice(-lines)
    }
    if (arr.length < lines) {
      const tail = await getSystemLogTail(lines, date)
      if (tail.length) arr = tail
    }
    const size = await getSystemLogSize(date)
    res.json({ lines: arr, file: await getActiveSystemLogFile(date), size })
  })

  // 有日志落盘的日期列表（降序），供面板日历判断哪些日期可选
  app.get(`${API_PREFIX}/system/logs/dates`, async (_req, res) => {
    res.json({ dates: await getSystemLogDates() })
  })

  app.get(`${API_PREFIX}/system/logs/download`, async (req, res) => {
    const date = parseLogDate(req.query.date)
    if (date === null) {
      fail(res, 400, '日期参数格式应为 yyyyMMdd')
      return
    }
    try {
      const text = await getSystemLogFull(date)
      const suffix = date ? `-${date}` : ''
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="migpt-system${suffix}.log"`,
      )
      res.send(text)
    } catch {
      fail(res, 404, '系统日志文件不存在')
    }
  })

  app.post(`${API_PREFIX}/system/logs/clear`, async (_req, res) => {
    try {
      await clearSysLog()
      ok(res)
    } catch (err) {
      fail(res, 500, String(err))
    }
  })
}
