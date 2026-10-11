import type { Voice, DeviceRow, Robot } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, ProviderBadge, Tag } from '../../components/atoms/index.ts'
import { VOICE_PROVIDERS } from '../../constants.ts'

export function VoiceDetail(props: {
  selVoice: string
  selVoiceObj: Voice | null
  voices: Voice[]
  devices: DeviceRow[]
  robots: Robot[]
  usageVoice: (id: string) => number
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onEdit: () => void
  onNavigate?: (view: string, id: string) => void
}) {
  const svc = props.voices.find((s) => s.id === props.selVoice)

  // 找到使用该语音的设备
  const boundDevices = props.devices.filter((d) => d.voiceId === props.selVoice)

  // 获取引擎类型和 TTS 配置
  const engine = svc
    ? VOICE_PROVIDERS[svc.provider]?.engine || 'openai'
    : 'openai'
  const tts = svc?.tts as
    | {
        edge?: { trustedToken?: string }
        volcano?: { appId?: string; accessToken?: string }
        openai?: { apiKey?: string; model?: string; baseUrl?: string }
      }
    | undefined

  return (
    <div className="form-card">
      <h3>
        <I n="mic" size={17} /> 语音详情
        <span className="refs">
          被 {props.usageVoice(props.selVoice)} 台设备引用 ·
          支持热切「把声音换成…」
        </span>
      </h3>
      <div className="desc">
        为对话角色提供音色的配置；修改后绑定设备支持热切。
      </div>
      <div className="ro">
        <div className="grp">
          <h4>基本信息</h4>
          <div className="row">
            <div className="rr">
              <span className="k">语音名称</span>
              <span className="v">{svc?.name || '—'}</span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>引擎配置</h4>
          <div className="row">
            <div className="rr">
              <span className="k">供应商</span>
              <span className="v">
                {svc?.builtin ? (
                  '默认语音'
                ) : svc && VOICE_PROVIDERS[svc.provider] ? (
                  <ProviderBadge p={VOICE_PROVIDERS[svc.provider]} />
                ) : (
                  (svc?.provider ?? '—')
                )}
              </span>
            </div>
            {!svc?.builtin &&
              svc?.provider !== 'custom' &&
              (engine === 'openai' || engine === 'openai-compat') && (
                <div className="rr">
                  <span className="k">接口地址</span>
                  <span className="v">{tts?.openai?.baseUrl || '—'}</span>
                </div>
              )}
          </div>
          {!svc?.builtin &&
            svc?.provider !== 'custom' &&
            (engine === 'openai' || engine === 'openai-compat') && (
              <div className="row">
                <div className="rr">
                  <span className="k">语音模型</span>
                  <span className="v">{tts?.openai?.model || '默认模型'}</span>
                </div>
                <div className="rr">
                  <span className="k">API Key</span>
                  <span className="v">
                    {svc?.hasTtsToken ? '已配置' : '未配置'}
                  </span>
                </div>
              </div>
            )}
          {!svc?.builtin && svc?.provider !== 'custom' && engine === 'edge' && (
            <div className="row">
              <div className="rr">
                <span className="k">访问令牌</span>
                <span className="v">
                  {svc?.hasTtsToken ? '已配置' : '未配置'}
                </span>
              </div>
            </div>
          )}
          {!svc?.builtin &&
            svc?.provider !== 'custom' &&
            engine === 'volcano' && (
              <div className="row">
                <div className="rr">
                  <span className="k">App ID</span>
                  <span className="v">{tts?.volcano?.appId || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">访问令牌</span>
                  <span className="v">
                    {svc?.hasTtsToken ? '已配置' : '未配置'}
                  </span>
                </div>
              </div>
            )}
          {!svc?.builtin && svc?.provider !== 'custom' && (
            <div className="row">
              <div className="rr">
                <span className="k">音色 ID</span>
                <span className="v">{svc?.timbreId || '默认音色'}</span>
              </div>
            </div>
          )}
          {!svc?.builtin && svc?.provider === 'custom' && (
            <div className="row">
              <div className="rr">
                <span className="k">TTS 配置</span>
                <span
                  className="v"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {tts && Object.keys(tts).length > 0
                    ? JSON.stringify(tts, null, 2)
                    : svc?.tts !== undefined
                      ? '已配置'
                      : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="grp">
          <h4>关联设备</h4>
          <div className="row">
            <div className="rr">
              <span className="k">设备服务</span>
              <span className="v">
                {boundDevices.length > 0 ? (
                  <div className="link-list">
                    {boundDevices.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className="link-btn"
                        onClick={() => props.onNavigate?.('devices', d.id)}
                      >
                        {d.alias || d.did}
                      </button>
                    ))}
                  </div>
                ) : (
                  '无'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="acts">
        <span className="sp" />
        {props.selVoiceObj?.builtin && (
          <Button
            icon="arrow-counter-clockwise"
            onClick={() => props.onReset(props.selVoice)}
            title="恢复为系统内置默认配置"
          >
            重置
          </Button>
        )}
        <Button
          variant="danger"
          icon="trash"
          disabled={!!props.selVoiceObj?.builtin}
          onClick={() => props.onDelete(props.selVoice)}
          title={props.selVoiceObj?.builtin ? '内置语音不可删除' : ''}
        >
          删除
        </Button>
        <Button variant="primary" icon="pencil" onClick={props.onEdit}>
          编辑
        </Button>
      </div>
    </div>
  )
}
