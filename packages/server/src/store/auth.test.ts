import { describe, test, expect, afterEach } from '@jest/globals'
import {
  hashPassword,
  invalidateAuthCache,
  resolveAuth,
  safeEqual,
  usingDefaultAuth,
  verifyPassword,
} from './auth.js'

const savedPwd = process.env.AUTH_PASSWORD
const savedUser = process.env.AUTH_USER

afterEach(() => {
  if (savedPwd === undefined) delete process.env.AUTH_PASSWORD
  else process.env.AUTH_PASSWORD = savedPwd
  if (savedUser === undefined) delete process.env.AUTH_USER
  else process.env.AUTH_USER = savedUser
  invalidateAuthCache()
})

describe('safeEqual', () => {
  test('相同字符串为 true', () => {
    expect(safeEqual('admin', 'admin')).toBe(true)
  })

  test('内容不同（等长）为 false', () => {
    expect(safeEqual('admin', 'admiN')).toBe(false)
  })

  test('长度不同为 false 且不抛错', () => {
    expect(safeEqual('a', 'aaaaaaaa')).toBe(false)
  })

  test('空串相等为 true', () => {
    expect(safeEqual('', '')).toBe(true)
  })
})

describe('hashPassword / verifyPassword', () => {
  test('哈希为 PHC 格式 scrypt 串且不含明文', () => {
    const hash = hashPassword('my-pwd')
    expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/)
    expect(hash).not.toContain('my-pwd')
  })

  test('同密码不同盐：哈希不同但均验证通过', () => {
    const a = hashPassword('my-pwd')
    const b = hashPassword('my-pwd')
    expect(a).not.toBe(b)
    expect(verifyPassword(a, 'my-pwd')).toBe(true)
    expect(verifyPassword(b, 'my-pwd')).toBe(true)
  })

  test('错误密码与损坏格式串均验证失败', () => {
    const hash = hashPassword('my-pwd')
    expect(verifyPassword(hash, 'wrong')).toBe(false)
    expect(verifyPassword('broken', 'my-pwd')).toBe(false)
    expect(verifyPassword('scrypt$1$1$1$$', 'my-pwd')).toBe(false)
  })
})

describe('resolveAuth', () => {
  test('传入 CLI 凭据时派生哈希凭据（最高优先级）', () => {
    const r = resolveAuth({ cliUser: 'cliPwd' })
    expect(Object.keys(r)).toEqual(['cliUser'])
    expect(r.cliUser).toMatch(/^scrypt\$/)
    expect(verifyPassword(r.cliUser, 'cliPwd')).toBe(true)
    expect(verifyPassword(r.cliUser, 'bad')).toBe(false)
  })

  test('AUTH_PASSWORD / AUTH_USER 环境变量生效', () => {
    process.env.AUTH_PASSWORD = 'env-pwd'
    process.env.AUTH_USER = 'env-user'
    invalidateAuthCache()
    const r = resolveAuth()
    expect(Object.keys(r)).toEqual(['env-user'])
    expect(verifyPassword(r['env-user'], 'env-pwd')).toBe(true)
  })

  test('缓存 TTL 内复用同一哈希，invalidate 后立即刷新', () => {
    process.env.AUTH_PASSWORD = 'p1'
    invalidateAuthCache()
    const first = resolveAuth()
    expect(resolveAuth()).toBe(first)
    process.env.AUTH_PASSWORD = 'p2'
    expect(resolveAuth()).toBe(first)
    invalidateAuthCache()
    const second = resolveAuth()
    expect(second.admin).not.toBe(first.admin)
    expect(verifyPassword(second.admin, 'p2')).toBe(true)
    expect(verifyPassword(second.admin, 'p1')).toBe(false)
  })
})

describe('usingDefaultAuth', () => {
  test('设置了 AUTH_PASSWORD 时不再视为默认凭据', () => {
    process.env.AUTH_PASSWORD = 'x'
    expect(usingDefaultAuth()).toBe(false)
  })
})
