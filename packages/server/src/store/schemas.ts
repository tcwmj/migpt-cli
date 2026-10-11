// ── 存储 schema 校验（zod）：落盘前把关、读取时过滤脏数据 ──────────
// 契约类型（@migptgui/contracts）只在编译期保证代码正确，本模块在运行期兜底：
//   · 写入 writeJsonChecked：safeParse 失败即抛 DataValidationError（经统一错误中间件回 500），脏数据不落盘；
//   · 读取 readJsonChecked / readJsonListChecked：逐条 safeParse，非法项告警并跳过，合法项照常返回，
//     避免单条损坏拖垮整个列表。
// 说明：校验只作「闸门」，成功时返回原始数据（非 zod parse 输出），未知字段不会被 zod 静默剥离。
import { z } from 'zod'
import type { TTSConfig } from 'mi-gpt-tts'
import { logger } from '../logger.js'
import { readJson, writeJson } from './json.js'

/** 落盘数据不符合 schema 时抛出；由统一错误中间件转为 500（含 reqId 便于对照日志） */
export class DataValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataValidationError'
  }
}

const num = z.number()
const str = z.string()
const optStr = z.string().optional()
const optBool = z.boolean().optional()
const strArr = z.array(z.string())

// 小米凭据（原 account 实体更名合并；miPassword 已移除——异地验证下密码登录不可用，
// 存量数据中的该字段由迁移清理，schema 不再定义，writeJsonChecked 透传原始数据不受影响）
export const credentialSchema = z.object({
  id: str.min(1),
  name: str.min(1),
  miUserId: str,
  passToken: optStr,
  createdAt: num,
  hasPassToken: optBool,
})
export const credentialListSchema = z.array(credentialSchema)

export const robotSchema = z.object({
  id: str.min(1),
  name: str.min(1),
  profile: str,
  masterName: optStr,
  masterProfile: optStr,
  callAIKeywords: strArr,
  wakeUpKeywords: strArr,
  exitKeywords: strArr,
  checkInterval: num,
  checkTTSStatusAfter: num,
  onEnterAI: strArr,
  onExitAI: strArr,
  onAIAsking: strArr,
  onAIReplied: strArr,
  onAIError: strArr,
  exitKeepAliveAfter: num,
  conversationId: optStr,
  systemTemplate: optStr,
  templateId: optStr,
  builtin: optBool,
  modelId: optStr,
  modelIds: z.array(str).optional(),
  voiceId: optStr,
  createdAt: num,
})
export const robotListSchema = z.array(robotSchema)

export const modelSchema = z.object({
  id: str.min(1),
  name: str.min(1),
  provider: str,
  model: str,
  apiKey: str,
  baseUrl: optStr,
  temperature: num.optional(),
  inputTokensUsed: num.optional(),
  outputTokensUsed: num.optional(),
  totalTokensUsed: num.optional(),
  tokenLimit: num.optional(),
  limitReached: z.boolean().optional(),
  createdAt: num,
  hasApiKey: optBool,
})
export const modelListSchema = z.array(modelSchema)

export const voiceSchema = z.object({
  id: str.min(1),
  name: str.min(1),
  provider: str,
  timbreId: optStr,
  ttsCommand: z.array(z.number().optional()).optional(),
  builtin: optBool,
  tts: z.custom<TTSConfig>().optional(),
  createdAt: num,
  hasTtsToken: optBool,
})
export const voiceListSchema = z.array(voiceSchema)

export const speakerModelSchema = z.object({
  id: str.min(1),
  name: str.min(1),
  didPrefix: str,
  description: optStr,
  ttsCommand: z.array(num).optional(),
  wakeUpCommand: z.array(num).optional(),
  playingCommand: z.array(num).optional(),
  continuousDialogue: optBool,
  imageUrl: optStr,
  builtin: optBool,
  createdAt: num,
})
export const speakerModelListSchema = z.array(speakerModelSchema)

export const conversationSchema = z.object({
  id: str.min(1),
  name: str.min(1),
  description: optStr,
  builtin: optBool,
  createdAt: num,
})
export const conversationListSchema = z.array(conversationSchema)

export const deviceSchema = z.object({
  id: str.min(1),
  alias: str,
  did: str,
  speakerModel: optStr,
  // 必填：设备须绑定对话角色（内置角色保证任何环境至少有一个可选角色）。
  // 旧数据由迁移 v4 回填后即满足；迁移在启动期先于任何读取执行。
  robotId: str.min(1),
  credentialId: optStr,
  modelIds: z.array(str).optional(),
  modelId: optStr,
  voiceId: optStr,
  conversationRef: optStr,
  conversationName: optStr,
  conversationDescription: optStr,
  ttsSecret: str,
  createdAt: num,
  hasTtsSecret: optBool,
})

// 覆盖补丁只做浅层校验：值可为任意字段子集，深层结构由实体 schema 在合并后统一保证
export const overridesSchema = z.object({
  models: z.record(z.any()).optional(),
  voices: z.record(z.any()).optional(),
  conversations: z.record(z.any()).optional(),
  robots: z.record(z.any()).optional(),
})

// 登录凭据：passwordHash 为 scrypt 哈希（PHC 格式）；
// password 为旧版明文字段，仅迁移期可读、不再写入
export const authSchema = z.object({
  user: optStr,
  password: optStr,
  passwordHash: optStr,
})

export const versionFileSchema = z.object({
  dataVersion: num.int().nonnegative(),
})

function formatIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join('.') || '(root)'} ${i.message}`)
    .join('；')
}

/** 逐条校验列表：非数组或非法项告警并跳过，返回合法项（原始对象，不剥离未知字段） */
export function parseEntityList<T>(
  raw: unknown,
  item: z.ZodType<T>,
  label: string,
): T[] {
  if (!Array.isArray(raw)) {
    logger.warn(
      `${label}：期望数组，实际为 ${raw === null ? 'null' : typeof raw}，已忽略`,
    )
    return []
  }
  const out: T[] = []
  raw.forEach((v, i) => {
    const r = item.safeParse(v)
    if (r.success) out.push(v as T)
    else
      logger.warn(
        `${label}：第 ${i + 1} 条不符合 schema，已跳过（${formatIssues(r.error)}）`,
      )
  })
  return out
}

/** 校验单个实体：非法返回 undefined（缺失不告警），合法返回原始对象 */
export function parseEntity<T>(
  raw: unknown,
  schema: z.ZodType<T>,
  label: string,
): T | undefined {
  if (raw === undefined || raw === null) return undefined
  const r = schema.safeParse(raw)
  if (r.success) return raw as T
  logger.warn(`${label}：数据不符合 schema，已忽略（${formatIssues(r.error)}）`)
  return undefined
}

/** 落盘前断言：不符合 schema 抛 DataValidationError（调用方经统一错误中间件回 500） */
export function assertEntity(
  data: unknown,
  schema: z.ZodTypeAny,
  label: string,
): void {
  const r = schema.safeParse(data)
  if (!r.success) {
    throw new DataValidationError(
      `${label}数据校验失败：${formatIssues(r.error)}`,
    )
  }
}

/** 读取并按 schema 校验；文件缺失或整体非法时回退 fallback */
export async function readJsonChecked<T>(
  file: string,
  schema: z.ZodType<T>,
  label: string,
  fallback: T,
): Promise<T> {
  const raw = await readJson<unknown>(file, undefined)
  return parseEntity(raw, schema, label) ?? fallback
}

/** 读取列表并按 schema 逐条过滤 */
export async function readJsonListChecked<T>(
  file: string,
  item: z.ZodType<T>,
  label: string,
): Promise<T[]> {
  return parseEntityList(await readJson<unknown>(file, []), item, label)
}

/** 校验后原子落盘 */
export async function writeJsonChecked(
  file: string,
  data: unknown,
  schema: z.ZodTypeAny,
  label: string,
): Promise<void> {
  assertEntity(data, schema, label)
  await writeJson(file, data)
}
