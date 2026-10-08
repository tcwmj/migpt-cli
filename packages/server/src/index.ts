// ── 服务入口：HTTP 服务组装（安全中间件 + 路由注册 + 启动）──────────
// 日志拦截必须先加载（console.* 被包装后，其他模块的日志同样进入 system.log）
import './logger.js'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import open from 'open'
import { getAllStatus, stop } from '@migptgui/controller'
import {
  seedBuiltinVoice,
  seedBuiltinModels,
  migrateRooms,
  seedDemoLogs,
  usingDefaultAuth,
} from './store.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerDeviceTtsRoutes } from './routes/device-tts.js'
import { registerAccountRoutes } from './routes/accounts.js'
import { registerRoleRoutes } from './routes/roles.js'
import { registerThinkServiceRoutes } from './routes/think-services.js'
import { registerVoiceServiceRoutes } from './routes/voice-services.js'
import { registerSpeakerModelRoutes } from './routes/speaker-models.js'
import { registerRoomRoutes } from './routes/rooms.js'
import { registerDeviceRoutes } from './routes/devices.js'
import { registerLogRoutes } from './routes/logs.js'
import { registerLegacyRoutes } from './routes/legacy.js'
import { registerTestRoutes } from './routes/misc.js'
import type { ServerOptions } from './routes/shared.js'

export type { ServerOptions }

export function runServer(options?: ServerOptions) {
  const port = options?.port || 36597
  // 认证默认启用（中间件无条件挂载）；--no-auth 时由 apps/server 传 auth:false
  const isAuth = options?.auth !== false

  const app = express()
  app.disable('x-powered-by')

  // 安全响应头（helmet）：禁止 MIME 嗅探、禁止被 iframe 嵌套、不向外部泄露来源地址。
  // CSP 用兼容型白名单；不启用 helmet 默认指令集——默认含 upgrade-insecure-requests，
  // 会把本地 http 访问升级为 https 而无法打开面板。HSTS / 跨域隔离同样关闭以兼容本地 HTTP。
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'frame-ancestors': ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      strictTransportSecurity: false,
      crossOriginEmbedderPolicy: false,
    }),
  )
  // Cookie 解析：登录会话（httpOnly Cookie）读取依赖此中间件
  app.use(cookieParser())

  // 健康检查 / 对外地址连通性测试：GET（Docker HEALTHCHECK）与 POST（面板测试）均支持
  app.all('/ping', (_req, res) => {
    res.status(204).send()
  })

  // 多设备 TTS：音箱直接访问，须在 JSON 解析之前注册
  registerDeviceTtsRoutes({ app, options })

  app.use(express.json({ limit: '1mb' }))

  // 静态资源匿名加载（前端 SPA 先加载 JS），API 全部要求认证
  if (options?.staticPath) {
    app.use(express.static(options.staticPath))
  }

  // 认证中间件必须先于其他 /api 路由挂载
  registerAuthRoutes({ app, options })

  registerAccountRoutes({ app, options })
  registerRoleRoutes({ app, options })
  registerThinkServiceRoutes({ app, options })
  registerVoiceServiceRoutes({ app, options })
  registerSpeakerModelRoutes({ app, options })
  registerRoomRoutes({ app, options })
  registerDeviceRoutes({ app, options })
  registerLogRoutes({ app, options })
  registerLegacyRoutes({ app, options })
  registerTestRoutes({ app, options })

  seedBuiltinVoice().catch(() => {})
  seedBuiltinModels().catch(() => {})
  migrateRooms().catch(() => {})
  seedDemoLogs().catch(() => {})
  const server = app.listen(port, () => {
    console.log('端口：', port)
    console.log('登录认证：', isAuth ? '已启用' : '未启用')
    console.log('秘密路径：', '已启用')
    // 默认凭据告警：仅在启用认证且未通过 --pwd / AUTH_PASSWORD / auth.json 覆盖时提示
    if (isAuth && !options?.users && usingDefaultAuth()) {
      console.warn(
        '\n⚠️  安全警告：正在使用默认登录凭据 admin/123456，任何人都可登录。\n' +
          '    请尽快在面板「我的」中修改密码，或设置 AUTH_PASSWORD 环境变量 / 使用 --pwd 启动参数。\n',
      )
    }
    if (options?.open) {
      open(`http://localhost:${port}`)
    }
  })

  // 优雅退出：容器编排 / 终端 Ctrl+C 发来停止信号时，先停掉全部设备子进程
  // 再关闭 HTTP 服务；否则 MiGPT 子进程会成为孤儿进程，继续占用账号与资源。
  let shuttingDown = false
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`收到 ${signal}，正在停止全部设备并关闭服务…`)
    const ids = Object.keys(getAllStatus())
    Promise.all(ids.map((id) => stop(id).catch(() => {}))).finally(() =>
      server.close(() => process.exit(0)),
    )
    // 兜底：连接未及时关闭或子进程不响应时，最多等待 8 秒强制退出
    setTimeout(() => process.exit(0), 8000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
