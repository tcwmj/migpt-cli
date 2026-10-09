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
    rolesFile: p.join(root, 'roles.json'),
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
import { runMigrations, getDataVersion, DATA_VERSION } from './migrations.js'

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
