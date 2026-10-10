// ── 统一业务错误：路由 / 存储共用，由 middleware.errorHandler 映射为响应 ──

/**
 * 客户端请求非法（如路径穿越的非法资源标识）：统一映射为 400。
 * 由 assertSafeId 等校验逻辑抛出，避免在各路由里重复写 fail(res, 400)。
 */
export class BadRequestError extends Error {
  constructor(message = '非法的请求参数') {
    super(message)
    this.name = 'BadRequestError'
  }
}

/**
 * 校验实体 id 安全：仅允许 [A-Za-z0-9_-]（与 nanoid 生成规则一致），
 * 杜绝路径穿越——id 直接拼入文件路径（devicesRoot/id/...），非法值可逃逸出数据目录。
 * 非法时抛 BadRequestError，由 errorHandler 转 400。
 */
export function assertSafeId(id: string | undefined): string {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new BadRequestError('非法的资源标识')
  }
  return id
}
