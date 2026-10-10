// ── 内置实体的用户覆盖（内置只读，用户改动分离存放）────────────────
// 设计：内置型号 / 内置语音 / 内置会话群 / 内置角色的「定义」只在代码里（./builtins.js，
// 随版本升级自动修正），可写文件 speakerModels.json / voiceServices.json / rooms.json /
// roles.json 只存用户自建实体；用户对内置项的修改以「补丁」形式写入 overrides.json，
// 读取时叠加到代码默认值上。
// 好处：内置定义不会被用户数据覆盖而失联（恢复默认 = 删除补丁，代码默认即刻回归），
// 用户自建实体与覆盖互不干扰，任何一次「重置」都不会波及其他数据。
import {
  overridesFile,
  rolesFile,
  roomsFile,
  speakerModelsFile,
  voiceServicesFile,
} from '../paths.js'
import type { Role, Room, SpeakerModel, VoiceService } from '../types.js'
import { logger } from '../logger.js'
import { readJson } from './json.js'
import {
  overridesSchema,
  readJsonChecked,
  roleListSchema,
  roomListSchema,
  speakerModelListSchema,
  voiceServiceListSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  BUILTIN_CREATED_AT,
  BUILTIN_MODELS,
  BUILTIN_ROLES,
  BUILTIN_ROOMS,
  BUILTIN_VOICE_SERVICES,
  builtinModelDefault,
  builtinRoleDefault,
  builtinRoomDefault,
  builtinVoiceDefault,
  isBuiltinModel,
  isBuiltinRole,
  isBuiltinRoom,
  isBuiltinVoice,
} from './builtins.js'

/** 内置型号可被用户覆盖的字段（id/builtin/createdAt 由框架固定，不参与覆盖） */
const MODEL_OVERRIDE_FIELDS: readonly (keyof SpeakerModel)[] = [
  'name',
  'did',
  'desc',
  'ttsCommand',
  'wakeUpCommand',
  'playingCommand',
  'consecutive',
  'imageUrl',
]

/** 内置语音可被用户覆盖的字段 */
const VOICE_OVERRIDE_FIELDS: readonly (keyof VoiceService)[] = [
  'name',
  'provider',
  'voiceId',
  'ttsCommand',
  'tts',
]

/** 内置会话群可被用户覆盖的字段（id/builtin/createdAt 由框架固定，不参与覆盖） */
const ROOM_OVERRIDE_FIELDS: readonly (keyof Room)[] = ['name', 'description']

/** 内置角色可被用户覆盖的字段（id/builtin 由框架固定；role 无 createdAt） */
const ROLE_OVERRIDE_FIELDS: readonly (keyof Role)[] = [
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
  'roomRef',
]

/** 内置实体的用户覆盖补丁：按实体 id 存「与代码默认值不同的字段」 */
export interface Overrides {
  models?: Record<string, Partial<SpeakerModel>>
  voices?: Record<string, Partial<VoiceService>>
  rooms?: Record<string, Partial<Room>>
  roles?: Record<string, Partial<Role>>
}

export async function getOverrides(): Promise<Overrides> {
  return readJsonChecked(overridesFile, overridesSchema, '覆盖补丁', {})
}

/** 去掉空分组，避免落盘 `{ models: {} }` 这类噪声 */
function prune(ov: Overrides): Overrides {
  const out: Overrides = {}
  if (ov.models && Object.keys(ov.models).length) out.models = ov.models
  if (ov.voices && Object.keys(ov.voices).length) out.voices = ov.voices
  if (ov.rooms && Object.keys(ov.rooms).length) out.rooms = ov.rooms
  if (ov.roles && Object.keys(ov.roles).length) out.roles = ov.roles
  return out
}

/** 仅在内容变化时落盘（避免每次 CRUD 都无谓重写 overrides.json） */
async function persist(prev: Overrides, next: Overrides): Promise<void> {
  if (JSON.stringify(prune(prev)) === JSON.stringify(prune(next))) return
  await writeJsonChecked(
    overridesFile,
    prune(next),
    overridesSchema,
    '覆盖补丁',
  )
}

/** 逐字段比对，返回与默认值不同的字段补丁（无差异返回 null） */
function diffFields<T extends object>(
  value: T,
  base: T,
  fields: readonly (keyof T)[],
): Partial<T> | null {
  const patch: Partial<T> = {}
  for (const f of fields) {
    if (JSON.stringify(value[f]) !== JSON.stringify(base[f]))
      patch[f] = value[f]
  }
  return Object.keys(patch).length ? patch : null
}

// ── 合并：代码默认 ← 用户覆盖补丁，其后拼接用户自建实体 ──
export function mergeBuiltinModels(
  custom: SpeakerModel[],
  patches?: Record<string, Partial<SpeakerModel>>,
): SpeakerModel[] {
  // 自建项的 builtin 标记一律归 false：内置身份只认代码注册表 id，
  // 防止历史脏数据/导入包伪造 builtin:true 把用户自建实体锁成不可删、不可重置。
  const customs = custom
    .filter((m) => !isBuiltinModel(m.id))
    .map((m) => (m.builtin ? { ...m, builtin: false } : m))
  const builtins = BUILTIN_MODELS.map((d) => {
    const base: SpeakerModel = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  return [...builtins, ...customs]
}

export function mergeBuiltinVoices(
  custom: VoiceService[],
  patches?: Record<string, Partial<VoiceService>>,
): VoiceService[] {
  // 同 mergeBuiltinModels：自建项的 builtin 标记一律归 false，内置身份只认代码注册表 id
  const customs = custom
    .filter((v) => !isBuiltinVoice(v.id))
    .map((v) => (v.builtin ? { ...v, builtin: false } : v))
  const builtins = BUILTIN_VOICE_SERVICES.map((d) => {
    const base: VoiceService = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  const all = [...builtins, ...customs]
  return all
}

export function mergeBuiltinRooms(
  custom: Room[],
  patches?: Record<string, Partial<Room>>,
): Room[] {
  // 同 mergeBuiltinModels：自建项的 builtin 标记一律归 false，内置身份只认代码注册表 id
  const customs = custom
    .filter((r) => !isBuiltinRoom(r.id))
    .map((r) => (r.builtin ? { ...r, builtin: false } : r))
  const builtins = BUILTIN_ROOMS.map((d) => {
    const base: Room = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  return [...builtins, ...customs]
}

export function mergeBuiltinRoles(
  custom: Role[],
  patches?: Record<string, Partial<Role>>,
): Role[] {
  // Role 无 createdAt；同上——内置身份只认代码注册表 id，自建项伪造标记归零
  const customs = custom
    .filter((r) => !isBuiltinRole(r.id))
    .map((r) => (r.builtin ? { ...r, builtin: false } : r))
  const builtins = BUILTIN_ROLES.map((d) => {
    const patch = patches?.[d.id]
    return patch ? { ...d, ...patch, id: d.id, builtin: true } : { ...d }
  })
  return [...builtins, ...customs]
}

// ── 落盘：用户自建实体写文件，内置项差异写覆盖 ──
export async function saveSpeakerModels(list: SpeakerModel[]): Promise<void> {
  await writeJsonChecked(
    speakerModelsFile,
    list.filter((m) => !isBuiltinModel(m.id)),
    speakerModelListSchema,
    '型号',
  )
  const prev = await getOverrides()
  const models: Record<string, Partial<SpeakerModel>> = {}
  for (const m of list) {
    if (!isBuiltinModel(m.id)) continue
    const def = builtinModelDefault(m.id)
    if (!def) continue
    const patch = diffFields(m, def, MODEL_OVERRIDE_FIELDS)
    if (patch) models[m.id] = patch
  }
  await persist(prev, { ...prev, models })
}

export async function saveVoiceServices(list: VoiceService[]): Promise<void> {
  await writeJsonChecked(
    voiceServicesFile,
    list.filter((v) => !isBuiltinVoice(v.id)),
    voiceServiceListSchema,
    '语音服务',
  )
  const prev = await getOverrides()
  const voices: Record<string, Partial<VoiceService>> = {}
  for (const v of list) {
    if (!isBuiltinVoice(v.id)) continue
    const def = builtinVoiceDefault(v.id)
    if (!def) continue
    const patch = diffFields(v, def, VOICE_OVERRIDE_FIELDS)
    if (patch) voices[v.id] = patch
  }
  await persist(prev, { ...prev, voices })
}

export async function saveRooms(list: Room[]): Promise<void> {
  await writeJsonChecked(
    roomsFile,
    list.filter((r) => !isBuiltinRoom(r.id)),
    roomListSchema,
    '会话群',
  )
  const prev = await getOverrides()
  const rooms: Record<string, Partial<Room>> = {}
  for (const r of list) {
    if (!isBuiltinRoom(r.id)) continue
    const def = builtinRoomDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, ROOM_OVERRIDE_FIELDS)
    if (patch) rooms[r.id] = patch
  }
  await persist(prev, { ...prev, rooms })
}

export async function saveRoles(list: Role[]): Promise<void> {
  await writeJsonChecked(
    rolesFile,
    list.filter((r) => !isBuiltinRole(r.id)),
    roleListSchema,
    '角色',
  )
  const prev = await getOverrides()
  const roles: Record<string, Partial<Role>> = {}
  for (const r of list) {
    if (!isBuiltinRole(r.id)) continue
    const def = builtinRoleDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, ROLE_OVERRIDE_FIELDS)
    if (patch) roles[r.id] = patch
  }
  await persist(prev, { ...prev, roles })
}

// ── 重置：删除覆盖补丁，代码默认值即刻回归（不触碰任何自建实体）──
export async function resetBuiltinModel(
  id: string,
): Promise<SpeakerModel | undefined> {
  const def = builtinModelDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  if (prev.models?.[id]) {
    const models = { ...prev.models }
    delete models[id]
    await persist(prev, { ...prev, models })
  }
  return def
}

export async function resetBuiltinVoice(
  id: string,
): Promise<VoiceService | undefined> {
  const def = builtinVoiceDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  const voices: Record<string, Partial<VoiceService>> = {
    ...(prev.voices ?? {}),
  }
  delete voices[id]
  await persist(prev, { ...prev, voices })
  return def
}

export async function resetBuiltinRoom(id: string): Promise<Room | undefined> {
  const def = builtinRoomDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  if (prev.rooms?.[id]) {
    const rooms = { ...prev.rooms }
    delete rooms[id]
    await persist(prev, { ...prev, rooms })
  }
  return def
}

export async function resetBuiltinRole(id: string): Promise<Role | undefined> {
  const def = builtinRoleDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  if (prev.roles?.[id]) {
    const roles = { ...prev.roles }
    delete roles[id]
    await persist(prev, { ...prev, roles })
  }
  return def
}

/**
 * 一次性迁移 v2：把型号/语音可写文件中的内置项剥离到 overrides.json，
 * 可写文件仅保留用户自建项。用户对内置项的既有改动以补丁形式保留。
 */
export async function splitBuiltinEntities(): Promise<void> {
  const [rawModels, rawVoices, prev] = await Promise.all([
    readJson<SpeakerModel[]>(speakerModelsFile, []),
    readJson<VoiceService[]>(voiceServicesFile, []),
    getOverrides(),
  ])
  const models: Record<string, Partial<SpeakerModel>> = {
    ...(prev.models ?? {}),
  }
  const voices: Record<string, Partial<VoiceService>> = {
    ...(prev.voices ?? {}),
  }

  const customModels: SpeakerModel[] = []
  for (const m of rawModels) {
    if (!isBuiltinModel(m.id)) {
      customModels.push(m)
      continue
    }
    const def = builtinModelDefault(m.id)
    if (!def) continue
    const patch = diffFields(m, def, MODEL_OVERRIDE_FIELDS)
    if (patch) models[m.id] = patch
  }

  const customVoices: VoiceService[] = []
  for (const v of rawVoices) {
    if (!isBuiltinVoice(v.id)) {
      customVoices.push(v)
      continue
    }
    const def = builtinVoiceDefault(v.id)
    if (!def) continue
    // 旧版内置语音名「小米内置」等同于默认名，不作为覆盖记录
    const norm: VoiceService =
      v.name === '小米内置' ? { ...v, name: def.name } : v
    const patch = diffFields(norm, def, VOICE_OVERRIDE_FIELDS)
    if (patch) voices[v.id] = patch
  }

  await Promise.all([
    writeJsonChecked(
      speakerModelsFile,
      customModels,
      speakerModelListSchema,
      '型号',
    ),
    writeJsonChecked(
      voiceServicesFile,
      customVoices,
      voiceServiceListSchema,
      '语音服务',
    ),
  ])
  await persist(prev, { ...prev, models, voices })
  logger.info(
    `内置/用户数据分离：保留自建型号 ${customModels.length} 个、自建语音 ${customVoices.length} 个`,
  )
}

/**
 * 一次性迁移 v4：把会话群/角色可写文件中的内置项（傻妞会话群 / 傻妞角色）
 * 剥离到 overrides.json，可写文件仅保留用户自建项。
 * 内置定义取自迁移时的用户数据原值（含原 id），既有差异即刻成为补丁基线，
 * 用户对内置项保留原数据的编辑不会再落为无意义补丁。
 */
export async function splitBuiltinRolesRooms(): Promise<void> {
  const [rawRooms, rawRoles, prev] = await Promise.all([
    readJson<Room[]>(roomsFile, []),
    readJson<Role[]>(rolesFile, []),
    getOverrides(),
  ])
  const rooms: Record<string, Partial<Room>> = { ...(prev.rooms ?? {}) }
  const roles: Record<string, Partial<Role>> = { ...(prev.roles ?? {}) }

  const customRooms: Room[] = []
  for (const r of rawRooms) {
    if (!isBuiltinRoom(r.id)) {
      customRooms.push(r.builtin ? { ...r, builtin: false } : r)
      continue
    }
    const def = builtinRoomDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, ROOM_OVERRIDE_FIELDS)
    if (patch) rooms[r.id] = patch
  }

  const customRoles: Role[] = []
  for (const r of rawRoles) {
    if (!isBuiltinRole(r.id)) {
      customRoles.push(r.builtin ? { ...r, builtin: false } : r)
      continue
    }
    const def = builtinRoleDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, ROLE_OVERRIDE_FIELDS)
    if (patch) roles[r.id] = patch
  }

  await Promise.all([
    writeJsonChecked(roomsFile, customRooms, roomListSchema, '会话群'),
    writeJsonChecked(rolesFile, customRoles, roleListSchema, '角色'),
  ])
  await persist(prev, { ...prev, rooms, roles })
  logger.info(
    `内置/用户数据分离（会话群/角色）：保留自建会话群 ${customRooms.length} 个、自建角色 ${customRoles.length} 个`,
  )
}
