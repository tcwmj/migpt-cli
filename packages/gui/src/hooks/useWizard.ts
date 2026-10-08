/* ══ 三步设备连接向导：草稿状态 + 账号/角色即时创建 + 保存并启动 ══ */
import { useState } from 'react'
import * as api from '../apis.ts'
import type { Account, Role } from '../apis.ts'
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
      roleId: '',
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
  const newRole = async (d: { name: string; profile?: string }) => {
    const created = await api.createRole(d)
    await refreshAll()
    return created
  }
  const updateRole = async (id: string, d: Partial<Role>) => {
    const u = await api.updateRole(id, d)
    await refreshAll()
    return u
  }
  const finish = async () => {
    if (!wizard) return
    try {
      const created = await api.createDevice({
        alias: wizard.alias,
        did: wizard.did,
        speakerModel: wizard.model || undefined,
        roleId: wizard.roleId || undefined,
        accountId: wizard.accountId || undefined,
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
    newRole,
    updateRole,
    finish,
  }
}
