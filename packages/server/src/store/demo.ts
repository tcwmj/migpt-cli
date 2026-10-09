// ── 演示日志种子：仅 MIGPT_DEMO_LOGS=1 时注入 mock 对话，供「对话记录」页联调 ──
import { appendLog, clearDeviceLog, demoTs, logger } from '../logger.js'
import { listDeviceMetas } from './entities.js'
import { getEnv } from './env.js'

const DEMO_SCENES: {
  q: string
  a: string
  sys: string
  input: number
  output: number
}[] = [
  {
    q: '小爱同学，今天天气怎么样',
    a: '今天多云转晴，气温 18~26℃，早晚偏凉记得加件外套。',
    sys: '思考服务命中角色默认（豆包 Doubao-Seed）',
    input: 320,
    output: 85,
  },
  {
    q: '帮我设一个 30 分钟的番茄钟',
    a: '好的，30 分钟倒计时已开始，结束后我会提醒你休息一下。',
    sys: '语音音色由角色指定（默认语音）',
    input: 280,
    output: 62,
  },
  {
    q: '播放点轻音乐',
    a: '为你播放《Lofi 清晨电台》，音量已调到 30%。',
    sys: '',
    input: 195,
    output: 48,
  },
  {
    q: '小爱同学，国庆周边有什么好玩的',
    a: '苏州周边推荐：拙政园、平江路夜游、金鸡湖音乐喷泉，今天人流量较大建议错峰出行。',
    sys: '语音音色热切换成功（豆包语音）',
    input: 410,
    output: 112,
  },
  {
    q: '明天早上 7 点叫我起床',
    a: '已设好明早 7:00 闹钟，届时会用轻柔铃声唤醒你。',
    sys: '',
    input: 245,
    output: 55,
  },
  {
    q: '今天有什么新闻',
    a: '今日头条：1）神舟二十号成功返回；2）沪深两市成交额破万亿；3）全国多地降温超 10℃。',
    sys: '思考服务命中角色默认（豆包 Doubao-Seed）',
    input: 520,
    output: 168,
  },
]

export async function seedDemoLogs() {
  if (!getEnv().MIGPT_DEMO_LOGS) return
  const devices = await listDeviceMetas()
  if (!devices.length) return
  const now = Date.now()
  for (const d of devices) {
    clearDeviceLog(d.id)
    for (let i = 0; i < 6; i++) {
      const s = DEMO_SCENES[i % DEMO_SCENES.length]
      const tq = new Date(now - (i * 47 + 13) * 60000)
      appendLog(d.id, `${demoTs(tq)} [用户] 问：${s.q}`)
      // AI 回复带 token 用量（供统计页面解析）
      appendLog(
        d.id,
        `${demoTs(new Date(tq.getTime() + 3500))} [AI] 答：${s.a} | input_tokens=${s.input} output_tokens=${s.output}`,
      )
      if (s.sys)
        appendLog(
          d.id,
          `${demoTs(new Date(tq.getTime() + 16000))} [系统] ${s.sys}`,
        )
    }
  }
  logger.info(
    `[demo] 已为 ${devices.length} 台设备注入演示对话日志（MIGPT_DEMO_LOGS=1）`,
  )
}
