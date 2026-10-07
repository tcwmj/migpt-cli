/* ══ LogsView ══ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from '../apis.ts'
import { type DeviceRow, type LogEntry, type SpeakerModel } from '../apis.ts'
import { I } from '../icons.tsx'
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
  const load = useCallback(() => {
    setBusy(true)
    api
      .getLogs(300)
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
      .finally(() => setBusy(false))
  }, [])
  useEffect(load, [load])
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
  const selDevName =
    devFilter === 'all' ? '全部设备' : deviceById(devFilter)?.alias || devFilter
  return (
    <section data-view="logs" className="on">
      <div className="split">
        <aside className="slist">
          <div className="filters">
            <span
              className={'chip' + (devFilter === 'all' ? ' on' : '')}
              onClick={() => setDevFilter('all')}
            >
              全部设备
            </span>
            <span className="sp">
              <span className="count">共 {props.devices.length} 台</span>
            </span>
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
            <span
              className={'chip' + (kindFilter === 'all' ? ' on' : '')}
              onClick={() => setKindFilter('all')}
            >
              全部对话
            </span>
            <span
              className={'chip' + (kindFilter === 'user' ? ' on' : '')}
              onClick={() => setKindFilter('user')}
            >
              用户提问
            </span>
            <span
              className={'chip' + (kindFilter === 'ai' ? ' on' : '')}
              onClick={() => setKindFilter('ai')}
            >
              设备回复
            </span>
            <span
              className={'chip' + (kindFilter === 'system' ? ' on' : '')}
              onClick={() => setKindFilter('system')}
            >
              设备日志
            </span>
            <span className="sp" />
            <button
              className="icon-btn"
              title="刷新"
              disabled={busy}
              onClick={load}
            >
              <I n="refresh" size={16} />
            </button>
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
              <div className="empty">
                <div className="art">
                  <I n="log" size={26} />
                </div>
                <b>
                  {logs && logs.length === 0
                    ? '还没有对话记录'
                    : '没有符合条件的记录'}
                </b>
                <span>
                  {logs && logs.length === 0
                    ? '唤醒音箱开始对话后，这里会按时间记录每台音箱的问答，方便你复盘每次交互。'
                    : '换一个筛选条件，或点击右上角刷新。'}
                </span>
              </div>
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
