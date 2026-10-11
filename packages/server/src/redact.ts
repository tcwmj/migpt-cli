// ── 响应脱敏：对外 JSON 不回传明文凭据，只回传「是否已配置」标记 ──
// 明文凭据只保留在服务端存储与设备运行时配置中；前端一律「写入即覆盖、不回读」。
// 前端据此把「已保存 / 未配置」的展示改为读取 hasXxx 标记。
import type { GuiConfig } from '@migptgui/options'
import type {
  DeviceBindings,
  Device,
  Credential,
  Model,
  Voice,
} from './types.js'

/** 小米凭据：passToken 为会话凭证，读接口不返回明文 */
export function redactCredential(a: Credential): Credential {
  const { passToken, ...rest } = a
  return { ...rest, hasPassToken: !!passToken }
}

export function redactCredentials(list: Credential[]): Credential[] {
  return list.map(redactCredential)
}

/** 模型：apiKey 为模型供应商密钥，读接口不返回明文 */
export function redactModel(s: Model): Model {
  const { apiKey, ...rest } = s
  return { ...rest, apiKey: '', hasApiKey: !!apiKey }
}

export function redactModels(list: Model[]): Model[] {
  return list.map(redactModel)
}

/** 设备：ttsSecret 是设备 TTS 的路径令牌，读接口不返回明文 */
export function redactDevice(m: Device): Device {
  const { ttsSecret, ...rest } = m
  return { ...rest, ttsSecret: '', hasTtsSecret: !!ttsSecret }
}

export function redactDevices(list: Device[]): Device[] {
  return list.map(redactDevice)
}

/** 设备运行时配置：抹掉模型密钥 / 凭据密码 / TTS 令牌（前端不消费 config 内容） */
export function redactGuiConfig(config: GuiConfig): GuiConfig {
  const next = JSON.parse(JSON.stringify(config)) as GuiConfig
  if (next.env?.OPENAI_API_KEY) next.env.OPENAI_API_KEY = ''
  const speaker = (next.config as { speaker?: { password?: string } })?.speaker
  if (speaker?.password) speaker.password = ''
  const tts = next.tts as
    | {
        edge?: { trustedToken?: string }
        volcano?: { accessToken?: string }
        openai?: { apiKey?: string }
      }
    | undefined
  if (tts?.edge?.trustedToken) tts.edge.trustedToken = ''
  if (tts?.volcano?.accessToken) tts.volcano.accessToken = ''
  if (tts?.openai?.apiKey) tts.openai.apiKey = ''
  return next
}

/** 设备绑定链：凭据与模型同样脱敏 */
export function redactBindings(b: DeviceBindings): DeviceBindings {
  return {
    ...b,
    credential: b.credential ? redactCredential(b.credential) : undefined,
    model: b.model ? redactModel(b.model) : undefined,
  }
}

/** 语音：第三方 TTS 引擎配置中的令牌（edge / volcano / openai）不对外回传明文 */
export function redactVoice(v: Voice): Voice {
  if (!v.tts) return { ...v, hasTtsToken: false }

  const next = JSON.parse(JSON.stringify(v)) as Voice
  const tts = next.tts as
    | {
        edge?: { trustedToken?: string }
        volcano?: { accessToken?: string }
        openai?: { apiKey?: string }
      }
    | undefined

  // 在脱敏前检查是否有任何令牌配置
  const hasToken = !!(
    tts?.edge?.trustedToken ||
    tts?.volcano?.accessToken ||
    tts?.openai?.apiKey
  )

  if (tts?.edge?.trustedToken) tts.edge.trustedToken = ''
  if (tts?.volcano?.accessToken) tts.volcano.accessToken = ''
  if (tts?.openai?.apiKey) tts.openai.apiKey = ''

  return { ...next, hasTtsToken: hasToken }
}
