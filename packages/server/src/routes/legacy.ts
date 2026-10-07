// ── 兼容旧版单设备 API（内部映射 id=default）───────────────────
import path from 'node:path'
import fs from 'node:fs/promises'
import fse from 'fs-extra'
import _trimEnd from 'lodash/trimEnd.js'
import { run, stop, type RunConfig } from '@migptgui/controller'
import { type GuiConfig } from '@migptgui/options'
import { root } from '../paths.js'
import { writeJson } from '../store.js'
import { logBuffers, appendLog } from '../logger.js'
import type { RouteContext } from './shared.js'

export function registerLegacyRoutes({ app }: RouteContext): void {
  const defaultDeviceCwd = path.join(root, 'default')

  async function saveDefaultConfig(config: GuiConfig) {
    return writeJson(path.join(defaultDeviceCwd, 'migptgui.json'), config)
  }

  app.get('/api/default', async (req, res) => {
    let migptConfig: GuiConfig | undefined
    try {
      migptConfig = JSON.parse(
        await fs.readFile(
          path.join(defaultDeviceCwd, 'migptgui.json'),
          'utf-8',
        ),
      )
    } catch {
      /* 不存在 */
    }
    res.json(migptConfig ? { config: migptConfig } : {})
  })

  app.put('/api/default', async (req, res) => {
    await saveDefaultConfig(req.body as GuiConfig)
    res.json({ success: true })
  })

  app.delete('/api/default', (req, res) => {
    Promise.all([
      fse.remove(path.join(defaultDeviceCwd, '.mi.json')),
      fse.remove(path.join(defaultDeviceCwd, '.bot.json')),
    ]).then(
      () => res.json({ success: true }),
      (err) => res.json({ success: false, error: err }),
    )
  })

  app.post('/api/default/start', async (req, res) => {
    const migptConfig = req.body as GuiConfig
    await saveDefaultConfig(migptConfig)
    if (
      migptConfig.config.speaker.tts === 'custom' &&
      migptConfig.gui &&
      migptConfig.gui.ttsProvider !== 'custom' &&
      migptConfig.tts
    ) {
      migptConfig.env.TTS_BASE_URL = `${_trimEnd(
        migptConfig.gui.publicURL || '',
        '/',
      )}/default/tts`
    }
    await run(
      'default',
      migptConfig as unknown as RunConfig,
      defaultDeviceCwd,
      (deviceId, line) => appendLog(deviceId, line),
    )
    res.json({ success: true })
  })

  app.post('/api/default/stop', async (req, res) => {
    await stop('default')
    res.json({ success: true })
  })

  app.get('/api/default/logs', async (req, res) => {
    const limit = Number(req.query.limit) || 100
    const buf = logBuffers.get('default') || []
    res.json({ logs: buf.slice(-limit) })
  })
}
