import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterAll,
} from '@jest/globals'
import type { Response } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'

jest.mock('../paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-shared-'))
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
  }
})

jest.mock('../store.js', () => {
  const actual = jest.requireActual<typeof import('../store/entities.js')>(
    '../store/entities.js',
  )
  return {
    listDevices: jest.fn(async () => []),
    loadDeviceConfig: actual.loadDeviceConfig,
  }
})

import * as paths from '../paths.js'
import { listDevices } from '../store.js'
import { logger } from '../logger.js'
import {
  pick,
  normProfile,
  findIndexOr404,
  refConflict,
  loadDeviceConfig,
  findDeviceBySecret,
  ROBOT_FIELDS,
} from './shared.js'

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
  }
  // 交集类型：既保留断言用的 statusCode/body，又满足 findIndexOr404/refConflict 的 Response 形参
  return res as typeof res & Response
}

beforeEach(async () => {
  // maxRetries：Windows 下 pino-roll 日志流可能仍在异步落盘，
  // 立即递归删除会撞 ENOTEMPTY/EBUSY，交给 fs.rm 内置重试
  const rmOpts = {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  }
  await fs.rm(paths.root, rmOpts)
  await fs.mkdir(paths.root, { recursive: true })
  jest.mocked(listDevices).mockResolvedValue([])
})

afterAll(async () => {
  await fs.rm(paths.root, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  })
})

describe('pick', () => {
  test('只保留白名单字段，剔除受控字段', () => {
    const out = pick<{ name: string; id: string }>(
      { name: 'n', id: 'evil', createdAt: 1 },
      ['name'],
    )
    expect(out).toEqual({ name: 'n' })
    expect('id' in out).toBe(false)
  })

  test('非对象入参返回空对象', () => {
    expect(pick(null, ROBOT_FIELDS)).toEqual({})
    expect(pick('str', ROBOT_FIELDS)).toEqual({})
  })

  test('缺失字段不写入结果', () => {
    expect(pick({ name: 'a' }, ['name', 'profile'])).toEqual({ name: 'a' })
  })
})

describe('normProfile', () => {
  test('字面 \\n 归一为真实换行', () => {
    expect(normProfile('a\\nb')).toBe('a\nb')
  })

  test('空值返回空串', () => {
    expect(normProfile(undefined)).toBe('')
  })
})

describe('findIndexOr404', () => {
  test('命中返回下标', () => {
    const res = makeRes()
    expect(findIndexOr404(res, [{ id: 'a' }, { id: 'b' }], 'b', '条目')).toBe(1)
    expect(res.statusCode).toBe(200)
  })

  test('未命中回 404 并返回 null', () => {
    const res = makeRes()
    expect(findIndexOr404(res, [{ id: 'a' }], 'x', '条目')).toBeNull()
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: '条目不存在' })
  })
})

describe('refConflict', () => {
  test('回 409 并附带引用清单', () => {
    const res = makeRes()
    refConflict(res, { devices: ['客厅'] }, '正被引用')
    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: '正被引用', refs: { devices: ['客厅'] } })
  })
})

describe('loadDeviceConfig', () => {
  test('default 设备读取 root/default/migptgui.json', async () => {
    await fs.mkdir(path.join(paths.root, 'default'), { recursive: true })
    await fs.writeFile(
      path.join(paths.root, 'default', 'migptgui.json'),
      JSON.stringify({ a: 1 }),
    )
    expect(await loadDeviceConfig('default')).toEqual({ a: 1 })
  })

  test('普通设备读取 devicesRoot/<id>/migptgui.json', async () => {
    await fs.mkdir(path.join(paths.devicesRoot, 'd1'), { recursive: true })
    await fs.writeFile(
      path.join(paths.devicesRoot, 'd1', 'migptgui.json'),
      JSON.stringify({ b: 2 }),
    )
    expect(await loadDeviceConfig('d1')).toEqual({ b: 2 })
  })

  test('文件不存在返回 undefined', async () => {
    expect(await loadDeviceConfig('missing')).toBeUndefined()
  })

  test('内容损坏时告警并返回 undefined', async () => {
    await fs.mkdir(path.join(paths.devicesRoot, 'bad'), { recursive: true })
    await fs.writeFile(
      path.join(paths.devicesRoot, 'bad', 'migptgui.json'),
      '{ not json',
    )
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    expect(await loadDeviceConfig('bad')).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('findDeviceBySecret', () => {
  test('按 ttsSecret 命中设备', async () => {
    jest.mocked(listDevices).mockResolvedValue([
      {
        id: 'd1',
        alias: 'A',
        did: 'X',
        robotId: 'r1',
        ttsSecret: 's1',
        createdAt: 1,
      },
      {
        id: 'd2',
        alias: 'B',
        did: 'X',
        robotId: 'r1',
        ttsSecret: 's2',
        createdAt: 2,
      },
    ])
    expect((await findDeviceBySecret('s2'))?.id).toBe('d2')
    expect(await findDeviceBySecret('nope')).toBeUndefined()
  })
})
