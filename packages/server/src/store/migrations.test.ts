import {
  jest,
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals'
import fs from 'node:fs/promises'
import path from 'node:path'

jest.mock('../paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-migrations-'))
  return {
    root,
    devicesRoot: p.join(root, 'devices'),
    settingsFile: p.join(root, 'settings.json'),
    accountsFile: p.join(root, 'accounts.json'),
    robotsFile: p.join(root, 'robots.json'),
    thinkServicesFile: p.join(root, 'thinkServices.json'),
    voiceServicesFile: p.join(root, 'voiceServices.json'),
    speakerModelsFile: p.join(root, 'speakerModels.json'),
    roomsFile: p.join(root, 'rooms.json'),
    authFile: p.join(root, 'auth.json'),
    systemLogFile: p.join(root, 'system.log'),
    systemLogPrefix: p.join(root, 'system'),
    overridesFile: p.join(root, 'overrides.json'),
    dataVersionFile: p.join(root, 'version.json'),
    backupsRoot: p.join(root, 'backups'),
  }
})

import * as paths from '../paths.js'
import type { SpeakerModel } from '../types.js'
import { BUILTIN_MODELS } from './builtins.js'
import { getOverrides } from './overrides.js'
import {
  runMigrations,
  getDataVersion,
  DATA_VERSION,
  migrateRoleToRobot,
} from './migrations.js'

const write = async (file: string, data: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data))
}

const read = async <T>(file: string): Promise<T> =>
  JSON.parse(await fs.readFile(file, 'utf-8')) as T

beforeAll(() => {
  expect(paths.root).toContain('migpt-migrations-')
})

beforeEach(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
  await fs.mkdir(paths.root, { recursive: true })
})

afterAll(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
})

describe('runMigrations', () => {
  test('首次运行执行全部迁移并落盘版本号', async () => {
    expect(await getDataVersion()).toBe(0)
    expect(await runMigrations()).toBe(DATA_VERSION)
    expect(await getDataVersion()).toBe(DATA_VERSION)
    expect(await read<{ dataVersion: number }>(paths.dataVersionFile)).toEqual({
      dataVersion: DATA_VERSION,
    })
  })

  test('已达当前版本时不再执行（幂等）', async () => {
    await runMigrations()
    expect(await runMigrations()).toBe(0)
  })

  test('旧版 settings.json 迁移为账号（v1 基线）', async () => {
    await write(paths.settingsFile, { miUserId: 'u1', passToken: 'tk' })
    await runMigrations()
    const accounts = await read<{ name: string }[]>(paths.accountsFile)
    expect(accounts[0].name).toBe('默认账号')
  })

  test('v2 把旧内置型号移出可写文件', async () => {
    const pro = BUILTIN_MODELS.find((m) => m.id === 'xiaomi-pro')!
    await write(paths.speakerModelsFile, [
      { ...pro, name: '用户改名', createdAt: 5 },
      { id: 'custom-1', name: '自制', did: 'Z', createdAt: 9 },
    ])
    await runMigrations()
    expect(
      (await read<SpeakerModel[]>(paths.speakerModelsFile)).map((m) => m.id),
    ).toEqual(['custom-1'])
    expect((await getOverrides()).models?.['xiaomi-pro']).toEqual({
      name: '用户改名',
    })
  })
})

describe('migrateRoleToRobot（role→robot 实体改名）', () => {
  const legacyRolesFile = path.join(paths.root, 'roles.json')
  const legacyMeta = {
    id: 'd1',
    alias: '客厅',
    did: 'X',
    roleId: 'r-legacy',
    ttsSecret: 's',
    createdAt: 1,
  }

  test('roles.json 改名为 robots.json，内容原样保留', async () => {
    await write(legacyRolesFile, [{ id: 'r1', name: '傻妞' }])
    await migrateRoleToRobot()
    await expect(fs.readFile(legacyRolesFile, 'utf-8')).rejects.toThrow()
    expect(await read<unknown[]>(paths.robotsFile)).toEqual([
      { id: 'r1', name: '傻妞' },
    ])
  })

  test('robots.json 已存在时保留新文件、删除旧文件', async () => {
    await write(legacyRolesFile, [{ id: 'r-old' }])
    await write(paths.robotsFile, [{ id: 'r-new' }])
    await migrateRoleToRobot()
    await expect(fs.readFile(legacyRolesFile, 'utf-8')).rejects.toThrow()
    expect(await read<unknown[]>(paths.robotsFile)).toEqual([{ id: 'r-new' }])
  })

  test('设备 meta.roleId → robotId 且删除旧键', async () => {
    await write(path.join(paths.devicesRoot, 'd1', 'meta.json'), legacyMeta)
    await migrateRoleToRobot()
    const meta = await read<Record<string, unknown>>(
      path.join(paths.devicesRoot, 'd1', 'meta.json'),
    )
    expect(meta.robotId).toBe('r-legacy')
    expect(meta.roleId).toBeUndefined()
  })

  test('overrides.roles 分组迁移为 overrides.robots', async () => {
    await write(paths.overridesFile, {
      roles: { IgKuWadm: { name: '改名傻妞' } },
    })
    await migrateRoleToRobot()
    const ov = await read<Record<string, unknown>>(paths.overridesFile)
    expect(ov.robots).toEqual({ IgKuWadm: { name: '改名傻妞' } })
    expect(ov.roles).toBeUndefined()
  })

  test('无旧键时幂等 no-op（已迁移数据不被触碰）', async () => {
    await write(paths.robotsFile, [{ id: 'r1', name: '新名' }])
    await write(paths.overridesFile, { robots: { r1: { name: '补丁' } } })
    await migrateRoleToRobot()
    await migrateRoleToRobot()
    expect(await read<unknown[]>(paths.robotsFile)).toEqual([
      { id: 'r1', name: '新名' },
    ])
    expect(await read<Record<string, unknown>>(paths.overridesFile)).toEqual({
      robots: { r1: { name: '补丁' } },
    })
  })

  test('runMigrations 先执行改名：v5 存量 + 旧命名数据 → robots.json', async () => {
    // 版本已到 v5（不再执行编号迁移），但数据仍是旧命名：启动改名必须仍然生效
    await write(paths.dataVersionFile, { dataVersion: DATA_VERSION })
    await write(legacyRolesFile, [{ id: 'r1', name: '傻妞' }])
    await runMigrations()
    await expect(fs.readFile(legacyRolesFile, 'utf-8')).rejects.toThrow()
    expect(await read<unknown[]>(paths.robotsFile)).toEqual([
      { id: 'r1', name: '傻妞' },
    ])
  })
})
