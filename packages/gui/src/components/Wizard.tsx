/* ══ Wizard ══ */
import { useCallback, useEffect, useState } from 'react'
import * as api from '../apis.ts'
import {
  type Account,
  type PulledDevice,
  type Role,
  type SpeakerModel,
  type ThinkService,
  type VoiceService,
} from '../apis.ts'
import { I } from '../icons.tsx'
import { avatarOf } from '../utils.ts'

export function Wizard(props: {
  step: number
  accounts: Account[]
  roles: Role[]
  models: SpeakerModel[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  devices: { id: string; alias: string; did: string; accountId?: string }[]
  draft: {
    step: number
    accountId: string
    alias: string
    did: string
    model: string
    roleId: string
  }
  setDraft: (
    p: Partial<{
      step: number
      accountId: string
      alias: string
      did: string
      model: string
      roleId: string
    }>,
  ) => void
  onClose: () => void
  onFinish: () => void
  onNewAccount: (d: {
    name: string
    miUserId: string
    passToken: string
  }) => Promise<Account>
  onUpdateAccount: (id: string, d: Partial<Account>) => Promise<Account>
  onNewRole: (d: { name: string; profile?: string }) => Promise<Role>
  onUpdateRole: (id: string, d: Partial<Role>) => Promise<Role>
}) {
  const { draft } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      props.onClose()
    }, 200)
  }
  const [pulling, setPulling] = useState(false)
  const [pullErr, setPullErr] = useState('')
  const [pulled, setPulled] = useState<PulledDevice[] | null>(null)
  const [newAcct, setNewAcct] = useState(false)
  const [acctEdit, setAcctEdit] = useState(false)
  const [naDraft, setNaDraft] = useState({
    name: '',
    miUserId: '',
    passToken: '',
  })
  const [naBusy, setNaBusy] = useState(false)
  const [naErr, setNaErr] = useState('')
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
  const step = draft.step
  const selAcct = props.accounts.find((a) => a.id === draft.accountId)
  const selRole = props.roles.find((r) => r.id === draft.roleId)
  const load = useCallback((accountId: string) => {
    if (!accountId) return
    setPulling(true)
    setPullErr('')
    setPulled(null)
    api
      .pullDevices(accountId)
      .then((r) => {
        const list = r.devices || []
        setPulled(list)
        if (!list.length)
          setPullErr('该账号下未发现音箱设备，请确认小米 ID 与 passToken 正确')
      })
      .catch((e) => setPullErr((e as Error).message || '拉取设备失败'))
      .finally(() => setPulling(false))
  }, [])
  useEffect(() => {
    if (step === 1 && draft.accountId) load(draft.accountId)
  }, [step, draft.accountId, load])
  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (step === 0 && !draft.accountId && props.accounts.length)
      props.setDraft({ accountId: props.accounts[0].id })
  }, [step, draft.accountId, props.accounts, props.setDraft])
  useEffect(() => {
    if (step === 2 && !draft.roleId && props.roles.length)
      props.setDraft({ roleId: props.roles[0].id })
  }, [step, draft.roleId, props.roles, props.setDraft])
  // 设备拉取完成且有设备时，默认选中第一台
  useEffect(() => {
    if (step === 1 && pulled && pulled.length > 0 && !draft.did) {
      const d = pulled[0]
      const m = modelOf(d.hardware)
      props.setDraft({
        alias: d.name || d.alias,
        did: d.miotDID,
        model: m ? m.id : draft.model,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pulled, draft.did])
  const saveAcct = async () => {
    if (naBusy) return
    setNaBusy(true)
    setNaErr('')
    try {
      if (acctEdit && selAcct) {
        await props.onUpdateAccount(selAcct.id, {
          name: naDraft.name,
          miUserId: naDraft.miUserId,
          ...(naDraft.passToken ? { passToken: naDraft.passToken } : {}),
        })
        setAcctEdit(false)
      } else {
        const created = await props.onNewAccount(naDraft)
        props.setDraft({ accountId: created.id })
        setNewAcct(false)
      }
      setNaDraft({ name: '', miUserId: '', passToken: '' })
    } catch (e) {
      setNaErr((e as Error).message || '保存账号失败')
    } finally {
      setNaBusy(false)
    }
  }
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
        await props.onUpdateRole(selRole.id, body)
        setRoleEdit(false)
      } else {
        const created = await props.onNewRole(body)
        props.setDraft({ roleId: created.id })
        setNewRole(false)
      }
      setNrDraft({ name: '', profile: '' })
    } catch (e) {
      setNrErr((e as Error).message || '保存角色失败')
    } finally {
      setNrBusy(false)
    }
  }
  const beginAcctEdit = () => {
    if (!selAcct) return
    setNewAcct(false)
    setAcctEdit(true)
    setNaDraft({
      name: selAcct.name,
      miUserId: selAcct.miUserId,
      passToken: '',
    })
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
  const canNext =
    (step === 0 && !!draft.accountId) ||
    (step === 1 && !!draft.did && !pullErr) ||
    step === 2
  const finish = () => {
    if (closing) return
    if (step === 2) close(props.onFinish)
    else if (canNext) props.setDraft({ step: step + 1 })
  }
  const modelOf = (hardware: string) =>
    props.models.find((x) => {
      const a = (x.did || '').toLowerCase()
      const b = (hardware || '').toLowerCase()
      return a === b || a.startsWith(b) || b.startsWith(a)
    })
  const WSTEP = [
    { n: '1', t: '连接账号', s: '读取设备' },
    { n: '2', t: '选择设备', s: '确认型号' },
    { n: '3', t: '对话服务', s: '保存并启动' },
  ]
  return (
    <div className={'wizard on' + (closing ? ' closing' : '')}>
      <div className="wiz">
        <div className="wh">
          <div className="wtitle">
            <b>设备连接向导</b>
          </div>
          <div className="wsteps">
            {WSTEP.map((it, i) => (
              <div
                key={i}
                className={
                  'wstep' + (step === i ? ' on' : i < step ? ' done' : '')
                }
              >
                <span className="wno">
                  {i < step ? <I n="check" size={13} /> : it.n}
                </span>
                <span className="wt">
                  <b>
                    {it.t}（{it.s}）
                  </b>
                </span>
              </div>
            ))}
          </div>
          <button className="icon-btn" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="wb">
          <div className={'step' + (step === 0 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {props.accounts.length === 0 && (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>还没有云端账号</b>
                    <span>请新建一个账号，或在「账号设备」页先接入。</span>
                  </div>
                )}
                {props.accounts.map((a) => (
                  <div
                    key={a.id}
                    className={'li' + (draft.accountId === a.id ? ' on' : '')}
                    onClick={() => {
                      props.setDraft({ accountId: a.id })
                      setNewAcct(false)
                      setAcctEdit(false)
                      setNaDraft({ name: '', miUserId: '', passToken: '' })
                    }}
                  >
                    <span className="ic">
                      <I n="user" />
                    </span>
                    <span className="txt">
                      <b>{a.name}</b>
                      <span>小米 ID {a.miUserId}</span>
                    </span>
                  </div>
                ))}
                <button
                  className="btn"
                  style={{ justifyContent: 'center', marginTop: 4 }}
                  onClick={() => {
                    setNewAcct(true)
                    setAcctEdit(false)
                    setNaDraft({ name: '', miUserId: '', passToken: '' })
                  }}
                >
                  <I n="plus" /> 新建
                </button>
              </aside>
              <section className="sdetail">
                {selAcct && !newAcct && !acctEdit ? (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> 账号详情
                    </h3>
                    <div className="desc">
                      账号信息与凭据状态；凭据仅保存于本机服务端。
                    </div>
                    <div className="ro">
                      <div className="rr">
                        <span className="k">账号名称</span>
                        <span className="v">{selAcct.name || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">小米 ID</span>
                        <span className="v">{selAcct.miUserId || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">passToken</span>
                        <span className="v">
                          {selAcct.passToken ? '已保存' : '未配置'}
                        </span>
                      </div>
                    </div>
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn primary" onClick={beginAcctEdit}>
                        <I n="pencil" /> 编辑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} />{' '}
                      {acctEdit && selAcct ? '编辑账号' : '新建云端账号'}
                    </h3>
                    <div className="desc">
                      {acctEdit && selAcct
                        ? '更新名称或凭据；换绑账号后需重启受影响设备。'
                        : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}
                    </div>
                    <div className="fld">
                      <label>
                        账号名称<span className="req">*</span>
                      </label>
                      <input
                        value={naDraft.name}
                        placeholder="例如：默认账号"
                        onChange={(e) =>
                          setNaDraft({ ...naDraft, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="fld">
                      <label>
                        小米 ID<span className="req">*</span>
                        <span
                          className="tip"
                          data-tip="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。"
                        >
                          ?
                        </span>
                      </label>
                      <input
                        value={naDraft.miUserId}
                        placeholder="登录官方 小米账号 › 个人信息 获取，不是手机号或邮箱"
                        onChange={(e) =>
                          setNaDraft({ ...naDraft, miUserId: e.target.value })
                        }
                      />
                    </div>
                    <div className="fld">
                      <label>
                        云端会话凭证 passToken
                        <span
                          className="tip"
                          data-tip={
                            acctEdit && selAcct
                              ? '留空则保留原凭据'
                              : '请勿把凭证发送给其他人；异地登录安全验证时，会给出授权链接。'
                          }
                        >
                          ?
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={naDraft.passToken}
                        placeholder={
                          acctEdit && selAcct && selAcct.passToken
                            ? '已保存 · 留空保持不变'
                            : '从米家 / 小爱获取的 token'
                        }
                        onChange={(e) =>
                          setNaDraft({ ...naDraft, passToken: e.target.value })
                        }
                      />
                    </div>
                    {naErr && (
                      <div className="notice err">
                        <I n="warning" size={15} /> {naErr}
                      </div>
                    )}
                    <div className="acts">
                      <span className="sp" />
                      <button
                        className="btn ghost"
                        onClick={() =>
                          acctEdit && selAcct
                            ? (setAcctEdit(false),
                              setNaDraft({
                                name: '',
                                miUserId: '',
                                passToken: '',
                              }))
                            : setNewAcct(false)
                        }
                      >
                        取消
                      </button>
                      <button
                        className="btn primary"
                        disabled={naBusy || !naDraft.name || !naDraft.miUserId}
                        onClick={saveAcct}
                      >
                        {naBusy ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
          <div className={'step' + (step === 1 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {!selAcct ? (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>请先选择云端账号</b>
                    <span>回到上一步选择或新建账号。</span>
                  </div>
                ) : (
                  <>
                    <div className="filters" style={{ margin: '0 0 8px' }}>
                      <span className="chip on">{selAcct.name}</span>
                    </div>
                    {pulling && (
                      <div className="hint">正在从小米云端拉取设备…</div>
                    )}
                    {pullErr && (
                      <div className="empty" style={{ padding: '16px' }}>
                        <b>未获取到设备信息</b>
                      </div>
                    )}
                    {pulled && pulled.length > 0
                      ? pulled.map((d) => {
                          const m = modelOf(d.hardware)
                          const bound = !!props.devices.find(
                            (x) =>
                              x.accountId === selAcct.id && x.did === d.miotDID,
                          )
                          return (
                            <div
                              key={d.miotDID}
                              className={
                                'li' +
                                (draft.did === d.miotDID ? ' on' : '') +
                                (bound ? ' off' : '')
                              }
                              onClick={() => {
                                if (bound) return
                                props.setDraft({
                                  alias: d.name || d.alias,
                                  did: d.miotDID,
                                  model: m ? m.id : draft.model,
                                })
                              }}
                            >
                              <span className="ic">
                                {m?.imageUrl ? (
                                  <img
                                    className="thumb"
                                    src={m.imageUrl}
                                    alt=""
                                  />
                                ) : (
                                  <I n="speaker" />
                                )}
                              </span>
                              <span className="txt">
                                <b>{d.name || d.alias}</b>
                                <span>
                                  {m ? m.name : d.hardware || '未知型号'}
                                </span>
                              </span>
                              {bound ? (
                                <span className="tag neu">已接入</span>
                              ) : (
                                <span
                                  className={
                                    'tag' +
                                    (d.presence === 'online'
                                      ? ' accent'
                                      : ' neu')
                                  }
                                >
                                  {d.presence === 'online' ? '在线' : '离线'}
                                </span>
                              )}
                            </div>
                          )
                        })
                      : pulled !== null &&
                        !pulling && (
                          <div className="empty" style={{ padding: '16px' }}>
                            <b>未发现音箱设备</b>
                            <span>请确认小米 ID 与 passToken 正确。</span>
                          </div>
                        )}
                  </>
                )}
              </aside>
              <section className="sdetail">
                {pullErr ? (
                  <div className="form-card err-card">
                    <h3>
                      <I n="warning" size={17} /> 设备拉取失败
                    </h3>
                    <div className="notice err">{pullErr}</div>
                    <div className="desc">
                      返回上一步检查小米 ID 与
                      passToken，或到「账号设备」页更新凭据后重试。
                    </div>
                  </div>
                ) : draft.did ? (
                  <div className="form-card">
                    <h3>
                      <I n="speaker" size={17} /> 设备详情
                    </h3>
                    <div className="desc">设备 ID 与型号由云端自动识别。</div>
                    <div className="ro">
                      {(() => {
                        const hw = (pulled || []).find(
                          (x) => x.miotDID === draft.did,
                        )?.hardware
                        const m = modelOf(hw ?? '')
                        return m?.imageUrl ? (
                          <div className="model-pic">
                            <img
                              className="fade"
                              src={m.imageUrl}
                              alt={m.name}
                              onLoad={(e) =>
                                e.currentTarget.classList.add('loaded')
                              }
                              onError={(e) =>
                                e.currentTarget.classList.add('loaded')
                              }
                            />
                            <span className="pic-tag">
                              {m.builtin ? '内置型号' : '自定义型号'}
                            </span>
                          </div>
                        ) : null
                      })()}
                      <div className="rr2">
                        <div className="rr">
                          <span className="k">设备名称</span>
                          <span className="v">{draft.alias || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备 ID</span>
                          <span className="v">{draft.did || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备型号</span>
                          <span className="v">
                            {modelOf(
                              (pulled || []).find(
                                (x) => x.miotDID === draft.did,
                              )?.hardware || '',
                            )?.name || '待型号映射核对'}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">设备状态</span>
                          <span className="v">
                            {(pulled || []).find((x) => x.miotDID === draft.did)
                              ?.presence === 'online'
                              ? '在线'
                              : '离线'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty">
                    <div className="art">
                      <I n="speaker" size={26} />
                    </div>
                    <b>选择要接入的设备</b>
                    <span>
                      从左侧列表选择一台音箱；设备 ID 与型号自动识别。
                    </span>
                  </div>
                )}
              </section>
            </div>
          </div>
          <div className={'step' + (step === 2 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {props.roles.length === 0 && (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>还没有对话角色</b>
                    <span>请新建一个角色，或到「对话角色」页先创建。</span>
                  </div>
                )}
                {props.roles.map((r) => (
                  <div
                    key={r.id}
                    className={'li' + (draft.roleId === r.id ? ' on' : '')}
                    onClick={() => {
                      props.setDraft({ roleId: r.id })
                      setNewRole(false)
                      setRoleEdit(false)
                      setNrDraft({ name: '', profile: '' })
                    }}
                  >
                    <img
                      className="pavatar"
                      src={avatarOf(r.name)}
                      alt={r.name}
                    />
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
                          {props.thinkSvcs.find(
                            (s) => s.id === selRole.thinkServiceId,
                          )?.name || '跟随全局默认'}
                        </span>
                      </div>
                      <div className="rr">
                        <span className="k">语音服务</span>
                        <span className="v">
                          {props.voiceSvcs.find((s) => s.id === selRole.voiceId)
                            ?.name || '跟随全局默认'}
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
                        {props.thinkSvcs.map((s) => (
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
                        {props.voiceSvcs.map((s) => (
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
        </div>
        <div className="wf">
          <button
            className="btn ghost"
            disabled={step === 0}
            onClick={() => props.setDraft({ step: step - 1 })}
          >
            <I n="arrowL" /> 上一步
          </button>
          <div className="r">
            <button className="btn" onClick={() => close()}>
              取消
            </button>
            <button
              className="btn primary"
              disabled={!canNext && step < 2}
              onClick={finish}
            >
              {step === 2 ? '完成' : '下一步'} <I n="arrowR" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
