// ── 思考服务（音箱的「大脑」：模型供应商 + 密钥）────────────────
import { nanoid } from 'nanoid'
import { thinkServicesFile } from '../paths.js'
import {
  getThinkServices,
  getRoles,
  assertUniqueName,
  writeJson,
  listDeviceMetas,
} from '../store.js'
import { redactThinkService, redactThinkServices } from '../redact.js'
import type { ThinkService } from '../types.js'
import { pick, THINK_FIELDS, refConflict, type RouteContext } from './shared.js'

export function registerThinkServiceRoutes({ app }: RouteContext): void {
  app.get('/api/think-services', async (req, res) => {
    res.json(redactThinkServices(await getThinkServices()))
  })

  app.post('/api/think-services', async (req, res) => {
    const body = req.body as Partial<ThinkService>
    if (!body.name || !body.provider || !body.model || !body.apiKey) {
      res.status(400).json({ error: '名称、供应商、模型与 API Key 必填' })
      return
    }
    const list = await getThinkServices()
    const dup = assertUniqueName(list, body.name, undefined, '思考服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const svc: ThinkService = {
      id: nanoid(8),
      name: body.name,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      temperature: body.temperature,
      isDefault: body.isDefault ?? list.length === 0,
      createdAt: Date.now(),
    }
    // 保持全局默认唯一
    if (svc.isDefault) {
      for (const t of list) t.isDefault = false
      await writeJson(thinkServicesFile, list)
    }
    list.push(svc)
    await writeJson(thinkServicesFile, list)
    res.json(redactThinkService(svc))
  })

  app.put('/api/think-services/:id', async (req, res) => {
    const list = await getThinkServices()
    const idx = list.findIndex((t) => t.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '思考服务不存在' })
      return
    }
    const body = req.body as Partial<ThinkService>
    const dup = assertUniqueName(list, body.name, req.params.id, '思考服务名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const wasDefault = list[idx].isDefault
    // 脱敏后前端不回读 apiKey：空值视为「未修改」，避免误清空已存密钥
    const patch = pick<ThinkService>(body, THINK_FIELDS)
    if (!patch.apiKey) delete patch.apiKey
    list[idx] = { ...list[idx], ...patch, id: req.params.id }
    if (body.isDefault && !wasDefault) {
      for (const t of list) if (t.id !== req.params.id) t.isDefault = false
    }
    if (body.isDefault === false && wasDefault) {
      list[idx].isDefault = list.length === 1
    }
    await writeJson(thinkServicesFile, list)
    res.json(redactThinkService(list[idx]))
  })

  app.delete('/api/think-services/:id', async (req, res) => {
    const list = await getThinkServices()
    if (!list.some((t) => t.id === req.params.id)) {
      res.status(404).json({ error: '思考服务不存在' })
      return
    }
    // 删除保护：被设备或角色引用的实体禁止删除
    const roles = await getRoles()
    const metas = await listDeviceMetas()
    const refRoles = roles.filter((r) => r.thinkServiceId === req.params.id)
    const refDevices = metas.filter((m) => m.thinkServiceId === req.params.id)
    if (refRoles.length > 0 || refDevices.length > 0) {
      refConflict(
        res,
        {
          roles: refRoles.map((r) => r.name),
          devices: refDevices.map((d) => d.alias),
        },
        '该思考服务正被其他实体引用，无法删除',
      )
      return
    }
    await writeJson(
      thinkServicesFile,
      list.filter((t) => t.id !== req.params.id),
    )
    res.json({ success: true })
  })
}
