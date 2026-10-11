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
    credentialsFile: p.join(root, 'credentials.json'),
    // accounts.json 已废弃，但迁移测试需要构造旧文件路径验证 v7 合并
    accountsFile: p.join(root, 'accounts.json'),
    robotsFile: p.join(root, 'robots.json'),
    modelsFile: p.join(root, 'models.json'),
    voicesFile: p.join(root, 'voices.json'),
    speakerModelsFile: p.join(root, 'speakerModels.json'),
    conversationsFile: p.join(root, 'conversations.json'),
    authFile: p.join(root, 'auth.json'),
    logsDir: p.join(root, 'logs'),
    systemLogFile: p.join(root, 'system.log'),
    systemLogPrefix: p.join(root, 'system'),
    overridesFile: p.join(root, 'overrides.json'),
    dataVersionFile: p.join(root, 'version.json'),
    backupsRoot: p.join(root, 'backups'),
  }
})

import * as paths from '../paths.js'
import type { SpeakerModel } from '../types.js'
import { BUILTIN_SPEAKER_MODELS } from './builtins.js'
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
  // maxRetries：Windows 下 pino-roll 日志流可能仍在异步落盘，
  // 立即递归删除会撞 ENOTEMPTY/EBUSY，交给 fs.rm 内置重试
  const rmOpts = {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  }
  await fs.rm(paths.root, rmOpts)
  await fs.mkdir(paths.root, { recursive: true })
})

afterAll(async () => {
  await fs.rm(paths.root, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  })
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

  test('v7：旧版单对象 credentials.json 归并为凭据列表', async () => {
    await write(paths.credentialsFile, { miUserId: 'u1', passToken: 'tk' })
    await runMigrations()
    const credentials = await read<{ name: string }[]>(paths.credentialsFile)
    expect(Array.isArray(credentials)).toBe(true)
    expect(credentials[0].name).toBe('默认凭据')
    expect(credentials[0].miUserId).toBe('u1')
  })

  test('v7：accounts.json 并入 credentials.json，miPassword 清除，accountId→credentialId', async () => {
    // 旧形态：账号列表（含密码）+ 设备 accountId + 旧单对象凭据缺失
    await write(paths.accountsFile, [
      {
        id: 'ac1',
        name: '家里号',
        miUserId: 'u7',
        passToken: 'tk7',
        miPassword: 'pw-should-drop',
        hasMiPassword: true,
        createdAt: 5,
      },
    ])
    await fs.mkdir(path.join(paths.root, 'devices', 'd1'), { recursive: true })
    await write(path.join(paths.root, 'devices', 'd1', 'meta.json'), {
      id: 'd1',
      alias: '音箱',
      did: 'D1',
      robotId: 'r1',
      accountId: 'ac1',
      ttsSecret: '',
      createdAt: 6,
    })
    await runMigrations()
    // credentials.json 为列表，密码字段被清除
    const credentials = await read<Record<string, unknown>[]>(
      paths.credentialsFile,
    )
    expect(credentials).toHaveLength(1)
    expect(credentials[0]).toMatchObject({
      id: 'ac1',
      name: '家里号',
      miUserId: 'u7',
      passToken: 'tk7',
    })
    expect(credentials[0].miPassword).toBeUndefined()
    expect(credentials[0].hasMiPassword).toBeUndefined()
    // accounts.json 已删除
    await expect(fs.access(paths.accountsFile)).rejects.toThrow()
    // 设备字段改名
    const meta = await read<Record<string, unknown>>(
      path.join(paths.root, 'devices', 'd1', 'meta.json'),
    )
    expect(meta.credentialId).toBe('ac1')
    expect(meta.accountId).toBeUndefined()
  })

  test('v2 把旧内置型号移出可写文件', async () => {
    const pro = BUILTIN_SPEAKER_MODELS.find((m) => m.id === 'xiaomi-pro')!
    await write(paths.speakerModelsFile, [
      { ...pro, name: '用户改名', createdAt: 5 },
      { id: 'custom-1', name: '自制', did: 'Z', createdAt: 9 },
    ])
    await runMigrations()
    expect(
      (await read<SpeakerModel[]>(paths.speakerModelsFile)).map((m) => m.id),
    ).toEqual(['custom-1'])
    expect((await getOverrides()).speakerModels?.['xiaomi-pro']).toEqual({
      name: '用户改名',
    })
  })
})

describe('migrateRoleToRobot（role→robot 实体改名）', () => {
  const legacyRolesFile = path.join(paths.root, 'roles.json')
  const legacyMeta = {
    id: 'd1',
    alias: '客厅',
    didPrefix: 'X',
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
    // 本轮实体改名迁移会为缺失 createdAt 的角色补齐时间戳
    expect(await read<unknown[]>(paths.robotsFile)).toEqual([
      { id: 'r1', name: '傻妞', createdAt: expect.any(Number) },
    ])
  })
})
