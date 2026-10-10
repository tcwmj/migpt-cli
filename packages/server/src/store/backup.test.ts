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

// paths.ts 在模块加载时即用 os.homedir() 计算固定路径；替换为临时目录，
// 避免污染真实 ~/.migptgui。
jest.mock('../paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-backup-'))
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
import type { Account, DeviceMeta, ThinkService } from '../types.js'
import { DataValidationError } from './schemas.js'
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  applyBackup,
  assertBundle,
  buildBundle,
  createBackupFile,
  listBackups,
  startBackupScheduler,
} from './backup.js'

const write = async (file: string, data: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(data))
}

const read = async <T>(file: string): Promise<T> =>
  JSON.parse(await fs.readFile(file, 'utf-8')) as T

const account = (id: string, name: string, passToken?: string): Account => ({
  id,
  name,
  miUserId: `u-${id}`,
  passToken,
  createdAt: 1,
})

const think = (id: string, name: string, apiKey?: string): ThinkService => ({
  id,
  name,
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: apiKey ?? '',
  createdAt: 2,
})

const device = (id: string, alias: string, ttsSecret?: string): DeviceMeta => ({
  id,
  alias,
  did: `D-${id}`,
  robotId: 'robot-1',
  ttsSecret: ttsSecret ?? '',
  createdAt: 3,
})

beforeEach(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
  await fs.mkdir(paths.root, { recursive: true })
})

afterAll(async () => {
  await fs.rm(paths.root, { recursive: true, force: true })
})

describe('buildBundle · 导出', () => {
  test('未脱敏：保留明文凭据', async () => {
    await write(paths.accountsFile, [account('a', '一', 'tk-1')])
    await write(paths.thinkServicesFile, [think('t', '脑', 'sk-1')])
    const bundle = await buildBundle(false)
    expect(bundle.format).toBe(BACKUP_FORMAT)
    expect(bundle.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(bundle.redacted).toBe(false)
    expect(bundle.data.accounts[0].passToken).toBe('tk-1')
    expect(bundle.data.thinkServices[0].apiKey).toBe('sk-1')
  })

  test('脱敏：抹除账号/思考服务/设备/语音/覆盖补丁中的明文凭据', async () => {
    await write(paths.accountsFile, [account('a', '一', 'tk-1')])
    await write(paths.thinkServicesFile, [think('t', '脑', 'sk-1')])
    await write(paths.voiceServicesFile, [
      {
        id: 'v',
        name: '声',
        provider: 'edge',
        createdAt: 4,
        tts: { edge: { trustedToken: 'edge-tk' } },
      },
    ])
    await write(paths.overridesFile, {
      voices: { 'builtin-mi': { tts: { volcano: { accessToken: 'vol-tk' } } } },
    })
    await fs.mkdir(path.join(paths.devicesRoot, 'd1'), { recursive: true })
    await fs.writeFile(
      path.join(paths.devicesRoot, 'd1', 'meta.json'),
      JSON.stringify(device('d1', '客厅', 'secret-1')),
    )

    const bundle = await buildBundle(true)
    expect(bundle.redacted).toBe(true)
    const a = bundle.data.accounts[0]
    expect(a.passToken).toBeUndefined()
    expect(a.hasPassToken).toBe(true)
    expect(bundle.data.thinkServices[0].apiKey).toBe('')
    expect(bundle.data.thinkServices[0].hasApiKey).toBe(true)
    expect(bundle.data.devices[0].ttsSecret).toBe('')
    expect(bundle.data.devices[0].hasTtsSecret).toBe(true)
    const tts = bundle.data.voiceServices[0].tts as {
      edge?: { trustedToken?: string }
    }
    expect(tts.edge?.trustedToken).toBe('')
    const ov = bundle.data.overrides.voices?.['builtin-mi'] as {
      tts?: { volcano?: { accessToken?: string } }
    }
    expect(ov.tts?.volcano?.accessToken).toBeUndefined()
  })
})

describe('applyBackup · 导入', () => {
  test('旧包兼容：data.roles / device.roleId / overrides.roles 归一化为新键', async () => {
    const bundle = await buildBundle(false)
    // 模拟实体更名前导出的包：全部换回旧键
    const legacy = bundle as unknown as {
      data: Record<string, unknown> & { devices: Record<string, unknown>[] }
    }
    legacy.data.roles = [
      {
        id: 'r-legacy',
        name: '旧角色',
        profile: '',
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
      },
    ]
    delete legacy.data.robots
    legacy.data.devices = [
      {
        id: 'd9',
        alias: '书房',
        did: 'D-d9',
        roleId: 'r-legacy',
        ttsSecret: 'sec',
        createdAt: 1,
      },
    ]
    legacy.data.overrides = { roles: { IgKuWadm: { name: '旧补丁' } } }
    await applyBackup(legacy)
    const robots = await read<{ id: string }[]>(paths.robotsFile)
    expect(robots.map((r) => r.id)).toContain('r-legacy')
    const meta = await read<Record<string, unknown>>(
      path.join(paths.devicesRoot, 'd9', 'meta.json'),
    )
    expect(meta.robotId).toBe('r-legacy')
    expect(meta.roleId).toBeUndefined()
    const ov = await read<Record<string, unknown>>(paths.overridesFile)
    expect(ov.robots).toEqual({ IgKuWadm: { name: '旧补丁' } })
    expect(ov.roles).toBeUndefined()
  })

  test('未脱敏包：同 id 覆盖、缺失补齐', async () => {
    await write(paths.accountsFile, [account('a', '旧名', 'tk-old')])
    const bundle = await buildBundle(false)
    bundle.data.accounts = [account('a', '新名', 'tk-new'), account('b', '乙')]
    await applyBackup(bundle)
    const list = await read<Account[]>(paths.accountsFile)
    expect(list.map((x) => [x.id, x.name, x.passToken])).toEqual([
      ['a', '新名', 'tk-new'],
      ['b', '乙', undefined],
    ])
  })

  test('脱敏包：按 id 保留本机既有凭据', async () => {
    await write(paths.accountsFile, [account('a', '一', 'tk-old')])
    await write(paths.thinkServicesFile, [think('t', '脑', 'sk-old')])
    const redacted = await buildBundle(true)
    // 本机凭据在导出后被更新
    await write(paths.accountsFile, [account('a', '一', 'tk-new')])
    await write(paths.thinkServicesFile, [think('t', '脑', 'sk-new')])
    await applyBackup(redacted)
    expect((await read<Account[]>(paths.accountsFile))[0].passToken).toBe(
      'tk-new',
    )
    expect(
      (await read<ThinkService[]>(paths.thinkServicesFile))[0].apiKey,
    ).toBe('sk-new')
  })

  test('非法包抛 DataValidationError', async () => {
    await expect(applyBackup({})).rejects.toThrow(DataValidationError)
    await expect(
      applyBackup({ format: 'other', formatVersion: 1, data: {} }),
    ).rejects.toThrow(/格式不匹配/)
    await expect(
      applyBackup({
        format: BACKUP_FORMAT,
        formatVersion: 99,
        data: {},
      }),
    ).rejects.toThrow(/版本过高/)
    await expect(
      applyBackup({ format: BACKUP_FORMAT, formatVersion: 1 }),
    ).rejects.toThrow(/缺少 data/)
  })

  test('导入设备元数据写回 meta.json', async () => {
    const bundle = await buildBundle(false)
    bundle.data.devices = [device('d9', '书房', 'sec')]
    await applyBackup(bundle)
    const meta = await read<DeviceMeta>(
      path.join(paths.devicesRoot, 'd9', 'meta.json'),
    )
    expect(meta.alias).toBe('书房')
    expect(meta.ttsSecret).toBe('sec')
  })

  test('覆盖补丁随包往返：导入后 overrides.json 与包内容一致', async () => {
    // 内置实体的用户修改存 overrides.json；导入必须还原它，
    // 否则「可编辑」的内置改动会在迁移/恢复后静默丢失（变相回到初始数据）。
    await write(paths.overridesFile, {
      models: { 'xiaomi-pro': { name: '我的小爱 Pro' } },
    })
    const bundle = await buildBundle(false)
    // 模拟迁出：本机覆盖被清空后导入应还原
    await write(paths.overridesFile, {})
    await applyBackup(bundle)
    expect(await read(paths.overridesFile)).toEqual(
      bundle.data.overrides as unknown,
    )
    expect(
      (await read<{ models?: Record<string, unknown> }>(paths.overridesFile))
        .models?.['xiaomi-pro'],
    ).toEqual({
      name: '我的小爱 Pro',
    })
  })
})

describe('assertBundle', () => {
  test('合法包不抛错', async () => {
    const bundle = await buildBundle(false)
    expect(() => assertBundle(bundle)).not.toThrow()
  })

  test('非对象抛错', () => {
    expect(() => assertBundle(null)).toThrow(DataValidationError)
    expect(() => assertBundle('x')).toThrow(/不是合法的备份包/)
  })
})

describe('listBackups', () => {
  test('目录不存在返回空数组', async () => {
    await fs.rm(paths.backupsRoot, { recursive: true, force: true })
    expect(await listBackups()).toEqual([])
  })
})

describe('startBackupScheduler', () => {
  test('间隔 <= 0 时不启用', () => {
    const stop = startBackupScheduler({ intervalMs: 0, keep: 1 })
    expect(typeof stop).toBe('function')
    stop()
  })

  test('到点自动生成备份', async () => {
    const stop = startBackupScheduler({ intervalMs: 30, keep: 0 })
    await new Promise((r) => setTimeout(r, 120))
    stop()
    expect((await listBackups()).length).toBeGreaterThanOrEqual(1)
  })
})

describe('createBackupFile / listBackups', () => {
  test('生成备份文件并写入 backupsRoot', async () => {
    const file = await createBackupFile()
    expect(path.dirname(file)).toBe(paths.backupsRoot)
    const files = await listBackups()
    expect(files).toHaveLength(1)
    const bundle = await read<{ format: string; redacted: boolean }>(file)
    expect(bundle.format).toBe(BACKUP_FORMAT)
    expect(bundle.redacted).toBe(false)
  })

  test('按 keep 滚动清理旧备份', async () => {
    await fs.mkdir(paths.backupsRoot, { recursive: true })
    for (let i = 0; i < 5; i++) {
      await fs.writeFile(
        path.join(paths.backupsRoot, `backup-old-${i}.json`),
        '{}',
      )
    }
    const file = await createBackupFile(3)
    const files = await listBackups()
    expect(files).toHaveLength(3)
    // 本次生成的最新一份必被保留
    expect(files.map((f) => f.name)).toContain(path.basename(file))
  })
})
