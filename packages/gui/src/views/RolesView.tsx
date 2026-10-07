/* ══ RolesView ══ */
import { useEffect, useState } from 'react'
import { type Role, type ThinkService, type VoiceService } from '../apis.ts'
import { I } from '../icons.tsx'
import { avatarOf } from '../utils.ts'

export function RolesView(props: {
  roles: Role[]
  allRoles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  roleUsage: (id: string) => string[]
  onSave: (r: Role) => void
  onCreate: (r: Partial<Role>) => Promise<Role | null> | void
  onDelete: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.roles[0]?.id || null)
  const sel = props.allRoles.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<Role | null>(sel)
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const thinkDefault = props.thinkSvcs.find((s) => s.isDefault)
  const voiceDefault = props.voiceSvcs.find((s) => s.isDefault)
  const blankRole = (): Role => ({
    id: '',
    name: '',
    profile: '',
    callAIKeywords: [],
    wakeUpKeywords: ['小爱同学'],
    exitKeywords: [],
    checkContinueKeywords: [],
    checkNotContinueKeywords: [],
    exitKeepAliveAfter: 30,
    onEnterAI: [],
    onExitAI: [],
    onAIAsking: [],
    onAIReplied: [],
    onAIError: [],
  })
  useEffect(() => {
    setSelId((s) => s || props.roles[0]?.id || null)
  }, [props.roles])
  useEffect(() => {
    if (!creating) setDraft(sel)
  }, [selId, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k: keyof Role, v: unknown) =>
    draft && setDraft({ ...draft, [k]: v })
  const usage = sel ? props.roleUsage(sel.id) : []

  const selectRole = (id: string) => {
    setSelId(id)
    setCreating(false)
    setEdit(false)
  }
  const startCreate = () => {
    setSelId(null)
    setCreating(true)
    setEdit(true)
    setDraft(blankRole())
  }
  const cancelEdit = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (!sel) setSelId(props.roles[0]?.id || null)
      else setDraft(sel)
    } else {
      setEdit(false)
    }
  }
  const doSave = async () => {
    if (!draft) return
    if (creating) {
      const c = await props.onCreate({ ...draft })
      if (c?.id) {
        setSelId(c.id)
        setCreating(false)
        setEdit(false)
      }
    } else {
      props.onSave(draft)
      setEdit(false)
    }
  }

  if (props.roles.length === 0) {
    return (
      <section data-view="roles" className="on">
        <div className="panel">
          <div className="empty">
            <div className="art">
              <I n="chat" size={26} />
            </div>
            <b>还没有对话角色</b>
            <span>创建角色后，可在设备向导中为每台音箱选择人设。</span>
            <button className="btn primary" onClick={startCreate}>
              <I n="plus" /> 新建
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section data-view="roles" className="on">
      <div className="filters">
        <span className="chip on">全部角色</span>
        <span className="sp">
          <span className="count">共 {props.roles.length} 个</span>
        </span>
      </div>
      <div className="roles">
        <div className="rlist">
          {props.roles.map((r) => (
            <div
              className={'r' + (r.id === selId ? ' on' : '')}
              key={r.id}
              onClick={() => selectRole(r.id)}
            >
              <img src={avatarOf(r.name)} alt={r.name} />
              <span>
                <b>{r.name}</b>
                <span>{r.profile?.slice(0, 18) || '未填写人设'}</span>
              </span>
            </div>
          ))}
          <button
            className="btn"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={startCreate}
          >
            <I n="plus" /> 新建
          </button>
        </div>
        {sel && !edit && !creating && (
          <div className="rform rview" key={'role-r-' + sel.id}>
            <h3>
              <I n="chat" size={17} /> 角色详情
              <span className="refs">
                本角色被 {usage.length} 台设备引用
                {usage.length ? '（' + usage.join(' · ') + '）' : ''}
                。人设与模型热生效；修改唤醒词需重启设备。
              </span>
            </h3>
            <div className="ro">
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">角色名称</span>
                    <span className="v">{sel.name || '—'}</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">人设描述</span>
                    <span className="v">{sel.profile || '未填写'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>模型服务</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">思考服务</span>
                    <span className="v">
                      {props.thinkSvcs.find((s) => s.id === sel.thinkServiceId)
                        ?.name || '跟随全局默认'}
                    </span>
                  </div>
                  <div className="rr">
                    <span className="k">语音服务</span>
                    <span className="v">
                      {props.voiceSvcs.find((s) => s.id === sel.voiceId)
                        ?.name || '跟随全局默认'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>单次对话</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">调用关键词</span>
                    <span className="v">
                      {(sel.callAIKeywords || []).join('、') || '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>连续对话</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">唤醒关键词</span>
                    <span className="v">
                      {(sel.wakeUpKeywords || []).join('、') || '小爱同学'}
                    </span>
                  </div>
                  <div className="rr">
                    <span className="k">退出关键词</span>
                    <span className="v">
                      {(sel.exitKeywords || []).join('、') || '—'}
                    </span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">自动退出时间</span>
                    <span className="v">
                      {sel.exitKeepAliveAfter ?? 30} 秒无响应退出
                    </span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">继续对话检测</span>
                    <span className="v">
                      {(sel.checkContinueKeywords || []).join('、') || '—'}
                    </span>
                  </div>
                  <div className="rr">
                    <span className="k">停止对话检测</span>
                    <span className="v">
                      {(sel.checkNotContinueKeywords || []).join('、') || '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>提示语</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">进入 AI</span>
                    <span className="v">
                      {(sel.onEnterAI || []).join('、') || '关闭'}
                    </span>
                  </div>
                  <div className="rr">
                    <span className="k">退出 AI</span>
                    <span className="v">
                      {(sel.onExitAI || []).join('、') || '关闭'}
                    </span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">AI 思考中</span>
                    <span className="v">
                      {(sel.onAIAsking || []).join('、') || '关闭'}
                    </span>
                  </div>
                  <div className="rr">
                    <span className="k">AI 回答完毕</span>
                    <span className="v">
                      {(sel.onAIReplied || []).join('、') || '关闭'}
                    </span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">AI 出错</span>
                    <span className="v">
                      {(sel.onAIError || []).join('、') || '关闭'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="acts">
              <span className="sp" />
              <button
                className="btn danger"
                onClick={() => props.onDelete(sel.id)}
              >
                <I n="trash" /> 删除
              </button>
              <button className="btn primary" onClick={() => setEdit(true)}>
                <I n="pencil" /> 编辑
              </button>
            </div>
          </div>
        )}
        {draft && (edit || creating) && (
          <div
            className="rform redit"
            key={'role-e-' + (creating ? 'new' : sel?.id || 'new')}
          >
            <h3>
              <I n="chat" size={17} /> {creating ? '新建角色' : '编辑角色'}
              <span className="refs">
                本角色被 {usage.length} 台设备引用
                {usage.length ? '（' + usage.join(' · ') + '）' : ''}
                。人设与模型热生效；修改唤醒词需重启设备。
              </span>
            </h3>
            <div className="grp">
              <h4>基本信息</h4>
              <div className="row">
                <div className="fld">
                  <label>
                    角色名称<span className="req">*</span>
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => setF('name', e.target.value)}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>
                    人设描述
                    <span
                      className="tip"
                      data-tip="供思考服务理解人格 · 热生效"
                    >
                      ?
                    </span>
                  </label>
                  <textarea
                    value={draft.profile}
                    onChange={(e) => setF('profile', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>模型服务</h4>
              <div className="row">
                <div className="fld">
                  <label>思考服务</label>
                  <select
                    value={draft.thinkServiceId || ''}
                    onChange={(e) =>
                      setF('thinkServiceId', e.target.value || undefined)
                    }
                  >
                    <option value="">
                      （跟随全局默认：{thinkDefault?.name || '未设置'}）
                    </option>
                    {props.thinkSvcs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>语音服务</label>
                  <select
                    value={draft.voiceId || ''}
                    onChange={(e) =>
                      setF('voiceId', e.target.value || undefined)
                    }
                  >
                    <option value="">
                      （跟随全局默认：{voiceDefault?.name || '未设置'}）
                    </option>
                    {props.voiceSvcs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>单次对话</h4>
              <div className="row">
                <div className="fld">
                  <label>
                    调用关键词
                    <span
                      className="tip"
                      data-tip="每次提问都需以「小爱同学 + 调用词」开头，不会进入连续对话"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.callAIKeywords || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'callAIKeywords',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>连续对话</h4>
              <div className="row">
                <div className="fld">
                  <label>
                    唤醒关键词
                    <span
                      className="tip"
                      data-tip="唤醒后免唤醒词连续对话 · 修改后需重启绑定该设备的设备"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.wakeUpKeywords || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'wakeUpKeywords',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
                <div className="fld">
                  <label>
                    退出关键词
                    <span
                      className="tip"
                      data-tip="说出退出词即结束连续对话；留空时用唤醒词再唤回或等待超时"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.exitKeywords || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'exitKeywords',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>
                    自动退出时间
                    <span
                      className="tip"
                      data-tip="连续对话中无响应超过该秒数自动退出，默认 30 秒"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={String(draft.exitKeepAliveAfter ?? 30)}
                    placeholder="默认 30"
                    onChange={(e) =>
                      setF(
                        'exitKeepAliveAfter',
                        parseInt(e.target.value || '30', 10) || 30,
                      )
                    }
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>
                    继续对话检测
                    <span
                      className="tip"
                      data-tip="说出继续词可保持连续对话；超时退出后再说出可重新进入"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.checkContinueKeywords || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'checkContinueKeywords',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
                <div className="fld">
                  <label>
                    停止对话检测
                    <span
                      className="tip"
                      data-tip="说出停止词立即结束连续对话，等效于退出关键词"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.checkNotContinueKeywords || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'checkNotContinueKeywords',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>提示语</h4>
              <div className="row">
                <div className="fld">
                  <label>
                    进入 AI
                    <span
                      className="tip"
                      data-tip="进入连续对话时播报，留空即关闭该提示"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.onEnterAI || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'onEnterAI',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
                <div className="fld">
                  <label>
                    退出 AI
                    <span
                      className="tip"
                      data-tip="退出连续对话时播报，留空即关闭"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.onExitAI || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'onExitAI',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>
                    AI 思考中
                    <span
                      className="tip"
                      data-tip="AI 开始回答前的过渡语，留空即关闭"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.onAIAsking || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'onAIAsking',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
                <div className="fld">
                  <label>
                    AI 回答完毕
                    <span
                      className="tip"
                      data-tip="AI 回答结束后的收尾语，留空即关闭"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.onAIReplied || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'onAIReplied',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>
                    AI 出错
                    <span
                      className="tip"
                      data-tip="AI 回答异常时播报，留空即关闭"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    value={(draft.onAIError || []).join('、')}
                    onChange={(e) =>
                      setF(
                        'onAIError',
                        e.target.value.split(/[、,，]/).filter(Boolean),
                      )
                    }
                  />
                </div>
              </div>
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={cancelEdit}>
                取消
              </button>
              <button
                className="btn primary"
                onClick={doSave}
                disabled={!draft.name}
              >
                <I n="check" /> 保存
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
