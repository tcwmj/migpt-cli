import type {
  Credential,
  DeviceRow,
  Robot,
  SpeakerModel,
  Model,
  Voice,
} from '../../apis.ts'
import { Button, Tag } from '../../components/atoms/index.ts'
import { I } from '../../icons.tsx'

export function DeviceDetail(props: {
  selDev: string
  devices: DeviceRow[]
  speakerModels: SpeakerModel[]
  credentials: Credential[]
  robots: Robot[]
  models: Model[]
  voices: Voice[]
  onRestart: (id: string) => void
  onDelete: () => void
  onEdit: () => void
  onNavigate?: (view: string, id: string) => void
}) {
  const dev = props.devices.find((x) => x.id === props.selDev) || null
  const ref = dev?.speakerModel
  const model = ref
    ? props.speakerModels.find((x) => x.id === ref || x.name === ref) || null
    : null
  const cred = props.credentials.find((a) => a.id === dev?.credentialId)
  const robot = props.robots.find((r) => r.id === dev?.robotId)
  const models = (dev?.modelIds || [])
    .map((id) => props.models.find((s) => s.id === id))
    .filter(Boolean) as Model[]
  const voice = dev?.voiceId
    ? props.voices.find((s) => s.id === dev.voiceId)
    : null
  return (
    <div className="form-card">
      <h3>
        <I n="speaker" size={17} /> 设备详情
        <span className="refs">
          {dev?.running
            ? '服务运行中 · 变更配置后需重启'
            : '服务未启动 · 变更配置后需重启'}
        </span>
      </h3>
      <div className="desc">设备配置信息；变更配置后需重启设备生效。</div>
      <div className="ro">
        {/* 关联凭据 */}
        <div className="grp">
          <h4>关联凭据</h4>
          <div className="row">
            <div className="rr">
              <span className="k">小米凭据</span>
              <span className="v">
                {cred ? (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => props.onNavigate?.('credentials', cred.id)}
                  >
                    {cred.name}（{cred.miUserId}）
                  </button>
                ) : (
                  '未指定'
                )}
              </span>
            </div>
            <div className="rr">
              <span className="k">服务状态</span>
              <span className="v">
                {dev ? (
                  <Tag tone={dev.running ? 'accent' : 'neu'}>
                    {dev.running ? '运行中' : '未启动'}
                  </Tag>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 关联设备 */}
        <div className="grp">
          <h4>关联设备</h4>
          <div className="row">
            <div className="rr">
              <span className="k">设备名称</span>
              <span className="v">{dev?.alias || '—'}</span>
            </div>
            <div className="rr">
              <span className="k">设备 ID</span>
              <span className="v">{dev?.did || '—'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">音箱型号</span>
              <span className="v">
                {model ? (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => props.onNavigate?.('models', model.id)}
                  >
                    {model.name}（{model.didPrefix}）
                  </button>
                ) : (
                  ref || '—'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 关联模型与语音 */}
        <div className="grp">
          <h4>关联模型与语音</h4>
          <div className="row">
            <div className="rr">
              <span className="k">模型</span>
              <span className="v">
                {models.length > 0 ? (
                  <div className="link-list">
                    {models.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="link-btn"
                        onClick={() => props.onNavigate?.('models', s.id)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  '未设置'
                )}
              </span>
            </div>
            <div className="rr">
              <span className="k">语音</span>
              <span className="v">
                {voice ? (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => props.onNavigate?.('voice', voice.id)}
                  >
                    {voice.name}
                  </button>
                ) : (
                  '未设置'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 关联角色 */}
        <div className="grp">
          <h4>关联角色</h4>
          <div className="row">
            <div className="rr">
              <span className="k">对话角色</span>
              <span className="v">
                {robot ? (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => props.onNavigate?.('robots', robot.id)}
                  >
                    {robot.name}
                  </button>
                ) : (
                  '未指定'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="acts">
        <span className="sp" />
        <Button
          variant="ghost"
          icon="restart"
          onClick={() => props.onRestart(props.selDev)}
        >
          重启
        </Button>
        <Button variant="danger" icon="trash" onClick={props.onDelete}>
          删除
        </Button>
        <Button variant="primary" icon="pencil" onClick={props.onEdit}>
          编辑
        </Button>
      </div>
    </div>
  )
}
