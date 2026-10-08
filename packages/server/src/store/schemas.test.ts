import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterAll,
} from '@jest/globals'
import fs from 'node:fs/promises'
import path from 'node:path'

// paths.ts 在模块加载时即用 os.homedir() 计算固定路径；这里替换为临时目录，
// 避免 logger（经 paths 取 systemLogFile）与读写测试污染真实 ~/.migptgui。
jest.mock('../paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-schemas-'))
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
    overridesFile: p.join(root, 'overrides.json'),
    dataVersionFile: p.join(root, 'version.json'),
    backupsRoot: p.join(root, 'backups'),
  }
})

import * as paths from '../paths.js'
import { logger } from '../logger.js'
import {
  DataValidationError,
  accountSchema,
  assertEntity,
  deviceMetaSchema,
  parseEntity,
  parseEntityList,
  readJsonChecked,
  readJsonListChecked,
  roleSchema,
  versionFileSchema,
  writeJsonChecked,
} from './schemas.js'

const account = (id: string, name: string) => ({
  id,
  name,
  miUserId: `u-${id}`,
  createdAt: 1,
})

beforeEach(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
  await fs.mkdir(paths.root, { recursive: true })
})

afterAll(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
})

describe('parseEntityList', () => {
  test('合法项全量返回，且保留未知字段（不剥离）', () => {
    const raw = [{ ...account('a', '一'), extra: 'keep' }]
    expect(parseEntityList(raw, accountSchema, '账号')).toEqual(raw)
  })

  test('非数组返回空数组并告警', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    expect(parseEntityList({ id: 'a' }, accountSchema, '账号')).toEqual([])
    expect(parseEntityList(null, accountSchema, '账号')).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  test('非法项告警并跳过，合法项照常返回', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    const out = parseEntityList(
      [account('a', '一'), { id: '', name: '坏' }, account('b', '二')],
      accountSchema,
      '账号',
    )
    expect(out.map((a) => a.id)).toEqual(['a', 'b'])
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('parseEntity', () => {
  test('缺失（undefined/null）返回 undefined 且不告警', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    expect(parseEntity(undefined, accountSchema, '账号')).toBeUndefined()
    expect(parseEntity(null, accountSchema, '账号')).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('合法返回原始对象，非法告警并返回 undefined', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    const raw = account('a', '一')
    expect(parseEntity(raw, accountSchema, '账号')).toEqual(raw)
    expect(parseEntity({ id: 'a' }, accountSchema, '账号')).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('assertEntity', () => {
  test('合法不抛错', () => {
    expect(() =>
      assertEntity(account('a', '一'), accountSchema, '账号'),
    ).not.toThrow()
  })

  test('非法抛 DataValidationError（含字段路径）', () => {
    expect(() =>
      assertEntity({ id: '', name: '一' }, accountSchema, '账号'),
    ).toThrow(DataValidationError)
    expect(() =>
      assertEntity({ id: '', name: '一' }, accountSchema, '账号'),
    ).toThrow(/账号数据校验失败/)
  })
})

describe('readJsonChecked / writeJsonChecked', () => {
  test('文件缺失时回退 fallback', async () => {
    const file = path.join(paths.root, 'missing.json')
    const fallback = account('z', '零')
    expect(
      await readJsonChecked(file, accountSchema, '账号', fallback),
    ).toEqual(fallback)
  })

  test('合法写入后可校验读回', async () => {
    const file = path.join(paths.root, 'a.json')
    const data = account('a', '一')
    await writeJsonChecked(file, data, accountSchema, '账号')
    expect(
      await readJsonChecked(file, accountSchema, '账号', account('z', '零')),
    ).toEqual(data)
  })

  test('非法数据不落盘并抛错', async () => {
    const file = path.join(paths.root, 'b.json')
    await expect(
      writeJsonChecked(file, { id: '' }, accountSchema, '账号'),
    ).rejects.toThrow(DataValidationError)
    await expect(fs.stat(file)).rejects.toThrow()
  })

  test('读取时整体非法回退 fallback 并告警', async () => {
    const file = path.join(paths.root, 'c.json')
    await fs.writeFile(file, JSON.stringify({ id: 'bad' }))
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    const fallback = account('z', '零')
    expect(
      await readJsonChecked(file, accountSchema, '账号', fallback),
    ).toEqual(fallback)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('readJsonListChecked', () => {
  test('逐条过滤脏数据', async () => {
    const file = path.join(paths.root, 'list.json')
    await fs.writeFile(
      file,
      JSON.stringify([account('a', '一'), { id: 'x' }, account('b', '二')]),
    )
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    expect(
      (await readJsonListChecked(file, accountSchema, '账号')).map((a) => a.id),
    ).toEqual(['a', 'b'])
    warn.mockRestore()
  })
})

describe('schema 定义抽样', () => {
  test('roleSchema 要求必填数组字段', () => {
    expect(
      roleSchema.safeParse({ id: 'r', name: '角色', profile: '' }).success,
    ).toBe(false)
  })

  test('deviceMetaSchema 要求 ttsSecret', () => {
    expect(
      deviceMetaSchema.safeParse({
        id: 'd',
        alias: 'A',
        did: 'X',
        createdAt: 1,
      }).success,
    ).toBe(false)
  })

  test('versionFileSchema 拒绝负版本号', () => {
    expect(versionFileSchema.safeParse({ dataVersion: -1 }).success).toBe(false)
    expect(versionFileSchema.safeParse({ dataVersion: 2 }).success).toBe(true)
  })
})
