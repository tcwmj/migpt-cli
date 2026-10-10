/* ══ Drawer ══ */
import { useState } from 'react'
import {
  type Account,
  type BindingRow,
  type DeviceDetail,
  type Role,
  type Room,
  type SpeakerModel,
  type ThinkService,
  type VoiceService,
} from '../apis.ts'
import { I } from '../icons.tsx'
import { Button } from './atoms/index.ts'
import { coverOf } from '../utils.ts'

export function Drawer(props: {
  detail: DeviceDetail
  running?: boolean
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  accounts: Account[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onRestart: () => void
  onRemove: () => void
  onEdit: () => void
}) {
  const { detail, models } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const m = detail.meta
  const rows: BindingRow[] = detail.bindings?.rows || []
  const rowIcon = (key: BindingRow['key']) =>
    key === 'account'
      ? 'user'
      : key === 'role'
        ? 'chat'
        : key === 'think'
          ? 'bolt'
          : 'mic'
  const rowType = (key: BindingRow['key']) =>
    key === 'think' ? ' t' : key === 'voice' ? ' v' : ''
  const srcClass = (s: BindingRow['source']) =>
    s === 'device' ? ' ovr' : s === 'global' ? ' glb' : ''
  return (
    <>
      <div
        className={'scrim on' + (closing ? ' closing' : '')}
        style={{ zIndex: 55 }}
        onClick={() => close()}
      />
      <aside className={'drawer on' + (closing ? ' closing' : '')}>
        <div className="dh">
          <span
            className="cover"
            style={{ backgroundImage: `url(${coverOf(m.alias, m.did)})` }}
          />
          <span>
            <b>{m.alias}</b>
            <span>
              {(() => {
                const r = m.speakerModel
                const mm = r
                  ? models.find((x) => x.id === r || x.name === r)
                  : null
                return (mm ? mm.name : r || '智能音箱') + ' · ' + m.did
              })()}
            </span>
          </span>
          <button className="icon-btn x" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="db">
          <div>
            <h4>
              <I n="lock" size={14} /> 绑定链 · 优先级：设备指定 &gt; 角色指定
              &gt; 全局默认
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 10,
              }}
            >
              {rows.map((r) => (
                <div className="bind-row" key={r.key}>
                  <span className={'ic' + rowType(r.key)}>
                    <I n={rowIcon(r.key)} size={15} />
                  </span>
                  <span className="lbl">
                    <b>{r.label}</b>
                    <span>{r.detail || ''}</span>
                  </span>
                  <span className="to">→</span>
                  <span className="val">{r.name}</span>
                  <span className={'src' + srcClass(r.source)}>
                    {r.sourceLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4>
              <I n="info" size={14} /> 关键参数
            </h4>
            <div className="kv" style={{ marginTop: 10 }}>
              <div className="kr">
                <span className="k">did</span>
                <span className="vv">{m.did}</span>
              </div>
              <div className="kr">
                <span className="k">型号</span>
                <span className="vv">
                  {(() => {
                    const r = m.speakerModel
                    const mm = r
                      ? models.find((x) => x.id === r || x.name === r)
                      : null
                    return mm ? `${mm.name}（${mm.did}）` : r || '—'
                  })()}
                </span>
              </div>
              <div className="kr">
                <span className="k">所属账号</span>
                <span className="vv">
                  {props.accounts.find((a) => a.id === m.accountId)?.name ||
                    '未绑定'}
                </span>
              </div>
              <div className="kr">
                <span className="k">服务状态</span>
                <span className="vv">
                  {props.running ? '运行中' : '未启动'}
                </span>
              </div>
              <div className="kr">
                <span className="k">连续对话</span>
                <span className="vv">
                  {(() => {
                    const mm = m.speakerModel
                      ? models.find(
                          (x) =>
                            x.id === m.speakerModel ||
                            x.name === m.speakerModel,
                        )
                      : null
                    if (!mm) return '—'
                    if (!mm.consecutive) return '未启用（型号不支持）'
                    return mm.playingCommand?.length
                      ? '启用 · 支持播放状态检测'
                      : '启用 · 依赖 Mina 检测播放状态'
                  })()}
                </span>
              </div>
              <div className="kr">
                <span className="k">会话群</span>
                <span className="vv">
                  {(() => {
                    const rm = m.roomRef
                      ? props.rooms.find((x) => x.id === m.roomRef)
                      : null
                    return rm
                      ? `${rm.name}${rm.description ? ' · ' + rm.description : ''}`
                      : m.roomName
                        ? m.roomName
                        : '—'
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="acts">
          <Button
            variant="ghost"
            icon="pencil"
            onClick={() => close(props.onEdit)}
          >
            编辑绑定
          </Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={() => close(props.onRemove)}
          >
            解绑设备
          </Button>
          <span className="sp" />
          <Button
            variant="primary"
            icon="refresh"
            onClick={() => close(props.onRestart)}
          >
            重启设备
          </Button>
        </div>
      </aside>
    </>
  )
}
