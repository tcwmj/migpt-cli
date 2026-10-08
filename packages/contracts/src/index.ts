// ── 前后端共享契约：实体类型单一事实源 ────────────────────────
// server（packages/server/src/types.ts）与 gui（packages/gui/src/apis.ts）
// 均从本包引用，修改契约两端同时生效；结构必须与存储 JSON 一一对应。

export interface Settings {
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

export interface Role {
  id: string
  name: string
  profile: string
  callAIKeywords: string[]
  wakeUpKeywords: string[]
  exitKeywords: string[]
  /** 检测1/检测2：说出继续词保持对话、停止词结束对话（已并入唤醒/退出关键词真实生效） */
  checkContinueKeywords?: string[]
  checkNotContinueKeywords?: string[]
  onEnterAI: string[]
  onExitAI: string[]
  onAIAsking: string[]
  onAIReplied: string[]
  onAIError: string[]
  /** 连续对话无响应自动退出时间（秒，默认 30） */
  exitKeepAliveAfter?: number
  /** 该角色默认引用的思考服务（设备未覆盖时生效） */
  thinkServiceId?: string
  /** 该角色默认引用的语音服务（设备未覆盖时生效） */
  voiceId?: string
}

/**
 * 思考服务：音箱的「大脑」——大模型供应商 + 模型 + 凭据 + 温度。
 * 独立于设备存在，被角色与设备引用；被引用时禁止删除。
 */
export interface ThinkService {
  id: string
  name: string
  provider: string
  model: string
  apiKey: string
  baseUrl?: string
  temperature?: number
  /** 全局默认思考服务：未指定角色/设备时回退到这里 */
  isDefault?: boolean
  createdAt: number
  /** 读接口脱敏标记：apiKey 明文不回传，仅回传是否已配置 */
  hasApiKey?: boolean
}

/**
 * 语音服务：音箱的「嗓子」——供应商 + 音色库。
 * builtin = 小米内置（永不可删）；第三方语音由 tts 配置承载。
 */
export interface VoiceService {
  id: string
  name: string
  provider: string
  /** 音色 ID（第三方语音），内置语音为空 */
  voiceId?: string
  /** 唤醒时的音效序列，如 [5,3] */
  ttsCommand?: (number | undefined)[]
  /** 内建标记：小米内置 voice 永不可删 */
  builtin?: boolean
  /** 全局默认语音服务 */
  isDefault?: boolean
  /** 第三方 TTS 引擎配置（provider !== 'builtin' 时生效） */
  tts?: import('mi-gpt-tts').TTSConfig
  createdAt: number
}

/**
 * 会话群：对话记忆的上下文归属（对应旧版 chatGroup / room）。
 * 独立实体，多台设备可共用同一会话群；被设备引用时禁止删除。
 */
export interface Room {
  id: string
  /** 会话群名称（对话记忆上下文归属，如「家庭闲聊」） */
  name: string
  /** 会话群描述 */
  description?: string
  createdAt: number
}

export interface DeviceMeta {
  id: string
  alias: string
  did: string
  speakerModel?: string
  roleId?: string
  accountId?: string
  /** 设备级思考服务覆盖（优先级最高） */
  thinkServiceId?: string
  /** 设备级语音服务覆盖（优先级最高） */
  voiceOverrideId?: string
  /** 连续对话超时（秒）：无响应多久自动退出唤醒模式，默认 30 */
  exitKeepAliveAfter?: number
  /** 会话群引用（Room 实体 id）；多设备可共用同一会话群 */
  roomRef?: string
  /** 会话群名称（已迁移至 Room 实体，保留仅兼容旧数据；编译时优先 roomRef） */
  roomName?: string
  /** 会话群描述（已迁移至 Room 实体，保留仅兼容旧数据） */
  roomDescription?: string
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
  did: string
  desc?: string
  /** TTS 指令（硬件指令序列，如 [5,1]） */
  ttsCommand?: number[]
  /** 唤醒指令（硬件指令序列，如 [5,3]） */
  wakeUpCommand?: number[]
  /** 播放检测指令（查询播放状态；部分型号不支持，可缺省） */
  playingCommand?: number[]
  /** 连续对话功能是否启用 */
  consecutive?: boolean
  /** 型号图片（内置型号为真实设备图 URL；自定义型号可留空） */
  imageUrl?: string
  /** 内建标记：系统内置型号不可删除（可编辑、可重置默认值） */
  builtin?: boolean
  createdAt: number
}

/** 小米 micoapi 拉取到的云端设备（三步连接 Step2 与设备添加） */
export interface PulledDevice {
  name: string
  alias: string
  deviceID: string
  miotDID: string
  hardware: string
  presence: string
}

/**
 * 绑定链来源标注：
 * - account / role  来自设备显式绑定
 * - think / voice   依次回退：设备覆盖 → 继承人设 → 全局默认
 */
export interface BindingRow {
  key: 'account' | 'role' | 'think' | 'voice'
  label: string
  name: string
  detail?: string
  source: 'device' | 'role' | 'global'
  sourceLabel: string
}

export interface DeviceBindings {
  account?: Account
  role?: Role
  think?: ThinkService
  voice?: VoiceService
  rows: BindingRow[]
}

export const ROLE_DEFAULTS = {
  callAIKeywords: ['请', '你', '傻妞'],
  wakeUpKeywords: ['打开', '进入', '召唤'],
  exitKeywords: ['关闭', '退出', '再见'],
  checkContinueKeywords: [],
  checkNotContinueKeywords: [],
  exitKeepAliveAfter: 30,
  onEnterAI: ['你好，我是傻妞，很高兴认识你'],
  onExitAI: ['傻妞已退出'],
  onAIAsking: ['让我先想想', '请稍等'],
  onAIReplied: ['我说完了', '还有其他问题吗'],
  onAIError: ['啊哦，出错了，请稍后再试吧！'],
}

/**
 * 供应商 → 推理服务 Base URL 映射（前后端共享的单一事实源）。
 * server 编译设备配置与 gui 表单预设均引用此处，避免两端硬编码漂移。
 * 未覆盖的供应商允许用户自定义 baseUrl；留空则由 mi-gpt 默认处理。
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
}

// ── 契约字段清单（运行期事实源）────────────────────────────────
// 接口类型只在编译期生效，运行期读不到字段名：server 的 zod schema、路由写字段白名单
// 都需自己维护字段列表，容易与契约悄悄漂移。此处用常量固化各实体字段，供运行期一致性校验
// （如「存储 schema ↔ 契约」「路由白名单 ↔ 契约」测试）引用。
export const ENTITY_FIELDS = {
  settings: ['miUserId', 'miPassword', 'passToken', 'hasPassToken'],
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
  role: [
    'id',
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
  ],
  thinkService: [
    'id',
    'name',
    'provider',
    'model',
    'apiKey',
    'baseUrl',
    'temperature',
    'isDefault',
    'createdAt',
    'hasApiKey',
  ],
  voiceService: [
    'id',
    'name',
    'provider',
    'voiceId',
    'ttsCommand',
    'builtin',
    'isDefault',
    'tts',
    'createdAt',
  ],
  speakerModel: [
    'id',
    'name',
    'did',
    'desc',
    'ttsCommand',
    'wakeUpCommand',
    'playingCommand',
    'consecutive',
    'imageUrl',
    'builtin',
    'createdAt',
  ],
  room: ['id', 'name', 'description', 'createdAt'],
  deviceMeta: [
    'id',
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
    'createdAt',
    'hasTtsSecret',
  ],
} as const

/** 清单键名 → 对应实体接口 */
interface EntityMap {
  settings: Settings
  account: Account
  role: Role
  thinkService: ThinkService
  voiceService: VoiceService
  speakerModel: SpeakerModel
  room: Room
  deviceMeta: DeviceMeta
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
  settings: true,
  account: true,
  role: true,
  thinkService: true,
  voiceService: true,
  speakerModel: true,
  room: true,
  deviceMeta: true,
}
