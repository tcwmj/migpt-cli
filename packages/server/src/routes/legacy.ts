// ── 兼容旧版单设备 API（内部映射 id=default）───────────────────
import path from 'node:path'
import fse from 'fs-extra'
import _trimEnd from 'lodash/trimEnd.js'
import { run, stop, type RunConfig } from '@migptgui/controller'
import { type GuiConfig } from '@migptgui/options'
import { root } from '../paths.js'
import { loadDeviceConfig, saveDeviceConfig } from '../store.js'
import { logBuffers, appendLog } from '../logger.js'
import { ok, fail, type RouteContext } from './shared.js'

export function registerLegacyRoutes({ app }: RouteContext): void {
  const defaultDeviceCwd = path.join(root, 'default')

  app.get('/api/default', async (_req, res) => {
    const config = await loadDeviceConfig('default')
    res.json(config ? { config } : {})
  })

  app.put('/api/default', async (req, res) => {
    await saveDeviceConfig('default', req.body as GuiConfig)
    ok(res)
  })

  app.delete('/api/default', (_req, res) => {
    Promise.all([
      fse.remove(path.join(defaultDeviceCwd, '.mi.json')),
      fse.remove(path.join(defaultDeviceCwd, '.bot.json')),
    ]).then(
      () => ok(res),
      (err) => fail(res, 500, String(err)),
    )
  })

  app.post('/api/default/start', async (req, res) => {
    const migptConfig = req.body as GuiConfig
    await saveDeviceConfig('default', migptConfig)
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
    ok(res)
  })

  app.post('/api/default/stop', async (_req, res) => {
    await stop('default')
    ok(res)
  })

  app.get('/api/default/logs', async (_req, res) => {
    const limit = Number(_req.query.limit) || 100
    const buf = logBuffers.get('default') || []
    res.json({ logs: buf.slice(-limit) })
  })
}
