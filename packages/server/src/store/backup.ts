// ── 数据导出 / 导入 / 备份 ─────────────────────────────────────
// 导出：把全部可写数据打包为单个 JSON（可脱敏，便于分享 / 迁移 / 留存）；
// 导入：按 id 覆盖同项、补齐缺失项（不删除本机多余项），脱敏包按 id 保留本机既有凭据；
// 备份：定时把「未脱敏」全量包写入 backupsRoot，按数量滚动保留。
// 说明：只覆盖用户数据（账号 / 角色 / 服务 / 型号 / 会话群 / 设备 / 覆盖补丁），
// 不含登录凭据 auth.json 与运行日志 system.log。
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  accountsFile,
  backupsRoot,
  devicesRoot,
  rolesFile,
  roomsFile,
  settingsFile,
  speakerModelsFile,
  thinkServicesFile,
  voiceServicesFile,
} from '../paths.js'
import type {
  Account,
  DeviceMeta,
  Role,
  Room,
  Settings,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from '../types.js'
import { logger } from '../logger.js'
import {
  redactAccount,
  redactDeviceMeta,
  redactSettings,
  redactThinkService,
  redactVoiceService,
} from '../redact.js'
import { writeJson } from './json.js'
import {
  accountSchema,
  accountListSchema,
  DataValidationError,
  deviceMetaSchema,
  readJsonChecked,
  readJsonListChecked,
  roleListSchema,
  roleSchema,
  roomListSchema,
  roomSchema,
  settingsSchema,
  speakerModelListSchema,
  speakerModelSchema,
  thinkServiceListSchema,
  thinkServiceSchema,
  voiceServiceListSchema,
  voiceServiceSchema,
  writeJsonChecked,
} from './schemas.js'
import { getOverrides, type Overrides } from './overrides.js'
import { listDeviceMetas } from './entities.js'
import { getDataVersion } from './migrations.js'

export const BACKUP_FORMAT = 'migptgui-backup'
export const BACKUP_FORMAT_VERSION = 1

/** 备份包内承载的全量用户数据 */
export interface BackupData {
  settings: Settings
  accounts: Account[]
  roles: Role[]
  thinkServices: ThinkService[]
  voiceServices: VoiceService[]
  speakerModels: SpeakerModel[]
  rooms: Room[]
  devices: DeviceMeta[]
  overrides: Overrides
}

export interface BackupBundle {
  format: typeof BACKUP_FORMAT
  /** 包格式版本（与数据结构版本 dataVersion 区分：前者管包结构，后者管数据迁移） */
  formatVersion: number
  exportedAt: number
  /** 导出时的数据结构版本，供导入方判断兼容性 */
  dataVersion: number
  /** 是否已脱敏：脱敏包不含明文凭据，导入时按 id 保留本机既有凭据 */
  redacted: boolean
  data: BackupData
}

/** 覆盖补丁中需抹除的敏感键（深层清理，避免内置语音的 tts 令牌随包外泄） */
const SECRET_KEYS = new Set([
  'passToken',
  'miPassword',
  'apiKey',
  'ttsSecret',
  'trustedToken',
  'accessToken',
  'password',
  'token',
])

/** 递归删除敏感键（用于覆盖补丁等结构不定的对象） */
function scrubSecretsDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubSecretsDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.has(k)) continue
      out[k] = scrubSecretsDeep(v)
    }
    return out
  }
  return value
}

/** 采集全部可写数据（未脱敏） */
export async function collectData(): Promise<BackupData> {
  const [
    settings,
    accounts,
    roles,
    thinkServices,
    voiceServices,
    speakerModels,
    rooms,
    overrides,
  ] = await Promise.all([
    readJsonChecked(settingsFile, settingsSchema, '登录设置', {}),
    readJsonListChecked(accountsFile, accountSchema, '账号'),
    readJsonListChecked(rolesFile, roleSchema, '角色'),
    readJsonListChecked(thinkServicesFile, thinkServiceSchema, '思考服务'),
    readJsonListChecked(voiceServicesFile, voiceServiceSchema, '语音服务'),
    readJsonListChecked(speakerModelsFile, speakerModelSchema, '型号'),
    readJsonListChecked(roomsFile, roomSchema, '会话群'),
    getOverrides(),
  ])
  const devices = await listDeviceMetas()
  return {
    settings,
    accounts,
    roles,
    thinkServices,
    voiceServices,
    speakerModels,
    rooms,
    devices,
    overrides,
  }
}

function redactData(data: BackupData): BackupData {
  return {
    settings: redactSettings(data.settings),
    accounts: data.accounts.map(redactAccount),
    roles: data.roles,
    thinkServices: data.thinkServices.map(redactThinkService),
    voiceServices: data.voiceServices.map(redactVoiceService),
    speakerModels: data.speakerModels,
    rooms: data.rooms,
    devices: data.devices.map(redactDeviceMeta),
    overrides: scrubSecretsDeep(data.overrides) as Overrides,
  }
}

/** 构建导出包；redacted=true 时抹除全部明文凭据 */
export async function buildBundle(redacted: boolean): Promise<BackupBundle> {
  const data = await collectData()
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    dataVersion: await getDataVersion(),
    redacted,
    data: redacted ? redactData(data) : data,
  }
}

/** 校验包结构与版本（不合法抛 DataValidationError，路由层转 400） */
export function assertBundle(raw: unknown): asserts raw is BackupBundle {
  const b = raw as Partial<BackupBundle> | null
  if (!b || typeof b !== 'object')
    throw new DataValidationError('导入内容不是合法的备份包')
  if (b.format !== BACKUP_FORMAT)
    throw new DataValidationError(`备份包格式不匹配（期望 ${BACKUP_FORMAT}）`)
  if (
    typeof b.formatVersion !== 'number' ||
    b.formatVersion > BACKUP_FORMAT_VERSION
  )
    throw new DataValidationError('备份包版本过高，请升级服务后再导入')
  if (!b.data || typeof b.data !== 'object')
    throw new DataValidationError('备份包缺少 data 字段')
}

/** 脱敏包导入时，按 id 用本机既有值补齐被抹除的凭据字段 */
function keepSecrets<T extends { id: string }>(
  incoming: T[],
  existing: T[],
  keys: readonly (keyof T)[],
): T[] {
  const byId = new Map(existing.map((e) => [e.id, e]))
  return incoming.map((item) => {
    const prev = byId.get(item.id)
    if (!prev) return item
    const merged = { ...item }
    for (const k of keys) if (!merged[k]) merged[k] = prev[k]
    return merged
  })
}

export interface ImportResult {
  accounts: number
  roles: number
  thinkServices: number
  voiceServices: number
  speakerModels: number
  rooms: number
  devices: number
}

/**
 * 导入备份包：同 id 覆盖、缺失补齐，不删除本机多余项。
 * 脱敏包会按 id 保留本机既有凭据（导出时被抹除，导入时不应误清空）。
 */
export async function applyBackup(raw: unknown): Promise<ImportResult> {
  assertBundle(raw)
  const bundle = raw
  const d = bundle.data

  const [prevAccounts, prevThinks, prevDevices, prevSettings] =
    await Promise.all([
      readJsonListChecked(accountsFile, accountSchema, '账号'),
      readJsonListChecked(thinkServicesFile, thinkServiceSchema, '思考服务'),
      listDeviceMetas(),
      readJsonChecked(settingsFile, settingsSchema, '登录设置', {}),
    ])

  const accounts = bundle.redacted
    ? keepSecrets(d.accounts ?? [], prevAccounts, ['passToken', 'miPassword'])
    : (d.accounts ?? [])
  const thinkServices = bundle.redacted
    ? keepSecrets(d.thinkServices ?? [], prevThinks, ['apiKey'])
    : (d.thinkServices ?? [])
  const devices = bundle.redacted
    ? keepSecrets(d.devices ?? [], prevDevices, ['ttsSecret'])
    : (d.devices ?? [])
  // 旧版 settings 无前端消费者；脱敏导入只更新 miUserId，保留本机既有凭据
  const settings: Settings = bundle.redacted
    ? {
        ...prevSettings,
        miUserId: d.settings?.miUserId ?? prevSettings.miUserId,
      }
    : (d.settings ?? {})

  await Promise.all([
    writeJsonChecked(settingsFile, settings, settingsSchema, '登录设置'),
    writeJsonChecked(accountsFile, accounts, accountListSchema, '账号'),
    writeJsonChecked(rolesFile, d.roles ?? [], roleListSchema, '角色'),
    writeJsonChecked(
      thinkServicesFile,
      thinkServices,
      thinkServiceListSchema,
      '思考服务',
    ),
    writeJsonChecked(
      voiceServicesFile,
      d.voiceServices ?? [],
      voiceServiceListSchema,
      '语音服务',
    ),
    writeJsonChecked(
      speakerModelsFile,
      d.speakerModels ?? [],
      speakerModelListSchema,
      '型号',
    ),
    writeJsonChecked(roomsFile, d.rooms ?? [], roomListSchema, '会话群'),
  ])
  await Promise.all(
    devices.map((m) =>
      writeJsonChecked(
        path.join(devicesRoot, m.id, 'meta.json'),
        m,
        deviceMetaSchema,
        `设备 ${m.id}`,
      ),
    ),
  )

  logger.info(
    `导入备份：账号 ${accounts.length}、角色 ${(d.roles ?? []).length}、思考服务 ${thinkServices.length}、` +
      `语音 ${(d.voiceServices ?? []).length}、型号 ${(d.speakerModels ?? []).length}、` +
      `会话群 ${(d.rooms ?? []).length}、设备 ${devices.length}${bundle.redacted ? '（脱敏包，保留本机凭据）' : ''}`,
  )

  return {
    accounts: accounts.length,
    roles: (d.roles ?? []).length,
    thinkServices: thinkServices.length,
    voiceServices: (d.voiceServices ?? []).length,
    speakerModels: (d.speakerModels ?? []).length,
    rooms: (d.rooms ?? []).length,
    devices: devices.length,
  }
}

export interface BackupFileInfo {
  name: string
  size: number
  mtimeMs: number
}

const BACKUP_FILE_RE = /^backup-.*\.json$/

function backupStamp(at = new Date()): string {
  return at.toISOString().replace(/[:.]/g, '-')
}

/** 列出备份目录中的备份文件（按时间倒序，最新在前） */
export async function listBackups(): Promise<BackupFileInfo[]> {
  let names: string[]
  try {
    names = await fs.readdir(backupsRoot)
  } catch {
    return []
  }
  const out: BackupFileInfo[] = []
  for (const name of names) {
    if (!BACKUP_FILE_RE.test(name)) continue
    try {
      const st = await fs.stat(path.join(backupsRoot, name))
      out.push({ name, size: st.size, mtimeMs: st.mtimeMs })
    } catch {
      /* 竞态：读取时被删除，跳过 */
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return out
}

/** 只保留最新 keep 份备份，删除其余（keep<=0 表示不清理） */
async function pruneBackups(keep: number): Promise<void> {
  if (keep <= 0) return
  const files = await listBackups()
  await Promise.all(
    files
      .slice(keep)
      .map((f) =>
        fs
          .rm(path.join(backupsRoot, f.name), { force: true })
          .catch((err) => logger.warn({ err }, `清理旧备份失败：${f.name}`)),
      ),
  )
}

/** 生成不与既有文件冲突的备份路径（同一毫秒内多次备份时追加序号） */
async function uniqueBackupPath(): Promise<string> {
  const base = `backup-${backupStamp()}`
  let file = path.join(backupsRoot, `${base}.json`)
  for (let i = 1; ; i++) {
    try {
      await fs.access(file)
      file = path.join(backupsRoot, `${base}-${i}.json`)
    } catch {
      return file
    }
  }
}

/** 立即生成一份完整备份（未脱敏）并写入 backupsRoot，返回文件路径 */
export async function createBackupFile(keep = 0): Promise<string> {
  const bundle = await buildBundle(false)
  const file = await uniqueBackupPath()
  await writeJson(file, bundle)
  await pruneBackups(keep)
  logger.info(`已生成数据备份：${file}`)
  return file
}

export interface BackupScheduleOptions {
  /** 备份间隔（毫秒）；<=0 表示不启用定时备份 */
  intervalMs: number
  /** 保留的备份份数 */
  keep: number
}

/**
 * 启动定时备份；返回停止函数。定时器 unref，不阻止进程退出。
 * 单次失败只记日志，不影响后续周期。
 */
export function startBackupScheduler(opts: BackupScheduleOptions): () => void {
  if (opts.intervalMs <= 0) return () => {}
  const timer = setInterval(() => {
    createBackupFile(opts.keep).catch((err) =>
      logger.error({ err }, '定时备份失败'),
    )
  }, opts.intervalMs)
  timer.unref()
  logger.info(
    `定时备份已启用：每 ${Math.round(opts.intervalMs / 3600000)} 小时一次，保留 ${opts.keep} 份`,
  )
  return () => clearInterval(timer)
}
