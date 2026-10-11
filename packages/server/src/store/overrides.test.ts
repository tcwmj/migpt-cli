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
    credentialsFile: p.join(root, 'credentials.json'),
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
import type { Robot, Conversation, SpeakerModel, Voice } from '../types.js'
import { BUILTIN_SPEAKER_MODELS } from './builtins.js'
import {
  getRobots,
  getConversations,
  getSpeakerModels,
  getVoices,
} from './entities.js'
import {
  getOverrides,
  mergeBuiltinSpeakerModels,
  mergeBuiltinRobots,
  mergeBuiltinConversations,
  mergeBuiltinVoices,
  saveRobots,
  saveConversations,
  saveSpeakerModels,
  saveVoices,
  resetBuiltinSpeakerModel,
  resetBuiltinRobot,
  resetBuiltinConversation,
  resetBuiltinVoice,
  splitBuiltinEntities,
  splitBuiltinRobotsConversations,
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
    expect(list.map((m) => m.id)).toEqual(
      BUILTIN_SPEAKER_MODELS.map((m) => m.id),
    )
    const patched = mergeBuiltinSpeakerModels(list, {
      'xiaomi-pro': { name: '改名', builtin: false } as Partial<SpeakerModel>,
    })
    const target = patched.find((m) => m.id === 'xiaomi-pro')!
    expect(target.name).toBe('改名')
    expect(target.builtin).toBe(true)
  })

  test('可写文件中的旧内置项会被过滤，不产生重复', async () => {
    await write(paths.speakerModelsFile, [
      { id: 'xiaomi-pro', name: '遗留内置', didPrefix: 'LX06', createdAt: 3 },
    ])
    const ids = (await getSpeakerModels()).map((m) => m.id)
    expect(ids.filter((id) => id === 'xiaomi-pro')).toHaveLength(1)
  })

  test('自建项伪造 builtin:true 会被读取层归零（可删、可编辑，不受内置锁定）', () => {
    const fake: Voice = {
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
      didPrefix: 'XX',
      builtin: true,
      createdAt: 9,
    }
    const mergedM = mergeBuiltinSpeakerModels([fakeModel])
    expect(mergedM.find((m) => m.id === 'evil-m')!.builtin).toBe(false)
  })
})

describe('落盘：自建写文件、内置改动写覆盖', () => {
  test('编辑内置型号仅落覆盖，可写文件保持空', async () => {
    const list = await getSpeakerModels()
    list.find((m) => m.id === 'xiaomi-pro')!.name = '我的小爱 Pro'
    await saveSpeakerModels(list)

    expect(await read<SpeakerModel[]>(paths.speakerModelsFile)).toEqual([])
    expect((await getOverrides()).speakerModels?.['xiaomi-pro']).toEqual({
      name: '我的小爱 Pro',
    })
    // 覆盖生效；代码默认定义未被污染
    expect(
      (await getSpeakerModels()).find((m) => m.id === 'xiaomi-pro')?.name,
    ).toBe('我的小爱 Pro')
    expect(
      BUILTIN_SPEAKER_MODELS.find((m) => m.id === 'xiaomi-pro')?.name,
    ).toBe('小爱音箱 Pro')
  })

  test('自建型号写入文件，内置项不进文件', async () => {
    const list = await getSpeakerModels()
    list.push({
      id: 'custom-1',
      name: '自制音箱',
      didPrefix: 'ZZZ',
      builtin: false,
      createdAt: 123,
    })
    await saveSpeakerModels(list)

    const file = await read<SpeakerModel[]>(paths.speakerModelsFile)
    expect(file.map((m) => m.id)).toEqual(['custom-1'])
    expect((await getOverrides()).speakerModels).toBeUndefined()
  })

  test('语音：自建语音写文件，内置项不进文件', async () => {
    const list = await getVoices()
    list.push({
      id: 'v1',
      name: '第三方',
      provider: 'edge',
      createdAt: 5,
    } as Voice)
    await saveVoices(list)

    expect((await read<Voice[]>(paths.voicesFile)).map((v) => v.id)).toEqual([
      'v1',
    ])
    // 内置语音未被改动时无覆盖补丁
    expect((await getOverrides()).voices).toBeUndefined()
  })
})

describe('重置内置实体', () => {
  test('重置型号：删除覆盖并回归代码默认，不波及其他数据', async () => {
    const list = await getSpeakerModels()
    list.find((m) => m.id === 'xiaomi-pro')!.name = '改过'
    list.push({ id: 'custom-1', name: '自制', didPrefix: 'Z', createdAt: 9 })
    await saveSpeakerModels(list)

    const def = await resetBuiltinSpeakerModel('xiaomi-pro')
    expect(def?.name).toBe('小爱音箱 Pro')
    expect((await getOverrides()).speakerModels).toBeUndefined()
    // 自建型号仍在
    expect((await getSpeakerModels()).some((m) => m.id === 'custom-1')).toBe(
      true,
    )
  })

  test('重置非内置型号返回 undefined', async () => {
    expect(await resetBuiltinSpeakerModel('nope')).toBeUndefined()
    expect(await resetBuiltinVoice('nope')).toBeUndefined()
  })

  test('重置语音：删除覆盖回归代码默认，不波及其他数据', async () => {
    const list = await getVoices()
    list.find((v) => v.id === 'builtin-mi')!.name = '改过'
    await saveVoices(list)
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
    const pro = BUILTIN_SPEAKER_MODELS.find((m) => m.id === 'xiaomi-pro')!
    await write(paths.speakerModelsFile, [
      { ...pro, name: '用户改名', createdAt: 5 },
      { id: 'custom-1', name: '自制', didPrefix: 'Z', createdAt: 9 },
    ])
    await write(paths.voicesFile, [
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
    expect((await read<Voice[]>(paths.voicesFile)).map((v) => v.id)).toEqual([
      'v9',
    ])

    const ov = await getOverrides()
    expect(ov.speakerModels?.['xiaomi-pro']).toEqual({ name: '用户改名' })
    // 旧名「小米内置」归一为默认名，与代码默认一致，不记为覆盖
    expect(ov.voices).toBeUndefined()
  })

  test('重复执行幂等：不产生额外覆盖', async () => {
    await splitBuiltinEntities()
    await splitBuiltinEntities()
    expect(await getOverrides()).toEqual({})
  })
})

describe('内置会话 / 内置角色（傻妞）', () => {
  test('未迁移时空文件也恒含内置项，内置在前、自建在后', async () => {
    await write(paths.conversationsFile, [
      { id: 'c-conversation', name: '我的群', createdAt: 7 },
    ])
    await write(paths.robotsFile, [])
    const conversations = await getConversations()
    expect(conversations[0].id).toBe('dQd66FVw')
    expect(conversations[0].builtin).toBe(true)
    expect(conversations[0].name).toBe('傻妞会话')
    expect(conversations.map((r) => r.id)).toEqual([
      'dQd66FVw',
      'c-conversation',
    ])
    const robots = await getRobots()
    expect(robots.map((r) => r.id)).toEqual(['IgKuWadm'])
    expect(robots[0].name).toBe('傻妞')
    expect(robots[0].builtin).toBe(true)
  })

  test('编辑内置会话仅落覆盖，可写文件保持空', async () => {
    const list = await getConversations()
    list.find((r) => r.id === 'dQd66FVw')!.description = '改过的描述'
    await saveConversations(list)

    expect(await read<Conversation[]>(paths.conversationsFile)).toEqual([])
    expect((await getOverrides()).conversations?.['dQd66FVw']).toEqual({
      description: '改过的描述',
    })
    expect(
      (await getConversations()).find((r) => r.id === 'dQd66FVw')?.description,
    ).toBe('改过的描述')
  })

  test('编辑内置角色仅落覆盖；重置回归代码默认，不波及自建', async () => {
    const list = await getRobots()
    list.find((r) => r.id === 'IgKuWadm')!.profile = '改过的人设'
    list.push({
      id: 'c-robot',
      name: '自建角色',
      profile: 'p',
      callAIKeywords: [],
      wakeUpKeywords: [],
      exitKeywords: [],
      checkInterval: 1000,
      checkTTSStatusAfter: 3000,
      onEnterAI: [],
      onExitAI: [],
      onAIAsking: [],
      onAIReplied: [],
      onAIError: [],
      exitKeepAliveAfter: 30,
      createdAt: 1 as never,
    } as Robot)
    await saveRobots(list)

    expect((await read<Robot[]>(paths.robotsFile)).map((r) => r.id)).toEqual([
      'c-robot',
    ])
    expect((await getOverrides()).robots?.['IgKuWadm']).toEqual({
      profile: '改过的人设',
    })

    const def = await resetBuiltinRobot('IgKuWadm')
    expect(def?.profile).toBe(
      '性别：女\n性格：乖巧可爱\n爱好：喜欢搞怪，爱吃醋。',
    )
    expect((await getOverrides()).robots).toBeUndefined()
    // 自建角色仍在
    expect((await getRobots()).some((r) => r.id === 'c-robot')).toBe(true)
  })

  test('重置非内置会话/角色返回 undefined', async () => {
    expect(await resetBuiltinConversation('nope')).toBeUndefined()
    expect(await resetBuiltinRobot('nope')).toBeUndefined()
  })

  test('自建项伪造 builtin:true 归零（会话与角色）', () => {
    const fakeRoom: Conversation = {
      id: 'evil-r',
      name: '伪装',
      builtin: true,
      createdAt: 1,
    }
    expect(
      mergeBuiltinConversations([fakeRoom]).find((r) => r.id === 'evil-r')!
        .builtin,
    ).toBe(false)
    const fakeRobot = {
      id: 'evil-robot',
      name: '伪装',
      profile: 'p',
      callAIKeywords: [],
      wakeUpKeywords: [],
      exitKeywords: [],
      checkInterval: 1,
      checkTTSStatusAfter: 1,
      onEnterAI: [],
      onExitAI: [],
      onAIAsking: [],
      onAIReplied: [],
      onAIError: [],
      exitKeepAliveAfter: 1,
      builtin: true,
    } as unknown as Robot
    expect(
      mergeBuiltinRobots([fakeRobot]).find((r) => r.id === 'evil-robot')!
        .builtin,
    ).toBe(false)
  })

  test('v5 迁移：内置项移出文件、改动存覆盖，幂等', async () => {
    await write(paths.conversationsFile, [
      {
        id: 'dQd66FVw',
        name: '傻妞会话',
        description: '改过的描述',
        createdAt: 1791214020470,
      },
      { id: 'c-conversation', name: '自建群', createdAt: 8 },
    ])
    await write(paths.robotsFile, [
      {
        id: 'IgKuWadm',
        name: '改名后的傻妞',
        profile: '新的人设',
        callAIKeywords: ['请', '你', '傻妞'],
        wakeUpKeywords: ['打开', '进入', '召唤'],
        exitKeywords: ['关闭', '退出', '再见'],
        checkInterval: 1000,
        checkTTSStatusAfter: 3000,
        onEnterAI: ['你好，我是傻妞，很高兴认识你'],
        onExitAI: ['傻妞已退出'],
        onAIAsking: ['让我先想想', '请稍等'],
        onAIReplied: ['我说完了', '还有其他问题吗'],
        onAIError: ['啊哦，出错了，请稍后再试吧'],
        exitKeepAliveAfter: 30,
        masterName: '主人',
        masterProfile:
          '性别：男\n性格：善良正直\n其他：总是舍己为人，是傻妞的主人。',
        conversationRef: 'dQd66FVw',
      },
    ])

    await splitBuiltinRobotsConversations()

    expect(
      (await read<Conversation[]>(paths.conversationsFile)).map((r) => r.id),
    ).toEqual(['c-conversation'])
    expect(await read<Robot[]>(paths.robotsFile)).toEqual([])
    const ov = await getOverrides()
    expect(ov.conversations?.['dQd66FVw']).toEqual({
      description: '改过的描述',
    })
    expect(ov.robots?.['IgKuWadm']).toEqual({
      name: '改名后的傻妞',
      profile: '新的人设',
    })

    // 幂等：再跑一次不产生额外覆盖、不清空自建
    await splitBuiltinRobotsConversations()
    expect(
      (await read<Conversation[]>(paths.conversationsFile)).map((r) => r.id),
    ).toEqual(['c-conversation'])
    expect((await getOverrides()).conversations).toEqual(ov.conversations)
    expect((await getOverrides()).robots).toEqual(ov.robots)

    // 重置会话回归代码默认
    await resetBuiltinConversation('dQd66FVw')
    expect(
      (await getConversations()).find((r) => r.id === 'dQd66FVw')?.description,
    ).toBe('家庭日常闲聊')
  })
})
