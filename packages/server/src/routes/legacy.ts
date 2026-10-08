// ── 兼容旧版单设备 API（内部映射 id=default）───────────────────
import path from 'node:path'
import fse from 'fs-extra'
import { run, stop, type RunConfig } from '@migptgui/controller'
import { type GuiConfig } from '@migptgui/options'
import { root } from '../paths.js'
import { loadDeviceConfig, saveDeviceConfig } from '../store.js'
import { logBuffers, appendLog } from '../logger.js'
import { API_PREFIX, ok, fail, type RouteContext } from './shared.js'

export function registerLegacyRoutes({ app }: RouteContext): void {
  const defaultDeviceCwd = path.join(root, 'default')

  app.get(`${API_PREFIX}/default`, async (_req, res) => {
    const config = await loadDeviceConfig('default')
    res.json(config ? { config } : {})
  })

  app.put(`${API_PREFIX}/default`, async (req, res) => {
    await saveDeviceConfig('default', req.body as GuiConfig)
    ok(res)
  })

  app.delete(`${API_PREFIX}/default`, (_req, res) => {
    Promise.all([
      fse.remove(path.join(defaultDeviceCwd, '.mi.json')),
      fse.remove(path.join(defaultDeviceCwd, '.bot.json')),
    ]).then(
      () => ok(res),
      (err) => fail(res, 500, String(err)),
    )
  })

  app.post(`${API_PREFIX}/default/start`, async (req, res) => {
    const migptConfig = req.body as GuiConfig
    await saveDeviceConfig('default', migptConfig)
    if (
      migptConfig.config.speaker.tts === 'custom' &&
      migptConfig.gui &&
      migptConfig.gui.ttsProvider !== 'custom' &&
      migptConfig.tts
    ) {
      migptConfig.env.TTS_BASE_URL = `${(migptConfig.gui.publicURL || '').replace(/\/+$/, '')}/default/tts`
    }
    await run(
      'default',
      migptConfig as unknown as RunConfig,
      defaultDeviceCwd,
      (deviceId, line) => appendLog(deviceId, line),
    )
    ok(res)
  })

  app.post(`${API_PREFIX}/default/stop`, async (_req, res) => {
    await stop('default')
    ok(res)
  })

  app.get(`${API_PREFIX}/default/logs`, async (_req, res) => {
    const limit = Number(_req.query.limit) || 100
    const buf = logBuffers.get('default') || []
    res.json({ logs: buf.slice(-limit) })
  })
}
