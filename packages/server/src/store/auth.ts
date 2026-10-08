// ── 登录认证：生效凭据解析与恒定时间比较 ──
import { createHash, timingSafeEqual } from 'node:crypto'
import { authFile } from '../paths.js'
import { readJsonSync } from './json.js'

// 优先级：CLI --user/--pwd > AUTH_USER/AUTH_PASSWORD 环境变量 > auth.json（面板可改）> 默认 admin/123456
const AUTH_CACHE_TTL = 5000
let _authCache: { users: Record<string, string>; at: number } | undefined

/** 清空认证凭据缓存（凭据被修改后必须调用，避免旧凭据继续生效） */
export function invalidateAuthCache() {
  _authCache = undefined
}

function _resolveAuthUncached(): Record<string, string> {
  const envUser = process.env.AUTH_USER || 'admin'
  const envPwd = process.env.AUTH_PASSWORD
  if (envPwd) return { [envUser]: envPwd }
  const file = readJsonSync<{ user?: string; password?: string }>(authFile, {})
  if (file.password) return { [file.user || 'admin']: file.password }
  return { admin: '123456' }
}

export function resolveAuth(
  cliUsers?: Record<string, string>,
): Record<string, string> {
  if (cliUsers) return cliUsers
  const now = Date.now()
  if (_authCache && now - _authCache.at < AUTH_CACHE_TTL)
    return _authCache.users
  const users = _resolveAuthUncached()
  _authCache = { users, at: now }
  return users
}

/**
 * 是否仍在使用内置默认凭据（admin/123456）。
 * 仅当既无 AUTH_PASSWORD 环境变量、也无 auth.json 自定义密码时为 true，供启动告警使用。
 */
export function usingDefaultAuth(): boolean {
  if (process.env.AUTH_PASSWORD) return false
  const file = readJsonSync<{ user?: string; password?: string }>(authFile, {})
  return !file.password
}

/**
 * 恒定时间字符串比较：先哈希再比较，长度差异与内容差异均不通过时间泄露。
 * 用于认证凭据校验，避免逐字符短路比较被计时侧信道利用。
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
