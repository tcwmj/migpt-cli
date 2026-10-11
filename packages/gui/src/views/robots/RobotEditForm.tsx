import Select from 'react-select/creatable'
import { type Robot, type Conversation } from '../../apis.ts'
import { I } from '../../icons.tsx'
import {
  AdvancedSection,
  applyRobotTemplate,
  Button,
  Field,
  TemplateBar,
} from '../../components/atoms/index.ts'
import { multiSelectStyles } from '../../components/atoms/selectStyles.ts'
import { findRobotTemplate } from '@migptgui/contracts'

/** 关键词字段：多值输入框（回车添加、点 x 删除单个值） */
function KeywordField(props: {
  label: string
  tip: string
  value?: string[]
  onChange: (next: string[]) => void
}) {
  const options = (props.value || []).map((k) => ({ value: k, label: k }))
  return (
    <Field label={props.label} tip={props.tip}>
      <Select
        isMulti
        isClearable
        options={options}
        value={options}
        placeholder="输入后回车添加…"
        noOptionsMessage={() => '暂无关键词'}
        formatCreateLabel={(input) => `添加「${input}」`}
        onChange={(vals) => props.onChange((vals || []).map((v) => v.value))}
        styles={multiSelectStyles}
      />
    </Field>
  )
}

/** 毫秒数值字段：显示千分符，仅允许数字 */
function MsField(props: {
  label: string
  tip: string
  value?: number
  def: number
  onChange: (n: number) => void
}) {
  const fmt = (n: number) => n.toLocaleString('en-US')
  return (
    <Field label={props.label} tip={props.tip}>
      <input
        inputMode="numeric"
        value={fmt(props.value ?? props.def)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0
          props.onChange(n)
        }}
      />
    </Field>
  )
}

export function RobotEditForm(props: {
  draft: Robot
  creating: boolean
  usage: string[]
  conversations: Conversation[]
  setF: (k: keyof Robot, v: unknown) => void
  /** 整体替换草稿（套用模板时用：一次覆盖多个字段） */
  onReplace?: (next: Robot) => void
  onCancel: () => void
  onSave: () => void
}) {
  const { draft, setF } = props
  const tpl = findRobotTemplate(draft.templateId)
  const applyTemplate = (id: string) => {
    const t = findRobotTemplate(id)
    if (!t) return
    const next = applyRobotTemplate(t, draft)
    if (props.onReplace) props.onReplace(next)
    else setF('profile', next.profile)
  }
  return (
    <div className="rform redit">
      <h3>
        <I n="chat" size={17} /> {props.creating ? '新建角色' : '编辑角色'}
        <span className="refs">
          本角色被 {props.usage.length} 台设备引用
          {props.usage.length ? '（' + props.usage.join(' · ') + '）' : ''}
          。角色性格热生效；修改唤醒词需重启设备。
        </span>
      </h3>
      <TemplateBar templateId={draft.templateId} onApply={applyTemplate} />
      {tpl && (
        <div className="tplnote">
          当前基于「{tpl.name}」：{tpl.tagline}
        </div>
      )}
      <div className="grp">
        <h4>身份与关系</h4>
        <div className="row">
          <Field label="角色称呼" required>
            <input
              value={draft.name}
              onChange={(e) => setF('name', e.target.value)}
            />
          </Field>
          <Field label="称呼我为" tip="如：主人、老大、朋友等">
            <input
              value={draft.masterName || ''}
              placeholder="例如：主人"
              onChange={(e) => setF('masterName', e.target.value)}
            />
          </Field>
        </div>
        <div className="row">
          <Field label="角色性格" tip="供模型理解人格 · 热生效">
            <textarea
              value={draft.profile}
              onChange={(e) => setF('profile', e.target.value)}
            />
          </Field>
          <Field label="我的信息" tip="供角色了解你的背景信息">
            <textarea
              value={draft.masterProfile || ''}
              placeholder="例如：性别：男 性格：善良正直 其他：总是舍己为人"
              onChange={(e) => setF('masterProfile', e.target.value)}
            />
          </Field>
        </div>
        <div className="row">
          <Field
            label="会话群"
            tip="对话记忆的上下文归属；多台设备共用同一角色时共享对话记忆"
          >
            <select
              value={draft.conversationId || ''}
              onChange={(e) => setF('conversationId', e.target.value)}
            >
              <option value="">未设置</option>
              {props.conversations.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <div className="grp">
        <h4>回复提示</h4>
        <div className="row">
          <KeywordField
            label="进入思考"
            tip="进入连续对话时播报，留空即关闭该提示"
            value={draft.onEnterAI}
            onChange={(next) => setF('onEnterAI', next)}
          />
          <KeywordField
            label="退出思考"
            tip="退出连续对话时播报，留空即关闭"
            value={draft.onExitAI}
            onChange={(next) => setF('onExitAI', next)}
          />
        </div>
        <div className="row">
          <KeywordField
            label="思考中"
            tip="AI 开始回答前的过渡语，留空即关闭"
            value={draft.onAIAsking}
            onChange={(next) => setF('onAIAsking', next)}
          />
          <KeywordField
            label="思考中断"
            tip="AI 回答异常时播报，留空即关闭"
            value={draft.onAIError}
            onChange={(next) => setF('onAIError', next)}
          />
        </div>
        <div className="row">
          <KeywordField
            label="回答完毕"
            tip="AI 回答结束后的收尾语，留空即关闭"
            value={draft.onAIReplied}
            onChange={(next) => setF('onAIReplied', next)}
          />
        </div>
      </div>
      <div className="grp">
        <h4>单次对话</h4>
        <div className="row">
          <KeywordField
            label="调用关键词"
            tip="每次提问都需以「小爱同学 + 调用词」开头，不会进入连续对话"
            value={draft.callAIKeywords}
            onChange={(next) => setF('callAIKeywords', next)}
          />
        </div>
      </div>
      <div className="grp">
        <h4>连续对话</h4>
        <div className="row">
          <KeywordField
            label="唤醒关键词"
            tip="唤醒后免唤醒词连续对话 · 修改后需重启绑定该设备的设备"
            value={draft.wakeUpKeywords}
            onChange={(next) => setF('wakeUpKeywords', next)}
          />
          <KeywordField
            label="退出关键词"
            tip="说出退出词即结束连续对话；留空时用唤醒词再唤回或等待超时"
            value={draft.exitKeywords}
            onChange={(next) => setF('exitKeywords', next)}
          />
        </div>
        <div className="row">
          <MsField
            label="继续对话检测"
            tip="连续对话时，播放状态检测间隔。调小此值可以降低小爱回复之间的停顿感，请酌情调节"
            value={draft.checkInterval}
            def={1000}
            onChange={(n) => setF('checkInterval', n)}
          />
          <MsField
            label="停止对话检测"
            tip="连续对话时，下发 TTS 指令多长时间后开始检测设备播放状态。最好不要低于 1 秒。"
            value={draft.checkTTSStatusAfter}
            def={3000}
            onChange={(n) => setF('checkTTSStatusAfter', n)}
          />
        </div>
        <div className="row">
          <Field
            label="自动退出时间"
            tip="连续对话时，无响应多久后自动退出（秒）"
          >
            <input
              inputMode="numeric"
              value={String(draft.exitKeepAliveAfter ?? 30)}
              onChange={(e) =>
                setF(
                  'exitKeepAliveAfter',
                  parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 30,
                )
              }
            />
          </Field>
        </div>
      </div>
      <AdvancedSection
        value={draft.systemTemplate}
        onChange={(next) => setF('systemTemplate', next)}
        refCount={props.usage.length}
        previewVars={{
          botName: draft.name,
          masterName: draft.masterName || '主人',
          botProfile: draft.profile || '(角色性格)',
          masterProfile: draft.masterProfile || '(我的信息)',
          roomName: '（会话群）',
          roomIntroduction: '（群简介）',
        }}
      />
      <div className="acts">
        <span className="sp" />
        <Button variant="ghost" onClick={props.onCancel}>
          取消
        </Button>
        <Button
          variant="primary"
          icon="check"
          onClick={props.onSave}
          disabled={!draft.name}
        >
          保存
        </Button>
      </div>
    </div>
  )
}
