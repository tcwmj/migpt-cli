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
  TokenStats,
  StatsResponse,
} from '../apis.ts'
import { DIMENSION_LABELS, getStats } from '../apis.ts'
import type { View } from '../constants.ts'
import { QuickRangePicker } from '../components/QuickRangePicker.tsx'
import type { QuickRangeItem } from '../components/QuickRangeFilter.tsx'

// ── 格式化工具 ──────────────────────────────────────────────
const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

// ── 日期工具 ────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
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
    { key: 'role', label: '对话角色' },
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

  // 统计数据状态
  const [statsData, setStatsData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // 获取统计数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params: {
          from: string
          to: string
          dimension?: StatsDimension
          ids?: string[]
        } = {
          from: fromKey,
          to: toKey,
        }

        if (dimension && selectedIds.length > 0) {
          params.dimension = dimension
          params.ids = selectedIds
        }

        const data = await getStats(params)
        setStatsData(data)

        // 如果维度切换后没有选中项，自动选中全部
        if (dimension && selectedIds.length === 0 && data.entities[dimension]) {
          setSelectedIds(data.entities[dimension].map((e) => e.id))
        }
      } catch (err) {
        console.error('获取统计数据失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [fromKey, toKey, dimension])

  // 当维度变化时，重新获取数据
  useEffect(() => {
    if (!dimension || !statsData) return

    const entities = statsData.entities[dimension]
    if (entities && selectedIds.length === 0) {
      setSelectedIds(entities.map((e) => e.id))
    }
  }, [dimension, statsData])

  // 有维度时：构建多实体图表数据
  const entityChartData = useMemo(() => {
    if (!dimension || selectedIds.length === 0 || !statsData?.entityTimelines)
      return null

    // 获取所有时间点
    const allDates = new Set<string>()
    for (const id of selectedIds) {
      const timeline = statsData.entityTimelines[id] || []
      for (const point of timeline) {
        allDates.add(point.date)
      }
    }

    const sortedDates = Array.from(allDates).sort()

    return sortedDates.map((date) => {
      const row: Record<string, number | string> = { date }
      for (const id of selectedIds) {
        const timeline = statsData.entityTimelines[id] || []
        const point = timeline.find((p) => p.date === date)
        row[id] = point?.totalTokens ?? 0
      }
      return row
    })
  }, [dimension, selectedIds, statsData])

  // 对话次数实体数据
  const entityConvChartData = useMemo(() => {
    if (!dimension || selectedIds.length === 0 || !statsData?.entityTimelines)
      return null

    // 获取所有时间点
    const allDates = new Set<string>()
    for (const id of selectedIds) {
      const timeline = statsData.entityTimelines[id] || []
      for (const point of timeline) {
        allDates.add(point.date)
      }
    }

    const sortedDates = Array.from(allDates).sort()

    return sortedDates.map((date) => {
      const row: Record<string, number | string> = { date }
      for (const id of selectedIds) {
        const timeline = statsData.entityTimelines[id] || []
        const point = timeline.find((p) => p.date === date)
        row[id] = point?.conversations ?? 0
      }
      return row
    })
  }, [dimension, selectedIds, statsData])

  const handleDimensionChange = (
    d: StatsDimension | null,
    autoSelectAll: string[],
  ) => {
    setDimension(d)
    setSelectedIds(autoSelectAll)
  }

  const animKey = `${fromKey}-${toKey}-${dimension}-${selectedIds.join(',')}`

  // 空数据占位
  const emptyStats: TokenStats = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    conversations: 0,
  }

  const totals = statsData?.totals ?? emptyStats
  const filtered = statsData?.filtered ?? emptyStats
  const timeline = statsData?.timeline ?? []
  const serviceHealth = statsData?.serviceHealth ?? []
  const deviceHealth = statsData?.deviceHealth ?? []
  const entities = statsData?.entities ?? {}

  return (
    <section data-view="stats" className="on stats-page">
      {/* 总览 */}
      <div className="pcard-block stats-anim-in">
        <h4>总览</h4>
        <div className="pcard-set">
          <div className="kpi-grid-4">
            <KpiCard label="Token 总用量" value={fmtNum(totals.totalTokens)} />
            <KpiCard
              label="输入Token总用量"
              value={fmtNum(totals.inputTokens)}
            />
            <KpiCard
              label="输出Token总用量"
              value={fmtNum(totals.outputTokens)}
            />
            <KpiCard label="对话总次数" value={fmtNum(totals.conversations)} />
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
            {serviceHealth.length === 0 ? (
              <div className="chart-empty-hint" style={{ padding: '40px 0' }}>
                暂无服务数据
              </div>
            ) : (
              serviceHealth.map((s, i) => (
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
              ))
            )}
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
            {deviceHealth.length === 0 ? (
              <div className="chart-empty-hint" style={{ padding: '40px 0' }}>
                暂无设备数据
              </div>
            ) : (
              deviceHealth.map((d, i) => (
                <div
                  key={d.id}
                  className={`health-card ${d.running ? 'running' : 'stopped'}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => onNavigate?.('devices')}
                >
                  <div className="health-card-name">{d.name}</div>
                  <div className="health-card-status">
                    <span
                      className={`status-dot ${d.running ? 'on' : 'off'}`}
                    />
                    {d.running ? '运行中' : '已停止'}
                  </div>
                  <div className="health-card-usage">
                    {fmtNum(d.totalTokens)} Token · {d.conversations} 次对话
                  </div>
                </div>
              ))
            )}
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
              entities={entities}
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
            <KpiCard label="Token 用量" value={fmtNum(filtered.totalTokens)} />
            <KpiCard
              label="输入Token用量"
              value={fmtNum(filtered.inputTokens)}
            />
            <KpiCard
              label="输出Token用量"
              value={fmtNum(filtered.outputTokens)}
            />
            <KpiCard label="对话次数" value={fmtNum(filtered.conversations)} />
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
                          const ent = entities[dimension]?.find(
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
                          const ent = entities[dimension]?.find(
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
                  {loading ? (
                    <div
                      className="chart-empty-hint"
                      style={{ padding: '60px 0' }}
                    >
                      加载中...
                    </div>
                  ) : (
                    <StackedBarChart
                      data={timeline as StackedData[]}
                      colors={['#d9642a', '#2e6b63']}
                      emptyHint="当前时段暂无 Token 使用记录"
                    />
                  )}
                </div>
                <div className="stats-chart-card">
                  <h3>对话次数</h3>
                  {loading ? (
                    <div
                      className="chart-empty-hint"
                      style={{ padding: '60px 0' }}
                    >
                      加载中...
                    </div>
                  ) : (
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
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
