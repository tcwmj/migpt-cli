// ── 认证：httpOnly Cookie 会话（主）+ Basic Auth（兼容）+ 凭据修改 ────
import { authFile } from '../paths.js'
import {
  resolveAuth,
  invalidateAuthCache,
  safeEqual,
  writeJson,
} from '../store.js'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  getSession,
  destroySession,
} from '../session.js'
import type { RouteContext } from './shared.js'

// 认证失败限流：同一来源在窗口内失败次数超限后直接拒绝，抵御口令爆破。
// 注意：若部署在反向代理之后，需配置 app.set('trust proxy') 才能拿到真实客户端 IP。
const AUTH_WINDOW_MS = 10 * 60 * 1000
const AUTH_MAX_FAILURES = 20

export function registerAuthRoutes({ app, options }: RouteContext): void {
  const authFailures = new Map<string, { count: number; resetAt: number }>()
  const authBlocked = (ip: string) => {
    const e = authFailures.get(ip)
    if (!e) return false
    if (Date.now() > e.resetAt) {
      authFailures.delete(ip)
      return false
    }
    return e.count >= AUTH_MAX_FAILURES
  }
  const noteAuthFailure = (ip: string) => {
    const now = Date.now()
    const e = authFailures.get(ip)
    if (!e || now > e.resetAt) {
      authFailures.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS })
      return
    }
    e.count++
  }

  // ── 登录 / 登出 / 会话探测：须先于认证中间件注册（匿名可访问）─────
  // 登录成功后签发 httpOnly Cookie，前端不再持有明文凭据。
  app.post('/api/login', (req, res) => {
    const ip = req.ip || 'unknown'
    if (authBlocked(ip)) {
      res.status(429).json({ error: '尝试次数过多，请稍后再试' })
      return
    }
    const body = req.body as { user?: string; password?: string }
    const user = body.user || ''
    const users = resolveAuth(options?.users)
    // 恒定时间比较；用户名不存在时也与空串比较，避免用户枚举
    const expected = users[user] ?? ''
    if (user && expected && safeEqual(expected, body.password || '')) {
      authFailures.delete(ip)
      res.cookie(SESSION_COOKIE, createSession(user), {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_TTL_MS,
      })
      res.json({ success: true })
      return
    }
    noteAuthFailure(ip)
    res.status(401).json({ error: 'unauthorized' })
  })

  app.post('/api/logout', (req, res) => {
    destroySession(req.cookies?.[SESSION_COOKIE])
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.json({ success: true })
  })

  app.get('/api/session', (req, res) => {
    // 关闭认证时视为已登录，前端直接进入面板
    if (options?.auth === false) {
      res.json({ authed: true })
      return
    }
    res.json({ authed: !!getSession(req.cookies?.[SESSION_COOKIE]) })
  })

  // ── 认证中间件：优先校验会话 Cookie，其次兼容 Basic Auth ──────────
  // 认证默认启用：凭据按 环境变量/--pwd > auth.json（面板可改）> 默认 admin/123456 解析。
  if (options?.auth !== false) {
    app.use('/api', (req, res, next) => {
      const ip = req.ip || 'unknown'
      if (authBlocked(ip)) {
        res.status(429).json({ error: '尝试次数过多，请稍后再试' })
        return
      }
      if (getSession(req.cookies?.[SESSION_COOKIE])) {
        authFailures.delete(ip)
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
        // 恒定时间比较；用户名不存在时也与空串比较，避免用户枚举
        const users = resolveAuth(options?.users)
        const expected = users[user] ?? ''
        if (user && expected && safeEqual(expected, pass)) {
          authFailures.delete(ip)
          return next()
        }
      }
      noteAuthFailure(ip)
      res.status(401).json({ error: 'unauthorized' })
    })
  }

  // ── 修改登录凭据（持久化到 auth.json，前端「我的」页调用）─────
  app.put('/api/auth', async (req, res) => {
    const body = req.body as {
      oldUser?: string
      oldPassword?: string
      newUser?: string
      newPassword?: string
    }
    if (!body.newUser || !body.newPassword) {
      res.status(400).json({ error: '新用户名和新密码必填' })
      return
    }
    const users = resolveAuth(options?.users)
    const current = users[body.oldUser || ''] ?? ''
    if (!current || !safeEqual(current, body.oldPassword || '')) {
      res.status(403).json({ error: '旧密码不正确' })
      return
    }
    await writeJson(authFile, {
      user: body.newUser,
      password: body.newPassword,
    })
    invalidateAuthCache()
    res.json({ success: true })
  })
}
