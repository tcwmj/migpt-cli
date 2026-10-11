/* ══ ChatLogsView ══ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import { type DeviceRow, type LogEntry, type SpeakerModel } from '../apis.ts'
import { I } from '../icons.tsx'
import { Chip, EmptyState, Switch } from '../components/atoms/index.ts'
import { LogRow } from '../components/LogRow.tsx'
import { QuickRangePicker } from '../components/QuickRangePicker.tsx'
import type { QuickRangeItem } from '../components/QuickRangeFilter.tsx'

// ── 日期工具（与系统日志页一致） ─────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0')
const TODAY_KEY = `${new Date().getFullYear()}${pad2(
  new Date().getMonth() + 1,
)}${pad2(new Date().getDate())}`
const qKeyOf = (d: Date) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`

// 快捷时段选项（今天 / 最近 N 天 / 本月 / 今年）
const LOGS_QUICK_ITEMS: QuickRangeItem[] = [
  { id: 'today', label: '今天', toRange: () => [TODAY_KEY, TODAY_KEY] },
  {
    id: 'last_3d',
    label: '最近 3 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 2)
      return [qKeyOf(s), TODAY_KEY]
    },
  },
  {
    id: 'last_7d',
    label: '最近 7 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 6)
      return [qKeyOf(s), TODAY_KEY]
    },
  },
  {
    id: 'last_30d',
    label: '最近 30 天',
    toRange: () => {
      const s = new Date()
      s.setDate(s.getDate() - 29)
      return [qKeyOf(s), TODAY_KEY]
    },
  },
  {
    id: 'this_month',
    label: '本月',
    toRange: () => {
      const n = new Date()
      return [qKeyOf(new Date(n.getFullYear(), n.getMonth(), 1)), TODAY_KEY]
    },
  },
  {
    id: 'this_year',
    label: '今年',
    toRange: () => {
      const n = new Date()
      return [qKeyOf(new Date(n.getFullYear(), 0, 1)), TODAY_KEY]
    },
  },
]

export function ChatLogsView(props: {
  devices: DeviceRow[]
  models: SpeakerModel[]
}) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [devFilter, setDevFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<
    'all' | 'user' | 'ai' | 'system'
  >('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState(true)
  // 日期范围筛选（复用统计/系统日志页的日历组件）；默认今天
  const [fromKey, setFromKey] = useState(TODAY_KEY)
  const [toKey, setToKey] = useState(TODAY_KEY)
  const [logDates, setLogDates] = useState<Set<string> | null>(null)
  const single = fromKey === toKey
  const viewingToday = single && fromKey === TODAY_KEY
  const load = useCallback(() => {
    setBusy(true)
    api
      .getLogs(
        2000,
        single ? fromKey : undefined,
        single ? undefined : fromKey,
        single ? undefined : toKey,
      )
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
      .finally(() => setBusy(false))
  }, [fromKey, toKey, single])
  // 加载有对话记录的日期集合，供日历高亮/置灰
  const loadDates = useCallback(() => {
    api
      .getLogDates()
      .then((r) => setLogDates(new Set(r.dates)))
      .catch(() => setLogDates(new Set()))
  }, [])
  useEffect(load, [load])
  useEffect(loadDates, [loadDates])
  useEffect(() => {
    if (!live || !viewingToday) return
    const t = window.setInterval(load, 5000)
    return () => window.clearInterval(t)
  }, [live, viewingToday, load])
  const list = useMemo(() => {
    if (!logs) return null
    return logs.filter(
      (l) =>
        (devFilter === 'all' || l.deviceId === devFilter) &&
        (kindFilter === 'all' || l.kind === kindFilter),
    )
  }, [logs, devFilter, kindFilter])
  const kindLabel = {
    user: '用户提问',
    ai: '设备回复',
    system: '设备日志',
  } as const
  const deviceById = (id: string) => props.devices.find((d) => d.id === id)
  const kindCounts = useMemo(() => {
    if (!logs) return { all: 0, user: 0, ai: 0, system: 0 }
    const filtered =
      devFilter === 'all' ? logs : logs.filter((l) => l.deviceId === devFilter)
    return {
      all: filtered.length,
      user: filtered.filter((l) => l.kind === 'user').length,
      ai: filtered.filter((l) => l.kind === 'ai').length,
      system: filtered.filter((l) => l.kind === 'system').length,
    }
  }, [logs, devFilter])
  const selDevName =
    devFilter === 'all' ? '全部设备' : deviceById(devFilter)?.alias || devFilter
  return (
    <section data-view="logs" className="on">
      <div className="split">
        <aside className="slist">
          <div className="filters">
            <Chip on={devFilter === 'all'} onClick={() => setDevFilter('all')}>
              全部设备 {props.devices.length}
            </Chip>
            <span className="sp" />
          </div>
          {props.devices.map((d) => {
            const m = props.models.find(
              (x) => x.id === d.speakerModel || x.name === d.speakerModel,
            )
            return (
              <div
                key={d.id}
                className={'li' + (devFilter === d.id ? ' on' : '')}
                onClick={() => setDevFilter(d.id)}
              >
                <span className="ic">
                  {m?.imageUrl ? (
                    <img className="thumb" src={m.imageUrl} alt="" />
                  ) : (
                    <I n="speaker" />
                  )}
                </span>
                <span className="txt">
                  <b>{d.alias}</b>
                  <span>{d.did}</span>
                </span>
                <span className="count">
                  {logs ? logs.filter((l) => l.deviceId === d.id).length : 0} 条
                </span>
              </div>
            )
          })}
        </aside>
        <section
          className="sdetail"
          key={'logs-' + devFilter + '-' + kindFilter}
        >
          <div className="filters">
            <Chip
              on={kindFilter === 'all'}
              onClick={() => setKindFilter('all')}
            >
              全部对话 {kindCounts.all}
            </Chip>
            <Chip
              on={kindFilter === 'user'}
              onClick={() => setKindFilter('user')}
            >
              用户提问 {kindCounts.user}
            </Chip>
            <Chip on={kindFilter === 'ai'} onClick={() => setKindFilter('ai')}>
              设备回复 {kindCounts.ai}
            </Chip>
            <Chip
              on={kindFilter === 'system'}
              onClick={() => setKindFilter('system')}
            >
              设备日志 {kindCounts.system}
            </Chip>
            <span className="sp" />
            {!viewingToday && <span className="tb-tag">历史记录</span>}
            <QuickRangePicker
              fromKey={fromKey}
              toKey={toKey}
              logDates={logDates}
              quickItems={LOGS_QUICK_ITEMS}
              onRangeChange={(f, t) => {
                setFromKey(f)
                setToKey(t)
              }}
            />
            <label
              className="switch-inline"
              title={
                viewingToday
                  ? '开启后每 5 秒自动刷新对话记录'
                  : '历史/范围记录为静态快照，仅当天实时模式支持自动刷新'
              }
            >
              <span
                className="live-dot"
                data-on={live && viewingToday ? '1' : '0'}
              />
              <span className="k">自动刷新</span>
              <Switch
                checked={live}
                onChange={(v) => setLive(v)}
                disabled={!viewingToday}
                as="span"
              />
            </label>
          </div>

          {list === null ? (
            <div className="panel">
              <div className="loading">
                <div className="skel" />
                <div className="skel" />
                <div className="skel" />
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon="log"
                title={
                  logs && logs.length === 0
                    ? '还没有对话记录'
                    : '没有符合条件的记录'
                }
                desc={
                  logs && logs.length === 0
                    ? viewingToday && logDates && logDates.size > 0
                      ? '今天还没有对话记录，点击右上角日历选择高亮的日期查看历史对话。'
                      : '唤醒音箱开始对话后，这里会按时间记录每台音箱的问答，方便你复盘每次交互。'
                    : '换一个筛选条件，或点击右上角刷新。'
                }
              />
            </div>
          ) : (
            <div className="logs">
              {list.map((l, i) => {
                // 获取实际的设备名称，而不是统一显示"全部设备"
                const actualDevName =
                  devFilter === 'all'
                    ? deviceById(l.deviceId)?.alias || l.deviceId || '未知设备'
                    : selDevName
                return (
                  <LogRow
                    key={i}
                    l={l}
                    multi={l.text.includes('\n')}
                    devName={actualDevName}
                    kindLabel={kindLabel[l.kind]}
                    onToggle={(open) => {
                      setExpanded((prev) => {
                        const next = new Set(prev)
                        if (open) next.add(i)
                        else next.delete(i)
                        return next
                      })
                    }}
                    open={expanded.has(i)}
                  />
                )
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
