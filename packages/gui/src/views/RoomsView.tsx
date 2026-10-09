/* ══ RoomsView ══ */
import { useEffect, useState } from 'react'
import { type DeviceRow, type Room } from '../apis.ts'
import { I } from '../icons.tsx'
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Tag,
} from '../components/atoms/index.ts'

export function RoomsView(props: {
  rooms: Room[]
  allRooms: Room[]
  devices: DeviceRow[]
  onSave: (r: Room) => void
  onCreate: (r: Partial<Room>) => Promise<Room | null> | void
  onDelete: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.rooms[0]?.id || null)
  const sel = props.allRooms.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<{ name: string; description: string }>({
    name: sel?.name || '',
    description: sel?.description || '',
  })
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    setDraft({ name: sel?.name || '', description: sel?.description || '' })
    setEdit(false)
  }, [selId, sel?.name, sel?.description])
  const startCreate = () => {
    setSelId(null)
    setDraft({ name: '', description: '' })
    setEdit(true)
    setCreating(true)
  }
  const cancel = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (props.allRooms.length) setSelId(props.allRooms[0].id)
      else setDraft({ name: '', description: '' })
      return
    }
    setEdit(false)
    setDraft({ name: sel?.name || '', description: sel?.description || '' })
  }
  const save = async () => {
    const name = draft.name.trim()
    if (!name) {
      window.alert('会话群名称必填')
      return
    }
    if (creating) {
      const created = await props.onCreate({
        name,
        description: draft.description.trim() || undefined,
      })
      if (created) {
        setCreating(false)
        setEdit(false)
        setSelId(created.id)
      }
      return
    }
    if (sel) {
      props.onSave({
        ...sel,
        name,
        description: draft.description.trim() || undefined,
      })
      setEdit(false)
    }
  }
  return (
    <section data-view="rooms" className="on">
      <div className="filters">
        <Chip on>全部会话群 {props.rooms.length}</Chip>
        <span className="sp" />
      </div>
      <div className="split">
        <aside className="slist">
          {props.rooms.map((r) => {
            const used = props.devices.filter((d) => d.roomRef === r.id).length
            return (
              <div
                key={r.id}
                className={'li' + (r.id === selId ? ' on' : '')}
                onClick={() => {
                  setSelId(r.id)
                  setEdit(false)
                }}
              >
                <span className="ic">
                  <I n="users" />
                </span>
                <span className="txt">
                  <b>{r.name}</b>
                  <span>{r.description || '无描述'}</span>
                </span>
                {used ? (
                  <Tag tone="accent">{used} 台共用</Tag>
                ) : (
                  <Tag tone="neu">未关联</Tag>
                )}
              </div>
            )
          })}
          <Button
            style={{ justifyContent: 'center', marginTop: 4 }}
            icon="plus"
            onClick={startCreate}
          >
            新建
          </Button>
        </aside>
        <section
          className="sdetail"
          key={'room-' + (selId || 'new') + (edit ? '-e' : '-r')}
        >
          {props.rooms.length === 0 && !creating ? (
            <EmptyState
              icon="users"
              title="还没有会话群"
              desc="会话群是对话记忆的上下文归属，多台设备可共用同一会话群；创建后在「设备服务」中关联。"
              action={
                <Button variant="primary" icon="plus" onClick={startCreate}>
                  新建
                </Button>
              }
            />
          ) : edit ? (
            <div className="form-card">
              <h3>
                <I n="users" size={17} />{' '}
                {creating ? '新建会话群' : '编辑会话群'}
              </h3>
              <div className="desc">
                {creating
                  ? '创建后可到「设备服务」中为音箱关联此会话群。'
                  : '修改会话群信息；关联设备重启后生效。'}
              </div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <Field label="会话群名称" required>
                    <input
                      value={draft.name}
                      placeholder="例如：客厅会话"
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="会话群描述">
                    <input
                      value={draft.description}
                      placeholder="例如：家庭日常闲聊场景"
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <Button variant="ghost" onClick={cancel}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  icon="check"
                  onClick={save}
                  disabled={!draft.name.trim()}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : sel ? (
            <div className="form-card">
              <h3>
                <I n="users" size={17} /> 会话群详情
                <span className="refs">
                  多台设备共用同一会话群，共享对话记忆；变更后需重启关联设备生效。
                </span>
              </h3>
              <div className="desc">
                对话记忆的上下文归属；被设备引用后删除前需先解绑。
              </div>
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">会话群名称</span>
                      <span className="v">{sel.name}</span>
                    </div>
                    <div className="rr">
                      <span className="k">会话群描述</span>
                      <span className="v">{sel.description || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>关联设备</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">关联设备</span>
                      <span className="v">
                        {(() => {
                          const used = props.devices.filter(
                            (d) => d.roomRef === sel.id,
                          )
                          return used.length
                            ? used.map((d) => d.alias).join('、')
                            : '未关联'
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => props.onDelete(sel.id)}
                >
                  删除
                </Button>
                <Button
                  variant="primary"
                  icon="pencil"
                  onClick={() => {
                    setDraft({
                      name: sel.name,
                      description: sel.description || '',
                    })
                    setEdit(true)
                  }}
                >
                  编辑
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}
