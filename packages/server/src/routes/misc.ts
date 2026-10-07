// ── 测试接口：对外地址连通性 + TTS 配置试听 ─────────────────────
import _trimEnd from 'lodash/trimEnd.js'
import { createTTS } from 'mi-gpt-tts'
import { streamTTSResponse } from '../tts.js'
import type { RouteContext } from './shared.js'

export function registerTestRoutes({ app }: RouteContext): void {
  app.post('/api/test', async (req, res) => {
    const testBaseUrl = req.body.url
    const ping = _trimEnd(testBaseUrl, '/') + '/ping'
    try {
      const fetchRes = await fetch(ping, {
        method: 'POST',
        signal: AbortSignal.timeout(500),
      })
      res.json({ success: fetchRes.ok })
    } catch {
      res.json({ success: false })
    }
  })

  app.post('/api/test/audio', (req, res) => {
    // TTS 配置含密钥，必须走请求体而非 URL（避免进入访问日志 / 浏览器历史）
    const raw = (req.body as { ttsConfig?: unknown })?.ttsConfig
    let options: any
    try {
      options = typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      res.status(400).json({ error: 'ttsConfig 不是合法 JSON' })
      return
    }
    if (!options || typeof options !== 'object') {
      res.status(400).json({ error: 'ttsConfig 必填' })
      return
    }
    const testTTS = createTTS(options)
    streamTTSResponse(res, (stream) =>
      testTTS({ text: '配置成功！', stream, speaker: options.defaultSpeaker }),
    )
  })
}
