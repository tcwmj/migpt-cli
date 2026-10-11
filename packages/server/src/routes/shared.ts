// ── 路由共享：服务选项、请求体白名单、字段清单、设备配置/密令查找 ──
import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express'
import { listDevices } from '../store.js'
import type { Device } from '../types.js'

// 从 store 层重新导出，保持既有导入面不变
export { loadDeviceConfig } from '../store.js'

// ── API 版本前缀：所有业务路由统一挂在 /api/v1/ ────────────────
export const API_PREFIX = '/api/v1'

export interface ServerOptions {
  open?: boolean
  port?: number
  users?: Record<string, string>
  staticPath?: string
  auth?: boolean
}

/** 路由注册函数共用的上下文（Express 实例 + 启动选项） */
export interface RouteContext {
  app: Express
  options?: ServerOptions
}

/**
 * 包装 async 处理器：把 Promise rejection 转交 next()，交给统一错误中间件。
 * Express 4 不会自动捕获 async 处理器抛出的异常（会变成未处理 rejection、请求悬挂），
 * 故所有可能抛错的 async 处理器都应经此包装（如落盘 schema 校验失败）。
 * 返回值仍为原 Promise，便于测试直接 await 到处理器完成。
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  // 返回值保留原 Promise（便于测试直接 await 到处理器完成）；
  // Express 的 RequestHandler 只声明 void | Promise<void>，故此处断言收窄类型。
  return ((req, res, next) => fn(req, res, next).catch(next)) as RequestHandler
}

// ── 请求体白名单：只接受契约声明的字段 ────────────────────────
// 防止客户端夹带 id / createdAt / builtin 等受控字段（越权改写服务端状态）。
export function pick<T extends object>(
  src: unknown,
  keys: readonly string[],
): Partial<T> {
  const out: Record<string, unknown> = {}
  if (!src || typeof src !== 'object') return out as Partial<T>
  const s = src as Record<string, unknown>
  for (const k of keys) if (k in s) out[k] = s[k]
  return out as Partial<T>
}

export const ROBOT_FIELDS = [
  'name',
  'profile',
  'masterName',
  'masterProfile',
  'callAIKeywords',
  'wakeUpKeywords',
  'exitKeywords',
  'checkInterval',
  'checkTTSStatusAfter',
  'onEnterAI',
  'onExitAI',
  'onAIAsking',
  'onAIReplied',
  'onAIError',
  'exitKeepAliveAfter',
  'conversationId',
  'systemTemplate',
  'templateId',
  'modelId',
  'modelIds',
  'voiceId',
] as const
export const MODEL_FIELDS = [
  'name',
  'provider',
  'model',
  'apiKey',
  'baseUrl',
  'temperature',
  'inputTokensUsed',
  'outputTokensUsed',
  'totalTokensUsed',
  'tokenLimit',
  'limitReached',
] as const
export const VOICE_FIELDS = [
  'name',
  'provider',
  'timbreId',
  'ttsCommand',
  'tts',
] as const
export const SPEAKER_MODEL_FIELDS = [
  'name',
  'didPrefix',
  'description',
  'ttsCommand',
  'wakeUpCommand',
  'playingCommand',
  'continuousDialogue',
  'imageUrl',
] as const
export const CONVERSATION_FIELDS = ['name', 'description'] as const
export const DEVICE_FIELDS = [
  'alias',
  'did',
  'speakerModel',
  'robotId',
  'credentialId',
  'modelIds',
  'modelId',
  'voiceId',
  'ttsSecret',
] as const

// 归一化人设描述：兼容旧版存储的字面 `\n`，统一转为真实换行符
export const normProfile = (s?: string) => (s || '').replace(/\\n/g, '\n')

export async function findDeviceBySecret(
  secret: string,
): Promise<Device | undefined> {
  const metas = await listDevices()
  return metas.find((m) => m.ttsSecret === secret)
}

// ── 通用响应守卫：消除各资源的「未找到 / 被引用」样板 ───────────

/** 成功响应：`res.json(data ?? { success: true })` */
export function ok(res: Response, data?: unknown): void {
  res.json(data ?? { success: true })
}

/** 错误响应：`res.status(status).json({ error })` */
export function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error })
}

/** 按 id 定位实体；不存在时回 404 并返回 null */
export function findIndexOr404<T extends { id: string }>(
  res: Response,
  list: T[],
  id: string,
  label: string,
): number | null {
  const idx = list.findIndex((x) => x.id === id)
  if (idx < 0) {
    fail(res, 404, `${label}不存在`)
    return null
  }
  return idx
}

/** 删除保护：实体被其他实体引用时回 409 并附带引用清单 */
export function refConflict(
  res: Response,
  refs: Record<string, string[]>,
  message: string,
): void {
  res.status(409).json({ error: message, refs })
}
