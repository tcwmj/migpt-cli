// ── 模型（音箱的「大脑」：模型供应商 + 密钥）────────────────
import { nanoid } from 'nanoid'
import {
  getModels,
  saveModels,
  modelListSchema,
  listDevices,
} from '../store.js'
import { redactModel, redactModels } from '../redact.js'
import type { Model } from '../types.js'
import { pick, MODEL_FIELDS } from './shared.js'
import { createCrudRouter, deviceRefs, type RefRule } from './crud.js'

export const registerModelRoutes = createCrudRouter<Model>({
  path: 'models',
  label: '模型',
  nameLabel: '模型名称',
  list: getModels,
  save: saveModels,
  schema: modelListSchema,
  listTransform: redactModels,
  validate: (body) =>
    !body.name || !body.provider || !body.model || !body.apiKey
      ? '名称、供应商、模型与 API Key 必填'
      : null,
  build: (body) => {
    const svc: Model = {
      id: nanoid(8),
      name: body.name as string,
      provider: body.provider as string,
      model: body.model as string,
      apiKey: body.apiKey as string,
      baseUrl: body.baseUrl,
      temperature: body.temperature,
      createdAt: Date.now(),
    }
    return svc
  },
  applyUpdate: (list, idx, body) => {
    // 脱敏后前端不回读 apiKey：空值视为「未修改」，避免误清空已存密钥
    const patch = pick<Model>(body, MODEL_FIELDS)
    if (!patch.apiKey) delete patch.apiKey
    list[idx] = { ...list[idx], ...patch, id: list[idx].id }
  },
  respond: redactModel,
  refRules: [
    deviceRefs('modelId'),
    {
      key: 'devices',
      find: async (id) => {
        const metas = await listDevices()
        return metas.filter((m) => m.modelIds?.includes(id)).map((m) => m.alias)
      },
    } satisfies RefRule,
  ],
  refMessage: '该模型正被设备引用，无法删除',
})
