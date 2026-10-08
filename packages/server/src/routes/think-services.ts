// ── 思考服务（音箱的「大脑」：模型供应商 + 密钥）────────────────
import { nanoid } from 'nanoid'
import { thinkServicesFile } from '../paths.js'
import { getThinkServices, writeJson } from '../store.js'
import { redactThinkService, redactThinkServices } from '../redact.js'
import type { ThinkService } from '../types.js'
import { pick, THINK_FIELDS } from './shared.js'
import { createCrudRouter, deviceRefs, roleRefs } from './crud.js'

export const registerThinkServiceRoutes = createCrudRouter<ThinkService>({
  path: 'think-services',
  label: '思考服务',
  nameLabel: '思考服务名称',
  list: getThinkServices,
  save: (list) => writeJson(thinkServicesFile, list),
  listTransform: redactThinkServices,
  validate: (body) =>
    !body.name || !body.provider || !body.model || !body.apiKey
      ? '名称、供应商、模型与 API Key 必填'
      : null,
  build: (body, list) => {
    const svc: ThinkService = {
      id: nanoid(8),
      name: body.name as string,
      provider: body.provider as string,
      model: body.model as string,
      apiKey: body.apiKey as string,
      baseUrl: body.baseUrl,
      temperature: body.temperature,
      isDefault: body.isDefault ?? list.length === 0,
      createdAt: Date.now(),
    }
    // 保持全局默认唯一
    if (svc.isDefault) for (const t of list) t.isDefault = false
    return svc
  },
  applyUpdate: (list, idx, body) => {
    const wasDefault = list[idx].isDefault
    // 脱敏后前端不回读 apiKey：空值视为「未修改」，避免误清空已存密钥
    const patch = pick<ThinkService>(body, THINK_FIELDS)
    if (!patch.apiKey) delete patch.apiKey
    list[idx] = { ...list[idx], ...patch, id: list[idx].id }
    if (body.isDefault && !wasDefault) {
      for (const t of list) if (t.id !== list[idx].id) t.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
  },
  respond: redactThinkService,
  refRules: [roleRefs('thinkServiceId'), deviceRefs('thinkServiceId')],
  refMessage: '该思考服务正被其他实体引用，无法删除',
})
