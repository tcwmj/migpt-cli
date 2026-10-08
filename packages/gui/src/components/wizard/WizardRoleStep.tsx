import { useEffect, useState } from 'react'
import { type Role, type ThinkService, type VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { avatarOf } from '../../utils.ts'
import type { WizardSetDraft } from './types.ts'

export function WizardRoleStep(props: {
  active: boolean
  roles: Role[]
  roleId: string
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  setDraft: WizardSetDraft
  onNewRole: (d: { name: string; profile?: string }) => Promise<Role>
  onUpdateRole: (id: string, d: Partial<Role>) => Promise<Role>
}) {
  const {
    roles,
    roleId,
    thinkSvcs,
    voiceSvcs,
    setDraft,
    onNewRole,
    onUpdateRole,
  } = props
  const [newRole, setNewRole] = useState(false)
  const [roleEdit, setRoleEdit] = useState(false)
  const [nrDraft, setNrDraft] = useState<{
    name: string
    profile: string
    thinkServiceId?: string
    voiceId?: string
  }>({ name: '', profile: '' })
  const [nrBusy, setNrBusy] = useState(false)
  const [nrErr, setNrErr] = useState('')
  const selRole = roles.find((r) => r.id === roleId)

  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (props.active && !roleId && roles.length)
      setDraft({ roleId: roles[0].id })
  }, [props.active, roleId, roles, setDraft])

  const saveRole = async () => {
    if (nrBusy) return
    setNrBusy(true)
    setNrErr('')
    try {
      const body: {
        name: string
        profile: string
        thinkServiceId?: string
        voiceId?: string
      } = { name: nrDraft.name, profile: nrDraft.profile }
      if (nrDraft.thinkServiceId) body.thinkServiceId = nrDraft.thinkServiceId
      if (nrDraft.voiceId) body.voiceId = nrDraft.voiceId
      if (roleEdit && selRole) {
        await onUpdateRole(selRole.id, body)
        setRoleEdit(false)
      } else {
        const created = await onNewRole(body)
        setDraft({ roleId: created.id })
        setNewRole(false)
      }
      setNrDraft({ name: '', profile: '' })
    } catch (e) {
      setNrErr((e as Error).message || '保存角色失败')
    } finally {
      setNrBusy(false)
    }
  }
  const beginRoleEdit = () => {
    if (!selRole) return
    setNewRole(false)
    setRoleEdit(true)
    setNrDraft({
      name: selRole.name,
      profile: selRole.profile || '',
      thinkServiceId: selRole.thinkServiceId,
      voiceId: selRole.voiceId,
    })
  }
  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <aside className="slist">
          {roles.length === 0 && (
            <div className="empty" style={{ padding: '16px' }}>
              <b>还没有对话角色</b>
              <span>请新建一个角色，或到「对话角色」页先创建。</span>
            </div>
          )}
          {roles.map((r) => (
            <div
              key={r.id}
              className={'li' + (roleId === r.id ? ' on' : '')}
              onClick={() => {
                setDraft({ roleId: r.id })
                setNewRole(false)
                setRoleEdit(false)
                setNrDraft({ name: '', profile: '' })
              }}
            >
              <img className="pavatar" src={avatarOf(r.name)} alt={r.name} />
              <span className="txt">
                <b>{r.name}</b>
                <span>{r.profile?.slice(0, 24) || '未填写人设'}</span>
              </span>
            </div>
          ))}
          <button
            className="btn"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={() => {
              setNewRole(true)
              setRoleEdit(false)
              setNrDraft({ name: '', profile: '' })
            }}
          >
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail">
          {selRole && !newRole && !roleEdit ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> 角色详情
              </h3>
              <div className="desc">
                思考服务与语音服务由角色统一提供；人设与模型热生效。
              </div>
              <div className="ro">
                <div className="rr">
                  <span className="k">角色名称</span>
                  <span className="v">{selRole.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">人设描述</span>
                  <span className="v" style={{ whiteSpace: 'pre-wrap' }}>
                    {selRole.profile || '—'}
                  </span>
                </div>
                <div className="rr">
                  <span className="k">思考服务</span>
                  <span className="v">
                    {thinkSvcs.find((s) => s.id === selRole.thinkServiceId)
                      ?.name || '跟随全局默认'}
                  </span>
                </div>
                <div className="rr">
                  <span className="k">语音服务</span>
                  <span className="v">
                    {voiceSvcs.find((s) => s.id === selRole.voiceId)?.name ||
                      '跟随全局默认'}
                  </span>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn primary" onClick={beginRoleEdit}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : (
            <div className="form-card">
              <h3>
                <I n="user" size={17} />{' '}
                {roleEdit && selRole ? '编辑角色' : '新建对话角色'}
              </h3>
              <div className="desc">
                {roleEdit && selRole
                  ? '更新角色信息；服务留空则跟随全局默认。'
                  : '角色名称必填；思考服务与语音服务可选，留空则跟随全局默认。'}
              </div>
              <div className="fld">
                <label>
                  角色名称<span className="req">*</span>
                </label>
                <input
                  value={nrDraft.name}
                  placeholder="例如：小爱同学"
                  onChange={(e) =>
                    setNrDraft({ ...nrDraft, name: e.target.value })
                  }
                />
              </div>
              <div className="fld">
                <label>人设描述</label>
                <textarea
                  rows={4}
                  value={nrDraft.profile}
                  placeholder="例如：你叫小爱，是这家人的智能助手…"
                  onChange={(e) =>
                    setNrDraft({ ...nrDraft, profile: e.target.value })
                  }
                />
              </div>
              <div className="fld">
                <label>思考服务</label>
                <select
                  value={nrDraft.thinkServiceId || ''}
                  onChange={(e) =>
                    setNrDraft({
                      ...nrDraft,
                      thinkServiceId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">跟随全局默认</option>
                  {thinkSvcs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label>语音服务</label>
                <select
                  value={nrDraft.voiceId || ''}
                  onChange={(e) =>
                    setNrDraft({
                      ...nrDraft,
                      voiceId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">跟随全局默认</option>
                  {voiceSvcs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {nrErr && (
                <div className="notice err">
                  <I n="warning" size={15} /> {nrErr}
                </div>
              )}
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn ghost"
                  onClick={() =>
                    roleEdit && selRole
                      ? (setRoleEdit(false),
                        setNrDraft({ name: '', profile: '' }))
                      : setNewRole(false)
                  }
                >
                  取消
                </button>
                <button
                  className="btn primary"
                  disabled={nrBusy || !nrDraft.name}
                  onClick={saveRole}
                >
                  {nrBusy ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
