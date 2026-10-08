// ── 数据版本与迁移框架 ─────────────────────────────────────────
// 数据结构发生变更时：把 DATA_VERSION +1，并在 migrations 末尾追加一条
// { version, description, up }。启动时 runMigrations() 只执行 version 大于
// 已存版本的步骤，逐条执行并落盘进度，因此可安全重入、可中断续跑。
import path from 'node:path'
import { nanoid } from 'nanoid'
import { logger } from '../logger.js'
import { dataVersionFile, devicesRoot, roomsFile } from '../paths.js'
import type { DeviceMeta } from '../types.js'
import { readJson } from './json.js'
import {
  deviceMetaSchema,
  roomListSchema,
  versionFileSchema,
  writeJsonChecked,
} from './schemas.js'
import { getAccounts, getRooms, listDeviceMetas } from './entities.js'
import { splitBuiltinEntities } from './overrides.js'

export interface Migration {
  /** 目标版本号（从 1 起连续递增，不允许空洞） */
  version: number
  /** 变更说明（写入日志，便于排查升级问题） */
  description: string
  /** 升级动作；约定必须幂等，重复执行不产生副作用 */
  up: () => Promise<void>
}

/** 当前数据结构版本：新增迁移时同步 +1 */
export const DATA_VERSION = 2

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
