import type { Role, ThinkService, VoiceService } from '../../apis.ts'
import { I } from '../../icons.tsx'
import { Button, Field } from '../../components/atoms/index.ts'

/** 关键词字段：输入框文本与「、」分隔的字符串数组互转 */
function KeywordField(props: {
  label: string
  tip: string
  value?: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <Field label={props.label} tip={props.tip}>
      <input
        value={(props.value || []).join('、')}
        onChange={(e) =>
          props.onChange(e.target.value.split(/[、,，]/).filter(Boolean))
        }
      />
    </Field>
  )
}

export function RoleEditForm(props: {
  draft: Role
  creating: boolean
  usage: string[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  setF: (k: keyof Role, v: unknown) => void
  onCancel: () => void
  onSave: () => void
}) {
  const { draft, setF } = props
  const thinkDefault = props.thinkSvcs.find((s) => s.isDefault)
  const voiceDefault = props.voiceSvcs.find((s) => s.isDefault)
  return (
    <div className="rform redit">
      <h3>
        <I n="chat" size={17} /> {props.creating ? '新建角色' : '编辑角色'}
        <span className="refs">
          本角色被 {props.usage.length} 台设备引用
          {props.usage.length ? '（' + props.usage.join(' · ') + '）' : ''}
          。人设与模型热生效；修改唤醒词需重启设备。
        </span>
      </h3>
      <div className="grp">
        <h4>基本信息</h4>
        <div className="row">
          <Field label="角色名称" required>
            <input
              value={draft.name}
              onChange={(e) => setF('name', e.target.value)}
            />
          </Field>
        </div>
        <div className="row">
          <Field label="人设描述" tip="供思考服务理解人格 · 热生效">
            <textarea
              value={draft.profile}
              onChange={(e) => setF('profile', e.target.value)}
            />
          </Field>
        </div>
      </div>
      <div className="grp">
        <h4>模型服务</h4>
        <div className="row">
          <Field label="思考服务">
            <select
              value={draft.thinkServiceId || ''}
              onChange={(e) =>
                setF('thinkServiceId', e.target.value || undefined)
              }
            >
              <option value="">
                （跟随全局默认：{thinkDefault?.name || '未设置'}）
              </option>
              {props.thinkSvcs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.isDefault ? ' · 默认' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="语音服务">
            <select
              value={draft.voiceId || ''}
              onChange={(e) => setF('voiceId', e.target.value || undefined)}
            >
              <option value="">
                （跟随全局默认：{voiceDefault?.name || '未设置'}）
              </option>
              {props.voiceSvcs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.isDefault ? ' · 默认' : ''}
                </option>
              ))}
            </select>
          </Field>
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
          <Field
            label="自动退出时间"
            tip="连续对话中无响应超过该秒数自动退出，默认 30 秒"
          >
            <input
              value={String(draft.exitKeepAliveAfter ?? 30)}
              placeholder="默认 30"
              onChange={(e) =>
                setF(
                  'exitKeepAliveAfter',
                  parseInt(e.target.value || '30', 10) || 30,
                )
              }
            />
          </Field>
        </div>
        <div className="row">
          <KeywordField
            label="继续对话检测"
            tip="说出继续词可保持连续对话；超时退出后再说出可重新进入"
            value={draft.checkContinueKeywords}
            onChange={(next) => setF('checkContinueKeywords', next)}
          />
          <KeywordField
            label="停止对话检测"
            tip="说出停止词立即结束连续对话，等效于退出关键词"
            value={draft.checkNotContinueKeywords}
            onChange={(next) => setF('checkNotContinueKeywords', next)}
          />
        </div>
      </div>
      <div className="grp">
        <h4>提示语</h4>
        <div className="row">
          <KeywordField
            label="进入 AI"
            tip="进入连续对话时播报，留空即关闭该提示"
            value={draft.onEnterAI}
            onChange={(next) => setF('onEnterAI', next)}
          />
          <KeywordField
            label="退出 AI"
            tip="退出连续对话时播报，留空即关闭"
            value={draft.onExitAI}
            onChange={(next) => setF('onExitAI', next)}
          />
        </div>
        <div className="row">
          <KeywordField
            label="AI 思考中"
            tip="AI 开始回答前的过渡语，留空即关闭"
            value={draft.onAIAsking}
            onChange={(next) => setF('onAIAsking', next)}
          />
          <KeywordField
            label="AI 回答完毕"
            tip="AI 回答结束后的收尾语，留空即关闭"
            value={draft.onAIReplied}
            onChange={(next) => setF('onAIReplied', next)}
          />
        </div>
        <div className="row">
          <KeywordField
            label="AI 出错"
            tip="AI 回答异常时播报，留空即关闭"
            value={draft.onAIError}
            onChange={(next) => setF('onAIError', next)}
          />
        </div>
      </div>
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
