/* ══ 领域常量：视图枚举、菜单标题、供应商清单、TTS 引擎 ══ */
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

/** 思考服务供应商（与 mi-gpt 原版一致：自定义 + 8 家官方） */
export const PROVIDERS: Record<string, string> = {
  custom: '自定义',
  openai: 'OpenAI',
  zhipu: '智谱 AI',
  doubao: '豆包',
  qwen: '通义千问',
  deepseek: 'DeepSeek',
  yi: '零一万物（万知）',
  baichuan: '百川智能（百小应）',
  moonshot: 'Moonshot (Kimi)',
}

/** 供应商 → 默认接口地址与示例模型（切换供应商时自动带出，可覆盖）
 *  baseUrl 统一取自 @migptgui/contracts，避免与 server 端硬编码漂移 */
export const PROVIDER_PRESETS: Record<
  string,
  { baseUrl: string; model: string }
> = {
  custom: { baseUrl: '', model: '' },
  openai: { baseUrl: PROVIDER_BASE_URLS.openai, model: 'gpt-4o-mini' },
  zhipu: { baseUrl: PROVIDER_BASE_URLS.zhipu, model: 'glm-4-flash' },
  doubao: { baseUrl: PROVIDER_BASE_URLS.doubao, model: 'doubao-seed-1-8k' },
  qwen: { baseUrl: PROVIDER_BASE_URLS.qwen, model: 'qwen-plus' },
  deepseek: { baseUrl: PROVIDER_BASE_URLS.deepseek, model: 'deepseek-chat' },
  yi: { baseUrl: PROVIDER_BASE_URLS.yi, model: 'yi-large' },
  baichuan: { baseUrl: PROVIDER_BASE_URLS.baichuan, model: 'baichuan-ai-4' },
  moonshot: { baseUrl: PROVIDER_BASE_URLS.moonshot, model: 'moonshot-v1-8k' },
}

/** 语音服务 TTS 引擎（对应 mi-gpt-tts 支持能力；builtin = 默认语音） */
export const TTS_ENGINES: Record<string, string> = {
  builtin: '默认语音',
  edge: 'Edge 大声朗读',
  volcano: '火山（豆包）',
  openai: 'OpenAI',
  custom: '自定义',
}
