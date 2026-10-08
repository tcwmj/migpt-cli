import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import type { Express, NextFunction, Request, Response } from 'express'

// backup.ts 只做「取 store 结果 → 组装 HTTP 响应」；此处 mock store 层，
// 用真实 DataValidationError 验证错误分支映射到 400。
jest.mock('../store.js', () => {
  const schemas = jest.requireActual<typeof import('../store/schemas.js')>(
    '../store/schemas.js',
  )
  return {
    buildBundle: jest.fn(),
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
  DataValidationError,
} from '../store.js'
import { registerBackupRoutes } from './backup.js'

type Handler = (req: Request, res: Response, next: NextFunction) => unknown

const makeApp = () => {
  const routes = new Map<string, Handler>()
  const app = {
    get: (p: string, h: Handler) => routes.set(`GET ${p}`, h),
    post: (p: string, h: Handler) => routes.set(`POST ${p}`, h),
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

const call = async (
  routes: Map<string, Handler>,
  key: string,
  body?: unknown,
) => {
  const res = makeRes()
  const errs: unknown[] = []
  const next = ((e: unknown) => errs.push(e)) as NextFunction
  await routes.get(key)!({ body } as Request, res as unknown as Response, next)
  return { res, errs }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('registerBackupRoutes · 导出', () => {
  test('设置下载响应头并回传脱敏包', async () => {
    jest.mocked(buildBundle).mockResolvedValue({
      format: 'migptgui-backup',
      formatVersion: 1,
      exportedAt: 1,
      dataVersion: 2,
      redacted: true,
      data: {},
    } as never)
    const { res } = await call(register(), 'GET /api/backup/export')
    expect(buildBundle).toHaveBeenCalledWith(true)
    expect(res.headers['Content-Type']).toContain('application/json')
    expect(res.headers['Content-Disposition']).toContain('attachment')
    expect(JSON.parse(res.sent as string).redacted).toBe(true)
  })
})

describe('registerBackupRoutes · 导入', () => {
  test('成功时回传导入统计', async () => {
    jest.mocked(applyBackup).mockResolvedValue({ accounts: 2 } as never)
    const { res } = await call(register(), 'POST /api/backup/import', {})
    expect(res.body).toEqual({ success: true, imported: { accounts: 2 } })
  })

  test('非法包（DataValidationError）回 400', async () => {
    jest
      .mocked(applyBackup)
      .mockRejectedValue(new DataValidationError('格式不匹配'))
    const { res, errs } = await call(register(), 'POST /api/backup/import', {})
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: '格式不匹配' })
    expect(errs).toHaveLength(0)
  })

  test('其他异常转交 next（交由统一错误中间件）', async () => {
    jest.mocked(applyBackup).mockRejectedValue(new Error('boom'))
    const { errs } = await call(register(), 'POST /api/backup/import', {})
    expect(errs).toHaveLength(1)
    expect((errs[0] as Error).message).toBe('boom')
  })
})

describe('registerBackupRoutes · 列表 / 立即备份', () => {
  test('列表回传备份清单', async () => {
    jest.mocked(listBackups).mockResolvedValue([{ name: 'b.json' }] as never)
    const { res } = await call(register(), 'GET /api/backup/list')
    expect(res.body).toEqual({ backups: [{ name: 'b.json' }] })
  })

  test('立即备份回传文件名', async () => {
    jest
      .mocked(createBackupFile)
      .mockResolvedValue('C:/data/backups/backup-1.json')
    const { res } = await call(register(), 'POST /api/backup/run')
    expect(res.body).toEqual({ success: true, file: 'backup-1.json' })
  })
})
