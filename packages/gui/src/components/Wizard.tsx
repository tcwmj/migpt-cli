/* ══ Wizard ══ */
import { useState } from 'react'
import {
  type Account,
  type Role,
  type SpeakerModel,
  type ThinkService,
  type VoiceService,
} from '../apis.ts'
import { I } from '../icons.tsx'
import { WizardAccountStep } from './wizard/WizardAccountStep.tsx'
import { WizardDeviceStep } from './wizard/WizardDeviceStep.tsx'
import { WizardRoleStep } from './wizard/WizardRoleStep.tsx'
import type { WizardDraft, WizardSetDraft } from './wizard/types.ts'

export function Wizard(props: {
  step: number
  accounts: Account[]
  roles: Role[]
  models: SpeakerModel[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  devices: { id: string; alias: string; did: string; accountId?: string }[]
  draft: WizardDraft
  setDraft: WizardSetDraft
  onClose: () => void
  onFinish: () => void
  onNewAccount: (d: {
    name: string
    miUserId: string
    passToken: string
  }) => Promise<Account>
  onUpdateAccount: (id: string, d: Partial<Account>) => Promise<Account>
  onNewRole: (d: { name: string; profile?: string }) => Promise<Role>
  onUpdateRole: (id: string, d: Partial<Role>) => Promise<Role>
}) {
  const { draft, setDraft } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      props.onClose()
    }, 200)
  }
  // 设备拉取失败会阻止进入下一步，故状态提升到此处以便底部导航判定
  const [pullErr, setPullErr] = useState('')
  const step = draft.step
  const selAcct = props.accounts.find((a) => a.id === draft.accountId)
  const canNext =
    (step === 0 && !!draft.accountId) ||
    (step === 1 && !!draft.did && !pullErr) ||
    step === 2
  const finish = () => {
    if (closing) return
    if (step === 2) close(props.onFinish)
    else if (canNext) setDraft({ step: step + 1 })
  }
  const WSTEP = [
    { n: '1', t: '连接账号', s: '读取设备' },
    { n: '2', t: '选择设备', s: '确认型号' },
    { n: '3', t: '对话服务', s: '保存并启动' },
  ]
  return (
    <div className={'wizard on' + (closing ? ' closing' : '')}>
      <div className="wiz">
        <div className="wh">
          <div className="wtitle">
            <b>设备连接向导</b>
          </div>
          <div className="wsteps">
            {WSTEP.map((it, i) => (
              <div
                key={i}
                className={
                  'wstep' + (step === i ? ' on' : i < step ? ' done' : '')
                }
              >
                <span className="wno">
                  {i < step ? <I n="check" size={13} /> : it.n}
                </span>
                <span className="wt">
                  <b>
                    {it.t}（{it.s}）
                  </b>
                </span>
              </div>
            ))}
          </div>
          <button className="icon-btn" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="wb">
          <WizardAccountStep
            active={step === 0}
            accounts={props.accounts}
            accountId={draft.accountId}
            setDraft={setDraft}
            onNewAccount={props.onNewAccount}
            onUpdateAccount={props.onUpdateAccount}
          />
          <WizardDeviceStep
            active={step === 1}
            accountId={draft.accountId}
            selAcct={selAcct}
            models={props.models}
            devices={props.devices}
            did={draft.did}
            alias={draft.alias}
            model={draft.model}
            setDraft={setDraft}
            pullErr={pullErr}
            setPullErr={setPullErr}
          />
          <WizardRoleStep
            active={step === 2}
            roles={props.roles}
            roleId={draft.roleId}
            thinkSvcs={props.thinkSvcs}
            voiceSvcs={props.voiceSvcs}
            setDraft={setDraft}
            onNewRole={props.onNewRole}
            onUpdateRole={props.onUpdateRole}
          />
        </div>
        <div className="wf">
          <button
            className="btn ghost"
            disabled={step === 0}
            onClick={() => setDraft({ step: step - 1 })}
          >
            <I n="arrowL" /> 上一步
          </button>
          <div className="r">
            <button className="btn" onClick={() => close()}>
              取消
            </button>
            <button
              className="btn primary"
              disabled={!canNext && step < 2}
              onClick={finish}
            >
              {step === 2 ? '完成' : '下一步'} <I n="arrowR" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
