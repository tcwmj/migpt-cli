// ── 前后端共享契约：实体类型单一事实源 ────────────────────────
// server（packages/server/src/types.ts）与 gui（packages/gui/src/apis.ts）
// 均从本包引用，修改契约两端同时生效；结构必须与存储 JSON 一一对应。

export interface Credential {
  miUserId?: string
  miPassword?: string
  passToken?: string
  /** 读接口脱敏标记：服务端是否已保存 passToken（明文不回传） */
  hasPassToken?: boolean
}

export interface Account {
  id: string
  name: string
  miUserId: string
  miPassword?: string
  passToken?: string
  createdAt: number
  /** 读接口脱敏标记：明文凭据不回传，仅回传是否已配置 */
  hasPassToken?: boolean
  hasMiPassword?: boolean
}

export interface Robot {
  id: string
  name: string
  profile: string
  /** 主人的称呼（如"主人"、"老大"、"朋友"等） */
  masterName?: string
  /** 主人的人设描述（如"性别：男 性格：善良正直 其他：总是舍己为人"） */
  masterProfile?: string
  callAIKeywords: string[]
  wakeUpKeywords: string[]
  exitKeywords: string[]
  /** 连续对话 · 播放状态检测间隔（毫秒；调小可降低回复间停顿感） */
  checkInterval: number
  /** 连续对话 · 下发 TTS 指令后多久开始检测播放状态（毫秒；不宜低于 1 秒） */
  checkTTSStatusAfter: number
  onEnterAI: string[]
  onExitAI: string[]
  onAIAsking: string[]
  onAIReplied: string[]
  onAIError: string[]
  /** 连续对话无响应自动退出时间（秒） */
  exitKeepAliveAfter: number
  /** 会话引用（Conversation 实体 id）：对话记忆上下文归属 */
  conversationId?: string
  /** 内置标记：系统内置角色不可删除（可编辑、可重置默认值） */
  builtin?: boolean
  /** @deprecated 已迁移至 Device.modelIds；保留仅兼容旧数据读取 */
  modelIds?: string[]
  /** @deprecated 旧字段，迁移后不再使用；保留仅兼容旧数据读取 */
  modelId?: string
  /** @deprecated 已迁移至 Device.voiceId；保留仅兼容旧数据读取 */
  voiceId?: string
  createdAt: number
}

/**
 * 模型：音箱的「大脑」——大模型供应商 + 模型 + 凭据 + 温度。
 * 独立于设备存在，被角色与设备引用；被引用时禁止删除。
 */
export interface Model {
  id: string
  name: string
  provider: string
  model: string
  apiKey: string
  baseUrl?: string
  temperature?: number
  /** 已消耗 input token 数（自动累加 + 手动修正） */
  inputTokensUsed?: number
  /** 已消耗 output token 数（自动累加 + 手动修正） */
  outputTokensUsed?: number
  /** 已消耗 token 总数（自动累加 + 手动修正） */
  totalTokensUsed?: number
  /** token 上限（用户设置） */
  tokenLimit?: number
  /** 余额不足标记：API 返回 429/402 等错误时自动置 true，用户可手动清除 */
  limitReached?: boolean
  createdAt: number
  /** 读接口脱敏标记：apiKey 明文不回传，仅回传是否已配置 */
  hasApiKey?: boolean
}

/**
 * 语音：音箱的「嗓子」——供应商 + 音色库。
 * builtin = 小米内置（永不可删）；第三方语音由 tts 配置承载。
 */
export interface Voice {
  id: string
  name: string
  provider: string
  /** 音色 ID（第三方语音），内置语音为空 */
  timbreId?: string
  /** 唤醒时的音效序列，如 [5,3] */
  ttsCommand?: (number | undefined)[]
  /** 内置标记：小米内置 voice 永不可删 */
  builtin?: boolean
  /** 第三方 TTS 引擎配置（provider !== 'builtin' 时生效） */
  tts?: import('mi-gpt-tts').TTSConfig
  /** 已消耗 input token 数（自动累加 + 手动修正） */
  inputTokensUsed?: number
  /** 已消耗 output token 数（自动累加 + 手动修正） */
  outputTokensUsed?: number
  /** 已消耗 token 总数（自动累加 + 手动修正） */
  totalTokensUsed?: number
  /** token 上限（用户设置） */
  tokenLimit?: number
  /** 余额不足标记：API 返回 429/402 等错误时自动置 true，用户可手动清除 */
  limitReached?: boolean
  createdAt: number
  /** 读接口脱敏标记：TTS 令牌（edge/volcano/openai）明文不回传，仅回传是否已配置 */
  hasTtsToken?: boolean
}

/**
 * 会话：对话记忆的上下文归属（对应旧版 chatGroup / conversation）。
 * 独立实体，多个角色可共用同一会话；被角色引用时禁止删除。
 */
export interface Conversation {
  id: string
  /** 会话名称（对话记忆上下文归属，如「家庭闲聊」） */
  name: string
  /** 会话描述 */
  description?: string
  /** 内置标记：系统内置会话不可删除（可编辑、可重置默认值） */
  builtin?: boolean
  createdAt: number
}

export interface Device {
  id: string
  alias: string
  did: string
  speakerModel?: string
  /** 引用的对话角色（必填；角色承载人设与对话行为） */
  robotId: string
  accountId?: string
  /** 有序模型列表（第一个最优先；failover 时按顺序跳过 limitReached 的） */
  modelIds?: string[]
  /** @deprecated 旧字段，迁移后不再使用；保留仅兼容旧数据读取 */
  modelId?: string
  /** 引用的语音（必填；不再回退全局默认） */
  voiceId?: string
  /** @deprecated 已迁移至 Robot.conversationId；保留仅兼容旧数据读取 */
  conversationRef?: string
  /** @deprecated 已迁移至 Conversation 实体，保留仅兼容旧数据读取 */
  conversationName?: string
  /** @deprecated 已迁移至 Conversation 实体，保留仅兼容旧数据读取 */
  conversationDescription?: string
  ttsSecret: string
  createdAt: number
  /** 读接口脱敏标记：ttsSecret 明文不回传，仅回传是否已配置 */
  hasTtsSecret?: boolean
}

/**
 * 音箱型号：设备的「硬件身份」——数字指令与连续对话能力的默认配置。
 * 召唤词与播报词等文字配置归属「对话角色」，型号不承载语义层参数。
 * 内置型号（builtin）不可删除；设备通过 speakerModel 关联型号。
 */
export interface SpeakerModel {
  id: string
  name: string
  /** 型号标识（did 前缀 / 硬件型号），如 X08E、L05B */
  didPrefix: string
  description?: string
  /** TTS 指令（硬件指令序列，如 [5,1]） */
  ttsCommand?: number[]
  /** 唤醒指令（硬件指令序列，如 [5,3]） */
  wakeUpCommand?: number[]
  /** 播放检测指令（查询播放状态；部分型号不支持，可缺省） */
  playingCommand?: number[]
  /** 连续对话功能是否启用 */
  continuousDialogue?: boolean
  /** 型号图片（内置型号为真实设备图 URL；自定义型号可留空） */
  imageUrl?: string
  /** 内置标记：系统内置型号不可删除（可编辑、可重置默认值） */
  builtin?: boolean
  createdAt: number
}

/** 小米 micoapi 拉取到的云端设备（三步连接 Step2 与设备添加） */
export interface CloudDevice {
  name: string
  alias: string
  deviceID: string
  miotDID: string
  hardware: string
  presence: string
}

/**
 * 绑定链来源标注：
 * - account / robot  来自设备显式绑定
 * - model / voice   仅来自设备指定（必填；不再回退角色或全局默认）
 * - conversation            依次回退：角色指定 → 设备旧字段兼容
 */
export interface BindingRow {
  key: 'account' | 'robot' | 'model' | 'voice' | 'conversation'
  label: string
  name: string
  detail?: string
  source: 'device' | 'robot'
  sourceLabel: string
}

export interface DeviceBindings {
  account?: Account
  robot?: Robot
  model?: Model
  voice?: Voice
  conversation?: Conversation
  rows: BindingRow[]
}

/**
 * 供应商 → 推理服务 Base URL 映射（前后端共享的单一事实源）。
 * server 编译设备配置与 gui 表单预设均引用此处，避免两端硬编码漂移。
 * 未覆盖的供应商允许用户自定义 baseUrl；留空则由 mi-gpt 默认处理。
 * anthropic / gemini 原生协议并非 OpenAI 兼容，地址为官方兼容层入口，
 * 需配合网关使用（gui 选择卡片会显示角标提示）。
 */
export const PROVIDER_BASE_URLS: Record<string, string> = {
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  yi: 'https://api.lingyiwanwu.com/v1',
  baichuan: 'https://api.baichuan-ai.com/v1',
  minimax: 'https://api.minimax.chat/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
  groq: 'https://api.groq.com/openai/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  mistral: 'https://api.mistral.ai/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
}

// ── 契约字段清单（运行期事实源）────────────────────────────────
// 接口类型只在编译期生效，运行期读不到字段名：server 的 zod schema、路由写字段白名单
// 都需自己维护字段列表，容易与契约悄悄漂移。此处用常量固化各实体字段，供运行期一致性校验
// （如「存储 schema ↔ 契约」「路由白名单 ↔ 契约」测试）引用。
export const ENTITY_FIELDS = {
  credentials: ['miUserId', 'miPassword', 'passToken', 'hasPassToken'],
  account: [
    'id',
    'name',
    'miUserId',
    'miPassword',
    'passToken',
    'createdAt',
    'hasPassToken',
    'hasMiPassword',
  ],
  robot: [
    'id',
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
    'builtin',
    'modelIds',
    'modelId',
    'voiceId',
    'createdAt',
  ],
  model: [
    'id',
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
    'createdAt',
    'hasApiKey',
  ],
  voice: [
    'id',
    'name',
    'provider',
    'timbreId',
    'ttsCommand',
    'builtin',
    'tts',
    'inputTokensUsed',
    'outputTokensUsed',
    'totalTokensUsed',
    'tokenLimit',
    'limitReached',
    'createdAt',
    'hasTtsToken',
  ],
  speakerModel: [
    'id',
    'name',
    'didPrefix',
    'description',
    'ttsCommand',
    'wakeUpCommand',
    'playingCommand',
    'continuousDialogue',
    'imageUrl',
    'builtin',
    'createdAt',
  ],
  conversation: ['id', 'name', 'description', 'builtin', 'createdAt'],
  device: [
    'id',
    'alias',
    'did',
    'speakerModel',
    'robotId',
    'accountId',
    'modelIds',
    'modelId',
    'voiceId',
    'conversationRef',
    'conversationName',
    'conversationDescription',
    'ttsSecret',
    'createdAt',
    'hasTtsSecret',
  ],
} as const

/** 清单键名 → 对应实体接口 */
interface EntityMap {
  credentials: Credential
  account: Account
  robot: Robot
  model: Model
  voice: Voice
  speakerModel: SpeakerModel
  conversation: Conversation
  device: Device
}

/** 清单与接口字段严格一致时求值为 true，否则退化为 never（用于编译期断言） */
type ExactKeys<T, K extends readonly string[]> = [
  Exclude<keyof T, K[number]> | Exclude<K[number], keyof T>,
] extends [never]
  ? true
  : never

// 编译期断言：清单漏键 / 多键即在此报错（运行期不使用，仅作类型守卫）
const _fieldExactness: {
  [E in keyof EntityMap]: ExactKeys<EntityMap[E], (typeof ENTITY_FIELDS)[E]>
} = {
  credentials: true,
  account: true,
  robot: true,
  model: true,
  voice: true,
  speakerModel: true,
  conversation: true,
  device: true,
}
