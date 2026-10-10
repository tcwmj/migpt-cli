// ── 登录会话：HMAC-SHA256 签名的无状态令牌（自包含过期时间，服务端零存储）──
// 早期实现把会话表放进程内存 Map：node --watch 等进程重启（dev 编译产物变动即重启）
// 会让全部已登录用户立即失效。改为无状态令牌后：
//   · 令牌 = base64url(payload).signature，payload 含过期时间与密钥纪元（epoch）
//   · 服务端只持久化「签名密钥 + 纪元」（session.secret），校验无需查表、重启不掉线
//   · 修改登录凭据时纪元 +1（见 bumpSessionEpoch），全部旧令牌立即失效——
//     等价于原「清空会话表」的安全语义；密钥文件删除同样使全部令牌失效
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'
import writeFileAtomic from 'write-file-atomic'
import { root } from './paths.js'
import { readJsonSync } from './store/json.js'

/** 会话 Cookie 名（httpOnly，前端 JS 不可读） */
export const SESSION_COOKIE = 'migpt-session'
/** 令牌有效期：7 天（绝对过期；活跃用户重新登录即刷新） */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface Session {
  user: string
}

// ── 密钥文件：签名密钥 + 纪元（随数据目录持久化，容器 VOLUME 一并保留） ──
const secretFile = `${root}/session.secret`

let _secret: { key: string; epoch: number } | undefined

function loadSecret(): { key: string; epoch: number } {
  if (_secret) return _secret
  const file = readJsonSync<{ key?: string; epoch?: number }>(secretFile, {})
  // 首次登录时惰性生成并落盘；文件损坏视为轮换，旧令牌全部失效
  _secret =
    typeof file.key === 'string' && file.key.length >= 32
      ? { key: file.key, epoch: file.epoch || 0 }
      : { key: randomBytes(32).toString('hex'), epoch: 0 }
  if (!file.key) persistSecret()
  return _secret
}

function persistSecret(): void {
  // 原子写：临时文件 + rename，避免进程崩溃在 rename 前留下半截 session.secret
  // 导致全部已签发令牌失效。写失败（数据目录不可写）时退化为进程内密钥：
  // 会话在本次进程生命周期内仍有效，仅「改密码使全部令牌失效」在重启后才彻底生效。
  writeFileAtomic(secretFile, JSON.stringify(_secret)).catch(() => {})
}

/** 修改登录凭据后必须调用：纪元 +1 使全部已签发令牌立即失效 */
export function bumpSessionEpoch(): void {
  const s = loadSecret()
  s.epoch += 1
  persistSecret()
}

/** 令牌载荷：用户 + 过期时间 + 纪元 */
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url')
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

/**
 * 签发新会话令牌（7 天绝对有效期）。
 * 清理过期项的逻辑随内存表一并移除——无状态令牌无需回收。
 */
export function createSession(user: string): string {
  const { key, epoch } = loadSecret()
  const payload = b64url(
    JSON.stringify({ u: user, e: Date.now() + SESSION_TTL_MS, g: epoch }),
  )
  return `${payload}.${sign(payload, key)}`
}

/**
 * 校验令牌：签名恒定时间比对 + 过期与纪元检查；无效返回 undefined。
 * 无状态，无滑动续期——活跃用户在令牌到期前重新登录即获新令牌。
 */
export function getSession(token: string | undefined): Session | undefined {
  if (!token) return undefined
  const dot = token.indexOf('.')
  if (dot <= 0) return undefined
  const payload = token.slice(0, dot)
  const { key, epoch } = loadSecret()
  const a = Buffer.from(sign(payload, key))
  const b = Buffer.from(token.slice(dot + 1))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined
  let data: { u?: string; e?: number; g?: number }
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
  if (!data.u || typeof data.e !== 'number') return undefined
  if (Date.now() > data.e) return undefined
  if (data.g !== epoch) return undefined
  return { user: data.u }
}

/** 注销：无状态令牌无法服务端吊销，由调用方清除浏览器 Cookie 即完成登出 */
export function destroySession(_token: string | undefined): void {
  // 保留空实现以维持调用方语义（登出路由仍会 clearCookie）
}
