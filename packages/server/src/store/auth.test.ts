import { describe, test, expect, afterEach } from '@jest/globals'
import {
  invalidateAuthCache,
  resolveAuth,
  safeEqual,
  usingDefaultAuth,
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

describe('resolveAuth', () => {
  test('传入 CLI 凭据时原样返回（最高优先级）', () => {
    const cli = { cliUser: 'cliPwd' }
    expect(resolveAuth(cli)).toBe(cli)
  })

  test('AUTH_PASSWORD / AUTH_USER 环境变量生效', () => {
    process.env.AUTH_PASSWORD = 'env-pwd'
    process.env.AUTH_USER = 'env-user'
    invalidateAuthCache()
    expect(resolveAuth()).toEqual({ 'env-user': 'env-pwd' })
  })

  test('缓存 TTL 内复用旧值，invalidate 后立即刷新', () => {
    process.env.AUTH_PASSWORD = 'p1'
    invalidateAuthCache()
    expect(resolveAuth()).toEqual({ admin: 'p1' })
    process.env.AUTH_PASSWORD = 'p2'
    expect(resolveAuth()).toEqual({ admin: 'p1' })
    invalidateAuthCache()
    expect(resolveAuth()).toEqual({ admin: 'p2' })
  })
})

describe('usingDefaultAuth', () => {
  test('设置了 AUTH_PASSWORD 时不再视为默认凭据', () => {
    process.env.AUTH_PASSWORD = 'x'
    expect(usingDefaultAuth()).toBe(false)
  })
})
