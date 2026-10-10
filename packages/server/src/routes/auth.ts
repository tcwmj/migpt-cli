// ── 认证：httpOnly Cookie 会话（主）+ Basic Auth（兼容）+ 凭据修改 ────
// 登录走标准模式（同 Pi-hole / Portainer 等自托管面板）：密码 POST 提交，
// 服务端 scrypt 恒定时间验证后签发 httpOnly Cookie；传输安全由 TLS 或
// 本地网络边界保证（公网部署套 HTTPS 反向代理），不自造私有传输协议。
import { rateLimit } from 'express-rate-limit'
import { resolveAuth, saveAuthCredentials, verifyPassword } from '../store.js'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  getSession,
  destroySession,
  bumpSessionEpoch,
} from '../session.js'
import {
  API_PREFIX,
  ok,
  fail,
  asyncHandler,
  type RouteContext,
} from './shared.js'

export function registerAuthRoutes({ app, options }: RouteContext): void {
  // 认证失败限流（express-rate-limit 标准实现）：窗口内失败超限直接拒绝，抵御口令爆破；
  // skipSuccessfulRequests 使成功请求清零语义（200 不计数、401/429 计数）。
  // 登录路由与认证中间件共享同一实例与额度，与原手写 Map 语义一致。
  // 注意：若部署在反向代理之后，需配置 app.set('trust proxy') 才能拿到真实客户端 IP。
  const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res) => fail(res, 429, '尝试次数过多，请稍后再试'),
  })

  // ── 登录 / 登出 / 会话探测：须先于认证中间件注册（匿名可访问）─────
  // 登录成功后签发 httpOnly Cookie，后续请求凭会话访问，不再重复提交密码。
  app.post(`${API_PREFIX}/login`, authLimiter, (req, res) => {
    const body = req.body as { user?: string; password?: string }
    const user = body.user || ''
    const users = resolveAuth(options?.users)
    // 用户不存在时凭据为空，验证一律不通过（避免用户枚举）
    const expected = users[user]
    if (expected && body.password && verifyPassword(expected, body.password)) {
      res.cookie(SESSION_COOKIE, createSession(user), {
        httpOnly: true,
        sameSite: 'strict',
        // 经 TLS 反向代理时自动加 secure，防 Cookie 在明文链路被截获重放
        secure: req.secure,
        path: '/',
        maxAge: SESSION_TTL_MS,
      })
      ok(res)
      return
    }
    fail(res, 401, 'unauthorized')
  })

  app.post(`${API_PREFIX}/logout`, (req, res) => {
    destroySession(req.cookies?.[SESSION_COOKIE])
    res.clearCookie(SESSION_COOKIE, { path: '/', secure: req.secure })
    ok(res)
  })

  app.get(`${API_PREFIX}/session`, (req, res) => {
    // 关闭认证时视为已登录，前端直接进入面板
    if (options?.auth === false) {
      res.json({ authed: true })
      return
    }
    res.json({ authed: !!getSession(req.cookies?.[SESSION_COOKIE]) })
  })

  // ── 认证中间件：优先校验会话 Cookie，其次兼容 Basic Auth ──────────
  // 认证默认启用：凭据按 环境变量/--pwd > auth.json（面板可改）> 默认 admin/123456 解析。
  // 与登录路由共享 authLimiter 额度：未认证请求同样计入失败计数。
  if (options?.auth !== false) {
    app.use(API_PREFIX, authLimiter, (req, res, next) => {
      if (getSession(req.cookies?.[SESSION_COOKIE])) {
        return next()
      }
      const header = req.headers.authorization || ''
      const [type, token] = header.split(' ')
      if (type === 'Basic' && token) {
        let decoded: string
        try {
          decoded = Buffer.from(token, 'base64').toString('utf-8')
        } catch {
          decoded = ''
        }
        const idx = decoded.indexOf(':')
        const user = idx >= 0 ? decoded.slice(0, idx) : ''
        const pass = idx >= 0 ? decoded.slice(idx + 1) : ''
        // scrypt 恒定时间验证；用户名不存在时不执行验证（避免用户枚举）
        const users = resolveAuth(options?.users)
        const expected = users[user]
        if (expected && pass && verifyPassword(expected, pass)) {
          return next()
        }
      }
      fail(res, 401, 'unauthorized')
    })
  }

  // ── 修改登录凭据（持久化到 auth.json，前端「我的」页调用）─────
  app.put(
    `${API_PREFIX}/auth`,
    asyncHandler(async (req, res) => {
      const body = req.body as {
        oldUser?: string
        oldPassword?: string
        newUser?: string
        newPassword?: string
      }
      if (!body.newUser || !body.newPassword) {
        fail(res, 400, '新用户名和新密码必填')
        return
      }
      const users = resolveAuth(options?.users)
      const current = users[body.oldUser || '']
      if (!current || !verifyPassword(current, body.oldPassword || '')) {
        fail(res, 403, '旧密码不正确')
        return
      }
      await saveAuthCredentials(body.newUser, body.newPassword)
      // 凭据已变更：令牌纪元 +1，全部已登录会话立即失效（用户需重新登录）
      bumpSessionEpoch()
      ok(res)
    }),
  )
}
