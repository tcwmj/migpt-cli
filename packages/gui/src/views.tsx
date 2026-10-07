/* ══ 页面组件：首页 / 账号设备 / 设备型号 / 设备服务 / 思考·语音服务 / 个人中心 ══
   从 App.tsx 主组件按页面拆分；每个组件为纯展示组件，数据与回调经 props 注入。 */
import { I } from './icons.tsx'
import type { View } from './constants.ts'
import { PROVIDERS, PROVIDER_PRESETS, TTS_ENGINES } from './constants.ts'
import type { Account, DeviceRow, PulledDevice, Role, Room, SpeakerModel, ThinkService, VoiceService } from './apis.ts'
import bannerHomeImg from './assets/banner-home.jpg'
import bannerBedroomImg from './assets/banner-bedroom.jpg'
import bannerStudyImg from './assets/banner-study.jpg'
import bannerKitchenImg from './assets/banner-kitchen.jpg'
import bannerBalconyImg from './assets/banner-balcony.jpg'
import livingImg from './assets/scene-living.jpg'
import roomImg from './assets/speaker-room.jpg'
import roleImg from './assets/kpi-role.jpg'
import studyImg from './assets/scene-study.jpg'
import heroImg from './assets/speaker-hero-multi.jpg'
import voiceImg from './assets/kpi-voice.jpg'
import modelsImg from './assets/model-stack.jpg'
import girlImg from './assets/avatar-girl.jpg'
import catImg from './assets/avatar-cat.jpg'
import closeImg from './assets/speaker-close.jpg'

/* ── 表单草稿类型（与 App.tsx 主组件 state 保持一致） ── */
export type AccountDraft = { name: string; miUserId: string; passToken: string }
export type ThinkDraft = { name: string; provider: string; model: string; apiKey: string; temperature: string; baseUrl: string }
export type VoiceDraft = {
  name: string
  provider: string
  voiceId: string
  edgeToken: string
  volcanoAppId: string
  volcanoToken: string
  openaiKey: string
  openaiModel: string
  openaiBaseUrl: string
  customJson: string
}
export type ModelDraft = {
  name: string
  did: string
  desc: string
  imageUrl: string
  ttsCommand: string[]
  wakeUpCommand: string[]
  playingCommand: string[]
  consecutive: boolean
}
export type DevDraft = {
  alias: string
  did: string
  speakerModel: string
  accountId: string
  roleId: string
  thinkServiceId: string
  voiceOverrideId: string
  ttsSecret: string
  exitKeepAliveAfter: string
  roomRef: string
}
export type DevPullState = { loading: boolean; err: string; list: PulledDevice[] | null }
export type AcctDevState = { loading: boolean; err: string; list: PulledDevice[] }

/* ══ 首页 ══ */
export function HomeView(props: {
  bannerIdx: number
  onBanner: (i: number) => void
  accounts: Account[]
  devices: DeviceRow[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  runningCount: number
  logCount: number
  builtinModelCount: number
  customModelCount: number
  onNav: (v: View) => void
  onOpenThink: () => void
  onOpenVoice: () => void
  onStartWizard: () => void
}) {
  const { bannerIdx, onBanner, accounts, devices, roles, thinkSvcs, voiceSvcs, models, runningCount, logCount, builtinModelCount, customModelCount, onNav, onOpenThink, onOpenVoice, onStartWizard } = props
  return (
    <section data-view="home" className="on">
      <div className="hero banner">
        {[bannerHomeImg, bannerBedroomImg, bannerStudyImg, bannerKitchenImg, bannerBalconyImg].map((b, i) => (
          <div key={i} className={'art' + (i === bannerIdx ? ' on' : '')} style={{ backgroundImage: `url(${b})` }} />
        ))}
        <div className="dots">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i === bannerIdx ? 'on' : ''} onClick={() => onBanner(i)} />
          ))}
        </div>
        <span className="idx">{bannerIdx + 1} / 5</span>
      </div>
      <div className="kpis">
        <button className="kpi" onClick={() => onNav('accounts')}>
          <span className="pic" style={{ backgroundImage: `url(${livingImg})` }} />
          <div className="kv">
            <div className="k">账号设备</div>
            <div className="v num">{accounts.length}</div>
          </div>
          <div className="d mut">{accounts.map((a) => a.name).join(' + ') || '尚未接入'}</div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('devices')}>
          <span className="pic" style={{ backgroundImage: `url(${roomImg})` }} />
          <div className="kv">
            <div className="k">设备服务</div>
            <div className="v num">{devices.length}</div>
          </div>
          <div className="d mut">{runningCount > 0 ? `${runningCount} 台运行中` : devices.length > 0 ? '部分设备待启动' : '尚未绑定音箱'}</div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('roles')}>
          <span className="pic" style={{ backgroundImage: `url(${roleImg})` }} />
          <div className="kv">
            <div className="k">对话角色</div>
            <div className="v num">{roles.length}</div>
          </div>
          <div className="d mut">{roles.map((r) => r.name).join(' · ') || '尚未创建'}</div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('logs')}>
          <span className="pic" style={{ backgroundImage: `url(${studyImg})` }} />
          <div className="kv">
            <div className="k">对话记录</div>
            <div className="v num">{logCount}</div>
          </div>
          <div className="d mut">累计对话与系统日志</div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={onOpenThink}>
          <span className="pic" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="kv">
            <div className="k">思考服务</div>
            <div className="v num">{thinkSvcs.length}</div>
          </div>
          <div className="d mut">{thinkSvcs.map((t) => t.name).join(' · ') || '尚未配置'}</div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={onOpenVoice}>
          <span className="pic" style={{ backgroundImage: `url(${voiceImg})` }} />
          <div className="kv">
            <div className="k">语音服务</div>
            <div className="v num">{voiceSvcs.length}</div>
          </div>
          <div className="d mut">{voiceSvcs.map((v) => v.name).join(' · ') || '尚未配置'}</div>
          <I n="arrowR" className="go" size={14} />
        </button>
        <button className="kpi" onClick={() => onNav('models')}>
          <span className="pic" style={{ backgroundImage: `url(${modelsImg})` }} />
          <div className="kv">
            <div className="k">设备型号</div>
            <div className="v num">{models.length}</div>
          </div>
          <div className="d mut">内置 {builtinModelCount} · 自定义 {customModelCount}</div>
          <I n="arrowR" className="go" size={14} />
        </button>
      </div>
      <div className="panel guide">
        <div className="guide-main">
          <b className="guide-h">
            新手引导
            <span className="sub">3 步完成接入</span>
          </b>
          {[
            ['连接账号', '选择已有云端账号，或新建并填入小米 ID 与 passToken', girlImg],
            ['选择设备', '从云端账号拉取音箱列表，选择要接入的设备', catImg],
            ['对话服务', '选择已有对话角色，或新建角色绑定人设', closeImg],
          ].map(([t, d, img], i) => (
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="step-pic" style={{ backgroundImage: `url(${img})` }} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="tag accent" style={{ borderRadius: '50%', width: 20, height: 20, display: 'inline-grid', placeItems: 'center', padding: 0, fontWeight: 700, fontSize: 11 }}>
                    {i + 1}
                  </span>
                  {t}
                </b>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{d}</div>
              </div>
            </div>
          ))}
          <button className="btn primary" style={{ justifyContent: 'center', alignSelf: 'center' }} onClick={onStartWizard}>
            开始三步连接
          </button>
        </div>
        <div className="guide-art" style={{ backgroundImage: `url(${livingImg})` }} />
      </div>
    </section>
  )
}

/* ══ 账号设备 ══ */
export function AccountsView(props: {
  filterAccounts: Account[]
  accounts: Account[]
  selAcct: string | null
  acctDraft: AccountDraft | null
  acctEdit: boolean
  acctDevs: Record<string, AcctDevState>
  devices: DeviceRow[]
  models: SpeakerModel[]
  onSelect: (id: string | null) => void
  onDraft: (d: AccountDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: (id: string) => void
  onSave: () => void
  onRefreshDevs: (id: string) => void
  usage: (id: string) => string[]
}) {
  const { filterAccounts, accounts, selAcct, acctDraft, acctEdit, acctDevs, devices, models, onSelect, onDraft, onEdit, onDelete, onSave, onRefreshDevs, usage } = props
  return (
    <section data-view="accounts" className="on">
      <div className="filters">
        <span className="chip on">全部账号</span>
        <span className="sp">
          <span className="count">共 {accounts.length} 个</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {filterAccounts.map((a) => (
            <div key={a.id} className={'li' + (a.id === selAcct ? ' on' : '')} onClick={() => onSelect(a.id)}>
              <span className="ic">
                <I n="user" />
              </span>
              <span className="txt">
                <b>{a.name}</b>
                <span>{a.miUserId} · {a === accounts[0] ? '默认' : '备用'}</span>
              </span>
              <span className="badge" title={`已接入数/设备总数：${usage(a.id).length}/${acctDevs[a.id]?.list?.length ?? '—'}`}>
                {usage(a.id).length}/{acctDevs[a.id]?.list?.length ?? '—'}
              </span>
            </div>
          ))}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => onSelect(null)}>
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail" key={'acct-' + (selAcct || 'new') + (acctEdit ? '-e' : '-r')}>
          {filterAccounts.length === 0 && !acctDraft ? (
            <div className="empty">
              <div className="art">
                <I n="user" size={26} />
              </div>
              <b>还没有云端账号</b>
              <span>一个账号管理一个家庭；添加后将可在设备向导中直接选择。</span>
              <button className="btn primary" onClick={() => onSelect(null)}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : selAcct && !acctEdit ? (
            <div className="form-card rform">
              <h3>
                <I n="user" size={17} /> 账号详情
              </h3>
              <div className="desc">账号信息与凭据状态；凭据仅保存于本机服务端。</div>
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">账号名称</span>
                      <span className="v">{accounts.find((a) => a.id === selAcct)?.name || '—'}</span>
                    </div>
                    <div className="rr">
                      <span className="k">小米 ID</span>
                      <span className="v">{accounts.find((a) => a.id === selAcct)?.miUserId || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>凭据</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">passToken</span>
                      <span className="v">{accounts.find((a) => a.id === selAcct)?.passToken ? '已保存' : '未配置'}</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>关联设备</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">关联设备</span>
                      <span className="v">{usage(selAcct || '').length} 台</span>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="acct-dev">
                <I n="speaker" size={17} /> 账号设备
                <span className="sp" />
                <button className="icbtn" title="刷新设备" onClick={() => selAcct && onRefreshDevs(selAcct)}>
                  <I n="refresh" size={15} />
                </button>
              </h3>
              {(() => {
                const st = selAcct ? acctDevs[selAcct] : undefined
                if (!st || st.loading)
                  return (
                    <div className="dev-pull loading">
                      <span className="spin" /> 正在从云端读取设备…
                    </div>
                  )
                if (st.err)
                  return (
                    <div className="dev-pull err">
                      <I n="warn" size={15} />
                      {st.err}
                    </div>
                  )
                if (!st.list.length)
                  return <div className="dev-pull empty">该账号下暂无音箱设备</div>
                return (
                  <div className="dev-pull">
                    {st.list.map((d) => {
                      const mm = models.find((m) => m.id === d.hardware || m.name === d.hardware || (m.did && d.hardware && d.hardware.startsWith(m.did)))
                      const bound = devices.find((x) => x.accountId === selAcct && x.did === d.miotDID)
                      return (
                        <div className="pd-row" key={d.miotDID || d.deviceID}>
                          <span className="ic t">
                            {mm?.imageUrl ? <img src={mm.imageUrl} alt="" className="thumb" /> : <I n="speaker" />}
                          </span>
                          <span className="txt">
                            <b>{d.alias || d.name}</b>
                            <span>
                              {mm?.name && mm.name !== d.hardware ? mm.name + ' · ' : ''}
                              {d.hardware || '未知型号'}
                              {d.miotDID ? ' · ' + d.miotDID : ''}
                            </span>
                          </span>
                          <span className={'tag' + (d.presence === 'online' ? ' accent' : ' neu')}>{d.presence === 'online' ? '在线' : '离线'}</span>
                          <span className={'tag' + (bound ? ' accent' : ' neu')}>{bound ? '已接入' : '未接入'}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <div className="acts">
                <span className="sp" />
                <button className="btn danger" onClick={() => selAcct && onDelete(selAcct)}>
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => onEdit(true)}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : acctDraft ? (
            <div className="form-card">
              <h3>
                <I n="user" size={17} /> {selAcct ? '编辑账号' : '新建云端账号'}
              </h3>
              <div className="desc">{selAcct ? '更新名称或凭据；换绑账号后需重启受影响设备。' : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}</div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>账号名称<span className="req">*</span></label>
                    <input value={acctDraft.name} placeholder="例如：默认账号" onChange={(e) => onDraft({ ...acctDraft, name: e.target.value })} />
                  </div>
                  <div className="fld">
                    <label>小米 ID<span className="req">*</span><span className="tip" data-tip="登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。">?</span></label>
                    <input value={acctDraft.miUserId} placeholder="例如：1234567890" onChange={(e) => onDraft({ ...acctDraft, miUserId: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>凭据</h4>
                <div className="row">
                  <div className="fld">
                    <label>passToken<span className="tip" data-tip={selAcct ? '留空则保留原凭据' : '异地登录安全验证时，会给出授权链接'}>?</span></label>
                    <textarea rows={4} value={acctDraft.passToken} placeholder={accounts.find((a) => a.id === selAcct)?.passToken ? '已保存 · 留空保持不变' : '从米家 / 小爱获取的 token'} onChange={(e) => onDraft({ ...acctDraft, passToken: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn ghost" onClick={() => (selAcct ? onEdit(false) : accounts.length ? onSelect(accounts[0].id) : onDraft(null))}>
                  取消
                </button>
                <button className="btn primary" onClick={onSave} disabled={!acctDraft.name || !acctDraft.miUserId}>
                  <I n="check" /> 保存
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

/* ══ 设备型号 ══ */
export function ModelsView(props: {
  filterModels: SpeakerModel[]
  models: SpeakerModel[]
  selModel: string | null
  modelDraft: ModelDraft | null
  modelEdit: boolean
  devices: DeviceRow[]
  filter: 'all' | 'consec' | 'plain'
  onFilter: (f: 'all' | 'consec' | 'plain') => void
  onSelect: (id: string | null) => void
  onDraft: (d: ModelDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: (id: string) => void
  onSave: () => void
}) {
  const { filterModels, models, selModel, modelDraft, modelEdit, devices, filter, onFilter, onSelect, onDraft, onEdit, onDelete, onSave } = props
  return (
    <section data-view="models" className="on">
      <div className="filters">
        <span className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => onFilter('all')}>全部型号</span>
        <span className={'chip' + (filter === 'consec' ? ' on' : '')} onClick={() => onFilter('consec')}>支持连续对话</span>
        <span className={'chip' + (filter === 'plain' ? ' on' : '')} onClick={() => onFilter('plain')}>无法连续对话</span>
        <span className="sp">
          <span className="count">共 {filterModels.length} 个</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {filterModels.map((m) => (
            <div key={m.id} className={'li' + (m.id === selModel ? ' on' : '')} onClick={() => onSelect(m.id)}>
              <span className="ic t">
                {m.imageUrl ? <img src={m.imageUrl} alt="" className="thumb" /> : <I n="speaker" />}
              </span>
              <span className="txt">
                <b>{m.name}</b>
                <span>{m.did}{m.desc ? ' · ' + m.desc.slice(0, 18) : ''}</span>
              </span>
              {m.builtin ? (
                <span className="tag">内置</span>
              ) : (
                <span className="count">{devices.filter((d) => d.speakerModel === m.id).length} 台</span>
              )}
            </div>
          ))}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => onSelect(null)}>
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail" key={'model-' + (selModel || 'new') + (modelEdit ? '-e' : '-r')}>
          {filterModels.length === 0 && !modelDraft ? (
            <div className="empty">
              <div className="art">
                <I n="speaker" size={26} />
              </div>
              <b>还没有音箱型号</b>
              <span>维护各型号音箱的指令与播放配置；设备关联型号后自动生效。</span>
              <button className="btn primary" onClick={() => onSelect(null)}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : selModel && !modelEdit ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> 型号详情
                <span className="refs">
                  {(() => {
                    const used = devices.filter((d) => d.speakerModel === selModel)
                    return used.length ? `被 ${used.map((d) => d.alias).join('、')} 关联 · 关联设备重启后生效` : '未被设备关联 · 可在「设备服务」中选择'
                  })()}
                </span>
              </h3>
              <div className="desc">该型号的硬件标识与数字指令；召唤词与播报词由对话角色控制，设备关联后重启生效。</div>
              {(() => {
                const mm = models.find((m) => m.id === selModel)
                return mm?.imageUrl ? (
                  <div className="model-pic">
                    <img className="fade" src={mm.imageUrl} alt={mm.name} onLoad={(e) => e.currentTarget.classList.add('loaded')} onError={(e) => e.currentTarget.classList.add('loaded')} />
                    <span className="pic-tag">{mm.builtin ? '内置型号' : '自定义型号'}</span>
                  </div>
                ) : null
              })()}
              <div className="ro">
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">型号名称</span>
                      <span className="v">{models.find((m) => m.id === selModel)?.name || '—'}</span>
                    </div>
                    <div className="rr">
                      <span className="k">型号标识</span>
                      <span className="v">{models.find((m) => m.id === selModel)?.did || '—'}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">说明</span>
                      <span className="v">{models.find((m) => m.id === selModel)?.desc || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>硬件指令</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">播放指令</span>
                      <span className="v cmd-row">
                        {(() => {
                          const m = models.find((x) => x.id === selModel)
                          const arr = m?.ttsCommand?.length ? m.ttsCommand.map(String) : ['', '']
                          return arr.slice(0, 2).map((c, i) => <input key={i} className="cmd-input" value={c} disabled placeholder="—" />)
                        })()}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">唤醒命令</span>
                      <span className="v cmd-row">
                        {(() => {
                          const m = models.find((x) => x.id === selModel)
                          const arr = m?.wakeUpCommand?.length ? m.wakeUpCommand.map(String) : ['', '']
                          return arr.slice(0, 2).map((c, i) => <input key={i} className="cmd-input" value={c} disabled placeholder="—" />)
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">播放检测命令</span>
                      <span className="v cmd-row">
                        {(() => {
                          const m = models.find((x) => x.id === selModel)
                          const arr = m?.playingCommand?.length ? m.playingCommand.map(String) : ['', '', '']
                          return arr.slice(0, 3).map((c, i) => <input key={i} className="cmd-input" value={c} disabled placeholder="—" />)
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>连续对话</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">连续对话</span>
                      <span className="v">
                        <label className="switch">
                          <input type="checkbox" checked={!!models.find((x) => x.id === selModel)?.consecutive} disabled />
                          <span className="track" />
                        </label>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button
                  className="btn danger"
                  disabled={!!models.find((m) => m.id === selModel)?.builtin}
                  onClick={() => onDelete(selModel || '')}
                  title={models.find((m) => m.id === selModel)?.builtin ? '系统内置型号不可删除' : ''}
                >
                  <I n="trash" /> 删除
                </button>
                <button
                  className="btn primary"
                  disabled={!!models.find((m) => m.id === selModel)?.builtin}
                  onClick={() => onEdit(true)}
                  title={models.find((m) => m.id === selModel)?.builtin ? '系统内置型号不可编辑' : ''}
                >
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : modelDraft ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> {selModel ? '编辑型号' : '新建型号'}
              </h3>
              <div className="desc">{selModel ? '修改型号配置；已关联设备重启后生效。' : '维护音箱型号的指令与播放配置；创建后可在「设备服务」中选择。'}</div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>型号名称<span className="req">*</span></label>
                    <input value={modelDraft.name} placeholder="例如：小米 AI 音箱第一代" onChange={(e) => onDraft({ ...modelDraft, name: e.target.value })} />
                  </div>
                  <div className="fld">
                    <label>型号标识<span className="req">*</span><span className="tip" data-tip="硬件型号标识（did 前缀），如 X08E、L05B">?</span></label>
                    <input value={modelDraft.did} placeholder="例如：X08E" onChange={(e) => onDraft({ ...modelDraft, did: e.target.value })} />
                  </div>
                </div>
                <div className="row">
                  <div className="fld">
                    <label>简介</label>
                    <input value={modelDraft.desc} placeholder="可选" onChange={(e) => onDraft({ ...modelDraft, desc: e.target.value })} />
                  </div>
                  <div className="fld">
                    <label>图片地址</label>
                    <input value={modelDraft.imageUrl} placeholder="可选，填写设备图片 URL（http/https）" onChange={(e) => onDraft({ ...modelDraft, imageUrl: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>硬件指令</h4>
                {(
                  [
                    ['播放指令', 'ttsCommand', 2, '硬件播放指令数字序列，如 5、1'],
                    ['唤醒命令', 'wakeUpCommand', 2, '硬件唤醒命令数字序列，如 5、1'],
                    ['播放检测命令', 'playingCommand', 3, '查询播放状态命令数字序列，如 3、1、1（部分型号可留空）'],
                  ] as [string, keyof ModelDraft, number, string][]
                ).map(([label, key, count, hint]) => (
                  <div className="row" key={key as string}>
                    <div className="fld">
                      <label>{label}<span className="tip" data-tip={`${hint}（${count} 位数字）`}>?</span></label>
                      <div className="arr-in">
                        {(modelDraft[key] as string[]).map((v, i) => (
                          <input
                            key={i}
                            className="arr-input"
                            value={v}
                            placeholder={`数字 ${i + 1}`}
                            onChange={(e) => onDraft({ ...modelDraft, [key]: (modelDraft[key] as string[]).map((x, j) => (j === i ? e.target.value : x)) })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grp">
                <h4>连续对话</h4>
                <div className="row">
                  <div className="fld">
                    <label>连续对话<span className="tip" data-tip="启用后音箱可连续对话，无需每次唤醒">?</span></label>
                    <label className="switch">
                      <input type="checkbox" checked={!!modelDraft.consecutive} onChange={(e) => onDraft({ ...modelDraft, consecutive: e.target.checked })} />
                      <span className="track" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn ghost" onClick={() => (selModel ? onEdit(false) : models.length ? onSelect(models[0].id) : onDraft(null))}>
                  取消
                </button>
                <button className="btn primary" onClick={onSave} disabled={!modelDraft.name || !modelDraft.did}>
                  <I n="check" /> 保存
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

/* ══ 设备服务 ══ */
export function DevicesView(props: {
  filterDevices: DeviceRow[]
  devices: DeviceRow[]
  selDev: string | null
  devDraft: DevDraft | null
  devEdit: boolean
  devPull: DevPullState
  devAcctFilter: string
  devAcctGroups: { id: string; name: string }[]
  modelPickOpen: boolean
  modelPickQ: string
  models: SpeakerModel[]
  roles: Role[]
  accounts: Account[]
  rooms: Room[]
  onSelect: (id: string | null) => void
  onDraft: (d: DevDraft | null) => void
  onEdit: (e: boolean) => void
  onDelete: () => void
  onSave: () => void
  onRestart: (id: string) => void
  onPull: (accountId: string) => void
  onResetPull: () => void
  onDevAcctFilter: (f: string, firstId: string | null) => void
  onPickOpen: (open: boolean) => void
  onPickQ: (q: string) => void
}) {
  const { filterDevices, devices, selDev, devDraft, devEdit, devPull, devAcctFilter, devAcctGroups, modelPickOpen, modelPickQ, models, roles, accounts, rooms, onSelect, onDraft, onEdit, onDelete, onSave, onRestart, onPull, onResetPull, onDevAcctFilter, onPickOpen, onPickQ } = props
  return (
    <section data-view="devices" className="on">
      <div className="filters">
        <span className={'chip' + (devAcctFilter === 'all' ? ' on' : '')} onClick={() => onDevAcctFilter('all', filterDevices.length ? filterDevices[0].id : null)}>
          全部设备
        </span>
        {devAcctGroups.map((g) => (
          <span key={g.id} className={'chip' + (devAcctFilter === g.id ? ' on' : '')} onClick={() => onDevAcctFilter(g.id, devices.find((d) => d.accountId === g.id)?.id || null)}>
            {g.name}
          </span>
        ))}
        <span className="sp">
          <span className="count">共 {filterDevices.length} 台</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {filterDevices.map((d) => {
            const r = roles.find((x) => x.id === d.roleId)
            return (
              <div key={d.id} className={'li' + (d.id === selDev ? ' on' : '')} onClick={() => onSelect(d.id)}>
                <span className={'ic' + (d.running ? ' t' : '')}>
                  {(() => {
                    const m = models.find((x) => x.id === d.speakerModel || x.name === d.speakerModel)
                    return m?.imageUrl ? <img className="thumb" src={m.imageUrl} alt="" /> : <I n="speaker" />
                  })()}
                </span>
                <span className="txt">
                  <b>{d.alias}</b>
                  <span>{d.did} · {r?.name || '未指定角色'}</span>
                </span>
                <span className={'tag' + (d.running ? ' accent' : ' neu')}>{d.running ? '运行中' : '未启动'}</span>
              </div>
            )
          })}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => onSelect(null)}>
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail" key={'dev-' + (selDev || 'new') + (devEdit ? '-e' : '-r')}>
          {filterDevices.length === 0 && !devDraft ? (
            <div className="empty">
              <div className="art">
                <I n="speaker" size={26} />
              </div>
              <b>还没有绑定设备</b>
              <span>先在「账号设备」接入小米账号，再通过三步向导把音箱绑定到角色与思考服务。</span>
              <button className="btn primary" onClick={() => onSelect(null)}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : selDev && !devEdit ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> 设备详情
                <span className="refs">
                  {devices.find((x) => x.id === selDev)?.running ? '服务运行中 · 变更绑定后需重启' : '服务未启动 · 变更绑定后需重启'}
                </span>
              </h3>
              <div className="desc">设备绑定信息；变更绑定后需重启设备生效。</div>
              <div className="ro">
                {(() => {
                  const ref = devices.find((x) => x.id === selDev)?.speakerModel
                  const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                  return m?.imageUrl ? (
                    <div className="model-pic">
                      <img src={m.imageUrl} alt={m.name} />
                      <span className="pic-tag">{m.builtin ? '内置型号' : '自定义型号'}</span>
                    </div>
                  ) : null
                })()}
                <div className="grp">
                  <h4>基本信息</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">设备名称</span>
                      <span className="v">{devices.find((x) => x.id === selDev)?.alias || '—'}</span>
                    </div>
                    <div className="rr">
                      <span className="k">设备 ID</span>
                      <span className="v">{devices.find((x) => x.id === selDev)?.did || '—'}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">设备型号</span>
                      <span className="v">
                        {(() => {
                          const ref = devices.find((x) => x.id === selDev)?.speakerModel
                          const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                          return m ? `${m.name}（${m.did}）` : ref || '—'
                        })()}
                      </span>
                    </div>
                    <div className="rr">
                      <span className="k">服务状态</span>
                      <span className="v">
                        {(() => {
                          const d = devices.find((x) => x.id === selDev)
                          return d ? (
                            <span className={'tag' + (d.running ? ' accent' : ' neu')}>{d.running ? '运行中' : '未启动'}</span>
                          ) : (
                            '—'
                          )
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>型号指令</h4>
                  <div className="row">
                    {(() => {
                      const ref = devices.find((x) => x.id === selDev)?.speakerModel
                      const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                      if (!m) return null
                      return (
                        <div className="rr">
                          <span className="k">型号指令</span>
                          <span className="v">
                            {[
                              m.ttsCommand?.length ? `播放指令：${m.ttsCommand.join('、')}` : null,
                              m.wakeUpCommand?.length ? `唤醒命令：${m.wakeUpCommand.join('、')}` : null,
                              m.playingCommand?.length ? `播放检测命令：${m.playingCommand.join('、')}` : null,
                              m.consecutive ? '连续对话已启用' : '连续对话未启用',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="grp">
                  <h4>绑定</h4>
                  <div className="row">
                    <div className="rr">
                      <span className="k">云端账号</span>
                      <span className="v">{accounts.find((a) => a.id === devices.find((x) => x.id === selDev)?.accountId)?.name || '默认账号'}</span>
                    </div>
                    <div className="rr">
                      <span className="k">对话角色</span>
                      <span className="v">{roles.find((r) => r.id === devices.find((x) => x.id === selDev)?.roleId)?.name || '未指定'}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="rr">
                      <span className="k">服务绑定</span>
                      <span className="v">思考服务 · 语音服务 由对话角色统一提供</span>
                    </div>
                  </div>
                </div>
                <div className="grp">
                  <h4>连续对话</h4>
                  {(() => {
                    const ref = devices.find((x) => x.id === selDev)?.speakerModel
                    const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                    const meta = devices.find((x) => x.id === selDev)
                    if (!m && !meta) return null
                    return (
                      <>
                        <div className="row">
                          <div className="rr">
                            <span className="k">连续对话</span>
                            <span className="v">
                              {(() => {
                                if (!m) return '—'
                                if (!m.consecutive) return '未启用（型号不支持）'
                                return m.playingCommand?.length ? '启用 · 支持播放状态检测' : '启用 · 依赖 Mina 检测播放状态'
                              })()}
                            </span>
                          </div>
                          <div className="rr">
                            <span className="k">对话超时</span>
                            <span className="v">{meta?.exitKeepAliveAfter ?? 30} 秒无响应退出</span>
                          </div>
                        </div>
                        <div className="row">
                          <div className="rr">
                            <span className="k">会话群</span>
                            <span className="v">
                              {(() => {
                                const meta = devices.find((x) => x.id === selDev)
                                if (!meta?.roomRef) return '—'
                                const rm = rooms.find((x) => x.id === meta.roomRef)
                                return rm ? `${rm.name}${rm.description ? ' · ' + rm.description : ''}` : meta.roomRef
                              })()}
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn ghost" onClick={() => onRestart(selDev || '')}>
                  <I n="restart" /> {devices.find((x) => x.id === selDev)?.running ? '重启' : '启动'}
                </button>
                <button className="btn danger" onClick={onDelete}>
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => onEdit(true)}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : devDraft ? (
            <div className="form-card">
              <h3>
                <I n="speaker" size={17} /> {selDev ? '编辑设备' : '新建设备'}
                <span className="refs">{selDev ? (devices.find((x) => x.id === selDev)?.running ? '服务运行中 · 修改绑定后需重启' : '服务未启动 · 修改绑定后需重启') : '新建设备：从云端账号拉取选择，保存后立即选中'}</span>
              </h3>
              <div className="desc">{selDev ? '修改设备绑定；已变更的绑定需重启设备生效。' : '填入音箱 did 与绑定关系；创建后可重启设备生效。'}</div>
              <div className="grp">
                <h4>基本信息</h4>
                <div className="row">
                  <div className="fld">
                    <label>设备名称<span className="req">*</span></label>
                    <input value={devDraft.alias} placeholder="例如：客餐厅音箱" onChange={(e) => onDraft({ ...devDraft, alias: e.target.value })} />
                  </div>
                  <div className="fld">
                    <label>设备 ID<span className="req">*</span><span className="tip" data-tip="小爱音箱 ID 或名称。新建时由「云端账号拉取」自动带入；编辑模式可手动修改。">?</span></label>
                    {selDev ? (
                      <input value={devDraft.did} placeholder="例如：小爱音箱Pro" onChange={(e) => onDraft({ ...devDraft, did: e.target.value })} />
                    ) : (
                      <div className="ro" style={{ minHeight: 40, alignItems: 'center' }}>
                        <span className="v" style={{ fontSize: 13.5, color: devDraft.did ? 'var(--ink-1)' : 'var(--ink-3)' }}>
                          {devDraft.did || '请先从下方云端账号拉取选择'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>设备型号</h4>
                <div className="row">
                  <div className="fld">
                    <label>设备型号<span className="tip" data-tip="输入关键字可搜索型号；选择后自动带入该型号的指令与播放配置（可在「设备型号」维护）。">?</span></label>
                    <div className="model-pick">
                      <input
                        value={
                          modelPickOpen
                            ? modelPickQ
                            : (() => {
                                const m = models.find((x) => x.id === devDraft.speakerModel)
                                return m ? `${m.name}（${m.did}）` : ''
                              })()
                        }
                        placeholder="输入关键字搜索型号…"
                        onMouseDown={() => { if (!modelPickOpen) onPickOpen(true) }}
                        onFocus={() => onPickOpen(true)}
                        onBlur={() => setTimeout(() => onPickOpen(false), 150)}
                        onChange={(e) => onPickQ(e.target.value)}
                      />
                      {modelPickOpen && (
                        <div className="model-pick-list">
                          {(() => {
                            const q = modelPickQ.trim().toLowerCase()
                            const sorted = [...models]
                              .sort((a, b) => {
                                if (!!a.builtin !== !!b.builtin) return a.builtin ? -1 : 1
                                if (a.builtin && b.builtin) return a.name.localeCompare(b.name, 'zh-Hans-CN')
                                return (a.createdAt || 0) - (b.createdAt || 0)
                              })
                              .filter((m) => !q || m.name.toLowerCase().includes(q) || m.did.toLowerCase().includes(q) || m.id.includes(q))
                            return sorted.length ? (
                              sorted.map((m) => (
                                <div
                                  key={m.id}
                                  className={'pick-li' + (devDraft.speakerModel === m.id ? ' on' : '')}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    onDraft({ ...devDraft, speakerModel: m.id })
                                    onPickOpen(false)
                                    onPickQ('')
                                  }}
                                >
                                  {m.imageUrl ? <img src={m.imageUrl} alt="" /> : <span className="ph" />}
                                  <span>{m.name}（{m.did}）</span>
                                </div>
                              ))
                            ) : (
                              <div className="pick-empty">未找到匹配型号</div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                    {(() => {
                      const m = models.find((x) => x.id === devDraft.speakerModel)
                      if (!m) return null
                      return (
                        <div className="fld-tags">
                          <span><b>播放指令</b>{m.ttsCommand?.length ? m.ttsCommand.join('、') : '—'}</span>
                          <span><b>唤醒命令</b>{m.wakeUpCommand?.length ? m.wakeUpCommand.join('、') : '—'}</span>
                          <span><b>播放检测命令</b>{m.playingCommand?.length ? m.playingCommand.join('、') : '—'}</span>
                          <span><b>连续对话</b>{m.consecutive ? '已启用' : '未启用'}</span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>绑定</h4>
                <div className="row">
                  <div className="fld">
                    <label>云端账号</label>
                    <select
                      value={devDraft.accountId}
                      onChange={(e) => {
                        onDraft({ ...devDraft, accountId: e.target.value, did: '', speakerModel: '' })
                        onResetPull()
                      }}
                    >
                      <option value="">未指定（使用默认账号）</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}（{a.miUserId}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label>对话角色<span className="tip" data-tip="选择对话角色后，思考服务与语音服务由角色统一提供，无需在此重复配置。">?</span></label>
                    <select value={devDraft.roleId} onChange={(e) => onDraft({ ...devDraft, roleId: e.target.value })}>
                      <option value="">未指定</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {!selDev && (
                  <div className="row">
                    <div className="fld">
                      <label>从账号拉取<span className="tip" data-tip="从该云端账号自动拉取小爱音箱（凭小米 ID + passToken，无需密码）；点击选择后自动带入名称、设备 ID 与型号。">?</span></label>
                      <div className="pull-dev">
                        <button className="btn" onClick={() => onPull(devDraft.accountId)} disabled={!devDraft.accountId || devPull.loading}>
                          <I n="refresh" /> {devPull.loading ? '拉取中…' : '拉取设备列表'}
                        </button>
                        {devPull.err && (
                          <div className="notice err" style={{ marginTop: 8 }}>
                            <I n="warning" size={15} /> {devPull.err}
                          </div>
                        )}
                        {devPull.list && (
                          <div className="pick-list" style={{ marginTop: 8 }}>
                            {devPull.list.map((d) => {
                              const m = models.find((x) => x.did.toLowerCase() === (d.hardware || '').toLowerCase())
                              const bound = !!devices.find((x) => x.accountId === devDraft.accountId && x.did === d.miotDID)
                              return (
                                <div
                                  className={'pl' + (devDraft.did === d.miotDID ? ' on' : '') + (bound ? ' off' : '')}
                                  key={d.miotDID}
                                  onClick={() => {
                                    if (bound) return
                                    onDraft({ ...devDraft, alias: d.name || d.alias, did: d.miotDID, speakerModel: m ? m.id : devDraft.speakerModel })
                                  }}
                                >
                                  <span className="ic">
                                    <I n="speaker" />
                                  </span>
                                  <span>
                                    <b>{d.name || d.alias}</b>
                                    <span>
                                      {m ? m.name : d.hardware || '未知型号'} · {d.presence === 'online' ? '在线' : '离线'}
                                    </span>
                                  </span>
                                  {bound ? <span className="tag neu">已接入</span> : devDraft.did === d.miotDID && <I n="check" size={18} />}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="row">
                  <div className="fld">
                    <label>连续对话超时（秒）<span className="tip" data-tip="连续对话中无响应多久自动退出唤醒模式，默认 30 秒">?</span></label>
                    <input value={devDraft.exitKeepAliveAfter || '30'} placeholder="默认 30" onChange={(e) => onDraft({ ...devDraft, exitKeepAliveAfter: e.target.value })} />
                  </div>
                  <div className="fld">
                    <label>会话群<span className="tip" data-tip="对话记忆的上下文归属（对应旧版「会话群 chatGroup」），多台设备可共用；可在「会话群」菜单新建">?</span></label>
                    <select value={devDraft.roomRef} onChange={(e) => onDraft({ ...devDraft, roomRef: e.target.value })}>
                      <option value="">未指定</option>
                      {rooms.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {(() => {
                const m = models.find((x) => x.id === devDraft.speakerModel)
                if (!m) return null
                if (!m.consecutive) {
                  return (
                    <div className="notice err">
                      <I n="warning" size={15} /> 此型号不支持连续对话（streamResponse 已禁用）。
                    </div>
                  )
                }
                if (!m.playingCommand?.length) {
                  return (
                    <div className="notice">
                      <I n="warning" size={15} /> 此型号未配置播放检测指令，连续对话将依赖 Mina 检测播放状态；若出现异常，可在「设备型号」中补充播放检测指令。
                    </div>
                  )
                }
                return null
              })()}
              <div className="acts">
                <span className="sp" />
                <button className="btn ghost" onClick={() => (selDev ? onEdit(false) : devices.length ? onSelect(devices[0].id) : onDraft(null))}>
                  取消
                </button>
                <button className="btn primary" onClick={onSave} disabled={!devDraft.alias || !devDraft.did}>
                  <I n="check" /> 保存
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

/* ══ 思考服务 / 语音服务（settings/think/voice 共用，按 tab 切换） ══ */
export function ServicesView(props: {
  tab: 'think' | 'voice'
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  selThink: string | null
  selVoice: string | null
  thinkDraft: ThinkDraft | null
  voiceDraft: VoiceDraft | null
  thinkEdit: boolean
  voiceEdit: boolean
  selVoiceObj: VoiceService | null
  onSelectThink: (id: string | null) => void
  onDraftThink: (d: ThinkDraft | null) => void
  onEditThink: (e: boolean) => void
  onDeleteThink: (id: string) => void
  onSaveThink: () => void
  onSelectVoice: (id: string | null) => void
  onDraftVoice: (d: VoiceDraft | null) => void
  onEditVoice: (e: boolean) => void
  onDeleteVoice: (id: string) => void
  onSaveVoice: () => void
  usageThink: (id: string) => number
  usageVoice: (id: string) => number
}) {
  const { tab, thinkSvcs, voiceSvcs, selThink, selVoice, thinkDraft, voiceDraft, thinkEdit, voiceEdit, selVoiceObj, onSelectThink, onDraftThink, onEditThink, onDeleteThink, onSaveThink, onSelectVoice, onDraftVoice, onEditVoice, onDeleteVoice, onSaveVoice, usageThink, usageVoice } = props
  return (
    <section data-view="settings" className="on">
      {tab === 'think' && (
        <>
          <div className="filters">
            <span className="chip on">全部服务</span>
            <span className="sp">
              <span className="count">共 {thinkSvcs.length} 个</span>
            </span>
          </div>
          <div className="split">
            <aside className="slist">
              {thinkSvcs.map((s) => (
                <div key={s.id} className={'li' + (s.id === selThink ? ' on' : '')} onClick={() => onSelectThink(s.id)}>
                  <span className="ic t">
                    <I n="bolt" />
                  </span>
                  <span className="txt">
                    <b>{s.name}</b>
                    <span>{PROVIDERS[s.provider] || s.provider} · {s.model}</span>
                  </span>
                  {s.isDefault && <span className="tag">默认</span>}
                </div>
              ))}
              <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => onSelectThink(null)}>
                <I n="plus" /> 新建
              </button>
            </aside>
            <section className="sdetail" key={'think-' + (selThink || 'new') + (thinkEdit ? '-e' : '-r')}>
              {thinkSvcs.length === 0 && !thinkDraft ? (
                <div className="empty">
                  <div className="art">
                    <I n="bolt" size={26} />
                  </div>
                  <b>还没有思考服务</b>
                  <span>配置模型供应商与端点，作为音箱的「大脑」；配置后可在角色与设备中选择。</span>
                  <button className="btn primary" onClick={() => onSelectThink(null)}>
                    <I n="plus" /> 新建
                  </button>
                </div>
              ) : selThink && !thinkEdit ? (
                <div className="form-card">
                  <h3>
                    <I n="bolt" size={17} /> 思考服务详情
                    <span className="refs">
                      被 {usageThink(selThink)} 台设备引用 · 修改模型 / 温度后热生效
                    </span>
                  </h3>
                  <div className="desc">音箱「大脑」的模型配置；修改后绑定设备热生效。</div>
                  <div className="ro">
                    <div className="grp">
                      <h4>基本信息</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">服务名称</span>
                          <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.name || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">供应商</span>
                          <span className="v">{PROVIDERS[thinkSvcs.find((s) => s.id === selThink)?.provider || ''] || thinkSvcs.find((s) => s.id === selThink)?.provider || '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grp">
                      <h4>模型配置</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">模型端点</span>
                          <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.model || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">API Key</span>
                          <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.apiKey ? '已保存' : '未配置'}</span>
                        </div>
                      </div>
                      <div className="row">
                        <div className="rr">
                          <span className="k">温度</span>
                          <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.temperature ?? 0.7}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button className="btn danger" onClick={() => onDeleteThink(selThink || '')}>
                      <I n="trash" /> 删除
                    </button>
                    <button className="btn primary" onClick={() => onEditThink(true)}>
                      <I n="pencil" /> 编辑
                    </button>
                  </div>
                </div>
              ) : thinkDraft ? (
                <div className="form-card">
                  <h3>
                    <I n="bolt" size={17} /> {selThink ? '编辑思考服务' : '新建思考服务'}
                    <span className="refs">{selThink ? `被 ${usageThink(selThink)} 台设备引用 · 修改模型 / 温度后热生效` : '配置模型供应商与端点，作为音箱的「大脑」'}</span>
                  </h3>
                  <div className="desc">{selThink ? '修改大脑配置；已绑定设备热生效。' : '配置模型供应商与端点，作为音箱的「大脑」。'}</div>
                  <div className="grp">
                    <h4>基本信息</h4>
                    <div className="row">
                      <div className="fld">
                        <label>服务名称<span className="req">*</span></label>
                        <input value={thinkDraft.name} placeholder="例如：豆包 Doubao-Seed" onChange={(e) => onDraftThink({ ...thinkDraft, name: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>供应商<span className="req">*</span></label>
                        <select
                          value={thinkDraft.provider}
                          onChange={(e) => {
                            const p = e.target.value
                            const preset = PROVIDER_PRESETS[p]
                            const prev = PROVIDER_PRESETS[thinkDraft.provider]
                            onDraftThink({
                              ...thinkDraft,
                              provider: p,
                              baseUrl: preset?.baseUrl || '',
                              model: thinkDraft.model && thinkDraft.model !== prev?.model ? thinkDraft.model : preset?.model || '',
                            })
                          }}
                        >
                          {Object.entries(PROVIDERS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grp">
                    <h4>模型配置</h4>
                    <div className="row">
                      <div className="fld">
                        <label>接口地址<span className="tip" data-tip="选「自定义」时可手动填写；其他供应商自动填充官方地址，可随供应商自动带出">?</span></label>
                        {thinkDraft.provider === 'custom' ? (
                          <input value={thinkDraft.baseUrl} placeholder="https://api.example.com/v1" onChange={(e) => onDraftThink({ ...thinkDraft, baseUrl: e.target.value })} />
                        ) : (
                          <input value={thinkDraft.baseUrl || PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl || ''} readOnly disabled placeholder="选择供应商后自动填充" />
                        )}
                      </div>
                      <div className="fld">
                        <label>模型端点<span className="req">*</span><span className="tip" data-tip="切换供应商自动带出示例模型，可修改">?</span></label>
                        <input value={thinkDraft.model} placeholder="ep-xxxxxxxx 或模型名" onChange={(e) => onDraftThink({ ...thinkDraft, model: e.target.value })} />
                      </div>
                    </div>
                    <div className="row">
                      <div className="fld">
                        <label>API Key</label>
                        <input value={thinkDraft.apiKey} placeholder={selThink ? '留空则保留原 Key' : 'ark- 开头的密钥'} onChange={(e) => onDraftThink({ ...thinkDraft, apiKey: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>温度<span className="tip" data-tip="取值范围 0–1，越高回答越发散">?</span></label>
                        <input value={thinkDraft.temperature} onChange={(e) => onDraftThink({ ...thinkDraft, temperature: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button className="btn ghost" onClick={() => (selThink ? onEditThink(false) : thinkSvcs.length ? onSelectThink(thinkSvcs[0].id) : onDraftThink(null))}>
                      取消
                    </button>
                    <button className="btn primary" onClick={onSaveThink} disabled={!thinkDraft.name || !thinkDraft.model}>
                      <I n="check" /> 保存
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}

      {tab === 'voice' && (
        <>
          <div className="filters">
            <span className="chip on">全部服务</span>
            <span className="sp">
              <span className="count">共 {voiceSvcs.length} 个</span>
            </span>
          </div>
          <div className="split">
            <aside className="slist">
              {voiceSvcs.map((s) => (
                <div key={s.id} className={'li' + (s.id === selVoice ? ' on' : '')} onClick={() => onSelectVoice(s.id)}>
                  <span className="ic v">
                    <I n="mic" />
                  </span>
                  <span className="txt">
                    <b>{s.name}</b>
                    <span>{s.builtin ? 'builtin · 全局默认音色' : (TTS_ENGINES[s.provider] || s.provider) + (s.voiceId ? ' · ' + s.voiceId : '')}</span>
                  </span>
                  {s.builtin ? (
                    <span className="tag">内置</span>
                  ) : s.isDefault ? (
                    <span className="tag">默认</span>
                  ) : null}
                </div>
              ))}
              <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => onSelectVoice(null)}>
                <I n="plus" /> 新建
              </button>
            </aside>
            <section className="sdetail" key={'voice-' + (selVoice || 'new') + (voiceEdit ? '-e' : '-r')}>
              {voiceSvcs.length === 0 && !voiceDraft ? (
                <div className="empty">
                  <div className="art">
                    <I n="mic" size={26} />
                  </div>
                  <b>还没有语音服务</b>
                  <span>接入第三方语音模型，为对话角色提供音色；每个语音服务可含多套音色库。</span>
                  <button className="btn primary" onClick={() => onSelectVoice(null)}>
                    <I n="plus" /> 新建
                  </button>
                </div>
              ) : selVoice && !voiceEdit ? (
                <div className="form-card">
                  <h3>
                    <I n="mic" size={17} /> 语音服务详情
                    <span className="refs">
                      被 {usageVoice(selVoice)} 台设备引用 · 支持热切「把声音换成…」
                    </span>
                  </h3>
                  <div className="desc">为对话角色提供音色的配置；修改后绑定设备支持热切。</div>
                  <div className="ro">
                    <div className="grp">
                      <h4>基本信息</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">服务名称</span>
                          <span className="v">{voiceSvcs.find((s) => s.id === selVoice)?.name || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">供应商</span>
                          <span className="v">{voiceSvcs.find((s) => s.id === selVoice)?.builtin ? '默认语音' : TTS_ENGINES[voiceSvcs.find((s) => s.id === selVoice)?.provider || ''] || voiceSvcs.find((s) => s.id === selVoice)?.provider || '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grp">
                      <h4>音色</h4>
                      <div className="row">
                        <div className="rr">
                          <span className="k">音色 ID</span>
                          <span className="v">{voiceSvcs.find((s) => s.id === selVoice)?.voiceId || '默认音色'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button className="btn danger" disabled={!!selVoiceObj?.builtin} onClick={() => onDeleteVoice(selVoice || '')} title={selVoiceObj?.builtin ? '内置语音服务不可删除' : ''}>
                      <I n="trash" /> 删除
                    </button>
                    <button className="btn primary" disabled={!!selVoiceObj?.builtin} onClick={() => onEditVoice(true)} title={selVoiceObj?.builtin ? '内置语音服务不可编辑' : ''}>
                      <I n="pencil" /> 编辑
                    </button>
                  </div>
                </div>
              ) : voiceDraft ? (
                <div className="form-card">
                  <h3>
                    <I n="mic" size={17} /> {selVoice ? '编辑语音服务' : '新建语音服务'}
                    <span className="refs">{selVoice ? `被 ${usageVoice(selVoice)} 台设备引用 · 支持热切「把声音换成…」` : '接入第三方语音模型，为对话角色提供音色'}</span>
                  </h3>
                  <div className="desc">{selVoice ? '修改音色配置；已绑定设备支持热切。' : '接入第三方语音模型，为对话角色提供音色。'}</div>
                  <div className="grp">
                    <h4>基本信息</h4>
                    <div className="row">
                      <div className="fld">
                        <label>服务名称<span className="req">*</span></label>
                        <input value={voiceDraft.name} placeholder="例如：豆包语音" onChange={(e) => onDraftVoice({ ...voiceDraft, name: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>供应商<span className="req">*</span></label>
                        <select value={voiceDraft.provider} onChange={(e) => onDraftVoice({ ...voiceDraft, provider: e.target.value })}>
                          {Object.entries(TTS_ENGINES)
                            .filter(([k]) => k !== 'builtin')
                            .map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grp">
                    <h4>音色配置</h4>
                    <div className="row">
                      <div className="fld">
                        <label>音色 ID<span className="tip" data-tip="留空使用该引擎的默认音色">?</span></label>
                        <input value={voiceDraft.voiceId} placeholder="例如：zh-CN-XiaoxiaoNeural" onChange={(e) => onDraftVoice({ ...voiceDraft, voiceId: e.target.value })} />
                      </div>
                      {voiceDraft.provider === 'edge' && (
                        <div className="fld">
                          <label>访问令牌<span className="tip" data-tip="Edge 大声朗读为免费服务，一般无需填写">?</span></label>
                          <input value={voiceDraft.edgeToken} placeholder="留空由 Edge 自动获取" onChange={(e) => onDraftVoice({ ...voiceDraft, edgeToken: e.target.value })} />
                        </div>
                      )}
                      {voiceDraft.provider === 'volcano' && (
                        <div className="fld">
                          <label>App ID<span className="req">*</span></label>
                          <input value={voiceDraft.volcanoAppId} placeholder="火山引擎语音合成 App ID" onChange={(e) => onDraftVoice({ ...voiceDraft, volcanoAppId: e.target.value })} />
                        </div>
                      )}
                      {voiceDraft.provider === 'openai' && (
                        <div className="fld">
                          <label>API Key<span className="req">*</span></label>
                          <input value={voiceDraft.openaiKey} placeholder="OpenAI API Key" onChange={(e) => onDraftVoice({ ...voiceDraft, openaiKey: e.target.value })} />
                        </div>
                      )}
                    </div>
                    {voiceDraft.provider === 'volcano' && (
                      <div className="row">
                        <div className="fld">
                          <label>访问令牌<span className="req">*</span></label>
                          <input value={voiceDraft.volcanoToken} placeholder="火山引擎 Access Token" onChange={(e) => onDraftVoice({ ...voiceDraft, volcanoToken: e.target.value })} />
                        </div>
                      </div>
                    )}
                    {voiceDraft.provider === 'openai' && (
                      <div className="row">
                        <div className="fld">
                          <label>模型<span className="tip" data-tip="留空使用 tts-1">?</span></label>
                          <input value={voiceDraft.openaiModel} placeholder="tts-1" onChange={(e) => onDraftVoice({ ...voiceDraft, openaiModel: e.target.value })} />
                        </div>
                        <div className="fld">
                          <label>接口地址<span className="tip" data-tip="支持任意 OpenAI 兼容 TTS 端点">?</span></label>
                          <input value={voiceDraft.openaiBaseUrl} placeholder="https://api.openai.com/v1" onChange={(e) => onDraftVoice({ ...voiceDraft, openaiBaseUrl: e.target.value })} />
                        </div>
                      </div>
                    )}
                    {voiceDraft.provider === 'custom' && (
                      <div className="row">
                        <div className="fld">
                          <label>TTS 配置（JSON）<span className="tip" data-tip="高级用法：直接填写 mi-gpt TTSConfig JSON">?</span></label>
                          <textarea value={voiceDraft.customJson} placeholder='{"edge":{"trustedToken":"…"}}' onChange={(e) => onDraftVoice({ ...voiceDraft, customJson: e.target.value })} rows={5} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="acts">
                    <span className="sp" />
                    <button className="btn ghost" onClick={() => (selVoice ? onEditVoice(false) : voiceSvcs.length ? onSelectVoice(voiceSvcs[0].id) : onDraftVoice(null))}>
                      取消
                    </button>
                    <button className="btn primary" onClick={onSaveVoice} disabled={!voiceDraft.name || (voiceDraft.provider === 'volcano' && (!voiceDraft.volcanoAppId || !voiceDraft.volcanoToken)) || (voiceDraft.provider === 'openai' && !voiceDraft.openaiKey)}>
                      <I n="check" /> 保存
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </section>
  )
}

/* ══ 个人中心 ══ */
export function ProfileView(props: { onPwd: () => void; onLogout: () => void }) {
  const { onPwd, onLogout } = props
  return (
    <section data-view="profile" className="on">
      <div className="profile">
        <div className="pset">
          <div className="pcard-block">
            <h4>账号信息</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">登录账号</span>
                <span className="val">admin</span>
              </div>
              <div className="pi">
                <span className="lbl">身份</span>
                <span className="val">超级管理员</span>
              </div>
              <div className="pi click" onClick={onPwd}>
                <span className="lbl">修改密码</span>
                <span className="val">立即修改 ›</span>
              </div>
            </div>
          </div>
          <div className="pcard-block">
            <h4>基础设置</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">界面语言</span>
                <span className="val">简体中文</span>
              </div>
              <div className="pi">
                <span className="lbl">时区</span>
                <span className="val">UTC+8 · 中国标准时间</span>
              </div>
              <div className="pi">
                <span className="lbl">主题模式</span>
                <span className="val muted">浅色</span>
              </div>
            </div>
          </div>
          <div className="pcard-block">
            <h4>通知与安全</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">
                  设备异常提醒
                  <small>设备离线或服务异常时推送通知</small>
                </span>
                <span className="val">
                  <span className="sw off" />
                </span>
              </div>
              <div className="pi">
                <span className="lbl">
                  双重验证
                  <small>登录时需要额外验证码</small>
                </span>
                <span className="val">
                  <span className="sw off" />
                </span>
              </div>
              <div className="pi">
                <span className="lbl">
                  登录认证
                  <small>面板访问需要账号密码</small>
                </span>
                <span className="val">
                  <span className="sw on" />
                </span>
              </div>
            </div>
          </div>
          <div className="pcard-block">
            <h4>其他</h4>
            <div className="pcard-set">
              <div className="pi">
                <span className="lbl">版本信息</span>
                <span className="val">v1.12.0</span>
              </div>
              <div className="pi click danger" onClick={onLogout}>
                <span className="lbl">退出登录</span>
                <span className="val">立即退出 ›</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
