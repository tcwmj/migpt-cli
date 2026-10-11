// ── 内置实体的用户覆盖（内置只读，用户改动分离存放）────────────────
// 设计：内置型号 / 内置语音 / 内置会话 / 内置角色的「定义」只在代码里（./builtins.js，
// 随版本升级自动修正），可写文件 speakerModels.json / voices.json / conversations.json /
// robots.json 只存用户自建实体；用户对内置项的修改以「补丁」形式写入 overrides.json，
// 读取时叠加到代码默认值上。
// 好处：内置定义不会被用户数据覆盖而失联（恢复默认 = 删除补丁，代码默认即刻回归），
// 用户自建实体与覆盖互不干扰，任何一次「重置」都不会波及其他数据。
import {
  overridesFile,
  robotsFile,
  conversationsFile,
  speakerModelsFile,
  voicesFile,
} from '../paths.js'
import type { Robot, Conversation, SpeakerModel, Voice } from '../types.js'
import { logger } from '../logger.js'
import { readJson } from './json.js'
import {
  overridesSchema,
  readJsonChecked,
  robotListSchema,
  conversationListSchema,
  speakerModelListSchema,
  voiceListSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  BUILTIN_CREATED_AT,
  BUILTIN_SPEAKER_MODELS,
  BUILTIN_ROBOTS,
  BUILTIN_CONVERSATIONS,
  BUILTIN_VOICES,
  builtinSpeakerModelDefault,
  builtinRobotDefault,
  builtinConversationDefault,
  builtinVoiceDefault,
  isBuiltinSpeakerModel,
  isBuiltinRobot,
  isBuiltinConversation,
  isBuiltinVoice,
} from './builtins.js'

/** 内置型号可被用户覆盖的字段（id/builtin/createdAt 由框架固定，不参与覆盖） */
const SPEAKER_MODEL_OVERRIDE_FIELDS: readonly (keyof SpeakerModel)[] = [
  'name',
  'didPrefix',
  'description',
  'ttsCommand',
  'wakeUpCommand',
  'playingCommand',
  'continuousDialogue',
  'imageUrl',
]

/** 内置语音可被用户覆盖的字段 */
const VOICE_OVERRIDE_FIELDS: readonly (keyof Voice)[] = [
  'name',
  'provider',
  'timbreId',
  'ttsCommand',
  'tts',
]

/** 内置会话可被用户覆盖的字段（id/builtin/createdAt 由框架固定，不参与覆盖） */
const CONVERSATION_OVERRIDE_FIELDS: readonly (keyof Conversation)[] = ['name', 'description']

/** 内置角色可被用户覆盖的字段（id/builtin/createdAt 由框架固定，不参与覆盖） */
const ROBOT_OVERRIDE_FIELDS: readonly (keyof Robot)[] = [
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
]

/** 内置实体的用户覆盖补丁：按实体 id 存「与代码默认值不同的字段」 */
export interface Overrides {
  speakerModels?: Record<string, Partial<SpeakerModel>>
  voices?: Record<string, Partial<Voice>>
  conversations?: Record<string, Partial<Conversation>>
  robots?: Record<string, Partial<Robot>>
}

export async function getOverrides(): Promise<Overrides> {
  return readJsonChecked(overridesFile, overridesSchema, '覆盖补丁', {})
}

/** 去掉空分组，避免落盘 `{ speakerModels: {} }` 这类噪声 */
function prune(ov: Overrides): Overrides {
  const out: Overrides = {}
  if (ov.speakerModels && Object.keys(ov.speakerModels).length)
    out.speakerModels = ov.speakerModels
  if (ov.voices && Object.keys(ov.voices).length) out.voices = ov.voices
  if (ov.conversations && Object.keys(ov.conversations).length) out.conversations = ov.conversations
  if (ov.robots && Object.keys(ov.robots).length) out.robots = ov.robots
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
export function mergeBuiltinSpeakerModels(
  custom: SpeakerModel[],
  patches?: Record<string, Partial<SpeakerModel>>,
): SpeakerModel[] {
  // 自建项的 builtin 标记一律归 false：内置身份只认代码注册表 id，
  // 防止历史脏数据/导入包伪造 builtin:true 把用户自建实体锁成不可删、不可重置。
  const customs = custom
    .filter((m) => !isBuiltinSpeakerModel(m.id))
    .map((m) => (m.builtin ? { ...m, builtin: false } : m))
  const builtins = BUILTIN_SPEAKER_MODELS.map((d) => {
    const base: SpeakerModel = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  return [...builtins, ...customs]
}

export function mergeBuiltinVoices(
  custom: Voice[],
  patches?: Record<string, Partial<Voice>>,
): Voice[] {
  // 同 mergeBuiltinSpeakerModels：自建项的 builtin 标记一律归 false，内置身份只认代码注册表 id
  const customs = custom
    .filter((v) => !isBuiltinVoice(v.id))
    .map((v) => (v.builtin ? { ...v, builtin: false } : v))
  const builtins = BUILTIN_VOICES.map((d) => {
    const base: Voice = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  const all = [...builtins, ...customs]
  return all
}

export function mergeBuiltinConversations(
  custom: Conversation[],
  patches?: Record<string, Partial<Conversation>>,
): Conversation[] {
  // 同 mergeBuiltinSpeakerModels：自建项的 builtin 标记一律归 false，内置身份只认代码注册表 id
  const customs = custom
    .filter((r) => !isBuiltinConversation(r.id))
    .map((r) => (r.builtin ? { ...r, builtin: false } : r))
  const builtins = BUILTIN_CONVERSATIONS.map((d) => {
    const base: Conversation = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  return [...builtins, ...customs]
}

export function mergeBuiltinRobots(
  custom: Robot[],
  patches?: Record<string, Partial<Robot>>,
): Robot[] {
  // 同上——内置身份只认代码注册表 id，自建项伪造标记归零
  const customs = custom
    .filter((r) => !isBuiltinRobot(r.id))
    .map((r) => (r.builtin ? { ...r, builtin: false } : r))
  const builtins = BUILTIN_ROBOTS.map((d) => {
    const patch = patches?.[d.id]
    return patch
      ? { ...d, ...patch, id: d.id, builtin: true, createdAt: BUILTIN_CREATED_AT }
      : { ...d, createdAt: BUILTIN_CREATED_AT }
  })
  return [...builtins, ...customs]
}

// ── 落盘：用户自建实体写文件，内置项差异写覆盖 ──
export async function saveSpeakerModels(list: SpeakerModel[]): Promise<void> {
  await writeJsonChecked(
    speakerModelsFile,
    list.filter((m) => !isBuiltinSpeakerModel(m.id)),
    speakerModelListSchema,
    '型号',
  )
  const prev = await getOverrides()
  const speakerModels: Record<string, Partial<SpeakerModel>> = {}
  for (const m of list) {
    if (!isBuiltinSpeakerModel(m.id)) continue
    const def = builtinSpeakerModelDefault(m.id)
    if (!def) continue
    const patch = diffFields(m, def, SPEAKER_MODEL_OVERRIDE_FIELDS)
    if (patch) speakerModels[m.id] = patch
  }
  await persist(prev, { ...prev, speakerModels })
}

export async function saveVoices(list: Voice[]): Promise<void> {
  await writeJsonChecked(
    voicesFile,
    list.filter((v) => !isBuiltinVoice(v.id)),
    voiceListSchema,
    '语音',
  )
  const prev = await getOverrides()
  const voices: Record<string, Partial<Voice>> = {}
  for (const v of list) {
    if (!isBuiltinVoice(v.id)) continue
    const def = builtinVoiceDefault(v.id)
    if (!def) continue
    const patch = diffFields(v, def, VOICE_OVERRIDE_FIELDS)
    if (patch) voices[v.id] = patch
  }
  await persist(prev, { ...prev, voices })
}

export async function saveConversations(list: Conversation[]): Promise<void> {
  await writeJsonChecked(
    conversationsFile,
    list.filter((r) => !isBuiltinConversation(r.id)),
    conversationListSchema,
    '会话',
  )
  const prev = await getOverrides()
  const conversations: Record<string, Partial<Conversation>> = {}
  for (const r of list) {
    if (!isBuiltinConversation(r.id)) continue
    const def = builtinConversationDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, CONVERSATION_OVERRIDE_FIELDS)
    if (patch) conversations[r.id] = patch
  }
  await persist(prev, { ...prev, conversations })
}

export async function saveRobots(list: Robot[]): Promise<void> {
  await writeJsonChecked(
    robotsFile,
    list.filter((r) => !isBuiltinRobot(r.id)),
    robotListSchema,
    '角色',
  )
  const prev = await getOverrides()
  const robots: Record<string, Partial<Robot>> = {}
  for (const r of list) {
    if (!isBuiltinRobot(r.id)) continue
    const def = builtinRobotDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, ROBOT_OVERRIDE_FIELDS)
    if (patch) robots[r.id] = patch
  }
  await persist(prev, { ...prev, robots })
}

// ── 重置：删除覆盖补丁，代码默认值即刻回归（不触碰任何自建实体）──
export async function resetBuiltinSpeakerModel(
  id: string,
): Promise<SpeakerModel | undefined> {
  const def = builtinSpeakerModelDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  if (prev.speakerModels?.[id]) {
    const speakerModels = { ...prev.speakerModels }
    delete speakerModels[id]
    await persist(prev, { ...prev, speakerModels })
  }
  return def
}

export async function resetBuiltinVoice(
  id: string,
): Promise<Voice | undefined> {
  const def = builtinVoiceDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  const voices: Record<string, Partial<Voice>> = {
    ...(prev.voices ?? {}),
  }
  delete voices[id]
  await persist(prev, { ...prev, voices })
  return def
}

export async function resetBuiltinConversation(id: string): Promise<Conversation | undefined> {
  const def = builtinConversationDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  if (prev.conversations?.[id]) {
    const conversations = { ...prev.conversations }
    delete conversations[id]
    await persist(prev, { ...prev, conversations })
  }
  return def
}

export async function resetBuiltinRobot(
  id: string,
): Promise<Robot | undefined> {
  const def = builtinRobotDefault(id)
  if (!def) return undefined
  const prev = await getOverrides()
  if (prev.robots?.[id]) {
    const robots = { ...prev.robots }
    delete robots[id]
    await persist(prev, { ...prev, robots })
  }
  return def
}

/**
 * 一次性迁移 v2：把型号/语音可写文件中的内置项剥离到 overrides.json，
 * 可写文件仅保留用户自建项。用户对内置项的既有改动以补丁形式保留。
 */
export async function splitBuiltinEntities(): Promise<void> {
  const [rawSpeakerModels, rawVoices, prev] = await Promise.all([
    readJson<SpeakerModel[]>(speakerModelsFile, []),
    readJson<Voice[]>(voicesFile, []),
    getOverrides(),
  ])
  const speakerModels: Record<string, Partial<SpeakerModel>> = {
    ...(prev.speakerModels ?? {}),
  }
  const voices: Record<string, Partial<Voice>> = {
    ...(prev.voices ?? {}),
  }

  const customSpeakerModels: SpeakerModel[] = []
  for (const m of rawSpeakerModels) {
    if (!isBuiltinSpeakerModel(m.id)) {
      customSpeakerModels.push(m)
      continue
    }
    const def = builtinSpeakerModelDefault(m.id)
    if (!def) continue
    const patch = diffFields(m, def, SPEAKER_MODEL_OVERRIDE_FIELDS)
    if (patch) speakerModels[m.id] = patch
  }

  const customVoices: Voice[] = []
  for (const v of rawVoices) {
    if (!isBuiltinVoice(v.id)) {
      customVoices.push(v)
      continue
    }
    const def = builtinVoiceDefault(v.id)
    if (!def) continue
    // 旧版内置语音名「小米内置」等同于默认名，不作为覆盖记录
    const norm: Voice =
      v.name === '小米内置' ? { ...v, name: def.name } : v
    const patch = diffFields(norm, def, VOICE_OVERRIDE_FIELDS)
    if (patch) voices[v.id] = patch
  }

  await Promise.all([
    writeJsonChecked(
      speakerModelsFile,
      customSpeakerModels,
      speakerModelListSchema,
      '型号',
    ),
    writeJsonChecked(
      voicesFile,
      customVoices,
      voiceListSchema,
      '语音',
    ),
  ])
  await persist(prev, { ...prev, speakerModels, voices })
  logger.info(
    `内置/用户数据分离：保留自建型号 ${customSpeakerModels.length} 个、自建语音 ${customVoices.length} 个`,
  )
}

/**
 * 一次性迁移 v4：把会话/角色可写文件中的内置项（傻妞会话 / 傻妞角色）
 * 剥离到 overrides.json，可写文件仅保留用户自建项。
 * 内置定义取自迁移时的用户数据原值（含原 id），既有差异即刻成为补丁基线，
 * 用户对内置项保留原数据的编辑不会再落为无意义补丁。
 */
export async function splitBuiltinRobotsConversations(): Promise<void> {
  const [rawConversations, rawRobots, prev] = await Promise.all([
    readJson<Conversation[]>(conversationsFile, []),
    readJson<Robot[]>(robotsFile, []),
    getOverrides(),
  ])
  const conversations: Record<string, Partial<Conversation>> = { ...(prev.conversations ?? {}) }
  const robots: Record<string, Partial<Robot>> = { ...(prev.robots ?? {}) }

  const customConversations: Conversation[] = []
  for (const r of rawConversations) {
    if (!isBuiltinConversation(r.id)) {
      customConversations.push(r.builtin ? { ...r, builtin: false } : r)
      continue
    }
    const def = builtinConversationDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, CONVERSATION_OVERRIDE_FIELDS)
    if (patch) conversations[r.id] = patch
  }

  const customRobots: Robot[] = []
  for (const r of rawRobots) {
    if (!isBuiltinRobot(r.id)) {
      customRobots.push(r.builtin ? { ...r, builtin: false } : r)
      continue
    }
    const def = builtinRobotDefault(r.id)
    if (!def) continue
    const patch = diffFields(r, def, ROBOT_OVERRIDE_FIELDS)
    if (patch) robots[r.id] = patch
  }

  await Promise.all([
    writeJsonChecked(conversationsFile, customConversations, conversationListSchema, '会话'),
    writeJsonChecked(robotsFile, customRobots, robotListSchema, '角色'),
  ])
  await persist(prev, { ...prev, conversations, robots })
  logger.info(
    `内置/用户数据分离（会话/角色）：保留自建会话 ${customConversations.length} 个、自建角色 ${customRobots.length} 个`,
  )
}
