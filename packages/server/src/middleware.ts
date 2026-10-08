// ── 请求上下文中间件：请求 ID 贯穿 + 统一错误日志 ──
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { nanoid } from 'nanoid'
import { logger } from './logger.js'

/** 带请求 ID 的 Request（requestId 中间件首个挂载，后续处理链可直接读取） */
export type RequestWithId = Request & { id: string }

/** 读取请求 ID（未挂载中间件时回退空串，便于日志安全拼接） */
export function reqIdOf(req: Request): string {
  return (req as Partial<RequestWithId>).id ?? ''
}

/**
 * 为每个请求分配 ID：写入 `req.id`、回写 `X-Request-Id` 响应头，
 * 响应结束时按 debug 级记录耗时（默认不落盘，需排查时设 `LOG_LEVEL=debug`）。
 */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const id = nanoid(8)
    ;(req as RequestWithId).id = id
    res.setHeader('X-Request-Id', id)
    const start = process.hrtime.bigint()
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6
      logger.debug(
        {
          reqId: id,
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          ms: Math.round(ms),
        },
        'request',
      )
    })
    next()
  }
}

/**
 * 统一错误处理：记录带 reqId 的错误日志，返回最小错误体（含 reqId 便于对照日志）。
 * 在所有路由之后挂载；未捕获异常不再静默中断请求。
 */
export function errorHandler() {
  return (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (res.headersSent) {
      next(err)
      return
    }
    const reqId = reqIdOf(req)
    logger.error(
      { reqId, method: req.method, url: req.originalUrl, err },
      '未捕获的请求异常',
    )
    res.status(500).json({ error: '服务器内部错误', reqId })
  }
}
