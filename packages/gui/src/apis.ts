import { GuiConfig } from '@migptgui/options'
import type { TTSConfig } from 'mi-gpt-tts'

// ── 登录认证（Basic Auth 凭据管理）──────────────────────────
const CRED_KEY = 'migpt-auth'

export function getAuthHeader(): string | null {
  const s = localStorage.getItem(CRED_KEY)
  return s ? 'Basic ' + btoa(unescape(encodeURIComponent(s))) : null
}

export function setAuth(user: string, pwd: string) {
  localStorage.setItem(CRED_KEY, user + ':' + pwd)
}

export function clearAuth() {
  localStorage.removeItem(CRED_KEY)
}

export function changeAuth(
  oldUser: string,
  oldPassword: string,
  newUser: string,
  newPassword: string,
) {
  return fetch('/api/auth', {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify({
      oldUser,
      oldPassword,
      newUser,
      newPassword,
    }),
  }).then((r) => j<{ success: boolean }>(r))
}

function headers(withBody: boolean): Record<string, string> {
  const h: Record<string, string> = {}
  const auth = getAuthHeader()
  if (auth) h['Authorization'] = auth
  if (withBody) h['Content-Type'] = 'application/json'
  return h
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('unauthorized')
    }
    // 删除保护等业务错误：透出服务端 message（JSON error 字段）
    try {
      const body = await res.json()
      const err = new Error(body.error || 'HTTP ' + res.status)
      ;(err as any).status = res.status
      ;(err as any).refs = body.refs
      throw err
    } catch (e) {
      if ((e as Error).message !== 'HTTP ' + res.status) throw e
      throw new Error('HTTP ' + res.status + ' ' + res.statusText)
    }
  }
  return res.json() as Promise<T>
}

function post<T>(url: string, body?: unknown): Promise<T> {
  return fetch(url, {
    method: 'POST',
    headers: headers(!!body),
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => j<T>(r))
}

// ── 实体类型 ───────────────────────────────────────────────
export interface DeviceMeta {
  id: string
  alias: string
  did: string
  speakerModel?: string
  roleId?: string
  accountId?: string
  thinkServiceId?: string
  voiceOverrideId?: string
  /** 连续对话超时（秒），默认 30 */
  exitKeepAliveAfter?: number
  /** 会话群引用（Room 实体 id；多设备可共用同一会话群） */
  roomRef?: string
  /** 会话群名称（已迁移至 Room 实体，仅兼容旧数据） */
  roomName?: string
  /** 会话群描述（已迁移至 Room 实体，仅兼容旧数据） */
  roomDescription?: string
  ttsSecret: string
  createdAt: number
}

export interface DeviceRow extends DeviceMeta {
  running: boolean
}

export interface Role {
  id: string
  name: string
  profile: string
  callAIKeywords: string[]
  wakeUpKeywords: string[]
  exitKeywords: string[]
  /** 检测1/检测2：说出继续词保持对话、停止词结束对话（已并入唤醒/退出关键词真实生效） */
  checkContinueKeywords?: string[]
  checkNotContinueKeywords?: string[]
  onEnterAI: string[]
  onExitAI: string[]
  onAIAsking: string[]
  onAIReplied: string[]
  onAIError: string[]
  /** 连续对话无响应自动退出时间（秒，默认 30） */
  exitKeepAliveAfter?: number
  thinkServiceId?: string
  voiceId?: string
}

/** 思考服务：音箱的「大脑」 */
export interface ThinkService {
  id: string
  name: string
  provider: string
  model: string
  apiKey: string
  baseUrl?: string
  temperature?: number
  isDefault?: boolean
  createdAt: number
}

/** 语音服务：音箱的「嗓子」 */
export interface VoiceService {
  id: string
  name: string
  provider: string
  voiceId?: string
  ttsCommand?: (number | undefined)[]
  builtin?: boolean
  isDefault?: boolean
  tts?: TTSConfig
  createdAt: number
}

/** 音箱型号：设备的「硬件身份」配置 */
export interface SpeakerModel {
  id: string
  name: string
  did: string
  desc?: string
  ttsCommand?: number[]
  wakeUpCommand?: number[]
  playingCommand?: number[]
  consecutive?: boolean
  /** 型号图片（内置型号为真实设备图 URL） */
  imageUrl?: string
  builtin?: boolean
  createdAt: number
}

export interface Settings {
  miUserId?: string
  miPassword?: string
  passToken?: string
}

export interface Account {
  id: string
  name: string
  miUserId: string
  miPassword?: string
  passToken?: string
  createdAt: number
}

/** 设备绑定链（来源标注） */
export interface BindingRow {
  key: 'account' | 'role' | 'think' | 'voice'
  label: string
  name: string
  detail?: string
  source: 'device' | 'role' | 'global'
  sourceLabel: string
}

export interface DeviceBindings {
  account?: Account
  role?: Role
  think?: ThinkService
  voice?: VoiceService
  rows: BindingRow[]
}

export interface DeviceDetail {
  meta: DeviceMeta
  config: GuiConfig
  bindings: DeviceBindings
}

// ── 状态与账号 ───────────────────────────────────────────────
export const getStatusAll = () =>
  fetch('/api/status', { headers: headers(false) }).then((r) =>
    j<{ devices: DeviceRow[] }>(r),
  )

export const getSettings = () =>
  fetch('/api/settings', { headers: headers(false) }).then((r) =>
    j<Settings>(r),
  )

export const saveSettings = (s: Settings) =>
  fetch('/api/settings', {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<{ success: boolean }>(r))

// ── 云端账号（多账号）─────────────────────────────────────────
export const getAccounts = () =>
  fetch('/api/accounts', { headers: headers(false) }).then((r) =>
    j<Account[]>(r),
  )

export const createAccount = (a: Partial<Account>) =>
  post<Account>('/api/accounts', a)

export const updateAccount = (id: string, a: Partial<Account>) =>
  fetch(`/api/accounts/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(a),
  }).then((r) => j<Account>(r))

export const deleteAccount = (id: string) =>
  fetch(`/api/accounts/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// 凭 小米ID + passToken 拉取账号下音箱设备列表（三步连接 Step2 与设备添加复用）
export interface PulledDevice {
  name: string
  alias: string
  deviceID: string
  miotDID: string
  hardware: string
  presence: string
}
export const pullDevices = (accountId: string) =>
  post<{ devices: PulledDevice[] }>(`/api/accounts/${accountId}/pull-devices`)

// ── AI 角色 ─────────────────────────────────────────────────
export const getRoles = () =>
  fetch('/api/roles', { headers: headers(false) }).then((r) => j<Role[]>(r))

export const createRole = (role: Partial<Role>) =>
  post<Role>('/api/roles', role)

export const updateRole = (id: string, role: Partial<Role>) =>
  fetch(`/api/roles/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(role),
  }).then((r) => j<Role>(r))

export const deleteRole = (id: string) =>
  fetch(`/api/roles/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 思考服务 ─────────────────────────────────────────────────
export const getThinkServices = () =>
  fetch('/api/think-services', { headers: headers(false) }).then((r) =>
    j<ThinkService[]>(r),
  )

export const createThinkService = (s: Partial<ThinkService>) =>
  post<ThinkService>('/api/think-services', s)

export const updateThinkService = (id: string, s: Partial<ThinkService>) =>
  fetch(`/api/think-services/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<ThinkService>(r))

export const deleteThinkService = (id: string) =>
  fetch(`/api/think-services/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 语音服务 ─────────────────────────────────────────────────
export const getVoiceServices = () =>
  fetch('/api/voice-services', { headers: headers(false) }).then((r) =>
    j<VoiceService[]>(r),
  )

export const createVoiceService = (s: Partial<VoiceService>) =>
  post<VoiceService>('/api/voice-services', s)

export const updateVoiceService = (id: string, s: Partial<VoiceService>) =>
  fetch(`/api/voice-services/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<VoiceService>(r))

export const deleteVoiceService = (id: string) =>
  fetch(`/api/voice-services/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 音箱型号 ─────────────────────────────────────────────────
export const getSpeakerModels = () =>
  fetch('/api/speaker-models', { headers: headers(false) }).then((r) =>
    j<SpeakerModel[]>(r),
  )

export const createSpeakerModel = (s: Partial<SpeakerModel>) =>
  post<SpeakerModel>('/api/speaker-models', s)

export const updateSpeakerModel = (id: string, s: Partial<SpeakerModel>) =>
  fetch(`/api/speaker-models/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<SpeakerModel>(r))

export const deleteSpeakerModel = (id: string) =>
  fetch(`/api/speaker-models/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 会话群（对话记忆上下文归属，多设备共用）───────────────────────
export interface Room {
  id: string
  name: string
  description?: string
  createdAt: number
  deviceCount?: number
}

export const getRooms = () =>
  fetch('/api/rooms', { headers: headers(false) }).then((r) =>
    j<Room[]>(r),
  )

export const createRoom = (r: Partial<Room>) =>
  fetch('/api/rooms', {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(r),
  }).then((x) => j<Room>(x))

export const updateRoom = (id: string, r: Partial<Room>) =>
  fetch(`/api/rooms/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(r),
  }).then((x) => j<Room>(x))

export const deleteRoom = (id: string) =>
  fetch(`/api/rooms/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 设备管理 ─────────────────────────────────────────────────
export const listDevices = () =>
  fetch('/api/devices', { headers: headers(false) }).then((r) =>
    j<DeviceRow[]>(r),
  )

export const createDevice = (d: {
  alias: string
  did: string
  speakerModel?: string
  roleId?: string
  accountId?: string
  thinkServiceId?: string
  voiceOverrideId?: string
}) => post<{ id: string }>('/api/devices', d)

export const getDevice = (id: string) =>
  fetch(`/api/devices/${id}`, { headers: headers(false) }).then((r) =>
    j<DeviceDetail>(r),
  )

export const saveDevice = (
  id: string,
  body: { meta?: Partial<DeviceMeta>; config?: GuiConfig },
) =>
  fetch(`/api/devices/${id}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(body),
  }).then((r) => j<{ success: boolean }>(r))

export const deleteDevice = (id: string) =>
  fetch(`/api/devices/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

export const startDevice = (id: string, config?: GuiConfig) =>
  post<{ success: boolean }>(`/api/devices/${id}/start`, config)

export const stopDevice = (id: string) =>
  post<{ success: boolean }>(`/api/devices/${id}/stop`)

export const getDeviceLogs = (id: string, limit = 200) =>
  fetch(`/api/devices/${id}/logs?limit=${limit}`, {
    headers: headers(false),
  }).then((r) => j<{ logs: string[] }>(r))

// ── 全局对话日志 ────────────────────────────────────────────
export interface LogEntry {
  deviceId: string
  deviceAlias: string
  time: string
  kind: 'user' | 'ai' | 'system'
  text: string
}

export const getLogs = (limit = 200) =>
  fetch(`/api/logs?limit=${limit}`, { headers: headers(false) }).then(
    (r) => j<{ total: number; logs: LogEntry[] }>(r),
  )

// ── 系统日志（实时 + 下载）───────────────────────────────────
export interface SystemLogs {
  lines: string[]
  file: string
  size: number
}

export const getSystemLogs = (lines = 300) =>
  fetch(`/api/system/logs?lines=${lines}`, { headers: headers(false) }).then(
    (r) => j<SystemLogs>(r),
  )

export const clearSystemLogs = () =>
  fetch('/api/system/logs/clear', { method: 'POST', headers: headers(false) }).then(
    (r) => j<{ success: boolean; error?: string }>(r),
  )

export async function downloadSystemLogs(): Promise<void> {
  const r = await fetch('/api/system/logs/download', { headers: headers(false) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const blob = await r.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'migpt-system.log'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

// ── 测试接口 ─────────────────────────────────────────────────
export const testPublicURL = (url: string) =>
  post<{ success: boolean }>('/api/test', { url })

export function testTts(ttsConfig: TTSConfig) {
  const audioUrl =
    '/api/test/audio?ttsConfig=' + encodeURIComponent(JSON.stringify(ttsConfig))
  const audio = new Audio(audioUrl)
  return new Promise<void>((resolve, reject) => {
    audio.addEventListener('error', () => reject())
    audio.addEventListener('canplay', () => {
      resolve()
      audio.play()
    })
  })
}
