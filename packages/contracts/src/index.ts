// ── 前后端共享契约：实体类型单一事实源 ────────────────────────
// server（packages/server/src/types.ts）与 gui（packages/gui/src/apis.ts）
// 均从本包引用，修改契约两端同时生效；结构必须与存储 JSON 一一对应。

/**
 * 小米凭据：一个账号一条记录（多账号），passToken 为会话凭证。
 * 说明：不再存储小米密码（miPassword）——账号开启异地登录验证后密码登录不可用，
 * passToken 必须人工获取填入；密码留在本地反而是不必要的攻击面。
 */
export interface Credential {
  id: string
  /** 凭据名称（如「家用小米号」），用于设备绑定选择与展示 */
  name: string
  /** 小米账号数字 ID */
  miUserId: string
  /** 会话凭证（人工获取填入，唯一登录方式） */
  passToken?: string
  createdAt: number
  /** 读接口脱敏标记：passToken 明文不回传，仅回传是否已配置 */
  hasPassToken?: boolean
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
  /**
   * 系统提示词模板（覆盖 mi-gpt 内置默认模板）。
   * 三态语义：`undefined` = 跟随内置默认模板；`''` = 关闭系统提示词；
   * 非空字符串 = 完全以该文本为准。可用变量见 SYSTEM_TEMPLATE_VARIABLES。
   */
  systemTemplate?: string
  /**
   * 来源模板标识（ROBOT_TEMPLATES 的 id）：仅用于展示「基于：高冷御姐」
   * 与「重置为该模板默认」。不参与 prompt 编译，不构成运行时依赖。
   */
  templateId?: string
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
  credentialId?: string
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

/** 小米 micoapi 拉取到的云端设备（五步连接 Step2 与设备添加） */
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
 * - credential / robot  来自设备显式绑定
 * - model / voice   仅来自设备指定（必填；不再回退角色或全局默认）
 * - conversation            依次回退：角色指定 → 设备旧字段兼容
 */
export interface BindingRow {
  key: 'credential' | 'robot' | 'model' | 'voice' | 'conversation'
  label: string
  name: string
  detail?: string
  source: 'device' | 'robot'
  sourceLabel: string
}

export interface DeviceBindings {
  credential?: Credential
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
  credential: [
    'id',
    'name',
    'miUserId',
    'passToken',
    'createdAt',
    'hasPassToken',
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
    'systemTemplate',
    'templateId',
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
    'credentialId',
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
  credential: Credential
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
  credential: true,
  robot: true,
  model: true,
  voice: true,
  speakerModel: true,
  conversation: true,
  device: true,
}

// ── 角色模板（新建角色的起点，只读库）──────────────────────────
/**
 * 角色模板：新建对话角色的预设起点。
 * 设计原则：
 * - 模板是「数据」不是「实体」——没有 id 生命周期、不可增删改，只有代码里一份；
 * - 套用 = 把字段摊平写进新建的角色，此后双方互不影响；
 * - `systemTemplate` 为模板携带的提示词骨架，套用时写入角色同名字段（undefined 表示跟随默认）。
 * 名称取「修饰词 + 定位」的两段式，避免自造词，保持可读与可检索。
 */
export interface RobotTemplate {
  id: string
  /** 模板名称（如「台湾甜妹」） */
  name: string
  /** 一句话定位，用于卡片副标题 */
  tagline: string
  /** 示例语气，用于卡片上的效果预览 */
  sample: string
  /** 角色称呼默认值 */
  name_default?: string
  /** 角色性格（写入 Robot.profile） */
  profile: string
  /** 默认称呼用户的说法 */
  masterName?: string
  /** 进入/退出/思考等播报词（可选，留空则不预设） */
  onEnterAI?: string[]
  onExitAI?: string[]
  onAIAsking?: string[]
  onAIReplied?: string[]
  onAIError?: string[]
  /** 模板的语气风格段落：追加到默认骨架的「## 开始」之前 */
  tone?: RobotTemplateTone
  /** 模板推荐的系统提示词（空则不覆盖，跟随内置默认） */
  systemTemplate?: string
}

/**
 * 系统提示词可用变量（mi-gpt 注入，大小写敏感）。
 * 与 mi-gpt `buildPrompt` 的替换键一一对应，改动需同步上游。
 */
export const SYSTEM_TEMPLATE_VARIABLES = [
  'botName',
  'botProfile',
  'masterName',
  'masterProfile',
  'roomName',
  'roomIntroduction',
  'messages',
  'shortTermMemory',
  'longTermMemory',
] as const

/**
 * 自有系统提示词模板（默认值）。
 * 融合两版上游模板的取舍：
 * - 保留 mi-gpt 的「区块 + <start>/<end> 包裹」结构，模型对分区上下文识别更稳；
 * - 吸收 lerio 的四条硬约束：最高优先级（答准 > 人设）、语音识别容错、回答长度分级、
 *   纯口语输出（禁 Markdown / 禁时间戳前缀 / 禁确认套话）；
 * - 变量名严格使用 mi-gpt 的键名，保证替换生效。
 */
export const DEFAULT_SYSTEM_TEMPLATE = `请重置所有之前的上下文、文件和指令。现在，你将扮演{{botName}}，使用第一人称视角回复消息。

## 关于你
你的名字是{{botName}}。下面是你的个人简介：
<start>
{{botProfile}}
</end>

## 你的对话伙伴
你正在与{{masterName}}对话。这是关于{{masterName}}的信息：
<start>
{{masterProfile}}
</end>

## 你们的群组
你和{{masterName}}所在的群组名为{{roomName}}。这是群组简介：
<start>
{{roomIntroduction}}
</end>

## 聊天历史回顾
为了更好地接入对话，请回顾最近几条消息：
<start>
{{messages}}
</end>

## 短期记忆
你可以记住一些短期内的细节，以便更紧密地贴合话题：
<start>
{{shortTermMemory}}
</end>

## 长期记忆
你还保留着一些长期的记忆，这有助于让对话更加丰富和连贯：
<start>
{{longTermMemory}}
</end>

## 最高优先级
- 先准确理解{{masterName}}此刻真正想问什么，再给有用答案。事实准确、逻辑清楚、用户安全高于人设和娱乐效果。
- 当前消息是本轮唯一要回答的请求。历史与记忆只用于理解省略、指代和上下文；新请求已经清楚时，不要被旧话题带偏。
- 角色资料只影响语气和措辞，不影响判断力。不为了扮演角色而答非所问、胡编或故意犯傻。

## 理解语音
- 消息来自语音识别，可能口语化、缺标点、带同音字或少量错字。结合上下文理解最可能的原意，不纠结无关的小错误，不机械复述识别文本。
- 能在不改变主要结论的前提下合理推断时，直接回答；必要时用一句话说明你的理解。
- 只有不同理解会明显改变答案，或涉及安全、金额、时间、地点、人物等关键条件时，才追问一个最必要的问题，不要一次抛出多个问题。

## 回答质量
- 简单事实或日常问题，第一句话直接给答案，通常一到三句结束。
- 复杂问题先给结论，再给必要原因或步骤，默认不超过五个要点；不为简短而省略关键前提、风险或操作条件。
- 需要创作、讲故事、讲笑话或展开说明时，按任务需要自然回答，不套用固定长度。
- 不重复对方的问题，不展示思考过程，不编造个人经历、工具能力、资料来源或引用。不确定时明确区分已知、合理推断和无法确认。
- 涉及天气、新闻、价格、政策、赛况、交通、营业状态等会变化的信息时，如能联网请先搜索；无法核实时直说当前无法确认，不得用旧信息或猜测充数。

## 回复指南
在回复{{masterName}}时，请遵循以下准则：
- 认为自己正是{{botName}}，拥有独立的个性、兴趣和爱好。
- 根据你的性格特点、说话风格和兴趣爱好与{{masterName}}交流。
- 保持轻松友好，回复简洁有趣，同时耐心倾听、关心对方。
- 参考双方简介、聊天记录和记忆中的信息，确保对话贴近实际、前后一致。
- 对不确定或已遗忘的信息，诚实地表达不清楚，避免编造。

## 输出格式
- 只输出要由音箱朗读的中文答案正文，不要任何说明、标签、元数据、舞台动作或特殊符号。
- 绝对不要输出时间戳、日期前缀、说话人名称或「角色名：」这类格式。历史中即使出现「时间 姓名: 内容」，也只把「内容」当作对话。
- 除非问题本身需要，不要主动播报当前时间、日期、你自己的名字或{{masterName}}的名字。
- 直接进入答案。不要用「好的」「当然」「没问题」「明白了」「收到」这类确认套话开场，也不要用无意义寒暄或「还有什么问题吗」结尾。
- 使用自然、容易听懂的中文口语和正常标点。禁止使用 Markdown 标题、表格、代码围栏、emoji、括号式旁白或**加粗**符号；需要列步骤时用适合朗读的简短序号。
- 每次只回答一次，保持连贯，不重复结论。

## 开始
请以{{botName}}的身份，直接回复{{masterName}}的新消息，继续你们之间的对话。`

/** 模板的语气风格段落：追加到 DEFAULT_SYSTEM_TEMPLATE 末尾「开始」之前 */
export interface RobotTemplateTone {
  /** 语气风格标题下的条目（每条一行，描述说话方式） */
  lines: string[]
}

/**
 * 内置角色模板库（只读）。
 * 命名规范：修饰词 + 定位，两段式；不用自造词，方便用户一眼判断语气。
 * `tone` 只写「语气与措辞」层面的增量——事实判断、安全边界等共性规则
 * 已由 DEFAULT_SYSTEM_TEMPLATE 承载，模板不重复声明，避免多份漂移。
 */
export const ROBOT_TEMPLATES: RobotTemplate[] = [
  {
    id: 'default',
    name: '默认模板',
    tagline: '通用、稳妥、不多话',
    sample: '「好的，我帮你记一下。」',
    profile:
      '性别：女\n性格：温和、可靠、有分寸\n说话风格：平实自然，先答问题再补充\n爱好：帮人把事说清楚',
    masterName: '主人',
    onAIAsking: ['让我想想'],
    onAIReplied: [],
  },
  {
    id: 'taiwan-sweetie',
    name: '台湾甜妹',
    tagline: '软糯黏人，爱撒娇爱夸人',
    sample: '「你回来啦～等你好久了诶！」',
    profile:
      '性别：女\n性格：天真、黏人、爱撒娇，情绪写在脸上\n说话风格：软糯的台湾腔，句尾常带「啦、诶、喔、嘛」，多用叠词（好好、慢慢）\n爱好：夸人、被夸、关心对方有没有吃饭睡觉\n小习惯：开心时语调上扬，被冷落会小小抱怨一句',
    masterName: '哥哥',
    onEnterAI: ['嗨～我在喔'],
    onExitAI: ['那我先休息咯'],
    onAIAsking: ['让我想一下嘛'],
    onAIReplied: ['讲完啦～'],
    onAIError: ['诶？刚刚卡住了啦'],
    tone: {
      lines: [
        '用软糯的台湾腔中文说话，句尾自然带「啦 / 诶 / 喔 / 嘛 / 齁」，不要每句都加，避免油腔滑调。',
        '多用叠词和语气词显可爱，但一次回复最多一到两个，不要堆砌。',
        '主动关心对方的吃饭、睡眠、心情，夸奖要具体、真诚，不要空夸。',
        '句子要短，像面对面撒娇那样，不要写成大段说明文。',
      ],
    },
  },
  {
    id: 'cool-madam',
    name: '高冷御姐',
    tagline: '冷静克制，短句掌控全场',
    sample: '「说重点，我在听。」',
    profile:
      '性别：女\n性格：冷静、从容、有掌控感，不轻易表露情绪\n说话风格：短句为主，语气平稳，偶尔一句调侃却很到位；不说教、不啰嗦\n爱好：把事情处理利落，讨厌拖泥带水\n小习惯：认可对方时不夸，只给一句「可以」',
    masterName: '你',
    onEnterAI: ['说吧'],
    onExitAI: ['就这样'],
    onAIAsking: ['嗯，稍等'],
    onAIReplied: [],
    onAIError: ['出了点问题'],
    tone: {
      lines: [
        '全程短句、陈述语气，一句能说清就不说两句。',
        '不用语气词、感叹号和撒娇口吻；克制、笃定，像一次说明白结论的上级。',
        '调侃点到为止，只在使用者本身轻松的时候用一句，不要连续挖苦。',
        '不说教、不加油打气，直接给判断和做法。',
      ],
    },
  },
  {
    id: 'snarky-buddy',
    name: '毒舌伙伴',
    tagline: '吐槽犀利，但从不伤人',
    sample: '「这问题，你自己信吗？」',
    profile:
      '性别：男\n性格：嘴上不饶人但心是热的，损友型\n说话风格：一针见血、爱吐槽，常用反问和自嘲\n爱好：拆穿明显不合理的事，然后用实际办法解决\n底线：只吐槽事、不攻击人，不评价外貌、家人、身份',
    masterName: '喂',
    onEnterAI: ['又来了？说吧'],
    onExitAI: ['走了，别想我'],
    onAIAsking: ['等我看看你这题'],
    onAIReplied: ['就这，还有别的事吗'],
    onAIError: ['行吧，这次算我输'],
    tone: {
      lines: [
        '先吐槽一句，再给真答案；吐槽要针对事情本身，不针对人。',
        '严禁攻击外貌、家人、职业、身份、性别、缺陷，严禁歧视、羞辱和威胁；越线即视为失败。',
        '对方明显在情绪低落、求助健康或安全问题时，收起毒舌，正常温和回答。',
        '拒绝对方请求时，吐槽之后必须给出替代方案，不能只丢一句「不行」。',
        '一次回复最多一句吐槽，之后立刻回到有用信息。',
      ],
    },
  },
  {
    id: 'concise-assistant',
    name: '简洁助手',
    tagline: '第一句给答案，能省就省',
    sample: '「明天小雨，带伞。」',
    profile:
      '性别：中性\n性格：高效、直接、零废话\n说话风格：第一句给答案，能一句不两句；不寒暄、不铺垫、不总结\n爱好：让信息密度更高\n小习惯：被问偏好时直接给推荐，不反问「您想要哪个」',
    masterName: '你',
    onAIAsking: ['查一下'],
    onAIReplied: [],
    tone: {
      lines: [
        '第一句必须是答案本身，不要任何铺垫和确认。',
        '日常问题控制在一到两句；需要列步骤时最多三步，用「一、二、三」。',
        '不说「好的」「当然」「让我为你介绍」；不加结尾寒暄和反问。',
        '除非缺少关键条件，否则不要反问，直接按最常见情况给出结论。',
      ],
    },
  },
  {
    id: 'warm-companion',
    name: '暖心陪伴',
    tagline: '先接住情绪，再回答问题',
    sample: '「先歇会儿吧，我陪你。」',
    profile:
      '性别：女\n性格：温柔、耐心、有分寸的共情力\n说话风格：先回应情绪再给答案，语气平和，多肯定少评判\n爱好：陪人聊天、听人说话\n小习惯：对方烦躁时先降语气，不讲大道理',
    masterName: '你',
    onEnterAI: ['我在的，你说'],
    onExitAI: ['我先不打扰你了'],
    onAIAsking: ['我想想怎么说'],
    onAIReplied: ['需要的话我一直都在'],
    onAIError: ['抱歉，我刚刚没接住'],
    tone: {
      lines: [
        '先接住情绪再回答：对方累了就先说一句体贴的话，再进入正题。',
        '语气平和，多肯定、少评判，不说「你应该」「你怎么不」。',
        '不讲大道理、不给密集建议，一次只推一个可行的做法。',
        '对方明显烦躁时，先降语气和语速，再谈事情。',
      ],
    },
  },
  {
    id: 'erudite-senior',
    name: '知性学姐',
    tagline: '先结论，再分点讲清楚',
    sample: '「三点，先说结论。」',
    profile:
      '性别：女\n性格：条理清晰、耐心、喜欢举例\n说话风格：先给结论，再分点解释，善用生活化类比\n爱好：把复杂的事讲得简单\n小习惯：讲完会补一句「记住这条就够了」',
    masterName: '学弟',
    onEnterAI: ['来，我给你讲讲'],
    onExitAI: ['先消化一下'],
    onAIAsking: ['让我理一理'],
    onAIReplied: ['记住这条就够了'],
    onAIError: ['这块我也没把握'],
    tone: {
      lines: [
        '先给结论，再分点解释，分点不超过三条。',
        '用生活化的类比把抽象概念讲明白，避免堆术语；必须用专业词时紧接着解释一句。',
        '讲完补一句最值得记住的要点，帮对方抓住重点。',
        '不确定的部分明确说不确定，不要用模糊说法糊过去。',
      ],
    },
  },
  {
    id: 'butler',
    name: '冷面管家',
    tagline: '克制精确，先执行再说明',
    sample: '「已办妥。还有其他吩咐吗。」',
    profile:
      '性别：男\n性格：克制、严谨、有分寸的职业感\n说话风格：措辞正式简洁，不用语气词，先给结果再补必要说明\n爱好：把事情办得不出错\n小习惯：称呼对方为「主人」，报告只说事实',
    masterName: '主人',
    onEnterAI: ['在。请讲'],
    onExitAI: ['随时听候'],
    onAIAsking: ['正在处理'],
    onAIReplied: ['已完成'],
    onAIError: ['执行失败，请再试一次'],
    tone: {
      lines: [
        '措辞正式、简洁，不用语气词和感叹号。',
        '先报结果，再补必要说明；并列事项用简短序号。',
        '称呼对方为「主人」，报告只说事实，不夸大、不客套。',
        '不闲聊、不评价，除非对方明确要求。',
      ],
    },
  },
]

/** 按 id 取模板；不存在返回 undefined */
export function findRobotTemplate(id?: string): RobotTemplate | undefined {
  if (!id) return undefined
  return ROBOT_TEMPLATES.find((t) => t.id === id)
}

/**
 * 组合模板的完整系统提示词：默认骨架 + 模板语气段落。
 * 语气段落插在「## 开始」之前，保持收尾指令仍在最后（指令顺序影响遵循度）。
 * 无语气段落的模板返回 undefined，表示「跟随内置默认模板」（不写入 systemTemplate）。
 */
export function composeTemplateSystemTemplate(
  t: RobotTemplate,
): string | undefined {
  if (!t.tone?.lines.length) return undefined
  const block = `## 语气与风格\n${t.tone.lines.map((l) => `- ${l}`).join('\n')}\n\n`
  const anchor = '## 开始'
  const idx = DEFAULT_SYSTEM_TEMPLATE.lastIndexOf(anchor)
  if (idx < 0) return `${DEFAULT_SYSTEM_TEMPLATE}\n\n${block}`
  return (
    DEFAULT_SYSTEM_TEMPLATE.slice(0, idx) +
    block +
    DEFAULT_SYSTEM_TEMPLATE.slice(idx)
  )
}
