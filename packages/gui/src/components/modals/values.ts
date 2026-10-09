import { PROVIDER_PRESETS } from '../../constants.ts'
import type { ModalState } from '../../ui-types.ts'

/** 按弹窗类型初始化表单字段（编辑态从 payload 回填，凭据类字段留空表示不修改） */
export function initModalValues(modal: ModalState): Record<string, string> {
  const p = (modal.payload || {}) as Record<string, unknown>
  const init: Record<string, string> = {}
  if (modal.kind === 'account') {
    init.name = (p.name as string) || ''
    init.miUserId = (p.miUserId as string) || ''
    init.passToken = ''
  } else if (modal.kind === 'think') {
    init.name = (p.name as string) || ''
    init.provider = (p.provider as string) || 'doubao'
    init.model =
      (p.model as string) || PROVIDER_PRESETS[init.provider]?.model || ''
    init.apiKey = ''
    init.temperature = String((p.temperature as number) ?? 0.7)
    init.baseUrl =
      (p.baseUrl as string) || PROVIDER_PRESETS[init.provider]?.baseUrl || ''
  } else if (modal.kind === 'voice') {
    init.name = (p.name as string) || ''
    init.provider = (p.provider as string) || 'edge'
    init.voiceId = (p.voiceId as string) || ''
    const tts =
      (p.tts as {
        edge?: { trustedToken?: string }
        volcano?: { appId?: string; accessToken?: string }
        openai?: { apiKey?: string; model?: string; baseUrl?: string }
      }) || {}
    init.edgeToken = tts.edge?.trustedToken || ''
    init.volcanoAppId = tts.volcano?.appId || ''
    init.volcanoToken = tts.volcano?.accessToken || ''
    init.openaiKey = tts.openai?.apiKey || ''
    init.openaiModel = tts.openai?.model || ''
    init.openaiBaseUrl = tts.openai?.baseUrl || ''
  } else if (modal.kind === 'role') {
    init.name = (p.name as string) || ''
    init.profile = (p.profile as string) || ''
  } else if (modal.kind === 'deviceBind') {
    init.accountId = (p.accountId as string) || ''
    init.roleId = (p.roleId as string) || ''
    init.speakerModel = (p.speakerModel as string) || ''
    init.exitKeepAliveAfter = String((p.exitKeepAliveAfter as number) ?? 30)
    init.roomRef = (p.roomRef as string) || ''
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
  if (modal.kind === 'account') {
    out = { name: v.name, miUserId: v.miUserId, passToken: v.passToken }
  } else if (modal.kind === 'think') {
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
    if (v.voiceId) out.voiceId = v.voiceId
    const tts: Record<string, unknown> = {}
    if (v.provider === 'edge') {
      tts.edge = v.edgeToken ? { trustedToken: v.edgeToken } : {}
    } else if (v.provider === 'volcano') {
      if (!v.volcanoAppId || !v.volcanoToken) {
        return { err: '火山引擎需填写 App ID 与访问令牌' }
      }
      tts.volcano = { appId: v.volcanoAppId, accessToken: v.volcanoToken }
    } else if (v.provider === 'openai') {
      if (!v.openaiKey) {
        return { err: 'OpenAI TTS 需填写 API Key' }
      }
      tts.openai = {
        apiKey: v.openaiKey,
        ...(v.openaiModel ? { model: v.openaiModel } : {}),
        ...(v.openaiBaseUrl ? { baseUrl: v.openaiBaseUrl } : {}),
      }
    } else if (v.provider === 'custom') {
      try {
        const j = JSON.parse(v.customJson || '{}')
        Object.assign(tts, j)
      } catch {
        return { err: '自定义 TTS 配置不是合法 JSON' }
      }
    }
    if (Object.keys(tts).length) out.tts = tts as never
  } else if (modal.kind === 'role') {
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
    out = {
      roleId: v.roleId || undefined,
      accountId: v.accountId || undefined,
      speakerModel: v.speakerModel || undefined,
      exitKeepAliveAfter: parseInt(v.exitKeepAliveAfter || '30', 10) || 30,
      roomRef: v.roomRef || undefined,
    }
  }
  return { out }
}
