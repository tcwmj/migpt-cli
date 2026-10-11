// ── 内置实体定义（代码为准，只读）────────────────────────────────
// 内置型号 / 内置语音 / 内置会话 / 内置角色是系统自带、不可删除的实体；
// 它们的「定义」放在代码里，用户的修改以补丁形式写入 overrides.json（见 ./overrides.js）。
// 这样内置定义可随版本升级自动修正，而用户自建实体始终独立存放、不受「重置默认」影响。
import type { Robot, Conversation, SpeakerModel, Voice } from '../types.js'

/**
 * 系统内置音箱型号（禁删禁编辑定义；用户改动存覆盖补丁）。
 * 清单与指令参数对齐 mi-gpt 官方兼容型号表（github.com/idootop/mi-gpt docs/compatibility.md）
 * 与 migpt-server 内置型号选择器（packages/options ChooseSpeaker）。
 * 分组：支持连续对话（完美运行）/ 不支持连续对话（正常运行）。
 */
export const BUILTIN_SPEAKER_MODELS: Omit<SpeakerModel, 'createdAt'>[] = [
  // ── 支持连续对话（完美运行）──
  {
    id: 'xiaomi-smart-pro',
    name: 'Xiaomi 智能音箱 Pro',
    didPrefix: 'OH2P',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/vIHjnJJqrc',
  },
  {
    id: 'xiaomi-smart',
    name: 'Xiaomi 智能音箱',
    didPrefix: 'OH2',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    playingCommand: [3, 1, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/WQG4uLGOcd',
  },
  {
    id: 'xiaomi-pro',
    name: '小爱音箱 Pro',
    didPrefix: 'LX06',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/fqq9JgNvUR',
  },
  {
    id: 'xiaomi-ai-speaker',
    name: '小米 AI 音箱',
    didPrefix: 'S12',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s1KdNlarvU',
  },
  {
    id: 'xiaomi-ai-speaker-2',
    name: '小米 AI 音箱（第二代）',
    didPrefix: 'L15A',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    playingCommand: [3, 1, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/h84tjXGVYP',
  },
  {
    id: 'xiaomi-universal',
    name: '小爱音箱 万能遥控版',
    didPrefix: 'LX5A',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/ZpRUVmwTh5',
  },
  {
    id: 'xiaomi-play-2019',
    name: '小爱音箱 Play（2019 款）',
    didPrefix: 'LX05',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 3],
    playingCommand: [3, 1, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sIhk2YxwD7',
  },
  {
    id: 'xiaomi-home-screen-10',
    name: '小爱智能家庭屏 10',
    didPrefix: 'X10A',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/sDM9V3slih',
  },
  {
    id: 'xiaomi-sound-pro',
    name: 'Xiaomi Sound Pro',
    didPrefix: 'L17A',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s7vgvRqqwU',
  },
  // ── 不支持连续对话（正常运行）──
  {
    id: 'xiaomi-speaker',
    name: '小爱音箱',
    didPrefix: 'L06A',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Ig6OUMFV2u',
  },
  {
    id: 'xiaomi-mini',
    name: '小爱音箱 mini',
    didPrefix: 'LX01',
    description: '支持连续对话（官方完美运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    playingCommand: [4, 1, 1],
    continuousDialogue: true,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/IBVUyAfu4M',
  },
  {
    id: 'xiaomi-play',
    name: '小爱音箱 Play',
    didPrefix: 'L05B',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/s9jN6QwVcG',
  },
  {
    id: 'xiaomi-play-plus',
    name: '小米小爱音箱 Play 增强版',
    didPrefix: 'L05C',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/NU5KITCTbl',
  },
  {
    id: 'xiaomi-art',
    name: '小爱音箱 Art',
    didPrefix: 'L09A',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [3, 1],
    wakeUpCommand: [3, 2],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/c7uFBjO7cV',
  },
  {
    id: 'xiaomi-touch',
    name: '小爱触屏音箱',
    didPrefix: 'LX04',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 1],
    wakeUpCommand: [5, 2],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/SkwcG8td6n',
  },
  {
    id: 'xiaomi-home-mini',
    name: 'Xiaomi 智能家庭屏 Mini',
    didPrefix: 'ASX4B',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [5, 3],
    wakeUpCommand: [5, 1],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/Q9Vnj3UTJt',
  },
  {
    id: 'xiaomi-home-6',
    name: 'Xiaomi 智能家庭屏 6',
    didPrefix: 'X6A',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/2QVKCAW8rT',
  },
  {
    id: 'xiaomi-redmi-touch-8',
    name: 'Redmi 小爱触屏音箱 Pro 8 英寸',
    didPrefix: 'X08E',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/0UncKIwUlB',
  },
  {
    id: 'xiaomi-home-pro-8',
    name: 'Xiaomi 智能家庭屏 Pro 8',
    didPrefix: 'X8F',
    description: '无法连续对话（官方正常运行）',
    ttsCommand: [7, 3],
    wakeUpCommand: [7, 1],
    continuousDialogue: false,
    builtin: true,
    imageUrl: 'https://aka.doubaocdn.com/s/FQuMVAKPUK',
  },
]

/**
 * 系统内置语音（小米内置 TTS，永不可删）。
 * 不再有「全局默认」概念：语音须由设备显式指定。
 */
export const BUILTIN_VOICES: Omit<Voice, 'createdAt'>[] = [
  {
    id: 'builtin-mi',
    name: '默认语音',
    provider: 'builtin',
    builtin: true,
  },
]

/**
 * 系统内置会话（永不可删；可编辑、可重置默认）。
 * id 与迁移前用户数据的原 id 一致（dQd66FVw），保证既有角色 conversationRef 引用不失效。
 */
export const BUILTIN_CONVERSATIONS: Omit<Conversation, 'createdAt'>[] = [
  {
    id: 'dQd66FVw',
    name: '傻妞会话',
    description: '家庭日常闲聊',
    builtin: true,
  },
]

/**
 * 系统内置对话角色（永不可删；可编辑、可重置默认）。
 * 数据取自迁移前用户保存的角色「傻妞」（id IgKuWadm），保留原 id
 * 以兼容设备 robotId 引用；旧数据中的死键（checkNotContinueKeywords 等契约外字段）不纳入定义。
 */
export const BUILTIN_ROBOTS: Omit<Robot, 'createdAt'>[] = [
  {
    id: 'IgKuWadm',
    name: '傻妞',
    profile: '性别：女\n性格：乖巧可爱\n爱好：喜欢搞怪，爱吃醋。',
    masterName: '主人',
    masterProfile:
      '性别：男\n性格：善良正直\n其他：总是舍己为人，是傻妞的主人。',
    callAIKeywords: ['请', '你', '傻妞'],
    wakeUpKeywords: ['打开', '进入', '召唤'],
    exitKeywords: ['关闭', '退出', '再见'],
    checkInterval: 1000,
    checkTTSStatusAfter: 3000,
    onEnterAI: ['你好，我是傻妞，很高兴认识你'],
    onExitAI: ['傻妞已退出'],
    onAIAsking: ['让我先想想', '请稍等'],
    onAIReplied: ['我说完了', '还有其他问题吗'],
    onAIError: ['啊哦，出错了，请稍后再试吧'],
    exitKeepAliveAfter: 30,
    conversationId: 'dQd66FVw',
    builtin: true,
  },
]

/**
 * 内置实体的固定创建时间：内置项源自代码、无独立持久化时间戳，
 * 统一取 0 以稳定排序（列表按「内置在前、自建在后」呈现）。
 */
export const BUILTIN_CREATED_AT = 0

const BUILTIN_SPEAKER_MODEL_IDS = new Set(BUILTIN_SPEAKER_MODELS.map((m) => m.id))
const BUILTIN_VOICE_IDS = new Set(BUILTIN_VOICES.map((v) => v.id))
const BUILTIN_CONVERSATION_IDS = new Set(BUILTIN_CONVERSATIONS.map((r) => r.id))
const BUILTIN_ROBOT_IDS = new Set(BUILTIN_ROBOTS.map((r) => r.id))

export const isBuiltinSpeakerModel = (id: string): boolean => BUILTIN_SPEAKER_MODEL_IDS.has(id)
export const isBuiltinVoice = (id: string): boolean => BUILTIN_VOICE_IDS.has(id)
export const isBuiltinConversation = (id: string): boolean => BUILTIN_CONVERSATION_IDS.has(id)
export const isBuiltinRobot = (id: string): boolean => BUILTIN_ROBOT_IDS.has(id)

/** 内置型号的完整默认实体（补齐 createdAt）；非内置返回 undefined */
export function builtinSpeakerModelDefault(id: string): SpeakerModel | undefined {
  const def = BUILTIN_SPEAKER_MODELS.find((m) => m.id === id)
  return def ? { ...def, createdAt: BUILTIN_CREATED_AT } : undefined
}

/** 内置语音的完整默认实体（补齐 createdAt）；非内置返回 undefined */
export function builtinVoiceDefault(id: string): Voice | undefined {
  const def = BUILTIN_VOICES.find((v) => v.id === id)
  return def ? { ...def, createdAt: BUILTIN_CREATED_AT } : undefined
}

/** 内置会话的完整默认实体（补齐 createdAt）；非内置返回 undefined */
export function builtinConversationDefault(id: string): Conversation | undefined {
  const def = BUILTIN_CONVERSATIONS.find((r) => r.id === id)
  return def ? { ...def, createdAt: BUILTIN_CREATED_AT } : undefined
}

/** 内置角色的完整默认实体；非内置返回 undefined */
export function builtinRobotDefault(id: string): Robot | undefined {
  const def = BUILTIN_ROBOTS.find((r) => r.id === id)
  return def ? { ...def, createdAt: BUILTIN_CREATED_AT } : undefined
}
