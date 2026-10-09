// ── 语音服务（音箱的「嗓子」：内置/第三方 TTS）───────────────────
import { nanoid } from 'nanoid'
import {
  getVoiceServices,
  saveVoiceServices,
  resetBuiltinVoice,
  voiceServiceListSchema,
} from '../store.js'
import type { VoiceService } from '../types.js'
import { API_PREFIX, fail, pick, VOICE_FIELDS } from './shared.js'
import { createCrudRouter, roleRefs } from './crud.js'

export const registerVoiceServiceRoutes = createCrudRouter<VoiceService>({
  path: 'voice-services',
  label: '语音服务',
  nameLabel: '语音服务名称',
  list: getVoiceServices,
  save: saveVoiceServices,
  schema: voiceServiceListSchema,
  validate: (body) =>
    !body.name || !body.provider ? '名称与供应商必填' : null,
  build: (body, list) => {
    const svc: VoiceService = {
      id: nanoid(8),
      name: body.name as string,
      provider: body.provider as string,
      voiceId: body.voiceId,
      ttsCommand: body.ttsCommand,
      builtin: body.builtin ?? false,
      isDefault: body.isDefault ?? list.length === 0,
      tts: body.tts,
      createdAt: Date.now(),
    }
    // 保持全局默认唯一
    if (svc.isDefault) for (const v of list) v.isDefault = false
    return svc
  },
  applyUpdate: (list, idx, body) => {
    const wasDefault = list[idx].isDefault
    list[idx] = {
      ...list[idx],
      ...pick<VoiceService>(body, VOICE_FIELDS),
      id: list[idx].id,
      builtin: list[idx].builtin,
    }
    if (body.isDefault && !wasDefault) {
      for (const v of list) if (v.id !== list[idx].id) v.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
  },
  deleteGuard: (target) => (target.builtin ? '内建语音服务不可删除' : null),
  refRules: [roleRefs('voiceId')],
  refMessage: '该语音服务正被其他实体引用，无法删除',
  extra: ({ app }) => {
    // 重置内置语音服务为默认（仅 builtin 可用）
    app.post(`${API_PREFIX}/voice-services/:id/reset`, async (req, res) => {
      const svc = await resetBuiltinVoice(req.params.id)
      if (!svc) {
        fail(res, 404, '仅系统内置语音服务支持重置默认')
        return
      }
      res.json(svc)
    })
  },
})
