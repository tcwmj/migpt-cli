/* 向导完成页：创建结果摘要 + 关闭 / 跳转设备服务两个出口 */
import type { Credential, Model, Robot, Voice } from '../../apis.ts'
import { I } from '../../icons.tsx'
import type { WizardCreated, WizardDraft } from './types.ts'

export function WizardDone(props: {
  created: WizardCreated
  draft: WizardDraft
  credentials: Credential[]
  robots: Robot[]
  models: Model[]
  voices: Voice[]
}) {
  const { created, draft } = props
  const cred = props.credentials.find((a) => a.id === draft.credentialId)
  const robot = props.robots.find((r) => r.id === draft.robotId)
  const voice = props.voices.find((v) => v.id === draft.voiceId)
  const thinkNames = draft.modelIds
    .map((id) => props.models.find((m) => m.id === id)?.name)
    .filter((n): n is string => !!n)
    .join(' → ')
  return (
    <div className="done">
      <div className={'done-ic' + (created.started ? '' : ' warn')}>
        <I n={created.started ? 'check' : 'warning'} size={26} />
      </div>
      <b>设备服务创建成功</b>
      <span className="sub">
        {created.started
          ? '已保存并启动，现在可以唤起音箱开始对话。'
          : '已保存，但启动失败；可到「设备服务」页手动启动。'}
      </span>
      <div className="done-card">
        <div className="rr">
          <span className="k">设备名称</span>
          <span className="v">{created.alias || '—'}</span>
        </div>
        {cred && (
          <div className="rr">
            <span className="k">小米凭据</span>
            <span className="v">{cred.name}</span>
          </div>
        )}
        <div className="rr">
          <span className="k">对话角色</span>
          <span className="v">{robot?.name || '—'}</span>
        </div>
        <div className="rr">
          <span className="k">思考服务</span>
          <span className="v">{thinkNames || '—'}</span>
        </div>
        <div className="rr">
          <span className="k">语音服务</span>
          <span className="v">{voice?.name || '—'}</span>
        </div>
      </div>
    </div>
  )
}
