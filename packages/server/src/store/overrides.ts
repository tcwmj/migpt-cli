// ── 内置实体的用户覆盖（内置只读，用户改动分离存放）────────────────
// 设计：内置型号 / 内置语音的「定义」只在代码里（./builtins.js，随版本升级自动修正），
// 可写文件 speakerModels.json / voiceServices.json 只存用户自建实体；
// 用户对内建项的修改以「补丁」形式写入 overrides.json，读取时叠加到代码默认值上。
// 好处：内置定义不会被用户数据覆盖而失联（恢复默认 = 删除补丁，代码默认即刻回归），
// 用户自建实体与覆盖互不干扰，任何一次「重置」都不会波及其他数据。
import {
  overridesFile,
  speakerModelsFile,
  voiceServicesFile,
} from '../paths.js'
import type { SpeakerModel, VoiceService } from '../types.js'
import { logger } from '../logger.js'
import { readJson } from './json.js'
import {
  overridesSchema,
  readJsonChecked,
  speakerModelListSchema,
  voiceServiceListSchema,
  writeJsonChecked,
} from './schemas.js'
import {
  BUILTIN_CREATED_AT,
  BUILTIN_MODELS,
  BUILTIN_VOICE_SERVICES,
  builtinModelDefault,
  builtinVoiceDefault,
  isBuiltinModel,
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

/** 内置实体的用户覆盖补丁：按实体 id 存「与代码默认值不同的字段」 */
export interface Overrides {
  models?: Record<string, Partial<SpeakerModel>>
  voices?: Record<string, Partial<VoiceService>>
}

export async function getOverrides(): Promise<Overrides> {
  return readJsonChecked(overridesFile, overridesSchema, '覆盖补丁', {})
}

/** 去掉空分组，避免落盘 `{ models: {} }` 这类噪声 */
function prune(ov: Overrides): Overrides {
  const out: Overrides = {}
  if (ov.models && Object.keys(ov.models).length) out.models = ov.models
  if (ov.voices && Object.keys(ov.voices).length) out.voices = ov.voices
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
  const customs = custom.filter((m) => !isBuiltinModel(m.id))
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
  const customs = custom.filter((v) => !isBuiltinVoice(v.id))
  const builtins = BUILTIN_VOICE_SERVICES.map((d) => {
    const base: VoiceService = { ...d, createdAt: BUILTIN_CREATED_AT }
    const patch = patches?.[d.id]
    return patch ? { ...base, ...patch, id: base.id, builtin: true } : base
  })
  const all = [...builtins, ...customs]
  return all
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

/**
 * 一次性迁移：把可写文件中的内置项剥离到 overrides.json，
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
  await persist(prev, { models, voices })
  logger.info(
    `内置/用户数据分离：保留自建型号 ${customModels.length} 个、自建语音 ${customVoices.length} 个`,
  )
}
