/* ══ 领域常量：视图枚举、菜单标题、供应商注册表、TTS 引擎 ══ */
import { PROVIDER_BASE_URLS } from '@migptgui/contracts'

/**
 * 主菜单视图枚举：键名一律取实体英文名复数（对话记录/系统日志置底）。
 * 音箱型号用 speaker-models，避免与 LLM 模型（models）同词。
 */
export type View =
  | 'home'
  | 'accounts'
  | 'devices'
  | 'robots'
  | 'conversations'
  | 'models'
  | 'voices'
  | 'speaker-models'
  | 'chat-logs'
  | 'stats'
  | 'system-logs'
  | 'settings'
  | 'profile'

export const TITLES: Record<View, string> = {
  home: '首页',
  accounts: '云端账号',
  devices: '设备服务',
  robots: '对话角色',
  conversations: '会话',
  models: '模型',
  voices: '语音',
  'speaker-models': '音箱型号',
  'chat-logs': '对话记录',
  stats: '使用统计',
  'system-logs': '系统日志',
  settings: '基础设置',
  profile: '个人中心',
}

/** 各菜单页顶部搜索输入框的提示信息（切换菜单后动态切换） */
export const SEARCH_HINT: Record<View, string> = {
  home: '搜索账号 / 设备 / 角色 / 模型 / 语音',
  accounts: '搜索账号名称 / 小米 ID',
  devices: '搜索设备名称 / did',
  robots: '搜索角色名称 / 人设关键词',
  conversations: '搜索会话名称 / 描述',
  models: '搜索模型名称 / 供应商 / 模型标识',
  voices: '搜索语音名称 / 供应商',
  'speaker-models': '搜索型号名称 / 型号标识',
  'chat-logs': '搜索对话记录内容',
  stats: '搜索统计维度',
  'system-logs': '搜索系统日志内容',
  settings: '搜索设置项',
  profile: '搜索设置项',
}

/**
 * 供应商注册表条目（对齐主流模型服务的「供应商选择」体验：
 * 品牌 Logo + 一键带出官方地址与示例模型，用户只需填 Key）。
 * color/mark 用于渲染品牌色 Logo 徽标；hint 展示在选择卡片下方。
 */
export interface ProviderDef {
  /** 展示名称 */
  name: string
  /** 品牌色（Logo 徽标背景；有官方 logo 图时作为 fallback 字标底色） */
  color: string
  /** 字标（无官方 logo 图或加载失败时显示，1–2 位品牌标识） */
  mark: string
  /** 官方品牌 Logo 图（首选）；取自 Simple Icons 官方 CDN，失败回退为字标 */
  logo?: string
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
 * 供应商品牌 Logo CDN（LobeHub AI 图标库 + Simple Icons 兜底）。
 * 优先 LobeHub（AI 品牌全覆盖），个别仅 Simple Icons 收录的走后者。
 */
const LOBE = 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg/icons'
const SI = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons'

/**
 * 模型供应商注册表（自定义 + 国内外主流厂商，均提供 OpenAI 兼容端点）。
 * baseUrl 单一事实源取自 @migptgui/contracts 的 PROVIDER_BASE_URLS。
 * logo 字段为官方品牌 Logo SVG（LobeHub / Simple Icons CDN）；无资源的品牌回退为字标。
 */
export const MODEL_PROVIDERS: Record<string, ProviderDef> = {
  custom: {
    name: '自定义',
    color: '#64748b',
    mark: '⚙',
    hint: '任意 OpenAI 兼容接口',
    baseUrl: '',
    model: '',
  },
  doubao: {
    name: '火山方舟',
    color: '#3863f1',
    mark: '火山',
    logo: `${LOBE}/volcengine.svg`,
    hint: '豆包系列大模型',
    baseUrl: PROVIDER_BASE_URLS.doubao,
    model: 'doubao-seed-2-0-lite',
    models: [
      'doubao-seed-2-1-pro',
      'doubao-seed-2-0-lite',
      'doubao-seed-1-6',
      'doubao-1-5-pro-32k',
      'doubao-1-5-lite-32k',
    ],
  },
  openai: {
    name: 'OpenAI',
    color: '#000000',
    mark: '◎',
    logo: `${LOBE}/openai.svg`,
    hint: 'GPT 系列',
    baseUrl: PROVIDER_BASE_URLS.openai,
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
  },
  deepseek: {
    name: 'DeepSeek',
    color: '#4d6bfe',
    mark: 'D',
    logo: `${LOBE}/deepseek.svg`,
    hint: '深度求索',
    baseUrl: PROVIDER_BASE_URLS.deepseek,
    model: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  qwen: {
    name: '通义千问',
    color: '#615ced',
    mark: '通义',
    logo: `${LOBE}/qwen.svg`,
    hint: '阿里云百炼 · Qwen',
    baseUrl: PROVIDER_BASE_URLS.qwen,
    model: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen3-coder-plus'],
  },
  zhipu: {
    name: '智谱AI',
    color: '#2954e3',
    mark: '智谱',
    logo: `${LOBE}/zhipu.svg`,
    hint: 'GLM 系列',
    baseUrl: PROVIDER_BASE_URLS.zhipu,
    model: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus', 'glm-4.5-air'],
  },
  moonshot: {
    name: 'Kimi',
    color: '#111111',
    mark: 'K',
    logo: `${SI}/moonshotai.svg`,
    hint: '月之暗面 · Moonshot',
    baseUrl: PROVIDER_BASE_URLS.moonshot,
    model: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-latest'],
  },
  minimax: {
    name: 'MiniMax',
    color: '#f55022',
    mark: 'M',
    logo: `${LOBE}/minimax.svg`,
    hint: 'ABAB / M2 系列',
    baseUrl: PROVIDER_BASE_URLS.minimax,
    model: 'MiniMax-M2',
    models: [
      'MiniMax-M2',
      'MiniMax-M2.1-highspeed',
      'MiniMax-Text-01',
      'abab6.5s-chat',
    ],
  },
  siliconflow: {
    name: '硅基流动',
    color: '#6b56ff',
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
    color: '#0066ff',
    mark: '01',
    logo: `${LOBE}/yi.svg`,
    hint: '01.AI · 万知',
    baseUrl: PROVIDER_BASE_URLS.yi,
    model: 'yi-large',
    models: ['yi-large', 'yi-medium', 'yi-lightning'],
  },
  groq: {
    name: 'Groq',
    color: '#f55036',
    mark: 'G',
    logo: `${LOBE}/groq.svg`,
    hint: '超低延迟推理',
    baseUrl: PROVIDER_BASE_URLS.groq,
    model: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  cerebras: {
    name: 'Cerebras',
    color: '#00b3a4',
    mark: 'C',
    logo: `${LOBE}/cerebras.svg`,
    hint: '晶圆级高速推理',
    baseUrl: PROVIDER_BASE_URLS.cerebras,
    model: 'llama-3.3-70b',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
  },
  mistral: {
    name: 'Mistral AI',
    color: '#ff7000',
    mark: 'M',
    logo: `${LOBE}/mistral.svg`,
    hint: '欧洲大模型',
    baseUrl: PROVIDER_BASE_URLS.mistral,
    model: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest'],
  },
  anthropic: {
    name: 'Anthropic',
    color: '#d97757',
    mark: 'A',
    logo: `${LOBE}/anthropic.svg`,
    hint: 'Claude 系列',
    badge: '需兼容网关',
    baseUrl: PROVIDER_BASE_URLS.anthropic,
    model: 'claude-sonnet-4-20250514',
  },
  gemini: {
    name: 'Google Gemini',
    color: '#4285f4',
    mark: 'G',
    logo: `${LOBE}/gemini.svg`,
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
  Object.entries(MODEL_PROVIDERS).map(([k, p]) => [
    k,
    { baseUrl: p.baseUrl || '', model: p.model || '' },
  ]),
)

/**
 * 语音供应商注册表。
 * 仅收录 mi-gpt-tts（或其 OpenAI 兼容 /v1/audio/speech 端点）真实可驱动的供应商；
 * 其余厂商因无兼容 TTS 接口，一律不进列表，避免用户配置后无法发音。
 * engine 标注底层 TTS 引擎（写入 tts 配置的键）：
 * - edge / volcano / openai 为 mi-gpt-tts 原生引擎
 * - openai-compat 走 openai 引擎 + 供应商 baseUrl（OpenAI 兼容语音接口）
 */
export const VOICE_PROVIDERS: Record<
  string,
  ProviderDef & {
    engine: 'edge' | 'volcano' | 'openai' | 'openai-compat'
    voices?: string[]
  }
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
    voices: [
      'zh-CN-XiaoxiaoNeural',
      'zh-CN-YunxiNeural',
      'zh-CN-XiaoyiNeural',
      'zh-CN-YunjianNeural',
      'zh-CN-liaoning-XiaobeiNeural',
      'zh-TW-HsiaoChenNeural',
      'zh-TW-YunJheNeural',
      'en-US-JennyNeural',
      'en-US-GuyNeural',
      'en-US-AriaNeural',
    ],
  },
  volcano: {
    name: '火山引擎语音',
    color: '#3863f1',
    mark: '火山',
    logo: `${LOBE}/volcengine.svg`,
    hint: '豆包语音合成 · Volcengine TTS',
    engine: 'volcano',
    voices: [
      'zh_female_cancan_mars_bigtts',
      'zh_male_aotian_mars_bigtts',
      'zh_female_wanwanx_mars_bigtts',
      'zh_male_shaonian_mars_bigtts',
    ],
  },
  openai: {
    name: 'OpenAI',
    color: '#000000',
    mark: '◎',
    logo: `${LOBE}/openai.svg`,
    hint: 'TTS 系列 · 改地址可接兼容端点',
    baseUrl: PROVIDER_BASE_URLS.openai,
    model: 'tts-1',
    models: ['tts-1', 'tts-1-hd'],
    engine: 'openai',
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  },
  doubao: {
    name: '火山方舟',
    color: '#3863f1',
    mark: '火山',
    logo: `${LOBE}/volcengine.svg`,
    hint: '豆包语音 (OpenAI 兼容)',
    baseUrl: PROVIDER_BASE_URLS.doubao,
    model: 'tts-1',
    engine: 'openai-compat',
    voices: [
      'zh_female_cancan_mars_bigtts',
      'zh_male_aotian_mars_bigtts',
      'zh_female_wanwanx_mars_bigtts',
    ],
  },
  siliconflow: {
    name: '硅基流动',
    color: '#6b56ff',
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
    voices: [
      'FunAudioLLM/CosyVoice2-0.5B:alex',
      'FunAudioLLM/CosyVoice2-0.5B:anna',
    ],
  },
}

/**
 * 语音供应商键 → 展示名称（含历史引擎键兜底，兼容旧数据展示）。
 * builtin 为小米内置语音，仅用于展示、不出现在新建供应商列表。
 */
export const TTS_ENGINES: Record<string, string> = {
  builtin: '默认语音',
  ...Object.fromEntries(
    Object.entries(VOICE_PROVIDERS).map(([k, p]) => [k, p.name]),
  ),
}

/**
 * 语音表单统一字段（思考/语音表单与弹窗共用同一份草稿）：
 * 所有供应商共用一组输入，切换供应商自动收敛表单：
 * - edge：token 可选，留空自动获取
 * - volcano：appId + token 必填
 * - openai / openai-compat：token（API Key）必填，模型与接口地址可选
 */
export interface VoiceFormValues {
  provider: string
  name: string
  timbreId: string
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
 * 读取既有语音的 tts 配置 → 统一表单值（按供应商引擎映射）。
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
    timbreId: '',
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
    if (!s) {
      // 新建时默认填充标准 JSON 配置样例，用户只需替换值
      v.customJson = `{\n  "edge": {\n    "trustedToken": ""\n  }\n}`
    } else {
      v.customJson = Object.keys(tts).length ? JSON.stringify(tts, null, 2) : ''
    }
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
    if (!v.customJson.trim()) {
      return { tts, err: '自定义 TTS 配置不能为空' }
    }
    try {
      const parsed = JSON.parse(v.customJson)
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return { tts, err: '自定义 TTS 配置必须为 JSON 对象' }
      }
      if (Object.keys(parsed).length === 0) {
        return { tts, err: '自定义 TTS 配置不能为空对象 {}' }
      }
      Object.assign(tts, parsed)
    } catch (e) {
      return {
        tts,
        err: `自定义 TTS 配置不是合法 JSON: ${(e as Error).message}`,
      }
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
