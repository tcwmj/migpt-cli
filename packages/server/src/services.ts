// ── 业务服务层：云端设备拉取协议、配置编译投影、绑定链解析 ──
import { createHash } from 'node:crypto'
import { nanoid } from 'nanoid'
import {
  type Account,
  type Role,
  type DeviceMeta,
  type PulledDevice,
  type DeviceBindings,
  ROLE_DEFAULTS,
} from './types.js'
import {
  getAccounts,
  getRoles,
  getThinkServices,
  getVoiceServices,
  getRooms,
  getSpeakerModelByRef,
  PROVIDER_BASE_URLS,
} from './store.js'
import { type GuiConfig } from '@migptgui/options'

// ── 小米 micoapi：凭 小米ID + passToken 拉取账号下音箱设备列表 ──
// 协议（已用真实账号冒烟验证）：
//   ① serviceLogin?sid=micoapi&_json=true 携带 cookie{userId, passToken} 免密建立登录态
//   ② clientSign=SHA1(nonce+ssecurity) 换取 serviceToken
//   ③ api2.mina.mi.com/admin/v2/device_list 返回账号下小爱音箱列表
// GET 请求文本响应（全局 fetch）；redirect 手动处理——换取 serviceToken 的
// 跳转必须停在 302 上读 set-cookie，默认跟随会丢失目标 Cookie。
async function _fetchText(
  url: string,
  headers: Record<string, string>,
  cookieStr?: string,
): Promise<{ status: number; body: string; setCookies: string[] }> {
  const h = { ...headers }
  if (cookieStr) h.Cookie = cookieStr
  const res = await fetch(url, {
    headers: h,
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  return {
    status: res.status,
    body: await res.text(),
    setCookies: res.headers.getSetCookie(),
  }
}
function _stripJson(body: string): string {
  return body.startsWith('&&&START&&&')
    ? body.slice('&&&START&&&'.length)
    : body
}
// 云端返回体不保证是合法 JSON（网关错误页 / HTML 挑战页），解析失败时给出可读错误
function _parseJson(body: string): unknown {
  try {
    return JSON.parse(_stripJson(body))
  } catch {
    throw new Error(
      '云端返回内容解析失败（可能被风控拦截或网络异常），请稍后重试',
    )
  }
}
export async function pullMicoDevices(
  miUserId: string,
  passToken: string,
): Promise<PulledDevice[]> {
  const deviceId = 'android_' + nanoid(16)
  const ua =
    'Mozilla/5.0 (Linux; Android 10; 000; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36 /XiaoMi/HybridView/ micoSoundboxApp/i appVersion/A_2.4.40'

  // ① 免密登录态
  const loginCookie = `sdkVersion=3.9; deviceId=${deviceId}; userId=${miUserId}; passToken=${passToken}`
  let r = await _fetchText(
    'https://account.xiaomi.com/pass/serviceLogin?sid=micoapi&_json=true',
    { 'User-Agent': ua },
    loginCookie,
  )
  const raw = _stripJson(r.body)
  const resp = _parseJson(r.body) as Record<string, unknown> | null
  if (!resp || resp.code !== 0) {
    throw new Error(
      `登录态无效（code=${resp?.code} ${resp?.description || resp?.message || ''}），请重新验证 passToken`,
    )
  }
  // nonce 可能超出 JS 安全整数，须取原文
  const nonceMatch = raw.match(/"nonce"\s*:\s*(\d+)/)
  const nonce = nonceMatch ? nonceMatch[1] : String(resp.nonce)

  // ② 换 serviceToken
  const clientSign = createHash('sha1')
    .update(`nonce=${nonce}&${resp.ssecurity}`)
    .digest('base64')
  r = await _fetchText(
    `${resp.location}&clientSign=${encodeURIComponent(clientSign)}`,
    { 'User-Agent': ua },
  )
  let serviceToken = ''
  for (const c of r.setCookies) {
    const name = c.split(';')[0].split('=')[0].trim()
    if (name === 'serviceToken')
      serviceToken = c.split(';')[0].split('=').slice(1).join('=')
  }
  if (!serviceToken) {
    throw new Error(
      '获取 serviceToken 失败（可能触发异地登录验证），请重新验证 passToken',
    )
  }

  // ③ 设备列表
  const ua2 =
    'MiHome/6.0.103 (com.xiaomi.mihome; build:6.0.103.1; iOS 14.4.0) Alamofire/6.0.103 MICO/iOSApp/appStore/6.0.103'
  const requestId = 'app_ios_' + nanoid(16)
  const apiCookie = `userId=${miUserId}; serviceToken=${serviceToken}; PassportDeviceId=${deviceId}; countryCode=CN; locale=zh_CN; timezone=GMT+08:00`
  r = await _fetchText(
    `https://api2.mina.mi.com/admin/v2/device_list?master=0&requestId=${requestId}`,
    {
      'User-Agent': ua2,
      Referer: 'https://userprofile.mina.mi.com/dialogue-note/index.html',
    },
    apiCookie,
  )
  const apiResp = _parseJson(r.body) as Record<string, unknown> | null
  if (!apiResp || apiResp.code !== 0) {
    throw new Error(
      `拉取设备列表失败（code=${apiResp?.code} ${apiResp?.message || ''}）`,
    )
  }
  return ((apiResp.data as Record<string, unknown>[]) || []).map((d) => ({
    name: (d.name || d.alias || '') as string,
    alias: (d.alias || '') as string,
    deviceID: (d.deviceID || d.deviceId || '') as string,
    miotDID: String(d.miotDID || ''),
    hardware: (d.hardware || '') as string,
    presence: (d.presence || 'offline') as string,
  }))
}

// ── 用角色的默认配置展开设备初始 migptgui.json ─────────────────────
/** 去重合并关键词列表（用于把检测词并入唤醒/退出关键词，使其真实生效） */
function mergeKW(...lists: (string[] | undefined)[]): string[] {
  const s = new Set<string>()
  for (const l of lists)
    if (l) for (const e of l) if (e && e.trim()) s.add(e.trim())
  return [...s]
}

export function buildConfigFromRole(role?: Role, account?: Account): GuiConfig {
  return {
    config: {
      bot: {
        name: role?.name || '傻妞',
        profile: (
          role?.profile || '性别：女\n性格：乖巧可爱\n爱好：喜欢搞怪，爱吃醋。'
        ).replace(/\\n/g, '\n'),
      },
      master: {
        name: '主人',
        profile: '',
      },
      speaker: {
        userId: account?.miUserId || '',
        password: account?.miPassword || '',
        switchSpeakerKeywords: ['把声音换成'],
        callAIKeywords: role?.callAIKeywords || ROLE_DEFAULTS.callAIKeywords,
        wakeUpKeywords: mergeKW(
          role?.wakeUpKeywords,
          ROLE_DEFAULTS.wakeUpKeywords,
        ),
        exitKeywords: mergeKW(role?.exitKeywords, ROLE_DEFAULTS.exitKeywords),
        onEnterAI: role?.onEnterAI || ROLE_DEFAULTS.onEnterAI,
        onExitAI: role?.onExitAI || ROLE_DEFAULTS.onExitAI,
        onAIAsking: role?.onAIAsking || ROLE_DEFAULTS.onAIAsking,
        onAIReplied: role?.onAIReplied || ROLE_DEFAULTS.onAIReplied,
        onAIError: role?.onAIError || ROLE_DEFAULTS.onAIError,
        // 连续对话检测参数：两个检测字段存毫秒（checkTTSStatusAfter 编译转秒），自动退出时间存秒
        exitKeepAliveAfter:
          role?.exitKeepAliveAfter ?? ROLE_DEFAULTS.exitKeepAliveAfter,
        checkInterval: role?.checkInterval ?? ROLE_DEFAULTS.checkInterval,
        checkTTSStatusAfter: Math.round(
          (role?.checkTTSStatusAfter ?? ROLE_DEFAULTS.checkTTSStatusAfter) /
            1000,
        ),
      },
    },
    env: {
      OPENAI_API_KEY: '',
      OPENAI_MODEL: '',
      OPENAI_BASE_URL: '',
    },
  }
}

/** 解析一台设备的完整绑定链（账号/角色/思考服务/语音服务/会话群 + 来源标注） */
export async function resolveBindings(
  meta: DeviceMeta,
): Promise<DeviceBindings> {
  // 单次并行读取全部关联集合
  const [accounts, roles, thinks, voices] = await Promise.all([
    getAccounts(),
    getRoles(),
    getThinkServices(),
    getVoiceServices(),
  ])
  const account = accounts.find((a) => a.id === meta.accountId) || accounts[0]
  const role = meta.roleId ? roles.find((r) => r.id === meta.roleId) : undefined

  // 思考服务：仅取设备指定列表（failover），不再回退角色或全局默认
  let think: (typeof thinks)[0] | undefined
  const thinkSource: 'device' | 'global' = 'device'
  const thinkIds = meta.thinkServiceIds ?? []
  if (thinkIds.length > 0) {
    // 按顺序跳过 limitReached 的服务
    for (const sid of thinkIds) {
      const svc = thinks.find((t) => t.id === sid)
      if (svc && !svc.limitReached) {
        think = svc
        break
      }
    }
    // 全部标记时回退第一个（允许重试，限额可能已重置）
    if (!think) {
      think = thinks.find((t) => t.id === thinkIds[0])
    }
  }
  // 无列表时保留 thinkServiceId 兼容旧数据
  if (!think) {
    const legacyId = meta.thinkServiceId
    if (legacyId) think = thinks.find((t) => t.id === legacyId)
  }

  // 语音服务：仅取设备指定，不再回退角色或全局默认
  let voice: (typeof voices)[0] | undefined
  const voiceId = meta.voiceId
  if (voiceId) {
    voice = voices.find((v) => v.id === voiceId)
  }
  // 设备未指定语音服务时的来源标注（用于绑定链展示）
  const voiceSource: 'device' | 'global' = 'device'

  // 会话群：角色指定 → 设备旧字段兼容（'' 视为未设置，用 || 回退）
  const rooms = await getRooms()
  const roomRef = role?.roomRef || meta.roomRef || meta.roomName
  const room = roomRef
    ? rooms.find((r) => r.id === roomRef || r.name === roomRef)
    : undefined

  const rows = [
    {
      key: 'account' as const,
      label: '云端账号',
      name: account?.name || '未绑定',
      detail: account?.miUserId,
      source: 'device' as const,
      sourceLabel: '设备指定',
    },
    {
      key: 'role' as const,
      label: '对话角色',
      name: role?.name || '未绑定',
      detail: role ? undefined : '将使用默认行为',
      source: 'device' as const,
      sourceLabel: '设备绑定',
    },
    {
      key: 'think' as const,
      label: '思考服务',
      name: think?.name || '未配置',
      detail: think ? `${think.provider} · ${think.model}` : undefined,
      source: thinkSource,
      sourceLabel: '设备绑定',
    },
    {
      key: 'voice' as const,
      label: '语音服务',
      name: voice?.name || '未配置',
      detail: voice
        ? voice.builtin
          ? '默认语音'
          : `${voice.provider} · ${voice.voiceId || '默认音色'}`
        : undefined,
      source: voiceSource,
      sourceLabel: '设备绑定',
    },
    {
      key: 'room' as const,
      label: '会话群',
      name: room?.name || '未设置',
      detail: room?.description,
      source: role?.roomRef ? ('role' as const) : ('device' as const),
      sourceLabel: role?.roomRef ? '角色绑定' : '设备指定',
    },
  ]

  return { account, role, think, voice, room, rows }
}

/**
 * 按绑定链编译设备运行时配置（编译投影）：
 * 角色内容 → bot/speaker；思考服务 → env；语音服务 → tts。
 * existingConfig 用于保留设备已有的 gui（publicURL 等）与用户手工设置。
 */
export async function buildRunConfig(
  meta: DeviceMeta,
  existingConfig?: GuiConfig,
): Promise<{ config: GuiConfig; bindings: DeviceBindings }> {
  // 并行取绑定链 / 型号（两者互不依赖）
  const [bindings, model] = await Promise.all([
    resolveBindings(meta),
    getSpeakerModelByRef(meta.speakerModel),
  ])
  const { account, role, think, voice, room } = bindings
  const config = buildConfigFromRole(role, account)

  // 保留已有设备的 GUI 字段（publicURL / ttsProvider / speakerModel 等）
  if (existingConfig?.gui) {
    config.gui = existingConfig.gui
  }

  // 思考服务 → 推理环境变量
  if (think) {
    config.env.OPENAI_API_KEY = think.apiKey
    config.env.OPENAI_MODEL = think.model
    config.env.OPENAI_BASE_URL =
      think.baseUrl || PROVIDER_BASE_URLS[think.provider] || ''
  } else {
    // 未配置思考服务时保留已有 env，方便手工模式
    config.env = existingConfig?.env || config.env
  }

  // 语音服务 → TTS（内置语音不配置，第三方语音写入 tts 配置）
  if (voice) {
    if (voice.ttsCommand && voice.ttsCommand.length > 0) {
      config.config.speaker.ttsCommand = voice.ttsCommand
    }
    if (!voice.builtin && voice.tts) {
      config.tts = voice.tts
      config.config.speaker.tts = 'custom'
    }
  }

  // 型号 → speaker 硬件指令（数字指令与连续对话能力随型号；召唤词/播报词归角色层）
  if (model) {
    const sp = config.config.speaker
    // 数字指令：TTS / 唤醒 / 播放检测（硬件指令序列，型号有配置即覆盖）
    if (model.ttsCommand?.length) sp.ttsCommand = model.ttsCommand
    if (model.wakeUpCommand?.length) sp.wakeUpCommand = model.wakeUpCommand
    if (model.playingCommand?.length) sp.playingCommand = model.playingCommand
    // 连续对话：consecutive === false 时显式禁用 streamResponse
    if (model.consecutive === false) sp.streamResponse = false
    // 注意：无 playingCommand 不代表不支持连续对话（官方多数型号依赖 Mina 检测播放状态，
    // playingCommand 仅作 MiOT 备选指令，异常时才需补充）——故此处不做强制禁用
  }
  // 会话群（room）：对话记忆上下文归属（独立 Room 实体，多设备共用；旧字段仅兼容）
  if (room) {
    config.config.room = {
      name: room.name,
      description: room.description || '',
    }
  }

  config.config.speaker.did = meta.did
  return { config, bindings }
}
