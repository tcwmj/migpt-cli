import type { Robot, Room, DeviceRow } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, Tag } from '../../components/atoms/index.ts'

export function RobotDetail(props: {
  robot: Robot
  usage: string[]
  rooms: Room[]
  devices: DeviceRow[]
  onEdit: () => void
  onDelete: () => void
  onReset: () => void
  onNavigate?: (view: string, id: string) => void
}) {
  const { robot } = props
  const room = robot.roomRef
    ? props.rooms.find((r) => r.id === robot.roomRef)
    : undefined

  // 找到引用该角色的设备
  const boundDevices = props.devices.filter((d) => d.robotId === robot.id)

  return (
    <div className="rform rview">
      <h3>
        <I n="chat" size={17} /> 角色详情
        {robot.builtin && <Tag>内置</Tag>}
        <span className="refs">
          本角色被 {props.usage.length} 台设备引用
          {props.usage.length ? '（' + props.usage.join(' · ') + '）' : ''}
          。角色性格热生效；修改唤醒词需重启设备。
        </span>
      </h3>
      <div className="ro">
        <div className="grp">
          <h4>身份与关系</h4>
          <div className="row">
            <div className="rr">
              <span className="k">角色称呼</span>
              <span className="v">{robot.name || '—'}</span>
            </div>
            <div className="rr">
              <span className="k">称呼我为</span>
              <span className="v">{robot.masterName || '—'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">角色性格</span>
              <span className="v">{robot.profile || '未填写'}</span>
            </div>
            <div className="rr">
              <span className="k">我的信息</span>
              <span className="v">{robot.masterProfile || '未填写'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">会话群</span>
              <span className="v">
                {room ? (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => props.onNavigate?.('rooms', room.id)}
                  >
                    {room.name}
                  </button>
                ) : (
                  '未设置'
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>回复提示</h4>
          <div className="row">
            <div className="rr">
              <span className="k">进入思考</span>
              <span className="v">
                {(robot.onEnterAI || []).join('、') || '关闭'}
              </span>
            </div>
            <div className="rr">
              <span className="k">退出思考</span>
              <span className="v">
                {(robot.onExitAI || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">思考中</span>
              <span className="v">
                {(robot.onAIAsking || []).join('、') || '关闭'}
              </span>
            </div>
            <div className="rr">
              <span className="k">思考中断</span>
              <span className="v">
                {(robot.onAIError || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">回答完毕</span>
              <span className="v">
                {(robot.onAIReplied || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>单次对话</h4>
          <div className="row">
            <div className="rr">
              <span className="k">调用关键词</span>
              <span className="v">
                {(robot.callAIKeywords || []).join('、') || '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>连续对话</h4>
          <div className="row">
            <div className="rr">
              <span className="k">唤醒关键词</span>
              <span className="v">
                {(robot.wakeUpKeywords || []).join('、') || '小爱同学'}
              </span>
            </div>
            <div className="rr">
              <span className="k">退出关键词</span>
              <span className="v">
                {(robot.exitKeywords || []).join('、') || '—'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">继续对话检测</span>
              <span className="v">
                {(robot.checkInterval ?? 1000).toLocaleString('en-US')} 毫秒
              </span>
            </div>
            <div className="rr">
              <span className="k">停止对话检测</span>
              <span className="v">
                {(robot.checkTTSStatusAfter ?? 3000).toLocaleString('en-US')}{' '}
                毫秒
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">自动退出时间</span>
              <span className="v">
                {robot.exitKeepAliveAfter ?? 30} 秒无响应退出
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
        {robot.builtin && (
          <Button
            icon="arrow-counter-clockwise"
            onClick={props.onReset}
            title="恢复为系统内置默认配置"
          >
            重置
          </Button>
        )}
        <Button
          variant="danger"
          icon="trash"
          disabled={!!robot.builtin}
          onClick={props.onDelete}
          title={robot.builtin ? '系统内置角色不可删除' : ''}
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
