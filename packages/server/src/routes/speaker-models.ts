// ── 音箱型号（设备的「硬件身份」配置）─────────────────────────
import { nanoid } from 'nanoid'
import {
  getSpeakerModels,
  saveSpeakerModels,
  resetBuiltinModel,
  speakerModelListSchema,
} from '../store.js'
import type { SpeakerModel } from '../types.js'
import { fail, pick, MODEL_FIELDS } from './shared.js'
import { createCrudRouter, deviceRefs } from './crud.js'

export const registerSpeakerModelRoutes = createCrudRouter<SpeakerModel>({
  path: 'speaker-models',
  label: '型号',
  nameLabel: '型号名称',
  list: getSpeakerModels,
  save: saveSpeakerModels,
  schema: speakerModelListSchema,
  validate: (body) => (!body.name || !body.did ? '名称与型号标识必填' : null),
  build: (body) => ({
    id: nanoid(8),
    name: body.name as string,
    did: body.did as string,
    desc: body.desc,
    ttsCommand: body.ttsCommand || [],
    wakeUpCommand: body.wakeUpCommand || [],
    playingCommand: body.playingCommand || [],
    consecutive: body.consecutive ?? true,
    imageUrl: body.imageUrl,
    builtin: false,
    createdAt: Date.now(),
  }),
  applyUpdate: (list, idx, body) => {
    list[idx] = {
      ...list[idx],
      ...pick<SpeakerModel>(body, MODEL_FIELDS),
      id: list[idx].id,
      builtin: list[idx].builtin,
    }
  },
  deleteGuard: (target) => (target.builtin ? '系统内置型号不可删除' : null),
  // byName：兼容旧数据把 speakerModel 存成型号名称
  refRules: [deviceRefs('speakerModel', { byName: true })],
  refMessage: '该型号正被设备引用，无法删除',
  extra: ({ app }) => {
    // 重置内置型号为官方默认值（仅 builtin 可用；用户改动可随时恢复）
    app.post('/api/speaker-models/:id/reset', async (req, res) => {
      const model = await resetBuiltinModel(req.params.id)
      if (!model) {
        fail(res, 404, '仅系统内置型号支持重置默认')
        return
      }
      res.json(model)
    })
  },
})
