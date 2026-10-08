/* ══ ModalShell ══ */
import { useState } from 'react'
import {
  type Account,
  type Role,
  type Room,
  type SpeakerModel,
  type ThinkService,
  type VoiceService,
} from '../apis.ts'
import { I } from '../icons.tsx'
import { Button } from './atoms/index.ts'
import type { ModalState } from '../ui-types.ts'
import { AccountForm } from './modals/AccountForm.tsx'
import { DeviceBindForm } from './modals/DeviceBindForm.tsx'
import { PwdForm } from './modals/PwdForm.tsx'
import { RoleForm } from './modals/RoleForm.tsx'
import { ThinkForm } from './modals/ThinkForm.tsx'
import { VoiceForm } from './modals/VoiceForm.tsx'
import { buildModalPayload, initModalValues } from './modals/values.ts'

export function ModalShell(props: {
  modal: ModalState
  accounts: Account[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onDone: (values: Record<string, unknown>) => void
}) {
  const { modal } = props
  const [v, setV] = useState<Record<string, string>>(() =>
    initModalValues(modal),
  )
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const isEdit = !!(modal.payload as { id?: string })?.id
  const submit = () => {
    if (closing) return
    const { out, err } = buildModalPayload(modal, v)
    if (err) {
      setV({ ...v, err })
      return
    }
    close(() => props.onDone(out || {}))
  }
  const formProps = { modal, v, setV, isEdit }
  const noticeOnly =
    modal.kind === 'deviceBind' && modal.title === '变更生效说明'
  return (
    <>
      <div
        className={'scrim on' + (closing ? ' closing' : '')}
        onClick={() => close()}
      />
      <div className={'modal on' + (closing ? ' closing' : '')}>
        <h3>
          <I
            n={
              modal.kind === 'pwd'
                ? 'lock'
                : modal.kind === 'think'
                  ? 'bolt'
                  : modal.kind === 'voice'
                    ? 'mic'
                    : modal.kind === 'role'
                      ? 'chat'
                      : 'user'
            }
            size={18}
          />{' '}
          {modal.title}
        </h3>
        <div className="desc">{modal.desc}</div>

        {modal.kind === 'account' && <AccountForm {...formProps} />}
        {modal.kind === 'think' && <ThinkForm {...formProps} />}
        {modal.kind === 'voice' && <VoiceForm {...formProps} />}
        {modal.kind === 'role' && <RoleForm {...formProps} />}
        {modal.kind === 'pwd' && <PwdForm {...formProps} />}
        {modal.kind === 'deviceBind' &&
          (noticeOnly ? (
            <div className="notice">
              <I n="warning" size={15} /> 换绑账号、修改唤醒词或 did
              必须重启设备；角色内容、思考服务（模型 /
              温度）热生效；语音服务支持热切。
            </div>
          ) : (
            <DeviceBindForm
              {...formProps}
              accounts={props.accounts}
              roles={props.roles}
              thinkSvcs={props.thinkSvcs}
              voiceSvcs={props.voiceSvcs}
              models={props.models}
              rooms={props.rooms}
            />
          ))}

        <div className="acts">
          <Button onClick={() => close()}>取消</Button>
          <Button variant="primary" onClick={submit}>
            {noticeOnly ? '知道了' : '确定'}
          </Button>
        </div>
      </div>
    </>
  )
}
