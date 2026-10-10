import { useEffect, useState } from 'react'
import Select from 'react-select'
import { type Role, type ThinkService, type VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { avatarOf } from '../../utils.ts'
import { Button, EmptyState, Field } from '../atoms/index.ts'
import { multiSelectStyles } from '../atoms/selectStyles.ts'
import type { WizardSetDraft } from './types.ts'

export function WizardRoleStep(props: {
  active: boolean
  roles: Role[]
  roleId: string
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  thinkServiceIds: string[]
  voiceId: string
  setDraft: WizardSetDraft
  onNewRole: (d: { name: string; profile?: string }) => Promise<Role>
  onUpdateRole: (id: string, d: Partial<Role>) => Promise<Role>
}) {
  const {
    roles,
    roleId,
    thinkServiceIds,
    voiceId,
    setDraft,
    onNewRole,
    onUpdateRole,
  } = props
  const [newRole, setNewRole] = useState(false)
  const [roleEdit, setRoleEdit] = useState(false)
  const [nrDraft, setNrDraft] = useState<{
    name: string
    profile: string
    masterName?: string
    masterProfile?: string
  }>({ name: '', profile: '' })
  const [nrBusy, setNrBusy] = useState(false)
  const [nrErr, setNrErr] = useState('')
  const selRole = roles.find((r) => r.id === roleId)

  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (props.active && !roleId && roles.length)
      setDraft({ roleId: roles[0].id })
  }, [props.active, roleId, roles, setDraft])

  // 进入本步时预选首个思考/语音服务，避免用户漏选导致无法完成
  useEffect(() => {
    if (!props.active) return
    const patch: Partial<{
      thinkServiceIds: string[]
      voiceId: string
    }> = {}
    if (!thinkServiceIds.length && props.thinkSvcs.length)
      patch.thinkServiceIds = [props.thinkSvcs[0].id]
    if (!voiceId && props.voiceSvcs.length)
      patch.voiceId = props.voiceSvcs[0].id
    if (Object.keys(patch).length) setDraft(patch)
  }, [
    props.active,
    props.thinkSvcs,
    props.voiceSvcs,
    thinkServiceIds,
    voiceId,
    setDraft,
  ])

  const saveRole = async () => {
    if (nrBusy) return
    setNrBusy(true)
    setNrErr('')
    try {
      const body: {
        name: string
        profile: string
        masterName?: string
        masterProfile?: string
      } = { name: nrDraft.name, profile: nrDraft.profile }
      if (nrDraft.masterName) body.masterName = nrDraft.masterName
      if (nrDraft.masterProfile) body.masterProfile = nrDraft.masterProfile
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
      masterName: selRole.masterName || '',
      masterProfile: selRole.masterProfile || '',
    })
  }
  return (
    <div className={'step' + (props.active ? ' on' : '')}>
      <div className="split wsplit">
        <aside className="slist">
          {roles.length === 0 && (
            <EmptyState
              title="还没有对话角色"
              desc="请新建一个角色，或到「对话角色」页先创建。"
              style={{ padding: '16px' }}
            />
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
                <span>{r.profile?.slice(0, 24) || '未填写角色性格'}</span>
              </span>
            </div>
          ))}
          <Button
            icon="plus"
            style={{ justifyContent: 'center', marginTop: 4 }}
            onClick={() => {
              setNewRole(true)
              setRoleEdit(false)
              setNrDraft({ name: '', profile: '' })
            }}
          >
            新建
          </Button>
        </aside>
        <section className="sdetail">
          {selRole && !newRole && !roleEdit ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> 角色详情
              </h3>
              <div className="desc">角色性格热生效；修改唤醒词需重启设备。</div>
              <div className="ro">
                <div className="rr">
                  <span className="k">角色称呼</span>
                  <span className="v">{selRole.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">称呼我为</span>
                  <span className="v">{selRole.masterName || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">角色性格</span>
                  <span className="v" style={{ whiteSpace: 'pre-wrap' }}>
                    {selRole.profile || '—'}
                  </span>
                </div>
                <div className="rr">
                  <span className="k">我的信息</span>
                  <span className="v" style={{ whiteSpace: 'pre-wrap' }}>
                    {selRole.masterProfile || '—'}
                  </span>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <Button variant="primary" icon="pencil" onClick={beginRoleEdit}>
                  编辑
                </Button>
              </div>
            </div>
          ) : (
            <div className="form-card">
              <h3>
                <I n="user" size={17} />{' '}
                {roleEdit && selRole ? '编辑角色' : '新建对话角色'}
              </h3>
              <div className="desc">
                {roleEdit && selRole ? '更新角色信息。' : '角色称呼必填。'}
              </div>
              <div className="row">
                <Field label="角色称呼" required>
                  <input
                    value={nrDraft.name}
                    placeholder="例如：小爱同学"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="称呼我为" tip="如：主人、老大、朋友等">
                  <input
                    value={nrDraft.masterName || ''}
                    placeholder="例如：主人"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, masterName: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="row">
                <Field label="角色性格">
                  <textarea
                    rows={4}
                    value={nrDraft.profile}
                    placeholder="例如：你叫小爱，是这家人的智能助手…"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, profile: e.target.value })
                    }
                  />
                </Field>
                <Field label="我的信息" tip="供角色了解你的背景信息">
                  <textarea
                    rows={4}
                    value={nrDraft.masterProfile || ''}
                    placeholder="例如：性别：男 性格：善良正直 其他：总是舍己为人"
                    onChange={(e) =>
                      setNrDraft({ ...nrDraft, masterProfile: e.target.value })
                    }
                  />
                </Field>
              </div>
              {nrErr && (
                <div className="notice err">
                  <I n="warning" size={15} /> {nrErr}
                </div>
              )}
              <div className="acts">
                <span className="sp" />
                <Button
                  variant="ghost"
                  onClick={() =>
                    roleEdit && selRole
                      ? (setRoleEdit(false),
                        setNrDraft({ name: '', profile: '' }))
                      : setNewRole(false)
                  }
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  disabled={nrBusy || !nrDraft.name}
                  onClick={saveRole}
                >
                  {nrBusy ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="grp" style={{ padding: '0 16px 12px' }}>
        <h4>关联服务</h4>
        <div className="row">
          <Field
            label="思考服务"
            required
            tip="按优先级排列，限额已达时自动切换下一个"
          >
            <Select
              isMulti
              options={props.thinkSvcs.map((s) => ({
                value: s.id,
                label: s.name + (s.limitReached ? '（限额）' : ''),
              }))}
              value={props.thinkSvcs
                .filter((s) => thinkServiceIds.includes(s.id))
                .map((s) => ({ value: s.id, label: s.name }))}
              placeholder="选择思考服务…"
              noOptionsMessage={() => '无可用服务'}
              onChange={(vals) =>
                setDraft({ thinkServiceIds: (vals || []).map((v) => v.value) })
              }
              styles={multiSelectStyles}
            />
          </Field>
          <Field label="语音服务" required>
            <select
              value={voiceId}
              onChange={(e) => setDraft({ voiceId: e.target.value })}
            >
              <option value="">请选择语音服务</option>
              {props.voiceSvcs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </div>
  )
}
