import type { Role, ThinkService, VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'

export function RoleDetail(props: {
  role: Role
  usage: string[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  onEdit: () => void
  onDelete: () => void
}) {
  const { role } = props
  return (
    <div className="rform rview">
      <h3>
        <I n="chat" size={17} /> 角色详情
        <span className="refs">
          本角色被 {props.usage.length} 台设备引用
          {props.usage.length ? '（' + props.usage.join(' · ') + '）' : ''}
          。人设与模型热生效；修改唤醒词需重启设备。
        </span>
      </h3>
      <div className="ro">
        <div className="grp">
          <h4>基本信息</h4>
          <div className="row">
            <div className="rr">
              <span className="k">角色名称</span>
              <span className="v">{role.name || '—'}</span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">人设描述</span>
              <span className="v">{role.profile || '未填写'}</span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>模型服务</h4>
          <div className="row">
            <div className="rr">
              <span className="k">思考服务</span>
              <span className="v">
                {props.thinkSvcs.find((s) => s.id === role.thinkServiceId)
                  ?.name || '跟随全局默认'}
              </span>
            </div>
            <div className="rr">
              <span className="k">语音服务</span>
              <span className="v">
                {props.voiceSvcs.find((s) => s.id === role.voiceId)?.name ||
                  '跟随全局默认'}
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
              <span className="k">自动退出时间</span>
              <span className="v">
                {role.exitKeepAliveAfter ?? 30} 秒无响应退出
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">继续对话检测</span>
              <span className="v">
                {(role.checkContinueKeywords || []).join('、') || '—'}
              </span>
            </div>
            <div className="rr">
              <span className="k">停止对话检测</span>
              <span className="v">
                {(role.checkNotContinueKeywords || []).join('、') || '—'}
              </span>
            </div>
          </div>
        </div>
        <div className="grp">
          <h4>提示语</h4>
          <div className="row">
            <div className="rr">
              <span className="k">进入 AI</span>
              <span className="v">
                {(role.onEnterAI || []).join('、') || '关闭'}
              </span>
            </div>
            <div className="rr">
              <span className="k">退出 AI</span>
              <span className="v">
                {(role.onExitAI || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">AI 思考中</span>
              <span className="v">
                {(role.onAIAsking || []).join('、') || '关闭'}
              </span>
            </div>
            <div className="rr">
              <span className="k">AI 回答完毕</span>
              <span className="v">
                {(role.onAIReplied || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
          <div className="row">
            <div className="rr">
              <span className="k">AI 出错</span>
              <span className="v">
                {(role.onAIError || []).join('、') || '关闭'}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="acts">
        <span className="sp" />
        <button className="btn danger" onClick={props.onDelete}>
          <I n="trash" /> 删除
        </button>
        <button className="btn primary" onClick={props.onEdit}>
          <I n="pencil" /> 编辑
        </button>
      </div>
    </div>
  )
}
