// ── 响应脱敏：对外 JSON 不回传明文凭据，只回传「是否已配置」标记 ──
// 明文凭据只保留在服务端存储与设备运行时配置中；前端一律「写入即覆盖、不回读」。
// 前端据此把「已保存 / 未配置」的展示改为读取 hasXxx 标记。
import type { GuiConfig } from '@migptgui/options'
import type {
  Account,
  DeviceBindings,
  DeviceMeta,
  Settings,
  ThinkService,
  VoiceService,
} from './types.js'

/** 账号：passToken / miPassword 为云端凭据，读接口不返回明文 */
export function redactAccount(a: Account): Account {
  const { passToken, miPassword, ...rest } = a
  return { ...rest, hasPassToken: !!passToken, hasMiPassword: !!miPassword }
}

export function redactAccounts(list: Account[]): Account[] {
  return list.map(redactAccount)
}

/** 思考服务：apiKey 为模型供应商密钥，读接口不返回明文 */
export function redactThinkService(s: ThinkService): ThinkService {
  const { apiKey, ...rest } = s
  return { ...rest, apiKey: '', hasApiKey: !!apiKey }
}

export function redactThinkServices(list: ThinkService[]): ThinkService[] {
  return list.map(redactThinkService)
}

/** 设备：ttsSecret 是设备 TTS 的路径令牌，读接口不返回明文 */
export function redactDeviceMeta(m: DeviceMeta): DeviceMeta {
  const { ttsSecret, ...rest } = m
  return { ...rest, ttsSecret: '', hasTtsSecret: !!ttsSecret }
}

export function redactDeviceMetas(list: DeviceMeta[]): DeviceMeta[] {
  return list.map(redactDeviceMeta)
}

/** 旧版 settings（无前端消费者，保留接口但同样不回传明文） */
export function redactSettings(s: Settings): Settings {
  return { miUserId: s.miUserId, hasPassToken: !!s.passToken }
}

/** 设备运行时配置：抹掉模型密钥 / 账号密码 / TTS 令牌（前端不消费 config 内容） */
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

/** 设备绑定链：账号与思考服务同样脱敏 */
export function redactBindings(b: DeviceBindings): DeviceBindings {
  return {
    ...b,
    account: b.account ? redactAccount(b.account) : undefined,
    think: b.think ? redactThinkService(b.think) : undefined,
  }
}

/** 语音服务：第三方 TTS 引擎配置中的令牌（edge / volcano / openai）不对外回传明文 */
export function redactVoiceService(v: VoiceService): VoiceService {
  if (!v.tts) return v
  const next = JSON.parse(JSON.stringify(v)) as VoiceService
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
