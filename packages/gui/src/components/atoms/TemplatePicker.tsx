import {
  ROBOT_TEMPLATES,
  composeTemplateSystemTemplate,
  type Robot,
  type RobotTemplate,
} from '@migptgui/contracts'

/**
 * 把模板摊平为角色草稿：模板是「起点」不是「实体」，
 * 套用后即为普通角色，后续编辑与模板再无关联（仅靠 templateId 记住出处）。
 *
 * 覆盖范围：称呼、人设与四个播报词位、系统提示词。
 * 刻意不动唤醒词与连续对话时序参数——那些与设备型号强相关，
 * 覆盖会打断用户已调好的手感。
 */
export function applyRobotTemplate(t: RobotTemplate, base: Robot): Robot {
  const next: Robot = {
    ...base,
    profile: t.profile,
    templateId: t.id,
  }
  if (t.masterName !== undefined) next.masterName = t.masterName
  if (t.onEnterAI !== undefined) next.onEnterAI = t.onEnterAI
  if (t.onExitAI !== undefined) next.onExitAI = t.onExitAI
  if (t.onAIAsking !== undefined) next.onAIAsking = t.onAIAsking
  if (t.onAIReplied !== undefined) next.onAIReplied = t.onAIReplied
  if (t.onAIError !== undefined) next.onAIError = t.onAIError
  // undefined 表示该模板不携带提示词增量 → 跟随内置默认（不写字段）
  next.systemTemplate = t.systemTemplate ?? composeTemplateSystemTemplate(t)
  return next
}

/** 模板选择卡片列表：新建角色的第一步，支持「跳过模板」从空白开始 */
export function TemplatePicker(props: {
  selectedId?: string
  onPick: (t: RobotTemplate) => void
  onSkip: () => void
  /** 紧凑模式（向导窄栏内使用） */
  compact?: boolean
  /** 裸模式：去掉卡片外框，由外层容器（如 .form-card）承载样式 */
  bare?: boolean
}) {
  return (
    <div
      className={
        'tplpick' +
        (props.compact ? ' compact' : '') +
        (props.bare ? ' bare' : '')
      }
    >
      <div className="tplhead">
        <b>选择模板</b>
        <span>选一个起点，称呼、人设与播报词都能改</span>
      </div>
      <div className="tplgrid">
        {ROBOT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={'tplcard' + (props.selectedId === t.id ? ' on' : '')}
            onClick={() => props.onPick(t)}
          >
            <span className="tl">{t.name}</span>
            <span className="tg">{t.tagline}</span>
            <span className="ts">{t.sample}</span>
          </button>
        ))}
      </div>
      <button type="button" className="tplskip" onClick={props.onSkip}>
        跳过模板，从空白创建
      </button>
    </div>
  )
}
