import type {
  Account,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../../apis.ts'
import type { ModalState } from '../../ui-types.ts'

/** 各实体弹窗表单的公共入参 */
export interface ModalFormProps {
  modal: ModalState
  v: Record<string, string>
  setV: (next: Record<string, string>) => void
  isEdit: boolean
}

/** 设备绑定表单额外需要各实体列表做下拉选项 */
export interface DeviceBindFormProps extends ModalFormProps {
  accounts: Account[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  rooms: Room[]
}
