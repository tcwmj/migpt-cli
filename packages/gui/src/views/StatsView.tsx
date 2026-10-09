/* ══ 使用统计视图（单页布局）══ */
import { useState, useRef, useEffect, useMemo } from 'react'
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type {
  StatsDimension,
  DimensionEntity,
  ServiceHealth,
  DeviceHealth,
  TimeSeriesPoint,
  TokenStats,
} from '../apis.ts'
import { DIMENSION_LABELS } from '../apis.ts'
import type { View } from '../constants.ts'
import { QuickRangePicker } from '../components/QuickRangePicker.tsx'
import type { QuickRangeItem } from '../components/QuickRangeFilter.tsx'

// ── 格式化工具 ──────────────────────────────────────────────
const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

// ── 固定 Mock 数据 ──────────────────────────────────────────
const MOCK_OVERVIEW: TokenStats = {
  inputTokens: 856200,
  outputTokens: 234800,
  totalTokens: 1091000,
  conversations: 3486,
}

const MOCK_SERVICE_HEALTH: ServiceHealth[] = [
  {
    id: 's1',
    name: '豆包',
    type: 'think',
    limitReached: false,
    tokenUsed: 856200,
    tokenLimit: 1000000,
    usagePercent: 86,
  },
  {
    id: 's2',
    name: 'DeepSeek',
    type: 'think',
    limitReached: false,
    tokenUsed: 124500,
    tokenLimit: 500000,
    usagePercent: 25,
  },
  {
    id: 's3',
    name: '默认语音',
    type: 'voice',
    limitReached: false,
    tokenUsed: 78900,
    tokenLimit: undefined,
    usagePercent: undefined,
  },
  {
    id: 's4',
    name: 'Edge TTS',
    type: 'voice',
    limitReached: true,
    tokenUsed: 45000,
    tokenLimit: 50000,
    usagePercent: 90,
  },
]

const MOCK_DEVICE_HEALTH: DeviceHealth[] = [
  {
    id: 'd1',
    name: '小米音箱 Pro 10',
    running: true,
    conversations: 1860,
    inputTokens: 458000,
    outputTokens: 128000,
    totalTokens: 586000,
  },
  {
    id: 'd2',
    name: '小米音箱 Mini',
    running: true,
    conversations: 920,
    inputTokens: 245000,
    outputTokens: 62000,
    totalTokens: 307000,
  },
  {
    id: 'd3',
    name: '小爱音箱 Play',
    running: false,
    conversations: 706,
    inputTokens: 153200,
    outputTokens: 44800,
    totalTokens: 198000,
  },
]

const MOCK_ENTITIES: Record<string, DimensionEntity[]> = {
  device: MOCK_DEVICE_HEALTH.map((d) => ({ id: d.id, name: d.name })),
  service: MOCK_SERVICE_HEALTH.map((s) => ({
    id: s.id,
    name: `${s.name} (${s.type === 'think' ? '思考' : '语音'})`,
  })),
}

const ENTITY_WEIGHTS: Record<string, number> = {
  d1: 0.55,
  d2: 0.3,
  d3: 0.15,
  s1: 0.6,
  s2: 0.15,
  s3: 0.15,
  s4: 0.1,
}

// ── 日期工具 ────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
const dateOfKey = (k: string) =>
  new Date(
    Number(k.slice(0, 4)),
    Number(k.slice(4, 6)) - 1,
    Number(k.slice(6, 8)),
  )
const TODAY_KEY = keyOf(new Date())

const STATS_QUICK_ITEMS: QuickRangeItem[] = [
  { id: 'today', label: '今天', toRange: () => [TODAY_KEY, TODAY_KEY] },
  {
    id: 'this_month',
    label: '本月',
    toRange: () => {
      const n = new Date()
      return [keyOf(new Date(n.getFullYear(), n.getMonth(), 1)), TODAY_KEY]
    },
  },
  {
    id: 'this_year',
    label: '今年',
    toRange: () => {
      const n = new Date()
      return [keyOf(new Date(n.getFullYear(), 0, 1)), TODAY_KEY]
    },
  },
  {
    id: 'last_1d',
    label: '最近 1 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 1)
      return [keyOf(s), TODAY_KEY]
    },
  },
  {
    id: 'last_3d',
    label: '最近 3 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 2)
      return [keyOf(s), TODAY_KEY]
    },
  },
  {
    id: 'last_7d',
    label: '最近 7 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 6)
      return [keyOf(s), TODAY_KEY]
    },
  },
  {
    id: 'last_30d',
    label: '最近 30 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 29)
      return [keyOf(s), TODAY_KEY]
    },
  },
]

// ── 自动统计粒度 ───────────────────────────────────────────
type AutoGroupBy = 'hour' | 'day' | 'month' | 'year'

/** 根据日期范围天数自动选择粒度 */
function autoGroupBy(fromKey: string, toKey: string): AutoGroupBy {
  const from = dateOfKey(fromKey)
  const to = dateOfKey(toKey)
  const days = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1
  if (days <= 1) return 'hour' // 当天/1天 → 按小时
  if (days <= 90) return 'day' // 2-90天 → 按日
  if (days <= 730) return 'month' // 91-730天 → 按月
  return 'year' // >730天 → 按年
}

// ── 时间线数据生成 ──────────────────────────────────────────
const SEEDS = [
  { input: 6200, output: 1800, conv: 14 },
  { input: 8400, output: 2600, conv: 22 },
  { input: 5200, output: 1400, conv: 10 },
  { input: 9800, output: 3100, conv: 28 },
  { input: 7100, output: 2200, conv: 18 },
  { input: 10300, output: 3400, conv: 32 },
  { input: 6500, output: 1900, conv: 12 },
  { input: 8900, output: 2700, conv: 24 },
  { input: 7600, output: 2300, conv: 20 },
  { input: 11200, output: 3800, conv: 35 },
  { input: 5900, output: 1600, conv: 11 },
  { input: 9100, output: 2900, conv: 26 },
  { input: 6800, output: 2000, conv: 16 },
  { input: 8200, output: 2500, conv: 21 },
  { input: 10500, output: 3300, conv: 30 },
  { input: 7300, output: 2100, conv: 19 },
  { input: 8700, output: 2600, conv: 23 },
  { input: 6100, output: 1700, conv: 13 },
  { input: 9400, output: 3000, conv: 27 },
  { input: 7800, output: 2400, conv: 20 },
  { input: 11600, output: 3900, conv: 36 },
  { input: 6700, output: 1900, conv: 15 },
  { input: 8300, output: 2500, conv: 22 },
  { input: 10100, output: 3200, conv: 29 },
  { input: 7400, output: 2200, conv: 18 },
  { input: 8800, output: 2700, conv: 24 },
  { input: 6300, output: 1800, conv: 14 },
  { input: 9700, output: 3100, conv: 28 },
  { input: 10900, output: 3500, conv: 33 },
  { input: 6900, output: 2000, conv: 16 },
]

// 小时种子（24小时）
const HOUR_SEEDS = [
  { input: 200, output: 60, conv: 1 },
  { input: 120, output: 30, conv: 0 },
  { input: 80, output: 20, conv: 0 },
  { input: 50, output: 10, conv: 0 },
  { input: 40, output: 10, conv: 0 },
  { input: 60, output: 15, conv: 0 },
  { input: 150, output: 40, conv: 1 },
  { input: 300, output: 80, conv: 2 },
  { input: 500, output: 140, conv: 4 },
  { input: 800, output: 220, conv: 7 },
  { input: 650, output: 180, conv: 5 },
  { input: 900, output: 250, conv: 8 },
  { input: 1100, output: 310, conv: 9 },
  { input: 850, output: 240, conv: 6 },
  { input: 720, output: 200, conv: 5 },
  { input: 680, output: 190, conv: 5 },
  { input: 540, output: 150, conv: 4 },
  { input: 420, output: 120, conv: 3 },
  { input: 380, output: 110, conv: 3 },
  { input: 450, output: 130, conv: 3 },
  { input: 520, output: 150, conv: 4 },
  { input: 410, output: 120, conv: 3 },
  { input: 280, output: 80, conv: 2 },
  { input: 180, output: 50, conv: 1 },
]

function genTimeline(
  fromKey: string,
  toKey: string,
  groupBy: AutoGroupBy,
): TimeSeriesPoint[] {
  const from = dateOfKey(fromKey)
  const to = dateOfKey(toKey)
  const days = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1

  if (groupBy === 'hour') {
    // 按小时生成（当天 0-23 点）
    return HOUR_SEEDS.map((s, h) => {
      const y = from.getFullYear()
      const m = pad2(from.getMonth() + 1)
      const d = pad2(from.getDate())
      return {
        date: `${y}-${m}-${d} ${pad2(h)}:00`,
        inputTokens: s.input,
        outputTokens: s.output,
        totalTokens: s.input + s.output,
        conversations: s.conv,
      }
    })
  }

  // 生成完整范围内的每日数据（按种子循环填充）
  const dailyData = Array.from({ length: days }).map((_, i) => {
    const d = new Date(from.getTime() + i * 86400000)
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    const s = SEEDS[i % SEEDS.length]
    return {
      date: `${y}-${m}-${day}`,
      dateKey:
        groupBy === 'day'
          ? `${y}-${m}-${day}`
          : groupBy === 'month'
            ? `${y}-${m}`
            : `${y}`,
      inputTokens: s.input,
      outputTokens: s.output,
      totalTokens: s.input + s.output,
      conversations: s.conv,
    }
  })

  // 按粒度分组聚合
  const groups = new Map<string, TimeSeriesPoint>()
  for (const d of dailyData) {
    const existing = groups.get(d.dateKey)
    if (existing) {
      existing.inputTokens += d.inputTokens
      existing.outputTokens += d.outputTokens
      existing.totalTokens += d.totalTokens
      existing.conversations += d.conversations
    } else {
      groups.set(d.dateKey, { ...d, date: d.dateKey })
    }
  }
  return Array.from(groups.values())
}

function genFiltered(
  fromKey: string,
  toKey: string,
  groupBy: AutoGroupBy,
): TokenStats {
  const tl = genTimeline(fromKey, toKey, groupBy)
  const inputTokens = tl.reduce((s, t) => s + t.inputTokens, 0)
  const outputTokens = tl.reduce((s, t) => s + t.outputTokens, 0)
  const conversations = tl.reduce((s, t) => s + t.conversations, 0)
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    conversations,
  }
}

function genEntityTimeline(
  fromKey: string,
  toKey: string,
  groupBy: AutoGroupBy,
  entityIds: string[],
): { entityId: string; data: TimeSeriesPoint[] }[] {
  const tl = genTimeline(fromKey, toKey, groupBy)
  return entityIds.map((eid) => {
    const weight = ENTITY_WEIGHTS[eid] ?? 0.3
    const data = tl.map((t) => ({
      date: t.date,
      inputTokens: Math.floor(t.inputTokens * weight),
      outputTokens: Math.floor(t.outputTokens * weight),
      totalTokens: Math.floor(t.totalTokens * weight),
      conversations: Math.floor(t.conversations * weight),
    }))
    return { entityId: eid, data }
  })
}

// ── Recharts 主题色（与全局设计令牌对齐） ─────────────────
const CHART_COLORS = [
  '#d9642a', // --accent
  '#2e6b63', // --accent-2
  '#82715f', // --ink-3（中性棕）
  '#2f7a55', // --ok（绿）
  '#c0453c', // --bad（红）
  '#b77a16', // --warn（琥珀）
]

const tooltipStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-m)',
  fontSize: '12px',
  boxShadow: 'var(--shadow-pop)',
}

// ── 横向堆积柱状图（Token / 对话次数趋势） ────────────────
interface StackedData {
  date: string
  inputTokens: number
  outputTokens: number
  conversations: number
}

function StackedBarChart({
  data,
  colors,
  emptyHint,
}: {
  data: StackedData[]
  colors: [string, string]
  emptyHint?: string
}) {
  if (data.length === 0)
    return (
      <div className="chart-empty-hint" style={{ padding: '60px 0' }}>
        {emptyHint ?? '暂无数据'}
      </div>
    )

  // Y轴日期格式化：按小时→HH:mm，年→完整年份，月→YM，日→MM-DD
  const isHourly = data[0]?.date.includes(':')
  const formatTick = (v: string) => {
    if (isHourly) return v.split(' ')[1]
    if (v.length <= 7) return v // 年 "2026" 或月 "2026-10" 完整显示
    return v.slice(5) // 日 "YYYY-MM-DD" → "MM-DD"
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={data.length > 7 ? Math.max(280, data.length * 24) : 260}
    >
      <RBarChart
        data={data}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        layout="vertical"
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtNum}
          width={52}
        />
        <YAxis
          type="category"
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={formatTick}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => fmtNum(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          name="输入 Token"
          dataKey="inputTokens"
          stackId="stack"
          fill={colors[0]}
          radius={[0, 4, 4, 0]}
          animationDuration={300}
          minPointSize={3}
          barSize={16}
        />
        <Bar
          name="输出 Token"
          dataKey="outputTokens"
          stackId="stack"
          fill={colors[1]}
          radius={[4, 0, 0, 4]}
          animationDuration={300}
          minPointSize={3}
          barSize={16}
        />
      </RBarChart>
    </ResponsiveContainer>
  )
}

// ── 横向堆积柱状图（按时间维度展示，每个实体作为独立堆积段） ──
function EntityStackedBarChart({
  entityData,
  seriesKeys,
  seriesNames,
  colors,
  emptyHint,
}: {
  entityData: Record<string, number | string>[]
  seriesKeys: string[] // 实体 ID 数组
  seriesNames: Record<string, string> // id -> 名称映射
  colors: string[]
  emptyHint?: string
}) {
  if (!entityData || entityData.length === 0)
    return (
      <div className="chart-empty-hint" style={{ padding: '60px 0' }}>
        {emptyHint ?? '暂无数据'}
      </div>
    )

  const isHourly = String(entityData[0]?.date ?? '').includes(':')
  const formatTick = (v: string) => {
    if (isHourly) return v.split(' ')[1]
    if (v.length <= 7) return v // 年 "2026" 或月 "2026-10" 完整显示
    return v.slice(5) // 日 "YYYY-MM-DD" → "MM-DD"
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(260, entityData.length * 24)}
    >
      <RBarChart
        data={entityData}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        layout="vertical"
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtNum}
          width={52}
        />
        <YAxis
          type="category"
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={formatTick}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => fmtNum(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {seriesKeys.map((key, i) => (
          <Bar
            key={key}
            name={seriesNames[key] ?? key}
            dataKey={key}
            stackId="entity-stack"
            fill={colors[i % colors.length]}
            radius={[0, 4, 4, 0]}
            animationDuration={300}
            minPointSize={3}
            barSize={16}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  )
}

// ── KPI 卡片 ────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  warn,
  onClick,
}: {
  label: string
  value: string
  sub?: string
  warn?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={`kpi-card${warn ? 'warn' : ''}${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

// ── 维度过滤器 ──────────────────────────────────────────────
function DimensionFilter({
  dimension,
  selectedIds,
  entities,
  onDimensionChange,
  onIdsChange,
}: {
  dimension: StatsDimension | null
  selectedIds: string[]
  entities: Record<string, DimensionEntity[]>
  onDimensionChange: (d: StatsDimension | null, autoSelectAll: string[]) => void
  onIdsChange: (ids: string[]) => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const dims: { key: StatsDimension; label: string }[] = [
    { key: 'device', label: '设备服务' },
    { key: 'service', label: '模型服务' },
  ]
  const currentEntities = dimension ? (entities[dimension] ?? []) : []
  const toggleDim = (d: StatsDimension) => {
    if (dimension === d) {
      onDimensionChange(null, [])
    } else {
      onDimensionChange(
        d,
        (entities[d] ?? []).map((e) => e.id),
      )
    }
    setDropdownOpen(false)
  }
  const toggleEntity = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    onIdsChange(next)
  }
  return (
    <div className="dim-filter">
      <div className="dim-tabs">
        {dims.map((d) => (
          <button
            key={d.key}
            className={`dim-btn ${dimension === d.key ? 'on' : ''}`}
            onClick={() => toggleDim(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="dim-dropdown-anchor">
        {dimension && currentEntities.length > 0 && (
          <div className="dim-dropdown-wrap" ref={dropdownRef}>
            <button
              className="dim-dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedIds.length === currentEntities.length
                ? `全部${DIMENSION_LABELS[dimension]}`
                : `已选 ${selectedIds.length} / ${currentEntities.length}`}
              <svg
                viewBox="0 0 256 256"
                width="14"
                height="14"
                fill="currentColor"
                style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s',
                }}
              >
                <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="dim-dropdown">
                <div className="dim-dropdown-actions">
                  <button
                    onClick={() =>
                      onIdsChange(currentEntities.map((e) => e.id))
                    }
                  >
                    全选
                  </button>
                  <button onClick={() => onIdsChange([])}>清除</button>
                </div>
                <div className="dim-dropdown-list">
                  {currentEntities.map((entity) => {
                    const checked = selectedIds.includes(entity.id)
                    return (
                      <label
                        key={entity.id}
                        className={`dim-option ${checked ? 'on' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEntity(entity.id)}
                        />
                        <span className="dim-check" />
                        <span className="dim-name">{entity.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 主视图 ──────────────────────────────────────────────────

export function StatsView({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const [fromKey, setFromKey] = useState<string>(TODAY_KEY)
  const [toKey, setToKey] = useState<string>(TODAY_KEY)
  const [dimension, setDimension] = useState<StatsDimension | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 自动统计粒度
  const groupBy = useMemo(() => autoGroupBy(fromKey, toKey), [fromKey, toKey])

  const filteredData = useMemo(
    () => genFiltered(fromKey, toKey, groupBy),
    [fromKey, toKey, groupBy],
  )
  const timeline = useMemo(
    () => genTimeline(fromKey, toKey, groupBy),
    [fromKey, toKey, groupBy],
  )

  // 有维度时：构建多实体图表数据
  const entityChartData = useMemo(() => {
    if (!dimension || selectedIds.length === 0) return null
    const entityTimeline = genEntityTimeline(
      fromKey,
      toKey,
      groupBy,
      selectedIds,
    )
    return timeline.map((t, i) => {
      const row: Record<string, number | string> = { date: t.date }
      for (const { entityId, data } of entityTimeline) {
        row[entityId] = data[i]?.totalTokens ?? 0
      }
      return row
    })
  }, [dimension, selectedIds, fromKey, toKey, groupBy, timeline])

  // 对话次数实体数据
  const entityConvChartData = useMemo(() => {
    if (!dimension || selectedIds.length === 0) return null
    const entityTimeline = genEntityTimeline(
      fromKey,
      toKey,
      groupBy,
      selectedIds,
    )
    return timeline.map((t, i) => {
      const row: Record<string, number | string> = { date: t.date }
      for (const { entityId, data } of entityTimeline) {
        row[entityId] = data[i]?.conversations ?? 0
      }
      return row
    })
  }, [dimension, selectedIds, fromKey, toKey, groupBy, timeline])

  const handleDimensionChange = (
    d: StatsDimension | null,
    autoSelectAll: string[],
  ) => {
    setDimension(d)
    setSelectedIds(autoSelectAll)
  }

  const animKey = `${fromKey}-${toKey}-${groupBy}-${dimension}-${selectedIds.join(',')}`

  return (
    <section data-view="stats" className="on stats-page">
      {/* 总览 */}
      <div className="pcard-block stats-anim-in">
        <h4>总览</h4>
        <div className="pcard-set">
          <div className="kpi-grid-4">
            <KpiCard
              label="Token 总用量"
              value={fmtNum(MOCK_OVERVIEW.totalTokens)}
            />
            <KpiCard
              label="输入Token总用量"
              value={fmtNum(MOCK_OVERVIEW.inputTokens)}
            />
            <KpiCard
              label="输出Token总用量"
              value={fmtNum(MOCK_OVERVIEW.outputTokens)}
            />
            <KpiCard
              label="对话总次数"
              value={fmtNum(MOCK_OVERVIEW.conversations)}
            />
          </div>
        </div>
      </div>

      {/* 模型服务健康状态 */}
      <div
        className="pcard-block stats-anim-in"
        style={{ animationDelay: '60ms' }}
      >
        <h4>模型服务健康状态</h4>
        <div className="pcard-set">
          <div className="health-cards-wrap">
            {MOCK_SERVICE_HEALTH.map((s, i) => (
              <div
                key={s.id}
                className={`health-card ${s.limitReached ? 'warn' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => onNavigate?.('think')}
              >
                <div className="health-card-top">
                  <div className="health-card-name">{s.name}</div>
                  {s.limitReached && (
                    <span className="health-card-badge">限额</span>
                  )}
                </div>
                <div className="health-card-type">
                  {s.type === 'think' ? '思考' : '语音'}
                </div>
                <div className="health-card-usage">
                  {fmtNum(s.tokenUsed)} /{' '}
                  {s.tokenLimit ? fmtNum(s.tokenLimit) : '∞'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 设备服务健康状态 */}
      <div
        className="pcard-block stats-anim-in"
        style={{ animationDelay: '120ms' }}
      >
        <h4>设备服务健康状态</h4>
        <div className="pcard-set">
          <div className="health-cards-wrap">
            {MOCK_DEVICE_HEALTH.map((d, i) => (
              <div
                key={d.id}
                className={`health-card ${d.running ? 'running' : 'stopped'}`}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => onNavigate?.('devices')}
              >
                <div className="health-card-name">{d.name}</div>
                <div className="health-card-status">
                  <span className={`status-dot ${d.running ? 'on' : 'off'}`} />
                  {d.running ? '运行中' : '已停止'}
                </div>
                <div className="health-card-usage">
                  {fmtNum(d.totalTokens)} Token · {d.conversations} 次对话
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 使用统计（带过滤） */}
      <div
        className="pcard-block stats-anim-in"
        style={{ animationDelay: '180ms' }}
      >
        <h4>使用统计</h4>
        <div className="pcard-set">
          <div className="stats-filter-bar">
            <DimensionFilter
              dimension={dimension}
              selectedIds={selectedIds}
              entities={MOCK_ENTITIES}
              onDimensionChange={handleDimensionChange}
              onIdsChange={setSelectedIds}
            />
            <div className="filter-right">
              <QuickRangePicker
                fromKey={fromKey}
                toKey={toKey}
                quickItems={STATS_QUICK_ITEMS}
                onRangeChange={(f, t) => {
                  setFromKey(f)
                  setToKey(t)
                }}
              />
            </div>
          </div>

          {/* 过滤后的卡片 */}
          <div className="kpi-grid-4 stats-filtered-anim" key={animKey}>
            <KpiCard
              label="Token 用量"
              value={fmtNum(filteredData.totalTokens)}
            />
            <KpiCard
              label="输入Token用量"
              value={fmtNum(filteredData.inputTokens)}
            />
            <KpiCard
              label="输出Token用量"
              value={fmtNum(filteredData.outputTokens)}
            />
            <KpiCard
              label="对话次数"
              value={fmtNum(filteredData.conversations)}
            />
          </div>

          {/* 图表区域：横向堆积柱状图 */}
          <div
            className="stats-charts stats-filtered-anim"
            key={`charts-${animKey}`}
          >
            {dimension && selectedIds.length > 0 ? (
              <>
                <div className="stats-chart-card">
                  <h3>Token 使用量（按{DIMENSION_LABELS[dimension]}）</h3>
                  {entityChartData && entityChartData.length > 0 ? (
                    <EntityStackedBarChart
                      entityData={entityChartData}
                      seriesKeys={selectedIds}
                      seriesNames={Object.fromEntries(
                        selectedIds.map((id) => {
                          const ent = MOCK_ENTITIES[dimension]?.find(
                            (e) => e.id === id,
                          )
                          return [id, ent?.name ?? id]
                        }),
                      )}
                      colors={CHART_COLORS}
                      emptyHint="当前时段暂无 Token 使用记录"
                    />
                  ) : (
                    <div
                      className="chart-empty-hint"
                      style={{ padding: '60px 0' }}
                    >
                      当前时段暂无 Token 使用记录
                    </div>
                  )}
                </div>
                <div className="stats-chart-card">
                  <h3>对话次数（按{DIMENSION_LABELS[dimension]}）</h3>
                  {entityConvChartData && entityConvChartData.length > 0 ? (
                    <EntityStackedBarChart
                      entityData={entityConvChartData}
                      seriesKeys={selectedIds}
                      seriesNames={Object.fromEntries(
                        selectedIds.map((id) => {
                          const ent = MOCK_ENTITIES[dimension]?.find(
                            (e) => e.id === id,
                          )
                          return [id, ent?.name ?? id]
                        }),
                      )}
                      colors={CHART_COLORS}
                      emptyHint="当前时段暂无对话记录"
                    />
                  ) : (
                    <div
                      className="chart-empty-hint"
                      style={{ padding: '60px 0' }}
                    >
                      当前时段暂无对话记录
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="stats-chart-card">
                  <h3>Token 使用量</h3>
                  <StackedBarChart
                    data={timeline as StackedData[]}
                    colors={['#d9642a', '#2e6b63']}
                    emptyHint="当前时段暂无 Token 使用记录"
                  />
                </div>
                <div className="stats-chart-card">
                  <h3>对话次数</h3>
                  <StackedBarChart
                    data={timeline.map((t) => ({
                      date: t.date,
                      inputTokens: Math.floor(t.conversations * 0.6),
                      outputTokens: Math.floor(t.conversations * 0.4),
                      conversations: t.conversations,
                    }))}
                    colors={['#d9642a', '#2e6b63']}
                    emptyHint="当前时段暂无对话记录"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
