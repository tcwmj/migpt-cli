// ── AI 角色（人设 + 对话行为）───────────────────────────────────
import { nanoid } from 'nanoid'
import { rolesFile } from '../paths.js'
import {
  getRoles,
  assertUniqueName,
  writeJson,
  listDeviceMetas,
} from '../store.js'
import { ROLE_DEFAULTS, type Role } from '../types.js'
import {
  pick,
  normProfile,
  ROLE_FIELDS,
  refConflict,
  type RouteContext,
} from './shared.js'

export function registerRoleRoutes({ app }: RouteContext): void {
  app.get('/api/roles', async (req, res) => {
    const roles = await getRoles()
    res.json(roles.map((r) => ({ ...r, profile: normProfile(r.profile) })))
  })

  app.post('/api/roles', async (req, res) => {
    const roles = await getRoles()
    const dup = assertUniqueName(roles, req.body?.name, undefined, '角色名称')
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    const role: Role = {
      id: nanoid(8),
      ...ROLE_DEFAULTS,
      ...pick<Role>(req.body, ROLE_FIELDS),
      profile: normProfile(req.body.profile),
    } as Role
    roles.push(role)
    await writeJson(rolesFile, roles)
    res.json(role)
  })

  app.put('/api/roles/:id', async (req, res) => {
    const roles = await getRoles()
    const idx = roles.findIndex((r) => r.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '角色不存在' })
      return
    }
    const dup = assertUniqueName(
      roles,
      req.body?.name,
      req.params.id,
      '角色名称',
    )
    if (dup) {
      res.status(409).json({ error: dup })
      return
    }
    roles[idx] = {
      ...roles[idx],
      ...pick<Role>(req.body, ROLE_FIELDS),
      id: req.params.id,
      profile: normProfile(req.body.profile ?? roles[idx].profile),
    }
    await writeJson(rolesFile, roles)
    res.json(roles[idx])
  })

  app.delete('/api/roles/:id', async (req, res) => {
    const roles = await getRoles()
    if (!roles.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: '角色不存在' })
      return
    }
    // 删除保护：被设备引用的角色禁止删除
    const metas = await listDeviceMetas()
    const refDevices = metas.filter((m) => m.roleId === req.params.id)
    if (refDevices.length > 0) {
      refConflict(
        res,
        { devices: refDevices.map((d) => d.alias) },
        '该角色正被设备引用，无法删除；请先更换引用该角色的设备',
      )
      return
    }
    await writeJson(
      rolesFile,
      roles.filter((r) => r.id !== req.params.id),
    )
    res.json({ success: true })
  })
}
