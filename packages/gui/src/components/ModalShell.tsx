/* ══ ModalShell ══ */
import { useState } from 'react'
import {
  type Account,
  type Role,
  type Room,
  type SpeakerModel,
  type ThinkService,
  type VoiceService,
} from '../apis.ts'
import { I } from '../icons.tsx'
import { PROVIDERS, PROVIDER_PRESETS, TTS_ENGINES } from '../constants.ts'
import type { ModalState } from '..//ui-types.ts'

export function ModalShell(props: {
  modal: ModalState
  accounts: Account[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onDone: (values: Record<string, unknown>) => void
}) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const p = (props.modal.payload || {}) as Record<string, unknown>
    const init: Record<string, string> = {}
    if (props.modal.kind === 'account') {
      init.name = (p.name as string) || ''
      init.miUserId = (p.miUserId as string) || ''
      init.passToken = ''
    } else if (props.modal.kind === 'think') {
      init.name = (p.name as string) || ''
      init.provider = (p.provider as string) || 'doubao'
      init.model =
        (p.model as string) || PROVIDER_PRESETS[init.provider]?.model || ''
      init.apiKey = ''
      init.temperature = String((p.temperature as number) ?? 0.7)
      init.baseUrl =
        (p.baseUrl as string) || PROVIDER_PRESETS[init.provider]?.baseUrl || ''
    } else if (props.modal.kind === 'voice') {
      init.name = (p.name as string) || ''
      init.provider = (p.provider as string) || 'edge'
      init.voiceId = (p.voiceId as string) || ''
      const tts = (p.tts as Record<string, any>) || {}
      init.edgeToken = tts.edge?.trustedToken || ''
      init.volcanoAppId = tts.volcano?.appId || ''
      init.volcanoToken = tts.volcano?.accessToken || ''
      init.openaiKey = tts.openai?.apiKey || ''
      init.openaiModel = tts.openai?.model || ''
      init.openaiBaseUrl = tts.openai?.baseUrl || ''
    } else if (props.modal.kind === 'role') {
      init.name = (p.name as string) || ''
      init.profile = (p.profile as string) || ''
    } else if (props.modal.kind === 'deviceBind') {
      init.accountId = (p.accountId as string) || ''
      init.roleId = (p.roleId as string) || ''
      init.thinkServiceId = (p.thinkServiceId as string) || ''
      init.voiceOverrideId = (p.voiceOverrideId as string) || ''
      init.speakerModel = (p.speakerModel as string) || ''
      init.exitKeepAliveAfter = String((p.exitKeepAliveAfter as number) ?? 30)
      init.roomRef = (p.roomRef as string) || ''
    }
    return init
  })
  const { modal } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const isEdit = !!(modal.payload as { id?: string })?.id
  const submit = () => {
    if (closing) return
    let out: Record<string, unknown> = {}
    if (modal.kind === 'account') {
      out = { name: v.name, miUserId: v.miUserId, passToken: v.passToken }
    } else if (modal.kind === 'think') {
      out = {
        name: v.name,
        provider: v.provider,
        model: v.model,
        temperature: parseFloat(v.temperature) || 0.7,
      }
      out.baseUrl = v.baseUrl || PROVIDER_PRESETS[v.provider]?.baseUrl || ''
      if (v.apiKey) out.apiKey = v.apiKey
    } else if (modal.kind === 'voice') {
      out = { name: v.name, provider: v.provider }
      if (v.voiceId) out.voiceId = v.voiceId
      const tts: Record<string, unknown> = {}
      if (v.provider === 'edge') {
        tts.edge = v.edgeToken ? { trustedToken: v.edgeToken } : {}
      } else if (v.provider === 'volcano') {
        if (!v.volcanoAppId || !v.volcanoToken) {
          setV({ ...v, err: '火山引擎需填写 App ID 与访问令牌' })
          return
        }
        tts.volcano = { appId: v.volcanoAppId, accessToken: v.volcanoToken }
      } else if (v.provider === 'openai') {
        if (!v.openaiKey) {
          setV({ ...v, err: 'OpenAI TTS 需填写 API Key' })
          return
        }
        tts.openai = {
          apiKey: v.openaiKey,
          ...(v.openaiModel ? { model: v.openaiModel } : {}),
          ...(v.openaiBaseUrl ? { baseUrl: v.openaiBaseUrl } : {}),
        }
      } else if (v.provider === 'custom') {
        try {
          const j = JSON.parse(v.customJson || '{}')
          Object.assign(tts, j)
        } catch {
          setV({ ...v, err: '自定义 TTS 配置不是合法 JSON' })
          return
        }
      }
      if (Object.keys(tts).length) out.tts = tts as never
    } else if (modal.kind === 'role') {
      out = { name: v.name, profile: v.profile }
    } else if (modal.kind === 'pwd') {
      if (!v.old) {
        setV({ ...v, err: '请输入当前密码' })
        return
      }
      if (!v.pwd) {
        setV({ ...v, err: '请输入新密码' })
        return
      }
      if (v.pwd !== v.pwd2) {
        setV({ ...v, err: '两次输入的新密码不一致' })
        return
      }
      out = { old: v.old, pwd: v.pwd }
    } else if (modal.kind === 'deviceBind') {
      out = {
        roleId: v.roleId || undefined,
        accountId: v.accountId || undefined,
        thinkServiceId: v.thinkServiceId || undefined,
        voiceOverrideId: v.voiceOverrideId || undefined,
        speakerModel: v.speakerModel || undefined,
        exitKeepAliveAfter: parseInt(v.exitKeepAliveAfter || '30', 10) || 30,
        roomRef: v.roomRef || undefined,
      }
    }
    close(() => props.onDone(out))
  }
  return (
    <>
      <div
        className={'scrim on' + (closing ? ' closing' : '')}
        onClick={() => close()}
      />
      <div className={'modal on' + (closing ? ' closing' : '')}>
        <h3>
          <I
            n={
              modal.kind === 'pwd'
                ? 'lock'
                : modal.kind === 'think'
                  ? 'bolt'
                  : modal.kind === 'voice'
                    ? 'mic'
                    : modal.kind === 'role'
                      ? 'chat'
                      : 'user'
            }
            size={18}
          />{' '}
          {modal.title}
        </h3>
        <div className="desc">{modal.desc}</div>

        {modal.kind === 'account' && (
          <>
            <div className="fld row">
              <label>
                账号名称<span className="req">*</span>
              </label>
              <input
                value={v.name || ''}
                placeholder="例如：默认账号"
                onChange={(e) => setV({ ...v, name: e.target.value })}
              />
            </div>
            <div className="fld row">
              <label>
                小米 ID<span className="req">*</span>
              </label>
              <input
                value={v.miUserId || ''}
                placeholder="例如：1234567890"
                onChange={(e) => setV({ ...v, miUserId: e.target.value })}
              />
              <span className="hint">
                登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。
              </span>
            </div>
            <div className="fld">
              <label>passToken</label>
              <textarea
                rows={4}
                value={v.passToken || ''}
                placeholder={
                  isEdit && v.passToken
                    ? '已保存 · 留空保持不变'
                    : '从米家 / 小爱获取的 token'
                }
                onChange={(e) => setV({ ...v, passToken: e.target.value })}
              />
              <span className="hint">
                {isEdit
                  ? '留空则保留原凭据'
                  : '异地登录安全验证时，会给出授权链接'}
              </span>
            </div>
          </>
        )}

        {modal.kind === 'think' && (
          <>
            <div className="fld row">
              <label>
                服务名称<span className="req">*</span>
              </label>
              <input
                value={v.name || ''}
                placeholder="例如：豆包 Doubao-Seed"
                onChange={(e) => setV({ ...v, name: e.target.value })}
              />
            </div>
            <div className="fld row">
              <label>
                供应商<span className="req">*</span>
              </label>
              <select
                value={v.provider || 'doubao'}
                onChange={(e) => {
                  const p = e.target.value
                  const preset = PROVIDER_PRESETS[p]
                  const prev = PROVIDER_PRESETS[v.provider || '']
                  setV({
                    ...v,
                    provider: p,
                    baseUrl: preset?.baseUrl || '',
                    model:
                      v.model && v.model !== prev?.model
                        ? v.model
                        : preset?.model || '',
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
            <div className="fld row">
              <label>接口地址</label>
              {v.provider === 'custom' ? (
                <input
                  value={v.baseUrl || ''}
                  placeholder="https://api.example.com/v1"
                  onChange={(e) => setV({ ...v, baseUrl: e.target.value })}
                />
              ) : (
                <input
                  value={
                    v.baseUrl ||
                    PROVIDER_PRESETS[v.provider || '']?.baseUrl ||
                    ''
                  }
                  readOnly
                  disabled
                  placeholder="选择供应商后自动填充"
                />
              )}
              <span className="hint">
                选「自定义」时可手动填写；其他供应商自动填充官方地址
              </span>
            </div>
            <div className="fld row">
              <label>
                模型端点<span className="req">*</span>
              </label>
              <input
                value={v.model || ''}
                placeholder="ep-xxxxxxxx 或模型名"
                onChange={(e) => setV({ ...v, model: e.target.value })}
              />
              <span className="hint">切换供应商自动带出示例模型，可修改</span>
            </div>
            <div className="fld row">
              <label>API Key</label>
              <input
                value={v.apiKey || ''}
                placeholder="ark-••••"
                onChange={(e) => setV({ ...v, apiKey: e.target.value })}
              />
              <span className="hint">
                {isEdit ? '留空则保留原 Key' : '仅服务端保存，面板不展示明文'}
              </span>
            </div>
            <div className="fld row">
              <label>温度</label>
              <input
                value={v.temperature || '0.7'}
                onChange={(e) => setV({ ...v, temperature: e.target.value })}
              />
            </div>
          </>
        )}

        {modal.kind === 'voice' && (
          <>
            <div className="fld row">
              <label>
                服务名称<span className="req">*</span>
              </label>
              <input
                value={v.name || ''}
                placeholder="例如：豆包语音"
                onChange={(e) => setV({ ...v, name: e.target.value })}
              />
            </div>
            <div className="fld row">
              <label>
                供应商<span className="req">*</span>
              </label>
              <select
                value={v.provider || 'edge'}
                onChange={(e) => setV({ ...v, provider: e.target.value })}
              >
                {Object.entries(TTS_ENGINES)
                  .filter(([k]) => k !== 'builtin')
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="fld row">
              <label>音色</label>
              <input
                value={v.voiceId || ''}
                placeholder="选择或输入音色 ID"
                onChange={(e) => setV({ ...v, voiceId: e.target.value })}
              />
              <span className="hint">留空使用该引擎的默认音色</span>
            </div>
            {v.provider === 'edge' && (
              <div className="fld row">
                <label>访问令牌</label>
                <input
                  value={v.edgeToken || ''}
                  placeholder="留空由 Edge 自动获取"
                  onChange={(e) => setV({ ...v, edgeToken: e.target.value })}
                />
              </div>
            )}
            {v.provider === 'volcano' && (
              <>
                <div className="fld row">
                  <label>
                    App ID<span className="req">*</span>
                  </label>
                  <input
                    value={v.volcanoAppId || ''}
                    placeholder="火山引擎语音合成 App ID"
                    onChange={(e) =>
                      setV({ ...v, volcanoAppId: e.target.value })
                    }
                  />
                </div>
                <div className="fld row">
                  <label>
                    访问令牌<span className="req">*</span>
                  </label>
                  <input
                    value={v.volcanoToken || ''}
                    placeholder="火山引擎 Access Token"
                    onChange={(e) =>
                      setV({ ...v, volcanoToken: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            {v.provider === 'openai' && (
              <>
                <div className="fld row">
                  <label>
                    API Key<span className="req">*</span>
                  </label>
                  <input
                    value={v.openaiKey || ''}
                    placeholder="OpenAI API Key"
                    onChange={(e) => setV({ ...v, openaiKey: e.target.value })}
                  />
                </div>
                <div className="fld row">
                  <label>模型</label>
                  <input
                    value={v.openaiModel || ''}
                    placeholder="tts-1"
                    onChange={(e) =>
                      setV({ ...v, openaiModel: e.target.value })
                    }
                  />
                </div>
                <div className="fld row">
                  <label>接口地址</label>
                  <input
                    value={v.openaiBaseUrl || ''}
                    placeholder="https://api.openai.com/v1"
                    onChange={(e) =>
                      setV({ ...v, openaiBaseUrl: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            {v.provider === 'custom' && (
              <div className="fld">
                <label>TTS 配置（JSON）</label>
                <textarea
                  rows={4}
                  value={v.customJson || ''}
                  placeholder='{"edge":{"trustedToken":"…"}}'
                  onChange={(e) => setV({ ...v, customJson: e.target.value })}
                />
                <span className="hint">
                  高级用法：直接填写 mi-gpt TTSConfig JSON
                </span>
              </div>
            )}
          </>
        )}

        {modal.kind === 'role' && (
          <>
            <div className="fld row">
              <label>
                角色名称<span className="req">*</span>
              </label>
              <input
                value={v.name || ''}
                placeholder="例如：深夜电台 DJ"
                onChange={(e) => setV({ ...v, name: e.target.value })}
              />
            </div>
            <div className="fld">
              <label>人设描述</label>
              <textarea
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-m)',
                  padding: '8px 12px',
                  font: 'inherit',
                  minHeight: 76,
                }}
                value={v.profile || ''}
                placeholder="你是谁、怎么说话、回答风格"
                onChange={(e) => setV({ ...v, profile: e.target.value })}
              />
            </div>
          </>
        )}

        {modal.kind === 'pwd' && (
          <>
            <div className="fld row">
              <label>
                当前密码<span className="req">*</span>
              </label>
              <input
                type="password"
                value={v.old || ''}
                onChange={(e) => setV({ ...v, old: e.target.value })}
              />
            </div>
            <div className="fld row">
              <label>
                新密码<span className="req">*</span>
              </label>
              <input
                type="password"
                value={v.pwd || ''}
                onChange={(e) => setV({ ...v, pwd: e.target.value })}
              />
            </div>
            <div className="fld row">
              <label>
                确认新密码<span className="req">*</span>
              </label>
              <input
                type="password"
                value={v.pwd2 || ''}
                onChange={(e) => setV({ ...v, pwd2: e.target.value, err: '' })}
              />
            </div>
            {v.err && (
              <div className="notice err">
                <I n="warning" size={15} /> {v.err}
              </div>
            )}
          </>
        )}

        {modal.kind === 'deviceBind' && (
          <>
            {modal.title === '变更生效说明' ? (
              <div className="notice">
                <I n="warning" size={15} /> 换绑账号、修改唤醒词或 did
                必须重启设备；角色内容、思考服务（模型 /
                温度）热生效；语音服务支持热切。
              </div>
            ) : (
              <>
                <div className="fld row">
                  <label>所属账号</label>
                  <select
                    value={v.accountId || ''}
                    onChange={(e) => setV({ ...v, accountId: e.target.value })}
                  >
                    <option value="">（保持当前）</option>
                    {props.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.miUserId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>对话角色</label>
                  <select
                    value={v.roleId || ''}
                    onChange={(e) => setV({ ...v, roleId: e.target.value })}
                  >
                    <option value="">（保持当前）</option>
                    {props.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>思考服务</label>
                  <select
                    value={v.thinkServiceId || ''}
                    onChange={(e) =>
                      setV({ ...v, thinkServiceId: e.target.value })
                    }
                  >
                    <option value="">（继承角色 / 全局默认）</option>
                    {props.thinkSvcs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>语音服务（设备覆盖）</label>
                  <select
                    value={v.voiceOverrideId || ''}
                    onChange={(e) =>
                      setV({ ...v, voiceOverrideId: e.target.value })
                    }
                  >
                    <option value="">（继承角色 / 全局默认）</option>
                    {props.voiceSvcs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld row">
                  <label>设备型号</label>
                  <select
                    value={v.speakerModel || ''}
                    onChange={(e) =>
                      setV({ ...v, speakerModel: e.target.value })
                    }
                  >
                    <option value="">（保持当前）</option>
                    {props.models.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.builtin ? '' : ' · 自定义'}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const mm = v.speakerModel
                      ? props.models.find((x) => x.id === v.speakerModel)
                      : null
                    if (!mm)
                      return (
                        <span className="hint">
                          切换型号后，播放指令 / 唤醒指令等硬件参数随型号生效
                        </span>
                      )
                    if (!mm.consecutive) {
                      return (
                        <span className="hint warn">
                          型号不支持连续对话（streamResponse 已禁用）
                        </span>
                      )
                    }
                    return mm.playingCommand?.length ? (
                      <span className="hint">
                        支持连续对话 · 支持播放状态检测
                      </span>
                    ) : (
                      <span className="hint">
                        支持连续对话 · 未配置播放检测指令，将依赖 Mina
                        检测播放状态；若异常可在「设备型号」中补充该指令
                      </span>
                    )
                  })()}
                </div>
                <div className="fld row">
                  <label>连续对话超时（秒）</label>
                  <input
                    value={v.exitKeepAliveAfter || '30'}
                    placeholder="默认 30"
                    onChange={(e) =>
                      setV({ ...v, exitKeepAliveAfter: e.target.value })
                    }
                  />
                  <span className="hint">
                    连续对话中无响应多久自动退出唤醒模式，默认 30 秒
                  </span>
                </div>
                <div className="fld row">
                  <label>会话群</label>
                  <select
                    value={v.roomRef || ''}
                    onChange={(e) => setV({ ...v, roomRef: e.target.value })}
                  >
                    <option value="">（保持当前）</option>
                    {props.rooms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>
                  <span className="hint">
                    对话记忆的上下文归属（对应旧版「会话群
                    chatGroup」），多台设备可共用；可在「会话群」菜单新建
                  </span>
                </div>
                <div className="notice">
                  <I n="warning" size={15} /> 修改后需重启设备生效。
                </div>
              </>
            )}
          </>
        )}

        <div className="acts">
          <button className="btn" onClick={() => close()}>
            取消
          </button>
          <button className="btn primary" onClick={submit}>
            {modal.kind === 'deviceBind' && modal.title === '变更生效说明'
              ? '知道了'
              : '确定'}
          </button>
        </div>
      </div>
    </>
  )
}
