import type {
  Account,
  Robot,
  Conversation,
  SpeakerModel,
  Model,
  Voice,
} from '../../apis.ts'
import type { ModalState } from '../../ui-types.ts'

/** 各实体弹窗表单的公共入参 */
export interface ModalFormProps {
  modal: ModalState
  v: Record<string, string>
  setV: (next: Record<string, string>) => void
  isEdit: boolean
}

/** 角色表单额外需要思考/语音列表做下拉选项 */
export interface RobotFormProps extends ModalFormProps {
  models: Model[]
  voices: Voice[]
}

/** 设备绑定表单额外需要各实体列表做下拉选项 */
export interface DeviceBindFormProps extends ModalFormProps {
  accounts: Account[]
  robots: Robot[]
  models: Model[]
  voices: Voice[]
  speakerModels: SpeakerModel[]
  conversations: Conversation[]
}
