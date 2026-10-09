/* ══ LogsView ══ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import { type DeviceRow, type LogEntry, type SpeakerModel } from '../apis.ts'
import { I } from '../icons.tsx'
import { Chip, EmptyState, Switch } from '../components/atoms/index.ts'
import { LogRow } from '../components/LogRow.tsx'

export function LogsView(props: {
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
  const load = useCallback(() => {
    setBusy(true)
    api
      .getLogs(300)
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
      .finally(() => setBusy(false))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(load, 5000)
    return () => window.clearInterval(t)
  }, [live, load])
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
            <label
              className="switch-inline"
              title="开启后每 5 秒自动刷新对话记录"
            >
              <span className="live-dot" data-on={live ? '1' : '0'} />
              <span className="k">自动刷新</span>
              <Switch checked={live} onChange={(v) => setLive(v)} as="span" />
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
                    ? '唤醒音箱开始对话后，这里会按时间记录每台音箱的问答，方便你复盘每次交互。'
                    : '换一个筛选条件，或点击右上角刷新。'
                }
              />
            </div>
          ) : (
            <div className="logs">
              {list.map((l, i) => (
                <LogRow
                  key={i}
                  l={l}
                  multi={l.text.includes('\n')}
                  devName={selDevName}
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
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
