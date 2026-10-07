// ── 音箱型号（设备的「硬件身份」配置）─────────────────────────
import { nanoid } from 'nanoid'
import { speakerModelsFile } from '../paths.js'
import {
  getSpeakerModels,
  assertUniqueName,
  writeJson,
  listDeviceMetas,
  resetBuiltinModel,
} from '../store.js'
import type { SpeakerModel } from '../types.js'
import { pick, MODEL_FIELDS, refConflict, type RouteContext } from './shared.js'

export function registerSpeakerModelRoutes({ app }: RouteContext): void {
  app.get('/api/speaker-models', async (req, res) => {
    res.json(await getSpeakerModels())
  })

  app.post('/api/speaker-models', async (req, res) => {
    const body = req.body as Partial<SpeakerModel>
    if (!body.name || !body.did) {
      res.status(400).json({ error: '名称与型号标识必填' })
      return
    }
    const list = await getSpeakerModels()
    const dup = assertUniqueName(list, body.name, undefined, '型号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const model: SpeakerModel = {
      id: nanoid(8),
      name: body.name,
      did: body.did,
      desc: body.desc,
      ttsCommand: body.ttsCommand || [],
      wakeUpCommand: body.wakeUpCommand || [],
      playingCommand: body.playingCommand || [],
      consecutive: body.consecutive ?? true,
      imageUrl: body.imageUrl,
      builtin: false,
      createdAt: Date.now(),
    }
    list.push(model)
    await writeJson(speakerModelsFile, list)
    res.json(model)
  })

  app.put('/api/speaker-models/:id', async (req, res) => {
    const list = await getSpeakerModels()
    const idx = list.findIndex((m) => m.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '型号不存在' })
      return
    }
    const body = req.body as Partial<SpeakerModel>
    const dup = assertUniqueName(list, body.name, req.params.id, '型号名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    list[idx] = {
      ...list[idx],
      ...pick<SpeakerModel>(body, MODEL_FIELDS),
      id: req.params.id,
      builtin: list[idx].builtin,
    }
    await writeJson(speakerModelsFile, list)
    res.json(list[idx])
  })

  app.delete('/api/speaker-models/:id', async (req, res) => {
    const list = await getSpeakerModels()
    const target = list.find((m) => m.id === req.params.id)
    if (!target) {
      res.status(404).json({ error: '型号不存在' })
      return
    }
    if (target.builtin) {
      res.status(409).json({ error: '系统内置型号不可删除' })
      return
    }
    // 删除保护：被设备关联的型号禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter(
      (m) => m.speakerModel === req.params.id || m.speakerModel === target.name,
    )
    if (refDevices.length > 0) {
      refConflict(
        res,
        { devices: refDevices.map((d) => d.alias) },
        '该型号正被设备引用，无法删除',
      )
      return
    }
    await writeJson(
      speakerModelsFile,
      list.filter((m) => m.id !== req.params.id),
    )
    res.json({ success: true })
  })

  // 重置内置型号为官方默认值（仅 builtin 可用；用户改动可随时恢复）
  app.post('/api/speaker-models/:id/reset', async (req, res) => {
    const model = await resetBuiltinModel(req.params.id)
    if (!model) {
      res.status(404).json({ error: '仅系统内置型号支持重置默认' })
      return
    }
    res.json(model)
  })
}
