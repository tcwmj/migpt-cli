/* ══ SysLogsView ══ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DatePicker3 } from '@blueprintjs/datetime2'
import * as api from '../apis.ts'
import { I } from '../icons.tsx'
import { Button, Switch } from '../components/atoms/index.ts'

const pad2 = (n: number) => String(n).padStart(2, '0')
/** 日期键（yyyyMMdd，与服务端日志文件名一致） */
const keyOf = (d: Date) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
const dateOfKey = (k: string) =>
  new Date(Number(k.slice(0, 4)), Number(k.slice(4, 6)) - 1, Number(k.slice(6, 8)))

export function SysLogsView(props: {
  query?: string
  onToast?: (msg: string) => void
}) {
  const todayKey = keyOf(new Date())
  const [lines, setLines] = useState<string[] | null>(null)
  const [live, setLive] = useState(true)
  const [askClear, setAskClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  // 查看日期（默认当天=实时日志）；logDates 为有日志落盘的日期集合（日历置灰依据）
  const [dateKey, setDateKey] = useState(todayKey)
  const [logDates, setLogDates] = useState<Set<string> | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const load = useCallback(() => {
    api
      .getSystemLogs(400, dateKey)
      .then((r) => {
        setLines(r.lines)
      })
      .catch(() => setLines([]))
  }, [dateKey])
  const loadDates = useCallback(() => {
    api
      .getSystemLogDates()
      .then((r) => setLogDates(new Set(r.dates)))
      .catch(() => setLogDates(new Set()))
  }, [])
  useEffect(() => {
    loadDates()
  }, [loadDates])
  useEffect(() => {
    load()
    // 仅当天开启实时轮询；历史日期为静态文件内容
    if (!live || dateKey !== todayKey) return
    const t = window.setInterval(load, 2000)
    return () => window.clearInterval(t)
  }, [load, live, dateKey, todayKey])
  useEffect(() => {
    const el = boxRef.current
    if (el && lines) el.scrollTop = el.scrollHeight
  }, [lines])
  const q = (props.query || '').trim().toLowerCase()
  const shown = useMemo(
    () =>
      lines ? lines.filter((l) => !q || l.toLowerCase().includes(q)) : null,
    [lines, q],
  )
  const levelOf = (line: string) =>
    /\[ERROR\]/.test(line) ? 'err' : /\[WARN\]/.test(line) ? 'warn' : 'info'
  return (
    <section data-view="syslogs" className="on">
      <div className="syslog">
        <div className="filters">
          <DatePicker3
            value={dateOfKey(dateKey)}
            onChange={(d) => d && setDateKey(keyOf(d))}
            maxDate={new Date()}
            shortcuts={false}
            className="syslog-date"
            dayPickerProps={{
              // 当天始终可选（实时日志在内存缓冲）；其余日期仅在有落盘日志时可选
              disabled: (day) =>
                keyOf(day) !== todayKey &&
                (logDates === null || !logDates.has(keyOf(day))),
              modifiers: {
                noLog: (day) => keyOf(day) !== todayKey && !logDates?.has(keyOf(day)),
              },
              modifiersClassNames: { noLog: 'syslog-no-log-day' },
              showOutsideDays: false,
            }}
          />
          <label
            className="switch-inline"
            title="开启后每 2 秒自动刷新最新日志；关闭即暂停实时日志，保留当前画面"
          >
            <span className="k">自动刷新</span>
            <Switch checked={live} onChange={(v) => setLive(v)} as="span" />
          </label>
          <span className="sp" />
          <Button
            variant="ghost danger"
            icon="trash"
            onClick={() => setAskClear(true)}
            disabled={clearing}
          >
            清理日志
          </Button>
          <Button icon="download" onClick={() => api.downloadSystemLogs(dateKey)}>
            下载日志
          </Button>
        </div>
        <div className="syslog-box" ref={boxRef}>
          {shown === null ? (
            <div className="syslog-empty">正在加载日志…</div>
          ) : shown.length === 0 ? (
            <div className="syslog-empty">
              {q ? '没有匹配的日志行' : '暂无系统日志'}
            </div>
          ) : (
            shown.map((l, i) => (
              <div className={'syslog-line ' + levelOf(l)} key={i}>
                {l}
              </div>
            ))
          )}
        </div>
      </div>
      {askClear && (
        <>
          <div className="scrim on" onClick={() => setAskClear(false)} />
          <div className="modal on">
            <h3>
              <I n="trash" size={18} /> 清理系统日志
            </h3>
            <div className="desc">
              将删除全部历史日志数据，并清空实时日志内容，此操作无法恢复。是否继续？
            </div>
            <div className="acts">
              <span className="sp" />
              <Button variant="ghost" onClick={() => setAskClear(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                icon="trash"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true)
                  try {
                    await api.clearSystemLogs()
                    setLines([])
                    setAskClear(false)
                    // 全部日志已删除：回到当天并刷新可选日期集合
                    setDateKey(todayKey)
                    loadDates()
                    props.onToast?.('系统日志已清理')
                  } catch (e) {
                    props.onToast?.(e instanceof Error ? e.message : String(e))
                  } finally {
                    setClearing(false)
                  }
                }}
              >
                清理
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
