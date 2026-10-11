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
    credentialsFile: p.join(root, 'credentials.json'),
    credentialsFile: p.join(root, 'credentials.json'),
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
import { logger } from '../logger.js'
import {
  DataValidationError,
  credentialSchema,
  assertEntity,
  deviceSchema,
  parseEntity,
  parseEntityList,
  readJsonChecked,
  readJsonListChecked,
  robotSchema,
  versionFileSchema,
  writeJsonChecked,
} from './schemas.js'

const cred = (id: string, name: string) => ({
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
    const raw = [{ ...cred('a', '一'), extra: 'keep' }]
    expect(parseEntityList(raw, credentialSchema, '账号')).toEqual(raw)
  })

  test('非数组返回空数组并告警', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    expect(parseEntityList({ id: 'a' }, credentialSchema, '账号')).toEqual([])
    expect(parseEntityList(null, credentialSchema, '账号')).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  test('非法项告警并跳过，合法项照常返回', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    const out = parseEntityList(
      [cred('a', '一'), { id: '', name: '坏' }, cred('b', '二')],
      credentialSchema,
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
    expect(parseEntity(undefined, credentialSchema, '账号')).toBeUndefined()
    expect(parseEntity(null, credentialSchema, '账号')).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('合法返回原始对象，非法告警并返回 undefined', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    const raw = cred('a', '一')
    expect(parseEntity(raw, credentialSchema, '账号')).toEqual(raw)
    expect(parseEntity({ id: 'a' }, credentialSchema, '账号')).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('assertEntity', () => {
  test('合法不抛错', () => {
    expect(() =>
      assertEntity(cred('a', '一'), credentialSchema, '账号'),
    ).not.toThrow()
  })

  test('非法抛 DataValidationError（含字段路径）', () => {
    expect(() =>
      assertEntity({ id: '', name: '一' }, credentialSchema, '账号'),
    ).toThrow(DataValidationError)
    expect(() =>
      assertEntity({ id: '', name: '一' }, credentialSchema, '账号'),
    ).toThrow(/账号数据校验失败/)
  })
})

describe('readJsonChecked / writeJsonChecked', () => {
  test('文件缺失时回退 fallback', async () => {
    const file = path.join(paths.root, 'missing.json')
    const fallback = cred('z', '零')
    expect(
      await readJsonChecked(file, credentialSchema, '账号', fallback),
    ).toEqual(fallback)
  })

  test('合法写入后可校验读回', async () => {
    const file = path.join(paths.root, 'a.json')
    const data = cred('a', '一')
    await writeJsonChecked(file, data, credentialSchema, '账号')
    expect(
      await readJsonChecked(file, credentialSchema, '账号', cred('z', '零')),
    ).toEqual(data)
  })

  test('非法数据不落盘并抛错', async () => {
    const file = path.join(paths.root, 'b.json')
    await expect(
      writeJsonChecked(file, { id: '' }, credentialSchema, '账号'),
    ).rejects.toThrow(DataValidationError)
    await expect(fs.stat(file)).rejects.toThrow()
  })

  test('读取时整体非法回退 fallback 并告警', async () => {
    const file = path.join(paths.root, 'c.json')
    await fs.writeFile(file, JSON.stringify({ id: 'bad' }))
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    const fallback = cred('z', '零')
    expect(
      await readJsonChecked(file, credentialSchema, '账号', fallback),
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
      JSON.stringify([cred('a', '一'), { id: 'x' }, cred('b', '二')]),
    )
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    expect(
      (await readJsonListChecked(file, credentialSchema, '账号')).map(
        (a) => a.id,
      ),
    ).toEqual(['a', 'b'])
    warn.mockRestore()
  })
})

describe('schema 定义抽样', () => {
  test('robotSchema 要求必填数组字段', () => {
    expect(
      robotSchema.safeParse({ id: 'r', name: '角色', profile: '' }).success,
    ).toBe(false)
  })

  test('deviceSchema 要求 ttsSecret', () => {
    expect(
      deviceSchema.safeParse({
        id: 'd',
        alias: 'A',
        didPrefix: 'X',
        createdAt: 1,
      }).success,
    ).toBe(false)
  })

  test('versionFileSchema 拒绝负版本号', () => {
    expect(versionFileSchema.safeParse({ dataVersion: -1 }).success).toBe(false)
    expect(versionFileSchema.safeParse({ dataVersion: 2 }).success).toBe(true)
  })
})
