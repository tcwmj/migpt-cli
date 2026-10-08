import type {
  Account,
  DeviceRow,
  Role,
  Room,
  SpeakerModel,
} from '../../apis.ts'
import { Button, Tag } from '../../components/atoms/index.ts'
import { I } from '../../icons.tsx'

function consecutiveText(m: SpeakerModel | null) {
  if (!m) return '—'
  if (!m.consecutive) return '未启用（型号不支持）'
  return m.playingCommand?.length
    ? '启用 · 支持播放状态检测'
    : '启用 · 依赖 Mina 检测播放状态'
}

export function DeviceDetail(props: {
  selDev: string
  devices: DeviceRow[]
  models: SpeakerModel[]
  accounts: Account[]
  roles: Role[]
  rooms: Room[]
  onRestart: (id: string) => void
  onDelete: () => void
  onEdit: () => void
}) {
  const dev = props.devices.find((x) => x.id === props.selDev) || null
  const ref = dev?.speakerModel
  const model = ref
    ? props.models.find((x) => x.id === ref || x.name === ref) || null
    : null
  const room = dev?.roomRef
    ? props.rooms.find((x) => x.id === dev.roomRef) || null
    : null
  const roomText = dev?.roomRef
    ? room
      ? `${room.name}${room.description ? ' · ' + room.description : ''}`
      : dev.roomRef
    : '—'
  return (
    <div className="form-card">
      <h3>
        <I n="speaker" size={17} /> 设备详情
        <span className="refs">
          {dev?.running
            ? '服务运行中 · 变更绑定后需重启'
            : '服务未启动 · 变更绑定后需重启'}
        </span>
      </h3>
      <div className="desc">设备绑定信息；变更绑定后需重启设备生效。</div>
      <div className="ro">
        {model?.imageUrl && (
          <div className="model-pic">
            <img src={model.imageUrl} alt={model.name} />
            <span className="pic-tag">
              {model.builtin ? '内置型号' : '自定义型号'}
            </span>
          </div>
        )}
        <div className="grp">
          <h4>基本信息</h4>
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
        <div className="grp">
          <h4>型号指令</h4>
          <div className="row">
            {model && (
              <div className="rr">
                <span className="k">型号指令</span>
                <span className="v">
                  {[
                    model.ttsCommand?.length
                      ? `播放指令：${model.ttsCommand.join('、')}`
                      : null,
                    model.wakeUpCommand?.length
                      ? `唤醒命令：${model.wakeUpCommand.join('、')}`
                      : null,
                    model.playingCommand?.length
                      ? `播放检测命令：${model.playingCommand.join('、')}`
                      : null,
                    model.consecutive ? '连续对话已启用' : '连续对话未启用',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="grp">
          <h4>绑定</h4>
          <div className="row">
            <div className="rr">
              <span className="k">云端账号</span>
              <span className="v">
                {props.accounts.find((a) => a.id === dev?.accountId)?.name ||
                  '默认账号'}
              </span>
            </div>
            <div className="rr">
              <span className="k">对话角色</span>
              <span className="v">
                {props.roles.find((r) => r.id === dev?.roleId)?.name ||
                  '未指定'}
              </span>
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
          {!(model || dev) ? null : (
            <>
              <div className="row">
                <div className="rr">
                  <span className="k">连续对话</span>
                  <span className="v">{consecutiveText(model)}</span>
                </div>
                <div className="rr">
                  <span className="k">对话超时</span>
                  <span className="v">
                    {dev?.exitKeepAliveAfter ?? 30} 秒无响应退出
                  </span>
                </div>
              </div>
              <div className="row">
                <div className="rr">
                  <span className="k">会话群</span>
                  <span className="v">{roomText}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="acts">
        <span className="sp" />
        <Button
          variant="ghost"
          icon="restart"
          onClick={() => props.onRestart(props.selDev)}
        >
          {dev?.running ? '重启' : '启动'}
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
