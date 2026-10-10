// ── 对话日志聚合 + 系统日志查看/下载/清空 ────────────────────────
import { logRows, sysLogBuf, clearSysLog } from '../logger.js'
import {
  listDeviceMetas,
  getSystemLogTail,
  getSystemLogSize,
  getSystemLogFull,
  getSystemLogDates,
  getActiveSystemLogFile,
  getSystemLogTailsBetween,
  searchSystemLogs,
  todayLogDate,
  LOG_DATE_RE,
} from '../store.js'
import {
  API_PREFIX,
  ok,
  fail,
  asyncHandler,
  type RouteContext,
} from './shared.js'

/** 解析 query 中的日期参数（yyyyMMdd）；未提供返回 undefined，非法返回 null */
function parseLogDate(v: unknown): string | undefined | null {
  if (v === undefined) return undefined
  const s = String(v)
  return LOG_DATE_RE.test(s) ? s : null
}

export function registerLogRoutes({ app }: RouteContext): void {
  // ── 全局对话日志（聚合所有设备，供「对话记录」页）────────────────
  // 结构化在 appendLog 写入期完成，此处仅做别名映射与排序，不再逐行正则解析。
  app.get(
    `${API_PREFIX}/logs`,
    asyncHandler(async (req, res) => {
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
    }),
  )

  // ── 系统日志（实时查看 + 按日期/范围查看 + 有日志日期列表）──────
  // date=yyyyMMdd，缺省为当天；当天优先用内存环形缓冲（实时），历史日期直读文件。
  // from/to=yyyyMMdd 为范围模式：合并范围内各天尾部日志（忽略 date 参数）。
  app.get(
    `${API_PREFIX}/system/logs`,
    asyncHandler(async (req, res) => {
      const from = parseLogDate(req.query.from)
      const to = parseLogDate(req.query.to)
      if (from === null || to === null) {
        fail(res, 400, '日期参数格式应为 yyyyMMdd')
        return
      }
      const lines = Math.min(Number(req.query.lines) || 300, 2000)
      // 范围模式
      if (from && to) {
        const [lo, hi] = from <= to ? [from, to] : [to, from]
        res.json({
          lines: await getSystemLogTailsBetween(lo, hi, lines),
          file: `${lo}-${hi}`,
          size: 0,
          range: true,
        })
        return
      }
      const date = parseLogDate(req.query.date)
      if (date === null) {
        fail(res, 400, '日期参数格式应为 yyyyMMdd')
        return
      }
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
    }),
  )

  // 有日志落盘的日期列表（降序），供面板日历判断哪些日期可选
  app.get(
    `${API_PREFIX}/system/logs/dates`,
    asyncHandler(async (_req, res) => {
      res.json({ dates: await getSystemLogDates() })
    }),
  )

  // 日期范围跨文件搜索：from/to=yyyyMMdd（含端点，缺省为当天），q=关键词（必填）
  app.get(
    `${API_PREFIX}/system/logs/search`,
    asyncHandler(async (req, res) => {
      const from = parseLogDate(req.query.from)
      const to = parseLogDate(req.query.to)
      const q = String(req.query.q || '').trim()
      if (from === null || to === null) {
        fail(res, 400, '日期参数格式应为 yyyyMMdd')
        return
      }
      if (!q) {
        fail(res, 400, '缺少搜索关键词 q')
        return
      }
      const start = from || to || todayLogDate()
      const end = to || from || todayLogDate()
      // 保证 start <= end（字符串比较对 yyyyMMdd 有效）
      const [lo, hi] = start <= end ? [start, end] : [end, start]
      const limit = Math.min(Number(req.query.limit) || 1000, 5000)
      res.json({ lines: await searchSystemLogs(lo, hi, q, limit) })
    }),
  )

  app.get(
    `${API_PREFIX}/system/logs/download`,
    asyncHandler(async (req, res) => {
      const from = parseLogDate(req.query.from)
      const to = parseLogDate(req.query.to)
      if (from === null || to === null) {
        fail(res, 400, '日期参数格式应为 yyyyMMdd')
        return
      }
      try {
        let text: string
        let suffix: string
        if (from && to) {
          // 范围模式：拼接范围内各天全文（升序）
          const [lo, hi] = from <= to ? [from, to] : [to, from]
          const dates = (await getSystemLogDates())
            .reverse()
            .filter((d) => d >= lo && d <= hi)
          const parts: string[] = []
          for (const d of dates) {
            parts.push(`\n===== ${d} =====\n`)
            parts.push(await getSystemLogFull(d))
          }
          text = parts.join('')
          suffix = `-${lo}-${hi}`
        } else {
          const date = parseLogDate(req.query.date)
          if (date === null) {
            fail(res, 400, '日期参数格式应为 yyyyMMdd')
            return
          }
          text = await getSystemLogFull(date)
          suffix = date ? `-${date}` : ''
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="migpt-system${suffix}.log"`,
        )
        res.send(text)
      } catch {
        fail(res, 404, '系统日志文件不存在')
      }
    }),
  )

  app.post(
    `${API_PREFIX}/system/logs/clear`,
    asyncHandler(async (_req, res) => {
      try {
        await clearSysLog()
        ok(res)
      } catch (err) {
        fail(res, 500, String(err))
      }
    }),
  )
}
