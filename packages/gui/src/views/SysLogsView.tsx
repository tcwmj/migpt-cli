/* ══ SysLogsView ══ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../apis.ts'
import { I } from '../icons.tsx'
import { Button, Switch } from '../components/atoms/index.ts'

export function SysLogsView(props: {
  query?: string
  onToast?: (msg: string) => void
}) {
  const [lines, setLines] = useState<string[] | null>(null)
  const [live, setLive] = useState(true)
  const [askClear, setAskClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const load = useCallback(() => {
    api
      .getSystemLogs(400)
      .then((r) => {
        setLines(r.lines)
      })
      .catch(() => setLines([]))
  }, [])
  useEffect(() => {
    load()
    if (!live) return
    const t = window.setInterval(load, 2000)
    return () => window.clearInterval(t)
  }, [load, live])
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
          <Button icon="download" onClick={() => api.downloadSystemLogs()}>
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
