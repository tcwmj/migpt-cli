import type { Role, Room } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button } from '../../components/atoms/index.ts'

export function RoleDetail(props: {
  role: Role
  usage: string[]
  rooms: Room[]
  onEdit: () => void
  onDelete: () => void
}) {
  const { role } = props
  const room = role.roomRef
    ? props.rooms.find((r) => r.id === role.roomRef)
    : undefined
  return (
    <div className="rform rview">
      <h3>
        <I n="chat" size={17} /> 角色详情
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
              <span className="v">{role.name || '—'}</span>
            </div>
            <div className="rr">
              <span className="k">称呼我为</span>
              <span className="v">{role.masterName || '—'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">角色性格</span>
              <span className="v">{role.profile || '未填写'}</span>
            </div>
            <div className="rr">
              <span className="k">我的信息</span>
              <span className="v">{role.masterProfile || '未填写'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">会话群</span>
              <span className="v">{room?.name || '未设置'}</span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>回复提示</h4>
          <div className="row">
            <div className="rr">
              <span className="k">进入思考</span>
              <span className="v">
                {(role.onEnterAI || []).join('、') || '关闭'}
              </span>
            </div>
            <div className="rr">
              <span className="k">退出思考</span>
              <span className="v">
                {(role.onExitAI || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">思考中</span>
              <span className="v">
                {(role.onAIAsking || []).join('、') || '关闭'}
              </span>
            </div>
            <div className="rr">
              <span className="k">思考中断</span>
              <span className="v">
                {(role.onAIError || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">回答完毕</span>
              <span className="v">
                {(role.onAIReplied || []).join('、') || '关闭'}
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
                {(role.callAIKeywords || []).join('、') || '—'}
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
                {(role.wakeUpKeywords || []).join('、') || '小爱同学'}
              </span>
            </div>
            <div className="rr">
              <span className="k">退出关键词</span>
              <span className="v">
                {(role.exitKeywords || []).join('、') || '—'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">继续对话检测</span>
              <span className="v">
                {(role.checkInterval ?? 1000).toLocaleString('en-US')} 毫秒
              </span>
            </div>
            <div className="rr">
              <span className="k">停止对话检测</span>
              <span className="v">
                {(role.checkTTSStatusAfter ?? 3000).toLocaleString('en-US')}{' '}
                毫秒
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">自动退出时间</span>
              <span className="v">
                {role.exitKeepAliveAfter ?? 30} 秒无响应退出
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="acts">
        <span className="sp" />
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
