/* ══ ConversationsView ══ */
import { useEffect, useState } from 'react'
import { type DeviceRow, type Robot, type Conversation } from '../apis.ts'
import { I } from '../icons.tsx'
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Tag,
} from '../components/atoms/index.ts'

export function ConversationsView(props: {
  conversations: Conversation[]
  allRooms: Conversation[]
  devices: DeviceRow[]
  robots: Robot[]
  onSave: (r: Conversation) => void
  onCreate: (r: Partial<Conversation>) => Promise<Conversation | null> | void
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onNavigate?: (view: string, id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(
    props.conversations[0]?.id || null,
  )
  const sel = props.allRooms.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<{ name: string; description: string }>({
    name: sel?.name || '',
    description: sel?.description || '',
  })
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  // 刷新/首屏时列表数据异步到达，useState 初值为空 → 数据就绪后补选第一项（与 RobotsView 一致）
  useEffect(() => {
    setSelId((s) => s || props.conversations[0]?.id || null)
  }, [props.conversations])
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
      window.alert('会话名称必填')
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
    <section data-view="conversations" className="on">
      <div className="filters">
        <Chip on>全部会话 {props.conversations.length}</Chip>
        <span className="sp" />
      </div>
      <div className="split">
        <aside className="slist">
          {props.conversations.map((r) => {
            const used = props.robots.filter(
              (d) => d.conversationId === r.id,
            ).length
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
                  <I n="chats" />
                </span>
                <span className="txt">
                  <b>{r.name}</b>
                  <span>{r.description || '无描述'}</span>
                </span>
                {r.builtin ? (
                  <Tag>内置</Tag>
                ) : used ? (
                  <Tag tone="accent">{used} 个角色</Tag>
                ) : null}
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
          key={'conversation-' + (selId || 'new') + (edit ? '-e' : '-r')}
        >
          {props.conversations.length === 0 && !creating ? (
            <EmptyState
              icon="chats"
              title="还没有会话"
              desc="会话是对话记忆的上下文归属，多个角色可共用同一会话；创建后在「对话角色」中关联。"
              action={
                <Button variant="primary" icon="plus" onClick={startCreate}>
                  新建
                </Button>
              }
            />
          ) : edit ? (
            <div className="form-card">
              <h3>
                <I n="chats" size={17} /> {creating ? '新建会话' : '编辑会话'}
              </h3>
              <div className="desc">
                {creating
                  ? '创建后可到「对话角色」中为角色关联此会话。'
                  : '修改会话信息；关联角色重启后生效。'}
              </div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <Field label="会话名称" required>
                    <input
                      value={draft.name}
                      placeholder="例如：客厅会话"
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="会话描述">
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
                <I n="chats" size={17} /> 会话详情
                <span className="refs">
                  多个角色共用同一会话，共享对话记忆；变更后需重启关联角色生效。
                </span>
              </h3>
              <div className="desc">
                对话记忆的上下文归属；被角色引用后删除前需先解绑。
              </div>
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">会话名称</span>
                      <span className="v">{sel.name}</span>
                    </div>
                    <div className="rr">
                      <span className="k">会话描述</span>
                      <span className="v">{sel.description || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>关联角色</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">关联角色</span>
                      <span className="v">
                        {(() => {
                          const used = props.robots.filter(
                            (d) => d.conversationId === sel.id,
                          )
                          return used.length ? (
                            <div className="link-list">
                              {used.map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  className="link-btn"
                                  onClick={() =>
                                    props.onNavigate?.('robots', d.id)
                                  }
                                >
                                  {d.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            '未关联'
                          )
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                {sel.builtin && (
                  <Button
                    icon="arrow-counter-clockwise"
                    onClick={() => props.onReset(sel.id)}
                    title="恢复为系统内置默认配置"
                  >
                    重置
                  </Button>
                )}
                <Button
                  variant="danger"
                  icon="trash"
                  disabled={!!sel.builtin}
                  onClick={() => props.onDelete(sel.id)}
                  title={sel.builtin ? '系统内置会话不可删除' : ''}
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
