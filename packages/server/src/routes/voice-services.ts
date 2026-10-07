// ── 语音服务（音箱的「嗓子」：内置/第三方 TTS）───────────────────
import { nanoid } from 'nanoid'
import { voiceServicesFile } from '../paths.js'
import {
  getVoiceServices,
  getRoles,
  assertUniqueName,
  writeJson,
  listDeviceMetas,
  resetBuiltinVoice,
} from '../store.js'
import type { VoiceService } from '../types.js'
import { pick, VOICE_FIELDS, refConflict, type RouteContext } from './shared.js'

export function registerVoiceServiceRoutes({ app }: RouteContext): void {
  app.get('/api/voice-services', async (req, res) => {
    res.json(await getVoiceServices())
  })

  app.post('/api/voice-services', async (req, res) => {
    const body = req.body as Partial<VoiceService>
    if (!body.name || !body.provider) {
      res.status(400).json({ error: '名称与供应商必填' })
      return
    }
    const list = await getVoiceServices()
    const dup = assertUniqueName(list, body.name, undefined, '语音服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const svc: VoiceService = {
      id: nanoid(8),
      name: body.name,
      provider: body.provider,
      voiceId: body.voiceId,
      ttsCommand: body.ttsCommand,
      builtin: body.builtin ?? false,
      isDefault: body.isDefault ?? list.length === 0,
      tts: body.tts,
      createdAt: Date.now(),
    }
    if (svc.isDefault) {
      for (const v of list) v.isDefault = false
      await writeJson(voiceServicesFile, list)
    }
    list.push(svc)
    await writeJson(voiceServicesFile, list)
    res.json(svc)
  })

  app.put('/api/voice-services/:id', async (req, res) => {
    const list = await getVoiceServices()
    const idx = list.findIndex((v) => v.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '语音服务不存在' })
      return
    }
    const body = req.body as Partial<VoiceService>
    const dup = assertUniqueName(list, body.name, req.params.id, '语音服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const wasDefault = list[idx].isDefault
    list[idx] = {
      ...list[idx],
      ...pick<VoiceService>(body, VOICE_FIELDS),
      id: req.params.id,
      builtin: list[idx].builtin,
    }
    if (body.isDefault && !wasDefault) {
      for (const v of list) if (v.id !== req.params.id) v.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
    await writeJson(voiceServicesFile, list)
    res.json(list[idx])
  })

  app.delete('/api/voice-services/:id', async (req, res) => {
    const list = await getVoiceServices()
    const target = list.find((v) => v.id === req.params.id)
    if (!target) {
      res.status(404).json({ error: '语音服务不存在' })
      return
    }
    if (target.builtin) {
      res.status(409).json({ error: '内建语音服务不可删除' })
      return
    }
    // 删除保护：被设备或角色引用的实体禁止删除
    const roles = await getRoles()
    const metas = await listDeviceMetas()
    const refRoles = roles.filter((r) => r.voiceId === req.params.id)
    const refDevices = metas.filter((m) => m.voiceOverrideId === req.params.id)
    if (refRoles.length > 0 || refDevices.length > 0) {
      refConflict(
        res,
        {
          roles: refRoles.map((r) => r.name),
          devices: refDevices.map((d) => d.alias),
        },
        '该语音服务正被其他实体引用，无法删除',
      )
      return
    }
    await writeJson(
      voiceServicesFile,
      list.filter((v) => v.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // 重置内置语音服务为默认（仅 builtin 可用）
  app.post('/api/voice-services/:id/reset', async (req, res) => {
    const svc = await resetBuiltinVoice(req.params.id)
    if (!svc) {
      res.status(404).json({ error: '仅系统内置语音服务支持重置默认' })
      return
    }
    res.json(svc)
  })
}
