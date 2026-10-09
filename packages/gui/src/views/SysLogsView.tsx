/* ══ SysLogsView ══ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../apis.ts'
import { I } from '../icons.tsx'
import { Button, Switch } from '../components/atoms/index.ts'
import { LogDateFilter } from '../components/LogDateFilter.tsx'

const TODAY_KEY = ((d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`)(
  new Date(),
)

export function SysLogsView(props: {
  query?: string
  onToast?: (msg: string) => void
}) {
  const todayKey = TODAY_KEY
  const [lines, setLines] = useState<string[] | null>(null)
  const [live, setLive] = useState(true)
  const [askClear, setAskClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [fromKey, setFromKey] = useState(todayKey)
  const [toKey, setToKey] = useState(todayKey)
  const [logDates, setLogDates] = useState<Set<string> | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const q = (props.query || '').trim()
  const single = fromKey === toKey
  const viewingToday = single && fromKey === todayKey

  const load = useCallback(() => {
    const req = q
      ? api.searchSystemLogs(fromKey, toKey, q).then((r) => r.lines)
      : api
          .getSystemLogs(
            400,
            single ? fromKey : undefined,
            single ? undefined : fromKey,
            single ? undefined : toKey,
          )
          .then((r) => r.lines)
    req.then(setLines).catch(() => setLines([]))
  }, [fromKey, toKey, single, q])

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
    if (!live || !viewingToday || q) return
    const t = window.setInterval(load, 2000)
    return () => window.clearInterval(t)
  }, [load, live, viewingToday, q])

  useEffect(() => {
    const el = boxRef.current
    if (el && lines) el.scrollTop = el.scrollHeight
  }, [lines])

  const lower = q.toLowerCase()
  const shown = useMemo(
    () =>
      lines && !q
        ? lines.filter((l) => l.toLowerCase().includes(lower))
        : lines,
    [lines, q, lower],
  )

  const levelOf = (line: string) =>
    /\[ERROR\]/.test(line) ? 'err' : /\[WARN\]/.test(line) ? 'warn' : 'info'

  const rangeLabel = single
    ? ((k: string) => {
        const d = new Date(
          Number(k.slice(0, 4)),
          Number(k.slice(4, 6)) - 1,
          Number(k.slice(6, 8)),
        )
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })(fromKey)
    : `${((k: string) => {
        const d = new Date(
          Number(k.slice(0, 4)),
          Number(k.slice(4, 6)) - 1,
          Number(k.slice(6, 8)),
        )
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })(fromKey)} ~ ${((k: string) => {
        const d = new Date(
          Number(k.slice(0, 4)),
          Number(k.slice(4, 6)) - 1,
          Number(k.slice(6, 8)),
        )
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })(toKey)}`

  return (
    <section data-view="syslogs" className="on">
      <div className="syslog">
        <div className="syslog-toolbar">
          <label
            className="switch-inline"
            title={
              viewingToday && !q
                ? '开启后每 2 秒自动刷新最新日志；关闭即暂停实时日志，保留当前画面'
                : '历史/范围日志与搜索结果为静态快照，仅当天实时模式支持自动刷新'
            }
          >
            <span
              className="live-dot"
              data-on={live && viewingToday && !q ? '1' : '0'}
            />
            <span className="k">自动刷新</span>
            <Switch
              checked={live}
              onChange={(v) => setLive(v)}
              disabled={!viewingToday || !!q}
              as="span"
            />
          </label>
          {!viewingToday && <span className="tb-tag">历史日志</span>}
          <div className="tb-right">
            <LogDateFilter
              fromKey={fromKey}
              toKey={toKey}
              logDates={logDates}
              onRangeChange={(f, t) => {
                setFromKey(f)
                setToKey(t)
              }}
            />
            <Button
              icon="download"
              onClick={() =>
                single
                  ? api.downloadSystemLogs(fromKey)
                  : api.downloadSystemLogs(undefined, fromKey, toKey)
              }
            >
              下载日志
            </Button>
            <Button
              variant="ghost danger"
              icon="trash"
              onClick={() => setAskClear(true)}
              disabled={clearing}
            >
              清理日志
            </Button>
          </div>
        </div>
        <div className="syslog-box" ref={boxRef}>
          {shown === null ? (
            <div className="syslog-empty">正在加载日志…</div>
          ) : shown.length === 0 ? (
            <div className="syslog-empty">
              {q
                ? `在 ${rangeLabel} 范围内没有匹配「${q}」的日志`
                : '暂无系统日志'}
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
                    setFromKey(todayKey)
                    setToKey(todayKey)
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
