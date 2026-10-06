import path from 'node:path'
import express from 'express'
import open from 'open'
import os from 'node:os'
import https from 'node:https'
import { createHash } from 'node:crypto'
import {
  getAllStatus,
  run,
  stop,
  type RunConfig,
} from '@migptgui/controller'
import fse from 'fs-extra'
import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { createTTS, kTTSSpeakers } from 'mi-gpt-tts'
import { Readable } from 'node:stream'
import { type GuiConfig } from '@migptgui/options'
import { nanoid } from 'nanoid'
import _trimEnd from 'lodash/trimEnd.js'
import createDebug from 'debug'

const dRoute = createDebug('@migptgui/server:route')
const dAudio = createDebug('@migptgui/server:audio')

// ── 数据目录（容器 VOLUME /root/.migptgui）────────────────────────
const root = path.join(os.homedir(), '.migptgui')
const devicesRoot = path.join(root, 'devices')
const settingsFile = path.join(root, 'settings.json')
const accountsFile = path.join(root, 'accounts.json')
const rolesFile = path.join(root, 'roles.json')
const thinkServicesFile = path.join(root, 'thinkServices.json')
const voiceServicesFile = path.join(root, 'voiceServices.json')
const speakerModelsFile = path.join(root, 'speakerModels.json')
const roomsFile = path.join(root, 'rooms.json')
const authFile = path.join(root, 'auth.json')
const systemLogFile = path.join(root, 'system.log')

// ── 系统日志：拦截 console → 内存环形缓冲 + 落盘 system.log ──
const sysLogBuf: string[] = []
const sysLogMax = 1000
const _origLog = console.log.bind(console)
const _origInfo = console.info.bind(console)
const _origWarn = console.warn.bind(console)
const _origError = console.error.bind(console)

// 同名唯一校验：同一实体的实例名称全局唯一（忽略大小写与首尾空白）。
// 返回冲突提示文本，无冲突返回 null。
function assertUniqueName<T extends { id: string; name?: string }>(
  list: T[],
  name: string | undefined,
  excludeId: string | undefined,
  label: string,
): string | null {
  const n = (name || '').trim()
  if (!n) return null
  const hit = list.find((x) => x.id !== excludeId && (x.name || '').trim().toLowerCase() === n.toLowerCase())
  return hit ? `${label}「${n}」已存在，名称需唯一` : null
}
function _fmtLogArgs(args: any[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.stack || a.message
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}
function _pushSysLog(level: string, text: string) {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const line = `[${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}] [${level}] ${text}`
  sysLogBuf.push(line)
  if (sysLogBuf.length > sysLogMax) sysLogBuf.splice(0, sysLogBuf.length - sysLogMax)
  fse.appendFile(systemLogFile, line + '\n').catch(() => {})
}
console.log = (...a: any[]) => {
  _pushSysLog('INFO', _fmtLogArgs(a))
  _origLog(...a)
}
console.info = (...a: any[]) => {
  _pushSysLog('INFO', _fmtLogArgs(a))
  _origInfo(...a)
}
console.warn = (...a: any[]) => {
  _pushSysLog('WARN', _fmtLogArgs(a))
  _origWarn(...a)
}
console.error = (...a: any[]) => {
  _pushSysLog('ERROR', _fmtLogArgs(a))
  _origError(...a)
}

interface Settings {
  miUserId?: string
  miPassword?: string
  passToken?: string
}

interface Account {
  id: string
  name: string
  miUserId: string
  miPassword?: string
  passToken?: string
  createdAt: number
}

interface Role {
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
  /** 该角色默认引用的思考服务（设备未覆盖时生效） */
  thinkServiceId?: string
  /** 该角色默认引用的语音服务（设备未覆盖时生效） */
  voiceId?: string
}

/**
 * 思考服务：音箱的「大脑」——大模型供应商 + 模型 + 凭据 + 温度。
 * 独立于设备存在，被角色与设备引用；被引用时禁止删除。
 */
interface ThinkService {
  id: string
  name: string
  provider: string
  model: string
  apiKey: string
  baseUrl?: string
  temperature?: number
  /** 全局默认思考服务：未指定角色/设备时回退到这里 */
  isDefault?: boolean
  createdAt: number
}

/**
 * 语音服务：音箱的「嗓子」——供应商 + 音色库。
 * builtin = 小米内置（永不可删）；第三方语音由 tts 配置承载。
 */
interface VoiceService {
  id: string
  name: string
  provider: string
  /** 音色 ID（第三方语音），内置语音为空 */
  voiceId?: string
  /** 唤醒时的音效序列，如 [5,3] */
  ttsCommand?: (number | undefined)[]
  /** 内建标记：小米内置 voice 永不可删 */
  builtin?: boolean
  /** 全局默认语音服务 */
  isDefault?: boolean
  /** 第三方 TTS 引擎配置（provider !== 'builtin' 时生效） */
  tts?: import('mi-gpt-tts').TTSConfig
  createdAt: number
}

/**
 * 会话群：对话记忆的上下文归属（对应旧版 chatGroup / room）。
 * 独立实体，多台设备可共用同一会话群；被设备引用时禁止删除。
 */
interface Room {
  id: string
  /** 会话群名称（对话记忆上下文归属，如「家庭闲聊」） */
  name: string
  /** 会话群描述 */
  description?: string
  createdAt: number
}

interface DeviceMeta {
  id: string
  alias: string
  did: string
  speakerModel?: string
  roleId?: string
  accountId?: string
  /** 设备级思考服务覆盖（优先级最高） */
  thinkServiceId?: string
  /** 设备级语音服务覆盖（优先级最高） */
  voiceOverrideId?: string
  /** 连续对话超时（秒）：无响应多久自动退出唤醒模式，默认 30 */
  exitKeepAliveAfter?: number
  /** 会话群引用（Room 实体 id）；多设备可共用同一会话群 */
  roomRef?: string
  /** 会话群名称（已迁移至 Room 实体，保留仅兼容旧数据；编译时优先 roomRef） */
  roomName?: string
  /** 会话群描述（已迁移至 Room 实体，保留仅兼容旧数据） */
  roomDescription?: string
  ttsSecret: string
  createdAt: number
}

/**
 * 音箱型号：设备的「硬件身份」——数字指令与连续对话能力的默认配置。
 * 召唤词与播报词等文字配置归属「对话角色」，型号不承载语义层参数。
 * 内置型号（builtin）永不可删不可编辑；设备通过 speakerModel 关联型号。
 */
interface SpeakerModel {
  id: string
  name: string
  /** 型号标识（did 前缀 / 硬件型号），如 X08E、L05B */
  did: string
  desc?: string
  /** TTS 指令（硬件指令序列，如 [5,1]） */
  ttsCommand?: number[]
  /** 唤醒指令（硬件指令序列，如 [5,3]） */
  wakeUpCommand?: number[]
  /** 播放检测指令（查询播放状态；部分型号不支持，可缺省） */
  playingCommand?: number[]
  /** 连续对话功能是否启用 */
  consecutive?: boolean
  /** 型号图片（内置型号为真实设备图 URL；自定义型号可留空） */
  imageUrl?: string
  /** 内建标记：系统内置型号永不可删、不可编辑 */
  builtin?: boolean
  createdAt: number
}

const ROLE_DEFAULTS = {
  callAIKeywords: ['请', '你', '傻妞'],
  wakeUpKeywords: ['打开', '进入', '召唤'],
  exitKeywords: ['关闭', '退出', '再见'],
  checkContinueKeywords: [],
  checkNotContinueKeywords: [],
  exitKeepAliveAfter: 30,
  onEnterAI: ['你好，我是傻妞，很高兴认识你'],
  onExitAI: ['傻妞已退出'],
  onAIAsking: ['让我先想想', '请稍等'],
  onAIReplied: ['我说完了', '还有其他问题吗'],
  onAIError: ['啊哦，出错了，请稍后再试吧！'],
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'))
  } catch {
    return fallback
  }
}

async function writeJson(file: string, data: unknown) {
  await fse.ensureDir(path.dirname(file))
  await fs.writeFile(file, JSON.stringify(data, null, 2))
}

// 同步读取小文件（认证中间件是同步的）
function readJsonSync<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

// ── 登录认证：生效凭据解析 ────────────────────────────────────
// 优先级：CLI --user/--pwd > AUTH_USER/AUTH_PASSWORD 环境变量 > auth.json（面板可改）> 默认 admin/123456
function resolveAuth(cliUsers?: Record<string, string>): Record<string, string> {
  if (cliUsers) return cliUsers
  const envUser = process.env.AUTH_USER || 'admin'
  const envPwd = process.env.AUTH_PASSWORD
  if (envPwd) return { [envUser]: envPwd }
  const file = readJsonSync<{ user?: string; password?: string }>(authFile, {})
  if (file.password) return { [file.user || 'admin']: file.password }
  return { admin: '123456' }
}

function getSettings(): Promise<Settings> {
  return readJson<Settings>(settingsFile, {})
}

// ── 多云端账号：读取（含旧 settings.json 迁移）─────────────────
async function getAccounts(): Promise<Account[]> {
  const accounts = await readJson<Account[]>(accountsFile, [])
  if (accounts.length > 0) return accounts
  // 兼容旧版本：settings.json → 迁移为第一个账号
  const old = await readJson<Settings>(settingsFile, {})
  if (old.miUserId || old.passToken) {
    const account: Account = {
      id: nanoid(),
      name: '默认账号',
      miUserId: old.miUserId || '',
      miPassword: old.miPassword,
      passToken: old.passToken,
      createdAt: Date.now(),
    }
    await writeJson(accountsFile, [account])
    return [account]
  }
  return []
}

// 按设备归属取账号；未指定或找不到时回退第一个账号
async function getAccountById(id?: string): Promise<Account | undefined> {
  const accounts = await getAccounts()
  if (id) {
    const found = accounts.find((a) => a.id === id)
    if (found) return found
  }
  return accounts[0]
}

async function getRoles(): Promise<Role[]> {
  return readJson<Role[]>(rolesFile, [])
}

async function getThinkServices(): Promise<ThinkService[]> {
  return readJson<ThinkService[]>(thinkServicesFile, [])
}

async function getVoiceServices(): Promise<VoiceService[]> {
  return readJson<VoiceService[]>(voiceServicesFile, [])
}

async function getSpeakerModels(): Promise<SpeakerModel[]> {
  return readJson<SpeakerModel[]>(speakerModelsFile, [])
}

async function getRooms(): Promise<Room[]> {
  return readJson<Room[]>(roomsFile, [])
}

/** 全局默认思考服务（未指定角色/设备引用时回退） */
async function getDefaultThinkService(): Promise<ThinkService | undefined> {
  const list = await getThinkServices()
  return list.find((t) => t.isDefault) ?? list[0]
}

/** 全局默认语音服务 */
async function getDefaultVoiceService(): Promise<VoiceService | undefined> {
  const list = await getVoiceServices()
  return list.find((v) => v.isDefault) ?? list[0]
}

/**
 * 供应商 → 推理服务 Base URL 映射。
 * 未覆盖的供应商允许用户自定义 baseUrl，否则留空（由 mi-gpt 默认处理）。
 */
const PROVIDER_BASE_URLS: Record<string, string> = {
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  yi: 'https://api.lingyiwanwu.com/v1',
  baichuan: 'https://api.baichuan-ai.com/v1',
}

async function getDeviceMeta(id: string): Promise<DeviceMeta | undefined> {
  return readJson<DeviceMeta | undefined>(
    path.join(devicesRoot, id, 'meta.json'),
    undefined,
  )
}

async function listDeviceMetas(): Promise<DeviceMeta[]> {
  const metas: DeviceMeta[] = []
  try {
    const ids = await fs.readdir(devicesRoot)
    for (const id of ids) {
      const meta = await getDeviceMeta(id)
      if (meta) metas.push(meta)
    }
  } catch {
    /* devices 目录不存在 */
  }
  metas.sort((a, b) => a.createdAt - b.createdAt)
  return metas
}

// ── 设备日志环形缓冲 ────────────────────────────────────────────
const MAX_LOG_LINES = 500
const logBuffers = new Map<string, string[]>()

function appendLog(id: string, line: string) {
  let buf = logBuffers.get(id)
  if (!buf) {
    buf = []
    logBuffers.set(id, buf)
  }
  buf.push(line)
  if (buf.length > MAX_LOG_LINES) buf.splice(0, buf.length - MAX_LOG_LINES)
}

// ── 演示日志种子：仅 MIGPT_DEMO_LOGS=1 时注入 mock 对话，供「对话日志」页联调 ──
const DEMO_SCENES: { q: string; a: string; sys: string }[] = [
  { q: '小爱同学，今天天气怎么样', a: '今天多云转晴，气温 18~26℃，早晚偏凉记得加件外套。', sys: '思考服务命中角色默认（豆包 Doubao-Seed）' },
  { q: '帮我设一个 30 分钟的番茄钟', a: '好的，30 分钟倒计时已开始，结束后我会提醒你休息一下。', sys: '语音音色由角色指定（默认语音）' },
  { q: '播放点轻音乐', a: '为你播放《Lofi 清晨电台》，音量已调到 30%。', sys: '' },
  { q: '小爱同学，国庆周边有什么好玩的', a: '苏州周边推荐：拙政园、平江路夜游、金鸡湖音乐喷泉，今天人流量较大建议错峰出行。', sys: '语音音色热切换成功（豆包语音）' },
]

function demoTs(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function seedBuiltinVoice() {
  const list = await getVoiceServices()
  // 存量迁移：旧名「小米内置」→「默认语音」（历史数据可能存在多条 builtin，全部统一改名）
  let changed = false
  for (const v of list) {
    if (v.builtin && v.name === '小米内置') {
      v.name = '默认语音'
      changed = true
    }
  }
  if (changed) {
    await writeJson(voiceServicesFile, list)
    console.log('已更新内置语音服务名称：默认语音')
    return
  }
  if (!list.some((v) => v.builtin)) {
    list.unshift({
      id: 'builtin-mi',
      name: '默认语音',
      provider: 'builtin',
      builtin: true,
      isDefault: list.length === 0,
      createdAt: Date.now(),
    })
    await writeJson(voiceServicesFile, list)
    console.log('已初始化内置语音服务：默认语音')
  }
}

// ── 小米 micoapi：凭 小米ID + passToken 拉取账号下音箱设备列表 ──
// 协议（已用真实账号冒烟验证）：
//   ① serviceLogin?sid=micoapi&_json=true 携带 cookie{userId, passToken} 免密建立登录态
//   ② clientSign=SHA1(nonce+ssecurity) 换取 serviceToken
//   ③ api2.mina.mi.com/admin/v2/device_list 返回账号下小爱音箱列表
interface PulledDevice {
  name: string
  alias: string
  deviceID: string
  miotDID: string
  hardware: string
  presence: string
}
function _httpsReq(
  method: string,
  url: string,
  headers: Record<string, string>,
  cookieStr?: string,
): Promise<{ status: number; body: string; setCookies: string[] }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const opts: Record<string, any> = {
      method,
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      headers: { ...headers },
      rejectUnauthorized: false,
    }
    if (cookieStr) opts.headers['Cookie'] = cookieStr
    const r = https.request(opts, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () =>
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
          setCookies: (res.headers['set-cookie'] || []) as string[],
        }),
      )
    })
    r.on('error', reject)
    r.end()
  })
}
function _stripJson(body: string): string {
  return body.startsWith('&&&START&&&') ? body.slice('&&&START&&&'.length) : body
}
async function pullMicoDevices(miUserId: string, passToken: string): Promise<PulledDevice[]> {
  const deviceId = 'android_' + nanoid(16)
  const ua =
    'Mozilla/5.0 (Linux; Android 10; 000; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36 /XiaoMi/HybridView/ micoSoundboxApp/i appVersion/A_2.4.40'

  // ① 免密登录态
  const loginCookie = `sdkVersion=3.9; deviceId=${deviceId}; userId=${miUserId}; passToken=${passToken}`
  let r = await _httpsReq(
    'GET',
    'https://account.xiaomi.com/pass/serviceLogin?sid=micoapi&_json=true',
    { 'User-Agent': ua },
    loginCookie,
  )
  const raw = _stripJson(r.body)
  const resp: any = JSON.parse(raw)
  if (resp.code !== 0) {
    throw new Error(`登录态无效（code=${resp.code} ${resp.description || resp.message || ''}），请重新验证 passToken`)
  }
  // nonce 可能超出 JS 安全整数，须取原文
  const nonceMatch = raw.match(/"nonce"\s*:\s*(\d+)/)
  const nonce = nonceMatch ? nonceMatch[1] : String(resp.nonce)

  // ② 换 serviceToken
  const clientSign = createHash('sha1').update(`nonce=${nonce}&${resp.ssecurity}`).digest('base64')
  r = await _httpsReq('GET', `${resp.location}&clientSign=${encodeURIComponent(clientSign)}`, { 'User-Agent': ua })
  let serviceToken = ''
  for (const c of r.setCookies) {
    const name = c.split(';')[0].split('=')[0].trim()
    if (name === 'serviceToken') serviceToken = c.split(';')[0].split('=').slice(1).join('=')
  }
  if (!serviceToken) {
    throw new Error('获取 serviceToken 失败（可能触发异地登录验证），请重新验证 passToken')
  }

  // ③ 设备列表
  const ua2 =
    'MiHome/6.0.103 (com.xiaomi.mihome; build:6.0.103.1; iOS 14.4.0) Alamofire/6.0.103 MICO/iOSApp/appStore/6.0.103'
  const requestId = 'app_ios_' + nanoid(16)
  const apiCookie = `userId=${miUserId}; serviceToken=${serviceToken}; PassportDeviceId=${deviceId}; countryCode=CN; locale=zh_CN; timezone=GMT+08:00`
  r = await _httpsReq(
    'GET',
    `https://api2.mina.mi.com/admin/v2/device_list?master=0&requestId=${requestId}`,
    { 'User-Agent': ua2, Referer: 'https://userprofile.mina.mi.com/dialogue-note/index.html' },
    apiCookie,
  )
  const apiResp: any = JSON.parse(_stripJson(r.body))
  if (apiResp.code !== 0) {
    throw new Error(`拉取设备列表失败（code=${apiResp.code} ${apiResp.message || ''}）`)
  }
  return (apiResp.data || []).map((d: any) => ({
    name: d.name || d.alias || '',
    alias: d.alias || '',
    deviceID: d.deviceID || d.deviceId || '',
    miotDID: String(d.miotDID || ''),
    hardware: d.hardware || '',
    presence: d.presence || 'offline',
  }))
}

/**
 * 系统内置音箱型号（初始化时必须存在；禁删禁编辑）。
 * 清单与指令参数对齐 mi-gpt 官方兼容型号表（github.com/idootop/mi-gpt docs/compatibility.md）
 * 与 migpt-server 内置型号选择器（packages/options ChooseSpeaker）。
 * 分组：支持连续对话（完美运行）/ 不支持连续对话（正常运行）。
 */
const BUILTIN_MODELS: Omit<SpeakerModel, 'createdAt'>[] = [
  // ── 支持连续对话（完美运行）──
  {
    id: 'xiaomi-smart-pro',
    name: 'Xiaomi 智能音箱 Pro',
    did: 'OH2P',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/vIHjnJJqrc',
  },
  {
    id: 'xiaomi-smart',
    name: 'Xiaomi 智能音箱',
    did: 'OH2',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/WQG4uLGOcd',
  },
  {
    id: 'xiaomi-pro',
    name: '小爱音箱 Pro',
    did: 'LX06',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/fqq9JgNvUR',
  },
  {
    id: 'xiaomi-ai-speaker',
    name: '小米 AI 音箱',
    did: 'S12',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s1KdNlarvU',
  },
  {
    id: 'xiaomi-ai-speaker-2',
    name: '小米 AI 音箱（第二代）',
    did: 'L15A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/h84tjXGVYP',
  },
  {
    id: 'xiaomi-universal',
    name: '小爱音箱 万能遥控版',
    did: 'LX5A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/ZpRUVmwTh5',
  },
  {
    id: 'xiaomi-play-2019',
    name: '小爱音箱 Play（2019 款）',
    did: 'LX05',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sIhk2YxwD7',
  },
  {
    id: 'xiaomi-home-screen-10',
    name: '小爱智能家庭屏 10',
    did: 'X10A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sDM9V3slih',
  },
  {
    id: 'xiaomi-sound-pro',
    name: 'Xiaomi Sound Pro',
    did: 'L17A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s7vgvRqqwU',
  },
  // ── 不支持连续对话（正常运行）──
  {
    id: 'xiaomi-speaker',
    name: '小爱音箱',
    did: 'L06A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Ig6OUMFV2u',
  },
  {
    id: 'xiaomi-mini',
    name: '小爱音箱 mini',
    did: 'LX01',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    playingCommand: [4, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/IBVUyAfu4M',
  },
  {
    id: 'xiaomi-play',
    name: '小爱音箱 Play',
    did: 'L05B',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s9jN6QwVcG',
  },
  {
    id: 'xiaomi-play-plus',
    name: '小米小爱音箱 Play 增强版',
    did: 'L05C',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/NU5KITCTbl',
  },
  {
    id: 'xiaomi-art',
    name: '小爱音箱 Art',
    did: 'L09A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [3, 1],
    wakeUpCommand: [3, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/c7uFBjO7cV',
  },
  {
    id: 'xiaomi-touch',
    name: '小爱触屏音箱',
    did: 'LX04',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/SkwcG8td6n',
  },
  {
    id: 'xiaomi-home-mini',
    name: 'Xiaomi 智能家庭屏 Mini',
    did: 'ASX4B',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Q9Vnj3UTJt',
  },
  {
    id: 'xiaomi-home-6',
    name: 'Xiaomi 智能家庭屏 6',
    did: 'X6A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/2QVKCAW8rT',
  },
  {
    id: 'xiaomi-redmi-touch-8',
    name: 'Redmi 小爱触屏音箱 Pro 8 英寸',
    did: 'X08E',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/0UncKIwUlB',
  },
  {
    id: 'xiaomi-home-pro-8',
    name: 'Xiaomi 智能家庭屏 Pro 8',
    did: 'X8F',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/FQuMVAKPUK',
  },
]

async function seedBuiltinModels() {
  const list = await getSpeakerModels()
  // upsert：内置型号以代码定义为准，存在则整体覆盖（保证升级后官方数据自动修正），不存在则新增
  const merged = [
    ...BUILTIN_MODELS.map((m) => ({ ...m, createdAt: list.find((x) => x.id === m.id)?.createdAt ?? Date.now() })),
    ...list.filter((x) => !BUILTIN_MODELS.some((m) => m.id === x.id)),
  ]
  const changed = BUILTIN_MODELS.filter(
    (m) => JSON.stringify(list.find((x) => x.id === m.id)) !== JSON.stringify({ ...m, createdAt: list.find((x) => x.id === m.id)?.createdAt ?? Date.now() }),
  )
  await writeJson(speakerModelsFile, merged)
  if (changed.length > 0) console.log(`已更新内置音箱型号：${changed.map((m) => m.name).join('、')}`)
}

/** 迁移旧版设备会话群字段 → Room 独立实体（幂等；同名归并，多设备共用） */
async function migrateRooms() {
  const metas = await listDeviceMetas()
  const rooms = await getRooms()
  let changed = false
  for (const meta of metas) {
    if (!meta.roomName || meta.roomRef) continue
    let room = rooms.find((r) => r.name === meta.roomName)
    if (!room) {
      room = { id: nanoid(8), name: meta.roomName, description: meta.roomDescription, createdAt: Date.now() }
      rooms.push(room)
    }
    const nextMeta: DeviceMeta = { ...meta, roomRef: room.id }
    delete nextMeta.roomName
    delete nextMeta.roomDescription
    await writeJson(path.join(devicesRoot, meta.id, 'meta.json'), nextMeta)
    changed = true
  }
  if (changed) await writeJson(roomsFile, rooms)
}

/** 按 id 或名称解析会话群 */
async function getRoomByRef(ref?: string): Promise<Room | undefined> {
  if (!ref) return undefined
  const list = await getRooms()
  return list.find((r) => r.id === ref || r.name === ref)
}


/** 按 id 或名称解析型号（兼容旧数据：设备 speakerModel 可能存名称） */
async function getSpeakerModelByRef(ref?: string): Promise<SpeakerModel | undefined> {
  if (!ref) return undefined
  const list = await getSpeakerModels()
  return list.find((m) => m.id === ref || m.name === ref)
}

async function seedDemoLogs() {
  if (!process.env.MIGPT_DEMO_LOGS) return
  const devices = await listDeviceMetas()
  if (!devices.length) return
  const now = Date.now()
  for (const d of devices) {
    const buf: string[] = []
    for (let i = 0; i < 4; i++) {
      const s = DEMO_SCENES[i % DEMO_SCENES.length]
      const tq = new Date(now - (i * 47 + 13) * 60000)
      buf.push(`${demoTs(tq)} [用户] 问：${s.q}`)
      buf.push(`${demoTs(new Date(tq.getTime() + 3500))} [AI] 答：${s.a}`)
      if (s.sys) buf.push(`${demoTs(new Date(tq.getTime() + 16000))} [系统] ${s.sys}`)
    }
    logBuffers.set(d.id, buf)
  }
  console.log(`[demo] 已为 ${devices.length} 台设备注入演示对话日志（MIGPT_DEMO_LOGS=1）`)
}

// ── 用角色的默认配置展开设备初始 migptgui.json ─────────────────────
/** 去重合并关键词列表（用于把检测词并入唤醒/退出关键词，使其真实生效） */
function mergeKW(...lists: (string[] | undefined)[]): string[] {
  const s = new Set<string>()
  for (const l of lists) if (l) for (const e of l) if (e && e.trim()) s.add(e.trim())
  return [...s]
}

function buildConfigFromRole(role?: Role, account?: Account): GuiConfig {
  return {
    config: {
      bot: {
        name: role?.name || '傻妞',
        profile: (role?.profile || '性别：女\n性格：乖巧可爱\n爱好：喜欢搞怪，爱吃醋。').replace(/\\n/g, '\n'),
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
        // 检测1（继续对话）并入唤醒关键词：连续对话中说出继续词保持对话、超时后说出仍可重新进入
        wakeUpKeywords: mergeKW(role?.wakeUpKeywords, role?.checkContinueKeywords, ROLE_DEFAULTS.wakeUpKeywords),
        // 检测2（停止对话）并入退出关键词：连续对话中说出停止词立即结束
        exitKeywords: mergeKW(role?.exitKeywords, role?.checkNotContinueKeywords, ROLE_DEFAULTS.exitKeywords),
        onEnterAI: role?.onEnterAI || ROLE_DEFAULTS.onEnterAI,
        onExitAI: role?.onExitAI || ROLE_DEFAULTS.onExitAI,
        onAIAsking: role?.onAIAsking || ROLE_DEFAULTS.onAIAsking,
        onAIReplied: role?.onAIReplied || ROLE_DEFAULTS.onAIReplied,
        onAIError: role?.onAIError || ROLE_DEFAULTS.onAIError,
        exitKeepAliveAfter: role?.exitKeepAliveAfter ?? ROLE_DEFAULTS.exitKeepAliveAfter,
      },
    },
    env: {
      OPENAI_API_KEY: '',
      OPENAI_MODEL: '',
      OPENAI_BASE_URL: '',
    },
  }
}

/**
 * 绑定链来源标注：
 * - account / role  来自设备显式绑定
 * - think / voice   依次回退：设备覆盖 → 继承人设 → 全局默认
 */
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

/** 解析一台设备的完整绑定链（账号/角色/思考服务/语音服务 + 来源标注） */
async function resolveBindings(meta: DeviceMeta): Promise<DeviceBindings> {
  const account = await getAccountById(meta.accountId)
  const roles = await getRoles()
  const role = meta.roleId
    ? roles.find((r) => r.id === meta.roleId)
    : undefined

  // 思考服务：设备覆盖 → 继承人设 → 全局默认
  let think = meta.thinkServiceId
    ? (await getThinkServices()).find((t) => t.id === meta.thinkServiceId)
    : undefined
  let thinkSource: BindingRow['source'] = 'device'
  if (!think && role?.thinkServiceId) {
    think = (await getThinkServices()).find((t) => t.id === role.thinkServiceId)
    thinkSource = 'role'
  }
  if (!think) {
    think = await getDefaultThinkService()
    thinkSource = 'global'
  }

  // 语音服务：设备覆盖 → 继承人设 → 全局默认
  let voice = meta.voiceOverrideId
    ? (await getVoiceServices()).find((v) => v.id === meta.voiceOverrideId)
    : undefined
  let voiceSource: BindingRow['source'] = 'device'
  if (!voice && role?.voiceId) {
    voice = (await getVoiceServices()).find((v) => v.id === role.voiceId)
    voiceSource = 'role'
  }
  if (!voice) {
    voice = await getDefaultVoiceService()
    voiceSource = 'global'
  }

  const rows: BindingRow[] = [
    {
      key: 'account',
      label: '云端账号',
      name: account?.name || '未绑定',
      detail: account?.miUserId,
      source: 'device',
      sourceLabel: '设备指定',
    },
    {
      key: 'role',
      label: '对话角色',
      name: role?.name || '未绑定',
      detail: role ? undefined : '将使用默认行为',
      source: 'device',
      sourceLabel: '设备绑定',
    },
    {
      key: 'think',
      label: '思考服务',
      name: think?.name || '未配置',
      detail: think ? `${think.provider} · ${think.model}` : undefined,
      source: thinkSource,
      sourceLabel:
        thinkSource === 'device'
          ? '设备覆盖'
          : thinkSource === 'role'
            ? '继承人设'
            : '全局默认',
    },
    {
      key: 'voice',
      label: '语音服务',
      name: voice?.name || '未配置',
      detail: voice
        ? voice.builtin
          ? '默认语音'
          : `${voice.provider} · ${voice.voiceId || '默认音色'}`
        : undefined,
      source: voiceSource,
      sourceLabel:
        voiceSource === 'device'
          ? '设备覆盖'
          : voiceSource === 'role'
            ? '继承人设'
            : '全局默认',
    },
  ]

  return { account, role, think, voice, rows }
}

/**
 * 按绑定链编译设备运行时配置（编译投影）：
 * 角色内容 → bot/speaker；思考服务 → env；语音服务 → tts。
 * existingConfig 用于保留设备已有的 gui（publicURL 等）与用户手工设置。
 */
async function buildRunConfig(
  meta: DeviceMeta,
  existingConfig?: GuiConfig,
): Promise<{ config: GuiConfig; bindings: DeviceBindings }> {
  const bindings = await resolveBindings(meta)
  const { account, role, think, voice } = bindings
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
  const model = await getSpeakerModelByRef(meta.speakerModel)
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
  // 连续对话超时（无响应自动退出唤醒模式，默认 30 秒）
  config.config.speaker.exitKeepAliveAfter = meta.exitKeepAliveAfter ?? 30
  // 会话群（room）：对话记忆上下文归属（独立 Room 实体，多设备共用；旧字段仅兼容）
  const room = await getRoomByRef(meta.roomRef || meta.roomName)
  if (room) {
    config.config.room = {
      name: room.name,
      description: room.description || '',
    }
  }

  config.config.speaker.did = meta.did
  return { config, bindings }
}

export function runServer(options?: {
  open?: boolean
  port?: number
  users?: Record<string, string>
  staticPath?: string
  auth?: boolean
}) {
  const port = options?.port || 36592
  // 认证默认启用（中间件无条件挂载）；--no-auth 时由 apps/server 传 auth:false
  const isAuth = options?.auth !== false
  const defaultBotCwd = path.join(root, 'default')

  const app = express()

  // 用于测试用户填写的对外地址是否正确
  app.post('/ping', (req, res) => {
    dRoute('进入 POST /ping')
    res.status(204).send()
  })

  // ── 多设备 TTS：/{ttsSecret}/tts/tts.mp3（小爱音箱访问，不能加 basicAuth）──
  async function findDeviceBySecret(secret: string): Promise<DeviceMeta | undefined> {
    const metas = await listDeviceMetas()
    return metas.find((m) => m.ttsSecret === secret)
  }

  async function loadDeviceConfig(id: string): Promise<GuiConfig | undefined> {
    const file =
      id === 'default'
        ? path.join(root, 'default', 'migptgui.json')
        : path.join(devicesRoot, id, 'migptgui.json')
    try {
      return JSON.parse(await fs.readFile(file, 'utf-8'))
    } catch {
      return undefined
    }
  }

  app.get('/:secret/tts/speakers', (req, res) => {
    res.json(kTTSSpeakers)
  })

  app.get('/:secret/tts/tts.mp3', async (req, res) => {
    const secret = req.params.secret
    let meta: DeviceMeta | undefined
    let config: GuiConfig | undefined
    if (secret === 'default') {
      config = await loadDeviceConfig('default')
    } else {
      meta = await findDeviceBySecret(secret)
      config = meta ? await loadDeviceConfig(meta.id) : undefined
    }

    if (!config?.tts) {
      res.status(500).send('Internal Server Error')
      return
    }

    const tts = createTTS(config.tts)
    const nUrl = req.url.replace('+text=', '&text=')
    const url = new URL('http://localhost' + nUrl)
    const audioStream = new Readable({ read() {} })

    const options = {
      speaker: url.searchParams.get('speaker') || config.tts.defaultSpeaker!,
      text: decodeURIComponent(url.searchParams.get('text') || ''),
      stream: audioStream,
    }

    dAudio('准备合成语音。参数：%O', options)

    tts(options).then((buffer) => {
      if (!buffer) {
        audioStream.destroy(new Error('没有把配置填写完整'))
      }
    })

    let headersSent = false
    audioStream.on('data', (chunk) => {
      if (
        (chunk.length === 3 && chunk.toString('utf8') === '404') ||
        (chunk.length === 5 && chunk.toString('utf8') === 'error')
      ) {
        audioStream.destroy(new Error('配置填写有误'))
        return
      }
      if (!headersSent) {
        res.writeHead(200, {
          'Transfer-Encoding': 'chunked',
          'Content-Type': 'audio/mp3',
        })
        headersSent = true
      }
      res.write(chunk)
    })
    audioStream.on('end', () => res.end())
    audioStream.once('error', (error) => {
      if (!headersSent) {
        res.status(400).send(error.message || 'Internal Server Error')
      } else {
        res.end()
      }
    })
  })

  app.use(express.json())

  // 静态资源匿名加载（前端 SPA 先加载 JS），API 全部要求认证
  if (options?.staticPath) {
    app.use(express.static(options.staticPath))
  }

  // 自定义 Basic Auth：失败返回 JSON 401（不带 challenge），由前端渲染登录页。
  // 认证默认启用：凭据按 环境变量/--pwd > auth.json（面板可改）> 默认 admin/123456 解析。
  if (options?.auth !== false) {
    app.use('/api', (req, res, next) => {
      const users = resolveAuth(options?.users)
      const header = req.headers.authorization || ''
      const [type, token] = header.split(' ')
      if (type === 'Basic' && token) {
        let decoded = ''
        try {
          decoded = Buffer.from(token, 'base64').toString('utf-8')
        } catch {
          decoded = ''
        }
        const idx = decoded.indexOf(':')
        const user = idx >= 0 ? decoded.slice(0, idx) : ''
        const pass = idx >= 0 ? decoded.slice(idx + 1) : ''
        if (user && users[user] === pass) {
          return next()
        }
      }
      res.status(401).json({ error: 'unauthorized' })
    })
  }

  // ── 修改登录凭据（持久化到 auth.json，前端「我的」页调用）─────
  app.put('/api/auth', async (req, res) => {
    const body = req.body as {
      oldUser?: string
      oldPassword?: string
      newUser?: string
      newPassword?: string
    }
    if (!body.newUser || !body.newPassword) {
      res.status(400).json({ error: '新用户名和新密码必填' })
      return
    }
    const users = resolveAuth(options?.users)
    const current = users[body.oldUser || '']
    if (!current || current !== body.oldPassword) {
      res.status(403).json({ error: '旧密码不正确' })
      return
    }
    await writeJson(authFile, {
      user: body.newUser,
      password: body.newPassword,
    })
    res.json({ success: true })
  })

  // ── 状态：全部设备 ─────────────────────────────────────────────
  app.get('/api/status', async (req, res) => {
    const devices = await listDeviceMetas()
    const status = getAllStatus()
    res.json({
      devices: devices.map((meta) => ({
        ...meta,
        running: !!status[meta.id],
      })),
    })
  })

  // ── 账号托管 ──────────────────────────────────────────────────
  // ── 云端账号（多账号）────────────────────────────────────────
  app.get('/api/accounts', async (req, res) => {
    res.json(await getAccounts())
  })

  app.post('/api/accounts', async (req, res) => {
    const body = req.body as Partial<Account>
    if (!body.name || !body.miUserId) {
      res.status(400).json({ error: '名称与云端账号数字 ID 必填' })
      return
    }
    const accounts = await getAccounts()
    const dup = assertUniqueName(accounts, body.name, undefined, '账号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const account: Account = {
      id: nanoid(8),
      name: body.name,
      miUserId: body.miUserId,
      miPassword: body.miPassword,
      passToken: body.passToken,
      createdAt: Date.now(),
    }
    accounts.push(account)
    await writeJson(accountsFile, accounts)
    res.json(account)
  })

  app.put('/api/accounts/:id', async (req, res) => {
    const accounts = await getAccounts()
    const idx = accounts.findIndex((a) => a.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '账号不存在' })
      return
    }
    const body = req.body as Partial<Account>
    const dup = assertUniqueName(accounts, body.name, req.params.id, '账号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    accounts[idx] = {
      ...accounts[idx],
      name: body.name ?? accounts[idx].name,
      miUserId: body.miUserId ?? accounts[idx].miUserId,
      ...(body.passToken !== undefined ? { miPassword: body.miPassword, passToken: body.passToken } : {}),
    }
    await writeJson(accountsFile, accounts)
    res.json(accounts[idx])
  })

  app.delete('/api/accounts/:id', async (req, res) => {
    const accounts = await getAccounts()
    const idx = accounts.findIndex((a) => a.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '账号不存在' })
      return
    }
    // 删除保护：被设备引用的账号禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.accountId === req.params.id)
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该账号正被设备引用，无法删除；请先解绑相关设备',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    accounts.splice(idx, 1)
    await writeJson(accountsFile, accounts)
    res.json({ success: true })
  })

  // 凭 小米ID + passToken 拉取账号下音箱设备列表（三步连接 Step2 与设备添加复用）
  app.post('/api/accounts/:id/pull-devices', async (req, res) => {
    const accounts = await getAccounts()
    const account = accounts.find((a) => a.id === req.params.id)
    if (!account) {
      res.status(404).json({ error: '账号不存在' })
      return
    }
    if (!account.miUserId || !account.passToken) {
      res.status(400).json({ error: '请先填写云端账号数字 ID 与会话凭证（passToken）' })
      return
    }
    try {
      const devices = await pullMicoDevices(account.miUserId, account.passToken)
      res.json({ devices })
    } catch (e: any) {
      console.error('拉取设备失败', e)
      _pushSysLog('ERROR', `拉取账号设备失败：${e?.message || e}`)
      res.status(502).json({ error: `拉取设备失败：${e?.message || e}` })
    }
  })

  // 兼容旧版：/api/settings 读写第一个（默认）账号
  app.get('/api/settings', async (req, res) => {
    const account = await getAccountById()
    res.json(
      account
        ? {
            miUserId: account.miUserId,
            miPassword: account.miPassword,
            passToken: account.passToken,
          }
        : {},
    )
  })

  app.put('/api/settings', async (req, res) => {
    const body = req.body as Settings
    const accounts = await getAccounts()
    if (accounts.length > 0) {
      accounts[0] = {
        ...accounts[0],
        miUserId: body.miUserId || accounts[0].miUserId,
        miPassword: body.miPassword,
        passToken: body.passToken,
      }
    } else {
      accounts.push({
        id: nanoid(8),
        name: '默认账号',
        miUserId: body.miUserId || '',
        miPassword: body.miPassword,
        passToken: body.passToken,
        createdAt: Date.now(),
      })
    }
    await writeJson(accountsFile, accounts)
    res.json({ success: true })
  })

  // ── AI 角色 ───────────────────────────────────────────────────
  // 归一化人设描述：兼容旧版存储的字面 `\n`，统一转为真实换行符
  const normProfile = (s?: string) => (s || '').replace(/\\n/g, '\n')

  app.get('/api/roles', async (req, res) => {
    const roles = await getRoles()
    res.json(roles.map((r) => ({ ...r, profile: normProfile(r.profile) })))
  })

  app.post('/api/roles', async (req, res) => {
    const roles = await getRoles()
    const dup = assertUniqueName(roles, req.body?.name, undefined, '角色名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const role: Role = {
      id: nanoid(8),
      ...ROLE_DEFAULTS,
      ...req.body,
      profile: normProfile(req.body.profile),
    }
    roles.push(role)
    await writeJson(rolesFile, roles)
    res.json(role)
  })

  app.put('/api/roles/:id', async (req, res) => {
    const roles = await getRoles()
    const idx = roles.findIndex((r) => r.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '角色不存在' })
      return
    }
    const dup = assertUniqueName(roles, req.body?.name, req.params.id, '角色名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    roles[idx] = { ...roles[idx], ...req.body, id: req.params.id, profile: normProfile(req.body.profile ?? roles[idx].profile) }
    await writeJson(rolesFile, roles)
    res.json(roles[idx])
  })

  app.delete('/api/roles/:id', async (req, res) => {
    const roles = await getRoles()
    if (!roles.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: '角色不存在' })
      return
    }
    // 删除保护：被设备引用的角色禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.roleId === req.params.id)
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该角色正被设备引用，无法删除；请先更换引用该角色的设备',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    await writeJson(
      rolesFile,
      roles.filter((r) => r.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 思考服务（音箱的「大脑」）───────────────────────────────
  app.get('/api/think-services', async (req, res) => {
    res.json(await getThinkServices())
  })

  app.post('/api/think-services', async (req, res) => {
    const body = req.body as Partial<ThinkService>
    if (!body.name || !body.provider || !body.model || !body.apiKey) {
      res.status(400).json({ error: '名称、供应商、模型与 API Key 必填' })
      return
    }
    const list = await getThinkServices()
    const dup = assertUniqueName(list, body.name, undefined, '思考服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const svc: ThinkService = {
      id: nanoid(8),
      name: body.name,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      temperature: body.temperature,
      isDefault: body.isDefault ?? list.length === 0,
      createdAt: Date.now(),
    }
    // 保持全局默认唯一
    if (svc.isDefault) {
      for (const t of list) t.isDefault = false
      await writeJson(thinkServicesFile, list)
    }
    list.push(svc)
    await writeJson(thinkServicesFile, list)
    res.json(svc)
  })

  app.put('/api/think-services/:id', async (req, res) => {
    const list = await getThinkServices()
    const idx = list.findIndex((t) => t.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '思考服务不存在' })
      return
    }
    const body = req.body as Partial<ThinkService>
    const dup = assertUniqueName(list, body.name, req.params.id, '思考服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const wasDefault = list[idx].isDefault
    list[idx] = { ...list[idx], ...body, id: req.params.id }
    if (body.isDefault && !wasDefault) {
      for (const t of list) if (t.id !== req.params.id) t.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
    await writeJson(thinkServicesFile, list)
    res.json(list[idx])
  })

  app.delete('/api/think-services/:id', async (req, res) => {
    const list = await getThinkServices()
    if (!list.some((t) => t.id === req.params.id)) {
      res.status(404).json({ error: '思考服务不存在' })
      return
    }
    // 删除保护：被设备或角色引用的实体禁止删除
    const roles = await getRoles()
    const metas = await listDeviceMetas()
    const refRoles = roles.filter((r) => r.thinkServiceId === req.params.id)
    const refDevices = metas.filter((m) => m.thinkServiceId === req.params.id)
    if (refRoles.length > 0 || refDevices.length > 0) {
      res.status(409).json({
        error: '该思考服务正被其他实体引用，无法删除',
        refs: {
          roles: refRoles.map((r) => r.name),
          devices: refDevices.map((d) => d.alias),
        },
      })
      return
    }
    await writeJson(
      thinkServicesFile,
      list.filter((t) => t.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 语音服务（音箱的「嗓子」）───────────────────────────────
  app.get('/api/voice-services', async (req, res) => {
    res.json(await getVoiceServices())
  })

  app.post('/api/voice-services', async (req, res) => {
    const body = req.body as Partial<VoiceService>
    if (!body.name || !body.provider) {
      res.status(400).json({ error: '名称与供应商必填' })
      return
    }
    const list = await getVoiceServices()
    const dup = assertUniqueName(list, body.name, undefined, '语音服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const svc: VoiceService = {
      id: nanoid(8),
      name: body.name,
      provider: body.provider,
      voiceId: body.voiceId,
      ttsCommand: body.ttsCommand,
      builtin: body.builtin ?? false,
      isDefault: body.isDefault ?? list.length === 0,
      tts: body.tts,
      createdAt: Date.now(),
    }
    if (svc.isDefault) {
      for (const v of list) v.isDefault = false
      await writeJson(voiceServicesFile, list)
    }
    list.push(svc)
    await writeJson(voiceServicesFile, list)
    res.json(svc)
  })

  app.put('/api/voice-services/:id', async (req, res) => {
    const list = await getVoiceServices()
    const idx = list.findIndex((v) => v.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '语音服务不存在' })
      return
    }
    const body = req.body as Partial<VoiceService>
    if (list[idx].builtin) {
      res.status(409).json({ error: '内建语音服务不可编辑' })
      return
    }
    const dup = assertUniqueName(list, body.name, req.params.id, '语音服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const wasDefault = list[idx].isDefault
    list[idx] = { ...list[idx], ...body, id: req.params.id, builtin: list[idx].builtin }
    if (body.isDefault && !wasDefault) {
      for (const v of list) if (v.id !== req.params.id) v.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
    await writeJson(voiceServicesFile, list)
    res.json(list[idx])
  })

  app.delete('/api/voice-services/:id', async (req, res) => {
    const list = await getVoiceServices()
    const target = list.find((v) => v.id === req.params.id)
    if (!target) {
      res.status(404).json({ error: '语音服务不存在' })
      return
    }
    if (target.builtin) {
      res.status(409).json({ error: '内建语音服务不可删除' })
      return
    }
    // 删除保护：被设备或角色引用的实体禁止删除
    const roles = await getRoles()
    const metas = await listDeviceMetas()
    const refRoles = roles.filter((r) => r.voiceId === req.params.id)
    const refDevices = metas.filter((m) => m.voiceOverrideId === req.params.id)
    if (refRoles.length > 0 || refDevices.length > 0) {
      res.status(409).json({
        error: '该语音服务正被其他实体引用，无法删除',
        refs: {
          roles: refRoles.map((r) => r.name),
          devices: refDevices.map((d) => d.alias),
        },
      })
      return
    }
    await writeJson(
      voiceServicesFile,
      list.filter((v) => v.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 音箱型号（设备的「硬件身份」配置）─────────────────────────
  app.get('/api/speaker-models', async (req, res) => {
    res.json(await getSpeakerModels())
  })

  app.post('/api/speaker-models', async (req, res) => {
    const body = req.body as Partial<SpeakerModel>
    if (!body.name || !body.did) {
      res.status(400).json({ error: '名称与型号标识必填' })
      return
    }
    const list = await getSpeakerModels()
    const dup = assertUniqueName(list, body.name, undefined, '型号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const model: SpeakerModel = {
      id: nanoid(8),
      name: body.name,
      did: body.did,
      desc: body.desc,
      ttsCommand: body.ttsCommand || [],
      wakeUpCommand: body.wakeUpCommand || [],
      playingCommand: body.playingCommand || [],
      consecutive: body.consecutive ?? true,
      imageUrl: body.imageUrl,
      builtin: false,
      createdAt: Date.now(),
    }
    list.push(model)
    await writeJson(speakerModelsFile, list)
    res.json(model)
  })

  app.put('/api/speaker-models/:id', async (req, res) => {
    const list = await getSpeakerModels()
    const idx = list.findIndex((m) => m.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '型号不存在' })
      return
    }
    const body = req.body as Partial<SpeakerModel>
    if (list[idx].builtin) {
      res.status(409).json({ error: '系统内置型号不可编辑' })
      return
    }
    const dup = assertUniqueName(list, body.name, req.params.id, '型号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    list[idx] = { ...list[idx], ...body, id: req.params.id, builtin: list[idx].builtin }
    await writeJson(speakerModelsFile, list)
    res.json(list[idx])
  })

  app.delete('/api/speaker-models/:id', async (req, res) => {
    const list = await getSpeakerModels()
    const target = list.find((m) => m.id === req.params.id)
    if (!target) {
      res.status(404).json({ error: '型号不存在' })
      return
    }
    if (target.builtin) {
      res.status(409).json({ error: '系统内置型号不可删除' })
      return
    }
    // 删除保护：被设备关联的型号禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter(
      (m) => m.speakerModel === req.params.id || m.speakerModel === target.name,
    )
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该型号正被设备引用，无法删除',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    await writeJson(
      speakerModelsFile,
      list.filter((m) => m.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 会话群（对话记忆上下文归属，多设备共用）──────────────────────
  app.get('/api/rooms', async (req, res) => {
    const rooms = await getRooms()
    const metas = await listDeviceMetas()
    res.json(
      rooms.map((r) => ({
        ...r,
        deviceCount: metas.filter((m) => m.roomRef === r.id).length,
      })),
    )
  })

  app.post('/api/rooms', async (req, res) => {
    const body = req.body as Partial<Room>
    if (!body.name) {
      res.status(400).json({ error: '会话群名称必填' })
      return
    }
    const rooms = await getRooms()
    const dup = assertUniqueName(rooms, body.name, undefined, '会话群名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const room: Room = {
      id: nanoid(8),
      name: body.name,
      description: body.description,
      createdAt: Date.now(),
    }
    rooms.push(room)
    await writeJson(roomsFile, rooms)
    res.json(room)
  })

  app.put('/api/rooms/:id', async (req, res) => {
    const rooms = await getRooms()
    const idx = rooms.findIndex((r) => r.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '会话群不存在' })
      return
    }
    const body = req.body as Partial<Room>
    const dup = assertUniqueName(rooms, body.name, req.params.id, '会话群名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    rooms[idx] = { ...rooms[idx], ...body, id: req.params.id }
    await writeJson(roomsFile, rooms)
    res.json(rooms[idx])
  })

  app.delete('/api/rooms/:id', async (req, res) => {
    const rooms = await getRooms()
    if (!rooms.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: '会话群不存在' })
      return
    }
    // 删除保护：被设备引用的会话群禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.roomRef === req.params.id)
    if (refDevices.length > 0) {
      res.status(409).json({
        error: '该会话群正被设备引用，无法删除；请先解绑引用该会话群的设备',
        refs: { devices: refDevices.map((d) => d.alias) },
      })
      return
    }
    await writeJson(
      roomsFile,
      rooms.filter((r) => r.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // ── 设备管理 ──────────────────────────────────────────────────
  app.get('/api/devices', async (req, res) => {
    const devices = await listDeviceMetas()
    const status = getAllStatus()
    res.json(
      devices.map((meta) => ({ ...meta, running: !!status[meta.id] })),
    )
  })

  app.post('/api/devices', async (req, res) => {
    const body = req.body as {
      alias: string
      did: string
      speakerModel?: string
      roleId?: string
      accountId?: string
      thinkServiceId?: string
      voiceOverrideId?: string
      exitKeepAliveAfter?: number
      roomRef?: string
      roomName?: string
      roomDescription?: string
    }
    if (!body.alias || !body.did) {
      res.status(400).json({ error: '别名和设备 ID 必填' })
      return
    }
    const metas = await listDeviceMetas()
    // 唯一性按「账号」维度：同账号下设备 ID 唯一（防止同一设备多套配置）；不同账号允许相同 ID/名称（支持设备切换账号）
    const sameAcct = body.accountId ? metas.filter((m) => m.accountId === body.accountId) : metas
    if (sameAcct.some((m) => m.did === body.did)) {
      res.status(409).json({ error: '该账号下已接入此设备（设备 ID 相同），请勿重复配置' })
      return
    }
    const dup = assertUniqueName(sameAcct, body.alias, undefined, '设备名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const id = nanoid(8)
    const meta: DeviceMeta = {
      id,
      alias: body.alias,
      did: body.did,
      speakerModel: body.speakerModel,
      roleId: body.roleId,
      accountId: body.accountId,
      thinkServiceId: body.thinkServiceId,
      voiceOverrideId: body.voiceOverrideId,
      exitKeepAliveAfter: body.exitKeepAliveAfter,
      roomRef: body.roomRef,
      roomName: body.roomName,
      roomDescription: body.roomDescription,
      ttsSecret: nanoid(),
      createdAt: Date.now(),
    }
    const deviceCwd = path.join(devicesRoot, id)
    await writeJson(path.join(deviceCwd, 'meta.json'), meta)
    // 按绑定链编译初始配置（编译投影）
    const { config } = await buildRunConfig(meta)
    await writeJson(path.join(deviceCwd, 'migptgui.json'), config)
    res.json({ id, meta })
  })

  app.get('/api/devices/:id', async (req, res) => {
    const meta = await getDeviceMeta(req.params.id)
    if (!meta) {
      res.status(404).json({ error: '设备不存在' })
      return
    }
    const config = await loadDeviceConfig(req.params.id)
    // 绑定关系（含来源标注：设备覆盖 / 继承人设 / 全局默认）
    const bindings = await resolveBindings(meta)
    res.json({ meta, config, bindings })
  })

  app.put('/api/devices/:id', async (req, res) => {
    const id = req.params.id
    const meta = await getDeviceMeta(id)
    if (!meta) {
      res.status(404).json({ error: '设备不存在' })
      return
    }
    const body = req.body as { meta?: Partial<DeviceMeta>; config?: GuiConfig }
    if (body.meta) {
      // 唯一性按「账号」维度校验（同账号 did 唯一 / 同账号内名称唯一），排除自身
      if (body.meta.alias !== undefined || body.meta.did !== undefined || body.meta.accountId !== undefined) {
        const allMetas = await listDeviceMetas()
        const nextAcct = body.meta.accountId !== undefined ? body.meta.accountId : meta.accountId
        const sameAcct = nextAcct ? allMetas.filter((m) => m.accountId === nextAcct && m.id !== id) : allMetas.filter((m) => m.id !== id)
        const nextDid = body.meta.did !== undefined ? body.meta.did : meta.did
        if (sameAcct.some((m) => m.did === nextDid)) {
          res.status(409).json({ error: '该账号下已接入此设备（设备 ID 相同），请勿重复配置' })
          return
        }
        if (body.meta.alias !== undefined) {
          const dup = assertUniqueName(sameAcct, body.meta.alias, id, '设备名称')
          if (dup) {
            res.status(409).json({ error: dup })
            return
          }
        }
      }
      const nextMeta: DeviceMeta = { ...meta, ...body.meta, id }
      await writeJson(path.join(devicesRoot, id, 'meta.json'), nextMeta)
      // 绑定字段变化时重新编译投影，保证 migptgui.json 与绑定链一致
      if (
        body.meta.roleId !== undefined ||
        body.meta.accountId !== undefined ||
        body.meta.thinkServiceId !== undefined ||
        body.meta.voiceOverrideId !== undefined ||
        body.meta.speakerModel !== undefined ||
        body.meta.did !== undefined ||
        body.meta.exitKeepAliveAfter !== undefined ||
        body.meta.roomRef !== undefined ||
        body.meta.roomName !== undefined ||
        body.meta.roomDescription !== undefined
      ) {
        const { config } = await buildRunConfig(nextMeta)
        await writeJson(path.join(devicesRoot, id, 'migptgui.json'), config)
      }
    }
    if (body.config) {
      await writeJson(path.join(devicesRoot, id, 'migptgui.json'), body.config)
    }
    res.json({ success: true })
  })

  app.delete('/api/devices/:id', async (req, res) => {
    await stop(req.params.id)
    await fse.remove(path.join(devicesRoot, req.params.id))
    logBuffers.delete(req.params.id)
    res.json({ success: true })
  })

  // ── 启动/停止 ─────────────────────────────────────────────────
  app.post('/api/devices/:id/start', async (req, res) => {
    const id = req.params.id
    const meta = await getDeviceMeta(id)
    if (!meta) {
      res.status(404).json({ error: '设备不存在' })
      return
    }
    // 启动前按绑定链重新编译投影（角色/服务变更后无需手动改 migptgui.json）
    const existing = await loadDeviceConfig(id)
    const { config } = await buildRunConfig(meta, existing)
    const deviceCwd = path.join(devicesRoot, id)
    await writeJson(path.join(deviceCwd, 'migptgui.json'), config)

    // 账号托管：按设备归属账号自动写入 .mi.json（minna/miiot 两段）
    const account = await getAccountById(meta.accountId)
    if (account?.passToken) {
      const miJson = {
        mina: { pass: { passToken: account.passToken } },
        miiot: { pass: { passToken: account.passToken } },
      }
      await writeJson(path.join(deviceCwd, '.mi.json'), miJson)
    }

    // 内建 TTS：为设备注入独立的 TTS_BASE_URL
    if (
      config.config.speaker.tts === 'custom' &&
      config.gui &&
      config.gui.ttsProvider !== 'custom' &&
      config.tts
    ) {
      config.env.TTS_BASE_URL = `${_trimEnd(
        config.gui.publicURL || '',
        '/',
      )}/${meta.ttsSecret}/tts`
      dAudio('设置 TTS_BASE_URL 为：%s', config.env.TTS_BASE_URL)
    }

    await run(
      id,
      config as unknown as RunConfig,
      deviceCwd,
      (deviceId, line) => appendLog(deviceId, line),
    )

    res.json({ success: true })
  })

  app.post('/api/devices/:id/stop', async (req, res) => {
    await stop(req.params.id)
    res.json({ success: true })
  })

  app.get('/api/devices/:id/logs', async (req, res) => {
    const limit = Number(req.query.limit) || 100
    const buf = logBuffers.get(req.params.id) || []
    res.json({ logs: buf.slice(-limit) })
  })

  // ── 全局对话日志（聚合所有设备，供「对话日志」页）────────────────
  app.get('/api/logs', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const rows: {
      deviceId: string
      deviceAlias: string
      time: string
      kind: 'user' | 'ai' | 'system'
      text: string
    }[] = []
    for (const [deviceId, buf] of logBuffers) {
      const meta = await getDeviceMeta(deviceId)
      let cur: { time: string; kind: 'user' | 'ai' | 'system'; text: string } | null = null
      for (const line of buf.slice(-limit)) {
        const m = line.match(/^(\d{4}[\/-]\d{2}[\/-]\d{2} \d{2}:\d{2}:\d{2})/)
        const body = line.replace(/^\d{4}[\/-]\d{2}[\/-]\d{2} \d{2}:\d{2}:\d{2}\s*/, '')
        if (m) {
          if (cur) rows.push({ deviceId, deviceAlias: meta?.alias || deviceId, ...cur })
          let kind: 'user' | 'ai' | 'system' = 'system'
          if (/^\[用户\]|\[User\]|\[Q\]|^问[:：]|用户说/.test(body)) kind = 'user'
          else if (/^\[AI\]|\[Assistant\]|\[A\]|^答[:：]|AI 说/.test(body)) kind = 'ai'
          cur = { time: m[1], kind, text: body }
        } else if (cur) {
          // 无时间戳的续行并入上一条日志（同一条多行日志不拆成多条）
          cur.text += '\n' + body
        }
      }
      if (cur) rows.push({ deviceId, deviceAlias: meta?.alias || deviceId, ...cur })
    }
    rows.sort((a, b) => (a.time < b.time ? 1 : -1))
    res.json({ total: rows.length, logs: rows.slice(0, limit) })
  })

  // ── 系统日志（实时查看 + 下载历史）───────────────────────────
  app.get('/api/system/logs', async (req, res) => {
    const lines = Math.min(Number(req.query.lines) || 300, 2000)
    let arr = sysLogBuf.slice(-lines)
    if (arr.length < lines) {
      try {
        const all = (await fs.readFile(systemLogFile, 'utf8')).split('\n').filter(Boolean)
        arr = all.slice(-lines)
      } catch {
        /* 日志文件尚未生成 */
      }
    }
    let size = 0
    try {
      size = (await fs.stat(systemLogFile)).size
    } catch {
      /* 忽略 */
    }
    res.json({ lines: arr, file: systemLogFile, size })
  })

  app.get('/api/system/logs/download', async (_req, res) => {
    try {
      const text = await fs.readFile(systemLogFile, 'utf8')
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="migpt-system.log"')
      res.send(text)
    } catch {
      res.status(404).json({ error: '系统日志文件不存在' })
    }
  })

  app.post('/api/system/logs/clear', async (_req, res) => {
    try {
      sysLogBuf.length = 0
      await fse.writeFile(systemLogFile, '', 'utf8')
      res.json({ success: true })
    } catch (err) {
      res.json({ success: false, error: String(err) })
    }
  })

  // ── 测试接口（保留） ──────────────────────────────────────────
  app.post('/api/test', async (req, res) => {
    const testBaseUrl = req.body.url
    const ping = _trimEnd(testBaseUrl, '/') + '/ping'
    try {
      const fetchRes = await fetch(ping, {
        method: 'POST',
        signal: AbortSignal.timeout(500),
      })
      res.json({ success: fetchRes.ok })
    } catch {
      res.json({ success: false })
    }
  })

  app.get('/api/test/audio', (req, res) => {
    const params = req.query as { ttsConfig: string }
    const options = JSON.parse(params.ttsConfig)
    const testTTS = createTTS(options)
    const audioStream = new Readable({ read() {} })
    options.stream = audioStream
    const ro = {
      text: '配置成功！',
      stream: audioStream,
      speaker: options.defaultSpeaker,
    }
    testTTS(ro).then((buffer) => {
      if (!buffer) {
        audioStream.destroy(new Error('没有把配置填写完整'))
      }
    })
    let headersSent = false
    audioStream.on('data', (chunk) => {
      if (
        (chunk.length === 3 && chunk.toString('utf8') === '404') ||
        (chunk.length === 5 && chunk.toString('utf8') === 'error')
      ) {
        audioStream.destroy(new Error('配置填写有误'))
        return
      }
      if (!headersSent) {
        res.writeHead(200, {
          'Transfer-Encoding': 'chunked',
          'Content-Type': 'audio/mp3',
        })
        headersSent = true
      }
      res.write(chunk)
    })
    audioStream.on('end', () => res.end())
    audioStream.once('error', (error) => {
      if (!headersSent) {
        res.status(400).send(error.message || 'Internal Server Error')
      } else {
        res.end()
      }
    })
  })

  // ── 兼容旧版单设备 API（内部映射 id=default） ───────────────────
  const defaultDeviceCwd = defaultBotCwd

  async function saveDefaultConfig(config: GuiConfig) {
    await fse.ensureDir(defaultDeviceCwd)
    return fs.writeFile(
      path.join(defaultDeviceCwd, 'migptgui.json'),
      JSON.stringify(config),
    )
  }

  app.get('/api/default', async (req, res) => {
    let migptConfig: GuiConfig | undefined
    try {
      migptConfig = JSON.parse(
        await fs.readFile(path.join(defaultDeviceCwd, 'migptgui.json'), 'utf-8'),
      )
    } catch {
      /* 不存在 */
    }
    res.json(migptConfig ? { config: migptConfig } : {})
  })

  app.put('/api/default', async (req, res) => {
    await saveDefaultConfig(req.body as GuiConfig)
    res.json({ success: true })
  })

  app.delete('/api/default', (req, res) => {
    Promise.all([
      fse.remove(path.join(defaultDeviceCwd, '.mi.json')),
      fse.remove(path.join(defaultDeviceCwd, '.bot.json')),
    ]).then(
      () => res.json({ success: true }),
      (err) => res.json({ success: false, error: err }),
    )
  })

  app.post('/api/default/start', async (req, res) => {
    const migptConfig = req.body as GuiConfig
    await saveDefaultConfig(migptConfig)
    if (
      migptConfig.config.speaker.tts === 'custom' &&
      migptConfig.gui &&
      migptConfig.gui.ttsProvider !== 'custom' &&
      migptConfig.tts
    ) {
      migptConfig.env.TTS_BASE_URL = `${_trimEnd(
        migptConfig.gui.publicURL || '',
        '/',
      )}/default/tts`
    }
    await run(
      'default',
      migptConfig as unknown as RunConfig,
      defaultDeviceCwd,
      (deviceId, line) => appendLog(deviceId, line),
    )
    res.json({ success: true })
  })

  app.post('/api/default/stop', async (req, res) => {
    await stop('default')
    res.json({ success: true })
  })

  app.get('/api/default/logs', async (req, res) => {
    const limit = Number(req.query.limit) || 100
    const buf = logBuffers.get('default') || []
    res.json({ logs: buf.slice(-limit) })
  })

  seedBuiltinVoice().catch(() => {})
  seedBuiltinModels().catch(() => {})
  migrateRooms().catch(() => {})
  seedDemoLogs().catch(() => {})
  app.listen(port, () => {
    console.log('端口：', port)
    console.log('登录认证：', isAuth ? '已启用' : '未启用')
    console.log('秘密路径：', '已启用')
    if (options?.open) {
      open(`http://localhost:${port}`)
    }
  })
}
