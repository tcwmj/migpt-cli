// ── 数据版本与迁移框架 ─────────────────────────────────────────
// 数据结构发生变更时：把 DATA_VERSION +1，并在 migrations 末尾追加一条
// { version, description, up }。启动时 runMigrations() 只执行 version 大于
// 已存版本的步骤，逐条执行并落盘进度，因此可安全重入、可中断续跑。
import path from 'node:path'
import fs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import { logger } from '../logger.js'
import {
  dataVersionFile,
  devicesRoot,
  overridesFile,
  roomsFile,
  robotsFile,
  root,
} from '../paths.js'
import type { DeviceMeta } from '../types.js'
import { readJson, writeJson } from './json.js'
import {
  deviceMetaSchema,
  robotListSchema,
  roomListSchema,
  versionFileSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  getAccounts,
  getRobots,
  getRooms,
  getThinkServices,
  getVoiceServices,
  listDeviceMetas,
  saveDeviceMeta,
  saveThinkServices,
} from './entities.js'
import {
  saveRobots,
  saveVoiceServices,
  splitBuiltinEntities,
  splitBuiltinRobotsRooms,
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
export const DATA_VERSION = 5

/** 迁移：旧版设备会话群字段 → Room 独立实体（幂等；同名归并，多设备共用） */
export async function migrateRooms(): Promise<void> {
  const metas = await listDeviceMetas()
  const rooms = await getRooms()
  let changed = false
  for (const meta of metas) {
    if (!meta.roomName || meta.roomRef) continue
    let room = rooms.find((r) => r.name === meta.roomName)
    if (!room) {
      room = {
        id: nanoid(8),
        name: meta.roomName,
        description: meta.roomDescription,
        createdAt: Date.now(),
      }
      rooms.push(room)
    }
    const nextMeta: DeviceMeta = { ...meta, roomRef: room.id }
    delete nextMeta.roomName
    delete nextMeta.roomDescription
    await writeJsonChecked(
      path.join(devicesRoot, meta.id, 'meta.json'),
      nextMeta,
      deviceMetaSchema,
      '设备',
    )
    changed = true
  }
  if (changed)
    await writeJsonChecked(roomsFile, rooms, roomListSchema, '会话群')
}

/**
 * 迁移 v3：Token 用量追踪 + 思考服务 Failover + 设备字段精简
 *
 * 1. 角色：旧 thinkServiceId → thinkServiceIds: [thinkServiceId]（仅当 thinkServiceIds 不存在时）
 * 2. 设备：移除 thinkServiceId / voiceOverrideId 字段（设备不再直接绑定）
 * 3. ThinkService / VoiceService：补全 token 用量字段默认值（0）
 */
export async function migrateTokenUsageFailover(): Promise<void> {
  // ── 1. 角色迁移：thinkServiceId → thinkServiceIds ────────────────
  const robots = await getRobots()
  let robotsChanged = false
  for (const robot of robots) {
    if (robot.thinkServiceId && !robot.thinkServiceIds) {
      robot.thinkServiceIds = [robot.thinkServiceId]
      delete robot.thinkServiceId
      robotsChanged = true
    }
  }
  if (robotsChanged) await saveRobots(robots)

  // ── 2. 设备迁移：移除 thinkServiceId / voiceOverrideId ───────────
  const metas = await listDeviceMetas()
  for (const meta of metas) {
    const raw = meta as unknown as Record<string, unknown>
    if (raw.thinkServiceId !== undefined || raw.voiceOverrideId !== undefined) {
      delete raw.thinkServiceId
      delete raw.voiceOverrideId
      await saveDeviceMeta(meta.id, meta)
    }
  }

  // ── 3. ThinkService / VoiceService：补全 token 用量默认值 ─────────
  const thinkServices = await getThinkServices()
  let thinkChanged = false
  for (const svc of thinkServices) {
    if (svc.tokenInputUsed == null) {
      svc.tokenInputUsed = 0
      thinkChanged = true
    }
    if (svc.tokenOutputUsed == null) {
      svc.tokenOutputUsed = 0
      thinkChanged = true
    }
    if (svc.tokenUsed == null) {
      svc.tokenUsed = 0
      thinkChanged = true
    }
  }
  if (thinkChanged) await saveThinkServices(thinkServices)

  const voiceServices = await getVoiceServices()
  let voiceChanged = false
  for (const svc of voiceServices) {
    if (svc.tokenInputUsed == null) {
      svc.tokenInputUsed = 0
      voiceChanged = true
    }
    if (svc.tokenOutputUsed == null) {
      svc.tokenOutputUsed = 0
      voiceChanged = true
    }
    if (svc.tokenUsed == null) {
      svc.tokenUsed = 0
      voiceChanged = true
    }
  }
  if (voiceChanged) await saveVoiceServices(voiceServices)
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
  // 导致 v3 的 thinkServiceId → thinkServiceIds 转换漏做——此处对原始数据补做。
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
    // 补做 v3 的 thinkServiceId → thinkServiceIds 转换（旧角色可能被 v3 跳过）
    if (robot.thinkServiceId && !robot.thinkServiceIds) {
      robot.thinkServiceIds = [robot.thinkServiceId]
      delete robot.thinkServiceId
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
    await writeJsonChecked(file, meta, deviceMetaSchema, '设备')
    logger.info(`数据迁移 v4：设备 ${id} 补全对话角色 ${firstRobotId}`)
  }
}

/**
 * 实体更名迁移：对话角色 role → robot（硬切，不留 roles.json 副本）。
 *
 * 1. `roles.json` → `robots.json`（整文件改名；robots.json 已存在时保留新文件、删除旧文件）
 * 2. 设备 meta.json：`roleId` 键 → `robotId`（直接读原始文件，不经 deviceMetaSchema——
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

export const migrations: Migration[] = [
  {
    version: 1,
    description: '基线：旧 settings.json → 多账号、设备会话群 → Room 实体',
    up: async () => {
      // getAccounts 内部含 settings.json → 首个账号的兼容迁移
      await getAccounts()
      await migrateRooms()
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
      'Token 用量追踪 + 思考服务 Failover：角色 thinkServiceId → thinkServiceIds、设备移除服务覆盖、服务补全 token 默认值',
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
      '内置/用户数据分离（会话群/角色）：内置会话群与内置角色移出可写文件，用户改动存入 overrides.json',
    up: splitBuiltinRobotsRooms,
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
