// ── 服务入口：HTTP 服务组装（安全中间件 + 路由注册 + 启动）──────────
import express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import open from 'open'
import { getAllStatus, stop } from '@migptgui/controller'
import {
  seedDemoLogs,
  runMigrations,
  usingDefaultAuth,
  startBackupScheduler,
  getEnv,
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
import { registerBackupRoutes } from './routes/backup.js'
import type { ServerOptions } from './routes/shared.js'
import { logger } from './logger.js'
import { requestId, errorHandler } from './middleware.js'

export type { ServerOptions }

export function runServer(options?: ServerOptions) {
  const port = options?.port || 36597
  // 认证默认启用（中间件无条件挂载）；--no-auth 时由 apps/server 传 auth:false
  const isAuth = options?.auth !== false

  const app = express()
  app.disable('x-powered-by')

  // 请求 ID：最先挂载，贯穿后续所有中间件与路由（响应头 X-Request-Id + 日志关联）
  app.use(requestId())

  // HTTP 压缩：>1KB 的响应自动 gzip/deflate（跳过已压缩图片和 x-no-compression 请求头）
  app.use(compression({ threshold: 1024 }))

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
    app.use(
      express.static(options.staticPath, {
        // 文件名无内容哈希，保守设 1 小时；前端构建改用哈希文件名后可提升到 1 年
        maxAge: '1h',
        etag: true,
      }),
    )
  }

  // 向后兼容：/api/* → /api/v1/*（307 保留原 HTTP 方法）
  app.use('/api', (req, _res, next) => {
    if (req.path.startsWith('/v1')) return next()
    _res.redirect(307, `/api/v1${req.path}`)
  })

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
  registerBackupRoutes({ app, options })

  // 统一错误处理：置于全部路由之后，捕获未处理异常并记录带 reqId 的错误日志
  app.use(errorHandler())

  // 启动顺序：先按数据版本升级（一次性结构变更），再注入演示日志；全部就绪后才开始监听。
  // 内置型号/语音源自代码（见 store/builtins.ts），无需种子写入；迁移/种子在监听前完成，
  // 避免首个请求读到升级中的半成品数据。
  let server: import('node:http').Server | undefined
  // 定时备份：env 控制间隔与保留份数（默认关闭）；unref 的定时器不阻止进程退出
  const stopBackups = startBackupScheduler({
    intervalMs: getEnv().BACKUP_INTERVAL_MS,
    keep: getEnv().BACKUP_KEEP,
  })
  void (async () => {
    try {
      await runMigrations()
    } catch (e) {
      logger.error({ err: e }, '数据迁移失败')
    }
    await Promise.allSettled([seedDemoLogs()])
    server = app.listen(port, () => {
      logger.info({ port }, '服务已启动')
      logger.info(`登录认证：${isAuth ? '已启用' : '未启用'}`)
      logger.info('秘密路径：已启用')
      // 默认凭据告警：仅在启用认证且未通过 --pwd / AUTH_PASSWORD / auth.json 覆盖时提示
      if (isAuth && !options?.users && usingDefaultAuth()) {
        logger.warn(
          '\n⚠️  安全警告：正在使用默认登录凭据 admin/123456，任何人都可登录。\n' +
            '    请尽快在面板「我的」中修改密码，或设置 AUTH_PASSWORD 环境变量 / 使用 --pwd 启动参数。\n',
        )
      }
      if (options?.open) {
        open(`http://localhost:${port}`)
      }
    })
  })()

  // 优雅退出：容器编排 / 终端 Ctrl+C 发来停止信号时，先停掉全部设备子进程
  // 再关闭 HTTP 服务；否则 MiGPT 子进程会成为孤儿进程，继续占用账号与资源。
  let shuttingDown = false
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    stopBackups()
    logger.info(`收到 ${signal}，正在停止全部设备并关闭服务…`)
    const ids = Object.keys(getAllStatus())
    Promise.all(ids.map((id) => stop(id).catch(() => {}))).finally(() => {
      // 监听尚未就绪时（迁移/种子阶段收到信号）直接退出
      if (server) server.close(() => process.exit(0))
      else process.exit(0)
    })
    // 兜底：连接未及时关闭或子进程不响应时，最多等待 8 秒强制退出
    setTimeout(() => process.exit(0), 8000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
