// ── 数据导出 / 导入 / 备份 ─────────────────────────────────────
// 导出：把全部可写数据打包为单个 JSON（可脱敏，便于分享 / 迁移 / 留存）；
// 导入：按 id 覆盖同项、补齐缺失项（不删除本机多余项），脱敏包按 id 保留本机既有凭据；
// 备份：定时把「未脱敏」全量包写入 backupsRoot，按数量滚动保留。
// 说明：只覆盖用户数据（账号 / 角色 / 服务 / 型号 / 会话 / 设备 / 覆盖补丁），
// 不含登录凭据 auth.json 与运行日志 system.log。
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  accountsFile,
  backupsRoot,
  devicesRoot,
  overridesFile,
  robotsFile,
  conversationsFile,
  credentialsFile,
  speakerModelsFile,
  modelsFile,
  voicesFile,
} from '../paths.js'
import type {
  Account,
  Device,
  Robot,
  Conversation,
  Credential,
  SpeakerModel,
  Model,
  Voice,
} from '../types.js'
import { logger } from '../logger.js'
import {
  redactAccount,
  redactDevice,
  redactCredential,
  redactModel,
  redactVoice,
} from '../redact.js'
import { writeJson } from './json.js'
import {
  accountSchema,
  accountListSchema,
  DataValidationError,
  deviceSchema,
  overridesSchema,
  readJsonChecked,
  readJsonListChecked,
  robotListSchema,
  robotSchema,
  conversationListSchema,
  conversationSchema,
  credentialSchema,
  speakerModelListSchema,
  speakerModelSchema,
  modelListSchema,
  modelSchema,
  voiceListSchema,
  voiceSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  getOverrides,
  splitBuiltinEntities,
  splitBuiltinRobotsConversations,
  type Overrides,
} from './overrides.js'
import { listDevices } from './entities.js'
import { getDataVersion } from './migrations.js'
import { assertSafeId } from '../errors.js'

export const BACKUP_FORMAT = 'migptgui-backup'
export const BACKUP_FORMAT_VERSION = 1

/** 备份包内承载的全量用户数据 */
export interface BackupData {
  credentials: Credential
  accounts: Account[]
  robots: Robot[]
  models: Model[]
  voices: Voice[]
  speakerModels: SpeakerModel[]
  conversations: Conversation[]
  devices: Device[]
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
export const SECRET_KEYS = new Set([
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
    credentials,
    accounts,
    robots,
    models,
    voices,
    speakerModels,
    conversations,
    overrides,
  ] = await Promise.all([
    readJsonChecked(credentialsFile, credentialSchema, '小米凭据', {}),
    readJsonListChecked(accountsFile, accountSchema, '账号'),
    readJsonListChecked(robotsFile, robotSchema, '角色'),
    readJsonListChecked(modelsFile, modelSchema, '模型'),
    readJsonListChecked(voicesFile, voiceSchema, '语音'),
    readJsonListChecked(speakerModelsFile, speakerModelSchema, '型号'),
    readJsonListChecked(conversationsFile, conversationSchema, '会话'),
    getOverrides(),
  ])
  const devices = await listDevices()
  return {
    credentials,
    accounts,
    robots,
    models,
    voices,
    speakerModels,
    conversations,
    devices,
    overrides,
  }
}

function redactData(data: BackupData): BackupData {
  return {
    credentials: redactCredential(data.credentials),
    accounts: data.accounts.map(redactAccount),
    robots: data.robots,
    models: data.models.map(redactModel),
    voices: data.voices.map(redactVoice),
    speakerModels: data.speakerModels,
    conversations: data.conversations,
    devices: data.devices.map(redactDevice),
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
  robots: number
  models: number
  voices: number
  speakerModels: number
  conversations: number
  devices: number
}

/** 对象内逐条改键（仅旧键存在且新键缺失时写入） */
function moveKey(
  obj: Record<string, unknown>,
  from: string,
  to: string,
): boolean {
  if (obj[from] === undefined || obj[to] !== undefined) return false
  obj[to] = obj[from]
  delete obj[from]
  return true
}

/** 实体分组键的旧→新对照表 */
const LEGACY_ENTITY_KEYS: Record<string, string> = {
  settings: 'credentials',
  thinkServices: 'models',
  voiceServices: 'voices',
  rooms: 'conversations',
  roles: 'robots',
}

/** 各实体内补丁/记录的字段改名对照表 */
const LEGACY_FIELD_RENAMES: Record<
  string,
  readonly (readonly [string, string])[]
> = {
  robots: [['roomRef', 'conversationId']],
  voices: [['voiceId', 'timbreId']],
  speakerModels: [
    ['did', 'didPrefix'],
    ['desc', 'description'],
    ['consecutive', 'continuousDialogue'],
  ],
  devices: [
    ['roleId', 'robotId'],
    ['roomRef', 'conversationRef'],
    ['roomName', 'conversationName'],
    ['roomDescription', 'conversationDescription'],
  ],
}

/** 对一组记录逐条批量改键（原地修改并返回同一数组） */
function renameRows<T>(rows: T[] | undefined, group: string): T[] {
  const pairs = LEGACY_FIELD_RENAMES[group]
  const list = rows ?? []
  if (!pairs) return list
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    for (const [from, to] of pairs) moveKey(item, from, to)
  }
  return list
}

/** overrides：分组键改名 + 各分组内补丁字段名改名 */
function normalizeLegacyOverrides(ovIn: Overrides | undefined): Overrides {
  const ov: Record<string, unknown> = { ...(ovIn ?? {}) }
  for (const [from, to] of Object.entries(LEGACY_ENTITY_KEYS)) {
    if (ov[from] === undefined) continue
    if (ov[to] === undefined) ov[to] = ov[from]
    delete ov[from]
  }
  for (const [group, pairs] of Object.entries(LEGACY_FIELD_RENAMES)) {
    const bag = ov[group] as Record<string, Record<string, unknown>> | undefined
    if (!bag || typeof bag !== 'object') continue
    for (const patch of Object.values(bag)) {
      if (!patch || typeof patch !== 'object') continue
      for (const [from, to] of pairs) moveKey(patch, from, to)
    }
  }
  return ov as Overrides
}

/**
 * 旧包兼容归一化：历次实体更名之前导出的包仍用旧键
 * （role→robot、ThinkService→Model、VoiceService→Voice、Room→Conversation、
 * Settings→Credential，以及 roomRef/voiceId/did/desc/consecutive 等字段改名）。
 * 导入前统一转为新键，避免旧包导入失败或静默丢数据；新包（无旧键）为 no-op。
 */
function normalizeLegacyData(d: BackupData): BackupData {
  const legacy = d as unknown as Record<string, unknown>
  const out = { ...d } as unknown as Record<string, unknown>
  // ── 实体分组键 ────────────────────────────────────────────────
  for (const [from, to] of Object.entries(LEGACY_ENTITY_KEYS)) {
    if (out[to] === undefined && legacy[from] !== undefined) {
      out[to] = legacy[from]
    }
  }
  // ── 各实体内字段改名 ──────────────────────────────────────────
  for (const group of Object.keys(LEGACY_FIELD_RENAMES)) {
    if (out[group] === undefined) continue
    out[group] = renameRows(
      out[group] as Record<string, unknown>[] | undefined,
      group,
    )
  }
  out.overrides = normalizeLegacyOverrides(d.overrides)
  return out as unknown as BackupData
}

/**
 * 导入备份包：同 id 覆盖、缺失补齐，不删除本机多余项。
 * 脱敏包会按 id 保留本机既有凭据（导出时被抹除，导入时不应误清空）。
 */
export async function applyBackup(raw: unknown): Promise<ImportResult> {
  assertBundle(raw)
  const bundle = raw
  const d = normalizeLegacyData(bundle.data)
  const { robots: robotList, devices: deviceList, overrides: overridesData } = d

  const [prevAccounts, prevModels, prevDevices, prevCredential] =
    await Promise.all([
      readJsonListChecked(accountsFile, accountSchema, '账号'),
      readJsonListChecked(modelsFile, modelSchema, '模型'),
      listDevices(),
      readJsonChecked(credentialsFile, credentialSchema, '小米凭据', {}),
    ])

  // 脱敏包按 id 保留本机凭据；未脱敏包以内容为准
  const keep = <T extends { id: string }>(
    incoming: T[],
    existing: T[],
    keys: readonly (keyof T)[],
  ): T[] => (bundle.redacted ? keepSecrets(incoming, existing, keys) : incoming)
  const accounts = keep(d.accounts ?? [], prevAccounts, [
    'passToken',
    'miPassword',
  ])
  const models = keep(d.models ?? [], prevModels, ['apiKey'])
  const devices = keep(deviceList, prevDevices, ['ttsSecret'])
  // 旧版 credentials 无前端消费者；脱敏导入只更新 miUserId，保留本机既有凭据
  const credentials: Credential = bundle.redacted
    ? {
        ...prevCredential,
        miUserId: d.credentials?.miUserId ?? prevCredential.miUserId,
      }
    : (d.credentials ?? {})

  await Promise.all([
    writeJsonChecked(
      credentialsFile,
      credentials,
      credentialSchema,
      '小米凭据',
    ),
    writeJsonChecked(accountsFile, accounts, accountListSchema, '账号'),
    writeJsonChecked(robotsFile, robotList, robotListSchema, '角色'),
    writeJsonChecked(modelsFile, models, modelListSchema, '模型'),
    writeJsonChecked(voicesFile, d.voices ?? [], voiceListSchema, '语音'),
    writeJsonChecked(
      speakerModelsFile,
      d.speakerModels ?? [],
      speakerModelListSchema,
      '型号',
    ),
    writeJsonChecked(
      conversationsFile,
      d.conversations ?? [],
      conversationListSchema,
      '会话',
    ),
    // 覆盖补丁（内置实体的用户改动）随包往返：不导入会静默丢失用户对内置项的修改。
    // 脱敏包的补丁已被 scrubSecretsDeep 抹除敏感键，导入后用户改动中的凭据字段同样缺失，
    // 与实体凭据「按 id 保留本机既有值」策略不同，补丁为字段级差异、无法按位补齐，
    // 以包内容为准整体覆盖（重置能力在，随时可回归代码默认）。
    writeJsonChecked(overridesFile, overridesData, overridesSchema, '覆盖补丁'),
  ])
  await Promise.all(
    devices.map((m) =>
      writeJsonChecked(
        path.join(devicesRoot, assertSafeId(m.id), 'meta.json'),
        m,
        deviceSchema,
        `设备 ${assertSafeId(m.id)}`,
      ),
    ),
  )

  // 旧版包可能把内置实体直接混在实体文件里：导入后跑一次「内置/自建分离」，
  // 把这些内置项转为覆盖补丁（合并进刚导入的 overrides），避免读取层
  // 按内置 id 过滤时静默丢失用户对内置项的改动。迁移幂等，新包为无操作。
  await splitBuiltinEntities()
  await splitBuiltinRobotsConversations()

  logger.info(
    `导入备份：账号 ${accounts.length}、角色 ${robotList.length}、模型 ${models.length}、` +
      `语音 ${(d.voices ?? []).length}、型号 ${(d.speakerModels ?? []).length}、` +
      `会话 ${(d.conversations ?? []).length}、设备 ${devices.length}${bundle.redacted ? '（脱敏包，保留本机凭据）' : ''}`,
  )

  return {
    accounts: accounts.length,
    robots: robotList.length,
    models: models.length,
    voices: (d.voices ?? []).length,
    speakerModels: (d.speakerModels ?? []).length,
    conversations: (d.conversations ?? []).length,
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
