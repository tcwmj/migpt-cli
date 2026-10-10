import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../../apis.ts'
import { Button, Tag } from '../../components/atoms/index.ts'
import { I } from '../../icons.tsx'

export function DeviceDetail(props: {
  selDev: string
  devices: DeviceRow[]
  models: SpeakerModel[]
  accounts: Account[]
  roles: Role[]
  rooms: Room[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  onRestart: (id: string) => void
  onDelete: () => void
  onEdit: () => void
}) {
  const dev = props.devices.find((x) => x.id === props.selDev) || null
  const ref = dev?.speakerModel
  const model = ref
    ? props.models.find((x) => x.id === ref || x.name === ref) || null
    : null
  const account = props.accounts.find((a) => a.id === dev?.accountId)
  const role = props.roles.find((r) => r.id === dev?.roleId)
  const thinkText = (dev?.thinkServiceIds || []).length
    ? (dev?.thinkServiceIds || [])
        .map((id) => props.thinkSvcs.find((s) => s.id === id)?.name || id)
        .join('、')
    : '跟随角色或全局默认'
  const voiceText = dev?.voiceId
    ? props.voiceSvcs.find((s) => s.id === dev.voiceId)?.name || dev.voiceId
    : '跟随角色或全局默认'
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
        {/* 关联账号 */}
        <div className="grp">
          <h4>关联账号</h4>
          <div className="row">
            <div className="rr">
              <span className="k">云端账号</span>
              <span className="v">
                {account ? `${account.name}（${account.miUserId}）` : '未指定'}
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
              <span className="k">设备型号</span>
              <span className="v">
                {model ? `${model.name}（${model.did}）` : ref || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 关联服务 */}
        <div className="grp">
          <h4>关联服务</h4>
          <div className="row">
            <div className="rr">
              <span className="k">思考服务</span>
              <span className="v">{thinkText}</span>
            </div>
            <div className="rr">
              <span className="k">语音服务</span>
              <span className="v">{voiceText}</span>
            </div>
          </div>
        </div>

        {/* 其他信息 */}
        <div className="grp">
          <h4>其他信息</h4>
          <div className="row">
            <div className="rr">
              <span className="k">对话角色</span>
              <span className="v">{role?.name || '未指定'}</span>
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
