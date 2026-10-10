/* ══ 三步设备连接向导：草稿状态 + 账号/角色即时创建 + 保存并启动 ══ */
import { useState } from 'react'
import * as api from '../apis.ts'
import type { Account, Robot } from '../apis.ts'
import type { WizardDraft } from '../components/wizard/types.ts'
import { errText } from '../components/app/errText.ts'

export function useWizard(opts: {
  showToast: (msg: string) => void
  refreshAll: () => void
}) {
  const { showToast, refreshAll } = opts
  const [wizard, setWizard] = useState<WizardDraft | null>(null)

  const startWizard = () =>
    setWizard({
      step: 0,
      accountId: '',
      alias: '',
      did: '',
      model: '',
      robotId: '',
      thinkServiceIds: [],
      voiceId: '',
    })
  const closeWizard = () => setWizard(null)
  const setDraft = (p: Partial<WizardDraft>) =>
    setWizard((w) => (w ? { ...w, ...p } : w))

  const newAccount = async (d: {
    name: string
    miUserId: string
    passToken: string
  }) => {
    const created = await api.createAccount(d)
    await refreshAll()
    return created
  }
  const updateAccount = async (id: string, d: Partial<Account>) => {
    const u = await api.updateAccount(id, d)
    await refreshAll()
    return u
  }
  const newRobot = async (d: { name: string; profile?: string }) => {
    const created = await api.createRobot(d)
    await refreshAll()
    return created
  }
  const updateRobot = async (id: string, d: Partial<Robot>) => {
    const u = await api.updateRobot(id, d)
    await refreshAll()
    return u
  }
  const finish = async () => {
    if (!wizard) return
    // 设备服务与角色必填：避免提交后由后端 400 拒绝
    if (!wizard.robotId) {
      showToast('请选择一个对话角色')
      return
    }
    if (!wizard.thinkServiceIds.length) {
      showToast('请至少选择一个思考服务')
      return
    }
    if (!wizard.voiceId) {
      showToast('请选择一个语音服务')
      return
    }
    try {
      const created = await api.createDevice({
        alias: wizard.alias,
        did: wizard.did,
        speakerModel: wizard.model || undefined,
        robotId: wizard.robotId,
        accountId: wizard.accountId || undefined,
        thinkServiceIds: wizard.thinkServiceIds,
        voiceId: wizard.voiceId,
      })
      await api.startDevice(created.id)
      showToast('设备已添加并启动')
      setWizard(null)
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }

  return {
    wizard,
    startWizard,
    closeWizard,
    setDraft,
    newAccount,
    updateAccount,
    newRobot,
    updateRobot,
    finish,
  }
}
