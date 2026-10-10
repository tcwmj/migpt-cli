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
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-overrides-'))
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
import type { SpeakerModel, VoiceService } from '../types.js'
import { BUILTIN_MODELS } from './builtins.js'
import { getSpeakerModels, getVoiceServices } from './entities.js'
import {
  getOverrides,
  mergeBuiltinModels,
  mergeBuiltinVoices,
  saveSpeakerModels,
  saveVoiceServices,
  resetBuiltinModel,
  resetBuiltinVoice,
  splitBuiltinEntities,
} from './overrides.js'

const write = async (file: string, data: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data))
}

const read = async <T>(file: string): Promise<T> =>
  JSON.parse(await fs.readFile(file, 'utf-8')) as T

beforeAll(() => {
  expect(paths.root).toContain('migpt-overrides-')
})

beforeEach(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
  await fs.mkdir(paths.root, { recursive: true })
})

afterAll(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
})

describe('合并内置与自建实体', () => {
  test('内置在前、自建在后，补丁叠加在代码默认之上', () => {
    const merged = mergeBuiltinVoices(
      [{ id: 'v1', name: '第三方', provider: 'edge', createdAt: 1 }],
      { 'builtin-mi': { name: '小米默认' } },
    )
    expect(merged.map((v) => v.id)).toEqual(['builtin-mi', 'v1'])
    expect(merged[0].name).toBe('小米默认')
    expect(merged[0].builtin).toBe(true)
  })

  test('内置型号恒在列表中，id/builtin 不被补丁改写', async () => {
    const list = await getSpeakerModels()
    expect(list.map((m) => m.id)).toEqual(BUILTIN_MODELS.map((m) => m.id))
    const patched = mergeBuiltinModels(list, {
      'xiaomi-pro': { name: '改名', builtin: false } as Partial<SpeakerModel>,
    })
    const target = patched.find((m) => m.id === 'xiaomi-pro')!
    expect(target.name).toBe('改名')
    expect(target.builtin).toBe(true)
  })

  test('可写文件中的旧内置项会被过滤，不产生重复', async () => {
    await write(paths.speakerModelsFile, [
      { id: 'xiaomi-pro', name: '遗留内置', did: 'LX06', createdAt: 3 },
    ])
    const ids = (await getSpeakerModels()).map((m) => m.id)
    expect(ids.filter((id) => id === 'xiaomi-pro')).toHaveLength(1)
  })

  test('自建项伪造 builtin:true 会被读取层归零（可删、可编辑，不受内置锁定）', () => {
    const fake: VoiceService = {
      id: 'evil',
      name: '伪装内置',
      provider: 'edge',
      builtin: true,
      createdAt: 9,
    }
    const merged = mergeBuiltinVoices([fake])
    const target = merged.find((v) => v.id === 'evil')!
    expect(target.builtin).toBe(false)
    // 型号同理
    const fakeModel: SpeakerModel = {
      id: 'evil-m',
      name: '伪装内置型号',
      did: 'XX',
      builtin: true,
      createdAt: 9,
    }
    const mergedM = mergeBuiltinModels([fakeModel])
    expect(mergedM.find((m) => m.id === 'evil-m')!.builtin).toBe(false)
  })
})

describe('落盘：自建写文件、内置改动写覆盖', () => {
  test('编辑内置型号仅落覆盖，可写文件保持空', async () => {
    const list = await getSpeakerModels()
    list.find((m) => m.id === 'xiaomi-pro')!.name = '我的小爱 Pro'
    await saveSpeakerModels(list)

    expect(await read<SpeakerModel[]>(paths.speakerModelsFile)).toEqual([])
    expect((await getOverrides()).models?.['xiaomi-pro']).toEqual({
      name: '我的小爱 Pro',
    })
    // 覆盖生效；代码默认定义未被污染
    expect(
      (await getSpeakerModels()).find((m) => m.id === 'xiaomi-pro')?.name,
    ).toBe('我的小爱 Pro')
    expect(BUILTIN_MODELS.find((m) => m.id === 'xiaomi-pro')?.name).toBe(
      '小爱音箱 Pro',
    )
  })

  test('自建型号写入文件，内置项不进文件', async () => {
    const list = await getSpeakerModels()
    list.push({
      id: 'custom-1',
      name: '自制音箱',
      did: 'ZZZ',
      builtin: false,
      createdAt: 123,
    })
    await saveSpeakerModels(list)

    const file = await read<SpeakerModel[]>(paths.speakerModelsFile)
    expect(file.map((m) => m.id)).toEqual(['custom-1'])
    expect((await getOverrides()).models).toBeUndefined()
  })

  test('语音服务：自建语音写文件，内置项不进文件', async () => {
    const list = await getVoiceServices()
    list.push({
      id: 'v1',
      name: '第三方',
      provider: 'edge',
      createdAt: 5,
    } as VoiceService)
    await saveVoiceServices(list)

    expect(
      (await read<VoiceService[]>(paths.voiceServicesFile)).map((v) => v.id),
    ).toEqual(['v1'])
    // 内置语音未被改动时无覆盖补丁
    expect((await getOverrides()).voices).toBeUndefined()
  })
})

describe('重置内置实体', () => {
  test('重置型号：删除覆盖并回归代码默认，不波及其他数据', async () => {
    const list = await getSpeakerModels()
    list.find((m) => m.id === 'xiaomi-pro')!.name = '改过'
    list.push({ id: 'custom-1', name: '自制', did: 'Z', createdAt: 9 })
    await saveSpeakerModels(list)

    const def = await resetBuiltinModel('xiaomi-pro')
    expect(def?.name).toBe('小爱音箱 Pro')
    expect((await getOverrides()).models).toBeUndefined()
    // 自建型号仍在
    expect((await getSpeakerModels()).some((m) => m.id === 'custom-1')).toBe(
      true,
    )
  })

  test('重置非内置型号返回 undefined', async () => {
    expect(await resetBuiltinModel('nope')).toBeUndefined()
    expect(await resetBuiltinVoice('nope')).toBeUndefined()
  })

  test('重置语音：删除覆盖回归代码默认，不波及其他数据', async () => {
    const list = await getVoiceServices()
    list.find((v) => v.id === 'builtin-mi')!.name = '改过'
    await saveVoiceServices(list)
    expect((await getOverrides()).voices?.['builtin-mi']).toEqual({
      name: '改过',
    })

    const def = await resetBuiltinVoice('builtin-mi')
    expect(def?.name).toBe('默认语音')
    expect((await getOverrides()).voices).toBeUndefined()
  })
})

describe('一次性迁移：内置 / 用户数据分离', () => {
  test('内置项移出文件，用户改动存为覆盖', async () => {
    const pro = BUILTIN_MODELS.find((m) => m.id === 'xiaomi-pro')!
    await write(paths.speakerModelsFile, [
      { ...pro, name: '用户改名', createdAt: 5 },
      { id: 'custom-1', name: '自制', did: 'Z', createdAt: 9 },
    ])
    await write(paths.voiceServicesFile, [
      {
        id: 'builtin-mi',
        name: '小米内置',
        provider: 'builtin',
        builtin: true,
        createdAt: 1,
      },
      { id: 'v9', name: '第三方', provider: 'edge', createdAt: 2 },
    ])

    await splitBuiltinEntities()

    expect(
      (await read<SpeakerModel[]>(paths.speakerModelsFile)).map((m) => m.id),
    ).toEqual(['custom-1'])
    expect(
      (await read<VoiceService[]>(paths.voiceServicesFile)).map((v) => v.id),
    ).toEqual(['v9'])

    const ov = await getOverrides()
    expect(ov.models?.['xiaomi-pro']).toEqual({ name: '用户改名' })
    // 旧名「小米内置」归一为默认名，与代码默认一致，不记为覆盖
    expect(ov.voices).toBeUndefined()
  })

  test('重复执行幂等：不产生额外覆盖', async () => {
    await splitBuiltinEntities()
    await splitBuiltinEntities()
    expect(await getOverrides()).toEqual({})
  })
})
