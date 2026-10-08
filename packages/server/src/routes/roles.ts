// ── AI 角色（人设 + 对话行为）───────────────────────────────────
import { nanoid } from 'nanoid'
import { rolesFile } from '../paths.js'
import { getRoles, writeJson } from '../store.js'
import { ROLE_DEFAULTS, type Role } from '../types.js'
import { pick, normProfile, ROLE_FIELDS } from './shared.js'
import { createCrudRouter, deviceRefs } from './crud.js'

export const registerRoleRoutes = createCrudRouter<Role>({
  path: 'roles',
  label: '角色',
  nameLabel: '角色名称',
  list: getRoles,
  save: (list) => writeJson(rolesFile, list),
  listTransform: (roles) =>
    roles.map((r) => ({ ...r, profile: normProfile(r.profile) })),
  build: (body) =>
    ({
      id: nanoid(8),
      ...ROLE_DEFAULTS,
      ...pick<Role>(body, ROLE_FIELDS),
      profile: normProfile(body.profile),
    }) as Role,
  applyUpdate: (list, idx, body) => {
    list[idx] = {
      ...list[idx],
      ...pick<Role>(body, ROLE_FIELDS),
      id: list[idx].id,
      profile: normProfile(body.profile ?? list[idx].profile),
    }
  },
  refRules: [deviceRefs('roleId')],
  refMessage: '该角色正被设备引用，无法删除；请先更换引用该角色的设备',
})
