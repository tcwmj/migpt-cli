// ── 统计 API：Token 用量、对话次数、多维度聚合 ──────────────
import type { RouteContext } from './shared.js'
import { API_PREFIX, ok, fail, asyncHandler } from './shared.js'
import { logRows, logger, type LogRow } from '../logger.js'
import { getModels, getVoices, getRobots, listDevices } from '../store.js'
import { getAllStatus } from '@migptgui/controller'

// ── 类型定义 ────────────────────────────────────────────────
interface TokenStats {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  conversations: number
}

interface TimeSeriesPoint extends TokenStats {
  date: string
}

interface DimensionStats extends TokenStats {
  id: string
  name: string
}

interface ServiceHealth {
  id: string
  name: string
  type: 'model' | 'voice'
  limitReached: boolean
  totalTokensUsed: number
  tokenLimit?: number
  usagePercent?: number
}

interface DimensionEntity {
  id: string
  name: string
}

interface DeviceHealth {
  id: string
  name: string
  running: boolean
  conversations: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

// ── 时段计算 ────────────────────────────────────────────────
type Range =
  | 'today'
  | 'this_month'
  | 'this_year'
  | 'last_1d'
  | 'last_3d'
  | 'last_7d'
  | 'last_30d'

function calcDateRange(range: Range): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start: Date

  switch (range) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1)
      break
    }
    case 'last_1d': {
      start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      break
    }
    case 'last_3d': {
      start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      break
    }
    case 'last_7d': {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    }
    case 'last_30d': {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
  }
  return { start, end }
}

/** 解析 yyyyMMdd 格式日期字符串 */
function parseDateKey(key: string): Date | null {
  if (!/^\d{8}$/.test(key)) return null
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(4, 6)) - 1
  const d = Number(key.slice(6, 8))
  const date = new Date(y, m, d)
  return isNaN(date.getTime()) ? null : date
}

// ── 辅助函数 ────────────────────────────────────────────────

function parseLogTime(timeStr: string): Date | null {
  const normalized = timeStr.replace(/\//g, '-')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

function getDateKey(
  d: Date,
  period: 'hour' | 'day' | 'month' | 'year',
): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  switch (period) {
    case 'hour':
      return `${y}-${m}-${day} ${hour}:00`
    case 'day':
      return `${y}-${m}-${day}`
    case 'month':
      return `${y}-${m}`
    case 'year':
      return `${y}`
  }
}

/** 收集设备日志中的 AI 行，附带 deviceId */
interface DeviceLogRow extends LogRow {
  deviceId: string
}

function collectAILogs(): DeviceLogRow[] {
  const rows: DeviceLogRow[] = []
  for (const [deviceId, deviceRows] of logRows) {
    for (const row of deviceRows) {
      if (row.kind === 'ai') rows.push({ ...row, deviceId })
    }
  }
  return rows
}

function filterByTime(
  rows: DeviceLogRow[],
  start: Date,
  end: Date,
): DeviceLogRow[] {
  return rows.filter((row) => {
    const d = parseLogTime(row.time)
    if (!d) return false
    return d >= start && d <= end
  })
}

function calcTokenStats(rows: DeviceLogRow[]): TokenStats {
  let inputTokens = 0
  let outputTokens = 0
  for (const row of rows) {
    inputTokens += row.inputTokens ?? 0
    outputTokens += row.outputTokens ?? 0
  }
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    conversations: rows.length,
  }
}

// ── 维度过滤：根据设备 ID 集合过滤日志 ──────────────────────
async function getFilteredDeviceIds(
  dimension?: string,
  ids?: string[],
): Promise<Set<string> | null> {
  if (!dimension || !ids || ids.length === 0) return null

  const devices = await listDevices()
  const robots = await getRobots()

  if (dimension === 'device') {
    // 直接按设备 ID 过滤
    return new Set(ids)
  }

  if (dimension === 'robot') {
    // 按角色 ID 找到绑定的设备
    const robotIds = new Set(ids)
    const deviceIds = new Set<string>()
    for (const device of devices) {
      if (device.robotId && robotIds.has(device.robotId)) {
        deviceIds.add(device.id)
      }
    }
    return deviceIds
  }

  if (dimension === 'model') {
    // 按服务 ID 找到绑定的角色，再找设备
    const serviceIds = new Set(ids)
    const robotIds = new Set<string>()
    for (const robot of robots) {
      const modelIds = robot.modelIds?.length
        ? robot.modelIds
        : robot.modelId
          ? [robot.modelId]
          : []
      for (const sid of modelIds) {
        if (serviceIds.has(sid)) {
          robotIds.add(robot.id)
          break
        }
      }
    }
    const deviceIds = new Set<string>()
    for (const device of devices) {
      if (device.robotId && robotIds.has(device.robotId)) {
        deviceIds.add(device.id)
      }
    }
    return deviceIds
  }

  return null
}

/** 根据时段自动选择分组粒度 */
function getAutoGroupPeriod(
  range: Range,
  daysDiff?: number,
): 'hour' | 'day' | 'month' | 'year' {
  // 当天或1天范围使用小时粒度
  if (range === 'today' || range === 'last_1d') return 'hour'
  // 根据天数自动选择
  if (daysDiff !== undefined) {
    if (daysDiff <= 1) return 'hour'
    if (daysDiff <= 90) return 'day'
    if (daysDiff <= 730) return 'month'
    return 'year'
  }
  if (range === 'last_3d') return 'day'
  if (range === 'last_7d') return 'day'
  if (range === 'last_30d') return 'day'
  if (range === 'this_month') return 'day'
  if (range === 'this_year') return 'month'
  return 'day'
}

// ── 路由注册 ────────────────────────────────────────────────

export function registerStatsRoutes({ app }: RouteContext): void {
  /**
   * GET /api/v1/stats
   * 统一统计接口
   * 参数：
   *   range: today|this_month|this_year|last_1d|last_3d|last_7d|last_30d（与 from/to 互斥）
   *   from: 开始日期 yyyyMMdd（与 range 互斥）
   *   to: 结束日期 yyyyMMdd（与 range 互斥）
   *   dimension: robot|device|service（可选）
   *   ids: 逗号分隔的实体 ID（可选，配合 dimension 使用）
   * 返回：
   *   totals: 总览（不受过滤影响）
   *   filtered: 过滤后的统计
   *   timeline: 时间线数据
   *   entityTimelines: 每个实体的时间线数据
   *   dimensionData: 维度明细数据
   *   entities: 可选维度实体列表
   *   serviceHealth: 服务健康状态
   */
  app.get(
    `${API_PREFIX}/stats`,
    asyncHandler(async (req, res) => {
      try {
        const range = (req.query.range as Range) || undefined
        const fromKey = req.query.from as string | undefined
        const toKey = req.query.to as string | undefined
        const dimension = req.query.dimension as string | undefined
        const idsStr = req.query.ids as string | undefined
        const ids = idsStr ? idsStr.split(',').filter(Boolean) : undefined

        const allLogs = collectAILogs()

        // 计算时间范围
        let start: Date
        let end: Date
        let daysDiff: number | undefined

        if (fromKey && toKey) {
          const fromDate = parseDateKey(fromKey)
          const toDate = parseDateKey(toKey)
          if (!fromDate || !toDate) {
            fail(res, 400, '日期格式错误，应为 yyyyMMdd')
            return
          }
          start = new Date(
            fromDate.getFullYear(),
            fromDate.getMonth(),
            fromDate.getDate(),
            0,
            0,
            0,
          )
          end = new Date(
            toDate.getFullYear(),
            toDate.getMonth(),
            toDate.getDate(),
            23,
            59,
            59,
            999,
          )
          daysDiff = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          )
        } else {
          const rangeResult = calcDateRange(range || 'today')
          start = rangeResult.start
          end = rangeResult.end
        }

        // 1. 总览（全部数据，不受过滤影响）
        const totals = calcTokenStats(allLogs)

        // 2. 过滤后的数据
        const timeFiltered = filterByTime(allLogs, start, end)
        const deviceIds = await getFilteredDeviceIds(dimension, ids)
        const filtered = deviceIds
          ? timeFiltered.filter((r) => deviceIds.has(r.deviceId))
          : timeFiltered

        const filteredStats = calcTokenStats(filtered)

        // 3. 时间线
        const groupPeriod = getAutoGroupPeriod(range || 'today', daysDiff)
        const groups = new Map<string, DeviceLogRow[]>()
        for (const row of filtered) {
          const d = parseLogTime(row.time)
          if (!d) continue
          const key = getDateKey(d, groupPeriod)
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(row)
        }

        const timeline: TimeSeriesPoint[] = []
        for (const [date, rows] of groups) {
          const stats = calcTokenStats(rows)
          timeline.push({ date, ...stats })
        }
        timeline.sort((a, b) => a.date.localeCompare(b.date))

        // 3.1 每个实体的时间线数据
        const entityTimelines: Record<string, TimeSeriesPoint[]> = {}
        if (dimension && ids && ids.length > 0) {
          const devices = await listDevices()
          const deviceRobotMap = new Map<string, string>()
          for (const device of devices) {
            if (device.robotId) deviceRobotMap.set(device.id, device.robotId)
          }

          for (const entityId of ids) {
            let entityLogs: DeviceLogRow[] = []

            if (dimension === 'device') {
              entityLogs = timeFiltered.filter((r) => r.deviceId === entityId)
            } else if (dimension === 'robot') {
              // 找到该角色绑定的所有设备
              const boundDevices = new Set<string>()
              for (const [deviceId, robotId] of deviceRobotMap) {
                if (robotId === entityId) boundDevices.add(deviceId)
              }
              entityLogs = timeFiltered.filter((r) =>
                boundDevices.has(r.deviceId),
              )
            } else if (dimension === 'model') {
              // 找到使用该服务的所有角色，再找到绑定的设备
              const robots = await getRobots()
              const boundDevices = new Set<string>()
              for (const robot of robots) {
                const modelIds = robot.modelIds?.length
                  ? robot.modelIds
                  : robot.modelId
                    ? [robot.modelId]
                    : []
                if (modelIds.includes(entityId)) {
                  for (const [deviceId, robotId] of deviceRobotMap) {
                    if (robotId === robot.id) boundDevices.add(deviceId)
                  }
                }
              }
              entityLogs = timeFiltered.filter((r) =>
                boundDevices.has(r.deviceId),
              )
            }

            // 按时间分组
            const entityGroups = new Map<string, DeviceLogRow[]>()
            for (const row of entityLogs) {
              const d = parseLogTime(row.time)
              if (!d) continue
              const key = getDateKey(d, groupPeriod)
              if (!entityGroups.has(key)) entityGroups.set(key, [])
              entityGroups.get(key)!.push(row)
            }

            const entityTimeline: TimeSeriesPoint[] = []
            for (const [date, rows] of entityGroups) {
              const stats = calcTokenStats(rows)
              entityTimeline.push({ date, ...stats })
            }
            entityTimeline.sort((a, b) => a.date.localeCompare(b.date))
            entityTimelines[entityId] = entityTimeline
          }
        }

        // 4. 维度明细数据
        let dimensionData: DimensionStats[] = []
        const devices = await listDevices()
        const robots = await getRobots()
        const deviceRobotMap = new Map<string, string>()
        const deviceNameMap = new Map<string, string>()
        for (const device of devices) {
          if (device.robotId) deviceRobotMap.set(device.id, device.robotId)
          deviceNameMap.set(device.id, device.alias || device.did || device.id)
        }

        if (!dimension || dimension === 'robot') {
          // 按角色统计
          const robotLogs = new Map<string, DeviceLogRow[]>()
          for (const robot of robots) {
            robotLogs.set(robot.id, [])
          }
          for (const row of timeFiltered) {
            const robotId = deviceRobotMap.get(row.deviceId)
            if (robotId && robotLogs.has(robotId)) {
              robotLogs.get(robotId)!.push(row)
            }
          }
          dimensionData = robots.map((robot) => {
            const rows = robotLogs.get(robot.id) ?? []
            const stats = calcTokenStats(rows)
            return { id: robot.id, name: robot.name, ...stats }
          })
          dimensionData.sort((a, b) => b.totalTokens - a.totalTokens)
        } else if (dimension === 'device') {
          // 按设备统计
          const deviceLogs = new Map<string, DeviceLogRow[]>()
          for (const row of timeFiltered) {
            if (!deviceLogs.has(row.deviceId)) deviceLogs.set(row.deviceId, [])
            deviceLogs.get(row.deviceId)!.push(row)
          }
          dimensionData = []
          for (const [did, rows] of deviceLogs) {
            if (rows.length === 0) continue
            const stats = calcTokenStats(rows)
            dimensionData.push({
              id: did,
              name: deviceNameMap.get(did) ?? did,
              ...stats,
            })
          }
          dimensionData.sort((a, b) => b.totalTokens - a.totalTokens)
        } else if (dimension === 'model') {
          // 按模型统计（从模型实体直接读取累计值；语音不消耗 token，不纳入）
          const models = await getModels()
          dimensionData = models.map((s) => ({
            id: s.id,
            name: s.name,
            inputTokens: s.inputTokensUsed ?? 0,
            outputTokens: s.outputTokensUsed ?? 0,
            totalTokens: s.totalTokensUsed ?? 0,
            conversations: 0,
          }))
          dimensionData.sort((a, b) => b.totalTokens - a.totalTokens)
        }

        // 5. 可选维度实体列表
        const entities: Record<string, DimensionEntity[]> = {
          robot: robots.map((r) => ({ id: r.id, name: r.name })),
          device: devices.map((d) => ({
            id: d.id,
            name: d.alias || d.did || d.id,
          })),
          service: [
            ...(await getModels()).map((s) => ({
              id: s.id,
              name: `${s.name} (思考)`,
            })),
            ...(await getVoices()).map((s) => ({
              id: s.id,
              name: `${s.name} (语音)`,
            })),
          ],
        }

        // 6. 服务健康状态（模型含 token 用量；语音仅显示存在性，无 token 消耗）
        const models = await getModels()
        const voices = await getVoices()
        const serviceHealth: ServiceHealth[] = [
          ...models.map((s) => ({
            id: s.id,
            name: s.name,
            type: 'model' as const,
            limitReached: s.limitReached ?? false,
            totalTokensUsed: s.totalTokensUsed ?? 0,
            tokenLimit: s.tokenLimit,
            usagePercent: s.tokenLimit
              ? Math.round(((s.totalTokensUsed ?? 0) / s.tokenLimit) * 100)
              : undefined,
          })),
          ...voices.map((s) => ({
            id: s.id,
            name: s.name,
            type: 'voice' as const,
            limitReached: false,
            totalTokensUsed: 0,
            tokenLimit: undefined,
            usagePercent: undefined,
          })),
        ]

        // 7. 设备健康状态
        const statusMap = getAllStatus()
        const deviceHealth: DeviceHealth[] = devices.map((d) => {
          const aiRows = allLogs.filter((r) => r.deviceId === d.id)
          let inputTokens = 0
          let outputTokens = 0
          for (const r of aiRows) {
            inputTokens += r.inputTokens ?? 0
            outputTokens += r.outputTokens ?? 0
          }
          return {
            id: d.id,
            name: d.alias || d.did || d.id,
            running: !!statusMap[d.id]?.running,
            conversations: aiRows.length,
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          }
        })
        deviceHealth.sort((a, b) => b.totalTokens - a.totalTokens)

        ok(res, {
          totals,
          filtered: filteredStats,
          timeline,
          entityTimelines,
          dimensionData,
          entities,
          serviceHealth,
          deviceHealth,
          range,
          groupPeriod,
        })
      } catch (e) {
        logger.error({ err: e }, '统计查询失败')
        fail(res, 500, '统计查询失败')
      }
    }),
  )
}
