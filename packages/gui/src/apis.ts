import { GuiConfig } from '@migptgui/options'
import type { TTSConfig } from 'mi-gpt-tts'
import type {
  Account,
  DeviceBindings,
  DeviceMeta,
  PulledDevice,
  Role,
  Room as ContractRoom,
  Settings,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '@migptgui/contracts'
// ── API 版本前缀（与服务端 API_PREFIX 保持一致）────────────────
const API = '/api/v1'

// 契约单一事实源：@migptgui/contracts（与 server 共享，修改契约两端同时生效）
export type {
  Account,
  BindingRow,
  DeviceBindings,
  DeviceMeta,
  PulledDevice,
  Role,
  Settings,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '@migptgui/contracts'

// ── 登录认证（httpOnly Cookie 会话）─────────────────────────
// 标准模式（同主流自托管面板）：密码 POST 提交一次，服务端验证后签发 httpOnly
// Cookie，后续请求凭会话访问、前端不再持有密码。传输安全由 TLS 或本地网络
// 边界保证（公网部署套 HTTPS 反向代理），不自造私有密码传输协议。
// 同源 fetch 默认携带 Cookie（credentials: 'same-origin'），无需手动附加。
export function login(
  user: string,
  password: string,
): Promise<{ success: boolean }> {
  return fetch(api('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, password }),
  }).then((r) => j<{ success: boolean }>(r))
}

export function logout(): Promise<{ success: boolean }> {
  return fetch(api('/logout'), { method: 'POST' }).then((r) =>
    j<{ success: boolean }>(r),
  )
}

/** 会话探测：页面加载时判断是否已登录（Cookie 为 httpOnly，前端无法直接读取） */
export function checkSession(): Promise<boolean> {
  return fetch(api('/session'))
    .then((r) => j<{ authed: boolean }>(r))
    .then((d) => d.authed)
}

export function changeAuth(
  oldUser: string,
  oldPassword: string,
  newUser: string,
  newPassword: string,
) {
  return fetch(api('/auth'), {
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
  return withBody ? { 'Content-Type': 'application/json' } : {}
}

/** 拼接 API 版本前缀 */
const api = (path: string) => `${API}${path}`

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('unauthorized')
    }
    // 删除保护等业务错误：透出服务端 message（JSON error 字段）
    try {
      const body = await res.json()
      const err = new Error(body.error || 'HTTP ' + res.status) as Error & {
        status?: number
        refs?: unknown
      }
      err.status = res.status
      err.refs = body.refs
      throw err
    } catch (e) {
      if ((e as Error).message !== 'HTTP ' + res.status) throw e
      throw new Error('HTTP ' + res.status + ' ' + res.statusText, { cause: e })
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

// ── 实体类型（共享契约见文件头 @migptgui/contracts）─────────────

export interface DeviceRow extends DeviceMeta {
  running: boolean
}

export interface DeviceDetail {
  meta: DeviceMeta
  config: GuiConfig
  bindings: DeviceBindings
}

// ── 状态与账号 ───────────────────────────────────────────────
export const getStatusAll = () =>
  fetch(api('/status'), { headers: headers(false) }).then((r) =>
    j<{ devices: DeviceRow[] }>(r),
  )

export const getSettings = () =>
  fetch(api('/settings'), { headers: headers(false) }).then((r) =>
    j<Settings>(r),
  )

export const saveSettings = (s: Settings) =>
  fetch(api('/settings'), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<{ success: boolean }>(r))

// ── 云端账号（多账号）─────────────────────────────────────────
export const getAccounts = () =>
  fetch(api('/accounts'), { headers: headers(false) }).then((r) =>
    j<Account[]>(r),
  )

export const createAccount = (a: Partial<Account>) =>
  post<Account>(api('/accounts'), a)

export const updateAccount = (id: string, a: Partial<Account>) =>
  fetch(api(`/accounts/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(a),
  }).then((r) => j<Account>(r))

export const deleteAccount = (id: string) =>
  fetch(api(`/accounts/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// 凭 小米ID + passToken 拉取账号下音箱设备列表（三步连接 Step2 与设备添加复用）
export const pullDevices = (accountId: string) =>
  post<{ devices: PulledDevice[] }>(api(`/accounts/${accountId}/pull-devices`))

// ── AI 角色 ─────────────────────────────────────────────────
export const getRoles = () =>
  fetch(api('/roles'), { headers: headers(false) }).then((r) => j<Role[]>(r))

export const createRole = (role: Partial<Role>) =>
  post<Role>(api('/roles'), role)

export const updateRole = (id: string, role: Partial<Role>) =>
  fetch(api(`/roles/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(role),
  }).then((r) => j<Role>(r))

export const deleteRole = (id: string) =>
  fetch(api(`/roles/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 思考服务 ─────────────────────────────────────────────────
export const getThinkServices = () =>
  fetch(api('/think-services'), { headers: headers(false) }).then((r) =>
    j<ThinkService[]>(r),
  )

export const createThinkService = (s: Partial<ThinkService>) =>
  post<ThinkService>(api('/think-services'), s)

export const updateThinkService = (id: string, s: Partial<ThinkService>) =>
  fetch(api(`/think-services/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<ThinkService>(r))

export const deleteThinkService = (id: string) =>
  fetch(api(`/think-services/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 语音服务 ─────────────────────────────────────────────────
export const getVoiceServices = () =>
  fetch(api('/voice-services'), { headers: headers(false) }).then((r) =>
    j<VoiceService[]>(r),
  )

export const createVoiceService = (s: Partial<VoiceService>) =>
  post<VoiceService>(api('/voice-services'), s)

export const updateVoiceService = (id: string, s: Partial<VoiceService>) =>
  fetch(api(`/voice-services/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<VoiceService>(r))

export const deleteVoiceService = (id: string) =>
  fetch(api(`/voice-services/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

/** 重置内置语音服务为系统默认值（仅 builtin 可用） */
export const resetVoiceService = (id: string) =>
  fetch(api(`/voice-services/${id}/reset`), {
    method: 'POST',
    headers: headers(false),
  }).then((r) => j<VoiceService>(r))

// ── 音箱型号 ─────────────────────────────────────────────────
export const getSpeakerModels = () =>
  fetch(api('/speaker-models'), { headers: headers(false) }).then((r) =>
    j<SpeakerModel[]>(r),
  )

export const createSpeakerModel = (s: Partial<SpeakerModel>) =>
  post<SpeakerModel>(api('/speaker-models'), s)

export const updateSpeakerModel = (id: string, s: Partial<SpeakerModel>) =>
  fetch(api(`/speaker-models/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<SpeakerModel>(r))

export const deleteSpeakerModel = (id: string) =>
  fetch(api(`/speaker-models/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

/** 重置内置型号为系统默认值（仅 builtin 可用） */
export const resetSpeakerModel = (id: string) =>
  fetch(api(`/speaker-models/${id}/reset`), {
    method: 'POST',
    headers: headers(false),
  }).then((r) => j<SpeakerModel>(r))

// ── 会话群（对话记忆上下文归属，多设备共用）───────────────────────
/** 会话群（extends 共享契约；deviceCount 为前端聚合展示字段） */
export interface Room extends ContractRoom {
  deviceCount?: number
}

export const getRooms = () =>
  fetch(api('/rooms'), { headers: headers(false) }).then((r) => j<Room[]>(r))

export const createRoom = (r: Partial<Room>) =>
  fetch(api('/rooms'), {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(r),
  }).then((x) => j<Room>(x))

export const updateRoom = (id: string, r: Partial<Room>) =>
  fetch(api(`/rooms/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(r),
  }).then((x) => j<Room>(x))

export const deleteRoom = (id: string) =>
  fetch(api(`/rooms/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 设备管理 ─────────────────────────────────────────────────
export const listDevices = () =>
  fetch(api('/devices'), { headers: headers(false) }).then((r) =>
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
}) => post<{ id: string }>(api('/devices'), d)

export const getDevice = (id: string) =>
  fetch(api(`/devices/${id}`), { headers: headers(false) }).then((r) =>
    j<DeviceDetail>(r),
  )

export const saveDevice = (
  id: string,
  body: { meta?: Partial<DeviceMeta>; config?: GuiConfig },
) =>
  fetch(api(`/devices/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(body),
  }).then((r) => j<{ success: boolean }>(r))

export const deleteDevice = (id: string) =>
  fetch(api(`/devices/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

export const startDevice = (id: string, config?: GuiConfig) =>
  post<{ success: boolean }>(api(`/devices/${id}/start`), config)

export const stopDevice = (id: string) =>
  post<{ success: boolean }>(api(`/devices/${id}/stop`))

export const getDeviceLogs = (id: string, limit = 200) =>
  fetch(api(`/devices/${id}/logs?limit=${limit}`), {
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
  fetch(api(`/logs?limit=${limit}`), { headers: headers(false) }).then((r) =>
    j<{ total: number; logs: LogEntry[] }>(r),
  )

// ── 系统日志（实时 + 下载）───────────────────────────────────
export interface SystemLogs {
  lines: string[]
  file: string
  size: number
}

/** 读取系统日志：date 为 yyyyMMdd（缺省当天）；当天实时优先内存缓冲，历史直读文件 */
export const getSystemLogs = (lines = 300, date?: string) =>
  fetch(api(`/system/logs?lines=${lines}${date ? `&date=${date}` : ''}`), {
    headers: headers(false),
  }).then((r) => j<SystemLogs>(r))

/** 有日志落盘的日期列表（yyyyMMdd，降序），供日历置灰判断 */
export const getSystemLogDates = () =>
  fetch(api('/system/logs/dates'), { headers: headers(false) }).then((r) =>
    j<{ dates: string[] }>(r),
  )

export const clearSystemLogs = () =>
  fetch(api('/system/logs/clear'), {
    method: 'POST',
    headers: headers(false),
  }).then((r) => j<{ success: boolean; error?: string }>(r))

export async function downloadSystemLogs(date?: string): Promise<void> {
  const r = await fetch(api(`/system/logs/download${date ? `?date=${date}` : ''}`), {
    headers: headers(false),
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const blob = await r.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `migpt-system${date ? `-${date}` : ''}.log`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

// ── 测试接口 ─────────────────────────────────────────────────
export const testPublicURL = (url: string) =>
  post<{ success: boolean }>(api('/test'), { url })

export async function testTts(ttsConfig: TTSConfig) {
  // TTS 配置含密钥，改走 POST body（原实现放在 URL query 中，会进入访问日志与浏览器历史）
  const res = await fetch(api('/test/audio'), {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ ttsConfig }),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const url = URL.createObjectURL(await res.blob())
  const audio = new Audio(url)
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => URL.revokeObjectURL(url)
    audio.addEventListener('error', () => {
      cleanup()
      reject()
    })
    audio.addEventListener('canplay', () => {
      resolve()
      audio.play().catch(() => {})
    })
    audio.addEventListener('ended', cleanup)
  })
}
