/* ══ 弹窗提交分发：按弹窗类型调用对应接口，成功后刷新数据 ══ */
import * as api from '../../apis.ts'
import type {
  Account,
  Device,
  Robot,
  Model,
  Voice,
} from '../../apis.ts'
import type { ModalState } from '../../ui-types.ts'
import { errText } from './errText.ts'

export async function submitModal(opts: {
  modal: ModalState
  values: Record<string, unknown>
  showToast: (msg: string) => void
  refreshAll: () => void
  openDevice: (id: string) => void
  detailOpen: boolean
}): Promise<void> {
  const { modal, values, showToast, refreshAll, openDevice, detailOpen } = opts
  try {
    if (modal.kind === 'account') {
      const payload = (modal.payload || {}) as Account
      if (payload.id) {
        await api.updateAccount(payload.id, values as Partial<Account>)
        showToast('账号已更新，换绑账号需重启受影响设备')
      } else {
        await api.createAccount(values as Partial<Account>)
        showToast('账号已连接')
      }
      refreshAll()
    } else if (modal.kind === 'model') {
      const payload = (modal.payload || {}) as Model
      if (payload.id) {
        await api.updateModel(
          payload.id,
          values as Partial<Model>,
        )
        showToast('模型已更新，热生效')
      } else {
        await api.createModel(values as Partial<Model>)
        showToast('模型已创建')
      }
      refreshAll()
    } else if (modal.kind === 'voice') {
      const payload = (modal.payload || {}) as Voice
      if (payload.id) {
        await api.updateVoice(
          payload.id,
          values as Partial<Voice>,
        )
        showToast('语音已更新，音色热切')
      } else {
        await api.createVoice(values as Partial<Voice>)
        showToast('语音已创建')
      }
      refreshAll()
    } else if (modal.kind === 'robot') {
      const payload = (modal.payload || {}) as Robot
      if (payload.id) {
        await api.updateRobot(payload.id, values as Partial<Robot>)
        showToast('角色已保存，角色性格热生效')
      } else {
        await api.createRobot(values as Partial<Robot>)
        showToast('角色已创建')
      }
      refreshAll()
    } else if (modal.kind === 'pwd') {
      await api.changeAuth(
        'admin',
        (values as { old: string }).old,
        'admin',
        (values as { pwd: string }).pwd,
      )
      showToast('密码已修改，下次登录生效')
    } else if (modal.kind === 'deviceBind') {
      const meta = (modal.payload || {}) as Device
      await api.saveDevice(meta.id, { meta: values as Partial<Device> })
      showToast('绑定已更新，需重启设备生效')
      refreshAll()
      if (detailOpen) openDevice(meta.id)
    }
  } catch (e) {
    showToast(errText(e))
  }
}
