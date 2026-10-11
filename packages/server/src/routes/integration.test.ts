// ── 路由级集成测试：真实 Express 应用（createApp）+ supertest HTTP 驱动 ──
// 目的：在「完整中间件链」（helmet/cookieParser/认证/限流/errorHandler）下
// 验证 P0 安全修复的路由行为——这些是单元级 handler 测试覆盖不到的（如
// BadRequestError 须经 asyncHandler→errorHandler 才变成 400 响应）。
import { jest, describe, test, expect, beforeAll } from '@jest/globals'
import fs from 'node:fs'
import path from 'node:path'
import { Buffer } from 'node:buffer'

// paths.ts 在模块加载时即用 os.homedir() 计算固定路径；替换为临时目录，
// 避免污染真实 ~/.migptgui（沿用 store 层测试的既有模式）。
jest.mock('../paths.js', () => {
  const os = jest.requireActual<typeof import('node:os')>('node:os')
  const p = jest.requireActual<typeof import('node:path')>('node:path')
  const f = jest.requireActual<typeof import('node:fs')>('node:fs')
  const root = f.mkdtempSync(p.join(os.tmpdir(), 'migpt-integration-'))
  return {
    root,
    devicesRoot: p.join(root, 'devices'),
    credentialsFile: p.join(root, 'credentials.json'),
    credentialsFile: p.join(root, 'credentials.json'),
    robotsFile: p.join(root, 'robots.json'),
    modelsFile: p.join(root, 'models.json'),
    voicesFile: p.join(root, 'voices.json'),
    speakerModelsFile: p.join(root, 'speakerModels.json'),
    conversationsFile: p.join(root, 'conversations.json'),
    authFile: p.join(root, 'auth.json'),
    logsDir: p.join(root, 'logs'),
    systemLogFile: p.join(root, 'system.log'),
    systemLogPrefix: p.join(root, 'system'),
    overridesFile: p.join(root, 'overrides.json'),
    dataVersionFile: p.join(root, 'version.json'),
    backupsRoot: p.join(root, 'backups'),
  }
})

// controller 为 ESM 包（jest 不转换 node_modules 中的 ESM），且集成测试
// 无需真实设备子进程——桩掉其对外暴露面即可。
jest.mock('@migptgui/controller', () => ({
  getAllStatus: () => ({}),
  stop: jest.fn(async () => {}),
  run: jest.fn(async () => {}),
}))

// mi-gpt-tts 同为 ESM 包，仅 TTS 路由用到，桩掉避免解析失败。
jest.mock('mi-gpt-tts', () => ({
  createTTS: jest.fn(),
  kTTSSpeakers: [],
}))

import request from 'supertest'
import * as paths from '../paths.js'
import { createApp } from '../index.js'

const basic = 'Basic ' + Buffer.from('admin:123456').toString('base64')

let app: ReturnType<typeof createApp>

beforeAll(() => {
  expect(paths.root).toContain('migpt-integration-')
  app = createApp()
})

describe('认证中间件（完整链）', () => {
  test('未认证访问 API → 401', async () => {
    const res = await request(app).get('/api/v1/devices')
    expect(res.status).toBe(401)
  })

  test('Basic 认证（默认凭据 admin/123456）可通过', async () => {
    const res = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', basic)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('登录签发 httpOnly 会话 Cookie', async () => {
    const res = await request(app)
      .post('/api/v1/login')
      .send({ user: 'admin', password: '123456' })
    expect(res.status).toBe(200)
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toContain('migpt-session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
  })

  test('trust proxy 已启用：经 TLS 反代（X-Forwarded-Proto: https）登录时 Cookie 加 Secure', async () => {
    expect(app.get('trust proxy')).toBe(1)
    const res = await request(app)
      .post('/api/v1/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ user: 'admin', password: '123456' })
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']?.[0]).toContain('Secure')
  })
})

describe('路径穿越防护（assertSafeId 经完整链回 400）', () => {
  const evil = encodeURIComponent('../../etc/passwd')
  const evilDot = encodeURIComponent('..')

  test('GET /devices/:id 非法 id → 400（而非落盘读或 500）', async () => {
    for (const id of [evil, evilDot, 'x'.repeat(65)]) {
      const res = await request(app)
        .get(`/api/v1/devices/${id}`)
        .set('Authorization', basic)
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    }
  })

  test('DELETE /devices/:id 非法 id → 400', async () => {
    const res = await request(app)
      .delete(`/api/v1/devices/${evil}`)
      .set('Authorization', basic)
    expect(res.status).toBe(400)
  })

  test('GET /devices/:id/logs 非法 id → 400', async () => {
    const res = await request(app)
      .get(`/api/v1/devices/${evil}/logs`)
      .set('Authorization', basic)
    expect(res.status).toBe(400)
  })

  test('合法格式但不存在的 id → 404（校验放行、业务判缺）', async () => {
    const res = await request(app)
      .get('/api/v1/devices/nonexistent')
      .set('Authorization', basic)
    expect(res.status).toBe(404)
  })

  test('备份导入含非法设备 id → 400 且未落盘任何穿越文件', async () => {
    const bundle = {
      format: 'migptgui-backup',
      formatVersion: 1,
      exportedAt: Date.now(),
      dataVersion: 3,
      redacted: false,
      data: {
        credentials: {},
        credentials: [],
        robots: [],
        models: [],
        voices: [],
        speakerModels: [],
        conversations: [],
        devices: [
          {
            id: '../../evil',
            alias: 'e',
            didPrefix: 'd',
            ttsSecret: 's',
            createdAt: 1,
          },
        ],
        overrides: {},
      },
    }
    const res = await request(app)
      .post('/api/v1/backup/import')
      .set('Authorization', basic)
      .send(bundle)
    expect(res.status).toBe(400)
    // 穿越目标（root 的上两级）不应出现 evil 目录
    const outside = path.resolve(paths.root, '..', '..', 'evil')
    expect(fs.existsSync(outside)).toBe(false)
  })
})

describe('SSRF 防护（/api/test 目标白名单经完整链回 400）', () => {
  const post = (url: unknown) =>
    request(app).post('/api/v1/test').set('Authorization', basic).send({ url })

  test('非 http/https 协议 → 400', async () => {
    for (const url of ['file:///etc/passwd', 'gopher://127.0.0.1:11211/', '']) {
      const res = await post(url)
      expect(res.status).toBe(400)
    }
  })

  test('回环 / 链路本地 / 云元数据地址 → 400（不发起对外连接）', async () => {
    for (const url of [
      'http://127.0.0.1:36597/ping',
      'http://localhost:8080/ping',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]:80/ping',
      'http://0.0.0.0/ping',
    ]) {
      const res = await post(url)
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    }
  })
})

describe('GET /api/v1/stats（真实链路，空数据）', () => {
  test('返回完整统计结构且数值为零', async () => {
    const res = await request(app)
      .get('/api/v1/stats?range=today')
      .set('Authorization', basic)
    expect(res.status).toBe(200)
    expect(res.body.totals).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      conversations: 0,
    })
    expect(Array.isArray(res.body.timeline)).toBe(true)
    expect(res.body.entities).toBeDefined()
    expect(Array.isArray(res.body.serviceHealth)).toBe(true)
    expect(Array.isArray(res.body.deviceHealth)).toBe(true)
  })

  test('非法日期格式 → 400', async () => {
    const res = await request(app)
      .get('/api/v1/stats?from=abc&to=def')
      .set('Authorization', basic)
    expect(res.status).toBe(400)
  })
})
