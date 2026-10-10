/* ── 表单草稿类型（与 App.tsx 主组件 state 保持一致） ── */
import type { PulledDevice } from '../apis.ts'

export type AccountDraft = { name: string; miUserId: string; passToken: string }
export type ThinkDraft = {
  name: string
  provider: string
  model: string
  apiKey: string
  temperature: string
  baseUrl: string
  tokenInputUsed?: string
  tokenOutputUsed?: string
  tokenUsed?: string
  tokenLimit?: string
}
/** 语音草稿：所有供应商共用一组统一输入（引擎差异由 provider 决定展示与校验） */
export type VoiceDraft = {
  name: string
  provider: string
  voiceId: string
  /** 访问令牌 / Access Token / API Key（edge 可选，其余按引擎必填） */
  token: string
  /** 火山语音合成 App ID（仅 volcano 使用） */
  appId: string
  /** 语音模型（openai / openai-compat 使用，留空走引擎默认） */
  model: string
  /** 接口地址（openai-compat 自动带出官方地址，可改网关） */
  baseUrl: string
  customJson: string
  tokenInputUsed?: string
  tokenOutputUsed?: string
  tokenUsed?: string
  tokenLimit?: string
}
export type ModelDraft = {
  name: string
  did: string
  desc: string
  imageUrl: string
  ttsCommand: string[]
  wakeUpCommand: string[]
  playingCommand: string[]
  consecutive: boolean
}
export type DevDraft = {
  alias: string
  did: string
  speakerModel: string
  accountId: string
  roleId: string
  thinkServiceIds: string[]
  voiceId: string
  ttsSecret: string
}
export type DevPullState = {
  loading: boolean
  err: string
  list: PulledDevice[] | null
}
export type AcctDevState = {
  loading: boolean
  err: string
  list: PulledDevice[]
}
