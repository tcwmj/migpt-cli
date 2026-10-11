// ── 数据版本与迁移框架 ─────────────────────────────────────────
// 数据结构发生变更时：把 DATA_VERSION +1，并在 migrations 末尾追加一条
// { version, description, up }。启动时 runMigrations() 只执行 version 大于
// 已存版本的步骤，逐条执行并落盘进度，因此可安全重入、可中断续跑。
import path from 'node:path'
import fs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import { logger } from '../logger.js'
import {
  credentialsFile,
  dataVersionFile,
  devicesRoot,
  modelsFile,
  overridesFile,
  conversationsFile,
  robotsFile,
  root,
  speakerModelsFile,
  voicesFile,
} from '../paths.js'
import type { Device } from '../types.js'
import { readJson, writeJson } from './json.js'
import {
  deviceSchema,
  robotListSchema,
  conversationListSchema,
  versionFileSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  getCredentials,
  getRobots,
  getConversations,
  getModels,
  listDevices,
  saveDevice,
  saveModels,
} from './entities.js'
import {
  saveRobots,
  splitBuiltinEntities,
  splitBuiltinRobotsConversations,
} from './overrides.js'

export interface Migration {
  /** 目标版本号（从 1 起连续递增，不允许空洞） */
  version: number
  /** 变更说明（写入日志，便于排查升级问题） */
  description: string
  /** 升级动作；约定必须幂等，重复执行不产生副作用 */
  up: () => Promise<void>
}

/** 当前数据结构版本：新增迁移时同步 +1 */
export const DATA_VERSION = 7

/** 迁移：旧版设备会话字段 → Conversation 独立实体（幂等；同名归并，多设备共用） */
export async function migrateConversations(): Promise<void> {
  const metas = await listDevices()
  const conversations = await getConversations()
  let changed = false
  for (const meta of metas) {
    if (!meta.conversationName || meta.conversationRef) continue
    let conversation = conversations.find(
      (r) => r.name === meta.conversationName,
    )
    if (!conversation) {
      conversation = {
        id: nanoid(8),
        name: meta.conversationName,
        description: meta.conversationDescription,
        createdAt: Date.now(),
      }
      conversations.push(conversation)
    }
    const nextMeta: Device = { ...meta, conversationRef: conversation.id }
    delete nextMeta.conversationName
    delete nextMeta.conversationDescription
    await writeJsonChecked(
      path.join(devicesRoot, meta.id, 'meta.json'),
      nextMeta,
      deviceSchema,
      '设备',
    )
    changed = true
  }
  if (changed)
    await writeJsonChecked(
      conversationsFile,
      conversations,
      conversationListSchema,
      '会话',
    )
}

/**
 * 迁移 v3：Token 用量追踪 + 模型 Failover + 设备字段精简
 *
 * 1. 角色：旧 modelId → modelIds: [modelId]（仅当 modelIds 不存在时）
 * 2. 设备：移除 modelId / voiceOverrideId 字段（设备不再直接绑定）
 * 3. Model / Voice：补全 token 用量字段默认值（0）
 */
export async function migrateTokenUsageFailover(): Promise<void> {
  // ── 1. 角色迁移：modelId → modelIds ────────────────
  const robots = await getRobots()
  let robotsChanged = false
  for (const robot of robots) {
    if (robot.modelId && !robot.modelIds) {
      robot.modelIds = [robot.modelId]
      delete robot.modelId
      robotsChanged = true
    }
  }
  if (robotsChanged) await saveRobots(robots)

  // ── 2. 设备迁移：移除 modelId / voiceOverrideId ───────────
  const metas = await listDevices()
  for (const meta of metas) {
    const raw = meta as unknown as Record<string, unknown>
    if (raw.modelId !== undefined || raw.voiceOverrideId !== undefined) {
      delete raw.modelId
      delete raw.voiceOverrideId
      await saveDevice(meta.id, meta)
    }
  }

  // ── 3. Model：补全 token 用量默认值 ─────────
  // Voice 不消耗 token，已移除其 token 字段（Voice.token* 为废弃数据，读取时被 schema 忽略）
  const models = await getModels()
  let modelChanged = false
  for (const svc of models) {
    if (svc.inputTokensUsed == null) {
      svc.inputTokensUsed = 0
      modelChanged = true
    }
    if (svc.outputTokensUsed == null) {
      svc.outputTokensUsed = 0
      modelChanged = true
    }
    if (svc.totalTokensUsed == null) {
      svc.totalTokensUsed = 0
      modelChanged = true
    }
  }
  if (modelChanged) await saveModels(models)
}

/**
 * 迁移 v4：对话角色必填 + 移除内置默认值回退
 *
 * 1. 角色：对话行为字段（checkInterval / checkTTSStatusAfter / exitKeepAliveAfter）
 *    由可选改为必填——旧角色缺值时回填历史内置默认（1000 / 3000 / 30），
 *    避免 robotSchema 校验失败被跳过导致角色丢失。
 * 2. 设备：robotId 由可选改为必填——存量无角色设备归属到第一个角色；
 *    若无任何角色，则跳过（无法凭空造角色，交由用户补建后自行绑定）。
 *
 * 注意：必须直接读原始 robots.json（不经 robotSchema），否则缺失新必填字段的旧角色
 * 会在读取阶段就被过滤掉（parseEntityList 逐条跳过），迁移读不到目标。
 */
export async function migrateRobotRequired(): Promise<void> {
  // ── 1. 角色：回填数值字段 + 防御性补齐（读原始 JSON，绕过 schema 过滤）──
  // 注意：新 robotSchema 收紧后，缺数值字段的旧角色会在 getRobots() 阶段被跳过，
  // 导致 v3 的 modelId → modelIds 转换漏做——此处对原始数据补做。
  const rawRobots = await readJson<Record<string, unknown>[]>(robotsFile, [])
  const ARRAY_FIELDS = [
    'callAIKeywords',
    'wakeUpKeywords',
    'exitKeywords',
    'onEnterAI',
    'onExitAI',
    'onAIAsking',
    'onAIReplied',
    'onAIError',
  ] as const
  let robotsChanged = false
  for (const robot of rawRobots) {
    if (robot.checkInterval == null) {
      robot.checkInterval = 1000
      robotsChanged = true
    }
    if (robot.checkTTSStatusAfter == null) {
      robot.checkTTSStatusAfter = 3000
      robotsChanged = true
    }
    if (robot.exitKeepAliveAfter == null) {
      robot.exitKeepAliveAfter = 30
      robotsChanged = true
    }
    // 补齐缺失的字符串数组字段（极旧数据可能没有）
    for (const f of ARRAY_FIELDS) {
      if (!Array.isArray(robot[f])) {
        robot[f] = []
        robotsChanged = true
      }
    }
    if (typeof robot.profile !== 'string') {
      robot.profile = ''
      robotsChanged = true
    }
    // 补做 v3 的 modelId → modelIds 转换（旧角色可能被 v3 跳过）
    if (robot.modelId && !robot.modelIds) {
      robot.modelIds = [robot.modelId]
      delete robot.modelId
      robotsChanged = true
    }
  }
  if (robotsChanged) {
    await writeJsonChecked(robotsFile, rawRobots, robotListSchema, '角色')
  }

  // ── 2. 设备：无 robotId 的归属到第一个角色 ─────────────────────────
  const firstRobotId = (rawRobots[0] as { id?: string } | undefined)?.id
  if (!firstRobotId) return
  let ids: string[]
  try {
    ids = await fs.readdir(devicesRoot)
  } catch {
    return
  }
  for (const id of ids) {
    const file = path.join(devicesRoot, id, 'meta.json')
    const meta = await readJson<Record<string, unknown>>(file, {})
    if (!meta || meta.robotId) continue
    meta.robotId = firstRobotId
    await writeJsonChecked(file, meta, deviceSchema, '设备')
    logger.info(`数据迁移 v4：设备 ${id} 补全对话角色 ${firstRobotId}`)
  }
}

/**
 * 实体更名迁移：对话角色 role → robot（硬切，不留 roles.json 副本）。
 *
 * 1. `roles.json` → `robots.json`（整文件改名；robots.json 已存在时保留新文件、删除旧文件）
 * 2. 设备 meta.json：`roleId` 键 → `robotId`（直接读原始文件，不经 deviceSchema——
 *    旧键数据在新 schema 下会解析失败被跳过，必须绕过校验层改键）
 * 3. `overrides.json`：`roles` 补丁分组键 → `robots`
 *
 * 该步骤与数据版本号解耦：历史迁移（v4/v5）在本版代码中已指向 robots 命名，
 * 只有先完成改名才能保证任意存量版本下的读写一致。函数幂等——三个旧键
 * （roles.json / meta.roleId / overrides.roles）全部不存在时为纯 no-op（仅几次 fs 检查）。
 */
export async function migrateRoleToRobot(): Promise<void> {
  // ── 1. roles.json → robots.json ────────────────────────────────
  const legacyFile = path.join(root, 'roles.json')
  try {
    await fs.access(legacyFile)
    try {
      // robots.json 已存在（改名已完成但旧文件因中断残留）：旧文件视为垃圾删除
      await fs.access(robotsFile)
      await fs.rm(legacyFile, { force: true })
      logger.info(
        '数据迁移（role→robot）：发现残留 roles.json，已删除（robots.json 为准）',
      )
    } catch {
      await fs.rename(legacyFile, robotsFile)
      logger.info('数据迁移（role→robot）：roles.json 已改名为 robots.json')
    }
  } catch {
    /* roles.json 不存在：改名已完成或全新安装 */
  }

  // ── 2. 设备 meta.json：roleId → robotId ────────────────────────
  const ids = await fs.readdir(devicesRoot).catch(() => [] as string[])
  for (const id of ids) {
    const file = path.join(devicesRoot, id, 'meta.json')
    const meta = await readJson<Record<string, unknown> | null>(file, null)
    if (!meta || typeof meta !== 'object' || meta.roleId === undefined) continue
    if (meta.robotId === undefined) meta.robotId = meta.roleId
    delete meta.roleId
    await writeJson(file, meta)
    logger.info(`数据迁移（role→robot）：设备 ${id} meta.roleId → robotId`)
  }

  // ── 3. overrides.json：roles 分组 → robots 分组 ────────────────
  const ov = await readJson<Record<string, unknown> | null>(overridesFile, null)
  if (ov && typeof ov === 'object' && ov.roles !== undefined) {
    if (ov.robots === undefined) ov.robots = ov.roles
    delete ov.roles
    await writeJson(overridesFile, ov)
    logger.info(
      '数据迁移（role→robot）：overrides.json roles 分组 → robots 分组',
    )
  }
}

/**
 * 实体更名迁移：ThinkService→Model、VoiceService→Voice、Room→Conversation、
 * Settings→Credential，以及若干字段改名（硬切，不留旧文件副本）。
 *
 * 1. 存储文件改名：settings.json→credentials.json、thinkServices.json→models.json、
 *    voiceServices.json→voices.json、rooms.json→conversations.json
 * 2. 字段改名：Robot.roomRef→conversationId（并补齐 createdAt）、Voice.voiceId→timbreId、
 *    SpeakerModel.did→didPrefix / desc→description / consecutive→continuousDialogue、
 *    设备 meta 的 roomRef/roomName/roomDescription → conversationRef/conversationName/conversationDescription
 * 3. overrides.json：分组键 models→speakerModels、rooms→conversations，
 *    并同步修正各分组内的补丁字段名
 *
 * 与 migrateRoleToRobot 同理挂在版本判断之前：存量数据可能停在 v1~v5 任一版本，
 * 而本版代码的 v4/v5 迁移已按新命名读写，不先改名会读空、误判内置项。
 * 全流程幂等，无旧键时仅做若干次 fs 检查。
 */
async function renameStoreFile(from: string, to: string): Promise<void> {
  try {
    await fs.access(from)
  } catch {
    return // 旧文件不存在：已改名或全新安装
  }
  try {
    await fs.access(to)
    // 新文件已存在：说明改名已完成，旧文件是中断残留，直接删除
    await fs.rm(from, { force: true })
    logger.info(`数据迁移（实体更名）：删除残留 ${path.basename(from)}`)
    return
  } catch {
    await fs.rename(from, to)
    logger.info(
      `数据迁移（实体更名）：${path.basename(from)} → ${path.basename(to)}`,
    )
  }
}

/** 逐条对象改键（仅在旧键存在且新键缺失时写入） */
function renameKey(
  obj: Record<string, unknown>,
  from: string,
  to: string,
): boolean {
  if (obj[from] === undefined || obj[to] !== undefined) return false
  obj[to] = obj[from]
  delete obj[from]
  return true
}

/** 对列表文件里的每条记录批量改键；有改动则回写并返回 true */
async function renameFieldsInList(
  file: string,
  pairs: readonly (readonly [string, string])[],
): Promise<boolean> {
  const rows = await readJson<Record<string, unknown>[]>(file, [])
  let changed = false
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const [from, to] of pairs) {
      if (renameKey(row, from, to)) changed = true
    }
  }
  if (changed) {
    // 直接写原始 JSON：迁移面对的是任意历史版本数据，用 schema 校验会把
    // 字段缺失的老数据整条判失败、中断迁移（校验交由后续读取路径负责）
    await writeJson(file, rows)
  }
  return changed
}

/** 角色：roomRef → conversationId，并补齐新增的 createdAt */
async function migrateRobotEntity(): Promise<void> {
  const robots = await readJson<Record<string, unknown>[]>(robotsFile, [])
  let changed = false
  for (const r of robots) {
    if (!r || typeof r !== 'object') continue
    if (renameKey(r, 'roomRef', 'conversationId')) changed = true
    if (typeof r.createdAt !== 'number') {
      r.createdAt = Date.now()
      changed = true
    }
  }
  if (!changed) return
  await writeJson(robotsFile, robots)
  logger.info('数据迁移（实体更名）：角色 roomRef → conversationId')
}

/** 设备 meta：roomRef/roomName/roomDescription → conversation* */
async function migrateDeviceMetaEntity(): Promise<void> {
  const ids = await fs.readdir(devicesRoot).catch(() => [] as string[])
  for (const id of ids) {
    const file = path.join(devicesRoot, id, 'meta.json')
    const meta = await readJson<Record<string, unknown> | null>(file, null)
    if (!meta || typeof meta !== 'object') continue
    const changed =
      renameKey(meta, 'roomRef', 'conversationRef') ||
      renameKey(meta, 'roomName', 'conversationName') ||
      renameKey(meta, 'roomDescription', 'conversationDescription')
    if (!changed) continue
    await writeJson(file, meta)
    logger.info(`数据迁移（实体更名）：设备 ${id} meta room* → conversation*`)
  }
}

/** 分组键 → 各分组内补丁字段名的改名对照表 */
const OVERRIDE_RENAMES: Record<string, readonly (readonly [string, string])[]> =
  {
    speakerModels: [
      ['did', 'didPrefix'],
      ['desc', 'description'],
      ['consecutive', 'continuousDialogue'],
    ],
    voices: [['voiceId', 'timbreId']],
    robots: [['roomRef', 'conversationId']],
  }

/** overrides.json：分组键 models→speakerModels、rooms→conversations，并同步补丁字段名 */
async function migrateOverridesEntity(): Promise<void> {
  const ov = await readJson<Record<string, unknown> | null>(overridesFile, null)
  if (!ov || typeof ov !== 'object') return
  let changed = false
  if (ov.models !== undefined) {
    if (ov.speakerModels === undefined) ov.speakerModels = ov.models
    delete ov.models
    changed = true
  }
  if (ov.rooms !== undefined) {
    if (ov.conversations === undefined) ov.conversations = ov.rooms
    delete ov.rooms
    changed = true
  }
  for (const [group, pairs] of Object.entries(OVERRIDE_RENAMES)) {
    const bag = ov[group] as Record<string, Record<string, unknown>> | undefined
    if (!bag || typeof bag !== 'object') continue
    for (const patch of Object.values(bag)) {
      if (!patch || typeof patch !== 'object') continue
      for (const [from, to] of pairs) {
        if (renameKey(patch, from, to)) changed = true
      }
    }
  }
  if (!changed) return
  await writeJson(overridesFile, ov)
  logger.info('数据迁移（实体更名）：overrides.json 分组与补丁字段名已同步')
}

export async function migrateEntityRenames(): Promise<void> {
  // ── 1. 存储文件改名 ──────────────────────────────────────────
  await renameStoreFile(path.join(root, 'settings.json'), credentialsFile)
  await renameStoreFile(path.join(root, 'thinkServices.json'), modelsFile)
  await renameStoreFile(path.join(root, 'voiceServices.json'), voicesFile)
  await renameStoreFile(path.join(root, 'rooms.json'), conversationsFile)

  // ── 2~4. 各实体字段改名 ──────────────────────────────────────
  await migrateRobotEntity()
  if (await renameFieldsInList(voicesFile, [['voiceId', 'timbreId']])) {
    logger.info('数据迁移（实体更名）：语音 voiceId → timbreId')
  }
  if (
    await renameFieldsInList(speakerModelsFile, [
      ['did', 'didPrefix'],
      ['desc', 'description'],
      ['consecutive', 'continuousDialogue'],
    ])
  ) {
    logger.info(
      '数据迁移（实体更名）：音箱型号字段改名（did/desc/consecutive）',
    )
  }

  // ── 5~6. 设备 meta 与 overrides ──────────────────────────────
  await migrateDeviceMetaEntity()
  await migrateOverridesEntity()
}

/**
 * v7：账号（accounts）并入凭据（credentials）。
 * 存储收敛为 credentials.json（凭据列表，结构同原 accounts）：
 *  · accounts.json 存在 → 作为列表基底；
 *  · 旧 credentials.json 若是「单对象」（miUserId/passToken，settings 时代形态）
 *    且有值 → 前插为「默认凭据」；已是数组或空对象则跳过；
 *  · 逐条删除 miPassword / hasMiPassword（异地验证下密码登录不可用，
 *    passToken 只能人工获取填入，密码落盘纯属多余风险）；
 *  · 设备 meta.accountId → credentialId；overrides 分组 accounts 键移除（凭据无内置语义）。
 * 幂等：迁移完成后 accounts.json 已删除、credentials.json 为数组、无旧键，重跑无副作用。
 * 注意：改名类迁移必须挂在版本判断之前（存量版本号可能已是最新但内容仍是旧名）。
 */
export async function migrateAccountToCredential(): Promise<void> {
  const accountsPath = path.join(root, 'accounts.json')
  const accountsRaw = await readJson<unknown>(accountsPath, null)
  const oldCred = await readJson<unknown>(credentialsFile, null)
  const credIsArray = Array.isArray(oldCred)
  const credObj =
    oldCred && typeof oldCred === 'object' && !Array.isArray(oldCred)
      ? (oldCred as Record<string, unknown>)
      : null
  const accountsArr = Array.isArray(accountsRaw) ? accountsRaw : null

  // 无任何旧形态痕迹：accounts.json 不存在且 credentials.json 已是数组（或不存在）
  const legacyCredObject =
    credObj !== null &&
    (credObj.miUserId !== undefined ||
      credObj.passToken !== undefined ||
      Object.keys(credObj).length > 0)
  if (accountsArr === null && !legacyCredObject) {
    // 仍需检查设备 meta 是否残留 accountId（v6 前数据可能停在任意版本号）
    await migrateDeviceCredentialRefs()
    return
  }

  const list: Record<string, unknown>[] = (accountsArr ?? []).map((a) => {
    const row = a as Record<string, unknown>
    delete row.miPassword
    delete row.hasMiPassword
    return row
  })
  if (legacyCredObject && credObj) {
    const dup = list.some(
      (m) =>
        m.miUserId === credObj.miUserId && m.passToken === credObj.passToken,
    )
    if (!dup && (credObj.miUserId || credObj.passToken)) {
      list.unshift({
        id: nanoid(8),
        name: '默认凭据',
        miUserId: credObj.miUserId || '',
        passToken: credObj.passToken,
        createdAt: Date.now(),
      })
    }
  }
  // 新数组形态且无 accounts.json：不重写（避免无谓写盘与竞态）
  if (accountsArr !== null || legacyCredObject) {
    await writeJson(
      credentialsFile,
      credIsArray && accountsArr === null ? oldCred : list,
    )
    logger.info(
      `数据迁移（账号→凭据）：credentials.json 收敛为 ${list.length} 条凭据列表`,
    )
  }
  if (accountsArr !== null) {
    await fs.rm(accountsPath, { force: true })
    logger.info(
      '数据迁移（账号→凭据）：accounts.json 已删除（并入 credentials.json）',
    )
  }
  await migrateDeviceCredentialRefs()
}

/** 设备 meta.accountId → credentialId（幂等；独立于版本判断，兼容任意存量版本） */
async function migrateDeviceCredentialRefs(): Promise<void> {
  const ids = await fs.readdir(devicesRoot).catch(() => [] as string[])
  for (const id of ids) {
    const file = path.join(devicesRoot, id, 'meta.json')
    const meta = await readJson<Record<string, unknown> | null>(file, null)
    if (!meta || typeof meta !== 'object') continue
    const changed = renameKey(meta, 'accountId', 'credentialId')
    if (changed) await writeJson(file, meta)
  }
}

export const migrations: Migration[] = [
  {
    version: 1,
    description:
      '基线：旧 credentials.json → 多账号、设备会话 → Conversation 实体',
    up: async () => {
      // 旧 credentials.json → 首个账号的兼容已由「账号并入凭据」迁移统一覆盖，
      // 此处只保留会话迁移
      await migrateConversations()
    },
  },
  {
    version: 2,
    description:
      '内置/用户数据分离：内置型号与语音移出可写文件，用户改动存入 overrides.json',
    up: splitBuiltinEntities,
  },
  {
    version: 3,
    description:
      'Token 用量追踪 + 模型 Failover：角色 modelId → modelIds、设备移除服务覆盖、服务补全 token 默认值',
    up: migrateTokenUsageFailover,
  },
  {
    version: 4,
    description:
      '对话角色必填：角色数值字段回填历史默认、设备无角色时归属首个角色',
    up: migrateRobotRequired,
  },
  {
    version: 5,
    description:
      '内置/用户数据分离（会话/角色）：内置会话与内置角色移出可写文件，用户改动存入 overrides.json',
    up: splitBuiltinRobotsConversations,
  },
  {
    version: 6,
    description:
      '实体与字段更名：ThinkService→Model、VoiceService→Voice、Room→Conversation、Settings→Credential，存储文件与设备/覆盖字段同步',
    up: migrateEntityRenames,
  },
  {
    version: 7,
    description:
      '账号并入凭据：accounts.json 合并为 credentials.json 列表，删除 miPassword，设备 accountId→credentialId',
    up: migrateAccountToCredential,
  },
]

/** 读取已存数据版本（无文件或非法值视为 0，即需执行全部迁移） */
export async function getDataVersion(): Promise<number> {
  const { dataVersion } = await readJson<{ dataVersion?: number }>(
    dataVersionFile,
    {},
  )
  return typeof dataVersion === 'number' && dataVersion >= 0 ? dataVersion : 0
}

/** 启动时按版本升级；返回实际执行的迁移条数 */
export async function runMigrations(): Promise<number> {
  // 实体改名（role→robot）必须先于任何迁移、且不受版本号早退影响：
  // 存量到 v5 的数据目录仍是 roles.json / meta.roleId / overrides.roles 旧命名，
  // 本版代码读写已全部指向 robots 命名，不改名会直接丢数据。
  // 改名步骤幂等且与版本号解耦（无旧键时近似 no-op），故放在版本判断之前。
  await migrateRoleToRobot()
  // 同理：本轮实体更名（Model/Voice/Conversation/Credential）也必须先于 pending 迁移
  await migrateEntityRenames()
  const current = await getDataVersion()
  if (current >= DATA_VERSION) return 0
  const pending = migrations
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version)
  for (const m of pending) {
    logger.info(`数据迁移 v${m.version}：${m.description}`)
    await m.up()
    await writeJsonChecked(
      dataVersionFile,
      { dataVersion: m.version },
      versionFileSchema,
      '数据版本',
    )
  }
  logger.info(`数据迁移完成：v${current} → v${DATA_VERSION}`)
  return pending.length
}
