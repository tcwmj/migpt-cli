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

// paths.ts 在模块加载时即用 os.homedir() 计算出固定路径，
// 这里把整模块替换为指向临时目录的一组路径，避免污染真实 ~/.migptgui。
jest.mock('../paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-entities-'))
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
import {
  assertUniqueName,
  getAccounts,
  getAccountById,
  getRoles,
  getDefaultThinkService,
  getDefaultVoiceService,
  getDeviceMeta,
  listDeviceMetas,
  getRoomByRef,
  getSpeakerModelByRef,
} from './entities.js'

const write = async (file: string, data: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data))
}

beforeAll(() => {
  expect(paths.root).toContain('migpt-entities-')
})

beforeEach(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
  await fs.mkdir(paths.root, { recursive: true })
})

afterAll(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
})

describe('assertUniqueName', () => {
  const list = [
    { id: 'a', name: '客厅' },
    { id: 'b', name: '书房' },
  ]

  test('无冲突返回 null', () => {
    expect(assertUniqueName(list, '卧室', undefined, '名称')).toBeNull()
  })

  test('重名（忽略大小写与首尾空白）返回冲突文案', () => {
    expect(assertUniqueName(list, '  客厅 ', undefined, '名称')).toBe(
      '名称「客厅」已存在，名称需唯一',
    )
  })

  test('excludeId 跳过自身（编辑场景）', () => {
    expect(assertUniqueName(list, '客厅', 'a', '名称')).toBeNull()
  })

  test('空名不做唯一校验', () => {
    expect(assertUniqueName(list, '', undefined, '名称')).toBeNull()
    expect(assertUniqueName(list, undefined, undefined, '名称')).toBeNull()
  })
})

describe('getAccounts / getAccountById', () => {
  test('无任何文件时返回空数组', async () => {
    expect(await getAccounts()).toEqual([])
  })

  test('从旧 settings.json 迁移出首个账号并落盘', async () => {
    await write(paths.settingsFile, { miUserId: 'u1', passToken: 'tk' })
    const accounts = await getAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({
      name: '默认账号',
      miUserId: 'u1',
      passToken: 'tk',
    })
    // 迁移结果已写回 accounts.json
    expect(await getAccounts()).toEqual(accounts)
  })

  test('已有 accounts.json 时直接返回，不再迁移', async () => {
    await write(paths.accountsFile, [
      { id: 'a1', name: '主账号', miUserId: 'u9', createdAt: 1 },
    ])
    await write(paths.settingsFile, { miUserId: 'old' })
    const accounts = await getAccounts()
    expect(accounts).toEqual([
      { id: 'a1', name: '主账号', miUserId: 'u9', createdAt: 1 },
    ])
  })

  test('getAccountById：命中 id / 回落首个 / 空列表为 undefined', async () => {
    await write(paths.accountsFile, [
      { id: 'a1', name: '一', miUserId: 'u1', createdAt: 1 },
      { id: 'a2', name: '二', miUserId: 'u2', createdAt: 2 },
    ])
    expect((await getAccountById('a2'))?.name).toBe('二')
    expect((await getAccountById('missing'))?.name).toBe('一')
    expect((await getAccountById())?.name).toBe('一')
  })

  test('账号为空时 getAccountById 返回 undefined', async () => {
    expect(await getAccountById()).toBeUndefined()
  })
})

describe('默认思考 / 语音服务', () => {
  test('优先返回 isDefault，否则回退首个', async () => {
    await write(paths.thinkServicesFile, [
      {
        id: 't1',
        name: '一',
        provider: 'doubao',
        model: 'm',
        apiKey: '',
        createdAt: 1,
      },
      {
        id: 't2',
        name: '二',
        provider: 'openai',
        model: 'm',
        apiKey: '',
        createdAt: 2,
        isDefault: true,
      },
    ])
    expect((await getDefaultThinkService())?.id).toBe('t2')

    await write(paths.thinkServicesFile, [
      {
        id: 't1',
        name: '一',
        provider: 'doubao',
        model: 'm',
        apiKey: '',
        createdAt: 1,
      },
    ])
    expect((await getDefaultThinkService())?.id).toBe('t1')
  })

  test('无自建语音时回退内置默认语音', async () => {
    expect(await getDefaultThinkService()).toBeUndefined()
    expect((await getDefaultVoiceService())?.id).toBe('builtin-mi')
  })

  test('语音服务同样遵循 isDefault 优先', async () => {
    await write(paths.voiceServicesFile, [
      {
        id: 'v1',
        name: '内置',
        provider: 'builtin',
        createdAt: 1,
        isDefault: true,
      },
      { id: 'v2', name: '第三方', provider: 'edge', createdAt: 2 },
    ])
    expect((await getDefaultVoiceService())?.id).toBe('v1')
  })
})

describe('设备元数据读取', () => {
  test('devices 目录不存在时列表为空', async () => {
    expect(await listDeviceMetas()).toEqual([])
  })

  test('getDeviceMeta 缺失返回 undefined，存在则读回', async () => {
    expect(await getDeviceMeta('nope')).toBeUndefined()
    await write(path.join(paths.devicesRoot, 'd1', 'meta.json'), {
      id: 'd1',
      alias: '客厅',
      did: 'X08E',
      ttsSecret: 's',
      createdAt: 1,
    })
    expect((await getDeviceMeta('d1'))?.alias).toBe('客厅')
  })

  test('listDeviceMetas 按 createdAt 升序，忽略非设备目录', async () => {
    await write(path.join(paths.devicesRoot, 'b', 'meta.json'), {
      id: 'b',
      alias: 'B',
      did: 'X',
      ttsSecret: 's',
      createdAt: 20,
    })
    await write(path.join(paths.devicesRoot, 'a', 'meta.json'), {
      id: 'a',
      alias: 'A',
      did: 'X',
      ttsSecret: 's',
      createdAt: 10,
    })
    // 空目录 / 无 meta 的目录应被过滤
    await fs.mkdir(path.join(paths.devicesRoot, 'empty'), { recursive: true })
    const metas = await listDeviceMetas()
    expect(metas.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('按引用解析会话群 / 型号', () => {
  test('getRoomByRef：按 id 或名称命中，未命中/空引用为 undefined', async () => {
    await write(paths.roomsFile, [{ id: 'r1', name: '家庭闲聊', createdAt: 1 }])
    expect((await getRoomByRef('r1'))?.name).toBe('家庭闲聊')
    expect((await getRoomByRef('家庭闲聊'))?.id).toBe('r1')
    expect(await getRoomByRef('不存在')).toBeUndefined()
    expect(await getRoomByRef()).toBeUndefined()
  })

  test('getSpeakerModelByRef：兼容旧数据存名称', async () => {
    await write(paths.speakerModelsFile, [
      { id: 'm1', name: '自建音箱', did: 'X08E', createdAt: 1 },
    ])
    expect((await getSpeakerModelByRef('m1'))?.name).toBe('自建音箱')
    expect((await getSpeakerModelByRef('自建音箱'))?.id).toBe('m1')
    expect(await getSpeakerModelByRef('其他')).toBeUndefined()
  })
})

describe('实体列表读取', () => {
  test('getRoles 读回角色列表', async () => {
    await write(paths.rolesFile, [
      {
        id: 'r1',
        name: '傻妞',
        profile: '',
        callAIKeywords: [],
        wakeUpKeywords: [],
        exitKeywords: [],
        onEnterAI: [],
        onExitAI: [],
        onAIAsking: [],
        onAIReplied: [],
        onAIError: [],
      },
    ])
    expect((await getRoles()).map((r) => r.name)).toEqual(['傻妞'])
  })
})
