// ── 服务入口：HTTP 服务组装（安全中间件 + 路由注册 + 启动）──────────
// 日志拦截必须先加载（console.* 被包装后，其他模块的日志同样进入 system.log）
import './logger.js'
import express from 'express'
import open from 'open'
import {
  seedBuiltinVoice,
  seedBuiltinModels,
  migrateRooms,
  seedDemoLogs,
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

  // 安全响应头：禁止 MIME 嗅探、禁止被 iframe 嵌套、不向外部泄露来源地址
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    next()
  })

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
  app.listen(port, () => {
    console.log('端口：', port)
    console.log('登录认证：', isAuth ? '已启用' : '未启用')
    console.log('秘密路径：', '已启用')
    if (options?.open) {
      open(`http://localhost:${port}`)
    }
  })
}
