// ── 环境变量集中校验：启动时 fail-fast，运行期直接引用类型安全的 config ──
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  BACKUP_INTERVAL_MS: z.coerce.number().int().min(0).default(0),
  BACKUP_KEEP: z.coerce.number().int().min(0).default(0),
  AUTH_USER: z.string().min(1).default('admin'),
  AUTH_PASSWORD: z.string().optional(),
  MIGPT_DEMO_LOGS: z.coerce.boolean().default(false),
  // 数据根目录覆盖：挂载到任意路径 / rootless / 多实例部署用。
  // MIGPTGUI_HOME 优先于 DATA_DIR，二者均未设置时回落 $HOME/.migptgui。
  MIGPTGUI_HOME: z.string().min(1).optional(),
  DATA_DIR: z.string().min(1).optional(),
  // 日志保留天数：超过此天数的系统日志和对话日志文件将在启动时及每天定期清理。
  // 默认 60 天；设为 0 表示不清理（永久保留，等效旧行为）。
  LOG_RETENTION_DAYS: z.coerce.number().int().min(0).default(60),
  CHAT_LOG_RETENTION_DAYS: z.coerce.number().int().min(0).default(60),
})

export type EnvConfig = z.infer<typeof envSchema>

/**
 * 解析并校验环境变量（fail-fast：非法值直接退出进程）。
 * 每次调用重新读取 process.env：AUTH_USER / AUTH_PASSWORD 等凭据类变量
 * 需要「改了即生效」语义（resolveAuth 缓存失效后立即反映新值），
 * 且调用频率极低（启动、认证解析、日志初始化），zod 解析开销可忽略。
 */
export function getEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    console.error(`环境变量校验失败:\n${issues}`)
    process.exit(1)
  }
  return result.data
}
