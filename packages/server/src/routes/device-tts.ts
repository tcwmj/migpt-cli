// ── 多设备 TTS：/{ttsSecret}/tts/*（小爱音箱直接访问，不能挂认证）──
import createDebug from 'debug'
import { createTTS, kTTSSpeakers } from 'mi-gpt-tts'
import { streamTTSResponse } from '../tts.js'
import { type GuiConfig } from '@migptgui/options'
import type { DeviceMeta } from '../types.js'
import {
  findDeviceBySecret,
  loadDeviceConfig,
  type RouteContext,
} from './shared.js'

const dAudio = createDebug('@migptgui/server:audio')

export function registerDeviceTtsRoutes({ app }: RouteContext): void {
  app.get('/:secret/tts/speakers', (req, res) => {
    res.json(kTTSSpeakers)
  })

  app.get('/:secret/tts/tts.mp3', async (req, res) => {
    const secret = req.params.secret
    let meta: DeviceMeta | undefined
    let config: GuiConfig | undefined
    if (secret === 'default') {
      config = await loadDeviceConfig('default')
    } else {
      meta = await findDeviceBySecret(secret)
      config = meta ? await loadDeviceConfig(meta.id) : undefined
    }

    if (!config?.tts) {
      res.status(500).send('Internal Server Error')
      return
    }

    const tts = createTTS(config.tts)
    const nUrl = req.url.replace('+text=', '&text=')
    const url = new URL('http://localhost' + nUrl)
    const options = {
      speaker: url.searchParams.get('speaker') || config.tts.defaultSpeaker!,
      text: decodeURIComponent(url.searchParams.get('text') || ''),
    }
    dAudio('准备合成语音。参数：%O', options)
    streamTTSResponse(res, (stream) => tts({ ...options, stream }))
  })
}
