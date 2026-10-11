import {
  PROVIDER_PRESETS,
  buildVoiceTts,
  voiceFormFromTts,
} from '../../constants.ts'
import type { ModalState } from '../../ui-types.ts'

/** 按弹窗类型初始化表单字段（编辑态从 payload 回填，凭据类字段留空表示不修改） */
export function initModalValues(modal: ModalState): Record<string, string> {
  const p = (modal.payload || {}) as Record<string, unknown>
  const init: Record<string, string> = {}
  if (modal.kind === 'credential') {
    init.name = (p.name as string) || ''
    init.miUserId = (p.miUserId as string) || ''
    init.passToken = ''
  } else if (modal.kind === 'model') {
    init.name = (p.name as string) || ''
    init.provider = (p.provider as string) || 'custom'
    init.model =
      (p.model as string) || PROVIDER_PRESETS[init.provider]?.model || ''
    init.apiKey = ''
    init.temperature = String((p.temperature as number) ?? 0.7)
    init.baseUrl =
      (p.baseUrl as string) || PROVIDER_PRESETS[init.provider]?.baseUrl || ''
  } else if (modal.kind === 'voice') {
    init.name = (p.name as string) || ''
    init.timbreId = (p.timbreId as string) || ''
    const v = voiceFormFromTts(p as { provider?: string; tts?: unknown })
    init.provider = v.provider
    init.token = v.token
    init.appId = v.appId
    init.model = v.model
    init.baseUrl = v.baseUrl
    init.customJson = v.customJson
  } else if (modal.kind === 'robot') {
    init.name = (p.name as string) || ''
    init.profile = (p.profile as string) || ''
  } else if (modal.kind === 'deviceBind') {
    init.credentialId = (p.credentialId as string) || ''
    init.robotId = (p.robotId as string) || ''
    init.speakerModel = (p.speakerModel as string) || ''
  }
  return init
}

/**
 * 由表单值构造提交 payload；返回 `err` 表示校验失败（由外壳提示、不关闭弹窗）。
 */
export function buildModalPayload(
  modal: ModalState,
  v: Record<string, string>,
): { out?: Record<string, unknown>; err?: string } {
  let out: Record<string, unknown> = {}
  if (modal.kind === 'credential') {
    out = { name: v.name, miUserId: v.miUserId, passToken: v.passToken }
  } else if (modal.kind === 'model') {
    out = {
      name: v.name,
      provider: v.provider,
      model: v.model,
      temperature: parseFloat(v.temperature) || 0.7,
    }
    out.baseUrl = v.baseUrl || PROVIDER_PRESETS[v.provider]?.baseUrl || ''
    if (v.apiKey) out.apiKey = v.apiKey
  } else if (modal.kind === 'voice') {
    out = { name: v.name, provider: v.provider }
    if (v.timbreId) out.timbreId = v.timbreId
    const { tts, err } = buildVoiceTts({
      provider: v.provider,
      name: v.name,
      timbreId: v.timbreId,
      token: v.token,
      appId: v.appId,
      model: v.model,
      baseUrl: v.baseUrl,
      customJson: v.customJson,
    })
    if (err) return { err }
    if (Object.keys(tts).length) out.tts = tts as never
  } else if (modal.kind === 'robot') {
    out = { name: v.name, profile: v.profile }
  } else if (modal.kind === 'pwd') {
    if (!v.old) {
      return { err: '请输入当前密码' }
    }
    if (!v.pwd) {
      return { err: '请输入新密码' }
    }
    if (v.pwd !== v.pwd2) {
      return { err: '两次输入的新密码不一致' }
    }
    out = { old: v.old, pwd: v.pwd }
  } else if (modal.kind === 'deviceBind') {
    if (!v.robotId) {
      return { err: '请选择对话角色' }
    }
    out = {
      robotId: v.robotId,
      credentialId: v.credentialId || undefined,
      speakerModel: v.speakerModel || undefined,
    }
  }
  return { out }
}
