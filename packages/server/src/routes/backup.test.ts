import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import type { Express, NextFunction, Request, Response } from 'express'

// backup.ts 只做「取 store 结果 → 组装 HTTP 响应」；此处 mock store 层，
// 用真实 DataValidationError 验证错误分支映射到 400。
jest.mock('../store.js', () => {
  const schemas = jest.requireActual<typeof import('../store/schemas.js')>(
    '../store/schemas.js',
  )
  return {
    BACKUP_FORMAT: 'migptgui-backup',
    buildBundle: jest.fn(),
    bundleToZip: jest.fn((b: unknown) =>
      Buffer.from(JSON.stringify(b), 'utf8'),
    ),
    // 解析桩：把入参原样当作 bundle 交给 applyBackup，聚焦路由分支
    parseBackupPayload: jest.fn((buf: Buffer) =>
      buf.length === 0
        ? ({} as never)
        : (JSON.parse(buf.toString('utf8')) as never),
    ),
    applyBackup: jest.fn(),
    createBackupFile: jest.fn(),
    listBackups: jest.fn(),
    DataValidationError: schemas.DataValidationError,
  }
})

import {
  applyBackup,
  buildBundle,
  createBackupFile,
  listBackups,
  parseBackupPayload,
  DataValidationError,
} from '../store.js'
import { registerBackupRoutes } from './backup.js'

type Handler = (req: Request, res: Response, next: NextFunction) => unknown

const makeApp = () => {
  const routes = new Map<string, Handler>()
  // post 支持多 handler（express.raw 中间件 + 真实处理器）：注册最后一个
  const app = {
    get: (p: string, h: Handler) => routes.set(`GET ${p}`, h),
    post: (p: string, ...hs: Handler[]) =>
      routes.set(`POST ${p}`, hs[hs.length - 1]),
  }
  return { app: app as unknown as Express, routes }
}

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    sent: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      res.headers[name] = value
      return res
    },
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
    send(body: unknown) {
      res.sent = body
      return res
    },
  }
  return res
}

const register = () => {
  const { app, routes } = makeApp()
  registerBackupRoutes({ app })
  return routes
}

// 导入以 Buffer 载荷调用（经 parseBackupPayload 桩解析）
const call = async (
  routes: Map<string, Handler>,
  key: string,
  payload?: unknown,
) => {
  const res = makeRes()
  const errs: unknown[] = []
  const next = ((e: unknown) => errs.push(e)) as NextFunction
  const body = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(JSON.stringify(payload ?? {}), 'utf8')
  await routes.get(key)!({ body } as Request, res as unknown as Response, next)
  return { res, errs }
}

beforeEach(() => {
  jest.clearAllMocks()
  // parseBackupPayload 桩默认把 Buffer 当 JSON 文本解析
  jest
    .mocked(parseBackupPayload)
    .mockImplementation((buf: Buffer) =>
      buf.length === 0
        ? ({} as never)
        : (JSON.parse(buf.toString('utf8')) as never),
    )
})

describe('registerBackupRoutes · 导出', () => {
  test('设置 ZIP 下载响应头并回传 zip 二进制', async () => {
    const bundle = {
      format: 'migptgui-backup',
      formatVersion: 2,
      exportedAt: 1,
      dataVersion: 7,
      redacted: false,
      data: {},
    }
    jest.mocked(buildBundle).mockResolvedValue(bundle as never)
    const { res } = await call(register(), 'GET /api/v1/backup/export')
    // 全明文导出
    expect(buildBundle).toHaveBeenCalledWith(false)
    expect(res.headers['Content-Type']).toContain('application/zip')
    expect(res.headers['Content-Disposition']).toContain('.zip')
    expect(Buffer.isBuffer(res.sent)).toBe(true)
  })
})

describe('registerBackupRoutes · 导入', () => {
  test('合法包（Buffer 载荷）解析后回传导入统计', async () => {
    jest.mocked(applyBackup).mockResolvedValue({ credentials: 2 } as never)
    const { res } = await call(
      register(),
      'POST /api/v1/backup/import',
      Buffer.from(JSON.stringify({ format: 'migptgui-backup' }), 'utf8'),
    )
    expect(res.body).toEqual({ success: true, imported: { credentials: 2 } })
  })

  test('非法包（DataValidationError）回 400', async () => {
    jest
      .mocked(applyBackup)
      .mockRejectedValue(new DataValidationError('格式不匹配'))
    const { res, errs } = await call(
      register(),
      'POST /api/v1/backup/import',
      Buffer.from('{}', 'utf8'),
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: '格式不匹配' })
    expect(errs).toHaveLength(0)
  })

  test('解析阶段抛 DataValidationError 同样回 400', async () => {
    jest.mocked(parseBackupPayload).mockImplementation(() => {
      throw new DataValidationError('ZIP 校验失败：条目 CRC 不符')
    })
    const { res } = await call(
      register(),
      'POST /api/v1/backup/import',
      Buffer.from('garbage', 'utf8'),
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'ZIP 校验失败：条目 CRC 不符' })
  })

  test('其他异常转交 next（交由统一错误中间件）', async () => {
    jest.mocked(applyBackup).mockRejectedValue(new Error('boom'))
    const { errs } = await call(
      register(),
      'POST /api/v1/backup/import',
      Buffer.from('{}', 'utf8'),
    )
    expect(errs).toHaveLength(1)
    expect((errs[0] as Error).message).toBe('boom')
  })
})

describe('registerBackupRoutes · 列表 / 立即备份', () => {
  test('列表回传备份清单', async () => {
    jest.mocked(listBackups).mockResolvedValue([{ name: 'b.zip' }] as never)
    const { res } = await call(register(), 'GET /api/v1/backup/list')
    expect(res.body).toEqual({ backups: [{ name: 'b.zip' }] })
  })

  test('立即备份回传文件名', async () => {
    jest.mocked(createBackupFile).mockResolvedValue('/x/backup-1.zip' as never)
    const { res } = await call(register(), 'POST /api/v1/backup/run')
    expect(res.body).toEqual({ success: true, file: 'backup-1.zip' })
  })
})
