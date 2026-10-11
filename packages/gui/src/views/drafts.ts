/* ── 表单草稿类型（与 App.tsx 主组件 state 保持一致） ── */
import type { CloudDevice } from '../apis.ts'

export type AccountDraft = { name: string; miUserId: string; passToken: string }
export type ModelDraft = {
  name: string
  provider: string
  model: string
  apiKey: string
  temperature: string
  baseUrl: string
  inputTokensUsed?: string
  outputTokensUsed?: string
  totalTokensUsed?: string
  tokenLimit?: string
}
/** 语音草稿：所有供应商共用一组统一输入（引擎差异由 provider 决定展示与校验） */
export type VoiceDraft = {
  name: string
  provider: string
  timbreId: string
  /** 访问令牌 / Access Token / API Key（edge 可选，其余按引擎必填） */
  token: string
  /** 火山语音合成 App ID（仅 volcano 使用） */
  appId: string
  /** 语音模型（openai / openai-compat 使用，留空走引擎默认） */
  model: string
  /** 接口地址（openai-compat 自动带出官方地址，可改网关） */
  baseUrl: string
  customJson: string
}
export type SpeakerModelDraft = {
  name: string
  didPrefix: string
  description: string
  imageUrl: string
  ttsCommand: string[]
  wakeUpCommand: string[]
  playingCommand: string[]
  continuousDialogue: boolean
}
export type DevDraft = {
  alias: string
  did: string
  speakerModel: string
  accountId: string
  robotId: string
  modelIds: string[]
  voiceId: string
  ttsSecret: string
}
export type DevPullState = {
  loading: boolean
  err: string
  list: CloudDevice[] | null
}
export type AcctDevState = {
  loading: boolean
  err: string
  list: CloudDevice[]
}
