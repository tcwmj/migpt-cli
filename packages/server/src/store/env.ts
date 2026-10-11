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
})

export type EnvConfig = z.infer<typeof envSchema>

let _env: EnvConfig | undefined

/** 解析并校验环境变量；首次调用时执行，结果缓存 */
export function getEnv(): EnvConfig {
  if (!_env) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n')
      console.error(`环境变量校验失败:\n${issues}`)
      process.exit(1)
    }
    _env = result.data
  }
  return _env
}
