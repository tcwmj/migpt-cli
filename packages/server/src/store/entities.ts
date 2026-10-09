// ── 实体读取：settings / accounts / roles / services / models / rooms / devices ──
import path from 'node:path'
import fs from 'node:fs/promises'
import fse from 'fs-extra'
import { nanoid } from 'nanoid'
import {
  root,
  devicesRoot,
  settingsFile,
  accountsFile,
  rolesFile,
  thinkServicesFile,
  voiceServicesFile,
  speakerModelsFile,
  roomsFile,
  systemLogFile,
} from '../paths.js'
import {
  type Settings,
  type Account,
  type Role,
  type ThinkService,
  type VoiceService,
  type Room,
  type DeviceMeta,
  type SpeakerModel,
} from '../types.js'
import { logger, sysLogBuf } from '../logger.js'
import { readJson, writeJson } from './json.js'
import {
  accountListSchema,
  accountSchema,
  deviceMetaSchema,
  parseEntity,
  readJsonChecked,
  readJsonListChecked,
  roleListSchema,
  roleSchema,
  roomListSchema,
  roomSchema,
  settingsSchema,
  speakerModelSchema,
  thinkServiceListSchema,
  thinkServiceSchema,
  voiceServiceSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  getOverrides,
  mergeBuiltinModels,
  mergeBuiltinVoices,
} from './overrides.js'
import type { GuiConfig } from '@migptgui/options'

// 同名唯一校验：同一实体的实例名称全局唯一（忽略大小写与首尾空白）。
// 返回冲突提示文本，无冲突返回 null。
export function assertUniqueName<T extends { id: string; name?: string }>(
  list: T[],
  name: string | undefined,
  excludeId: string | undefined,
  label: string,
): string | null {
  const n = (name || '').trim()
  if (!n) return null
  const hit = list.find(
    (x) =>
      x.id !== excludeId &&
      (x.name || '').trim().toLowerCase() === n.toLowerCase(),
  )
  return hit ? `${label}「${n}」已存在，名称需唯一` : null
}

export function getSettings(): Promise<Settings> {
  return readJsonChecked(settingsFile, settingsSchema, '登录设置', {})
}

// ── 多云端账号：读取（含旧 settings.json 迁移）─────────────────
export async function getAccounts(): Promise<Account[]> {
  const accounts = await readJsonListChecked(
    accountsFile,
    accountSchema,
    '账号',
  )
  if (accounts.length > 0) return accounts
  // 兼容旧版本：settings.json → 迁移为第一个账号
  const old = await readJsonChecked(
    settingsFile,
    settingsSchema,
    '登录设置',
    {},
  )
  if (old.miUserId || old.passToken) {
    const account: Account = {
      id: nanoid(),
      name: '默认账号',
      miUserId: old.miUserId || '',
      miPassword: old.miPassword,
      passToken: old.passToken,
      createdAt: Date.now(),
    }
    await writeJsonChecked(accountsFile, [account], accountListSchema, '账号')
    return [account]
  }
  return []
}

// 按设备归属取账号；未指定或找不到时回退第一个账号
export async function getAccountById(
  id?: string,
): Promise<Account | undefined> {
  const accounts = await getAccounts()
  if (id) {
    const found = accounts.find((a) => a.id === id)
    if (found) return found
  }
  return accounts[0]
}

export async function getRoles(): Promise<Role[]> {
  return readJsonListChecked(rolesFile, roleSchema, '角色')
}

export async function getThinkServices(): Promise<ThinkService[]> {
  return readJsonListChecked(thinkServicesFile, thinkServiceSchema, '思考服务')
}

// 语音服务：内置语音源自代码 + 用户覆盖补丁，其后拼接用户自建语音。
export async function getVoiceServices(): Promise<VoiceService[]> {
  const [custom, ov] = await Promise.all([
    readJsonListChecked(voiceServicesFile, voiceServiceSchema, '语音服务'),
    getOverrides(),
  ])
  return mergeBuiltinVoices(custom, ov.voices)
}

// 型号：内置型号源自代码 + 用户覆盖补丁，其后拼接用户自建型号。
export async function getSpeakerModels(): Promise<SpeakerModel[]> {
  const [custom, ov] = await Promise.all([
    readJsonListChecked(speakerModelsFile, speakerModelSchema, '型号'),
    getOverrides(),
  ])
  return mergeBuiltinModels(custom, ov.models)
}

export async function getRooms(): Promise<Room[]> {
  return readJsonListChecked(roomsFile, roomSchema, '会话群')
}

/** 全局默认思考服务（未指定角色/设备引用时回退） */
export async function getDefaultThinkService(): Promise<
  ThinkService | undefined
> {
  const list = await getThinkServices()
  return list.find((t) => t.isDefault) ?? list[0]
}

/** 全局默认语音服务 */
export async function getDefaultVoiceService(): Promise<
  VoiceService | undefined
> {
  const list = await getVoiceServices()
  return list.find((v) => v.isDefault) ?? list[0]
}

export async function getDeviceMeta(
  id: string,
): Promise<DeviceMeta | undefined> {
  const raw = await readJson<unknown>(
    path.join(devicesRoot, id, 'meta.json'),
    undefined,
  )
  return parseEntity(raw, deviceMetaSchema, `设备 ${id}`)
}

export async function listDeviceMetas(): Promise<DeviceMeta[]> {
  let ids: string[]
  try {
    ids = await fs.readdir(devicesRoot)
  } catch {
    /* devices 目录不存在 */
    return []
  }
  // 并行读取各设备 meta（原先串行 await 在设备较多时线性放大延迟）
  const metas = await Promise.all(ids.map((id) => getDeviceMeta(id)))
  const out = metas.filter((m): m is DeviceMeta => !!m)
  out.sort((a, b) => a.createdAt - b.createdAt)
  return out
}

/** 按 id 或名称解析会话群 */
export async function getRoomByRef(ref?: string): Promise<Room | undefined> {
  if (!ref) return undefined
  const list = await getRooms()
  return list.find((r) => r.id === ref || r.name === ref)
}

/** 按 id 或名称解析型号（兼容旧数据：设备 speakerModel 可能存名称） */
export async function getSpeakerModelByRef(
  ref?: string,
): Promise<SpeakerModel | undefined> {
  if (!ref) return undefined
  const list = await getSpeakerModels()
  return list.find((m) => m.id === ref || m.name === ref)
}

// ── 实体写入：封装路径与 schema，路由层不再直接接触文件 ────────

export async function saveAccounts(list: Account[]): Promise<void> {
  await writeJsonChecked(accountsFile, list, accountListSchema, '账号')
}

export async function saveRoles(list: Role[]): Promise<void> {
  await writeJsonChecked(rolesFile, list, roleListSchema, '角色')
}

export async function saveRooms(list: Room[]): Promise<void> {
  await writeJsonChecked(roomsFile, list, roomListSchema, '会话群')
}

export async function saveThinkServices(list: ThinkService[]): Promise<void> {
  await writeJsonChecked(
    thinkServicesFile,
    list,
    thinkServiceListSchema,
    '思考服务',
  )
}

// ── 设备文件操作 ──────────────────────────────────────────────

/** 写入设备 meta.json（含 schema 校验） */
export async function saveDeviceMeta(
  id: string,
  meta: DeviceMeta,
): Promise<void> {
  await writeJsonChecked(
    path.join(devicesRoot, id, 'meta.json'),
    meta,
    deviceMetaSchema,
    '设备',
  )
}

/** 写入设备 migptgui.json（编译投影） */
export async function saveDeviceConfig(
  id: string,
  config: unknown,
): Promise<void> {
  await writeJson(path.join(devicesRoot, id, 'migptgui.json'), config)
}

/** 写入设备 .mi.json（账号凭据） */
export async function saveDeviceCredentials(
  id: string,
  miJson: unknown,
): Promise<void> {
  await writeJson(path.join(devicesRoot, id, '.mi.json'), miJson)
}

/** 删除设备目录 */
export async function removeDevice(id: string): Promise<void> {
  await fse.remove(path.join(devicesRoot, id))
}

// ── 设备配置读取（从 shared.ts 下沉）─────────────────────────

export async function loadDeviceConfig(
  id: string,
): Promise<GuiConfig | undefined> {
  const file =
    id === 'default'
      ? path.join(devicesRoot, '..', 'default', 'migptgui.json')
      : path.join(devicesRoot, id, 'migptgui.json')
  let raw: string
  try {
    raw = await fs.readFile(file, 'utf-8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn(
        `[loadDeviceConfig] 读取配置失败：${file} ${(e as Error).message}`,
      )
    }
    return undefined
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    logger.warn(
      `[loadDeviceConfig] 配置解析失败（已忽略）：${file} ${(e as Error).message}`,
    )
    return undefined
  }
}

// ── 系统日志读取 ──────────────────────────────────────────────
// 落盘按天轮转（system.<yyyyMMdd>.N.log），读取端按日期解析文件；
// 未指定日期时默认当天，无对应日期文件时回退旧版固定名 system.log（迁移期兼容）。

export const LOG_DATE_RE = /^\d{8}$/

const _pad2 = (n: number) => String(n).padStart(2, '0')

/** 日期键（yyyyMMdd，服务器本地日）：今天 */
export function todayLogDate(): string {
  const d = new Date()
  return `${d.getFullYear()}${_pad2(d.getMonth() + 1)}${_pad2(d.getDate())}`
}

/** 指定日期全部轮转文件的绝对路径（N 升序）；当天无文件时回退旧版 system.log */
async function _systemLogFilesFor(date: string): Promise<string[]> {
  const names = await fs.readdir(root).catch(() => [] as string[])
  const hits: { n: number; file: string }[] = []
  for (const name of names) {
    const m = name.match(/^system\.(\d{8})\.(\d+)\.log$/)
    if (m && m[1] === date)
      hits.push({ n: Number(m[2]), file: path.join(root, name) })
  }
  if (!hits.length) return [systemLogFile]
  return hits.sort((a, b) => a.n - b.n).map((h) => h.file)
}

/** 有日志落盘的全部日期（yyyyMMdd，降序），供面板日历置灰判断 */
export async function getSystemLogDates(): Promise<string[]> {
  const names = await fs.readdir(root).catch(() => [] as string[])
  const dates = new Set<string>()
  for (const name of names) {
    const m = name.match(/^system\.(\d{8})\.\d+\.log$/)
    if (m) dates.add(m[1])
  }
  return [...dates].sort().reverse()
}

/** 指定日期的日志文件（最大序号者）；未指定则取当天 */
export async function getActiveSystemLogFile(date?: string): Promise<string> {
  const files = await _systemLogFilesFor(date || todayLogDate())
  return files[files.length - 1]
}

/** 读取系统日志尾部 N 行（指定日期的活动文件，默认当天） */
export async function getSystemLogTail(
  lines: number,
  date?: string,
): Promise<string[]> {
  try {
    const all = (await fs.readFile(await getActiveSystemLogFile(date), 'utf8'))
      .split('\n')
      .filter(Boolean)
    return all.slice(-lines)
  } catch {
    return []
  }
}

/** 指定日期的日志总大小（字节，跨同日轮转文件累加） */
export async function getSystemLogSize(date?: string): Promise<number> {
  let total = 0
  for (const file of await _systemLogFilesFor(date || todayLogDate())) {
    try {
      total += (await fs.stat(file)).size
    } catch {
      /* 文件不存在时跳过 */
    }
  }
  return total
}

/** 指定日期的日志全文（同日多文件按序号升序拼接；历史按天文件在数据目录） */
export async function getSystemLogFull(date?: string): Promise<string> {
  const parts: string[] = []
  for (const file of await _systemLogFilesFor(date || todayLogDate())) {
    try {
      parts.push(await fs.readFile(file, 'utf8'))
    } catch {
      /* 文件不存在时跳过 */
    }
  }
  return parts.join('')
}

/** 日期范围（含端点、升序）各天尾部日志合并：每天至少取 200 行，
 *  总上限为 dates.length × 200 或 lines 两者取大值（≥800）；
 *  历史日期行附 `[yyyyMMdd] ` 前缀、当天实时行附 `[实时] ` 前缀，便于区分来源。 */
export async function getSystemLogTailsBetween(
  from: string,
  to: string,
  lines: number,
): Promise<string[]> {
  const dates = (await getSystemLogDates())
    .reverse()
    .filter((d) => d >= from && d <= to)
  // 保证当天一定包含在 dates 中（当天日志文件可能尚未轮转落盘，但内存缓冲中存在）
  const today = todayLogDate()
  if (today >= from && today <= to && !dates.includes(today)) {
    dates.push(today)
  }
  if (!dates.length) return []
  // 每天至少取 200 行，避免多天分摊后单天内容过少
  const perDay = Math.max(200, Math.ceil(lines / dates.length))
  // 总上限：各天 perDay 之和，至少 800 行
  const totalCap = Math.max(800, lines, dates.length * perDay)
  const out: string[] = []
  for (const d of dates) {
    let tail: string[]
    if (d === today) {
      tail = sysLogBuf.slice(-perDay)
      if (!tail.length) tail = await getSystemLogTail(perDay, d)
      tail = tail.map((l) => `[实时] ${l}`)
    } else {
      tail = (await getSystemLogTail(perDay, d)).map((l) => `[${d}] ${l}`)
    }
    out.push(...tail)
  }
  return out.slice(-totalCap)
}

/** 日期范围内（升序遍历）跨文件搜索日志行：q 大小写不敏感包含匹配；
 *  当天优先用内存环形缓冲（实时），历史日期读落盘文件；
 *  命中行附 `[日期] ` 前缀便于区分来源；总数超 limit 时截断（保尾部最新）。 */
export async function searchSystemLogs(
  from: string,
  to: string,
  q: string,
  limit: number,
): Promise<string[]> {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  const today = todayLogDate()
  let dates = (await getSystemLogDates()).reverse() // 升序遍历
  // 保证当天一定包含（当天日志文件可能尚未轮转落盘，但内存缓冲中存在）
  if (today >= from && today <= to && !dates.includes(today)) {
    dates = [...dates, today]
  }
  const out: string[] = []
  for (const d of dates) {
    if (d < from || d > to) continue
    let lines: string[]
    if (d === today) {
      // 当天：内存缓冲（含未落盘的最新行），不足再回退文件
      lines = sysLogBuf.filter((l) => l.toLowerCase().includes(needle))
      if (!lines.length) {
        lines = (await getSystemLogFull(d))
          .split('\n')
          .filter((l) => l.toLowerCase().includes(needle))
      }
      lines = lines.map((l) => `[实时] ${l}`)
    } else {
      lines = (await getSystemLogFull(d))
        .split('\n')
        .filter((l) => l.trim() && l.toLowerCase().includes(needle))
        .map((l) => `[${d}] ${l}`)
    }
    out.push(...lines)
    if (out.length >= limit) return out.slice(-limit)
  }
  return out
}

// 供应商 → Base URL 映射：单一事实源在 @migptgui/contracts（经 ./types.js 转发）
export { PROVIDER_BASE_URLS } from '../types.js'
