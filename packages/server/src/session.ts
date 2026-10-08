// ── 会话：登录后签发 httpOnly Cookie 令牌，凭据不再落到前端可读存储 ──
import { nanoid } from 'nanoid'

/** 会话 Cookie 名（httpOnly，前端 JS 不可读） */
export const SESSION_COOKIE = 'migpt-session'
/** 会话有效期（滑动续期）：7 天 */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface Session {
  user: string
  expiresAt: number
}

// 内存会话表：进程重启即失效（本地面板可接受，重启后重新登录）
const sessions = new Map<string, Session>()

/** 签发新会话，返回 Cookie 令牌 */
export function createSession(user: string): string {
  const token = nanoid(32)
  sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS })
  return token
}

/** 校验会话并滑动续期；无效或过期返回 undefined */
export function getSession(token: string | undefined): Session | undefined {
  if (!token) return undefined
  const s = sessions.get(token)
  if (!s) return undefined
  if (Date.now() > s.expiresAt) {
    sessions.delete(token)
    return undefined
  }
  s.expiresAt = Date.now() + SESSION_TTL_MS
  return s
}

/** 注销单个会话 */
export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token)
}
