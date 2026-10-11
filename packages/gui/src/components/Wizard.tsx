/* ══ Wizard：五步设备连接向导 ══ */
import { useState } from 'react'
import {
  type Credential,
  type Robot,
  type SpeakerModel,
  type Model,
  type Voice,
} from '../apis.ts'
import { I } from '../icons.tsx'
import { Button } from './atoms/index.ts'
import { WizardCredentialStep } from './wizard/WizardCredentialStep.tsx'
import { WizardDeviceStep } from './wizard/WizardDeviceStep.tsx'
import { WizardThinkStep } from './wizard/WizardThinkStep.tsx'
import { WizardVoiceStep } from './wizard/WizardVoiceStep.tsx'
import { WizardRobotStep } from './wizard/WizardRobotStep.tsx'
import { WizardDone } from './wizard/WizardDone.tsx'
import type {
  WizardCreated,
  WizardDraft,
  WizardSetDraft,
} from './wizard/types.ts'
import type { ModelDraft, VoiceDraft } from '../views/drafts.ts'

/** 最后一步下标（0 起）：连接凭据 / 选择设备 / 思考服务 / 语音服务 / 对话角色 */
const LAST_STEP = 4

export function Wizard(props: {
  step: number
  credentials: Credential[]
  robots: Robot[]
  speakerModels: SpeakerModel[]
  models: Model[]
  voices: Voice[]
  devices: { id: string; alias: string; did: string; credentialId?: string }[]
  draft: WizardDraft
  setDraft: WizardSetDraft
  onClose: () => void
  onFinish: () => Promise<WizardCreated | null>
  onGoDevice: (id: string) => void
  onNewAccount: (d: {
    name: string
    miUserId: string
    passToken: string
  }) => Promise<Credential>
  onUpdateAccount: (id: string, d: Partial<Credential>) => Promise<Credential>
  onNewRobot: (d: Partial<Robot> & { name: string }) => Promise<Robot>
  onUpdateRobot: (id: string, d: Partial<Robot>) => Promise<Robot>
  onNewThink: (d: ModelDraft) => Promise<Model>
  onNewVoice: (d: VoiceDraft) => Promise<Voice>
}) {
  const { draft, setDraft } = props
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  // 创建成功后的结果：非空时切换到完成页（不再回到步骤表单）
  const [done, setDone] = useState<WizardCreated | null>(null)
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
  const selAcct = props.credentials.find((a) => a.id === draft.credentialId)
  const canNext =
    (step === 0 && !!draft.credentialId) ||
    (step === 1 && !!draft.did && !pullErr) ||
    (step === 2 && draft.modelIds.length > 0) ||
    (step === 3 && !!draft.voiceId) ||
    (step === 4 && !!draft.robotId)
  const finish = async () => {
    if (closing || busy) return
    if (step < LAST_STEP) {
      if (canNext) setDraft({ step: step + 1 })
      return
    }
    if (!canNext) return
    setBusy(true)
    const res = await props.onFinish()
    setBusy(false)
    if (res) setDone(res)
  }
  const WSTEP = [
    { n: '1', t: '连接凭据', s: '读取设备' },
    { n: '2', t: '选择设备', s: '确认型号' },
    { n: '3', t: '思考服务', s: '选择大脑' },
    { n: '4', t: '语音服务', s: '选择音色' },
    { n: '5', t: '对话角色', s: '保存并启动' },
  ]
  return (
    <div className={'wizard on' + (closing ? ' closing' : '')}>
      <div className="wiz">
        <div className="wh">
          <div className="wtitle">
            <b>{done ? '接入完成' : '设备连接向导'}</b>
          </div>
          <div className="wsteps">
            {WSTEP.map((it, i) => (
              <div
                key={i}
                className={
                  'wstep' +
                  (done || i < step ? ' done' : '') +
                  (!done && step === i ? ' on' : '')
                }
              >
                <span className="wno">
                  {done || i < step ? <I n="check" size={13} /> : it.n}
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
        {done ? (
          <>
            <div className="wb">
              <WizardDone
                created={done}
                draft={draft}
                credentials={props.credentials}
                robots={props.robots}
                models={props.models}
                voices={props.voices}
              />
            </div>
            <div className="wf end">
              <div className="r">
                <Button onClick={() => close()}>直接关闭</Button>
                <Button
                  variant="primary"
                  icon="arrowR"
                  onClick={() => close(() => props.onGoDevice(done.id))}
                >
                  查看设备服务
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="wb">
              <WizardCredentialStep
                active={step === 0}
                credentials={props.credentials}
                credentialId={draft.credentialId}
                setDraft={setDraft}
                onNewAccount={props.onNewAccount}
                onUpdateAccount={props.onUpdateAccount}
              />
              <WizardDeviceStep
                active={step === 1}
                credentialId={draft.credentialId}
                selAcct={selAcct}
                speakerModels={props.speakerModels}
                devices={props.devices}
                did={draft.did}
                alias={draft.alias}
                model={draft.model}
                setDraft={setDraft}
                pullErr={pullErr}
                setPullErr={setPullErr}
              />
              <WizardThinkStep
                active={step === 2}
                models={props.models}
                modelIds={draft.modelIds}
                setDraft={setDraft}
                onNewThink={props.onNewThink}
              />
              <WizardVoiceStep
                active={step === 3}
                voices={props.voices}
                voiceId={draft.voiceId}
                setDraft={setDraft}
                onNewVoice={props.onNewVoice}
              />
              <WizardRobotStep
                active={step === 4}
                robots={props.robots}
                robotId={draft.robotId}
                setDraft={setDraft}
                onNewRobot={props.onNewRobot}
                onUpdateRobot={props.onUpdateRobot}
              />
            </div>
            <div className="wf">
              <Button
                variant="ghost"
                icon="arrowL"
                disabled={step === 0}
                onClick={() => setDraft({ step: step - 1 })}
              >
                上一步
              </Button>
              <div className="r">
                <Button onClick={() => close()}>取消</Button>
                <Button
                  variant="primary"
                  icon="arrowR"
                  disabled={!canNext || busy}
                  onClick={finish}
                >
                  {step === LAST_STEP
                    ? busy
                      ? '创建中…'
                      : '创建并启动'
                    : '下一步'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
