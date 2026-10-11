/* ══ 五步设备连接向导：草稿状态 + 凭据/角色/服务即时创建 + 保存并启动 ══ */
import { useState } from 'react'
import * as api from '../apis.ts'
import type { Credential, Robot } from '../apis.ts'
import { PROVIDER_PRESETS, buildVoiceTts } from '../constants.ts'
import type { ModelDraft, VoiceDraft } from '../views/drafts.ts'
import type { WizardCreated, WizardDraft } from '../components/wizard/types.ts'
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
      credentialId: '',
      alias: '',
      did: '',
      model: '',
      robotId: '',
      modelIds: [],
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
    const created = await api.createCredential(d)
    await refreshAll()
    return created
  }
  const updateCredential = async (id: string, d: Partial<Credential>) => {
    const u = await api.updateCredential(id, d)
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
  /** 向导内就地新建思考服务：保存后由调用方并入已选列表 */
  const newThink = async (d: ModelDraft) => {
    const baseUrl = d.baseUrl || PROVIDER_PRESETS[d.provider]?.baseUrl || ''
    if (!d.name || !baseUrl || !d.model || !d.apiKey) {
      throw new Error('服务名称、接口地址、模型端点与 API Key 必填')
    }
    const created = await api.createModel({
      name: d.name,
      provider: d.provider,
      model: d.model,
      apiKey: d.apiKey,
      temperature: parseFloat(d.temperature) || 0.7,
      baseUrl,
    })
    await refreshAll()
    return created
  }
  /** 向导内就地新建语音服务：按引擎构造 tts 配置后提交 */
  const newVoice = async (d: VoiceDraft) => {
    const { tts, err } = buildVoiceTts(d)
    if (err) throw new Error(err)
    const created = await api.createVoice({
      name: d.name,
      provider: d.provider,
      ...(d.timbreId ? { timbreId: d.timbreId } : {}),
      ...(Object.keys(tts).length ? { tts: tts as never } : {}),
    })
    await refreshAll()
    return created
  }
  /** 最后一步提交：创建设备并尝试启动，返回创建结果交给完成页 */
  const finish = async (): Promise<WizardCreated | null> => {
    if (!wizard) return null
    // 角色与服务必填：避免提交后由后端 400 拒绝
    if (!wizard.robotId) {
      showToast('请选择一个对话角色')
      return null
    }
    if (!wizard.modelIds.length) {
      showToast('请至少选择一个思考服务')
      return null
    }
    if (!wizard.voiceId) {
      showToast('请选择一个语音服务')
      return null
    }
    try {
      const created = await api.createDevice({
        alias: wizard.alias,
        did: wizard.did,
        speakerModel: wizard.model || undefined,
        robotId: wizard.robotId,
        credentialId: wizard.credentialId || undefined,
        modelIds: wizard.modelIds,
        voiceId: wizard.voiceId,
      })
      let started = true
      try {
        await api.startDevice(created.id)
      } catch (e) {
        // 启动失败不回滚：设备已落盘，完成页提示可到设备服务页重试
        started = false
        showToast('设备已创建，但启动失败：' + errText(e))
      }
      await refreshAll()
      // 创建接口只回 id，展示名沿用草稿里从云端带出的设备名
      return { id: created.id, alias: wizard.alias, started }
    } catch (e) {
      showToast(errText(e))
      return null
    }
  }

  return {
    wizard,
    startWizard,
    closeWizard,
    setDraft,
    newAccount,
    updateCredential,
    newRobot,
    updateRobot,
    newThink,
    newVoice,
    finish,
  }
}
