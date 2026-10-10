// ── 内置实体定义（代码为准，只读）────────────────────────────────
// 内置型号 / 内置语音是系统自带、不可删除的实体；它们的「定义」放在代码里，
// 用户的修改以补丁形式写入 overrides.json（见 ./overrides.js）。
// 这样内置定义可随版本升级自动修正，而用户自建实体始终独立存放、不受「重置默认」影响。
import type { SpeakerModel, VoiceService } from '../types.js'

/**
 * 系统内置音箱型号（禁删禁编辑定义；用户改动存覆盖补丁）。
 * 清单与指令参数对齐 mi-gpt 官方兼容型号表（github.com/idootop/mi-gpt docs/compatibility.md）
 * 与 migpt-server 内置型号选择器（packages/options ChooseSpeaker）。
 * 分组：支持连续对话（完美运行）/ 不支持连续对话（正常运行）。
 */
export const BUILTIN_MODELS: Omit<SpeakerModel, 'createdAt'>[] = [
  // ── 支持连续对话（完美运行）──
  {
    id: 'xiaomi-smart-pro',
    name: 'Xiaomi 智能音箱 Pro',
    did: 'OH2P',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/vIHjnJJqrc',
  },
  {
    id: 'xiaomi-smart',
    name: 'Xiaomi 智能音箱',
    did: 'OH2',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/WQG4uLGOcd',
  },
  {
    id: 'xiaomi-pro',
    name: '小爱音箱 Pro',
    did: 'LX06',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/fqq9JgNvUR',
  },
  {
    id: 'xiaomi-ai-speaker',
    name: '小米 AI 音箱',
    did: 'S12',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s1KdNlarvU',
  },
  {
    id: 'xiaomi-ai-speaker-2',
    name: '小米 AI 音箱（第二代）',
    did: 'L15A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/h84tjXGVYP',
  },
  {
    id: 'xiaomi-universal',
    name: '小爱音箱 万能遥控版',
    did: 'LX5A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/ZpRUVmwTh5',
  },
  {
    id: 'xiaomi-play-2019',
    name: '小爱音箱 Play（2019 款）',
    did: 'LX05',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    playingCommand: [3, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sIhk2YxwD7',
  },
  {
    id: 'xiaomi-home-screen-10',
    name: '小爱智能家庭屏 10',
    did: 'X10A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sDM9V3slih',
  },
  {
    id: 'xiaomi-sound-pro',
    name: 'Xiaomi Sound Pro',
    did: 'L17A',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s7vgvRqqwU',
  },
  // ── 不支持连续对话（正常运行）──
  {
    id: 'xiaomi-speaker',
    name: '小爱音箱',
    did: 'L06A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Ig6OUMFV2u',
  },
  {
    id: 'xiaomi-mini',
    name: '小爱音箱 mini',
    did: 'LX01',
    desc: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    playingCommand: [4, 1, 1],
    consecutive: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/IBVUyAfu4M',
  },
  {
    id: 'xiaomi-play',
    name: '小爱音箱 Play',
    did: 'L05B',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s9jN6QwVcG',
  },
  {
    id: 'xiaomi-play-plus',
    name: '小米小爱音箱 Play 增强版',
    did: 'L05C',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/NU5KITCTbl',
  },
  {
    id: 'xiaomi-art',
    name: '小爱音箱 Art',
    did: 'L09A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [3, 1],
    wakeUpCommand: [3, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/c7uFBjO7cV',
  },
  {
    id: 'xiaomi-touch',
    name: '小爱触屏音箱',
    did: 'LX04',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/SkwcG8td6n',
  },
  {
    id: 'xiaomi-home-mini',
    name: 'Xiaomi 智能家庭屏 Mini',
    did: 'ASX4B',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Q9Vnj3UTJt',
  },
  {
    id: 'xiaomi-home-6',
    name: 'Xiaomi 智能家庭屏 6',
    did: 'X6A',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/2QVKCAW8rT',
  },
  {
    id: 'xiaomi-redmi-touch-8',
    name: 'Redmi 小爱触屏音箱 Pro 8 英寸',
    did: 'X08E',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/0UncKIwUlB',
  },
  {
    id: 'xiaomi-home-pro-8',
    name: 'Xiaomi 智能家庭屏 Pro 8',
    did: 'X8F',
    desc: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    consecutive: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/FQuMVAKPUK',
  },
]

/**
 * 系统内置语音服务（小米内置 TTS，永不可删）。
 * 不再有「全局默认」概念：语音服务须由设备显式指定。
 */
export const BUILTIN_VOICE_SERVICES: Omit<VoiceService, 'createdAt'>[] = [
  {
    id: 'builtin-mi',
    name: '默认语音',
    provider: 'builtin',
    builtin: true,
  },
]

/**
 * 内置实体的固定创建时间：内置项源自代码、无独立持久化时间戳，
 * 统一取 0 以稳定排序（列表按「内置在前、自建在后」呈现）。
 */
export const BUILTIN_CREATED_AT = 0

const BUILTIN_MODEL_IDS = new Set(BUILTIN_MODELS.map((m) => m.id))
const BUILTIN_VOICE_IDS = new Set(BUILTIN_VOICE_SERVICES.map((v) => v.id))

export const isBuiltinModel = (id: string): boolean => BUILTIN_MODEL_IDS.has(id)
export const isBuiltinVoice = (id: string): boolean => BUILTIN_VOICE_IDS.has(id)

/** 内置型号的完整默认实体（补齐 createdAt）；非内置返回 undefined */
export function builtinModelDefault(id: string): SpeakerModel | undefined {
  const def = BUILTIN_MODELS.find((m) => m.id === id)
  return def ? { ...def, createdAt: BUILTIN_CREATED_AT } : undefined
}

/** 内置语音的完整默认实体（补齐 createdAt）；非内置返回 undefined */
export function builtinVoiceDefault(id: string): VoiceService | undefined {
  const def = BUILTIN_VOICE_SERVICES.find((v) => v.id === id)
  return def ? { ...def, createdAt: BUILTIN_CREATED_AT } : undefined
}
