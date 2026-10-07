// ── 认证：Basic Auth 中间件（失败限流）+ 登录凭据修改 ────────────
import { authFile } from '../paths.js'
import {
  resolveAuth,
  invalidateAuthCache,
  safeEqual,
  writeJson,
} from '../store.js'
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

  // 自定义 Basic Auth：失败返回 JSON 401（不带 challenge），由前端渲染登录页。
  // 认证默认启用：凭据按 环境变量/--pwd > auth.json（面板可改）> 默认 admin/123456 解析。
  if (options?.auth !== false) {
    app.use('/api', (req, res, next) => {
      const ip = req.ip || 'unknown'
      if (authBlocked(ip)) {
        res.status(429).json({ error: '尝试次数过多，请稍后再试' })
        return
      }
      const users = resolveAuth(options?.users)
      const header = req.headers.authorization || ''
      const [type, token] = header.split(' ')
      if (type === 'Basic' && token) {
        let decoded = ''
        try {
          decoded = Buffer.from(token, 'base64').toString('utf-8')
        } catch {
          decoded = ''
        }
        const idx = decoded.indexOf(':')
        const user = idx >= 0 ? decoded.slice(0, idx) : ''
        const pass = idx >= 0 ? decoded.slice(idx + 1) : ''
        // 恒定时间比较；用户名不存在时也与空串比较，避免用户枚举
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
