// ── 路由共享：服务选项、请求体白名单、字段清单、设备配置/密令查找 ──
import path from 'node:path'
import fs from 'node:fs/promises'
import type { Express, Response } from 'express'
import { type GuiConfig } from '@migptgui/options'
import { root, devicesRoot } from '../paths.js'
import { listDeviceMetas } from '../store.js'
import type { DeviceMeta } from '../types.js'

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

// ── 请求体白名单：只接受契约声明的字段 ────────────────────────
// 防止客户端夹带 id / createdAt / builtin / isDefault 等受控字段（越权改写服务端状态）。
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

export const ROLE_FIELDS = [
  'name',
  'profile',
  'callAIKeywords',
  'wakeUpKeywords',
  'exitKeywords',
  'checkContinueKeywords',
  'checkNotContinueKeywords',
  'onEnterAI',
  'onExitAI',
  'onAIAsking',
  'onAIReplied',
  'onAIError',
  'exitKeepAliveAfter',
  'thinkServiceId',
  'voiceId',
] as const
export const THINK_FIELDS = [
  'name',
  'provider',
  'model',
  'apiKey',
  'baseUrl',
  'temperature',
  'isDefault',
] as const
export const VOICE_FIELDS = [
  'name',
  'provider',
  'voiceId',
  'ttsCommand',
  'tts',
  'isDefault',
] as const
export const MODEL_FIELDS = [
  'name',
  'did',
  'desc',
  'ttsCommand',
  'wakeUpCommand',
  'playingCommand',
  'consecutive',
  'imageUrl',
] as const
export const ROOM_FIELDS = ['name', 'description'] as const
export const DEVICE_META_FIELDS = [
  'alias',
  'did',
  'speakerModel',
  'roleId',
  'accountId',
  'thinkServiceId',
  'voiceOverrideId',
  'exitKeepAliveAfter',
  'roomRef',
  'roomName',
  'roomDescription',
  'ttsSecret',
] as const

// 归一化人设描述：兼容旧版存储的字面 `\n`，统一转为真实换行符
export const normProfile = (s?: string) => (s || '').replace(/\\n/g, '\n')

export async function loadDeviceConfig(
  id: string,
): Promise<GuiConfig | undefined> {
  const file =
    id === 'default'
      ? path.join(root, 'default', 'migptgui.json')
      : path.join(devicesRoot, id, 'migptgui.json')
  let raw: string
  try {
    raw = await fs.readFile(file, 'utf-8')
  } catch (e) {
    // 文件不存在属正常（设备尚未落盘配置）；其余读取错误需告警，避免静默吞掉权限/IO 问题
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(
        `[loadDeviceConfig] 读取配置失败：${file}`,
        (e as Error).message,
      )
    }
    return undefined
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    // 解析失败多为文件被外部改坏：告警后按「无配置」处理，避免整机启动失败
    console.warn(
      `[loadDeviceConfig] 配置解析失败（已忽略）：${file}`,
      (e as Error).message,
    )
    return undefined
  }
}

export async function findDeviceBySecret(
  secret: string,
): Promise<DeviceMeta | undefined> {
  const metas = await listDeviceMetas()
  return metas.find((m) => m.ttsSecret === secret)
}

// ── 通用响应守卫：消除各资源的「未找到 / 被引用」样板 ───────────
/** 按 id 定位实体；不存在时回 404 并返回 null */
export function findIndexOr404<T extends { id: string }>(
  res: Response,
  list: T[],
  id: string,
  label: string,
): number | null {
  const idx = list.findIndex((x) => x.id === id)
  if (idx < 0) {
    res.status(404).json({ error: `${label}不存在` })
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
