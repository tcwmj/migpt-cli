// ── 实体读取：settings / accounts / roles / services / models / rooms / devices ──
import path from 'node:path'
import fs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import {
  devicesRoot,
  settingsFile,
  accountsFile,
  rolesFile,
  thinkServicesFile,
  voiceServicesFile,
  speakerModelsFile,
  roomsFile,
} from '../paths.js'
import {
  type Settings,
  type Account,
  type Role,
  type ThinkService,
  type VoiceService,
  type Room,
  type DeviceMeta,
  type SpeakerModel,
} from '../types.js'
import { readJson, writeJson } from './json.js'

// 同名唯一校验：同一实体的实例名称全局唯一（忽略大小写与首尾空白）。
// 返回冲突提示文本，无冲突返回 null。
export function assertUniqueName<T extends { id: string; name?: string }>(
  list: T[],
  name: string | undefined,
  excludeId: string | undefined,
  label: string,
): string | null {
  const n = (name || '').trim()
  if (!n) return null
  const hit = list.find(
    (x) =>
      x.id !== excludeId &&
      (x.name || '').trim().toLowerCase() === n.toLowerCase(),
  )
  return hit ? `${label}「${n}」已存在，名称需唯一` : null
}

export function getSettings(): Promise<Settings> {
  return readJson<Settings>(settingsFile, {})
}

// ── 多云端账号：读取（含旧 settings.json 迁移）─────────────────
export async function getAccounts(): Promise<Account[]> {
  const accounts = await readJson<Account[]>(accountsFile, [])
  if (accounts.length > 0) return accounts
  // 兼容旧版本：settings.json → 迁移为第一个账号
  const old = await readJson<Settings>(settingsFile, {})
  if (old.miUserId || old.passToken) {
    const account: Account = {
      id: nanoid(),
      name: '默认账号',
      miUserId: old.miUserId || '',
      miPassword: old.miPassword,
      passToken: old.passToken,
      createdAt: Date.now(),
    }
    await writeJson(accountsFile, [account])
    return [account]
  }
  return []
}

// 按设备归属取账号；未指定或找不到时回退第一个账号
export async function getAccountById(
  id?: string,
): Promise<Account | undefined> {
  const accounts = await getAccounts()
  if (id) {
    const found = accounts.find((a) => a.id === id)
    if (found) return found
  }
  return accounts[0]
}

export async function getRoles(): Promise<Role[]> {
  return readJson<Role[]>(rolesFile, [])
}

export async function getThinkServices(): Promise<ThinkService[]> {
  return readJson<ThinkService[]>(thinkServicesFile, [])
}

export async function getVoiceServices(): Promise<VoiceService[]> {
  return readJson<VoiceService[]>(voiceServicesFile, [])
}

export async function getSpeakerModels(): Promise<SpeakerModel[]> {
  return readJson<SpeakerModel[]>(speakerModelsFile, [])
}

export async function getRooms(): Promise<Room[]> {
  return readJson<Room[]>(roomsFile, [])
}

/** 全局默认思考服务（未指定角色/设备引用时回退） */
export async function getDefaultThinkService(): Promise<
  ThinkService | undefined
> {
  const list = await getThinkServices()
  return list.find((t) => t.isDefault) ?? list[0]
}

/** 全局默认语音服务 */
export async function getDefaultVoiceService(): Promise<
  VoiceService | undefined
> {
  const list = await getVoiceServices()
  return list.find((v) => v.isDefault) ?? list[0]
}

export async function getDeviceMeta(
  id: string,
): Promise<DeviceMeta | undefined> {
  return readJson<DeviceMeta | undefined>(
    path.join(devicesRoot, id, 'meta.json'),
    undefined,
  )
}

export async function listDeviceMetas(): Promise<DeviceMeta[]> {
  let ids: string[]
  try {
    ids = await fs.readdir(devicesRoot)
  } catch {
    /* devices 目录不存在 */
    return []
  }
  // 并行读取各设备 meta（原先串行 await 在设备较多时线性放大延迟）
  const metas = await Promise.all(ids.map((id) => getDeviceMeta(id)))
  const out = metas.filter((m): m is DeviceMeta => !!m)
  out.sort((a, b) => a.createdAt - b.createdAt)
  return out
}

/** 按 id 或名称解析会话群 */
export async function getRoomByRef(ref?: string): Promise<Room | undefined> {
  if (!ref) return undefined
  const list = await getRooms()
  return list.find((r) => r.id === ref || r.name === ref)
}

/** 按 id 或名称解析型号（兼容旧数据：设备 speakerModel 可能存名称） */
export async function getSpeakerModelByRef(
  ref?: string,
): Promise<SpeakerModel | undefined> {
  if (!ref) return undefined
  const list = await getSpeakerModels()
  return list.find((m) => m.id === ref || m.name === ref)
}

// 供应商 → Base URL 映射：单一事实源在 @migptgui/contracts（经 ./types.js 转发）
export { PROVIDER_BASE_URLS } from '../types.js'
