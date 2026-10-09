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
export type VoiceDraft = {
  name: string
  provider: string
  voiceId: string
  edgeToken: string
  volcanoAppId: string
  volcanoToken: string
  openaiKey: string
  openaiModel: string
  openaiBaseUrl: string
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
  thinkServiceId: string
  voiceOverrideId: string
  ttsSecret: string
  exitKeepAliveAfter: string
  roomRef: string
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
