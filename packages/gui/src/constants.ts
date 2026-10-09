/* ══ 领域常量：视图枚举、菜单标题、供应商注册表、TTS 引擎 ══ */
import { PROVIDER_BASE_URLS } from '@migptgui/contracts'

/** 主菜单视图枚举（菜单顺序 = 配置先后顺序，对话记录/系统日志置底） */
export type View =
  | 'home'
  | 'accounts'
  | 'devices'
  | 'roles'
  | 'logs'
  | 'think'
  | 'voice'
  | 'models'
  | 'rooms'
  | 'settings'
  | 'profile'
  | 'syslogs'
  | 'stats'

export const TITLES: Record<View, string> = {
  home: '首页',
  accounts: '云端账号',
  devices: '设备服务',
  roles: '对话角色',
  logs: '对话记录',
  think: '思考服务',
  voice: '语音服务',
  models: '设备型号',
  rooms: '会话群',
  settings: '基础设置',
  profile: '个人中心',
  syslogs: '系统日志',
  stats: '使用统计',
}

/** 各菜单页顶部搜索输入框的提示信息（切换菜单后动态切换） */
export const SEARCH_HINT: Record<View, string> = {
  home: '搜索账号 / 设备 / 角色 / 服务',
  accounts: '搜索账号名称 / 小米 ID',
  devices: '搜索设备名称 / did',
  roles: '搜索角色名称 / 人设关键词',
  think: '搜索思考服务名称 / 模型',
  voice: '搜索语音服务名称 / 供应商',
  models: '搜索型号名称 / 标识 / did',
  rooms: '搜索会话群名称 / 描述',
  logs: '搜索对话记录内容',
  syslogs: '搜索系统日志内容',
  settings: '搜索设置项',
  profile: '搜索设置项',
  stats: '搜索统计维度',
}

/**
 * 供应商注册表条目（对齐主流模型服务的「供应商选择」体验：
 * 品牌 Logo + 一键带出官方地址与示例模型，用户只需填 Key）。
 * color/mark 用于渲染品牌色 Logo 徽标；hint 展示在选择卡片下方。
 */
export interface ProviderDef {
  /** 展示名称 */
  name: string
  /** 品牌色（Logo 徽标背景） */
  color: string
  /** Logo 徽标字符（1–2 位，取品牌首字母/标识） */
  mark: string
  /** 选择卡片下方的补充说明 */
  hint?: string
  /** 供应商选择卡片的警示角标（如接口兼容性提示） */
  badge?: string
  /** 官方接口地址（留空由 mi-gpt 默认处理） */
  baseUrl?: string
  /** 示例 / 默认模型（切换供应商自动带出，可修改） */
  model?: string
  /** 模型输入框候选（datalist 建议，可自由输入） */
  models?: string[]
}

/**
 * 思考服务供应商注册表（自定义 + 国内外主流厂商，均提供 OpenAI 兼容端点）。
 * baseUrl 单一事实源取自 @migptgui/contracts 的 PROVIDER_BASE_URLS。
 */
export const THINK_PROVIDERS: Record<string, ProviderDef> = {
  custom: {
    name: '自定义',
    color: '#64748b',
    mark: '⚙',
    hint: '任意 OpenAI 兼容接口',
    baseUrl: '',
    model: '',
  },
  doubao: {
    name: '豆包',
    color: '#3250ea',
    mark: '豆',
    hint: '火山方舟 · Ark',
    baseUrl: PROVIDER_BASE_URLS.doubao,
    model: 'doubao-1-5-lite-32k',
    models: [
      'doubao-1-5-lite-32k',
      'doubao-1-5-pro-32k',
      'doubao-seed-1-6',
      'doubao-seed-1-8',
    ],
  },
  openai: {
    name: 'OpenAI',
    color: '#0f0f0f',
    mark: '◎',
    hint: 'GPT 系列',
    baseUrl: PROVIDER_BASE_URLS.openai,
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
  },
  deepseek: {
    name: 'DeepSeek',
    color: '#4d6bfe',
    mark: 'D',
    hint: '深度求索',
    baseUrl: PROVIDER_BASE_URLS.deepseek,
    model: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  qwen: {
    name: '通义千问',
    color: '#615ced',
    mark: 'Q',
    hint: '阿里云百炼',
    baseUrl: PROVIDER_BASE_URLS.qwen,
    model: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen3-coder-plus'],
  },
  zhipu: {
    name: '智谱 AI',
    color: '#1677ff',
    mark: '智',
    hint: 'GLM 系列',
    baseUrl: PROVIDER_BASE_URLS.zhipu,
    model: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus', 'glm-4.5-air'],
  },
  moonshot: {
    name: 'Kimi',
    color: '#111111',
    mark: 'K',
    hint: '月之暗面',
    baseUrl: PROVIDER_BASE_URLS.moonshot,
    model: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-latest'],
  },
  minimax: {
    name: 'MiniMax',
    color: '#f5551e',
    mark: 'M',
    hint: 'ABAB 系列',
    baseUrl: PROVIDER_BASE_URLS.minimax,
    model: 'MiniMax-Text-01',
    models: ['MiniMax-Text-01', 'abab6.5s-chat', 'MiniMax-M1'],
  },
  siliconflow: {
    name: '硅基流动',
    color: '#4f46e5',
    mark: '硅',
    hint: '聚合多家开源模型',
    baseUrl: PROVIDER_BASE_URLS.siliconflow,
    model: 'Qwen/Qwen2.5-7B-Instruct',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'deepseek-ai/DeepSeek-V3',
      'THUDM/GLM-4-9B-Chat',
    ],
  },
  baichuan: {
    name: '百川智能',
    color: '#2f6bff',
    mark: '百',
    hint: '百小应',
    baseUrl: PROVIDER_BASE_URLS.baichuan,
    model: 'Baichuan4',
    models: ['Baichuan4', 'Baichuan3-Turbo'],
  },
  yi: {
    name: '零一万物',
    color: '#00a98f',
    mark: 'Yi',
    hint: '万知',
    baseUrl: PROVIDER_BASE_URLS.yi,
    model: 'yi-large',
    models: ['yi-large', 'yi-medium', 'yi-lightning'],
  },
  groq: {
    name: 'Groq',
    color: '#f55036',
    mark: 'G',
    hint: '超低延迟推理',
    baseUrl: PROVIDER_BASE_URLS.groq,
    model: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  cerebras: {
    name: 'Cerebras',
    color: '#00b3a4',
    mark: 'C',
    hint: '晶圆级高速推理',
    baseUrl: PROVIDER_BASE_URLS.cerebras,
    model: 'llama-3.3-70b',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
  },
  mistral: {
    name: 'Mistral',
    color: '#fa520f',
    mark: 'MI',
    hint: '欧洲大模型',
    baseUrl: PROVIDER_BASE_URLS.mistral,
    model: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest'],
  },
  anthropic: {
    name: 'Anthropic',
    color: '#d97757',
    mark: 'A',
    hint: 'Claude 系列',
    badge: '需兼容网关',
    baseUrl: PROVIDER_BASE_URLS.anthropic,
    model: 'claude-sonnet-4-20250514',
  },
  gemini: {
    name: 'Google Gemini',
    color: '#4285f4',
    mark: 'G',
    hint: 'Gemini 系列',
    badge: '需兼容网关',
    baseUrl: PROVIDER_BASE_URLS.gemini,
    model: 'gemini-2.5-flash',
  },
}

/** 供应商 → 默认接口地址与示例模型（切换供应商时自动带出，可覆盖） */
export const PROVIDER_PRESETS: Record<
  string,
  { baseUrl: string; model: string }
> = Object.fromEntries(
  Object.entries(THINK_PROVIDERS).map(([k, p]) => [
    k,
    { baseUrl: p.baseUrl || '', model: p.model || '' },
  ]),
)

/**
 * 语音服务供应商注册表。
 * 仅收录 mi-gpt-tts（或其 OpenAI 兼容 /v1/audio/speech 端点）真实可驱动的供应商；
 * 其余厂商因无兼容 TTS 接口，一律不进列表，避免用户配置后无法发音。
 * engine 标注底层 TTS 引擎（写入 tts 配置的键）：
 * - edge / volcano / openai 为 mi-gpt-tts 原生引擎
 * - openai-compat 走 openai 引擎 + 供应商 baseUrl（OpenAI 兼容语音接口）
 */
export const VOICE_PROVIDERS: Record<
  string,
  ProviderDef & { engine: 'edge' | 'volcano' | 'openai' | 'openai-compat' }
> = {
  custom: {
    name: '自定义',
    color: '#64748b',
    mark: '⚙',
    hint: '直接填写 TTS 配置 JSON',
    engine: 'openai',
  },
  edge: {
    name: 'Edge 朗读',
    color: '#0078d4',
    mark: 'E',
    hint: '免费 · 无需密钥',
    engine: 'edge',
  },
  volcano: {
    name: '火山语音',
    color: '#3250ea',
    mark: '豆',
    hint: '豆包语音合成',
    engine: 'volcano',
  },
  openai: {
    name: 'OpenAI',
    color: '#0f0f0f',
    mark: '◎',
    hint: 'TTS 系列 · 改地址可接兼容端点',
    baseUrl: PROVIDER_BASE_URLS.openai,
    engine: 'openai',
  },
  doubao: {
    name: '豆包语音',
    color: '#3250ea',
    mark: '豆',
    hint: 'OpenAI 兼容语音接口',
    baseUrl: PROVIDER_BASE_URLS.doubao,
    engine: 'openai-compat',
  },
  siliconflow: {
    name: '硅基流动',
    color: '#4f46e5',
    mark: '硅',
    hint: 'OpenAI 兼容 · 聚合 CosyVoice 等',
    baseUrl: PROVIDER_BASE_URLS.siliconflow,
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    models: [
      'FunAudioLLM/CosyVoice2-0.5B',
      'fnlp/MOSS-TTSD-v0.5',
      'IndexTeam/IndexTTS-2',
    ],
    engine: 'openai-compat',
  },
}

/**
 * 语音服务供应商键 → 展示名称（含历史引擎键兜底，兼容旧数据展示）。
 * builtin 为小米内置语音，仅用于展示、不出现在新建供应商列表。
 */
export const TTS_ENGINES: Record<string, string> = {
  builtin: '默认语音',
  ...Object.fromEntries(
    Object.entries(VOICE_PROVIDERS).map(([k, p]) => [k, p.name]),
  ),
}

/**
 * 语音表单统一字段（思考/语音服务表单与弹窗共用同一份草稿）：
 * 所有供应商共用一组输入，切换供应商自动收敛表单：
 * - edge：token 可选，留空自动获取
 * - volcano：appId + token 必填
 * - openai / openai-compat：token（API Key）必填，模型与接口地址可选
 */
export interface VoiceFormValues {
  provider: string
  name: string
  voiceId: string
  /** 访问令牌 / Access Token / API Key */
  token: string
  /** 火山语音合成 App ID（仅 volcano） */
  appId: string
  /** 语音模型（openai / openai-compat，留空走引擎默认） */
  model: string
  /** 接口地址（openai-compat 自动带出官方地址，可改网关） */
  baseUrl: string
  customJson: string
}

/**
 * 读取既有语音服务的 tts 配置 → 统一表单值（按供应商引擎映射）。
 * 返回值不含名称 / 音色等实体字段，由调用方自行并入草稿。
 */
export function voiceFormFromTts<
  T extends { provider?: string; tts?: unknown } | null | undefined,
>(s: T): VoiceFormValues {
  const provider = s?.provider || 'custom'
  const tts = (s?.tts || {}) as {
    edge?: { trustedToken?: string }
    volcano?: { appId?: string; accessToken?: string }
    openai?: { apiKey?: string; model?: string; baseUrl?: string }
  } & Record<string, unknown>
  const engine = VOICE_PROVIDERS[provider]?.engine || 'openai'
  const v: VoiceFormValues = {
    provider,
    name: '',
    voiceId: '',
    token: '',
    appId: '',
    model: VOICE_PROVIDERS[provider]?.model || '',
    baseUrl: '',
    customJson: '',
  }
  if (engine === 'edge') v.token = tts.edge?.trustedToken || ''
  else if (engine === 'volcano') {
    v.appId = tts.volcano?.appId || ''
    v.token = tts.volcano?.accessToken || ''
  } else if (provider === 'custom') {
    v.customJson = Object.keys(tts).length ? JSON.stringify(tts, null, 2) : ''
  } else {
    v.token = tts.openai?.apiKey || ''
    v.model = tts.openai?.model || v.model
    v.baseUrl = tts.openai?.baseUrl || ''
  }
  return v
}

/**
 * 由统一语音表单值构造 mi-gpt TTSConfig。
 * openai-compat 供应商复用 openai 引擎配置（自带 baseUrl），
 * 供应商键保留在实体 provider 字段用于展示与筛选。
 * 返回 `err` 表示校验失败。
 */
export function buildVoiceTts(v: VoiceFormValues): {
  tts: Record<string, unknown>
  err?: string
} {
  const engine = VOICE_PROVIDERS[v.provider]?.engine || 'openai'
  const tts: Record<string, unknown> = {}
  if (engine === 'edge') {
    tts.edge = v.token ? { trustedToken: v.token } : {}
  } else if (engine === 'volcano') {
    if (!v.appId || !v.token)
      return { tts, err: '火山语音需填写 App ID 与访问令牌' }
    tts.volcano = { appId: v.appId, accessToken: v.token }
  } else if (v.provider === 'custom') {
    try {
      Object.assign(tts, JSON.parse(v.customJson || '{}'))
    } catch {
      return { tts, err: '自定义 TTS 配置不是合法 JSON' }
    }
  } else {
    const name = VOICE_PROVIDERS[v.provider]?.name || '语音'
    if (!v.token) return { tts, err: `${name} 需填写 API Key` }
    const baseUrl =
      v.baseUrl ||
      (v.provider !== 'openai'
        ? VOICE_PROVIDERS[v.provider]?.baseUrl || ''
        : '')
    tts.openai = {
      apiKey: v.token,
      ...(v.model ? { model: v.model } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    }
  }
  return { tts }
}
