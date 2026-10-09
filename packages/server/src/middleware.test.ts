import { jest, describe, test, expect } from '@jest/globals'

jest.mock('./paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-mw-'))
  return {
    root,
    systemLogFile: p.join(root, 'system.log'),
    systemLogPrefix: p.join(root, 'system'),
  }
})

import { requestId, errorHandler, reqIdOf } from './middleware.js'
import { logger } from './logger.js'

const makeRes = () => {
  const handlers: Array<() => void> = []
  const res = {
    statusCode: 200,
    setHeader: jest.fn(),
    on: (ev: string, cb: () => void) => {
      if (ev === 'finish') handlers.push(cb)
    },
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    headersSent: false,
    emitFinish: () => handlers.forEach((h) => h()),
  }
  return res
}

describe('requestId 中间件', () => {
  test('分配请求 ID、回写响应头并放行', () => {
    const req = { method: 'GET', originalUrl: '/api/x' } as any
    const res = makeRes()
    const next = jest.fn()

    requestId()(req, res as any, next)

    expect(typeof req.id).toBe('string')
    expect(req.id).toHaveLength(8)
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id)
    expect(next).toHaveBeenCalled()
    expect(reqIdOf(req)).toBe(req.id)

    // 响应结束回调：记录耗时（debug 级，默认不落盘）且不抛错
    expect(() => res.emitFinish()).not.toThrow()
  })

  test('reqIdOf 对未挂载中间件的请求回退空串', () => {
    expect(reqIdOf({} as any)).toBe('')
  })
})

describe('errorHandler 中间件', () => {
  test('记录错误日志并返回带 reqId 的 500 响应', () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    const req = { id: 'r1', method: 'GET', originalUrl: '/api/x' } as any
    const res = makeRes()
    const next = jest.fn()

    errorHandler()(new Error('boom'), req, res as any, next)

    expect(spy).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: '服务器内部错误',
      reqId: 'r1',
    })
    expect(next).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('响应已发送时交给 next 处理', () => {
    const req = {} as any
    const res = { headersSent: true } as any
    const next = jest.fn()

    errorHandler()(new Error('boom'), req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
