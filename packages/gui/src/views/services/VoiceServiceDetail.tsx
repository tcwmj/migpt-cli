import type { VoiceService, DeviceRow, Role } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, ProviderBadge, Tag } from '../../components/atoms/index.ts'
import { VOICE_PROVIDERS } from '../../constants.ts'

export function VoiceServiceDetail(props: {
  selVoice: string
  selVoiceObj: VoiceService | null
  voiceSvcs: VoiceService[]
  devices: DeviceRow[]
  roles: Role[]
  usageVoice: (id: string) => number
  onDelete: (id: string) => void
  onReset: (id: string) => void
  onEdit: () => void
  onNavigate?: (view: string, id: string) => void
}) {
  const svc = props.voiceSvcs.find((s) => s.id === props.selVoice)

  // 找到使用该服务的设备
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
        <I n="mic" size={17} /> 语音服务详情
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
              <span className="k">服务名称</span>
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
            <div className="rr">
              <span className="k">音色 ID</span>
              <span className="v">{svc?.voiceId || '默认音色'}</span>
            </div>
          </div>
          {(engine === 'openai' || engine === 'openai-compat') && (
            <div className="row">
              <div className="rr">
                <span className="k">接口地址</span>
                <span className="v">{tts?.openai?.baseUrl || '—'}</span>
              </div>
              <div className="rr">
                <span className="k">模型</span>
                <span className="v">{tts?.openai?.model || '默认模型'}</span>
              </div>
            </div>
          )}
          {engine === 'volcano' && (
            <div className="row">
              <div className="rr">
                <span className="k">App ID</span>
                <span className="v">{tts?.volcano?.appId || '—'}</span>
              </div>
            </div>
          )}
          <div className="row">
            <div className="rr">
              <span className="k">TTS 令牌</span>
              <span className="v">
                {svc?.hasTtsToken ? '已配置' : '未配置'}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>
            Token 用量
            {svc?.tokenLimit ? (
              <span
                className="aside"
                title={`Token 已使用 ${(((svc.tokenUsed ?? 0) / svc.tokenLimit) * 100).toFixed(1)}%（${(svc.tokenUsed ?? 0).toLocaleString()} / ${svc.tokenLimit.toLocaleString()}）`}
              >
                {(((svc.tokenUsed ?? 0) / svc.tokenLimit) * 100).toFixed(1)}%
              </span>
            ) : null}
            {svc?.limitReached && <Tag tone="bad">限额已达</Tag>}
          </h4>
          <div className="row">
            <div className="rr">
              <span className="k">输入 Token</span>
              <span className="v">
                {(svc?.tokenInputUsed ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="rr">
              <span className="k">输出 Token</span>
              <span className="v">
                {(svc?.tokenOutputUsed ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="rr">
              <span className="k">合计 Token</span>
              <span className="v">
                {(svc?.tokenUsed ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="rr">
              <span className="k">Token 上限</span>
              <span className="v">
                {svc?.tokenLimit ? svc.tokenLimit.toLocaleString() : '未设置'}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>关联服务</h4>
          <div className="row">
            <div className="rr">
              <span className="k">设备服务</span>
              <span className="v">
                {boundDevices.length > 0 ? (
                  <div className="link-list">
                    {boundDevices.map((d) => (
                      <button key={d.id} type="button" className="link-btn">
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
          title={props.selVoiceObj?.builtin ? '内置语音服务不可删除' : ''}
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
