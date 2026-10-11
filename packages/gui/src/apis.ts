import { GuiConfig } from '@migptgui/options'
import type { TTSConfig } from 'mi-gpt-tts'
import type {
  Credential,
  DeviceBindings,
  Device,
  CloudDevice,
  Robot,
  Conversation as ContractRoom,
  SpeakerModel,
  Model,
  Voice,
} from '@migptgui/contracts'
// ── API 版本前缀（与服务端 API_PREFIX 保持一致）────────────────
const API = '/api/v1'

// 契约单一事实源：@migptgui/contracts（与 server 共享，修改契约两端同时生效）
export type {
  Credential,
  BindingRow,
  DeviceBindings,
  Device,
  CloudDevice,
  Robot,
  SpeakerModel,
  Model,
  Voice,
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

export interface DeviceRow extends Device {
  running: boolean
}

export interface DeviceDetail {
  meta: Device
  config: GuiConfig
  bindings: DeviceBindings
}

// ── 状态 ─────────────────────────────────────────────────────
export const getStatusAll = () =>
  fetch(api('/status'), { headers: headers(false) }).then((r) =>
    j<{ devices: DeviceRow[] }>(r),
  )

// ── 小米凭据（多凭据；原「云端账号 Account」实体并入）──────────────
export const getCredentials = () =>
  fetch(api('/credentials'), { headers: headers(false) }).then((r) =>
    j<Credential[]>(r),
  )

export const createCredential = (a: Partial<Credential>) =>
  post<Credential>(api('/credentials'), a)

export const updateCredential = (id: string, a: Partial<Credential>) =>
  fetch(api(`/credentials/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(a),
  }).then((r) => j<Credential>(r))

export const deleteCredential = (id: string) =>
  fetch(api(`/credentials/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// 凭 小米ID + passToken 拉取凭据下音箱设备列表（五步连接 Step2 与设备添加复用）
export const pullDevices = (credentialId: string) =>
  post<{ devices: CloudDevice[] }>(
    api(`/credentials/${credentialId}/pull-devices`),
  )

// ── AI 角色 ─────────────────────────────────────────────────
export const getRobots = () =>
  fetch(api('/robots'), { headers: headers(false) }).then((r) => j<Robot[]>(r))

export const createRobot = (robot: Partial<Robot>) =>
  post<Robot>(api('/robots'), robot)

export const updateRobot = (id: string, robot: Partial<Robot>) =>
  fetch(api(`/robots/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(robot),
  }).then((r) => j<Robot>(r))

export const deleteRobot = (id: string) =>
  fetch(api(`/robots/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

/** 重置内置角色为系统默认值（仅 builtin 可用） */
export const resetRobot = (id: string) =>
  fetch(api(`/robots/${id}/reset`), {
    method: 'POST',
    headers: headers(false),
  }).then((r) => j<Robot>(r))

// ── 模型 ─────────────────────────────────────────────────
export const getModels = () =>
  fetch(api('/models'), { headers: headers(false) }).then((r) => j<Model[]>(r))

export const createModel = (s: Partial<Model>) => post<Model>(api('/models'), s)

export const updateModel = (id: string, s: Partial<Model>) =>
  fetch(api(`/models/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<Model>(r))

export const deleteModel = (id: string) =>
  fetch(api(`/models/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

// ── 语音 ─────────────────────────────────────────────────
export const getVoices = () =>
  fetch(api('/voices'), { headers: headers(false) }).then((r) => j<Voice[]>(r))

export const createVoice = (s: Partial<Voice>) => post<Voice>(api('/voices'), s)

export const updateVoice = (id: string, s: Partial<Voice>) =>
  fetch(api(`/voices/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(s),
  }).then((r) => j<Voice>(r))

export const deleteVoice = (id: string) =>
  fetch(api(`/voices/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

/** 重置内置语音为系统默认值（仅 builtin 可用） */
export const resetVoice = (id: string) =>
  fetch(api(`/voices/${id}/reset`), {
    method: 'POST',
    headers: headers(false),
  }).then((r) => j<Voice>(r))

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

// ── 会话（对话记忆上下文归属，多角色共用）───────────────────────
/** 会话（extends 共享契约；robotCount 为前端聚合展示字段） */
export interface Conversation extends ContractRoom {
  robotCount?: number
}

export const getConversations = () =>
  fetch(api('/conversations'), { headers: headers(false) }).then((r) =>
    j<Conversation[]>(r),
  )

export const createConversation = (r: Partial<Conversation>) =>
  fetch(api('/conversations'), {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(r),
  }).then((x) => j<Conversation>(x))

export const updateConversation = (id: string, r: Partial<Conversation>) =>
  fetch(api(`/conversations/${id}`), {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify(r),
  }).then((x) => j<Conversation>(x))

export const deleteConversation = (id: string) =>
  fetch(api(`/conversations/${id}`), {
    method: 'DELETE',
    headers: headers(false),
  }).then((r) => j<{ success: boolean }>(r))

/** 重置内置会话为系统默认值（仅 builtin 可用） */
export const resetConversation = (id: string) =>
  fetch(api(`/conversations/${id}/reset`), {
    method: 'POST',
    headers: headers(false),
  }).then((r) => j<Conversation>(r))

// ── 设备管理 ─────────────────────────────────────────────────
export const listDevices = () =>
  fetch(api('/devices'), { headers: headers(false) }).then((r) =>
    j<DeviceRow[]>(r),
  )

export const createDevice = (d: {
  alias: string
  did: string
  speakerModel?: string
  robotId: string
  credentialId?: string
  modelIds?: string[]
  voiceId?: string
}) => post<{ id: string }>(api('/devices'), d)

export const getDevice = (id: string) =>
  fetch(api(`/devices/${id}`), { headers: headers(false) }).then((r) =>
    j<DeviceDetail>(r),
  )

export const saveDevice = (
  id: string,
  body: { meta?: Partial<Device>; config?: GuiConfig },
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

export const getLogs = (
  limit = 200,
  date?: string,
  from?: string,
  to?: string,
) => {
  const qs = from && to ? `&from=${from}&to=${to}` : date ? `&date=${date}` : ''
  return fetch(api(`/logs?limit=${limit}${qs}`), {
    headers: headers(false),
  }).then((r) => j<{ total: number; logs: LogEntry[] }>(r))
}

/** 有对话日志落盘的日期列表（yyyyMMdd，降序），供日历置灰/高亮判断 */
export const getLogDates = () =>
  fetch(api('/logs/dates'), { headers: headers(false) }).then((r) =>
    j<{ dates: string[] }>(r),
  )

// ── 系统日志（实时 + 下载）───────────────────────────────────
export interface SystemLogs {
  lines: string[]
  file: string
  size: number
}

/** 读取系统日志：date 为 yyyyMMdd（缺省当天）；from/to 同时提供为范围模式（合并各天尾部） */
export const getSystemLogs = (
  lines = 300,
  date?: string,
  from?: string,
  to?: string,
) => {
  const qs = from && to ? `&from=${from}&to=${to}` : date ? `&date=${date}` : ''
  return fetch(api(`/system/logs?lines=${lines}${qs}`), {
    headers: headers(false),
  }).then((r) => j<SystemLogs>(r))
}

/** 日期范围跨文件搜索系统日志（含端点，q 大小写不敏感），命中行附日期前缀 */
export const searchSystemLogs = (
  from: string,
  to: string,
  q: string,
  limit = 1000,
) =>
  fetch(
    api(
      `/system/logs/search?from=${from}&to=${to}&q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
    { headers: headers(false) },
  ).then((r) => j<{ lines: string[] }>(r))

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

/** 下载系统日志：date 为单日；from/to 同时提供为范围（拼接范围内各天全文） */
export async function downloadSystemLogs(
  date?: string,
  from?: string,
  to?: string,
): Promise<void> {
  const qs = from && to ? `?from=${from}&to=${to}` : date ? `?date=${date}` : ''
  const r = await fetch(api(`/system/logs/download${qs}`), {
    headers: headers(false),
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const blob = await r.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `migpt-system${from && to ? `-${from}-${to}` : date ? `-${date}` : ''}.log`
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

// ── 统计接口 ────────────────────────────────────────────────
export type StatsDimension = 'robot' | 'device' | 'model'

export interface TokenStats {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  conversations: number
}

export interface TimeSeriesPoint extends TokenStats {
  date: string
}

export interface DimensionEntity {
  id: string
  name: string
}

export interface ServiceHealth {
  id: string
  name: string
  type: 'model' | 'voice'
  limitReached: boolean
  totalTokensUsed: number
  tokenLimit?: number
  usagePercent?: number
}

export interface DeviceHealth {
  id: string
  name: string
  running: boolean
  conversations: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface StatsResponse {
  totals: TokenStats
  filtered: TokenStats
  timeline: TimeSeriesPoint[]
  entityTimelines: Record<string, TimeSeriesPoint[]>
  dimensionData: (TokenStats & { id: string; name: string })[]
  entities: Record<string, DimensionEntity[]>
  serviceHealth: ServiceHealth[]
  deviceHealth: DeviceHealth[]
}

export const DIMENSION_LABELS: Record<string, string> = {
  robot: '对话角色',
  device: '设备服务',
  model: '模型',
}

/**
 * 获取统计数据
 * @param params 查询参数
 * @param params.range 预设时间范围（与 from/to 互斥）
 * @param params.from 开始日期 yyyyMMdd（与 range 互斥）
 * @param params.to 结束日期 yyyyMMdd（与 range 互斥）
 * @param params.dimension 维度类型（可选）
 * @param params.ids 实体 ID 列表（可选，配合 dimension 使用）
 */
export async function getStats(params: {
  range?: string
  from?: string
  to?: string
  dimension?: StatsDimension
  ids?: string[]
}): Promise<StatsResponse> {
  const searchParams = new URLSearchParams()

  if (params.range) {
    searchParams.set('range', params.range)
  } else if (params.from && params.to) {
    searchParams.set('from', params.from)
    searchParams.set('to', params.to)
  } else {
    searchParams.set('range', 'today')
  }

  if (params.dimension) {
    searchParams.set('dimension', params.dimension)
  }

  if (params.ids && params.ids.length > 0) {
    searchParams.set('ids', params.ids.join(','))
  }

  const response = await fetch(api(`/stats?${searchParams.toString()}`), {
    headers: headers(false),
  })
  if (!response.ok) {
    throw new Error(`获取统计数据失败: ${response.statusText}`)
  }

  return response.json()
}

// ── 数据备份：导出 / 导入（个人中心 · 快速备份与恢复）─────────────
/** 导入结果：各实体恢复条目数（与服务端 ImportResult 对齐） */
export interface ImportCounts {
  credentials: number
  robots: number
  models: number
  voices: number
  speakerModels: number
  conversations: number
  devices: number
}

/** 从 Content-Disposition 解析服务端生成的导出文件名（含兜底） */
function parseFilename(cd: string | null): string {
  const m = cd && /filename="?([^";]+)"?/.exec(cd)
  return m
    ? m[1]
    : `migptgui-export-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
}

/**
 * 导出用户数据（全明文完整包：含 passToken / apiKey / ttsSecret 等凭据，
 * 导入新环境即可直接运行；文件须妥善保管、勿随意分享）。
 * 服务端直接回流 JSON 附件，这里触发浏览器下载。
 */
export async function exportBackupData(): Promise<void> {
  const res = await fetch(api('/backup/export'), { headers: headers(false) })
  if (!res.ok) throw new Error('导出失败：HTTP ' + res.status)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = parseFilename(res.headers.get('Content-Disposition'))
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

/**
 * 导入备份包（ZIP 或裸 JSON 二进制原样上传，由服务端做完整格式与 CRC 校验）。
 * 浏览器端只做轻量预检：首字节判断是 zip（PK..）还是 JSON（'{'），
 * 不合法直接本地报错，避免把明显错误的文件传给服务端。
 * 包非法时服务端回 400，错误经 j() 透出 message。
 */
export async function importBackupData(
  file: File,
): Promise<{ imported: ImportCounts }> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
  const isJson =
    !isZip &&
    String.fromCharCode(...bytes.subarray(0, 32))
      .trimStart()
      .startsWith('{')
  if (!isZip && !isJson)
    throw new Error(
      '文件既不是 zip 也不是 JSON 备份包，请选择本面板导出的备份文件',
    )
  return fetch(api('/backup/import'), {
    method: 'POST',
    headers: { 'Content-Type': isZip ? 'application/zip' : 'application/json' },
    body: buf,
  }).then((r) => j<{ success: boolean; imported: ImportCounts }>(r))
}
