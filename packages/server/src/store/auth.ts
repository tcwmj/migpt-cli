// ── 登录认证：scrypt 密码哈希（PHC 标准格式）与恒定时间比较 ──
// 业界标准做法（同 Pi-hole / Portainer / Home Assistant 等自托管面板）：
// auth.json 只落 scrypt 密码哈希（RFC 7914 标准原语 + PHC 格式串），不存明文；
// 密码经 HTTP POST 提交，传输安全由 TLS（或本地回环/可信网络边界）保证，
// 公网部署请套 HTTPS 反向代理——不自造私有密码传输协议。
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { authFile } from '../paths.js'
import { readJsonSync } from './json.js'
import { writeJsonChecked, authSchema } from './schemas.js'
import { getEnv } from './env.js'
import { logger } from '../logger.js'

// scrypt 参数（N=16384 为 Node/OpenSSL 默认，内存硬抗 GPU 撞库）；
// 参数与盐内嵌在 PHC 格式串 `scrypt$N$r$p$salt$hash` 中，便于未来调参
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1

/** 从明文密码派生 PHC 格式哈希（仅凭据变更时执行） */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

/**
 * 验证明文输入是否匹配存储哈希：以存储盐对输入做同参数 scrypt 后恒定时间比对。
 * 格式串损坏时返回 false（不抛错）。
 */
export function verifyPassword(hash: string, input: string): boolean {
  const parts = hash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const expected = Buffer.from(parts[5], 'hex')
  if (!expected.length) return false
  const actual = scryptSync(input, Buffer.from(parts[4], 'hex'), expected.length, {
    N: Number(parts[1]),
    r: Number(parts[2]),
    p: Number(parts[3]),
  })
  return timingSafeEqual(expected, actual)
}

// 优先级：CLI --user/--pwd > AUTH_USER/AUTH_PASSWORD 环境变量 > auth.json（面板可改）> 默认 admin/123456
const AUTH_CACHE_TTL = 5000
let _authCache: { users: Record<string, string>; at: number } | undefined

/** 清空认证凭据缓存（凭据被修改后必须调用，避免旧凭据继续生效） */
export function invalidateAuthCache() {
  _authCache = undefined
}

/** 保存登录凭据：仅落 scrypt 哈希到 auth.json（不写明文）并清空缓存 */
export async function saveAuthCredentials(
  user: string,
  password: string,
): Promise<void> {
  await writeJsonChecked(
    authFile,
    { user, passwordHash: hashPassword(password) },
    authSchema,
    '登录凭据',
  )
  invalidateAuthCache()
}

function _resolveAuthUncached(): Record<string, string> {
  const env = getEnv()
  // 环境变量 / 默认密码仅存在于进程内存，auth.json 泄露不影响
  if (env.AUTH_PASSWORD) return { [env.AUTH_USER]: hashPassword(env.AUTH_PASSWORD) }
  const file = readJsonSync<{ user?: string; password?: string; passwordHash?: string }>(
    authFile,
    {},
  )
  const user = file.user || 'admin'
  // passwordHash 为 auth.json 的 scrypt 哈希字段；
  // password 为旧版明文字段，读到时惰性迁移为哈希格式覆盖写回
  if (file.passwordHash) return { [user]: file.passwordHash }
  if (file.password) {
    const hash = hashPassword(file.password)
    void saveAuthCredentials(user, file.password).catch((e) => {
      logger.error({ err: e }, 'auth.json 明文凭据迁移为哈希格式失败')
    })
    return { [user]: hash }
  }
  return { admin: hashPassword('123456') }
}

/** 解析生效凭据：返回 用户名 → scrypt 哈希（内存/文件来源统一为哈希形态） */
export function resolveAuth(
  cliUsers?: Record<string, string>,
): Record<string, string> {
  if (cliUsers) {
    const out: Record<string, string> = {}
    for (const [u, p] of Object.entries(cliUsers)) out[u] = hashPassword(p)
    return out
  }
  const now = Date.now()
  if (_authCache && now - _authCache.at < AUTH_CACHE_TTL)
    return _authCache.users
  const users = _resolveAuthUncached()
  _authCache = { users, at: now }
  return users
}

/**
 * 是否仍在使用内置默认凭据（admin/123456）。
 * 仅当既无 AUTH_PASSWORD 环境变量、也无 auth.json 自定义凭据时为 true，供启动告警使用。
 */
export function usingDefaultAuth(): boolean {
  if (getEnv().AUTH_PASSWORD) return false
  const file = readJsonSync<{ password?: string; passwordHash?: string }>(
    authFile,
    {},
  )
  return !file.passwordHash && !file.password
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
